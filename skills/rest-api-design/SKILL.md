---
name: rest-api-design
description: Design RESTful APIs with proper resource naming, URL structure, HTTP methods, and content negotiation. Use when creating new API endpoints, designing resource hierarchies, choosing HTTP verbs, or structuring request/response payloads. Covers Richardson Maturity Model levels for REST compliance.
---

# REST API Design

## When to Use This Skill

Use this skill when you need to:
- Design new REST API endpoints or resources
- Structure URL paths and query parameters
- Choose appropriate HTTP methods for operations
- Define request/response payload structures
- Evaluate or improve REST maturity level (Richardson Maturity Model)

## Core Principles

### 1. Resources as Nouns

URLs represent resources (entities), not actions. Use plural nouns for collections.

**Correct:**
```
GET  /orders
GET  /orders/{orderId}
POST /orders
```

**Incorrect:**
```
GET  /getOrders
POST /createOrder
GET  /orders/findByCustomer
```

### 2. HTTP Methods Define Operations

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| GET | Retrieve resource(s) | Yes | Yes |
| POST | Create new resource | No | No |
| PUT | Replace entire resource | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Remove resource | Yes | No |

**Safe**: Does not modify server state (cacheable)
**Idempotent**: Multiple identical requests = same result as single request

### PATCH Method Formats

Two standard formats exist for PATCH operations:

| Format | Content-Type | Use Case |
|--------|--------------|----------|
| JSON Merge Patch | `application/merge-patch+json` | Simple partial updates |
| JSON Patch | `application/json-patch+json` | Complex operations (add, remove, move) |

**JSON Merge Patch (RFC 7396)** - Recommended for simple updates:
```http
PATCH /orders/123 HTTP/1.1
Content-Type: application/merge-patch+json

{"status": "SHIPPED", "trackingNumber": "ABC123"}
```

**JSON Patch (RFC 6902)** - For complex operations:
```http
PATCH /orders/123 HTTP/1.1
Content-Type: application/json-patch+json

[
  {"op": "replace", "path": "/status", "value": "SHIPPED"},
  {"op": "add", "path": "/trackingNumber", "value": "ABC123"}
]
```

Use JSON Merge Patch for most cases. Use JSON Patch when you need array manipulation, conditional updates, or moving values between fields.

### 3. Collection vs Instance URLs

```
/orders              # Collection - returns array, supports POST
/orders/{orderId}    # Instance - returns object, supports PUT/PATCH/DELETE
```

Collections return arrays. Instances return single objects. This is semantic, not just structural.

## URL Design Rules

### Resource Naming

| Rule | Example | Reason |
|------|---------|--------|
| Plural nouns | `/orders`, `/customers` | Collections represent multiple items |
| Lowercase | `/orders` not `/Orders` | URL case sensitivity varies |
| Kebab-case | `/shipping-addresses` | Readable multi-word resources |
| No trailing slashes | `/orders` not `/orders/` | Consistent canonical URLs |

### Hierarchy and Nesting

**Use nesting when child cannot exist without parent:**
```
/orders/{orderId}/items           # Order items belong to order
/products/{productId}/variants    # Variants are part of product
```

**Use query parameters when filtering independent resources:**
```
/employees?departmentId=123       # Employees exist independently
/orders?customerId=456            # Orders are primary focus
```

**Limit nesting to 2 levels.** Deeper hierarchies become unwieldy:
```
# Too deep - avoid
/customers/{id}/orders/{id}/items/{id}/details

# Better - provide direct access
/order-items/{itemId}
```

### Query Parameters

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `page` | Page number (0-based) | `?page=0` |
| `size` | Items per page | `?size=20` |
| `sort` | Sort field and direction | `?sort=createdDate,desc` |
| Filters | Resource-specific filtering | `?status=ACTIVE&createdAfter=2024-01-01` |

Default pagination: `page=0`, `size=20`. Always paginate collections.

## HTTP Status Codes

### Success Codes

| Code | When to Use |
|------|-------------|
| 200 OK | GET success, PUT/PATCH success |
| 201 Created | POST success (include `Location` header) |
| 204 No Content | DELETE success, PUT with no response body |

### Client Error Codes

| Code | When to Use |
|------|-------------|
| 400 Bad Request | Malformed request syntax, validation errors |
| 401 Unauthorized | Missing or invalid authentication |
| 403 Forbidden | Authenticated but not authorized |
| 404 Not Found | Resource does not exist |
| 409 Conflict | Business rule violation, state conflict |
| 422 Unprocessable Entity | Validation errors (alternative to 400) |

### Server Error Codes

| Code | When to Use |
|------|-------------|
| 500 Internal Server Error | Unexpected server failure |
| 502 Bad Gateway | Upstream service failure |
| 503 Service Unavailable | Temporary overload or maintenance |

## Response Structure

### Single Resource Response

```json
{
  "data": {
    "id": "order-123",
    "status": "PROCESSING",
    "total": 99.99,
    "createdDate": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2024-01-15T14:32:22Z",
    "requestId": "req-abc123"
  }
}
```

### Collection Response

```json
{
  "data": [
    { "id": "order-123", "status": "PROCESSING" },
    { "id": "order-124", "status": "SHIPPED" }
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    },
    "timestamp": "2024-01-15T14:32:22Z"
  }
}
```

### Content Negotiation

Use `Accept` and `Content-Type` headers:

```http
# Request
POST /orders HTTP/1.1
Content-Type: application/json
Accept: application/json

# Response
HTTP/1.1 201 Created
Content-Type: application/json
Location: /orders/order-123
```

## Richardson Maturity Model

Use this model to assess and improve API design maturity.

### Level 0: HTTP as Transport
- Single endpoint (`/api`)
- All operations via POST
- Operation name in request body
- **Action**: Identify resources, create separate endpoints

### Level 1: Resources
- Multiple URLs for different resources
- Resources have identifiers
- Still mostly POST
- **Action**: Add proper HTTP methods

### Level 2: HTTP Verbs (Industry Standard)
- GET, POST, PUT, DELETE used correctly
- Proper status codes
- Stateless requests
- **This is the target for most APIs**

### Level 3: Hypermedia (HATEOAS)
- Responses include links to related resources
- Clients discover API capabilities
- Self-documenting API
- **Consider for public APIs, long-lived systems**

Most APIs should target **Level 2**. Level 3 adds complexity but enables API evolution without breaking clients.

## Special Endpoints

### Actions (Non-CRUD Operations)

When operations don't fit CRUD, use POST with action as sub-resource:

```
POST /orders/{orderId}/cancel     # Cancel order
POST /orders/{orderId}/refund     # Process refund
POST /orders/search               # Complex search (if GET query too long)
```

### Bulk Operations

```
POST /orders/bulk-create
POST /orders/bulk-update
POST /orders/bulk-delete
```

Include `options.processingMode` to specify `all-or-nothing` or `partial` processing.

### Streaming Endpoints

```
GET /orders                       # Standard JSON array
GET /orders/stream                # NDJSON or SSE stream
```

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Verbs in URLs | `/getOrders` | `GET /orders` |
| RPC-style | `/orders/findByCustomer` | `GET /orders?customerId=123` |
| Inconsistent plurals | `/order/{id}` mixed with `/customers` | Always plural |
| Deep nesting | `/../../../details` | Flatten, provide direct access |
| 200 for errors | `{"error": "not found"}` | Use 404 status code |
| POST for reads | `POST /search` for simple queries | `GET /resources?filter=value` |

## Quick Reference: Endpoint Design

```
# Collection Operations
GET    /orders                    # List (paginated)
POST   /orders                    # Create (returns 201 + Location)
GET    /orders?status=PENDING     # Filtered list

# Instance Operations
GET    /orders/{id}               # Retrieve
PUT    /orders/{id}               # Replace
PATCH  /orders/{id}               # Partial update
DELETE /orders/{id}               # Remove (returns 204)

# Nested Resources
GET    /orders/{id}/items         # List child resources
POST   /orders/{id}/items         # Create child resource

# Actions
POST   /orders/{id}/cancel        # State transition
POST   /orders/{id}/refund        # Business operation
```

## Loading Additional Context

When you need deeper guidance:

- **Resource naming patterns**: Load `references/resource-naming.md`
- **HTTP method semantics and idempotency**: Load `references/http-methods.md`
- **Richardson Maturity Model assessment**: Load `references/richardson-maturity.md`
- **Java/Spring implementation**: Load `references/java-spring.md`
- **Data modeling and JSON conventions**: Load `/home/jeff/workspaces/spring-api-design-docs/api-design/foundations/data-modeling-standards.md`
- **HTTP client patterns (retry, circuit breaker, pooling)**: Load `/home/jeff/workspaces/spring-api-design-docs/api-design/request-response/http-client-best-practices.md`
