# HTTP Streaming Patterns

> **Reading Guide**
> 
> **Reading Time:** 10 minutes | **Level:** Advanced
> 
> **Prerequisites:** HTTP fundamentals, understanding of real-time data requirements  
> **Key Topics:** SSE, WebSockets, NDJSON, streaming responses
> 
> **Complexity:** Advanced technical content for real-time API design

## Overview

This document outlines HTTP streaming patterns for building reactive APIs that handle real-time data flow efficiently. These patterns focus on HTTP-based streaming protocols, Server-Sent Events (SSE), and WebSocket integrations that can be implemented in any technology stack.

## Response Pattern Standards

### Collection Handling Patterns

For collection endpoints, provide both standard and streaming options:

```
GET /orders         → Returns JSON array (complete collection)
GET /orders/stream  → Returns NDJSON stream (streaming collection)
```

### Response Pattern Standards

| Operation Type | Response Pattern | Usage |
|----------------|------------------|-------|
| Single resource fetch | Single JSON object | Getting a specific item |
| Collection fetch (complete) | JSON array | Getting a finite collection |
| Collection fetch (streaming) | NDJSON or SSE stream | Streaming potentially large collections |
| Resource creation | Single JSON object | Creating and returning a resource |
| Resource update | Single JSON object | Updating and returning a resource |
| Resource deletion | Empty response (204 No Content) | Deleting a resource without return value |

## HTTP Streaming Implementation

### Standard Collection Endpoint

```http
GET /v1/orders?page=0&size=20 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {"id": "order-1", "status": "PROCESSING"},
    {"id": "order-2", "status": "COMPLETED"}
  ],
  "meta": {
    "pagination": {"page": 0, "size": 20, "totalElements": 100}
  }
}
```

### Streaming Collection Endpoint

```http
GET /v1/orders/stream HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked

{"id": "order-1", "status": "PROCESSING"}
{"id": "order-2", "status": "COMPLETED"}
{"id": "order-3", "status": "PENDING"}
```

### Single Resource Endpoint

```http
GET /v1/orders/order-123 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{"id": "order-123", "status": "PROCESSING", "total": 99.99}
```

## Asynchronous Operations

For long-running operations, implement the following pattern:

1. **Initial Request**: Client submits operation
2. **Accepted Response**: Server returns 202 Accepted with operation ID
3. **Status Endpoint**: Client can poll operation status
4. **Completion Notification**: Optional webhook or event for completion

```http
POST /orders HTTP/1.1
Content-Type: application/json

{"customerId": "cust-123", "items": [...]}

HTTP/1.1 202 Accepted
Location: /operations/op-456
Content-Type: application/json

{"operationId": "op-456", "status": "PROCESSING"}
```

```http
GET /operations/op-456 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{"operationId": "op-456", "status": "COMPLETED", "result": {"orderId": "order-789"}}
```

## Server-Sent Events (SSE)

### Basic SSE Implementation

Implementing real-time updates with SSE:

```http
GET /orders/order-123/events HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

id: 1
event: order-updated
data: {"orderId": "order-123", "status": "PROCESSING"}

id: 2
event: order-shipped
data: {"orderId": "order-123", "status": "SHIPPED", "trackingNumber": "123456"}

id: 3
event: order-delivered
data: {"orderId": "order-123", "status": "DELIVERED"}
```

### SSE Event Structure

Standardize SSE event format:

```
id: unique-event-id
event: event-type
data: {"key": "value", "timestamp": "2024-07-15T14:32:22Z"}
retry: 3000
```

### SSE Connection Management

1. **Heartbeat Events**: Send periodic keep-alive events
2. **Reconnection Logic**: Handle connection drops with exponential backoff
3. **Event Replay**: Support last-event-id for resuming connections

## WebSocket Integration

### Basic WebSocket Communication

For bi-directional communication:

```
ws://api.example.com/orders/order-123/ws

// Client sends:
{"command": "get-status"}

// Server responds:
{"type": "status", "data": {"orderId": "order-123", "status": "PROCESSING"}}

// Server sends updates:
{"type": "update", "data": {"orderId": "order-123", "status": "SHIPPED"}}
```

### WebSocket Message Structure

Standardize WebSocket message format:

```json
{
  "id": "msg-12345",
  "type": "command|response|event",
  "timestamp": "2024-07-15T14:32:22Z",
  "data": {
    "command": "subscribe",
    "resource": "order-123"
  }
}
```

### WebSocket Connection Lifecycle

1. **Connection Establishment**: Handle authentication and initial setup
2. **Message Exchange**: Implement request-response and event patterns
3. **Connection Maintenance**: Handle ping/pong and keep-alive
4. **Graceful Shutdown**: Clean connection closure

## Flow Control and Backpressure

### Client-Side Flow Control

Document how clients should signal flow control preferences:

```http
// Client signals desired batch size
GET /orders/stream?batchSize=10 HTTP/1.1
Accept: application/x-ndjson

// Server respects client's flow control preference
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
X-Batch-Size: 10
```

### Server-Side Flow Control

Implement these flow control mechanisms:

1. **Buffering Strategy**: Define buffer sizes and overflow handling
2. **Rate Limiting**: Control data production rate
3. **Windowing**: Send data in controlled windows

## Testing HTTP Streaming

### Testing Standard Collection Endpoint

```http
GET /orders?page=0&size=20 HTTP/1.1
Accept: application/json

# Expect: 200 OK with JSON array
# Verify: Proper pagination metadata
# Verify: Correct content-type header
```

### Testing Streaming Collection Endpoint

```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson

# Expect: 200 OK with chunked transfer encoding
# Verify: Each line is valid JSON
# Verify: Stream can be cancelled
# Verify: Proper backpressure handling
```

### Testing SSE Endpoints

```http
GET /orders/order-123/events HTTP/1.1
Accept: text/event-stream

# Expect: 200 OK with text/event-stream
# Verify: Proper SSE format
# Verify: Connection can be resumed
# Verify: Heartbeat events
```

### Testing WebSocket Endpoints

```
ws://api.example.com/orders/order-123/ws

# Test: Connection establishment
# Test: Message exchange patterns
# Test: Connection recovery
# Test: Graceful shutdown
```

## Performance Considerations

### Connection Management

Key performance patterns for streaming APIs:

1. **Connection Pooling**: Implement proper connection pooling and lifecycle management
2. **Buffer Management**: Use appropriate buffer sizes for streaming data
3. **Connection Limits**: Set reasonable limits on concurrent connections
4. **Idle Timeout**: Close idle connections to free resources

### Monitoring and Metrics

Track streaming metrics:

1. **Connection Count**: Monitor active streaming connections
2. **Throughput**: Track data transfer rates
3. **Error Rates**: Monitor connection failures and errors
4. **Latency**: Measure response and streaming latency

## Examples

### Streaming API Example

```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked

{"id":"order-1","status":"PROCESSING"}
{"id":"order-2","status":"COMPLETED"}
{"id":"order-3","status":"PENDING"}
```

### Real-time Event Stream Example

```http
GET /events/order-updates HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 1
event: order-created
data: {"orderId": "order-123", "status": "CREATED"}

id: 2
event: order-updated
data: {"orderId": "order-123", "status": "PROCESSING"}
```

## Related Documentation

- [Reactive Error Handling](./reactive-error-handling.md): Error handling patterns for streaming APIs
- [Event-Driven Architecture](./event-driven-architecture.md): Event patterns and routing strategies

## Implementation Notes

When implementing these streaming patterns:

- **HTTP standards**: Follow HTTP/1.1 and HTTP/2 specifications for streaming
- **Protocol Selection**: Choose appropriate protocol (HTTP streaming, SSE, WebSocket) based on use case
- **Security**: Implement proper authentication and authorization for streaming endpoints

These patterns provide a foundation for building streaming APIs that are responsive and can handle real-time data flow efficiently across different technology stacks.