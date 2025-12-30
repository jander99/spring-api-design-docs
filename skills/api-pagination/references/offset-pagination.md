# Offset Pagination Deep-Dive

## How Offset Works

Offset pagination uses `page` and `size` to calculate which records to skip:

```sql
SELECT * FROM orders
ORDER BY created_date DESC
LIMIT 20 OFFSET 40;  -- Page 2, size 20: skip 40 (pages 0-1)
```

Calculation: `OFFSET = page * size`

## Query Parameters

### Standard Parameters

```
GET /orders?page=0&size=20
GET /orders?page=2&size=50&sort=createdDate,desc
```

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | int | 0 | - | Zero-indexed page number |
| `size` | int | 20 | 100 | Items per page |
| `sort` | string | - | - | Field and direction |

### Alternative Parameter Names

Some APIs use different names:

| Our Standard | Alternatives |
|--------------|--------------|
| `page` | `pageNumber`, `p` |
| `size` | `pageSize`, `limit`, `per_page` |
| `sort` | `orderBy`, `sortBy` |

Choose one convention and apply consistently.

## Response Structure

### Minimal Response

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 2,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    }
  }
}
```

### Extended Response

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 2,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3,
      "first": false,
      "last": true,
      "hasNext": false,
      "hasPrevious": true,
      "numberOfElements": 14
    }
  }
}
```

Additional fields:
- `first`: Is this the first page?
- `last`: Is this the last page?
- `hasNext`: Are there more pages after this?
- `hasPrevious`: Are there pages before this?
- `numberOfElements`: Items on current page (may be less than `size` on last page)

### HATEOAS Links (Optional)

```json
{
  "data": [...],
  "meta": {
    "pagination": {...}
  },
  "_links": {
    "self": {"href": "/orders?page=2&size=20"},
    "first": {"href": "/orders?page=0&size=20"},
    "prev": {"href": "/orders?page=1&size=20"},
    "next": null,
    "last": {"href": "/orders?page=2&size=20"}
  }
}
```

## Calculating Pagination Metadata

```javascript
function calculatePagination(page, size, totalElements) {
  const totalPages = Math.ceil(totalElements / size);
  
  return {
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
    hasNext: page < totalPages - 1,
    hasPrevious: page > 0,
    numberOfElements: Math.min(size, totalElements - (page * size))
  };
}
```

## The COUNT Problem

Total count requires a separate query, which can be expensive:

```sql
-- Data query
SELECT * FROM orders WHERE status = 'ACTIVE'
ORDER BY created_date DESC
LIMIT 20 OFFSET 0;

-- Count query (can be slow on large tables)
SELECT COUNT(*) FROM orders WHERE status = 'ACTIVE';
```

### Optimization Strategies

1. **Make count optional**:
   ```
   GET /orders?page=0&size=20&includeCount=false
   ```

2. **Use estimated counts** for display:
   ```sql
   -- PostgreSQL
   SELECT reltuples::bigint FROM pg_class WHERE relname = 'orders';
   ```

3. **Cache counts** with short TTL (30-60 seconds)

4. **Skip count on deep pages**:
   ```javascript
   // Only calculate count for first few pages
   if (page < 5) {
     pagination.totalElements = await countOrders(filters);
     pagination.totalPages = Math.ceil(pagination.totalElements / size);
   } else {
     pagination.totalElements = null;
     pagination.totalPages = null;
   }
   ```

## Offset Performance Issues

### The Problem

Offset pagination degrades with higher page numbers:

```sql
-- Page 0: Fast - read 20 rows
LIMIT 20 OFFSET 0

-- Page 100: Slow - scan 2000 rows, return 20
LIMIT 20 OFFSET 2000

-- Page 1000: Very slow - scan 20000 rows, return 20
LIMIT 20 OFFSET 20000
```

The database must read and discard all offset rows.

### Mitigation Strategies

1. **Limit maximum page number**:
   ```javascript
   const maxPage = 100;
   if (page > maxPage) {
     throw new Error(`Page cannot exceed ${maxPage}`);
   }
   ```

2. **Switch to cursor pagination for large datasets**

3. **Use keyset pagination** (simplified cursor):
   ```sql
   -- Instead of OFFSET, use WHERE clause
   SELECT * FROM orders
   WHERE created_date < '2024-01-15'
   ORDER BY created_date DESC
   LIMIT 20;
   ```

4. **Denormalize counts** if frequently needed

## Consistency Issues

Data changes between page requests cause problems:

### Missing Items

1. User on page 2, seeing items 21-40
2. New item inserted at position 1
3. User requests page 3
4. Item that was at position 41 is now at 42
5. User never sees item originally at position 40

### Duplicate Items

1. User on page 2, seeing items 21-40
2. Item at position 1 deleted
3. User requests page 3
4. Item that was at position 41 is now at 40
5. User sees item 41 again (it was in their page 2)

### Mitigation

1. **Accept the limitation** for simple UIs
2. **Add timestamps** for client-side deduplication
3. **Use cursor pagination** for real-time data
4. **Snapshot isolation** (complex, rarely worth it)

## Edge Cases

### Empty Results

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 0,
      "totalPages": 0
    }
  }
}
```

### Page Beyond Total

Return empty data with correct metadata:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 100,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    }
  }
}
```

Do NOT return 404 - the page parameter is valid, just empty.

### Invalid Parameters

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-pagination",
  "title": "Invalid Pagination Parameters",
  "status": 400,
  "errors": [
    {
      "field": "page",
      "code": "MIN_VALUE",
      "message": "Page must be >= 0",
      "rejectedValue": -1
    },
    {
      "field": "size",
      "code": "OUT_OF_RANGE",
      "message": "Size must be between 1 and 100",
      "rejectedValue": 500
    }
  ]
}
```

## Sorting

### Single Field

```
GET /orders?sort=createdDate,desc
```

### Multiple Fields

```
GET /orders?sort=status,asc&sort=createdDate,desc
```

Priority: first sort parameter is primary.

### Null Handling

Document and consistently apply null handling:

```
GET /orders?sort=priority,desc,nullsLast
```

Options:
- `nullsFirst`: Nulls appear before non-null values
- `nullsLast`: Nulls appear after non-null values

### Invalid Sort Fields

Reject unknown fields:

```http
HTTP/1.1 400 Bad Request

{
  "type": "https://example.com/problems/invalid-sort",
  "title": "Invalid Sort Field",
  "status": 400,
  "detail": "Field 'foo' is not sortable",
  "allowedFields": ["id", "createdDate", "status", "total"]
}
```

## Implementation Checklist

- [ ] Default page size (20)
- [ ] Maximum page size (100)
- [ ] Page validation (>= 0)
- [ ] Size validation (1-100)
- [ ] Total count calculation
- [ ] Sort parameter parsing
- [ ] Invalid sort field rejection
- [ ] Empty result handling
- [ ] Beyond-total page handling
- [ ] Index optimization for sort fields
