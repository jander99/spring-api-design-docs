# Spring Boot gRPC Integration Testing

> **📖 Reading Guide**
> **⏱️ Reading Time:** 8 minutes | **🎯 Level:** Intermediate
> **📋 Prerequisites:** [Unit Testing](unit-testing.md), Spring Boot testing
> **🎯 Key Topics:** @SpringBootTest • Embedded server • Real dependencies • End-to-end flows
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

Integration test gRPC services with real Spring context and dependencies.

---

## Overview

**Integration testing approach:**

| Aspect | Configuration |
|--------|---------------|
| Spring Context | Full application context |
| gRPC Server | Embedded (in-process or random port) |
| Dependencies | Real beans (repositories, services) |
| Database | Embedded or Testcontainers |

---

## Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>net.devh</groupId>
    <artifactId>grpc-server-spring-boot-starter</artifactId>
    <version>3.1.0.RELEASE</version>
    <scope>test</scope>
</dependency>
```

---

## Basic Integration Test

```java
@SpringBootTest(
    properties = {
        "grpc.server.in-process-name=test",
        "grpc.server.port=-1",
        "grpc.client.order-service.address=in-process:test"
    }
)
@DirtiesContext
class OrderServiceIntegrationTest {

    @Autowired
    private OrderRepository orderRepository;

    @GrpcClient("order-service")
    private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
    }

    @Test
    void testCreateAndGetOrder() {
        Order created = orderStub.createOrder(
            CreateOrderRequest.newBuilder()
                .setOrder(Order.newBuilder()
                    .setCustomerId("C1")
                    .setTotal(99.99)
                    .build())
                .build()
        );

        assertNotNull(created.getName());
        assertEquals("C1", created.getCustomerId());
        assertEquals(OrderStatus.PENDING, created.getStatus());

        Order retrieved = orderStub.getOrder(
            GetOrderRequest.newBuilder()
                .setName(created.getName())
                .build()
        );

        assertEquals(created.getName(), retrieved.getName());
        assertEquals(created.getCustomerId(), retrieved.getCustomerId());
    }

    @Test
    void testListOrders() throws InterruptedException {
        orderStub.createOrder(createOrderRequest("C1", 100.0));
        orderStub.createOrder(createOrderRequest("C1", 200.0));
        orderStub.createOrder(createOrderRequest("C1", 300.0));

        List<Order> received = new ArrayList<>();
        CountDownLatch latch = new CountDownLatch(1);

        OrderServiceGrpc.OrderServiceStub asyncStub = 
            OrderServiceGrpc.newStub(orderStub.getChannel());

        asyncStub.listOrders(
            ListOrdersRequest.newBuilder()
                .setPageSize(10)
                .build(),
            new StreamObserver<Order>() {
                @Override
                public void onNext(Order order) {
                    received.add(order);
                }

                @Override
                public void onError(Throwable t) {
                    fail("Stream error: " + t.getMessage());
                }

                @Override
                public void onCompleted() {
                    latch.countDown();
                }
            }
        );

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertEquals(3, received.size());
    }
}
```

---

## Testing with Database

**H2 in-memory database:**

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
```

**Test with real database operations:**

```java
@SpringBootTest
@DirtiesContext
class OrderServiceDatabaseTest {

    @Autowired
    private OrderRepository orderRepository;

    @GrpcClient("order-service")
    private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

    @Test
    @Transactional
    void testOrderPersistence() {
        Order created = orderStub.createOrder(
            CreateOrderRequest.newBuilder()
                .setOrder(Order.newBuilder()
                    .setCustomerId("C1")
                    .setTotal(150.0)
                    .build())
                .build()
        );

        String orderId = extractOrderId(created.getName());
        Optional<OrderEntity> persisted = orderRepository.findById(orderId);

        assertTrue(persisted.isPresent());
        assertEquals("C1", persisted.get().getCustomerId());
        assertEquals(150.0, persisted.get().getTotal());
    }
}
```

---

## Testing Security

```java
@SpringBootTest
@DirtiesContext
class OrderServiceSecurityTest {

    @GrpcClient("order-service")
    private OrderServiceGrpc.OrderServiceBlockingStub stub;

    @MockBean
    private JwtDecoder jwtDecoder;

    @Test
    void testAuthenticatedRequest() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("user123");
        when(jwt.getClaimAsStringList("roles")).thenReturn(List.of("USER"));
        when(jwtDecoder.decode(anyString())).thenReturn(jwt);

        Metadata metadata = new Metadata();
        metadata.put(
            Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER),
            "Bearer test.jwt.token"
        );

        OrderServiceGrpc.OrderServiceBlockingStub authenticatedStub = 
            stub.withCallCredentials(new CallCredentials() {
                @Override
                public void applyRequestMetadata(
                        RequestInfo requestInfo,
                        Executor appExecutor,
                        MetadataApplier applier) {
                    applier.apply(metadata);
                }
            });

        Order order = authenticatedStub.getOrder(
            GetOrderRequest.newBuilder()
                .setName("orders/123")
                .build()
        );

        assertNotNull(order);
    }
}
```

---

## Best Practices

### ✅ Do:
- Use `@DirtiesContext` to reset Spring context
- Clean database between tests
- Test full request-response flows
- Verify database persistence
- Test security integration
- Use embedded/in-memory dependencies

### ❌ Don't:
- Don't skip cleanup between tests
- Don't share state across test methods
- Don't ignore transaction boundaries
- Don't test units in integration tests
- Don't use production configurations

---

**Navigation:** [← Unit Testing](unit-testing.md) | [Testcontainers →](testcontainers.md)
