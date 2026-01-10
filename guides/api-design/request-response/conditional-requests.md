# Conditional Requests

## Overview

Conditional requests let a client tell the server:

- **“Only send me the representation if it changed.”** (cache validation)
- **“Only apply this change if I’m operating on the version I last read.”** (optimistic concurrency)

This pattern reduces bandwidth and prevents lost updates when multiple clients edit the same resource.

In HTTP, conditional requests are defined by RFC 7232. This document focuses on:

- `ETag` validators
- `If-Match` preconditions
- `If-None-Match` preconditions

It also includes time-based validators (`Last-Modified`, `If-Modified-Since`, `If-Unmodified-Since`) because they are part of the same RFC and often appear alongside ETags.

## Core Concepts

### Validator

A **validator** is server-provided metadata that represents a version of a selected representation.

Two common validators:

- **`ETag`**: an entity tag for the selected representation
- **`Last-Modified`**: the timestamp when the origin server believes the resource last changed

### Selected representation

ETags validate a **representation**, not an abstract “database row.” A response may vary based on:

- query parameters (e.g., pagination)
- headers (e.g., `Accept`, `Accept-Encoding`, `Accept-Language`)
- authorization (user-specific views)

If the representation changes for any reason, the validator for that representation may change.

### Preconditions vs cache validation

- **Preconditions** (`If-Match`, `If-None-Match`) let clients make requests that only succeed if certain conditions hold.
- **Cache validation** uses `If-None-Match` (and/or `If-Modified-Since`) to avoid sending a response body when the client’s cached copy is still current.

## Using `ETag`

`ETag` is a response header that provides a validator for the selected representation.

### Response example

```http
GET /v1/orders/123 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
ETag: "a1b2c3d4"

{
  "id": "123",
  "status": "processing",
  "updatedAt": "2026-01-10T09:15:00Z"
}
```

### ETag rules (practical)

- Treat the ETag value as **opaque**. Clients must not parse meaning from it.
- The value is a quoted string (e.g., `"a1b2c3d4"`).
- ETags are for the **selected representation**. If you return different representations (due to `Vary`), each can have a different ETag.

### Strong vs weak ETags

RFC 7232 defines two ETag forms:

- **Strong ETag**: `ETag: "abc123"`
- **Weak ETag**: `ETag: W/"abc123"`

Strong ETags imply an exact match for the selected representation. Weak ETags imply semantic equivalence (the server considers them “the same” for some purposes even if the bytes differ).

**Guidance:**

- Use **strong ETags** when you want safe, precise conditional updates with `If-Match`.
- Weak ETags can be useful for cache validation when minor representation differences are acceptable.

## Pattern: Optimistic Concurrency with `If-Match`

`If-Match` prevents lost updates by making the write conditional on the client’s last-seen validator.

### How it works

1. Client `GET`s a resource and stores the `ETag`.
2. Client sends an update (`PUT` / `PATCH` / `DELETE`) with `If-Match` set to that ETag.
3. Server compares the client’s validator to the current representation.
4. If it matches, the server applies the change.
5. If it does not match, the server rejects the request with `412 Precondition Failed`.

### Example: conditional update

Client reads the current representation:

```http
GET /v1/orders/123 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
ETag: "a1b2c3d4"

{
  "id": "123",
  "status": "processing"
}
```

Client updates, guarded by the ETag:

```http
PUT /v1/orders/123 HTTP/1.1
Host: api.example.com
Content-Type: application/json
If-Match: "a1b2c3d4"

{
  "status": "shipped"
}
```

Success response (resource updated). Return a new ETag for the new representation:

```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "e5f6g7h8"

{
  "id": "123",
  "status": "shipped"
}
```

Conflict response (client updated a stale version):

```http
HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json
ETag: "x9y8z7"

{
  "type": "https://api.example.com/problems/precondition-failed",
  "title": "Precondition Failed",
  "status": 412,
  "detail": "Resource has been modified since last retrieved"
}
```

Notes:

- `412 Precondition Failed` is the standard response for a failed `If-Match` precondition.
- A server may include the current `ETag` header in the error response to help clients decide what to do next.

### `If-Match: *` (update only if the resource exists)

`If-Match: *` makes the request conditional on the resource existing.

Example:

```http
PATCH /v1/orders/123 HTTP/1.1
Host: api.example.com
Content-Type: application/json
If-Match: *

{
  "status": "cancelled"
}
```

This is useful when the client wants to avoid creating a new resource or applying an update to a resource that was deleted.

## Pattern: Cache Validation with `If-None-Match`

`If-None-Match` is most commonly used with `GET` and `HEAD` to avoid transferring a response body when the cached representation is still current.

### How it works for `GET`

1. Client `GET`s a resource, stores the response body and its `ETag`.
2. Later, client `GET`s again with `If-None-Match` set to the stored ETag.
3. If the representation is unchanged, server returns `304 Not Modified` with no body.
4. If changed, server returns `200 OK` with the new body and new `ETag`.

### Example: conditional `GET`

Initial fetch:

```http
GET /v1/products/456 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
ETag: "p-001"

{
  "id": "456",
  "name": "Widget",
  "price": 29.99
}
```

Revalidation request:

```http
GET /v1/products/456 HTTP/1.1
Host: api.example.com
If-None-Match: "p-001"
```

Unchanged response:

```http
HTTP/1.1 304 Not Modified
ETag: "p-001"
```

Changed response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "p-002"

{
  "id": "456",
  "name": "Widget Pro",
  "price": 39.99
}
```

### Multiple ETags in `If-None-Match`

A client may send a list of validators:

```http
GET /v1/products/456 HTTP/1.1
Host: api.example.com
If-None-Match: "p-001", "p-002", W/"p-003"
```

If any of the listed ETags match the current representation (according to RFC 7232 matching rules), the server treats it as a match for `If-None-Match`.

## Pattern: Create-If-Not-Exists with `If-None-Match: *`

`If-None-Match: *` can be used to ensure an operation only succeeds if the target resource does not already exist.

This is most common with `PUT` when the client chooses the identifier.

### Example: conditional create with `PUT`

```http
PUT /v1/users/unique-id HTTP/1.1
Host: api.example.com
Content-Type: application/json
If-None-Match: *

{
  "name": "New User"
}
```

If the resource did not exist:

```http
HTTP/1.1 201 Created
Location: /v1/users/unique-id
ETag: "u-001"
Content-Type: application/json

{
  "id": "unique-id",
  "name": "New User"
}
```

If the resource already exists, the precondition fails:

```http
HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/precondition-failed",
  "title": "Precondition Failed",
  "status": 412,
  "detail": "Resource already exists"
}
```

## Time-Based Conditional Requests

ETags are usually the best validator for APIs. Some systems also send `Last-Modified` and support time-based conditions.

Time-based validators can be limited by timestamp precision and clock skew. Use them when ETags are not available, or to support clients that only know time-based validation.

### `If-Modified-Since` (cache validation)

If the resource has not been modified since the given date, the server may return `304 Not Modified`.

```http
GET /v1/reports/monthly HTTP/1.1
Host: api.example.com
If-Modified-Since: Sat, 13 Jan 2024 10:30:00 GMT
```

Example unchanged response:

```http
HTTP/1.1 304 Not Modified
Last-Modified: Sat, 13 Jan 2024 10:30:00 GMT
```

### `If-Unmodified-Since` (time-based optimistic concurrency)

`If-Unmodified-Since` makes a request succeed only if the resource has not changed since the given date.

Example:

```http
DELETE /v1/orders/123 HTTP/1.1
Host: api.example.com
If-Unmodified-Since: Sat, 13 Jan 2024 10:30:00 GMT
```

If the resource was modified after that time, the server rejects the request with `412 Precondition Failed`.

## Handling `412 Precondition Failed`

A `412 Precondition Failed` response means the client’s condition did not hold for the current representation.

### Recommended client behavior

- Re-fetch the resource (`GET`) to obtain the latest representation and validator (`ETag`).
- Decide how to resolve the conflict (retry, merge, or ask a user to resolve).
- Retry the update with the new validator.

### Example: conflict resolution flow

```http
# Client A reads
GET /v1/documents/1 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
ETag: "v1"
Content-Type: application/json

{"id":"1","title":"Draft"}

# Client B reads
GET /v1/documents/1 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
ETag: "v1"
Content-Type: application/json

{"id":"1","title":"Draft"}

# Client A updates successfully
PUT /v1/documents/1 HTTP/1.1
Host: api.example.com
If-Match: "v1"
Content-Type: application/json

{"title":"Final"}

HTTP/1.1 200 OK
ETag: "v2"
Content-Type: application/json

{"id":"1","title":"Final"}

# Client B tries to update stale version
PUT /v1/documents/1 HTTP/1.1
Host: api.example.com
If-Match: "v1"
Content-Type: application/json

{"title":"Review"}

HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json
ETag: "v2"

{
  "type": "https://api.example.com/problems/precondition-failed",
  "title": "Precondition Failed",
  "status": 412,
  "detail": "Resource has been modified since last retrieved"
}
```

## Conditional Requests for Collections

Collections (lists) can also be validated conditionally, but you need to be clear about what is being validated.

Key points:

- The `ETag` validates the **collection representation**, not each individual item.
- Different query parameters (pagination, filters, sort) generally produce different representations and therefore different validators.

### Example: caching a paginated list

```http
GET /v1/products?page=1&size=2 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
ETag: "products-p1-v10"

{
  "items": [
    {"id":"p-100","name":"Widget"},
    {"id":"p-200","name":"Gadget"}
  ],
  "page": 1,
  "size": 2
}
```

Later validation:

```http
GET /v1/products?page=1&size=2 HTTP/1.1
Host: api.example.com
If-None-Match: "products-p1-v10"

HTTP/1.1 304 Not Modified
ETag: "products-p1-v10"
```

## `DELETE` with Conditions

`DELETE` can be made safer with `If-Match`. This prevents deleting a resource that changed since the client last read it.

### Example: safe delete

```http
DELETE /v1/orders/123 HTTP/1.1
Host: api.example.com
If-Match: "a1b2c3d4"
```

Success response:

```http
HTTP/1.1 204 No Content
```

Stale delete response:

```http
HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/precondition-failed",
  "title": "Precondition Failed",
  "status": 412,
  "detail": "Resource has been modified since last retrieved"
}
```

## Common Design Pitfalls

- **Using weak ETags for write preconditions**: `If-Match` requires strong comparison. Prefer strong ETags for concurrency control.
- **Treating ETag as a row version**: ETags validate the selected representation. If your response varies, validators may vary too.
- **Leaking internal versions**: ETags can be observed by clients and intermediaries. Avoid encoding sensitive or internal-only information.

## References

- RFC 7232: Hypertext Transfer Protocol (HTTP/1.1): Conditional Requests
