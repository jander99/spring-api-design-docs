# Health Check API Examples

> **Reading Guide**
> - **Reading Time**: 3 minutes
> - **For**: Developers implementing health check endpoints
> - **Prerequisites**: Basic HTTP knowledge
> - **Reading Level**: Grade 9.1 (Flesch: 42.5)

This document provides HTTP/JSON examples for health check endpoints.

## Basic Health Endpoint

### Request

```http
GET /health HTTP/1.1
Host: api.example.com
Accept: application/json
```

### Response - Healthy

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Response - Unhealthy

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "status": "DOWN",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Detailed Health Endpoint

For internal monitoring, provide component-level health details.

### Request

```http
GET /health/detailed HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer <admin-token>
```

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00Z",
  "components": {
    "database": {
      "status": "UP",
      "details": {
        "type": "PostgreSQL",
        "responseTime": "12ms"
      }
    },
    "cache": {
      "status": "UP",
      "details": {
        "type": "Redis",
        "responseTime": "2ms"
      }
    },
    "messageQueue": {
      "status": "UP",
      "details": {
        "type": "RabbitMQ",
        "pendingMessages": 42
      }
    }
  }
}
```

## Liveness vs Readiness

### Liveness Probe

Indicates whether the application is running. Failure means the container should restart.

```http
GET /health/live HTTP/1.1
Host: api.example.com
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "UP"
}
```

### Readiness Probe

Indicates whether the application can handle requests. Failure means traffic should stop routing to this instance.

```http
GET /health/ready HTTP/1.1
Host: api.example.com
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "UP",
  "checks": {
    "database": "UP",
    "cache": "UP"
  }
}
```

## Health Check Response Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["status"],
  "properties": {
    "status": {
      "type": "string",
      "enum": ["UP", "DOWN", "DEGRADED"]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "components": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["status"],
        "properties": {
          "status": {
            "type": "string",
            "enum": ["UP", "DOWN", "DEGRADED"]
          },
          "details": {
            "type": "object"
          }
        }
      }
    }
  }
}
```

## Best Practices

1. **Public endpoint**: Return minimal info (just status)
2. **Authenticated endpoint**: Include component details for debugging
3. **Response codes**: Use 200 for UP, 503 for DOWN
4. **Timeouts**: Health checks should respond within 5 seconds
5. **Caching**: Consider short TTL caching to reduce load

## Related Documentation

- [API Observability Standards](../../api-observability-standards.md)
- [Error Response Standards](../../../request-response/error-response-standards.md)
