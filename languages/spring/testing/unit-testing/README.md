# Unit Testing Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 4 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 11.8 grade level • 1.1% technical density • fairly difficult

## Overview

This directory provides guidelines for unit testing in Spring Boot applications. It covers domain layer testing, application service testing, controller testing, and core unit testing principles.

## What's in This Directory

### Core Testing Guides

- **[Unit Testing Fundamentals](unit-testing-fundamentals.md)**: Core principles, setup, testing libraries, and best practices for writing unit tests in Spring Boot.

- **[Domain Layer Testing](domain-layer-testing.md)**: Guide to testing domain entities, value objects, domain services, and business logic in complete isolation.

- **[Application Layer Testing](application-layer-testing.md)**: Patterns for testing application services, use case flow, and transactions with mocking strategies.

- **[Controller Unit Testing](controller-unit-testing.md)**: Guide to testing web controllers in isolation using `@WebMvcTest`, `@WebFluxTest`, and proper request/response patterns.

## Key Unit Testing Principles

### Test Isolation
- Each test runs alone with mocked dependencies
- No external systems like databases, message queues, or HTTP services
- Fast execution under 100ms per test
- Tests produce the same results every time

### Testing Strategy
- **Given-When-Then** structure for clear test organization
- Focus on what the code does, not how it does it
- Test edge cases and error cases
- Use clear test names that explain what should happen

### Mocking Strategy
- Mock at system boundaries like repositories and external services
- Avoid too much mocking of internal parts
- Use real objects for value objects and simple data
- Mock time-based operations to get consistent results

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

## Testing Tools

### Main Tools
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
- **Test Builders**: Create consistent test data
- **Object Mothers**: Build data for complex test cases
- **Test Fixtures**: Reuse test data across tests

## Best Practices

### Test Organization
✅ **DO**:
- Group related tests together
- Use clear test method names
- Follow AAA pattern (Arrange-Act-Assert)
- Test one thing per test

❌ **DON'T**:
- Test many things in one test
- Use real production data
- Rely on test run order
- Test how code works internally

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
- Use test slices to load only the Spring context you need
- Avoid creating objects you don't need in setup
- Use static test data when you can
- Keep mock setup simple

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