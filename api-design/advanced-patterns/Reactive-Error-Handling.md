# Reactive Error Handling

> **Reading Guide**
> 
> **Reading Time:** 8 minutes | **Level:** Advanced
> 
> **Prerequisites:** Understanding of reactive programming concepts  
> **Key Topics:** Backpressure, error propagation, resilience patterns
> 
> **Complexity:** Advanced content for reactive API error management

## Overview

This document outlines error handling patterns for reactive APIs, focusing on backpressure management, error propagation strategies, and recovery mechanisms. These patterns ensure robust and resilient streaming APIs that can handle failures gracefully.

## Core Reactive Principles

### Reactive Error Handling Principles

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

### Backpressure Strategies

#### Drop Strategy
```http
# Server drops oldest items when buffer is full
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson
X-Backpressure-Strategy: drop-oldest

HTTP/1.1 200 OK
Content-Type: application/x-ndjson
X-Buffer-Size: 1000
X-Overflow-Strategy: drop-oldest
```

#### Error Strategy
```http
# Server returns error when buffer overflows
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson
X-Backpressure-Strategy: error-on-overflow

HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 5

{
  "type": "https://example.com/problems/backpressure-error",
  "title": "Backpressure Buffer Overflow",
  "status": 429,
  "detail": "Consumer cannot keep up with producer rate"
}
```

## Error Propagation

### Error Categories

Properly handle different types of errors in streaming APIs:

1. **Critical Failures**: Terminate stream with appropriate HTTP status and Problem Details
2. **Non-fatal Errors**: Include error elements in stream for recoverable failures
3. **Retry Strategies**: Implement exponential backoff and retry limits

### Error Response Formats

#### Stream Termination Error

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

#### In-stream Error Element

```json
{"error": {"code": "ITEM_ERROR", "message": "Error processing item", "retryable": true}}
```

#### Validation Error

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

#### Service Unavailable with Retry

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

## Recovery Strategies

### Recovery Mechanisms

Implement these recovery mechanisms:

1. **Fallback Values**: Substitute alternative values on error
2. **Default Responses**: Return default value on error
3. **Retry Logic**: Attempt operation again with exponential backoff
4. **Circuit Breaker**: Prevent cascading failures

### Fallback Implementation

```http
# Primary service unavailable, fallback to cached data
GET /orders/order-123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
X-Data-Source: fallback-cache
X-Data-Staleness: 300

{
  "id": "order-123",
  "status": "PROCESSING",
  "total": 99.99,
  "lastUpdated": "2024-07-15T14:00:00Z"
}
```

### Retry Logic

```http
# Exponential backoff with jitter
GET /orders HTTP/1.1

HTTP/1.1 429 Too Many Requests
Retry-After: 2
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Request rate limit exceeded",
  "retryable": true,
  "retryAfter": 2
}
```

### Circuit Breaker Pattern

```http
# Circuit breaker open - fast failure
GET /orders HTTP/1.1

HTTP/1.1 503 Service Unavailable
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/circuit-breaker",
  "title": "Circuit Breaker Open",
  "status": 503,
  "detail": "Circuit breaker is open due to repeated failures",
  "retryable": true,
  "circuitState": "OPEN"
}
```

## Error Handling in Streaming

### Stream Error Patterns

#### Partial Stream Failure

```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"id": "order-1", "status": "PROCESSING"}
{"id": "order-2", "status": "COMPLETED"}
{"error": {"code": "PROCESSING_ERROR", "message": "Failed to process order-3", "retryable": true}}
{"id": "order-4", "status": "PENDING"}
```

#### Complete Stream Failure

```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"id": "order-1", "status": "PROCESSING"}
{"id": "order-2", "status": "COMPLETED"}

# Stream terminated due to critical error
HTTP/1.1 500 Internal Server Error
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/stream-terminated",
  "title": "Stream Terminated",
  "status": 500,
  "detail": "Stream terminated due to database connection failure"
}
```

### Error Recovery in Streams

#### Stream Restart

```http
# Client can restart stream from last known position
GET /orders/stream?from=order-2 HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"id": "order-3", "status": "PENDING"}
{"id": "order-4", "status": "PROCESSING"}
```

#### Stream Checkpoint

```http
# Server provides checkpoint information
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson
X-Stream-Checkpoint: order-100

{"id": "order-1", "status": "PROCESSING"}
{"checkpoint": {"position": "order-50", "timestamp": "2024-07-15T14:30:00Z"}}
{"id": "order-2", "status": "COMPLETED"}
```

## Testing Error Scenarios

### Error Scenario Testing

Test error handling in streams:

```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson

# Simulate: Database connection failure
# Expect: 500 Internal Server Error
# Verify: Problem Details format
# Verify: Proper error logging
```

### Backpressure Testing

```http
# Test slow consumer scenario
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson
X-Consumer-Rate: slow

# Expect: Proper backpressure handling
# Verify: No memory leaks
# Verify: Graceful degradation
```

### Recovery Testing

```http
# Test fallback mechanisms
GET /orders/order-123 HTTP/1.1

# Simulate: Primary service down
# Expect: Fallback response
# Verify: Proper fallback headers
# Verify: Data consistency
```

## Monitoring and Observability

### Error Metrics

Track error-related metrics:

1. **Error Rates**: Monitor error frequency by type
2. **Recovery Success**: Track successful recovery attempts
3. **Backpressure Events**: Monitor backpressure occurrences
4. **Circuit Breaker State**: Track circuit breaker state changes

### Logging Patterns

```json
{
  "timestamp": "2024-07-15T14:32:22Z",
  "level": "ERROR",
  "service": "order-service",
  "traceId": "trace-123",
  "spanId": "span-456",
  "event": "stream-error",
  "details": {
    "streamId": "stream-789",
    "errorType": "PROCESSING_ERROR",
    "retryable": true,
    "position": "order-50"
  }
}
```

## Related Documentation

- [HTTP Streaming Patterns](./HTTP-Streaming-Patterns.md): HTTP streaming implementation patterns
- [Event-Driven Architecture](./Event-Driven-Architecture.md): Event patterns and routing strategies

## Implementation Notes

When implementing reactive error handling:

- **Error boundaries**: Implement proper error boundaries to prevent cascading failures
- **Monitoring**: Implement comprehensive monitoring for error scenarios
- **Testing**: Test error scenarios thoroughly, including edge cases

These patterns provide a foundation for building resilient streaming APIs that can handle errors gracefully and maintain system stability across different technology stacks.