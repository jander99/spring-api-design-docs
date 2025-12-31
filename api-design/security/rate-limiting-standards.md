# Rate Limiting & API Protection Standards

> **Reading Guide**
> 
> **Reading Time:** 12 minutes | **Level:** Intermediate
> 
> **Prerequisites:** Basic HTTP knowledge, understanding of API security  
> **Key Topics:** Rate limiting, throttling, DDoS protection, brute force prevention

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

## Rate Limit Scope Selection

### Choosing a Strategy

| Scenario | Recommended Strategy | Reason |
|----------|---------------------|--------|
| Authenticated APIs | Per-user | Accurate tracking per person |
| Public APIs | Per-IP | Only identifier available |
| Mixed access | Hybrid | User when known, IP as fallback |
| B2B integrations | Per-API-key + per-user | Multi-tenant tracking |
| Mobile apps | Per-device + per-user | Handle shared IPs |

### Per-IP Challenges

Shared IP addresses can cause false rate limiting:

| Situation | Impact | Mitigation |
|-----------|--------|------------|
| Corporate proxies | Many users share one IP | Higher IP limits, prefer user ID |
| Mobile carrier NAT | Thousands share IPs | Device fingerprinting fallback |
| VPN services | Users appear from same IP | Token-based identification |
| Cloud functions | Dynamic IPs | API key required |

### Multi-Key Rate Limiting

Track limits at multiple levels:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Limit-User: 1000
X-RateLimit-Remaining-User: 892
X-RateLimit-Limit-IP: 500
X-RateLimit-Remaining-IP: 423
```

## IETF Standard Headers

### Emerging Standard

The IETF is standardizing rate limit headers (draft-ietf-httpapi-ratelimit-headers):

| Current Header | IETF Standard | Description |
|----------------|---------------|-------------|
| `X-RateLimit-Limit` | `RateLimit-Limit` | Maximum requests |
| `X-RateLimit-Remaining` | `RateLimit-Remaining` | Requests left |
| `X-RateLimit-Reset` | `RateLimit-Reset` | Seconds until reset |

### Transition Period

Support both header formats during transition:

```http
HTTP/1.1 200 OK
# Legacy headers (widely supported)
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1705320000

# IETF standard headers (emerging)
RateLimit-Limit: 100
RateLimit-Remaining: 75
RateLimit-Reset: 45
RateLimit-Policy: 100;w=60
```

## Brute Force Protection

### Login Endpoint Protection

Apply stricter limits to authentication endpoints:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60
X-Lockout-Remaining-Attempts: 2

{
  "type": "https://api.example.com/problems/too-many-attempts",
  "title": "Too Many Login Attempts",
  "status": 429,
  "detail": "Too many failed login attempts. Please wait before trying again.",
  "remainingAttempts": 2,
  "retryAfter": 60
}
```

### Account Lockout

After repeated failures, lock the account temporarily:

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/account-locked",
  "title": "Account Temporarily Locked",
  "status": 403,
  "detail": "Too many failed attempts. Account locked for 15 minutes.",
  "unlockAt": "2024-01-15T10:45:00Z"
}
```

### Progressive Delays

Increase wait time after each failure:

| Attempt | Wait Time | Total Time |
|---------|-----------|------------|
| 1-3 | None | 0 |
| 4 | 5 seconds | 5s |
| 5 | 15 seconds | 20s |
| 6 | 60 seconds | 80s |
| 7+ | Account locked | 15 min |

## DDoS Protection Patterns

### Traffic Analysis

Monitor request patterns for abuse:

| Pattern | Indicator | Response |
|---------|-----------|----------|
| Request flood | >10x normal rate | Rate limit, then block |
| Slow requests | Connection held open | Timeout, close connection |
| Invalid requests | High error rate | Temporary block |
| Geographic anomaly | Unusual source region | Challenge or rate limit |

### Service Overload Response

When the service is overwhelmed:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/problem+json
Retry-After: 30
X-RateLimit-Scope: global

{
  "type": "https://api.example.com/problems/service-overload",
  "title": "Service Temporarily Overloaded",
  "status": 503,
  "detail": "The service is experiencing high load. Please retry after the specified time.",
  "retryAfter": 30
}
```

### Bot Detection Challenges

Request additional verification for suspected bots:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
X-Challenge-Required: captcha
X-Challenge-URL: https://api.example.com/challenge/abc123

{
  "type": "https://api.example.com/problems/challenge-required",
  "title": "Verification Required",
  "status": 429,
  "detail": "Please complete the verification challenge to continue.",
  "challengeUrl": "https://api.example.com/challenge/abc123",
  "challengeType": "captcha"
}
```

### Connection-Level Protection

Protect against slow connection attacks:

| Attack Type | Detection | Prevention |
|-------------|-----------|------------|
| Slowloris | Slow headers | Header timeout (10s) |
| Slow POST | Slow body | Body timeout (30s) |
| Keep-alive abuse | Idle connections | Idle timeout (60s) |
| Connection flood | Too many connections | Per-IP connection limit |

## Adaptive Rate Limiting

### Load-Based Throttling

Adjust limits based on system load:

| System Load | Rate Limit Adjustment |
|-------------|----------------------|
| < 50% | Normal limits |
| 50-75% | Reduce by 25% |
| 75-90% | Reduce by 50% |
| > 90% | Emergency limits (10%) |

### Adaptive Response Headers

Communicate adjusted limits:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 75
X-RateLimit-Remaining: 50
X-RateLimit-Adjusted: true
X-RateLimit-Normal-Limit: 100
X-System-Load: high
```

### Graceful Degradation

When overloaded, prioritize critical operations:

| Priority | Operations | Behavior Under Load |
|----------|------------|---------------------|
| Critical | Health checks, auth | Always allowed |
| High | Reads, essential writes | Reduced limits |
| Normal | Standard operations | Significantly reduced |
| Low | Reports, exports | Rejected with 503 |

## Best Practices Summary

1. **Be transparent** - Always include rate limit headers
2. **Use standard headers** - Follow conventions for client compatibility
3. **Provide clear errors** - Explain why and when to retry
4. **Document limits** - Include in API documentation
5. **Offer tiers** - Different limits for different use cases
6. **Monitor usage** - Track and alert on patterns
7. **Plan capacity** - Set limits based on infrastructure capacity

## Related Documentation

- [Security Standards](security-standards.md) - Authentication and authorization
- [Error Response Standards](../request-response/error-response-standards.md) - Error format
- [API Observability Standards](../advanced-patterns/api-observability-standards.md) - Monitoring
