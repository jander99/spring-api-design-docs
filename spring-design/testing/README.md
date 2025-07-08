# Spring Boot Testing Standards

## Overview

This directory contains comprehensive testing guidelines for Spring Boot applications, covering unit testing, integration testing, and specialized testing approaches for reactive applications and external service integrations.

## Testing Strategy

Our testing strategy follows the testing pyramid approach:

```
         /\
        /  \
       / UI \
      /______\
     /        \
    /  API     \
   /____________\
  /              \
 / Integration    \
/___________________\
       Unit Tests
```

- **Unit Tests (Foundation)**: Fast, isolated tests for individual components
- **Integration Tests (Middle)**: Test component interactions and data flow
- **API Tests (Top)**: End-to-end API behavior testing

## Directory Structure

### Unit Testing Documentation (`unit-testing/`)

- **[Unit Testing Fundamentals](unit-testing/Unit-Testing-Fundamentals.md)**: Core principles, setup, libraries, and best practices
- **[Domain Layer Testing](unit-testing/Domain-Layer-Testing.md)**: Testing business entities, value objects, and domain services
- **[Application Layer Testing](unit-testing/Application-Layer-Testing.md)**: Testing application services and orchestration logic
- **[Controller Unit Testing](unit-testing/Controller-Unit-Testing.md)**: Testing web controllers in isolation

### Integration Testing Documentation (`integration-testing/`)

- **[Integration Testing Fundamentals](integration-testing/Integration-Testing-Fundamentals.md)**: Core integration testing principles and setup
- **[Database Integration Testing](integration-testing/Database-Integration-Testing.md)**: Testing with real databases and repositories
- **[API Integration Testing](integration-testing/API-Integration-Testing.md)**: End-to-end API testing with real HTTP requests
- **[External Service Testing](integration-testing/External-Service-Testing.md)**: Testing with WireMock and external service simulation

### Specialized Testing Documentation (`specialized-testing/`)

- **[Reactive Testing](specialized-testing/Reactive-Testing.md)**: Testing reactive streams and asynchronous operations
- **[Infrastructure Testing](specialized-testing/Infrastructure-Testing.md)**: Testing repositories, API clients, and external adapters
- **[Contract Testing Standards](specialized-testing/Contract%20Testing%20Standards.md)**: Consumer-driven contract testing and API contract verification

## Quick Reference

### Unit Testing Quick Start

```java
// Domain Entity Test
@Test
void shouldCalculateOrderTotal() {
    Order order = Order.builder()
        .items(List.of(createOrderItem(2, BigDecimal.valueOf(50.00))))
        .build();
    
    assertThat(order.getTotalAmount())
        .isEqualByComparingTo(BigDecimal.valueOf(100.00));
}

// Application Service Test
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock private OrderRepository repository;
    @InjectMocks private OrderService service;
    
    @Test
    void shouldCreateOrder() {
        when(repository.save(any())).thenReturn(savedOrder);
        
        Order result = service.createOrder(request);
        
        assertThat(result.getId()).isNotNull();
        verify(repository).save(any(Order.class));
    }
}

// Controller Test
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockBean private OrderService service;
    
    @Test
    void shouldCreateOrder() throws Exception {
        when(service.createOrder(any())).thenReturn(orderDto);
        
        mockMvc.perform(post("/v1/orders")
                .content(orderJson))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists());
    }
}
```

### Integration Testing Quick Start

```java
// Repository Integration Test
@DataJpaTest
@Testcontainers
class OrderRepositoryTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");
    
    @Test
    void shouldSaveAndRetrieveOrder() {
        Order saved = repository.save(createTestOrder());
        Optional<Order> retrieved = repository.findById(saved.getId());
        
        assertThat(retrieved).isPresent();
    }
}

// API Integration Test
@SpringBootTest(webEnvironment = RANDOM_PORT)
class OrderApiTest {
    @Autowired private TestRestTemplate restTemplate;
    
    @Test
    void shouldCreateOrderViaApi() {
        ResponseEntity<OrderResponse> response = 
            restTemplate.postForEntity("/v1/orders", request, OrderResponse.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }
}

// External Service Test
@SpringBootTest
class PaymentClientTest {
    @RegisterExtension
    static WireMockExtension wireMock = WireMockExtension.newInstance().build();
    
    @Test
    void shouldProcessPayment() {
        wireMock.stubFor(post("/payments")
            .willReturn(okJson(paymentResponse)));
        
        PaymentResult result = client.processPayment(request);
        
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
    }
}
```

### Reactive Testing Quick Start

```java
// Reactive Service Test
@Test
void shouldCreateOrderReactively() {
    when(repository.save(any())).thenReturn(Mono.just(savedOrder));
    
    StepVerifier.create(service.createOrder(order))
        .expectNext(savedOrder)
        .verifyComplete();
}

// Reactive Controller Test
@WebFluxTest(ReactiveOrderController.class)
class ReactiveOrderControllerTest {
    @Autowired private WebTestClient webTestClient;
    
    @Test
    void shouldCreateOrderReactively() {
        webTestClient.post()
            .uri("/v1/orders")
            .bodyValue(request)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(OrderResponse.class);
    }
}
```

## Testing Libraries and Dependencies

### Core Testing Dependencies

```xml
<dependencies>
    <!-- JUnit 5 -->
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- Mockito -->
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-core</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- AssertJ -->
    <dependency>
        <groupId>org.assertj</groupId>
        <artifactId>assertj-core</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- Spring Boot Test -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Integration Testing Dependencies

```xml
<dependencies>
    <!-- Testcontainers -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
    
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- WireMock -->
    <dependency>
        <groupId>com.github.tomakehurst</groupId>
        <artifactId>wiremock-jre8</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- Reactor Test (for reactive applications) -->
    <dependency>
        <groupId>io.projectreactor</groupId>
        <artifactId>reactor-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## Test Coverage Goals

| Component Type | Minimum Line Coverage | Focus Areas |
|----------------|----------------------|-------------|
| Domain Models | 90% | Business logic, state transitions, validation |
| Domain Services | 90% | Business rules, domain orchestration |
| Application Services | 85% | Service orchestration, transaction handling |
| Infrastructure Components | 80% | Data mapping, error handling |
| Controllers | 80% | Request validation, response formatting |

## Testing Best Practices Summary

### Unit Testing
- ✅ Test in complete isolation with mocked dependencies
- ✅ Focus on behavior, not implementation details
- ✅ Use descriptive test names and clear Given-When-Then structure
- ✅ Test edge cases and error scenarios
- ✅ Keep tests fast (< 100ms per test)

### Integration Testing
- ✅ Test real component interactions
- ✅ Use test containers for realistic infrastructure
- ✅ Mock external services with WireMock
- ✅ Test transaction boundaries and rollback scenarios
- ✅ Verify data persistence and retrieval

### Reactive Testing
- ✅ Use StepVerifier for all reactive stream testing
- ✅ Test backpressure and cancellation scenarios
- ✅ Use virtual time for time-based operations
- ✅ Test error propagation and recovery mechanisms

### External Service Testing
- ✅ Simulate external services with WireMock
- ✅ Test retry logic and circuit breaker patterns
- ✅ Verify authentication and authorization flows
- ✅ Test various error conditions and network failures

## Common Anti-Patterns to Avoid

❌ **Testing Implementation Details**: Focus on behavior, not internal mechanics
❌ **Excessive Mocking**: Only mock at architectural boundaries
❌ **Slow Unit Tests**: Unit tests should run in milliseconds
❌ **Flaky Tests**: Ensure deterministic and repeatable test results
❌ **Missing Error Cases**: Test failure paths and edge conditions
❌ **Overlapping Test Coverage**: Each behavior should be tested once at the appropriate level
❌ **Real External Dependencies**: Always mock or simulate external services in tests

## Test Organization Patterns

### Package Structure
```
src/test/java/com/example/service/
├── domain/              # Domain model and logic tests
├── application/         # Application service tests
├── infrastructure/      # Infrastructure component tests
├── interfaces/          # Controller and API tests
└── integration/         # Integration tests
    ├── repository/      # Repository integration tests
    ├── api/            # API integration tests
    └── external/       # External service integration tests
```

### Naming Conventions
- Test Classes: `{ComponentName}Test` for unit tests, `{ComponentName}IntegrationTest` for integration tests
- Test Methods: `should{ExpectedBehavior}_when{Condition}()`
- Test Data: Use factories and builders for consistent, maintainable test data

## Performance Considerations

### Unit Test Performance
- Target: < 100ms per test
- Use minimal test data
- Avoid unnecessary Spring context loading
- Use appropriate test slices (`@WebMvcTest`, `@DataJpaTest`, etc.)

### Integration Test Performance
- Use test container reuse to speed up test execution
- Limit test scope to specific integration points
- Consider parallel test execution for independent tests
- Use caching for expensive setup operations

## CI/CD Integration

### Pipeline Configuration
```yaml
test:
  stage: test
  script:
    - mvn clean test                    # Unit tests
    - mvn verify -Pfailsafe            # Integration tests
  artifacts:
    reports:
      junit:
        - target/surefire-reports/TEST-*.xml
        - target/failsafe-reports/TEST-*.xml
    coverage_report:
      coverage_format: jacoco
      path: target/site/jacoco/jacoco.xml
```

### Test Categories
- **Fast Tests**: Unit tests that run in every pipeline
- **Integration Tests**: Slower tests that run on merge requests
- **Contract Tests**: API contract validation
- **Performance Tests**: Load and stress testing (separate pipeline)

## Getting Started

1. **Start with Unit Tests**: Begin with domain layer testing using the patterns in [Unit Testing Fundamentals](unit-testing/Unit-Testing-Fundamentals.md)
2. **Add Integration Tests**: Follow [Integration Testing Fundamentals](integration-testing/Integration-Testing-Fundamentals.md) for component integration
3. **Implement API Tests**: Use [API Integration Testing](integration-testing/API-Integration-Testing.md) for end-to-end scenarios
4. **Configure External Mocks**: Set up WireMock following [External Service Testing](integration-testing/External-Service-Testing.md)
5. **Add Reactive Tests**: If using WebFlux, implement patterns from [Reactive Testing](specialized-testing/Reactive-Testing.md)

## Related Documentation

- [Spring Boot Testing Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/spring-boot-features.html#boot-features-testing)
- [Project Structure and Package Organization](../project-structure/Package-Organization.md)
- [Error Handling Standards](../error-handling/README.md)
- [Security Testing](../security/Security-Testing.md)