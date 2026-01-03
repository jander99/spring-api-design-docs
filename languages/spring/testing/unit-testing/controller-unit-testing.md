# Controller Unit Testing

## Overview

Controller unit testing focuses on testing the web layer in isolation, verifying request handling, response formatting, validation, and error handling without the full application context.

## Core Principles

1. **Test in isolation**: Mock all service dependencies
2. **Focus on web concerns**: HTTP status codes, headers, request/response formats
3. **Test serialization**: Verify JSON serialization and deserialization
4. **Validate error handling**: Test exception translation to HTTP responses

## Imperative Controller Testing

Use `@WebMvcTest` to test Spring MVC controllers with MockMvc.

### Basic Controller Testing

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
            .andExpect(jsonPath("$.status").value(response.getStatus()))
            .andExpect(jsonPath("$.totalAmount").value(response.getTotalAmount()))
            .andExpect(header().string("Location", "/v1/orders/" + response.getId()));

        verify(orderMapper).toCreationDto(request);
        verify(orderService).createOrder(creationDto);
        verify(orderMapper).toResponse(orderDto);
    }

    @Test
    void shouldGetOrderById() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderDto orderDto = createOrderDto();
        orderDto.setId(orderId);
        OrderResponse response = createOrderResponse();
        response.setId(orderId);

        when(orderService.getOrder(orderId)).thenReturn(orderDto);
        when(orderMapper.toResponse(orderDto)).thenReturn(response);

        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(orderId.toString()))
            .andExpect(jsonPath("$.status").value(response.getStatus()));

        verify(orderService).getOrder(orderId);
        verify(orderMapper).toResponse(orderDto);
    }

    @Test
    void shouldGetOrdersWithPagination() throws Exception {
        // Given
        UUID customerId = UUID.randomUUID();
        int page = 0;
        int size = 10;
        
        List<OrderDto> orders = List.of(createOrderDto(), createOrderDto());
        Page<OrderDto> orderPage = new PageImpl<>(orders, PageRequest.of(page, size), 25);
        List<OrderResponse> responses = List.of(createOrderResponse(), createOrderResponse());

        when(orderService.getOrdersByCustomer(eq(customerId), any(Pageable.class))).thenReturn(orderPage);
        when(orderMapper.toResponse(orders.get(0))).thenReturn(responses.get(0));
        when(orderMapper.toResponse(orders.get(1))).thenReturn(responses.get(1));

        // When & Then
        mockMvc.perform(get("/v1/orders")
                .param("customerId", customerId.toString())
                .param("page", String.valueOf(page))
                .param("size", String.valueOf(size)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.content", hasSize(2)))
            .andExpect(jsonPath("$.totalElements").value(25))
            .andExpect(jsonPath("$.totalPages").value(3))
            .andExpect(jsonPath("$.number").value(0))
            .andExpect(jsonPath("$.size").value(10));

        verify(orderService).getOrdersByCustomer(eq(customerId), any(Pageable.class));
    }

    private String asJsonString(Object obj) throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        return objectMapper.writeValueAsString(obj);
    }
}
```

### Testing Request Validation

```java
@WebMvcTest(OrderController.class)
class OrderControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderApplicationService orderService;

    @MockBean
    private OrderMapper orderMapper;

    @Test
    void shouldReturnValidationErrorForInvalidRequest() throws Exception {
        // Given
        CreateOrderRequest invalidRequest = new CreateOrderRequest();
        // Missing required fields: customerId, items

        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(asJsonString(invalidRequest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.details").isArray())
            .andExpect(jsonPath("$.details[*].field").value(hasItems("customerId", "items")))
            .andExpect(jsonPath("$.details[*].message").isArray());

        verifyNoInteractions(orderService);
    }

    @Test
    void shouldValidateItemQuantity() throws Exception {
        // Given
        CreateOrderRequest request = CreateOrderRequest.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(CreateOrderItemRequest.builder()
                .productId(UUID.randomUUID())
                .quantity(0) // Invalid: quantity must be positive
                .build()))
            .build();

        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(asJsonString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.details[0].field").value("items[0].quantity"))
            .andExpect(jsonPath("$.details[0].message").value("Quantity must be positive"));
    }

    @Test
    void shouldValidateUuidFormat() throws Exception {
        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", "invalid-uuid"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.message").value(containsString("Invalid UUID format")));
    }
}
```

### Testing Error Handling

```java
@WebMvcTest(OrderController.class)
class OrderControllerErrorHandlingTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderApplicationService orderService;

    @Test
    void shouldReturnNotFoundForNonExistentOrder() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderService.getOrder(orderId))
            .thenThrow(new ResourceNotFoundException("Order", orderId));

        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
            .andExpect(jsonPath("$.message").value("Order not found with id: " + orderId))
            .andExpect(jsonPath("$.timestamp").exists())
            .andExpect(jsonPath("$.path").value("/v1/orders/" + orderId));

        verify(orderService).getOrder(orderId);
    }

    @Test
    void shouldReturnConflictForBusinessRuleViolation() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderService.cancelOrder(orderId))
            .thenThrow(new InvalidOrderStatusException("Cannot cancel shipped order"));

        // When & Then
        mockMvc.perform(delete("/v1/orders/{orderId}", orderId))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("BUSINESS_RULE_VIOLATION"))
            .andExpect(jsonPath("$.message").value("Cannot cancel shipped order"));

        verify(orderService).cancelOrder(orderId);
    }

    @Test
    void shouldReturnInternalServerErrorForUnexpectedException() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderService.getOrder(orderId))
            .thenThrow(new RuntimeException("Unexpected error"));

        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"))
            .andExpect(jsonPath("$.message").value("An unexpected error occurred"));
        // Note: Original exception message should not be exposed
    }
}
```

### Testing Security

```java
@WebMvcTest(OrderController.class)
@Import(SecurityTestConfig.class)
class OrderControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderApplicationService orderService;

    @Test
    @WithMockUser(roles = "USER")
    void shouldAllowUserToAccessOwnOrders() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderDto orderDto = createOrderDto();
        OrderResponse response = createOrderResponse();

        when(orderService.getOrder(orderId)).thenReturn(orderDto);
        when(orderMapper.toResponse(orderDto)).thenReturn(response);

        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isOk());
    }

    @Test
    void shouldReturnUnauthorizedWithoutAuthentication() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();

        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isUnauthorized());

        verifyNoInteractions(orderService);
    }

    @Test
    @WithMockUser(roles = "USER")
    void shouldReturnForbiddenForInsufficientPermissions() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();

        // When & Then
        mockMvc.perform(delete("/v1/admin/orders/{orderId}", orderId))
            .andExpect(status().isForbidden());

        verifyNoInteractions(orderService);
    }
}
```

## Reactive Controller Testing

Use `@WebFluxTest` to test Spring WebFlux controllers with WebTestClient.

### Basic Reactive Controller Testing

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
            })
            .returnResult()
            .getResponseHeaders()
            .getLocation();

        verify(orderMapper).toCreationDto(request);
        verify(orderService).createOrder(creationDto);
        verify(orderMapper).toResponse(orderDto);
    }

    @Test
    void shouldGetOrderByIdReactively() {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderDto orderDto = createOrderDto();
        OrderResponse response = createOrderResponse();

        when(orderService.getOrder(orderId)).thenReturn(Mono.just(orderDto));
        when(orderMapper.toResponse(orderDto)).thenReturn(response);

        // When & Then
        webTestClient.get()
            .uri("/v1/orders/{orderId}", orderId)
            .exchange()
            .expectStatus().isOk()
            .expectBody(OrderResponse.class)
            .value(orderResponse -> {
                assertThat(orderResponse.getId()).isEqualTo(response.getId());
            });

        verify(orderService).getOrder(orderId);
        verify(orderMapper).toResponse(orderDto);
    }
}
```

### Testing Streaming Endpoints

```java
@WebFluxTest(ReactiveOrderController.class)
class ReactiveOrderStreamingTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private ReactiveOrderApplicationService orderService;

    @MockBean
    private OrderMapper orderMapper;

    @Test
    void shouldStreamOrders() {
        // Given
        List<OrderDto> orders = List.of(createOrderDto(), createOrderDto());
        List<OrderResponse> responses = orders.stream()
            .map(dto -> createOrderResponse())
            .toList();

        when(orderService.streamOrders(null)).thenReturn(Flux.fromIterable(orders));
        when(orderMapper.toResponse(orders.get(0))).thenReturn(responses.get(0));
        when(orderMapper.toResponse(orders.get(1))).thenReturn(responses.get(1));

        // When & Then
        webTestClient.get()
            .uri("/v1/orders/stream")
            .accept(MediaType.APPLICATION_NDJSON)
            .exchange()
            .expectStatus().isOk()
            .expectHeader().contentType(MediaType.APPLICATION_NDJSON)
            .expectBodyList(OrderResponse.class)
            .hasSize(2)
            .value(orderList -> {
                assertThat(orderList).hasSize(2);
                assertThat(orderList.get(0).getId()).isEqualTo(responses.get(0).getId());
                assertThat(orderList.get(1).getId()).isEqualTo(responses.get(1).getId());
            });

        verify(orderService).streamOrders(null);
        verify(orderMapper, times(2)).toResponse(any(OrderDto.class));
    }

    @Test
    void shouldStreamOrdersWithBackpressure() {
        // Given
        Flux<OrderDto> orderStream = Flux.range(1, 100)
            .map(i -> createOrderDto())
            .delayElements(Duration.ofMillis(10));

        when(orderService.streamOrders(null)).thenReturn(orderStream);
        when(orderMapper.toResponse(any(OrderDto.class))).thenReturn(createOrderResponse());

        // When & Then
        webTestClient.get()
            .uri("/v1/orders/stream")
            .accept(MediaType.APPLICATION_NDJSON)
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(OrderResponse.class)
            .hasSize(100);
    }

    @Test
    void shouldHandleStreamingError() {
        // Given
        when(orderService.streamOrders(null))
            .thenReturn(Flux.error(new RuntimeException("Streaming error")));

        // When & Then
        webTestClient.get()
            .uri("/v1/orders/stream")
            .accept(MediaType.APPLICATION_NDJSON)
            .exchange()
            .expectStatus().is5xxServerError();
    }
}
```

### Testing Server-Sent Events

```java
@WebFluxTest(ReactiveOrderController.class)
class ReactiveOrderSseTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private ReactiveOrderApplicationService orderService;

    @Test
    void shouldStreamOrderEventsAsSse() {
        // Given
        List<OrderEvent> events = List.of(
            OrderEvent.created(UUID.randomUUID()),
            OrderEvent.confirmed(UUID.randomUUID()),
            OrderEvent.shipped(UUID.randomUUID())
        );

        when(orderService.streamOrderEvents()).thenReturn(Flux.fromIterable(events));

        // When & Then
        webTestClient.get()
            .uri("/v1/orders/events")
            .accept(MediaType.TEXT_EVENT_STREAM)
            .exchange()
            .expectStatus().isOk()
            .expectHeader().contentType(MediaType.TEXT_EVENT_STREAM)
            .expectBodyList(OrderEvent.class)
            .hasSize(3);
    }

    @Test
    void shouldHandleSseConnection() {
        // Given
        Flux<OrderEvent> eventStream = Flux.interval(Duration.ofSeconds(1))
            .take(5)
            .map(i -> OrderEvent.created(UUID.randomUUID()));

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
        .expectNextCount(5)
        .verifyComplete();
    }
}
```

## Controller Testing Best Practices

### 1. Test HTTP Concerns

```java
// Good: Testing HTTP status codes and headers
@Test
void shouldReturnCreatedWithLocationHeader() throws Exception {
    OrderResponse response = createOrderResponse();
    when(orderService.createOrder(any())).thenReturn(createOrderDto());
    when(orderMapper.toResponse(any())).thenReturn(response);

    mockMvc.perform(post("/v1/orders").content(validJson))
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", "/v1/orders/" + response.getId()));
}

// Bad: Testing business logic (belongs in service tests)
@Test
void shouldCalculateOrderTotal() {
    // This belongs in service or domain layer tests
}
```

### 2. Use Appropriate Test Slices

```java
// Good: Use @WebMvcTest for controller testing
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @MockBean
    private OrderService orderService;
}

// Bad: Use @SpringBootTest for controller unit tests
@SpringBootTest
class OrderControllerTest {
    // This loads the entire application context
}
```

### 3. Test Request/Response Serialization

```java
@Test
void shouldSerializeOrderResponse() throws Exception {
    OrderResponse response = OrderResponse.builder()
        .id(UUID.randomUUID())
        .status("CREATED")
        .totalAmount(BigDecimal.valueOf(100.00))
        .createdDate(OffsetDateTime.now())
        .build();

    when(orderService.getOrder(any())).thenReturn(createOrderDto());
    when(orderMapper.toResponse(any())).thenReturn(response);

    mockMvc.perform(get("/v1/orders/{id}", response.getId()))
        .andExpect(jsonPath("$.id").value(response.getId().toString()))
        .andExpect(jsonPath("$.status").value("CREATED"))
        .andExpect(jsonPath("$.totalAmount").value(100.00))
        .andExpect(jsonPath("$.createdDate").exists());
}
```

### 4. Test Error Response Format

```java
@Test
void shouldReturnRfc7807ErrorFormat() throws Exception {
    UUID orderId = UUID.randomUUID();
    when(orderService.getOrder(orderId))
        .thenThrow(new ResourceNotFoundException("Order", orderId));

    mockMvc.perform(get("/v1/orders/{orderId}", orderId))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").exists())
        .andExpect(jsonPath("$.title").exists())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.detail").exists())
        .andExpect(jsonPath("$.instance").exists());
}
```

### 5. Use Test Data Factories

```java
private CreateOrderRequest createOrderRequest() {
    return CreateOrderRequest.builder()
        .customerId(UUID.randomUUID())
        .items(List.of(CreateOrderItemRequest.builder()
            .productId(UUID.randomUUID())
            .quantity(2)
            .build()))
        .build();
}

private OrderDto createOrderDto() {
    return OrderDto.builder()
        .id(UUID.randomUUID())
        .customerId(UUID.randomUUID())
        .status(OrderStatus.CREATED)
        .totalAmount(BigDecimal.valueOf(100.00))
        .build();
}

private OrderResponse createOrderResponse() {
    return OrderResponse.builder()
        .id(UUID.randomUUID())
        .status("CREATED")
        .totalAmount(BigDecimal.valueOf(100.00))
        .createdDate(OffsetDateTime.now())
        .build();
}
```

## Related Documentation

- [Unit Testing Fundamentals](unit-testing-fundamentals.md) - Core testing principles and setup
- [Reactive Testing](../specialized-testing/reactive-testing.md) - Testing reactive components in detail
- [API Integration Testing](../integration-testing/api-integration-testing.md) - Full API integration tests
- [Schema Validation](../../validation/schema-validation.md#testing-validation-logic) - Comprehensive validation testing patterns