---
name: api-error-handling
description: Design and implement error responses for REST APIs using RFC 9457 Problem Details. Use when creating error handling strategies, validation error formats, exception hierarchies, or implementing consistent error responses across API endpoints.
---

# API Error Handling

## When to Use This Skill

Activate this skill when you need to:
- Design error response formats for an API
- Implement RFC 9457 Problem Details standard
- Handle validation errors with field-level details
- Choose appropriate HTTP status codes for errors
- Create exception hierarchies for business logic
- Map exceptions to consistent error responses

## Core Principles

### Use RFC 9457 Problem Details

All error responses should follow RFC 9457 Problem Details with Content-Type `application/problem+json`:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid parameters",
  "instance": "/v1/orders/123"
}
```

**Recommended fields (per RFC 9457):**
- `type`: URI identifying the problem type (use `about:blank` for generic errors)
- `title`: Human-readable summary of the problem type
- `status`: HTTP status code
- `detail`: Human-readable explanation of this specific occurrence
- `instance`: URI reference identifying this specific occurrence

### HTTP Status Code Selection

| Scenario | Status | When to Use |
|----------|--------|-------------|
| Invalid request format | 400 | Malformed JSON, missing required fields |
| Authentication required | 401 | Missing or invalid token |
| Insufficient permissions | 403 | Valid auth but lacks access rights |
| Resource not found | 404 | Entity doesn't exist |
| Method not allowed | 405 | Wrong HTTP verb for endpoint |
| Conflict with state | 409 | Duplicate entry, version conflict |
| Validation failed | 400 or 422 | Business rule violations |
| Rate limit exceeded | 429 | Too many requests |
| Server error | 500 | Unhandled exceptions |

**Decision rule:** Use 400 for syntactic errors (malformed input), 422 for semantic errors (valid syntax, invalid meaning).

### Validation Error Structure

Include field-level details for validation errors:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more fields failed validation",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email address"
    },
    {
      "field": "items[0].quantity",
      "code": "MIN_VALUE",
      "message": "Must be at least 1"
    }
  ]
}
```

**Error array conventions:**
- Use dot notation for nested fields: `address.zipCode`
- Use bracket notation for arrays: `items[0].productId`
- Include machine-readable `code` for client handling
- Include human-readable `message` for display

### Error Code Naming

Use domain-prefixed error codes for consistency:

| Domain | Prefix | Examples |
|--------|--------|----------|
| Order | `ORD_` | `ORD_NOT_FOUND`, `ORD_INVALID_STATUS` |
| Customer | `CUST_` | `CUST_DUPLICATE_EMAIL` |
| Payment | `PAY_` | `PAY_DECLINED`, `PAY_INSUFFICIENT_FUNDS` |
| Auth | `AUTH_` | `AUTH_TOKEN_EXPIRED` |
| Validation | `VAL_` | `VAL_REQUIRED`, `VAL_INVALID_FORMAT` |

## Quick Reference

### Status Code Decision Tree

```
Is the request malformed (syntax)?
├─ Yes → 400 Bad Request
└─ No → Is authentication missing/invalid?
         ├─ Yes → 401 Unauthorized
         └─ No → Is the user forbidden from this resource?
                  ├─ Yes → 403 Forbidden
                  └─ No → Does the resource exist?
                           ├─ No → 404 Not Found
                           └─ Yes → Is there a business rule conflict?
                                    ├─ Yes → 409 Conflict
                                    └─ No → Did validation fail?
                                             ├─ Yes → 400 or 422
                                             └─ No → 500 Internal Server Error
```

### Problem Type URI Patterns

```
https://api.example.com/problems/
├── validation-error          # 400 - Field validation failed
├── authentication-required   # 401 - Token missing/invalid
├── access-denied            # 403 - Insufficient permissions
├── resource-not-found       # 404 - Entity doesn't exist
├── conflict                 # 409 - State conflict
├── rate-limit-exceeded      # 429 - Too many requests
└── internal-error           # 500 - Server error
```

## Loading Additional Context

Load these references based on what you need:

- **RFC 9457 details and extensions**: Load `references/rfc-9457.md`
- **Validation error patterns**: Load `references/validation-patterns.md`
- **Java/Spring implementation**: Load `references/java-spring.md`

## Examples

### Validation Error Response

```http
POST /v1/orders HTTP/1.1
Content-Type: application/json

{"customerId": "", "items": []}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "The order request contains validation errors",
  "instance": "/v1/orders",
  "errors": [
    {"field": "customerId", "code": "REQUIRED", "message": "Customer ID is required"},
    {"field": "items", "code": "NOT_EMPTY", "message": "At least one item is required"}
  ]
}
```

### Business Logic Error Response

```http
POST /v1/orders/123/cancel HTTP/1.1
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/order-cannot-be-cancelled",
  "title": "Order Cannot Be Cancelled",
  "status": 409,
  "detail": "Orders that have been shipped cannot be cancelled",
  "instance": "/v1/orders/123/cancel",
  "orderId": "123",
  "currentStatus": "SHIPPED"
}
```

### Authentication Error Response

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: Bearer realm="api"

{
  "type": "https://api.example.com/problems/authentication-required",
  "title": "Authentication Required",
  "status": 401,
  "detail": "A valid access token is required",
  "instance": "/v1/orders"
}
```

### Rate Limit Error Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60

{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded 100 requests per minute",
  "instance": "/v1/orders",
  "limit": 100,
  "remaining": 0,
  "resetTime": "2024-01-15T10:31:00Z"
}
```

## Anti-Patterns

**Never do these:**

- Return 200 OK with error in response body
- Expose stack traces in production responses
- Use inconsistent error formats across endpoints
- Return generic messages without actionable details
- Leak internal implementation details (table names, query errors)
- Skip the `type` field (use `about:blank` if no specific URI)
- Use custom error formats when RFC 9457 works
- Return 500 for client errors (validation, auth, not found)

## Implementation Checklist

When implementing error handling:

1. [ ] Define problem type URIs for your domain errors
2. [ ] Create error code registry with domain prefixes
3. [ ] Implement RFC 9457 response structure
4. [ ] Set `Content-Type: application/problem+json`
5. [ ] Include `instance` with the request path
6. [ ] Add `errors` array for validation failures
7. [ ] Include correlation ID (requestId) for tracing
8. [ ] Sanitize messages in production (no stack traces)
9. [ ] Log errors server-side with full context
10. [ ] Test error responses in API tests
