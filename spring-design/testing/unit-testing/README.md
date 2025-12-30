# Unit Testing Standards

## Overview

This directory contains comprehensive guidelines for unit testing in Spring Boot applications, covering domain layer testing, application service testing, controller testing, and fundamental unit testing principles.

## Directory Contents

### Core Unit Testing Documentation

- **[Unit Testing Fundamentals](unit-testing-fundamentals.md)**: Core principles, setup, testing libraries, and best practices for writing effective unit tests in Spring Boot applications.

- **[Domain Layer Testing](domain-layer-testing.md)**: Comprehensive guide to testing domain entities, value objects, domain services, and business logic in complete isolation.

- **[Application Layer Testing](application-layer-testing.md)**: Patterns for testing application services, use case orchestration, and transaction handling with proper mocking strategies.

- **[Controller Unit Testing](controller-unit-testing.md)**: Detailed guide to testing web controllers in isolation using `@WebMvcTest`, `@WebFluxTest`, and proper request/response testing patterns.

## Key Unit Testing Principles

### Test Isolation
- Each test runs in complete isolation with mocked dependencies
- No external systems (databases, message queues, HTTP services)
- Fast execution (< 100ms per test)
- Deterministic and repeatable results

### Testing Strategy
- **Given-When-Then** structure for clear test organization
- Focus on behavior, not implementation details
- Test edge cases and error scenarios
- Use descriptive test names that explain the expected behavior

### Mocking Strategy
- Mock at architectural boundaries (repositories, external services)
- Avoid excessive mocking of internal collaborators
- Use real objects for value objects and simple data structures
- Mock time-dependent operations for deterministic tests

## Quick Reference

### Domain Entity Testing
```java
@Test
void shouldCalculateOrderTotal_whenMultipleItems() {
    // Given
    Order order = Order.builder()
        .items(List.of(
            OrderItem.builder().quantity(2).price(BigDecimal.valueOf(25.00)).build(),
            OrderItem.builder().quantity(1).price(BigDecimal.valueOf(50.00)).build()
        ))
        .build();
    
    // When
    BigDecimal total = order.calculateTotal();
    
    // Then
    assertThat(total).isEqualByComparingTo(BigDecimal.valueOf(100.00));
}
```

### Application Service Testing
```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock private OrderRepository orderRepository;
    @Mock private PaymentService paymentService;
    @InjectMocks private OrderService orderService;
    
    @Test
    void shouldCreateOrder_whenValidRequest() {
        // Given
        CreateOrderRequest request = createValidOrderRequest();
        Order savedOrder = createOrderWithId(1L);
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);
        
        // When
        Order result = orderService.createOrder(request);
        
        // Then
        assertThat(result.getId()).isEqualTo(1L);
        verify(orderRepository).save(any(Order.class));
        verify(paymentService).processPayment(any(PaymentRequest.class));
    }
}
```

### Controller Testing
```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockBean private OrderService orderService;
    
    @Test
    void shouldCreateOrder_whenValidRequest() throws Exception {
        // Given
        OrderResponse response = createOrderResponse();
        when(orderService.createOrder(any())).thenReturn(response);
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(orderRequestJson))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1L))
            .andExpect(jsonPath("$.status").value("CREATED"));
    }
}
```

### Reactive Testing
```java
@Test
void shouldCreateOrderReactively_whenValidRequest() {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    Order savedOrder = createOrderWithId(1L);
    when(orderRepository.save(any())).thenReturn(Mono.just(savedOrder));
    
    // When
    Mono<Order> result = reactiveOrderService.createOrder(request);
    
    // Then
    StepVerifier.create(result)
        .expectNext(savedOrder)
        .verifyComplete();
}
```

## Testing Libraries and Tools

### Core Dependencies
- **JUnit 5**: Primary testing framework
- **Mockito**: Mocking framework for dependencies
- **AssertJ**: Fluent assertion library
- **Spring Boot Test**: Spring testing utilities

### Spring Test Slices
- `@WebMvcTest`: For testing MVC controllers
- `@WebFluxTest`: For testing WebFlux controllers
- `@DataJpaTest`: For testing JPA repositories
- `@JsonTest`: For testing JSON serialization

### Test Data Management
- **Test Builders**: For creating consistent test data
- **Object Mothers**: For complex test scenarios
- **Test Fixtures**: For reusable test data sets

## Best Practices

### Test Organization
✅ **DO**:
- Group related tests in nested test classes
- Use descriptive test method names
- Follow AAA (Arrange-Act-Assert) pattern
- Test one behavior per test method

❌ **DON'T**:
- Test multiple behaviors in one test
- Use production data in tests
- Depend on test execution order
- Test implementation details

### Error Testing
```java
@Test
void shouldThrowException_whenOrderNotFound() {
    // Given
    Long nonExistentOrderId = 999L;
    when(orderRepository.findById(nonExistentOrderId))
        .thenReturn(Optional.empty());
    
    // When & Then
    assertThatThrownBy(() -> orderService.getOrder(nonExistentOrderId))
        .isInstanceOf(OrderNotFoundException.class)
        .hasMessage("Order not found with id: 999");
}
```

### Parameterized Tests
```java
@ParameterizedTest
@ValueSource(strings = {"", " ", "   "})
void shouldThrowException_whenOrderNameIsBlank(String blankName) {
    // Given & When & Then
    assertThatThrownBy(() -> Order.builder().name(blankName).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Order name cannot be blank");
}
```

## Performance Guidelines

### Unit Test Performance Targets
- **Individual Test**: < 100ms
- **Test Class**: < 5 seconds
- **Full Unit Test Suite**: < 2 minutes

### Optimization Strategies
- Use test slices to load minimal Spring context
- Avoid unnecessary object creation in setup
- Use static test data where possible
- Minimize mock setup complexity

## Navigation

- [← Back to Testing Standards](../README.md)
- [Integration Testing](../integration-testing/README.md)
- [Specialized Testing](../specialized-testing/README.md)
- [Spring Design Home](../../README.md)

## Related Documentation

- [Testing Structure](../../project-structure/testing-structure.md)
- [Domain Layer Architecture](../../project-structure/package-organization.md)
- [Error Handling Standards](../../error-handling/README.md)
- [Security Testing](../../security/security-testing.md)