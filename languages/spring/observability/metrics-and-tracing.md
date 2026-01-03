# Metrics and Tracing

## Overview

Metrics measure system performance. Tracing tracks requests as they move between services. Learn how to use Micrometer for metrics and Sleuth for tracing.

## Metrics Collection

Metrics track what happens in your system. Use Micrometer to collect them.

### Micrometer Integration

Set up Micrometer:

```java
@Configuration
public class MetricsConfig {
    
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags(
            @Value("${spring.application.name}") String applicationName) {
        return registry -> registry.config()
            .commonTags(
                "application", applicationName,
                "environment", "${spring.profiles.active:default}"
            );
    }
    
    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }
    
    @Bean
    public CountedAspect countedAspect(MeterRegistry registry) {
        return new CountedAspect(registry);
    }
}
```

### Custom Metrics

Create metrics for your specific business needs:

```java
@Service
@RequiredArgsConstructor
public class OrderMetricsService {
    
    private final MeterRegistry meterRegistry;
    
    private final Counter orderCreatedCounter;
    private final Counter orderCancelledCounter;
    private final Timer orderProcessingTimer;
    private final DistributionSummary orderValueSummary;
    
    @PostConstruct
     public void init() {
         orderCreatedCounter = Counter.builder("orders.created")
             .description("Orders created")
             .register(meterRegistry);
             
         orderCancelledCounter = Counter.builder("orders.cancelled")
             .description("Orders cancelled")
             .register(meterRegistry);
             
         orderProcessingTimer = Timer.builder("orders.processing.time")
             .description("Order processing time")
             .publishPercentiles(0.5, 0.95, 0.99)
             .register(meterRegistry);
             
         orderValueSummary = DistributionSummary.builder("orders.value")
             .description("Order values")
             .publishPercentiles(0.5, 0.75, 0.95)
             .baseUnit("dollars")
             .register(meterRegistry);
    }
    
    public void recordOrderCreated(Order order) {
         orderCreatedCounter.increment();
         orderValueSummary.record(order.getTotalAmount().doubleValue());
         
         meterRegistry.counter("orders.created.by.customer", 
             Tags.of("customerId", order.getCustomerId().toString()))
             .increment();
     }
    
    public void recordOrderCancelled(Order order) {
        orderCancelledCounter.increment();
    }
    
    public <T> T timeOrderProcessing(Supplier<T> processingFunction) {
        return orderProcessingTimer.record(processingFunction);
    }
}
```

### Use Metrics in Services

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final OrderMetricsService metricsService;
    
    @Timed(value = "orders.create.time", percentiles = {0.5, 0.95, 0.99})
    @Counted(value = "orders.create.count", recordFailuresOnly = false)
    public Order createOrder(Order order) {
        Order savedOrder = orderRepository.save(order);
        metricsService.recordOrderCreated(savedOrder);
        return savedOrder;
    }
    
    public Order processOrder(UUID orderId) {
        return metricsService.timeOrderProcessing(() -> {
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));
            
            order.process();
            return orderRepository.save(order);
        });
    }
}
```

### Reactive Metrics

For reactive applications, use reactive-friendly metrics:

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderMetricsService {
    
    private final MeterRegistry meterRegistry;
    
    public <T> Mono<T> recordOrderCreated(Mono<T> orderMono) {
        return orderMono
            .doOnSuccess(order -> {
                meterRegistry.counter("orders.created").increment();
                if (order instanceof Order) {
                    Order actualOrder = (Order) order;
                    meterRegistry.summary("orders.value")
                        .record(actualOrder.getTotalAmount().doubleValue());
                }
            });
    }
    
    public <T> Mono<T> timeOrderProcessing(Mono<T> orderProcessingMono) {
        return Mono.defer(() -> {
            Timer.Sample sample = Timer.start(meterRegistry);
            return orderProcessingMono.doOnSuccess(result -> 
                sample.stop(meterRegistry.timer("orders.processing.time")));
        });
    }
}
```

## Distributed Tracing

Tracing shows how requests flow through your system.

### Spring Cloud Sleuth Configuration

Set up Sleuth and Zipkin:

```yaml
# application.yml
spring:
  sleuth:
    sampler:
      probability: 1.0  # For development; use a lower value in production
    baggage:
      remote-fields: x-tenant-id
      correlation-fields: x-tenant-id
  zipkin:
    enabled: true
    base-url: http://zipkin-server:9411
    service:
      name: ${spring.application.name}
```

### Trace Context Propagation

Pass trace context between services:

```java
@Service
@RequiredArgsConstructor
public class CustomerClient {
    
    private final WebClient customerServiceClient;
    
    @NewSpan("getCustomer")
    public CustomerDto getCustomer(@SpanTag("customerId") UUID customerId) {
        return customerServiceClient.get()
            .uri("/v1/customers/{customerId}", customerId)
            .retrieve()
            .bodyToMono(CustomerDto.class)
            .block();
    }
}
```

### Reactive Tracing

Set up trace context for non-blocking code:

```java
@Service
@RequiredArgsConstructor
public class ReactiveCustomerClient {
    
    private final WebClient customerServiceClient;
    
    @NewSpan("getCustomer")
    public Mono<CustomerDto> getCustomer(@SpanTag("customerId") UUID customerId) {
        return customerServiceClient.get()
            .uri("/v1/customers/{customerId}", customerId)
            .retrieve()
            .bodyToMono(CustomerDto.class);
    }
}
```

## Metrics Examples

### Full Metrics Example

```java
@Service
@RequiredArgsConstructor
public class OrderMetricsService {
    
    private final MeterRegistry meterRegistry;
    
    public void recordOrderMetrics(Order order) {
         meterRegistry.counter("orders.created", 
             "customerId", order.getCustomerId().toString(),
             "status", order.getStatus().name()).increment();
             
         meterRegistry.summary("orders.amount", 
             "customerId", order.getCustomerId().toString())
             .record(order.getTotalAmount().doubleValue());
             
         Timer timer = meterRegistry.timer("orders.processing.time",
             "status", order.getStatus().name());
         timer.record(Duration.between(order.getCreatedDate(), Instant.now()));
     }
}
```

## Best Practices

### Good Patterns

| Pattern | Example | Why |
|---------|---------|-----|
| Business Metrics | Orders created | Track your goals |
| Percentiles | 50th, 95th, 99th | See performance variation |
| Tags | Customer IDs | Filter and group data |
| Correlation IDs | Trace headers | Link requests across services |

### Avoid These Patterns

| Problem | Example | Fix |
|---------|---------|-----|
| Generic names | Generic counter | Use specific names |
| No tags | No context | Add labels always |
| Too many tag values | All user IDs | Use segments |
| Blocking code | Many `.block()` calls | Use reactive calls |

## Related Documentation

### Related Guides

- [API Observability](../../../guides/api-design/advanced-patterns/api-observability-standards.md) - HTTP observability patterns
- [Observability Config](../configuration/observability-configuration.md) - How to set up metrics and tracing
- [Logging](./logging-standards.md) - Structured logs and IDs
- [Health Checks](./health-and-monitoring.md) - Monitoring and alerts
- [HTTP Clients](../http-clients/http-client-patterns.md) - Client metrics
- [Security Context](../security/security-context-propagation.md) - Security in traces
