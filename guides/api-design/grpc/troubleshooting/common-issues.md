# gRPC Common Issues and Solutions

> **📖 Reading Guide**
> **⏱️ Reading Time:** 12 minutes | **🎯 Level:** Intermediate to Advanced
> **📋 Prerequisites:** Working knowledge of gRPC, experience deploying gRPC services
> **🎯 Key Topics:** Connection issues • Load balancing • Streaming failures • Debugging • Performance
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

This guide covers common production issues with gRPC services and their solutions.

---

## Table of Contents

1. [Connection and Network Issues](#connection-and-network-issues)
2. [Load Balancing Problems](#load-balancing-problems)
3. [Streaming Issues](#streaming-issues)
4. [Performance Problems](#performance-problems)
5. [Error Handling Issues](#error-handling-issues)
6. [Security and Authentication](#security-and-authentication)
7. [Debugging Techniques](#debugging-techniques)

---

## Connection and Network Issues

### Issue: "Connection Refused" or "Unavailable"

**Symptoms:**
```
io.grpc.StatusRuntimeException: UNAVAILABLE: io exception
Caused by: Connection refused
```

**Common Causes:**
1. Server not running or listening on wrong port
2. Firewall blocking gRPC port (default 50051)
3. Wrong host/port in client configuration
4. Server crashed or restarting

**Solutions:**

**1. Verify server is running:**
```bash
# Check if port is listening
netstat -an | grep 50051
lsof -i :50051

# Test connectivity
telnet localhost 50051
nc -zv localhost 50051
```

**2. Check firewall rules:**
```bash
# Linux - check firewall
sudo iptables -L -n | grep 50051
sudo firewall-cmd --list-all

# Open port if needed
sudo firewall-cmd --add-port=50051/tcp --permanent
sudo firewall-cmd --reload
```

**3. Verify client configuration:**
```yaml
# Wrong
grpc:
  client:
    order-service:
      address: 'static://localhost:8080'  # Wrong port

# Correct
grpc:
  client:
    order-service:
      address: 'static://localhost:50051'
```

**4. Add health checks:**
```protobuf
// Implement grpc.health.v1.Health
service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}
```

---

### Issue: "Deadline Exceeded" on All Requests

**Symptoms:**
```
DEADLINE_EXCEEDED: deadline exceeded after 29.999s
```

**Common Causes:**
1. Client deadline too short for operation
2. Server processing too slow
3. Network latency higher than expected
4. Server blocked or hanging

**Solutions:**

**1. Increase client deadline:**
```java
// Before
OrderServiceGrpc.OrderServiceBlockingStub stub = 
    OrderServiceGrpc.newBlockingStub(channel)
        .withDeadlineAfter(5, TimeUnit.SECONDS);  // Too short

// After
OrderServiceGrpc.OrderServiceBlockingStub stub = 
    OrderServiceGrpc.newBlockingStub(channel)
        .withDeadlineAfter(30, TimeUnit.SECONDS);
```

**2. Add timeout configuration:**
```yaml
grpc:
  client:
    order-service:
      address: 'static://localhost:50051'
      deadline: 30s  # Per-request deadline
      enableKeepAlive: true
      keepAliveTime: 30s
      keepAliveTimeout: 10s
```

**3. Profile server performance:**
```java
// Add timing interceptor
public class TimingInterceptor implements ServerInterceptor {
  @Override
  public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
      ServerCall<ReqT, RespT> call,
      Metadata headers,
      ServerCallHandler<ReqT, RespT> next) {
    
    long startTime = System.currentTimeMillis();
    
    ServerCall.Listener<ReqT> listener = next.startCall(call, headers);
    
    return new ForwardingServerCallListener.SimpleForwardingServerCallListener<ReqT>(listener) {
      @Override
      public void onComplete() {
        long duration = System.currentTimeMillis() - startTime;
        log.info("Method {} took {}ms", call.getMethodDescriptor().getFullMethodName(), duration);
        super.onComplete();
      }
    };
  }
}
```

---

### Issue: HTTP/2 GOAWAY Frames Causing Disconnects

**Symptoms:**
```
UNAVAILABLE: HTTP/2 error code: NO_ERROR
Received Goaway
```

**Common Causes:**
1. Load balancer idle timeout (common with AWS ALB, GCP LB)
2. Max connection age reached
3. Server graceful shutdown

**Solutions:**

**1. Enable keepalive on client:**
```yaml
grpc:
  client:
    order-service:
      enableKeepAlive: true
      keepAliveTime: 30s          # Send keepalive every 30s
      keepAliveTimeout: 10s       # Wait 10s for keepalive response
      keepAliveWithoutCalls: true # Send keepalive even when idle
```

**2. Configure server keepalive:**
```yaml
grpc:
  server:
    port: 50051
    enableKeepAlive: true
    keepAliveTime: 30s
    keepAliveTimeout: 10s
    permitKeepAliveTime: 10s     # Minimum time between keepalives
    permitKeepAliveWithoutCalls: true
```

**3. Set connection age limits (server-side):**
```yaml
grpc:
  server:
    maxConnectionAge: 30m        # Force reconnect every 30 minutes
    maxConnectionAgeGrace: 5m    # Grace period for ongoing RPCs
```

**4. Handle GOAWAY gracefully (client-side):**
```java
// Automatic with gRPC - just retry
ManagedChannel channel = ManagedChannelBuilder
    .forAddress("localhost", 50051)
    .enableRetry()
    .maxRetryAttempts(3)
    .build();
```

---

## Load Balancing Problems

### Issue: All Traffic Goes to One Server

**Symptoms:**
- One backend instance handles 90%+ of traffic
- Other instances sit idle
- Uneven resource utilization

**Common Causes:**
1. Using L4 (connection-level) load balancer instead of L7 (request-level)
2. Long-lived gRPC connections stick to one backend
3. Missing client-side load balancing

**Solutions:**

**1. Use client-side load balancing:**
```yaml
# Service discovery with DNS
grpc:
  client:
    order-service:
      address: 'dns:///order-service.default.svc.cluster.local:50051'
      defaultLoadBalancingPolicy: 'round_robin'  # Client-side LB
```

**2. Use gRPC-aware proxy:**
```yaml
# Envoy sidecar configuration
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 50051
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          codec_type: AUTO
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                  grpc: {}
                route:
                  cluster: order_service
                  timeout: 30s
          http_filters:
          - name: envoy.filters.http.router

  clusters:
  - name: order_service
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN  # Request-level load balancing
    http2_protocol_options: {}
    load_assignment:
      cluster_name: order_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: order-service
                port_value: 50051
```

**3. Use xDS-based load balancing (advanced):**
```java
// Client connects to xDS control plane
ManagedChannel channel = Grpc.newChannelBuilder(
    "xds:///order-service.default.svc.cluster.local:50051",
    InsecureChannelCredentials.create())
    .build();
```

**4. Implement custom load balancer:**
```java
@LoadBalancerFactory
public class WeightedRoundRobinLoadBalancerProvider extends LoadBalancerProvider {
  @Override
  public LoadBalancer newLoadBalancer(LoadBalancer.Helper helper) {
    return new WeightedRoundRobinLoadBalancer(helper);
  }

  @Override
  public String getPolicyName() {
    return "weighted_round_robin";
  }
}
```

---

### Issue: Uneven Distribution with Client-Side LB

**Symptoms:**
- Some backends receive more traffic despite round-robin config
- Distribution improves over time but starts uneven

**Common Causes:**
1. Subchannel connection delays
2. DNS caching issues
3. Insufficient number of connections

**Solutions:**

**1. Pre-warm connections:**
```java
// Create multiple subchannels upfront
for (int i = 0; i < 10; i++) {
  stub.getOrder(GetOrderRequest.newBuilder()
      .setName("orders/warmup")
      .build());
}
```

**2. Reduce DNS cache TTL:**
```yaml
grpc:
  client:
    order-service:
      address: 'dns:///order-service:50051'
      # Force DNS refresh
      enableRetry: true
```

**3. Use multiple connections:**
```java
// Connection pool pattern
List<ManagedChannel> channels = new ArrayList<>();
for (int i = 0; i < 5; i++) {
  channels.add(ManagedChannelBuilder
      .forAddress("order-service", 50051)
      .usePlaintext()
      .build());
}

// Round-robin across channels
int index = requestCount.getAndIncrement() % channels.size();
OrderServiceGrpc.OrderServiceBlockingStub stub = 
    OrderServiceGrpc.newBlockingStub(channels.get(index));
```

---

## Streaming Issues

### Issue: Stream Closes Unexpectedly

**Symptoms:**
```
CANCELLED: client cancelled
DEADLINE_EXCEEDED: deadline exceeded
```

**Common Causes:**
1. Client or server deadline exceeded
2. Network interruption
3. Server-side error not properly handled
4. Idle stream timeout

**Solutions:**

**1. Implement heartbeat mechanism:**
```java
// Server-side: send periodic heartbeats
public void streamOrders(StreamOrdersRequest request, 
                         StreamObserver<Order> responseObserver) {
  ScheduledExecutorService executor = Executors.newScheduledThreadPool(1);
  
  // Send heartbeat every 10 seconds
  ScheduledFuture<?> heartbeat = executor.scheduleAtFixedRate(() -> {
    try {
      // Send empty message or status message
      responseObserver.onNext(Order.newBuilder()
          .setName("heartbeat")
          .build());
    } catch (Exception e) {
      // Stream closed, cancel heartbeat
      executor.shutdown();
    }
  }, 10, 10, TimeUnit.SECONDS);
  
  // Stream actual data
  // ...
  
  responseObserver.onCompleted();
  heartbeat.cancel(true);
  executor.shutdown();
}
```

**2. Handle stream lifecycle properly:**
```java
// Client-side: handle stream closure gracefully
StreamObserver<OrderUpdate> requestObserver = stub.streamOrderUpdates(
    new StreamObserver<OrderUpdateResponse>() {
      @Override
      public void onNext(OrderUpdateResponse response) {
        processUpdate(response);
      }

      @Override
      public void onError(Throwable t) {
        Status status = Status.fromThrowable(t);
        if (status.getCode() == Status.Code.UNAVAILABLE) {
          // Retry with exponential backoff
          scheduleReconnect();
        } else {
          log.error("Stream error", t);
        }
      }

      @Override
      public void onCompleted() {
        log.info("Stream completed normally");
      }
    }
);
```

**3. Set appropriate deadlines:**
```java
// For long-lived streams, set no deadline or very long deadline
StreamObserver<Order> responseObserver = stub
    .withDeadlineAfter(1, TimeUnit.HOURS)  // Or withoutDeadline()
    .streamOrders(request, observer);
```

---

### Issue: Backpressure Not Working

**Symptoms:**
- Client overwhelmed with messages
- Out of memory errors
- Slow message processing

**Common Causes:**
1. No flow control implementation
2. Unbounded message buffering
3. Fast producer, slow consumer

**Solutions:**

**1. Implement manual flow control:**
```java
// Client-side: control message flow
public class FlowControlledStreamObserver implements StreamObserver<Order> {
  private final Queue<Order> buffer = new ArrayBlockingQueue<>(100);
  private final AtomicBoolean ready = new AtomicBoolean(true);
  private ClientCallStreamObserver<?> requestStream;

  public void setRequestStream(ClientCallStreamObserver<?> stream) {
    this.requestStream = stream;
    stream.disableAutoInboundFlowControl();
  }

  @Override
  public void onNext(Order order) {
    buffer.add(order);
    
    if (buffer.size() > 80) {
      // Buffer almost full, request pause
      requestStream.request(0);
      ready.set(false);
    }
    
    processOrders();
  }

  private void processOrders() {
    while (!buffer.isEmpty() && canProcess()) {
      Order order = buffer.poll();
      // Process order...
      
      // If buffer drains below threshold, resume
      if (buffer.size() < 20 && !ready.get()) {
        requestStream.request(50);
        ready.set(true);
      }
    }
  }
}
```

**2. Use reactive streams (with Project Reactor):**
```java
// Server-side: backpressure-aware streaming
Flux<Order> orderStream = orderRepository.streamOrders()
    .onBackpressureBuffer(1000)  // Buffer up to 1000 messages
    .onBackpressureDrop(order -> {
      log.warn("Dropping order due to backpressure: {}", order.getName());
    });

orderStream.subscribe(responseObserver::onNext);
```

---

## Performance Problems

### Issue: High Latency on Small Messages

**Symptoms:**
- P99 latency 100ms+ for simple requests
- Network time dominates processing time

**Common Causes:**
1. No connection pooling (creating new connection per request)
2. TLS handshake overhead
3. DNS resolution delays
4. Inefficient serialization

**Solutions:**

**1. Reuse channels (connection pooling):**
```java
// Wrong: creating new channel per request
public Order getOrder(String orderId) {
  ManagedChannel channel = ManagedChannelBuilder
      .forAddress("localhost", 50051)
      .usePlaintext()
      .build();
  
  OrderServiceGrpc.OrderServiceBlockingStub stub = 
      OrderServiceGrpc.newBlockingStub(channel);
  
  Order order = stub.getOrder(GetOrderRequest.newBuilder()
      .setName("orders/" + orderId)
      .build());
  
  channel.shutdown();  // Closes connection
  return order;
}

// Right: reuse channel
private static final ManagedChannel channel = ManagedChannelBuilder
    .forAddress("localhost", 50051)
    .usePlaintext()
    .build();

private static final OrderServiceGrpc.OrderServiceBlockingStub stub = 
    OrderServiceGrpc.newBlockingStub(channel);

public Order getOrder(String orderId) {
  return stub.getOrder(GetOrderRequest.newBuilder()
      .setName("orders/" + orderId)
      .build());
}
```

**2. Enable TLS session resumption:**
```yaml
grpc:
  server:
    security:
      enabled: true
      certificateChain: /path/to/cert.pem
      privateKey: /path/to/key.pem
      sessionCacheSize: 1000    # Cache TLS sessions
      sessionTimeout: 3600      # 1 hour
```

**3. Use binary encoding (already default in protobuf):**
```protobuf
// Avoid JSON transcoding for internal services
// Use native protobuf binary format
```

**4. Batch small requests:**
```protobuf
// Instead of individual Get calls
rpc GetOrder(GetOrderRequest) returns (Order);

// Use batch operation
rpc BatchGetOrders(BatchGetOrdersRequest) returns (BatchGetOrdersResponse);

message BatchGetOrdersRequest {
  repeated string names = 1;  // Get multiple orders in one RPC
}
```

---

### Issue: Memory Leaks in Long-Running Services

**Symptoms:**
- Heap usage grows over time
- OutOfMemoryError after hours/days
- GC pauses increase

**Common Causes:**
1. Not closing channels properly
2. Unbounded response caching
3. Stream observers not garbage collected

**Solutions:**

**1. Always shutdown channels:**
```java
@PreDestroy
public void cleanup() {
  try {
    channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
  } catch (InterruptedException e) {
    channel.shutdownNow();
  }
}
```

**2. Implement bounded caches:**
```java
// Wrong: unbounded cache
Map<String, Order> cache = new ConcurrentHashMap<>();

// Right: bounded cache with eviction
LoadingCache<String, Order> cache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterWrite(10, TimeUnit.MINUTES)
    .build(key -> loadOrder(key));
```

**3. Clean up stream observers:**
```java
public class CleanupStreamObserver<T> implements StreamObserver<T> {
  private volatile boolean completed = false;

  @Override
  public void onNext(T value) {
    if (completed) return;
    // Process value
  }

  @Override
  public void onError(Throwable t) {
    completed = true;
    cleanup();
  }

  @Override
  public void onCompleted() {
    completed = true;
    cleanup();
  }

  private void cleanup() {
    // Release resources
  }
}
```

---

## Error Handling Issues

### Issue: Generic Error Messages with No Details

**Symptoms:**
```
INTERNAL: Internal server error
```

**Problem:**
- Client can't determine what went wrong
- No actionable error information
- Hard to debug production issues

**Solutions:**

**1. Use rich error details:**
```java
import com.google.rpc.ErrorInfo;
import com.google.rpc.BadRequest;
import io.grpc.protobuf.StatusProto;

// Instead of
throw Status.INTERNAL.withDescription("Error").asRuntimeException();

// Use rich details
com.google.rpc.Status status = com.google.rpc.Status.newBuilder()
    .setCode(Code.INVALID_ARGUMENT.getNumber())
    .setMessage("Invalid email format")
    .addDetails(Any.pack(BadRequest.newBuilder()
        .addFieldViolations(BadRequest.FieldViolation.newBuilder()
            .setField("email")
            .setDescription("Must be a valid email address")
            .build())
        .build()))
    .build();

throw StatusProto.toStatusRuntimeException(status);
```

**2. Client-side error parsing:**
```java
try {
  Order order = stub.createOrder(request);
} catch (StatusRuntimeException e) {
  com.google.rpc.Status status = StatusProto.fromThrowable(e);
  
  for (Any detail : status.getDetailsList()) {
    if (detail.is(BadRequest.class)) {
      BadRequest badRequest = detail.unpack(BadRequest.class);
      for (BadRequest.FieldViolation violation : badRequest.getFieldViolationsList()) {
        log.error("Field {}: {}", violation.getField(), violation.getDescription());
      }
    }
  }
}
```

---

## Security and Authentication

### Issue: "Unauthenticated" Errors Despite Valid Token

**Symptoms:**
```
UNAUTHENTICATED: Authentication failed
```

**Common Causes:**
1. Token not sent in metadata
2. Wrong metadata key
3. Token expired but not refreshed
4. Interceptor not configured

**Solutions:**

**1. Add auth interceptor (client-side):**
```java
public class AuthInterceptor implements ClientInterceptor {
  private final TokenProvider tokenProvider;

  @Override
  public <ReqT, RespT> ClientCall<ReqT, RespT> interceptCall(
      MethodDescriptor<ReqT, RespT> method,
      CallOptions callOptions,
      Channel next) {
    
    return new ForwardingClientCall.SimpleForwardingClientCall<ReqT, RespT>(
        next.newCall(method, callOptions)) {
      
      @Override
      public void start(Listener<RespT> responseListener, Metadata headers) {
        // Add token to metadata
        headers.put(Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER),
            "Bearer " + tokenProvider.getToken());
        super.start(responseListener, headers);
      }
    };
  }
}

// Register interceptor
ManagedChannel channel = ManagedChannelBuilder
    .forAddress("localhost", 50051)
    .intercept(new AuthInterceptor(tokenProvider))
    .build();
```

**2. Validate token (server-side):**
```java
public class AuthServerInterceptor implements ServerInterceptor {
  @Override
  public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
      ServerCall<ReqT, RespT> call,
      Metadata headers,
      ServerCallHandler<ReqT, RespT> next) {
    
    String authorization = headers.get(
        Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER));
    
    if (authorization == null || !authorization.startsWith("Bearer ")) {
      call.close(Status.UNAUTHENTICATED.withDescription("Missing token"), headers);
      return new ServerCall.Listener<ReqT>() {};
    }
    
    String token = authorization.substring(7);
    
    try {
      validateToken(token);
      return next.startCall(call, headers);
    } catch (Exception e) {
      call.close(Status.UNAUTHENTICATED.withDescription("Invalid token"), headers);
      return new ServerCall.Listener<ReqT>() {};
    }
  }
}
```

---

## Debugging Techniques

### Enable Verbose Logging

```yaml
# Application logging
logging:
  level:
    io.grpc: DEBUG
    io.grpc.netty: DEBUG

# Environment variable (very verbose)
GRPC_TRACE=all
GRPC_VERBOSITY=debug
```

### Use grpcurl for Manual Testing

```bash
# List services
grpcurl -plaintext localhost:50051 list

# List methods
grpcurl -plaintext localhost:50051 list example.orders.v1.OrderService

# Describe method
grpcurl -plaintext localhost:50051 describe example.orders.v1.OrderService.GetOrder

# Make request
grpcurl -plaintext -d '{"name": "orders/12345"}' \
  localhost:50051 example.orders.v1.OrderService/GetOrder
```

### Capture Network Traffic

```bash
# Capture gRPC traffic with tcpdump
sudo tcpdump -i any -s 0 -w grpc.pcap 'tcp port 50051'

# Analyze with Wireshark (has HTTP/2 dissector)
wireshark grpc.pcap
```

### Use Reflection API

```protobuf
// Add reflection service
import "grpc/reflection/v1alpha/reflection.proto";

// Enables grpcurl and other tools
```

```java
// Server-side registration
Server server = ServerBuilder.forPort(50051)
    .addService(new OrderServiceImpl())
    .addService(ProtoReflectionService.newInstance())  // Enable reflection
    .build();
```

---

## Related Documentation

- **[Error Handling Guide](../error-handling.md)** - Status codes and error details
- **[Load Balancing Guide](../load-balancing.md)** - Client-side and proxy-based LB
- **[Health Checking](../health-checking.md)** - Service health protocols
- **[Security Guide](../security.md)** - Authentication and authorization

---

**Navigation:** [← Back to gRPC Guide](../README.md) | [Error Handling →](../error-handling.md)
