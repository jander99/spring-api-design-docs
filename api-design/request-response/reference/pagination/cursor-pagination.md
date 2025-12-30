# Cursor-Based Pagination

> **Reading Guide**
> - **Reading Time**: 6 minutes
> - **For**: Advanced developers implementing cursor pagination
> - **Prerequisites**: Strong API background, experience with complex systems
> - **Reading Level**: Grade 13.7 (Flesch: 25)

This document provides guidance on cursor-based pagination for high-performance APIs handling large datasets.

## Overview

Cursor-based pagination uses opaque tokens (cursors) to navigate through result sets instead of offset-based page numbers. This approach provides better performance and consistency for large datasets.

## When to Use Cursor Pagination

### Advantages
- **Constant performance**: O(1) lookup time regardless of position
- **Consistent results**: No duplicate or missing items during concurrent modifications
- **Real-time friendly**: Works well with frequently changing data
- **Scalable**: Performance doesn't degrade with dataset size

### Use Cases
- Large datasets (>10,000 items)
- Real-time feeds or timelines
- Frequently updated data
- Mobile applications requiring smooth scrolling
- APIs with high concurrency

## Request Format

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `cursor` | string | Opaque cursor token from previous response |
| `size` | integer | Number of items per page (default: 20, max: 100) |
| `direction` | string | Navigation direction: `next` or `prev` |

### Example Requests

```http
# First page (no cursor)
GET /v1/orders?size=20 HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
# Next page (with cursor)
GET /v1/orders?cursor=eyJpZCI6Im9yZGVyLTEyMzQ1IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0VDEwOjIyOjAwWiJ9&size=20 HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
# Previous page
GET /v1/orders?cursor=eyJpZCI6Im9yZGVyLTEyMzQ0In0&size=20&direction=prev HTTP/1.1
Host: api.example.com
Accept: application/json
```

## Response Format

### Response Structure

```json
{
  "data": [
    {
      "id": "order-12345",
      "customerId": "cust-67890",
      "total": 149.50,
      "status": "PROCESSING",
      "createdDate": "2024-04-14T10:22:00Z"
    },
    {
      "id": "order-12346",
      "customerId": "cust-11111",
      "total": 89.99,
      "status": "SHIPPED",
      "createdDate": "2024-04-14T10:23:00Z"
    }
  ],
  "meta": {
    "cursor": {
      "current": "eyJpZCI6Im9yZGVyLTEyMzQ1IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0VDEwOjIyOjAwWiJ9",
      "next": "eyJpZCI6Im9yZGVyLTEyMzQ2IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0VDEwOjIzOjAwWiJ9",
      "previous": null,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of items for this page |
| `meta.cursor.current` | string | Cursor representing the current page position |
| `meta.cursor.next` | string | Cursor to fetch the next page (null if no more) |
| `meta.cursor.previous` | string | Cursor to fetch the previous page (null if at start) |
| `meta.cursor.hasNext` | boolean | Whether more items exist after this page |
| `meta.cursor.hasPrevious` | boolean | Whether items exist before this page |

## Cursor Design Principles

### Cursor Structure

Cursors should be opaque to clients but contain enough information for the server to resume pagination. A typical cursor contains:

- **Sort field values**: Values of fields used for ordering
- **Unique identifier**: Ensures stable positioning for ties
- **Optional metadata**: Version, timestamp, or direction hints

### Cursor Encoding

Cursors are typically Base64-encoded JSON:

```
Original:     {"id":"order-12345","createdDate":"2024-04-14T10:22:00Z"}
Encoded:      eyJpZCI6Im9yZGVyLTEyMzQ1IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0VDEwOjIyOjAwWiJ9
```

### Simple vs Complex Cursors

**Simple Cursor** (single sort field):
```json
{
  "id": "order-12345",
  "createdDate": "2024-04-14T10:22:00Z"
}
```

**Complex Cursor** (multiple sort fields):
```json
{
  "id": "order-12345",
  "status": "PROCESSING",
  "createdDate": "2024-04-14T10:22:00Z",
  "total": 149.50
}
```

**Cursor with Metadata**:
```json
{
  "id": "order-12345",
  "createdDate": "2024-04-14T10:22:00Z",
  "version": "1.0",
  "expiresAt": "2024-04-14T11:22:00Z"
}
```

## Advanced Patterns

### Encrypted Cursors

For security-sensitive applications, encrypt cursor contents:

- Prevents clients from tampering with cursor data
- Hides internal database structure
- Enables cursor expiration validation

### Stable Cursors with Snapshots

For consistent pagination during concurrent modifications:

- Include a snapshot timestamp in the cursor
- Filter results to only include items from that snapshot
- Prevents items from appearing/disappearing between pages

### Bidirectional Navigation

Support both forward and backward navigation:

```http
# Forward navigation
GET /v1/orders?cursor=abc123&direction=next

# Backward navigation
GET /v1/orders?cursor=abc123&direction=prev
```

## Error Handling

### Invalid Cursor Response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "The provided cursor is malformed or expired",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "cursor",
      "code": "INVALID_CURSOR_FORMAT",
      "message": "Cursor format is invalid"
    }
  ]
}
```

### Expired Cursor Response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/expired-cursor",
  "title": "Cursor Expired",
  "status": 400,
  "detail": "The cursor has expired. Please start from the beginning.",
  "instance": "/v1/orders"
}
```

## Performance Considerations

### Database Indexing

Create indexes that match your sort criteria:

- Index should cover all sort fields plus the unique identifier
- Order of fields in index should match sort order
- Consider partial indexes for filtered queries

### Query Optimization

- Use cursor fields in WHERE clause for efficient seeks
- Avoid OFFSET-based queries which scan from the beginning
- Fetch one extra item to determine if more pages exist

### Caching

- Cache cursor results for frequently accessed pages
- Use short TTL (e.g., 60 seconds) to balance freshness and performance
- Include all pagination parameters in cache key

## Best Practices

1. **Always include a unique field** in sort criteria for consistent ordering
2. **Keep cursors opaque** - clients should not parse or construct them
3. **Validate cursor format** and handle parsing errors gracefully
4. **Set cursor expiration** to prevent stale cursor issues
5. **Use proper indexes** that match your sort criteria exactly
6. **Test edge cases** including empty results and boundary conditions
7. **Document cursor behavior** including expiration and error handling
8. **Consider hybrid approaches** for different use cases

## Migration from Offset Pagination

When migrating from offset to cursor pagination:

1. **Support both temporarily**: Accept both `page` and `cursor` parameters
2. **Prefer cursor when provided**: Use cursor if present, fall back to offset
3. **Limit offset usage**: Only allow offset for small page numbers (e.g., page < 10)
4. **Deprecate offset gradually**: Communicate deprecation timeline to clients

### Hybrid Request Example

```http
# Offset-style (deprecated, limited to first 10 pages)
GET /v1/orders?page=0&size=20

# Cursor-style (preferred)
GET /v1/orders?cursor=abc123&size=20
```

### Hybrid Response Example

Both approaches return the same response format with cursor information:

```json
{
  "data": [...],
  "meta": {
    "cursor": {
      "next": "eyJpZCI6...",
      "hasNext": true
    },
    "pagination": {
      "page": 0,
      "size": 20,
      "deprecationWarning": "Offset pagination is deprecated. Use cursor parameter instead."
    }
  }
}
```

## Response Schema

```yaml
CursorPaginatedResponse:
  type: object
  required:
    - data
    - meta
  properties:
    data:
      type: array
      items:
        $ref: '#/components/schemas/Item'
    meta:
      type: object
      required:
        - cursor
      properties:
        cursor:
          type: object
          required:
            - hasNext
            - hasPrevious
          properties:
            current:
              type: string
              description: Current page cursor
            next:
              type: string
              nullable: true
              description: Cursor for next page
            previous:
              type: string
              nullable: true
              description: Cursor for previous page
            hasNext:
              type: boolean
              description: Whether more items exist
            hasPrevious:
              type: boolean
              description: Whether previous items exist
```

## Related Documentation

- [Main Pagination Guide](../../pagination-and-filtering.md)
- [Advanced Patterns](advanced-patterns.md)
- [Complete Examples](../../examples/pagination/complete-examples.md)
- [Common Issues](../../troubleshooting/pagination/common-issues.md)

## Implementation References

For language-specific implementation details, see:
- [Spring Boot Cursor Pagination](../../../../spring-design/pagination/cursor-pagination-implementation.md) - Java/Spring implementation patterns
