---
name: api-pagination
description: Implement pagination, filtering, and sorting for REST API list endpoints. Use when designing collection endpoints that return large datasets, implementing cursor or offset pagination, adding filter query parameters, or optimizing list performance.
---

# API Pagination

## When to Use This Skill

Use this skill when you need to:
- Add pagination to collection endpoints
- Choose between cursor and offset pagination
- Implement filtering with query parameters
- Add sorting capabilities
- Design page response structures
- Optimize large dataset performance

## Pagination Strategy Decision

| Use Case | Strategy | Reason |
|----------|----------|--------|
| Admin dashboards | Offset | Page jumping needed |
| Infinite scroll | Cursor | Stable, performant |
| Real-time feeds | Cursor | Handles concurrent changes |
| Static/rarely-changed data | Either | Data stability allows both |
| Large datasets (>10K items) | Cursor | Avoids offset performance degradation |
| Simple CRUD APIs | Offset | Simpler implementation |

## Offset-Based Pagination

Best for small-to-medium datasets where users need page jumping.

### Query Parameters

| Parameter | Description | Default | Max |
|-----------|-------------|---------|-----|
| `page` | Page number (0-indexed) | 0 | - |
| `size` | Items per page | 20 | 100 |
| `sort` | Sort field and direction | none | - |

### Request Example

```http
GET /orders?page=2&size=20&sort=createdDate,desc HTTP/1.1
```

### Response Structure

```json
{
  "data": [
    {"id": "order-123", "status": "PROCESSING", "total": 149.50}
  ],
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

### Key Rules

1. **Page numbering starts at 0** (consistent with Spring Data, most frameworks)
2. **Default page size: 20** - Balance between payload size and round trips
3. **Maximum page size: 100** - Prevent resource exhaustion
4. **Always include total counts** for offset pagination

### Offset Pagination Drawbacks

- **Performance degrades** with high page numbers (database must scan offset rows)
- **Inconsistent results** when data changes between page loads
- **Missing/duplicate items** if rows are inserted/deleted during pagination

## Cursor-Based Pagination

Best for large datasets, real-time data, and infinite scroll UIs.

### Query Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `cursor` | Opaque position token | null (first page) |
| `size` | Items per page | 20 |
| `direction` | Navigation direction | `next` |

### Request Examples

```http
# First page
GET /orders?size=20 HTTP/1.1

# Next page
GET /orders?cursor=eyJpZCI6IjEyMzQ1IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0In0=&size=20 HTTP/1.1

# Previous page
GET /orders?cursor=eyJpZCI6IjEyMzQ0IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTEzIn0=&size=20&direction=prev HTTP/1.1
```

### Response Structure

```json
{
  "data": [
    {"id": "order-123", "status": "PROCESSING", "total": 149.50}
  ],
  "meta": {
    "cursor": {
      "current": "eyJpZCI6Im9yZGVyLTEyMyIsImNyZWF0ZWREYXRlIjoiMjAyNC0wNC0xNCJ9",
      "next": "eyJpZCI6Im9yZGVyLTEyNCIsImNyZWF0ZWREYXRlIjoiMjAyNC0wNC0xNSJ9",
      "previous": null,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Cursor Structure

Cursors encode sort key values. Always include a unique tiebreaker (ID):

```javascript
// Cursor contains sort field values
const cursor = {
  id: "order-123",                    // Unique tiebreaker
  createdDate: "2024-04-14T10:22:00Z" // Primary sort field
};

// Base64 encode for URL safety
const encoded = btoa(JSON.stringify(cursor));
```

### Cursor Pagination Benefits

- **O(1) performance** - Constant time regardless of position
- **Stable results** - No duplicates/missing items during concurrent changes
- **Real-time friendly** - Works with frequently changing data

### Cursor Pagination Trade-offs

- **No page jumping** - Cannot jump to page 50 directly
- **No total count** - Expensive to calculate (provide `hasNext` instead)
- **Opaque cursors** - Clients cannot construct cursors

## Filtering

### Standard Filter Patterns

| Filter Type | Parameter Pattern | Example |
|-------------|-------------------|---------|
| Equality | `field=value` | `?status=ACTIVE` |
| Multiple values | `field=val1,val2` | `?status=ACTIVE,PENDING` |
| Date after | `fieldAfter=date` | `?createdAfter=2024-01-01` |
| Date before | `fieldBefore=date` | `?createdBefore=2024-12-31` |
| Numeric greater | `fieldGt=number` | `?totalGt=100` |
| Numeric less | `fieldLt=number` | `?totalLt=500` |
| Text search | `search=text` | `?search=customer+name` |

### Request Example

```http
GET /orders?status=PROCESSING,PENDING&createdAfter=2024-01-01&totalGt=100&page=0&size=20 HTTP/1.1
```

### Filter Response

Echo applied filters in response metadata:

```json
{
  "data": [...],
  "meta": {
    "pagination": {...},
    "filters": {
      "status": ["PROCESSING", "PENDING"],
      "createdAfter": "2024-01-01",
      "totalGt": 100
    }
  }
}
```

### Advanced Filter Operators

For complex filtering needs, support bracket notation:

```
GET /orders?createdDate[gte]=2024-01-01&createdDate[lt]=2024-02-01
GET /orders?status[in]=ACTIVE,PENDING
GET /orders?customerName[contains]=smith
```

| Operator | Meaning | Example |
|----------|---------|---------|
| `[eq]` | Equals (default) | `?status=ACTIVE` |
| `[ne]` | Not equals | `?status[ne]=CANCELLED` |
| `[in]` | In list | `?status[in]=ACTIVE,PENDING` |
| `[gt]` | Greater than | `?total[gt]=100` |
| `[gte]` | Greater than or equal | `?total[gte]=100` |
| `[lt]` | Less than | `?total[lt]=500` |
| `[lte]` | Less than or equal | `?total[lte]=500` |
| `[contains]` | Contains substring | `?name[contains]=smith` |
| `[startsWith]` | Starts with | `?email[startsWith]=admin` |

## Sorting

### Query Parameter Format

```
GET /orders?sort=createdDate,desc
GET /orders?sort=status,asc&sort=createdDate,desc
```

Format: `sort={field},{direction}` where direction is `asc` or `desc`.

### Multi-Field Sorting

Multiple `sort` parameters create sort priority:

```http
GET /orders?sort=priority,desc&sort=createdDate,asc HTTP/1.1
```

Response echoes sort order:

```json
{
  "meta": {
    "sort": [
      {"field": "priority", "direction": "DESC"},
      {"field": "createdDate", "direction": "ASC"}
    ]
  }
}
```

### Sortable Fields

Document which fields support sorting. Common sortable fields:
- `createdDate` / `createdAt`
- `updatedDate` / `updatedAt`
- `name` / `title`
- `status`
- `total` / `amount`

Reject unknown sort fields with 400 Bad Request.

## Complete Response Example

```json
{
  "data": [
    {
      "id": "order-12345",
      "customerId": "cust-67890",
      "total": 149.50,
      "status": "PROCESSING",
      "createdDate": "2024-04-14T10:22:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    },
    "filters": {
      "status": "PROCESSING"
    },
    "sort": [
      {"field": "createdDate", "direction": "DESC"}
    ],
    "timestamp": "2024-04-15T14:32:22Z",
    "requestId": "req-abc123"
  }
}
```

## Performance Guidelines

### Index Strategy

Create indexes that support your sort/filter patterns:

```sql
-- For sorting by createdDate
CREATE INDEX idx_orders_created ON orders(created_date DESC);

-- For filtering by status + sorting
CREATE INDEX idx_orders_status_created ON orders(status, created_date DESC);

-- For cursor pagination (include unique tiebreaker)
CREATE INDEX idx_orders_cursor ON orders(created_date DESC, id ASC);
```

### Count Optimization

Total counts are expensive for large datasets. Options:

1. **Estimate counts** for display (flag as estimated)
2. **Make counts optional** via `includeCount=false`
3. **Use cursor pagination** with `hasNext` instead of total
4. **Cache counts** with short TTL

### Page Size Limits

Always enforce maximum page size:

```
size = min(requestedSize, 100)  // Cap at 100
size = max(size, 1)             // Minimum 1
```

## Error Handling

### Invalid Parameters

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-pagination",
  "title": "Invalid Pagination Parameters",
  "status": 400,
  "detail": "Page size must be between 1 and 100",
  "errors": [
    {
      "field": "size",
      "code": "OUT_OF_RANGE",
      "message": "Page size must be between 1 and 100",
      "rejectedValue": 500
    }
  ]
}
```

### Invalid Cursor

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "The provided cursor is malformed or expired"
}
```

### Page Out of Range

For offset pagination, when page exceeds available pages:

```http
HTTP/1.1 200 OK

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

Return empty data with correct metadata - don't error.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| No max page size | Resource exhaustion | Cap at 100 items |
| Always return total count | Expensive for large datasets | Make optional or use cursor |
| Offset for real-time feeds | Duplicates/missing items | Use cursor pagination |
| Exposing cursor internals | Tight coupling | Use opaque Base64 tokens |
| Inconsistent parameters | Confusing API | Standardize across endpoints |
| Offset for large datasets | O(n) performance | Switch to cursor at scale |

## Quick Reference

### Offset Pagination

```
GET /orders?page=0&size=20&sort=createdDate,desc&status=ACTIVE
```

Response includes: `page`, `size`, `totalElements`, `totalPages`

### Cursor Pagination

```
GET /orders?cursor={token}&size=20
```

Response includes: `current`, `next`, `previous`, `hasNext`, `hasPrevious`

### Combined Filters and Sorting

```
GET /orders?status=ACTIVE,PENDING&createdAfter=2024-01-01&sort=total,desc&sort=createdDate,asc&page=0&size=20
```

## Loading Additional Context

When you need deeper guidance:

- **Cursor pagination implementation**: Load `references/cursor-pagination.md`
- **Offset pagination details**: Load `references/offset-pagination.md`
- **Advanced filtering patterns**: Load `references/filtering.md`
- **Java/Spring implementation**: Load `references/java-spring.md`
