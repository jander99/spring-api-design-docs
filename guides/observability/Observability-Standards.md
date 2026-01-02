# Observability Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 15 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong systems background, distributed systems experience  
> **🎯 Key Topics:** Metrics, Logging, Distributed Tracing, SLOs
> 
> **📊 Complexity:** Advanced technical content

## Overview

Observability means understanding how your systems work by examining their outputs. This guide covers comprehensive observability practices including metrics collection, structured logging, distributed tracing, and performance monitoring.

### Three Pillars of Observability

1. **Metrics**: Numerical data showing system performance over time
2. **Logs**: Detailed records of individual events and operations
3. **Traces**: Request flow visualization across distributed systems

### Observability vs. Monitoring

- **Monitoring**: Tells you when something breaks (known unknowns)
- **Observability**: Helps you understand why it broke (unknown unknowns)

## Metrics Collection

### Standard Metrics Categories

#### HTTP Request Metrics

**Request Rate Metrics**
- `http_requests_total`: Total HTTP requests by method, status, endpoint
- `http_requests_per_second`: Request rate measurements

**Response Time Metrics**
- `http_request_duration_seconds`: Request duration histograms
- `http_request_duration_seconds_sum`: Total request processing time
- `http_request_duration_seconds_count`: Total number of requests

**Error Rate Metrics**
- `http_requests_errors_total`: Count of error responses
- `http_error_rate`: Percentage of failed requests

#### Business Metrics

**Resource Metrics**
- `orders_created_total`: Number of orders created
- `orders_processed_total`: Number of orders processed  
- `orders_value_total`: Total monetary value of orders

**Queue Metrics**
- `queue_depth`: Current processing queue depth
- `queue_processing_time`: Time items spend in queue
- `queue_items_processed_total`: Total items processed

#### System Metrics

**Resource Utilization**
- `cpu_usage_percent`: CPU utilization percentage
- `memory_usage_bytes`: Memory consumption in bytes
- `memory_usage_percent`: Memory usage as percentage

**Connection Metrics**
- `database_connections_active`: Active database connections
- `database_connections_idle`: Idle database connections
- `http_connections_active`: Active HTTP connections

### Metric Types and Formats

#### Prometheus Metric Types

| Type | Suffix | Description | Example |
|------|--------|-------------|---------|
| Counter | `_total` | Monotonically increasing value | `http_requests_total` |
| Gauge | `_current` | Current value that can go up or down | `queue_depth_current` |
| Histogram | `_seconds` | Distribution of values in buckets | `http_duration_seconds` |
| Summary | `_seconds` | Similar to histogram with quantiles | `response_time_seconds` |

#### Prometheus Metrics Example

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200",endpoint="/v1/orders"} 1250
http_requests_total{method="POST",status="201",endpoint="/v1/orders"} 89
http_requests_total{method="GET",status="404",endpoint="/v1/orders"} 12

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",endpoint="/v1/orders",le="0.1"} 1089
http_request_duration_seconds_bucket{method="GET",endpoint="/v1/orders",le="0.5"} 1234
http_request_duration_seconds_bucket{method="GET",endpoint="/v1/orders",le="+Inf"} 1250
```

### Metric Naming Conventions

#### Naming Standards

1. **Use snake_case**: `http_requests_total` not `httpRequestsTotal`
2. **Include units**: `_seconds`, `_bytes`, `_percent`, `_total`
3. **Use descriptive names**: `orders_created_total` not `counter1`
4. **Consistent prefixes**: Group related metrics with common prefixes

#### Cardinality Management

**Low Cardinality (Good)**
- HTTP methods: GET, POST, PUT, DELETE (4 values)
- HTTP status codes: 200, 201, 400, 404, 500 (limited set)
- Service names: order-service, payment-service (known set)

**High Cardinality (Avoid)**
- User IDs: Unique per user (millions of values)
- Request IDs: Unique per request (unlimited values)
- Timestamps: Unique per moment (infinite values)

## Structured Logging

### Log Entry Format

#### Standard JSON Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "INFO",
  "service": "order-service",
  "version": "1.2.3",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "a456426614174000",
  "userId": "user-12345",
  "method": "POST",
  "path": "/v1/orders",
  "status": 201,
  "duration": 145,
  "message": "Order created successfully",
  "orderId": "order-67890"
}
```

### Log Level Guidelines

| Level | Usage | Examples | Retention |
|-------|-------|----------|-----------|
| ERROR | System failures requiring immediate attention | Database connection lost, service crashed | 90+ days |
| WARN | Potential problems that don't stop operation | Slow response times, deprecated API usage | 30+ days |
| INFO | Important business events | Order created, payment processed | 30+ days |
| DEBUG | Detailed troubleshooting information | Parameter values, function entry/exit | 7+ days |
| TRACE | Very detailed execution information | Loop iterations, variable states | 1-3 days |

### Log Context Requirements

#### Required Fields

Every log entry must include:
- `timestamp`: ISO-8601 format with timezone
- `level`: Log severity level
- `service`: Service name and version
- `requestId`: Unique request identifier
- `message`: Human-readable description

#### Optional Context Fields

Add when available:
- `traceId`: Distributed tracing identifier
- `spanId`: Current span identifier
- `userId`: Authenticated user identifier
- `method`: HTTP method
- `path`: Request path
- `status`: HTTP status code
- `duration`: Request duration in milliseconds

## Request Correlation

### Correlation Headers

#### X-Request-ID

- **Purpose**: Unique identifier for each API request
- **Format**: UUID v4 or equivalent unique identifier
- **Behavior**: Generated if not provided by client
- **Propagation**: Returned in response, forwarded to dependencies

#### X-Trace-ID

- **Purpose**: Distributed tracing identifier
- **Format**: OpenTelemetry trace ID format (32 hex characters)
- **Behavior**: Links request to broader trace context
- **Propagation**: Must be forwarded to all downstream services

```http
GET /v1/orders HTTP/1.1
Host: api.example.com
X-Request-ID: 123e4567-e89b-12d3-a456-426614174000
X-Trace-ID: 4bf92f3577b34da6a3ce929d0e0e4736

HTTP/1.1 200 OK
X-Request-ID: 123e4567-e89b-12d3-a456-426614174000
X-Trace-ID: 4bf92f3577b34da6a3ce929d0e0e4736
```

### Header Propagation Rules

1. **Always Echo**: Return correlation headers in response
2. **Generate if Missing**: Create request ID if not provided by client
3. **Propagate Downstream**: Forward headers to all dependent services
4. **Log Consistently**: Include correlation IDs in every log entry

## Distributed Tracing

### OpenTelemetry Integration

#### W3C Trace Context Headers

**traceparent**
```http
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

Format components:
- `00`: Version number
- `4bf92f3577b34da6a3ce929d0e0e4736`: Trace ID (32 hex chars)
- `00f067aa0ba902b7`: Parent span ID (16 hex chars)
- `01`: Trace flags (sampled)

**tracestate**
```http  
tracestate: rojo=00f067aa0ba902b7,congo=t61rcWkgMzE
```

Vendor-specific trace information for additional context.

### Span Attributes

#### HTTP Span Attributes

Standard attributes for HTTP operations:
- `http.method`: HTTP request method (GET, POST, etc.)
- `http.url`: Full request URL  
- `http.status_code`: HTTP response status code
- `http.user_agent`: Client user agent string
- `http.route`: Route pattern (e.g., `/v1/orders/{id}`)

#### Business Span Attributes

Domain-specific attributes:
- `user.id`: Authenticated user identifier
- `business.entity.id`: Business entity being operated on
- `business.operation`: Business operation being performed
- `business.outcome`: Operation result (success, failure, partial)

### Trace Sampling

#### Sampling Strategies

| Environment | Default Rate | Purpose |
|-------------|--------------|---------|
| Production | 10% | Cost efficiency and performance |
| Staging | 50% | Testing and validation |
| Development | 100% | Full debugging capability |

#### Sampling Rules Example

```json
{
  "sampling": {
    "default": 0.1,
    "rules": [
      {
        "service": "*",
        "operation": "*/auth/*",
        "rate": 1.0,
        "description": "Always trace authentication"
      },
      {
        "service": "*", 
        "operation": "*/payment/*",
        "rate": 1.0,
        "description": "Always trace payments"
      },
      {
        "service": "*",
        "operation": "*/health",
        "rate": 0.01,
        "description": "Minimal health check tracing"
      }
    ]
  }
}
```

## Service Level Objectives

### SLO Framework

Service Level Objectives define target reliability and performance levels.

#### SLO Components

- **SLI (Service Level Indicator)**: Metric measurement (e.g., latency, availability)
- **SLO (Service Level Objective)**: Target for SLI (e.g., 99.9% availability)
- **SLA (Service Level Agreement)**: Contract with consequences (e.g., refund if below SLO)

### Performance SLOs

#### Response Time SLOs

| Endpoint Type | P50 | P95 | P99 |
|---------------|-----|-----|-----|
| Simple GET | < 100ms | < 200ms | < 500ms |
| Complex GET | < 200ms | < 500ms | < 1000ms |
| POST/PUT | < 300ms | < 1000ms | < 2000ms |
| DELETE | < 200ms | < 500ms | < 1000ms |

#### Availability SLOs

| Service Tier | Uptime SLO | Error Budget | Downtime Allowed |
|--------------|------------|--------------|------------------|
| Critical | 99.99% | 0.01% | 4.32 min/month |
| High | 99.9% | 0.1% | 43.2 min/month |
| Standard | 99.5% | 0.5% | 3.6 hours/month |

#### Error Rate SLOs

| Metric | Threshold | Time Window |
|--------|-----------|-------------|
| 5xx Error Rate | < 1% | 5 minutes |
| 4xx Error Rate | < 5% | 5 minutes |
| Timeout Rate | < 0.1% | 5 minutes |

### SLI Calculations

#### Availability SLI

```
availability = (successful_requests / total_requests) * 100
```

Example: 9,950 successful requests out of 10,000 total = 99.5% availability

#### Latency SLI

```
latency_sli = (requests_under_threshold / total_requests) * 100
```

Example: 9,900 requests under 200ms out of 10,000 total = 99% meeting latency SLO

#### Error Rate SLI

```
error_rate = (error_responses / total_responses) * 100
```

Example: 50 errors out of 10,000 responses = 0.5% error rate

## Alerting Standards

### Alert Severity Levels

#### Critical Alerts

- **Response Time**: 5 minutes maximum
- **Escalation**: Immediate page to on-call engineer
- **Examples**: Service completely down, database unavailable, >5% error rate
- **Notification**: Phone call, SMS, PagerDuty

#### Warning Alerts

- **Response Time**: 15 minutes during business hours
- **Escalation**: Notify team via Slack/email
- **Examples**: Elevated latency, >2% error rate, approaching resource limits
- **Notification**: Slack, email, dashboard

#### Info Alerts

- **Response Time**: 1 hour or next business day
- **Escalation**: Log to dashboard and ticketing system
- **Examples**: Deployment notifications, configuration changes, capacity planning
- **Notification**: Dashboard, email digest

### Alert Rule Examples

#### High Error Rate Alert

```yaml
alert: HighErrorRate
expr: |
  (
    sum(rate(http_requests_total{status=~"5.."}[5m])) /
    sum(rate(http_requests_total[5m]))
  ) > 0.05
for: 1m
labels:
  severity: critical
annotations:
  summary: "High HTTP error rate detected"
  description: "Error rate is {{ $value | humanizePercentage }} over last 5 minutes"
  runbook: "https://wiki.company.com/runbooks/high-error-rate"
```

#### Slow Response Time Alert

```yaml
alert: SlowResponseTime
expr: |
  histogram_quantile(
    0.95, 
    sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
  ) > 0.5
for: 5m  
labels:
  severity: warning
annotations:
  summary: "Slow API response time"
  description: "95th percentile response time is {{ $value }}s"
  runbook: "https://wiki.company.com/runbooks/slow-responses"
```

#### Service Unavailable Alert

```yaml
alert: ServiceDown
expr: up{job="order-service"} == 0
for: 1m
labels:
  severity: critical
annotations:
  summary: "Service is down"
  description: "{{ $labels.instance }} has been down for more than 1 minute"
  runbook: "https://wiki.company.com/runbooks/service-down"
```

## Performance Monitoring

### Monitoring Frameworks

#### Golden Signals (Google SRE)

1. **Latency**: Time to serve requests
   - Measure: P50, P95, P99 response times
   - Target: Based on service tier SLOs

2. **Traffic**: Demand on the system
   - Measure: Requests per second
   - Monitor: Trends and anomalies

3. **Errors**: Rate of failing requests
   - Measure: Error percentage by type
   - Alert: When exceeding SLO thresholds

4. **Saturation**: How "full" the service is
   - Measure: CPU, memory, disk, network utilization
   - Alert: Before reaching capacity limits

#### RED Method (Request-focused)

1. **Rate**: Number of requests per second
2. **Errors**: Number of failed requests
3. **Duration**: Time each request takes

Best for: User-facing services and APIs

#### USE Method (Resource-focused)

1. **Utilization**: Percentage of time resource is busy
2. **Saturation**: Work resource cannot service (queue depth)
3. **Errors**: Count of error events

Best for: Infrastructure and system resources

### Performance Thresholds

#### Response Time Thresholds

| Percentile | Target | Warning | Critical |
|------------|--------|---------|----------|
| P50 | < 100ms | > 150ms | > 200ms |
| P95 | < 500ms | > 750ms | > 1000ms |  
| P99 | < 1000ms | > 1500ms | > 2000ms |

#### Throughput Thresholds

| Metric | Normal | High Load | Critical | Alert |
|--------|--------|-----------|----------|-------|
| Requests/sec | < 100 | 100-500 | 500-1000 | > 1000 |
| CPU Usage | < 50% | 50-80% | 80-95% | > 95% |
| Memory Usage | < 70% | 70-90% | 90-95% | > 95% |

## Security Considerations

### Metrics Security

#### Sensitive Data Protection

- **Never expose PII**: No user emails, names, or identifiers in metric labels
- **Sanitize URLs**: Remove tokens, API keys, sensitive parameters
- **Control cardinality**: High-cardinality data can expose individual user patterns

Example of proper sanitization:
```
# Bad: Exposes user IDs
http_requests_total{user_id="john.doe@example.com"}

# Good: Uses aggregated categories
http_requests_total{user_type="premium"}
```

#### Access Control

- Secure metrics endpoints with authentication
- Use separate endpoints for internal vs. external metrics
- Implement role-based access for different metric consumers
- Rate limit metrics endpoints to prevent abuse

### Logging Security

#### PII Protection

Never log sensitive data:
- Passwords or authentication tokens
- Credit card numbers or financial data
- Personal identifiable information (PII)
- API keys or secrets

Use redaction patterns:
```json
{
  "message": "User login successful",
  "email": "j***@example.com",
  "ipAddress": "192.168.***.*"
}
```

### Correlation ID Security

#### Best Practices

- Use cryptographically random IDs (UUID v4)
- Never include PII in correlation IDs
- Rotate correlation IDs for long-running processes
- Implement ID length limits to prevent abuse

## Implementation Guidelines

### Metrics Implementation

1. **Efficient Collection**: Metrics collection adds < 1ms overhead
2. **Appropriate Cardinality**: Limit label combinations to < 10,000
3. **Regular Cleanup**: Remove stale metrics after 24 hours
4. **Consistent Naming**: Establish and enforce naming conventions
5. **Pre-aggregation**: Aggregate metrics before export when possible

### Logging Implementation

1. **Structured Format**: Always use JSON for machine readability
2. **Appropriate Levels**: Use log levels to control volume and cost
3. **Context Inclusion**: Include request IDs and relevant business context
4. **Async Logging**: Use asynchronous logging to minimize latency impact
5. **Log Sampling**: Sample high-volume debug logs (e.g., 10% in production)

### Tracing Implementation

1. **Strategic Sampling**: Balance cost and observability needs
2. **Critical Path Coverage**: Always trace authentication and payment flows
3. **Span Attributes**: Include both technical and business context
4. **Performance Impact**: Ensure tracing adds < 5ms overhead
5. **Context Propagation**: Propagate trace context to all service boundaries

## Common Anti-patterns

### Anti-patterns to Avoid

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Generic health checks | Doesn't identify root cause | Check actual dependencies with detail |
| Excessive logging | High storage costs and noise | Use appropriate log levels and sampling |
| Missing correlation IDs | Cannot trace requests across services | Implement request ID generation and propagation |
| High-cardinality metrics | Performance degradation and cost | Limit label values and use aggregation |
| Insecure metrics exposure | Security risk and data leakage | Implement authentication and sanitization |
| Alert fatigue | Ignored alerts and missed issues | Tune alert thresholds and reduce noise |
| No runbooks | Slow incident response | Link alerts to runbook documentation |

## Related Standards

- [HTTP Observability Endpoints](../api-design/advanced-patterns/API-Observability-Standards.md) - Health check and metrics HTTP endpoints
- [Error Response Standards](../api-design/request-response/Error-Response-Standards.md) - Error handling and RFC 7807
- [Security Standards](../api-design/security/Security-Standards.md) - Authentication and authorization

## Examples

For implementation examples, see:
- Health check implementations
- Metrics collection patterns
- Distributed tracing setup
- Alert configuration templates
- Dashboard configurations

This comprehensive observability framework enables deep system understanding while maintaining performance and security standards.
