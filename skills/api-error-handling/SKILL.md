---
name: api-error-handling
description: Design and implement error responses for REST APIs with status codes (4xx, 5xx), error formats (RFC 9457 Problem Details, validation arrays), and exception patterns (hierarchy, mapping, logging). Use when creating error handling strategies, formatting validation responses, choosing HTTP status codes, or standardizing error responses across endpoints.
---

# API Error Handling

Design consistent, machine-readable error responses following RFC 9457 Problem Details standard.

## When to Use

- Creating error response formats for a new API
- Implementing validation error responses with field-level details
- Choosing between HTTP status codes (400 vs 422, 401 vs 403)
- Mapping exceptions to consistent error responses
- Designing error code registries for your domain

## Quick Start

All errors return `application/problem+json`:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "The request contains invalid parameters",
  "instance": "/v1/orders/123",
  "errors": [
    {"field": "email", "code": "INVALID_FORMAT", "message": "Must be valid email"}
  ]
}
```

## Status Code Decision

```
Is the request malformed? ─── Yes ──→ 400 Bad Request
         │ No
Is authentication missing/invalid? ─── Yes ──→ 401 Unauthorized
         │ No
Is the user forbidden? ─── Yes ──→ 403 Forbidden
         │ No
Does resource exist? ─── No ──→ 404 Not Found
         │ Yes
Is there a state conflict? ─── Yes ──→ 409 Conflict
         │ No
Did validation fail? ─── Yes ──→ 400 or 422
         │ No
         └──→ 500 Internal Server Error
```

## Core Patterns

### RFC 9457 Problem Details

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | URI identifying problem type |
| `title` | Yes | Human-readable summary |
| `status` | Yes | HTTP status code |
| `detail` | No | Explanation of this occurrence |
| `instance` | No | URI of this specific occurrence |

### Validation Errors

Use `errors` array with field path, code, and message:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "errors": [
    {"field": "items[0].quantity", "code": "MIN_VALUE", "message": "Must be at least 1"}
  ]
}
```

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| 200 OK with error body | Breaks HTTP semantics | Use proper status codes |
| Stack traces in response | Security risk | Log server-side only |
| Generic "Error occurred" | Not actionable | Include specific details |
| Inconsistent formats | Hard to handle | Use RFC 9457 everywhere |

## References

- `references/rfc-9457.md` - Complete RFC 9457 specification details
- `references/validation-patterns.md` - Field validation patterns
- `references/java-spring.md` - Spring Boot implementation
