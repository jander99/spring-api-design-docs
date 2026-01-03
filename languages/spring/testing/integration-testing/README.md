# Integration Testing Standards

## Overview

This directory contains comprehensive guidelines for integration testing in Spring Boot applications, covering database integration, API testing, external service integration, and fundamental integration testing principles.

## Directory Contents

### Core Integration Testing Documentation

- **[Integration Testing Fundamentals](integration-testing-fundamentals.md)**: Core principles, setup, testing strategies, and best practices for integration testing in Spring Boot applications.

- **[Database Integration Testing](database-integration-testing.md)**: Comprehensive guide to testing with real databases, repository testing, transaction management, and data persistence verification using Testcontainers.

### API Integration Testing

- **[Spring Boot Test Fundamentals](springboot-test-fundamentals.md)**: Complete guide to API testing with `@SpringBootTest` and `TestRestTemplate`. Covers CRUD operations, validation, error handling, HTTP headers, and security testing for imperative Spring MVC applications.

- **[Reactive API Testing](reactive-api-testing.md)**: WebFlux testing with `WebTestClient`. Covers reactive CRUD operations, streaming endpoints (NDJSON, SSE), backpressure, reactive error handling, and StepVerifier patterns.

- **[Advanced API Testing](advanced-api-testing.md)**: HTTP-specific features including content negotiation, CORS policies, rate limiting, HTTP caching, and custom headers. Advanced patterns for both imperative and reactive APIs.

### External Service Testing Documentation

- **[WireMock Testing](wiremock-testing.md)**: HTTP service mocking with WireMock, stubbing patterns, request verification, retry logic testing, and circuit breaker testing.

- **[Message Broker Testing](message-broker-testing.md)**: RabbitMQ and Kafka integration testing, message production and consumption, serialization testing, and dead letter queue handling.

- **[OAuth Client Testing](oauth-client-testing.md)**: OAuth 2.0 and OIDC flow testing, token lifecycle management, client credentials flow, authorization code flow, and JWT validation.

## Key Integration Testing Principles

### Real Component Integration
- Test actual component interactions, not mocked collaborations
- Use real infrastructure components (databases, message queues)
- Verify data flow and state changes across boundaries
- Test transaction boundaries and rollback scenarios

### Testing Strategy
- **Test Containers**: Use Docker containers for realistic infrastructure
- **Service Virtualization**: Mock external services with WireMock
- **Isolated Tests**: Each test should be independent and repeatable
- **Data Management**: Clean test data between tests

### Infrastructure as Code
- Define test infrastructure declaratively
- Use consistent database schemas and configurations
- Manage test data lifecycle properly
- Ensure test environment reproducibility

## Quick Reference

### Database Integration Testing
```java
@DataJpaTest
@Testcontainers
class OrderRepositoryTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Test
    void shouldSaveAndRetrieveOrder() {
        // Given
        Order order = Order.builder()
            .customerId(1L)
            .status(OrderStatus.CREATED)
            .build();
        
        // When
        Order savedOrder = orderRepository.save(order);
        entityManager.flush();
        entityManager.clear();
        
        // Then
        Optional<Order> retrieved = orderRepository.findById(savedOrder.getId());
        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().getCustomerId()).isEqualTo(1L);
    }
}
```

### API Integration Testing
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderApiIntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldCreateOrderViaApi() {
        // Given
        CreateOrderRequest request = CreateOrderRequest.builder()
            .customerId(1L)
            .items(List.of(createOrderItem()))
            .build();
        
        // When
        ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
            "/v1/orders", 
            request, 
            OrderResponse.class
        );
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getId()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("CREATED");
    }
}
```

### WireMock HTTP Service Testing
```java
@SpringBootTest
class PaymentServiceIntegrationTest {
    @RegisterExtension
    static WireMockExtension wireMock = WireMockExtension.newInstance()
        .options(wireMockConfig().port(8089))
        .build();
    
    @Autowired
    private PaymentService paymentService;
    
    @Test
    void shouldProcessPayment_whenExternalServiceResponds() {
        // Given
        PaymentRequest request = createPaymentRequest();
        wireMock.stubFor(post(urlEqualTo("/payments"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"status\":\"COMPLETED\",\"transactionId\":\"txn-123\"}")));
        
        // When
        PaymentResult result = paymentService.processPayment(request);
        
        // Then
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(result.getTransactionId()).isEqualTo("txn-123");
        
        // Verify external service was called
        wireMock.verify(postRequestedFor(urlEqualTo("/payments"))
            .withHeader("Content-Type", equalTo("application/json")));
    }
}
```

### Message Broker Integration Testing
```java
@SpringBootTest
@Testcontainers
class OrderEventIntegrationTest {
    @Container
    static RabbitMQContainer rabbitMQ = new RabbitMQContainer("rabbitmq:3.11-management");
    
    @Autowired
    private OrderEventPublisher eventPublisher;
    
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @Test
    void shouldPublishOrderCreatedEvent() {
        // Given
        OrderCreatedEvent event = OrderCreatedEvent.builder()
            .orderId(UUID.randomUUID())
            .customerId(UUID.randomUUID())
            .totalAmount(BigDecimal.valueOf(100.00))
            .build();
        
        // When
        eventPublisher.publishOrderCreated(event);
        
        // Then
        Message message = rabbitTemplate.receive("order.events.created", 5000);
        assertThat(message).isNotNull();
    }
}
```

### OAuth Client Testing
```java
@SpringBootTest
class OAuthClientIntegrationTest {
    @RegisterExtension
    static WireMockExtension authServer = WireMockExtension.newInstance()
        .options(wireMockConfig().port(8090))
        .build();
    
    @Test
    void shouldObtainAccessTokenViaClientCredentials() {
        // Given
        authServer.stubFor(post(urlEqualTo("/oauth/token"))
            .withRequestBody(containing("grant_type=client_credentials"))
            .willReturn(aResponse()
                .withStatus(200)
                .withBody("""
                    {
                        "access_token": "access-token-123",
                        "token_type": "Bearer",
                        "expires_in": 3600
                    }
                    """)));
        
        // When
        UserProfile profile = externalApiClient.getUserProfile("user-123");
        
        // Then
        assertThat(profile.getId()).isEqualTo("user-123");
        authServer.verify(postRequestedFor(urlEqualTo("/oauth/token")));
    }
}
```

### Reactive Integration Testing
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ReactiveOrderApiTest {
    @Autowired
    private WebTestClient webTestClient;
    
    @Test
    void shouldCreateOrderReactively() {
        // Given
        CreateOrderRequest request = createValidOrderRequest();
        
        // When & Then
        webTestClient.post()
            .uri("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(OrderResponse.class)
            .value(response -> {
                assertThat(response.getId()).isNotNull();
                assertThat(response.getStatus()).isEqualTo("CREATED");
            });
    }
}
```

## Testing Infrastructure

### Test Containers Configuration
```java
@Testcontainers
public class IntegrationTestBase {
    @Container
    protected static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("integration_test")
        .withUsername("test")
        .withPassword("test")
        .withReuse(true);
    
    @Container
    protected static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379)
        .withReuse(true);
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
    }
}
```

### WireMock Configuration
```java
@TestConfiguration
public class WireMockConfig {
    @Bean
    @Primary
    public PaymentServiceClient paymentServiceClient() {
        return new PaymentServiceClient("http://localhost:8089");
    }
    
    @Bean
    public WireMockServer wireMockServer() {
        WireMockServer wireMockServer = new WireMockServer(8089);
        wireMockServer.start();
        return wireMockServer;
    }
}
```

## Test Data Management

### Database Test Data
```java
@Component
public class TestDataBuilder {
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private CustomerRepository customerRepository;
    
    @Transactional
    public Order createTestOrder(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
            .orElseGet(() -> createTestCustomer(customerId));
        
        return orderRepository.save(Order.builder()
            .customerId(customer.getId())
            .status(OrderStatus.CREATED)
            .createdAt(Instant.now())
            .build());
    }
    
    @Transactional
    public Customer createTestCustomer(Long id) {
        return customerRepository.save(Customer.builder()
            .id(id)
            .name("Test Customer " + id)
            .email("test" + id + "@example.com")
            .build());
    }
}
```

### Test Cleanup
```java
@TestMethodOrder(OrderAnnotation.class)
class OrderIntegrationTest {
    @Autowired
    private OrderRepository orderRepository;
    
    @AfterEach
    void cleanup() {
        orderRepository.deleteAll();
    }
    
    @Test
    @Order(1)
    void shouldCreateOrder() {
        // Test implementation
    }
}
```

## Performance Considerations

### Integration Test Performance
- Use test container reuse for faster startup
- Minimize database operations in setup/teardown
- Use appropriate test scopes (`@DataJpaTest`, `@WebMvcTest`)
- Consider parallel test execution for independent tests

### Resource Management
- Clean up test data after each test
- Use transaction rollback where appropriate
- Limit test scope to specific integration points
- Monitor test execution time and optimize slow tests

## Navigation

- [← Back to Testing Standards](../README.md)
- [Unit Testing](../unit-testing/README.md)
- [Specialized Testing](../specialized-testing/README.md)
- [Spring Design Home](../../README.md)

## Related Documentation

- [Database Configuration](../../configuration/database-configuration.md)
- [External Services Configuration](../../configuration/external-services.md)
- [Error Handling Standards](../../error-handling/README.md)
- [Security Testing](../../security/security-testing.md)