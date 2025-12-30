# Java/Spring Observability Implementation

## Spring Boot Actuator

### Dependencies

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

### Configuration

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
```

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/actuator/health` | Overall health |
| `/actuator/health/liveness` | Liveness probe |
| `/actuator/health/readiness` | Readiness probe |
| `/actuator/prometheus` | Prometheus metrics |

## Custom Health Indicators

### Imperative Health Indicator

```java
@Component
public class PaymentServiceHealthIndicator implements HealthIndicator {

    private final WebClient paymentClient;
    
    @Override
    public Health health() {
        try {
            ResponseEntity<String> response = paymentClient.get()
                .uri("/health")
                .retrieve()
                .toEntity(String.class)
                .block(Duration.ofSeconds(5));
                
            if (response.getStatusCode().is2xxSuccessful()) {
                return Health.up()
                    .withDetail("status", response.getStatusCode())
                    .build();
            }
            return Health.down()
                .withDetail("status", response.getStatusCode())
                .build();
        } catch (Exception e) {
            return Health.down(e)
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

### Reactive Health Indicator

```java
@Component
public class ReactivePaymentHealthIndicator implements ReactiveHealthIndicator {

    private final WebClient paymentClient;
    
    @Override
    public Mono<Health> health() {
        return paymentClient.get()
            .uri("/health")
            .retrieve()
            .toEntity(String.class)
            .timeout(Duration.ofSeconds(3))
            .map(response -> {
                if (response.getStatusCode().is2xxSuccessful()) {
                    return Health.up()
                        .withDetail("status", response.getStatusCode())
                        .build();
                }
                return Health.down()
                    .withDetail("status", response.getStatusCode())
                    .build();
            })
            .onErrorResume(e -> Mono.just(
                Health.down(e)
                    .withDetail("error", e.getMessage())
                    .build()
            ));
    }
}
```

## Correlation ID Filter

### Servlet Filter (Imperative)

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter implements Filter {

    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String CORRELATION_ID_KEY = "correlationId";
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                         FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String correlationId = httpRequest.getHeader(REQUEST_ID_HEADER);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        
        // Add to MDC for logging
        MDC.put(CORRELATION_ID_KEY, correlationId);
        
        // Echo in response
        httpResponse.addHeader(REQUEST_ID_HEADER, correlationId);
        
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(CORRELATION_ID_KEY);
        }
    }
}
```

### WebFlux Filter (Reactive)

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ReactiveCorrelationIdFilter implements WebFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String CORRELATION_ID_KEY = "correlationId";
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String correlationId = exchange.getRequest()
            .getHeaders()
            .getFirst(REQUEST_ID_HEADER);
            
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        
        String finalCorrelationId = correlationId;
        
        // Echo in response
        exchange.getResponse().getHeaders()
            .add(REQUEST_ID_HEADER, finalCorrelationId);
        
        // Store in attributes and context
        exchange.getAttributes().put(CORRELATION_ID_KEY, finalCorrelationId);
        
        return chain.filter(exchange)
            .contextWrite(ctx -> ctx.put(CORRELATION_ID_KEY, finalCorrelationId));
    }
}
```

## Structured Logging

### Logback Configuration

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
    
    <root level="INFO">
        <appender-ref ref="CONSOLE" />
    </root>
    
    <logger name="com.example" level="DEBUG" />
</configuration>
```

### Logging in Services

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    
    public Order createOrder(Order order) {
        // Correlation ID automatically included via MDC
        log.info("Creating order for customer {}", order.getCustomerId());
        
        try {
            Order saved = orderRepository.save(order);
            log.info("Order {} created successfully", saved.getId());
            return saved;
        } catch (Exception e) {
            log.error("Failed to create order for customer {}", 
                order.getCustomerId(), e);
            throw e;
        }
    }
}
```

### Reactive Logging with Context

```java
@Service
@Slf4j
public class ReactiveOrderService {

    public Mono<Order> createOrder(Order order) {
        return Mono.just(order)
            .doOnEach(signal -> {
                if (signal.hasValue()) {
                    String correlationId = signal.getContextView()
                        .getOrDefault("correlationId", "unknown").toString();
                    log.info("[{}] Creating order for customer {}", 
                        correlationId, signal.get().getCustomerId());
                }
            })
            .flatMap(orderRepository::save)
            .doOnEach(signal -> {
                if (signal.hasValue()) {
                    String correlationId = signal.getContextView()
                        .getOrDefault("correlationId", "unknown").toString();
                    log.info("[{}] Order {} created", 
                        correlationId, signal.get().getId());
                }
                if (signal.hasError()) {
                    String correlationId = signal.getContextView()
                        .getOrDefault("correlationId", "unknown").toString();
                    log.error("[{}] Order creation failed", 
                        correlationId, signal.getThrowable());
                }
            });
    }
}
```

## Custom Metrics with Micrometer

### Metrics Configuration

```java
@Configuration
public class MetricsConfig {

    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags(
            @Value("${spring.application.name}") String appName) {
        return registry -> registry.config()
            .commonTags(
                "application", appName,
                "environment", "${spring.profiles.active:default}"
            );
    }
    
    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }
}
```

### Custom Metrics Service

```java
@Service
@RequiredArgsConstructor
public class OrderMetricsService {

    private final MeterRegistry meterRegistry;
    private Counter orderCreatedCounter;
    private Timer orderProcessingTimer;
    private DistributionSummary orderValueSummary;
    
    @PostConstruct
    public void init() {
        orderCreatedCounter = Counter.builder("orders.created.total")
            .description("Total orders created")
            .register(meterRegistry);
            
        orderProcessingTimer = Timer.builder("orders.processing.duration")
            .description("Order processing time")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(meterRegistry);
            
        orderValueSummary = DistributionSummary.builder("orders.value")
            .description("Order value distribution")
            .publishPercentiles(0.5, 0.75, 0.95)
            .baseUnit("dollars")
            .register(meterRegistry);
    }
    
    public void recordOrderCreated(Order order) {
        orderCreatedCounter.increment();
        orderValueSummary.record(order.getTotalAmount().doubleValue());
        
        // With tags for detailed breakdown
        meterRegistry.counter("orders.created.by.status",
            "status", order.getStatus().name())
            .increment();
    }
    
    public <T> T timeOrderProcessing(Supplier<T> operation) {
        return orderProcessingTimer.record(operation);
    }
}
```

### Annotation-Based Metrics

```java
@Service
public class OrderService {

    @Timed(value = "orders.create.time", 
           percentiles = {0.5, 0.95, 0.99})
    @Counted(value = "orders.create.count")
    public Order createOrder(Order order) {
        // Method automatically timed and counted
        return orderRepository.save(order);
    }
}
```

## Reactive Metrics

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderMetricsService {

    private final MeterRegistry meterRegistry;
    
    public <T> Mono<T> recordOrderCreated(Mono<T> orderMono) {
        return orderMono.doOnSuccess(result -> {
            meterRegistry.counter("orders.created.total").increment();
            if (result instanceof Order order) {
                meterRegistry.summary("orders.value")
                    .record(order.getTotalAmount().doubleValue());
            }
        });
    }
    
    public <T> Mono<T> timeOperation(Mono<T> mono, String metricName) {
        return Mono.defer(() -> {
            Timer.Sample sample = Timer.start(meterRegistry);
            return mono.doOnTerminate(() -> 
                sample.stop(meterRegistry.timer(metricName)));
        });
    }
}
```

## Distributed Tracing

### Dependencies

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-zipkin</artifactId>
</dependency>
```

### Configuration

```yaml
management:
  tracing:
    sampling:
      probability: 1.0  # 100% in dev, lower in prod
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

### Custom Spans

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final Tracer tracer;
    
    public Order processOrder(UUID orderId) {
        Span span = tracer.nextSpan()
            .name("process-order")
            .tag("orderId", orderId.toString())
            .start();
            
        try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
            
            span.tag("customerId", order.getCustomerId().toString());
            span.event("order-found");
            
            // Process order...
            
            span.event("order-processed");
            return order;
        } catch (Exception e) {
            span.error(e);
            throw e;
        } finally {
            span.end();
        }
    }
}
```

## WebClient Instrumentation

```java
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder
            .filter((request, next) -> {
                // Correlation ID propagation
                String correlationId = MDC.get("correlationId");
                if (correlationId != null) {
                    return next.exchange(
                        ClientRequest.from(request)
                            .header("X-Request-ID", correlationId)
                            .build()
                    );
                }
                return next.exchange(request);
            })
            .build();
    }
}
```

## Kubernetes Probes Configuration

```yaml
# deployment.yaml
spec:
  containers:
  - name: order-service
    livenessProbe:
      httpGet:
        path: /actuator/health/liveness
        port: 8080
      initialDelaySeconds: 60
      periodSeconds: 10
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /actuator/health/readiness
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
      failureThreshold: 3
```

## Prometheus Alert Rules

```yaml
# alert-rules.yml
groups:
- name: order-service
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) /
      sum(rate(http_server_requests_seconds_count[5m])) > 0.05
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "High HTTP error rate"
      
  - alert: SlowResponses
    expr: |
      histogram_quantile(0.95, 
        sum(rate(http_server_requests_seconds_bucket[5m])) by (le)
      ) > 0.5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Slow API responses"
```

## Key Classes Summary

| Class | Purpose |
|-------|---------|
| `HealthIndicator` | Custom imperative health checks |
| `ReactiveHealthIndicator` | Custom reactive health checks |
| `MeterRegistry` | Metrics registration |
| `Timer` | Latency metrics |
| `Counter` | Count metrics |
| `DistributionSummary` | Value distribution |
| `Tracer` | Distributed tracing |
| `MDC` | Logging context (imperative) |
