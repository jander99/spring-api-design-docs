# Spring Boot Observability Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 9.4 grade level • 1.0% technical density • fairly difficult

## Why Observability?

Your app is running in production. Users report errors. Where do you start?

Observability gives you three tools to diagnose problems. Think of it like a doctor examining a patient. You need different tests to understand what's wrong.

## What You Get

This guide shows you how to monitor Spring Boot apps. You'll learn to:
- Track what your app is doing (logging)
- Measure how well it performs (metrics)
- Follow requests through your system (tracing)

## Directory Contents

### Core Documentation

- **[Structured Logging](structured-logging.md)**: **NEW (Spring Boot 3.4+)** - Native JSON logging with ECS, GELF, and Logstash formats. No external dependencies.
- **[Logging Standards](logging-standards.md)**: Write structured logs. Track requests with correlation IDs. Works with both imperative and reactive apps.
- **[Metrics and Tracing](metrics-and-tracing.md)**: Count events and time operations. Follow requests across services.
- **[Health and Monitoring](health-and-monitoring.md)**: Check if your app is healthy. Set up alerts. Integrate with Kubernetes.

## The Three Pillars

Observability relies on three types of data:

### 1. Logging
Logs record what happened. They answer "What did my app do?"

Example: "User 123 created order 456 at 2:00 PM"

Use logs to find specific events and errors.

### 2. Metrics
Metrics measure performance. They answer "How is my app doing?"

Example: "Response time: 50ms, Orders per second: 100"

Use metrics to spot trends and set alerts.

### 3. Tracing
Traces follow requests. They answer "Where did this request go?"

Example: "Request went from API → Database → Payment Service"

Use traces to find slow parts of your system.

## Best Practices

### Write Structured Logs
- Use JSON format so logs are easy to search
- Pick the right log level (INFO, WARN, ERROR)
- Add correlation IDs to track requests
- Never log passwords or credit cards

### Collect Metrics
- Track app performance with Micrometer
- Count important business events
- Monitor JVM memory and CPU usage
- Watch database and API response times

### Monitor Health
- Add health checks for your app and dependencies
- Use readiness probes for Kubernetes
- Fail fast when services are down
- Degrade gracefully when possible

## Quick Reference

### Structured Logging Setup
```java
@Component
public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
    
    public Order createOrder(CreateOrderRequest request) {
        logger.info("Creating order for customer: {}", request.getCustomerId());
        
        try {
            Order order = processOrder(request);
            logger.info("Order created successfully: orderId={}, customerId={}", 
                       order.getId(), order.getCustomerId());
            return order;
        } catch (Exception e) {
            logger.error("Failed to create order for customer: {}", 
                        request.getCustomerId(), e);
            throw e;
        }
    }
}
```

### Custom Metrics
```java
@Component
public class MetricsService {
    private final Counter orderCreatedCounter;
    private final Timer orderProcessingTimer;
    
    public MetricsService(MeterRegistry meterRegistry) {
        this.orderCreatedCounter = Counter.builder("orders.created")
            .description("Number of orders created")
            .register(meterRegistry);
            
        this.orderProcessingTimer = Timer.builder("order.processing.time")
            .description("Time taken to process an order")
            .register(meterRegistry);
    }
    
    public void recordOrderCreated() {
        orderCreatedCounter.increment();
    }
    
    public void recordOrderProcessingTime(Duration duration) {
        orderProcessingTimer.record(duration);
    }
}
```

### Health Check Implementation
```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    
    private final DataSource dataSource;
    
    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }
    
    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(1)) {
                return Health.up()
                    .withDetail("database", "Available")
                    .withDetail("validationQuery", "SELECT 1")
                    .build();
            }
        } catch (SQLException e) {
            return Health.down()
                .withDetail("database", "Unavailable")
                .withException(e)
                .build();
        }
        return Health.down().withDetail("database", "Validation failed").build();
    }
}
```

### Distributed Tracing
```java
@Service
public class OrderService {
    private final Tracer tracer;
    
    public OrderService(Tracer tracer) {
        this.tracer = tracer;
    }
    
    public Order processOrder(CreateOrderRequest request) {
        Span span = tracer.nextSpan()
            .name("order-processing")
            .tag("customer.id", request.getCustomerId())
            .start();
        
        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            return doProcessOrder(request);
        } finally {
            span.end();
        }
    }
}
```

## Configuration Examples

### Logging Configuration (logback-spring.xml)
```xml
<configuration>
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
            <providers>
                <timestamp/>
                <logLevel/>
                <loggerName/>
                <message/>
                <mdc/>
                <arguments/>
                <stackTrace/>
            </providers>
        </encoder>
    </appender>
    
    <root level="INFO">
        <appender-ref ref="STDOUT"/>
    </root>
</configuration>
```

### Metrics Configuration
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active}
```

## Navigation

- [← Back to Spring Design](../README.md)
- [Configuration Standards](../configuration/README.md)
- [Error Handling](../error-handling/README.md)
- [Testing Standards](../testing/README.md)

## Related Documentation

### API Design Standards (Language-Agnostic)
- [API Observability Standards](../../../guides/api-design/advanced-patterns/api-observability-standards.md) - Protocol-level observability patterns

### Spring Implementation
- [Structured Logging](structured-logging.md) - **NEW** Spring Boot 3.4+ native JSON logging
- [Logging Standards](logging-standards.md) - Structured logging and correlation IDs
- [Metrics and Tracing](metrics-and-tracing.md) - Metrics collection and distributed tracing
- [Health and Monitoring](health-and-monitoring.md) - Health checks, alerting, and dashboards
- [Observability Configuration](../configuration/observability-configuration.md)
- [Error Logging and Monitoring](../error-handling/error-logging-and-monitoring.md)  
- [Infrastructure Testing](../testing/specialized-testing/infrastructure-testing.md)
- [Security Context Propagation](../security/security-context-propagation.md)

### gRPC Observability

**[Spring gRPC Observability](../grpc/observability/)** - For internal microservices using gRPC, learn how to implement metrics, tracing, and health checks for gRPC services.