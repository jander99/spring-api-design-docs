# API Design FAQ

> **Reading Guide**
> 
> **Reading Time:** 12 minutes | **Level:** Beginner to Intermediate
> 
> **Prerequisites:** Basic HTTP knowledge  
> **Key Topics:** REST design decisions, common questions, best practices
> 
> **Complexity:** 10.5 grade level • 1.2% technical density • accessible

## Overview

This FAQ answers the most common questions about REST API design. Each answer is brief and links to detailed documentation for deeper learning.

---

## Resource Design

### Q: Should I use singular or plural nouns for resources?

**A:** Use plural nouns for all resources. This creates consistency and matches the collection/item pattern. `/users` returns a collection, and `/users/123` returns one user from that collection.

```http
GET /users          # Collection
GET /users/123      # Single item from collection
POST /users         # Create in collection
```

**Learn more:** [Resource Naming & URL Structure](../foundations/resource-naming-and-url-structure.md)

---

### Q: How deep should URL nesting go?

**A:** Limit nesting to 2 levels maximum. Deep URLs are hard to read and create tight coupling. Use query parameters instead of deep nesting.

```http
# Good - 2 levels max
GET /orders/123/items

# Avoid - too deep
GET /customers/456/orders/123/items/789/details

# Better - use query parameters
GET /order-items/789
GET /order-items?orderId=123
```

**Learn more:** [Resource Naming & URL Structure](../foundations/resource-naming-and-url-structure.md#resource-hierarchy)

---

### Q: When should I use query params vs path params?

**A:** Use path parameters for resource identification. Use query parameters for filtering, sorting, and optional modifiers.

```http
# Path param - identifies a specific resource
GET /users/123

# Query params - filter a collection
GET /users?role=admin&status=active

# Query params - pagination and sorting
GET /orders?page=2&size=20&sort=createdDate,desc
```

**Learn more:** [Resource Naming & URL Structure](../foundations/resource-naming-and-url-structure.md#query-parameter-standards)

---

### Q: Should actions be in the URL or use HTTP methods?

**A:** Prefer HTTP methods for standard CRUD operations. Use action endpoints only for operations that don't map to CRUD.

```http
# Standard CRUD - use HTTP methods
DELETE /orders/123              # Delete order
PATCH /orders/123               # Update order

# Non-CRUD actions - use action endpoints
POST /orders/123/cancel         # Cancel order
POST /orders/123/refund         # Refund order
POST /documents/123/publish     # Publish document
```

**Learn more:** [Resource Naming & URL Structure](../foundations/resource-naming-and-url-structure.md#actions-and-operations)

---

### Q: How do I name multi-word resources?

**A:** Use kebab-case (lowercase with hyphens). This is URL-friendly and easy to read.

```http
# Good - kebab-case
GET /shipping-addresses
GET /order-items
GET /payment-methods

# Avoid
GET /shippingAddresses     # camelCase
GET /shipping_addresses    # snake_case
GET /ShippingAddresses     # PascalCase
```

**Learn more:** [Resource Naming & URL Structure](../foundations/resource-naming-and-url-structure.md#resource-naming-conventions)

---

## HTTP Methods

### Q: When should I use PUT vs PATCH?

**A:** Use PUT to replace an entire resource. Use PATCH for partial updates. Most updates are partial, so PATCH is more common in practice.

```http
# PUT - replace entire resource (all fields required)
PUT /users/123
{"name": "John", "email": "john@example.com", "role": "admin"}

# PATCH - update specific fields only
PATCH /users/123
{"role": "admin"}
```

**Learn more:** [HTTP Methods Quick Reference](http-methods.md)

---

### Q: Is DELETE idempotent?

**A:** Yes. Calling DELETE multiple times has the same effect as calling it once. The first call deletes the resource. Subsequent calls return 404 (resource already gone) or 204 (operation complete).

```http
DELETE /orders/123   # Returns 204 - deleted
DELETE /orders/123   # Returns 404 or 204 - already gone
DELETE /orders/123   # Returns 404 or 204 - still gone
```

**Learn more:** [HTTP Methods Quick Reference](http-methods.md#idempotency-explained)

---

### Q: Can POST be used for updates?

**A:** Generally no. POST is for creating resources, not updating them. Use PUT or PATCH for updates. The exception is action endpoints where POST triggers an operation.

```http
# Wrong - POST for updates
POST /users/123/update

# Correct - use PATCH or PUT
PATCH /users/123
PUT /users/123

# Exception - POST for actions
POST /orders/123/cancel
```

**Learn more:** [HTTP Methods Quick Reference](http-methods.md#common-mistakes)

---

### Q: Should GET requests have a body?

**A:** No. Many proxies and clients strip bodies from GET requests. Use query parameters for filtering, or use POST with a body for complex searches.

```http
# Good - query parameters
GET /orders?status=pending&minTotal=100

# For complex queries - use POST to a search endpoint
POST /orders/search
{"status": ["pending", "processing"], "dateRange": {...}}
```

**Learn more:** [HTTP Methods Quick Reference](http-methods.md#common-mistakes)

---

### Q: What's the difference between POST and PUT for creation?

**A:** POST creates a resource where the server assigns the ID. PUT creates or replaces a resource at a specific URL (client provides the ID).

```http
# POST - server assigns ID
POST /users
{"name": "John"}
# Response: 201 Created, Location: /users/123

# PUT - client specifies ID
PUT /users/john-doe
{"name": "John"}
# Response: 201 Created (new) or 200 OK (replaced)
```

**Learn more:** [HTTP Methods Quick Reference](http-methods.md)

---

## Status Codes

### Q: Should I use 400 or 422 for validation errors?

**A:** Use 400 for malformed requests (bad JSON, wrong types). Use 422 for well-formed requests that fail business validation.

```http
# 400 - malformed request
POST /users
{"name": "John", "age": "not-a-number"}  # Wrong type

# 422 - validation error
POST /users
{"name": "John", "email": "invalid-email"}  # Invalid format
```

**Learn more:** [Status Codes Quick Reference](status-codes.md#4xx-decision-table)

---

### Q: When is 404 vs 410 appropriate?

**A:** Use 404 when a resource doesn't exist. Use 410 when a resource existed but was permanently deleted and won't return.

```http
# 404 - doesn't exist (or never did)
GET /users/unknown-id

# 410 - permanently deleted
GET /users/deleted-account-123
```

**Learn more:** [Status Codes Quick Reference](status-codes.md#client-error-codes-4xx)

---

### Q: What's the difference between 401 and 403?

**A:** 401 means "identity unknown" (not authenticated). 403 means "identity known but access denied" (authenticated but not authorized).

```http
# 401 - no token or invalid token
GET /orders
Authorization: Bearer invalid-token

# 403 - valid token, but user lacks permission
GET /admin/settings
Authorization: Bearer valid-user-token
```

**Learn more:** [Status Codes Quick Reference](status-codes.md#401-vs-403)

---

### Q: Should DELETE return 200 or 204?

**A:** Return 204 No Content for successful deletes. Only return 200 if you're including data in the response (like a confirmation message).

```http
# Standard approach
DELETE /orders/123
# Response: 204 No Content

# If returning data
DELETE /orders/123
# Response: 200 OK with deletion confirmation
```

**Learn more:** [Status Codes Quick Reference](status-codes.md#2xx-decision-table)

---

### Q: What status code for rate limiting?

**A:** Use 429 Too Many Requests. Include a Retry-After header to tell clients when to try again.

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded 100 requests per minute"
}
```

**Learn more:** [Rate Limiting Standards](../security/rate-limiting-standards.md)

---

## Versioning

### Q: Which versioning strategy should I use?

**A:** Use URI path versioning (`/v1/resource`) for most APIs. It's visible, easy to route, and works with all tools. Consider header versioning only if clean URLs are critical.

```http
# Recommended - URI path versioning
GET /v1/users/123
GET /v2/users/123

# Alternative - header versioning
GET /users/123
Accept: application/vnd.example.v1+json
```

**Learn more:** [API Version Strategy](../foundations/api-version-strategy.md)

---

### Q: How long should I support old versions?

**A:** Minimum 6 months after deprecation notice. For high-traffic APIs, support 12+ months. Always use Deprecation and Sunset headers to warn clients.

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Mon, 30 Jun 2025 23:59:59 GMT
Link: </v2/users>; rel="successor-version"
```

**Learn more:** [API Version Strategy](../foundations/api-version-strategy.md#deprecation-policy)

---

### Q: What's a breaking change?

**A:** Breaking changes require existing clients to update their code. They include: removing fields, changing field types, adding required fields, renaming endpoints, or changing authentication.

| Breaking (new version needed) | Non-breaking (same version) |
|-------------------------------|----------------------------|
| Remove a field | Add optional field |
| Change field type | Add new endpoint |
| Add required field | Add query parameter |
| Rename endpoint | Add response field |

**Learn more:** [API Version Strategy](../foundations/api-version-strategy.md#backward-compatibility-rules)

---

### Q: Should I use v0 in production?

**A:** No. Start at v1 for production APIs. The v0 prefix implies unstable/preview and may confuse clients about your API's stability.

```http
# Production API
GET /v1/users

# Preview/beta API (if needed)
GET /beta/users
GET /preview/users
```

**Learn more:** [API Version Strategy](../foundations/api-version-strategy.md#version-increment-guidelines)

---

## Error Handling

### Q: Should I use RFC 9457 Problem Details?

**A:** Yes. RFC 9457 provides a standard format that clients can parse consistently. It includes machine-readable types and human-readable details.

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "Email format is invalid",
  "instance": "/users/123"
}
```

**Learn more:** [Error Response Standards](../request-response/error-response-standards.md)

---

### Q: How detailed should error messages be?

**A:** Provide enough detail for clients to fix the problem, but don't expose internal implementation details. Include field names and clear descriptions of what's wrong.

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 422,
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Email must be a valid email address"
    }
  ]
}
```

**Learn more:** [Error Response Standards](../request-response/error-response-standards.md#error-response-examples)

---

### Q: Should I expose stack traces?

**A:** Never in production. Stack traces reveal internal implementation details and can expose security vulnerabilities. Log them server-side and return a generic error with a request ID for correlation.

```json
{
  "type": "https://api.example.com/problems/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred",
  "requestId": "req-abc123"
}
```

**Learn more:** [Error Response Standards](../request-response/error-response-standards.md#error-logging)

---

### Q: How do I handle validation errors for multiple fields?

**A:** Return all validation errors at once in an errors array. Don't make clients fix one error at a time.

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 422,
  "errors": [
    {"field": "email", "code": "REQUIRED", "message": "Email is required"},
    {"field": "password", "code": "TOO_SHORT", "message": "Password must be at least 8 characters"},
    {"field": "age", "code": "INVALID_RANGE", "message": "Age must be between 18 and 120"}
  ]
}
```

**Learn more:** [Error Response Standards](../request-response/error-response-standards.md#validation-error-example)

---

### Q: What Content-Type should error responses use?

**A:** Use `application/problem+json` for RFC 9457 Problem Details responses. This tells clients the response follows the standard format.

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/bad-request",
  "title": "Bad Request",
  "status": 400,
  "detail": "Request body is not valid JSON"
}
```

**Learn more:** [Error Response Standards](../request-response/error-response-standards.md#content-type-headers)

---

## Pagination

### Q: What page size should I use?

**A:** Default to 20 items per page. Set a maximum of 50-100 to prevent clients from requesting too much data at once.

```http
GET /users?page=0&size=20          # Default
GET /users?page=0&size=50          # Larger page
GET /users?page=0&size=500         # Should return 400 - exceeds max
```

**Learn more:** [Pagination and Filtering](../request-response/pagination-and-filtering.md)

---

### Q: When should I use cursor vs offset pagination?

**A:** Use offset pagination for small datasets (<10,000 items) where users need random page access. Use cursor pagination for large datasets or real-time data where consistency matters.

| Factor | Offset | Cursor |
|--------|--------|--------|
| Dataset size | Small to medium | Any size |
| Jump to page 50 | Supported | Not supported |
| Performance at page 1000 | Slow | Fast |
| Handles concurrent inserts | May skip/duplicate | Consistent |

**Learn more:** [Pagination and Filtering](../request-response/pagination-and-filtering.md#pagination-strategy-decision-tree)

---

### Q: Should I include total count in pagination?

**A:** For small datasets, yes. For large datasets, consider making it optional since COUNT queries can be slow. Use a `hasMore` flag as an alternative.

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 5,
      "size": 20,
      "hasMore": true
    }
  }
}
```

**Learn more:** [Performance Standards](../advanced-patterns/performance-standards.md#pagination-performance-tips)

---

### Q: How do I handle page numbers beyond the last page?

**A:** Return an empty data array with pagination metadata. Don't return an error since this is a valid (if empty) result.

```http
GET /users?page=999&size=20

HTTP/1.1 200 OK
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 999,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    }
  }
}
```

**Learn more:** [Pagination and Filtering](../request-response/pagination-and-filtering.md)

---

## Caching

### Q: How should I handle caching?

**A:** Set Cache-Control headers based on how often data changes. Use ETags for validation. Private data should use `private` or `no-store`.

```http
# Static data - cache for 24 hours
Cache-Control: public, max-age=86400

# Product data - cache for 1 hour
Cache-Control: public, max-age=3600

# User-specific data - browser only
Cache-Control: private, max-age=300

# Sensitive data - never cache
Cache-Control: no-store
```

**Learn more:** [Performance Standards](../advanced-patterns/performance-standards.md#http-caching)

---

### Q: What's the difference between no-cache and no-store?

**A:** `no-cache` allows caching but requires revalidation before use. `no-store` completely disables caching. Use `no-store` for sensitive data.

```http
# no-cache - can cache, must revalidate
Cache-Control: no-cache
# Client: "I have a cached copy, is it still valid?"
# Server: "Yes (304)" or "No, here's the new version (200)"

# no-store - never cache
Cache-Control: no-store
# Every request goes to the server
```

**Learn more:** [Performance Standards](../advanced-patterns/performance-standards.md#cache-control-directives)

---

### Q: How do ETags work?

**A:** ETags are unique identifiers for resource versions. Clients send the ETag back with requests. If the resource hasn't changed, the server returns 304 Not Modified.

```http
# First request - server returns ETag
GET /products/123
HTTP/1.1 200 OK
ETag: "abc123"

# Later request - client sends ETag
GET /products/123
If-None-Match: "abc123"

# If unchanged
HTTP/1.1 304 Not Modified

# If changed
HTTP/1.1 200 OK
ETag: "def456"
```

**Learn more:** [Performance Standards](../advanced-patterns/performance-standards.md#conditional-requests)

---

## Security

### Q: How should I handle authentication errors?

**A:** Return 401 for missing or invalid credentials. Don't reveal whether a username exists. Use generic messages.

```http
# Generic error - don't confirm valid usernames
HTTP/1.1 401 Unauthorized
{
  "type": "https://api.example.com/problems/authentication-failed",
  "title": "Authentication Failed",
  "status": 401,
  "detail": "Invalid credentials"
}
```

**Learn more:** [Security Standards](../security/security-standards.md)

---

### Q: Should I use 403 or 404 for unauthorized access?

**A:** It depends on whether you want to hide the resource's existence. Use 403 if the resource is public knowledge. Use 404 if revealing its existence is a security concern.

```http
# 403 - resource exists, access denied (resource is public)
GET /public-documents/123
HTTP/1.1 403 Forbidden

# 404 - don't reveal existence (sensitive resource)
GET /private-reports/123
HTTP/1.1 404 Not Found
```

**Learn more:** [Status Codes Quick Reference](status-codes.md#401-vs-403)

---

## Response Format

### Q: Should field names be camelCase or snake_case?

**A:** Use camelCase for JSON field names. It's the JavaScript convention and most common in modern APIs.

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "emailAddress": "john@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Learn more:** [Content Types and Structure](../request-response/content-types-and-structure.md)

---

### Q: How should I format dates?

**A:** Use ISO 8601 format with UTC timezone. This is unambiguous and widely supported.

```json
{
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:45:30Z",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Learn more:** [Content Types and Structure](../request-response/content-types-and-structure.md)

---

### Q: Should I return null fields or omit them?

**A:** Either approach works if applied consistently. Returning nulls is more explicit. Omitting nulls reduces payload size. Document your choice.

```json
// Option 1: Include nulls (explicit)
{
  "name": "John",
  "middleName": null,
  "email": "john@example.com"
}

// Option 2: Omit nulls (compact)
{
  "name": "John",
  "email": "john@example.com"
}
```

**Learn more:** [Content Types and Structure](../request-response/content-types-and-structure.md)

---

## Related Documentation

| Topic | Location |
|-------|----------|
| HTTP Methods | [http-methods.md](http-methods.md) |
| Status Codes | [status-codes.md](status-codes.md) |
| Headers | [headers.md](headers.md) |
| Resource Naming | [foundations/resource-naming-and-url-structure.md](../foundations/resource-naming-and-url-structure.md) |
| Error Responses | [request-response/error-response-standards.md](../request-response/error-response-standards.md) |
| Pagination | [request-response/pagination-and-filtering.md](../request-response/pagination-and-filtering.md) |
| Performance | [advanced-patterns/performance-standards.md](../advanced-patterns/performance-standards.md) |
| Versioning | [foundations/api-version-strategy.md](../foundations/api-version-strategy.md) |
| Security | [security/security-standards.md](../security/security-standards.md) |
