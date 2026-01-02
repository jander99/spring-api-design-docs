# Unit Testing Fundamentals

## Overview

This document outlines our standards for unit testing in Spring Boot applications, focusing on testing components in isolation.

## Core Principles

1. **Test in Isolation**: Mock external dependencies
2. **Focus on Behavior**: Test what components do, not how they do it
3. **Fast Execution**: Unit tests should run in milliseconds
4. **Repeatable Results**: Tests should produce consistent results
5. **Clear Intent**: Tests should clearly show what is being verified

## Structure and Organization

### Package Structure

Mirror the main package structure under `src/test/java`:

```
src/test/java/com/example/{service-name}/
├── domain/              # Domain model and logic tests
├── application/         # Application service tests
├── infrastructure/      # Infrastructure component tests
└── interfaces/          # API controller unit tests
```

### Naming Conventions

| Component | Test Class Name | Test Method Pattern |
|-----------|----------------|---------------------|
| Any Component | `{Component}Test` | `should{ExpectedBehavior}_when{Condition}` |

## Required Testing Libraries

- **JUnit 5**: Test framework for writing and running tests
- **Mockito**: Mocking framework for creating test doubles
- **AssertJ**: Fluent assertion library for more readable tests
- **Reactor Test**: Testing support for reactive streams (when using WebFlux)

### Maven Dependencies

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
    
    <!-- Reactor Test (for reactive applications) -->
    <dependency>
        <groupId>io.projectreactor</groupId>
        <artifactId>reactor-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## Test Coverage Requirements

| Component Type | Minimum Line Coverage |
|----------------|----------------------|
| Domain Models | 90% |
| Domain Services | 90% |
| Application Services | 85% |
| Infrastructure Components | 80% |
| Controllers | 80% |

## Common Anti-patterns to Avoid

1. **Testing implementation details**: Focus on behavior, not internal implementation
2. **Brittle tests**: Don't couple tests to specific implementation details
3. **Excessive mocking**: Only mock what's necessary for isolation
4. **Overlapping tests**: Test each behavior once in the appropriate layer
5. **Slow unit tests**: Keep them fast - if it's slow, it's likely an integration test
6. **Non-isolated tests**: Don't depend on other tests or external state
7. **Missing edge cases**: Test failure paths and boundary conditions

## Mocking Best Practices

1. **Mock at the boundaries**: Mock repositories, external services, but not domain objects
2. **Use specific expectations**: Prefer `when(method(specificArg))` over `when(method(any()))`
3. **Verify only important interactions**: Don't over-verify method calls
4. **Use argument matchers consistently**: Don't mix specific values with `any()`

### Mockito Usage Examples

```java
// Good: Specific mocking
when(repository.findById(orderId)).thenReturn(Optional.of(order));

// Good: Argument matching
when(service.process(any(Order.class))).thenReturn(result);

// Good: Verify important interactions
verify(repository).save(order);

// Bad: Over-verification
verify(repository).findById(orderId);
verify(repository).save(order);
verify(eventPublisher).publishEvent(any());
// ... too many verifications
```

## Assertion Best Practices

1. **Use descriptive assertions**: Choose the most specific assertion available
2. **Assert outcomes, not intermediate states**: Focus on the final result
3. **Use appropriate assertion methods**: Use AssertJ's fluent API
4. **Group related assertions together**: Keep related assertions close

### AssertJ Usage Examples

```java
// Good: Specific assertions
assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
assertThat(order.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(100.00));

// Good: Collection assertions
assertThat(orders)
    .hasSize(2)
    .extracting(Order::getStatus)
    .containsOnly(OrderStatus.CONFIRMED);

// Good: Exception assertions
assertThatThrownBy(() -> order.confirm())
    .isInstanceOf(InvalidOrderStatusException.class)
    .hasMessage("Cannot confirm order in status: CANCELLED");
```

## Test Data Management

- **Use factories for common test objects**: Create reusable object builders
- **Use builders for complex objects**: Implement builder pattern for test data
- **Define test fixtures for reusable test data**: Create constants for common test values
- **Keep test data minimal but sufficient**: Include only necessary data for the test

### Test Data Factory Example

```java
public class OrderTestDataFactory {
    
    public static Order createTestOrder() {
        return Order.builder()
            .customerId(UUID.randomUUID())
            .status(OrderStatus.CREATED)
            .totalAmount(BigDecimal.valueOf(100.00))
            .items(List.of(createTestOrderItem()))
            .build();
    }
    
    public static Order createTestOrder(OrderStatus status) {
        return createTestOrder().toBuilder()
            .status(status)
            .build();
    }
    
    public static OrderItem createTestOrderItem() {
        return OrderItem.builder()
            .productId(UUID.randomUUID())
            .quantity(2)
            .unitPrice(BigDecimal.valueOf(50.00))
            .build();
    }
}
```

## Testing with TDD

When using Test-Driven Development:

1. **Write a failing test first**: Start with a test that defines the expected behavior
2. **Write minimal code to pass**: Implement just enough to make the test green
3. **Refactor while keeping tests green**: Improve code quality without breaking functionality
4. **Repeat for next behavior**: Continue the cycle for each new requirement

### TDD Example

```java
// 1. Write failing test
@Test
void shouldCalculateTotalAmountFromItems() {
    // Given
    List<OrderItem> items = List.of(
        OrderItem.builder().quantity(2).unitPrice(BigDecimal.valueOf(50.00)).build(),
        OrderItem.builder().quantity(1).unitPrice(BigDecimal.valueOf(25.00)).build()
    );
    
    // When
    Order order = Order.builder().items(items).build();
    
    // Then
    assertThat(order.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(125.00));
}

// 2. Implement minimal solution
public class Order {
    private List<OrderItem> items;
    
    public BigDecimal getTotalAmount() {
        return items.stream()
            .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

// 3. Refactor if needed while keeping test green
```

## Related Documentation

- [Domain Layer Testing](domain-layer-testing.md) - Testing domain models and services
- [Application Layer Testing](application-layer-testing.md) - Testing application services
- [Infrastructure Testing](../specialized-testing/infrastructure-testing.md) - Testing repositories and clients
- [Controller Unit Testing](controller-unit-testing.md) - Testing controller components
- [Reactive Testing](../specialized-testing/reactive-testing.md) - Testing reactive components