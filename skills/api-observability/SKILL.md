---
name: api-observability
description: Implement observability for REST APIs including health checks, metrics, distributed tracing, and request correlation. Use when adding health endpoints, exposing Prometheus metrics, implementing trace propagation, or debugging request flows across services.
---

# API Observability

## When to Use This Skill

Use this skill when you need to:
- Implement health check endpoints (`/health`, `/health/live`, `/health/ready`)
- Expose metrics for Prometheus/Grafana monitoring
- Add distributed tracing with OpenTelemetry
- Correlate requests across microservices
- Debug production issues with structured logging
- Meet SLA/SLO requirements

## Three Pillars of Observability

| Pillar | Purpose | Key Tools |
|--------|---------|-----------|
| **Metrics** | Numbers showing API performance | Prometheus, Micrometer |
| **Logs** | Detailed records of events | JSON logging, ELK stack |
| **Traces** | Request flow across services | OpenTelemetry, Jaeger |

## Health Check Endpoints

### Standard Endpoints

| Endpoint | Purpose | HTTP Status |
|----------|---------|-------------|
| `/health` | Overall health status | 200 UP, 503 DOWN |
| `/health/live` | Liveness probe (is process running?) | 200 or 503 |
| `/health/ready` | Readiness probe (can accept traffic?) | 200 or 503 |

### Health Response Format

```json
{
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.2.3",
  "checks": {
    "database": {
      "status": "UP",
      "responseTime": "12ms"
    },
    "redis": {
      "status": "UP",
      "responseTime": "3ms"
    }
  }
}
```

### Health Status Values

| Status | Description | HTTP Code |
|--------|-------------|-----------|
| `UP` | Everything works | 200 |
| `DOWN` | Something is broken | 503 |
| `DEGRADED` | Partial functionality | 200 |

### Liveness vs Readiness

**Liveness (`/health/live`):**
- Check: Is the process running?
- If fails: Restart the container
- Should NOT check external dependencies

**Readiness (`/health/ready`):**
- Check: Can accept traffic?
- If fails: Remove from load balancer
- SHOULD check external dependencies

## Metrics Exposure

### Prometheus Endpoint

```http
GET /metrics HTTP/1.1
Authorization: Bearer {token}

HTTP/1.1 200 OK
Content-Type: text/plain; version=0.0.4

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200",endpoint="/orders"} 1250
http_requests_total{method="POST",status="201",endpoint="/orders"} 89

# HELP http_request_duration_seconds Request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",endpoint="/orders",le="0.1"} 1089
http_request_duration_seconds_bucket{method="GET",endpoint="/orders",le="0.5"} 1234
```

### Essential Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total requests by method/status |
| `http_request_duration_seconds` | Histogram | Request latency distribution |
| `http_requests_in_progress` | Gauge | Currently active requests |
| `http_request_errors_total` | Counter | Failed requests |

### Metric Naming Conventions

1. Use `snake_case`: `http_requests_total`
2. Include units: `_seconds`, `_bytes`, `_total`
3. Use descriptive names: `orders_created_total`

| Type | Suffix | Example |
|------|--------|---------|
| Counter | `_total` | `http_requests_total` |
| Gauge | (none or `_current`) | `queue_depth` |
| Histogram | `_seconds`, `_bytes` | `http_duration_seconds` |

### Golden Signals (Monitor These)

1. **Latency**: Time to serve requests
2. **Traffic**: Request rate
3. **Errors**: Rate of failed requests
4. **Saturation**: How "full" the service is

## Request Correlation

### Required Headers

| Header | Purpose | Format |
|--------|---------|--------|
| `X-Request-ID` | Unique request identifier | UUID v4 |
| `X-Correlation-ID` | Same as X-Request-ID | UUID v4 |
| `traceparent` | W3C distributed tracing | See below |

### Correlation ID Flow

```
Client Request                    Server Response
─────────────────────────────────────────────────────
X-Request-ID: abc-123      →      X-Request-ID: abc-123
(or server generates)             (always echoed back)
```

### Correlation Rules

1. **Generate if missing**: Create request ID if client doesn't provide
2. **Always echo**: Return correlation headers in response
3. **Propagate downstream**: Forward to dependent services
4. **Log consistently**: Include in every log entry

### W3C Trace Context

```http
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

Format: `version-trace_id-parent_id-flags`

## Structured Logging

### Log Entry Format

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "INFO",
  "service": "order-service",
  "requestId": "abc-123",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "userId": "user-456",
  "method": "POST",
  "path": "/v1/orders",
  "status": 201,
  "duration": 145,
  "message": "Order created successfully"
}
```

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| ERROR | Failures requiring action | `Payment processing failed` |
| WARN | Potential issues | `Retry 3 of 5` |
| INFO | Business events | `Order created` |
| DEBUG | Troubleshooting detail | `Processing items: [...]` |

### Logging Rules

- Use parameterized logging: `log.info("Order {} created", orderId)`
- Never log: passwords, tokens, PII, credit cards
- Always include: request ID, user ID (if authenticated)

## Service Level Objectives (SLOs)

### Response Time Targets

| Endpoint Type | P50 | P95 | P99 |
|---------------|-----|-----|-----|
| Simple GET | < 100ms | < 200ms | < 500ms |
| Complex GET | < 200ms | < 500ms | < 1s |
| POST/PUT | < 300ms | < 1s | < 2s |

### Availability Targets

| Tier | Uptime | Monthly Downtime |
|------|--------|------------------|
| Critical | 99.99% | 4.3 min |
| High | 99.9% | 43 min |
| Standard | 99.5% | 3.6 hours |

### Error Rate Targets

| Metric | Threshold |
|--------|-----------|
| 5xx Error Rate | < 1% |
| 4xx Error Rate | < 5% |
| Timeout Rate | < 0.1% |

## Rate Limiting Headers

Include these headers to help clients manage rate limits:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 742
X-RateLimit-Reset: 1642251600
```

### 429 Response

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
  "detail": "Rate limit of 1000 requests per hour exceeded"
}
```

## Alerting Rules

### Critical Alerts (Immediate Response)

```yaml
alert: HighErrorRate
expr: |
  sum(rate(http_requests_total{status=~"5.."}[5m])) /
  sum(rate(http_requests_total[5m])) > 0.05
for: 1m
labels:
  severity: critical
```

### Warning Alerts (Business Hours)

```yaml
alert: SlowResponseTime
expr: |
  histogram_quantile(0.95, 
    sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
  ) > 0.5
for: 5m
labels:
  severity: warning
```

## Quick Reference

### Observability Checklist

- [ ] Health endpoint returns component status
- [ ] Liveness probe checks process only
- [ ] Readiness probe checks dependencies
- [ ] Metrics exposed in Prometheus format
- [ ] Request IDs generated and logged
- [ ] Correlation headers propagated downstream
- [ ] Structured JSON logging enabled
- [ ] Trace context propagated (W3C format)
- [ ] SLOs defined and monitored
- [ ] Alerts configured for error rates

### Essential Endpoints

| Endpoint | Content-Type | Auth Required |
|----------|--------------|---------------|
| `/health` | `application/json` | No |
| `/health/live` | `application/json` | No |
| `/health/ready` | `application/json` | No |
| `/metrics` | `text/plain` | Yes (production) |

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| External deps in liveness | Container restart loops | Move to readiness check |
| Missing request IDs | Can't trace requests | Generate and propagate IDs |
| String concatenation in logs | Performance overhead | Use parameterized logging |
| High-cardinality labels | Memory explosion | Limit unique label values |
| Sensitive data in logs | Security risk | Sanitize before logging |
| No metrics auth | Expose internal data | Secure `/metrics` endpoint |
| Blocking health checks | Slow startup | Use async checks with timeout |

## Loading Additional Context

When you need deeper guidance:

- **Health check patterns**: Load `references/health-checks.md`
- **Metrics and tracing**: Load `references/metrics-tracing.md`
- **Java/Spring implementation**: Load `references/java-spring.md`
