# API Observability Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 10 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** API Design
> 
> **📊 Complexity:** 14.4 grade level • 0.9% technical density • difficult

## Overview

API observability means watching and understanding how your APIs work. This document shows you how to implement observability in REST APIs. It covers health checks, metrics, tracing, and monitoring.

## Basic Principles

### Three Main Parts

1. **Metrics**: Numbers that show how your API performs
2. **Logs**: Detailed records of what your API does
3. **Traces**: Shows how requests flow through your system

### Observability vs. Monitoring

- **Monitoring**: Tells you when something breaks
- **Observability**: Helps you understand why it broke

## Health Checks

### Health Check Endpoints

#### Primary Health Endpoint

**GET /health**
- **Purpose**: Overall application health status
- **Response Format**: JSON with standardized structure
- **Status Codes**: 
  - `200 OK`: Service is healthy
  - `503 Service Unavailable`: Service is unhealthy

```http
GET /health HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.2.3",
  "checks": {
    "database": {
      "status": "UP",
      "responseTime": "12ms"
    },
    "external-api": {
      "status": "UP", 
      "responseTime": "45ms"
    }
  }
}
```

#### Kubernetes Health Probes

**GET /health/live**
- **Purpose**: Liveness probe - determines if container should be restarted
- **Criteria**: Basic application startup and fundamental functionality

**GET /health/ready** 
- **Purpose**: Readiness probe - determines if container can accept traffic
- **Criteria**: All dependencies available and service ready to handle requests

```http
GET /health/ready HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "UP",
  "dependencies": {
    "database": "UP",
    "cache": "UP",
    "message-queue": "UP"
  }
}
```

### Health Check Response Format

#### Standard Health Response Schema

```json
{
  "status": "UP|DOWN|DEGRADED",
  "timestamp": "ISO-8601 timestamp",
  "version": "semantic version",
  "uptime": "duration in seconds",
  "checks": {
    "component-name": {
      "status": "UP|DOWN",
      "responseTime": "duration with unit",
      "details": "optional additional information"
    }
  }
}
```

#### Health Status Values

| Status | Description | HTTP Code |
|--------|-------------|-----------|
| UP | Everything works | 200 |
| DOWN | Something is broken | 503 |
| DEGRADED | Some features work | 200 |

### Dependency Health Checks

#### Database Health Check
```json
{
  "database": {
    "status": "UP",
    "responseTime": "8ms",
    "details": {
      "driver": "postgresql-42.3.1",
      "pool": {
        "active": 3,
        "idle": 7,
        "max": 10
      }
    }
  }
}
```

#### External Service Health Check
```json
{
  "payment-service": {
    "status": "UP",
    "responseTime": "120ms",
    "details": {
      "endpoint": "https://api.payment.com/health",
      "timeout": "5s",
      "lastSuccess": "2024-01-15T10:29:45Z"
    }
  }
}
```

## Metrics Endpoints

### Metrics Exposure Patterns

#### Prometheus Metrics Endpoint

**GET /metrics**
- **Purpose**: Export metrics in Prometheus format
- **Content-Type**: `text/plain; version=0.0.4; charset=utf-8`
- **Authentication**: Should require authentication in production

```http
GET /metrics HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>

HTTP/1.1 200 OK
Content-Type: text/plain; version=0.0.4; charset=utf-8

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
- `http_error_rate`: How many requests fail

#### Business Metrics

**Resource Metrics**
- `orders_created_total`: Number of orders created
- `orders_processed_total`: Number of orders processed  
- `orders_value_total`: Total order values

**Queue Metrics**
- `queue_depth`: Current processing queue depth
- `queue_processing_time`: Time items spend in queue
- `queue_items_processed_total`: Total items processed

#### System Metrics

**Resource Utilization**
- `cpu_usage_percent`: How much CPU is used
- `memory_usage_bytes`: How much memory is used
- `memory_usage_percent`: Memory usage as percentage

**Connection Metrics**
- `database_connections_active`: Active database connections
- `database_connections_idle`: Idle database connections
- `http_connections_active`: Active HTTP connections

### Metric Naming Conventions

#### Naming Standards

1. **Use snake_case**: `http_requests_total` not `httpRequestsTotal`
2. **Include units**: `_seconds`, `_bytes`, `_percent`, `_total`
3. **Use descriptive names**: `orders_created_total` not `counter1`
4. **Consistent prefixes**: Group related metrics with common prefixes

#### Metric Types

| Type | Suffix | Description | Example |
|------|--------|-------------|---------|
| Counter | `_total` | Monotonically increasing | `http_requests_total` |
| Gauge | `_current` | Current value | `queue_depth_current` |
| Histogram | `_seconds` | Distribution of values | `http_duration_seconds` |
| Summary | `_seconds` | Similar to histogram | `response_time_seconds` |

## Request Correlation Standards

### Correlation Headers

#### Required Headers

**X-Request-ID**
- **Purpose**: Unique identifier for each API request
- **Format**: UUID v4 or equivalent unique identifier
- **Behavior**: Generated if not provided by client

**X-Trace-ID** (Optional)
- **Purpose**: Distributed tracing identifier
- **Format**: OpenTelemetry trace ID format (32 hex characters)
- **Behavior**: Links request to broader trace context

```http
GET /v1/orders HTTP/1.1
Host: api.example.com
X-Request-ID: 123e4567-e89b-12d3-a456-426614174000
X-Trace-ID: 4bf92f3577b34da6a3ce929d0e0e4736

HTTP/1.1 200 OK
X-Request-ID: 123e4567-e89b-12d3-a456-426614174000
X-Trace-ID: 4bf92f3577b34da6a3ce929d0e0e4736
Content-Type: application/json
```

#### Header Propagation Rules

1. **Always Echo**: Return correlation headers in response
2. **Generate if Missing**: Create request ID if not provided
3. **Propagate Downstream**: Forward headers to dependent services
4. **Log Consistently**: Include correlation IDs in all log entries

### Structured Logging Standards

#### Log Entry Format

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

#### Log Level Guidelines

| Level | Usage | Retention |
|-------|-------|-----------|
| ERROR | System breaks and needs fixing now | 90+ days |
| WARN | Something might be wrong but still works | 30+ days |
| INFO | Important business events | 30+ days |
| DEBUG | Detailed info for troubleshooting | 7+ days |

## OpenTelemetry Integration

### Trace Context Propagation

#### W3C Trace Context Headers

**traceparent**
```http
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```
- Format: `version-trace-id-parent-id-trace-flags`
- Required for distributed tracing

**tracestate**
```http  
tracestate: rojo=00f067aa0ba902b7,congo=t61rcWkgMzE
```
- Vendor-specific trace information
- Optional but recommended

#### Span Attributes

**HTTP Span Attributes**
- `http.method`: HTTP request method
- `http.url`: Full request URL  
- `http.status_code`: HTTP response status code
- `http.user_agent`: Client user agent

**Business Span Attributes**
- `user.id`: Authenticated user identifier
- `business.entity.id`: Business entity being operated on
- `business.operation`: Business operation being performed

### Trace Sampling Strategies

#### Sampling Rules

1. **Production**: 10% sampling rate for cost efficiency
2. **Staging**: 50% sampling rate for testing
3. **Development**: 100% sampling rate for debugging
4. **Critical Paths**: Always sample authentication and payment flows

#### Sampling Configuration

```json
{
  "sampling": {
    "default": 0.1,
    "rules": [
      {
        "service": "*",
        "operation": "*/auth/*",
        "rate": 1.0
      },
      {
        "service": "*", 
        "operation": "*/payment/*",
        "rate": 1.0
      },
      {
        "service": "*",
        "operation": "*/health",
        "rate": 0.01
      }
    ]
  }
}
```

## Service Level Objectives (SLOs)

### API Performance SLOs

#### Response Time SLOs

| Endpoint Type | P50 | P95 | P99 |
|---------------|-----|-----|-----|
| Simple GET | < 100ms | < 200ms | < 500ms |
| Complex GET | < 200ms | < 500ms | < 1000ms |
| POST/PUT | < 300ms | < 1000ms | < 2000ms |
| DELETE | < 200ms | < 500ms | < 1000ms |

#### Availability SLOs

| Service Tier | Uptime SLO | Error Budget |
|--------------|------------|--------------|
| Critical | 99.99% | 4.32 min/month |
| High | 99.9% | 43.2 min/month |
| Standard | 99.5% | 3.6 hours/month |

#### Error Rate SLOs

| Metric | Threshold | Time Window |
|--------|-----------|-------------|
| 5xx Error Rate | < 1% | 5 minutes |
| 4xx Error Rate | < 5% | 5 minutes |
| Timeout Rate | < 0.1% | 5 minutes |

### SLO Monitoring

#### SLI Calculation Examples

**Availability SLI**
```
availability = successful_requests / total_requests * 100
```

**Latency SLI** 
```
latency_sli = requests_under_threshold / total_requests * 100
```

**Error Rate SLI**
```
error_rate = error_responses / total_responses * 100
```

## Alerting Standards

### Alert Severity Levels

#### Critical Alerts
- **Response Time**: 5 minutes
- **Escalation**: Wake up the on-call person immediately
- **Examples**: Service down, too many errors (>5%), database broken

#### Warning Alerts  
- **Response Time**: 15 minutes
- **Escalation**: Notify team during work hours
- **Examples**: Slow responses, some errors (>2%)

#### Info Alerts
- **Response Time**: 1 hour
- **Escalation**: Just log it or show on dashboard
- **Examples**: New deployments, config changes

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
  summary: "High HTTP error rate"
  description: "Error rate is {{ $value | humanizePercentage }} over 5 minutes"
```

#### Slow Response Time Alert  
```yaml
alert: SlowResponseTime
expr: |
  histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5
for: 5m  
labels:
  severity: warning
annotations:
  summary: "Slow API response time"
  description: "95th percentile response time is {{ $value }}s"
```

## Rate Limiting Headers

### Rate Limit Response Headers

#### Standard Rate Limiting Headers

**X-RateLimit-Limit**
- **Purpose**: Request limit per time window
- **Example**: `X-RateLimit-Limit: 1000`

**X-RateLimit-Remaining**
- **Purpose**: Requests remaining in current window  
- **Example**: `X-RateLimit-Remaining: 742`

**X-RateLimit-Reset**
- **Purpose**: Time when rate limit resets
- **Format**: Unix timestamp or seconds until reset
- **Example**: `X-RateLimit-Reset: 1642251600`

#### Rate Limit Response Example

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 742
X-RateLimit-Reset: 1642251600
Retry-After: 3600
Content-Type: application/json

{
  "data": {...}
}
```

#### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests  
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642251600
Retry-After: 3600
Content-Type: application/problem+json

{
  "type": "https://tools.ietf.org/html/rfc6585#section-4",
  "title": "Too Many Requests", 
  "status": 429,
  "detail": "Rate limit of 1000 requests per hour exceeded",
  "instance": "/v1/orders",
  "rateLimitReset": 1642251600
}
```

## Performance Monitoring

### Key Performance Indicators

#### Golden Signals

1. **Latency**: How long requests take to complete
2. **Traffic**: How much demand is placed on the system
3. **Errors**: Rate of requests that fail
4. **Saturation**: How "full" the service is

#### RED Method Metrics

1. **Rate**: Number of requests per second
2. **Errors**: Number of requests that fail  
3. **Duration**: Time each request takes

#### USE Method Metrics

1. **Utilization**: Percentage of time resource is busy
2. **Saturation**: Amount of work resource can't service
3. **Errors**: Count of error events

### Performance Thresholds

#### Response Time Thresholds

| Percentile | Target | Alert |
|------------|--------|-------|
| P50 | < 100ms | > 200ms |
| P95 | < 500ms | > 1000ms |  
| P99 | < 1000ms | > 2000ms |

#### Throughput Thresholds

| Metric | Normal | High Load | Alert |
|--------|--------|-----------|-------|
| Requests/sec | < 100 | 100-500 | > 500 |
| CPU Usage | < 50% | 50-80% | > 80% |
| Memory Usage | < 70% | 70-90% | > 90% |

## Security Considerations

### Metrics Security

#### Sensitive Data Protection
- Never expose user data in metric labels
- Sanitize URLs containing sensitive information
- Use high-cardinality data carefully (can impact performance)

#### Access Control
- Secure metrics endpoints with authentication
- Limit access to operational metrics
- Consider separate endpoints for different metric consumers

### Correlation ID Security

#### PII Protection
- Never include personally identifiable information in correlation IDs
- Use opaque identifiers that cannot be reverse-engineered
- Implement correlation ID rotation for long-running processes

## Implementation Guidelines

### Health Check Implementation

1. **Fast Response**: Health checks finish in under 1 second
2. **Meaningful Checks**: Test your app, not just the server
3. **Dependency Testing**: Check important services but don't cause chain failures
4. **Circuit Breaker**: Use circuit breakers for external service checks

### Metrics Implementation

1. **Efficient Collection**: Collect metrics without slowing down your API
2. **Appropriate Cardinality**: Don't use too many different label values
3. **Regular Cleanup**: Remove old metrics to prevent memory issues
4. **Consistent Naming**: Use the same naming patterns everywhere

### Logging Implementation

1. **Structured Format**: Use JSON logging for easier searching
2. **Appropriate Levels**: Use the right log level to control costs
3. **Context Inclusion**: Include request IDs and relevant info
4. **Security Awareness**: Never log passwords or secrets

## Common Anti-patterns

### Anti-patterns to Avoid

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Generic health checks | Doesn't tell you what's wrong | Check your actual dependencies |
| Excessive logging | Costs too much to store | Use the right log levels |
| Missing correlation IDs | Can't track requests | Add request IDs to everything |
| High-cardinality metrics | Slows down your system | Limit the number of label values |
| Insecure metrics exposure | Security risk | Implement proper authentication |

## Related Standards

- [API Error Response Standards](../request-response/error-response-standards.md) - Error handling and RFC 9457
- [API Security Standards](../security/security-standards.md) - Authentication and authorization
- [Rate Limiting & Protection Standards](../security/rate-limiting-standards.md) - API protection patterns

## Examples

See [API Observability Examples](examples/observability/) for complete implementation examples including:
- Health check implementations
- Metrics collection patterns
- Distributed tracing setup
- Alert configuration templates

This observability framework provides comprehensive monitoring capabilities while maintaining API performance and security standards.