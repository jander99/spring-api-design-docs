# Mobile API Considerations

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 13 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Data
> 
> **📊 Complexity:** 14.8 grade level • 1.2% technical density • fairly difficult

## Overview

Mobile clients face constraints that server-to-server clients usually do not:

- Networks switch between Wi-Fi and cellular, and they drop often
- Requests can be paused when apps move to the background
- Battery, CPU, and data plans are limited
- Users expect the app to work offline and sync later

This guide covers API patterns that make mobile apps fast, resilient, and efficient. It uses HTTP and JSON examples only.

## Goals for Mobile-Friendly APIs

A mobile-friendly API helps clients:

- Work offline with predictable sync behavior
- Minimize bytes transferred and round trips
- Avoid frequent wake-ups and reconnections
- Recover safely from retries, duplicates, and partial failures
- Keep user data secure when stored on-device

## Offline-First Patterns

Offline-first means the client can continue to read and write data while offline. The API must support later synchronization.

### Local-first architecture

A common model is:

- The client stores data locally and reads from local storage
- The client queues writes locally
- The client syncs with the server when online
- The server remains the source of truth for shared state

This requires your API to support:

- Efficient “what changed?” queries
- Safe replay of writes (idempotency)
- Conflict detection and resolution
- Deletions (tombstones) during sync

### Sync patterns

Choose a sync model based on dataset size and how often data changes.

#### Full sync

Use when the dataset is small.

- Client downloads all items
- Simple to implement
- Can waste bandwidth as data grows

#### Delta sync

Use when the dataset is large or changes often.

- Client downloads only changed items and deletions
- Requires a stable change tracking mechanism

Common mechanisms:

- Timestamp-based sync (`updated_at > since`)
- Cursor or token-based sync (preferred)
- Event or change-log based sync

### Sync API shape

A sync endpoint should be explicit about:

- The time or cursor the client is syncing from
- The server time used to compute changes
- The list of changed records
- The list of deletions
- Pagination for large change sets

Example (cursor-based, includes deletions):

```http
GET /v1/sync?cursor=eyJ2IjoxLCJ0IjoiMjAyNi0wMS0wOVQxMjozMDowMFoifQ HTTP/1.1
Accept: application/json
Authorization: Bearer <access-token>

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "server_time": "2026-01-09T12:35:10Z",
  "next_cursor": "eyJ2IjoxLCJ0IjoiMjAyNi0wMS0wOVQxMjozNToxMFoifQ",
  "has_more": false,
  "changes": [
    {
      "type": "note",
      "id": "note_123",
      "updated_at": "2026-01-09T12:33:02Z",
      "data": {
        "id": "note_123",
        "title": "Trip planning",
        "body": "...",
        "version": 17
      }
    }
  ],
  "deletions": [
    {
      "type": "note",
      "id": "note_456",
      "deleted_at": "2026-01-09T12:31:44Z"
    }
  ]
}
```

Notes:

- Return deletions explicitly. Clients need to remove local records.
- Include a server-generated cursor. Avoid client clocks as an authority.
- Use `Cache-Control: no-store` for user-specific sync payloads.

### Initial sync vs. incremental sync

Mobile clients often need different behaviors:

- **Initial sync**: First launch on a device, possibly after sign-in
- **Incremental sync**: Periodic refresh to pick up changes

Design options:

- One endpoint that supports both via `cursor` being absent or present
- Separate endpoints if initial sync requires different data and ordering

### Conflict detection and resolution

Conflicts happen when:

- The same record is edited on multiple devices while offline
- The server has changed a record since the client last saw it

Your API should support at least one of these strategies:

- **Last write wins**: Simplest, can lose edits
- **Merge on the server**: Combine fields when safe
- **Manual resolution**: Server detects conflict and asks the user to choose

A practical HTTP-based approach is version preconditions.

Example: client updates a record only if it still matches the version it edited.

```http
PATCH /v1/notes/note_123 HTTP/1.1
Content-Type: application/json
If-Match: "v17"
Authorization: Bearer <access-token>

{
  "title": "Trip planning (updated)",
  "body": "..."
}

HTTP/1.1 200 OK
Content-Type: application/json
ETag: "v18"

{
  "id": "note_123",
  "title": "Trip planning (updated)",
  "body": "...",
  "version": 18,
  "updated_at": "2026-01-09T12:40:00Z"
}
```

If the precondition fails:

```http
PATCH /v1/notes/note_123 HTTP/1.1
Content-Type: application/json
If-Match: "v17"
Authorization: Bearer <access-token>

{
  "title": "Trip planning (updated)",
  "body": "..."
}

HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json

{
  "title": "Update conflict",
  "status": 412,
  "detail": "The note changed since you last downloaded it.",
  "current": {
    "etag": "v19",
    "updated_at": "2026-01-09T12:39:10Z"
  }
}
```

### Optimistic updates

Mobile apps often update the UI immediately, then sync the change in the background.

To support this safely, the API should provide:

- Stable identifiers for created resources
- Idempotency for create operations
- Clear error responses for validation and conflicts

Example: idempotent create when the client may retry.

```http
POST /v1/notes HTTP/1.1
Content-Type: application/json
Idempotency-Key: note-create-3f8e2f1d
Authorization: Bearer <access-token>

{
  "title": "Offline note",
  "body": "Created while offline"
}

HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "note_789",
  "title": "Offline note",
  "body": "Created while offline",
  "version": 1,
  "created_at": "2026-01-09T12:41:05Z"
}
```

If the same request is replayed with the same `Idempotency-Key`, return the same result.

## Bandwidth Optimization

Bandwidth matters on mobile. Reducing bytes also reduces battery use.

### Compression

Enable response compression when appropriate.

```http
GET /v1/catalog/items?page=1&page_size=20 HTTP/1.1
Accept: application/json
Accept-Encoding: br, gzip

HTTP/1.1 200 OK
Content-Type: application/json
Content-Encoding: gzip
Vary: Accept-Encoding

{ "items": [ ... ] }
```

Guidance:

- Use `Vary: Accept-Encoding` when serving compressed responses.
- Avoid compressing already-compressed media formats.

Request compression can help for large uploads.

```http
POST /v1/telemetry HTTP/1.1
Content-Type: application/json
Content-Encoding: gzip

<gzipped JSON payload>
```

### Payload reduction

Mobile clients benefit from smaller, purpose-built responses.

#### Field selection

Allow clients to request only the fields they need.

```http
GET /v1/users/user_123?fields=id,display_name,avatar_url HTTP/1.1
Accept: application/json
Authorization: Bearer <access-token>

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "user_123",
  "display_name": "A. Smith",
  "avatar_url": "https://cdn.example.com/avatars/user_123_thumb.jpg"
}
```

Design rules:

- Define a default field set that supports common screens
- Validate `fields` and fail clearly on unknown fields
- Avoid allowing clients to select deeply nested private fields

#### Pagination with small pages

Mobile UIs usually load content incrementally. Prefer small page sizes.

```http
GET /v1/messages?thread_id=thr_1&page_size=25&cursor=msg_250 HTTP/1.1
Accept: application/json
Authorization: Bearer <access-token>

HTTP/1.1 200 OK
Content-Type: application/json

{
  "items": [ ... ],
  "next_cursor": "msg_225",
  "has_more": true
}
```

#### Image and media optimization

Serve media in sizes that match mobile screens.

Options:

- Provide separate URLs for thumbnails vs. full-size media
- Support size parameters (validated and bounded)
- Use content negotiation when available

Example (thumbnail variant):

```http
GET /v1/photos/photo_123/thumbnail HTTP/1.1
Accept: image/*

HTTP/1.1 200 OK
Content-Type: image/jpeg
Cache-Control: public, max-age=86400

<binary>
```

### Conditional requests (validation caching)

Mobile clients should avoid downloading the same payload repeatedly.

Use ETags for validation:

```http
GET /v1/users/user_123 HTTP/1.1
Accept: application/json
If-None-Match: "v18"
Authorization: Bearer <access-token>

HTTP/1.1 304 Not Modified
ETag: "v18"
Cache-Control: private, max-age=300
```

Or time-based validation:

```http
GET /v1/catalog/items?page=1&page_size=20 HTTP/1.1
If-Modified-Since: Wed, 08 Jan 2026 10:00:00 GMT
Accept: application/json

HTTP/1.1 304 Not Modified
Last-Modified: Wed, 08 Jan 2026 10:00:00 GMT
Cache-Control: public, max-age=600
```

## Battery Considerations

Battery cost comes from radio wake-ups, CPU, and frequent background work. Your API can reduce these costs.

### Batch requests

Batching reduces round trips and connection setup overhead.

A batch endpoint should:

- Limit the number of sub-requests
- Enforce per-request authorization
- Return independent results per sub-request
- Prevent SSRF-style path abuse by restricting allowed paths

Example:

```http
POST /v1/batch HTTP/1.1
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "requests": [
    { "id": "r1", "method": "GET", "path": "/v1/users/me" },
    { "id": "r2", "method": "GET", "path": "/v1/notifications?unread=true&page_size=20" },
    { "id": "r3", "method": "GET", "path": "/v1/messages?thread_id=thr_1&page_size=25" }
  ]
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "responses": [
    { "id": "r1", "status": 200, "body": { "id": "user_123", "display_name": "A. Smith" } },
    { "id": "r2", "status": 200, "body": { "items": [ ... ], "has_more": false } },
    { "id": "r3", "status": 200, "body": { "items": [ ... ], "has_more": true, "next_cursor": "msg_225" } }
  ]
}
```

### Connection management

Mobile clients benefit when servers support efficient connections.

Server-side considerations:

- Prefer HTTP/2 or HTTP/3 when feasible
- Keep responses small and fast to parse
- Avoid chatty API designs that require many sequential calls

### Push vs. poll

Polling frequently wastes battery and data.

Better patterns:

- Use push messaging to prompt a refresh, then fetch changes via HTTP
- If polling is required, poll less often and back off when there are no changes

Example: a lightweight “changes since” poll that supports backoff.

```http
GET /v1/notifications/changes?cursor=noti_1000 HTTP/1.1
Accept: application/json
Authorization: Bearer <access-token>

HTTP/1.1 200 OK
Content-Type: application/json

{
  "next_cursor": "noti_1000",
  "changes": [],
  "suggested_poll_seconds": 120
}
```

When changes exist:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "next_cursor": "noti_1012",
  "changes": [
    { "id": "noti_1012", "type": "message", "created_at": "2026-01-09T12:50:00Z" }
  ],
  "suggested_poll_seconds": 15
}
```

## Network Resilience

Mobile networks fail often. Design so that failure is expected.

### Retry strategies

Retries should be selective and bounded.

- Retry transient errors (`408`, `429`, `500`, `502`, `503`, `504`)
- Do not retry validation errors (`400`, `422`)
- Respect `Retry-After` when present
- Use exponential backoff and jitter
- Cap total retries and total time

Example: server signals a retry delay.

```http
GET /v1/sync?cursor=... HTTP/1.1
Accept: application/json
Authorization: Bearer <access-token>

HTTP/1.1 503 Service Unavailable
Content-Type: application/problem+json
Retry-After: 10

{
  "title": "Temporarily unavailable",
  "status": 503,
  "detail": "Please retry after 10 seconds."
}
```

### Request queuing and replay

When offline, clients queue requests and replay them later.

Your API should support safe replay by:

- Using idempotent methods when possible (`PUT`, `DELETE`)
- Supporting idempotency keys for operations that must be `POST`
- Returning stable results for duplicate requests

Example: client replays an idempotent update.

```http
PUT /v1/preferences/user_123 HTTP/1.1
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "marketing_opt_in": false
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "user_id": "user_123",
  "marketing_opt_in": false,
  "updated_at": "2026-01-09T12:55:00Z"
}
```

### Timeout design

Mobile clients should use shorter timeouts for interactive actions.

API design implications:

- Keep request processing time short for interactive endpoints
- Move long work to asynchronous workflows
- Provide progress and retry guidance via response codes and headers

Example: asynchronous acceptance when work is slow.

```http
POST /v1/reports HTTP/1.1
Content-Type: application/json
Authorization: Bearer <access-token>

{ "type": "monthly_summary", "month": "2025-12" }

HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "job_id": "job_123",
  "status": "pending"
}
```

## API Design for Mobile Screens

Mobile UIs often need a small set of related data for each screen. A naive resource-by-resource design can create many round trips.

### Endpoint design

Options to reduce round trips:

- Provide aggregate endpoints that return screen-ready bundles
- Support embedded or expanded representations when appropriate
- Use batch requests for independent reads

Example: a “home” endpoint returning a curated bundle.

```http
GET /v1/home HTTP/1.1
Accept: application/json
Authorization: Bearer <access-token>

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: private, max-age=60

{
  "user": { "id": "user_123", "display_name": "A. Smith" },
  "unread_notifications": 3,
  "recent_messages": [ ... ],
  "recommended_items": [ ... ]
}
```

Guidance:

- Keep aggregate endpoints stable and versioned like other resources
- Avoid making aggregates too large
- Use `fields` or paging within aggregates when needed

### Response design

Design responses to minimize follow-up requests:

- Include identifiers and essential display fields
- Include pagination cursors for lists
- Prefer consistent envelope shapes across endpoints

## Security on Mobile

Mobile devices store data locally and can be lost or compromised. Your API design should assume:

- Tokens may be stolen from a device
- Offline caches may contain sensitive information
- Clients can be reverse engineered

### Token lifecycle

Recommendations:

- Use short-lived access tokens
- Use refresh tokens or re-auth flows to obtain new access tokens
- Return clear authentication challenges

Example: expired token.

```http
GET /v1/users/me HTTP/1.1
Accept: application/json
Authorization: Bearer <expired-token>

HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer error="invalid_token", error_description="The access token expired"
Content-Type: application/problem+json

{
  "title": "Unauthorized",
  "status": 401,
  "detail": "Your session expired. Re-authenticate to continue."
}
```

### Sensitive data and caching

For endpoints that return sensitive user data:

- Use `Cache-Control: no-store`
- Avoid placing secrets in URLs (query strings may be logged)
- Keep error messages informative but not revealing

### Certificate pinning and rotation

Certificate pinning can reduce the impact of some attacks, but it increases operational risk.

If you support pinning, plan for:

- Certificate rotation (overlapping valid pins)
- Emergency recovery if a pin must be revoked
- Clear deprecation timelines for old pins

Pinning should not replace standard TLS hygiene.

## Checklist

Use this checklist when designing or reviewing a mobile-facing API:

- Sync supports changes and deletions
- Sync uses a server-defined cursor or token
- Writes are safe to replay (idempotency keys where needed)
- Conflicts are detected and handled predictably
- Responses support compression and validation (ETag or Last-Modified)
- Payloads support field selection and small-page pagination
- Round trips are minimized (aggregate or batch patterns)
- Retry and backoff are supported with `Retry-After` when appropriate
- Sensitive responses use `Cache-Control: no-store`
