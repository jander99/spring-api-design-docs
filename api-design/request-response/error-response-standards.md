# Error Response Standards

> **Reading Guide**
> 
> **Reading Time:** 5 minutes | **Level:** Intermediate
> 
> **Prerequisites:** Basic API knowledge, familiarity with HTTP status codes  
> **Key Topics:** Error handling, RFC 9457, HTTP status codes
> 
> **Complexity:** Grade 12 level

## Overview

Consistent error handling creates predictable, debuggable APIs. This document covers HTTP status codes, error classification, and the RFC 9457 Problem Details standard.

> **Complete RFC 9457 Reference:** For detailed field descriptions, extension patterns, and comprehensive examples, see the [RFC 9457 Problem Details Reference](reference/rfc-9457-reference.md).

### Error Handling Flow

```
+-----------+         +-----------+         +---------------+
|  Client   |-------->|   API     |-------->|   Service     |
+-----------+         +-----+-----+         +-------+-------+
                            |                       |
                            |   Request processing  |
                            |                       v
                            |               +---------------+
                            |               | Error occurs? |
                            |               +-------+-------+
                            |                       |
                            |           +-----------+-----------+
                            |           |                       |
                            |          Yes                      No
                            |           |                       |
                            |           v                       v
                            |   +---------------+       +-----------+
                            |   | Classify error|       |  Success  |
                            |   | (4xx or 5xx)  |       |  response |
                            |   +-------+-------+       +-----------+
                            |           |
                            |           v
                            |   +---------------+
                            |   | Build Problem |
                            |   | Details (9457)|
                            |   +-------+-------+
                            |           |
                            |           v
                            |   +---------------+
                            |   |  Log error    |
                            |   |  with context |
                            |   +-------+-------+
                            |           |
                            <-----------+
                            |
                            v
                     +-------------+
                     |   Return    |
                     | problem+json|
                     +-------------+
```

Every error follows this flow: detect, classify, format as RFC 9457, log, and return.

## HTTP Status Codes

### Status Code Decision Tree

```
Is this a client error or server error?
|-- Server Error -------------------------------------> 500 Internal Server Error
|   (Unhandled exception, system failure)
|
+-- Client Error -+-> Is the request malformed?
                  |-- Yes ----------------------------> 400 Bad Request
                  |   (Invalid JSON, wrong content type)
                  |
                  +-- No --> Is authentication missing/invalid?
                             |-- Yes -----------------> 401 Unauthorized
                             |   (No token, expired token)
                             |
                             +-- No --> Is user lacking permission?
                                        |-- Yes ------> 403 Forbidden
                                        |   (Valid user, wrong role)
                                        |
                                        +-- No --> Does the resource exist?
                                                   |-- No -------> 404 Not Found
                                                   |
                                                   +-- Yes -> Is there a state conflict?
                                                              |-- Yes --> 409 Conflict
                                                              |
                                                              +-- No --> Validation error?
                                                                         |-- Yes --> 422
                                                                         +-- No ---> 429 or 400
```

### Quick Reference

| Error Type | Status | When to Use |
|------------|--------|-------------|
| Syntax error | 400 | Malformed JSON, wrong types |
| Missing auth | 401 | No token or invalid token |
| Access denied | 403 | Valid token, insufficient permissions |
| Not found | 404 | Resource ID doesn't exist |
| State conflict | 409 | Duplicate, concurrent modification |
| Validation failed | 422 | Business rule violations |
| Rate limited | 429 | Too many requests |
| Server failure | 500 | Unhandled exceptions |

## RFC 9457 Problem Details

All error responses must use RFC 9457 Problem Details format with `Content-Type: application/problem+json`.

### Basic Structure

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid parameters",
  "instance": "/v1/orders/123"
}
```

### Standard Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Recommended | URI identifying the problem type |
| `title` | Recommended | Human-readable summary |
| `status` | Recommended | HTTP status code |
| `detail` | Recommended | Explanation specific to this occurrence |
| `instance` | Optional | URI reference to this occurrence |

> **More Details:** See [RFC 9457 Reference - Standard Fields](reference/rfc-9457-reference.md#standard-fields) for complete field documentation.

### Adding Custom Fields

Extend the format with context-specific information:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains 2 validation errors",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email address"
    }
  ],
  "requestId": "req-12345",
  "timestamp": "2024-07-15T14:32:22Z"
}
```

> **Extension Patterns:** See [RFC 9457 Reference - Extension Fields](reference/rfc-9457-reference.md#extension-fields) for validation errors, rate limiting, and business rule extensions.

## Common Error Examples

### Validation Error (400)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The order request contains validation errors",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "customerId",
      "code": "REQUIRED",
      "message": "Customer ID is required"
    },
    {
      "field": "shippingAddress.zipCode",
      "code": "REQUIRED",
      "message": "Zip code is required"
    }
  ]
}
```

### Business Logic Error (409)

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/order-cannot-be-cancelled",
  "title": "Order Cannot Be Cancelled",
  "status": 409,
  "detail": "Orders that have been shipped cannot be cancelled",
  "instance": "/v1/orders/order-12345/cancel",
  "orderId": "order-12345",
  "orderStatus": "SHIPPED"
}
```

### Authentication Error (401)

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: Bearer realm="api"

{
  "type": "https://api.example.com/problems/authentication-required",
  "title": "Authentication Required",
  "status": 401,
  "detail": "A valid authentication token is required",
  "instance": "/v1/orders"
}
```

### Rate Limiting Error (429)

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
  "retryAfter": 60
}
```

> **See Also**: [Rate Limiting Standards](../security/rate-limiting-standards.md) for complete rate limit header specifications and response patterns.

> **More Examples:** See [RFC 9457 Reference - Complete Examples](reference/rfc-9457-reference.md#complete-examples) for all status codes.

## Problem Type Standards

### URI Structure

Define unique, stable URIs for each problem type:

```
https://api.example.com/problems/
+-- validation-error          # Generic validation
+-- authentication-required   # Missing auth
+-- access-denied            # Insufficient permissions
+-- orders/
|   +-- cannot-cancel        # Order state conflict
|   +-- insufficient-inventory
+-- payments/
    +-- card-declined
    +-- insufficient-funds
```

### Domain Error Codes

Use prefixes to organize error codes by domain:

| Domain | Prefix | Example Codes |
|--------|--------|---------------|
| Order | `ORD_` | `ORD_VALIDATION_ERROR`, `ORD_PAYMENT_FAILED` |
| Customer | `CUST_` | `CUST_NOT_FOUND`, `CUST_DUPLICATE_EMAIL` |
| Auth | `AUTH_` | `AUTH_TOKEN_EXPIRED`, `AUTH_INVALID_CREDENTIALS` |
| Payment | `PAY_` | `PAY_INSUFFICIENT_FUNDS`, `PAY_GATEWAY_ERROR` |

> **Problem Type Registry:** See [RFC 9457 Reference - Problem Type Registry](reference/rfc-9457-reference.md#problem-type-registry) for complete type definitions.

## Implementation Guidelines

### Content Type Headers

Always set the correct content type:

```http
Content-Type: application/problem+json
```

### Error Logging

1. **Request ID**: Include unique request identifiers in both response and logs
2. **Error Context**: Log sufficient context for debugging without exposing sensitive data
3. **Stack Traces**: Never include stack traces in production error responses

### Security

- Remove stack traces from production responses
- Don't expose database errors or internal paths
- Use generic messages for authentication errors (don't confirm valid usernames)

> **Security Details:** See [RFC 9457 Reference - Security Considerations](reference/rfc-9457-reference.md#security-considerations) for complete security guidance.

### Internationalization

For multi-language support, include localized messages:

```json
{
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Email is not properly formatted",
      "localizedMessage": {
        "en": "Email is not properly formatted",
        "es": "El email no tiene el formato correcto"
      }
    }
  ]
}
```

## Implementation Checklist

### Phase 1: Response Structure
- [ ] Configure `application/problem+json` content type
- [ ] Define problem type URIs for each error category
- [ ] Include all RFC 9457 fields (`type`, `title`, `status`, `detail`, `instance`)
- [ ] Add request ID and timestamp extensions

### Phase 2: Status Code Mapping
- [ ] Map syntax errors to 400 Bad Request
- [ ] Map authentication failures to 401 Unauthorized
- [ ] Map authorization failures to 403 Forbidden
- [ ] Map missing resources to 404 Not Found
- [ ] Map state conflicts to 409 Conflict
- [ ] Map validation errors to 422 Unprocessable Entity
- [ ] Map rate limits to 429 Too Many Requests
- [ ] Map server errors to 500 Internal Server Error

### Phase 3: Validation Details
- [ ] Return field-level errors in an `errors` array
- [ ] Include `field`, `code`, and `message` for each error
- [ ] Use consistent error codes across endpoints
- [ ] Support nested field paths (e.g., `shippingAddress.zipCode`)

### Phase 4: Security
- [ ] Remove stack traces from production responses
- [ ] Ensure messages don't expose sensitive data
- [ ] Use generic authentication error messages
- [ ] Log detailed context server-side with request ID correlation

### Phase 5: Verification
- [ ] Test each status code returns correct Problem Details format
- [ ] Verify `Content-Type: application/problem+json` header
- [ ] Confirm error responses include request ID
- [ ] Validate against RFC 9457 specification

## Related Documentation

- [RFC 9457 Problem Details Reference](reference/rfc-9457-reference.md) - Complete specification reference
- [Content Types and Structure](content-types-and-structure.md) - Request/response patterns
- [HTTP Status Codes](../quick-reference/status-codes.md) - Status code quick reference
- [Streaming APIs](streaming-apis.md) - Streaming error patterns
