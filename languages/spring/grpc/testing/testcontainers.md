# Spring Boot gRPC E2E Testing with Testcontainers

> **📖 Reading Guide**
> **⏱️ Reading Time:** 6 minutes | **🎯 Level:** Advanced
> **📋 Prerequisites:** [Integration Testing](integration-testing.md), Docker knowledge
> **🎯 Key Topics:** Testcontainers • Real databases • Service dependencies • E2E flows
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

End-to-end test gRPC services with real external dependencies using Testcontainers.

---

## Dependencies

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <version>1.19.3</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <version>1.19.3</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>1.19.3</version>
    <scope>test</scope>
</dependency>
</dependencies>
```

---

## Basic Testcontainers Setup

```java
@SpringBootTest
@Testcontainers
@DirtiesContext
class OrderServiceE2ETest {

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

    @GrpcClient("order-service")
    private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

    @Test
    void testFullOrderLifecycle() {
        Order created = orderStub.createOrder(
            CreateOrderRequest.newBuilder()
                .setOrder(Order.newBuilder()
                    .setCustomerId("C1")
                    .setTotal(199.99)
                    .build())
                .build()
        );

        assertNotNull(created.getName());
        assertEquals(OrderStatus.PENDING, created.getStatus());

        Order updated = orderStub.updateOrder(
            UpdateOrderRequest.newBuilder()
                .setOrder(created.toBuilder()
                    .setStatus(OrderStatus.SHIPPED)
                    .build())
                .build()
        );

        assertEquals(OrderStatus.SHIPPED, updated.getStatus());
    }
}
```

---

## Multi-Container Setup

```java
@SpringBootTest
@Testcontainers
class OrderServiceWithDependenciesTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
    }

    @Test
    void testWithAllDependencies() {
       
    }
}
```

---

**Navigation:** [← Integration Testing](integration-testing.md) | [Observability →](../observability/metrics.md)
