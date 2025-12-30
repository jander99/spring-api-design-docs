# Spring Boot Observability Standards

## Overview

This directory contains comprehensive guidelines for implementing observability in Spring Boot applications, including logging, monitoring, metrics collection, and distributed tracing patterns.

## Directory Contents

### Core Observability Documentation

- **[Logging and Monitoring](logging-and-monitoring.md)**: Complete guide to structured logging, metrics collection, health checks, and monitoring best practices for both imperative and reactive Spring Boot applications.

## Key Observability Principles

### Three Pillars of Observability
1. **Logging**: Structured, searchable records of application events
2. **Metrics**: Quantitative measurements of application performance
3. **Tracing**: Request flow tracking across distributed systems

### Structured Logging
- JSON-formatted logs for better searchability
- Consistent log levels and formatting
- Correlation IDs for request tracking
- Security-conscious logging (no sensitive data)

### Metrics Collection
- Application performance metrics with Micrometer
- Business metrics and custom counters
- JVM and system metrics monitoring
- Database and external service metrics

### Health Monitoring
- Application health checks and readiness probes
- Dependency health monitoring
- Circuit breaker pattern implementation
- Graceful degradation strategies

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
- [API Observability Standards](../../api-design/advanced-patterns/api-observability-standards.md) - Protocol-level observability patterns

### Spring Implementation
- [Observability Configuration](../configuration/observability-configuration.md)
- [Error Logging and Monitoring](../error-handling/error-logging-and-monitoring.md)  
- [Infrastructure Testing](../testing/specialized-testing/infrastructure-testing.md)
- [Security Context Propagation](../security/security-context-propagation.md)