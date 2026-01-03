# Spring Boot API Testing Fundamentals

## Overview

Spring Boot API testing with `@SpringBootTest` validates complete HTTP request cycles from endpoint to database. These tests exercise the full application context with real Spring infrastructure. This guide covers imperative API testing using `TestRestTemplate`.

## When to Use @SpringBootTest

Use `@SpringBootTest` when you need to:

- Test complete request-to-response cycles with real infrastructure
- Verify API contracts match specifications
- Test HTTP semantics (status codes, headers, content types)
- Validate error handling across all layers
- Test with real databases using Testcontainers
- Mock only external services while keeping internal Spring context

## Basic Setup

### Full Application Context with Random Port

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderApiIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @MockBean
    private PaymentService paymentService;

    @MockBean
    private NotificationService notificationService;
}
```

**Key Points:**
- `RANDOM_PORT` starts embedded server on random available port
- `TestRestTemplate` auto-configured with correct port
- `@Testcontainers` manages database lifecycle
- `@MockBean` replaces external service beans
- Real database tests actual persistence behavior

## Testing CRUD Operations

### Creating Resources (POST)

```java
@Test
void shouldCreateOrderViaApi() {
    // Given
    CreateOrderRequest request = CreateOrderRequest.builder()
        .customerId(UUID.randomUUID())
        .items(List.of(CreateOrderItemRequest.builder()
            .productId(UUID.randomUUID())
            .quantity(2)
            .build()))
        .build();

    when(paymentService.processPayment(any())).thenReturn(PaymentResult.success("txn-123"));

    // When
    ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
        "/v1/orders", request, OrderResponse.class);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getId()).isNotNull();
    assertThat(response.getBody().getStatus()).isEqualTo("CONFIRMED");
    assertThat(response.getHeaders().getLocation().getPath())
        .isEqualTo("/v1/orders/" + response.getBody().getId());

    // Verify data was persisted
    Optional<Order> savedOrder = orderRepository.findById(response.getBody().getId());
    assertThat(savedOrder).isPresent();
    assertThat(savedOrder.get().getCustomerId()).isEqualTo(request.getCustomerId());
}
```

**Best Practices:**
- Verify correct status code (201 Created)
- Check Location header points to new resource
- Validate response body structure
- Confirm data persisted correctly in database
- Mock external dependencies to isolate test

### Reading Resources (GET)

```java
@Test
void shouldGetOrderById() {
    // Given
    Order savedOrder = orderRepository.save(createTestOrder());

    // When
    ResponseEntity<OrderResponse> response = restTemplate.getForEntity(
        "/v1/orders/{orderId}", OrderResponse.class, savedOrder.getId());

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getId()).isEqualTo(savedOrder.getId());
    assertThat(response.getBody().getCustomerId()).isEqualTo(savedOrder.getCustomerId());
    assertThat(response.getBody().getStatus()).isEqualTo(savedOrder.getStatus().name());
}
```

### Testing Pagination

```java
@Test
void shouldGetOrdersWithPagination() {
    // Given
    UUID customerId = UUID.randomUUID();
    List<Order> orders = IntStream.range(0, 15)
        .mapToObj(i -> createTestOrder(customerId))
        .map(orderRepository::save)
        .toList();

    // When
    ResponseEntity<PagedOrderResponse> response = restTemplate.getForEntity(
        "/v1/orders?customerId={customerId}&page=0&size=10",
        PagedOrderResponse.class, customerId);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getContent()).hasSize(10);
    assertThat(response.getBody().getTotalElements()).isEqualTo(15);
    assertThat(response.getBody().getTotalPages()).isEqualTo(2);
    assertThat(response.getBody().getNumber()).isEqualTo(0);
    assertThat(response.getBody().getSize()).isEqualTo(10);
}
```

## Testing Validation

### Invalid Request Data

```java
@Test
void shouldReturnValidationErrorForInvalidRequest() {
    // Given
    CreateOrderRequest invalidRequest = CreateOrderRequest.builder()
        .customerId(null) // Missing required field
        .items(List.of()) // Empty items list
        .build();

    // When
    ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
        "/v1/orders", invalidRequest, ErrorResponse.class);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getCode()).isEqualTo("VALIDATION_ERROR");
    assertThat(response.getBody().getDetails()).isNotEmpty();
    assertThat(response.getBody().getDetails())
        .anyMatch(detail -> detail.getField().equals("customerId"))
        .anyMatch(detail -> detail.getField().equals("items"));
}
```

**Validation Testing Checklist:**
- Test missing required fields
- Test invalid data formats
- Test business rule violations
- Verify error messages contain field names
- Confirm 400 Bad Request status code

## Testing Error Handling

### Resource Not Found

```java
@Test
void shouldReturnNotFoundForNonExistentOrder() {
    // Given
    UUID nonExistentId = UUID.randomUUID();

    // When
    ResponseEntity<ErrorResponse> response = restTemplate.getForEntity(
        "/v1/orders/{orderId}", ErrorResponse.class, nonExistentId);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getCode()).isEqualTo("RESOURCE_NOT_FOUND");
    assertThat(response.getBody().getInstance()).contains(nonExistentId.toString());
}
```

### Business Logic Errors

```java
@Test
void shouldHandleBusinessRuleViolations() {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    when(paymentService.processPayment(any()))
        .thenThrow(new PaymentDeclinedException("Card declined"));

    // When
    ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
        "/v1/orders", request, ErrorResponse.class);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    assertThat(response.getBody().getCode()).isEqualTo("PAYMENT_DECLINED");
}
```

## Testing HTTP Headers and Content Types

### Response Headers

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderApiHeadersTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldSetCorrectResponseHeaders() {
        // Given
        CreateOrderRequest request = createValidOrderRequest();

        // When
        ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
            "/v1/orders", request, OrderResponse.class);

        // Then
        assertThat(response.getHeaders().getContentType())
            .isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(response.getHeaders().getLocation()).isNotNull();
        assertThat(response.getHeaders().get("X-Request-ID")).isNotEmpty();
        assertThat(response.getHeaders().getCacheControl()).isNotNull();
    }
}
```

### Content Type Validation

```java
@Test
void shouldAcceptJsonContentType() {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    HttpEntity<CreateOrderRequest> entity = new HttpEntity<>(request, headers);

    // When
    ResponseEntity<OrderResponse> response = restTemplate.exchange(
        "/v1/orders", HttpMethod.POST, entity, OrderResponse.class);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
}

@Test
void shouldRejectUnsupportedContentType() {
    // Given
    String xmlRequest = "<order><customerId>123</customerId></order>";
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_XML);
    HttpEntity<String> entity = new HttpEntity<>(xmlRequest, headers);

    // When
    ResponseEntity<ErrorResponse> response = restTemplate.exchange(
        "/v1/orders", HttpMethod.POST, entity, ErrorResponse.class);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
}
```

### Accept Headers

```java
@Test
void shouldHandleAcceptHeaders() {
    // Given
    UUID orderId = createPersistedOrder().getId();
    HttpHeaders headers = new HttpHeaders();
    headers.setAccept(List.of(MediaType.APPLICATION_JSON));
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    // When
    ResponseEntity<OrderResponse> response = restTemplate.exchange(
        "/v1/orders/{orderId}", HttpMethod.GET, entity, OrderResponse.class, orderId);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
}
```

## Testing Security

### Authentication Testing

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(OrderAnnotation.class)
class OrderApiSecurityTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @Order(1)
    void shouldReturnUnauthorizedWithoutToken() {
        // Given
        CreateOrderRequest request = createValidOrderRequest();

        // When
        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/v1/orders", request, ErrorResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @Order(2)
    void shouldAllowAccessWithValidToken() {
        // Given
        CreateOrderRequest request = createValidOrderRequest();
        String validToken = generateValidJwtToken("user", List.of("ROLE_USER"));
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(validToken);
        HttpEntity<CreateOrderRequest> entity = new HttpEntity<>(request, headers);

        // When
        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            "/v1/orders", HttpMethod.POST, entity, OrderResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @Order(3)
    void shouldDenyAccessWithInvalidToken() {
        // Given
        CreateOrderRequest request = createValidOrderRequest();
        String invalidToken = "invalid.jwt.token";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(invalidToken);
        HttpEntity<CreateOrderRequest> entity = new HttpEntity<>(request, headers);

        // When
        ResponseEntity<ErrorResponse> response = restTemplate.exchange(
            "/v1/orders", HttpMethod.POST, entity, ErrorResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
```

### Authorization Testing

```java
@Test
void shouldEnforceRoleBasedAccess() {
    // Given
    UUID orderId = createPersistedOrder().getId();
    String userToken = generateValidJwtToken("user", List.of("ROLE_USER"));
    
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(userToken);
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    // When
    ResponseEntity<ErrorResponse> response = restTemplate.exchange(
        "/v1/admin/orders/{orderId}", HttpMethod.DELETE, entity, ErrorResponse.class, orderId);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
}
```

## Best Practices

### 1. Test Complete Request Cycles

```java
// Good: Test full HTTP cycle
@Test
void shouldCreateOrderEndToEnd() {
    ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
        "/v1/orders", request, OrderResponse.class);
    
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(response.getBody().getId()).isNotNull();
    
    // Verify persistence
    Order savedOrder = orderRepository.findById(response.getBody().getId()).orElseThrow();
    assertThat(savedOrder.getCustomerId()).isEqualTo(request.getCustomerId());
}

// Bad: Test only controller logic without HTTP layer
@Test
void shouldReturnOrder() {
    // This belongs in controller unit tests
}
```

### 2. Mock External Dependencies

```java
// Good: Mock external services
@MockBean
private PaymentService paymentService;

@MockBean
private NotificationService notificationService;

@Test
void shouldCreateOrder() {
    when(paymentService.processPayment(any())).thenReturn(PaymentResult.success("txn-123"));
    // Test API behavior
}

// Bad: Use real external services
@Test
void shouldCreateOrder() {
    // Calling real payment service makes test slow and unreliable
}
```

### 3. Verify HTTP Semantics

```java
@Test
void shouldFollowHttpSemantics() {
    // POST should return 201 with Location header
    ResponseEntity<OrderResponse> createResponse = restTemplate.postForEntity(
        "/v1/orders", request, OrderResponse.class);
    
    assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(createResponse.getHeaders().getLocation()).isNotNull();
    
    // GET should return 200
    ResponseEntity<OrderResponse> getResponse = restTemplate.getForEntity(
        createResponse.getHeaders().getLocation(), OrderResponse.class);
    
    assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    
    // PUT should return 200 or 204
    ResponseEntity<OrderResponse> updateResponse = restTemplate.exchange(
        createResponse.getHeaders().getLocation(), HttpMethod.PUT, 
        new HttpEntity<>(updateRequest), OrderResponse.class);
    
    assertThat(updateResponse.getStatusCode())
        .isIn(HttpStatus.OK, HttpStatus.NO_CONTENT);
}
```

### 4. Use Test Data Builders

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

private Order createTestOrder(UUID customerId) {
    return Order.builder()
        .customerId(customerId)
        .status(OrderStatus.CREATED)
        .totalAmount(BigDecimal.valueOf(100.00))
        .createdDate(OffsetDateTime.now())
        .items(List.of())
        .build();
}
```

## Common Pitfalls

### Pitfall 1: Not Verifying Persistence

```java
// Bad: Only check response
@Test
void shouldCreateOrder() {
    ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
        "/v1/orders", request, OrderResponse.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
}

// Good: Verify data was persisted
@Test
void shouldCreateOrder() {
    ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
        "/v1/orders", request, OrderResponse.class);
    
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    
    Order saved = orderRepository.findById(response.getBody().getId()).orElseThrow();
    assertThat(saved.getCustomerId()).isEqualTo(request.getCustomerId());
}
```

### Pitfall 2: Ignoring HTTP Headers

```java
// Bad: Only check body
@Test
void shouldCreateOrder() {
    ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
        "/v1/orders", request, OrderResponse.class);
    assertThat(response.getBody()).isNotNull();
}

// Good: Verify status, headers, and body
@Test
void shouldCreateOrder() {
    ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
        "/v1/orders", request, OrderResponse.class);
    
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(response.getHeaders().getLocation()).isNotNull();
    assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
    assertThat(response.getBody()).isNotNull();
}
```

### Pitfall 3: Testing Too Much in One Test

```java
// Bad: Testing multiple scenarios in one test
@Test
void shouldHandleOrders() {
    // Creates order
    // Gets order
    // Updates order
    // Deletes order
    // Tests validation
    // Tests errors
}

// Good: Separate focused tests
@Test
void shouldCreateOrder() { }

@Test
void shouldGetOrder() { }

@Test
void shouldUpdateOrder() { }

@Test
void shouldDeleteOrder() { }

@Test
void shouldValidateOrderRequest() { }

@Test
void shouldHandleNotFoundError() { }
```

## Related Documentation

- [Integration Testing Fundamentals](integration-testing-fundamentals.md) - Core integration testing principles
- [Reactive API Testing](reactive-api-testing.md) - WebTestClient for reactive endpoints
- [Advanced API Testing](advanced-api-testing.md) - CORS, rate limiting, content negotiation
- [Database Integration Testing](database-integration-testing.md) - Testing with real databases
- [External Service Testing](external-service-testing.md) - Testing with external service integrations
