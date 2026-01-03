# Controller Testing

## Overview

This guide shows how to test Spring controllers.

It covers two approaches:
- Traditional MVC with Spring WebMvc
- Reactive WebFlux for async streams

Testing strategies include unit tests, integration tests, and specialized scenarios.

## Testing Imperative Controllers

This section covers tests for traditional Spring MVC controllers.

These tests verify:
- HTTP requests are processed correctly
- HTTP responses are formatted properly
- Business logic integrates with controllers

### Basic Unit Test Setup

Unit tests isolate the controller. They ignore other components.

Use `@WebMvcTest` to test only the web layer. Mock the services. Verify the controller calls the right methods with the right data.

```java
@WebMvcTest(OrderController.class)
@ExtendWith(MockitoExtension.class)
public class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderApplicationService orderService;
    
    @MockBean
    private OrderMapper orderMapper;
    
    @Test
    void shouldCreateOrder() throws Exception {
        // Given
        CreateOrderRequest request = CreateOrderRequest.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(
                CreateOrderRequest.OrderItemRequest.builder()
                    .productId(UUID.randomUUID())
                    .quantity(2)
                    .build()
            ))
            .shippingAddress(CreateOrderRequest.AddressRequest.builder()
                .street("123 Main St")
                .city("Anytown")
                .zipCode("12345")
                .build())
            .build();
        
        OrderCreationDto creationDto = new OrderCreationDto();
        when(orderMapper.toCreationDto(any(CreateOrderRequest.class))).thenReturn(creationDto);
        
        OrderDto orderDto = OrderDto.builder()
            .id(UUID.randomUUID())
            .customerId(request.getCustomerId())
            .status(OrderStatus.PENDING)
            .totalAmount(new BigDecimal("100.00"))
            .build();
        when(orderService.createOrder(any(OrderCreationDto.class))).thenReturn(orderDto);
        
        OrderResponse response = OrderResponse.builder()
            .id(orderDto.getId())
            .customerId(orderDto.getCustomerId())
            .status("PENDING")
            .totalAmount(orderDto.getTotalAmount())
            .build();
        when(orderMapper.toResponse(any(OrderDto.class))).thenReturn(response);
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(asJsonString(request)))
            .andExpect(status().isCreated())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.id").value(response.getId().toString()))
            .andExpect(jsonPath("$.customerId").value(response.getCustomerId().toString()))
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.totalAmount").value(100.00));
        
        verify(orderService).createOrder(any(OrderCreationDto.class));
        verify(orderMapper).toCreationDto(any(CreateOrderRequest.class));
        verify(orderMapper).toResponse(any(OrderDto.class));
    }
    
    @Test
    void shouldGetOrder() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderDto orderDto = OrderDto.builder()
            .id(orderId)
            .customerId(UUID.randomUUID())
            .status(OrderStatus.COMPLETED)
            .totalAmount(new BigDecimal("150.00"))
            .build();
        when(orderService.getOrder(orderId)).thenReturn(orderDto);
        
        OrderResponse response = OrderResponse.builder()
            .id(orderDto.getId())
            .customerId(orderDto.getCustomerId())
            .status("COMPLETED")
            .totalAmount(orderDto.getTotalAmount())
            .build();
        when(orderMapper.toResponse(orderDto)).thenReturn(response);
        
        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpected(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.id").value(orderId.toString()))
            .andExpect(jsonPath("$.status").value("COMPLETED"));
    }
    
    @Test
    void shouldReturnNotFoundWhenOrderDoesNotExist() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderService.getOrder(orderId)).thenThrow(new ResourceNotFoundException("Order not found"));
        
        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isNotFound());
    }
    
    @Test
    void shouldValidateCreateOrderRequest() throws Exception {
        // Given - Invalid request with missing required fields
        CreateOrderRequest invalidRequest = CreateOrderRequest.builder()
            .items(Collections.emptyList()) // Invalid - empty items
            .build();
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(asJsonString(invalidRequest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.title").value("Validation Failed"))
            .andExpect(jsonPath("$.errors").isArray())
            .andExpect(jsonPath("$.errors[*].field").value(hasItems("customerId", "items")));
    }
    
    private String asJsonString(Object obj) throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        return objectMapper.writeValueAsString(obj);
    }
}
```

### Testing with Security

Security testing verifies who can access endpoints.

Test these scenarios:
- Unauthenticated requests are rejected
- Requests without proper scopes fail
- Valid tokens grant access

You can simulate JWT tokens. Check that scope validation works correctly.

```java
@WebMvcTest(OrderController.class)
@Import(TestSecurityConfig.class)
public class OrderControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderApplicationService orderService;
    
    @MockBean
    private OrderMapper orderMapper;
    
    @Test
    @WithMockJwtUser(scopes = {"orders:read"}, subject = "user123")
    void shouldAllowAccessWithValidScope() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderDto orderDto = OrderDto.builder()
            .id(orderId)
            .customerId(UUID.randomUUID())
            .build();
        when(orderService.getOrder(eq(orderId), eq("user123"))).thenReturn(orderDto);
        
        OrderResponse response = OrderResponse.builder()
            .id(orderId)
            .build();
        when(orderMapper.toResponse(orderDto)).thenReturn(response);
        
        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isOk());
    }
    
    @Test
    void shouldRejectRequestWithoutAuthentication() throws Exception {
        UUID orderId = UUID.randomUUID();
        
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isUnauthorized());
    }
    
    @Test
    @WithMockJwtUser(scopes = {"orders:write"}, subject = "user123") // Wrong scope
    void shouldRejectRequestWithInvalidScope() throws Exception {
        UUID orderId = UUID.randomUUID();
        
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isForbidden());
    }
}

// Custom annotation for JWT testing
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockJwtUserSecurityContextFactory.class)
public @interface WithMockJwtUser {
    String subject() default "test-user";
    String[] scopes() default {};
    String[] authorities() default {};
}

public class WithMockJwtUserSecurityContextFactory implements WithSecurityContextFactory<WithMockJwtUser> {
    
    @Override
    public SecurityContext createSecurityContext(WithMockJwtUser annotation) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", annotation.subject());
        claims.put("scope", String.join(" ", annotation.scopes()));
        
        Map<String, Object> headers = new HashMap<>();
        headers.put("alg", "RS256");
        
        Jwt jwt = new Jwt(
            "mock-token",
            Instant.now(),
            Instant.now().plusSeconds(3600),
            headers,
            claims
        );
        
        Collection<GrantedAuthority> authorities = Arrays.stream(annotation.scopes())
            .map(scope -> new SimpleGrantedAuthority("SCOPE_" + scope))
            .collect(Collectors.toList());
        
        JwtAuthenticationToken authToken = new JwtAuthenticationToken(jwt, authorities);
        
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authToken);
        return context;
    }
}
```

## Testing Reactive Controllers

This section covers tests for WebFlux controllers.

These tests verify:
- Non-blocking operations complete correctly
- Async streams produce expected data
- Error handling works in reactive flows

### Basic Reactive Controller Tests

Reactive tests use `@WebFluxTest`. This annotation tests the web layer only.

Use `WebTestClient` for testing. It handles async streams naturally. It works with Mono and Flux types.

```java
@WebFluxTest(ReactiveOrderController.class)
public class ReactiveOrderControllerTest {

    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private ReactiveOrderApplicationService orderService;
    
    @MockBean
    private OrderMapper orderMapper;
    
    @Test
    void shouldCreateOrder() {
        // Given
        CreateOrderRequest request = CreateOrderRequest.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(
                CreateOrderRequest.OrderItemRequest.builder()
                    .productId(UUID.randomUUID())
                    .quantity(2)
                    .build()
            ))
            .build();
        
        OrderCreationDto creationDto = new OrderCreationDto();
        when(orderMapper.toCreationDto(any(CreateOrderRequest.class))).thenReturn(creationDto);
        
        OrderDto orderDto = OrderDto.builder()
            .id(UUID.randomUUID())
            .customerId(request.getCustomerId())
            .status(OrderStatus.PENDING)
            .totalAmount(new BigDecimal("100.00"))
            .build();
        when(orderService.createOrder(any(OrderCreationDto.class))).thenReturn(Mono.just(orderDto));
        
        OrderResponse response = OrderResponse.builder()
            .id(orderDto.getId())
            .customerId(orderDto.getCustomerId())
            .status("PENDING")
            .totalAmount(orderDto.getTotalAmount())
            .build();
        when(orderMapper.toResponse(any(OrderDto.class))).thenReturn(response);
        
        // When & Then
        webTestClient.post().uri("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(OrderResponse.class)
            .value(orderResponse -> {
                assertThat(orderResponse.getId()).isEqualTo(response.getId());
                assertThat(orderResponse.getStatus()).isEqualTo("PENDING");
            });
        
        verify(orderService).createOrder(any(OrderCreationDto.class));
    }
    
    @Test
    void shouldGetOrder() {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderDto orderDto = OrderDto.builder()
            .id(orderId)
            .customerId(UUID.randomUUID())
            .status(OrderStatus.COMPLETED)
            .build();
        when(orderService.getOrder(orderId)).thenReturn(Mono.just(orderDto));
        
        OrderResponse response = OrderResponse.builder()
            .id(orderId)
            .status("COMPLETED")
            .build();
        when(orderMapper.toResponse(orderDto)).thenReturn(response);
        
        // When & Then
        webTestClient.get().uri("/v1/orders/{orderId}", orderId)
            .exchange()
            .expectStatus().isOk()
            .expectBody(OrderResponse.class)
            .value(orderResponse -> assertThat(orderResponse.getId()).isEqualTo(orderId));
    }
    
    @Test
    void shouldReturnNotFoundWhenOrderDoesNotExist() {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderService.getOrder(orderId)).thenReturn(Mono.empty());
        
        // When & Then
        webTestClient.get().uri("/v1/orders/{orderId}", orderId)
            .exchange()
            .expectStatus().isNotFound();
    }
    
    @Test
    void shouldStreamOrders() {
        // Given
        List<OrderDto> orders = Arrays.asList(
            OrderDto.builder().id(UUID.randomUUID()).status(OrderStatus.PENDING).build(),
            OrderDto.builder().id(UUID.randomUUID()).status(OrderStatus.COMPLETED).build()
        );
        when(orderService.streamOrders(null)).thenReturn(Flux.fromIterable(orders));
        
        when(orderMapper.toResponse(any(OrderDto.class)))
            .thenAnswer(invocation -> {
                OrderDto dto = invocation.getArgument(0);
                return OrderResponse.builder()
                    .id(dto.getId())
                    .status(dto.getStatus().name())
                    .build();
            });
        
        // When & Then
        webTestClient.get().uri("/v1/orders/stream")
            .accept(MediaType.APPLICATION_NDJSON)
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(OrderResponse.class)
            .hasSize(2)
            .value(responses -> {
                assertThat(responses.get(0).getStatus()).isEqualTo("PENDING");
                assertThat(responses.get(1).getStatus()).isEqualTo("COMPLETED");
            });
    }
}
```

### Testing Reactive Validation

Validation tests check that bad requests fail. They verify error responses are correct.

The reactive approach handles validation in async flows. Test that validation errors are reported in the response body.

```java
@WebFluxTest(ReactiveOrderController.class)
public class ReactiveOrderControllerValidationTest {

    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private ReactiveOrderApplicationService orderService;
    
    @MockBean
    private OrderMapper orderMapper;
    
    @Test
    void shouldValidateReactiveRequest() {
        // Given - Invalid request
        CreateOrderRequest invalidRequest = CreateOrderRequest.builder()
            .items(Collections.emptyList()) // Invalid - empty items
            .build();
        
        // When & Then
        webTestClient.post().uri("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(invalidRequest)
            .exchange()
            .expectStatus().isBadRequest()
            .expectBody()
            .jsonPath("$.title").isEqualTo("Validation Failed")
            .jsonPath("$.errors").isArray()
            .jsonPath("$.errors[?(@.field == 'customerId')]").exists()
            .jsonPath("$.errors[?(@.field == 'items')]").exists();
    }
    
    @Test
    void shouldHandleReactiveMonoValidation() {
        // Given
        CreateOrderRequest request = CreateOrderRequest.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(
                CreateOrderRequest.OrderItemRequest.builder()
                    .productId(UUID.randomUUID())
                    .quantity(2)
                    .build()
            ))
            .build();
        
        OrderCreationDto creationDto = new OrderCreationDto();
        when(orderMapper.toCreationDto(any(CreateOrderRequest.class))).thenReturn(creationDto);
        
        OrderDto orderDto = OrderDto.builder()
            .id(UUID.randomUUID())
            .build();
        when(orderService.createOrder(any(OrderCreationDto.class))).thenReturn(Mono.just(orderDto));
        
        OrderResponse response = OrderResponse.builder()
            .id(orderDto.getId())
            .build();
        when(orderMapper.toResponse(any(OrderDto.class))).thenReturn(response);
        
        // When & Then
        webTestClient.post().uri("/v1/orders/validated")
            .contentType(MediaType.APPLICATION_JSON)
            .body(Mono.just(request), CreateOrderRequest.class)
            .exchange()
            .expectStatus().isCreated();
    }
}
```

## Integration Testing

Integration tests run the full application.

They verify:
- Controllers work with real databases
- Services integrate correctly
- End-to-end flows succeed

### Controller Integration Tests

These tests start the entire Spring Boot application. Use `@SpringBootTest`.

Use Testcontainers to run a real database. No mocks. No isolated testing. Full integration.

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
public class OrderControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:14")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private CustomerRepository customerRepository;
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Test
    @Transactional
    void shouldCreateAndRetrieveOrder() {
        // Given - Create customer first
        Customer customer = Customer.builder()
            .id(UUID.randomUUID())
            .name("Test Customer")
            .email("test@example.com")
            .build();
        customerRepository.save(customer);
        
        CreateOrderRequest request = CreateOrderRequest.builder()
            .customerId(customer.getId())
            .items(List.of(
                CreateOrderRequest.OrderItemRequest.builder()
                    .productId(UUID.randomUUID())
                    .quantity(2)
                    .build()
            ))
            .shippingAddress(CreateOrderRequest.AddressRequest.builder()
                .street("123 Main St")
                .city("Anytown")
                .zipCode("12345")
                .build())
            .build();
        
        // When - Create order
        ResponseEntity<OrderResponse> createResponse = restTemplate.postForEntity(
            "/v1/orders", 
            request, 
            OrderResponse.class
        );
        
        // Then - Verify creation
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(createResponse.getBody()).isNotNull();
        assertThat(createResponse.getBody().getCustomerId()).isEqualTo(customer.getId());
        
        UUID orderId = createResponse.getBody().getId();
        
        // When - Retrieve order
        ResponseEntity<OrderResponse> getResponse = restTemplate.getForEntity(
            "/v1/orders/" + orderId, 
            OrderResponse.class
        );
        
        // Then - Verify retrieval
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody()).isNotNull();
        assertThat(getResponse.getBody().getId()).isEqualTo(orderId);
        
        // Verify in database
        Optional<Order> orderInDb = orderRepository.findById(orderId);
        assertThat(orderInDb).isPresent();
        assertThat(orderInDb.get().getCustomerId()).isEqualTo(customer.getId());
    }
}
```

### Reactive Integration Tests

Reactive integration tests combine WebFlux with real data sources.

They test:
- Async endpoints with real databases
- Streaming responses work correctly
- Non-blocking operations complete as expected

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
public class ReactiveOrderControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:14")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");
    
    @Autowired
    private WebTestClient webTestClient;
    
    @Autowired
    private R2dbcEntityTemplate r2dbcTemplate;
    
    @Test
    void shouldCreateAndStreamOrders() {
        // Given
        CreateOrderRequest request1 = CreateOrderRequest.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(
                CreateOrderRequest.OrderItemRequest.builder()
                    .productId(UUID.randomUUID())
                    .quantity(1)
                    .build()
            ))
            .build();
        
        CreateOrderRequest request2 = CreateOrderRequest.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(
                CreateOrderRequest.OrderItemRequest.builder()
                    .productId(UUID.randomUUID())
                    .quantity(2)
                    .build()
            ))
            .build();
        
        // When - Create orders
        List<UUID> orderIds = Flux.just(request1, request2)
            .flatMap(request -> 
                webTestClient.post().uri("/v1/orders")
                    .bodyValue(request)
                    .exchange()
                    .expectStatus().isCreated()
                    .returnResult(OrderResponse.class)
                    .getResponseBody()
                    .single()
                    .map(OrderResponse::getId)
            )
            .collectList()
            .block();
        
        // Then - Stream orders
        webTestClient.get().uri("/v1/orders/stream")
            .accept(MediaType.APPLICATION_NDJSON)
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(OrderResponse.class)
            .value(orders -> {
                assertThat(orders).hasSize(2);
                assertThat(orders.stream().map(OrderResponse::getId))
                    .containsExactlyInAnyOrderElementsOf(orderIds);
            });
    }
}
```

## Testing Best Practices

Best practices make tests cleaner. They are easier to maintain.

They reduce repetition. They improve clarity. They make intent obvious.

### 1. Test Data Builders

Test data builders create test objects. Use them instead of creating objects repeatedly.

Benefits:
- Less code in each test
- Changes to object structure need only one update
- Tests focus on what they test, not object creation

```java
public class OrderTestDataBuilder {
    
    public static CreateOrderRequest.CreateOrderRequestBuilder defaultCreateOrderRequest() {
        return CreateOrderRequest.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(defaultOrderItem()))
            .shippingAddress(defaultAddress());
    }
    
    public static CreateOrderRequest.OrderItemRequest defaultOrderItem() {
        return CreateOrderRequest.OrderItemRequest.builder()
            .productId(UUID.randomUUID())
            .quantity(1)
            .build();
    }
    
    public static CreateOrderRequest.AddressRequest defaultAddress() {
        return CreateOrderRequest.AddressRequest.builder()
            .street("123 Test St")
            .city("Test City")
            .zipCode("12345")
            .build();
    }
    
    public static OrderDto.OrderDtoBuilder defaultOrderDto() {
        return OrderDto.builder()
            .id(UUID.randomUUID())
            .customerId(UUID.randomUUID())
            .status(OrderStatus.PENDING)
            .totalAmount(new BigDecimal("100.00"))
            .createdDate(OffsetDateTime.now())
            .lastModifiedDate(OffsetDateTime.now());
    }
}

// Usage in tests
@Test
void shouldCreateOrder() {
    CreateOrderRequest request = OrderTestDataBuilder.defaultCreateOrderRequest()
        .customerId(UUID.fromString("123e4567-e89b-12d3-a456-426614174000"))
        .build();
    
    // Test implementation
}
```

### 2. Custom Test Assertions

Custom assertions express intent clearly. Tests read like plain English.

Benefits:
- Assertions are self-documenting
- Failure messages are specific and helpful
- Complex validation logic is reusable

```java
public class OrderAssertions {
    
    public static OrderResponseAssert assertThat(OrderResponse actual) {
        return new OrderResponseAssert(actual);
    }
    
    public static class OrderResponseAssert extends AbstractAssert<OrderResponseAssert, OrderResponse> {
        
        public OrderResponseAssert(OrderResponse actual) {
            super(actual, OrderResponseAssert.class);
        }
        
        public OrderResponseAssert hasId(UUID expectedId) {
            isNotNull();
            if (!Objects.equals(actual.getId(), expectedId)) {
                failWithMessage("Expected order id to be <%s> but was <%s>", 
                    expectedId, actual.getId());
            }
            return this;
        }
        
        public OrderResponseAssert hasStatus(String expectedStatus) {
            isNotNull();
            if (!Objects.equals(actual.getStatus(), expectedStatus)) {
                failWithMessage("Expected order status to be <%s> but was <%s>", 
                    expectedStatus, actual.getStatus());
            }
            return this;
        }
        
        public OrderResponseAssert hasItemCount(int expectedCount) {
            isNotNull();
            if (actual.getItems() == null || actual.getItems().size() != expectedCount) {
                failWithMessage("Expected order to have <%s> items but had <%s>", 
                    expectedCount, actual.getItems() != null ? actual.getItems().size() : 0);
            }
            return this;
        }
    }
}

// Usage
OrderAssertions.assertThat(response)
    .hasId(expectedId)
    .hasStatus("PENDING")
    .hasItemCount(2);
```

### 3. Test Configuration

Test configuration provides consistent test setup.

Use fixed clocks. Use fake implementations. This ensures:
- Tests always produce the same results
- Tests are not flaky due to timing
- External dependencies are controlled

```java
@TestConfiguration
public class ControllerTestConfig {
    
    @Bean
    @Primary
    public Clock testClock() {
        return Clock.fixed(Instant.parse("2023-01-01T00:00:00Z"), ZoneOffset.UTC);
    }
    
    @Bean
    @Primary
    public RequestIdProvider testRequestIdProvider() {
        return () -> "test-request-id";
    }
}

@TestMethodOrder(OrderAnnotation.class)
public class OrderControllerTest {
    
    @Test
    @Order(1)
    void shouldCreateOrder() {
        // Test implementation
    }
    
    @Test
    @Order(2)
    void shouldGetOrder() {
        // Test implementation
    }
}
```

## Summary

These testing strategies ensure controllers work reliably. Test different scenarios. Test edge cases.

This approach builds confidence. Your API behaves correctly. You catch bugs early. Users get a good experience.