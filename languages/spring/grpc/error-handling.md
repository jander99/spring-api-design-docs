# Spring Boot gRPC Error Handling

> **📖 Reading Guide**
> **⏱️ Reading Time:** 8 minutes | **🎯 Level:** Intermediate  
> **📋 Prerequisites:** [Unary Services](unary-services.md), understanding of exception handling
> **🎯 Key Topics:** Exception mapping • Status codes • Error interceptors • Rich error details
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

Map Spring exceptions to gRPC status codes for consistent error handling.

---

## Exception to Status Code Mapping

### Basic Mapping

```java
package com.example.order.grpc;

import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import com.example.order.exception.*;

public class GrpcExceptionMapper {

    public static StatusRuntimeException map(Exception exception) {
        // Domain exceptions
        if (exception instanceof ResourceNotFoundException) {
            return Status.NOT_FOUND
                .withDescription(exception.getMessage())
                .asRuntimeException();
        }
        
        if (exception instanceof IllegalArgumentException || 
            exception instanceof ValidationException) {
            return Status.INVALID_ARGUMENT
                .withDescription(exception.getMessage())
                .asRuntimeException();
        }
        
        if (exception instanceof DuplicateResourceException) {
            return Status.ALREADY_EXISTS
                .withDescription(exception.getMessage())
                .asRuntimeException();
        }
        
        if (exception instanceof InsufficientPermissionException) {
            return Status.PERMISSION_DENIED
                .withDescription(exception.getMessage())
                .asRuntimeException();
        }
        
        if (exception instanceof UnauthorizedException) {
            return Status.UNAUTHENTICATED
                .withDescription(exception.getMessage())
                .asRuntimeException();
        }
        
        if (exception instanceof RateLimitExceededException) {
            return Status.RESOURCE_EXHAUSTED
                .withDescription(exception.getMessage())
                .asRuntimeException();
        }
        
        if (exception instanceof PreconditionFailedException) {
            return Status.FAILED_PRECONDITION
                .withDescription(exception.getMessage())
                .asRuntimeException();
        }
        
        if (exception instanceof OptimisticLockException) {
            return Status.ABORTED
                .withDescription(exception.getMessage())
                .asRuntimeException();
        }
        
        // Default to INTERNAL for unknown exceptions
        return Status.INTERNAL
            .withDescription("Internal server error")
            .asRuntimeException();
    }
}
```

### Usage in Service

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
        } catch (Exception e) {
            responseObserver.onError(GrpcExceptionMapper.map(e));
        }
    }
}
```

---

## Global Error Handling Interceptor

### Server-Side Interceptor

```java
package com.example.order.grpc.interceptor;

import io.grpc.*;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@GrpcGlobalServerInterceptor
public class GlobalErrorHandlingInterceptor implements ServerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(GlobalErrorHandlingInterceptor.class);

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {

        ServerCall.Listener<ReqT> listener = next.startCall(
            new ForwardingServerCall.SimpleForwardingServerCall<ReqT, RespT>(call) {
                @Override
                public void close(Status status, Metadata trailers) {
                    // Log all errors
                    if (!status.isOk()) {
                        log.error("gRPC call failed: method={}, status={}, description={}",
                            call.getMethodDescriptor().getFullMethodName(),
                            status.getCode(),
                            status.getDescription(),
                            status.getCause()
                        );
                    }
                    super.close(status, trailers);
                }
            },
            headers
        );

        return new ForwardingServerCallListener.SimpleForwardingServerCallListener<ReqT>(listener) {
            @Override
            public void onHalfClose() {
                try {
                    super.onHalfClose();
                } catch (Exception e) {
                    handleException(e, call, new Metadata());
                }
            }
        };
    }

    private <ReqT, RespT> void handleException(
            Exception exception,
            ServerCall<ReqT, RespT> call,
            Metadata trailers) {
        
        Status status = GrpcExceptionMapper.map(exception).getStatus();
        call.close(status, trailers);
    }
}
```

---

## Rich Error Details

### Using google.rpc.Status

```java
import com.google.rpc.BadRequest;
import com.google.rpc.ErrorInfo;
import com.google.protobuf.Any;
import io.grpc.protobuf.StatusProto;

@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    @Override
    public void createOrder(CreateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        try {
            validateRequest(request);
            Order order = orderService.createOrder(request.getOrder());
            responseObserver.onNext(order);
            responseObserver.onCompleted();
        } catch (ValidationException e) {
            responseObserver.onError(createValidationError(e));
        } catch (Exception e) {
            responseObserver.onError(GrpcExceptionMapper.map(e));
        }
    }

    private StatusRuntimeException createValidationError(ValidationException e) {
        BadRequest.Builder badRequest = BadRequest.newBuilder();
        
        for (String field : e.getInvalidFields()) {
            badRequest.addFieldViolations(
                BadRequest.FieldViolation.newBuilder()
                    .setField(field)
                    .setDescription(e.getFieldError(field))
                    .build()
            );
        }

        com.google.rpc.Status status = com.google.rpc.Status.newBuilder()
            .setCode(io.grpc.Status.Code.INVALID_ARGUMENT.value())
            .setMessage(e.getMessage())
            .addDetails(Any.pack(badRequest.build()))
            .build();

        return StatusProto.toStatusRuntimeException(status);
    }
}
```

### Client-Side Error Parsing

```java
@Service
public class OrderClient {

    @GrpcClient("order-service")
    private OrderServiceGrpc.OrderServiceBlockingStub stub;

    public Order createOrder(Order order) {
        try {
            return stub.createOrder(
                CreateOrderRequest.newBuilder()
                    .setOrder(order)
                    .build()
            );
        } catch (StatusRuntimeException e) {
            handleError(e);
            throw e;
        }
    }

    private void handleError(StatusRuntimeException e) {
        com.google.rpc.Status status = StatusProto.fromThrowable(e);
        
        if (status == null) {
            log.error("gRPC error: {}", e.getStatus().getDescription());
            return;
        }

        for (Any detail : status.getDetailsList()) {
            try {
                if (detail.is(BadRequest.class)) {
                    BadRequest badRequest = detail.unpack(BadRequest.class);
                    for (BadRequest.FieldViolation violation : badRequest.getFieldViolationsList()) {
                        log.error("Invalid field {}: {}",
                            violation.getField(),
                            violation.getDescription()
                        );
                    }
                }
            } catch (Exception ex) {
                log.warn("Failed to parse error details", ex);
            }
        }
    }
}
```

---

## Best Practices

### ✅ Do:
- Map domain exceptions to appropriate gRPC status codes
- Log errors server-side with full context
- Return generic messages to clients (hide internal details)
- Use rich error details for validation errors
- Implement global error handling interceptor
- Handle errors gracefully on client side

### ❌ Don't:
- Don't expose stack traces to clients
- Don't use UNKNOWN when a specific code exists
- Don't forget to log errors before returning
- Don't return different status codes for the same error
- Don't ignore error metadata from server

---

## Related Documentation

- **[gRPC Error Handling (Theory)](../../../guides/api-design/grpc/error-handling.md)** - Status codes reference
- **[Status Codes Reference](../../../guides/api-design/grpc/reference/status-codes.md)** - Complete guide
- **[Unary Services](unary-services.md)** - Basic patterns
- **[Interceptors](interceptors.md)** - Cross-cutting concerns

---

**Navigation:** [← Unary Services](unary-services.md) | [Interceptors →](interceptors.md)
