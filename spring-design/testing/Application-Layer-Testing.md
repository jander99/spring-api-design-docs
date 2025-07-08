# Application Layer Testing

## Overview

Application layer testing focuses on testing application services that orchestrate business operations. These tests verify that services correctly coordinate between domain logic, repositories, and external services while maintaining proper transaction boundaries.

## Core Principles

1. **Mock all dependencies**: Repository, domain services, and external services
2. **Verify proper interactions**: Ensure correct method calls and parameters
3. **Test transaction boundaries**: Verify rollback behavior on failures
4. **Focus on orchestration**: Test coordination logic, not business rules

## Basic Application Service Testing

Application services should be tested with all dependencies mocked to verify orchestration logic in isolation.

### Testing Service Orchestration

```java
@ExtendWith(MockitoExtension.class)
class OrderApplicationServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderDomainService orderDomainService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private OrderApplicationService orderApplicationService;

    @Test
    void shouldCreateOrderSuccessfully() {
        // Given
        OrderCreationRequest request = createOrderCreationRequest();
        Order enrichedOrder = createTestOrder();
        Order savedOrder = createTestOrder();
        savedOrder.setId(UUID.randomUUID());

        when(orderDomainService.validateAndEnrichOrder(any(Order.class)))
            .thenReturn(enrichedOrder);
        when(orderRepository.save(enrichedOrder)).thenReturn(savedOrder);

        // When
        Order result = orderApplicationService.createOrder(request);

        // Then
        assertThat(result.getId()).isEqualTo(savedOrder.getId());
        
        verify(orderDomainService).validateAndEnrichOrder(any(Order.class));
        verify(orderRepository).save(enrichedOrder);
        verify(eventPublisher).publishEvent(any(OrderCreatedEvent.class));
    }

    @Test
    void shouldHandleValidationException() {
        // Given
        OrderCreationRequest request = createOrderCreationRequest();
        when(orderDomainService.validateAndEnrichOrder(any(Order.class)))
            .thenThrow(new ValidationException("Invalid order"));

        // When & Then
        assertThrows(ValidationException.class, 
            () -> orderApplicationService.createOrder(request));
        
        verify(orderDomainService).validateAndEnrichOrder(any(Order.class));
        verifyNoInteractions(orderRepository);
        verifyNoInteractions(eventPublisher);
    }
}
```

### Testing Query Operations

```java
@ExtendWith(MockitoExtension.class)
class OrderApplicationServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private OrderApplicationService orderApplicationService;

    @Test
    void shouldGetOrderById() {
        // Given
        UUID orderId = UUID.randomUUID();
        Order order = createTestOrder();
        order.setId(orderId);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        // When
        Order result = orderApplicationService.getOrder(orderId);

        // Then
        assertThat(result.getId()).isEqualTo(orderId);
        verify(orderRepository).findById(orderId);
    }

    @Test
    void shouldThrowExceptionWhenOrderNotFound() {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderRepository.findById(orderId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class, 
            () -> orderApplicationService.getOrder(orderId));
        
        verify(orderRepository).findById(orderId);
    }

    @Test
    void shouldGetOrdersByCustomer() {
        // Given
        UUID customerId = UUID.randomUUID();
        List<Order> orders = List.of(createTestOrder(), createTestOrder());
        when(orderRepository.findByCustomerId(customerId)).thenReturn(orders);

        // When
        List<Order> result = orderApplicationService.getOrdersByCustomer(customerId);

        // Then
        assertThat(result).hasSize(2);
        verify(orderRepository).findByCustomerId(customerId);
    }
}
```

## Testing Complex Workflows

Application services often coordinate complex workflows involving multiple domain services and external systems.

### Testing Multi-Step Operations

```java
@ExtendWith(MockitoExtension.class)
class OrderFulfillmentServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private InventoryService inventoryService;

    @Mock
    private PaymentService paymentService;

    @Mock
    private ShippingService shippingService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private OrderFulfillmentService fulfillmentService;

    @Test
    void shouldFulfillOrderSuccessfully() {
        // Given
        UUID orderId = UUID.randomUUID();
        Order order = createTestOrder(OrderStatus.CONFIRMED);
        order.setId(orderId);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(inventoryService.reserveItems(order.getItems())).thenReturn(true);
        when(paymentService.capturePayment(order.getPaymentId())).thenReturn(PaymentResult.success("txn-123"));
        when(shippingService.createShipment(order)).thenReturn(Shipment.builder().id(UUID.randomUUID()).build());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        OrderFulfillmentResult result = fulfillmentService.fulfillOrder(orderId);

        // Then
        assertThat(result.isSuccessful()).isTrue();
        assertThat(result.getShipmentId()).isNotNull();

        // Verify execution order
        InOrder inOrder = inOrder(inventoryService, paymentService, shippingService, orderRepository, eventPublisher);
        inOrder.verify(inventoryService).reserveItems(order.getItems());
        inOrder.verify(paymentService).capturePayment(order.getPaymentId());
        inOrder.verify(shippingService).createShipment(order);
        inOrder.verify(orderRepository).save(argThat(o -> o.getStatus() == OrderStatus.FULFILLED));
        inOrder.verify(eventPublisher).publishEvent(any(OrderFulfilledEvent.class));
    }

    @Test
    void shouldRollbackOnPaymentFailure() {
        // Given
        UUID orderId = UUID.randomUUID();
        Order order = createTestOrder(OrderStatus.CONFIRMED);
        order.setId(orderId);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(inventoryService.reserveItems(order.getItems())).thenReturn(true);
        when(paymentService.capturePayment(order.getPaymentId()))
            .thenThrow(new PaymentException("Payment failed"));

        // When & Then
        assertThrows(PaymentException.class, () -> fulfillmentService.fulfillOrder(orderId));

        // Verify rollback behavior
        verify(inventoryService).reserveItems(order.getItems());
        verify(inventoryService).releaseItems(order.getItems()); // Rollback
        verify(paymentService).capturePayment(order.getPaymentId());
        verifyNoInteractions(shippingService);
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void shouldFailWhenInsufficientInventory() {
        // Given
        UUID orderId = UUID.randomUUID();
        Order order = createTestOrder(OrderStatus.CONFIRMED);
        order.setId(orderId);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(inventoryService.reserveItems(order.getItems())).thenReturn(false);

        // When & Then
        assertThrows(InsufficientInventoryException.class, () -> fulfillmentService.fulfillOrder(orderId));

        verify(inventoryService).reserveItems(order.getItems());
        verifyNoInteractions(paymentService);
        verifyNoInteractions(shippingService);
        verifyNoInteractions(eventPublisher);
    }
}
```

### Testing Conditional Logic

```java
@ExtendWith(MockitoExtension.class)
class OrderProcessingServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CustomerService customerService;

    @Mock
    private DiscountService discountService;

    @Mock
    private TaxService taxService;

    @InjectMocks
    private OrderProcessingService processingService;

    @Test
    void shouldApplyVipDiscountForVipCustomer() {
        // Given
        OrderCreationRequest request = createOrderCreationRequest();
        Customer vipCustomer = Customer.builder()
            .id(request.getCustomerId())
            .tierLevel(CustomerTier.VIP)
            .build();
        
        Discount vipDiscount = Discount.percentage(BigDecimal.valueOf(15));
        Tax tax = Tax.builder().rate(BigDecimal.valueOf(8.5)).build();

        when(customerService.getCustomer(request.getCustomerId())).thenReturn(vipCustomer);
        when(discountService.calculateVipDiscount(any(Order.class))).thenReturn(vipDiscount);
        when(taxService.calculateTax(any(Order.class))).thenReturn(tax);
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Order result = processingService.processOrder(request);

        // Then
        assertThat(result.getDiscount()).isEqualTo(vipDiscount);
        
        verify(customerService).getCustomer(request.getCustomerId());
        verify(discountService).calculateVipDiscount(any(Order.class));
        verify(discountService, never()).calculateRegularDiscount(any(Order.class));
        verify(taxService).calculateTax(any(Order.class));
    }

    @Test
    void shouldApplyRegularDiscountForRegularCustomer() {
        // Given
        OrderCreationRequest request = createOrderCreationRequest();
        Customer regularCustomer = Customer.builder()
            .id(request.getCustomerId())
            .tierLevel(CustomerTier.REGULAR)
            .build();
        
        Discount regularDiscount = Discount.percentage(BigDecimal.valueOf(5));

        when(customerService.getCustomer(request.getCustomerId())).thenReturn(regularCustomer);
        when(discountService.calculateRegularDiscount(any(Order.class))).thenReturn(regularDiscount);
        when(taxService.calculateTax(any(Order.class))).thenReturn(Tax.builder().build());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Order result = processingService.processOrder(request);

        // Then
        verify(discountService, never()).calculateVipDiscount(any(Order.class));
        verify(discountService).calculateRegularDiscount(any(Order.class));
    }
}
```

## Testing Event Publishing

Application services often publish domain events. Verify that events are published with correct data.

### Testing Event Publication

```java
@ExtendWith(MockitoExtension.class)
class OrderApplicationServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Captor
    private ArgumentCaptor<OrderCreatedEvent> eventCaptor;

    @InjectMocks
    private OrderApplicationService orderApplicationService;

    @Test
    void shouldPublishOrderCreatedEvent() {
        // Given
        OrderCreationRequest request = createOrderCreationRequest();
        Order savedOrder = createTestOrder();
        savedOrder.setId(UUID.randomUUID());

        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);

        // When
        orderApplicationService.createOrder(request);

        // Then
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        
        OrderCreatedEvent publishedEvent = eventCaptor.getValue();
        assertThat(publishedEvent.getOrderId()).isEqualTo(savedOrder.getId());
        assertThat(publishedEvent.getCustomerId()).isEqualTo(savedOrder.getCustomerId());
        assertThat(publishedEvent.getTotalAmount()).isEqualTo(savedOrder.getTotalAmount());
    }

    @Test
    void shouldPublishMultipleEventsInOrder() {
        // Given
        UUID orderId = UUID.randomUUID();
        Order order = createTestOrder();
        order.setId(orderId);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        orderApplicationService.confirmOrder(orderId);

        // Then
        InOrder eventOrder = inOrder(eventPublisher);
        eventOrder.verify(eventPublisher).publishEvent(any(OrderConfirmedEvent.class));
        eventOrder.verify(eventPublisher).publishEvent(any(InventoryReservationRequestedEvent.class));
    }
}
```

## Testing Error Handling

Application services should handle various error scenarios gracefully and ensure data consistency.

### Testing Exception Handling

```java
@ExtendWith(MockitoExtension.class)
class OrderApplicationServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentService paymentService;

    @InjectMocks
    private OrderApplicationService orderApplicationService;

    @Test
    void shouldHandleRepositoryException() {
        // Given
        OrderCreationRequest request = createOrderCreationRequest();
        when(orderRepository.save(any(Order.class)))
            .thenThrow(new DataAccessException("Database error"));

        // When & Then
        assertThrows(OrderProcessingException.class, 
            () -> orderApplicationService.createOrder(request));
    }

    @Test
    void shouldTranslateBusinessExceptions() {
        // Given
        UUID orderId = UUID.randomUUID();
        Order order = createTestOrder();
        order.setId(orderId);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(paymentService.processPayment(any()))
            .thenThrow(new PaymentDeclinedException("Card declined"));

        // When & Then
        OrderProcessingException exception = assertThrows(OrderProcessingException.class,
            () -> orderApplicationService.processPayment(orderId));
        
        assertThat(exception.getCause()).isInstanceOf(PaymentDeclinedException.class);
        assertThat(exception.getErrorCode()).isEqualTo("PAYMENT_DECLINED");
    }
}
```

### Testing Validation

```java
@ExtendWith(MockitoExtension.class)
class OrderApplicationServiceTest {

    @InjectMocks
    private OrderApplicationService orderApplicationService;

    @Test
    void shouldValidateOrderCreationRequest() {
        // Given
        OrderCreationRequest invalidRequest = OrderCreationRequest.builder()
            .customerId(null) // Invalid: null customer ID
            .items(List.of()) // Invalid: empty items
            .build();

        // When & Then
        assertThrows(ValidationException.class, 
            () -> orderApplicationService.createOrder(invalidRequest));
    }

    @Test
    void shouldValidateBusinessRules() {
        // Given
        UUID orderId = UUID.randomUUID();
        Order cancelledOrder = createTestOrder(OrderStatus.CANCELLED);
        cancelledOrder.setId(orderId);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(cancelledOrder));

        // When & Then
        assertThrows(InvalidOrderStatusException.class,
            () -> orderApplicationService.confirmOrder(orderId));
    }
}
```

## Testing Pagination and Filtering

```java
@ExtendWith(MockitoExtension.class)
class OrderQueryServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private OrderQueryService queryService;

    @Test
    void shouldGetOrdersWithPagination() {
        // Given
        UUID customerId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 10);
        List<Order> orders = List.of(createTestOrder(), createTestOrder());
        Page<Order> orderPage = new PageImpl<>(orders, pageable, 25);

        when(orderRepository.findByCustomerId(customerId, pageable)).thenReturn(orderPage);

        // When
        Page<Order> result = queryService.getOrdersByCustomer(customerId, pageable);

        // Then
        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getTotalElements()).isEqualTo(25);
        assertThat(result.getNumber()).isEqualTo(0);
        assertThat(result.getSize()).isEqualTo(10);
        
        verify(orderRepository).findByCustomerId(customerId, pageable);
    }

    @Test
    void shouldFilterOrdersByStatus() {
        // Given
        OrderFilterCriteria criteria = OrderFilterCriteria.builder()
            .status(OrderStatus.CONFIRMED)
            .dateFrom(LocalDate.now().minusDays(7))
            .dateTo(LocalDate.now())
            .build();
        
        List<Order> filteredOrders = List.of(createTestOrder(OrderStatus.CONFIRMED));
        when(orderRepository.findByCriteria(criteria)).thenReturn(filteredOrders);

        // When
        List<Order> result = queryService.findOrdersByCriteria(criteria);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        verify(orderRepository).findByCriteria(criteria);
    }
}
```

## Application Layer Testing Best Practices

### 1. Focus on Orchestration Logic

```java
// Good: Testing coordination between services
@Test
void shouldCoordinateOrderCreationWorkflow() {
    // Test the sequence of calls and their interactions
    when(inventoryService.checkAvailability(any())).thenReturn(true);
    when(paymentService.authorize(any())).thenReturn(authResult);
    when(orderRepository.save(any())).thenReturn(savedOrder);
    
    orderService.createOrder(request);
    
    // Verify the correct sequence
    InOrder inOrder = inOrder(inventoryService, paymentService, orderRepository);
    inOrder.verify(inventoryService).checkAvailability(any());
    inOrder.verify(paymentService).authorize(any());
    inOrder.verify(orderRepository).save(any());
}

// Bad: Testing business logic (belongs in domain layer)
@Test
void shouldCalculateOrderTotal() {
    // This belongs in domain entity tests, not application service tests
}
```

### 2. Use Specific Mocking

```java
// Good: Specific expectations
when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
when(paymentService.processPayment(order.getPaymentRequest())).thenReturn(paymentResult);

// Bad: Overly generic mocking
when(orderRepository.findById(any())).thenReturn(Optional.of(order));
when(paymentService.processPayment(any())).thenReturn(paymentResult);
```

### 3. Verify Important Interactions

```java
// Good: Verify key interactions that matter for correctness
verify(orderRepository).save(order);
verify(eventPublisher).publishEvent(any(OrderCreatedEvent.class));

// Bad: Over-verification of every method call
verify(orderRepository).findById(orderId);
verify(order).getCustomerId();
verify(order).getItems();
verify(order).setStatus(OrderStatus.CREATED);
// ... too many verifications
```

### 4. Test Data Setup

```java
private OrderCreationRequest createOrderCreationRequest() {
    return OrderCreationRequest.builder()
        .customerId(UUID.randomUUID())
        .items(List.of(OrderItemRequest.builder()
            .productId(UUID.randomUUID())
            .quantity(2)
            .build()))
        .build();
}

private Order createTestOrder() {
    return Order.builder()
        .customerId(UUID.randomUUID())
        .status(OrderStatus.CREATED)
        .totalAmount(BigDecimal.valueOf(100.00))
        .items(List.of())
        .build();
}
```

## Related Documentation

- [Unit Testing Fundamentals](Unit-Testing-Fundamentals.md) - Core testing principles and setup
- [Domain Layer Testing](Domain-Layer-Testing.md) - Testing domain entities and services
- [Infrastructure Testing](Infrastructure-Testing.md) - Testing repositories and external clients
- [Integration Testing Fundamentals](Integration-Testing-Fundamentals.md) - Integration testing principles