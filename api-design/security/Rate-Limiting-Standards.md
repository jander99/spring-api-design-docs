# Rate Limiting & API Protection Standards

> **Reading Guide**
> 
> **Reading Time:** 8 minutes | **Level:** Intermediate
> 
> **Prerequisites:** Basic HTTP knowledge, understanding of API security  
> **Key Topics:** Rate limiting, throttling, API protection

## Overview

Rate limiting protects APIs from abuse and ensures fair access for all clients. This document covers standards for implementing rate limits and communicating them to API consumers.

## Why Rate Limiting?

Rate limiting serves several purposes:

1. **Protect infrastructure** - Prevent server overload
2. **Ensure fairness** - Share resources among all clients
3. **Prevent abuse** - Stop malicious or buggy clients
4. **Control costs** - Limit expensive operations
5. **Maintain quality** - Keep response times fast

## Rate Limiting Strategies

### Fixed Window

Count requests in fixed time periods (e.g., per minute).

```
Window: 12:00:00 - 12:00:59
Limit: 100 requests
Counter: 0 → 100 → reset at 12:01:00
```

**Pros**: Simple to implement  
**Cons**: Burst at window boundaries

### Sliding Window

Use a rolling time window for smoother limiting.

```
Current time: 12:00:30
Window: 11:59:30 - 12:00:30
Counts requests in last 60 seconds
```

**Pros**: Smoother limits  
**Cons**: More complex, higher memory

### Token Bucket

Tokens added at fixed rate, consumed per request.

```
Bucket capacity: 100 tokens
Refill rate: 10 tokens/second
Each request: 1 token
```

**Pros**: Allows controlled bursts  
**Cons**: Requires token tracking

### Leaky Bucket

Requests processed at constant rate, excess queued.

```
Queue size: 100 requests
Process rate: 10 requests/second
Overflow: rejected
```

**Pros**: Smooth output rate  
**Cons**: Adds latency

## Rate Limit Headers

### Standard Headers

Use these headers to communicate rate limits:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed | `100` |
| `X-RateLimit-Remaining` | Requests remaining in window | `75` |
| `X-RateLimit-Reset` | Unix timestamp when limit resets | `1705320000` |
| `Retry-After` | Seconds to wait (on 429 response) | `60` |

### Response Examples

#### Normal Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1705320000

{
  "data": { ... }
}
```

#### Rate Limited Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705320000
Retry-After: 45

{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded the rate limit of 100 requests per minute",
  "instance": "/v1/orders",
  "retryAfter": 45
}
```

## Rate Limit Scopes

### Per-Client Limits

Apply limits based on client identity:

```
Client A: 1000 requests/minute (premium)
Client B: 100 requests/minute (standard)
Client C: 10 requests/minute (free)
```

### Per-Endpoint Limits

Apply different limits to different endpoints:

| Endpoint | Limit | Reason |
|----------|-------|--------|
| `GET /orders` | 1000/min | Read-heavy, cacheable |
| `POST /orders` | 100/min | Write operation |
| `GET /reports` | 10/min | Expensive computation |

### Per-User Limits

Apply limits to the authenticated user:

```
User limits apply regardless of API key used
Prevents circumventing limits with multiple keys
```

## Rate Limit Tiers

### Tier Structure

| Tier | Rate Limit | Daily Quota | Use Case |
|------|------------|-------------|----------|
| Free | 60/min | 1,000/day | Testing, development |
| Standard | 600/min | 50,000/day | Production apps |
| Professional | 3,000/min | 500,000/day | High-volume apps |
| Enterprise | Custom | Custom | Custom integrations |

### Tier Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 542
X-RateLimit-Reset: 1705320000
X-Plan-Tier: standard
X-Plan-Quota-Remaining: 48234
X-Plan-Quota-Reset: 1705363200
```

## Quota Management

### Daily/Monthly Quotas

For usage-based billing, track quotas separately:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 542
X-Quota-Limit: 50000
X-Quota-Remaining: 45678
X-Quota-Reset: 1705363200
```

### Quota Exceeded Response

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/quota-exceeded",
  "title": "Quota Exceeded",
  "status": 403,
  "detail": "Your daily quota of 50000 requests has been exceeded",
  "quotaResetAt": "2024-01-16T00:00:00Z",
  "upgradeUrl": "https://api.example.com/pricing"
}
```

## API Protection Patterns

### Request Size Limits

Limit payload sizes to prevent abuse:

```http
HTTP/1.1 413 Payload Too Large
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/payload-too-large",
  "title": "Payload Too Large",
  "status": 413,
  "detail": "Request body exceeds maximum size of 1MB",
  "maxSize": 1048576
}
```

### Request Timeout

Set timeouts to prevent slow clients from blocking resources:

```http
HTTP/1.1 408 Request Timeout
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/request-timeout",
  "title": "Request Timeout",
  "status": 408,
  "detail": "Request did not complete within 30 seconds"
}
```

### Concurrent Request Limits

Limit simultaneous requests per client:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/concurrent-limit",
  "title": "Too Many Concurrent Requests",
  "status": 429,
  "detail": "Maximum 10 concurrent requests allowed",
  "concurrentLimit": 10
}
```

## Client Best Practices

### Handling Rate Limits

Clients should:

1. **Check headers** - Monitor remaining requests
2. **Implement backoff** - Wait before retrying
3. **Cache responses** - Reduce request count
4. **Batch requests** - Combine operations when possible

### Exponential Backoff

```
Retry 1: Wait 1 second
Retry 2: Wait 2 seconds
Retry 3: Wait 4 seconds
Retry 4: Wait 8 seconds
...
Maximum: Wait 60 seconds
```

### Retry-After Handling

```
1. Receive 429 response
2. Read Retry-After header
3. Wait specified seconds
4. Retry request
5. If still 429, use exponential backoff
```

## Documentation Requirements

### API Documentation

Document rate limits clearly:

```yaml
# OpenAPI specification
paths:
  /orders:
    get:
      summary: List orders
      description: |
        Returns a list of orders.
        
        **Rate Limits:**
        - Free tier: 60 requests/minute
        - Standard tier: 600 requests/minute
        - Professional tier: 3000 requests/minute
        
        Rate limit headers are included in all responses.
```

### Error Documentation

Document rate limit errors:

```yaml
responses:
  429:
    description: Rate limit exceeded
    headers:
      X-RateLimit-Limit:
        description: Request limit per minute
        schema:
          type: integer
      Retry-After:
        description: Seconds to wait before retry
        schema:
          type: integer
    content:
      application/problem+json:
        schema:
          $ref: '#/components/schemas/Problem'
```

## Monitoring and Alerts

### Key Metrics

Track these rate limiting metrics:

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Rate limit hits | 429 responses issued | > 5% of requests |
| Near limit clients | Clients using > 80% | Monitor trend |
| Burst patterns | Sudden request spikes | > 3x normal |
| Quota usage | Daily/monthly consumption | > 90% |

### Alert Examples

```
ALERT: Client api-key-12345 exceeded rate limit 50 times in 5 minutes
ALERT: 15% of requests returned 429 in the last hour
ALERT: Client api-key-67890 at 95% of daily quota
```

## Best Practices Summary

1. **Be transparent** - Always include rate limit headers
2. **Use standard headers** - Follow conventions for client compatibility
3. **Provide clear errors** - Explain why and when to retry
4. **Document limits** - Include in API documentation
5. **Offer tiers** - Different limits for different use cases
6. **Monitor usage** - Track and alert on patterns
7. **Plan capacity** - Set limits based on infrastructure capacity

## Related Documentation

- [Security Standards](Security%20Standards.md) - Authentication and authorization
- [Error Response Standards](../request-response/Error-Response-Standards.md) - Error format
- [API Observability Standards](../advanced-patterns/API-Observability-Standards.md) - Monitoring
