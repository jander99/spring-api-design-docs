# Integration Testing Fundamentals

## Overview

Integration tests verify that components work together.

This guide covers Spring Boot testing standards. We test real interactions. We keep tests isolated. We ensure tests are reliable.

## Core Principles

1. **Test Real Interactions**: Test actual component integration. Don't mock connections.
2. **Limited Scope**: Test specific points. Don't test entire systems.
3. **Test Isolation**: Use separate test databases. Stop tests from interfering.
4. **Realistic Data**: Use test data like production.
5. **Fast Tests**: Keep tests fast. Make tests predictable.

## Integration Test Categories

### Database Integration Tests
- Test repositories with real databases
- Check queries, transactions, constraints
- Use test databases to isolate tests

### API Integration Tests
- Test request and response cycles
- Check serialization and HTTP behavior
- Use real Spring. Mock external services.

### External Service Integration Tests
- Test external API connections
- Use WireMock for fake responses
- Test error handling and timeouts

### Message Integration Tests
- Test sending and getting messages
- Check message routing and errors
- Use embedded brokers

## Structure and Organization

### Package Structure

```
src/test/java/com/example/{service-name}/
└── integration/
    ├── repository/           # Database tests
    ├── service/              # Service tests  
    ├── controller/           # API tests
    └── external/             # External service tests
```

### Naming Conventions

Use consistent names for test classes:

| Test Type | Name | Purpose |
|-----------|------|---------|
| Integration | `{Component}IntegrationTest` | Component integration |
| Repository | `{Repository}IntegrationTest` | Database integration |
| API | `{Controller}IntegrationTest` | HTTP API integration |
| External | `{Client}IntegrationTest` | External services |

## Test Configuration

### Application Properties for Testing

Create test-specific configuration files:

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

Use profiles to load test beans:

```java
@TestConfiguration
@Profile("test")
public class TestConfig {
     @Bean
     @Primary
     public Clock testClock() {
         // Fixed clock for consistent test dates
         return Clock.fixed(
             Instant.parse("2025-01-01T12:00:00Z"),
             ZoneOffset.UTC
         );
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

#### Database Schema Setup

Use Flyway or Liquibase for database schemas:

#### Test Data Factories

Create helper classes for test data:

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

     public Order createTestOrder(
             UUID customerId, 
             OrderStatus status) {
         return createTestOrder()
             .toBuilder()
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
         UUID customerId = UUID.randomUUID();
         UUID productId = UUID.randomUUID();
         
         return CreateOrderRequest.builder()
             .customerId(customerId)
             .items(List.of(
                 CreateOrderItemRequest.builder()
                     .productId(productId)
                     .quantity(2)
                     .build()
             ))
             .build();
     }
}
```

## Test Containers

Use Testcontainers to run infrastructure.

### Basic Container Setup

Use `@Testcontainers` annotation:

```java
@Testcontainers
public abstract class BaseIntegrationTest {

     @Container
     static PostgreSQLContainer<?> postgres = 
         new PostgreSQLContainer<>("postgres:15")
             .withDatabaseName("testdb")
             .withUsername("test")
             .withPassword("test")
             .withReuse(true);

     @Container
     static RedisContainer redis = 
         new RedisContainer("redis:7-alpine")
             .withReuse(true);

     @Container
     static KafkaContainer kafka = 
         new KafkaContainer(
             DockerImageName.parse("confluentinc/cp-kafka:7.4.0")
         ).withReuse(true);

     @DynamicPropertySource
     static void configureProperties(DynamicPropertyRegistry registry) {
         // Database config
         registry.add("spring.datasource.url", postgres::getJdbcUrl);
         registry.add("spring.datasource.username", postgres::getUsername);
         registry.add("spring.datasource.password", postgres::getPassword);

         // Redis config
         registry.add("spring.redis.host", redis::getHost);
         registry.add("spring.redis.port", redis::getFirstMappedPort);

         // Kafka config
         registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
     }
}
```

### Container Configuration

Create reusable container configuration:

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
         String imageName = "confluentinc/cp-kafka:7.4.0";
         return new KafkaContainer(
             DockerImageName.parse(imageName)
         );
     }
}
```

## Spring Boot Test Slices

Use test slices to load only components you need.

| Annotation | Purpose |
|------------|---------|
| `@WebMvcTest` | Test web layer |
| `@WebFluxTest` | Test reactive web |
| `@DataJpaTest` | Test JPA repositories |
| `@DataR2dbcTest` | Test R2DBC repositories |
| `@JsonTest` | Test JSON |
| `@SpringBootTest` | Full application |

### Examples

```java
// Repository testing
@DataJpaTest
@AutoConfigureTestDatabase(
    replace = AutoConfigureTestDatabase.Replace.NONE
)
class OrderRepositoryIntegrationTest 
        extends BaseIntegrationTest {
     // Repository integration tests
}

// Controller testing
@WebMvcTest(OrderController.class)
class OrderControllerIntegrationTest {
     // Controller tests with mocked services
}

// Full API testing
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT
)
class OrderApiIntegrationTest 
        extends BaseIntegrationTest {
     // Full API integration tests
}
```

## Transaction Management in Tests

Use transactions correctly. Isolate tests. Keep data consistent.

### Transactional Test Configuration

Use `@Transactional` and `@Rollback`:

```java
@SpringBootTest
@Transactional
@Rollback
class OrderServiceIntegrationTest 
        extends BaseIntegrationTest {

     @Autowired
     private OrderService orderService;

     @Autowired
     private OrderRepository orderRepository;

     @Test
     void shouldRollbackOnTransactionFailure() {
         // Given
         OrderCreationDto orderDto = 
             createOrderCreationDto();
         
         // Simulate failure for rollback test
         doThrow(new RuntimeException("Simulated failure"))
             .when(externalService).notify(any());

         // When & Then
         assertThrows(
             RuntimeException.class, 
             () -> orderService.createOrder(orderDto)
         );
         
         // Verify rollback worked
         assertThat(orderRepository.findAll())
             .isEmpty();
     }
}
```

### Testing Transaction Boundaries

Run tests outside transactions:

```java
@Test
@Transactional(propagation = Propagation.NOT_SUPPORTED)
void shouldCommitTransactionOnSuccess() {
     // Given
     OrderCreationDto orderDto = 
         createOrderCreationDto();

     // When
     Order createdOrder = 
         orderService.createOrder(orderDto);

     // Then - Verify data committed
     assertThat(createdOrder.getId())
         .isNotNull();
     
     // Verify in new transaction
     Order savedOrder = orderRepository
         .findById(createdOrder.getId())
         .orElseThrow();
     assertThat(savedOrder.getStatus())
         .isEqualTo(OrderStatus.CREATED);
}
```

## Security Testing in Integration Tests

Test security settings and authorization rules.

### Security Test Configuration

Configure test JWT decoder:

```java
@TestConfiguration
@EnableWebSecurity
public class TestSecurityConfig {

     @Bean
     @Primary
     public JwtDecoder jwtDecoder() {
         String uri = "http://localhost:9999/auth/" +
             "realms/test/protocol/" +
             "openid_connect/certs";
         return NimbusJwtDecoder
             .withJwkSetUri(uri)
             .build();
     }

     @Bean
     public SecurityFilterChain filterChain(
             HttpSecurity http) 
             throws Exception {
         return http
             .oauth2ResourceServer(
                 oauth2 -> oauth2.jwt(
                     Customizer.withDefaults()
                 )
             )
             .authorizeHttpRequests(authz -> authz
                 .requestMatchers("/v1/admin/**")
                 .hasRole("ADMIN")
                 .requestMatchers("/v1/orders/**")
                 .hasRole("USER")
                 .anyRequest()
                 .authenticated())
             .build();
     }
}
```

### Testing with Security Context

Test permissions with mock users:

```java
@SpringBootTest(
    webEnvironment = 
        SpringBootTest.WebEnvironment.RANDOM_PORT
)
class OrderSecurityIntegrationTest {

     @Autowired
     private TestRestTemplate restTemplate;

     @Test
     @WithMockUser(roles = "USER")
     void shouldAllowUserToAccessOrders() {
         // Given
         String jwt = createValidJwt(
             "user", 
             List.of("ROLE_USER")
         );
         HttpHeaders headers = 
             new HttpHeaders();
         headers.setBearerAuth(jwt);

         // When
         ResponseEntity<OrderResponse[]> response = 
             restTemplate.exchange(
                 "/v1/orders",
                 HttpMethod.GET,
                 new HttpEntity<>(headers),
                 OrderResponse[].class
             );

         // Then
         assertThat(response.getStatusCode())
             .isEqualTo(HttpStatus.OK);
     }

     @Test
     @WithMockUser(roles = "USER")
     void shouldDenyUserAccessToAdminEndpoints() {
         // Given
         String jwt = createValidJwt(
             "user", 
             List.of("ROLE_USER")
         );
         HttpHeaders headers = 
             new HttpHeaders();
         headers.setBearerAuth(jwt);

         // When
         ResponseEntity<String> response = 
             restTemplate.exchange(
                 "/v1/admin/orders",
                 HttpMethod.GET,
                 new HttpEntity<>(headers),
                 String.class
             );

         // Then
         assertThat(response.getStatusCode())
             .isEqualTo(HttpStatus.FORBIDDEN);
     }
}
```

## Performance Considerations

Keep tests fast. Keep tests reliable.

### Optimization Strategies

1. **Reuse Containers**: Reuse containers between tests
2. **Limit Scope**: Test specific points. Not full workflows.
3. **Parallel Tests**: Run independent tests together
4. **Minimal Data**: Use only needed test data
5. **Warm-up**: Pre-start containers in CI/CD

### Example Optimized Test Configuration

```java
@SpringBootTest
@TestMethodOrder(OrderAnnotation.class)
@DirtiesContext(
    classMode = DirtiesContext.ClassMode.AFTER_CLASS
)
class OptimizedIntegrationTest {

     @Test
     @Order(1)
     void setupTestData() {
         // Setup once
     }

     @Test
     @Order(2)
     void testOperationA() {
         // Uses shared data
     }

     @Test
     @Order(3)
     void testOperationB() {
         // Uses shared data
     }
}
```

## Anti-patterns to Avoid

1. **Excessive Setup**: Avoid complex test scenarios
2. **Testing Everything**: Test specific points only
3. **Flaky Tests**: Ensure consistent results
4. **Slow Tests**: Optimize execution time
5. **Production Systems**: Use test infrastructure
6. **Shared State**: Avoid test dependencies

## CI/CD Integration

Add integration tests to CI/CD:

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

## Next Steps

- [Database Integration Testing](database-integration-testing.md)
- [API Integration Testing](api-integration-testing.md)
- [External Service Testing](external-service-testing.md)
- [Unit Testing Fundamentals](../unit-testing/unit-testing-fundamentals.md)