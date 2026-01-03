# Idempotency and Safety

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 12 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** API Design
> 
> **📊 Complexity:** 13.9 grade level • 1.0% technical density • fairly difficult

## Overview

Idempotency and safety are critical properties of HTTP methods that ensure reliable and predictable API behavior. These properties determine how clients should retry failed requests and what expectations they can have about server state changes. Understanding these concepts is essential for building robust, fault-tolerant APIs.

## Core Concepts

### Safe Methods

Safe methods are read-only operations that do not modify server state. Clients can call safe methods without worrying about unintended side effects.

**Key Characteristics:**
- No server state changes
- Can be cached and prefetched
- Safe for automated processes (web crawlers, preloading)
- Multiple calls produce the same server state

**Safe HTTP Methods:**
- `GET` - Retrieve resource representation
- `HEAD` - Retrieve headers without body
- `OPTIONS` - Query communication options
- `TRACE` - Echo request for diagnostic purposes

**Example:**
```http
GET /orders/12345 HTTP/1.1
Host: api.example.com
```

Calling this endpoint multiple times returns the same order data without changing anything on the server.

### Unsafe Methods

Unsafe methods may modify server state. These require user confirmation before automated retry.

**Unsafe HTTP Methods:**
- `POST` - Create resource or trigger operation
- `PUT` - Replace resource
- `PATCH` - Partially update resource  
- `DELETE` - Remove resource

### Idempotent Methods

An idempotent method produces the same result on the server regardless of how many times it is called with identical requests. The server state after one request is the same as after multiple identical requests.

**Idempotent HTTP Methods:**
- `GET` - Always returns same representation
- `HEAD` - Always returns same headers
- `PUT` - Same resource state after one or many calls
- `DELETE` - Resource is deleted (or already absent)
- `OPTIONS` - Same options information
- `TRACE` - Same diagnostic echo

**Non-Idempotent Methods:**
- `POST` - May create multiple resources or trigger actions repeatedly

## Idempotency by HTTP Method

### GET - Safe and Idempotent

```http
GET /customers/789 HTTP/1.1
Host: api.example.com
```

**Guarantees:**
- No server state changes
- Same response on repeated calls (unless resource changes independently)
- Safe to retry automatically

### HEAD - Safe and Idempotent

```http
HEAD /orders/12345 HTTP/1.1
Host: api.example.com
```

**Guarantees:**
- Identical to GET but without response body
- No server state changes
- Returns metadata only

### PUT - Unsafe but Idempotent

```http
PUT /orders/12345 HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "status": "SHIPPED",
  "trackingNumber": "1Z999AA10123456784"
}
```

**Guarantees:**
- First call creates or replaces the resource
- Subsequent identical calls result in the same resource state
- Safe to retry on network failures

**Key Point:** The final resource state is identical whether called once or many times.

### DELETE - Unsafe but Idempotent

```http
DELETE /orders/12345 HTTP/1.1
Host: api.example.com
```

**Guarantees:**
- First call deletes the resource (returns 200 or 204)
- Subsequent calls find resource already gone (may return 404)
- End state is the same: resource does not exist

**Response Pattern:**
```http
# First DELETE
HTTP/1.1 204 No Content

# Subsequent DELETE attempts
HTTP/1.1 404 Not Found
```

Both responses confirm the resource is not present, achieving the same end state.

### POST - Unsafe and Non-Idempotent

```http
POST /orders HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "customerId": "C789",
  "items": [{"sku": "WIDGET-1", "quantity": 2}]
}
```

**Challenges:**
- Each call may create a new resource
- Retries risk duplicate orders
- Requires special handling for reliability

## Implementing Idempotency for POST

Since POST is not inherently idempotent, APIs must implement idempotency mechanisms to support safe retries.

### Idempotency Keys

An idempotency key is a unique identifier supplied by the client to ensure that repeated requests with the same key produce the same result.

**Header-Based Pattern:**
```http
POST /orders HTTP/1.1
Host: api.example.com
Idempotency-Key: 7f4a6c3b-8e92-4d1a-b5f0-9c8e7d6a5b4c
Content-Type: application/json

{
  "customerId": "C789",
  "items": [{"sku": "WIDGET-1", "quantity": 2}]
}
```

**First Request Response:**
```http
HTTP/1.1 201 Created
Location: /orders/12345
Content-Type: application/json

{
  "orderId": "12345",
  "status": "CREATED",
  "total": 59.98
}
```

**Duplicate Request Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "orderId": "12345",
  "status": "CREATED",
  "total": 59.98
}
```

Notice the status code changes from `201 Created` to `200 OK` for the duplicate request, but the same order is returned.

### Idempotency Key Requirements

**Client Responsibilities:**
1. Generate unique keys (UUIDs recommended)
2. Use the same key for all retry attempts of a single operation
3. Include key in request header or body

**Server Responsibilities:**
1. Store the key with the created resource or operation result
2. Check for existing keys before processing
3. Return the original result for duplicate keys
4. Set an expiration time for stored keys (typically 24 hours)

### Key Storage Example

```http
# Client generates UUID and sends request
POST /payments HTTP/1.1
Host: api.example.com
Idempotency-Key: a7f2c8d3-1b4e-4f9a-8c5d-6e7b8a9c0d1e
Content-Type: application/json

{
  "amount": 100.00,
  "currency": "USD",
  "source": "tok_visa"
}
```

**Server Processing:**
1. Check if key `a7f2c8d3-1b4e-4f9a-8c5d-6e7b8a9c0d1e` exists
2. If not found: process payment, store key + result
3. If found: return stored result
4. Expire key after 24 hours

### Idempotency for Updates

For update operations using POST instead of PUT/PATCH:

```http
POST /orders/12345/cancel HTTP/1.1
Host: api.example.com
Idempotency-Key: b8e3d9f4-2c5f-4a1b-9d6e-7f8c9d0e1f2a
```

**Server Response Pattern:**
```http
# First cancellation
HTTP/1.1 200 OK
Content-Type: application/json

{
  "orderId": "12345",
  "status": "CANCELLED",
  "cancelledAt": "2024-01-15T10:30:00Z"
}

# Duplicate cancellation (same key)
HTTP/1.1 200 OK
Content-Type: application/json

{
  "orderId": "12345",
  "status": "CANCELLED",
  "cancelledAt": "2024-01-15T10:30:00Z"
}
```

## Conditional Requests

Conditional requests use version identifiers to prevent conflicts and implement optimistic locking.

### Using ETags

```http
# Client retrieves resource with ETag
GET /orders/12345 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
ETag: "v123"
Content-Type: application/json

{
  "orderId": "12345",
  "status": "PENDING"
}
```

```http
# Client updates with condition
PUT /orders/12345 HTTP/1.1
Host: api.example.com
If-Match: "v123"
Content-Type: application/json

{
  "orderId": "12345",
  "status": "CONFIRMED"
}
```

**Success Response:**
```http
HTTP/1.1 200 OK
ETag: "v124"
```

**Conflict Response (version mismatch):**
```http
HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json

{
  "type": "https://example.com/errors/version-conflict",
  "title": "Version Conflict",
  "status": 412,
  "detail": "Resource has been modified. Current version is v125."
}
```

### Using Last-Modified

```http
GET /articles/789 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Last-Modified: Mon, 15 Jan 2024 10:00:00 GMT
Content-Type: application/json
```

```http
PUT /articles/789 HTTP/1.1
Host: api.example.com
If-Unmodified-Since: Mon, 15 Jan 2024 10:00:00 GMT
Content-Type: application/json
```

## Client Retry Strategies

### When to Retry

**Always Safe to Retry:**
- Safe methods (GET, HEAD, OPTIONS, TRACE)
- Idempotent methods (PUT, DELETE)
- POST with idempotency keys

**Retry with Caution:**
- POST without idempotency keys
- Operations with side effects

### Retry Decision Matrix

| Scenario | Safe to Retry? | Strategy |
|----------|----------------|----------|
| Network timeout on GET | Yes | Retry immediately |
| 500 error on PUT | Yes | Retry with exponential backoff |
| 404 on DELETE | Yes | Consider success (already deleted) |
| Network timeout on POST (no key) | No | Check server state before retry |
| Network timeout on POST (with key) | Yes | Retry with same key |
| 409 Conflict | No | Fetch current state, resolve conflict |

### Exponential Backoff Example

```http
# Attempt 1 (immediate)
POST /orders HTTP/1.1
Idempotency-Key: key-123

# Timeout - Wait 1 second

# Attempt 2 
POST /orders HTTP/1.1
Idempotency-Key: key-123

# Timeout - Wait 2 seconds

# Attempt 3
POST /orders HTTP/1.1
Idempotency-Key: key-123

# Timeout - Wait 4 seconds

# Attempt 4
POST /orders HTTP/1.1
Idempotency-Key: key-123
```

**Pattern:** Delay doubles after each failure (1s, 2s, 4s, 8s, 16s...)

## Error Responses and Idempotency

### Idempotency Key Conflicts

When a client reuses a key with different request data:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://example.com/errors/idempotency-mismatch",
  "title": "Idempotency Key Conflict",
  "status": 422,
  "detail": "Request body differs from original request with same idempotency key."
}
```

### In-Progress Operations

When a request is still being processed:

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://example.com/errors/request-in-progress",
  "title": "Request In Progress",
  "status": 409,
  "detail": "A request with this idempotency key is currently being processed."
}
```

## Best Practices

### For API Designers

1. **Document idempotency guarantees** for each endpoint
2. **Require idempotency keys** for critical operations (payments, orders)
3. **Support conditional requests** with ETags or Last-Modified
4. **Return appropriate status codes**:
   - `201 Created` for new resources
   - `200 OK` for idempotent repeats
   - `409 Conflict` for version mismatches
5. **Set reasonable key expiration** (24-72 hours typical)

### For API Clients

1. **Generate unique keys** for each logical operation
2. **Reuse the same key** for all retry attempts
3. **Store keys locally** until operation confirms success
4. **Implement exponential backoff** for retries
5. **Check response status codes** to distinguish new vs. duplicate
6. **Use conditional requests** for update operations

### For Server Implementation

1. **Validate idempotency keys** before processing
2. **Store keys with operation results** in cache or database
3. **Handle concurrent requests** with the same key gracefully
4. **Return consistent responses** for duplicate keys
5. **Set expiration times** to prevent indefinite storage
6. **Log idempotency events** for debugging

## Common Patterns

### Payment Processing

```http
POST /payments HTTP/1.1
Host: api.example.com
Idempotency-Key: pay_123abc456def789
Content-Type: application/json

{
  "amount": 2500,
  "currency": "USD",
  "customerId": "cus_789xyz"
}
```

**Critical:** Payment APIs must enforce idempotency to prevent duplicate charges.

### Webhook Delivery

```http
POST /webhooks/order-created HTTP/1.1
Host: client.example.com
X-Webhook-ID: evt_1a2b3c4d5e6f
Content-Type: application/json

{
  "eventType": "order.created",
  "orderId": "12345"
}
```

Clients should track webhook IDs to handle duplicate deliveries.

### Batch Operations

```http
POST /orders/batch HTTP/1.1
Host: api.example.com
Idempotency-Key: batch_abc123
Content-Type: application/json

{
  "orders": [
    {"customerId": "C1", "items": [...]},
    {"customerId": "C2", "items": [...]}
  ]
}
```

Entire batch should be idempotent as a single unit.

## Anti-Patterns to Avoid

### Using Timestamps as Keys

**Bad:**
```http
Idempotency-Key: 2024-01-15T10:30:00Z
```

Timestamps are not unique enough and can collide.

**Good:**
```http
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

Use UUIDs or other guaranteed-unique identifiers.

### Ignoring Idempotent Nature of PUT

**Bad:**
```http
# Treating PUT like POST - fearing retries
PUT /users/123 HTTP/1.1
# Client doesn't retry on timeout
```

**Good:**
```http
# Leveraging PUT's idempotency
PUT /users/123 HTTP/1.1
# Client safely retries on timeout
```

PUT is naturally idempotent - use it.

### Not Handling 404 on DELETE

**Bad:**
```http
DELETE /orders/999 HTTP/1.1

# Server returns 404
# Client treats as error
```

**Good:**
```http
DELETE /orders/999 HTTP/1.1

# Server returns 404
# Client considers this success (resource already gone)
```

## Security Considerations

### Key Generation

- **Use cryptographically secure random generators** for keys
- **Never expose internal IDs** as idempotency keys
- **Validate key format** to prevent injection attacks

### Storage and Expiration

- **Limit key storage duration** to reduce storage costs
- **Clean up expired keys** regularly
- **Implement rate limiting** to prevent key exhaustion attacks

### Replay Protection

Idempotency keys protect against accidental retries but not malicious replay attacks. For sensitive operations:

```http
POST /transfers HTTP/1.1
Host: api.example.com
Idempotency-Key: 7f4a6c3b-8e92-4d1a-b5f0-9c8e7d6a5b4c
X-Request-Timestamp: 2024-01-15T10:30:00Z
X-Request-Signature: sha256=abc123...
Content-Type: application/json
```

Combine idempotency keys with request signing and timestamp validation.

## Summary

Idempotency and safety are foundational properties that determine API reliability:

- **Safe methods** (GET, HEAD, OPTIONS, TRACE) cause no state changes
- **Idempotent methods** (GET, PUT, DELETE, HEAD, OPTIONS, TRACE) produce the same state regardless of repetition
- **POST requires idempotency keys** to support safe retries
- **Conditional requests** prevent conflicts using ETags or Last-Modified headers
- **Clients should retry idempotent operations** with exponential backoff
- **Servers must store and validate** idempotency keys consistently

Proper implementation of these patterns ensures robust, fault-tolerant APIs that handle network failures gracefully.

## Related Documentation

- [HTTP Client Best Practices](../advanced-patterns/http-client-best-practices.md): Implementing safe retry operations with exponential backoff and circuit breakers
- [Error Response Standards](../request-response/error-response-standards.md): Handling errors in idempotent operations
- [API Version Strategy](./api-version-strategy.md): Versioning considerations for idempotency guarantees
