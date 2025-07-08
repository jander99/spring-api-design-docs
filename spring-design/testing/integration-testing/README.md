# Integration Testing Standards

## Overview

This directory contains comprehensive guidelines for integration testing in Spring Boot applications, covering database integration, API testing, external service integration, and fundamental integration testing principles.

## Directory Contents

### Core Integration Testing Documentation

- **[Integration Testing Fundamentals](Integration-Testing-Fundamentals.md)**: Core principles, setup, testing strategies, and best practices for integration testing in Spring Boot applications.

- **[Database Integration Testing](Database-Integration-Testing.md)**: Comprehensive guide to testing with real databases, repository testing, transaction management, and data persistence verification using Testcontainers.

- **[API Integration Testing](API-Integration-Testing.md)**: End-to-end API testing patterns, HTTP request/response testing, and full application context integration testing.

- **[External Service Testing](External-Service-Testing.md)**: Testing external service integrations using WireMock, service virtualization, and fault tolerance testing patterns.

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

### External Service Testing
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

- [Database Configuration](../../configuration/Database-Configuration.md)
- [External Services Configuration](../../configuration/External-Services.md)
- [Error Handling Standards](../../error-handling/README.md)
- [Security Testing](../../security/Security-Testing.md)