# Integration Testing Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Authentication, Security, Architecture
> 
> **📊 Complexity:** 11.6 grade level • 3.2% technical density • difficult

## Overview

This directory has guides for integration testing in Spring Boot. Topics include databases, APIs, external services, and core testing ideas.

## Directory Contents

### Core Integration Testing Documentation

- **[Integration Testing Fundamentals](integration-testing-fundamentals.md)**: Core ideas, setup, and strategies. Learn best practices for Spring Boot testing.

- **[Database Integration Testing](database-integration-testing.md)**: Test with real databases. Covers repositories, transactions, and data storage using Testcontainers.

### API Integration Testing

- **[Spring Boot Test Fundamentals](springboot-test-fundamentals.md)**: API testing with `@SpringBootTest` and `TestRestTemplate`. Learn CRUD, validation, errors, headers, and security for Spring MVC.

- **[Reactive API Testing](reactive-api-testing.md)**: WebFlux testing with `WebTestClient`. Test reactive CRUD, streaming (NDJSON, SSE), backpressure, errors, and StepVerifier.

- **[Advanced API Testing](advanced-api-testing.md)**: HTTP features like content negotiation, CORS, rate limits, caching, and headers. Works for both imperative and reactive APIs.

### External Service Testing Documentation

- **[WireMock Testing](wiremock-testing.md)**: Mock HTTP services with WireMock. Test stubs, request checks, retries, and circuit breakers.

- **[Message Broker Testing](message-broker-testing.md)**: Test RabbitMQ and Kafka. Covers sending and receiving messages, serialization, and dead letter queues.

- **[OAuth Client Testing](oauth-client-testing.md)**: Test OAuth 2.0 and OIDC flows. Manage tokens, client credentials, auth codes, and JWT checks.

## Key Integration Testing Ideas

### Real Component Integration
- Test actual component interactions, not mocks
- Use real infrastructure like databases and message queues
- Check data flow and state changes
- Test transaction boundaries and rollbacks

### Testing Strategy
- **Test Containers**: Use Docker for real infrastructure
- **Service Mocking**: Mock external services with WireMock
- **Isolated Tests**: Each test runs alone and repeats
- **Data Cleanup**: Clean test data between tests

### Infrastructure as Code
- Define test setup with code
- Use consistent database schemas and configs
- Manage test data over time
- Make test setups repeatable

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

## Performance Tips

### Integration Test Performance
- Reuse test containers for faster startup
- Limit database work in setup and teardown
- Use the right test scopes (`@DataJpaTest`, `@WebMvcTest`)
- Run independent tests in parallel

### Resource Management
- Clean up test data after each test
- Use transaction rollback when you can
- Limit test scope to specific points
- Track test time and fix slow tests

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