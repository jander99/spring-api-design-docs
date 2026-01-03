# Domain Layer Testing

## Overview

Domain layer testing isolates business logic. Test it without external systems, mocks, or dependencies. Verify that business rules work on their own.

## Testing Domain Entities

Domain entities contain pure business logic. Test them without mocks. Focus on three key areas:
- Business rules
- State transitions
- Invariants

### Testing Business Rules

```java
class OrderTest {

    @Test
    void shouldCreateOrderWithValidData() {
        // Given
        UUID customerId = UUID.randomUUID();
        List<OrderItem> items = List.of(
            OrderItem.builder()
                .productId(UUID.randomUUID())
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(50.00))
                .build()
        );

        // When
        Order order = Order.builder()
            .customerId(customerId)
            .items(items)
            .build();

        // Then
        assertThat(order.getCustomerId()).isEqualTo(customerId);
        assertThat(order.getItems()).hasSize(1);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(100.00));
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CREATED);
    }

    @Test
    void shouldThrowExceptionForEmptyItems() {
        // Given
        UUID customerId = UUID.randomUUID();
        List<OrderItem> emptyItems = List.of();

        // When & Then
        assertThrows(IllegalArgumentException.class, () ->
            Order.builder()
                .customerId(customerId)
                .items(emptyItems)
                .build()
        );
    }
}
```

### Testing State Transitions

```java
class OrderTest {

    @Test
    void shouldConfirmOrderWhenInCreatedStatus() {
        // Given
        Order order = createTestOrder(OrderStatus.CREATED);

        // When
        order.confirm();

        // Then
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(order.getConfirmedDate()).isNotNull();
    }

    @Test
    void shouldThrowExceptionWhenConfirmingNonCreatedOrder() {
        // Given
        Order order = createTestOrder(OrderStatus.CONFIRMED);

        // When & Then
        assertThrows(InvalidOrderStatusException.class, order::confirm);
    }

    @Test
    void shouldCancelOrderWhenInCreatedOrConfirmedStatus() {
        // Test CREATED -> CANCELLED
        Order createdOrder = createTestOrder(OrderStatus.CREATED);
        createdOrder.cancel();
        assertThat(createdOrder.getStatus()).isEqualTo(OrderStatus.CANCELLED);

        // Test CONFIRMED -> CANCELLED
        Order confirmedOrder = createTestOrder(OrderStatus.CONFIRMED);
        confirmedOrder.cancel();
        assertThat(confirmedOrder.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void shouldThrowExceptionWhenCancellingShippedOrder() {
        // Given
        Order order = createTestOrder(OrderStatus.SHIPPED);

        // When & Then
        assertThrows(InvalidOrderStatusException.class, order::cancel);
    }

    private Order createTestOrder(OrderStatus status) {
        return Order.builder()
            .customerId(UUID.randomUUID())
            .status(status)
            .items(List.of(OrderItem.builder()
                .productId(UUID.randomUUID())
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(50.00))
                .build()))
            .build();
    }
}
```

### Testing Business Calculations

```java
class OrderTest {

    @Test
    void shouldCalculateTotalAmountFromItems() {
        // Given
        List<OrderItem> items = List.of(
            OrderItem.builder()
                .productId(UUID.randomUUID())
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(50.00))
                .build(),
            OrderItem.builder()
                .productId(UUID.randomUUID())
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(30.00))
                .build()
        );

        // When
        Order order = Order.builder()
            .customerId(UUID.randomUUID())
            .items(items)
            .build();

        // Then
        assertThat(order.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(130.00));
    }

    @Test
    void shouldApplyDiscountCorrectly() {
        // Given
        Order order = createTestOrderWithAmount(BigDecimal.valueOf(100.00));
        Discount discount = Discount.percentage(BigDecimal.valueOf(10)); // 10% discount

        // When
        order.applyDiscount(discount);

        // Then
        assertThat(order.getDiscountAmount()).isEqualByComparingTo(BigDecimal.valueOf(10.00));
        assertThat(order.getFinalAmount()).isEqualByComparingTo(BigDecimal.valueOf(90.00));
    }

    @Test
    void shouldNotApplyDiscountTwice() {
        // Given
        Order order = createTestOrderWithAmount(BigDecimal.valueOf(100.00));
        Discount discount = Discount.percentage(BigDecimal.valueOf(10));
        order.applyDiscount(discount);

        // When & Then
        assertThrows(IllegalStateException.class, () -> order.applyDiscount(discount));
    }
}
```

## Testing Value Objects

Test three aspects of value objects:
- Equality
- Immutability
- Validation rules

### Testing Value Object Equality

```java
class MoneyTest {

    @Test
    void shouldBeEqualForSameAmountAndCurrency() {
        // Given
        Money money1 = Money.of(BigDecimal.valueOf(100.00), Currency.USD);
        Money money2 = Money.of(BigDecimal.valueOf(100.00), Currency.USD);

        // Then
        assertThat(money1).isEqualTo(money2);
        assertThat(money1.hashCode()).isEqualTo(money2.hashCode());
    }

    @Test
    void shouldNotBeEqualForDifferentCurrency() {
        // Given
        Money usdMoney = Money.of(BigDecimal.valueOf(100.00), Currency.USD);
        Money eurMoney = Money.of(BigDecimal.valueOf(100.00), Currency.EUR);

        // Then
        assertThat(usdMoney).isNotEqualTo(eurMoney);
    }

    @Test
    void shouldThrowExceptionForNegativeAmount() {
        // When & Then
        assertThrows(IllegalArgumentException.class, () ->
            Money.of(BigDecimal.valueOf(-10.00), Currency.USD));
    }
}
```

### Testing Value Object Operations

```java
class MoneyTest {

    @Test
    void shouldAddMoneyWithSameCurrency() {
        // Given
        Money money1 = Money.of(BigDecimal.valueOf(50.00), Currency.USD);
        Money money2 = Money.of(BigDecimal.valueOf(30.00), Currency.USD);

        // When
        Money result = money1.add(money2);

        // Then
        assertThat(result.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(80.00));
        assertThat(result.getCurrency()).isEqualTo(Currency.USD);
    }

    @Test
    void shouldThrowExceptionWhenAddingDifferentCurrencies() {
        // Given
        Money usdMoney = Money.of(BigDecimal.valueOf(50.00), Currency.USD);
        Money eurMoney = Money.of(BigDecimal.valueOf(30.00), Currency.EUR);

        // When & Then
        assertThrows(CurrencyMismatchException.class, () -> usdMoney.add(eurMoney));
    }
}
```

## Testing Domain Services

Domain services connect business logic across entities. They call external services. Mock these dependencies. Test the business logic in isolation.

### Testing Domain Service Logic

```java
@ExtendWith(MockitoExtension.class)
class OrderDomainServiceTest {

    @Mock
    private InventoryService inventoryService;

    @Mock
    private PricingService pricingService;

    @InjectMocks
    private OrderDomainService orderDomainService;

    @Test
    void shouldValidateAndEnrichOrder() {
        // Given
        Order order = createTestOrder();
        when(inventoryService.validateInventory(order.getItems())).thenReturn(true);
        when(pricingService.calculateTotalPrice(order.getItems()))
            .thenReturn(BigDecimal.valueOf(150.00));

        // When
        Order result = orderDomainService.validateAndEnrichOrder(order);

        // Then
        assertThat(result.getTotalPrice()).isEqualByComparingTo(BigDecimal.valueOf(150.00));
        verify(inventoryService).validateInventory(order.getItems());
        verify(pricingService).calculateTotalPrice(order.getItems());
    }

    @Test
    void shouldThrowExceptionForInsufficientInventory() {
        // Given
        Order order = createTestOrder();
        when(inventoryService.validateInventory(order.getItems())).thenReturn(false);

        // When & Then
        assertThrows(InsufficientInventoryException.class, 
            () -> orderDomainService.validateAndEnrichOrder(order));
        
        verify(inventoryService).validateInventory(order.getItems());
        verifyNoInteractions(pricingService);
    }

    @Test
    void shouldApplyBusinessRulesInCorrectOrder() {
        // Given
        Order order = createTestOrder();
        when(inventoryService.validateInventory(any())).thenReturn(true);
        when(pricingService.calculateTotalPrice(any())).thenReturn(BigDecimal.valueOf(100.00));

        // When
        orderDomainService.validateAndEnrichOrder(order);

        // Then - Verify order of operations
        InOrder inOrder = inOrder(inventoryService, pricingService);
        inOrder.verify(inventoryService).validateInventory(order.getItems());
        inOrder.verify(pricingService).calculateTotalPrice(order.getItems());
    }

    private Order createTestOrder() {
        return Order.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(OrderItem.builder()
                .productId(UUID.randomUUID())
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(50.00))
                .build()))
            .build();
    }
}
```

### Testing Complex Business Rules

```java
@ExtendWith(MockitoExtension.class)
class DiscountDomainServiceTest {

    @Mock
    private CustomerService customerService;

    @Mock
    private ProductService productService;

    @InjectMocks
    private DiscountDomainService discountService;

    @Test
    void shouldApplyVipDiscountForEligibleCustomer() {
        // Given
        UUID customerId = UUID.randomUUID();
        Order order = createTestOrderForCustomer(customerId, BigDecimal.valueOf(1000.00));
        
        Customer vipCustomer = Customer.builder()
            .id(customerId)
            .tierLevel(CustomerTier.VIP)
            .build();
            
        when(customerService.getCustomer(customerId)).thenReturn(vipCustomer);

        // When
        Discount discount = discountService.calculateApplicableDiscount(order);

        // Then
        assertThat(discount.getType()).isEqualTo(DiscountType.VIP);
        assertThat(discount.getPercentage()).isEqualByComparingTo(BigDecimal.valueOf(15.00));
    }

    @Test
    void shouldApplyVolumeDiscountForLargeOrder() {
        // Given
        UUID customerId = UUID.randomUUID();
        Order order = createTestOrderForCustomer(customerId, BigDecimal.valueOf(5000.00));
        
        Customer regularCustomer = Customer.builder()
            .id(customerId)
            .tierLevel(CustomerTier.REGULAR)
            .build();
            
        when(customerService.getCustomer(customerId)).thenReturn(regularCustomer);

        // When
        Discount discount = discountService.calculateApplicableDiscount(order);

        // Then
        assertThat(discount.getType()).isEqualTo(DiscountType.VOLUME);
        assertThat(discount.getPercentage()).isEqualByComparingTo(BigDecimal.valueOf(10.00));
    }

    @Test
    void shouldNotApplyDiscountForRegularSmallOrder() {
        // Given
        UUID customerId = UUID.randomUUID();
        Order order = createTestOrderForCustomer(customerId, BigDecimal.valueOf(50.00));
        
        Customer regularCustomer = Customer.builder()
            .id(customerId)
            .tierLevel(CustomerTier.REGULAR)
            .build();
            
        when(customerService.getCustomer(customerId)).thenReturn(regularCustomer);

        // When
        Discount discount = discountService.calculateApplicableDiscount(order);

        // Then
        assertThat(discount.getType()).isEqualTo(DiscountType.NONE);
        assertThat(discount.getPercentage()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}
```

## Testing Domain Events

Domain events represent state changes. Test that they fire at the right times and get cleared properly.

```java
class OrderTest {

     @Test
     void shouldRaiseDomainEventWhenOrderConfirmed() {
         // Given
         Order order = createTestOrder(OrderStatus.CREATED);

         // When
         order.confirm();

         // Then
         List<DomainEvent> events = order.getDomainEvents();
         assertThat(events).hasSize(1);
         assertThat(events.get(0)).isInstanceOf(OrderConfirmedEvent.class);
         
         OrderConfirmedEvent event = (OrderConfirmedEvent) events.get(0);
         assertThat(event.getOrderId()).isEqualTo(order.getId());
         assertThat(event.getCustomerId()).isEqualTo(order.getCustomerId());
     }

     @Test
     void shouldClearDomainEventsAfterRetrieval() {
         // Given
         Order order = createTestOrder(OrderStatus.CREATED);
         order.confirm();

         // When
         order.getDomainEvents(); // First retrieval
         List<DomainEvent> events = order.getDomainEvents(); // Second retrieval

         // Then
         assertThat(events).isEmpty();
     }
}
```

## Domain Layer Testing Best Practices

### 1. Test Behavior, Not Simple Getters

Test what the entity does. Don't test simple getters and setters.

```java
// Good: Test business behavior
@Test
void shouldPreventOrderModificationAfterShipment() {
     Order order = createTestOrder(OrderStatus.SHIPPED);
     
     assertThrows(InvalidOrderStatusException.class, 
         () -> order.addItem(createTestOrderItem()));
}

// Avoid: Testing simple property accessors
@Test
void shouldSetAndGetCustomerId() {
     Order order = new Order();
     UUID customerId = UUID.randomUUID();
     
     order.setCustomerId(customerId);
     
     assertThat(order.getCustomerId()).isEqualTo(customerId);
}
```

### 2. Write Clear Assertions

Use domain-specific methods. They're clearer than generic status checks.

```java
// Good: Domain-specific methods
assertThat(order.isInShippableState()).isTrue();
assertThat(order.canBeModified()).isFalse();

// Avoid: Generic status checking
assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
```

### 3. Test Limits and Edge Cases

Test minimum and maximum values. Test boundary conditions.

```java
@Test
void shouldHandleMinimumOrderValue() {
     Order order = createTestOrderWithAmount(
         Money.of(BigDecimal.valueOf(0.01), Currency.USD));
     
     assertThat(order.getTotalAmount())
         .isEqualByComparingTo(BigDecimal.valueOf(0.01));
}

@Test
void shouldHandleMaximumQuantity() {
     OrderItem item = OrderItem.builder()
         .productId(UUID.randomUUID())
         .quantity(Integer.MAX_VALUE)
         .unitPrice(BigDecimal.valueOf(0.01))
         .build();
         
     assertThat(item.getTotalPrice()).isPositive();
}
```

### 4. Use Data Factories for Tests

Reuse test data creation. Use factories instead of building data in each test.

```java
public class OrderTestDataFactory {
     
     public static Order createTestOrder() {
         return Order.builder()
             .customerId(UUID.randomUUID())
             .status(OrderStatus.CREATED)
             .items(List.of(createTestOrderItem()))
             .build();
     }
     
     public static Order createTestOrder(OrderStatus status) {
         return createTestOrder().toBuilder()
             .status(status)
             .build();
     }
     
     public static Order createTestOrderWithAmount(BigDecimal amount) {
         return Order.builder()
             .customerId(UUID.randomUUID())
             .status(OrderStatus.CREATED)
             .items(List.of(OrderItem.builder()
                 .productId(UUID.randomUUID())
                 .quantity(1)
                 .unitPrice(amount)
                 .build()))
             .build();
     }
}
```

## Related Documentation

- [Unit Testing Fundamentals](unit-testing-fundamentals.md) - Core testing principles and setup
- [Application Layer Testing](application-layer-testing.md) - Testing application services
- [Integration Testing Fundamentals](../integration-testing/integration-testing-fundamentals.md) - Integration testing principles