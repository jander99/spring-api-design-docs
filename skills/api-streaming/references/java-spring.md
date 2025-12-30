# Java/Spring WebFlux Streaming Implementation

## Reactive Types Overview

| Type | Description | Use Case |
|------|-------------|----------|
| `Mono<T>` | 0-1 elements | Single resource operations |
| `Flux<T>` | 0-N elements | Collections, streams |
| `ServerSentEvent<T>` | SSE wrapper | Real-time event streams |

## SSE Controller

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderStreamController {

    private final OrderService orderService;
    
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<OrderEvent>> streamOrderEvents() {
        return orderService.streamOrderEvents()
            .map(event -> ServerSentEvent.<OrderEvent>builder()
                .id(event.getId().toString())
                .event(event.getType())
                .data(event)
                .build());
    }
    
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<OrderEvent>> streamWithHeartbeat() {
        Flux<ServerSentEvent<OrderEvent>> events = orderService.streamOrderEvents()
            .map(event -> ServerSentEvent.<OrderEvent>builder()
                .id(event.getId().toString())
                .event(event.getType())
                .data(event)
                .build());
        
        Flux<ServerSentEvent<OrderEvent>> heartbeat = Flux.interval(Duration.ofSeconds(15))
            .map(tick -> ServerSentEvent.<OrderEvent>builder()
                .event("heartbeat")
                .build());
        
        return Flux.merge(events, heartbeat);
    }
}
```

## NDJSON Controller

```java
@GetMapping(value = "/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<OrderResponse> streamOrders(
        @RequestParam(required = false) String status) {
    return orderService.streamOrders(status)
        .map(orderMapper::toResponse);
}

@GetMapping(value = "/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<StreamRecord> streamWithMetadata() {
    Flux<StreamRecord> metadata = Flux.just(
        StreamRecord.metadata(orderService.countOrders())
    );
    
    Flux<StreamRecord> data = orderService.streamOrders()
        .map(StreamRecord::data);
    
    Flux<StreamRecord> end = Flux.just(
        StreamRecord.streamEnd("completed")
    );
    
    return Flux.concat(metadata, data, end);
}
```

## Backpressure Handling

```java
@GetMapping(value = "/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<OrderResponse> streamWithBackpressure() {
    return orderService.streamOrders()
        .map(orderMapper::toResponse)
        .onBackpressureBuffer(1000)  // Buffer up to 1000 items
        .doOnError(error -> log.error("Stream error", error));
}

@GetMapping(value = "/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<OrderResponse> streamWithBackpressureDrop() {
    return orderService.streamOrders()
        .map(orderMapper::toResponse)
        .onBackpressureDrop(dropped -> 
            log.warn("Dropped record due to backpressure: {}", dropped.getId()));
}

@GetMapping(value = "/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<OrderResponse> streamWithBackpressureLatest() {
    return orderService.streamOrders()
        .map(orderMapper::toResponse)
        .onBackpressureLatest();  // Keep only latest when overwhelmed
}
```

## Error Handling in Streams

```java
@GetMapping(value = "/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<StreamRecord> streamWithErrorHandling() {
    return orderService.streamOrders()
        .map(StreamRecord::data)
        .onErrorResume(ex -> Flux.just(
            StreamRecord.error("STREAM_ERROR", ex.getMessage()),
            StreamRecord.streamEnd("error")
        ));
}

@GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<Object>> streamEventsWithErrors() {
    return orderService.streamOrderEvents()
        .map(event -> ServerSentEvent.builder()
            .id(event.getId().toString())
            .event(event.getType())
            .data(event)
            .build())
        .onErrorResume(ex -> Flux.just(
            ServerSentEvent.builder()
                .event("error")
                .data(Map.of("type", "stream-error", "message", ex.getMessage()))
                .build(),
            ServerSentEvent.builder()
                .event("stream-end")
                .data(Map.of("reason", "error"))
                .build()
        ));
}
```

## Timeout and Cancellation

```java
@GetMapping(value = "/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<OrderResponse> streamWithTimeout() {
    return orderService.streamOrders()
        .map(orderMapper::toResponse)
        .timeout(Duration.ofMinutes(5))
        .onErrorResume(TimeoutException.class, ex -> 
            Flux.just(StreamRecord.streamEnd("timeout")));
}

@GetMapping(value = "/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<OrderResponse> streamWithCancellation() {
    return orderService.streamOrders()
        .map(orderMapper::toResponse)
        .doOnCancel(() -> log.info("Client cancelled stream"))
        .doFinally(signal -> log.info("Stream ended: {}", signal));
}
```

## Reconnection Support (SSE)

```java
@GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<OrderEvent>> streamWithReconnection(
        @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId) {
    
    Long startFrom = lastEventId != null ? Long.parseLong(lastEventId) + 1 : 0L;
    
    return orderService.streamOrderEventsFrom(startFrom)
        .map(event -> ServerSentEvent.<OrderEvent>builder()
            .id(event.getId().toString())
            .event(event.getType())
            .data(event)
            .retry(Duration.ofSeconds(5))  // Client retry interval
            .build());
}
```

## Service Layer Pattern

```java
public interface ReactiveOrderService {
    Flux<Order> streamOrders(String status);
    Flux<OrderEvent> streamOrderEvents();
    Flux<OrderEvent> streamOrderEventsFrom(Long eventId);
    Mono<Long> countOrders();
}

@Service
@RequiredArgsConstructor
public class ReactiveOrderServiceImpl implements ReactiveOrderService {

    private final ReactiveOrderRepository orderRepository;
    private final Sinks.Many<OrderEvent> eventSink;
    
    @Override
    public Flux<Order> streamOrders(String status) {
        if (status != null) {
            return orderRepository.findByStatus(status);
        }
        return orderRepository.findAll();
    }
    
    @Override
    public Flux<OrderEvent> streamOrderEvents() {
        return eventSink.asFlux()
            .share();  // Allow multiple subscribers
    }
    
    @Override
    public Flux<OrderEvent> streamOrderEventsFrom(Long eventId) {
        return Flux.concat(
            orderRepository.findEventsAfter(eventId),  // Replay missed events
            streamOrderEvents()                         // Then live events
        );
    }
}
```

## Stream Record DTO

```java
@Data
@Builder
public class StreamRecord {
    private String type;  // metadata, data, error, stream-end
    private Object payload;
    
    public static StreamRecord metadata(long totalRecords) {
        return StreamRecord.builder()
            .type("metadata")
            .payload(Map.of("totalRecords", totalRecords))
            .build();
    }
    
    public static StreamRecord data(Object data) {
        return StreamRecord.builder()
            .type("data")
            .payload(data)
            .build();
    }
    
    public static StreamRecord error(String code, String message) {
        return StreamRecord.builder()
            .type("error")
            .payload(Map.of("code", code, "message", message))
            .build();
    }
    
    public static StreamRecord streamEnd(String reason) {
        return StreamRecord.builder()
            .type("stream-end")
            .payload(Map.of("reason", reason))
            .build();
    }
}
```

## Reactive Repository

```java
public interface ReactiveOrderRepository 
        extends ReactiveCrudRepository<Order, UUID> {
    
    Flux<Order> findByStatus(String status);
    
    @Query("SELECT * FROM orders WHERE created_at > :since")
    Flux<Order> findOrdersSince(@Param("since") Instant since);
    
    @Query("SELECT * FROM order_events WHERE id > :eventId ORDER BY id")
    Flux<OrderEvent> findEventsAfter(@Param("eventId") Long eventId);
}
```

## WebClient for Consuming Streams

```java
// Consume NDJSON stream
public Flux<OrderResponse> consumeNdjsonStream() {
    return webClient.get()
        .uri("/orders/stream")
        .accept(MediaType.APPLICATION_NDJSON)
        .retrieve()
        .bodyToFlux(OrderResponse.class);
}

// Consume SSE stream
public Flux<ServerSentEvent<OrderEvent>> consumeSseStream() {
    return webClient.get()
        .uri("/orders/events")
        .accept(MediaType.TEXT_EVENT_STREAM)
        .retrieve()
        .bodyToFlux(new ParameterizedTypeReference<ServerSentEvent<OrderEvent>>() {});
}
```

## Configuration

```yaml
# application.yml
spring:
  webflux:
    multipart:
      max-in-memory-size: 256KB

server:
  netty:
    connection-timeout: 30000
    idle-timeout: 60000

# Backpressure defaults
streaming:
  buffer-size: 1000
  timeout-minutes: 5
  heartbeat-interval-seconds: 15
```

## Testing Streaming Endpoints

```java
@WebFluxTest(OrderStreamController.class)
class OrderStreamControllerTest {

    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void streamOrders_returnsNdjson() {
        when(orderService.streamOrders(any()))
            .thenReturn(Flux.just(order1, order2));
        
        webTestClient.get()
            .uri("/v1/orders/stream")
            .accept(MediaType.APPLICATION_NDJSON)
            .exchange()
            .expectStatus().isOk()
            .expectHeader().contentType(MediaType.APPLICATION_NDJSON)
            .expectBodyList(OrderResponse.class)
            .hasSize(2);
    }
    
    @Test
    void streamEvents_returnsSse() {
        when(orderService.streamOrderEvents())
            .thenReturn(Flux.just(event1, event2));
        
        webTestClient.get()
            .uri("/v1/orders/events")
            .accept(MediaType.TEXT_EVENT_STREAM)
            .exchange()
            .expectStatus().isOk()
            .expectHeader().contentType(MediaType.TEXT_EVENT_STREAM);
    }
}
```

## Key Reactive Operators for Streaming

| Operator | Purpose |
|----------|---------|
| `map()` | Synchronous transformation |
| `flatMap()` | Async transformation (parallel) |
| `concatMap()` | Async transformation (sequential) |
| `merge()` | Combine multiple streams |
| `concat()` | Sequential stream combination |
| `onBackpressureBuffer()` | Buffer when overwhelmed |
| `onBackpressureDrop()` | Drop when overwhelmed |
| `timeout()` | Set stream timeout |
| `doOnCancel()` | Handle cancellation |
| `share()` | Allow multiple subscribers |
