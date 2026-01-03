# Database Integration Testing

## Overview

Database integration testing checks that repositories work with real databases. Tests verify data storage, queries, transactions, and rules.

## Core Principles

1. **Test Real Databases**: Use real databases, not fake ones
2. **Test Custom Queries**: Check searches, joins, and special database features
3. **Test Transactions**: Check that saves and rollbacks work
4. **Check Database Rules**: Test rules, keys, and data correctness
5. **Use Test Containers**: Run real databases in your tests

## JPA Repository Integration Testing

Use `@DataJpaTest` for repository testing with real databases.

### Simple Repository Tests

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
        Order order = createTestOrder();

        Order savedOrder = orderRepository.save(order);
        entityManager.flush();
        entityManager.clear();

        Optional<Order> retrieved = orderRepository.findById(savedOrder.getId());
        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().getCustomerId()).isEqualTo(order.getCustomerId());
        assertThat(retrieved.get().getStatus()).isEqualTo(order.getStatus());
        assertThat(retrieved.get().getTotalAmount()).isEqualByComparingTo(order.getTotalAmount());
    }

    @Test
    void shouldFindOrdersByCustomerId() {
        UUID customerId = UUID.randomUUID();
        Order order1 = createTestOrder(customerId, OrderStatus.CREATED);
        Order order2 = createTestOrder(customerId, OrderStatus.CONFIRMED);
        Order order3 = createTestOrder(UUID.randomUUID(), OrderStatus.CREATED);

        entityManager.persistAndFlush(order1);
        entityManager.persistAndFlush(order2);
        entityManager.persistAndFlush(order3);
        entityManager.clear();

        List<Order> orders = orderRepository.findByCustomerId(customerId);

        assertThat(orders).hasSize(2);
        assertThat(orders).extracting(Order::getCustomerId)
            .containsOnly(customerId);
        assertThat(orders).extracting(Order::getStatus)
            .containsExactlyInAnyOrder(OrderStatus.CREATED, OrderStatus.CONFIRMED);
    }

    @Test
    void shouldFindOrdersByStatusAndDateRange() {
        OffsetDateTime startDate = OffsetDateTime.now().minusDays(7);
        OffsetDateTime endDate = OffsetDateTime.now();
        
        Order order1 = createTestOrder(UUID.randomUUID(), OrderStatus.CONFIRMED);
        order1.setCreatedDate(startDate.plusDays(1));
        
        Order order2 = createTestOrder(UUID.randomUUID(), OrderStatus.CONFIRMED);
        order2.setCreatedDate(startDate.minusDays(1));
        
        Order order3 = createTestOrder(UUID.randomUUID(), OrderStatus.CREATED);
        order3.setCreatedDate(startDate.plusDays(2));
        
        entityManager.persistAndFlush(order1);
        entityManager.persistAndFlush(order2);
        entityManager.persistAndFlush(order3);
        entityManager.clear();

        Page<Order> result = orderRepository.findByStatusAndCreatedDateBetween(
            OrderStatus.CONFIRMED, startDate, endDate, PageRequest.of(0, 10));

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

### Custom Query Tests

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
        Order lowOrder = createTestOrderWithAmount(BigDecimal.valueOf(50.00));
        Order highOrder1 = createTestOrderWithAmount(BigDecimal.valueOf(150.00));
        Order highOrder2 = createTestOrderWithAmount(BigDecimal.valueOf(200.00));

        entityManager.persistAndFlush(lowOrder);
        entityManager.persistAndFlush(highOrder1);
        entityManager.persistAndFlush(highOrder2);

        List<Order> result = orderRepository.findOrdersWithTotalAmountGreaterThan(BigDecimal.valueOf(100.00));

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Order::getTotalAmount)
            .allMatch(amount -> amount.compareTo(BigDecimal.valueOf(100.00)) > 0);
    }

    @Test
    void shouldFindOrderStatistics() {
        UUID customerId = UUID.randomUUID();
        
        Order o1 = createTestOrder(customerId, OrderStatus.CONFIRMED, BigDecimal.valueOf(100.00));
        Order o2 = createTestOrder(customerId, OrderStatus.CONFIRMED, BigDecimal.valueOf(150.00));
        Order o3 = createTestOrder(customerId, OrderStatus.CANCELLED, BigDecimal.valueOf(75.00));

        entityManager.persistAndFlush(o1);
        entityManager.persistAndFlush(o2);
        entityManager.persistAndFlush(o3);

        OrderStatistics stats = orderRepository.findOrderStatisticsByCustomer(customerId);

        assertThat(stats.getTotalOrders()).isEqualTo(3);
        assertThat(stats.getConfirmedOrders()).isEqualTo(2);
        assertThat(stats.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(325.00));
        assertThat(stats.getAverageAmount()).isEqualByComparingTo(BigDecimal.valueOf(108.33));
    }

    @Test
    void shouldFindTopCustomersByOrderValue() {
        UUID c1 = UUID.randomUUID();
        UUID c2 = UUID.randomUUID();
        UUID c3 = UUID.randomUUID();

        entityManager.persistAndFlush(createTestOrder(c1, OrderStatus.CONFIRMED, BigDecimal.valueOf(150.00)));
        entityManager.persistAndFlush(createTestOrder(c1, OrderStatus.CONFIRMED, BigDecimal.valueOf(150.00)));
        entityManager.persistAndFlush(createTestOrder(c2, OrderStatus.CONFIRMED, BigDecimal.valueOf(500.00)));
        entityManager.persistAndFlush(createTestOrder(c3, OrderStatus.CONFIRMED, BigDecimal.valueOf(100.00)));

        List<CustomerOrderSummary> top = orderRepository.findTopCustomersByOrderValue(PageRequest.of(0, 2));

        assertThat(top).hasSize(2);
        assertThat(top.get(0).getCustomerId()).isEqualTo(c2);
        assertThat(top.get(0).getTotalValue()).isEqualByComparingTo(BigDecimal.valueOf(500.00));
        assertThat(top.get(1).getCustomerId()).isEqualTo(c1);
        assertThat(top.get(1).getTotalValue()).isEqualByComparingTo(BigDecimal.valueOf(300.00));
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

### Constraint Tests

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
        String number = "ORD-12345";
        Order o1 = createTestOrderWithNumber(number);
        Order o2 = createTestOrderWithNumber(number);

        orderRepository.save(o1);
        
        assertThrows(DataIntegrityViolationException.class, () -> {
            orderRepository.save(o2);
            entityManager.flush();
        });
    }

    @Test
    void shouldEnforceNotNullConstraints() {
        Order order = Order.builder()
            .customerId(null)
            .status(OrderStatus.CREATED)
            .totalAmount(BigDecimal.valueOf(100.00))
            .build();

        assertThrows(DataIntegrityViolationException.class, () -> {
            orderRepository.save(order);
            entityManager.flush();
        });
    }

    @Test
    void shouldEnforceForeignKeyConstraints() {
        OrderItem item = OrderItem.builder()
            .orderId(UUID.randomUUID())
            .productId(UUID.randomUUID())
            .quantity(1)
            .unitPrice(BigDecimal.valueOf(50.00))
            .build();

        assertThrows(DataIntegrityViolationException.class, () -> {
            entityManager.persist(item);
            entityManager.flush();
        });
    }

    @Test
    void shouldEnforceCheckConstraints() {
        Order order = createTestOrder();
        order.setTotalAmount(BigDecimal.valueOf(-10.00));

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

Use `@DataR2dbcTest` for testing reactive repositories.

### Reactive Tests

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
        Order order = createTestOrder();

        StepVerifier.create(
            orderRepository.save(order)
                .flatMap(saved -> orderRepository.findById(saved.getId()))
        )
        .assertNext(retrieved -> {
            assertThat(retrieved.getCustomerId()).isEqualTo(order.getCustomerId());
            assertThat(retrieved.getStatus()).isEqualTo(order.getStatus());
            assertThat(retrieved.getTotalAmount()).isEqualByComparingTo(order.getTotalAmount());
        })
        .verifyComplete();
    }

    @Test
    void shouldStreamOrdersByStatus() {
        List<Order> orders = List.of(
            createTestOrder(OrderStatus.CREATED),
            createTestOrder(OrderStatus.CONFIRMED),
            createTestOrder(OrderStatus.CREATED)
        );

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
        Order order = createTestOrder();

        StepVerifier.create(
            orderRepository.save(order)
                .flatMap(saved -> Mono.error(new RuntimeException("Simulated error")))
                .then(orderRepository.count())
        )
        .expectError(RuntimeException.class)
        .verify();

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

### Stream Tests

```java
@Test
void shouldStreamLargeDatasetWithBackpressure() {
    Flux<Order> orderStream = Flux.range(1, 1000)
        .map(i -> createTestOrder("order-" + i));

    StepVerifier.create(
        orderStream
            .flatMap(orderRepository::save)
            .then()
            .thenMany(orderRepository.findAll())
            .take(100)
    )
    .expectNextCount(100)
    .verifyComplete();
}

@Test
void shouldHandleStreamingErrors() {
    Flux<Order> orderStream = Flux.range(1, 10)
        .map(i -> {
            if (i == 5) {
                return createInvalidOrder();
            }
            return createTestOrder("order-" + i);
        });

    StepVerifier.create(
        orderStream
            .flatMap(order -> orderRepository.save(order)
                .onErrorResume(e -> Mono.empty()))
    )
    .expectNextCount(9)
    .verifyComplete();
}
```

## Transaction Testing

Test how transactions behave, including rollbacks and isolation.

### Transaction Behavior Tests

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
        OrderCreationDto dto = createOrderCreationDto();
        doThrow(new RuntimeException("Notification failed"))
            .when(notificationService).sendOrderConfirmation(any());

        assertThrows(RuntimeException.class, () -> orderService.createOrderWithNotification(dto));

        List<Order> orders = orderRepository.findAll();
        assertThat(orders).isEmpty();
    }

    @Test
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    void shouldCommitInSeparateTransaction() {
        OrderCreationDto dto = createOrderCreationDto();
        Order created = orderService.createOrder(dto);

        assertThat(created.getId()).isNotNull();
        
        Order saved = orderRepository.findById(created.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(OrderStatus.CREATED);
    }

    @Test
    void shouldHandleOptimisticLocking() {
        Order order = createTestOrder();
        Order saved = orderRepository.save(order);

        Order o1 = orderRepository.findById(saved.getId()).orElseThrow();
        Order o2 = orderRepository.findById(saved.getId()).orElseThrow();

        o1.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(o1);

        o2.setStatus(OrderStatus.CANCELLED);

        assertThrows(OptimisticLockingFailureException.class, () -> orderRepository.save(o2));
    }
}
```

## Performance Testing

Test how fast database queries run and find slow spots.

### Performance Tests

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
        int total = 10000;
        List<Order> orders = IntStream.range(0, total)
            .mapToObj(i -> createTestOrder("order-" + i))
            .toList();

        orders.forEach(entityManager::persist);
        entityManager.flush();
        entityManager.clear();

        long start = System.currentTimeMillis();
        Page<Order> page = orderRepository.findByStatus(OrderStatus.CREATED, PageRequest.of(100, 50));
        long end = System.currentTimeMillis();

        assertThat(page.getContent()).hasSize(50);
        assertThat(end - start).isLessThan(1000);
    }

    @Test
    void shouldUseIndexForCustomerQuery() {
        UUID id = UUID.randomUUID();
        List<Order> orders = IntStream.range(0, 1000)
            .mapToObj(i -> createTestOrder(id, "order-" + i))
            .toList();

        orders.forEach(entityManager::persist);
        entityManager.flush();
        entityManager.clear();

        long start = System.currentTimeMillis();
        List<Order> found = orderRepository.findByCustomerId(id);
        long end = System.currentTimeMillis();

        assertThat(found).hasSize(1000);
        assertThat(end - start).isLessThan(100);
    }
}
```

## Database Migration Testing

Test that schema and data migrations work correctly.

### Migration Tests

```java
@SpringBootTest
@Testcontainers
class DatabaseMigrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Test
    void shouldApplyAllMigrations() {
        try (Connection conn = DriverManager.getConnection(
            postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())) {
            
            DatabaseMetaData meta = conn.getMetaData();
            
            ResultSet tables = meta.getTables(null, null, "orders", null);
            assertThat(tables.next()).isTrue();
            
            ResultSet items = meta.getTables(null, null, "order_items", null);
            assertThat(items.next()).isTrue();
            
            ResultSet idx = meta.getIndexInfo(null, null, "orders", false, false);
            boolean found = false;
            while (idx.next()) {
                if ("idx_orders_customer_id".equals(idx.getString("INDEX_NAME"))) {
                    found = true;
                    break;
                }
            }
            assertThat(found).isTrue();
        }
    }
}
```

## Best Practices

### 1. Choose the Right Test Type

```java
// Good: Use @DataJpaTest for repository testing
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {
    // Test only repository behavior
}

// Bad: Use @SpringBootTest for simple repository tests
@SpringBootTest
class OrderRepositoryTest {
    // Loads unnecessary application context
}
```

### 2. Clean Up Test Data

```java
// Good: Clean setup and teardown
@BeforeEach
void setUp() {
    // Create fresh test data
}

@AfterEach
void tearDown() {
    orderRepository.deleteAll();
}

// Bad: Share test data between tests
static Order sharedOrder; // Causes test dependencies
```

### 3. Test Database Rules

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

// Bad: Test only success cases
```

### 4. Use TestContainers

```java
// Good: Use actual database container
@Container
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

// Bad: Use only embedded databases
// @AutoConfigureTestDatabase(replace = Replace.ANY) // H2 only
```

## Related Documentation

- [Integration Testing Fundamentals](integration-testing-fundamentals.md) - Basic testing ideas
- [API Integration Testing](api-integration-testing.md) - Testing API features
- [Infrastructure Testing](../specialized-testing/infrastructure-testing.md) - Testing repositories