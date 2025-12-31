# HTTP Client Best Practices

> **Reading Guide**
> 
> **Reading Time:** 9 minutes | **Level:** Intermediate
> 
> **Prerequisites:** Basic HTTP knowledge, familiarity with API consumption  
> **Key Topics:** Retries, timeouts, circuit breakers, connection management
> 
> **Complexity:** Grade 13.5 | 1.3% technical density

## Overview

Building reliable API clients requires more than making HTTP requests. Networks fail, servers overload, and responses time out. This guide covers patterns that make HTTP clients resilient, efficient, and well-behaved.

These patterns apply to any HTTP client in any programming language. The focus is on the concepts and HTTP-level behavior, not specific implementations.

## Retry Patterns

### When to Retry

Not all failures deserve a retry. Retrying the wrong requests wastes resources and can cause problems.

| Status Code | Retry? | Reason |
|-------------|--------|--------|
| 408 Request Timeout | Yes | Server didn't receive the request in time |
| 429 Too Many Requests | Yes | Rate limited; wait and retry |
| 500 Internal Server Error | Maybe | Server error; might be temporary |
| 502 Bad Gateway | Yes | Upstream server issue; often temporary |
| 503 Service Unavailable | Yes | Server overloaded; should recover |
| 504 Gateway Timeout | Yes | Upstream timeout; might work on retry |
| 400 Bad Request | No | Client error; retry won't help |
| 401 Unauthorized | No | Authentication issue; fix credentials first |
| 403 Forbidden | No | Permission denied; retry won't help |
| 404 Not Found | No | Resource doesn't exist; retry won't help |
| 409 Conflict | No | Business logic conflict; needs resolution |
| 422 Unprocessable Entity | No | Validation error; fix the request |

### Network Errors to Retry

| Error Type | Retry? | Notes |
|------------|--------|-------|
| Connection refused | Yes | Server might be restarting |
| Connection reset | Yes | Network interruption |
| DNS resolution failure | Maybe | Might be temporary; limit retries |
| SSL/TLS handshake failure | No | Usually a configuration issue |
| Read timeout | Yes | Server might be slow |
| Write timeout | Maybe | Request might have reached server |

### Idempotency Matters

Before retrying, consider whether the operation is safe to repeat.

**Safe to retry (idempotent):**
- GET requests (reading data)
- PUT requests (replacing data)
- DELETE requests (removing data)
- HEAD requests (checking headers)

**Unsafe to retry without care:**
- POST requests (creating data)
- PATCH requests (partial updates with relative changes)

For non-idempotent operations, use idempotency keys:

```http
POST /v1/payments HTTP/1.1
Content-Type: application/json
Idempotency-Key: pay-req-550e8400-e29b-41d4-a716

{
  "amount": 100.00,
  "currency": "USD"
}
```

The server uses this key to detect duplicate requests and return the same response.

### Maximum Retry Limits

Set limits to prevent infinite retry loops:

| Scenario | Recommended Max Retries |
|----------|------------------------|
| Critical operations | 3-5 retries |
| Background tasks | 5-10 retries |
| Real-time operations | 1-2 retries |
| Batch processing | 3 retries per item |

## Exponential Backoff

### The Algorithm

Exponential backoff increases wait time between retries. This prevents overwhelming a recovering server.

```
Wait time = base_delay × (2 ^ attempt_number)

Attempt 1: 1 second  (1 × 2^0)
Attempt 2: 2 seconds (1 × 2^1)
Attempt 3: 4 seconds (1 × 2^2)
Attempt 4: 8 seconds (1 × 2^3)
Attempt 5: 16 seconds (1 × 2^4)
```

### Adding Jitter

Without jitter, many clients retry at the same moment. This creates "thundering herd" problems. Add randomness to spread out retries.

**Full jitter** (recommended):
```
Wait time = random(0, base_delay × 2^attempt)
```

**Equal jitter**:
```
half = (base_delay × 2^attempt) / 2
Wait time = half + random(0, half)
```

### Recommended Values

| Parameter | Value | Reason |
|-----------|-------|--------|
| Base delay | 1 second | Starting point for backoff |
| Maximum delay | 30-60 seconds | Prevent excessively long waits |
| Maximum retries | 3-5 | Limit total time spent retrying |
| Jitter | Full jitter | Best distribution of retry times |

### Respecting Retry-After

When a server sends a `Retry-After` header, use it instead of calculating backoff:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Try again in 45 seconds"
}
```

The client should wait at least 45 seconds before retrying.

## Circuit Breaker Pattern

### Purpose

Circuit breakers prevent cascading failures. When a service fails repeatedly, stop sending requests. This gives the service time to recover and prevents wasting resources on doomed requests.

### States

```
                    Success threshold met
                   ┌──────────────────────┐
                   │                      │
                   ▼                      │
    ┌─────────┐ Failures exceed   ┌──────────────┐
    │ CLOSED  │ ──────────────────►   OPEN       │
    │ (Normal)│    threshold      │(Blocking)    │
    └─────────┘                   └──────────────┘
         ▲                               │
         │                               │ Timeout expires
         │                               ▼
         │                        ┌──────────────┐
         └────────────────────────│  HALF-OPEN   │
              Success             │  (Testing)   │
                                  └──────────────┘
```

| State | Behavior | Transitions |
|-------|----------|-------------|
| Closed | Requests flow normally | Opens after failure threshold |
| Open | Requests fail immediately | Half-opens after timeout |
| Half-Open | Limited test requests | Closes on success, opens on failure |

### Threshold Settings

| Parameter | Recommended Value | Purpose |
|-----------|-------------------|---------|
| Failure threshold | 5 failures | Consecutive failures to open circuit |
| Failure rate threshold | 50% | Percentage of failures in window |
| Evaluation window | 10 seconds | Time window for counting failures |
| Open duration | 30 seconds | Time before testing recovery |
| Half-open requests | 3 requests | Test requests before closing |

### HTTP Signals for Circuit Breakers

Use HTTP status codes to inform circuit breaker decisions:

| Status Code | Circuit Impact |
|-------------|----------------|
| 5xx errors | Count as failures |
| 429 Too Many Requests | Count as failures |
| Timeouts | Count as failures |
| 4xx client errors | Usually don't count (client's fault) |
| 2xx success | Count toward closing circuit |

### Failing Fast

When the circuit is open, return errors immediately:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/service-unavailable",
  "title": "Service Temporarily Unavailable",
  "status": 503,
  "detail": "The upstream service is currently unavailable. Please retry later.",
  "retryAfter": 30
}
```

## Timeout Standards

### Types of Timeouts

| Timeout Type | Purpose | Recommended Value |
|--------------|---------|-------------------|
| Connection timeout | Time to establish connection | 5-10 seconds |
| Read timeout | Time waiting for response data | 30 seconds |
| Write timeout | Time sending request data | 30 seconds |
| Total request timeout | Maximum time for entire operation | 60 seconds |

### Timeout Guidelines by Operation Type

| Operation Type | Total Timeout | Notes |
|----------------|---------------|-------|
| Health checks | 5 seconds | Fast response expected |
| Simple reads | 10-30 seconds | Standard API calls |
| Complex queries | 30-60 seconds | Reports, aggregations |
| File uploads | 5 minutes | Depends on file size |
| Bulk operations | 5-30 minutes | Progress feedback recommended |
| Streaming | None (use heartbeats) | Use heartbeat timeouts instead |

### Timeout Error Handling

When a timeout occurs, the request state is unknown. The server might have:
- Never received the request
- Received and processed it successfully
- Received but failed to respond

For non-idempotent operations, use idempotency keys to safely retry after timeouts.

## Connection Management

### Keep-Alive Connections

Reusing connections improves performance by avoiding repeated TCP handshakes.

```http
GET /v1/orders HTTP/1.1
Host: api.example.com
Connection: keep-alive
```

| Parameter | Recommended Value | Purpose |
|-----------|-------------------|---------|
| Keep-alive timeout | 60-120 seconds | How long to keep idle connections |
| Maximum idle connections | 10-100 | Pool size depends on load |
| Maximum connections per host | 6-20 | Prevent overwhelming single hosts |

### Connection Pooling Concepts

Connection pools manage reusable connections:

1. **Pool sizing**: Match pool size to expected concurrent requests
2. **Idle timeout**: Close connections that sit unused too long
3. **Validation**: Test connections before reusing them
4. **Overflow**: Handle bursts with temporary extra connections

### HTTP/2 Multiplexing

HTTP/2 sends multiple requests over a single connection:

| Feature | HTTP/1.1 | HTTP/2 |
|---------|----------|--------|
| Requests per connection | 1 at a time | Many concurrent |
| Head-of-line blocking | Yes | No |
| Connection count needed | Many | Few |
| Header compression | No | Yes |

With HTTP/2, you need fewer connections. One or two connections per host often suffice.

### DNS Caching

DNS lookups add latency. Cache DNS results appropriately:

| Scenario | TTL Recommendation |
|----------|-------------------|
| Stable services | Follow DNS TTL (often 60-300 seconds) |
| Load-balanced services | Short TTL (30-60 seconds) |
| Failover scenarios | Very short TTL (5-15 seconds) |

## Error Recovery Strategies

### Distinguishing Error Types

| Error Category | Response | Example |
|----------------|----------|---------|
| Transient (5xx, timeouts) | Retry with backoff | 503 Service Unavailable |
| Rate limiting (429) | Wait for Retry-After | 429 Too Many Requests |
| Client errors (4xx) | Fix request, don't retry | 400 Bad Request |
| Permanent failures | Alert and fail | 404 Not Found |

### Fallback Strategies

When the primary approach fails, have alternatives ready:

| Strategy | Use Case | Example |
|----------|----------|---------|
| Cached data | Read operations | Return stale data with warning |
| Default values | Non-critical data | Use defaults when service unavailable |
| Degraded response | Partial failures | Return available data, mark missing |
| Alternative service | Redundant systems | Switch to backup service |
| Queue for later | Write operations | Store locally, sync when available |

### Graceful Degradation Response

When providing degraded responses, communicate clearly:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Data-Freshness: stale
X-Cache-Age: 3600

{
  "data": {
    "id": "order-123",
    "status": "PROCESSING"
  },
  "meta": {
    "dataFreshness": "stale",
    "cachedAt": "2024-01-15T10:00:00Z",
    "reason": "Upstream service temporarily unavailable"
  }
}
```

## Request Hedging

### What is Hedging?

Hedging sends the same request to multiple servers or sends a second request if the first is slow. Use the first successful response and cancel the others.

### When to Use

| Scenario | Hedge? | Reason |
|----------|--------|--------|
| Latency-critical reads | Yes | Faster response matters |
| Idempotent operations | Yes | Safe to duplicate |
| High-availability requirements | Yes | Redundancy improves reliability |
| Non-idempotent writes | No | Risk of duplicate operations |
| Rate-limited APIs | No | Wastes quota |
| Expensive operations | No | Wastes server resources |

### Hedging Strategy

```
1. Send initial request
2. Start timer (typically P50 latency)
3. If no response before timer:
   - Send hedge request to different server
4. Use first successful response
5. Cancel remaining requests
```

### Cancellation

When one request succeeds, cancel the others to save resources:

```http
GET /v1/orders/123 HTTP/1.1
Host: api.example.com
X-Request-ID: req-abc123
```

If hedging, use the same request ID. Servers can detect and deduplicate.

## Client-Side Rate Limiting

### Why Limit Yourself?

Self-imposed rate limiting prevents hitting server limits. This results in:
- More predictable performance
- Fewer 429 errors
- Better relationship with API providers
- Smoother traffic patterns

### Monitoring Server Limits

Track rate limit headers to stay within bounds:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1705320000
```

When remaining requests drop low, slow down proactively.

### Preemptive Throttling

| Remaining Percentage | Action |
|---------------------|--------|
| > 50% | Normal operation |
| 25-50% | Reduce request rate by 25% |
| 10-25% | Reduce request rate by 50% |
| < 10% | Queue non-critical requests |
| 0% | Wait for reset |

### Request Prioritization

When throttling, prioritize important requests:

| Priority | Request Type | Example |
|----------|--------------|---------|
| Critical | User-facing operations | Checkout, login |
| High | Core functionality | Order status, search |
| Normal | Standard operations | List products |
| Low | Background tasks | Analytics, reports |

## Best Practices Summary

### Retry Checklist

- [ ] Only retry appropriate status codes (5xx, 429, 408)
- [ ] Use exponential backoff with jitter
- [ ] Set maximum retry limits
- [ ] Respect Retry-After headers
- [ ] Use idempotency keys for unsafe operations

### Timeout Checklist

- [ ] Set connection timeouts (5-10 seconds)
- [ ] Set read timeouts appropriate to operation
- [ ] Set total request timeouts
- [ ] Handle timeout errors appropriately

### Resilience Checklist

- [ ] Implement circuit breakers for external dependencies
- [ ] Plan fallback strategies for critical paths
- [ ] Monitor and log failures for analysis
- [ ] Test failure scenarios regularly

### Connection Checklist

- [ ] Enable connection pooling
- [ ] Configure appropriate pool sizes
- [ ] Use HTTP/2 when available
- [ ] Set idle connection timeouts

## Related Documentation

- [Rate Limiting Standards](../security/rate-limiting-standards.md) - Server-side rate limiting and headers
- [Error Response Standards](error-response-standards.md) - Understanding error responses
- [Streaming APIs](streaming-apis.md) - Handling streaming connections
- [Security Standards](../security/security-standards.md) - Authentication for API clients
