# Common Pagination Issues

> **Reading Guide**
> - **Reading Time**: 12 minutes
> - **Audience**: Developers debugging pagination problems
> - **Prerequisites**: Basic REST API experience, understanding of pagination concepts
> - **Reading Level**: Grade 12 (Flesch: 35)

This guide helps you identify and fix the most common pagination issues in REST APIs.

---

## Quick Diagnosis

| Symptom | Likely Issue | Jump To |
|---------|--------------|---------|
| Items appear twice | Duplicate items | [Duplicate Items](#duplicate-items-across-pages) |
| Items disappear | Missing items | [Missing Items](#missing-items-between-pages) |
| Wrong total count | Count inconsistency | [Inconsistent Totals](#inconsistent-total-counts) |
| Cursor errors | Decoding failure | [Cursor Failures](#cursor-decoding-failures) |
| Too many results | Size limits | [Page Size Issues](#page-size-limits-not-respected) |

---

## Missing Items Between Pages

### Symptoms

- Items exist in the database but never appear in paginated results
- Users report "lost" records when browsing through pages
- Total count shows more items than users can find by paging through
- Specific items are skipped when navigating from one page to the next

### Root Cause

Missing items typically occur when data changes during pagination. The most common causes:

1. **New inserts during browsing**: A new record gets inserted with a sort position before the current page, pushing items forward
2. **Sort order instability**: Records with identical sort values appear in random order
3. **Offset drift**: Using offset pagination while data is being modified
4. **Timezone mismatches**: Server and database using different timezones for date sorting

**Example scenario:**
```
Initial state (sorted by createdDate DESC):
Page 1: [Item-10, Item-9, Item-8, Item-7, Item-6]
Page 2: [Item-5, Item-4, Item-3, Item-2, Item-1]

User views Page 1, then Item-11 is inserted...

New state when user requests Page 2:
Page 1: [Item-11, Item-10, Item-9, Item-8, Item-7]
Page 2: [Item-6, Item-5, Item-4, Item-3, Item-2]  <- Item-1 is now on Page 3!

User never sees Item-1 because they already viewed "Page 2"
```

### Solution

**Option 1: Use cursor-based pagination**

Cursors maintain position regardless of data changes:

```http
GET /v1/orders?cursor=eyJpZCI6Ik9SRC0wMDUiLCJjcmVhdGVkRGF0ZSI6IjIwMjQtMDEtMTVUMTQ6MzA6MDBaIn0&size=5
```

**Option 2: Add a tiebreaker to your sort**

Always include a unique field as the final sort criterion:

```http
GET /v1/orders?sort=createdDate,desc&sort=id,asc&page=1&size=5
```

**Option 3: Use snapshot isolation**

Include a snapshot timestamp in the first request:

```http
# First request
GET /v1/orders?page=0&size=20

# Response includes snapshot
{
  "data": [...],
  "meta": {
    "pagination": {...},
    "snapshot": "2024-01-15T14:30:00Z"
  }
}

# Subsequent requests use the snapshot
GET /v1/orders?page=1&size=20&snapshot=2024-01-15T14:30:00Z
```

### Example

**Before (problematic):**

```http
GET /v1/orders?sort=createdDate,desc&page=0&size=5
```

```json
{
  "data": [
    {"id": "ORD-010", "createdDate": "2024-01-15T10:00:00Z"},
    {"id": "ORD-009", "createdDate": "2024-01-15T09:00:00Z"},
    {"id": "ORD-008", "createdDate": "2024-01-15T09:00:00Z"},
    {"id": "ORD-007", "createdDate": "2024-01-15T08:00:00Z"},
    {"id": "ORD-006", "createdDate": "2024-01-15T07:00:00Z"}
  ]
}
```

**After (with tiebreaker):**

```http
GET /v1/orders?sort=createdDate,desc&sort=id,desc&page=0&size=5
```

```json
{
  "data": [
    {"id": "ORD-010", "createdDate": "2024-01-15T10:00:00Z"},
    {"id": "ORD-009", "createdDate": "2024-01-15T09:00:00Z"},
    {"id": "ORD-008", "createdDate": "2024-01-15T09:00:00Z"},
    {"id": "ORD-007", "createdDate": "2024-01-15T08:00:00Z"},
    {"id": "ORD-006", "createdDate": "2024-01-15T07:00:00Z"}
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 5,
      "totalElements": 54,
      "totalPages": 11
    },
    "sort": [
      {"field": "createdDate", "direction": "DESC"},
      {"field": "id", "direction": "DESC"}
    ]
  }
}
```

---

## Duplicate Items Across Pages

### Symptoms

- Same item appears on multiple pages
- Users see repeated records while browsing
- Data appears "stuck" showing the same items
- Total unique items found is less than totalElements indicates

### Root Cause

Duplicate items occur when:

1. **Records deleted during pagination**: A deletion on an earlier page shifts remaining items backward
2. **Sort value changes**: An item's sort field gets updated, moving it to a different page
3. **Non-deterministic sorting**: Database returns records in arbitrary order for equal sort values
4. **Race conditions**: Multiple concurrent requests with data modifications

**Example scenario:**
```
Initial state (sorted by status, then id):
Page 1: [Item-A (ACTIVE), Item-B (ACTIVE), Item-C (ACTIVE)]
Page 2: [Item-D (PENDING), Item-E (PENDING), Item-F (PENDING)]

User views Page 1, then Item-A is deleted...

New state when user requests Page 2:
Page 1: [Item-B (ACTIVE), Item-C (ACTIVE), Item-D (PENDING)]
Page 2: [Item-D (PENDING), Item-E (PENDING), Item-F (PENDING)]  <- Item-D appears twice!
```

### Solution

**Option 1: Switch to cursor-based pagination**

```http
# First page
GET /v1/orders?size=20

# Response
{
  "data": [...],
  "meta": {
    "pagination": {
      "cursors": {
        "next": "eyJpZCI6Ik9SRC0wMjAifQ"
      },
      "hasNext": true
    }
  }
}

# Next page uses cursor (immune to deletions)
GET /v1/orders?cursor=eyJpZCI6Ik9SRC0wMjAifQ&size=20
```

**Option 2: Use keyset pagination with stable keys**

```http
GET /v1/orders?after_id=ORD-020&size=20
```

**Option 3: Include a unique identifier in the sort**

```http
GET /v1/orders?sort=status,asc&sort=id,asc&page=1&size=20
```

### Example

**Problematic request:**

```http
GET /v1/orders?sort=status&page=1&size=3
```

**Stable request with cursor:**

```http
GET /v1/orders?cursor=eyJzdGF0dXMiOiJBQ1RJVkUiLCJpZCI6Ik9SRC0wMDMifQ&size=3
```

```json
{
  "data": [
    {"id": "ORD-004", "status": "PENDING", "total": 89.99},
    {"id": "ORD-005", "status": "PENDING", "total": 124.50},
    {"id": "ORD-006", "status": "PENDING", "total": 67.00}
  ],
  "meta": {
    "pagination": {
      "size": 3,
      "cursors": {
        "previous": "eyJzdGF0dXMiOiJQRU5ESU5HIiwiaWQiOiJPUkQtMDA0In0",
        "next": "eyJzdGF0dXMiOiJQRU5ESU5HIiwiaWQiOiJPUkQtMDA2In0"
      },
      "hasPrevious": true,
      "hasNext": true
    }
  }
}
```

---

## Inconsistent Total Counts

### Symptoms

- `totalElements` changes between page requests
- Sum of items across all pages doesn't match total count
- `totalPages` value conflicts with actual pages available
- Count shows 100 items but only 95 can be retrieved

### Root Cause

Total count inconsistencies happen because:

1. **Count and data queries run separately**: The count query and data query execute at different times
2. **Concurrent modifications**: Data changes between count and data retrieval
3. **Filter mismatches**: Count query uses different filters than data query
4. **Caching issues**: Cached counts don't reflect current data state
5. **Permission filtering**: Count includes items user can't access

### Solution

**Option 1: Execute count and data in a single transaction**

```http
GET /v1/orders?page=0&size=20
```

Server implementation ensures atomicity:
```
BEGIN TRANSACTION (READ COMMITTED)
  count = SELECT COUNT(*) FROM orders WHERE filters
  data = SELECT * FROM orders WHERE filters LIMIT 20 OFFSET 0
COMMIT
```

**Option 2: Use hasNext/hasPrevious instead of total counts**

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "size": 20,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

**Option 3: Mark counts as estimated**

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54321,
      "totalElementsEstimated": true,
      "totalPages": 2717
    }
  }
}
```

**Option 4: Make counts optional**

```http
# Fast response without count
GET /v1/orders?page=0&size=20

# Slower response with accurate count
GET /v1/orders?page=0&size=20&includeCount=true
```

### Example

**Request without count (faster):**

```http
GET /v1/orders?page=0&size=20
```

```json
{
  "data": [
    {"id": "ORD-001", "status": "ACTIVE"},
    {"id": "ORD-002", "status": "ACTIVE"}
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

**Request with count (accurate but slower):**

```http
GET /v1/orders?page=0&size=20&includeCount=true
```

```json
{
  "data": [
    {"id": "ORD-001", "status": "ACTIVE"},
    {"id": "ORD-002", "status": "ACTIVE"}
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

---

## Cursor Decoding Failures

### Symptoms

- 400 Bad Request errors when using cursor parameter
- "Invalid cursor" error messages
- Cursors that worked before suddenly fail
- Base64 decode errors in logs

### Root Cause

Cursor failures typically occur because:

1. **Cursor tampering**: Client modified the cursor value
2. **Cursor expiration**: Time-based validity has passed
3. **Schema changes**: Cursor structure changed after API update
4. **Encoding issues**: URL encoding problems corrupt the cursor
5. **Version mismatch**: Cursor from one API version used with another

### Solution

**Step 1: Validate cursor format**

Return helpful error messages:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "The cursor format is invalid. Cursors must not be modified.",
  "instance": "/v1/orders"
}
```

**Step 2: Handle expired cursors gracefully**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/expired-cursor",
  "title": "Cursor Expired",
  "status": 400,
  "detail": "This cursor has expired. Please start from the first page.",
  "instance": "/v1/orders",
  "retryAction": {
    "method": "GET",
    "href": "/v1/orders?size=20"
  }
}
```

**Step 3: Version your cursors**

Include version information in the cursor:

```json
{
  "v": 2,
  "id": "ORD-050",
  "createdDate": "2024-01-15T10:00:00Z",
  "exp": 1705410000
}
```

**Step 4: Provide fallback behavior**

When a cursor fails, offer alternatives:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "The provided cursor is invalid or has expired.",
  "suggestions": [
    "Start from the beginning: GET /v1/orders?size=20",
    "Use offset pagination: GET /v1/orders?page=5&size=20"
  ]
}
```

### Example

**Invalid cursor request:**

```http
GET /v1/orders?cursor=not-a-valid-cursor&size=20
```

**Error response:**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "The cursor 'not-a-valid-cursor' could not be decoded. Cursors are opaque tokens that should not be modified.",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "cursor",
      "code": "INVALID_FORMAT",
      "message": "Cursor must be a valid base64-encoded string"
    }
  ]
}
```

**Valid cursor request:**

```http
GET /v1/orders?cursor=eyJ2IjoyLCJpZCI6Ik9SRC0wNTAiLCJjcmVhdGVkRGF0ZSI6IjIwMjQtMDEtMTVUMTA6MDA6MDBaIn0&size=20
```

**Successful response:**

```json
{
  "data": [
    {"id": "ORD-051", "status": "ACTIVE", "total": 234.50},
    {"id": "ORD-052", "status": "PENDING", "total": 89.99}
  ],
  "meta": {
    "pagination": {
      "size": 20,
      "cursors": {
        "previous": "eyJ2IjoyLCJpZCI6Ik9SRC0wNTEifQ",
        "next": "eyJ2IjoyLCJpZCI6Ik9SRC0wNzAifQ"
      },
      "hasPrevious": true,
      "hasNext": true
    }
  }
}
```

---

## Page Size Limits Not Respected

### Symptoms

- Requesting `size=1000` returns more than the maximum allowed
- Different endpoints have inconsistent size limits
- No error when exceeding limits, just silent capping
- Client receives fewer items than requested without explanation

### Root Cause

Page size issues occur when:

1. **Silent capping**: Server caps size without informing client
2. **Missing validation**: No maximum size enforcement
3. **Inconsistent limits**: Different endpoints have different maximums
4. **Configuration errors**: Default and maximum values misconfigured

### Solution

**Step 1: Enforce consistent limits**

Document and enforce limits across all endpoints:

```http
GET /v1/orders?size=500
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/invalid-page-size",
  "title": "Invalid Page Size",
  "status": 400,
  "detail": "Page size cannot exceed 100 items.",
  "errors": [
    {
      "field": "size",
      "code": "EXCEEDS_MAXIMUM",
      "message": "Requested size 500 exceeds maximum of 100",
      "providedValue": 500,
      "maximumValue": 100
    }
  ]
}
```

**Step 2: Return actual applied size in response**

Always echo back the effective page size:

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "requestedSize": 500,
      "actualSize": 100,
      "totalElements": 54
    }
  }
}
```

**Step 3: Document limits in API specification**

```yaml
parameters:
  - name: size
    in: query
    description: Number of items per page
    schema:
      type: integer
      minimum: 1
      maximum: 100
      default: 20
```

**Step 4: Provide helpful feedback**

```http
HTTP/1.1 200 OK
X-Page-Size-Capped: true
X-Max-Page-Size: 100
```

### Example

**Request exceeding limit:**

```http
GET /v1/orders?page=0&size=250
```

**Option A - Error response (recommended for explicit contracts):**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/page-size-exceeded",
  "title": "Page Size Exceeded",
  "status": 400,
  "detail": "The requested page size of 250 exceeds the maximum allowed size of 100.",
  "instance": "/v1/orders",
  "constraints": {
    "minimumSize": 1,
    "maximumSize": 100,
    "defaultSize": 20
  }
}
```

**Option B - Capped response with warning (for backward compatibility):**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Page-Size-Capped: true

{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "requestedSize": 250,
      "size": 100,
      "totalElements": 54,
      "totalPages": 1
    },
    "warnings": [
      {
        "code": "PAGE_SIZE_CAPPED",
        "message": "Requested size 250 was capped to maximum of 100"
      }
    ]
  }
}
```

---

## Prevention Best Practices

### Design Time

1. **Choose pagination type wisely**: Use cursor pagination for large or frequently-changing datasets
2. **Always include tiebreakers**: Add a unique field to every sort specification
3. **Set explicit limits**: Define and document maximum page sizes
4. **Plan for consistency**: Decide how to handle concurrent modifications

### Implementation Time

1. **Validate all inputs**: Check page numbers, sizes, and cursor formats
2. **Use transactions**: Execute count and data queries atomically
3. **Version your cursors**: Include version info for future compatibility
4. **Log pagination patterns**: Track usage to identify problems early

### Runtime

1. **Monitor performance**: Watch for slow queries on deep pages
2. **Alert on anomalies**: Set up alerts for unusual pagination patterns
3. **Provide clear errors**: Help clients understand and fix issues
4. **Document behavior**: Keep API documentation current with actual behavior

---

## Related Documentation

- [Pagination and Filtering Guide](../../request-response/pagination-and-filtering.md)
- [Cursor vs Offset Migration](cursor-vs-offset-migration.md)
- [Error Response Standards](../../request-response/error-response-standards.md)
- [Performance Issues](../performance-issues.md)
