# Spring Boot gRPC Unit Testing

> **📖 Reading Guide**
> **⏱️ Reading Time:** 10 minutes | **🎯 Level:** Intermediate
> **📋 Prerequisites:** [Getting Started](../getting-started.md), JUnit 5 knowledge
> **🎯 Key Topics:** InProcessServer • GrpcCleanupRule • Mock services • Fast testing
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

Unit test gRPC services with InProcessServer for fast, isolated tests without network overhead.

---

## Overview

**Unit testing strategy:**

| Component | Tool | Speed | Isolation |
|-----------|------|-------|-----------|
| Service logic | InProcessServer | Fast | Full |
| Client stubs | Mock server | Very fast | Full |
| Interceptors | InProcessServer | Fast | Partial |

**Key benefit:** InProcessServer runs gRPC server and client in same JVM process (no network, no ports).

---

## Dependencies

**Maven:**
```xml
<dependencies>
    <!-- Spring Boot Test -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- gRPC Testing -->
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-testing</artifactId>
        <version>1.60.0</version>
        <scope>test</scope>
    </dependency>
    
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
</dependencies>
```

---

## Basic Unit Test

### Service Test with InProcessServer

```java
package com.example.order.grpc;

import io.grpc.inprocess.InProcessChannelBuilder;
import io.grpc.inprocess.InProcessServerBuilder;
import io.grpc.testing.GrpcCleanupRule;
import org.junit.Rule;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OrderServiceImplTest {

    @Rule
    public final GrpcCleanupRule grpcCleanup = new GrpcCleanupRule();

    @Mock
    private OrderRepository orderRepository;
    
    @Mock
    private OrderService orderService;

    private OrderServiceGrpc.OrderServiceBlockingStub blockingStub;
    private AutoCloseable mocks;

    @BeforeEach
    void setUp() throws Exception {
        mocks = MockitoAnnotations.openMocks(this);
        
        String serverName = InProcessServerBuilder.generateName();

        grpcCleanup.register(
            InProcessServerBuilder.forName(serverName)
                .directExecutor()
                .addService(new OrderServiceImpl(orderService, orderRepository))
                .build()
                .start()
        );

        blockingStub = OrderServiceGrpc.newBlockingStub(
            grpcCleanup.register(
                InProcessChannelBuilder.forName(serverName)
                    .directExecutor()
                    .build()
            )
        );
    }

    @AfterEach
    void tearDown() throws Exception {
        if (mocks != null) {
            mocks.close();
        }
    }

    @Test
    void testGetOrder_Success() {
        Order expectedOrder = Order.newBuilder()
            .setName("orders/123")
            .setCustomerId("C1")
            .setTotal(99.99)
            .setStatus(OrderStatus.PENDING)
            .build();
        
        when(orderRepository.findById("123"))
            .thenReturn(Optional.of(toEntity(expectedOrder)));

        Order result = blockingStub.getOrder(
            GetOrderRequest.newBuilder()
                .setName("orders/123")
                .build()
        );

        assertEquals("orders/123", result.getName());
        assertEquals("C1", result.getCustomerId());
        assertEquals(99.99, result.getTotal());
        verify(orderRepository).findById("123");
    }

    @Test
    void testGetOrder_NotFound() {
        when(orderRepository.findById("999"))
            .thenReturn(Optional.empty());

        StatusRuntimeException exception = assertThrows(
            StatusRuntimeException.class,
            () -> blockingStub.getOrder(
                GetOrderRequest.newBuilder()
                    .setName("orders/999")
                    .build()
            )
        );

        assertEquals(Status.Code.NOT_FOUND, exception.getStatus().getCode());
        assertTrue(exception.getStatus().getDescription().contains("not found"));
    }

    @Test
    void testCreateOrder_Success() {
        Order newOrder = Order.newBuilder()
            .setCustomerId("C1")
            .setTotal(150.00)
            .build();
        
        OrderEntity savedEntity = new OrderEntity();
        savedEntity.setId("456");
        savedEntity.setCustomerId("C1");
        savedEntity.setTotal(150.00);
        savedEntity.setStatus(OrderStatus.PENDING);
        
        when(orderRepository.save(any(OrderEntity.class)))
            .thenReturn(savedEntity);

        Order result = blockingStub.createOrder(
            CreateOrderRequest.newBuilder()
                .setOrder(newOrder)
                .build()
        );

        assertEquals("orders/456", result.getName());
        assertEquals("C1", result.getCustomerId());
        assertEquals(OrderStatus.PENDING, result.getStatus());
        verify(orderRepository).save(any(OrderEntity.class));
    }

    @Test
    void testCreateOrder_InvalidInput() {
        Order invalidOrder = Order.newBuilder()
            .setTotal(-10.0)
            .build();

        StatusRuntimeException exception = assertThrows(
            StatusRuntimeException.class,
            () -> blockingStub.createOrder(
                CreateOrderRequest.newBuilder()
                    .setOrder(invalidOrder)
                    .build()
            )
        );

        assertEquals(Status.Code.INVALID_ARGUMENT, exception.getStatus().getCode());
    }
}
```

---

## Testing Streaming Methods

### Server Streaming Test

```java
@Test
void testStreamOrders() throws InterruptedException {
    List<OrderEntity> mockOrders = List.of(
        createOrderEntity("1", "C1", 100.0),
        createOrderEntity("2", "C1", 200.0),
        createOrderEntity("3", "C1", 300.0)
    );
    
    when(orderRepository.findByCustomerIdWithPagination(eq("C1"), any(), anyInt()))
        .thenReturn(mockOrders);

    List<Order> received = new ArrayList<>();
    CountDownLatch latch = new CountDownLatch(1);

    StreamObserver<Order> responseObserver = new StreamObserver<>() {
        @Override
        public void onNext(Order order) {
            received.add(order);
        }

        @Override
        public void onError(Throwable t) {
            fail("Stream should not error: " + t.getMessage());
        }

        @Override
        public void onCompleted() {
            latch.countDown();
        }
    };

    OrderServiceGrpc.OrderServiceStub asyncStub = 
        OrderServiceGrpc.newStub(channel);

    asyncStub.listOrders(
        ListOrdersRequest.newBuilder()
            .setPageSize(10)
            .build(),
        responseObserver
    );

    assertTrue(latch.await(5, TimeUnit.SECONDS));
    assertEquals(3, received.size());
    assertEquals("orders/1", received.get(0).getName());
}
```

### Client Streaming Test

```java
@Test
void testBatchCreateOrders() throws InterruptedException {
    CountDownLatch latch = new CountDownLatch(1);
    AtomicReference<BatchCreateResponse> response = new AtomicReference<>();

    StreamObserver<BatchCreateResponse> responseObserver = new StreamObserver<>() {
        @Override
        public void onNext(BatchCreateResponse value) {
            response.set(value);
        }

        @Override
        public void onError(Throwable t) {
            fail("Should not error: " + t.getMessage());
        }

        @Override
        public void onCompleted() {
            latch.countDown();
        }
    };

    when(orderRepository.save(any(OrderEntity.class)))
        .thenAnswer(invocation -> {
            OrderEntity entity = invocation.getArgument(0);
            entity.setId(UUID.randomUUID().toString());
            return entity;
        });

    OrderServiceGrpc.OrderServiceStub asyncStub = 
        OrderServiceGrpc.newStub(channel);

    StreamObserver<CreateOrderRequest> requestObserver = 
        asyncStub.batchCreateOrders(responseObserver);

    requestObserver.onNext(createOrderRequest("C1", 100.0));
    requestObserver.onNext(createOrderRequest("C2", 200.0));
    requestObserver.onNext(createOrderRequest("C3", 300.0));
    requestObserver.onCompleted();

    assertTrue(latch.await(5, TimeUnit.SECONDS));
    assertEquals(3, response.get().getSuccessCount());
    assertEquals(0, response.get().getFailureCount());
}
```

---

## Testing Error Handling

### Exception to Status Code Mapping

```java
@Test
void testAuthorizationFailure() {
    Order order = Order.newBuilder()
        .setName("orders/123")
        .setCustomerId("C999")
        .build();
    
    when(orderRepository.findById("123"))
        .thenReturn(Optional.of(toEntity(order)));

    StatusRuntimeException exception = assertThrows(
        StatusRuntimeException.class,
        () -> blockingStub.getOrder(
            GetOrderRequest.newBuilder()
                .setName("orders/123")
                .build()
        )
    );

    assertEquals(Status.Code.PERMISSION_DENIED, exception.getStatus().getCode());
}

@Test
void testInternalError() {
    when(orderRepository.findById(any()))
        .thenThrow(new RuntimeException("Database connection failed"));

    StatusRuntimeException exception = assertThrows(
        StatusRuntimeException.class,
        () -> blockingStub.getOrder(
            GetOrderRequest.newBuilder()
                .setName("orders/123")
                .build()
        )
    );

    assertEquals(Status.Code.INTERNAL, exception.getStatus().getCode());
    verify(orderRepository).findById("123");
}
```

---

## Testing Interceptors

### Interceptor Unit Test

```java
class AuthenticationInterceptorTest {

    private AuthenticationInterceptor interceptor;
    private JwtDecoder jwtDecoder;
    private ServerCall<String, String> call;
    private Metadata headers;

    @BeforeEach
    void setUp() {
        jwtDecoder = mock(JwtDecoder.class);
        interceptor = new AuthenticationInterceptor(jwtDecoder);
        call = mock(ServerCall.class);
        headers = new Metadata();
        
        when(call.getMethodDescriptor()).thenReturn(
            MethodDescriptor.newBuilder()
                .setFullMethodName("example.OrderService/GetOrder")
                .setType(MethodDescriptor.MethodType.UNARY)
                .setRequestMarshaller(StringMarshaller.INSTANCE)
                .setResponseMarshaller(StringMarshaller.INSTANCE)
                .build()
        );
    }

    @Test
    void shouldAcceptValidToken() {
        String token = "valid.jwt.token";
        headers.put(
            Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER),
            "Bearer " + token
        );
        
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("user123");
        when(jwt.getClaimAsStringList("roles")).thenReturn(List.of("USER"));
        when(jwtDecoder.decode(token)).thenReturn(jwt);
        
        ServerCallHandler<String, String> next = mock(ServerCallHandler.class);
        when(next.startCall(any(), any())).thenReturn(mock(ServerCall.Listener.class));

        interceptor.interceptCall(call, headers, next);

        verify(next).startCall(any(), eq(headers));
        verify(call, never()).close(any(), any());
    }

    @Test
    void shouldRejectMissingToken() {
        ServerCallHandler<String, String> next = mock(ServerCallHandler.class);

        interceptor.interceptCall(call, headers, next);

        verify(call).close(
            argThat(status -> status.getCode() == Status.Code.UNAUTHENTICATED),
            any()
        );
        verify(next, never()).startCall(any(), any());
    }
}
```

---

## Mock Services

### Creating Mock gRPC Service

```java
class MockOrderService extends OrderServiceGrpc.OrderServiceImplBase {

    private final Map<String, Order> orders = new ConcurrentHashMap<>();

    @Override
    public void getOrder(GetOrderRequest request, 
                        StreamObserver<Order> responseObserver) {
        String orderId = extractOrderId(request.getName());
        Order order = orders.get(orderId);
        
        if (order == null) {
            responseObserver.onError(
                Status.NOT_FOUND.asRuntimeException()
            );
        } else {
            responseObserver.onNext(order);
            responseObserver.onCompleted();
        }
    }

    @Override
    public void createOrder(CreateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        String orderId = UUID.randomUUID().toString();
        Order order = request.getOrder().toBuilder()
            .setName("orders/" + orderId)
            .setStatus(OrderStatus.PENDING)
            .build();
        
        orders.put(orderId, order);
        responseObserver.onNext(order);
        responseObserver.onCompleted();
    }

    public void addOrder(String orderId, Order order) {
        orders.put(orderId, order);
    }

    public void clear() {
        orders.clear();
    }
}
```

### Using Mock Service

```java
@Test
void testClientWithMockServer() throws Exception {
    MockOrderService mockService = new MockOrderService();
    mockService.addOrder("123", Order.newBuilder()
        .setName("orders/123")
        .setCustomerId("C1")
        .build());

    String serverName = InProcessServerBuilder.generateName();
    
    grpcCleanup.register(
        InProcessServerBuilder.forName(serverName)
            .directExecutor()
            .addService(mockService)
            .build()
            .start()
    );

    OrderServiceGrpc.OrderServiceBlockingStub stub = 
        OrderServiceGrpc.newBlockingStub(
            grpcCleanup.register(
                InProcessChannelBuilder.forName(serverName)
                    .directExecutor()
                    .build()
            )
        );

    Order order = stub.getOrder(
        GetOrderRequest.newBuilder()
            .setName("orders/123")
            .build()
    );

    assertEquals("C1", order.getCustomerId());
}
```

---

## Best Practices

### ✅ Do:
- Use InProcessServer for fast unit tests
- Mock repository and service dependencies
- Test both success and error paths
- Verify correct status codes for errors
- Use `GrpcCleanupRule` to clean up resources
- Test interceptors independently
- Keep tests focused on single behavior

### ❌ Don't:
- Don't use real network connections
- Don't skip error case testing
- Don't test implementation details
- Don't share mocks across test methods
- Don't forget to verify mock interactions
- Don't test multiple behaviors in one test
- Don't ignore timeout scenarios

---

## Related Documentation

- **[Integration Testing](integration-testing.md)** - @SpringBootTest patterns
- **[Testcontainers](testcontainers.md)** - E2E testing
- **[Spring Testing](/languages/spring/testing/)** - General testing strategies

---

**Navigation:** [← Security](../security.md) | [Integration Testing →](integration-testing.md)
