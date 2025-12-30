---
name: api-streaming
description: Implement streaming APIs using Server-Sent Events (SSE), NDJSON, and reactive patterns. Use when building real-time data feeds, long-running operations with progress updates, or high-throughput data export endpoints.
---

# API Streaming

<!--
SOURCE DOCUMENTS:
- api-design/request-response/Streaming-APIs.md
- api-design/advanced-patterns/HTTP-Streaming-Patterns.md
- api-design/advanced-patterns/Reactive-Error-Handling.md
- api-design/reference/streaming/sse-specification.md
- api-design/reference/streaming/ndjson-specification.md
- api-design/reference/streaming/flow-control.md
- api-design/examples/streaming/
- spring-design/controllers/Reactive-Controllers.md

REFERENCE FILES TO CREATE:
- references/sse-patterns.md (Server-Sent Events)
- references/ndjson-patterns.md (NDJSON streaming)
- references/flow-control.md (backpressure, connection management)
- references/java-spring.md (WebFlux, Flux/Mono, reactive patterns)
-->

## When to Use This Skill

Use this skill when you need to:
- Stream real-time updates to clients
- Implement Server-Sent Events (SSE)
- Use NDJSON for data streaming
- Handle backpressure in data flows
- Build progress reporting for long operations
- Export large datasets efficiently

## Core Principles

TODO: Extract and condense from Streaming-APIs.md

### Streaming Formats
- **SSE (Server-Sent Events)**: Browser-native, text-based, auto-reconnect
- **NDJSON**: Newline-delimited JSON, good for data processing
- **WebSocket**: Bidirectional, but more complex

### When to Use Each Format
- SSE: Real-time notifications, live feeds, progress updates
- NDJSON: Bulk data export, log streaming, ETL pipelines
- WebSocket: Chat, gaming, collaborative editing

### Flow Control
- Implement backpressure to prevent overwhelming clients
- Use heartbeats to detect stale connections
- Handle reconnection gracefully with event IDs

### Content Types
- SSE: `text/event-stream`
- NDJSON: `application/x-ndjson`

## Quick Reference

TODO: Add streaming format decision tree

| Use Case | Recommended Format |
|----------|-------------------|
| Browser notifications | SSE |
| Live dashboard updates | SSE |
| Bulk data export | NDJSON |
| Log streaming | NDJSON |
| Bidirectional comms | WebSocket |
| File uploads with progress | Multipart + SSE |

## Loading Additional Context

When you need deeper guidance:

- **Server-Sent Events**: Load `references/sse-patterns.md`
- **NDJSON streaming**: Load `references/ndjson-patterns.md`
- **Flow control patterns**: Load `references/flow-control.md`
- **Java/Spring implementation**: Load `references/java-spring.md`

## Examples

TODO: Add minimal illustrative examples

### SSE Response
```
Content-Type: text/event-stream

event: update
data: {"orderId": "123", "status": "processing"}

event: update
data: {"orderId": "123", "status": "shipped"}

event: complete
data: {"orderId": "123", "status": "delivered"}
```

### NDJSON Response
```
Content-Type: application/x-ndjson

{"id": 1, "name": "Item 1", "price": 10.00}
{"id": 2, "name": "Item 2", "price": 20.00}
{"id": 3, "name": "Item 3", "price": 30.00}
```

### SSE with Retry
```
retry: 5000
id: 12345
event: message
data: {"content": "Hello"}
```

## Anti-Patterns

TODO: Extract from source documents

- No heartbeat mechanism (stale connection detection)
- Missing event IDs for reconnection
- Unbounded streams without pagination
- No backpressure handling
- Blocking operations in reactive streams
- Missing error events in SSE
