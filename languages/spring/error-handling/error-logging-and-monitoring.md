# Error Logging and Monitoring

## Overview

This guide outlines best practices for logging and monitoring errors in Spring Boot applications. Proper error logging and monitoring help you maintain application health. They also enable rapid diagnosis of production issues.

## Logging Best Practices

### Structured Logging

Structured logging formats error data consistently. Tools can parse and analyze logs automatically. Use structured logging to correlate error details with request context.

```java
@ExceptionHandler(ResourceNotFoundException.class)
public ResponseEntity<Object> handleResourceNotFoundException(
        ResourceNotFoundException ex, WebRequest request) {
    
    log.info("Resource not found: type={}, identifier={}, message={}",
        ex.getArgs()[0], ex.getArgs()[1], ex.getMessage());
    
    // Handle exception
    return buildErrorResponse(ex);
}

@ExceptionHandler(ValidationException.class)
public ResponseEntity<Object> handleValidationException(
        ValidationException ex, WebRequest request) {
    
    log.info("Validation error: errorCount={}, fields={}, message={}",
        ex.getErrors().size(),
        ex.getErrors().stream().map(ValidationError::getField).collect(Collectors.joining(", ")),
        ex.getMessage());
    
    // Handle exception
    return buildErrorResponse(ex);
}
```

### Log Levels

Use appropriate log levels for different errors. This enables you to filter logs by severity and locate important messages efficiently.

| Level | Purpose | When to Use |
|-------|---------|------------|
| **ERROR** | Critical system failures | Unhandled exceptions, connection failures |
| **WARN** | Non-critical problems | Business logic violations, deprecated code |
| **INFO** | Significant application events | Validation failures, successful operations |
| **DEBUG** | Detailed diagnostic information | Request/response details, processing steps |
| **TRACE** | Very granular diagnostic data | Method execution flow, variable values |

### Logging Configuration

Configure where logs are written and what they contain. Specify different log levels for each package in your application.

```yaml
logging:
  level:
    com.example: INFO
    com.example.common.api.GlobalExceptionHandler: DEBUG
    org.springframework.web: DEBUG
    org.springframework.security: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level [%X{requestId}] %logger{36} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level [%X{requestId}] %logger{36} - %msg%n"
  file:
    name: logs/application.log
    max-size: 10MB
    max-history: 30
```

## Mapped Diagnostic Context (MDC)

MDC enables you to attach request context to all log messages. This helps you trace a single request through your entire system.

### MDC Filter for Servlet Applications (Spring MVC)

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter implements Filter {

    @Override
    public void doFilter(
            ServletRequest request, 
            ServletResponse response, 
            FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        String requestId = httpRequest.getHeader("X-Request-ID");
        if (requestId == null) {
            requestId = UUID.randomUUID().toString();
        }
        
        MDC.put("requestId", requestId);
        MDC.put("method", httpRequest.getMethod());
        MDC.put("path", httpRequest.getRequestURI());
        MDC.put("remoteAddress", httpRequest.getRemoteAddr());
        MDC.put("userAgent", httpRequest.getHeader("User-Agent"));
        
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

### MDC WebFilter for Reactive Applications (Spring WebFlux)

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public class ReactiveRequestLoggingFilter implements WebFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        
        String requestId = request.getHeaders().getFirst("X-Request-ID");
        if (requestId == null) {
            requestId = UUID.randomUUID().toString();
        }
        
        return chain.filter(exchange)
            .contextWrite(Context.of(
                "requestId", requestId,
                "method", request.getMethod().name(),
                "path", request.getPath().value(),
                "remoteAddress", request.getRemoteAddress() != null ? 
                    request.getRemoteAddress().getAddress().getHostAddress() : "unknown"
            ))
            .doOnEach(ReactiveRequestLoggingFilter::logWithContext);
    }
    
    private static <T> void logWithContext(Signal<T> signal) {
        if (signal.isOnNext() || signal.isOnError()) {
            Context context = signal.getContextView();
            try {
                MDC.put("requestId", context.get("requestId"));
                MDC.put("method", context.get("method"));
                MDC.put("path", context.get("path"));
                MDC.put("remoteAddress", context.get("remoteAddress"));
                
                // Logging happens here through the signal processing
                
            } finally {
                MDC.clear();
            }
        }
    }
}
```

## Error Metrics with Micrometer

Micrometer collects quantitative measurements from your application. Use counters to measure error frequency. Use timers to track error resolution time.

### Basic Error Metrics

Register error counters in your exception handler to measure error occurrence:

```java
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {
    
    private final MeterRegistry meterRegistry;
    private final RequestIdProvider requestIdProvider;
    private final ErrorResponseBuilder errorResponseBuilder;
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleException(Exception ex, WebRequest request) {
        // Record basic error metric
        meterRegistry.counter("application.errors", 
                "exception", ex.getClass().getSimpleName(),
                "path", getCurrentRequestPath())
            .increment();
        
        // Record error with additional tags
        recordErrorDetails(ex);
        
        log.error("Unhandled exception", ex);
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "internal-error",
            "Internal Server Error",
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "An unexpected error occurred",
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
    
    private void recordErrorDetails(Exception ex) {
        // Record error count by type
        meterRegistry.counter("errors.by.type", 
                "type", ex.getClass().getSimpleName())
            .increment();
        
        // Record error count by HTTP status
        int statusCode = determineStatusCode(ex);
        meterRegistry.counter("errors.by.status", 
                "status", String.valueOf(statusCode))
            .increment();
        
        // Record error gauge for current errors
        meterRegistry.gauge("errors.current", 
                Tags.of("type", ex.getClass().getSimpleName()), 
                1.0);
    }
    
    private String getCurrentRequestPath() {
        return Optional.ofNullable(RequestContextHolder.getRequestAttributes())
            .filter(ServletRequestAttributes.class::isInstance)
            .map(ServletRequestAttributes.class::cast)
            .map(ServletRequestAttributes::getRequest)
            .map(HttpServletRequest::getRequestURI)
            .orElse("unknown");
    }
}
```

### Custom Error Metrics

Build custom counters for business-specific errors. Track validation errors separately from business rule violations.

```java
@Component
@RequiredArgsConstructor
public class ErrorMetricsCollector {
    
    private final MeterRegistry meterRegistry;
    private final Counter validationErrorCounter;
    private final Counter businessErrorCounter;
    private final Timer errorResolutionTimer;
    
    public ErrorMetricsCollector(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.validationErrorCounter = Counter.builder("validation.errors")
            .description("Number of validation errors")
            .register(meterRegistry);
        this.businessErrorCounter = Counter.builder("business.errors")
            .description("Number of business rule violations")
            .register(meterRegistry);
        this.errorResolutionTimer = Timer.builder("error.resolution.time")
            .description("Time taken to resolve errors")
            .register(meterRegistry);
    }
    
    public void recordValidationError(String field, String errorCode) {
        validationErrorCounter.increment(
            Tags.of("field", field, "code", errorCode)
        );
    }
    
    public void recordBusinessError(String domain, String errorCode) {
        businessErrorCounter.increment(
            Tags.of("domain", domain, "code", errorCode)
        );
    }
    
    public Timer.Sample startErrorResolutionTimer() {
        return Timer.start(meterRegistry);
    }
    
    public void recordErrorResolution(Timer.Sample sample, String errorType) {
        sample.stop(Timer.builder("error.resolution.time")
            .tag("type", errorType)
            .register(meterRegistry));
    }
}
```

### Reactive Error Metrics

In Spring WebFlux applications, record metrics in reactive operator chains using doOnError and doOnSuccess callbacks:

```java
@Component
@RequiredArgsConstructor
public class ReactiveErrorMetrics {
    
    private final MeterRegistry meterRegistry;
    
    public <T> Mono<T> recordErrorMetrics(Mono<T> mono, String operationName) {
        return mono
            .doOnError(error -> recordError(error, operationName))
            .doOnSuccess(result -> recordSuccess(operationName))
            .onErrorResume(error -> {
                recordError(error, operationName);
                return Mono.error(error);
            });
    }
    
    public <T> Flux<T> recordErrorMetrics(Flux<T> flux, String operationName) {
        return flux
            .doOnError(error -> recordError(error, operationName))
            .doOnComplete(() -> recordSuccess(operationName))
            .onErrorResume(error -> {
                recordError(error, operationName);
                return Flux.error(error);
            });
    }
    
    private void recordError(Throwable error, String operationName) {
        meterRegistry.counter("reactive.errors",
                "operation", operationName,
                "exception", error.getClass().getSimpleName())
            .increment();
    }
    
    private void recordSuccess(String operationName) {
        meterRegistry.counter("reactive.success",
                "operation", operationName)
            .increment();
    }
}
```

## Health Checks and Monitoring

### Custom Health Indicators

Build custom health indicators that monitor application error rates. Report unhealthy status when error percentages exceed a configured threshold.

```java
@Component
public class ErrorRateHealthIndicator implements HealthIndicator {
    
    private final MeterRegistry meterRegistry;
    private final double errorThreshold = 0.1; // 10% error rate threshold
    
    public ErrorRateHealthIndicator(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    @Override
    public Health health() {
        double errorRate = calculateErrorRate();
        
        if (errorRate > errorThreshold) {
            return Health.down()
                .withDetail("errorRate", errorRate)
                .withDetail("threshold", errorThreshold)
                .withDetail("status", "Error rate exceeds threshold")
                .build();
        }
        
        return Health.up()
            .withDetail("errorRate", errorRate)
            .withDetail("threshold", errorThreshold)
            .build();
    }
    
    private double calculateErrorRate() {
        try {
            Counter errorCounter = meterRegistry.find("application.errors").counter();
            Counter totalCounter = meterRegistry.find("http.server.requests").counter();
            
            if (errorCounter == null || totalCounter == null) {
                return 0.0;
            }
            
            double errors = errorCounter.count();
            double total = totalCounter.count();
            
            return total > 0 ? errors / total : 0.0;
        } catch (Exception e) {
            return 0.0;
        }
    }
}
```

### Error Alerting Configuration

Expose metrics through an HTTP endpoint. Configure Prometheus to scrape your metrics endpoint regularly.

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  endpoint:
    health:
      show-details: always
      show-components: always
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active}
```

## Log Analysis and Aggregation

### Structured Log Format

Output logs in JSON format so that aggregation tools can parse logs automatically. This capability enables efficient searching and analysis of error patterns.

```xml
<!-- logback-spring.xml -->
<configuration>
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
            <providers>
                <timestamp/>
                <logLevel/>
                <loggerName/>
                <mdc/>
                <message/>
                <stackTrace/>
            </providers>
        </encoder>
    </appender>
    
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/application.log</file>
        <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
            <providers>
                <timestamp/>
                <logLevel/>
                <loggerName/>
                <mdc/>
                <message/>
                <stackTrace/>
            </providers>
        </encoder>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/application.%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
    </appender>
    
    <root level="INFO">
        <appender-ref ref="STDOUT"/>
        <appender-ref ref="FILE"/>
    </root>
</configuration>
```

### Log Correlation

Attach correlation IDs to all log messages in your system. These IDs enable you to trace a single request through multiple services.

```java
@Component
public class CorrelationIdFilter implements Filter {
    
    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    private static final String CORRELATION_ID_MDC_KEY = "correlationId";
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String correlationId = httpRequest.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
        }
        
        MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
        httpResponse.setHeader(CORRELATION_ID_HEADER, correlationId);
        
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(CORRELATION_ID_MDC_KEY);
        }
    }
}
```

## Error Dashboards and Visualization

### Grafana Dashboard Configuration

Grafana visualizes time-series metrics from Prometheus. Create panels to display error rates, distribution by type, and historical trends.

```yaml
# Error Rate Panel
- title: "Error Rate"
  type: "stat"
  targets:
    - expr: "rate(application_errors_total[5m])"
      legendFormat: "Error Rate"
  
# Errors by Type
- title: "Errors by Type"
  type: "piechart"
  targets:
    - expr: "sum by (exception) (application_errors_total)"
      legendFormat: "{{exception}}"

# Error Timeline
- title: "Error Timeline"
  type: "timeseries"
  targets:
    - expr: "rate(application_errors_total[1m])"
      legendFormat: "{{exception}}"
```

### Custom Error Dashboard

Create a custom error dashboard with a REST endpoint. Use Actuator to retrieve metrics data and compute summaries.

```java
@RestController
@RequestMapping("/admin/errors")
@RequiredArgsConstructor
public class ErrorDashboardController {
    
    private final MeterRegistry meterRegistry;
    
    @GetMapping("/summary")
    public ResponseEntity<ErrorSummary> getErrorSummary() {
        ErrorSummary summary = ErrorSummary.builder()
            .totalErrors(getTotalErrors())
            .errorRate(getErrorRate())
            .topErrors(getTopErrors())
            .errorsByStatus(getErrorsByStatus())
            .build();
        
        return ResponseEntity.ok(summary);
    }
    
    private long getTotalErrors() {
        return meterRegistry.find("application.errors")
            .counter()
            .map(counter -> (long) counter.count())
            .orElse(0L);
    }
    
    private double getErrorRate() {
        // Calculate error rate logic
        return 0.0;
    }
    
    private List<ErrorTypeCount> getTopErrors() {
        // Get top error types
        return List.of();
    }
    
    private Map<String, Long> getErrorsByStatus() {
        // Get errors grouped by HTTP status
        return Map.of();
    }
}
```

## Best Practices

1. **Use structured logging**: Output logs in JSON for automated parsing and searching
2. **Use appropriate log levels**: Select ERROR, WARN, and INFO based on severity
3. **Include correlation IDs**: Attach unique IDs to all log messages for tracing
4. **Collect error metrics**: Record error frequency by exception type and status
5. **Monitor system health**: Use health indicators to detect problems early
6. **Configure alerting**: Define thresholds for error spikes and send notifications
7. **Retain logs long enough**: Keep logs for at least 30-90 days for analysis
8. **Protect sensitive data**: Exclude passwords, tokens, and credentials from logs

## Security Considerations

### Sanitizing Logs

Never log passwords, tokens, or API keys. Remove sensitive data before output to protect user information.

```java
@Component
public class LogSanitizer {
    
    private static final List<String> SENSITIVE_FIELDS = List.of(
        "password", "token", "secret", "key", "authorization"
    );
    
    public String sanitizeMessage(String message) {
        if (message == null) {
            return null;
        }
        
        String sanitized = message;
        for (String field : SENSITIVE_FIELDS) {
            sanitized = sanitized.replaceAll(
                "(?i)" + field + "=\\w+", 
                field + "=***"
            );
        }
        
        return sanitized;
    }
    
    public Map<String, Object> sanitizeContext(Map<String, Object> context) {
        return context.entrySet().stream()
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                entry -> SENSITIVE_FIELDS.contains(entry.getKey().toLowerCase()) ? 
                    "***" : entry.getValue()
            ));
    }
}
```

### Log Access Control

Restrict log access using role-based controls. Use authorization annotations to prevent unauthorized viewing.

```java
@RestController
@RequestMapping("/admin/logs")
@PreAuthorize("hasRole('ADMIN')")
public class LogAccessController {
    
    @GetMapping("/errors")
    @PreAuthorize("hasAuthority('LOG_READ')")
    public ResponseEntity<List<String>> getErrorLogs(
            @RequestParam(defaultValue = "100") int limit) {
        // Return sanitized error logs
        return ResponseEntity.ok(getRecentErrorLogs(limit));
    }
}
```

## Related Documentation

- [Exception Hierarchy](./exception-hierarchy.md) - Exception classes and inheritance
- [Error Response Formats](./error-response-formats.md) - RFC 9457 and response structures
- [Imperative Error Handling](./imperative-error-handling.md) - Spring MVC global exception handlers
- [Reactive Error Handling](./reactive-error-handling.md) - WebFlux error handling patterns
- [Validation Standards](./validation-standards.md) - Bean validation and custom validators