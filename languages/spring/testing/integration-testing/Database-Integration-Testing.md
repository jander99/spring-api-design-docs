# Database Integration Testing

## Overview

Database integration testing verifies that repository implementations work correctly with real database systems. These tests focus on data persistence, complex queries, transaction behavior, and database constraints.

## Core Principles

1. **Test Real Database Interactions**: Use actual database connections, not mocked repositories
2. **Verify Complex Queries**: Test custom queries, joins, and database-specific features
3. **Test Transaction Boundaries**: Verify commit/rollback behavior and isolation levels
4. **Validate Constraints**: Test database constraints, foreign keys, and data integrity
5. **Use Test Containers**: Provide realistic database environments for tests

## JPA Repository Integration Testing

Use `@DataJpaTest` for focused repository testing with embedded or containerized databases.

### Basic Repository Testing

```java
@DataJpaTest
@Testcontainers
class OrderRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldSaveAndRetrieveOrder() {
        // Given
        Order order = createTestOrder();

        // When
        Order savedOrder = orderRepository.save(order);
        entityManager.flush();
        entityManager.clear();

        // Then
        Optional<Order> retrievedOrder = orderRepository.findById(savedOrder.getId());
        assertThat(retrievedOrder).isPresent();
        assertThat(retrievedOrder.get().getCustomerId()).isEqualTo(order.getCustomerId());
        assertThat(retrievedOrder.get().getStatus()).isEqualTo(order.getStatus());
        assertThat(retrievedOrder.get().getTotalAmount()).isEqualByComparingTo(order.getTotalAmount());
    }

    @Test
    void shouldFindOrdersByCustomerId() {
        // Given
        UUID customerId = UUID.randomUUID();
        Order order1 = createTestOrder(customerId, OrderStatus.CREATED);
        Order order2 = createTestOrder(customerId, OrderStatus.CONFIRMED);
        Order order3 = createTestOrder(UUID.randomUUID(), OrderStatus.CREATED); // Different customer

        entityManager.persistAndFlush(order1);
        entityManager.persistAndFlush(order2);
        entityManager.persistAndFlush(order3);
        entityManager.clear();

        // When
        List<Order> orders = orderRepository.findByCustomerId(customerId);

        // Then
        assertThat(orders).hasSize(2);
        assertThat(orders).extracting(Order::getCustomerId)
            .containsOnly(customerId);
        assertThat(orders).extracting(Order::getStatus)
            .containsExactlyInAnyOrder(OrderStatus.CREATED, OrderStatus.CONFIRMED);
    }

    @Test
    void shouldFindOrdersByStatusAndDateRange() {
        // Given
        OffsetDateTime startDate = OffsetDateTime.now().minusDays(7);
        OffsetDateTime endDate = OffsetDateTime.now();
        
        Order order1 = createTestOrder(UUID.randomUUID(), OrderStatus.CONFIRMED);
        order1.setCreatedDate(startDate.plusDays(1));
        
        Order order2 = createTestOrder(UUID.randomUUID(), OrderStatus.CONFIRMED);
        order2.setCreatedDate(startDate.minusDays(1)); // Outside range
        
        Order order3 = createTestOrder(UUID.randomUUID(), OrderStatus.CREATED);
        order3.setCreatedDate(startDate.plusDays(2)); // Different status
        
        entityManager.persistAndFlush(order1);
        entityManager.persistAndFlush(order2);
        entityManager.persistAndFlush(order3);
        entityManager.clear();

        // When
        Page<Order> result = orderRepository.findByStatusAndCreatedDateBetween(
            OrderStatus.CONFIRMED, startDate, endDate, PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(order1.getId());
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    private Order createTestOrder() {
        return createTestOrder(UUID.randomUUID(), OrderStatus.CREATED);
    }

    private Order createTestOrder(UUID customerId, OrderStatus status) {
        return Order.builder()
            .customerId(customerId)
            .status(status)
            .totalAmount(BigDecimal.valueOf(100.00))
            .createdDate(OffsetDateTime.now())
            .items(List.of())
            .build();
    }
}
```

### Testing Custom Queries

```java
@DataJpaTest
@Testcontainers
class OrderCustomQueryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldFindOrdersWithTotalAmountGreaterThan() {
        // Given
        Order lowValueOrder = createTestOrderWithAmount(BigDecimal.valueOf(50.00));
        Order highValueOrder1 = createTestOrderWithAmount(BigDecimal.valueOf(150.00));
        Order highValueOrder2 = createTestOrderWithAmount(BigDecimal.valueOf(200.00));

        entityManager.persistAndFlush(lowValueOrder);
        entityManager.persistAndFlush(highValueOrder1);
        entityManager.persistAndFlush(highValueOrder2);

        // When
        List<Order> result = orderRepository.findOrdersWithTotalAmountGreaterThan(BigDecimal.valueOf(100.00));

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).extracting(Order::getTotalAmount)
            .allMatch(amount -> amount.compareTo(BigDecimal.valueOf(100.00)) > 0);
    }

    @Test
    void shouldFindOrderStatistics() {
        // Given
        UUID customerId = UUID.randomUUID();
        
        Order order1 = createTestOrder(customerId, OrderStatus.CONFIRMED, BigDecimal.valueOf(100.00));
        Order order2 = createTestOrder(customerId, OrderStatus.CONFIRMED, BigDecimal.valueOf(150.00));
        Order order3 = createTestOrder(customerId, OrderStatus.CANCELLED, BigDecimal.valueOf(75.00));

        entityManager.persistAndFlush(order1);
        entityManager.persistAndFlush(order2);
        entityManager.persistAndFlush(order3);

        // When
        OrderStatistics stats = orderRepository.findOrderStatisticsByCustomer(customerId);

        // Then
        assertThat(stats.getTotalOrders()).isEqualTo(3);
        assertThat(stats.getConfirmedOrders()).isEqualTo(2);
        assertThat(stats.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(325.00));
        assertThat(stats.getAverageAmount()).isEqualByComparingTo(BigDecimal.valueOf(108.33));
    }

    @Test
    void shouldFindTopCustomersByOrderValue() {
        // Given
        UUID customer1 = UUID.randomUUID();
        UUID customer2 = UUID.randomUUID();
        UUID customer3 = UUID.randomUUID();

        // Customer 1: Total 300.00
        entityManager.persistAndFlush(createTestOrder(customer1, OrderStatus.CONFIRMED, BigDecimal.valueOf(150.00)));
        entityManager.persistAndFlush(createTestOrder(customer1, OrderStatus.CONFIRMED, BigDecimal.valueOf(150.00)));

        // Customer 2: Total 500.00
        entityManager.persistAndFlush(createTestOrder(customer2, OrderStatus.CONFIRMED, BigDecimal.valueOf(500.00)));

        // Customer 3: Total 100.00
        entityManager.persistAndFlush(createTestOrder(customer3, OrderStatus.CONFIRMED, BigDecimal.valueOf(100.00)));

        // When
        List<CustomerOrderSummary> topCustomers = orderRepository.findTopCustomersByOrderValue(PageRequest.of(0, 2));

        // Then
        assertThat(topCustomers).hasSize(2);
        assertThat(topCustomers.get(0).getCustomerId()).isEqualTo(customer2);
        assertThat(topCustomers.get(0).getTotalValue()).isEqualByComparingTo(BigDecimal.valueOf(500.00));
        assertThat(topCustomers.get(1).getCustomerId()).isEqualTo(customer1);
        assertThat(topCustomers.get(1).getTotalValue()).isEqualByComparingTo(BigDecimal.valueOf(300.00));
    }

    private Order createTestOrderWithAmount(BigDecimal amount) {
        return createTestOrder(UUID.randomUUID(), OrderStatus.CONFIRMED, amount);
    }

    private Order createTestOrder(UUID customerId, OrderStatus status, BigDecimal amount) {
        return Order.builder()
            .customerId(customerId)
            .status(status)
            .totalAmount(amount)
            .createdDate(OffsetDateTime.now())
            .items(List.of())
            .build();
    }
}
```

### Testing Database Constraints

```java
@DataJpaTest
@Testcontainers
class OrderConstraintTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldEnforceUniqueConstraints() {
        // Given
        String orderNumber = "ORD-12345";
        Order order1 = createTestOrderWithNumber(orderNumber);
        Order order2 = createTestOrderWithNumber(orderNumber); // Duplicate order number

        // When
        orderRepository.save(order1);
        
        // Then
        assertThrows(DataIntegrityViolationException.class, () -> {
            orderRepository.save(order2);
            entityManager.flush();
        });
    }

    @Test
    void shouldEnforceNotNullConstraints() {
        // Given
        Order order = Order.builder()
            .customerId(null) // Should violate NOT NULL constraint
            .status(OrderStatus.CREATED)
            .totalAmount(BigDecimal.valueOf(100.00))
            .build();

        // When & Then
        assertThrows(DataIntegrityViolationException.class, () -> {
            orderRepository.save(order);
            entityManager.flush();
        });
    }

    @Test
    void shouldEnforceForeignKeyConstraints() {
        // Given
        OrderItem item = OrderItem.builder()
            .orderId(UUID.randomUUID()) // Non-existent order ID
            .productId(UUID.randomUUID())
            .quantity(1)
            .unitPrice(BigDecimal.valueOf(50.00))
            .build();

        // When & Then
        assertThrows(DataIntegrityViolationException.class, () -> {
            entityManager.persist(item);
            entityManager.flush();
        });
    }

    @Test
    void shouldEnforceCheckConstraints() {
        // Given
        Order order = createTestOrder();
        order.setTotalAmount(BigDecimal.valueOf(-10.00)); // Should violate CHECK constraint

        // When & Then
        assertThrows(DataIntegrityViolationException.class, () -> {
            orderRepository.save(order);
            entityManager.flush();
        });
    }

    private Order createTestOrderWithNumber(String orderNumber) {
        return Order.builder()
            .orderNumber(orderNumber)
            .customerId(UUID.randomUUID())
            .status(OrderStatus.CREATED)
            .totalAmount(BigDecimal.valueOf(100.00))
            .createdDate(OffsetDateTime.now())
            .build();
    }

    private Order createTestOrder() {
        return Order.builder()
            .customerId(UUID.randomUUID())
            .status(OrderStatus.CREATED)
            .totalAmount(BigDecimal.valueOf(100.00))
            .createdDate(OffsetDateTime.now())
            .build();
    }
}
```

## R2DBC Repository Integration Testing

Use `@DataR2dbcTest` for reactive repository testing.

### Reactive Repository Testing

```java
@DataR2dbcTest
@Testcontainers
class ReactiveOrderRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.r2dbc.url", () -> "r2dbc:postgresql://" + 
            postgres.getHost() + ":" + postgres.getFirstMappedPort() + "/testdb");
        registry.add("spring.r2dbc.username", postgres::getUsername);
        registry.add("spring.r2dbc.password", postgres::getPassword);
    }

    @Autowired
    private ReactiveOrderRepository orderRepository;

    @Test
    void shouldSaveAndRetrieveOrder() {
        // Given
        Order order = createTestOrder();

        // When & Then
        StepVerifier.create(
            orderRepository.save(order)
                .flatMap(savedOrder -> orderRepository.findById(savedOrder.getId()))
        )
        .assertNext(retrievedOrder -> {
            assertThat(retrievedOrder.getCustomerId()).isEqualTo(order.getCustomerId());
            assertThat(retrievedOrder.getStatus()).isEqualTo(order.getStatus());
            assertThat(retrievedOrder.getTotalAmount()).isEqualByComparingTo(order.getTotalAmount());
        })
        .verifyComplete();
    }

    @Test
    void shouldStreamOrdersByStatus() {
        // Given
        List<Order> orders = List.of(
            createTestOrder(OrderStatus.CREATED),
            createTestOrder(OrderStatus.CONFIRMED),
            createTestOrder(OrderStatus.CREATED)
        );

        // When & Then
        StepVerifier.create(
            Flux.fromIterable(orders)
                .flatMap(orderRepository::save)
                .then()
                .thenMany(orderRepository.findByStatus(OrderStatus.CREATED))
        )
        .expectNextCount(2)
        .verifyComplete();
    }

    @Test
    void shouldHandleTransactionRollback() {
        // Given
        Order order = createTestOrder();

        // When & Then
        StepVerifier.create(
            orderRepository.save(order)
                .flatMap(savedOrder -> {
                    // Simulate an error that should trigger rollback
                    return Mono.error(new RuntimeException("Simulated error"));
                })
                .then(orderRepository.count())
        )
        .expectError(RuntimeException.class)
        .verify();

        // Verify rollback occurred
        StepVerifier.create(orderRepository.count())
            .expectNext(0L)
            .verifyComplete();
    }

    private Order createTestOrder() {
        return createTestOrder(OrderStatus.CREATED);
    }

    private Order createTestOrder(OrderStatus status) {
        return Order.builder()
            .customerId(UUID.randomUUID())
            .status(status)
            .totalAmount(BigDecimal.valueOf(100.00))
            .createdDate(OffsetDateTime.now())
            .build();
    }
}
```

### Testing Reactive Streaming

```java
@Test
void shouldStreamLargeDatasetWithBackpressure() {
    // Given
    int totalOrders = 1000;
    Flux<Order> orderStream = Flux.range(1, totalOrders)
        .map(i -> createTestOrder("order-" + i));

    // When & Then
    StepVerifier.create(
        orderStream
            .flatMap(orderRepository::save)
            .then()
            .thenMany(orderRepository.findAll())
            .take(100) // Take only first 100 to test backpressure
    )
    .expectNextCount(100)
    .verifyComplete();
}

@Test
void shouldHandleStreamingErrors() {
    // Given
    Flux<Order> orderStream = Flux.range(1, 10)
        .map(i -> {
            if (i == 5) {
                // Create invalid order that will cause constraint violation
                return createInvalidOrder();
            }
            return createTestOrder("order-" + i);
        });

    // When & Then
    StepVerifier.create(
        orderStream
            .flatMap(order -> orderRepository.save(order)
                .onErrorResume(throwable -> {
                    // Log error and continue with next order
                    return Mono.empty();
                }))
    )
    .expectNextCount(9) // 10 orders - 1 invalid = 9 successful
    .verifyComplete();
}
```

## Transaction Testing

Test transaction behavior, isolation levels, and rollback scenarios.

### Testing Transactional Behavior

```java
@SpringBootTest
@Transactional
@Testcontainers
class TransactionIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @MockBean
    private NotificationService notificationService;

    @Test
    @Rollback
    void shouldRollbackOnServiceException() {
        // Given
        OrderCreationDto orderDto = createOrderCreationDto();
        doThrow(new RuntimeException("Notification failed"))
            .when(notificationService).sendOrderConfirmation(any());

        // When & Then
        assertThrows(RuntimeException.class, () -> orderService.createOrderWithNotification(orderDto));

        // Verify rollback occurred
        List<Order> orders = orderRepository.findAll();
        assertThat(orders).isEmpty();
    }

    @Test
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    void shouldCommitInSeparateTransaction() {
        // Given
        OrderCreationDto orderDto = createOrderCreationDto();

        // When
        Order createdOrder = orderService.createOrder(orderDto);

        // Then
        assertThat(createdOrder.getId()).isNotNull();
        
        // Verify data is committed in separate transaction
        Order savedOrder = orderRepository.findById(createdOrder.getId()).orElseThrow();
        assertThat(savedOrder.getStatus()).isEqualTo(OrderStatus.CREATED);
    }

    @Test
    void shouldHandleOptimisticLocking() {
        // Given
        Order order = createTestOrder();
        Order savedOrder = orderRepository.save(order);

        // Simulate concurrent modification
        Order order1 = orderRepository.findById(savedOrder.getId()).orElseThrow();
        Order order2 = orderRepository.findById(savedOrder.getId()).orElseThrow();

        order1.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order1);

        order2.setStatus(OrderStatus.CANCELLED);

        // When & Then
        assertThrows(OptimisticLockingFailureException.class, () -> orderRepository.save(order2));
    }
}
```

## Performance Testing

Test database performance characteristics and identify potential bottlenecks.

### Query Performance Testing

```java
@DataJpaTest
@Testcontainers
class OrderRepositoryPerformanceTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldPerformEfficientPaginatedQuery() {
        // Given
        int totalOrders = 10000;
        List<Order> orders = IntStream.range(0, totalOrders)
            .mapToObj(i -> createTestOrder("order-" + i))
            .toList();

        orders.forEach(entityManager::persist);
        entityManager.flush();
        entityManager.clear();

        // When
        long startTime = System.currentTimeMillis();
        Page<Order> page = orderRepository.findByStatus(OrderStatus.CREATED, PageRequest.of(100, 50));
        long endTime = System.currentTimeMillis();

        // Then
        assertThat(page.getContent()).hasSize(50);
        assertThat(endTime - startTime).isLessThan(1000); // Should complete within 1 second
    }

    @Test
    void shouldUseIndexForCustomerQuery() {
        // Given
        UUID customerId = UUID.randomUUID();
        List<Order> orders = IntStream.range(0, 1000)
            .mapToObj(i -> createTestOrder(customerId, "order-" + i))
            .toList();

        orders.forEach(entityManager::persist);
        entityManager.flush();
        entityManager.clear();

        // When
        long startTime = System.currentTimeMillis();
        List<Order> customerOrders = orderRepository.findByCustomerId(customerId);
        long endTime = System.currentTimeMillis();

        // Then
        assertThat(customerOrders).hasSize(1000);
        assertThat(endTime - startTime).isLessThan(100); // Should be fast with index
    }
}
```

## Database Migration Testing

Test database schema migrations and data migrations.

### Schema Migration Testing

```java
@SpringBootTest
@Testcontainers
class DatabaseMigrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Test
    void shouldApplyAllMigrations() {
        // Given - Container starts with empty database
        
        // When - Spring Boot applies migrations automatically
        
        // Then - Verify schema is correctly created
        try (Connection connection = DriverManager.getConnection(
            postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())) {
            
            DatabaseMetaData metaData = connection.getMetaData();
            
            // Verify tables exist
            ResultSet tables = metaData.getTables(null, null, "orders", null);
            assertThat(tables.next()).isTrue();
            
            ResultSet orderItems = metaData.getTables(null, null, "order_items", null);
            assertThat(orderItems.next()).isTrue();
            
            // Verify indexes exist
            ResultSet indexes = metaData.getIndexInfo(null, null, "orders", false, false);
            boolean customerIndexFound = false;
            while (indexes.next()) {
                if ("idx_orders_customer_id".equals(indexes.getString("INDEX_NAME"))) {
                    customerIndexFound = true;
                    break;
                }
            }
            assertThat(customerIndexFound).isTrue();
        }
    }
}
```

## Database Testing Best Practices

### 1. Use Appropriate Test Slices

```java
// Good: Use @DataJpaTest for repository testing
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {
    // Focus on repository behavior
}

// Bad: Use @SpringBootTest for simple repository tests
@SpringBootTest
class OrderRepositoryTest {
    // Loads entire application context unnecessarily
}
```

### 2. Manage Test Data Properly

```java
// Good: Clean setup and teardown
@BeforeEach
void setUp() {
    // Set up minimal test data
}

@AfterEach
void tearDown() {
    orderRepository.deleteAll();
}

// Bad: Shared test data between tests
static Order sharedOrder; // Can cause test dependencies
```

### 3. Test Real Database Scenarios

```java
// Good: Test actual database constraints
@Test
void shouldEnforceUniqueConstraint() {
    Order order1 = createOrderWithNumber("ORD-123");
    Order order2 = createOrderWithNumber("ORD-123");
    
    orderRepository.save(order1);
    
    assertThrows(DataIntegrityViolationException.class, 
        () -> orderRepository.save(order2));
}

// Bad: Testing only happy path scenarios
```

### 4. Use TestContainers for Realistic Testing

```java
// Good: Use actual database
@Container
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

// Bad: Use only embedded databases for all tests
// @AutoConfigureTestDatabase(replace = Replace.ANY) // H2 only
```

## Related Documentation

- [Integration Testing Fundamentals](Integration-Testing-Fundamentals.md) - Core integration testing principles
- [API Integration Testing](API-Integration-Testing.md) - Testing complete API workflows
- [Infrastructure Testing](Infrastructure-Testing.md) - Unit testing repository implementations