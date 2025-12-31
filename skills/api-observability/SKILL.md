---
name: api-observability
description: Implement and monitor REST API observability with health checks (liveness, readiness), metrics (Prometheus, counters, histograms), and tracing (OpenTelemetry, correlation IDs). Use when adding health endpoints, exposing metrics, implementing distributed tracing, or debugging cross-service requests.
---

# API Observability

Implement the three pillars of observability: metrics, logs, and traces for REST APIs.

## When to Use

- Adding health check endpoints (`/health`, `/health/live`, `/health/ready`)
- Exposing Prometheus metrics for monitoring
- Implementing distributed tracing with OpenTelemetry
- Correlating requests across microservices
- Debugging production issues with structured logging

## Quick Start

Health endpoint returning component status:

```http
GET /health HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "UP",
  "checks": {
    "database": {"status": "UP", "responseTime": "12ms"},
    "redis": {"status": "UP", "responseTime": "3ms"}
  }
}
```

## Three Pillars

| Pillar | Purpose | Key Tools |
|--------|---------|-----------|
| **Metrics** | Numeric performance data | Prometheus, Micrometer |
| **Logs** | Event records | JSON logging, ELK |
| **Traces** | Request flow | OpenTelemetry, Jaeger |

## Health Endpoints

| Endpoint | Purpose | Checks |
|----------|---------|--------|
| `/health/live` | Is process running? | Process only (no deps) |
| `/health/ready` | Can accept traffic? | External dependencies |
| `/health` | Overall status | All components |

**Key rule**: Liveness should NOT check external dependencies (causes restart loops).

## Essential Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Requests by method/status |
| `http_request_duration_seconds` | Histogram | Latency distribution |
| `http_requests_in_progress` | Gauge | Active requests |

## Request Correlation

| Header | Purpose |
|--------|---------|
| `X-Request-ID` | Unique request identifier |
| `traceparent` | W3C distributed tracing |

Rules: Generate if missing, always echo back, propagate downstream, include in all logs.

## Golden Signals

Monitor these four signals:
1. **Latency** - Time to serve requests
2. **Traffic** - Request rate
3. **Errors** - Failed request rate
4. **Saturation** - How "full" the service is

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| External deps in liveness | Restart loops | Use readiness instead |
| Missing request IDs | Can't trace requests | Generate and propagate |
| High-cardinality labels | Memory explosion | Limit unique values |
| Sensitive data in logs | Security risk | Sanitize before logging |

## References

- `references/java-spring.md` - Spring Boot Actuator implementation
- `../../api-design/advanced-patterns/api-observability-standards.md` - Full observability standards
- `../../api-design/advanced-patterns/api-analytics-insights.md` - Usage analytics and dashboards
