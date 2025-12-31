# Error Response Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Data, Architecture
> 
> **📊 Complexity:** 14.6 grade level • 2.3% technical density • difficult

## Overview

Consistent error handling is crucial for creating predictable, debuggable APIs. This document outlines the standards for error responses, including HTTP status codes, error formats, and the RFC 9457 Problem Details standard.

### Error Handling Flow

```
┌──────────┐         ┌──────────┐         ┌───────────────┐
│  Client  │────────▶│   API    │────────▶│   Service     │
└──────────┘         └────┬─────┘         └───────┬───────┘
                          │                       │
                          │   Request processing  │
                          │                       │
                          │                       ▼
                          │               ┌───────────────┐
                          │               │ Error occurs? │
                          │               └───────┬───────┘
                          │                       │
                          │           ┌───────────┴───────────┐
                          │           │                       │
                          │          Yes                      No
                          │           │                       │
                          │           ▼                       ▼
                          │   ┌───────────────┐       ┌───────────┐
                          │   │ Classify error│       │  Success  │
                          │   │ (4xx or 5xx)  │       │  response │
                          │   └───────┬───────┘       └───────────┘
                          │           │
                          │           ▼
                          │   ┌───────────────┐
                          │   │ Build Problem │
                          │   │ Details (9457)│
                          │   └───────┬───────┘
                          │           │
                          │           ▼
                          │   ┌───────────────┐
                          │   │  Log error    │
                          │   │  with context │
                          │   └───────┬───────┘
                          │           │
                          ◀───────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   Return    │
                   │ problem+json│
                   └─────────────┘
```

Every error follows this flow: detect, classify, format as RFC 9457, log, and return. This ensures consistent error handling across all endpoints.

## Status Code Decision Tree

Use this tree to choose the right HTTP status code for your error:

```
Is this a client error or server error?
├── Server Error ──────────────────────────────────────> 500 Internal Server Error
│   (Unhandled exception, system failure)
│
└── Client Error ─┬─> Is the request malformed or unparseable?
                  ├── Yes ────────────────────────────> 400 Bad Request
                  │   (Invalid JSON, wrong content type)
                  │
                  └── No ──> Is authentication missing or invalid?
                             ├── Yes ─────────────────> 401 Unauthorized
                             │   (No token, expired token)
                             │
                             └── No ──> Is user authenticated but lacks permission?
                                        ├── Yes ──────> 403 Forbidden
                                        │   (Valid user, wrong role)
                                        │
                                        └── No ──> Does the resource exist?
                                                   ├── No ───────> 404 Not Found
                                                   │   (ID doesn't exist)
                                                   │
                                                   └── Yes ─> Is there a state conflict?
                                                              ├── Yes ──> 409 Conflict
                                                              │   (Duplicate, version mismatch)
                                                              │
                                                              └── No ──> Are there validation errors?
                                                                         ├── Yes ─> 422 Unprocessable Entity
                                                                         │   (Business rule violation)
                                                                         │
                                                                         └── No ──> Is rate limit exceeded?
                                                                                    ├── Yes → 429 Too Many Requests
                                                                                    └── No ──> 400 Bad Request
                                                                                               (Catch-all client error)
```

**Quick reference by error type:**

| Error Type | Status Code | When to Use |
|------------|-------------|-------------|
| Syntax error | 400 | Malformed JSON, wrong types |
| Missing auth | 401 | No token or invalid token |
| Access denied | 403 | Valid token, insufficient permissions |
| Not found | 404 | Resource ID doesn't exist |
| State conflict | 409 | Duplicate, concurrent modification |
| Validation failed | 422 | Business rule violations |
| Rate limited | 429 | Too many requests |
| Server failure | 500 | Unhandled exceptions |

## HTTP Status Codes

Use appropriate HTTP status codes for different error scenarios:

| Status Code | Description | Example Usage |
|-------------|-------------|---------------|
| 400 Bad Request | Invalid request format or parameters | Missing required field, invalid format |
| 401 Unauthorized | Authentication required | Missing or invalid authentication token |
| 403 Forbidden | Authenticated but not authorized | User lacks required permissions |
| 404 Not Found | Resource not found | Requested entity doesn't exist |
| 409 Conflict | Request conflicts with current state | Duplicate entity, outdated version |
| 422 Unprocessable Entity | Validation errors | Business rule violations |
| 429 Too Many Requests | Rate limit exceeded | Client has sent too many requests |
| 500 Internal Server Error | Unexpected server error | Unhandled exceptions, system errors |

## Error Response Structure

All error responses must follow RFC 9457 Problem Details standard with Content-Type `application/problem+json`:

```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid parameters",
  "instance": "/api/orders/123",
  "invalid_params": [
    {
      "name": "email",
      "reason": "Email address is not properly formatted"
    }
  ]
}
```

### RFC 9457 Standard Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Optional | URI identifying the problem type (defaults to "about:blank") |
| `title` | Optional | Human-readable summary of the problem type |
| `status` | Optional | HTTP status code for convenience |
| `detail` | Optional | Human-readable explanation specific to this occurrence |
| `instance` | Optional | URI reference identifying the specific occurrence |

## Problem Type Standards

1. **Problem Type URIs**: Define unique URIs for each problem type (e.g., `https://api.example.com/problems/validation-error`)
2. **Domain-Specific Types**: Organize problem types by domain area
3. **Stable Identifiers**: Maintain stable problem type URIs across API versions
4. **Extension Fields**: Use additional fields for context-specific information

### Common Error Code Patterns

| Domain | Prefix | Example Codes |
|--------|--------|---------------|
| Order Management | `ORD_` | `ORD_VALIDATION_ERROR`, `ORD_PAYMENT_FAILED` |
| Customer Management | `CUST_` | `CUST_NOT_FOUND`, `CUST_DUPLICATE_EMAIL` |
| Authentication | `AUTH_` | `AUTH_TOKEN_EXPIRED`, `AUTH_INVALID_CREDENTIALS` |
| Payment Processing | `PAY_` | `PAY_INSUFFICIENT_FUNDS`, `PAY_GATEWAY_ERROR` |

## RFC 9457 Problem Details Standard

Use RFC 9457 Problem Details for consistent error responses across all APIs:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid parameters",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Email address is not properly formatted"
    }
  ]
}
```

### RFC 9457 Benefits

- **Standardized format** across different services and clients
- **Machine-readable** error types with URIs
- **Extensible** with custom properties
- **Wide framework support** in modern web frameworks

### Problem Details Standard Fields

While RFC 9457 makes all fields technically optional, these fields are strongly recommended for meaningful error responses:

| Field | Description | Example |
|-------|-------------|---------|
| `type` | URI identifying the problem type | `https://example.com/problems/validation-error` |
| `title` | Human-readable summary | `Validation Error` |
| `status` | HTTP status code | `400` |
| `detail` | Human-readable explanation | `The request contains invalid parameters` |
| `instance` | URI reference to problem occurrence | `/v1/orders` |

### RFC 9457 Optional Extensions

You can extend the Problem Details format with custom fields:

```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid parameters",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Email address is not properly formatted",
      "value": "invalid-email"
    }
  ],
  "requestId": "req-12345",
  "timestamp": "2024-07-15T14:32:22Z"
}
```

## Error Response Examples

### Validation Error Example

**POST /v1/orders**

Request:
```json
{
  "customerId": "",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Anytown"
    // zipCode missing
  },
  "paymentMethod": "INVALID_PAYMENT"
}
```

Response:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/validation-error",
  "title": "Order Validation Failed",
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
    },
    {
      "field": "paymentMethod",
      "code": "INVALID_VALUE",
      "message": "Payment method must be one of: CREDIT_CARD, PAYPAL, BANK_TRANSFER"
    }
  ]
}
```

### Business Logic Error Example

**POST /v1/orders/{orderId}/cancel**

Response:
```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/order-cannot-be-cancelled",
  "title": "Order Cannot Be Cancelled",
  "status": 409,
  "detail": "Orders that have been shipped cannot be cancelled",
  "instance": "/v1/orders/order-12345/cancel",
  "orderId": "order-12345",
  "orderStatus": "SHIPPED",
  "shippedDate": "2024-07-14T08:30:00Z"
}
```

### Authentication Error Example

**GET /v1/orders**

Response:
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: Bearer realm="api"

{
  "type": "https://example.com/problems/authentication-required",
  "title": "Authentication Required",
  "status": 401,
  "detail": "A valid authentication token is required to access this resource",
  "instance": "/v1/orders"
}
```

### Rate Limiting Error Example

**GET /v1/orders**

Response:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60

{
  "type": "https://example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded the maximum number of requests per minute",
  "instance": "/v1/orders",
  "limit": 100,
  "remaining": 0,
  "resetTime": "2024-07-15T14:33:22Z"
}
```

## Streaming API Error Handling

For streaming APIs, use Problem Details format for stream errors:

```json
{"type": "https://example.com/problems/stream-error", "title": "Stream Processing Error", "status": 500}
```

See [Streaming APIs](streaming-apis.md) for more details on streaming error patterns.

## Implementation Guidelines

### Content Type Headers

Always set the correct content type for error responses:

- **RFC 9457**: Use `application/problem+json`
- **Legacy format**: Use `application/json` with standard error structure

### Error Logging

Ensure error responses correlate with server logs:

1. **Request ID**: Include unique request identifiers in both response and logs
2. **Error Context**: Log sufficient context for debugging without exposing sensitive data
3. **Stack Traces**: Never include stack traces in production error responses

### Internationalization

For multi-language support:

```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid parameters",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Email address is not properly formatted",
      "localizedMessage": {
        "en": "Email address is not properly formatted",
        "es": "La dirección de correo electrónico no está correctamente formateada",
        "fr": "L'adresse e-mail n'est pas correctement formatée"
      }
    }
  ]
}
```

## Framework Integration

These error standards work with any REST framework through standard HTTP response mechanisms and JSON formatting.

## Implementation Checklist

Use this checklist when implementing error handling:

### Phase 1: Error Response Structure

- [ ] Configure `application/problem+json` as the content type for all error responses
- [ ] Define problem type URIs for each error category (e.g., `https://api.example.com/problems/validation-error`)
- [ ] Include all recommended RFC 9457 fields (`type`, `title`, `status`, `detail`, `instance`)
- [ ] Add request ID and timestamp as extension fields

### Phase 2: Status Code Mapping

- [ ] Map syntax/parsing errors to 400 Bad Request
- [ ] Map authentication failures to 401 Unauthorized
- [ ] Map authorization failures to 403 Forbidden
- [ ] Map missing resources to 404 Not Found
- [ ] Map state conflicts to 409 Conflict
- [ ] Map validation errors to 422 Unprocessable Entity
- [ ] Map rate limit exceeded to 429 Too Many Requests
- [ ] Map unhandled exceptions to 500 Internal Server Error

### Phase 3: Validation Error Details

- [ ] Return field-level errors in an `errors` array
- [ ] Include `field`, `code`, and `message` for each validation error
- [ ] Use consistent error codes across all endpoints (e.g., `REQUIRED`, `INVALID_FORMAT`)
- [ ] Support nested field paths for complex objects (e.g., `shippingAddress.zipCode`)

### Phase 4: Security and Logging

- [ ] Remove stack traces from production error responses
- [ ] Ensure error messages don't expose sensitive data or system details
- [ ] Use generic messages for authentication errors (don't confirm valid usernames)
- [ ] Log detailed error context server-side with request ID correlation

### Phase 5: Verification

- [ ] Test each status code scenario returns correct Problem Details format
- [ ] Verify `Content-Type: application/problem+json` header is set
- [ ] Confirm error responses include the request ID from the original request
- [ ] Validate against RFC 9457 specification
- [ ] Test that clients can parse and handle all error response types

## Related Documentation

- [Content Types and Structure](content-types-and-structure.md) - Basic request/response patterns
- [Pagination and Filtering](pagination-and-filtering.md) - Collection response patterns
- [Streaming APIs](streaming-apis.md) - Streaming response formats