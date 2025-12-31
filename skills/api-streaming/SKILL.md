---
name: api-streaming
description: Implement and manage streaming REST APIs with formats (SSE, NDJSON, chunked), flow control (backpressure, heartbeats), and error handling (in-stream errors, reconnection). Use when building real-time feeds, streaming bulk exports, reporting long-running progress, or implementing event replay.
---

# API Streaming

Implement real-time and bulk data streaming with SSE and NDJSON.

## When to Use

- Streaming real-time updates to clients
- Exporting large datasets efficiently
- Reporting progress for long-running operations
- Implementing Server-Sent Events (SSE)
- Using NDJSON for data streaming

## Quick Start

SSE stream for real-time events:

```http
GET /orders/events HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream

id: 1
event: order-created
data: {"orderId":"123","status":"CREATED"}
```

## Format Decision

| Use Case | Format | Content-Type |
|----------|--------|--------------|
| Browser notifications | SSE | `text/event-stream` |
| Live dashboards | SSE | `text/event-stream` |
| Bulk data export | NDJSON | `application/x-ndjson` |
| ETL pipelines | NDJSON | `application/x-ndjson` |

## URL Pattern

```
GET /orders        → JSON array (complete)
GET /orders/stream → NDJSON stream
GET /orders/events → SSE stream
```

## SSE Event Structure

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Recommended | For reconnection support |
| `event` | Recommended | Event type name |
| `data` | Required | JSON payload |
| `retry` | Optional | Reconnection delay (ms) |

Reconnect with: `Last-Event-ID: {last-id}`

## NDJSON Format

```
{"type":"metadata","totalRecords":1000}
{"type":"data","sequence":1,"data":{"id":"order-1"}}
{"type":"stream-end","reason":"completed","processed":1000}
```

Each line is complete JSON. No commas between lines.

## Flow Control

- Send heartbeats every 15-30 seconds
- Include sequential event IDs
- Handle `Last-Event-ID` for reconnection
- Buffer with limits, apply backpressure

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| No heartbeat | Stale connections | Send every 15-30s |
| Missing event IDs | Can't resume | Include sequential IDs |
| No backpressure | Memory exhaustion | Buffer with limits |
| No error events | Silent failures | Stream errors as events |

## References

- `references/sse-patterns.md` - SSE implementation details
- `references/ndjson-patterns.md` - NDJSON patterns
- `references/flow-control.md` - Backpressure handling
- `references/java-spring.md` - Spring WebFlux implementation
- `../../api-design/advanced-patterns/async-batch-patterns.md` - Long-running operations
