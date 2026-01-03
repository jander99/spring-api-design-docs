# Logging Standards

## Overview

Good logging helps you see what happens in production. It helps you find and fix problems. This guide shows how to add logging to Spring Boot services.

## Logging Principles

1. **Structured Logging**: Use JSON format for easier searching
2. **Appropriate Log Levels**: Use the right level for each message
3. **Context Enrichment**: Add context to your logs
4. **Correlation IDs**: Track requests with unique IDs
5. **Security Awareness**: Never log passwords or secrets

## Logging Configuration

### Logback Configuration

Configure Logback for structured logging:

```xml
<!-- logback-spring.xml -->
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>correlationId</includeMdcKeyName>
            <includeMdcKeyName>userId</includeMdcKeyName>
            <includeMdcKeyName>requestPath</includeMdcKeyName>
            <shortenedLoggerNameLength>36</shortenedLoggerNameLength>
        </encoder>
    </appender>
    
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/application.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/application-%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>correlationId</includeMdcKeyName>
            <includeMdcKeyName>userId</includeMdcKeyName>
            <includeMdcKeyName>requestPath</includeMdcKeyName>
        </encoder>
    </appender>
    
    <!-- Root logger -->
    <root level="INFO">
        <appender-ref ref="CONSOLE" />
        <appender-ref ref="FILE" />
    </root>
    
    <!-- Framework loggers -->
    <logger name="org.springframework" level="INFO" />
    <logger name="org.hibernate" level="WARN" />
    
    <!-- Application loggers -->
    <logger name="com.example.orderservice" level="DEBUG" />
</configuration>
```

### Spring Boot Configuration

Configure logging properties in application.yml:

```yaml
# application.yml
logging:
  level:
    root: INFO
    com.example.orderservice: DEBUG
    org.springframework: INFO
    org.hibernate: WARN
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
  file:
    name: logs/application.log
    max-size: 10MB
    max-history: 30
```

## Correlation ID Management

### Imperative (Servlet) Applications

Implement correlation ID filter:

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter implements Filter {
    
    private static final String CORRELATION_ID_HEADER = "X-Request-ID";
    private static final String CORRELATION_ID_MDC_KEY = "correlationId";
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String correlationId = httpRequest.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.trim().isEmpty()) {
            correlationId = UUID.randomUUID().toString();
        }
        
        // Set the correlation ID in MDC for logging
        MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
        
        // Add the correlation ID as a response header
        httpResponse.addHeader(CORRELATION_ID_HEADER, correlationId);
        
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(CORRELATION_ID_MDC_KEY);
        }
    }
}
```

### Reactive (WebFlux) Applications

Implement correlation ID filter for WebFlux:

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ReactiveCorrelationIdFilter implements WebFilter {
    
    private static final String CORRELATION_ID_HEADER = "X-Request-ID";
    private static final String CORRELATION_ID_ATTR = "correlationId";
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String correlationId = exchange.getRequest().getHeaders().getFirst(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.trim().isEmpty()) {
            correlationId = UUID.randomUUID().toString();
        }
        
        String finalCorrelationId = correlationId;
        
        // Add correlation ID to response headers
        exchange.getResponse().getHeaders().add(CORRELATION_ID_HEADER, finalCorrelationId);
        
        // Store in exchange attributes
        exchange.getAttributes().put(CORRELATION_ID_ATTR, finalCorrelationId);
        
        return chain.filter(exchange)
            .contextWrite(context -> context.put(CORRELATION_ID_ATTR, finalCorrelationId));
    }
}
```

### MDC Context for Reactive Applications

Since MDC doesn't work naturally with reactive applications, implement a custom solution:

```java
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import java.util.function.Function;

@Component
@Slf4j
public class LoggingContextUtils {
    
    private static final String CORRELATION_ID_KEY = "correlationId";
    
    /**
     * Get correlation ID from Reactor context
     */
    public static Mono<String> getCorrelationId() {
        return Mono.deferContextual(Mono::just)
            .map(context -> context.getOrDefault(CORRELATION_ID_KEY, "unknown"))
            .map(Object::toString);
    }
    
    /**
     * Log with context
     */
    public static <T> Mono<T> logWithContext(Mono<T> mono, Function<String, String> messageBuilder) {
        return Mono.deferContextual(ctx -> {
            String correlationId = ctx.getOrDefault(CORRELATION_ID_KEY, "unknown").toString();
            String message = messageBuilder.apply(correlationId);
            log.info(message);
            return mono;
        });
    }
    
    /**
     * Log debug with context
     */
    public static <T> Mono<T> logDebugWithContext(Mono<T> mono, Function<String, String> messageBuilder) {
        return Mono.deferContextual(ctx -> {
            String correlationId = ctx.getOrDefault(CORRELATION_ID_KEY, "unknown").toString();
            String message = messageBuilder.apply(correlationId);
            log.debug(message);
            return mono;
        });
    }
    
    /**
     * Log error with context
     */
    public static <T> Mono<T> logErrorWithContext(Mono<T> mono, Function<String, String> messageBuilder, Throwable error) {
        return Mono.deferContextual(ctx -> {
            String correlationId = ctx.getOrDefault(CORRELATION_ID_KEY, "unknown").toString();
            String message = messageBuilder.apply(correlationId);
            log.error(message, error);
            return mono;
        });
    }
}
```

## Log Levels and Usage

Define clear guidelines for log levels:

| Level | Usage | Example |
|-------|-------|---------|
| ERROR | Application failures requiring immediate action | `log.error("Payment processing failed", exception);` |
| WARN | Potential issues that don't prevent operation | `log.warn("Retry {} of {}", attempt, maxRetries);` |
| INFO | Significant business events and milestones | `log.info("Order {} created for customer {}", orderId, customerId);` |
| DEBUG | Detailed information for troubleshooting | `log.debug("Processing order items: {}", items);` |
| TRACE | Most detailed information (rarely used) | `log.trace("Request payload: {}", requestBody);` |

### Example Implementation

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    
    @Transactional
    public Order createOrder(Order order) {
        log.info("Creating new order for customer {}", order.getCustomerId());
        
        try {
            log.debug("Order details: {}", order);
            
            Order savedOrder = orderRepository.save(order);
            
            log.info("Order {} created successfully", savedOrder.getId());
            
            try {
                paymentService.processPayment(savedOrder);
                log.info("Payment processed for order {}", savedOrder.getId());
            } catch (PaymentException e) {
                log.error("Payment processing failed for order {}", savedOrder.getId(), e);
                throw e;
            }
            
            return savedOrder;
        } catch (Exception e) {
            log.error("Failed to create order for customer {}", order.getCustomerId(), e);
            throw e;
        }
    }
}
```

### Reactive Service Logging

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class ReactiveOrderService {
    
    private final ReactiveOrderRepository orderRepository;
    private final ReactivePaymentService paymentService;
    
    public Mono<Order> createOrder(Order order) {
        return Mono.just(order)
            .flatMap(o -> LoggingContextUtils.logWithContext(
                Mono.just(o),
                correlationId -> String.format("[%s] Creating new order for customer %s", 
                    correlationId, o.getCustomerId())
            ))
            .flatMap(orderRepository::save)
            .flatMap(savedOrder -> LoggingContextUtils.logWithContext(
                Mono.just(savedOrder),
                correlationId -> String.format("[%s] Order %s created successfully", 
                    correlationId, savedOrder.getId())
            ))
            .flatMap(savedOrder -> 
                paymentService.processPayment(savedOrder)
                    .flatMap(payment -> LoggingContextUtils.logWithContext(
                        Mono.just(savedOrder),
                        correlationId -> String.format("[%s] Payment processed for order %s", 
                            correlationId, savedOrder.getId())
                    ))
                    .onErrorResume(e -> LoggingContextUtils.logErrorWithContext(
                        Mono.error(e),
                        correlationId -> String.format("[%s] Payment processing failed for order %s", 
                            correlationId, savedOrder.getId()),
                        e
                    ).cast(Order.class))
            )
            .onErrorResume(e -> LoggingContextUtils.logErrorWithContext(
                Mono.error(e),
                correlationId -> String.format("[%s] Failed to create order for customer %s", 
                    correlationId, order.getCustomerId()),
                e
            ).cast(Order.class));
    }
    
    // Alternative approach using doOnEach for reactive context-aware logging
    public Mono<Order> createOrderAlternative(Order order) {
        return Mono.just(order)
            .doOnEach(signal -> {
                if (signal.hasValue()) {
                    String correlationId = signal.getContextView()
                        .getOrDefault("correlationId", "unknown").toString();
                    log.info("[{}] Creating new order for customer {}", 
                        correlationId, signal.get().getCustomerId());
                }
            })
            .flatMap(orderRepository::save)
            .doOnEach(signal -> {
                if (signal.hasValue()) {
                    String correlationId = signal.getContextView()
                        .getOrDefault("correlationId", "unknown").toString();
                    log.info("[{}] Order {} created successfully", 
                        correlationId, signal.get().getId());
                }
                if (signal.hasError()) {
                    String correlationId = signal.getContextView()
                        .getOrDefault("correlationId", "unknown").toString();
                    log.error("[{}] Failed to create order", correlationId, signal.getThrowable());
                }
            });
    }
}
```

## Logging Best Practices

### Patterns to Follow

| Pattern | Example | Description |
|---------|---------|-------------|
| Structured Logging | JSON format | Use structured format for better analysis |
| Contextual Logging | Include trace IDs | Add context to logs |
| Appropriate Log Levels | ERROR for failures | Use correct log level for different information |
| Parameterized Logging | `log.info("Value: {}", value)` | Avoid string concatenation |

### Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Excessive Logging | Debug in production | Use appropriate log levels |
| Sensitive Data Logging | Passwords in logs | Sanitize sensitive information |
| String Concatenation | "Value=" + value | Use parameterized logging |
| Missing Correlation IDs | No request tracing | Implement end-to-end request tracing |

## Comprehensive Logging Example

```java
@RestController
@RequestMapping("/v1/orders")
@Slf4j
@RequiredArgsConstructor
public class OrderController {
    
    private final OrderService orderService;
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @RequestHeader(name = "X-User-ID", required = false) String userId) {
        
        UUID requestId = UUID.fromString(MDC.get("correlationId"));
        
        log.info("Received order creation request: requestId={}, userId={}, customerID={}",
            requestId, userId, request.getCustomerId());
        
        try {
            log.debug("Order request details: {}", request);
            
            Order order = orderService.createOrder(orderMapper.toDomain(request));
            OrderResponse response = orderMapper.toResponse(order);
            
            log.info("Order created successfully: orderId={}, requestId={}", 
                order.getId(), requestId);
                
            return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
        } catch (Exception e) {
            log.error("Failed to create order: requestId={}, error={}", 
                requestId, e.getMessage(), e);
            throw e;
        }
    }
}
```

## Related Documentation

### API Design Standards (Language-Agnostic)
- [API Observability Standards](../../../guides/api-design/advanced-patterns/api-observability-standards.md) - Protocol-level observability patterns and HTTP standards

### Spring Implementation  
- [Observability Configuration](../configuration/observability-configuration.md) - Configuration patterns for metrics and tracing
- [Error Logging and Monitoring](../error-handling/error-logging-and-monitoring.md) - Error handling observability
- [Metrics and Tracing](./metrics-and-tracing.md) - Metrics collection and distributed tracing
- [Health and Monitoring](./health-and-monitoring.md) - Health checks, alerting, and dashboards
