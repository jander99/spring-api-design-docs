# HTTP Methods Quick Reference

> One-page reference card for HTTP methods. For detailed guidance, see [REST API Design Skill](../../skills/rest-api-design/references/http-methods.md).

## Method Summary

| Method | Purpose | Idempotent | Safe | Request Body | Response Body |
|--------|---------|------------|------|--------------|---------------|
| GET | Read resource(s) | Yes | Yes | No | Yes |
| POST | Create resource | No | No | Yes | Yes |
| PUT | Replace resource | Yes | No | Yes | Optional |
| PATCH | Partial update | No* | No | Yes | Yes |
| DELETE | Remove resource | Yes | No | Optional | Optional |

*PATCH can be idempotent if using JSON Merge Patch format.

## Typical Status Codes by Method

| Method | Success | Client Error | Notes |
|--------|---------|--------------|-------|
| GET | 200, 304 | 404 | 304 = Not Modified (cached) |
| POST | 201, 202 | 400, 409 | 201 = Created, 202 = Accepted |
| PUT | 200, 204 | 404, 409 | 204 = No Content |
| PATCH | 200 | 400, 404, 409 | 409 = Conflict |
| DELETE | 204 | 404 | 204 = No Content |

## Quick Examples

### GET - Read Resources

```http
# Get single resource
GET /api/orders/123

# Get collection
GET /api/orders?status=pending

# Response: 200 OK
```

### POST - Create Resource

```http
POST /api/orders
Content-Type: application/json

{"customerId": "456", "items": [...]}

# Response: 201 Created
# Location: /api/orders/789
```

### PUT - Replace Resource

```http
PUT /api/orders/123
Content-Type: application/json

{"customerId": "456", "items": [...], "status": "confirmed"}

# Response: 200 OK or 204 No Content
```

### PATCH - Partial Update

```http
PATCH /api/orders/123
Content-Type: application/merge-patch+json

{"status": "shipped"}

# Response: 200 OK
```

### DELETE - Remove Resource

```http
DELETE /api/orders/123

# Response: 204 No Content
```

## Decision Table

| I want to... | Use | Example |
|--------------|-----|---------|
| Get one item | GET | `GET /users/123` |
| Get a list | GET | `GET /users?role=admin` |
| Create new item | POST | `POST /users` |
| Replace entire item | PUT | `PUT /users/123` |
| Update some fields | PATCH | `PATCH /users/123` |
| Remove item | DELETE | `DELETE /users/123` |
| Check if exists | HEAD | `HEAD /users/123` |
| Get allowed methods | OPTIONS | `OPTIONS /users` |

## Common Mistakes

| Mistake | Problem | Correct Approach |
|---------|---------|------------------|
| POST for updates | Not idempotent, duplicates possible | Use PUT or PATCH |
| GET with body | Many proxies strip body | Use query params or POST |
| DELETE returns 200 | Inconsistent with convention | Return 204 No Content |
| PUT for partial update | PUT should replace entirely | Use PATCH instead |
| POST returns 200 | Missing Location header | Return 201 with Location |

## Idempotency Explained

| Term | Meaning | Methods |
|------|---------|---------|
| **Idempotent** | Same request = same result | GET, PUT, DELETE, HEAD |
| **Safe** | No side effects | GET, HEAD, OPTIONS |
| **Neither** | Each call may differ | POST |

## Related

- [HTTP Methods Detailed Guide](../../skills/rest-api-design/references/http-methods.md)
- [Status Codes Reference](status-codes.md)
- [Error Response Standards](../request-response/error-response-standards.md)
