# Observability Configuration

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 18 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 11.8 grade level • 0.8% technical density • fairly difficult

## Overview

This guide shows you how to set up monitoring for Spring Boot services.

You will learn to configure four key areas:
- Metrics: Track system performance
- Tracing: Follow requests across services
- Health checks: Monitor service status
- Logging: Record system events

We use three main tools: Micrometer, Spring Boot Actuator, and OpenTelemetry.

## Observability Properties

### Basic Configuration

This YAML file configures your observability settings.

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

### Properties Class

This Java class reads the YAML file.
It checks that all settings are valid.

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

### Configure Micrometer

Micrometer collects metrics from your application.
This config adds custom tags to all metrics.
Tags help you filter and organize your data.

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

### Create Custom Metrics

Create three types of metrics:

**Counter**: Counts events.
Use this for orders created.

**Timer**: Tracks duration.
Use this for operation time.

**Gauge**: Shows current values.
Use this for active users or queue size.

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

### Configure OpenTelemetry

OpenTelemetry tracks requests between services.
It helps you find slow operations and errors.

The config does three things:
1. Names your service
2. Sends data to Jaeger
3. Controls sampling rate

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

### Configure Spring Cloud Sleuth

Sleuth is an alternative to OpenTelemetry.
It provides tracing for Spring apps.

This config sets the sampling rate.
This controls how many requests to trace.

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

### Create Custom Health Indicators

Health indicators check if your service is working properly.
This example checks if the database is available.

The indicator returns two states:
- UP: Database is working
- DOWN: Database has problems

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

### Create Reactive Health Indicators

Reactive health indicators do not block threads.
Use these with Spring WebFlux apps.

This example checks a payment service.
It uses Mono for reactive code.

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

### Secure Actuator Endpoints

Actuator endpoints expose sensitive system information.
You must secure them to prevent unauthorized access.

This config creates three security levels:
- Public: Health and info (no login required)
- Metrics role: Prometheus endpoint
- Admin role: All other endpoints

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

### Create Custom Endpoints

You can create custom actuator endpoints.
These endpoints expose business metrics.

This example shows order and payment statistics.
Access it at `/actuator/business-metrics`.

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

### Configure Logging Levels

Set different log levels for different parts of your application.
This controls how much detail you see in logs.

Common log levels:
- DEBUG: Very detailed information
- INFO: General informational messages
- WARN: Warning messages
- ERROR: Error messages only

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

### Configure Logback

Logback is the logging framework for Spring Boot.
Settings change based on your environment.

**Development**: Logs show in the console.

**Production**: Logs save to files.
Files rotate daily and compress.
Old files delete after 30 days.

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

### Create Alert Metrics

Alert metrics help monitoring systems detect problems.
They expose values that trigger alerts when exceeded.

This example creates three alert metrics:
- Error rate: Percentage of failed requests
- Response time: 99th percentile latency
- Queue depth: Number of pending operations

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

## Configuration by Environment

### Development Settings

Development needs detailed info for debugging.

Key differences:
- All endpoints exposed
- Full health details shown
- 100% trace sampling
- Debug logs enabled

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

### Production Settings

Production focuses on security and speed.

Key differences:
- Only key endpoints exposed
- Health details hidden
- 10% trace sampling
- Info log level

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

## Testing Observability

### Test Metrics

Check that your app records metrics correctly.
Use a test registry to avoid external tools.

This test checks that orders increment the counter.

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

### Test Health Checks

Test that health checks return the correct status.
Also verify that metrics endpoints are accessible.

These tests use TestRestTemplate to call actuator endpoints.

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

## Best Practices

### Metric Naming

Use clear and consistent metric names.

Follow these rules:
- Use descriptive names that explain what you measure
- Include units in the name (like `duration_seconds`)
- Use tags for categories (not different metric names)

### Trace Sampling

Adjust sampling rates based on your environment.

**Development**: Sample 100% of requests.
You need full visibility for debugging.

**Production**: Sample 10% or less.
This reduces performance overhead.
Always trace critical operations regardless of sampling.

### Health Check Design

Create meaningful health checks.

Good health checks:
- Test real dependencies (databases, external services)
- Use short timeouts to avoid hanging
- Return detailed info in development
- Hide details in production for security

### Alert Configuration

Base alerts on business impact.

Good alerts:
- Track business metrics (orders processed, revenue)
- Set realistic thresholds to avoid false alarms
- Define clear escalation steps
- Include context for troubleshooting

## Common Mistakes

### Avoid These Problems

**Too Many Metrics**
- Problem: Slows down your application
- Solution: Only track important metrics

**No Trace Sampling**
- Problem: High performance cost
- Solution: Sample 10% or less in production

**Generic Health Checks**
- Problem: Provides no useful information
- Solution: Check actual dependencies

**No Alert Thresholds**
- Problem: Too many false alarms
- Solution: Set realistic limits

**Logging Everything**
- Problem: High storage costs
- Solution: Use appropriate log levels (INFO or WARN)

## Related Documentation

**Configuration Basics**
- [Configuration Principles](configuration-principles.md) - Learn core configuration concepts
- [Environment Profiles](environment-profiles.md) - Set up environment-specific configs

**Service Integration**
- [External Services](external-services.md) - Monitor external service health
- [Logging and Monitoring](../observability/logging-and-monitoring.md) - Detailed logging patterns

## Summary

This guide covered observability configuration for Spring Boot services.

You learned how to:
- Configure metrics with Micrometer
- Set up distributed tracing
- Create health checks
- Secure actuator endpoints
- Configure logging
- Test your observability setup

Apply these patterns to monitor your services effectively.