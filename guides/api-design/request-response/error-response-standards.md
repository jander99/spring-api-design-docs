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

> **Note**: RFC 9457 (July 2023) supersedes RFC 7807. The core structure remains identical, ensuring full backward compatibility. Existing RFC 7807 implementations automatically comply with RFC 9457.

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
- **IANA registry** for common, reusable problem types

### RFC 9457 Standard Fields

| Field | Description | Example |
|-------|-------------|---------|
| `type` | URI identifying the problem type | `https://example.com/problems/validation-error` |
| `title` | Human-readable summary | `Validation Error` |
| `status` | HTTP status code | `400` |
| `detail` | Human-readable explanation | `The request contains invalid parameters` |
| `instance` | URI reference to problem occurrence | `/v1/orders` |

> **Note**: Per RFC 9457, all fields are technically optional. However, including these standard fields ensures consistent, machine-readable error responses.

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

## IANA Problem Types Registry

RFC 9457 introduces a formal IANA registry for common problem types. This registry promotes reuse and interoperability across APIs.

### Registry Location

The registry is available at: `https://iana.org/assignments/http-problem-types`

### Registered Problem Types

| Type URI | Description | Use Case |
|----------|-------------|----------|
| `about:blank` | Default type with no additional semantics | When HTTP status code alone is sufficient |

### Using the Registry

1. **Check existing types first**: Before creating custom problem types, check if a registered type fits your use case
2. **Register common types**: If your problem type is widely applicable, consider registering it
3. **Use stable URIs**: For custom types, use URIs under your control that will remain stable

### When to Use `about:blank`

Use the default `about:blank` type when:
- The HTTP status code fully conveys the error meaning
- No additional context is needed beyond the status phrase
- You want minimal error responses

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404
}
```

## Handling Multiple Problems

RFC 9457 provides clear guidance for handling multiple errors in a single response.

### Same Problem Type (Recommended)

When multiple errors share the same type (e.g., validation errors), use an `errors` array extension:

```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "Multiple validation errors occurred",
  "errors": [
    {
      "pointer": "#/email",
      "detail": "Invalid email format"
    },
    {
      "pointer": "#/age",
      "detail": "Must be a positive integer"
    },
    {
      "pointer": "#/profile/color",
      "detail": "Must be 'red', 'green', or 'blue'"
    }
  ]
}
```

### Using JSON Pointer for Error Location

The `pointer` field uses JSON Pointer (RFC 6901) syntax to identify the exact location of each error:

| Pointer | Meaning |
|---------|---------|
| `#/email` | The `email` field at the root |
| `#/address/city` | The `city` field inside `address` |
| `#/items/0/quantity` | The `quantity` field in the first item |

### Different Problem Types

When errors have different types, return the **most relevant or urgent** problem. Avoid mixing unrelated error types in a single response, as this doesn't map well to HTTP semantics.

**Do this** (single most relevant error):
```json
{
  "type": "https://example.com/problems/payment-failed",
  "title": "Payment Failed",
  "status": 402,
  "detail": "Credit card was declined"
}
```

**Avoid this** (mixing unrelated errors):
```json
{
  "errors": [
    {"type": "validation-error", "field": "email"},
    {"type": "payment-failed", "reason": "declined"},
    {"type": "inventory-warning", "item": "low-stock"}
  ]
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

## Related Documentation

- [Content Types and Structure](content-types-and-structure.md) - Basic request/response patterns
- [Pagination and Filtering](pagination-and-filtering.md) - Collection response patterns
- [Streaming APIs](streaming-apis.md) - Streaming response formats
- [Schema Testing](../testing/schema-testing.md) - Testing error response schemas

### Spring Implementation
- [Schema Validation](../../../languages/spring/validation/schema-validation.md#integration-with-rfc-9457-error-responses) - RFC 9457 validation error handling
- [Error Response Formats](../../../languages/spring/error-handling/error-response-formats.md) - Spring implementation details