# HTTP Client Best Practices

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 16 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** HTTP fundamentals, REST API experience  
> **🎯 Key Topics:** Resilience, Error handling, Performance
> 
> **📊 Complexity:** Grade 14 • Advanced technical density • difficult

## Overview

HTTP clients make requests to remote APIs. Robust client implementations handle network failures, timeouts, and service interruptions gracefully. This guide covers patterns that make HTTP clients resilient and efficient.

Good HTTP client design provides:
- Automatic recovery from transient failures
- Protection against cascading failures
- Efficient resource usage
- Clear error handling
- Predictable behavior under load

These patterns apply to any HTTP client regardless of programming language or framework.

## Why Client Resilience Matters

### The Problem: Distributed Systems Are Unreliable

Networks fail. Services go down. Requests timeout. Distributed systems face constant challenges:

- **Network Partitions**: Connections drop unexpectedly
- **Service Outages**: Dependencies become unavailable
- **Transient Errors**: Temporary failures that resolve quickly
- **Resource Exhaustion**: Services become slow under load
- **Cascading Failures**: One failure triggers others

### The Solution: Build Resilient Clients

Resilient clients handle failures gracefully:

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| Retry with Backoff | Recover from transient failures | Temporary network issues, 5xx errors |
| Circuit Breaker | Stop calling failing services | Persistent failures, service outages |
| Timeouts | Prevent hanging requests | All HTTP operations |
| Connection Pooling | Reuse TCP connections | High request volume |
| Error Recovery | Handle failures gracefully | All scenarios |

## Retry Patterns

### When to Retry

Retry only for operations that can safely repeat:

**Safe to Retry**:
```http
GET /products/product-123 HTTP/1.1

HTTP/1.1 503 Service Unavailable
Retry-After: 30
```

**Unsafe Without Idempotency**:
```http
POST /orders HTTP/1.1
Content-Type: application/json

{
  "productId": "product-123",
  "quantity": 1
}

HTTP/1.1 500 Internal Server Error
# Should NOT retry without idempotency key
```

### Idempotent Operations

These HTTP methods are safe to retry:
- `GET`: Read operations
- `PUT`: Replace operations (when using full replacement)
- `DELETE`: Delete operations (deleting again is safe)
- `HEAD`: Metadata operations
- `OPTIONS`: Capability queries

Make `POST` idempotent using idempotency keys:

```http
POST /orders HTTP/1.1
Content-Type: application/json
Idempotency-Key: order-20240715-abc123

{
  "productId": "product-123",
  "quantity": 1
}
```

Server can detect duplicate requests using the key and return the same result.

### Retry Status Codes

Retry these HTTP status codes:

| Status Code | Meaning | Retry Strategy |
|-------------|---------|----------------|
| `408` | Request Timeout | Retry with backoff |
| `429` | Too Many Requests | Use Retry-After header |
| `500` | Internal Server Error | Retry with backoff (limit attempts) |
| `502` | Bad Gateway | Retry with backoff |
| `503` | Service Unavailable | Use Retry-After header |
| `504` | Gateway Timeout | Retry with backoff |

Do NOT retry these codes:
- `4xx` (except 408, 429): Client errors that won't resolve
- `401`, `403`: Authentication/authorization failures
- `404`: Resource not found
- `409`: Conflict that needs resolution
- `422`: Validation errors

### Exponential Backoff

Wait longer between each retry attempt. This reduces server load and improves success rates.

**Linear Backoff** (avoid this):
```
Attempt 1: Wait 1 second
Attempt 2: Wait 1 second
Attempt 3: Wait 1 second
```

**Exponential Backoff** (recommended):
```
Attempt 1: Wait 1 second
Attempt 2: Wait 2 seconds
Attempt 3: Wait 4 seconds
Attempt 4: Wait 8 seconds
Attempt 5: Wait 16 seconds
```

Formula: `wait_time = base_delay * (2 ^ attempt_number)`

### Adding Jitter

Jitter adds randomness to prevent thundering herd problems.

**Without Jitter**:
```
1000 clients all retry at exactly 2 seconds
Server experiences spike
```

**With Jitter**:
```
Client 1: Waits 1.8 seconds
Client 2: Waits 2.3 seconds
Client 3: Waits 1.5 seconds
```

Formula: `wait_time = (base_delay * 2^attempt) * random(0.5, 1.5)`

### Full Jitter Pattern

Randomize the entire backoff window:

```
Attempt 1: Random(0, 1 second)     → 0.7 seconds
Attempt 2: Random(0, 2 seconds)    → 1.2 seconds
Attempt 3: Random(0, 4 seconds)    → 2.8 seconds
Attempt 4: Random(0, 8 seconds)    → 5.1 seconds
```

This spreads retries evenly across the backoff period.

### Retry-After Header

Respect the `Retry-After` header when provided:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Please retry after 60 seconds"
}
```

Client should wait exactly 60 seconds before retrying.

Two `Retry-After` formats exist:

**Delay in Seconds**:
```http
Retry-After: 120
```

**HTTP Date**:
```http
Retry-After: Wed, 21 Oct 2025 07:28:00 GMT
```

Always prefer the header value over exponential backoff when present.

### Maximum Retry Attempts

Limit total retry attempts to prevent infinite loops:

```
Configuration:
- Maximum retries: 3
- Base delay: 1 second
- Backoff multiplier: 2

Timeline:
Request 1: Immediate     → 503 error
Request 2: Wait 1s       → 503 error
Request 3: Wait 2s       → 503 error
Request 4: Wait 4s       → 503 error
Final: Give up, return error to caller
```

Typical limits:
- Interactive requests: 2-3 retries
- Background jobs: 5-10 retries
- Critical operations: 10-15 retries

### Example Retry Sequence

Complete retry example with exponential backoff and jitter:

```http
# Initial request
GET /products/product-123 HTTP/1.1

HTTP/1.1 503 Service Unavailable
Retry-After: 5

# Wait 5 seconds (respecting Retry-After)

# Retry 1
GET /products/product-123 HTTP/1.1

HTTP/1.1 503 Service Unavailable

# Wait 1.2 seconds (1s base + jitter)

# Retry 2
GET /products/product-123 HTTP/1.1

HTTP/1.1 503 Service Unavailable

# Wait 3.7 seconds (2s * 2 + jitter)

# Retry 3
GET /products/product-123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "product-123",
  "name": "Widget"
}
```

## Circuit Breaker Pattern

### Purpose

Circuit breakers prevent calling failing services repeatedly. They "open" after detecting failures and "close" after the service recovers.

This protects:
- Client resources (threads, connections)
- Server resources (reduce load during outages)
- User experience (fail fast instead of waiting)

### Circuit States

Circuit breakers have three states:

| State | Behavior | Transitions To |
|-------|----------|----------------|
| `CLOSED` | Allow all requests | `OPEN` (after failure threshold) |
| `OPEN` | Reject all requests immediately | `HALF_OPEN` (after timeout) |
| `HALF_OPEN` | Allow limited test requests | `CLOSED` (success) or `OPEN` (failure) |

### State Transitions

**CLOSED → OPEN**:
```http
# Request 1
GET /payments/process HTTP/1.1
HTTP/1.1 500 Internal Server Error

# Request 2
GET /payments/process HTTP/1.1
HTTP/1.1 500 Internal Server Error

# Request 3
GET /payments/process HTTP/1.1
HTTP/1.1 500 Internal Server Error

# Request 4
GET /payments/process HTTP/1.1
HTTP/1.1 500 Internal Server Error

# Request 5 (failure threshold reached)
GET /payments/process HTTP/1.1
HTTP/1.1 500 Internal Server Error

# Circuit opens - subsequent requests fail immediately
Circuit State: OPEN
Error: Circuit breaker is OPEN for /payments
```

**OPEN → HALF_OPEN**:
```
Circuit State: OPEN
Time elapsed: 30 seconds (sleep window)
Circuit State: HALF_OPEN
Next request will test service availability
```

**HALF_OPEN → CLOSED**:
```http
# Test request while HALF_OPEN
GET /payments/process HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

Circuit State: CLOSED (service recovered)
```

**HALF_OPEN → OPEN**:
```http
# Test request while HALF_OPEN
GET /payments/process HTTP/1.1

HTTP/1.1 500 Internal Server Error

Circuit State: OPEN (service still failing)
Wait another 30 seconds before next test
```

### Configuration Parameters

| Parameter | Purpose | Typical Value |
|-----------|---------|---------------|
| Failure Threshold | Failures before opening | 5-10 requests |
| Success Threshold | Successes to close | 2-3 requests |
| Timeout Window | Wait before testing | 30-60 seconds |
| Volume Threshold | Minimum requests needed | 10-20 requests |
| Error Percentage | Failure rate threshold | 50% |

### Error Types to Count

Count these as failures:
- Network connection errors
- Timeouts
- HTTP 5xx errors
- HTTP 429 (Too Many Requests)
- HTTP 503 (Service Unavailable)

Ignore these:
- HTTP 4xx errors (except 429)
- Successful responses (2xx, 3xx)
- Client-side validation errors

### Circuit Breaker Response

When circuit is open, clients should receive clear errors:

```http
GET /payments/process HTTP/1.1

HTTP/1.1 503 Service Unavailable
Content-Type: application/problem+json
Retry-After: 30

{
  "type": "https://api.example.com/errors/circuit-breaker-open",
  "title": "Service Circuit Breaker Open",
  "status": 503,
  "detail": "Payment service circuit breaker is open due to recent failures",
  "retry_after": 30,
  "circuit_state": "OPEN",
  "failures_count": 8
}
```

### Per-Endpoint Circuit Breakers

Use separate circuit breakers for different endpoints:

```http
# Payment service circuit is OPEN
GET /payments/process HTTP/1.1
Error: Circuit breaker OPEN

# Product service circuit is CLOSED
GET /products/product-123 HTTP/1.1
HTTP/1.1 200 OK
```

This prevents one failing service from affecting all operations.

## Timeout Standards

### Why Timeouts Matter

Requests without timeouts can hang forever. This exhausts:
- Thread pools
- Connection pools
- Memory
- User patience

### Timeout Types

HTTP clients need multiple timeout configurations:

| Timeout Type | Purpose | Recommended Value |
|--------------|---------|-------------------|
| Connection Timeout | Establishing TCP connection | 5-10 seconds |
| Socket Timeout | Reading response data | 30-60 seconds |
| Request Timeout | Entire request/response | 60-120 seconds |

### Connection Timeout

Time allowed to establish a TCP connection:

```http
# Client attempts connection
TCP SYN → Server

# Wait for response
...5 seconds elapse...

# No response received
Connection Timeout Error
```

Use short connection timeouts (5-10 seconds) because:
- DNS resolution should be fast
- TCP handshake should complete quickly
- Long waits indicate network problems

### Socket/Read Timeout

Time allowed for server to send response data:

```http
# Connection established, request sent
GET /reports/generate HTTP/1.1

# Server starts responding
HTTP/1.1 200 OK
Content-Type: application/json

# Server stops sending data mid-response
...30 seconds of silence...

# Client gives up
Socket Timeout Error
```

Set based on expected response time:
- Simple queries: 10-30 seconds
- Complex operations: 30-60 seconds
- Long-running tasks: Use async patterns instead

### Request Timeout

Total time for complete request/response cycle:

```http
Timeline:
0s:  Start request
2s:  Connection established (within connection timeout)
5s:  Request sent
10s: Response headers received
45s: Still receiving response body
60s: Request timeout expires → abort

Error: Request exceeded 60 second timeout
```

Set higher than socket timeout to account for:
- Connection establishment
- Request transmission
- Response processing

### Timeout Hierarchy

```
Request Timeout (60s)
├── Connection Timeout (5s)
└── Socket Timeout (30s)
```

The shortest timeout that fires will cancel the request.

### Timeouts and Retries

Timeouts count as retriable failures:

```http
# Attempt 1
GET /data HTTP/1.1
Error: Read timeout after 30 seconds

# Retry 1 (after exponential backoff)
GET /data HTTP/1.1
Error: Read timeout after 30 seconds

# Retry 2
GET /data HTTP/1.1
HTTP/1.1 200 OK
```

Ensure total retry time doesn't exceed reasonable bounds:
```
Single request timeout: 30 seconds
Max retries: 3
Max total time: 30s + (30s + backoff) + (30s + backoff) + (30s + backoff)
              ≈ 2-3 minutes maximum
```

## Connection Pooling

### Why Pool Connections

Creating TCP connections is expensive:
1. DNS lookup
2. TCP handshake (3 packets)
3. TLS handshake (2-3 round trips)
4. HTTP request/response
5. Connection teardown

**Without Pooling**:
```http
Request 1: Create connection → use → close
Request 2: Create connection → use → close
Request 3: Create connection → use → close

Total overhead: 3 connection creations
```

**With Pooling**:
```http
Request 1: Create connection → use → return to pool
Request 2: Reuse connection → use → return to pool
Request 3: Reuse connection → use → return to pool

Total overhead: 1 connection creation
```

### Pool Configuration

| Parameter | Purpose | Typical Value |
|-----------|---------|---------------|
| Max Connections | Total connections allowed | 200-500 |
| Max Per Route | Connections per host | 50-100 |
| Connection TTL | Maximum connection age | 5-10 minutes |
| Idle Timeout | Close unused connections | 30-60 seconds |
| Validation Before Use | Check connection health | true |

### Connection Lifecycle

```
1. Request needs connection
2. Check pool for idle connection
3. If available:
   → Validate connection
   → Use for request
   → Return to pool
4. If not available:
   → Create new connection (if under limit)
   → Use for request
   → Return to pool
5. If at limit:
   → Wait for available connection (with timeout)
   → Or fail with error
```

### Keep-Alive Headers

Use HTTP keep-alive to reuse connections:

```http
# Client request
GET /products/product-123 HTTP/1.1
Connection: keep-alive

# Server response
HTTP/1.1 200 OK
Connection: keep-alive
Keep-Alive: timeout=60, max=100
Content-Type: application/json

{
  "id": "product-123"
}

# Connection remains open for next request
```

`Keep-Alive` parameters:
- `timeout`: Seconds server will keep connection open
- `max`: Maximum requests per connection

### Stale Connection Detection

Connections can become stale (server closed them):

```http
# Client thinks connection is alive
GET /data HTTP/1.1
← Using pooled connection

# Server already closed it
Error: Connection reset by peer

# Client should:
1. Remove stale connection from pool
2. Create new connection
3. Retry request automatically
```

Enable validation before use to detect stale connections:
```
Configuration:
- Test connections before use: true
- Validation query: Send OPTIONS or HEAD request
```

### Per-Route Limits

Limit connections per destination to prevent monopolization:

```
Pool Configuration:
- Total max connections: 200
- Max per route: 50

Scenario:
- api.example.com: Using 50 connections (at limit)
- api.other.com: Using 30 connections
- api.third.com: Using 20 connections
- Available: 100 connections

New request to api.example.com:
→ Must wait (route limit reached)

New request to api.other.com:
→ Creates new connection (under route limit)
```

## Error Recovery Strategies

### Fallback Patterns

Provide alternative responses when primary service fails:

**Static Fallback**:
```http
# Primary request fails
GET /recommendations/user-123 HTTP/1.1
Error: Service unavailable

# Return cached or default data
{
  "recommendations": [
    {"id": "default-1", "type": "popular"},
    {"id": "default-2", "type": "popular"}
  ],
  "source": "fallback",
  "reason": "recommendation service unavailable"
}
```

**Cache Fallback**:
```http
# Primary request fails
GET /products/product-123 HTTP/1.1
Error: Timeout

# Check cache for stale data
Cache-Control: stale-if-error=3600

# Return stale cached response
{
  "id": "product-123",
  "name": "Widget",
  "cached_at": "2024-07-15T10:00:00Z",
  "warning": "Data may be stale"
}
```

**Degraded Service**:
```http
# Full product details unavailable
GET /products/product-123 HTTP/1.1

# Return partial data
{
  "id": "product-123",
  "name": "Widget",
  "basic_info": {...},
  "details": null,
  "warning": "Detailed information temporarily unavailable"
}
```

### Bulkhead Pattern

Isolate resources to prevent total failure:

```
Thread Pool Configuration:
- Critical operations pool: 50 threads
- Background tasks pool: 30 threads
- Analytics pool: 20 threads

If analytics pool exhausted:
→ Only analytics fails
→ Critical operations continue working
```

**Without Bulkhead**:
```
Shared thread pool: 100 threads
Analytics requests consume all 100
→ Everything fails
```

**With Bulkhead**:
```
Analytics pool: 20 threads (isolated)
Analytics requests max out at 20
→ Critical operations continue using their 50 threads
```

### Error Context

Provide useful error information:

```http
GET /orders/order-123 HTTP/1.1

# Generic error (bad)
{
  "error": "Service error"
}

# Detailed error (good)
{
  "type": "https://api.example.com/errors/service-unavailable",
  "title": "Payment Service Unavailable",
  "status": 503,
  "detail": "Payment verification service is temporarily unavailable",
  "service": "payment-service",
  "retry_after": 30,
  "correlation_id": "req-abc123",
  "timestamp": "2024-07-15T14:30:00Z"
}
```

### Fail Fast vs Retry

Choose based on operation criticality:

**Fail Fast**:
```
Use when:
- Interactive user requests (avoid waiting)
- Non-critical operations
- Fallback available

Example: Product recommendations
→ Timeout after 2 seconds
→ Return default recommendations
```

**Retry with Backoff**:
```
Use when:
- Critical operations
- High success probability with retry
- No suitable fallback

Example: Payment processing
→ Retry up to 3 times
→ Exponential backoff
→ Alert on final failure
```

## Complete Example

This example combines multiple patterns:

```http
# Initial request with configuration:
# - Connection timeout: 5s
# - Socket timeout: 30s
# - Max retries: 3
# - Exponential backoff with jitter
# - Circuit breaker: CLOSED

GET /orders/order-123 HTTP/1.1
Connection: keep-alive

# Attempt 1: Connection timeout
Error: Connection timeout after 5 seconds
Circuit breaker: 1 failure recorded

# Wait: 1.2 seconds (1s base + jitter)

# Attempt 2: Success with pooled connection
GET /orders/order-123 HTTP/1.1
Connection: keep-alive

HTTP/1.1 200 OK
Connection: keep-alive
Keep-Alive: timeout=60, max=100
Content-Type: application/json

{
  "id": "order-123",
  "status": "COMPLETED",
  "total": 99.99
}

# Circuit breaker: Success resets failure count
# Connection: Returned to pool for reuse
```

## Best Practices Summary

### Retry Strategy

1. **Use exponential backoff** with jitter
2. **Respect Retry-After** headers
3. **Limit retry attempts** (typically 3-5)
4. **Only retry safe operations** (idempotent methods)
5. **Add idempotency keys** for POST requests

### Circuit Breaker

1. **Set appropriate thresholds** (5-10 failures)
2. **Use per-service breakers** to isolate failures
3. **Configure reasonable timeouts** (30-60 seconds)
4. **Monitor circuit state** for alerting
5. **Provide clear error messages** when open

### Timeouts

1. **Always set timeouts** (never unlimited)
2. **Use connection timeout** (5-10 seconds)
3. **Use socket/read timeout** (30-60 seconds)
4. **Set request timeout** higher than socket timeout
5. **Match timeout to operation type**

### Connection Pooling

1. **Enable connection reuse** with keep-alive
2. **Configure pool size** based on load (200-500)
3. **Set per-route limits** (50-100 per host)
4. **Validate connections** before use
5. **Close idle connections** (30-60 second timeout)

### Error Recovery

1. **Implement fallbacks** when possible
2. **Fail fast** for user-facing operations
3. **Provide error context** in responses
4. **Use bulkheads** to isolate resources
5. **Monitor and alert** on error rates

## Common Pitfalls

### Retry Without Backoff

**Wrong**:
```
Retry immediately on failure
→ Overwhelms failing service
→ Contributes to cascading failure
```

**Correct**:
```
Wait with exponential backoff
→ Gives service time to recover
→ Reduces load during outage
```

### Retrying Non-Idempotent Operations

**Wrong**:
```http
POST /orders HTTP/1.1
{"productId": "p123", "quantity": 1}

Error: Timeout
→ Retry
→ Creates duplicate order
```

**Correct**:
```http
POST /orders HTTP/1.1
Idempotency-Key: order-xyz-789
{"productId": "p123", "quantity": 1}

Error: Timeout
→ Retry with same key
→ Server deduplicates
```

### No Timeouts

**Wrong**:
```
Request without timeout
→ Can hang forever
→ Exhausts connection pool
→ Blocks other operations
```

**Correct**:
```
Connection timeout: 5 seconds
Socket timeout: 30 seconds
Request timeout: 60 seconds
→ Fails fast on problems
```

### Ignoring Retry-After

**Wrong**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

Client retries after 1 second
→ Hits rate limit again
→ Wastes retry attempts
```

**Correct**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

Client waits 60 seconds
→ Respects server guidance
→ Succeeds on retry
```

### Single Circuit Breaker for All Services

**Wrong**:
```
One circuit breaker for all APIs
→ Payment service fails
→ Circuit opens
→ All APIs become unavailable
```

**Correct**:
```
Separate circuit breakers per service
→ Payment service fails
→ Payment circuit opens
→ Other services continue working
```

## Monitoring and Observability

### Key Metrics

Track these client-side metrics:

| Metric | Purpose | Alert Threshold |
|--------|---------|-----------------|
| Success Rate | Overall health | < 95% |
| Retry Rate | Failure frequency | > 20% |
| Circuit State | Service availability | OPEN for > 5 min |
| P95 Latency | Performance | > 2x baseline |
| Timeout Rate | Slow operations | > 5% |
| Connection Pool Usage | Resource exhaustion | > 80% |

### Logging Best Practices

Log retry attempts with context:

```json
{
  "level": "warn",
  "message": "Retrying request after failure",
  "request_id": "req-abc123",
  "url": "/orders/order-123",
  "attempt": 2,
  "max_attempts": 3,
  "error": "Connection timeout",
  "backoff_seconds": 2.3,
  "circuit_state": "CLOSED"
}
```

Log circuit breaker state changes:

```json
{
  "level": "error",
  "message": "Circuit breaker opened",
  "service": "payment-service",
  "failure_count": 10,
  "failure_threshold": 5,
  "last_error": "Service unavailable",
  "next_test_at": "2024-07-15T14:31:00Z"
}
```

## Related Documentation

### HTTP Standards
- [RFC 7231](https://www.rfc-editor.org/rfc/rfc7231) - HTTP/1.1 Semantics
- [RFC 7230](https://www.rfc-editor.org/rfc/rfc7230) - Message Syntax and Routing
- [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585) - HTTP 429 Too Many Requests

### Related Topics
- [Rate Limiting](./rate-limiting.md) - Understanding server-side rate limits
- [Error Response Standards](../request-response/error-response-standards.md) - Error formats
- [Idempotency and Safety](../foundations/idempotency-and-safety.md) - Safe retry operations
- [Async Operations](./async-operations.md) - Long-running task patterns
- [Client-Side Testing](../testing/client-side-testing.md) - Testing retry logic, circuit breakers, and timeouts

### Spring Implementation
- [HTTP Client Patterns](../../../languages/spring/http-clients/http-client-patterns.md) - RestTemplate, WebClient, and Resilience4j

---

[← Back to Advanced Patterns](./README.md) | [View All API Design Guides](../README.md)
