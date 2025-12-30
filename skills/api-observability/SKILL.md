---
name: api-observability
description: Implement observability for REST APIs including health checks, metrics, distributed tracing, and request correlation. Use when adding health endpoints, exposing Prometheus metrics, implementing trace propagation, or debugging request flows across services.
---

# API Observability

<!--
SOURCE DOCUMENTS:
- api-design/advanced-patterns/API-Observability-Standards.md
- spring-design/observability/Logging and Monitoring.md
- spring-design/configuration/Observability-Configuration.md

REFERENCE FILES TO CREATE:
- references/health-checks.md (health/ready/live endpoints)
- references/metrics-tracing.md (metrics exposure, distributed tracing)
- references/correlation.md (request correlation patterns)
- references/java-spring.md (Actuator, Micrometer, MDC)
-->

## When to Use This Skill

Use this skill when you need to:
- Implement health check endpoints
- Expose metrics for monitoring
- Add distributed tracing
- Correlate requests across services
- Debug production issues
- Meet SLA/SLO requirements

## Core Principles

TODO: Extract and condense from API-Observability-Standards.md

### Health Check Endpoints
- `/health` or `/actuator/health`: Overall health
- `/health/live`: Liveness (is process running?)
- `/health/ready`: Readiness (can accept traffic?)

### Metrics
- Expose in Prometheus format at `/metrics`
- Include request latency, error rates, throughput
- Add custom business metrics
- Use consistent naming conventions

### Distributed Tracing
- Propagate trace context across services
- Use W3C Trace Context headers
- Include span IDs in logs

### Request Correlation
- Generate unique request ID if not provided
- Propagate via `X-Request-ID` or `X-Correlation-ID`
- Include in all log entries
- Return in response headers

## Quick Reference

TODO: Add observability checklist

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/health` | Overall status | `{"status": "UP"}` |
| `/health/live` | Liveness probe | `{"status": "UP"}` |
| `/health/ready` | Readiness probe | `{"status": "UP"}` |
| `/metrics` | Prometheus metrics | Text format |

### Key Metrics
- `http_requests_total`: Request count by status
- `http_request_duration_seconds`: Latency histogram
- `http_requests_in_progress`: Active requests

## Loading Additional Context

When you need deeper guidance:

- **Health check patterns**: Load `references/health-checks.md`
- **Metrics and tracing**: Load `references/metrics-tracing.md`
- **Correlation patterns**: Load `references/correlation.md`
- **Java/Spring implementation**: Load `references/java-spring.md`

## Examples

TODO: Add minimal illustrative examples

### Health Check Response
```json
{
  "status": "UP",
  "components": {
    "db": {"status": "UP"},
    "redis": {"status": "UP"},
    "diskSpace": {"status": "UP"}
  }
}
```

### Correlation Headers
```
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

### Prometheus Metrics
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/orders",status="200"} 1234

# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 500
http_request_duration_seconds_bucket{le="0.5"} 900
```

## Anti-Patterns

TODO: Extract from source documents

- Health check that calls external dependencies (use readiness)
- Missing correlation IDs in logs
- No metrics on error rates
- Exposing sensitive data in health details
- Not propagating trace context
- Blocking health checks on slow operations
