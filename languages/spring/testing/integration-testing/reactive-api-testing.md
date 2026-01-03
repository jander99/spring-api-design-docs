# Reactive API Testing

## Overview

Reactive API testing verifies WebFlux endpoints using `WebTestClient`. These tests validate non-blocking request handling, streaming responses, backpressure, and reactive error handling. Use this approach for Spring WebFlux applications built with Project Reactor.

## When to Use Reactive API Testing

Use reactive API testing when:

- Testing Spring WebFlux controllers
- Validating streaming endpoints (Server-Sent Events, NDJSON)
- Testing backpressure handling
- Verifying reactive error propagation
- Testing reactive security contexts
- Validating non-blocking database operations with R2DBC

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
- `WebTestClient` auto-configured for reactive testing
- R2DBC for non-blocking database access
- `@MockBean` works with reactive services returning `Mono`/`Flux`
- Testcontainers manages database lifecycle

## Testing Basic CRUD Operations

### Creating Resources (POST)

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
- Fluent API for building requests
- Chained assertions on response
- `.value()` callback for complex assertions
- Automatic JSON serialization/deserialization

### Reading Resources (GET)

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
- Each JSON object on separate line
- Newline-delimited streaming format
- Efficient for large datasets
- Client can process line-by-line

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
- `StepVerifier` validates reactive sequences
- `.take(n)` limits stream for testing
- `.expectNextCount()` verifies event count
- `.verifyComplete()` confirms stream completion

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
- Verify limits work correctly
- Test subscriber control over publisher
- Confirm no buffer overflow
- Validate graceful handling of slow consumers

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
- Fine-grained control over stream verification
- Time-based testing with virtual time
- Assertion on each emitted element
- Verify completion signals

### Testing with Virtual Time

```java
@Test
void shouldHandleDelayedEvents() {
    // Use virtual time to speed up time-based tests
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
    // Given
    when(orderService.processOrder(any()))
        .thenReturn(Mono.delay(Duration.ofSeconds(10))
            .then(Mono.just(new OrderResponse())));

    // When & Then
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
            // Verify user context was propagated through reactive chain
            assertThat(response.getCreatedBy()).isEqualTo("user123");
        });
}
```

## Best Practices

### 1. Use StepVerifier for Stream Testing

```java
// Good: Use StepVerifier for detailed stream verification
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

// Bad: Block on reactive streams in tests
@Test
void shouldStreamOrders() {
    List<OrderResponse> orders = webTestClient.get()
        .uri("/v1/orders/stream")
        .exchange()
        .returnResult(OrderResponse.class)
        .getResponseBody()
        .collectList()
        .block(); // Blocks - defeats purpose of reactive testing
}
```

### 2. Test Error Propagation

```java
// Good: Verify errors propagate correctly through reactive chain
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

// Bad: Not testing error scenarios
@Test
void shouldCreateOrder() {
    // Only tests happy path
}
```

### 3. Test Backpressure and Limits

```java
// Good: Test backpressure handling
@Test
void shouldRespectBackpressure() {
    webTestClient.get()
        .uri("/v1/orders/stream?limit=10")
        .exchange()
        .expectBodyList(OrderResponse.class)
        .hasSize(10); // Verify limit applied
}

// Bad: Assume unlimited streaming works
@Test
void shouldStreamOrders() {
    // No verification of limits or backpressure
}
```

### 4. Use Virtual Time for Time-Based Tests

```java
// Good: Use virtual time to speed up tests
@Test
void shouldHandlePeriodicEvents() {
    StepVerifier.withVirtualTime(() -> orderEventPublisher.publishPeriodic())
        .thenAwait(Duration.ofHours(1))
        .expectNextCount(60)
        .verifyComplete();
}

// Bad: Real delays make tests slow
@Test
void shouldHandlePeriodicEvents() {
    Thread.sleep(60000); // Blocks for 1 minute
}
```

## Common Pitfalls

### Pitfall 1: Blocking in Reactive Tests

```java
// Bad: Blocking defeats reactive testing
@Test
void shouldCreateOrder() {
    OrderResponse order = webTestClient.post()
        .uri("/v1/orders")
        .bodyValue(request)
        .exchange()
        .returnResult(OrderResponse.class)
        .getResponseBody()
        .blockFirst(); // Don't block!
}

// Good: Use WebTestClient assertions
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

```java
// Bad: Not verifying stream completes
@Test
void shouldStreamOrders() {
    StepVerifier.create(orderStream)
        .expectNextCount(10);
    // Missing .verifyComplete() or .verifyError()
}

// Good: Always verify completion
@Test
void shouldStreamOrders() {
    StepVerifier.create(orderStream)
        .expectNextCount(10)
        .verifyComplete();
}
```

### Pitfall 3: Ignoring Security Context in Reactive Chains

```java
// Bad: Not testing security context propagation
@Test
void shouldCreateOrder() {
    // Creates order but doesn't verify user context propagated
}

// Good: Verify security context flows through chain
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

## Related Documentation

- [Integration Testing Fundamentals](integration-testing-fundamentals.md) - Core integration testing principles
- [Spring Boot Test Fundamentals](springboot-test-fundamentals.md) - Imperative API testing with TestRestTemplate
- [Advanced API Testing](advanced-api-testing.md) - CORS, rate limiting, content negotiation
- [Reactive Controllers](../../controllers/reactive-controllers.md) - Building WebFlux controllers
- [Reactive Error Handling](../../error-handling/reactive-error-handling.md) - Error handling in reactive applications
