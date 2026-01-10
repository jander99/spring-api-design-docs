# Request Correlation and Trace Propagation

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 12 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, distributed systems basics  
> **🎯 Key Topics:** W3C Trace Context, Correlation IDs, Request IDs, Log Correlation
> 
> **📊 Complexity:** 11.5 grade level • 1.0% technical density • fairly difficult

## Overview

In distributed systems, a single user action often triggers a chain of requests across multiple microservices. Request correlation is the practice of attaching unique identifiers to these requests to track their end-to-end journey.

Effective correlation is critical for:
- **Debugging**: Pinpointing where a failure occurred in a complex call chain.
- **Observability**: Reconstructing the flow of requests across service boundaries.
- **Performance Analysis**: Measuring latency at each hop of a distributed transaction.
- **Incident Investigation**: Correlating logs from multiple services to understand a single event.

## Core Identification Patterns

Three primary identifiers are used to provide full visibility into distributed systems.

| Identifier | Header | Scope | Lifecycle |
|------------|--------|-------|-----------|
| **Trace ID** | `traceparent` | Entire distributed transaction | Persists across all service boundaries |
| **Request ID** | `X-Request-ID` | Single HTTP request/response | Unique per network hop |
| **Correlation ID** | `X-Correlation-ID` | Business transaction | Groups multiple related operations |

### Trace ID (Distributed Context)
The Trace ID is the primary identifier for distributed tracing. It links every operation triggered by an initial request, regardless of how many services it touches. Modern systems use the **W3C Trace Context** standard for this purpose.

### Request ID (Hop Context)
A Request ID identifies a specific request-response pair between two components (e.g., Client to Gateway, or Gateway to Service). It is useful for identifying specific network issues or retries.

### Correlation ID (Business Context)
While often used interchangeably with Trace ID, a Correlation ID specifically groups related but distinct operations that belong to the same high-level business process (e.g., a multi-step checkout process or a batch job).

## W3C Trace Context Standards

The [W3C Trace Context](https://www.w3.org/TR/trace-context/) specification defines a standard for HTTP headers to propagate tracing context across service boundaries.

### The `traceparent` Header

The `traceparent` header contains all the information required to identify a trace and the current span's position.

**Format:** `version-trace_id-parent_id-trace_flags`

| Component | Format | Description |
|-----------|--------|-------------|
| `version` | 2 hex chars | Currently `00` |
| `trace_id` | 32 hex chars | 128-bit unique identifier for the entire trace |
| `parent_id` | 16 hex chars | 64-bit identifier for the caller's span |
| `trace_flags` | 2 hex chars | Bitmask for flags (e.g., `01` for sampled) |

**Example:**
```http
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

### The `tracestate` Header

The `tracestate` header carries vendor-specific contextual information, allowing different tracing systems to interoperate.

**Example:**
```http
tracestate: congo=t61rcWkgMzE,rojo=00f067aa0ba902b7
```

## Implementation Patterns

### 1. Ingress & Gateway Layer

The API Gateway is the entry point and is responsible for initializing the correlation context if it is missing.

- **Generation**: If `traceparent` or `X-Request-ID` are missing, the gateway must generate them using cryptographically strong random values (UUID v4).
- **Validation**: Ensure incoming IDs meet format requirements to prevent log injection attacks.
- **Injection**: Add headers to the upstream request before forwarding to internal services.

### 2. Service-to-Service Propagation

Every internal service must propagate the received headers to any downstream calls it makes.

- **Context Extraction**: Read tracing headers from the incoming request.
- **Context Storage**: Store the IDs in a thread-local or asynchronous context (e.g., MDC in Java, AsyncLocalStorage in Node.js).
- **Downstream Injection**: When calling another service, create a new `parent_id` (representing the current service's span) while preserving the `trace_id`.

### 3. Response Header Echoing

For client-side debugging, services should return correlation identifiers in the HTTP response headers.

```http
HTTP/1.1 200 OK
X-Request-ID: req-550e8400-e29b-41d4-a716-446655440000
X-Correlation-ID: corr-123e4567-e89b-12d3-a456-426614174000
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

## Logging Integration

Correlation IDs are only useful if they appear in your logs. Structured logging ensures these IDs are searchable and indexable.

### Structured Log Example

Every log entry should include the available correlation context:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "INFO",
  "message": "Processing payment",
  "trace_id": "0af7651916cd43dd8448eb211c80319c",
  "span_id": "b7ad6b7169203331",
  "request_id": "req-550e8400-e29b-41d4-a716-446655440000",
  "correlation_id": "corr-123e4567-e89b-12d3-a456-426614174000",
  "service": "payment-service",
  "user_id": "user-123"
}
```

### Logging Best Practices

1. **Automatic Injection**: Use logging middleware to automatically add correlation IDs to every log statement (MDC pattern).
2. **Standard Keys**: Use consistent field names (`trace_id`, `request_id`) across all services to enable cross-service log searching.
3. **Log Sanitization**: Ensure IDs themselves do not contain sensitive data.

## Error Correlation

When an API returns an error, providing the correlation IDs to the client allows them to provide a specific "reference code" when contacting support.

Following the **RFC 9457 (Problem Details)** standard:

```json
{
  "type": "https://api.example.com/problems/payment-failed",
  "title": "Payment Processing Failed",
  "status": 500,
  "detail": "The upstream payment provider timed out.",
  "instance": "/v1/orders/123/payments",
  "request_id": "req-550e8400-e29b-41d4-a716-446655440000",
  "trace_id": "0af7651916cd43dd8448eb211c80319c"
}
```

## Propagation Examples

### Scenario: Order Creation Flow

1. **User Client** sends a request to the **API Gateway**.
2. **API Gateway** generates a `trace_id` and `request_id`.
3. **API Gateway** calls **Order Service**.
4. **Order Service** calls **Inventory Service**.

#### Ingress Request (from Client to Gateway)
```http
POST /v1/orders HTTP/1.1
Host: api.example.com
```

#### Upstream Request (from Gateway to Order Service)
```http
POST /v1/orders HTTP/1.1
X-Request-ID: req-abc-123
X-Correlation-ID: corr-xyz-789
traceparent: 00-trace-001-span-gateway-01
```

#### Downstream Request (from Order Service to Inventory Service)
```http
GET /v1/products/p-100 HTTP/1.1
X-Request-ID: req-def-456 (new ID for this hop)
X-Correlation-ID: corr-xyz-789 (preserved)
traceparent: 00-trace-001-span-order-01 (preserved trace, new span)
```

## Security Considerations

- **ID Length Limits**: Enforce maximum lengths for correlation headers to prevent resource exhaustion or buffer overflow attacks.
- **Randomness**: Use UUID v4 or higher to ensure IDs are unguessable and don't leak information about system state or time.
- **Header Stripping**: Strip sensitive internal-only headers (like `X-Internal-Debug-ID`) at the gateway before sending the response to the client.
- **Log Injection**: Sanitize correlation IDs before logging to prevent attackers from injecting fake log entries via header manipulation.

## Related Standards

- [Observability Standards](../../observability/observability-standards.md) - Full monitoring and tracing guide
- [Error Response Standards](../request-response/error-response-standards.md) - Error handling and RFC 9457
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/context/propagation/) - Standard for distributed context propagation
