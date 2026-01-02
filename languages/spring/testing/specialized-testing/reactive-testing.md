# Reactive Testing

## Overview

Reactive testing focuses on testing reactive streams and asynchronous operations using Project Reactor. This requires specialized testing approaches to handle backpressure, timing, cancellation, and error propagation in reactive pipelines.

## Core Principles

1. **Use StepVerifier**: Primary tool for testing reactive streams
2. **Test asynchronous behavior**: Verify timing and sequencing of emissions
3. **Handle backpressure**: Test demand and subscription behavior
4. **Test error scenarios**: Verify error propagation and recovery
5. **Use virtual time**: Control time for testing delays and timeouts

## StepVerifier Fundamentals

StepVerifier is the primary tool for testing reactive streams in Spring Boot applications.

### Basic Stream Testing

```java
@ExtendWith(MockitoExtension.class)
class ReactiveOrderServiceTest {

    @Mock
    private ReactiveOrderRepository orderRepository;

    @Mock
    private ReactivePaymentService paymentService;

    @InjectMocks
    private ReactiveOrderService orderService;

    @Test
    void shouldCreateOrderReactively() {
        // Given
        Order order = createTestOrder();
        Order savedOrder = createTestOrder();
        savedOrder.setId(UUID.randomUUID());
        PaymentResult paymentResult = PaymentResult.success("txn-123");

        when(orderRepository.save(order)).thenReturn(Mono.just(savedOrder));
        when(paymentService.processPayment(savedOrder)).thenReturn(Mono.just(paymentResult));

        // When & Then
        StepVerifier.create(orderService.createOrder(order))
            .assertNext(result -> {
                assertThat(result.getId()).isEqualTo(savedOrder.getId());
                assertThat(result.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
            })
            .verifyComplete();

        verify(orderRepository).save(order);
        verify(paymentService).processPayment(savedOrder);
    }

    @Test
    void shouldHandlePaymentFailure() {
        // Given
        Order order = createTestOrder();
        Order savedOrder = createTestOrder();
        savedOrder.setId(UUID.randomUUID());

        when(orderRepository.save(order)).thenReturn(Mono.just(savedOrder));
        when(paymentService.processPayment(savedOrder))
            .thenReturn(Mono.error(new PaymentException("Payment failed")));

        // When & Then
        StepVerifier.create(orderService.createOrder(order))
            .expectError(PaymentException.class)
            .verify();
    }
}
```

### Testing Multiple Emissions

```java
@Test
void shouldStreamAllOrders() {
    // Given
    List<Order> orders = List.of(
        createTestOrder("order-1"),
        createTestOrder("order-2"),
        createTestOrder("order-3")
    );

    when(orderRepository.findAll()).thenReturn(Flux.fromIterable(orders));

    // When & Then
    StepVerifier.create(orderService.streamAllOrders())
        .expectNext(orders.get(0))
        .expectNext(orders.get(1))
        .expectNext(orders.get(2))
        .verifyComplete();
}

@Test
void shouldStreamOrdersWithPredicate() {
    // Given
    List<Order> orders = List.of(
        createTestOrder("order-1"),
        createTestOrder("order-2"),
        createTestOrder("order-3")
    );

    when(orderRepository.findAll()).thenReturn(Flux.fromIterable(orders));

    // When & Then
    StepVerifier.create(orderService.streamAllOrders())
        .expectNextCount(3)
        .verifyComplete();
}

@Test
void shouldFilterOrdersByStatus() {
    // Given
    List<Order> allOrders = List.of(
        createTestOrder(OrderStatus.CREATED),
        createTestOrder(OrderStatus.CONFIRMED),
        createTestOrder(OrderStatus.CREATED)
    );

    when(orderRepository.findAll()).thenReturn(Flux.fromIterable(allOrders));

    // When & Then
    StepVerifier.create(orderService.streamOrdersByStatus(OrderStatus.CREATED))
        .expectNextCount(2)
        .verifyComplete();
}
```

## Testing Backpressure

Backpressure testing ensures that reactive streams handle demand correctly.

### Testing Demand and Request Patterns

```java
@Test
void shouldStreamOrdersWithBackpressure() {
    // Given
    List<Order> orders = IntStream.range(0, 100)
        .mapToObj(i -> createTestOrder("order-" + i))
        .toList();

    when(orderRepository.findAll()).thenReturn(Flux.fromIterable(orders));

    // When & Then
    StepVerifier.create(orderService.streamAllOrders(), 10) // Request 10 items initially
        .expectNextCount(10)
        .thenRequest(20) // Request 20 more
        .expectNextCount(20)
        .thenRequest(70) // Request remaining 70
        .expectNextCount(70)
        .verifyComplete();
}

@Test
void shouldHandleSlowConsumer() {
    // Given
    Flux<Order> orderStream = Flux.range(1, 1000)
        .map(i -> createTestOrder("order-" + i))
        .onBackpressureBuffer(100); // Buffer up to 100 items

    when(orderRepository.findAll()).thenReturn(orderStream);

    // When & Then
    StepVerifier.create(orderService.streamAllOrders())
        .expectNextCount(1000)
        .verifyComplete();
}

@Test
void shouldDropOnBackpressure() {
    // Given
    Flux<Order> fastProducer = Flux.interval(Duration.ofMillis(1))
        .take(1000)
        .map(i -> createTestOrder("order-" + i))
        .onBackpressureDrop(); // Drop items when consumer is slow

    when(orderRepository.findAll()).thenReturn(fastProducer);

    // When & Then
    StepVerifier.create(orderService.streamAllOrders(), 10)
        .expectNextCount(10)
        .thenCancel()
        .verify();
}
```

## Testing Time-Based Operations

Use virtual time to test time-dependent operations without waiting for real time.

### Testing Delays and Timeouts

```java
@Test
void shouldHandleTimeBasedOperationsWithVirtualTime() {
    // Given
    Order order = createTestOrder();
    when(orderRepository.save(order))
        .thenReturn(Mono.just(order).delayElement(Duration.ofMinutes(5)));

    // When & Then
    StepVerifier.withVirtualTime(() -> orderService.saveOrderWithDelay(order))
        .expectSubscription()
        .expectNoEvent(Duration.ofMinutes(5))
        .expectNext(order)
        .verifyComplete();
}

@Test
void shouldTimeoutSlowOperations() {
    // Given
    Order order = createTestOrder();
    when(orderRepository.save(order))
        .thenReturn(Mono.just(order).delayElement(Duration.ofSeconds(10)));

    // When & Then
    StepVerifier.withVirtualTime(() -> 
        orderService.saveOrderWithTimeout(order, Duration.ofSeconds(5)))
        .expectSubscription()
        .thenAwait(Duration.ofSeconds(5))
        .expectError(TimeoutException.class)
        .verify();
}

@Test
void shouldRetryFailedOperations() {
    // Given
    Order order = createTestOrder();
    when(orderRepository.save(order))
        .thenReturn(Mono.error(new RuntimeException("Temporary failure")))
        .thenReturn(Mono.error(new RuntimeException("Temporary failure")))
        .thenReturn(Mono.just(order));

    // When & Then
    StepVerifier.withVirtualTime(() -> orderService.saveOrderWithRetry(order))
        .expectSubscription()
        .thenAwait(Duration.ofSeconds(1)) // First retry after 1s
        .thenAwait(Duration.ofSeconds(2)) // Second retry after 2s
        .expectNext(order)
        .verifyComplete();

    verify(orderRepository, times(3)).save(order);
}

@Test
void shouldHandlePeriodicOperations() {
    // Given
    when(orderRepository.countByStatus(OrderStatus.PENDING))
        .thenReturn(Mono.just(5L))
        .thenReturn(Mono.just(3L))
        .thenReturn(Mono.just(0L));

    // When & Then
    StepVerifier.withVirtualTime(() -> 
        orderService.monitorPendingOrders(Duration.ofMinutes(10)))
        .expectSubscription()
        .expectNext(5L)
        .thenAwait(Duration.ofMinutes(10))
        .expectNext(3L)
        .thenAwait(Duration.ofMinutes(10))
        .expectNext(0L)
        .thenCancel()
        .verify();
}
```

## Testing Error Handling

Reactive streams require careful error handling testing to ensure errors propagate correctly.

### Testing Error Propagation

```java
@Test
void shouldPropagateRepositoryErrors() {
    // Given
    Order order = createTestOrder();
    when(orderRepository.save(order))
        .thenReturn(Mono.error(new DataAccessException("Database error")));

    // When & Then
    StepVerifier.create(orderService.createOrder(order))
        .expectError(DataAccessException.class)
        .verify();
}

@Test
void shouldHandleErrorsWithFallback() {
    // Given
    UUID orderId = UUID.randomUUID();
    when(orderRepository.findById(orderId))
        .thenReturn(Mono.error(new DataAccessException("Database error")));
    when(orderRepository.findByIdFromCache(orderId))
        .thenReturn(Mono.just(createTestOrder()));

    // When & Then
    StepVerifier.create(orderService.getOrderWithFallback(orderId))
        .assertNext(order -> assertThat(order).isNotNull())
        .verifyComplete();
}

@Test
void shouldRecoverFromErrors() {
    // Given
    when(orderRepository.findAll())
        .thenReturn(Flux.error(new RuntimeException("Service unavailable")));

    // When & Then
    StepVerifier.create(orderService.getAllOrdersWithRecovery())
        .expectNext(Order.empty()) // Default empty order
        .verifyComplete();
}

@Test
void shouldHandlePartialFailures() {
    // Given
    List<Order> orders = List.of(
        createTestOrder("order-1"),
        createTestOrder("order-2"),
        createTestOrder("order-3")
    );

    when(orderRepository.findAll())
        .thenReturn(Flux.fromIterable(orders)
            .flatMap(order -> {
                if (order.getId().toString().contains("2")) {
                    return Mono.error(new RuntimeException("Processing error"));
                }
                return Mono.just(order);
            })
            .onErrorContinue((throwable, obj) -> {
                // Log error and continue with other items
            }));

    // When & Then
    StepVerifier.create(orderService.processOrders())
        .expectNextCount(2) // Only 2 orders processed successfully
        .verifyComplete();
}
```

## Testing Cancellation

Test that reactive streams handle cancellation correctly.

### Testing Subscription Cancellation

```java
@Test
void shouldCancelOrderOperation() {
    // Given
    Order order = createTestOrder();
    when(orderRepository.save(order))
        .thenReturn(Mono.just(order).delayElement(Duration.ofSeconds(10)));

    // When & Then
    StepVerifier.create(orderService.saveOrderWithDelay(order))
        .expectSubscription()
        .thenCancel()
        .verify();
}

@Test
void shouldHandleCancellationInStream() {
    // Given
    Flux<Order> infiniteStream = Flux.interval(Duration.ofSeconds(1))
        .map(i -> createTestOrder("order-" + i));

    when(orderRepository.streamOrders()).thenReturn(infiniteStream);

    // When & Then
    StepVerifier.create(orderService.streamOrdersWithLimit(5))
        .expectNextCount(5)
        .verifyComplete();
}

@Test
void shouldCleanupResourcesOnCancel() {
    // Given
    AtomicBoolean cleanupCalled = new AtomicBoolean(false);
    
    Mono<Order> orderMono = Mono.just(createTestOrder())
        .delayElement(Duration.ofSeconds(5))
        .doFinally(signalType -> {
            if (signalType == SignalType.CANCEL) {
                cleanupCalled.set(true);
            }
        });

    when(orderRepository.save(any())).thenReturn(orderMono);

    // When & Then
    StepVerifier.create(orderService.createOrder(createTestOrder()))
        .expectSubscription()
        .thenCancel()
        .verify();

    assertThat(cleanupCalled.get()).isTrue();
}
```

## Testing Reactive Controllers

Use WebTestClient to test reactive controllers in isolation.

### Testing Reactive Endpoints

```java
@WebFluxTest(ReactiveOrderController.class)
class ReactiveOrderControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private ReactiveOrderApplicationService orderService;

    @MockBean
    private OrderMapper orderMapper;

    @Test
    void shouldCreateOrderReactively() {
        // Given
        CreateOrderRequest request = createOrderRequest();
        OrderCreationDto creationDto = createOrderCreationDto();
        OrderDto orderDto = createOrderDto();
        OrderResponse response = createOrderResponse();

        when(orderMapper.toCreationDto(request)).thenReturn(creationDto);
        when(orderService.createOrder(creationDto)).thenReturn(Mono.just(orderDto));
        when(orderMapper.toResponse(orderDto)).thenReturn(response);

        // When & Then
        webTestClient.post()
            .uri("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(OrderResponse.class)
            .value(orderResponse -> {
                assertThat(orderResponse.getId()).isEqualTo(response.getId());
                assertThat(orderResponse.getStatus()).isEqualTo(response.getStatus());
            });

        verify(orderMapper).toCreationDto(request);
        verify(orderService).createOrder(creationDto);
        verify(orderMapper).toResponse(orderDto);
    }

    @Test
    void shouldStreamOrders() {
        // Given
        List<OrderDto> orders = List.of(createOrderDto(), createOrderDto());
        List<OrderResponse> responses = orders.stream()
            .map(dto -> createOrderResponse())
            .toList();

        when(orderService.streamOrders(null)).thenReturn(Flux.fromIterable(orders));
        when(orderMapper.toResponse(any(OrderDto.class)))
            .thenReturn(responses.get(0), responses.get(1));

        // When & Then
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
    void shouldHandleValidationError() {
        // Given
        CreateOrderRequest invalidRequest = new CreateOrderRequest();
        // Missing required fields

        // When & Then
        webTestClient.post()
            .uri("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(invalidRequest)
            .exchange()
            .expectStatus().isBadRequest()
            .expectBody(ErrorResponse.class)
            .value(errorResponse -> {
                assertThat(errorResponse.getCode()).isEqualTo("VALIDATION_ERROR");
                assertThat(errorResponse.getDetails()).isNotEmpty();
            });
    }
}
```

### Testing Server-Sent Events

```java
@Test
void shouldStreamServerSentEvents() {
    // Given
    Flux<OrderEvent> eventStream = Flux.just(
        OrderEvent.created(UUID.randomUUID()),
        OrderEvent.confirmed(UUID.randomUUID()),
        OrderEvent.shipped(UUID.randomUUID())
    );

    when(orderService.streamOrderEvents()).thenReturn(eventStream);

    // When & Then
    StepVerifier.create(
        webTestClient.get()
            .uri("/v1/orders/events")
            .accept(MediaType.TEXT_EVENT_STREAM)
            .exchange()
            .expectStatus().isOk()
            .returnResult(OrderEvent.class)
            .getResponseBody()
    )
    .expectNextCount(3)
    .verifyComplete();
}

@Test
void shouldHandleEventStreamErrors() {
    // Given
    when(orderService.streamOrderEvents())
        .thenReturn(Flux.error(new RuntimeException("Event stream error")));

    // When & Then
    webTestClient.get()
        .uri("/v1/orders/events")
        .accept(MediaType.TEXT_EVENT_STREAM)
        .exchange()
        .expectStatus().is5xxServerError();
}
```

## Reactive Testing Best Practices

### 1. Use StepVerifier for All Reactive Tests

```java
// Good: Using StepVerifier
@Test
void shouldProcessOrder() {
    StepVerifier.create(orderService.processOrder(order))
        .expectNext(processedOrder)
        .verifyComplete();
}

// Bad: Blocking in tests
@Test
void shouldProcessOrder() {
    Order result = orderService.processOrder(order).block();
    assertThat(result).isNotNull();
}
```

### 2. Test Asynchronous Behavior

```java
// Good: Testing timing behavior
@Test
void shouldDelayProcessing() {
    StepVerifier.withVirtualTime(() -> orderService.delayedProcessing(order))
        .expectSubscription()
        .expectNoEvent(Duration.ofSeconds(5))
        .expectNext(order)
        .verifyComplete();
}
```

### 3. Test Error Scenarios

```java
// Good: Testing error propagation
@Test
void shouldHandleProcessingError() {
    when(repository.save(any())).thenReturn(Mono.error(new RuntimeException()));
    
    StepVerifier.create(orderService.processOrder(order))
        .expectError(RuntimeException.class)
        .verify();
}
```

### 4. Use Virtual Time for Time-Based Tests

```java
// Good: Using virtual time
@Test
void shouldTimeoutAfterDelay() {
    StepVerifier.withVirtualTime(() -> orderService.processWithTimeout(order))
        .expectSubscription()
        .thenAwait(Duration.ofSeconds(30))
        .expectError(TimeoutException.class)
        .verify();
}

// Bad: Real time delays in tests
@Test
void shouldTimeoutAfterDelay() throws InterruptedException {
    Thread.sleep(30000); // Never do this in tests
}
```

### 5. Test Backpressure Scenarios

```java
@Test
void shouldHandleBackpressure() {
    StepVerifier.create(orderService.streamLargeDataset(), 0)
        .expectSubscription()
        .thenRequest(10)
        .expectNextCount(10)
        .thenRequest(Long.MAX_VALUE)
        .expectNextCount(990)
        .verifyComplete();
}
```

## Related Documentation

- [Unit Testing Fundamentals](../unit-testing/unit-testing-fundamentals.md) - Core testing principles and setup
- [Controller Unit Testing](../unit-testing/controller-unit-testing.md) - Testing web layer components
- [Infrastructure Testing](infrastructure-testing.md) - Testing reactive repositories and clients