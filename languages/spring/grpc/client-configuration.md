# Spring Boot gRPC Client Configuration

> **📖 Reading Guide**
> **⏱️ Reading Time:** 10 minutes | **🎯 Level:** Intermediate
> **📋 Prerequisites:** Completed [Getting Started](getting-started.md), understanding of gRPC stubs
> **🎯 Key Topics:** @GrpcClient annotation • Channel management • Stub types • Load balancing
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

This guide covers configuring gRPC clients in Spring Boot to call other gRPC services.

---

## Overview

The `@GrpcClient` annotation injects gRPC client stubs that communicate with remote services. Spring manages:

- **Channel creation** - Connection pooling and lifecycle
- **Stub injection** - Automatic dependency injection
- **Load balancing** - Client-side load balancing
- **Interceptors** - Global and per-client interceptors
- **Configuration** - Timeout, TLS, keepalive settings

---

## Basic Client Configuration

### Add Client Dependency

**Maven (pom.xml):**
```xml
<dependency>
    <groupId>net.devh</groupId>
    <artifactId>grpc-client-spring-boot-starter</artifactId>
    <version>3.1.0.RELEASE</version>
</dependency>
```

**Gradle (build.gradle.kts):**
```kotlin
implementation("net.devh:grpc-client-spring-boot-starter:3.1.0.RELEASE")
```

### Configure Client in application.yml

```yaml
grpc:
  client:
    inventory-service:
      address: 'static://localhost:9091'
      negotiationType: PLAINTEXT
```

### Inject and Use Client Stub

```java
package com.example.order.service;

import com.example.inventory.grpc.InventoryServiceGrpc;
import com.example.inventory.grpc.GetInventoryRequest;
import com.example.inventory.grpc.Inventory;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    @GrpcClient("inventory-service")
    private InventoryServiceGrpc.InventoryServiceBlockingStub inventoryStub;

    public Inventory checkInventory(String productId) {
        GetInventoryRequest request = GetInventoryRequest.newBuilder()
            .setProductId(productId)
            .build();
        
        return inventoryStub.getInventory(request);
    }
}
```

---

## Stub Types

### BlockingStub (Synchronous)

Best for simple request-response patterns.

```java
@GrpcClient("order-service")
private OrderServiceGrpc.OrderServiceBlockingStub blockingStub;

public Order getOrder(String orderId) {
    GetOrderRequest request = GetOrderRequest.newBuilder()
        .setName("orders/" + orderId)
        .build();
    
    return blockingStub.getOrder(request);
}
```

**Characteristics:**
- Blocks thread until response received
- Simple to use
- Good for synchronous flows
- Not suitable for reactive applications

### Async Stub (Asynchronous with Callbacks)

Best for non-blocking operations with callbacks.

```java
@GrpcClient("order-service")
private OrderServiceGrpc.OrderServiceStub asyncStub;

public void getOrderAsync(String orderId, Consumer<Order> onSuccess, Consumer<Throwable> onError) {
    GetOrderRequest request = GetOrderRequest.newBuilder()
        .setName("orders/" + orderId)
        .build();
    
    asyncStub.getOrder(request, new StreamObserver<Order>() {
        @Override
        public void onNext(Order order) {
            onSuccess.accept(order);
        }

        @Override
        public void onError(Throwable t) {
            onError.accept(t);
        }

        @Override
        public void onCompleted() {
            // Request completed
        }
    });
}
```

### FutureStub (Asynchronous with Future)

Best for composing multiple async calls.

```java
@GrpcClient("order-service")
private OrderServiceGrpc.OrderServiceFutureStub futureStub;

public CompletableFuture<Order> getOrderFuture(String orderId) {
    GetOrderRequest request = GetOrderRequest.newBuilder()
        .setName("orders/" + orderId)
        .build();
    
    ListenableFuture<Order> listenableFuture = futureStub.getOrder(request);
    
    return CompletableFuture.supplyAsync(() -> {
        try {
            return listenableFuture.get();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    });
}
```

---

## Address Configuration

### Static Address

Direct connection to a specific host and port.

```yaml
grpc:
  client:
    order-service:
      address: 'static://localhost:9090'
```

**Use case:** Development, single-instance services

### DNS-Based Discovery

Resolve multiple addresses via DNS.

```yaml
grpc:
  client:
    order-service:
      address: 'dns:///order-service.default.svc.cluster.local:9090'
      defaultLoadBalancingPolicy: round_robin
```

**How it works:**
1. DNS query returns multiple A records
2. Client creates connections to all addresses
3. Load balances requests using specified policy

**Use case:** Kubernetes services, load balancing

### Discovery Service

Use Spring Cloud Discovery (Consul, Eureka, etc.).

```yaml
spring:
  cloud:
    consul:
      host: localhost
      port: 8500

grpc:
  client:
    order-service:
      address: 'discovery:///order-service'
      defaultLoadBalancingPolicy: round_robin
```

**Use case:** Microservices with service registry

---

## Negotiation Type

### PLAINTEXT (No TLS)

```yaml
grpc:
  client:
    order-service:
      address: 'static://localhost:9090'
      negotiationType: PLAINTEXT
```

**Use case:** Development, internal networks

### TLS (Server Authentication)

```yaml
grpc:
  client:
    order-service:
      address: 'static://order-service.example.com:9090'
      negotiationType: TLS
      security:
        authorityOverride: order-service.example.com
        trustCertCollection: classpath:certs/ca-cert.pem
```

**Use case:** Production, public services

### Mutual TLS

```yaml
grpc:
  client:
    order-service:
      address: 'static://order-service.example.com:9090'
      negotiationType: TLS
      security:
        authorityOverride: order-service.example.com
        trustCertCollection: classpath:certs/ca-cert.pem
        clientCertChain: classpath:certs/client-cert.pem
        clientPrivateKey: classpath:certs/client-key.pem
```

**Use case:** High-security environments

---

## Timeout Configuration

### Per-Client Deadline

```yaml
grpc:
  client:
    order-service:
      address: 'static://localhost:9090'
      negotiationType: PLAINTEXT
      deadline: 30s  # All calls timeout after 30 seconds
```

### Per-Call Deadline

```java
@GrpcClient("order-service")
private OrderServiceGrpc.OrderServiceBlockingStub stub;

public Order getOrder(String orderId) {
    OrderServiceGrpc.OrderServiceBlockingStub stubWithDeadline = stub
        .withDeadlineAfter(5, TimeUnit.SECONDS);
    
    GetOrderRequest request = GetOrderRequest.newBuilder()
        .setName("orders/" + orderId)
        .build();
    
    return stubWithDeadline.getOrder(request);
}
```

---

## Keepalive Configuration

Prevent idle connections from being closed by load balancers.

```yaml
grpc:
  client:
    order-service:
      address: 'static://order-service:9090'
      negotiationType: PLAINTEXT
      
      # Keepalive settings
      enableKeepAlive: true
      keepAliveTime: 30s           # Send keepalive every 30s
      keepAliveTimeout: 10s        # Wait 10s for response
      keepAliveWithoutCalls: true  # Send even when idle
```

**Recommended for:**
- Connections behind load balancers (AWS ALB, GCP LB)
- Long-lived connections
- Streaming RPCs

---

## Load Balancing

### Round Robin

```yaml
grpc:
  client:
    order-service:
      address: 'dns:///order-service:9090'
      defaultLoadBalancingPolicy: round_robin
```

**How it works:** Distributes requests evenly across all available backends.

### Pick First

```yaml
grpc:
  client:
    order-service:
      address: 'dns:///order-service:9090'
      defaultLoadBalancingPolicy: pick_first
```

**How it works:** Uses first available connection, fails over if down.

---

## Retry Configuration

Enable automatic retries for transient failures.

```yaml
grpc:
  client:
    order-service:
      address: 'static://localhost:9090'
      negotiationType: PLAINTEXT
      enableRetry: true
      maxRetryAttempts: 3
```

**Programmatic retry:**
```java
@GrpcClient("order-service")
private OrderServiceGrpc.OrderServiceBlockingStub stub;

public Order getOrderWithRetry(String orderId) {
    int maxAttempts = 3;
    int attempt = 0;
    
    while (attempt < maxAttempts) {
        try {
            return stub.getOrder(
                GetOrderRequest.newBuilder()
                    .setName("orders/" + orderId)
                    .build()
            );
        } catch (StatusRuntimeException e) {
            attempt++;
            if (e.getStatus().getCode() == Status.Code.UNAVAILABLE && attempt < maxAttempts) {
                try {
                    Thread.sleep(1000 * attempt); // Exponential backoff
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw e;
                }
            } else {
                throw e;
            }
        }
    }
    
    throw new RuntimeException("Max retry attempts exceeded");
}
```

---

## Multiple Clients

Configure multiple gRPC clients in one application.

```yaml
grpc:
  client:
    order-service:
      address: 'static://order-service:9090'
      negotiationType: PLAINTEXT
      deadline: 10s
    
    inventory-service:
      address: 'static://inventory-service:9091'
      negotiationType: PLAINTEXT
      deadline: 5s
    
    payment-service:
      address: 'static://payment-service:9092'
      negotiationType: TLS
      deadline: 30s
      security:
        trustCertCollection: classpath:certs/ca-cert.pem
```

```java
@Service
public class OrderAggregator {

    @GrpcClient("order-service")
    private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

    @GrpcClient("inventory-service")
    private InventoryServiceGrpc.InventoryServiceBlockingStub inventoryStub;

    @GrpcClient("payment-service")
    private PaymentServiceGrpc.PaymentServiceBlockingStub paymentStub;

    public CompleteOrder getCompleteOrder(String orderId) {
        Order order = orderStub.getOrder(
            GetOrderRequest.newBuilder().setName("orders/" + orderId).build()
        );
        
        Inventory inventory = inventoryStub.getInventory(
            GetInventoryRequest.newBuilder().setProductId(order.getProductId()).build()
        );
        
        Payment payment = paymentStub.getPayment(
            GetPaymentRequest.newBuilder().setOrderId(orderId).build()
        );
        
        return CompleteOrder.builder()
            .order(order)
            .inventory(inventory)
            .payment(payment)
            .build();
    }
}
```

---

## Complete Configuration Example

```yaml
grpc:
  client:
    # Service 1: Order Service (internal, plaintext)
    order-service:
      address: 'dns:///order-service.default.svc.cluster.local:9090'
      negotiationType: PLAINTEXT
      defaultLoadBalancingPolicy: round_robin
      deadline: 10s
      enableKeepAlive: true
      keepAliveTime: 30s
      keepAliveTimeout: 10s
      keepAliveWithoutCalls: true
      maxInboundMessageSize: 4MB
    
    # Service 2: Inventory Service (internal, plaintext)
    inventory-service:
      address: 'static://inventory-service:9091'
      negotiationType: PLAINTEXT
      deadline: 5s
      enableRetry: true
      maxRetryAttempts: 3
    
    # Service 3: Payment Service (external, mTLS)
    payment-service:
      address: 'static://payment-service.example.com:9092'
      negotiationType: TLS
      deadline: 30s
      security:
        authorityOverride: payment-service.example.com
        trustCertCollection: file:/etc/grpc/certs/ca-cert.pem
        clientCertChain: file:/etc/grpc/certs/client-cert.pem
        clientPrivateKey: file:/etc/grpc/certs/client-key.pem
      enableKeepAlive: true
      keepAliveTime: 60s
      keepAliveTimeout: 20s
```

---

## Configuration Properties Reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `address` | String | required | Service address (static://, dns://, discovery:///) |
| `negotiationType` | Enum | TLS | Connection type (PLAINTEXT, TLS) |
| `deadline` | Duration | ∞ | Per-request timeout |
| `enableKeepAlive` | boolean | false | Enable keepalive pings |
| `keepAliveTime` | Duration | Long.MAX_VALUE | Keepalive ping interval |
| `keepAliveTimeout` | Duration | 20s | Keepalive timeout |
| `keepAliveWithoutCalls` | boolean | false | Send keepalive when idle |
| `maxInboundMessageSize` | DataSize | 4MB | Max message size |
| `maxInboundMetadataSize` | DataSize | 8KB | Max metadata size |
| `defaultLoadBalancingPolicy` | String | pick_first | LB policy (round_robin, pick_first) |
| `enableRetry` | boolean | false | Enable automatic retries |
| `maxRetryAttempts` | int | 5 | Maximum retry attempts |
| `security.authorityOverride` | String | | Override authority (for TLS) |
| `security.trustCertCollection` | String | | CA certificate path |
| `security.clientCertChain` | String | | Client certificate path |
| `security.clientPrivateKey` | String | | Client private key path |

---

## Best Practices

### ✅ Do:
- Reuse channels (via `@GrpcClient`, don't create manually)
- Set reasonable deadlines for all calls
- Use TLS in production
- Configure keepalive for connections behind load balancers
- Use DNS or discovery for load balancing
- Handle errors with proper retry logic
- Configure different timeouts per service

### ❌ Don't:
- Don't create new channels per request (resource leak)
- Don't use infinite deadlines (can hang forever)
- Don't use plaintext in production
- Don't ignore `UNAVAILABLE` errors (implement retry)
- Don't use blocking stubs in reactive applications
- Don't hardcode IP addresses (use DNS or discovery)

---

## Troubleshooting

### Connection Refused

**Error:** `UNAVAILABLE: io exception`

**Solution:** Verify service is running and address is correct.
```bash
# Test connectivity
telnet order-service 9090
nc -zv order-service 9090
```

### Deadline Exceeded

**Error:** `DEADLINE_EXCEEDED: deadline exceeded after 9.999s`

**Solution:** Increase deadline or optimize server.
```yaml
grpc:
  client:
    order-service:
      deadline: 30s  # Increase timeout
```

### Name Resolution Failure

**Error:** `UNAVAILABLE: Unable to resolve host`

**Solution:** Check DNS configuration or use static address.
```yaml
grpc:
  client:
    order-service:
      address: 'static://10.0.0.5:9090'  # Use IP temporarily
```

---

## Related Documentation

- **[Server Configuration](server-configuration.md)** - Configure gRPC servers
- **[Unary Services](unary-services.md)** - Simple request-response patterns
- **[Interceptors](interceptors.md)** - Client-side interceptors
- **[Security Guide](security.md)** - Authentication and TLS

---

**Navigation:** [← Server Configuration](server-configuration.md) | [Unary Services →](unary-services.md)
