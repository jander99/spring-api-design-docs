# Request Correlation Examples

> **Reading Guide**
> - **Reading Time**: 4 minutes
> - **For**: Developers implementing distributed tracing
> - **Prerequisites**: Basic REST API knowledge
> - **Reading Level**: Grade 11.1 (Flesch: 34.8)

This document provides HTTP examples for request correlation and distributed tracing.

## Correlation ID Headers

Every API request should include a correlation ID for tracing.

### Client Request with Correlation ID

```http
POST /orders HTTP/1.1
Host: api.example.com
Content-Type: application/json
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
X-Request-ID: req-abc123

{
  "productId": "prod-456",
  "quantity": 2
}
```

### Server Response with Correlation ID

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
X-Request-ID: req-abc123

{
  "orderId": "ord-789",
  "status": "created"
}
```

## Server-Generated Correlation ID

When the client doesn't provide a correlation ID, the server generates one.

### Client Request (No Correlation ID)

```http
GET /orders/ord-789 HTTP/1.1
Host: api.example.com
Accept: application/json
```

### Server Response (Generated Correlation ID)

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Correlation-ID: 7b3e1c2a-9f4d-4e5b-8c6a-1d2e3f4a5b6c

{
  "orderId": "ord-789",
  "status": "processing"
}
```

## W3C Trace Context

For distributed tracing, use W3C Trace Context headers.

### Request with Trace Context

```http
GET /orders/ord-789/items HTTP/1.1
Host: api.example.com
Accept: application/json
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
tracestate: vendor1=value1,vendor2=value2
```

### Response with Trace Context

```http
HTTP/1.1 200 OK
Content-Type: application/json
traceparent: 00-0af7651916cd43dd8448eb211c80319c-00f067aa0ba902b7-01
tracestate: vendor1=value1,vendor2=value2

{
  "items": [
    { "productId": "prod-456", "quantity": 2 }
  ]
}
```

## Trace Context Header Format

The `traceparent` header follows this format:

```
version-traceid-parentid-flags
```

| Field | Size | Description |
|-------|------|-------------|
| version | 2 hex | Always "00" for current version |
| trace-id | 32 hex | Unique trace identifier |
| parent-id | 16 hex | Parent span identifier |
| flags | 2 hex | Trace flags (01 = sampled) |

## Error Response with Correlation

Error responses must include the correlation ID for debugging.

### Error Response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000

{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "The quantity must be greater than zero",
  "instance": "/orders",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Correlation in Log Messages

Include correlation IDs in all log entries.

### Log Format Example (JSON)

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "INFO",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "requestId": "req-abc123",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spanId": "b7ad6b7169203331",
  "service": "order-service",
  "message": "Order created successfully",
  "orderId": "ord-789"
}
```

## Multi-Service Trace Example

When a request spans multiple services, each service propagates the trace context.

### Trace Flow

```
Client
  │
  ▼ X-Correlation-ID: abc-123
┌─────────────────┐
│  API Gateway    │  traceparent: 00-trace123-span001-01
└────────┬────────┘
         │
         ▼ X-Correlation-ID: abc-123
┌─────────────────┐
│  Order Service  │  traceparent: 00-trace123-span002-01
└────────┬────────┘
         │
         ▼ X-Correlation-ID: abc-123
┌─────────────────┐
│ Payment Service │  traceparent: 00-trace123-span003-01
└─────────────────┘
```

## Common Header Names

| Header | Purpose | Standard |
|--------|---------|----------|
| `X-Correlation-ID` | Business transaction ID | Custom (widely adopted) |
| `X-Request-ID` | Single request identifier | Custom (widely adopted) |
| `traceparent` | Distributed trace context | W3C Trace Context |
| `tracestate` | Vendor-specific trace data | W3C Trace Context |

## Best Practices

1. **Always return correlation IDs**: Echo back any correlation ID received
2. **Generate when missing**: Create a new correlation ID if client doesn't provide one
3. **Use UUIDs**: Correlation IDs should be universally unique
4. **Propagate across services**: Pass correlation headers to downstream calls
5. **Include in logs**: Add correlation ID to every log entry
6. **Include in errors**: Return correlation ID in error responses for debugging

## Related Documentation

- [API Observability Standards](../../api-observability-standards.md)
- [Error Response Standards](../../../request-response/error-response-standards.md)
