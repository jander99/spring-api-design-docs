# API Integration Testing

## Overview

API integration testing verifies that HTTP endpoints work correctly from request to response, including request validation, business logic execution, response formatting, and error handling. These tests exercise the complete web layer stack with real Spring context.

## Core Principles

1. **Test Complete Request Cycles**: Test from HTTP request to HTTP response
2. **Verify API Contracts**: Ensure request/response formats match specifications
3. **Test HTTP Semantics**: Verify correct status codes, headers, and content types
4. **Validate Error Handling**: Test error responses and edge cases
5. **Mock External Dependencies**: Isolate API tests from external services

## Spring Boot API Testing Approaches

### Full Application Context Testing

Use `@SpringBootTest` with `RANDOM_PORT` for complete API integration tests.

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

    private Order createTestOrder() {
        return createTestOrder(UUID.randomUUID());
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
}
```

### Testing HTTP Headers and Content Types

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
}
```

### Testing Security and Authentication

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

    @Test
    @Order(4)
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

    private String generateValidJwtToken(String username, List<String> roles) {
        // Implementation to generate valid JWT token for testing
        return "valid.jwt.token"; // Simplified for example
    }
}
```

## Reactive API Testing

Use `WebTestClient` for testing reactive endpoints.

### Basic Reactive API Testing

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

    @Test
    void shouldCreateOrderReactively() {
        // Given
        CreateOrderRequest request = createValidOrderRequest();
        when(paymentService.processPayment(any())).thenReturn(Mono.just(PaymentResult.success("txn-123")));

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
}
```

### Testing Error Handling in Reactive APIs

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

@Test
void shouldHandleServiceErrorsInStream() {
    // Given
    when(orderService.streamOrders()).thenReturn(Flux.error(new RuntimeException("Service error")));

    // When & Then
    webTestClient.get()
        .uri("/v1/orders/stream")
        .accept(MediaType.APPLICATION_NDJSON)
        .exchange()
        .expectStatus().is5xxServerError();
}
```

## Content Negotiation Testing

Test API responses based on Accept headers and content type negotiation.

### Testing Different Response Formats

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ContentNegotiationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldReturnJsonByDefault() {
        // Given
        UUID orderId = createPersistedOrder().getId();

        // When
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/v1/orders/{orderId}", String.class, orderId);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(response.getBody()).startsWith("{");
    }

    @Test
    void shouldReturnXmlWhenRequested() {
        // Given
        UUID orderId = createPersistedOrder().getId();
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_XML));
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // When
        ResponseEntity<String> response = restTemplate.exchange(
            "/v1/orders/{orderId}", HttpMethod.GET, entity, String.class, orderId);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_XML);
        assertThat(response.getBody()).startsWith("<?xml");
    }

    @Test
    void shouldReturnNotAcceptableForUnsupportedFormat() {
        // Given
        UUID orderId = createPersistedOrder().getId();
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_PDF)); // Unsupported format
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // When
        ResponseEntity<ErrorResponse> response = restTemplate.exchange(
            "/v1/orders/{orderId}", HttpMethod.GET, entity, ErrorResponse.class, orderId);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_ACCEPTABLE);
    }
}
```

## CORS Testing

Test Cross-Origin Resource Sharing configuration.

### Testing CORS Headers

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CorsIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldHandlePreflightRequest() {
        // Given
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("https://example.com");
        headers.setAccessControlRequestMethod(HttpMethod.POST);
        headers.setAccessControlRequestHeaders(List.of("Content-Type", "Authorization"));
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // When
        ResponseEntity<Void> response = restTemplate.exchange(
            "/v1/orders", HttpMethod.OPTIONS, entity, Void.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo("https://example.com");
        assertThat(response.getHeaders().getAccessControlAllowMethods())
            .contains(HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE);
        assertThat(response.getHeaders().getAccessControlAllowHeaders())
            .contains("Content-Type", "Authorization");
    }

    @Test
    void shouldRejectUnauthorizedOrigin() {
        // Given
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("https://malicious-site.com");
        headers.setAccessControlRequestMethod(HttpMethod.POST);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // When
        ResponseEntity<Void> response = restTemplate.exchange(
            "/v1/orders", HttpMethod.OPTIONS, entity, Void.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
```

## Rate Limiting Testing

Test API rate limiting and throttling mechanisms.

### Testing Rate Limits

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RateLimitingTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldEnforceRateLimit() {
        // Given
        CreateOrderRequest request = createValidOrderRequest();
        String clientId = "test-client";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Client-ID", clientId);
        HttpEntity<CreateOrderRequest> entity = new HttpEntity<>(request, headers);

        // When - Make requests up to the limit
        for (int i = 0; i < 10; i++) {
            ResponseEntity<OrderResponse> response = restTemplate.exchange(
                "/v1/orders", HttpMethod.POST, entity, OrderResponse.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        }

        // When - Exceed the rate limit
        ResponseEntity<ErrorResponse> response = restTemplate.exchange(
            "/v1/orders", HttpMethod.POST, entity, ErrorResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(response.getHeaders().get("X-RateLimit-Remaining")).contains("0");
        assertThat(response.getHeaders().get("Retry-After")).isNotEmpty();
    }
}
```

## API Integration Testing Best Practices

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

// Bad: Test only controller logic
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

### 3. Test Error Scenarios

```java
@Test
void shouldHandleValidationErrors() {
    CreateOrderRequest invalidRequest = new CreateOrderRequest(); // Missing required fields
    
    ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
        "/v1/orders", invalidRequest, ErrorResponse.class);
    
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(response.getBody().getCode()).isEqualTo("VALIDATION_ERROR");
}

@Test
void shouldHandleBusinessRuleViolations() {
    when(paymentService.processPayment(any()))
        .thenThrow(new PaymentDeclinedException("Card declined"));
    
    ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
        "/v1/orders", request, ErrorResponse.class);
    
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
}
```

### 4. Verify HTTP Semantics

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

### 5. Use Appropriate Test Data

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
- [Controller Unit Testing](../unit-testing/controller-unit-testing.md) - Unit testing controllers in isolation
- [External Service Testing](external-service-testing.md) - Testing with external service integrations
- [Database Integration Testing](database-integration-testing.md) - Testing with real databases