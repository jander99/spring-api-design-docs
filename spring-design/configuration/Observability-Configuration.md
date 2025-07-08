# Observability Configuration

## Overview

This document outlines observability configuration patterns for Spring Boot microservices, covering metrics collection, distributed tracing, health checks, and monitoring setup using Micrometer, Spring Boot Actuator, and OpenTelemetry.

## Observability Properties

### Observability Configuration Structure

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: ${ACTUATOR_ENDPOINTS:health,info,metrics,prometheus}
      base-path: ${ACTUATOR_BASE_PATH:/actuator}
  
  endpoint:
    health:
      show-details: ${HEALTH_SHOW_DETAILS:when_authorized}
      show-components: ${HEALTH_SHOW_COMPONENTS:when_authorized}
      probes:
        enabled: ${HEALTH_PROBES_ENABLED:true}
    metrics:
      enabled: ${METRICS_ENABLED:true}
    prometheus:
      enabled: ${PROMETHEUS_ENABLED:true}
  
  metrics:
    export:
      prometheus:
        enabled: ${PROMETHEUS_EXPORT_ENABLED:true}
        step: ${PROMETHEUS_STEP:PT1M}
      simple:
        enabled: ${SIMPLE_METRICS_ENABLED:false}
    distribution:
      percentiles-histogram:
        http.server.requests: ${HTTP_PERCENTILES_HISTOGRAM:true}
      percentiles:
        http.server.requests: ${HTTP_PERCENTILES:0.5,0.9,0.95,0.99}
      slo:
        http.server.requests: ${HTTP_SLO:50ms,100ms,200ms,300ms,500ms,1s,2s}

# Observability application properties
app:
  observability:
    tracing:
      enabled: ${TRACING_ENABLED:true}
      sampling-rate: ${TRACING_SAMPLING_RATE:0.1}
      jaeger:
        endpoint: ${JAEGER_ENDPOINT:http://localhost:14268/api/traces}
    metrics:
      custom-tags:
        service: ${SERVICE_NAME:order-service}
        version: ${SERVICE_VERSION:1.0.0}
        environment: ${ENVIRONMENT:development}
```

### Observability Properties Class

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import java.util.Map;

@ConfigurationProperties(prefix = "app.observability")
@Validated
public record ObservabilityProperties(
    @Valid @NotNull Tracing tracing,
    @Valid @NotNull Metrics metrics
) {
    
    public record Tracing(
        boolean enabled,
        @DecimalMin("0.0") @DecimalMax("1.0") double samplingRate,
        @Valid @NotNull Jaeger jaeger
    ) {
        
        public record Jaeger(
            @NotBlank String endpoint
        ) {}
    }
    
    public record Metrics(
        @NotNull Map<String, String> customTags
    ) {}
}
```

## Metrics Configuration

### Micrometer Configuration

```java
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.config.MeterFilter;
import org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MetricsConfig {

    private final ObservabilityProperties observabilityProperties;

    public MetricsConfig(ObservabilityProperties observabilityProperties) {
        this.observabilityProperties = observabilityProperties;
    }

    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> {
            Map<String, String> customTags = observabilityProperties.metrics().customTags();
            
            registry.config()
                .commonTags(customTags.entrySet().stream()
                    .flatMap(entry -> Stream.of(entry.getKey(), entry.getValue()))
                    .toArray(String[]::new))
                .meterFilter(MeterFilter.deny(id -> 
                    id.getName().startsWith("jvm.gc.pause")))
                .meterFilter(MeterFilter.deny(id -> 
                    id.getName().startsWith("jvm.memory.committed")))
                .meterFilter(MeterFilter.deny(id -> 
                    id.getName().startsWith("system.cpu.count")));
        };
    }
}
```

### Custom Metrics Configuration

```java
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.atomic.AtomicInteger;

@Configuration
public class CustomMetricsConfig {

    @Bean
    public Counter orderCreatedCounter(MeterRegistry meterRegistry) {
        return Counter.builder("orders.created")
            .description("Number of orders created")
            .tag("type", "business")
            .register(meterRegistry);
    }

    @Bean
    public Timer orderProcessingTimer(MeterRegistry meterRegistry) {
        return Timer.builder("orders.processing.duration")
            .description("Order processing duration")
            .tag("operation", "process")
            .register(meterRegistry);
    }

    @Bean
    public AtomicInteger activeOrdersGauge(MeterRegistry meterRegistry) {
        AtomicInteger activeOrders = new AtomicInteger(0);
        
        Gauge.builder("orders.active")
            .description("Number of active orders")
            .tag("status", "active")
            .register(meterRegistry, activeOrders, AtomicInteger::get);
            
        return activeOrders;
    }
}
```

## Distributed Tracing Configuration

### OpenTelemetry Configuration

```java
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.exporter.jaeger.JaegerGrpcSpanExporter;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.sdk.trace.samplers.Sampler;
import io.opentelemetry.semconv.resource.attributes.ResourceAttributes;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "app.observability.tracing.enabled", havingValue = "true")
public class TracingConfig {

    private final ObservabilityProperties observabilityProperties;

    public TracingConfig(ObservabilityProperties observabilityProperties) {
        this.observabilityProperties = observabilityProperties;
    }

    @Bean
    public OpenTelemetry openTelemetry() {
        Resource resource = Resource.getDefault()
            .merge(Resource.create(Attributes.of(
                ResourceAttributes.SERVICE_NAME, 
                observabilityProperties.metrics().customTags().get("service"),
                ResourceAttributes.SERVICE_VERSION,
                observabilityProperties.metrics().customTags().get("version")
            )));

        JaegerGrpcSpanExporter jaegerExporter = JaegerGrpcSpanExporter.builder()
            .setEndpoint(observabilityProperties.tracing().jaeger().endpoint())
            .build();

        SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
            .addSpanProcessor(BatchSpanProcessor.builder(jaegerExporter).build())
            .setResource(resource)
            .setSampler(Sampler.traceIdRatioBased(
                observabilityProperties.tracing().samplingRate()))
            .build();

        return OpenTelemetrySdk.builder()
            .setTracerProvider(tracerProvider)
            .build();
    }

    @Bean
    public Tracer tracer(OpenTelemetry openTelemetry) {
        return openTelemetry.getTracer(
            observabilityProperties.metrics().customTags().get("service"));
    }
}
```

### Spring Cloud Sleuth Configuration

```java
import brave.sampler.Sampler;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "app.observability.tracing.enabled", havingValue = "true")
public class SleuthConfig {

    private final ObservabilityProperties observabilityProperties;

    public SleuthConfig(ObservabilityProperties observabilityProperties) {
        this.observabilityProperties = observabilityProperties;
    }

    @Bean
    public Sampler alwaysSampler() {
        return Sampler.create((float) observabilityProperties.tracing().samplingRate());
    }
}
```

## Health Check Configuration

### Custom Health Indicators

```java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final OrderRepository orderRepository;

    public DatabaseHealthIndicator(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    public Health health() {
        try {
            long orderCount = orderRepository.count().block(Duration.ofSeconds(5));
            
            return Health.up()
                .withDetail("database", "Available")
                .withDetail("orders.count", orderCount)
                .withDetail("connection.pool", getConnectionPoolStatus())
                .build();
        } catch (Exception ex) {
            return Health.down(ex)
                .withDetail("database", "Unavailable")
                .withDetail("error", ex.getMessage())
                .build();
        }
    }

    private String getConnectionPoolStatus() {
        // Implementation to check connection pool status
        return "healthy";
    }
}
```

### Reactive Health Indicators

```java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.ReactiveHealthIndicator;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class ExternalServiceHealthIndicator implements ReactiveHealthIndicator {

    private final PaymentServiceClient paymentServiceClient;

    public ExternalServiceHealthIndicator(PaymentServiceClient paymentServiceClient) {
        this.paymentServiceClient = paymentServiceClient;
    }

    @Override
    public Mono<Health> health() {
        return paymentServiceClient.healthCheck()
            .map(response -> Health.up()
                .withDetail("payment-service", "Available")
                .withDetail("response-time", response.getResponseTime())
                .build())
            .onErrorReturn(Health.down()
                .withDetail("payment-service", "Unavailable")
                .build())
            .timeout(Duration.ofSeconds(5));
    }
}
```

## Actuator Configuration

### Security Configuration for Actuator

```java
import org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class ActuatorSecurityConfig {

    @Bean
    public SecurityFilterChain actuatorSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
            .requestMatcher(EndpointRequest.toAnyEndpoint())
            .authorizeHttpRequests(authz -> authz
                .requestMatchers(EndpointRequest.to("health", "info")).permitAll()
                .requestMatchers(EndpointRequest.to("prometheus")).hasRole("METRICS")
                .anyRequest().hasRole("ADMIN")
            )
            .httpBasic(Customizer.withDefaults())
            .build();
    }
}
```

### Custom Actuator Endpoints

```java
import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Endpoint(id = "business-metrics")
public class BusinessMetricsEndpoint {

    private final OrderService orderService;
    private final PaymentService paymentService;

    public BusinessMetricsEndpoint(OrderService orderService, PaymentService paymentService) {
        this.orderService = orderService;
        this.paymentService = paymentService;
    }

    @ReadOperation
    public Map<String, Object> businessMetrics() {
        return Map.of(
            "orders", Map.of(
                "total", orderService.getTotalOrderCount(),
                "pending", orderService.getPendingOrderCount(),
                "completed", orderService.getCompletedOrderCount()
            ),
            "payments", Map.of(
                "total", paymentService.getTotalPaymentAmount(),
                "successful", paymentService.getSuccessfulPaymentCount(),
                "failed", paymentService.getFailedPaymentCount()
            ),
            "timestamp", System.currentTimeMillis()
        );
    }
}
```

## Logging Configuration

### Structured Logging Configuration

```yaml
# application.yml
logging:
  level:
    com.example.orderservice: ${LOG_LEVEL:INFO}
    org.springframework.web: ${WEB_LOG_LEVEL:WARN}
    org.springframework.security: ${SECURITY_LOG_LEVEL:WARN}
    org.hibernate.SQL: ${SQL_LOG_LEVEL:WARN}
    
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} [%X{traceId:-},%X{spanId:-}] - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} [%X{traceId:-},%X{spanId:-}] - %msg%n"
    
  file:
    name: ${LOG_FILE:/var/log/order-service.log}
    max-size: ${LOG_FILE_MAX_SIZE:100MB}
    max-history: ${LOG_FILE_MAX_HISTORY:30}
```

### Logback Configuration

```xml
<!-- logback-spring.xml -->
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    
    <springProfile name="!production">
        <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>
    
    <springProfile name="production">
        <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>/var/log/order-service.log</file>
            <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <fileNamePattern>/var/log/order-service.%d{yyyy-MM-dd}.%i.gz</fileNamePattern>
                <maxFileSize>100MB</maxFileSize>
                <maxHistory>30</maxHistory>
                <totalSizeCap>3GB</totalSizeCap>
            </rollingPolicy>
            <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
                <providers>
                    <timestamp/>
                    <logLevel/>
                    <loggerName/>
                    <mdc/>
                    <arguments/>
                    <message/>
                    <stackTrace/>
                </providers>
            </encoder>
        </appender>
        
        <root level="INFO">
            <appender-ref ref="FILE"/>
        </root>
    </springProfile>
</configuration>
```

## Monitoring Alerts Configuration

### Micrometer Alert Configuration

```java
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.MeterBinder;
import org.springframework.stereotype.Component;

@Component
public class AlertMetrics implements MeterBinder {

    private final OrderService orderService;

    public AlertMetrics(OrderService orderService) {
        this.orderService = orderService;
    }

    @Override
    public void bindTo(MeterRegistry registry) {
        // Error rate gauge
        Gauge.builder("orders.error.rate")
            .description("Order processing error rate")
            .register(registry, this, AlertMetrics::getErrorRate);

        // Response time gauge
        Gauge.builder("orders.response.time.p99")
            .description("99th percentile response time")
            .register(registry, this, AlertMetrics::getP99ResponseTime);

        // Queue depth gauge
        Gauge.builder("orders.queue.depth")
            .description("Order processing queue depth")
            .register(registry, this, AlertMetrics::getQueueDepth);
    }

    private double getErrorRate(AlertMetrics metrics) {
        return orderService.getErrorRate();
    }

    private double getP99ResponseTime(AlertMetrics metrics) {
        return orderService.getP99ResponseTime();
    }

    private double getQueueDepth(AlertMetrics metrics) {
        return orderService.getQueueDepth();
    }
}
```

## Observability Configuration by Environment

### Development Configuration

```yaml
# application-development.yml
management:
  endpoints:
    web:
      exposure:
        include: "*"
  endpoint:
    health:
      show-details: always
      show-components: always

app:
  observability:
    tracing:
      enabled: true
      sampling-rate: 1.0
      jaeger:
        endpoint: http://localhost:14268/api/traces
    metrics:
      custom-tags:
        service: order-service
        version: dev
        environment: development

logging:
  level:
    com.example.orderservice: DEBUG
    org.springframework.web: DEBUG
```

### Production Configuration

```yaml
# application-production.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: never
      show-components: never

app:
  observability:
    tracing:
      enabled: true
      sampling-rate: 0.1
      jaeger:
        endpoint: ${JAEGER_ENDPOINT}
    metrics:
      custom-tags:
        service: order-service
        version: ${SERVICE_VERSION}
        environment: production

logging:
  level:
    com.example.orderservice: INFO
    org.springframework: WARN
  file:
    name: /var/log/order-service.log
```

## Observability Testing

### Metrics Testing

```java
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@SpringBootTest
class MetricsIntegrationTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        public MeterRegistry testMeterRegistry() {
            return new SimpleMeterRegistry();
        }
    }

    @Test
    void shouldRecordOrderCreatedMetric(MeterRegistry meterRegistry) {
        // Test metric recording
        double countBefore = meterRegistry.counter("orders.created").count();
        
        // Perform action that should increment metric
        orderService.createOrder(createOrderRequest());
        
        double countAfter = meterRegistry.counter("orders.created").count();
        assertThat(countAfter).isEqualTo(countBefore + 1);
    }
}
```

### Health Check Testing

```java
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ActuatorIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldReturnHealthUp() {
        ResponseEntity<Map> response = restTemplate.getForEntity(
            "/actuator/health", Map.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("UP");
    }

    @Test
    void shouldExposePrometheusMetrics() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/actuator/prometheus", String.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("jvm_memory_used_bytes");
    }
}
```

## Observability Best Practices

### 1. Metric Naming Conventions

- Use descriptive metric names with consistent naming patterns
- Include units in metric names where appropriate
- Use tags for dimensions rather than metric name variations

### 2. Trace Sampling

- Use appropriate sampling rates for different environments
- Sample more aggressively in production to reduce overhead
- Ensure critical paths are always traced

### 3. Health Check Design

- Implement meaningful health checks that reflect actual service health
- Use appropriate timeouts for health check dependencies
- Provide detailed information in non-production environments

### 4. Alert Configuration

- Set up alerts based on business metrics, not just technical metrics
- Use appropriate thresholds and time windows
- Implement escalation policies for critical alerts

## Common Observability Anti-patterns

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Too many metrics | Performance impact | Use selective metric collection |
| No trace sampling | High overhead | Implement appropriate sampling |
| Generic health checks | Poor diagnostic value | Create specific, meaningful checks |
| No alert thresholds | Alert fatigue | Set appropriate thresholds |
| Logging everything | Storage costs | Use appropriate log levels |

## Related Documentation

- [Configuration Principles](Configuration-Principles.md) - Core configuration concepts
- [Environment Profiles](Environment-Profiles.md) - Environment-specific observability setup
- [External Services](External-Services.md) - Service monitoring and health checks
- [Logging and Monitoring](../Logging and Monitoring.md) - Detailed logging patterns

This observability configuration ensures comprehensive monitoring, tracing, and health checking for Spring Boot microservices across all environments while maintaining performance and security standards.