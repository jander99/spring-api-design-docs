# Rate Limiting

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 12 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** HTTP fundamentals, REST API experience  
> **🎯 Key Topics:** Rate limiting, throttling, HTTP headers
> 
> **📊 Complexity:** Grade 14 • Difficult

## Overview

Rate limiting protects your API from overload by restricting the number of requests a client can make in a given time period. This guide covers HTTP-based rate limiting patterns using standard headers and response codes to communicate limits to clients.

Rate limiting serves three key purposes:
- Prevents resource exhaustion from excessive requests
- Ensures fair resource distribution among clients
- Protects infrastructure from abuse or attacks

## Core Concepts

### Quota Units

Quota units measure the cost of requests against rate limits. The simplest approach counts each request as one unit. However, APIs can assign different weights based on operation complexity.

```http
GET /users/123           ; Cost: 1 unit (simple read)
GET /users?search=smith  ; Cost: 3 units (search operation)
POST /reports/generate   ; Cost: 10 units (resource-intensive)
```

Document your quota unit calculation clearly so clients understand the cost of different operations.

### Time Windows

Time windows define the period during which limits apply. Common patterns include:

**Fixed Windows**: Reset at specific intervals
```
Window 1: 00:00 - 01:00 (100 requests)
Window 2: 01:00 - 02:00 (100 requests)
```

**Sliding Windows**: Track requests over a moving time period
```
At 00:30: Count requests from 23:30 to 00:30
At 00:45: Count requests from 23:45 to 00:45
```

### Limit Scopes

Rate limits can apply at different levels:

**Global Limits**: Apply to the entire API
```http
X-RateLimit-Limit: 1000
X-RateLimit-Resource: api
```

**Per-Endpoint Limits**: Different limits for different resources
```http
# Search endpoint: 10 requests/minute
X-RateLimit-Limit: 10
X-RateLimit-Resource: search

# Read endpoint: 100 requests/minute  
X-RateLimit-Limit: 100
X-RateLimit-Resource: users
```

**Per-User Limits**: Based on authentication
```http
# Free tier
X-RateLimit-Limit: 100

# Premium tier
X-RateLimit-Limit: 5000
```

## Standard Rate Limit Headers

### IETF Standard Headers (Draft)

The IETF draft specification defines structured headers for rate limiting:

```http
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=75, reset=45
RateLimit-Policy: 100;w=60
```

**RateLimit Fields**:
- `limit`: Maximum requests allowed in the current window
- `remaining`: Requests left in the current window
- `reset`: Seconds until the limit resets

**RateLimit-Policy Parameters**:
- `w`: Time window in seconds
- Additional parameters for policy details

Example with multiple policies:
```http
RateLimit: limit=10, remaining=5, reset=8
RateLimit-Policy: 10;w=1, 100;w=60, 1000;w=3600
```

This tells clients:
- Current limit: 10 requests (closest to being exceeded)
- 5 requests remaining
- Resets in 8 seconds
- Policies: 10/second, 100/minute, 1000/hour

### Legacy X-RateLimit Headers

Many APIs use `X-RateLimit-*` headers, which predate the IETF standard:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1735689600
```

**Key Differences from IETF Standard**:
- `X-RateLimit-Reset`: Often a Unix timestamp instead of seconds
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

When a client exceeds limits, return HTTP 429 with details:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60
RateLimit: limit=100, remaining=0, reset=60

{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded 100 requests per minute. Please retry after 60 seconds.",
  "limit": 100,
  "remaining": 0,
  "reset": 60
}
```

### Retry-After Header

The `Retry-After` header tells clients when to retry. Two formats exist:

**Delay in Seconds**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 120
```

**HTTP Date**:
```http
HTTP/1.1 429 Too Many Requests  
Retry-After: Wed, 21 Oct 2025 07:28:00 GMT
```

The delay-seconds format avoids clock synchronization issues. Use it when possible.

**Combining with Rate Limit Headers**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45
RateLimit: limit=1000, remaining=0, reset=45
RateLimit-Policy: 1000;w=60
```

The `Retry-After` value should align with the `reset` value to provide consistent guidance.

## Algorithm Patterns

### Token Bucket Pattern

The token bucket pattern adds tokens to a bucket at a fixed rate. Each request consumes tokens. When the bucket is empty, requests are throttled.

**Characteristics**:
- Allows bursts up to bucket capacity
- Smooth request rate over time
- Good for APIs with variable load

**HTTP Response Pattern**:
```http
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=45, reset=30
RateLimit-Policy: 100;w=60;burst=100;comment="token bucket"
```

**Burst Handling**:
```http
# First request in a new window - full bucket
GET /users/123
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=99, reset=60

# 50 rapid requests consume tokens
GET /users/456
HTTP/1.1 200 OK  
RateLimit: limit=100, remaining=49, reset=58

# Bucket refills over time
# After 30 seconds with no requests
GET /users/789
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=79, reset=30
```

### Leaky Bucket Pattern

The leaky bucket pattern processes requests at a constant rate, queuing excess requests until capacity is reached.

**Characteristics**:
- Enforces steady request rate
- No burst allowance
- Good for protecting downstream services

**HTTP Response Pattern**:
```http
HTTP/1.1 200 OK
RateLimit: limit=10, remaining=7, reset=1
RateLimit-Policy: 10;w=1;policy="leaky bucket"
```

**Strict Rate Example**:
```http
# Maximum 10 requests per second, evenly distributed
GET /search?q=api
HTTP/1.1 200 OK
RateLimit: limit=10, remaining=9, reset=1

# Attempting 11th request in same second
GET /search?q=design  
HTTP/1.1 429 Too Many Requests
Retry-After: 1
RateLimit: limit=10, remaining=0, reset=1
```

### Fixed Window Counter

Simple counter that resets at fixed intervals.

**Characteristics**:
- Easy to implement
- Predictable reset times
- Susceptible to burst at window boundaries

**HTTP Response Pattern**:
```http
HTTP/1.1 200 OK
RateLimit: limit=1000, remaining=856, reset=3480
RateLimit-Policy: 1000;w=3600;comment="fixed window"
```

**Boundary Burst Issue**:
```http
# At 13:59:55 (5 seconds before reset)
GET /data
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=0, reset=5

# Client could make 100 requests here

# At 14:00:00 (window resets)  
GET /data
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=99, reset=3600

# Client could make 100 more requests
# Total: 200 requests in 5 seconds
```

### Sliding Window Log

Tracks individual request timestamps for precise sliding windows.

**Characteristics**:
- No boundary burst issues
- Higher accuracy
- More resource intensive

**HTTP Response Pattern**:
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

This implements:
- 10 requests per second (burst protection)
- 100 requests per minute  
- 1,000 requests per hour
- 10,000 requests per day

**Closest Limit Wins**: The `RateLimit` field shows the limit closest to being exceeded.

### Dynamic Limit Adjustment

Adjust limits based on system conditions:

```http
# Normal operation
HTTP/1.1 200 OK
RateLimit: limit=1000, remaining=500, reset=1800
RateLimit-Policy: 1000;w=3600

# System under load - temporarily reduced
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=50, reset=60
RateLimit-Policy: 1000;w=3600

# Severe load - aggressive throttling
HTTP/1.1 429 Too Many Requests
Retry-After: 300
RateLimit: limit=10, remaining=0, reset=300
RateLimit-Policy: 1000;w=3600
```

## Client Behavior Patterns

### Respecting Rate Limits

Clients should throttle requests based on `remaining` and `reset` values:

**Proactive Throttling**:
```http
# Check headers before next request
GET /users/123
HTTP/1.1 200 OK
RateLimit: limit=100, remaining=5, reset=45

# Client calculates: 5 requests / 45 seconds ≈ 0.11 requests/sec
# Client should slow down to avoid hitting limit
```

### Handling 429 Responses

**Basic Retry Logic**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
RateLimit: limit=100, remaining=0, reset=60

# Client should:
# 1. Stop sending requests immediately
# 2. Wait 60 seconds (Retry-After value)
# 3. Resume at reduced rate
```

**Exponential Backoff**: For repeated 429 responses, increase wait time:

```
Attempt 1: Wait 60 seconds
Attempt 2: Wait 120 seconds  
Attempt 3: Wait 240 seconds
Maximum: Wait 900 seconds (15 minutes)
```

### Avoiding Thundering Herd

When many clients receive the same reset time, they may all retry simultaneously:

**Problem**:
```http
# 1000 clients receive at 14:00:00
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
RateLimit: limit=1000, remaining=0, reset=3600

# All 1000 clients retry at exactly 15:00:00
# Server experiences spike
```

**Solution - Add Jitter**:
```
Base wait time: 3600 seconds
Jitter: Random(0, 360) seconds  
Actual wait: 3600 + jitter

Client 1: Waits 3612 seconds
Client 2: Waits 3645 seconds
Client 3: Waits 3598 seconds
```

This spreads retries over a 6-minute window instead of a single moment.

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

## Concurrency Limiting

Rate limiting can control concurrent requests, not just request rate:

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

Note the `reset=0` indicates a concurrency limit rather than a time-based limit.

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

The `X-RateLimit-Resource` header identifies which limit applies.

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

Rate limit headers can reveal system information:

**Avoid Exposing Internal Details**:
```http
# Bad - reveals infrastructure capacity
RateLimit-Policy: 1000000;w=60;servers=50;cpu=80%

# Good - shows only client-relevant info
RateLimit-Policy: 1000;w=60
```

### Distributed Denial of Service (DDoS)

Rate limiting alone does not prevent DDoS attacks. Combine with:

- IP-based blocking for malicious sources
- CAPTCHA challenges for suspicious patterns  
- Geographic filtering if appropriate
- CDN or WAF protection

### Quota Exhaustion Attacks

Attackers may intentionally exhaust quotas of legitimate users:

**Mitigation**:
- Implement per-IP limits in addition to per-user limits
- Monitor for suspicious patterns
- Allow users to see their quota usage
- Provide quota reset options for verified users

## Best Practices

### Header Selection

**For New APIs**: Use IETF standard headers:
```http
RateLimit: limit=100, remaining=50, reset=45
RateLimit-Policy: 100;w=60
```

**For Existing APIs**: Consider compatibility:
```http
# Support both standards
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

Inconsistent values confuse clients and reduce effectiveness.

### Multiple Time Windows

Implement both short and long windows:

```http
RateLimit: limit=10, remaining=5, reset=8  
RateLimit-Policy: 10;w=1, 1000;w=3600, 10000;w=86400
```

This protects against both burst attacks and sustained overload.

### Monitor and Adjust

Track rate limit effectiveness:
- Percentage of requests hitting limits
- Client retry patterns after 429 responses
- Impact on server resource utilization
- User complaints or support tickets

Adjust limits based on actual usage patterns and system capacity.

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

```http
GET /v1/users/123

# Assert response includes rate limit headers
assert response.headers['RateLimit'] is not None
assert 'limit=' in response.headers['RateLimit']
assert 'remaining=' in response.headers['RateLimit']  
assert 'reset=' in response.headers['RateLimit']
```

### Test Limit Enforcement

```http
# Make requests until limit reached
for i in range(101):
    GET /v1/data
    
# Verify 429 response
assert last_response.status == 429
assert last_response.headers['Retry-After'] is not None
```

### Verify Reset Behavior

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

No enforcement yet—just information.

### Phase 2: Soft Enforcement with Warnings

Return warnings when limits approached:

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

Announce enforcement dates well in advance.

### Phase 4: Optimize Limits

Adjust based on real usage:

```http
# Before: Conservative limits
RateLimit-Policy: 100;w=3600

# After: Optimized based on data  
RateLimit-Policy: 10;w=1, 500;w=3600, 5000;w=86400
```

## Resources

### Specifications
- [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585) - HTTP 429 Too Many Requests
- [IETF Draft: RateLimit Header Fields](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/) - Standard headers
- [RFC 9110 Section 10.2.3](https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3) - Retry-After

### Related Topics
- [Error Response Standards](../request-response/Error-Response-Standards.md) - Error formatting
- [API Observability Standards](./API-Observability-Standards.md) - Monitoring throttling
- [Security Standards](../security/Security-Standards.md) - Protecting against abuse

### Industry Examples
- GitHub API: X-RateLimit headers with per-resource limits
- Stripe API: Multiple time windows with detailed policies  
- Twitter API: Separate read and write limits

---

[← Back to Advanced Patterns](./README.md) | [View All API Design Guides](../README.md)
