# Request/Response Format Standards

> **Reading Guide**
> 
> **Reading Time:** 3 minutes | **Level:** Beginner
> 
> **Prerequisites:** Basic HTTP knowledge  
> **Key Topics:** JSON structure, errors, pagination

This section shows how to format API requests and responses. These guides work with any technology.

## What You'll Learn

Good formats make APIs easy to use. This guide covers:
- How to structure data
- How to handle errors
- How to return lists and pages

## Documentation

### [Content Types and Structure](content-types-and-structure.md)
**How to structure requests and responses**
- Standard content types
- Request validation
- Response format
- Link patterns (HATEOAS)

### [Error Response Standards](error-response-standards.md)
**How to handle errors**
- HTTP status codes
- Error response format
- RFC 7807 Problem Details
- Error code naming

### [Pagination and Filtering](pagination-and-filtering.md)
**How to return lists**
- Page response structure
- Filtering patterns
- Sorting options
- Search features

### [Streaming APIs](streaming-apis.md)
**How to stream data**
- NDJSON format
- Server-Sent Events (SSE)
- Flow control
- Large dataset handling

## Key Principles

### Works Everywhere
All patterns use HTTP and JSON. They work with any REST framework.

### Stay Consistent
- Use the same field names
- Use the same response structure
- Use the same error format
- Use the same pagination style

### Use Modern Standards
- RFC 7807 for errors
- JSON Schema for validation
- HTTP streaming protocols
- OAuth 2.1 for security

## Common Patterns

### Standard Response

```json
{
  "data": {
    "id": "123",
    "name": "Example"
  },
  "meta": {
    "timestamp": "2024-07-15T14:32:22Z",
    "requestId": "req-12345"
  }
}
```

### Error Response

```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request has invalid data",
  "instance": "/v1/orders"
}
```

### Collection Response

```json
{
  "data": [
    { "id": "1", "name": "First" },
    { "id": "2", "name": "Second" }
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    }
  }
}
```

## Quick Reference

### Content Types

| Type | Use For |
|------|---------|
| `application/json` | Default for all responses |
| `application/problem+json` | Error responses (RFC 7807) |
| `application/x-ndjson` | Streaming data |
| `text/event-stream` | Server-Sent Events |

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request |
| 401 | Not logged in |
| 403 | Not allowed |
| 404 | Not found |
| 422 | Invalid data |
| 500 | Server error |

### Pagination Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `page` | Page number (starts at 0) | 0 |
| `size` | Items per page | 20 |
| `sort` | Sort field and direction | varies |

## Related Documentation

- [API Design Standards](../) - Full API design guide
- [Spring Design Standards](../../spring-design/) - Spring Boot patterns
- [Security Standards](../security/security-standards.md) - Security guide
- [API Version Strategy](../foundations/api-version-strategy.md) - Versioning guide
