# Unit Testing Standards

## Overview

This document outlines our standards for unit testing in Spring Boot applications, focusing on testing components in isolation.

## Core Principles

1. **Test in Isolation**: Mock external dependencies
2. **Focus on Behavior**: Test what components do, not how they do it
3. **Fast Execution**: Unit tests should run in milliseconds
4. **Repeatable Results**: Tests should produce consistent results
5. **Clear Intent**: Tests should clearly show what is being verified

## Structure and Organization

### Package Structure

Mirror the main package structure under `src/test/java`:

```
src/test/java/com/example/{service-name}/
├── domain/              # Domain model and logic tests
├── application/         # Application service tests
├── infrastructure/      # Infrastructure component tests
└── interfaces/          # API controller unit tests
```

### Naming Conventions

| Component | Test Class Name | Test Method Pattern |
|-----------|----------------|---------------------|
| Any Component | `{Component}Test` | `should{ExpectedBehavior}_when{Condition}` |

## Required Testing Libraries

- JUnit 5 for test framework
- Mockito for mocking
- AssertJ for assertions
- Reactor Test for reactive tests

## Testing Approaches By Layer

### Domain Layer

Test entities and value objects without mocks:

```java
class OrderTest {

    @Test
    void shouldCreateOrderWithValidData() {
        // Given
        UUID customerId = UUID.randomUUID();
        List<OrderItem> items = List.of(
            OrderItem.builder()
                .productId(UUID.randomUUID())
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(50.00))
                .build()
        );

        // When
        Order order = Order.builder()
            .customerId(customerId)
            .items(items)
            .build();

        // Then
        assertThat(order.getCustomerId()).isEqualTo(customerId);
        assertThat(order.getItems()).hasSize(1);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(100.00));
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CREATED);
    }

    @Test
    void shouldThrowExceptionForEmptyItems() {
        // Given
        UUID customerId = UUID.randomUUID();
        List<OrderItem> emptyItems = List.of();

        // When & Then
        assertThrows(IllegalArgumentException.class, () ->
            Order.builder()
                .customerId(customerId)
                .items(emptyItems)
                .build()
        );
    }

    @Test
    void shouldConfirmOrderWhenInCreatedStatus() {
        // Given
        Order order = createTestOrder(OrderStatus.CREATED);

        // When
        order.confirm();

        // Then
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(order.getConfirmedDate()).isNotNull();
    }

    @Test
    void shouldThrowExceptionWhenConfirmingNonCreatedOrder() {
        // Given
        Order order = createTestOrder(OrderStatus.CONFIRMED);

        // When & Then
        assertThrows(InvalidOrderStatusException.class, order::confirm);
    }

    private Order createTestOrder(OrderStatus status) {
        return Order.builder()
            .customerId(UUID.randomUUID())
            .status(status)
            .items(List.of(OrderItem.builder()
                .productId(UUID.randomUUID())
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(50.00))
                .build()))
            .build();
    }
}
```

Test domain services with mocked dependencies:

```java
@ExtendWith(MockitoExtension.class)
class OrderDomainServiceTest {

    @Mock
    private InventoryService inventoryService;

    @Mock
    private PricingService pricingService;

    @InjectMocks
    private OrderDomainService orderDomainService;

    @Test
    void shouldValidateAndEnrichOrder() {
        // Given
        Order order = createTestOrder();
        when(inventoryService.validateInventory(order.getItems())).thenReturn(true);
        when(pricingService.calculateTotalPrice(order.getItems()))
            .thenReturn(BigDecimal.valueOf(150.00));

        // When
        Order result = orderDomainService.validateAndEnrichOrder(order);

        // Then
        assertThat(result.getTotalPrice()).isEqualByComparingTo(BigDecimal.valueOf(150.00));
        verify(inventoryService).validateInventory(order.getItems());
        verify(pricingService).calculateTotalPrice(order.getItems());
    }

    @Test
    void shouldThrowExceptionForInsufficientInventory() {
        // Given
        Order order = createTestOrder();
        when(inventoryService.validateInventory(order.getItems())).thenReturn(false);

        // When & Then
        assertThrows(InsufficientInventoryException.class, 
            () -> orderDomainService.validateAndEnrichOrder(order));
        
        verify(inventoryService).validateInventory(order.getItems());
        verifyNoInteractions(pricingService);
    }
}
```

### Application Layer

Mock all dependencies and verify proper interactions:

```java
@ExtendWith(MockitoExtension.class)
class OrderApplicationServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderDomainService orderDomainService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private OrderApplicationService orderApplicationService;

    @Test
    void shouldCreateOrderSuccessfully() {
        // Given
        OrderCreationRequest request = createOrderCreationRequest();
        Order enrichedOrder = createTestOrder();
        Order savedOrder = createTestOrder();
        savedOrder.setId(UUID.randomUUID());

        when(orderDomainService.validateAndEnrichOrder(any(Order.class)))
            .thenReturn(enrichedOrder);
        when(orderRepository.save(enrichedOrder)).thenReturn(savedOrder);

        // When
        Order result = orderApplicationService.createOrder(request);

        // Then
        assertThat(result.getId()).isEqualTo(savedOrder.getId());
        
        verify(orderDomainService).validateAndEnrichOrder(any(Order.class));
        verify(orderRepository).save(enrichedOrder);
        verify(eventPublisher).publishEvent(any(OrderCreatedEvent.class));
    }

    @Test
    void shouldHandleValidationException() {
        // Given
        OrderCreationRequest request = createOrderCreationRequest();
        when(orderDomainService.validateAndEnrichOrder(any(Order.class)))
            .thenThrow(new ValidationException("Invalid order"));

        // When & Then
        assertThrows(ValidationException.class, 
            () -> orderApplicationService.createOrder(request));
        
        verify(orderDomainService).validateAndEnrichOrder(any(Order.class));
        verifyNoInteractions(orderRepository);
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void shouldGetOrderById() {
        // Given
        UUID orderId = UUID.randomUUID();
        Order order = createTestOrder();
        order.setId(orderId);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        // When
        Order result = orderApplicationService.getOrder(orderId);

        // Then
        assertThat(result.getId()).isEqualTo(orderId);
        verify(orderRepository).findById(orderId);
    }

    @Test
    void shouldThrowExceptionWhenOrderNotFound() {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderRepository.findById(orderId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class, 
            () -> orderApplicationService.getOrder(orderId));
        
        verify(orderRepository).findById(orderId);
    }
}
```

### Infrastructure Layer

Test repository implementations and API clients:

```java
@ExtendWith(MockitoExtension.class)
class JpaOrderRepositoryTest {

    @Mock
    private JpaRepository<OrderEntity, UUID> jpaRepository;

    @Mock
    private OrderEntityMapper orderMapper;

    @InjectMocks
    private JpaOrderRepository orderRepository;

    @Test
    void shouldSaveOrder() {
        // Given
        Order order = createTestOrder();
        OrderEntity orderEntity = createTestOrderEntity();
        OrderEntity savedEntity = createTestOrderEntity();
        savedEntity.setId(UUID.randomUUID());
        Order savedOrder = createTestOrder();
        savedOrder.setId(savedEntity.getId());

        when(orderMapper.toEntity(order)).thenReturn(orderEntity);
        when(jpaRepository.save(orderEntity)).thenReturn(savedEntity);
        when(orderMapper.toDomain(savedEntity)).thenReturn(savedOrder);

        // When
        Order result = orderRepository.save(order);

        // Then
        assertThat(result.getId()).isEqualTo(savedEntity.getId());
        verify(orderMapper).toEntity(order);
        verify(jpaRepository).save(orderEntity);
        verify(orderMapper).toDomain(savedEntity);
    }

    @Test
    void shouldFindOrdersByCustomerId() {
        // Given
        UUID customerId = UUID.randomUUID();
        List<OrderEntity> entities = List.of(createTestOrderEntity());
        List<Order> orders = List.of(createTestOrder());

        when(jpaRepository.findByCustomerId(customerId)).thenReturn(entities);
        when(orderMapper.toDomain(any(OrderEntity.class))).thenReturn(orders.get(0));

        // When
        List<Order> result = orderRepository.findByCustomerId(customerId);

        // Then
        assertThat(result).hasSize(1);
        verify(jpaRepository).findByCustomerId(customerId);
        verify(orderMapper).toDomain(entities.get(0));
    }
}
```

Test API clients with mocked WebClient:

```java
@ExtendWith(MockitoExtension.class)
class PaymentServiceClientTest {

    @Mock
    private WebClient webClient;

    @Mock
    private WebClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private WebClient.RequestBodySpec requestBodySpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    @InjectMocks
    private PaymentServiceClient paymentServiceClient;

    @Test
    void shouldProcessPaymentSuccessfully() {
        // Given
        PaymentRequest request = PaymentRequest.builder()
            .orderId(UUID.randomUUID())
            .amount(BigDecimal.valueOf(100.00))
            .build();
        
        PaymentResponse response = PaymentResponse.builder()
            .transactionId("txn-123")
            .status(PaymentStatus.COMPLETED)
            .build();

        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri("/v1/payments")).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(request)).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(PaymentResponse.class)).thenReturn(Mono.just(response));

        // When
        PaymentResponse result = paymentServiceClient.processPayment(request).block();

        // Then
        assertThat(result.getTransactionId()).isEqualTo("txn-123");
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
    }

    @Test
    void shouldHandlePaymentServiceError() {
        // Given
        PaymentRequest request = PaymentRequest.builder()
            .orderId(UUID.randomUUID())
            .amount(BigDecimal.valueOf(100.00))
            .build();

        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri("/v1/payments")).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(request)).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(PaymentResponse.class))
            .thenReturn(Mono.error(new WebClientResponseException(500, "Server Error", null, null, null)));

        // When & Then
        assertThrows(PaymentServiceException.class, 
            () -> paymentServiceClient.processPayment(request).block());
    }
}
```

### Interfaces Layer

Test controllers with MockMvc:

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderApplicationService orderService;

    @MockBean
    private OrderMapper orderMapper;

    @Test
    void shouldCreateOrderSuccessfully() throws Exception {
        // Given
        CreateOrderRequest request = createOrderRequest();
        OrderCreationDto creationDto = createOrderCreationDto();
        OrderDto orderDto = createOrderDto();
        OrderResponse response = createOrderResponse();

        when(orderMapper.toCreationDto(request)).thenReturn(creationDto);
        when(orderService.createOrder(creationDto)).thenReturn(orderDto);
        when(orderMapper.toResponse(orderDto)).thenReturn(response);

        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(asJsonString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(response.getId().toString()))
            .andExpect(jsonPath("$.status").value(response.getStatus()));

        verify(orderMapper).toCreationDto(request);
        verify(orderService).createOrder(creationDto);
        verify(orderMapper).toResponse(orderDto);
    }

    @Test
    void shouldReturnValidationErrorForInvalidRequest() throws Exception {
        // Given
        CreateOrderRequest invalidRequest = new CreateOrderRequest();
        // Missing required fields

        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(asJsonString(invalidRequest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.details").isArray());

        verifyNoInteractions(orderService);
    }

    @Test
    void shouldGetOrderById() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderDto orderDto = createOrderDto();
        OrderResponse response = createOrderResponse();

        when(orderService.getOrder(orderId)).thenReturn(orderDto);
        when(orderMapper.toResponse(orderDto)).thenReturn(response);

        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(response.getId().toString()));

        verify(orderService).getOrder(orderId);
        verify(orderMapper).toResponse(orderDto);
    }

    @Test
    void shouldReturnNotFoundForNonExistentOrder() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderService.getOrder(orderId))
            .thenThrow(new ResourceNotFoundException("Order", orderId));

        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

        verify(orderService).getOrder(orderId);
    }

    private String asJsonString(Object obj) throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        return objectMapper.writeValueAsString(obj);
    }
}
```

## Reactive Testing

Use StepVerifier to test reactive streams:

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

    @Test
    void shouldStreamOrdersWithBackpressure() {
        // Given
        List<Order> orders = IntStream.range(0, 100)
            .mapToObj(i -> createTestOrder())
            .toList();

        when(orderRepository.findAll()).thenReturn(Flux.fromIterable(orders));

        // When & Then
        StepVerifier.create(orderService.streamAllOrders(), 10) // Request 10 items
            .expectNextCount(10)
            .thenRequest(90) // Request remaining 90
            .expectNextCount(90)
            .verifyComplete();
    }

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
}
```

Test reactive controllers with WebTestClient:

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

## Test Data Management

- Use factories for common test objects
- Use builders for complex objects
- Define test fixtures for reusable test data
- Keep test data minimal but sufficient

## Test Coverage Requirements

| Component Type | Minimum Line Coverage |
|----------------|----------------------|
| Domain Models | 90% |
| Domain Services | 90% |
| Application Services | 85% |
| Infrastructure Components | 80% |
| Controllers | 80% |

## Common Anti-patterns to Avoid

1. **Testing implementation details**: Focus on behavior
2. **Brittle tests**: Don't couple tests to implementation
3. **Excessive mocking**: Only mock what's necessary
4. **Overlapping tests**: Test each behavior once
5. **Slow unit tests**: Keep them fast
6. **Non-isolated tests**: Don't depend on other tests
7. **Missing edge cases**: Test failure paths and boundaries

## Mocking Best Practices

1. Mock at the boundaries (repositories, external services)
2. Use specific expectations
3. Verify only important interactions
4. Use argument matchers consistently

## Assertion Best Practices

1. Use descriptive assertions
2. Assert outcomes, not intermediate states
3. Use appropriate assertion methods for the task
4. Group related assertions together

## Testing with TDD

When using Test-Driven Development:
1. Write a failing test first
2. Write minimal code to pass
3. Refactor while keeping tests green
4. Repeat for next behavior