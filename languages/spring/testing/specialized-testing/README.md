# Specialized Testing Standards

## Overview

This directory contains guidelines for specialized testing approaches in Spring Boot applications, including reactive testing, infrastructure testing, and contract testing patterns that require specific tools and methodologies.

## Directory Contents

### Specialized Testing Documentation

- **[Reactive Testing](reactive-testing.md)**: Comprehensive guide to testing reactive streams, WebFlux applications, and asynchronous operations using StepVerifier and reactive test patterns.

- **[Infrastructure Testing](infrastructure-testing.md)**: Testing infrastructure components, external adapters, repository implementations, and technical integrations with proper isolation and verification.

- **[Contract Testing Standards](contract-testing-standards.md)**: Consumer-driven contract testing using Spring Cloud Contract, API contract verification, and provider-consumer testing patterns.

## Key Specialized Testing Concepts

### Reactive Testing
- **Non-blocking Verification**: Testing asynchronous operations without blocking threads
- **Backpressure Testing**: Verifying reactive stream backpressure handling
- **Error Propagation**: Testing error scenarios in reactive pipelines
- **Time-based Testing**: Using virtual time for deterministic testing

### Infrastructure Testing
- **Adapter Testing**: Testing external system integrations
- **Repository Testing**: Verifying data persistence and retrieval
- **Configuration Testing**: Testing component configuration and wiring
- **Technical Boundary Testing**: Testing at technical architecture boundaries

### Contract Testing
- **Consumer-Driven Contracts**: API contracts defined by consumers
- **Provider Verification**: Ensuring providers meet contract requirements
- **Contract Evolution**: Managing API contract changes over time
- **Stub Generation**: Generating test stubs from contracts

## Quick Reference

### Reactive Stream Testing
```java
@Test
void shouldProcessOrderStream_whenMultipleOrders() {
    // Given
    Flux<Order> orderStream = Flux.just(
        createOrder(1L),
        createOrder(2L),
        createOrder(3L)
    );
    
    when(orderRepository.findAll()).thenReturn(orderStream);
    
    // When
    Flux<OrderDto> result = orderService.getAllOrders();
    
    // Then
    StepVerifier.create(result)
        .expectNextMatches(order -> order.getId().equals(1L))
        .expectNextMatches(order -> order.getId().equals(2L))
        .expectNextMatches(order -> order.getId().equals(3L))
        .verifyComplete();
}
```

### WebFlux Controller Testing
```java
@WebFluxTest(ReactiveOrderController.class)
class ReactiveOrderControllerTest {
    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void shouldStreamOrders_whenRequestMade() {
        // Given
        Flux<OrderDto> orderStream = Flux.just(
            createOrderDto(1L),
            createOrderDto(2L)
        );
        
        when(orderService.getAllOrders()).thenReturn(orderStream);
        
        // When & Then
        webTestClient.get()
            .uri("/v1/orders")
            .accept(MediaType.APPLICATION_NDJSON)
            .exchange()
            .expectStatus().isOk()
            .expectHeader().contentType(MediaType.APPLICATION_NDJSON)
            .expectBodyList(OrderDto.class)
            .hasSize(2);
    }
}
```

### Backpressure Testing
```java
@Test
void shouldHandleBackpressure_whenSlowConsumer() {
    // Given
    Flux<String> fastProducer = Flux.range(1, 1000)
        .map(i -> "item-" + i)
        .delayElements(Duration.ofMillis(1));
    
    // When
    Flux<String> bufferedStream = fastProducer
        .onBackpressureBuffer(100)
        .take(50);
    
    // Then
    StepVerifier.create(bufferedStream)
        .expectNextCount(50)
        .verifyComplete();
}
```

### Virtual Time Testing
```java
@Test
void shouldProcessWithDelay_usingVirtualTime() {
    // Given
    StepVerifier.withVirtualTime(() -> 
        orderService.processOrderWithDelay(createOrder())
    )
    // When
    .expectSubscription()
    .expectNoEvent(Duration.ofMinutes(5))
    .thenAwait(Duration.ofMinutes(5))
    // Then
    .expectNext(processedOrder)
    .verifyComplete();
}
```

### Infrastructure Component Testing
```java
@ExtendWith(MockitoExtension.class)
class PaymentServiceAdapterTest {
    @Mock
    private WebClient webClient;
    
    @Mock
    private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;
    
    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;
    
    @Mock
    private WebClient.ResponseSpec responseSpec;
    
    @InjectMocks
    private PaymentServiceAdapter paymentServiceAdapter;
    
    @Test
    void shouldCallPaymentService_whenProcessingPayment() {
        // Given
        PaymentRequest request = createPaymentRequest();
        PaymentResponse expectedResponse = createPaymentResponse();
        
        when(webClient.post()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri("/payments")).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(PaymentResponse.class))
            .thenReturn(Mono.just(expectedResponse));
        
        // When
        Mono<PaymentResponse> result = paymentServiceAdapter.processPayment(request);
        
        // Then
        StepVerifier.create(result)
            .expectNext(expectedResponse)
            .verifyComplete();
    }
}
```

### Contract Testing with Spring Cloud Contract
```groovy
// contracts/order_service_should_create_order.groovy
Contract.make {
    description("Should create order when valid request is provided")
    request {
        method 'POST'
        url '/v1/orders'
        body([
            customerId: 123,
            items: [
                [
                    productId: 456,
                    quantity: 2,
                    price: 50.00
                ]
            ]
        ])
        headers {
            contentType(applicationJson())
        }
    }
    response {
        status OK()
        body([
            id: anyPositiveInt(),
            customerId: 123,
            status: 'CREATED',
            totalAmount: 100.00
        ])
        headers {
            contentType(applicationJson())
        }
    }
}
```

### Contract Test Base Class
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class ContractTestBase {
    @Autowired
    private OrderController orderController;
    
    @MockBean
    private OrderService orderService;
    
    @BeforeEach
    void setup() {
        RestAssuredMockMvc.standaloneSetup(orderController);
        
        // Setup mock responses
        when(orderService.createOrder(any()))
            .thenReturn(OrderDto.builder()
                .id(1L)
                .customerId(123L)
                .status("CREATED")
                .totalAmount(BigDecimal.valueOf(100.00))
                .build());
    }
}
```

## Error Handling in Specialized Tests

### Reactive Error Testing
```java
@Test
void shouldHandleError_whenServiceFails() {
    // Given
    when(orderRepository.save(any()))
        .thenReturn(Mono.error(new DatabaseException("Connection failed")));
    
    // When
    Mono<Order> result = orderService.createOrder(createOrderRequest());
    
    // Then
    StepVerifier.create(result)
        .expectError(DatabaseException.class)
        .verify();
}
```

### Infrastructure Error Testing
```java
@Test
void shouldRetry_whenExternalServiceFails() {
    // Given
    when(webClient.post()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.bodyValue(any())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(PaymentResponse.class))
        .thenReturn(Mono.error(new WebClientException("Service unavailable")))
        .thenReturn(Mono.just(createPaymentResponse()));
    
    // When
    Mono<PaymentResponse> result = paymentServiceAdapter.processPaymentWithRetry(request);
    
    // Then
    StepVerifier.create(result)
        .expectNext(createPaymentResponse())
        .verifyComplete();
        
    // Verify retry occurred
    verify(webClient, times(2)).post();
}
```

## Testing Tools and Libraries

### Reactive Testing
- **StepVerifier**: Primary tool for reactive stream testing
- **TestPublisher**: For controlling test data emission
- **VirtualTimeScheduler**: For time-based testing
- **WebTestClient**: For WebFlux integration testing

### Infrastructure Testing
- **Testcontainers**: For realistic infrastructure testing
- **WireMock**: For external service simulation
- **MockWebServer**: For HTTP client testing
- **EmbeddedKafka**: For message broker testing

### Contract Testing
- **Spring Cloud Contract**: Consumer-driven contract testing
- **Pact**: Alternative contract testing framework
- **RestAssured**: For API contract verification
- **WireMock**: For contract stub generation

## Best Practices

### Reactive Testing Best Practices
✅ **DO**:
- Use StepVerifier for all reactive stream testing
- Test backpressure and cancellation scenarios
- Use virtual time for time-dependent operations
- Test error propagation and recovery

❌ **DON'T**:
- Block on reactive streams in tests
- Use Thread.sleep() for timing
- Ignore backpressure scenarios
- Test implementation details of reactive operators

### Infrastructure Testing Best Practices
✅ **DO**:
- Test at architectural boundaries
- Use realistic test infrastructure
- Verify external service interactions
- Test error scenarios and retries

❌ **DON'T**:
- Test internal implementation details
- Use real external services in tests
- Ignore network failures and timeouts
- Test multiple concerns in one test

## Navigation

- [← Back to Testing Standards](../README.md)
- [Unit Testing](../unit-testing/README.md)
- [Integration Testing](../integration-testing/README.md)
- [Spring Design Home](../../README.md)

## Related Documentation

- [Reactive Controllers](../../controllers/reactive-controllers.md)
- [External Services Configuration](../../configuration/external-services.md)
- [Reactive Error Handling](../../error-handling/reactive-error-handling.md)
- [Security Testing](../../security/security-testing.md)