# Spring Boot Testing Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 9.4 grade level • 1.1% technical density • fairly easy

## Why Test Spring Apps?

Tests help you build reliable apps. They catch bugs early. They give you confidence when you change code. Good tests save time and money.

This guide shows you how to test Spring Boot apps. You'll learn three main types of tests. Each type serves a different purpose.

## Overview

This directory has testing guides for Spring Boot apps. We cover unit tests, integration tests, and special tests for reactive apps.

## Testing Strategy

We follow the testing pyramid. This means you write more small tests and fewer large tests.

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

**Unit Tests (Bottom)**: Test one piece of code at a time. These run fast.

**Integration Tests (Middle)**: Test how parts work together. These check data flow.

**API Tests (Top)**: Test the whole system end-to-end. These verify user workflows.

## What's in This Guide

### Unit Testing (`unit-testing/`)

Unit tests check one small piece of code. They run fast and catch bugs early.

- **[Unit Testing Fundamentals](unit-testing/unit-testing-fundamentals.md)**: How to write your first unit tests
- **[Domain Layer Testing](unit-testing/domain-layer-testing.md)**: Test your business logic
- **[Application Layer Testing](unit-testing/application-layer-testing.md)**: Test your services
- **[Controller Unit Testing](unit-testing/controller-unit-testing.md)**: Test your web endpoints

### Integration Testing (`integration-testing/`)

Integration tests check how parts work together. They use real databases and HTTP calls.

- **[Integration Testing Fundamentals](integration-testing/integration-testing-fundamentals.md)**: Start with integration tests
- **[Database Integration Testing](integration-testing/database-integration-testing.md)**: Test with real databases
- **[API Integration Testing](integration-testing/api-integration-testing.md)**: Test your APIs end-to-end
- **[External Service Testing](integration-testing/external-service-testing.md)**: Test calls to other services

### Advanced Testing (`specialized-testing/`)

These guides cover special testing needs. You may not need these right away.

- **[Reactive Testing](specialized-testing/reactive-testing.md)**: Test async streams
- **[Infrastructure Testing](specialized-testing/infrastructure-testing.md)**: Test data access code
- **[Contract Testing Standards](specialized-testing/contract-testing-standards.md)**: Test API contracts

## Quick Examples

### Unit Test Examples

These examples show how to test different parts of your app.

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

### Integration Test Examples

These examples show how to test parts working together.

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

### Reactive Test Examples

These examples show how to test async code.

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

## Testing Tools

### Basic Testing Tools

Add these to your `pom.xml` file.

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

### Integration Testing Tools

Add these for database and service tests.

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

How much of your code should tests cover? Here are good targets.

| Component | Coverage Goal | What to Test |
|-----------|---------------|--------------|
| Business Logic | 90% | Rules, validation, state changes |
| Domain Services | 90% | Core business rules |
| App Services | 85% | Service calls, transactions |
| Data Access | 80% | Database operations, error cases |
| Controllers | 80% | Request handling, responses |

## Best Practices

### Unit Testing
- ✅ Test one thing at a time
- ✅ Use fake objects for dependencies
- ✅ Write clear test names
- ✅ Test error cases too
- ✅ Keep tests under 100ms

### Integration Testing
- ✅ Test how parts work together
- ✅ Use real databases with Testcontainers
- ✅ Fake external services with WireMock
- ✅ Test database rollbacks
- ✅ Check that data saves correctly

### Reactive Testing
- ✅ Use StepVerifier for streams
- ✅ Test cancellation
- ✅ Use virtual time for delays
- ✅ Test error handling

### External Service Testing
- ✅ Use WireMock to fake services
- ✅ Test retry logic
- ✅ Check authentication flows
- ✅ Test network failures

## Common Mistakes

❌ **Testing how code works**: Test what it does instead
❌ **Too many fakes**: Only fake external parts
❌ **Slow unit tests**: They should finish in milliseconds
❌ **Flaky tests**: Tests should always give the same result
❌ **Skipping error tests**: Always test failures too
❌ **Duplicate tests**: Test each thing once at the right level
❌ **Using real external services**: Always fake them in tests

## How to Organize Tests

### Folder Layout
```
src/test/java/com/example/service/
├── domain/              # Business logic tests
├── application/         # Service tests
├── infrastructure/      # Data access tests
├── interfaces/          # Controller tests
└── integration/         # Integration tests
    ├── repository/      # Database tests
    ├── api/            # API tests
    └── external/       # External service tests
```

### Naming Your Tests
- Test files: `OrderTest` for unit tests, `OrderIntegrationTest` for integration tests
- Test methods: `shouldCreateOrder_whenValidRequest()`
- Test data: Use builders to make test objects

## Making Tests Run Fast

### Unit Tests
- Goal: Under 100ms per test
- Use small amounts of data
- Don't load Spring unless needed
- Use test slices like `@WebMvcTest`

### Integration Tests
- Reuse containers between tests
- Test only what you need
- Run independent tests at the same time
- Cache expensive setup work

## Running Tests in CI/CD

### Pipeline Setup
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

### Test Groups
- **Fast Tests**: Unit tests run on every commit
- **Integration Tests**: Slower tests run on pull requests
- **Contract Tests**: API contract checks
- **Load Tests**: Performance testing in separate pipeline

## Getting Started

1. **Write unit tests first**: Start with [Unit Testing Fundamentals](unit-testing/unit-testing-fundamentals.md)
2. **Add integration tests**: Follow [Integration Testing Fundamentals](integration-testing/integration-testing-fundamentals.md)
3. **Test your APIs**: Use [API Integration Testing](integration-testing/api-integration-testing.md)
4. **Mock external services**: Set up WireMock with [External Service Testing](integration-testing/external-service-testing.md)
5. **Add reactive tests if needed**: See [Reactive Testing](specialized-testing/reactive-testing.md) for WebFlux apps

## Related Documentation

- [Spring Boot Testing Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/spring-boot-features.html#boot-features-testing)
- [Project Structure and Package Organization](../project-structure/package-organization.md)
- [Error Handling Standards](../error-handling/README.md)
- [Security Testing](../security/security-testing.md)

### gRPC Testing

**[Spring gRPC Testing](../grpc/testing/)** - For internal microservices using gRPC, learn how to test gRPC services with InProcessServer, unit tests, integration tests, and Testcontainers.

### API Design Theory

**[Schema Testing](../../../guides/api-design/testing/schema-testing.md)** - Language-agnostic testing principles covering schema validation, contract testing, and API testing standards.