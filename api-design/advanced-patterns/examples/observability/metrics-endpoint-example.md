# Metrics Endpoint Examples

> **Reading Guide**
> - **Reading Time**: 4 minutes
> - **For**: Developers implementing metrics endpoints
> - **Prerequisites**: Basic HTTP knowledge
> - **Reading Level**: Grade 11.3 (Flesch: 27.9)

This document provides HTTP/JSON examples for API metrics endpoints.

## Metrics Discovery Endpoint

### Request

```http
GET /metrics HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer <admin-token>
```

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "availableMetrics": [
    "http.server.requests",
    "http.server.requests.active",
    "jvm.memory.used",
    "db.pool.active",
    "cache.hits",
    "cache.misses"
  ],
  "_links": {
    "self": { "href": "/metrics" },
    "http.server.requests": { "href": "/metrics/http.server.requests" }
  }
}
```

## Specific Metric Endpoint

### Request

```http
GET /metrics/http.server.requests HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer <admin-token>
```

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "name": "http.server.requests",
  "description": "HTTP request metrics",
  "baseUnit": "seconds",
  "measurements": [
    { "statistic": "COUNT", "value": 15234 },
    { "statistic": "TOTAL_TIME", "value": 1523.4 },
    { "statistic": "MAX", "value": 2.5 }
  ],
  "availableTags": [
    { "tag": "method", "values": ["GET", "POST", "PUT", "DELETE"] },
    { "tag": "status", "values": ["200", "201", "400", "404", "500"] },
    { "tag": "uri", "values": ["/orders", "/orders/{id}", "/products"] }
  ]
}
```

## Filtered Metric Request

Filter metrics by tag values using query parameters.

### Request

```http
GET /metrics/http.server.requests?tag=method:GET&tag=status:200 HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer <admin-token>
```

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "name": "http.server.requests",
  "measurements": [
    { "statistic": "COUNT", "value": 8521 },
    { "statistic": "TOTAL_TIME", "value": 425.5 },
    { "statistic": "MAX", "value": 1.2 }
  ],
  "appliedTags": [
    { "tag": "method", "value": "GET" },
    { "tag": "status", "value": "200" }
  ]
}
```

## Common API Metrics

### Request Rate

```json
{
  "name": "api.requests.rate",
  "description": "Requests per second",
  "measurements": [
    { "statistic": "RATE", "value": 150.5 }
  ]
}
```

### Response Time Percentiles

```json
{
  "name": "api.response.time",
  "description": "Response time distribution",
  "baseUnit": "milliseconds",
  "measurements": [
    { "statistic": "P50", "value": 45 },
    { "statistic": "P95", "value": 120 },
    { "statistic": "P99", "value": 250 }
  ]
}
```

### Error Rate

```json
{
  "name": "api.errors.rate",
  "description": "Error rate by type",
  "measurements": [
    { "tag": "type", "value": "client_error", "rate": 0.02 },
    { "tag": "type", "value": "server_error", "rate": 0.001 }
  ]
}
```

## Prometheus Format

APIs may also expose metrics in Prometheus format.

### Request

```http
GET /metrics/prometheus HTTP/1.1
Host: api.example.com
Accept: text/plain
Authorization: Bearer <admin-token>
```

### Response

```http
HTTP/1.1 200 OK
Content-Type: text/plain; version=0.0.4

# HELP http_server_requests_seconds HTTP request metrics
# TYPE http_server_requests_seconds summary
http_server_requests_seconds_count{method="GET",status="200",uri="/orders"} 5234
http_server_requests_seconds_sum{method="GET",status="200",uri="/orders"} 261.7
http_server_requests_seconds{method="GET",status="200",uri="/orders",quantile="0.5"} 0.045
http_server_requests_seconds{method="GET",status="200",uri="/orders",quantile="0.95"} 0.12
http_server_requests_seconds{method="GET",status="200",uri="/orders",quantile="0.99"} 0.25
```

## Metrics Response Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "measurements"],
  "properties": {
    "name": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "baseUnit": {
      "type": "string"
    },
    "measurements": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["statistic", "value"],
        "properties": {
          "statistic": { "type": "string" },
          "value": { "type": "number" }
        }
      }
    },
    "availableTags": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "tag": { "type": "string" },
          "values": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

## Best Practices

1. **Secure metrics endpoints**: Require authentication for detailed metrics
2. **Limit cardinality**: Avoid high-cardinality tags (like user IDs)
3. **Use consistent naming**: Follow a naming convention (e.g., `domain.action.unit`)
4. **Include units**: Always specify the base unit for measurements
5. **Document custom metrics**: Describe what each metric represents

## Related Documentation

- [API Observability Standards](../../api-observability-standards.md)
- [Health Check Examples](health-check-example.md)
