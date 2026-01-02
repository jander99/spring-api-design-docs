# Cursor-Based Pagination

This document provides detailed guidance on implementing cursor-based pagination for high-performance APIs handling large datasets.

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

## Basic Cursor Implementation

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

### Query Parameters

```
# First page
GET /v1/orders?size=20

# Next page
GET /v1/orders?cursor=eyJpZCI6Im9yZGVyLTEyMzQ1IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0VDEwOjIyOjAwWiJ9&size=20

# Previous page
GET /v1/orders?cursor=eyJpZCI6Im9yZGVyLTEyMzQ0IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0VDEwOjIxOjAwWiJ9&size=20&direction=prev
```

## Cursor Structure Design

### Simple Cursor (Single Sort Field)

Decoded cursor JSON for sorting by created date only:

```json
{
  "id": "order-12345",
  "createdDate": "2024-04-14T10:22:00Z"
}
```

The cursor is Base64 encoded when transmitted in API responses and requests.

### Complex Cursor (Multiple Sort Fields)

Decoded cursor JSON for sorting by status, then created date, then total:

```json
{
  "id": "order-12345",
  "status": "PROCESSING",
  "createdDate": "2024-04-14T10:22:00Z",
  "total": 149.50
}
```

### Cursor with Metadata

Enhanced cursor with additional metadata:

```json
{
  "id": "order-12345",
  "createdDate": "2024-04-14T10:22:00Z",
  "timestamp": 1712998920000,
  "version": "1.0",
  "direction": "next"
}
```

## Advanced Cursor Patterns

### Encrypted Cursors

Cursors can be encrypted to prevent tampering and hide internal implementation details. The cursor structure remains the same but is encrypted before Base64 encoding.

Benefits:
- Prevents cursor manipulation
- Hides internal field names and values
- Allows embedding sensitive metadata like timestamps

Considerations:
- Adds processing overhead
- Requires secure key management
- Must handle decryption errors gracefully

### Stable Cursors with Snapshots

For consistent pagination across concurrent data modifications, cursors can include a snapshot timestamp:

```json
{
  "id": "order-12345",
  "createdDate": "2024-04-14T10:22:00Z",
  "snapshotTime": "2024-04-14T10:20:00Z"
}
```

The snapshot timestamp ensures all pages in a pagination session reflect the dataset state at a specific point in time.

## Performance Optimization

### Index Strategy

Database indexes should match cursor sort criteria exactly:

**Single Sort Field**:
- Index on `(createdDate, id)` for sorting by creation date

**Multiple Sort Fields**:
- Index on `(status, createdDate, total, id)` for multi-field sorting

**Partial Indexes**:
- For frequently filtered datasets, create partial indexes on active records only

### Query Optimization

- **Fetch one extra item**: Request `size + 1` items to determine if more pages exist
- **Use projections**: Only retrieve fields needed in the response
- **Minimize data transfer**: Exclude large fields not needed for listing
- **Cache cursor results**: Cache frequently accessed pages for short durations

### Cursor Caching

Cache cursor-based queries using a combination of:
- Cursor hash
- Page size
- Direction (next/previous)

Short cache TTLs (30-60 seconds) balance performance with data freshness.

## Error Handling

### Cursor Validation

Validate cursors before processing:
- **Format validation**: Ensure cursor is valid Base64
- **Structure validation**: Verify decoded cursor contains required fields
- **Type validation**: Confirm field types match expected schema
- **Expiration validation**: Check timestamp if cursors expire

### Error Responses

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "The provided cursor is malformed or expired",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "cursor",
      "code": "INVALID_CURSOR_FORMAT",
      "message": "Cursor format is invalid",
      "providedValue": "invalid-cursor-string"
    }
  ]
}
```

## Best Practices

1. **Always include a unique field** (like ID) in sort criteria for consistent ordering
2. **Use composite indexes** that match your sort criteria exactly
3. **Validate cursor format** and handle parsing errors gracefully
4. **Set cursor expiration** to prevent stale cursor issues
5. **Cache cursor results** for frequently accessed pages
6. **Use projections** to minimize data transfer
7. **Implement proper error handling** for invalid or expired cursors
8. **Test edge cases** thoroughly, including empty results and boundary conditions
9. **Monitor query performance** and optimize indexes based on usage patterns
10. **Consider hybrid approaches** for different use cases (offset for small datasets, cursor for large ones)

## Migration from Offset Pagination

### Hybrid Approach

Support both cursor and offset pagination during migration:

**Request Patterns**:
```
# Cursor-based (preferred for large datasets)
GET /v1/orders?cursor=eyJ...&size=20

# Offset-based (legacy support, limit to early pages)
GET /v1/orders?page=0&size=20
```

**Response with Both Styles**:
```json
{
  "data": [...],
  "meta": {
    "cursor": {
      "next": "eyJ...",
      "hasNext": true
    },
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 1250,
      "totalPages": 63
    }
  }
}
```

**Migration Strategy**:
1. Add cursor support while maintaining offset pagination
2. Return both cursor and offset metadata
3. Encourage cursor adoption through documentation
4. Deprecate offset pagination for large page numbers
5. Eventually require cursor for datasets beyond a threshold

## Related Documentation

- [Main Pagination Guide](../../pagination-and-filtering.md)
- [Advanced Patterns](advanced-patterns.md)
- [Complete Examples](../examples/pagination/complete-examples.md)
- [Common Issues](../troubleshooting/pagination/common-issues.md)
