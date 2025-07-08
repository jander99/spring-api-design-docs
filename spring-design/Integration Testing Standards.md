# Integration Testing Standards

## Overview

Integration tests verify that multiple components work together correctly. This document outlines our standards for integration testing in Spring Boot applications.

## Core Principles

1. **Test Real Interactions**: Verify actual integration between components
2. **Limited Scope**: Focus on specific integration points
3. **Test Isolation**: Use separate test databases/infrastructure  
4. **Representative Data**: Use realistic test data

## Structure and Organization

### Package Structure

Organize integration tests in a dedicated package:

```
src/test/java/com/example/{service-name}/
└── integration/              # Integration tests
    ├── repository/           # Repository integration tests
    ├── service/              # Service integration tests  
    ├── controller/           # API integration tests
    └── external/             # External service integration tests
```

### Naming Conventions

| Test Type | Test Class Name |
|-----------|----------------|
| Integration Tests | `{Component}IntegrationTest` |

## Testing Approaches

### Database Integration Tests

- Use `@DataJpaTest` or `@DataR2dbcTest` for repository tests
- Configure test database with test-specific properties
- Use test containers for database integration tests
- Set up and tear down test data for each test

### API Integration Tests

- Use `@WebMvcTest` or `@WebFluxTest` for controller-level tests
- Use `@SpringBootTest` with `WebEnvironment.RANDOM_PORT` for full API tests
- Test request/response cycles including serialization/deserialization
- Verify correct status codes, headers, and response bodies

### External Service Integration Tests

- Use WireMock to simulate external service responses
- Test both successful and error scenarios
- Verify correct request formatting and response handling
- Test timeout and retry mechanisms

### Messaging Integration Tests

- Use embedded message brokers for tests (RabbitMQ, Kafka)
- Test message production and consumption
- Verify correct message structure and routing
- Test error handling and dead letter queues

## Test Data Management

### Test Database Setup

- Use Flyway or Liquibase for schema creation
- Separate test data migration scripts
- Reset database between tests
- Use transaction rollback for test isolation

### Test Containers

- Use Testcontainers for realistic infrastructure components
- Define reusable container configurations
- Use container composition for complex setups
- Optimize container startup for faster tests

## Reactive Integration Testing

- Use `WebTestClient` for testing reactive APIs
- Test both sync and async interactions
- Verify correct backpressure handling
- Test streaming endpoints

## Security In Integration Tests

- Test with security contexts
- Verify authorization rules
- Test with different user roles
- Verify secured endpoints reject unauthorized access

## Test Configuration

### Application Properties

```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    username: sa
    password: password
  jpa:
    hibernate:
      ddl-auto: create-drop
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:9999/auth/realms/test
```

### Test Profiles

- Use `@ActiveProfiles("test")` to activate test configurations
- Override beans for testing with `@TestConfiguration`
- Replace external dependencies with test doubles

## Performance Considerations

- Keep integration tests focused and fast
- Limit the number of slow tests
- Consider separating slow integration tests into a separate suite
- Use parallel test execution where possible

## Common Integration Test Patterns

### Repository Layer Integration Tests

Test CRUD operations against real database:

```java
@DataJpaTest
@Testcontainers
class OrderRepositoryIntegrationTest {

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
    private TestEntityManager entityManager;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldFindOrdersByCustomerId() {
        // Given
        UUID customerId = UUID.randomUUID();
        Order order1 = createTestOrder(customerId, OrderStatus.CREATED);
        Order order2 = createTestOrder(customerId, OrderStatus.CONFIRMED);
        entityManager.persistAndFlush(order1);
        entityManager.persistAndFlush(order2);

        // When
        List<Order> orders = orderRepository.findByCustomerId(customerId);

        // Then
        assertThat(orders).hasSize(2);
        assertThat(orders).extracting(Order::getCustomerId)
            .containsOnly(customerId);
    }

    @Test
    void shouldFindOrdersByStatusAndDateRange() {
        // Given
        OffsetDateTime startDate = OffsetDateTime.now().minusDays(7);
        OffsetDateTime endDate = OffsetDateTime.now();
        
        Order order1 = createTestOrder(UUID.randomUUID(), OrderStatus.CONFIRMED);
        order1.setCreatedDate(startDate.plusDays(1));
        
        Order order2 = createTestOrder(UUID.randomUUID(), OrderStatus.CONFIRMED);
        order2.setCreatedDate(startDate.minusDays(1)); // Outside range
        
        entityManager.persistAndFlush(order1);
        entityManager.persistAndFlush(order2);

        // When
        Page<Order> result = orderRepository.findByStatusAndCreatedDateBetween(
            OrderStatus.CONFIRMED, startDate, endDate, PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(order1.getId());
    }

    private Order createTestOrder(UUID customerId, OrderStatus status) {
        return Order.builder()
            .customerId(customerId)
            .status(status)
            .totalAmount(BigDecimal.valueOf(100.00))
            .items(List.of())
            .build();
    }
}
```

### Reactive Repository Integration Tests

```java
@DataR2dbcTest
@Testcontainers
class ReactiveOrderRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.r2dbc.url", () -> "r2dbc:postgresql://" + 
            postgres.getHost() + ":" + postgres.getFirstMappedPort() + "/testdb");
        registry.add("spring.r2dbc.username", postgres::getUsername);
        registry.add("spring.r2dbc.password", postgres::getPassword);
    }

    @Autowired
    private ReactiveOrderRepository orderRepository;

    @Test
    void shouldSaveAndRetrieveOrder() {
        // Given
        Order order = createTestOrder(UUID.randomUUID(), OrderStatus.CREATED);

        // When & Then
        StepVerifier.create(
            orderRepository.save(order)
                .flatMap(savedOrder -> orderRepository.findById(savedOrder.getId()))
        )
        .assertNext(retrievedOrder -> {
            assertThat(retrievedOrder.getCustomerId()).isEqualTo(order.getCustomerId());
            assertThat(retrievedOrder.getStatus()).isEqualTo(order.getStatus());
        })
        .verifyComplete();
    }

    @Test
    void shouldStreamOrdersByStatus() {
        // Given
        Flux<Order> orders = Flux.range(1, 10)
            .map(i -> createTestOrder(UUID.randomUUID(), OrderStatus.CREATED))
            .flatMap(orderRepository::save);

        // When & Then
        StepVerifier.create(
            orders.then()
                .thenMany(orderRepository.findByStatus(OrderStatus.CREATED))
        )
        .expectNextCount(10)
        .verifyComplete();
    }
}
```

### Service Layer Integration Tests

Test service interactions with repositories and verify transaction boundaries:

```java
@SpringBootTest
@Transactional
@Testcontainers
class OrderServiceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @MockBean
    private PaymentService paymentService;

    @MockBean
    private InventoryService inventoryService;

    @Test
    void shouldCreateOrderWithInventoryCheck() {
        // Given
        OrderCreationDto orderDto = createOrderCreationDto();
        when(inventoryService.checkAvailability(any(), anyInt())).thenReturn(true);
        when(paymentService.processPayment(any())).thenReturn(PaymentResult.success("txn-123"));

        // When
        OrderDto result = orderService.createOrder(orderDto);

        // Then
        assertThat(result.getId()).isNotNull();
        assertThat(result.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        
        // Verify order was persisted
        Optional<Order> savedOrder = orderRepository.findById(result.getId());
        assertThat(savedOrder).isPresent();
        assertThat(savedOrder.get().getCustomerId()).isEqualTo(orderDto.getCustomerId());
    }

    @Test
    void shouldRollbackOrderCreationOnPaymentFailure() {
        // Given
        OrderCreationDto orderDto = createOrderCreationDto();
        when(inventoryService.checkAvailability(any(), anyInt())).thenReturn(true);
        when(paymentService.processPayment(any()))
            .thenThrow(new PaymentException("Payment failed"));

        // When & Then
        assertThrows(PaymentException.class, () -> orderService.createOrder(orderDto));
        
        // Verify no order was persisted due to rollback
        List<Order> orders = orderRepository.findByCustomerId(orderDto.getCustomerId());
        assertThat(orders).isEmpty();
    }

    private OrderCreationDto createOrderCreationDto() {
        return OrderCreationDto.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(OrderItemDto.builder()
                .productId(UUID.randomUUID())
                .quantity(2)
                .build()))
            .build();
    }
}
```

### Controller Layer Integration Tests

Test API contracts and verify serialization/deserialization:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

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

    @Test
    void shouldCreateOrderViaApi() {
        // Given
        CreateOrderRequest request = createOrderRequest();
        when(paymentService.processPayment(any())).thenReturn(PaymentResult.success("txn-123"));

        // When
        ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
            "/v1/orders", request, OrderResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("CONFIRMED");
    }

    @Test
    void shouldReturnValidationErrorForInvalidRequest() {
        // Given
        CreateOrderRequest invalidRequest = new CreateOrderRequest();
        // Missing required fields

        // When
        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/v1/orders", invalidRequest, ErrorResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().getDetails()).isNotEmpty();
    }

    @Test
    void shouldReturnOrderById() {
        // Given
        Order savedOrder = orderRepository.save(createTestOrder());

        // When
        ResponseEntity<OrderResponse> response = restTemplate.getForEntity(
            "/v1/orders/{orderId}", OrderResponse.class, savedOrder.getId());

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(savedOrder.getId());
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
    }
}
```

### External Service Integration Tests

Test service-to-service interactions using WireMock:

```java
@SpringBootTest
@Testcontainers
class PaymentServiceClientIntegrationTest {

    @RegisterExtension
    static WireMockExtension wireMock = WireMockExtension.newInstance()
        .options(wireMockConfig().port(8089))
        .build();

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        public PaymentServiceClient paymentServiceClient() {
            return new PaymentServiceClient(
                WebClient.builder().baseUrl("http://localhost:8089").build()
            );
        }
    }

    @Autowired
    private PaymentServiceClient paymentServiceClient;

    @Test
    void shouldProcessPaymentSuccessfully() {
        // Given
        PaymentRequest request = PaymentRequest.builder()
            .orderId(UUID.randomUUID())
            .amount(BigDecimal.valueOf(100.00))
            .currency("USD")
            .build();

        wireMock.stubFor(post(urlEqualTo("/v1/payments"))
            .withRequestBody(matchingJsonPath("$.orderId"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "transactionId": "txn-123",
                        "status": "COMPLETED",
                        "amount": 100.00
                    }
                    """)));

        // When
        PaymentResult result = paymentServiceClient.processPayment(request);

        // Then
        assertThat(result.getTransactionId()).isEqualTo("txn-123");
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        
        wireMock.verify(postRequestedFor(urlEqualTo("/v1/payments"))
            .withRequestBody(matchingJsonPath("$.orderId", equalTo(request.getOrderId().toString()))));
    }

    @Test
    void shouldHandlePaymentServiceTimeout() {
        // Given
        PaymentRequest request = PaymentRequest.builder()
            .orderId(UUID.randomUUID())
            .amount(BigDecimal.valueOf(100.00))
            .currency("USD")
            .build();

        wireMock.stubFor(post(urlEqualTo("/v1/payments"))
            .willReturn(aResponse()
                .withStatus(200)
                .withFixedDelay(5000))); // Longer than client timeout

        // When & Then
        assertThrows(PaymentServiceException.class, 
            () -> paymentServiceClient.processPayment(request));
    }
}
```

## Common Anti-patterns to Avoid

1. **Excessive setup**: Keep test setup focused and minimal
2. **Testing everything together**: Limit scope to specific integration points
3. **Flaky tests**: Ensure consistent test results
4. **Slow test suites**: Optimize for reasonable execution time
5. **Using production systems**: Use test containers or embedded alternatives

## CI/CD Integration

- Run integration tests in CI pipeline after unit tests
- Set up dedicated test environments
- Cache test containers to speed up execution
- Configure retry mechanism for flaky tests