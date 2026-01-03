# Common Pagination Issues and Solutions

This document covers frequently encountered problems when implementing pagination, filtering, and sorting, along with their solutions.

## Common Pagination Issues

### Issue: Page Numbers Out of Bounds

**Problem:** Users request page numbers that exceed the total number of pages.

**Example Request:**
```http
GET /v1/orders?page=999&size=20 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Solution:** Return empty results with correct metadata:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [],
  "meta": {
    "pagination": {
      "page": 999,
      "size": 20,
      "totalElements": 100,
      "totalPages": 5
    }
  }
}
```

**Key Behavior:** Do not return an error for out-of-bounds pages. Return an empty `data` array with accurate pagination metadata showing the actual total pages available.

### Issue: Inconsistent Results Due to Data Changes

**Problem:** Items appear on multiple pages or disappear during pagination due to concurrent modifications.

**Example:** User on page 2 sees items they already saw on page 1 because new items were inserted.

**Solution 1: Use cursor-based pagination**

Cursor-based pagination provides stable results by anchoring to a specific position in the dataset.

**Initial Request:**
```http
GET /v1/orders?size=20 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Response with Cursor:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {"id": "order-100", "createdDate": "2024-01-15T10:30:00Z"},
    {"id": "order-099", "createdDate": "2024-01-15T09:15:00Z"}
  ],
  "meta": {
    "pagination": {
      "size": 20,
      "hasNext": true,
      "nextCursor": "eyJpZCI6Im9yZGVyLTA5OSIsImNyZWF0ZWREYXRlIjoiMjAyNC0wMS0xNVQwOToxNTowMFoifQ=="
    }
  }
}
```

**Next Page Request:**
```http
GET /v1/orders?size=20&cursor=eyJpZCI6Im9yZGVyLTA5OSIsImNyZWF0ZWREYXRlIjoiMjAyNC0wMS0xNVQwOToxNTowMFoifQ== HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Cursor Structure (decoded from Base64):**
```json
{
  "id": "order-099",
  "createdDate": "2024-01-15T09:15:00Z"
}
```

**Solution 2: Use snapshot isolation**

Include a snapshot timestamp to filter results consistently across pages.

**Initial Request:**
```http
GET /v1/orders?size=20 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Response with Snapshot:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 100,
      "totalPages": 5
    },
    "snapshot": "2024-01-15T10:30:00Z"
  }
}
```

**Subsequent Request with Snapshot:**
```http
GET /v1/orders?page=1&size=20&snapshot=2024-01-15T10:30:00Z HTTP/1.1
Host: api.example.com
Accept: application/json
```

### Issue: Performance Degradation with Deep Pagination

**Problem:** Queries become slow with large offset values (e.g., page 1000 with 20 items per page).

**Example of Slow Request:**
```http
GET /v1/orders?page=1000&size=20 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Solution:** For deep pagination (beyond page 100), switch to cursor-based pagination or return an error guiding the user.

**Option 1: Return Cursor-Based Alternative**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/deep-pagination",
  "title": "Deep Pagination Not Supported",
  "status": 400,
  "detail": "Offset pagination is limited to page 100. Use cursor-based pagination for deeper access.",
  "instance": "/v1/orders",
  "recommendation": "Use the 'cursor' parameter instead of 'page' for efficient deep pagination"
}
```

**Option 2: Automatically Switch to Cursor Mode**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...],
  "meta": {
    "pagination": {
      "size": 20,
      "hasNext": true,
      "nextCursor": "eyJpZCI6Im9yZGVyLTIwMDAwIn0=",
      "paginationMode": "cursor",
      "notice": "Switched to cursor-based pagination for better performance"
    }
  }
}
```

### Issue: Total Count Queries Are Slow

**Problem:** Counting all matching records becomes expensive for large datasets.

**Solution 1: Use estimated counts**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 1000000,
      "totalPages": 50000,
      "estimated": true
    }
  }
}
```

**Solution 2: Make counts optional**

**Request Without Count (faster):**
```http
GET /v1/orders?page=0&size=20 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Response Without Total Count:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...],
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

**Request With Count (slower):**
```http
GET /v1/orders?page=0&size=20&includeCount=true HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Response With Total Count:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 1000000,
      "totalPages": 50000,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

## Common Filtering Issues

### Issue: SQL Injection in Dynamic Filters

**Problem:** User input is directly incorporated into queries without sanitization.

**Malicious Request Example:**
```http
GET /v1/orders?status=PENDING';DROP%20TABLE%20orders;-- HTTP/1.1
Host: api.example.com
```

**Expected Behavior:** The server must use parameterized queries internally. The request should either:
- Be validated and rejected as an invalid status value
- Be safely escaped and treated as a literal string

**Proper Error Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-filter-value",
  "title": "Invalid Filter Value",
  "status": 400,
  "detail": "Invalid status value provided",
  "errors": [
    {
      "field": "status",
      "code": "INVALID_VALUE",
      "message": "Status must be one of: PENDING, PROCESSING, COMPLETED, CANCELLED",
      "providedValue": "PENDING';DROP TABLE orders;--"
    }
  ]
}
```

### Issue: Invalid Date Formats

**Problem:** Users provide dates in various formats that cause parsing errors.

**Examples of Invalid Requests:**

```http
GET /v1/orders?createdAfter=2024-13-01 HTTP/1.1
```
Invalid month (13).

```http
GET /v1/orders?createdAfter=2024/01/01 HTTP/1.1
```
Wrong date separator (slashes instead of dashes).

```http
GET /v1/orders?createdAfter=tomorrow HTTP/1.1
```
Relative date not supported.

**Expected Error Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-date",
  "title": "Invalid Date Format",
  "status": 400,
  "detail": "Date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "createdAfter",
      "code": "INVALID_DATE_FORMAT",
      "message": "Date must be in ISO 8601 format",
      "providedValue": "2024-13-01",
      "expectedFormat": "YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ",
      "examples": ["2024-01-15", "2024-01-15T10:30:00Z"]
    }
  ]
}
```

**Valid Request:**
```http
GET /v1/orders?createdAfter=2024-01-15T00:00:00Z HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Successful Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {"id": "order-123", "createdDate": "2024-01-16T08:00:00Z"}
  ],
  "meta": {
    "pagination": {...},
    "filters": {
      "createdAfter": "2024-01-15T00:00:00Z"
    }
  }
}
```

### Issue: Filter Values Don't Match Enum Types

**Problem:** Users provide filter values that don't match the expected enum values.

**Invalid Request (lowercase):**
```http
GET /v1/orders?status=active HTTP/1.1
Host: api.example.com
```

But the system expects `ACTIVE` (uppercase).

**Option 1: Strict Validation - Error Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-filter-value",
  "title": "Invalid Filter Value",
  "status": 400,
  "detail": "Invalid status value. Must be one of: PENDING, PROCESSING, COMPLETED, CANCELLED",
  "errors": [
    {
      "field": "status",
      "code": "INVALID_VALUE",
      "message": "Invalid status value",
      "providedValue": "active",
      "allowedValues": ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"]
    }
  ]
}
```

**Option 2: Case-Insensitive Matching - Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...],
  "meta": {
    "filters": {
      "status": "ACTIVE"
    }
  }
}
```

### Issue: Multiple Filters with Different Logic

**Problem:** Users expect OR logic between filters, but the system uses AND logic.

**Request with Multiple Status Values:**
```http
GET /v1/orders?status=PENDING,PROCESSING HTTP/1.1
Host: api.example.com
Accept: application/json
```

User expects orders with PENDING OR PROCESSING status.

**Alternative Syntax (repeated parameter):**
```http
GET /v1/orders?status=PENDING&status=PROCESSING HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Expected Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {"id": "order-001", "status": "PENDING"},
    {"id": "order-002", "status": "PROCESSING"},
    {"id": "order-003", "status": "PENDING"}
  ],
  "meta": {
    "filters": {
      "status": ["PENDING", "PROCESSING"]
    }
  }
}
```

**Document the Behavior:**
APIs should clearly document whether multiple values use AND or OR logic. Common conventions:
- Comma-separated values: OR logic (`status=PENDING,PROCESSING`)
- Repeated parameters: OR logic (`status=PENDING&status=PROCESSING`)
- Different fields: AND logic (`status=PENDING&priority=HIGH`)

## Common Sorting Issues

### Issue: Sorting by Non-Indexed Fields

**Problem:** Users sort by fields that aren't indexed, causing slow queries.

**Request with Non-Indexed Sort Field:**
```http
GET /v1/orders?sort=description,asc HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Option 1: Reject Non-Indexed Sorts**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-sort-field",
  "title": "Invalid Sort Field",
  "status": 400,
  "detail": "Field 'description' is not available for sorting",
  "errors": [
    {
      "field": "sort",
      "code": "UNSUPPORTED_SORT_FIELD",
      "message": "Field 'description' is not available for sorting",
      "providedValue": "description",
      "allowedFields": ["id", "createdDate", "total", "status"]
    }
  ]
}
```

**Option 2: Allow with Warning Header**
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Performance-Warning: Sorting by 'description' may be slow as it is not indexed

{
  "data": [...],
  "meta": {
    "sort": {
      "field": "description",
      "direction": "asc",
      "indexed": false,
      "warning": "This sort field is not indexed and may cause slow queries"
    }
  }
}
```

**Sortable Fields Configuration (JSON Schema):**
```json
{
  "sortableFields": {
    "id": {"indexed": true, "type": "string"},
    "createdDate": {"indexed": true, "type": "date"},
    "total": {"indexed": true, "type": "number"},
    "status": {"indexed": true, "type": "string"},
    "customerName": {"indexed": false, "type": "string"}
  }
}
```

### Issue: Inconsistent Sort Order for Equal Values

**Problem:** Items with equal sort values appear in different orders across requests.

**Example:** Multiple orders with the same `createdDate` appear in random order.

**Request:**
```http
GET /v1/orders?sort=createdDate,desc HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Inconsistent Response (Problem):**
First request might return orders in one order, second request in a different order when `createdDate` values are identical.

**Solution:** Always include a unique field (like `id`) as the final sort criteria internally.

**Consistent Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {"id": "order-003", "createdDate": "2024-01-15T10:00:00Z"},
    {"id": "order-001", "createdDate": "2024-01-15T10:00:00Z"},
    {"id": "order-002", "createdDate": "2024-01-14T15:00:00Z"}
  ],
  "meta": {
    "sort": [
      {"field": "createdDate", "direction": "desc"},
      {"field": "id", "direction": "asc"}
    ]
  }
}
```

Items with the same `createdDate` are consistently ordered by `id`.

### Issue: Invalid Sort Direction

**Problem:** Users provide invalid sort directions.

**Invalid Requests:**
```http
GET /v1/orders?sort=createdDate,ascending HTTP/1.1
```

```http
GET /v1/orders?sort=createdDate,1 HTTP/1.1
```

```http
GET /v1/orders?sort=createdDate,up HTTP/1.1
```

**Option 1: Strict Validation - Error Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-sort-direction",
  "title": "Invalid Sort Direction",
  "status": 400,
  "detail": "Invalid sort direction 'ascending'. Use 'asc' or 'desc'",
  "errors": [
    {
      "field": "sort",
      "code": "INVALID_DIRECTION",
      "message": "Invalid sort direction",
      "providedValue": "ascending",
      "allowedValues": ["asc", "desc"]
    }
  ]
}
```

**Option 2: Accept Common Variations**

The server can normalize common variations:
- `asc`, `ascending`, `1` → `ASC`
- `desc`, `descending`, `-1` → `DESC`

**Successful Response After Normalization:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...],
  "meta": {
    "sort": {
      "field": "createdDate",
      "direction": "asc"
    }
  }
}
```

## Edge Cases and Solutions

### Empty Result Sets

**Issue:** Different behaviors when no results are found.

**Request:**
```http
GET /v1/orders?status=NONEXISTENT_STATUS HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Solution:** Always return consistent empty result structure:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 0,
      "totalPages": 0
    },
    "filters": {
      "status": "NONEXISTENT_STATUS"
    }
  }
}
```

### Cursor Expiration

**Issue:** Cursors become invalid due to data changes or time limits.

**Request with Expired Cursor:**
```http
GET /v1/orders?cursor=eyJpZCI6Im9yZGVyLTEwMCIsInRpbWVzdGFtcCI6MTcwNDAwMDAwMDAwMH0= HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Cursor Structure (decoded):**
```json
{
  "id": "order-100",
  "timestamp": 1704000000000
}
```

If the cursor is older than the allowed TTL (e.g., 1 hour), return an error:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "Cursor has expired. Please start a new pagination request without a cursor.",
  "instance": "/v1/orders",
  "recommendation": "Remove the 'cursor' parameter to start from the beginning"
}
```

**Request with Malformed Cursor:**
```http
GET /v1/orders?cursor=invalid-base64-data HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "The cursor format is invalid or corrupted",
  "instance": "/v1/orders"
}
```

### Large Page Sizes

**Issue:** Users request extremely large page sizes that could crash the system.

**Request with Excessive Page Size:**
```http
GET /v1/orders?size=10000 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Error Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/resource-limit-exceeded",
  "title": "Resource Limit Exceeded",
  "status": 400,
  "detail": "Page size cannot exceed 100 items",
  "errors": [
    {
      "field": "size",
      "code": "EXCEEDS_MAX_PAGE_SIZE",
      "message": "Page size must be between 1 and 100",
      "providedValue": 10000,
      "minValue": 1,
      "maxValue": 100,
      "defaultValue": 20
    }
  ]
}
```

**Request with Invalid Page Size:**
```http
GET /v1/orders?size=-5 HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-parameter",
  "title": "Invalid Parameter",
  "status": 400,
  "detail": "Page size must be a positive number",
  "errors": [
    {
      "field": "size",
      "code": "INVALID_VALUE",
      "message": "Page size must be a positive number between 1 and 100",
      "providedValue": -5
    }
  ]
}
```

### Concurrent Modifications

**Issue:** Data changes while user is paginating through results.

**Solution:** Use consistent snapshots.

**Initial Request:**
```http
GET /v1/orders?size=20 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Response with Snapshot:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "hasNext": true
    },
    "snapshot": "2024-01-15T10:30:00Z"
  }
}
```

**Subsequent Request with Snapshot:**
```http
GET /v1/orders?page=1&size=20&snapshot=2024-01-15T10:30:00Z HTTP/1.1
Host: api.example.com
Accept: application/json
```

The server filters results to only include data that existed at or before the snapshot timestamp, ensuring consistent pagination even as data changes.

## Error Response Examples

### Invalid Filter Combination

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-filter-combination",
  "title": "Invalid Filter Combination",
  "status": 400,
  "detail": "Cannot combine multiple operators on the same field",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "total",
      "code": "CONFLICTING_OPERATORS",
      "message": "Cannot use both 'gt' and 'lt' operators with 'eq' on the same field",
      "conflictingFilters": ["total=100", "total[gt]=50"]
    }
  ]
}
```

### Sort Field Not Indexed

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/slow-sort-field",
  "title": "Sort Field Not Optimized",
  "status": 400,
  "detail": "The requested sort field may cause slow queries",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "sort",
      "code": "UNINDEXED_SORT_FIELD",
      "message": "Field 'description' is not indexed and may cause slow queries",
      "providedValue": "description,asc",
      "recommendation": "Use indexed fields for better performance",
      "indexedFields": ["id", "createdDate", "total", "status"]
    }
  ]
}
```

### Resource Limits Exceeded

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/resource-limit-exceeded",
  "title": "Resource Limit Exceeded",
  "status": 400,
  "detail": "The requested operation would exceed system resource limits",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "size",
      "code": "EXCEEDS_MAX_PAGE_SIZE",
      "message": "Page size cannot exceed 100 items",
      "providedValue": "500",
      "maxValue": 100
    }
  ]
}
```

## Performance Monitoring

### Identifying Slow Queries

APIs should track query performance and include timing information in responses when queries exceed thresholds.

**Response with Performance Warning:**
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Response-Time: 2500ms
X-Performance-Warning: Query exceeded 1000ms threshold

{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 50,
      "size": 20,
      "totalElements": 100000,
      "totalPages": 5000
    },
    "performance": {
      "queryTimeMs": 2500,
      "warning": "Consider using cursor-based pagination for better performance",
      "recommendations": [
        "Use cursor parameter instead of page for deep pagination",
        "Add filters to reduce result set size"
      ]
    }
  }
}
```

### Query Optimization Recommendations

APIs can provide optimization recommendations in error responses or metadata.

**Response with Optimization Hints:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...],
  "meta": {
    "pagination": {...},
    "optimization": {
      "recommendations": [
        {
          "type": "DEEP_PAGINATION",
          "message": "Consider using cursor-based pagination for better performance",
          "impact": "HIGH",
          "currentPage": 150,
          "threshold": 100
        },
        {
          "type": "UNINDEXED_FILTERS",
          "message": "Filters on unindexed fields may slow queries",
          "impact": "MEDIUM",
          "fields": ["customerName", "description"]
        }
      ]
    }
  }
}
```

## Best Practices Summary

1. **Always validate input parameters** - Check types, ranges, and allowed values
2. **Use parameterized queries** - Prevent SQL injection and improve performance
3. **Implement consistent error handling** - Return structured error responses
4. **Add unique sort criteria** - Ensure consistent ordering across requests
5. **Monitor query performance** - Log slow queries and optimize indexes
6. **Handle edge cases gracefully** - Empty results, invalid cursors, out-of-bounds pages
7. **Set reasonable limits** - Prevent resource exhaustion with max page sizes
8. **Use cursor pagination for large datasets** - Better performance than offset pagination
9. **Validate sortable fields** - Only allow sorting by indexed fields
10. **Provide clear error messages** - Help users understand and fix their requests

## Related Documentation

- [Main Pagination Guide](../../pagination-and-filtering.md)
- [Complete Examples](../examples/pagination/complete-examples.md)
- [Advanced Patterns](../reference/pagination/advanced-patterns.md)
- [Error Response Standards](../../error-response-standards.md)
