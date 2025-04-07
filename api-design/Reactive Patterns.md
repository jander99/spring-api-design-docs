# Reactive Patterns

## Overview

This document outlines reactive programming patterns that should be applied across our microservices ecosystem, with emphasis on event-driven architecture, backpressure handling, and non-blocking interactions. These patterns apply to both backend services (Spring WebFlux) and frontend applications (Angular/RxJS).

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

### Return Type Standards

| Operation Type | Return Type | Usage |
|----------------|-------------|-------|
| Single resource fetch | `Mono<Resource>` | Getting a specific item |
| Collection fetch (complete) | `Mono<List<Resource>>` | Getting a finite collection |
| Collection fetch (streaming) | `Flux<Resource>` | Streaming potentially large collections |
| Resource creation | `Mono<Resource>` | Creating and returning a resource |
| Resource update | `Mono<Resource>` | Updating and returning a resource |
| Resource deletion | `Mono<Void>` | Deleting a resource without return value |

### Collection Handling

For collection endpoints, provide both standard and streaming options:

```
GET /orders         → Returns Mono<List<Order>> (complete collection)
GET /orders/stream  → Returns Flux<Order> (streaming collection)
```

### Asynchronous Operations

For long-running operations, implement the following pattern:

1. **Initial Request**: Client submits operation
2. **Accepted Response**: Server returns 202 Accepted with operation ID
3. **Status Endpoint**: Client can poll operation status
4. **Completion Notification**: Optional webhook or event for completion

```
POST /orders                          → Submit new order
GET /operations/{operationId}         → Check operation status
GET /operations/{operationId}/result  → Get operation result when complete
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

Properly handle errors in reactive streams:

1. **Error Signals**: Use onError signals for critical failures
2. **Error Elements**: Include error elements in stream for non-fatal errors
3. **Retry Strategies**: Implement exponential backoff and retry limits

### Error Response Format

Standardize error responses in reactive streams:

```json
{
  "error": {
    "code": "STREAM_ERROR",
    "message": "Error processing element",
    "index": 42,
    "retryable": true
  }
}
```

### Recovery Strategies

Implement these recovery mechanisms:

1. **onErrorResume**: Substitute alternative values on error
2. **onErrorReturn**: Return default value on error
3. **retry/retryWhen**: Attempt operation again with backoff

```java
// Example pattern (pseudo-code)
return reactiveOperation()
    .retry(3)
    .onErrorResume(e -> fallbackOperation())
    .onErrorReturn(defaultValue);
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
  "timestamp": "2023-04-15T14:32:22Z",
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

1. **StepVerifier**: Verify reactive sequences step by step
2. **TestPublisher**: Control emissions for testing purposes
3. **VirtualTimeScheduler**: Test time-based operations without delays

```java
// Example test pattern (pseudo-code)
StepVerifier.create(reactiveService.getData())
    .expectNext(expectedData)
    .verifyComplete();
```

## Examples

### Streaming API Example

```
GET /orders/stream

Response: application/stream+json

{"id":"order-1","status":"PROCESSING"}
{"id":"order-2","status":"COMPLETED"}
...
```

### Event-Driven Processing Example

```
// Reactive processing chain (pseudo-code)
orderEvents
    .filter(event -> event.type == "order.created")
    .flatMap(event -> processOrder(event.data))
    .flatMap(order -> notifyCustomer(order))
    .subscribe();
```

### Backpressure Example

```
// Client requesting 10 items at a time (pseudo-code)
orderStream
    .request(10)
    .doOnNext(order -> processOrder(order))
    .doOnComplete(() -> requestMore());
```

These patterns provide a foundation for building reactive microservices that are resilient, responsive, and can handle varying loads efficiently.