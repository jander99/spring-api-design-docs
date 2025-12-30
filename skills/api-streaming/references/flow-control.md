# Flow Control and Backpressure Patterns

## What is Backpressure?

Backpressure occurs when a consumer can't process data as fast as a producer sends it. Without proper handling, this causes memory exhaustion or data loss.

## Flow Control Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| Buffer | Queue items up to limit | Temporary bursts |
| Drop | Discard items | Non-critical data |
| Latest | Keep only newest | Real-time displays |
| Error | Fail the stream | Critical data |
| Throttle | Slow the producer | Controlled rate |

## Client-Side Flow Control

### Request Headers

```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson
X-Stream-Buffer-Size: 100
X-Stream-Rate-Limit: 10/second
X-Stream-Batch-Size: 50
```

| Header | Description |
|--------|-------------|
| `X-Stream-Buffer-Size` | Max items client can buffer |
| `X-Stream-Rate-Limit` | Max items per time unit |
| `X-Stream-Batch-Size` | Preferred batch size |

### Query Parameters

```http
GET /orders/stream?batchSize=50&rateLimit=10 HTTP/1.1
```

## Server-Side Flow Control

### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
X-Stream-Rate: 10/second
X-Stream-Buffer-Size: 100
X-Stream-Total-Items: 10000
```

## Backpressure Patterns

### Buffer Strategy

Queue items up to a limit, then apply pressure.

```java
// Spring WebFlux
return orderService.streamOrders()
    .onBackpressureBuffer(1000)  // Buffer up to 1000 items
    .doOnNext(order -> log.debug("Processing order: {}", order.getId()));
```

When buffer fills:
1. Producer slows down
2. If producer can't slow, buffer overflows
3. Overflow triggers error or drop

### Drop Strategy

Drop oldest items when overwhelmed.

```java
return orderService.streamOrders()
    .onBackpressureDrop(dropped -> 
        log.warn("Dropped due to backpressure: {}", dropped.getId()));
```

Use for:
- Real-time metrics
- Non-critical updates
- High-frequency data

### Latest Strategy

Keep only the most recent item.

```java
return orderService.streamOrders()
    .onBackpressureLatest();
```

Use for:
- Live dashboards
- Status updates
- Position tracking

### Error Strategy

Fail immediately when backpressure occurs.

```java
return orderService.streamOrders()
    .onBackpressureError();
```

Use for:
- Critical data streams
- Financial transactions
- Audit logs

## Rate Limiting

### Server-Side Rate Limiting

```java
return orderService.streamOrders()
    .delayElements(Duration.ofMillis(100))  // Max 10/second
    .map(orderMapper::toResponse);
```

### Batch Rate Limiting

```java
return orderService.streamOrders()
    .buffer(50)  // Batch of 50
    .delayElements(Duration.ofSeconds(1))  // One batch per second
    .flatMapIterable(Function.identity());
```

### Dynamic Rate Limiting

```java
@GetMapping("/stream")
public Flux<Order> stream(
        @RequestHeader(value = "X-Stream-Rate-Limit", defaultValue = "100") int rateLimit) {
    
    Duration delay = Duration.ofMillis(1000 / rateLimit);
    
    return orderService.streamOrders()
        .delayElements(delay);
}
```

## Buffer Management

### Bounded Buffer

```java
return orderService.streamOrders()
    .onBackpressureBuffer(
        1000,  // Max size
        BufferOverflowStrategy.DROP_OLDEST
    );
```

Overflow strategies:
- `DROP_OLDEST`: Drop oldest items
- `DROP_LATEST`: Drop newest items
- `ERROR`: Fail with error

### Time-Based Buffer

```java
return orderService.streamOrders()
    .bufferTimeout(100, Duration.ofSeconds(1))  // 100 items or 1 second
    .flatMapIterable(Function.identity());
```

## Connection Limits

### Per-Client Limits

```java
private final Map<String, AtomicInteger> connectionCounts = new ConcurrentHashMap<>();
private static final int MAX_CONNECTIONS = 5;

@GetMapping("/stream")
public Flux<Order> stream(@RequestHeader("X-Client-Id") String clientId) {
    AtomicInteger count = connectionCounts.computeIfAbsent(clientId, k -> new AtomicInteger(0));
    
    if (count.incrementAndGet() > MAX_CONNECTIONS) {
        count.decrementAndGet();
        return Flux.error(new TooManyConnectionsException());
    }
    
    return orderService.streamOrders()
        .doFinally(signal -> count.decrementAndGet());
}
```

### 429 Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 5

{
  "type": "https://example.com/problems/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Maximum 5 concurrent streams allowed",
  "retryAfter": 5
}
```

## Timeout Handling

### Stream Timeout

```java
return orderService.streamOrders()
    .timeout(Duration.ofMinutes(5))
    .onErrorResume(TimeoutException.class, ex ->
        Flux.just(StreamRecord.streamEnd("timeout")));
```

### Idle Timeout

```java
return orderService.streamOrders()
    .timeout(Duration.ofSeconds(30), Mono.empty())  // 30s idle timeout
    .concatWith(Flux.just(StreamRecord.streamEnd("idle-timeout")));
```

## Monitoring Metrics

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `stream.active.count` | Active streams | > 1000 |
| `stream.buffer.size` | Current buffer usage | > 80% |
| `stream.dropped.count` | Dropped items | > 0 |
| `stream.error.rate` | Error percentage | > 1% |
| `stream.throughput` | Records/second | < expected |
| `stream.duration` | Stream duration | > 10 minutes |

### Health Check Endpoint

```http
GET /health/streaming HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "activeStreams": 45,
  "averageThroughput": "150/second",
  "bufferUtilization": "23%",
  "droppedLastMinute": 0,
  "errorRate": "0.1%"
}
```

### Metrics Implementation

```java
@Component
@RequiredArgsConstructor
public class StreamingMetrics {
    
    private final MeterRegistry meterRegistry;
    
    public void recordStreamStart() {
        meterRegistry.counter("stream.started").increment();
        meterRegistry.gauge("stream.active", activeStreams, AtomicInteger::get);
    }
    
    public void recordItemProcessed() {
        meterRegistry.counter("stream.items.processed").increment();
    }
    
    public void recordItemDropped() {
        meterRegistry.counter("stream.items.dropped").increment();
    }
    
    public void recordStreamEnd(String reason, Duration duration) {
        meterRegistry.counter("stream.ended", "reason", reason).increment();
        meterRegistry.timer("stream.duration").record(duration);
    }
}
```

## Best Practices

1. **Always set buffer limits**: Never use unbounded buffers
2. **Choose appropriate strategy**: Match strategy to data criticality
3. **Monitor buffer utilization**: Alert before overflow
4. **Implement connection limits**: Prevent resource exhaustion
5. **Use timeouts**: Don't let streams run indefinitely
6. **Log dropped items**: Track data loss for debugging
7. **Expose health metrics**: Enable operational visibility
8. **Test under load**: Verify backpressure handling works
9. **Document limits**: Tell clients about rate limits
10. **Graceful degradation**: Prefer dropping to crashing
