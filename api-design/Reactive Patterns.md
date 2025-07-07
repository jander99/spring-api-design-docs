# Reactive Patterns

## Overview

This document outlines reactive programming patterns that should be applied across our API ecosystem, with emphasis on event-driven architecture, backpressure handling, and non-blocking interactions. These patterns focus on HTTP streaming protocols and reactive principles that can be implemented in any technology stack.

## Reactive Principles

### Core Reactive Principles

1. **Non-blocking I/O**: Operations should never block threads
2. **Backpressure**: Consumers control the rate of data consumption
3. **Message-driven**: Components communicate through asynchronous message passing
4. **Elasticity**: System adapts to varying workloads
5. **Resilience**: Failures are contained and managed gracefully

### When to Use Reactive Patterns

| Scenario | Reactive Suitability |
|----------|----------------------|
| High-concurrency APIs | Excellent |
| I/O-bound operations | Excellent |
| Long-running connections | Excellent |
| CPU-intensive operations | Limited benefit |
| Simple CRUD operations | May be overengineering |

## API Design for Reactive Systems

### Response Pattern Standards

| Operation Type | Response Pattern | Usage |
|----------------|------------------|-------|
| Single resource fetch | Single JSON object | Getting a specific item |
| Collection fetch (complete) | JSON array | Getting a finite collection |
| Collection fetch (streaming) | NDJSON or SSE stream | Streaming potentially large collections |
| Resource creation | Single JSON object | Creating and returning a resource |
| Resource update | Single JSON object | Updating and returning a resource |
| Resource deletion | Empty response (204 No Content) | Deleting a resource without return value |

### Collection Handling

For collection endpoints, provide both standard and streaming options:

```
GET /orders         → Returns JSON array (complete collection)
GET /orders/stream  → Returns NDJSON stream (streaming collection)
```

### HTTP Streaming Patterns

Implement streaming endpoints using standard HTTP protocols:

**Standard Collection Endpoint**:
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

**Streaming Collection Endpoint**:
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

**Single Resource Endpoint**:
```http
GET /v1/order/order-123 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{"id": "order-123", "status": "PROCESSING", "total": 99.99}
```

### Asynchronous Operations

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

## Backpressure Handling

### Server-Side Backpressure

Implement these backpressure mechanisms on the server:

1. **Buffer with Overflow Strategy**: Define how to handle buffer overflow
   - Drop newest elements
   - Drop oldest elements
   - Error on overflow

2. **Window or Batch Processing**: Group elements to optimize processing

3. **Dynamic Rate Adjustment**: Adjust production rate based on consumption

### Client-Side Backpressure

Document how clients should signal backpressure:

1. **Request-based backpressure**: Client controls number of requested items
2. **HTTP Flow Control**: For HTTP streaming scenarios
3. **Custom Protocol**: For WebSocket or other protocols

## Error Handling in Reactive Streams

### Error Propagation

Properly handle errors in streaming APIs:

1. **Critical Failures**: Terminate stream with appropriate HTTP status and Problem Details
2. **Non-fatal Errors**: Include error elements in stream for recoverable failures
3. **Retry Strategies**: Implement exponential backoff and retry limits

### Error Response Format

Standardize error responses in streaming APIs:

**Stream Termination Error**:
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/stream-error",
  "title": "Stream Processing Error",
  "status": 500,
  "detail": "Unable to continue processing stream",
  "instance": "/orders/stream"
}
```

**In-stream Error Element**:
```json
{"error": {"code": "ITEM_ERROR", "message": "Error processing item", "retryable": true}}
```

### Recovery Strategies

Implement these recovery mechanisms:

1. **Fallback Values**: Substitute alternative values on error
2. **Default Responses**: Return default value on error
3. **Retry Logic**: Attempt operation again with exponential backoff

### HTTP Error Handling Patterns

Modern error handling with proper HTTP status codes:

**Validation Error**:
```http
POST /orders HTTP/1.1
Content-Type: application/json

{"customerId": "", "items": []}

HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request validation failed",
  "errors": [
    {"field": "customerId", "message": "Customer ID is required"},
    {"field": "items", "message": "At least one item is required"}
  ]
}
```

**Service Unavailable with Retry**:
```http
GET /orders HTTP/1.1

HTTP/1.1 503 Service Unavailable
Retry-After: 30
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/service-unavailable",
  "title": "Service Temporarily Unavailable",
  "status": 503,
  "detail": "Order service temporarily unavailable",
  "retryable": true
}
```

## Event-Driven Patterns

### Event Types

Define standard event categories:

1. **Domain Events**: Represent business-significant occurrences
2. **Integration Events**: Support integration between services
3. **Command Events**: Represent instructions to perform actions

### Event Structure

Standardize event data format:

```json
{
  "id": "evt-12345",
  "type": "order.created",
  "timestamp": "2024-07-15T14:32:22Z",
  "source": "order-service",
  "data": {
    "orderId": "order-6789",
    "customerId": "cust-1234",
    "total": 99.95
  },
  "metadata": {
    "correlationId": "corr-12345",
    "causationId": "evt-12344"
  }
}
```

### Event Routing Patterns

Implement these event routing patterns:

1. **Publish-Subscribe**: Events distributed to all interested subscribers
2. **Work Queue**: Tasks distributed to available workers
3. **Routing Keys**: Events routed based on specific attributes

## Caching in Reactive Systems

### Reactive Caching Patterns

1. **Cache Then Fetch**: Return cached data immediately, then update
2. **Fetch on Cache Miss**: Check cache first, fetch only if needed
3. **Background Refresh**: Update cache in background before expiration

### Cache Invalidation

1. **Time-Based**: Expire cache entries after defined period
2. **Event-Based**: Invalidate entries based on domain events
3. **Manual**: Explicit cache clearing through API

## Testing Reactive APIs

### Test Categories

1. **Unit Tests**: Test individual reactive components
2. **Integration Tests**: Test reactive chains and compositions
3. **Load Tests**: Verify backpressure handling
4. **Contract Tests**: Ensure consumer expectations are met

### Testing Tools and Patterns

1. **HTTP Testing**: Test streaming endpoints with proper content types
2. **Backpressure Testing**: Verify handling of slow consumers
3. **Error Scenario Testing**: Test error handling in streams

### HTTP Streaming Testing Examples

Test streaming endpoints with proper HTTP semantics:

**Testing Standard Collection Endpoint**:
```http
GET /orders?page=0&size=20 HTTP/1.1
Accept: application/json

# Expect: 200 OK with JSON array
# Verify: Proper pagination metadata
# Verify: Correct content-type header
```

**Testing Streaming Collection Endpoint**:
```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson

# Expect: 200 OK with chunked transfer encoding
# Verify: Each line is valid JSON
# Verify: Stream can be cancelled
# Verify: Proper backpressure handling
```

**Testing Error Scenarios**:
```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson

# Simulate: Database connection failure
# Expect: 500 Internal Server Error
# Verify: Problem Details format
# Verify: Proper error logging
```

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

### Event-Driven Processing Example

```http
// Event notification via webhook
POST /webhooks/order-events HTTP/1.1
Content-Type: application/json

{
  "event": "order.created",
  "data": {
    "orderId": "order-123",
    "customerId": "cust-456",
    "status": "CREATED"
  }
}
```

### Flow Control Example

```http
// Client signals desired batch size
GET /orders/stream?batchSize=10 HTTP/1.1
Accept: application/x-ndjson

// Server respects client's flow control preference
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
X-Batch-Size: 10
```

## Modern Streaming Patterns

### Server-Sent Events (SSE)

Implementing real-time updates with SSE:

```http
GET /order/order-123/events HTTP/1.1
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

### WebSocket Integration

For bi-directional communication:

```
ws://api.example.com/order/order-123/ws

// Client sends:
{"command": "get-status"}

// Server responds:
{"type": "status", "data": {"orderId": "order-123", "status": "PROCESSING"}}

// Server sends updates:
{"type": "update", "data": {"orderId": "order-123", "status": "SHIPPED"}}
```

### Performance Considerations

Key performance patterns for streaming APIs:

1. **Connection Management**: Implement proper connection pooling and lifecycle management
2. **Buffer Management**: Use appropriate buffer sizes for streaming data
3. **Backpressure Handling**: Implement flow control mechanisms
4. **Monitoring**: Track streaming metrics (connection count, throughput, errors)

## Implementation Notes

When implementing these reactive patterns:

- **Framework-specific examples**: For Spring WebFlux implementations, see the spring-design standards documentation
- **Reactive libraries**: Use appropriate reactive programming libraries for your platform (RxJS, Reactor, Akka Streams, etc.)
- **HTTP standards**: Follow HTTP/1.1 and HTTP/2 specifications for streaming
- **Error handling**: Implement proper error recovery and circuit breaker patterns

These patterns provide a foundation for building streaming APIs that are resilient, responsive, and can handle varying loads efficiently across different technology stacks.