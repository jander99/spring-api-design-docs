# HTTP Observability Endpoints

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** REST API fundamentals  
> **🎯 Key Topics:** Health checks, metrics endpoints, rate limiting headers
> 
> **📊 Complexity:** 12.0 grade level • intermediate

## Overview

HTTP observability endpoints expose system health and metrics through REST APIs. This guide covers standard HTTP endpoints for health checks, readiness probes, and metrics exposure.

For comprehensive observability practices including distributed tracing, structured logging, and performance monitoring, see [Observability Standards](../../observability/observability-standards.md).

## Health Check Endpoints

### Primary Health Endpoint

**GET /health**
- **Purpose**: Overall application health status
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

### Kubernetes Health Probes

**GET /health/live**
- **Purpose**: Liveness probe - determines if container should be restarted
- **Criteria**: Basic application startup and fundamental functionality

**GET /health/ready** 
- **Purpose**: Readiness probe - determines if container can accept traffic
- **Criteria**: All dependencies available and service ready

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

#### Standard Schema

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
| UP | All components healthy | 200 |
| DOWN | Critical component failure | 503 |
| DEGRADED | Partial functionality | 200 |

### Dependency Health Examples

#### Database Health

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

#### External Service Health

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

### Prometheus Metrics Endpoint

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

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",endpoint="/v1/orders",le="0.1"} 1089
http_request_duration_seconds_bucket{method="GET",endpoint="/v1/orders",le="0.5"} 1234
```

For detailed metrics collection, formats, naming conventions, and monitoring practices, see [Observability Standards](../../observability/observability-standards.md).

## Rate Limiting Headers

### Standard Rate Limit Headers

Rate limiting information is communicated through HTTP response headers.

**X-RateLimit-Limit**
- **Purpose**: Maximum requests allowed per time window
- **Example**: `X-RateLimit-Limit: 1000`

**X-RateLimit-Remaining**
- **Purpose**: Requests remaining in current window  
- **Example**: `X-RateLimit-Remaining: 742`

**X-RateLimit-Reset**
- **Purpose**: Time when rate limit resets
- **Format**: Unix timestamp
- **Example**: `X-RateLimit-Reset: 1642251600`

### Rate Limit Response Examples

#### Successful Request

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 742
X-RateLimit-Reset: 1642251600
Content-Type: application/json

{
  "data": {...}
}
```

#### Rate Limit Exceeded

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

## Implementation Guidelines

### Health Check Best Practices

1. **Fast Response**: Health checks complete in under 1 second
2. **Meaningful Checks**: Test actual dependencies, not just server availability
3. **Avoid Cascading Failures**: Use circuit breakers for external service checks
4. **Separate Liveness and Readiness**: Liveness for restart decisions, readiness for traffic routing

### Metrics Endpoint Security

1. **Require Authentication**: Protect metrics endpoints in production
2. **Sanitize Data**: Never expose sensitive information in metrics
3. **Rate Limiting**: Prevent metrics endpoint abuse
4. **Access Control**: Limit access based on role

## Related Standards

- [Observability Standards](../../observability/observability-standards.md) - Comprehensive observability practices
- [Error Response Standards](../request-response/error-response-standards.md) - Error handling and RFC 9457
- [Security Standards](../security/security-standards.md) - Authentication and authorization
- [Performance Standards](./performance-standards.md): Server-Timing headers, percentile tracking, and performance budgets

This guide provides HTTP endpoint patterns for exposing observability data. For detailed monitoring, logging, and tracing practices, refer to the comprehensive Observability Standards guide.
