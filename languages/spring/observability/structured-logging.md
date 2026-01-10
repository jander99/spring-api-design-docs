# Structured Logging in Spring Boot 3.4+

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 15 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Spring Boot 3.4+ basics, logging fundamentals  
> **🎯 Key Topics:** Structured logging, JSON formats, MDC, log aggregation
> 
> **📊 Complexity:** Grade 12-14 • Intermediate difficulty

## Introduction

Structured logging represents log data in a fixed, machine-readable format, typically JSON. Traditional logs are plain text strings, which are difficult for machines to parse and search at scale. Structured logs treat log entries as data objects with searchable fields, enabling advanced observability patterns.

### Why Use Structured Logging?

- **Searchability**: Filter logs by specific fields like `user_id`, `trace_id`, or `http.response.status_code` without complex regular expressions.
- **Aggregation**: Modern log tools like the Elastic Stack (ELK), Graylog, and Splunk process structured data more efficiently than raw text.
- **Consistency**: Standardized formats like ECS (Elastic Common Schema) ensure uniform logging across multiple microservices, regardless of the team or language.
- **Automation**: Automated monitoring tools can easily trigger alerts based on specific JSON field values, such as identifying a spike in 403 Forbidden errors.

Structured logging is essential for production microservices where log volume is high and manual inspection is no longer feasible.

## Quick Start

Spring Boot 3.4 introduced native support for structured logging. You can enable it with a single property without adding external dependencies or complex XML configuration.

Add this to your `application.yml`:

```yaml
logging:
  structured:
    format:
      console: ecs
```

Your console logs will now appear as JSON objects following the Elastic Common Schema:

```json
{
  "@timestamp": "2026-01-10T10:00:00.000Z",
  "log.level": "INFO",
  "message": "Application started",
  "service.name": "my-service",
  "process.pid": 12345,
  "process.thread.name": "main",
  "log.logger": "com.example.Application",
  "ecs.version": "8.11"
}
```

## Format Comparison

Spring Boot 3.4 supports three major structured logging formats out of the box. Choosing the right one depends on your existing infrastructure.

| Format | Best For | Field Richness | Status |
|--------|----------|----------------|--------|
| **ECS** | Elastic Stack | Very rich (60+ fields) | Recommended |
| **GELF** | Graylog | Moderate (15-20 fields) | Legacy systems |
| **Logstash** | Existing pipelines | Moderate | Declining |

### Which Format Should I Choose?

1. **ECS (Elastic Common Schema)**: This is the recommended choice for most modern applications. It is standardized by Elastic and used widely across the industry. It provides the most detailed information about the execution context.
2. **GELF (Graylog Extended Log Format)**: Choose this if your organization uses Graylog as its primary log management tool. GELF is optimized for efficient network transport.
3. **Logstash**: Choose this only if you have legacy Logstash pipelines that specifically require the older Logstash-specific JSON format (`LogstashEncoder` style).

## Configuration

You can configure structured logging for the console, files, or both. This allows you to maintain human-readable logs for local development while shipping JSON to production.

### Console and File Configuration

```yaml
logging:
  file:
    name: logs/application.log
  structured:
    format:
      console: ecs
      file: ecs
```

### Specific Format Properties

Each format allows some customization through properties. These allow you to add service-wide metadata to every log entry.

```yaml
logging:
  structured:
    ecs:
      service:
        name: order-service
        version: 1.2.0
        node-name: prod-node-01
    gelf:
      host: order-service-host
      service:
        name: order-service
```

## MDC Integration

The Mapped Diagnostic Context (MDC) allows you to add custom context to your logs dynamically. Spring Boot automatically includes MDC keys as top-level fields in structured logs.

### Adding Custom Fields via MDC

MDC is thread-local, so fields added at the start of a request will be included in all subsequent logs for that thread.

```java
import org.slf4j.MDC;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    public void processOrder(String userId, String orderId) {
        try {
            // Add custom fields to the logging context
            MDC.put("user_id", userId);
            MDC.put("order_id", orderId);
            
            logger.info("Processing order for user");
        } finally {
            // Always clear MDC to prevent context leakage between threads
            MDC.clear();
        }
    }
}
```

**Resulting JSON Output:**

```json
{
  "@timestamp": "2026-01-10T10:05:00.000Z",
  "log.level": "INFO",
  "message": "Processing order for user",
  "user_id": "user-123",
  "order_id": "ORD-456",
  "service.name": "order-service",
  "process.thread.name": "http-nio-8080-exec-1"
}
```

## Trace Correlation

When using Micrometer Tracing, Spring Boot automatically includes trace and span IDs in your structured logs. This connects your logs to distributed traces, allowing you to see the full path of a request across services.

### Automatic Trace Fields

If tracing is enabled, you will see fields like `traceId` and `spanId` automatically included in the JSON:

```json
{
  "@timestamp": "2026-01-10T10:10:00.000Z",
  "log.level": "INFO",
  "message": "Fetching user profile from database",
  "traceId": "5af71e05d9d70231",
  "spanId": "b530c0065a3952d4",
  "service.name": "user-service"
}
```

### Enabling Tracing

To enable tracing, add the Micrometer Tracing dependency and configure the sampling probability in your properties:

```yaml
management:
  tracing:
    sampling:
      probability: 1.0  # Log 100% of traces (use lower value in prod)
```

## Customization

Spring Boot provides two ways to customize the JSON output: adding global members or creating a completely custom formatter.

### Customizing JSON Members

Use a `StructuredLoggingJsonMembersCustomizer` to add global fields to every log entry, such as an environment or region tag.

```java
import org.springframework.boot.logging.structured.StructuredLoggingJsonMembersCustomizer;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
class GlobalMetadataCustomizer implements StructuredLoggingJsonMembersCustomizer<Object> {
    @Override
    public void customize(Map<String, Object> members) {
        members.put("env", "prod");
        members.put("region", "us-east-1");
    }
}
```

### Key Value Pairs (Fluent API)

SLF4J 2.0+ provides a fluent API to add one-off custom fields without using MDC. This is useful for event-specific data.

```java
logger.atInfo()
      .addKeyValue("retry_count", 3)
      .addKeyValue("upstream_status", 503)
      .setMessage("Retrying connection to upstream service")
      .log();
```

### Custom StructuredLogFormatter

If the built-in formats do not meet your needs, you can implement the `StructuredLogFormatter` interface to define your own JSON structure.

```java
import org.springframework.boot.logging.structured.StructuredLogFormatter;
import ch.qos.logback.classic.spi.ILoggingEvent;

public class MyCompanyFormatter implements StructuredLogFormatter<ILoggingEvent> {
    @Override
    public String format(ILoggingEvent event) {
        // Return a JSON string based on the event
        return "{\"my_timestamp\": \"" + event.getTimeStamp() + "\", ...}";
    }
}
```

## Profile-Based Configuration

It is a best practice to use human-readable logs during development and structured JSON logs in production. This optimizes for developer experience and machine processing respectively.

```yaml
# application.yml
logging:
  pattern:
    console: "%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"

---
spring:
  config:
    activate:
      on-profile: production
logging:
  structured:
    format:
      console: ecs
      file: ecs
```

By default, developers see clean text in their console. When the `production` profile is active, the application switches to ECS formatted JSON.

## Log Aggregator Integration

Structured logs are most valuable when shipped to a central location using a log aggregator or agent.

### Filebeat (Elastic Stack)

Filebeat is the preferred agent for ECS logs. It monitors log files and ships them to Elasticsearch or Logstash.

```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/apps/*.log
  json.keys_under_root: true
  json.add_error_key: true
  json.message_key: message
```

### Fluentd / Fluent Bit

Fluentd is a flexible log router that can parse Spring Boot's JSON output and route it to multiple destinations like S3, Datadog, or Splunk.

```conf
# fluent-bit.conf
[INPUT]
    Name   tail
    Path   /var/log/apps/*.log
    Parser json

[OUTPUT]
    Name   stdout
    Match  *
```

### Docker Logging

If your application runs in Docker, you can configure the logging driver to capture the container's JSON output from stdout.

```yaml
# docker-compose.yml
services:
  order-service:
    image: order-service:latest
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
```

## Migration Guide

Spring Boot 3.4 native structured logging replaces several common third-party libraries and complex configurations.

### From Logstash-Logback-Encoder

If you previously used `net.logstash.logback.encoder.LogstashEncoder` in a `logback-spring.xml` file:

1. **Delete** your custom `logback-spring.xml` if it only exists for the encoder.
2. **Add** `logging.structured.format.console=logstash` to `application.properties`.
3. **Remove** the `net.logstash.logback:logstash-logback-encoder` dependency.

### From Log4j2 JSON Layout

If you were using Log4j2 specifically for its JSON capabilities:

1. **Revert** to Spring Boot's default Logback starter.
2. **Use** `logging.structured.format.console=ecs` for better industry alignment.
3. **Enjoy** faster startup times and reduced classpath complexity.

## Security Best Practices

Logs are a common source of data leaks. Structured logging makes it easier to identify and protect sensitive data.

### Field Exclusion

Never add sensitive data like passwords, credit card numbers, or auth tokens to MDC. If a library adds fields you don't want, use a customizer to remove them before serialization.

```java
@Component
class SecurityCustomizer implements StructuredLoggingJsonMembersCustomizer<Object> {
    @Override
    public void customize(Map<String, Object> members) {
        // Ensure certain keys never make it to the logs
        members.remove("password");
        members.remove("ssn");
        members.remove("authorization_header");
    }
}
```

### PII Masking

Personally Identifiable Information (PII) should be masked. Instead of logging `email: "user@example.com"`, log `email: "u***@example.com"`. You can achieve this by masking the data before adding it to MDC or by using the fluent API.

## Performance Considerations

### Async Logging

JSON serialization is more CPU-intensive than string formatting. In high-throughput applications, use asynchronous logging to ensure logging doesn't block request processing.

Spring Boot 3.4+ handles much of this optimization internally, but ensure your log rotation policies don't cause disk I/O pauses.

### Volume Management

Structured logs are significantly larger (2x to 5x) than plain text logs because keys are repeated in every entry.
- **Log Level**: Default to `INFO`. Only use `DEBUG` or `TRACE` for specific troubleshooting.
- **Retention**: Set aggressive rotation and retention policies (e.g., keep 7 days of logs).
- **Sampling**: If using tracing, sample only a small percentage (e.g., 5-10%) of requests in production.

## Troubleshooting

### Logs are still plain text
- **Version Check**: Verify you are on Spring Boot 3.4.0+.
- **Override Check**: Ensure a `logback-spring.xml` or `log4j2.xml` file is not overriding the properties.
- **Profile Check**: Check `spring.profiles.active` to ensure your production profile is actually running.

### Missing Fields
- **MDC Initialization**: Ensure `MDC.put()` is called before the log statement.
- **Tracing Context**: Verify `micrometer-tracing` is on the classpath if `traceId` is missing.
- **Customizers**: Check if a customizer is accidentally removing required fields.

## Best Practices

1. **Standardize on ECS**: It is the modern industry standard and provides the best tooling support.
2. **Use Snake Case**: Most log aggregators prefer `snake_case` for field names. Stick to one naming convention across all services.
3. **Avoid Deep Nesting**: Keep your JSON structure relatively flat. Deeply nested objects are harder to query in some log tools.
4. **Context over Messages**: Put as much information as possible into fields (MDC/KeyValue) rather than into the message string.
5. **Always Clear MDC**: Use a `try-finally` block or a `WebFilter` to clear MDC at the end of a request.

## Related Documentation

- [Logging and Monitoring](./logging-and-monitoring.md) - General logging and observability principles.
- [Configuration Principles](../configuration/configuration-principles.md) - How to manage environment-specific properties.
- [Observability Standards](../../../guides/observability/observability-standards.md) - The high-level goals of system visibility.
