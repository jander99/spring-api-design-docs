# Spring Boot gRPC Metrics with Micrometer

> **📖 Reading Guide**
> **⏱️ Reading Time:** 8 minutes | **🎯 Level:** Intermediate
> **📋 Prerequisites:** [Interceptors](../interceptors.md), Micrometer knowledge
> **🎯 Key Topics:** Micrometer • Prometheus • Custom metrics • Performance monitoring
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

Monitor gRPC services with Micrometer metrics and Prometheus integration.

---

## Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

---

## Configuration

**application.yml:**
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active:default}
```

---

## Metrics Interceptor

```java
@GrpcGlobalServerInterceptor
public class MetricsInterceptor implements ServerInterceptor {

    private final MeterRegistry meterRegistry;

    public MetricsInterceptor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        String service = call.getMethodDescriptor().getServiceName();
        String method = call.getMethodDescriptor().getBareMethodName();
        
        Timer.Sample sample = Timer.start(meterRegistry);
        
        Counter.builder("grpc.server.requests.total")
            .tag("service", service)
            .tag("method", method)
            .register(meterRegistry)
            .increment();
        
        return new ForwardingServerCallListener.SimpleForwardingServerCallListener<ReqT>(
                next.startCall(
                    new ForwardingServerCall.SimpleForwardingServerCall<ReqT, RespT>(call) {
                        @Override
                        public void close(Status status, Metadata trailers) {
                            sample.stop(Timer.builder("grpc.server.duration")
                                .tag("service", service)
                                .tag("method", method)
                                .tag("status", status.getCode().name())
                                .register(meterRegistry));
                            
                            Counter.builder("grpc.server.responses.total")
                                .tag("service", service)
                                .tag("method", method)
                                .tag("status", status.getCode().name())
                                .register(meterRegistry)
                                .increment();
                            
                            super.close(status, trailers);
                        }
                    },
                    headers
                )
        ) {};
    }
}
```

---

## Custom Metrics

```java
@Service
public class OrderMetrics {

    private final Counter ordersCreated;
    private final Counter ordersFailed;
    private final Gauge activeOrders;

    public OrderMetrics(MeterRegistry registry, OrderRepository repository) {
        this.ordersCreated = Counter.builder("orders.created.total")
            .description("Total orders created")
            .register(registry);
        
        this.ordersFailed = Counter.builder("orders.failed.total")
            .description("Total orders failed")
            .register(registry);
        
        this.activeOrders = Gauge.builder("orders.active", repository, 
                r -> r.countByStatus(OrderStatus.PENDING))
            .description("Active pending orders")
            .register(registry);
    }

    public void incrementCreated() {
        ordersCreated.increment();
    }

    public void incrementFailed() {
        ordersFailed.increment();
    }
}
```

---

**Navigation:** [← Testing](../testing/testcontainers.md) | [Tracing →](tracing.md)
