# HTTP Methods Deep-Dive

## Method Properties

### Safety

**Safe** methods don't modify server state. Clients can call them freely.

| Method | Safe? |
|--------|-------|
| GET | Yes |
| HEAD | Yes |
| OPTIONS | Yes |
| POST | No |
| PUT | No |
| PATCH | No |
| DELETE | No |

Safe methods are **cacheable by default**.

### Idempotency

**Idempotent** methods produce the same result whether called once or many times.

| Method | Idempotent? |
|--------|-------------|
| GET | Yes |
| HEAD | Yes |
| OPTIONS | Yes |
| PUT | Yes |
| DELETE | Yes |
| POST | No |
| PATCH | No* |

*PATCH can be idempotent if designed carefully (see below).

**Why it matters**: Clients can safely retry idempotent requests on network failures.

## Method Semantics

### GET - Retrieve

Retrieves resource representation without side effects.

```http
GET /orders/123 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "123",
  "status": "PROCESSING"
}
```

**Rules**:
- Never modify state
- Always cacheable (unless headers say otherwise)
- Request body should be ignored (per HTTP spec)
- Use query parameters for filtering, not body

**Collection GET**:
```http
GET /orders?status=PENDING&page=0&size=20 HTTP/1.1
```

### POST - Create

Creates a new resource as child of the target resource.

```http
POST /orders HTTP/1.1
Content-Type: application/json

{
  "customerId": "cust-456",
  "items": [...]
}

HTTP/1.1 201 Created
Location: /orders/123
Content-Type: application/json

{
  "id": "123",
  "status": "PENDING"
}
```

**Rules**:
- Returns 201 Created with Location header
- Response body contains created resource (or at minimum, the ID)
- Not idempotent - calling twice creates two resources
- Can also be used for actions that don't fit CRUD

**POST for Actions**:
```http
POST /orders/123/cancel HTTP/1.1

HTTP/1.1 200 OK
{
  "id": "123",
  "status": "CANCELLED"
}
```

### PUT - Replace

Replaces entire resource with provided representation.

```http
PUT /orders/123 HTTP/1.1
Content-Type: application/json

{
  "customerId": "cust-456",
  "status": "PROCESSING",
  "items": [...],
  "shippingAddress": {...}
}

HTTP/1.1 200 OK
{
  "id": "123",
  "customerId": "cust-456",
  "status": "PROCESSING"
}
```

**Rules**:
- Client sends **complete** resource representation
- Missing fields are set to null/default (not preserved)
- Idempotent - same PUT request = same result
- Returns 200 OK or 204 No Content
- Can return 201 Created if resource didn't exist (upsert)

**PUT Idempotency Example**:
```http
# First call
PUT /orders/123 {"status": "SHIPPED"}
# Result: order status is SHIPPED

# Second call (identical)
PUT /orders/123 {"status": "SHIPPED"}
# Result: order status is still SHIPPED (same result)
```

### PATCH - Partial Update

Updates only specified fields, preserving others.

```http
PATCH /orders/123 HTTP/1.1
Content-Type: application/json

{
  "status": "SHIPPED"
}

HTTP/1.1 200 OK
{
  "id": "123",
  "customerId": "cust-456",  // preserved
  "status": "SHIPPED",        // updated
  "items": [...]              // preserved
}
```

**Rules**:
- Client sends only fields to change
- Unspecified fields are preserved
- Not inherently idempotent (depends on implementation)
- Returns 200 OK with updated resource

**Making PATCH Idempotent**:

```json
// Idempotent - sets to specific value
{"status": "SHIPPED"}

// NOT idempotent - relative operation
{"quantity": {"$increment": 1}}
```

Use absolute values, not relative operations, for idempotent PATCH.

**JSON Patch (RFC 6902)** - Structured patch operations:
```http
PATCH /orders/123 HTTP/1.1
Content-Type: application/json-patch+json

[
  {"op": "replace", "path": "/status", "value": "SHIPPED"},
  {"op": "add", "path": "/trackingNumber", "value": "1Z999AA10123456784"}
]
```

### DELETE - Remove

Removes the specified resource.

```http
DELETE /orders/123 HTTP/1.1

HTTP/1.1 204 No Content
```

**Rules**:
- Returns 204 No Content (preferred) or 200 OK with body
- Idempotent - deleting already-deleted resource returns 204 or 404
- Consider soft-delete for audit trails

**Idempotency Note**: Second DELETE may return:
- 204 No Content (idempotent - "resource is gone")
- 404 Not Found (also valid - "nothing to delete")

Both are acceptable. 204 is more purely idempotent.

### HEAD - Metadata Only

Identical to GET but returns only headers, no body.

```http
HEAD /orders/123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 1234
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT
ETag: "abc123"
```

**Uses**:
- Check if resource exists
- Get metadata without transferring body
- Validate cache (ETag/Last-Modified)

### OPTIONS - Capabilities

Returns allowed methods and other capabilities.

```http
OPTIONS /orders HTTP/1.1

HTTP/1.1 200 OK
Allow: GET, POST, HEAD, OPTIONS
```

**Uses**:
- CORS preflight requests
- API discovery
- Method availability check

## Method Selection Guide

| Want to... | Use |
|------------|-----|
| Retrieve single resource | GET /resources/{id} |
| Retrieve collection | GET /resources |
| Create new resource | POST /resources |
| Replace entire resource | PUT /resources/{id} |
| Update specific fields | PATCH /resources/{id} |
| Remove resource | DELETE /resources/{id} |
| Trigger action | POST /resources/{id}/action |
| Check existence | HEAD /resources/{id} |

## Request Bodies

| Method | Request Body |
|--------|--------------|
| GET | Should not have body |
| POST | Required (usually) |
| PUT | Required |
| PATCH | Required |
| DELETE | Optional (usually none) |
| HEAD | Should not have body |
| OPTIONS | Should not have body |

## Response Bodies

| Method | Response Body |
|--------|---------------|
| GET | Required |
| POST | Usually (created resource) |
| PUT | Optional (updated resource or empty) |
| PATCH | Usually (updated resource) |
| DELETE | Usually none (204) |
| HEAD | Never |
| OPTIONS | Optional |

## Common Mistakes

### Using POST for Everything

```http
# Wrong
POST /orders/123/get
POST /orders/123/delete

# Right
GET /orders/123
DELETE /orders/123
```

### GET with Side Effects

```http
# Wrong - modifies state
GET /orders/123/markAsRead

# Right
PATCH /orders/123 {"read": true}
# or
POST /orders/123/mark-read
```

### PUT vs PATCH Confusion

```http
# PUT replaces completely - this clears items!
PUT /orders/123
{
  "status": "SHIPPED"
}
# Result: order has NO items, only status

# PATCH preserves - only status changes
PATCH /orders/123
{
  "status": "SHIPPED"
}
# Result: order keeps items, status updated
```

### DELETE with Body Requirements

```http
# Avoid - DELETE body handling is inconsistent
DELETE /orders/123
Content-Type: application/json
{"reason": "customer request"}

# Better - use query param or header
DELETE /orders/123?reason=customer-request
# or
DELETE /orders/123
X-Delete-Reason: customer-request
```

## Method Summary Table

| Method | Safe | Idempotent | Cacheable | Body |
|--------|------|------------|-----------|------|
| GET | ✓ | ✓ | ✓ | No |
| HEAD | ✓ | ✓ | ✓ | No |
| OPTIONS | ✓ | ✓ | No | No |
| POST | ✗ | ✗ | No* | Yes |
| PUT | ✗ | ✓ | No | Yes |
| PATCH | ✗ | ✗* | No | Yes |
| DELETE | ✗ | ✓ | No | No |

*POST responses can be cached if explicitly allowed
*PATCH can be idempotent with proper design
