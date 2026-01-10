# Spring Boot Unary gRPC Services

> **📖 Reading Guide**
> **⏱️ Reading Time:** 8 minutes | **🎯 Level:** Beginner to Intermediate
> **📋 Prerequisites:** [Getting Started](getting-started.md), basic Spring Boot knowledge
> **🎯 Key Topics:** Simple request-response • CRUD operations • Error handling • Best practices
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

Unary RPCs are simple request-response operations - the most common gRPC pattern.

---

## Overview

**Unary RPC:** Client sends one request, server returns one response.

```
Client  ──────(Request)──────>  Server
        <────(Response)────────
```

**Common use cases:**
- CRUD operations (Get, Create, Update, Delete)
- Simple queries
- Command operations
- Validation requests

---

## Basic Unary Service

### Protobuf Definition

```protobuf
syntax = "proto3";

package example.order.v1;

option java_package = "com.example.order.grpc";
option java_multiple_files = true;

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order) {}
  rpc CreateOrder(CreateOrderRequest) returns (Order) {}
  rpc UpdateOrder(UpdateOrderRequest) returns (Order) {}
  rpc DeleteOrder(DeleteOrderRequest) returns (google.protobuf.Empty) {}
}

message GetOrderRequest {
  string name = 1;  // Format: orders/{order_id}
}

message CreateOrderRequest {
  Order order = 1;
}

message UpdateOrderRequest {
  Order order = 1;
}

message DeleteOrderRequest {
  string name = 1;
}

message Order {
  string name = 1;
  string customer_id = 2;
  OrderStatus status = 3;
  double total = 4;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  PENDING = 1;
  PROCESSING = 2;
  SHIPPED = 3;
}
```

### Implementation

```java
package com.example.order.grpc;

import com.example.order.service.OrderService;
import com.example.order.exception.OrderNotFoundException;
import com.google.protobuf.Empty;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

@GrpcService
public class OrderServiceGrpc extends OrderServiceGrpc.OrderServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceGrpc.class);
    
    private final OrderService orderService;

    @Autowired
    public OrderServiceGrpc(OrderService orderService) {
        this.orderService = orderService;
    }

    @Override
    public void getOrder(GetOrderRequest request, 
                        StreamObserver<Order> responseObserver) {
        try {
            log.debug("GetOrder called: {}", request.getName());
            
            Order order = orderService.getOrder(request.getName());
            
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
        } catch (OrderNotFoundException e) {
            log.warn("Order not found: {}", request.getName());
            responseObserver.onError(
                Status.NOT_FOUND
                    .withDescription(e.getMessage())
                    .asRuntimeException()
            );
        } catch (Exception e) {
            log.error("Error getting order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }

    @Override
    public void createOrder(CreateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        try {
            log.debug("CreateOrder called");
            
            Order order = orderService.createOrder(request.getOrder());
            
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
        } catch (IllegalArgumentException e) {
            log.warn("Invalid order data: {}", e.getMessage());
            responseObserver.onError(
                Status.INVALID_ARGUMENT
                    .withDescription(e.getMessage())
                    .asRuntimeException()
            );
        } catch (Exception e) {
            log.error("Error creating order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }

    @Override
    public void updateOrder(UpdateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        try {
            log.debug("UpdateOrder called: {}", request.getOrder().getName());
            
            Order order = orderService.updateOrder(request.getOrder());
            
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
        } catch (OrderNotFoundException e) {
            responseObserver.onError(
                Status.NOT_FOUND
                    .withDescription(e.getMessage())
                    .asRuntimeException()
            );
        } catch (Exception e) {
            log.error("Error updating order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }

    @Override
    public void deleteOrder(DeleteOrderRequest request,
                           StreamObserver<Empty> responseObserver) {
        try {
            log.debug("DeleteOrder called: {}", request.getName());
            
            orderService.deleteOrder(request.getName());
            
            responseObserver.onNext(Empty.getDefaultInstance());
            responseObserver.onCompleted();
            
        } catch (OrderNotFoundException e) {
            // Idempotent delete: succeed even if not found
            log.debug("Order already deleted: {}", request.getName());
            responseObserver.onNext(Empty.getDefaultInstance());
            responseObserver.onCompleted();
        } catch (Exception e) {
            log.error("Error deleting order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }
}
```

---

## Error Handling Patterns

### Exception to Status Code Mapping

```java
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    @Override
    public void getOrder(GetOrderRequest request, 
                        StreamObserver<Order> responseObserver) {
        try {
            Order order = orderService.getOrder(request.getName());
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
        } catch (OrderNotFoundException e) {
            responseObserver.onError(toStatusException(e));
        } catch (Exception e) {
            log.error("Unexpected error", e);
            responseObserver.onError(toStatusException(e));
        }
    }

    private StatusRuntimeException toStatusException(Exception e) {
        if (e instanceof OrderNotFoundException) {
            return Status.NOT_FOUND
                .withDescription(e.getMessage())
                .asRuntimeException();
        }
        if (e instanceof IllegalArgumentException) {
            return Status.INVALID_ARGUMENT
                .withDescription(e.getMessage())
                .asRuntimeException();
        }
        if (e instanceof DuplicateOrderException) {
            return Status.ALREADY_EXISTS
                .withDescription(e.getMessage())
                .asRuntimeException();
        }
        if (e instanceof InsufficientPermissionException) {
            return Status.PERMISSION_DENIED
                .withDescription(e.getMessage())
                .asRuntimeException();
        }
        
        // Default to INTERNAL for unknown errors
        return Status.INTERNAL
            .withDescription("Internal server error")
            .asRuntimeException();
    }
}
```

### Using Interceptor for Error Handling

```java
package com.example.order.grpc.interceptor;

import io.grpc.*;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@GrpcGlobalServerInterceptor
public class ErrorHandlingInterceptor implements ServerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ErrorHandlingInterceptor.class);

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {

        ServerCall<ReqT, RespT> wrappedCall = new ForwardingServerCall.SimpleForwardingServerCall<ReqT, RespT>(call) {
            @Override
            public void close(Status status, Metadata trailers) {
                if (status.getCause() != null) {
                    log.error("gRPC error: {}", status.getDescription(), status.getCause());
                }
                super.close(status, trailers);
            }
        };

        return next.startCall(wrappedCall, headers);
    }
}
```

---

## Validation

### Request Validation

```java
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    @Override
    public void createOrder(CreateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        try {
            // Validate request
            validateCreateOrderRequest(request);
            
            Order order = orderService.createOrder(request.getOrder());
            
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
        } catch (IllegalArgumentException e) {
            responseObserver.onError(
                Status.INVALID_ARGUMENT
                    .withDescription(e.getMessage())
                    .asRuntimeException()
            );
        }
    }

    private void validateCreateOrderRequest(CreateOrderRequest request) {
        if (request.getOrder() == null) {
            throw new IllegalArgumentException("Order is required");
        }
        
        Order order = request.getOrder();
        
        if (order.getCustomerId() == null || order.getCustomerId().isEmpty()) {
            throw new IllegalArgumentException("Customer ID is required");
        }
        
        if (order.getTotal() <= 0) {
            throw new IllegalArgumentException("Total must be greater than zero");
        }
    }
}
```

### Using Bean Validation

```java
// Add dependency
// <dependency>
//     <groupId>org.springframework.boot</groupId>
//     <artifactId>spring-boot-starter-validation</artifactId>
// </dependency>

@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    private final Validator validator;

    @Autowired
    public OrderServiceImpl(OrderService orderService, Validator validator) {
        this.orderService = orderService;
        this.validator = validator;
    }

    @Override
    public void createOrder(CreateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        try {
            // Convert protobuf to domain object
            OrderDTO orderDTO = toDomainObject(request.getOrder());
            
            // Validate
            Set<ConstraintViolation<OrderDTO>> violations = validator.validate(orderDTO);
            if (!violations.isEmpty()) {
                String errors = violations.stream()
                    .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                    .collect(Collectors.joining(", "));
                
                responseObserver.onError(
                    Status.INVALID_ARGUMENT
                        .withDescription("Validation failed: " + errors)
                        .asRuntimeException()
                );
                return;
            }
            
            Order order = orderService.createOrder(request.getOrder());
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error creating order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }
}
```

---

## Async Processing

### Using CompletableFuture

```java
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    private final OrderService orderService;

    @Override
    public void createOrder(CreateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        
        orderService.createOrderAsync(request.getOrder())
            .thenAccept(order -> {
                responseObserver.onNext(order);
                responseObserver.onCompleted();
            })
            .exceptionally(throwable -> {
                log.error("Error creating order", throwable);
                responseObserver.onError(
                    Status.INTERNAL
                        .withDescription(throwable.getMessage())
                        .asRuntimeException()
                );
                return null;
            });
    }
}
```

### Using Reactive (Project Reactor)

```java
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    private final ReactiveOrderService orderService;

    @Override
    public void getOrder(GetOrderRequest request,
                        StreamObserver<Order> responseObserver) {
        
        orderService.getOrder(request.getName())
            .doOnNext(responseObserver::onNext)
            .doOnError(throwable -> {
                responseObserver.onError(toStatusException(throwable));
            })
            .doFinally(signalType -> {
                if (signalType == SignalType.ON_COMPLETE) {
                    responseObserver.onCompleted();
                }
            })
            .subscribe();
    }
}
```

---

## Testing Unary Services

### Unit Test with InProcessServer

```java
package com.example.order.grpc;

import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.inprocess.InProcessChannelBuilder;
import io.grpc.inprocess.InProcessServerBuilder;
import io.grpc.testing.GrpcCleanupRule;
import org.junit.Rule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OrderServiceImplTest {

    @Rule
    public final GrpcCleanupRule grpcCleanup = new GrpcCleanupRule();

    private OrderServiceGrpc.OrderServiceBlockingStub stub;

    @BeforeEach
    void setUp() throws Exception {
        String serverName = InProcessServerBuilder.generateName();

        grpcCleanup.register(
            InProcessServerBuilder.forName(serverName)
                .directExecutor()
                .addService(new OrderServiceImpl(new MockOrderService()))
                .build()
                .start()
        );

        stub = OrderServiceGrpc.newBlockingStub(
            grpcCleanup.register(
                InProcessChannelBuilder.forName(serverName)
                    .directExecutor()
                    .build()
            )
        );
    }

    @Test
    void testCreateOrder() {
        CreateOrderRequest request = CreateOrderRequest.newBuilder()
            .setOrder(Order.newBuilder()
                .setCustomerId("C1")
                .setTotal(99.99)
                .build())
            .build();

        Order order = stub.createOrder(request);

        assertNotNull(order);
        assertEquals("C1", order.getCustomerId());
        assertEquals(99.99, order.getTotal());
        assertEquals(OrderStatus.PENDING, order.getStatus());
    }

    @Test
    void testGetOrder_NotFound() {
        GetOrderRequest request = GetOrderRequest.newBuilder()
            .setName("orders/nonexistent")
            .build();

        StatusRuntimeException exception = assertThrows(
            StatusRuntimeException.class,
            () -> stub.getOrder(request)
        );

        assertEquals(Status.Code.NOT_FOUND, exception.getStatus().getCode());
    }
}
```

---

## Best Practices

### ✅ Do:
- Always call `onNext()` followed by `onCompleted()` for success
- Always call `onError()` for failures (never both `onNext` and `onError`)
- Validate all inputs before processing
- Map domain exceptions to appropriate gRPC status codes
- Log errors with context before returning to client
- Use try-catch to prevent unhandled exceptions
- Make delete operations idempotent

### ❌ Don't:
- Don't call `onCompleted()` after `onError()`
- Don't call `onNext()` multiple times for unary RPCs
- Don't expose internal error details to clients
- Don't forget to call `onCompleted()` or `onError()`
- Don't block the gRPC thread with long-running operations
- Don't use `Status.UNKNOWN` when a specific code fits
- Don't swallow exceptions without logging

---

## Common Patterns

### Idempotency with Request ID

```java
@Override
public void createOrder(CreateOrderRequest request,
                       StreamObserver<Order> responseObserver) {
    try {
        String requestId = request.getRequestId();
        
        // Check if request already processed
        if (requestId != null && !requestId.isEmpty()) {
            Order existingOrder = orderService.findByRequestId(requestId);
            if (existingOrder != null) {
                // Return existing order (idempotent)
                responseObserver.onNext(existingOrder);
                responseObserver.onCompleted();
                return;
            }
        }
        
        // Process new order
        Order order = orderService.createOrder(request.getOrder(), requestId);
        responseObserver.onNext(order);
        responseObserver.onCompleted();
        
    } catch (Exception e) {
        responseObserver.onError(toStatusException(e));
    }
}
```

### Pagination Support

```protobuf
message ListOrdersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListOrdersResponse {
  repeated Order orders = 1;
  string next_page_token = 2;
}
```

```java
@Override
public void listOrders(ListOrdersRequest request,
                      StreamObserver<ListOrdersResponse> responseObserver) {
    try {
        int pageSize = request.getPageSize() > 0 ? request.getPageSize() : 50;
        String pageToken = request.getPageToken();
        
        Page<Order> page = orderService.listOrders(pageSize, pageToken);
        
        ListOrdersResponse response = ListOrdersResponse.newBuilder()
            .addAllOrders(page.getOrders())
            .setNextPageToken(page.getNextPageToken())
            .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
        
    } catch (Exception e) {
        responseObserver.onError(toStatusException(e));
    }
}
```

---

## Related Documentation

- **[Error Handling](error-handling.md)** - Detailed error handling strategies
- **[Streaming Services](streaming-services.md)** - Server/client/bidirectional streaming
- **[Interceptors](interceptors.md)** - Cross-cutting concerns
- **[Testing](testing/unit-testing.md)** - Comprehensive testing guide

---

**Navigation:** [← Client Configuration](client-configuration.md) | [Streaming Services →](streaming-services.md)
