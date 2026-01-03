# Reactive API Testing

## Overview

Reactive API testing verifies WebFlux endpoints using `WebTestClient`. These tests validate:

- Non-blocking request handling
- Streaming responses
- Backpressure (flow control)
- Reactive error handling

Use this approach for Spring WebFlux applications built with Project Reactor.

## When to Use Reactive API Testing

Use this approach when you need to:

- Test Spring WebFlux controllers
- Validate streaming endpoints (Server-Sent Events or NDJSON)
- Test backpressure handling
- Verify errors propagate through reactive chains
- Test reactive security contexts
- Validate non-blocking database operations with R2DBC

## Basic Setup

### WebTestClient Configuration

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class ReactiveOrderApiIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.r2dbc.url", () -> "r2dbc:postgresql://" + 
            postgres.getHost() + ":" + postgres.getFirstMappedPort() + "/testdb");
        registry.add("spring.r2dbc.username", postgres::getUsername);
        registry.add("spring.r2dbc.password", postgres::getPassword);
    }

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private ReactiveOrderRepository orderRepository;

    @MockBean
    private ReactivePaymentService paymentService;
}
```

**Key Points:**
- `WebTestClient` is configured automatically for reactive testing
- R2DBC provides non-blocking database access
- `@MockBean` works with reactive services (returns `Mono` or `Flux`)
- Testcontainers handles database startup and cleanup

## Testing Basic CRUD Operations

### Creating Resources

```java
@Test
void shouldCreateOrderReactively() {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    when(paymentService.processPayment(any()))
        .thenReturn(Mono.just(PaymentResult.success("txn-123")));

    // When & Then
    webTestClient.post()
        .uri("/v1/orders")
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(request)
        .exchange()
        .expectStatus().isCreated()
        .expectHeader().exists("Location")
        .expectBody(OrderResponse.class)
        .value(response -> {
            assertThat(response.getId()).isNotNull();
            assertThat(response.getStatus()).isEqualTo("CONFIRMED");
            assertThat(response.getCustomerId()).isEqualTo(request.getCustomerId());
        });
}
```

**WebTestClient Features:**
- Easy method chaining for building requests
- Chain assertions directly on response
- Use `.value()` callback for complex checks
- Handles JSON conversion automatically

### Reading Resources

```java
@Test
void shouldGetOrderReactively() {
    // Given
    Order savedOrder = orderRepository.save(createTestOrder()).block();

    // When & Then
    webTestClient.get()
        .uri("/v1/orders/{orderId}", savedOrder.getId())
        .accept(MediaType.APPLICATION_JSON)
        .exchange()
        .expectStatus().isOk()
        .expectBody(OrderResponse.class)
        .value(response -> {
            assertThat(response.getId()).isEqualTo(savedOrder.getId());
            assertThat(response.getCustomerId()).isEqualTo(savedOrder.getCustomerId());
        });
}
```

### Testing Validation Errors

```java
@Test
void shouldHandleValidationErrorsReactively() {
    // Given
    CreateOrderRequest invalidRequest = CreateOrderRequest.builder()
        .customerId(null)
        .items(List.of())
        .build();

    // When & Then
    webTestClient.post()
        .uri("/v1/orders")
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(invalidRequest)
        .exchange()
        .expectStatus().isBadRequest()
        .expectBody(ErrorResponse.class)
        .value(error -> {
            assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR");
            assertThat(error.getDetails()).isNotEmpty();
        });
}
```

## Testing Streaming Endpoints

### NDJSON Streaming

```java
@Test
void shouldStreamOrdersAsNdjson() {
    // Given
    List<Order> orders = List.of(
        createTestOrder(),
        createTestOrder(),
        createTestOrder()
    );

    // Save orders first
    Flux.fromIterable(orders)
        .flatMap(orderRepository::save)
        .blockLast();

    // When & Then
    webTestClient.get()
        .uri("/v1/orders/stream")
        .accept(MediaType.APPLICATION_NDJSON)
        .exchange()
        .expectStatus().isOk()
        .expectHeader().contentType(MediaType.APPLICATION_NDJSON)
        .expectBodyList(OrderResponse.class)
        .hasSize(3);
}
```

**NDJSON Characteristics:**
- Each JSON object goes on its own line
- Format: newline-delimited JSON
- Works well for large datasets
- Clients can process one line at a time

### Server-Sent Events (SSE)

```java
@Test
void shouldStreamOrderEventsAsServerSentEvents() {
    // When & Then
    StepVerifier.create(
        webTestClient.get()
            .uri("/v1/orders/events")
            .accept(MediaType.TEXT_EVENT_STREAM)
            .exchange()
            .expectStatus().isOk()
            .returnResult(ServerSentEvent.class)
            .getResponseBody()
            .take(3)
    )
    .expectNextCount(3)
    .verifyComplete();
}
```

**SSE Testing Patterns:**
- Use `StepVerifier` to check reactive streams
- `.take(n)` limits how many events to test
- `.expectNextCount()` checks how many events arrived
- `.verifyComplete()` confirms the stream ended properly

### Testing Backpressure

```java
@Test
void shouldHandleBackpressureInStreaming() {
    // Given
    int totalOrders = 1000;
    Flux<Order> orderStream = Flux.range(1, totalOrders)
        .map(i -> createTestOrder());

    orderStream.flatMap(orderRepository::save).blockLast();

    // When & Then
    webTestClient.get()
        .uri("/v1/orders/stream?limit=10")
        .accept(MediaType.APPLICATION_NDJSON)
        .exchange()
        .expectStatus().isOk()
        .expectBodyList(OrderResponse.class)
        .hasSize(10);
}
```

**Backpressure Testing:**
- Check that limits work as expected
- Test if the subscriber can control the publisher
- Make sure the buffer doesn't overflow
- Verify slow clients are handled properly

## Testing Reactive Error Handling

### Service Errors in Streams

```java
@Test
void shouldHandleServiceErrorsInStream() {
    // Given
    when(orderService.streamOrders())
        .thenReturn(Flux.error(new RuntimeException("Service error")));

    // When & Then
    webTestClient.get()
        .uri("/v1/orders/stream")
        .accept(MediaType.APPLICATION_NDJSON)
        .exchange()
        .expectStatus().is5xxServerError();
}
```

### Propagating Errors in Reactive Chains

```java
@Test
void shouldPropagateErrorsCorrectly() {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    when(paymentService.processPayment(any()))
        .thenReturn(Mono.error(new PaymentDeclinedException("Card declined")));

    // When & Then
    webTestClient.post()
        .uri("/v1/orders")
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(request)
        .exchange()
        .expectStatus().isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY)
        .expectBody(ErrorResponse.class)
        .value(error -> {
            assertThat(error.getCode()).isEqualTo("PAYMENT_DECLINED");
        });
}
```

### Testing Error Recovery

```java
@Test
void shouldRecoverFromTransientErrors() {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    when(paymentService.processPayment(any()))
        .thenReturn(Mono.error(new NetworkException("Timeout")))
        .thenReturn(Mono.just(PaymentResult.success("txn-123")));

    // When & Then - First attempt fails
    webTestClient.post()
        .uri("/v1/orders")
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(request)
        .exchange()
        .expectStatus().is5xxServerError();

    // Second attempt succeeds after retry
    webTestClient.post()
        .uri("/v1/orders")
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(request)
        .exchange()
        .expectStatus().isCreated();
}
```

## Advanced WebTestClient Patterns

### Using StepVerifier for Complex Assertions

```java
@Test
void shouldStreamOrdersWithStepVerifier() {
    // Given
    List<Order> orders = List.of(
        createTestOrder(),
        createTestOrder(),
        createTestOrder()
    );

    Flux.fromIterable(orders)
        .flatMap(orderRepository::save)
        .blockLast();

    // When
    Flux<OrderResponse> responseFlux = webTestClient.get()
        .uri("/v1/orders/stream")
        .accept(MediaType.APPLICATION_NDJSON)
        .exchange()
        .expectStatus().isOk()
        .returnResult(OrderResponse.class)
        .getResponseBody();

    // Then
    StepVerifier.create(responseFlux)
        .expectNextMatches(order -> order.getId() != null)
        .expectNextMatches(order -> order.getId() != null)
        .expectNextMatches(order -> order.getId() != null)
        .verifyComplete();
}
```

**StepVerifier Advantages:**
- Check stream behavior in detail
- Use virtual time for time-based tests
- Add checks for each item in the stream
- Verify that the stream ends correctly

### Testing with Virtual Time

```java
@Test
void shouldHandleDelayedEvents() {
    // Virtual time speeds up tests by skipping real delays
    StepVerifier.withVirtualTime(() -> 
        webTestClient.get()
            .uri("/v1/orders/events")
            .accept(MediaType.TEXT_EVENT_STREAM)
            .exchange()
            .returnResult(OrderEvent.class)
            .getResponseBody()
    )
    .thenAwait(Duration.ofMinutes(5))
    .expectNextCount(5)
    .verifyComplete();
}
```

### Testing Timeout Behavior

```java
@Test
void shouldTimeoutLongRunningOperations() {
    // Given: Service takes 10 seconds
    when(orderService.processOrder(any()))
        .thenReturn(Mono.delay(Duration.ofSeconds(10))
            .then(Mono.just(new OrderResponse())));

    // When & Then: Client times out after 2 seconds
    webTestClient
        .mutate()
        .responseTimeout(Duration.ofSeconds(2))
        .build()
        .post()
        .uri("/v1/orders")
        .bodyValue(createValidOrderRequest())
        .exchange()
        .expectStatus().is5xxServerError();
}
```

## Testing Reactive Security

### Authentication with Reactive Endpoints

```java
@Test
void shouldRequireAuthenticationForReactiveEndpoint() {
    // When & Then
    webTestClient.post()
        .uri("/v1/orders")
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(createValidOrderRequest())
        .exchange()
        .expectStatus().isUnauthorized();
}

@Test
void shouldAllowAccessWithValidToken() {
    // Given
    String validToken = generateValidJwtToken("user", List.of("ROLE_USER"));

    // When & Then
    webTestClient.post()
        .uri("/v1/orders")
        .headers(headers -> headers.setBearerAuth(validToken))
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(createValidOrderRequest())
        .exchange()
        .expectStatus().isCreated();
}
```

### Testing Security Context Propagation

```java
@Test
void shouldPropagateSecurityContextInReactiveChain() {
    // Given
    String userToken = generateValidJwtToken("user123", List.of("ROLE_USER"));
    CreateOrderRequest request = createValidOrderRequest();

    // When & Then
    webTestClient.post()
        .uri("/v1/orders")
        .headers(headers -> headers.setBearerAuth(userToken))
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(request)
        .exchange()
        .expectStatus().isCreated()
        .expectBody(OrderResponse.class)
        .value(response -> {
            // Check that user info flows through the entire reactive chain
            assertThat(response.getCreatedBy()).isEqualTo("user123");
        });
}
```

## Best Practices

### 1. Use StepVerifier for Stream Testing

**Good**: Use StepVerifier to check each item in the stream.

```java
@Test
void shouldStreamOrders() {
    Flux<OrderResponse> stream = webTestClient.get()
        .uri("/v1/orders/stream")
        .exchange()
        .returnResult(OrderResponse.class)
        .getResponseBody();

    StepVerifier.create(stream)
        .expectNextMatches(order -> order.getId() != null)
        .expectNextCount(9)
        .verifyComplete();
}
```

**Bad**: Don't block on reactive streams.

```java
@Test
void shouldStreamOrders() {
    List<OrderResponse> orders = webTestClient.get()
        .uri("/v1/orders/stream")
        .exchange()
        .returnResult(OrderResponse.class)
        .getResponseBody()
        .collectList()
        .block(); // Blocks - defeats reactive testing
}
```

### 2. Test Error Propagation

**Good**: Verify errors move through the entire chain.

```java
@Test
void shouldPropagateErrors() {
    when(paymentService.processPayment(any()))
        .thenReturn(Mono.error(new PaymentException("Failed")));

    webTestClient.post()
        .uri("/v1/orders")
        .bodyValue(request)
        .exchange()
        .expectStatus().isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
}
```

**Bad**: Don't skip error cases.

```java
@Test
void shouldCreateOrder() {
    // Only tests the happy path - missing error checks
}
```

### 3. Test Backpressure and Limits

**Good**: Test that limits work as expected.

```java
@Test
void shouldRespectBackpressure() {
    webTestClient.get()
        .uri("/v1/orders/stream?limit=10")
        .exchange()
        .expectBodyList(OrderResponse.class)
        .hasSize(10); // Check that limit was applied
}
```

**Bad**: Don't assume unlimited streaming works.

```java
@Test
void shouldStreamOrders() {
    // No checks for limits or backpressure handling
}
```

### 4. Use Virtual Time for Time-Based Tests

**Good**: Use virtual time to run tests instantly.

```java
@Test
void shouldHandlePeriodicEvents() {
    StepVerifier.withVirtualTime(() -> orderEventPublisher.publishPeriodic())
        .thenAwait(Duration.ofHours(1))
        .expectNextCount(60)
        .verifyComplete();
}
```

**Bad**: Don't use real delays in tests.

```java
@Test
void shouldHandlePeriodicEvents() {
    Thread.sleep(60000); // Wastes 1 minute of test time
}
```

## Common Pitfalls

### Pitfall 1: Blocking in Reactive Tests

**Bad**: Blocking the reactive stream defeats the purpose of the test.

```java
@Test
void shouldCreateOrder() {
    OrderResponse order = webTestClient.post()
        .uri("/v1/orders")
        .bodyValue(request)
        .exchange()
        .returnResult(OrderResponse.class)
        .getResponseBody()
        .blockFirst(); // Don't do this!
}
```

**Good**: Use WebTestClient assertions instead.

```java
@Test
void shouldCreateOrder() {
    webTestClient.post()
        .uri("/v1/orders")
        .bodyValue(request)
        .exchange()
        .expectStatus().isCreated()
        .expectBody(OrderResponse.class)
        .value(order -> assertThat(order.getId()).isNotNull());
}
```

### Pitfall 2: Not Testing Stream Completion

**Bad**: Don't forget to check that the stream ends.

```java
@Test
void shouldStreamOrders() {
    StepVerifier.create(orderStream)
        .expectNextCount(10);
    // Missing .verifyComplete() or .verifyError()
}
```

**Good**: Always verify the stream completes.

```java
@Test
void shouldStreamOrders() {
    StepVerifier.create(orderStream)
        .expectNextCount(10)
        .verifyComplete();
}
```

### Pitfall 3: Ignoring Security Context in Reactive Chains

**Bad**: Don't skip testing that user info flows through.

```java
@Test
void shouldCreateOrder() {
    // Creates order but doesn't check user context flows through
}
```

**Good**: Verify user info flows through the entire chain.

```java
@Test
void shouldPropagateSecurityContext() {
    webTestClient.post()
        .uri("/v1/orders")
        .headers(headers -> headers.setBearerAuth(token))
        .bodyValue(request)
        .exchange()
        .expectBody(OrderResponse.class)
        .value(response -> {
            assertThat(response.getCreatedBy()).isEqualTo("expectedUser");
        });
}
```

## Test Data Helpers

Helper methods simplify test setup:

```java
private CreateOrderRequest createValidOrderRequest() {
    return CreateOrderRequest.builder()
        .customerId(UUID.randomUUID())
        .items(List.of(CreateOrderItemRequest.builder()
            .productId(UUID.randomUUID())
            .quantity(2)
            .build()))
        .build();
}

private Order createTestOrder() {
    return Order.builder()
        .customerId(UUID.randomUUID())
        .status(OrderStatus.CREATED)
        .totalAmount(BigDecimal.valueOf(100.00))
        .createdDate(OffsetDateTime.now())
        .items(List.of())
        .build();
}
```

These methods create realistic test data for your tests.

## Related Documentation

- [Integration Testing Fundamentals](integration-testing-fundamentals.md) — Core testing principles
- [Spring Boot Test Fundamentals](springboot-test-fundamentals.md) — Traditional imperative API testing
- [Advanced API Testing](advanced-api-testing.md) — CORS, rate limiting, content type testing
- [Reactive Controllers](../../controllers/reactive-controllers.md) — How to build WebFlux controllers
- [Reactive Error Handling](../../error-handling/reactive-error-handling.md) — Handling errors in reactive code
