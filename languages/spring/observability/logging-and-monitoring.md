# Logging and Monitoring

## Overview

Good logging and monitoring help you see what's happening in production. They let you find problems and fix them quickly.

This guide covers three areas:
- Logging: Recording what your application does
- Metrics: Measuring performance and business activities
- Health checks: Watching your service and its dependencies

## Logging Principles

1. **Structured Logging**: Use JSON format. This makes logs easier to search and analyze.
2. **Correct Log Levels**: Use ERROR for failures, WARNING for problems that don't stop the app, INFO for important events, and DEBUG for detailed information.
3. **Add Context**: Include user IDs, order numbers, and request IDs in your logs.
4. **Trace Requests**: Add unique IDs to track requests across services.
5. **Protect Secrets**: Never log passwords, tokens, or personal data.

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

A correlation ID is a unique string that tracks a request through your system. It helps you connect log entries from different services.

### Imperative (Servlet) Applications

Create a filter to add correlation IDs:

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

For non-blocking applications, create a reactive filter:

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

MDC (Mapped Diagnostic Context) is a tool for adding context to logs. Reactive apps need special handling. Here's a helper class:

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

Use these log levels to describe what's happening:

| Level | When to Use | Example |
|-------|-----------|---------|
| ERROR | App crashes or services fail | `Payment processing failed` |
| WARN | Something might be wrong but the app keeps working | `Retrying payment, attempt 2 of 3` |
| INFO | Important business events | `Order 123 created for customer 456` |
| DEBUG | Detailed info to help you find bugs | `Processing 5 order items` |
| TRACE | Very detailed info (rarely used) | `Request body received` |

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

## Metrics Collection

Metrics measure how your app performs. Common metrics include response time, error count, and business events like orders created.

### Micrometer Integration

Micrometer is a library for collecting metrics. Configure it:

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

Create metrics for your business. For example, track how many orders were created and how much time each took:

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

### Recording Metrics in Your Code

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

### Metrics in Reactive Apps

For non-blocking apps, record metrics in reactive chains:

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

## Health Monitoring

Health checks tell you if your app and its dependencies are working. Spring Boot provides an `/actuator/health` endpoint that returns the app's status.

### Configure Spring Boot Actuator

Add configuration to enable health endpoints:

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
      base-path: /actuator
  endpoint:
    health:
      show-details: when_authorized
      show-components: when_authorized
      probes:
        enabled: true
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
  info:
    env:
      enabled: true
    git:
      enabled: true
    build:
      enabled: true
```

### Create Custom Health Checks

Check external services like payment gateways:

```java
@Component
public class PaymentServiceHealthIndicator implements HealthIndicator {
    
    private final WebClient paymentServiceClient;
    
    public PaymentServiceHealthIndicator(WebClient.Builder webClientBuilder,
                                         @Value("${services.payment.url}") String baseUrl) {
        this.paymentServiceClient = webClientBuilder
            .baseUrl(baseUrl)
            .build();
    }
    
    @Override
    public Health health() {
        try {
            // Perform health check against payment service
            ResponseEntity<String> response = paymentServiceClient.get()
                .uri("/actuator/health")
                .retrieve()
                .toEntity(String.class)
                .block(Duration.ofSeconds(5));
                
            if (response.getStatusCode().is2xxSuccessful()) {
                return Health.up()
                    .withDetail("status", response.getStatusCode())
                    .build();
            } else {
                return Health.down()
                    .withDetail("status", response.getStatusCode())
                    .build();
            }
        } catch (Exception e) {
            return Health.down(e)
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

### Health Checks for Reactive Apps

```java
@Component
public class ReactivePaymentServiceHealthIndicator implements ReactiveHealthIndicator {
    
    private final WebClient paymentServiceClient;
    
    public ReactivePaymentServiceHealthIndicator(WebClient.Builder webClientBuilder,
                                                @Value("${services.payment.url}") String baseUrl) {
        this.paymentServiceClient = webClientBuilder
            .baseUrl(baseUrl)
            .build();
    }
    
    @Override
    public Mono<Health> health() {
        return paymentServiceClient.get()
            .uri("/actuator/health")
            .retrieve()
            .toEntity(String.class)
            .timeout(Duration.ofSeconds(3))
            .map(response -> {
                if (response.getStatusCode().is2xxSuccessful()) {
                    return Health.up()
                        .withDetail("status", response.getStatusCode())
                        .build();
                } else {
                    return Health.down()
                        .withDetail("status", response.getStatusCode())
                        .build();
                }
            })
            .onErrorResume(e -> Mono.just(Health.down(e)
                .withDetail("error", e.getMessage())
                .build()));
    }
}
```

## Distributed Tracing

Tracing follows a single request as it moves through multiple services. This helps you understand where time is spent and find bottlenecks.

### Configure Spring Cloud Sleuth

Add Sleuth and Zipkin to track requests:

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

### Propagate Trace Context

Add trace information to calls to other services:

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

### Tracing for Reactive Apps

For non-blocking apps, add trace context:

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

## Alerting

Alerts tell you when something is wrong. For example, alert if more than 5% of requests are failing or if response times are too slow.

### Create Alert Rules

Define Prometheus alert rules:

```yaml
# alert-rules.yml
groups:
- name: order-service-alerts
  rules:
  - alert: HighErrorRate
    expr: sum(rate(http_server_requests_seconds_count{status="5xx"}[5m])) / sum(rate(http_server_requests_seconds_count[5m])) > 0.05
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "High HTTP error rate"
      description: "More than 5% of requests are resulting in 5xx errors for the past 1 minute"

  - alert: SlowResponseTime
    expr: histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le)) > 0.5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Slow response time"
      description: "95th percentile of response time is above 500ms for the past 5 minutes"

  - alert: HighCPUUsage
    expr: process_cpu_usage > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage"
      description: "CPU usage is above 80% for the past 5 minutes"
```

## Logging and Monitoring in Kubernetes

Kubernetes is a platform for running containers. It has its own way of handling logs and monitoring.

### Configure Container Logs

Set up how containers write logs:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    spec:
      containers:
      - name: order-service
        image: order-service:latest
        env:
        - name: JAVA_OPTS
          value: "-Xmx512m -Xms256m"
        - name: SPRING_PROFILES_ACTIVE
          value: "production"
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        volumeMounts:
        - name: log-volume
          mountPath: /app/logs
      volumes:
      - name: log-volume
        emptyDir: {}
```

### Collect Logs with Fluentd

Fluentd gathers logs from containers and sends them to a central location:

```yaml
# fluentd-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/order-service-*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.order-service.*
      format json
      time_format %Y-%m-%dT%H:%M:%S.%NZ
    </source>
    
    <filter kubernetes.**>
      @type kubernetes_metadata
    </filter>
    
    <match kubernetes.order-service.**>
      @type elasticsearch
      host elasticsearch-logging
      port 9200
      logstash_format true
      logstash_prefix order-service
      include_tag_key true
    </match>
```

## Dashboards

Grafana is a tool for visualizing metrics. Below is a dashboard template that shows request rates and response times.

```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": null,
      "fieldConfig": {
        "defaults": {},
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 2,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.5.5",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "exemplar": true,
          "expr": "sum(rate(http_server_requests_seconds_count{application=\"order-service\"}[1m])) by (status)",
          "interval": "",
          "legendFormat": "{{status}}",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "HTTP Request Rate",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": null,
      "fieldConfig": {
        "defaults": {},
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 4,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.5.5",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "exemplar": true,
          "expr": "histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{application=\"order-service\"}[5m])) by (le, uri))",
          "interval": "",
          "legendFormat": "{{uri}}",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "HTTP Response Time (95th percentile)",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "s",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    }
  ],
  "refresh": "5s",
  "schemaVersion": 27,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "Order Service Dashboard",
  "uid": "order-service-dash",
  "version": 1
}
```

## Best Practices and Mistakes to Avoid

### Do This

| Good Practice | Why |
|--------------|-----|
| Use JSON format for logs | Easier to search and analyze |
| Add request IDs to logs | Track requests across services |
| Use the right log level | Reduces noise, makes logs useful |
| Track business events | Understand what users are doing |
| Check external services | Know when dependencies fail |

### Don't Do This

| Mistake | Problem | Fix |
|--------|---------|-----|
| Log passwords or tokens | Security risk | Remove sensitive data before logging |
| Log too much in production | Wastes storage and time | Use INFO level only, use DEBUG locally |
| String concatenation for logs | Hard to parse | Use parameterized logging |
| Generic counters without tags | Can't tell what happened | Add tags like customer ID or region |
| No request tracing | Can't follow requests | Add correlation IDs |

## Examples

### Logging in a REST Controller

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

### Recording Metrics

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

## Related Documentation

**API Design Standards**
- [API Observability Standards](../../../guides/api-design/advanced-patterns/api-observability-standards.md) - General observability principles

**Spring Implementation**
- [Observability Configuration](../configuration/observability-configuration.md) - How to configure metrics and tracing
- [Error Logging and Monitoring](../error-handling/error-logging-and-monitoring.md) - How to log errors
- [Infrastructure Testing](../testing/specialized-testing/infrastructure-testing.md) - How to test observability
- [Security Context Propagation](../security/security-context-propagation.md) - How to include security info in traces
- [HTTP Client Patterns](../http-clients/http-client-patterns.md) - How to add metrics to HTTP calls

These practices help you see what's happening in production, find problems quickly, and understand how your app performs.