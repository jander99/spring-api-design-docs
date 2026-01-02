# Integration Testing Fundamentals

## Overview

Integration tests verify that multiple components work together correctly. This document outlines our standards for integration testing in Spring Boot applications, focusing on testing real interactions between components while maintaining test isolation and reliability.

## Core Principles

1. **Test Real Interactions**: Verify actual integration between components rather than mocked interactions
2. **Limited Scope**: Focus on specific integration points, not end-to-end system testing
3. **Test Isolation**: Use separate test databases and infrastructure to avoid test interference
4. **Representative Data**: Use realistic test data that reflects production scenarios
5. **Fast and Reliable**: Keep integration tests reasonably fast and deterministic

## Integration Test Categories

### Database Integration Tests
- Test repository layer with real database interactions
- Verify complex queries, transactions, and database constraints
- Use embedded databases or test containers for isolation

### API Integration Tests
- Test complete request/response cycles through controllers
- Verify serialization/deserialization and HTTP semantics
- Test with real Spring context but mocked external dependencies

### External Service Integration Tests
- Test interactions with external APIs and services
- Use tools like WireMock to simulate external service responses
- Test error handling, timeouts, and retry mechanisms

### Message Integration Tests
- Test message production and consumption
- Verify message routing, serialization, and error handling
- Use embedded brokers for test isolation

## Structure and Organization

### Package Structure

Organize integration tests in a dedicated package structure:

```
src/test/java/com/example/{service-name}/
└── integration/              # Integration tests
    ├── repository/           # Repository integration tests
    ├── service/              # Service integration tests  
    ├── controller/           # API integration tests
    └── external/             # External service integration tests
```

### Naming Conventions

| Test Type | Test Class Name | Purpose |
|-----------|----------------|---------|
| Integration Tests | `{Component}IntegrationTest` | Full component integration |
| Repository Tests | `{Repository}IntegrationTest` | Database integration |
| API Tests | `{Controller}IntegrationTest` | HTTP API integration |
| External Tests | `{Client}IntegrationTest` | External service integration |

## Test Configuration

### Application Properties for Testing

Create dedicated test configuration to override production settings:

```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    username: sa
    password: password
    driver-class-name: org.h2.Driver
  
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
    properties:
      hibernate:
        format_sql: true
  
  liquibase:
    change-log: classpath:db/changelog/test-changelog.xml
  
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:9999/auth/realms/test
  
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: test-group
      auto-offset-reset: earliest
    producer:
      retries: 0
  
  redis:
    host: localhost
    port: 6379
    database: 1

# Logging configuration for tests
logging:
  level:
    com.example: DEBUG
    org.springframework.web: DEBUG
    org.springframework.security: DEBUG
```

### Test Profiles and Configuration Classes

Use profiles to activate test-specific configurations:

```java
@TestConfiguration
@Profile("test")
public class TestConfig {

    @Bean
    @Primary
    public Clock testClock() {
        return Clock.fixed(Instant.parse("2023-01-01T12:00:00Z"), ZoneOffset.UTC);
    }

    @Bean
    @Primary
    public PaymentServiceClient mockPaymentServiceClient() {
        return Mockito.mock(PaymentServiceClient.class);
    }

    @Bean
    @Primary
    public NotificationService mockNotificationService() {
        return Mockito.mock(NotificationService.class);
    }
}
```

### Test Data Management

#### Database Schema and Data Setup

Use Flyway or Liquibase for test database schema management:

```sql
-- src/test/resources/db/migration/V1__test_schema.sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

#### Test Data Factories

Create reusable test data factories for consistent test data:

```java
@Component
public class TestDataFactory {

    public Order createTestOrder() {
        return Order.builder()
            .id(UUID.randomUUID())
            .customerId(UUID.randomUUID())
            .status(OrderStatus.CREATED)
            .totalAmount(BigDecimal.valueOf(100.00))
            .createdDate(OffsetDateTime.now())
            .items(List.of(createTestOrderItem()))
            .build();
    }

    public Order createTestOrder(UUID customerId, OrderStatus status) {
        return createTestOrder().toBuilder()
            .customerId(customerId)
            .status(status)
            .build();
    }

    public OrderItem createTestOrderItem() {
        return OrderItem.builder()
            .id(UUID.randomUUID())
            .productId(UUID.randomUUID())
            .quantity(2)
            .unitPrice(BigDecimal.valueOf(50.00))
            .build();
    }

    public CreateOrderRequest createOrderRequest() {
        return CreateOrderRequest.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(CreateOrderItemRequest.builder()
                .productId(UUID.randomUUID())
                .quantity(2)
                .build()))
            .build();
    }
}
```

## Test Containers

Use Testcontainers for realistic infrastructure components in integration tests.

### Basic Container Setup

```java
@Testcontainers
public abstract class BaseIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test")
            .withReuse(true);

    @Container
    static RedisContainer redis = new RedisContainer("redis:7-alpine")
            .withReuse(true);

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"))
            .withReuse(true);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // Database properties
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);

        // Redis properties
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);

        // Kafka properties
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }
}
```

### Reusable Container Configuration

```java
@TestConfiguration
public class TestContainerConfig {

    @Bean
    @ServiceConnection
    public PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>("postgres:15")
                .withDatabaseName("testdb")
                .withUsername("test")
                .withPassword("test");
    }

    @Bean
    @ServiceConnection
    public RedisContainer redisContainer() {
        return new RedisContainer("redis:7-alpine");
    }

    @Bean
    @ServiceConnection
    public KafkaContainer kafkaContainer() {
        return new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"));
    }
}
```

## Spring Boot Test Slices

Use appropriate test slices to load only necessary application context components.

### Available Test Slices

| Annotation | Purpose | Loaded Components |
|------------|---------|------------------|
| `@WebMvcTest` | Test web layer | Controllers, filters, security |
| `@WebFluxTest` | Test reactive web layer | Reactive controllers, routers |
| `@DataJpaTest` | Test JPA repositories | JPA repositories, entities |
| `@DataR2dbcTest` | Test R2DBC repositories | R2DBC repositories |
| `@JsonTest` | Test JSON serialization | Jackson mappers |
| `@SpringBootTest` | Full application context | All components |

### Choosing the Right Test Slice

```java
// Use @DataJpaTest for repository testing
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryIntegrationTest extends BaseIntegrationTest {
    // Repository integration tests
}

// Use @WebMvcTest for controller testing
@WebMvcTest(OrderController.class)
class OrderControllerIntegrationTest {
    // Controller integration tests with mocked services
}

// Use @SpringBootTest for full integration tests
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderApiIntegrationTest extends BaseIntegrationTest {
    // Full API integration tests
}
```

## Transaction Management in Tests

Handle transactions correctly to ensure test isolation and data consistency.

### Transactional Test Configuration

```java
@SpringBootTest
@Transactional
@Rollback
class OrderServiceIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldRollbackOnTransactionFailure() {
        // Given
        OrderCreationDto orderDto = createOrderCreationDto();
        
        // Simulate a failure that should trigger rollback
        doThrow(new RuntimeException("Simulated failure"))
            .when(externalService).notify(any());

        // When & Then
        assertThrows(RuntimeException.class, () -> orderService.createOrder(orderDto));
        
        // Verify rollback occurred
        assertThat(orderRepository.findAll()).isEmpty();
    }
}
```

### Testing Transaction Boundaries

```java
@Test
@Transactional(propagation = Propagation.NOT_SUPPORTED)
void shouldCommitTransactionOnSuccess() {
    // Given
    OrderCreationDto orderDto = createOrderCreationDto();

    // When
    Order createdOrder = orderService.createOrder(orderDto);

    // Then - Verify data is committed
    assertThat(createdOrder.getId()).isNotNull();
    
    // Verify in separate transaction
    Order savedOrder = orderRepository.findById(createdOrder.getId()).orElseThrow();
    assertThat(savedOrder.getStatus()).isEqualTo(OrderStatus.CREATED);
}
```

## Security Testing in Integration Tests

Test security configurations and authorization rules with real security context.

### Security Test Configuration

```java
@TestConfiguration
@EnableWebSecurity
public class TestSecurityConfig {

    @Bean
    @Primary
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withJwkSetUri("http://localhost:9999/auth/realms/test/protocol/openid_connect/certs")
                .build();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
                .authorizeHttpRequests(authz -> authz
                    .requestMatchers("/v1/admin/**").hasRole("ADMIN")
                    .requestMatchers("/v1/orders/**").hasRole("USER")
                    .anyRequest().authenticated())
                .build();
    }
}
```

### Testing with Security Context

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderSecurityIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @WithMockUser(roles = "USER")
    void shouldAllowUserToAccessOrders() {
        // Given
        String jwt = createValidJwt("user", List.of("ROLE_USER"));
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwt);

        // When
        ResponseEntity<OrderResponse[]> response = restTemplate.exchange(
            "/v1/orders",
            HttpMethod.GET,
            new HttpEntity<>(headers),
            OrderResponse[].class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @WithMockUser(roles = "USER")
    void shouldDenyUserAccessToAdminEndpoints() {
        // Given
        String jwt = createValidJwt("user", List.of("ROLE_USER"));
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwt);

        // When
        ResponseEntity<String> response = restTemplate.exchange(
            "/v1/admin/orders",
            HttpMethod.GET,
            new HttpEntity<>(headers),
            String.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
```

## Performance Considerations

Keep integration tests fast and reliable while maintaining their value.

### Test Optimization Strategies

1. **Use Test Containers with Reuse**: Enable container reuse between test runs
2. **Limit Test Scope**: Test specific integration points, not entire workflows
3. **Parallel Execution**: Run independent tests in parallel
4. **Test Data Management**: Use minimal but representative test data
5. **Container Warm-up**: Pre-warm containers in CI/CD pipelines

### Example Optimized Test Configuration

```java
@SpringBootTest
@TestMethodOrder(OrderAnnotation.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OptimizedIntegrationTest extends BaseIntegrationTest {

    @Test
    @Order(1)
    void setupTestData() {
        // Setup shared test data once
    }

    @Test
    @Order(2)
    void testOperationA() {
        // Test that uses shared data
    }

    @Test
    @Order(3)
    void testOperationB() {
        // Test that uses shared data
    }
}
```

## Common Anti-patterns to Avoid

1. **Excessive Setup**: Don't create overly complex test scenarios
2. **Testing Everything Together**: Limit scope to specific integration points
3. **Flaky Tests**: Ensure consistent test results through proper isolation
4. **Slow Test Suites**: Optimize for reasonable execution time
5. **Using Production Systems**: Always use test-specific infrastructure
6. **Shared Test State**: Avoid dependencies between tests

## CI/CD Integration

Configure integration tests for continuous integration pipelines.

### Pipeline Configuration Example

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
          
      - name: Cache Dependencies
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
          
      - name: Run Integration Tests
        run: mvn test -Dtest="**/*IntegrationTest" -Dspring.profiles.active=test
```

## Related Documentation

- [Database Integration Testing](database-integration-testing.md) - Repository and database integration tests
- [API Integration Testing](api-integration-testing.md) - Controller and API integration tests
- [External Service Testing](external-service-testing.md) - Testing with external services and WireMock
- [Unit Testing Fundamentals](../unit-testing/unit-testing-fundamentals.md) - Core testing principles