# Rate Limiting

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 24 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Rate limiting, throttling, HTTP headers
> 
> **📊 Complexity:** 10.0 grade level • 0.7% technical density • fairly difficult

## Overview

Rate limiting protects your API from overload. It restricts how many requests a client can make in a time period. This guide covers HTTP-based rate limiting patterns. You'll learn to use standard headers and response codes.

## Why Rate Limit?

Without rate limits, your API faces serious risks.

**Abuse Example**: A malicious user writes a script. The script sends 10,000 requests per second. Your database crashes. All users lose service. Your costs spike from cloud usage.

**Real-world consequences**:
- **Resource exhaustion**: Servers run out of CPU and memory
- **Unfair distribution**: One user monopolizes resources
- **Financial impact**: Cloud bills increase dramatically
- **Service degradation**: Legitimate users experience slowness

Rate limiting prevents these problems. It ensures fair access for all users.

## Simple Example First

Here's basic rate limiting in action:

```http
# First request - everything is fine
GET /users/123 HTTP/1.1
Authorization: Bearer token123

HTTP/1.1 200 OK
RateLimit: limit=100, remaining=99, reset=60

{"id": "123", "name": "Alice"}
```

```http
# 100th request - limit reached
GET /users/456 HTTP/1.1
Authorization: Bearer token123

HTTP/1.1 429 Too Many Requests
Retry-After: 60
RateLimit: limit=100, remaining=0, reset=60

{
  "title": "Rate Limit Exceeded",
  "detail": "Wait 60 seconds before retrying"
}
```

The client made too many requests. The server says "slow down and wait."

## Core Concepts

### Quota Units

Quota units measure the cost of each request. The simplest approach counts each request as one unit. 

**Weighted costs**: Some operations cost more than others.

```http
GET /users/123           ; Cost: 1 unit (simple read)
GET /users?search=smith  ; Cost: 3 units (search operation)
POST /reports/generate   ; Cost: 10 unit (resource-intensive)
```

Document your costs clearly. Clients need to understand what each operation costs.

### Time Windows

Time windows define when limits apply. Two common patterns exist:

**Fixed Windows**: Reset at specific times.

```
Window 1: 00:00 - 01:00 (100 requests allowed)
Window 2: 01:00 - 02:00 (100 requests allowed)
```

Think of it like a parking meter that resets every hour.

**Sliding Windows**: Track a moving time period.

```
At 00:30: Count requests from 23:30 to 00:30
At 00:45: Count requests from 23:45 to 00:45
```

Think of it like a conveyor belt. Old requests fall off as new ones arrive.

### Limit Scopes

You can apply rate limits at different levels:

**Global Limits**: Apply across the entire API.

```http
X-RateLimit-Limit: 1000
X-RateLimit-Resource: api
```

**Per-Endpoint Limits**: Different limits for different resources.

```http
# Search endpoint: 10 requests/minute
X-RateLimit-Limit: 10
X-RateLimit-Resource: search

# Read endpoint: 100 requests/minute  
X-RateLimit-Limit: 100
X-RateLimit-Resource: users
```

Expensive operations get lower limits. Cheap operations get higher limits.

**Per-User Limits**: Based on authentication.

```http
# Free tier
X-RateLimit-Limit: 100

# Premium tier
X-RateLimit-Limit: 5000
```

Paying customers get higher limits. Free users get basic access.

## Standard Rate Limit Headers

### IETF Standard Headers (Draft)

The IETF draft specification defines structured headers:

```http
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=75, reset=45
RateLimit-Policy: 100;w=60
```

**RateLimit Fields**:
- `limit`: Maximum requests allowed in this window
- `remaining`: Requests you have left
- `reset`: Seconds until the limit resets

**RateLimit-Policy Parameters**:
- `w`: Time window in seconds
- Additional parameters for details

**Multiple policies example**:

```http
RateLimit: limit=10, remaining=5, reset=8
RateLimit-Policy: 10;w=1, 100;w=60, 1000;w=3600
```

This tells clients:
- Current limit: 10 requests (closest to exceeding)
- 5 requests remaining
- Resets in 8 seconds
- Three policies active: 10/second, 100/minute, 1000/hour

### Legacy X-RateLimit Headers

Many APIs use `X-RateLimit-*` headers. These predate the IETF standard:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1735689600
```

**Key differences from IETF standard**:
- `X-RateLimit-Reset`: Uses Unix timestamp instead of seconds
- Separate headers instead of structured fields
- No standard policy advertisement

**GitHub API Example**:
```http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1735689600
X-RateLimit-Used: 1
X-RateLimit-Resource: core
```

## HTTP 429 Responses

### RFC 6585: Too Many Requests

When a client exceeds limits, return HTTP 429:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60
RateLimit: limit=100, remaining=0, reset=60

{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You exceeded 100 requests per minute. Retry after 60 seconds.",
  "limit": 100,
  "remaining": 0,
  "reset": 60
}
```

### Retry-After Header

The `Retry-After` header tells clients when to retry. Two formats exist:

**Delay in seconds**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 120
```

**HTTP date**:
```http
HTTP/1.1 429 Too Many Requests  
Retry-After: Wed, 21 Oct 2025 07:28:00 GMT
```

Use delay-seconds when possible. It avoids clock synchronization issues.

**Combining with rate limit headers**:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45
RateLimit: limit=1000, remaining=0, reset=45
RateLimit-Policy: 1000;w=60
```

The `Retry-After` value should match the `reset` value. This provides consistent guidance.

## Algorithm Patterns

### Token Bucket Pattern

**Analogy**: Imagine a bucket that holds 100 tokens. Every second, one new token drops into the bucket. Each request costs one token.

If the bucket is full, extra tokens overflow and disappear. If the bucket is empty, requests must wait for new tokens.

**Why use it**:
- Allows bursts up to bucket capacity
- Smooths request rate over time
- Good for APIs with variable load

**HTTP response pattern**:

```http
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=45, reset=30
RateLimit-Policy: 100;w=60;burst=100;comment="token bucket"
```

**Burst handling example**:

```http
# First request - full bucket
GET /users/123
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=99, reset=60

# 50 rapid requests consume tokens
GET /users/456
HTTP/1.1 200 OK  
RateLimit: limit=100, remaining=49, reset=58

# After 30 seconds with no requests, bucket refills
GET /users/789
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=79, reset=30
```

### Leaky Bucket Pattern

**Analogy**: Imagine a bucket with a small hole at the bottom. Water drips out at a constant rate. If you pour water faster than it leaks, the bucket fills up. When full, water overflows.

Requests are like water. The bucket processes them at a steady rate.

**Why use it**:
- Enforces steady request rate
- No burst allowance
- Good for protecting downstream services

**HTTP response pattern**:

```http
HTTP/1.1 200 OK
RateLimit: limit=10, remaining=7, reset=1
RateLimit-Policy: 10;w=1;policy="leaky bucket"
```

**Strict rate example**:

```http
# Maximum 10 requests per second
GET /search?q=api
HTTP/1.1 200 OK
RateLimit: limit=10, remaining=9, reset=1

# 11th request in same second fails
GET /search?q=design  
HTTP/1.1 429 Too Many Requests
Retry-After: 1
RateLimit: limit=10, remaining=0, reset=1
```

### Fixed Window Counter

**Analogy**: Think of a parking lot that resets every hour. At 2:00 PM, the lot opens with 100 spaces. At 3:00 PM, it resets to 100 spaces again.

Simple counter that resets at fixed times.

**Why use it**:
- Easy to implement
- Predictable reset times
- **Warning**: Allows burst at window boundaries

**HTTP response pattern**:

```http
HTTP/1.1 200 OK
RateLimit: limit=1000, remaining=856, reset=3480
RateLimit-Policy: 1000;w=3600;comment="fixed window"
```

**Boundary burst problem**:

```http
# At 13:59:55 (5 seconds before reset)
GET /data
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=0, reset=5

# Client makes 100 requests here

# At 14:00:00 (window resets)  
GET /data
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=99, reset=3600

# Client makes 100 more requests
# Result: 200 requests in 5 seconds
```

This defeats the rate limit. Use sliding windows to prevent this.

### Sliding Window Log

**Analogy**: Think of a train with 100 seats. As the train moves, passengers get off at their stop. New passengers can board when seats open up.

This algorithm tracks each request with a timestamp. Old requests expire naturally.

**Why use it**:
- No boundary burst issues
- Higher accuracy
- **Warning**: More resource intensive

**HTTP response pattern**:

```http
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=67, reset=42
RateLimit-Policy: 100;w=60;comment="sliding window"
```

## Multi-Tier Rate Limiting

### Layered Limits

Apply multiple limits at different time scales:

```http
HTTP/1.1 200 OK
RateLimit: limit=10, remaining=3, reset=8
RateLimit-Policy: 10;w=1, 100;w=60, 1000;w=3600, 10000;w=86400
```

This implements four limits:
- 10 requests per second (prevents bursts)
- 100 requests per minute  
- 1,000 requests per hour
- 10,000 requests per day

**Closest limit wins**: The `RateLimit` field shows whichever limit is closest to exceeding.

### Dynamic Limit Adjustment

Adjust limits based on system load:

```http
# Normal operation
HTTP/1.1 200 OK
RateLimit: limit=1000, remaining=500, reset=1800
RateLimit-Policy: 1000;w=3600

# System under load - reduced temporarily
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=50, reset=60
RateLimit-Policy: 1000;w=3600

# Severe load - aggressive throttling
HTTP/1.1 429 Too Many Requests
Retry-After: 300
RateLimit: limit=10, remaining=0, reset=300
RateLimit-Policy: 1000;w=3600
```

The system protects itself by lowering limits during stress.

## Client Behavior Patterns

### Respecting Rate Limits

Clients should check `remaining` and `reset` values. This prevents hitting limits.

**Proactive throttling**:

```http
# Check headers before next request
GET /users/123
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=5, reset=45

# Client calculates: 5 requests / 45 seconds = 0.11 requests/sec
# Client slows down to avoid hitting limit
```

### Handling 429 Responses

**Basic retry logic**:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
RateLimit: limit=100, remaining=0, reset=60

# Client should:
# 1. Stop sending requests immediately
# 2. Wait 60 seconds (Retry-After value)
# 3. Resume at reduced rate
```

**Exponential backoff**: If you get multiple 429 responses, increase wait time:

```
Attempt 1: Wait 60 seconds
Attempt 2: Wait 120 seconds  
Attempt 3: Wait 240 seconds
Maximum: Wait 900 seconds (15 minutes)
```

This prevents overwhelming a struggling server.

### Avoiding Thundering Herd

**Problem**: Many clients receive the same reset time. They all retry simultaneously.

```http
# 1000 clients receive at 14:00:00
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
RateLimit: limit=1000, remaining=0, reset=3600

# All 1000 clients retry at exactly 15:00:00
# Server experiences massive spike
```

**Solution - Add jitter**:

```
Base wait time: 3600 seconds
Jitter: Random(0, 360) seconds  
Actual wait: 3600 + jitter

Client 1: Waits 3612 seconds
Client 2: Waits 3645 seconds
Client 3: Waits 3598 seconds
```

Jitter spreads retries over 6 minutes instead of one moment. The server stays healthy.

## Response Patterns

### Successful Request Within Limits

```http
GET /v1/users/123 HTTP/1.1
Authorization: Bearer token123

HTTP/1.1 200 OK
Content-Type: application/json
RateLimit: limit=5000, remaining=4500, reset=2100
RateLimit-Policy: 5000;w=3600

{
  "id": "123",
  "name": "Alice Smith"
}
```

### Approaching Limit Warning

Some APIs include warnings when approaching limits:

```http
GET /v1/search?q=api HTTP/1.1
Authorization: Bearer token123

HTTP/1.1 200 OK  
Content-Type: application/json
Warning: 199 - "Rate limit 90% consumed"
RateLimit: limit=100, remaining=10, reset=45
RateLimit-Policy: 100;w=60

{
  "results": [...]
}
```

### Exceeded Limit Response

```http
GET /v1/data HTTP/1.1
Authorization: Bearer token123

HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 120
RateLimit: limit=1000, remaining=0, reset=120
RateLimit-Policy: 1000;w=3600

{
  "type": "https://api.example.com/errors/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Hourly limit of 1000 requests exceeded",
  "retry_after": 120
}
```

### Partial Success Response

For batch operations, some APIs return partial results:

```http
POST /v1/users/batch HTTP/1.1
Content-Type: application/json

{
  "requests": [
    {"id": "1"}, {"id": "2"}, {"id": "3"}
  ]
}

HTTP/1.1 207 Multi-Status
Content-Type: application/json
RateLimit: limit=100, remaining=0, reset=30

{
  "responses": [
    {"id": "1", "status": 200, "data": {...}},
    {"id": "2", "status": 200, "data": {...}},
    {"id": "3", "status": 429, "error": "Rate limit exceeded"}
  ]
}
```

The first two items succeeded. The third hit the rate limit. Clients can retry just item 3.

## Concurrency Limiting

Rate limiting can control concurrent requests. This differs from request rate.

**Concurrency**: How many requests run at the same time.  
**Rate**: How many requests happen in a time period.

```http
# First concurrent request
GET /reports/generate HTTP/1.1

HTTP/1.1 200 OK
RateLimit: limit=5, remaining=4, reset=0
RateLimit-Policy: 5;w=0;comment="concurrent requests"

# Sixth concurrent request  
GET /reports/generate HTTP/1.1

HTTP/1.1 429 Too Many Requests
Retry-After: 10
RateLimit: limit=5, remaining=0, reset=0

{
  "type": "https://api.example.com/errors/concurrency-limit",
  "title": "Concurrency Limit Exceeded",
  "status": 429,
  "detail": "Maximum 5 concurrent requests allowed"
}
```

Note `reset=0` indicates a concurrency limit, not a time-based limit.

## Per-Resource Rate Limits

Different endpoints can have different limits:

```http
# High-volume endpoint
GET /v1/users/123
HTTP/1.1 200 OK
RateLimit: limit=10000, remaining=9999, reset=3600
RateLimit-Policy: 10000;w=3600
X-RateLimit-Resource: users

# Resource-intensive endpoint
GET /v1/analytics/reports  
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=99, reset=3600
RateLimit-Policy: 100;w=3600
X-RateLimit-Resource: analytics
```

The `X-RateLimit-Resource` header identifies which limit applies. Simple reads get high limits. Complex analytics get low limits.

## Authenticated vs Anonymous Limits

Apply different limits based on authentication:

**Anonymous Request**:
```http
GET /v1/public/status HTTP/1.1

HTTP/1.1 200 OK
RateLimit: limit=60, remaining=59, reset=3600
RateLimit-Policy: 60;w=3600;user="anonymous"
```

**Authenticated Request**:
```http
GET /v1/users/me HTTP/1.1
Authorization: Bearer token123

HTTP/1.1 200 OK  
RateLimit: limit=5000, remaining=4999, reset=3600
RateLimit-Policy: 5000;w=3600;user="authenticated"
```

## Documentation Requirements

### API Documentation

Document rate limits clearly in your API reference:

**Limit Table**:
```markdown
| Endpoint Pattern | Authenticated | Anonymous | Window |
|-----------------|---------------|-----------|---------|
| /v1/users/*     | 5000          | 60        | 1 hour  |
| /v1/search      | 100           | 10        | 1 minute|
| /v1/reports/*   | 50            | 5         | 1 hour  |
```

**Quota Unit Costs**:
```markdown
| Operation       | Cost  | Example                    |
|-----------------|-------|----------------------------|
| Simple GET      | 1     | GET /users/123             |
| Search          | 3     | GET /users?search=smith    |
| Report creation | 10    | POST /reports/generate     |
| Batch operation | 1 per | POST /users/batch (3 items)|
```

### Error Response Documentation

Provide examples of rate limit errors:

```json
{
  "type": "https://api.example.com/errors/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded your quota of 5000 requests per hour",
  "limit": 5000,
  "remaining": 0,
  "reset": 1847,
  "retry_after": 1847
}
```

## Security Considerations

### Information Disclosure

Rate limit headers can reveal system information. Avoid exposing internal details.

```http
# Bad - reveals infrastructure capacity
RateLimit-Policy: 1000000;w=60;servers=50;cpu=80%

# Good - shows only client-relevant info
RateLimit-Policy: 1000;w=60
```

### Distributed Denial of Service (DDoS)

Rate limiting alone does not prevent DDoS attacks. Combine with other defenses:

- IP-based blocking for malicious sources
- CAPTCHA challenges for suspicious patterns  
- Geographic filtering if appropriate
- CDN or WAF protection

### Quota Exhaustion Attacks

Attackers may exhaust quotas of legitimate users on purpose.

**Example**: An attacker knows user Alice has API key `key123`. The attacker makes 1000 requests with Alice's key. Alice can no longer use the API.

**Mitigation**:
- Implement per-IP limits plus per-user limits
- Monitor for suspicious patterns
- Let users see their quota usage
- Provide quota reset for verified users

## Best Practices

### Header Selection

**For new APIs**: Use IETF standard headers.

```http
RateLimit: limit=100, remaining=50, reset=45
RateLimit-Policy: 100;w=60
```

**For existing APIs**: Support both standards for compatibility.

```http
# Support both
RateLimit: limit=100, remaining=50, reset=45
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 50  
X-RateLimit-Reset: 1735689645
```

### Consistent Reset Times

Align `Retry-After` with `reset` values:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 120
RateLimit: limit=100, remaining=0, reset=120
```

Inconsistent values confuse clients. This reduces effectiveness.

### Multiple Time Windows

Implement both short and long windows:

```http
RateLimit: limit=10, remaining=5, reset=8  
RateLimit-Policy: 10;w=1, 1000;w=3600, 10000;w=86400
```

This protects against burst attacks and sustained overload.

### Monitor and Adjust

Track these metrics:
- Percentage of requests hitting limits
- Client retry patterns after 429 responses
- Impact on server resource use
- User complaints or support tickets

Adjust limits based on actual usage and system capacity.

### Cache Considerations

Rate limit headers on cached responses may be stale:

```http
HTTP/1.1 200 OK
Age: 300
Cache-Control: max-age=600
RateLimit: limit=100, remaining=50, reset=45
```

The `remaining` and `reset` values are 5 minutes old. Clients should ignore rate limit headers when `Age` is significant.

## Testing Strategies

### Verify Header Presence

Test that your API returns rate limit headers:

```http
GET /v1/users/123

# Assert response includes rate limit headers
assert response.headers['RateLimit'] is not None
assert 'limit=' in response.headers['RateLimit']
assert 'remaining=' in response.headers['RateLimit']  
assert 'reset=' in response.headers['RateLimit']
```

### Test Limit Enforcement

Test that limits actually work:

```http
# Make requests until limit reached
for i in range(101):
    GET /v1/data
    
# Verify 429 response
assert last_response.status == 429
assert last_response.headers['Retry-After'] is not None
```

### Verify Reset Behavior

Test that limits reset properly:

```http
# Exhaust limit
GET /v1/data
HTTP/1.1 429 Too Many Requests
RateLimit: limit=10, remaining=0, reset=60

# Wait for reset
sleep(60 seconds)

# Verify limit restored
GET /v1/data  
HTTP/1.1 200 OK
RateLimit: limit=10, remaining=9, reset=60
```

## Example Scenarios

### E-commerce Search API

```http
# Search request
GET /v1/products?search=laptop&sort=price HTTP/1.1
Authorization: Bearer premium-token

HTTP/1.1 200 OK
RateLimit: limit=100, remaining=87, reset=45
RateLimit-Policy: 100;w=60, 5000;w=3600
X-RateLimit-Resource: search

{
  "results": [...],
  "total": 245
}
```

Search costs 3 quota units, regular requests cost 1.

### Real-time Data Feed

```http
# Streaming endpoint with strict limits
GET /v1/market-data/stream HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/x-ndjson
RateLimit: limit=5, remaining=4, reset=0
RateLimit-Policy: 5;w=0;comment="concurrent connections"

{"symbol": "AAPL", "price": 150.25}
{"symbol": "GOOGL", "price": 2800.50}
```

### Batch Processing API

```http
POST /v1/images/process HTTP/1.1
Content-Type: application/json

{
  "images": ["img1.jpg", "img2.jpg", "img3.jpg"]
}

HTTP/1.1 202 Accepted  
RateLimit: limit=100, remaining=70, reset=1800
RateLimit-Policy: 100;w=3600;cost="10 per image"
Location: /v1/jobs/abc123

{
  "job_id": "abc123",
  "status": "processing",
  "images_count": 3,
  "quota_cost": 30
}
```

## Migration Path

### Phase 1: Add Headers to Responses

Start returning rate limit headers on all responses:

```http
HTTP/1.1 200 OK
RateLimit: limit=1000, remaining=999, reset=3600
RateLimit-Policy: 1000;w=3600
```

No enforcement yet. Just provide information.

### Phase 2: Soft Enforcement with Warnings

Return warnings when clients approach limits:

```http
HTTP/1.1 200 OK
Warning: 199 - "Rate limit 90% consumed"  
RateLimit: limit=1000, remaining=100, reset=300
```

### Phase 3: Hard Enforcement

Begin returning 429 responses:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 120
RateLimit: limit=1000, remaining=0, reset=120
```

Announce enforcement dates well in advance. Give clients time to adapt.

### Phase 4: Optimize Limits

Adjust based on real usage data:

```http
# Before: Conservative limits
RateLimit-Policy: 100;w=3600

# After: Optimized based on actual usage
RateLimit-Policy: 10;w=1, 500;w=3600, 5000;w=86400
```

## Resources

### Specifications
- [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585) - HTTP 429 Too Many Requests
- [IETF Draft: RateLimit Header Fields](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/) - Standard headers
- [RFC 9110 Section 10.2.3](https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3) - Retry-After

### Related Topics
- [Error Response Standards](../request-response/error-response-standards.md) - Error formatting
- [API Observability Standards](./api-observability-standards.md) - Monitoring throttling
- [Security Standards](../security/security-standards.md) - Protecting against abuse
- [HTTP Client Best Practices](./http-client-best-practices.md) - Retry patterns for handling 429 responses
- [Performance Standards](./performance-standards.md) - Maintaining performance under load

### Industry Examples
- GitHub API: X-RateLimit headers with per-resource limits
- Stripe API: Multiple time windows with detailed policies  
- Twitter API: Separate read and write limits

---

[← Back to Advanced Patterns](./README.md) | [View All API Design Guides](../README.md)
