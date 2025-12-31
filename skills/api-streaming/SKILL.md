---
name: api-streaming
description: Implement streaming APIs using Server-Sent Events (SSE), NDJSON, and reactive patterns. Use when building real-time data feeds, long-running operations with progress updates, or high-throughput data export endpoints.
---

# API Streaming

## When to Use This Skill

Use this skill when you need to:
- Stream real-time updates to clients (live feeds, notifications)
- Export large datasets efficiently
- Report progress for long-running operations
- Implement Server-Sent Events (SSE)
- Use NDJSON for data streaming
- Handle backpressure in data flows

## Streaming Format Decision

| Use Case | Format | Content-Type |
|----------|--------|--------------|
| Real-time browser notifications | SSE | `text/event-stream` |
| Live dashboard updates | SSE | `text/event-stream` |
| Bulk data export | NDJSON | `application/x-ndjson` |
| Log streaming | NDJSON | `application/x-ndjson` |
| ETL pipelines | NDJSON | `application/x-ndjson` |
| Bidirectional communication | WebSocket | N/A |
| Large JSON arrays | Chunked JSON | `application/json` |

## URL Pattern

Provide both standard and streaming endpoints:

```
GET /orders              → Returns JSON array (complete)
GET /orders/stream       → Returns NDJSON stream
GET /orders/events       → Returns SSE stream
```

## Server-Sent Events (SSE)

### Request

```http
GET /orders/events HTTP/1.1
Accept: text/event-stream
Authorization: Bearer {token}
```

### Response Format

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

id: 1
event: order-created
data: {"orderId":"order-123","status":"CREATED"}

id: 2
event: order-updated
data: {"orderId":"order-123","status":"PROCESSING"}

id: 3
event: order-shipped
data: {"orderId":"order-123","status":"SHIPPED","trackingNumber":"1Z999AA1"}
```

### SSE Event Structure

```
id: unique-event-id
event: event-type
data: {"json":"payload"}
retry: 5000
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Recommended | Unique ID for reconnection support |
| `event` | Recommended | Event type name |
| `data` | Required | JSON payload (can span multiple lines) |
| `retry` | Optional | Reconnection delay in milliseconds |

### Standard Event Types

| Event Type | Description |
|------------|-------------|
| `{resource}-created` | New resource created |
| `{resource}-updated` | Resource modified |
| `{resource}-deleted` | Resource removed |
| `heartbeat` | Keep connection alive |
| `error` | Stream error occurred |
| `stream-end` | Stream completed |

### Heartbeat Events

Send periodic heartbeats to detect stale connections:

```
: heartbeat
id: 100

event: heartbeat
data: {"timestamp":"2024-07-15T14:30:00Z"}
```

The `:` prefix is a comment (ignored by clients but keeps connection alive).

### Reconnection with Last-Event-ID

Client reconnects with last received ID:

```http
GET /orders/events HTTP/1.1
Accept: text/event-stream
Last-Event-ID: 42
```

Server resumes from event 43 onwards.

## NDJSON Streaming

### Request

```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson
Authorization: Bearer {token}
```

### Response Format

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked

{"id":"order-1","status":"PROCESSING","total":99.95}
{"id":"order-2","status":"COMPLETED","total":149.50}
{"id":"order-3","status":"PENDING","total":75.00}
```

Each line is a complete, valid JSON object. No commas between lines.

### Structured NDJSON Stream

Include metadata and end markers:

```json
{"type":"metadata","totalRecords":1000,"startTime":"2024-07-15T14:30:00Z"}
{"type":"data","sequence":1,"data":{"id":"order-1","status":"PROCESSING"}}
{"type":"data","sequence":2,"data":{"id":"order-2","status":"COMPLETED"}}
{"type":"error","code":"PROCESSING_ERROR","recordId":"order-3","message":"Failed to process"}
{"type":"stream-end","reason":"completed","totalProcessed":2,"totalErrors":1}
```

### NDJSON Record Types

| Type | Purpose | Fields |
|------|---------|--------|
| `metadata` | Stream metadata | `totalRecords`, `startTime` |
| `data` | Actual data record | `sequence`, `data` (payload) |
| `progress` | Progress update | `processed`, `total`, `percentage` |
| `error` | Processing error | `code`, `message`, `recordId` |
| `heartbeat` | Keep connection alive | `timestamp`, `processed` |
| `stream-end` | Stream completion | `reason`, `processed`, `errors` |

### Character Encoding Requirements

- **Encoding**: UTF-8 (required)
- **BOM**: Not allowed
- **Line separator**: `\n` only (not `\r\n`)
- **Maximum line length**: 1 MB (1,048,576 bytes)

## Error Handling in Streams

### SSE Error Events

Use RFC 7807 problem format:

```
id: 50
event: error
data: {"type":"https://api.example.com/problems/stream-error","title":"Processing Error","status":500,"detail":"Database connection lost"}

id: 51
event: stream-end
data: {"reason":"error","totalProcessed":49}
```

Valid `stream-end` reasons: `completed`, `cancelled`, `error`, `timeout`

### NDJSON Error Records

```json
{"type":"error","code":"RECORD_ERROR","recordId":"order-123","message":"Invalid data format"}
```

### HTTP Errors Before Stream Starts

If error occurs before streaming begins, return standard HTTP error:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/unauthorized",
  "title": "Unauthorized",
  "status": 401
}
```

### Errors During Stream

Once streaming has started, include errors in the stream:

```
event: error
data: {"type":"stream-error","message":"Database connection lost"}

event: stream-end
data: {"reason":"error"}
```

## Flow Control

### Batch Size Control

Client can request specific batch sizes:

```http
GET /orders/stream?batchSize=100 HTTP/1.1
Accept: application/x-ndjson
```

Server respects (or caps) the requested batch size.

### Flow Control Headers

Client request headers:

```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson
X-Stream-Buffer-Size: 100
X-Stream-Rate-Limit: 10/second
```

Server response headers:

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
X-Stream-Rate: 10/second
X-Stream-Buffer-Size: 100
X-Stream-Batch-Size: 50
X-Stream-Total-Items: 10000
```

### Server-Side Backpressure

When client can't keep up:
1. Buffer up to a limit
2. Apply backpressure to data source
3. If buffer overflows, send warning event
4. Optionally close connection with error

## Long-Running Operations

### Async Operation Pattern

For operations that take longer than HTTP timeout:

```http
POST /orders/bulk-import HTTP/1.1
Content-Type: application/json

{"items": [...thousands of items...]}

HTTP/1.1 202 Accepted
Location: /operations/op-123
Content-Type: application/json

{
  "operationId": "op-123",
  "status": "PROCESSING",
  "progressUrl": "/operations/op-123/events"
}
```

### Progress Stream

```http
GET /operations/op-123/events HTTP/1.1
Accept: text/event-stream

event: progress
data: {"processed":100,"total":1000,"percentage":10}

event: progress
data: {"processed":500,"total":1000,"percentage":50}

event: completed
data: {"processed":1000,"total":1000,"successCount":998,"errorCount":2}
```

## Connection Management

### Timeout Handling

- Set appropriate read timeouts (> heartbeat interval)
- Implement reconnection with exponential backoff
- Use `retry` field to control client reconnection

### Connection Limits

- Limit concurrent streaming connections per client
- Return 429 if connection limit exceeded
- Consider connection pooling for high-traffic scenarios

### Graceful Shutdown

```
event: stream-end
data: {"reason":"server-shutdown","message":"Server is shutting down, please reconnect"}
```

## Security

### Authentication

Always require authentication for streaming endpoints:

```http
GET /orders/events HTTP/1.1
Authorization: Bearer {token}
Accept: text/event-stream
```

### Token Expiration During Stream

For long-lived streams, handle token expiration:

**Option 1: Close and require reconnection**
```
event: error
data: {"type":"token-expired","message":"Please reconnect with new token"}
```

**Option 2: Token refresh notification**
```
event: token-refresh-required
data: {"expiresIn":300,"refreshUrl":"/auth/refresh"}
```

### Per-Message Authorization

Filter streamed data based on user permissions - don't stream data the user shouldn't see.

## Quick Reference

### SSE Endpoint

```http
GET /orders/events HTTP/1.1
Accept: text/event-stream
Authorization: Bearer {token}

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 1
event: order-created
data: {"orderId":"123","status":"CREATED"}
```

### NDJSON Endpoint

```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson
Authorization: Bearer {token}

HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked

{"id":"order-1","status":"PROCESSING"}
{"id":"order-2","status":"COMPLETED"}
```

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| No heartbeat | Stale connections undetected | Send heartbeat every 15-30 seconds |
| Missing event IDs | Can't resume on reconnect | Include sequential IDs |
| Unbounded streams | Resource exhaustion | Add limits, use pagination for huge datasets |
| No backpressure | Memory exhaustion | Buffer with limits, apply backpressure |
| Blocking in reactive | Thread starvation | Use non-blocking operations only |
| No error events | Client doesn't know about failures | Stream errors as events |
| Infinite retry | DoS on failures | Use exponential backoff |

## Streaming Checklist

- [ ] Choose appropriate format (SSE vs NDJSON)
- [ ] Set correct Content-Type header
- [ ] Include event IDs for SSE
- [ ] Implement heartbeat mechanism
- [ ] Handle errors as stream events
- [ ] Support reconnection with Last-Event-ID
- [ ] Implement backpressure handling
- [ ] Add authentication/authorization
- [ ] Handle token expiration for long streams
- [ ] Include stream-end event/record
- [ ] Set appropriate timeouts
- [ ] Test with network interruptions

## Loading Additional Context

When you need deeper guidance:

- **Server-Sent Events patterns**: Load `references/sse-patterns.md`
- **NDJSON streaming patterns**: Load `references/ndjson-patterns.md`
- **Flow control and backpressure**: Load `references/flow-control.md`
- **Java/Spring implementation**: Load `references/java-spring.md`
- **HTTP streaming patterns (SSE, WebSocket, chunked)**: Load `/home/jeff/workspaces/spring-api-design-docs/api-design/advanced-patterns/http-streaming-patterns.md`
- **Async/batch patterns (long-running ops, webhooks)**: Load `/home/jeff/workspaces/spring-api-design-docs/api-design/advanced-patterns/async-batch-patterns.md`
