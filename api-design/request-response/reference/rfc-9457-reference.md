# RFC 9457 Problem Details Reference

This reference provides complete documentation for implementing RFC 9457 Problem Details in HTTP APIs. RFC 9457 obsoletes RFC 7807 and defines the standard format for expressing errors.

## Overview

RFC 9457 Problem Details provides a machine-readable format for error responses. It enables consistent error handling across services and clients.

**Key Benefits:**
- Standardized format across different services
- Machine-readable error types with URIs
- Extensible with custom properties
- Wide framework support in modern web frameworks

## Content-Type

Always use the correct media type for Problem Details responses:

```http
Content-Type: application/problem+json
```

For XML APIs (less common):
```http
Content-Type: application/problem+xml
```

---

## Standard Fields

### Field Summary

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | URI | Recommended | Identifies the problem type. Defaults to `about:blank` if omitted |
| `title` | string | Recommended | Human-readable summary of the problem type |
| `status` | integer | Recommended | HTTP status code (matches response status) |
| `detail` | string | Recommended | Human-readable explanation specific to this occurrence |
| `instance` | URI | Optional | URI reference identifying this specific occurrence |

All fields are technically optional per the specification. However, meaningful error responses should include `type`, `title`, `status`, and `detail`.

### Field Details

#### `type` Field

The `type` field is a URI that identifies the problem type.

**Requirements:**
- Must be a valid URI
- Use `about:blank` for generic problems without a specific type
- Should be dereferenceable (ideally returns documentation)
- Remains stable across API versions

**Examples:**

```json
// Specific problem type
"type": "https://api.example.com/problems/validation-error"

// Domain-specific problem
"type": "https://api.example.com/problems/orders/insufficient-inventory"

// Generic problem (default)
"type": "about:blank"
```

**Best Practices:**
- Create a problem type registry for your API
- Use hierarchical URIs organized by domain
- Document each problem type with resolution steps
- Keep URIs stable even when API versions change

#### `title` Field

The `title` field provides a short, human-readable summary of the problem type.

**Requirements:**
- Should not change between occurrences of the same problem type
- Should be localizable
- Matches the problem `type`, not the specific occurrence

**Examples:**

```json
// Correct: Generic title for the problem type
"title": "Validation Error"

// Incorrect: Specific to this occurrence (use detail instead)
"title": "Email field is invalid"
```

**Best Practices:**
- Keep titles concise (2-5 words)
- Use sentence case
- Make titles consistent for each problem type

#### `status` Field

The `status` field contains the HTTP status code.

**Requirements:**
- Must match the actual HTTP response status code
- Included for convenience when the response body is processed separately

**Example:**

```json
"status": 400
```

**Best Practices:**
- Always include for client convenience
- Ensure it matches the HTTP response status

#### `detail` Field

The `detail` field provides a human-readable explanation specific to this occurrence.

**Requirements:**
- Explains this specific occurrence (not the problem type in general)
- May include dynamic values
- Should be actionable when possible

**Examples:**

```json
// Good: Specific and actionable
"detail": "Your account balance of $10.00 is insufficient for this $25.00 purchase"

// Good: Includes context
"detail": "The email address 'invalid@' is not properly formatted"

// Bad: Too generic
"detail": "An error occurred"
```

**Best Practices:**
- Include specific values that help debugging
- Make messages actionable when possible
- Avoid exposing sensitive or internal information

#### `instance` Field

The `instance` field is a URI reference to this specific problem occurrence.

**Requirements:**
- Typically the request path
- Can be used for log correlation
- May include unique identifiers

**Examples:**

```json
// Request path
"instance": "/v1/orders/ord-12345"

// With request identifier
"instance": "/v1/orders?requestId=req-550e8400"
```

**Best Practices:**
- Use the request path as a baseline
- Include identifiers for log correlation
- Consider including request IDs for debugging

---

## Extension Fields

RFC 9457 allows custom extension fields beyond the standard five. Extensions add context-specific information.

### Extension Guidelines

1. **Use lowercase with underscores**: `error_code`, `retry_after`
2. **Avoid conflicts**: Don't redefine standard fields
3. **Document extensions**: Include in API documentation
4. **Be consistent**: Use the same extensions across your API

### Common Extension Patterns

#### Validation Errors Extension

Use for field-level validation failures:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains 3 validation errors",
  "instance": "/v1/users",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email address",
      "value": "not-an-email"
    },
    {
      "field": "password",
      "code": "TOO_SHORT",
      "message": "Must be at least 8 characters",
      "value": null
    },
    {
      "field": "age",
      "code": "OUT_OF_RANGE",
      "message": "Must be between 18 and 120",
      "value": 15
    }
  ]
}
```

**Error object fields:**

| Field | Type | Description |
|-------|------|-------------|
| `field` | string | Field name (use dot notation for nested: `address.zipCode`) |
| `code` | string | Machine-readable error code |
| `message` | string | Human-readable description |
| `value` | any | The rejected value (omit for sensitive data) |

#### Request Correlation Extension

Use for debugging and log correlation:

```json
{
  "type": "https://api.example.com/problems/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred while processing your request",
  "instance": "/v1/orders",
  "requestId": "req-550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "traceId": "abc123def456"
}
```

#### Rate Limiting Extension

Use when rate limits are exceeded:

```json
{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded 100 requests per minute",
  "instance": "/v1/orders",
  "limit": 100,
  "remaining": 0,
  "reset": "2024-01-15T10:31:00Z",
  "retryAfter": 60
}
```

Also include the `Retry-After` HTTP header:
```http
Retry-After: 60
```

#### Business Rule Extension

Use for domain-specific business rule violations:

```json
{
  "type": "https://api.example.com/problems/orders/cannot-cancel",
  "title": "Order Cannot Be Cancelled",
  "status": 409,
  "detail": "Orders that have been shipped cannot be cancelled",
  "instance": "/v1/orders/ord-12345/cancel",
  "orderId": "ord-12345",
  "orderStatus": "SHIPPED",
  "shippedDate": "2024-01-14T08:30:00Z",
  "allowedActions": ["return", "contact-support"]
}
```

#### Insufficient Funds Extension

Use for payment failures:

```json
{
  "type": "https://api.example.com/problems/payments/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 400,
  "detail": "Your account balance of $10.00 is insufficient for this $25.00 purchase",
  "instance": "/v1/payments/pay-12345",
  "accountBalance": 10.00,
  "requiredAmount": 25.00,
  "currency": "USD"
}
```

---

## Problem Type Registry

Maintain a registry of problem types for your API. This ensures consistency and provides documentation for clients.

### Standard HTTP Problems

| Type URI Suffix | Title | Status | Usage |
|-----------------|-------|--------|-------|
| `about:blank` | (varies) | (varies) | Generic problems, no specific type |
| `/validation-error` | Validation Error | 400 | Field validation failures |
| `/malformed-request` | Malformed Request | 400 | Unparseable request body |
| `/authentication-required` | Authentication Required | 401 | Missing or invalid credentials |
| `/token-expired` | Token Expired | 401 | Authentication token has expired |
| `/access-denied` | Access Denied | 403 | Insufficient permissions |
| `/resource-not-found` | Resource Not Found | 404 | Entity doesn't exist |
| `/method-not-allowed` | Method Not Allowed | 405 | Wrong HTTP method |
| `/conflict` | Conflict | 409 | State conflict or duplicate |
| `/precondition-failed` | Precondition Failed | 412 | ETag/version mismatch |
| `/unsupported-media-type` | Unsupported Media Type | 415 | Wrong Content-Type |
| `/unprocessable-entity` | Unprocessable Entity | 422 | Semantic validation error |
| `/rate-limit-exceeded` | Rate Limit Exceeded | 429 | Too many requests |
| `/internal-error` | Internal Server Error | 500 | Server errors |
| `/service-unavailable` | Service Unavailable | 503 | Temporary unavailability |

### Domain-Specific Problem Types

Organize problem types by domain:

```
https://api.example.com/problems/
├── orders/
│   ├── cannot-cancel          # 409 - Order already shipped
│   ├── insufficient-inventory # 400 - Not enough stock
│   ├── payment-required       # 402 - Payment needed
│   ├── minimum-not-met        # 400 - Below minimum order value
│   └── invalid-shipping       # 400 - Cannot ship to address
├── payments/
│   ├── card-declined          # 400 - Card was declined
│   ├── insufficient-funds     # 400 - Not enough balance
│   ├── expired-card           # 400 - Card has expired
│   ├── invalid-cvv            # 400 - CVV doesn't match
│   └── fraud-suspected        # 403 - Transaction blocked
├── users/
│   ├── email-already-exists   # 409 - Duplicate email
│   ├── account-suspended      # 403 - Account is suspended
│   ├── account-locked         # 403 - Too many failed attempts
│   └── password-requirements  # 400 - Password doesn't meet policy
└── inventory/
    ├── out-of-stock           # 400 - Item unavailable
    ├── discontinued           # 410 - Item no longer sold
    └── reservation-expired    # 409 - Hold has expired
```

### Documenting Problem Types

Each problem type should have documentation accessible at its URI. Include:

1. **Description**: What this error means
2. **Causes**: Common reasons this error occurs
3. **Resolution**: Steps to fix the problem
4. **Example**: Sample response body

Example documentation page:

```markdown
# Insufficient Inventory

**Type URI**: `https://api.example.com/problems/orders/insufficient-inventory`

## Description
The requested quantity is not available in inventory.

## Causes
- Requested quantity exceeds available stock
- Item is temporarily out of stock
- Concurrent orders depleted inventory

## Resolution
1. Reduce the requested quantity
2. Wait for inventory replenishment
3. Subscribe to stock notifications

## Example Response
{
  "type": "https://api.example.com/problems/orders/insufficient-inventory",
  "title": "Insufficient Inventory",
  "status": 400,
  "detail": "Only 5 units available for SKU-12345, but 10 were requested",
  "instance": "/v1/orders",
  "sku": "SKU-12345",
  "requestedQuantity": 10,
  "availableQuantity": 5
}
```

---

## Complete Examples

### Validation Error (400)

Request:
```http
POST /v1/users HTTP/1.1
Content-Type: application/json

{
  "email": "invalid",
  "password": "123",
  "age": -5
}
```

Response:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains 3 validation errors",
  "instance": "/v1/users",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email address"
    },
    {
      "field": "password",
      "code": "TOO_SHORT",
      "message": "Password must be at least 8 characters"
    },
    {
      "field": "age",
      "code": "OUT_OF_RANGE",
      "message": "Age must be a positive number"
    }
  ],
  "requestId": "req-abc123"
}
```

### Authentication Required (401)

Response:
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: Bearer realm="api"

{
  "type": "https://api.example.com/problems/authentication-required",
  "title": "Authentication Required",
  "status": 401,
  "detail": "A valid access token is required to access this resource",
  "instance": "/v1/orders"
}
```

### Token Expired (401)

Response:
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: Bearer realm="api", error="invalid_token", error_description="Token has expired"

{
  "type": "https://api.example.com/problems/token-expired",
  "title": "Token Expired",
  "status": 401,
  "detail": "Your access token expired at 2024-01-15T10:00:00Z",
  "instance": "/v1/orders",
  "expiredAt": "2024-01-15T10:00:00Z"
}
```

### Access Denied (403)

Response:
```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/access-denied",
  "title": "Access Denied",
  "status": 403,
  "detail": "You do not have permission to delete orders",
  "instance": "/v1/orders/ord-12345",
  "requiredPermission": "orders:delete",
  "currentPermissions": ["orders:read", "orders:create"]
}
```

### Resource Not Found (404)

Response:
```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/resource-not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "No order found with ID 'ord-12345'",
  "instance": "/v1/orders/ord-12345",
  "resourceType": "Order",
  "resourceId": "ord-12345"
}
```

### Conflict - Duplicate (409)

Response:
```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/users/email-already-exists",
  "title": "Email Already Exists",
  "status": 409,
  "detail": "A user with email 'john@example.com' already exists",
  "instance": "/v1/users",
  "existingUserId": "usr-67890"
}
```

### Conflict - State (409)

Response:
```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/orders/cannot-cancel",
  "title": "Order Cannot Be Cancelled",
  "status": 409,
  "detail": "Orders that have been shipped cannot be cancelled",
  "instance": "/v1/orders/ord-12345/cancel",
  "orderId": "ord-12345",
  "currentStatus": "SHIPPED",
  "shippedAt": "2024-01-14T08:30:00Z",
  "allowedActions": ["return", "contact-support"]
}
```

### Precondition Failed (412)

Response:
```http
HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/precondition-failed",
  "title": "Precondition Failed",
  "status": 412,
  "detail": "The resource has been modified since you last retrieved it",
  "instance": "/v1/orders/ord-12345",
  "expectedETag": "\"abc123\"",
  "currentETag": "\"def456\""
}
```

### Unprocessable Entity (422)

Response:
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/orders/minimum-not-met",
  "title": "Minimum Order Value Not Met",
  "status": 422,
  "detail": "Orders must be at least $25.00, but your order total is $15.00",
  "instance": "/v1/orders",
  "orderTotal": 15.00,
  "minimumRequired": 25.00,
  "currency": "USD"
}
```

### Rate Limit Exceeded (429)

Response:
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
  "reset": "2024-01-15T10:31:00Z",
  "retryAfter": 60
}
```

### Internal Server Error (500)

Response:
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred. Please try again or contact support.",
  "instance": "/v1/orders",
  "requestId": "req-550e8400-e29b-41d4",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Internationalization

RFC 9457 supports multi-language error messages through several patterns.

### Option 1: Accept-Language Header

Client sends preferred language:
```http
Accept-Language: es-ES, es;q=0.9, en;q=0.8
```

Server responds in requested language:
```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Error de Validación",
  "status": 400,
  "detail": "El campo email no es válido"
}
```

### Option 2: Localized Messages Extension

Include multiple translations in the response:
```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The email field is invalid",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email",
      "localizedMessages": {
        "en": "Must be a valid email",
        "es": "Debe ser un email válido",
        "fr": "Doit être un email valide",
        "de": "Muss eine gültige E-Mail sein"
      }
    }
  ]
}
```

### Option 3: Error Code + Client Translation

Return only error codes, let client translate:
```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT"
    }
  ]
}
```

Client maintains translation dictionary for codes.

---

## Content Negotiation

Handle clients that don't accept `application/problem+json`.

### Standard JSON Fallback

If client sends:
```http
Accept: application/json
```

Response can still use RFC 9457 structure:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request validation failed"
}
```

### Accept Header Handling

```
Accept: application/problem+json  → Content-Type: application/problem+json
Accept: application/json          → Content-Type: application/json (same structure)
Accept: */*                       → Content-Type: application/problem+json
```

---

## Security Considerations

### Information to Exclude

Never include in error responses:
- Stack traces
- Database error messages or queries
- Internal file paths
- Server configuration details
- Dependency versions
- Internal IP addresses
- Debug information in production

### Safe vs Unsafe Messages

**Unsafe (exposes internals):**
```json
{
  "detail": "SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry 'john@example.com' for key 'users.email_unique'"
}
```

**Safe (actionable, no internals):**
```json
{
  "type": "https://api.example.com/problems/users/email-already-exists",
  "detail": "A user with this email address already exists"
}
```

### Authentication Error Messages

Don't confirm valid usernames:

**Unsafe:**
```json
{
  "detail": "Invalid password for user 'john@example.com'"
}
```

**Safe:**
```json
{
  "detail": "Invalid email or password"
}
```

### Production vs Development

Development (more detail for debugging):
```json
{
  "type": "https://api.example.com/problems/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "NullPointerException in OrderService.processOrder",
  "debugInfo": {
    "exception": "java.lang.NullPointerException",
    "location": "OrderService.java:142",
    "stackTrace": "..."
  }
}
```

Production (sanitized):
```json
{
  "type": "https://api.example.com/problems/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred. Please try again or contact support.",
  "requestId": "req-550e8400"
}
```

---

## Streaming API Errors

For streaming responses (SSE, NDJSON), errors mid-stream use the same format.

### NDJSON Stream Error

```
{"id": 1, "name": "Item 1"}
{"id": 2, "name": "Item 2"}
{"type": "https://api.example.com/problems/stream-error", "title": "Stream Error", "status": 500, "detail": "Connection to database lost"}
```

### Server-Sent Events Error

```
event: data
data: {"id": 1, "name": "Item 1"}

event: data
data: {"id": 2, "name": "Item 2"}

event: error
data: {"type": "https://api.example.com/problems/stream-error", "title": "Stream Error", "status": 500, "detail": "Connection lost"}
```

Clients should check each message for the presence of `type` to detect errors.

---

## Error Code Standards

### Standard Error Codes

Use consistent error codes across your API:

| Code | Description | Example Field |
|------|-------------|---------------|
| `REQUIRED` | Field is required but missing | `customerId` |
| `INVALID_FORMAT` | Field format is incorrect | `email` |
| `INVALID_VALUE` | Field value is not allowed | `status` |
| `TOO_SHORT` | Value is below minimum length | `password` |
| `TOO_LONG` | Value exceeds maximum length | `description` |
| `TOO_SMALL` | Numeric value is below minimum | `quantity` |
| `TOO_LARGE` | Numeric value exceeds maximum | `amount` |
| `OUT_OF_RANGE` | Value is outside allowed range | `age` |
| `PATTERN_MISMATCH` | Value doesn't match required pattern | `phoneNumber` |
| `NOT_UNIQUE` | Value must be unique but isn't | `username` |
| `NOT_FOUND` | Referenced resource doesn't exist | `categoryId` |
| `IMMUTABLE` | Field cannot be changed | `createdAt` |

### Domain-Prefixed Codes

For domain-specific codes, use prefixes:

| Domain | Prefix | Example Codes |
|--------|--------|---------------|
| Order | `ORD_` | `ORD_CANCELLED`, `ORD_SHIPPED` |
| Payment | `PAY_` | `PAY_DECLINED`, `PAY_EXPIRED` |
| User | `USR_` | `USR_SUSPENDED`, `USR_LOCKED` |
| Inventory | `INV_` | `INV_OUT_OF_STOCK`, `INV_RESERVED` |
| Auth | `AUTH_` | `AUTH_EXPIRED`, `AUTH_INVALID` |

---

## Related Documentation

- [Error Response Standards](../error-response-standards.md) - Main error handling guide
- [HTTP Status Codes](../../quick-reference/status-codes.md) - Status code quick reference
- [Content Types](../content-types-and-structure.md) - Request/response content types
