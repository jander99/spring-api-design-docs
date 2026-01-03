# Metrics and Tracing

## Overview

Metrics and distributed tracing provide operational insights into system performance and behavior. This guide covers Micrometer metrics integration and Spring Cloud Sleuth distributed tracing.

## Metrics Collection

### Micrometer Integration

Configure Micrometer for metrics collection:

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

Implement custom metrics for business-specific monitoring:

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
        // Initialize metrics
        orderCreatedCounter = Counter.builder("orders.created")
            .description("Number of orders created")
            .register(meterRegistry);
            
        orderCancelledCounter = Counter.builder("orders.cancelled")
            .description("Number of orders cancelled")
            .register(meterRegistry);
            
        orderProcessingTimer = Timer.builder("orders.processing.time")
            .description("Time taken to process orders")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(meterRegistry);
            
        orderValueSummary = DistributionSummary.builder("orders.value")
            .description("Distribution of order values")
            .publishPercentiles(0.5, 0.75, 0.95)
            .baseUnit("dollars")
            .register(meterRegistry);
    }
    
    public void recordOrderCreated(Order order) {
        orderCreatedCounter.increment();
        orderValueSummary.record(order.getTotalAmount().doubleValue());
        
        // Record tags for more detailed metrics
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

### Using Metrics in Services

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

### Spring Cloud Sleuth Configuration

Configure distributed tracing with Spring Cloud Sleuth and Zipkin:

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

Ensure trace context propagation in service calls:

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

For reactive applications, configure trace context propagation:

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

### Comprehensive Metrics Example

```java
@Service
@RequiredArgsConstructor
public class OrderMetricsService {
    
    private final MeterRegistry meterRegistry;
    
    public void recordOrderMetrics(Order order) {
        // Increment counter
        meterRegistry.counter("orders.created", 
            "customerId", order.getCustomerId().toString(),
            "status", order.getStatus().name()).increment();
            
        // Record order amount
        meterRegistry.summary("orders.amount", 
            "customerId", order.getCustomerId().toString())
            .record(order.getTotalAmount().doubleValue());
            
        // Record timer for order processing
        Timer timer = meterRegistry.timer("orders.processing.time",
            "status", order.getStatus().name());
        timer.record(Duration.between(order.getCreatedDate(), Instant.now()));
    }
}
```

## Best Practices

### Patterns to Follow

| Pattern | Example | Description |
|---------|---------|-------------|
| Business Metrics | Orders created | Track business-specific metrics |
| Percentile Distribution | 50th, 95th, 99th | Monitor performance distribution |
| Tagged Metrics | Customer tags | Add context to metrics |
| Trace Context | Correlation IDs | Propagate context across services |

### Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Generic Metrics | Generic counters | Use specific, meaningful metrics |
| Missing Tags | No context | Add relevant tags for filtering |
| High Cardinality Tags | User IDs as tags | Use customer segments instead |
| Blocking in Reactive | `.block()` everywhere | Use reactive operators |

## Related Documentation

### API Design Standards (Language-Agnostic)
- [API Observability Standards](../../../guides/api-design/advanced-patterns/api-observability-standards.md) - Protocol-level observability patterns and HTTP standards

### Spring Implementation  
- [Observability Configuration](../configuration/observability-configuration.md) - Configuration patterns for metrics and tracing
- [Logging Standards](./logging-standards.md) - Structured logging and correlation IDs
- [Health and Monitoring](./health-and-monitoring.md) - Health checks, alerting, and dashboards
- [HTTP Client Patterns](../http-clients/http-client-patterns.md) - HTTP client metrics and observability
- [Security Context Propagation](../security/security-context-propagation.md) - Security context in traces
