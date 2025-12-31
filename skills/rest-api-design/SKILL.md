---
name: rest-api-design
description: Design and validate RESTful APIs with resource patterns (naming, hierarchy, collections), HTTP methods (GET, POST, PUT, PATCH, DELETE), and response structures (JSON, pagination, HATEOAS). Use when building endpoints, designing URL structures, choosing HTTP verbs, or implementing Richardson Maturity Model.
---

# REST API Design

Design RESTful APIs with proper resources, HTTP methods, and response structures.

## When to Use

- Designing new REST API endpoints or resources
- Structuring URL paths and query parameters
- Choosing HTTP methods for operations
- Evaluating REST maturity (Richardson Maturity Model)

## Quick Start

```http
GET /v1/orders?status=PENDING&page=0&size=20 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{"data": [...], "meta": {"pagination": {"page": 0, "totalPages": 3}}}
```

## HTTP Methods

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| GET | Retrieve resource(s) | Yes | Yes |
| POST | Create new resource | No | No |
| PUT | Replace entire resource | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Remove resource | Yes | No |

## URL Design Rules

| Rule | Correct | Incorrect |
|------|---------|-----------|
| Plural nouns | `/orders` | `/order` |
| Lowercase kebab-case | `/shipping-addresses` | `/ShippingAddresses` |
| No trailing slashes | `/orders` | `/orders/` |
| No verbs | `GET /orders` | `/getOrders` |
| Max 2 levels nesting | `/orders/{id}/items` | `/.../items/{id}/details` |

## Endpoint Patterns

```
GET    /orders                 # List (paginated)
POST   /orders                 # Create → 201 + Location header
GET    /orders/{id}            # Retrieve single
PUT    /orders/{id}            # Replace entire resource
PATCH  /orders/{id}            # Partial update
DELETE /orders/{id}            # Remove → 204

POST   /orders/{id}/cancel     # Action (state transition)
GET    /orders/{id}/items      # Nested collection
```

## Status Codes

| Code | When to Use |
|------|-------------|
| 200 | GET/PUT/PATCH success |
| 201 | POST success (include Location header) |
| 204 | DELETE success, no body |
| 400 | Validation errors |
| 401 | Missing/invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Business rule conflict |

## Richardson Maturity Model

| Level | Description | Target |
|-------|-------------|--------|
| 0 | Single endpoint, all POST | Migrate to resources |
| 1 | Multiple resources | Add HTTP verbs |
| 2 | HTTP verbs + status codes | **Industry standard** |
| 3 | HATEOAS/Hypermedia | Public/long-lived APIs |

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Verbs in URLs | `/getOrders` | `GET /orders` |
| RPC-style | `/orders/findByCustomer` | `GET /orders?customerId=123` |
| 200 for errors | `{"error": "..."}` | Use proper status codes |
| Deep nesting | 4+ levels | Flatten, provide direct access |
| POST for reads | `POST /search` | `GET /resources?filter=value` |

## References

- `references/resource-naming.md` - Naming conventions
- `references/http-methods.md` - Method semantics
- `../../api-design/foundations/resource-naming-and-url-structure.md` - URL patterns
- `../../api-design/request-response/content-types-and-structure.md` - Response formats
