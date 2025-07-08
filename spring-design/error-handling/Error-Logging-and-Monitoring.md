# Error Logging and Monitoring

## Overview

This document outlines best practices for logging and monitoring errors in Spring Boot applications. Proper error logging and monitoring are essential for maintaining application health and diagnosing issues in production environments.

## Logging Best Practices

### Structured Logging

Use structured logging for better searchability and analysis:

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

Use appropriate log levels for different types of errors:

| Level | Usage | Examples |
|-------|-------|----------|
| **ERROR** | Errors that need immediate attention | Unhandled exceptions, database connection failures, external service failures |
| **WARN** | Potential issues that don't prevent operation | Business rule violations, deprecated API usage, configuration warnings |
| **INFO** | Significant events in normal operation | User not found, validation failures, successful operations |
| **DEBUG** | Detailed information for troubleshooting | Request/response details, intermediate processing steps |
| **TRACE** | Most detailed information (rarely used) | Fine-grained execution flow, variable values |

### Logging Configuration

Configure logging levels and patterns:

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

Use MDC to include request information in logs:

### MDC Filter for Servlet Applications

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

### MDC WebFilter for Reactive Applications

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

### Basic Error Metrics

Register error metrics with Micrometer:

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

Create custom metrics for business-specific errors:

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

For reactive applications, use reactive metrics:

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

Create custom health indicators for error monitoring:

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

Configure alerting based on error metrics:

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

Use JSON logging for better log aggregation:

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

Create correlation IDs for tracing errors across services:

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

Example Grafana dashboard queries for error monitoring:

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

Create a custom error dashboard using Spring Boot Actuator:

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

1. **Structured Logging**: Use structured logging formats (JSON) for better analysis
2. **Appropriate Log Levels**: Use correct log levels for different types of errors
3. **Request Correlation**: Include request IDs and correlation IDs in all logs
4. **Error Metrics**: Collect comprehensive error metrics for monitoring
5. **Health Checks**: Implement custom health indicators for error monitoring
6. **Alert Configuration**: Set up alerts based on error rates and patterns
7. **Log Retention**: Configure appropriate log retention policies
8. **Security**: Sanitize logs to avoid logging sensitive information

## Security Considerations

### Sanitizing Logs

Avoid logging sensitive information:

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

Implement proper access control for logs:

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

- [Exception Hierarchy](./Exception-Hierarchy.md) - Exception classes and inheritance
- [Error Response Formats](./Error-Response-Formats.md) - RFC 7807 and response structures
- [Imperative Error Handling](./Imperative-Error-Handling.md) - Spring MVC global exception handlers
- [Reactive Error Handling](./Reactive-Error-Handling.md) - WebFlux error handling patterns
- [Validation Standards](./Validation-Standards.md) - Bean validation and custom validators