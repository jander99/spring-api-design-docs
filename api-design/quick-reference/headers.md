# HTTP Headers Quick Reference

> One-page reference card for common API headers. For detailed guidance, see [Security Standards](../security/security-standards.md).

## Request Headers

### Content Negotiation

| Header | Purpose | Example |
|--------|---------|---------|
| Accept | Requested response format | `application/json` |
| Accept-Language | Preferred language | `en-US, en;q=0.9` |
| Accept-Encoding | Compression support | `gzip, deflate, br` |
| Content-Type | Request body format | `application/json` |

### Authentication

| Header | Purpose | Example |
|--------|---------|---------|
| Authorization | Credentials | `Bearer eyJhbGc...` |
| X-API-Key | API key auth | `ak_live_abc123` |

### Caching

| Header | Purpose | Example |
|--------|---------|---------|
| If-None-Match | Conditional GET (ETag) | `"abc123"` |
| If-Modified-Since | Conditional GET (date) | `Wed, 21 Oct 2024 07:28:00 GMT` |
| If-Match | Conditional update | `"abc123"` |
| Cache-Control | Cache directives | `no-cache` |

### Request Context

| Header | Purpose | Example |
|--------|---------|---------|
| X-Request-ID | Request tracing | `req-550e8400-e29b` |
| X-Correlation-ID | Cross-service tracing | `corr-123456` |
| User-Agent | Client identification | `MyApp/1.0` |
| X-Forwarded-For | Original client IP | `203.0.113.195` |

## Response Headers

### Content Information

| Header | Purpose | Example |
|--------|---------|---------|
| Content-Type | Response body format | `application/json; charset=utf-8` |
| Content-Length | Body size in bytes | `1234` |
| Content-Encoding | Compression used | `gzip` |
| Content-Language | Response language | `en-US` |

### Caching

| Header | Purpose | Example |
|--------|---------|---------|
| Cache-Control | Cache directives | `max-age=3600, private` |
| ETag | Version identifier | `"33a64df551425fcc"` |
| Last-Modified | Last change date | `Wed, 21 Oct 2024 07:28:00 GMT` |
| Expires | Cache expiration | `Thu, 22 Oct 2024 07:28:00 GMT` |
| Vary | Cache key headers | `Accept, Authorization` |

### Rate Limiting

| Header | Purpose | Example |
|--------|---------|---------|
| X-RateLimit-Limit | Requests allowed | `1000` |
| X-RateLimit-Remaining | Requests left | `999` |
| X-RateLimit-Reset | Reset timestamp | `1698912000` |
| Retry-After | Wait time (seconds) | `60` |

### Pagination

| Header | Purpose | Example |
|--------|---------|---------|
| Link | Pagination links | `<...?page=2>; rel="next"` |
| X-Total-Count | Total items | `1234` |
| X-Page-Size | Items per page | `25` |

### Security

| Header | Purpose | Example |
|--------|---------|---------|
| Strict-Transport-Security | Force HTTPS | `max-age=31536000; includeSubDomains` |
| X-Content-Type-Options | Prevent MIME sniffing | `nosniff` |
| X-Frame-Options | Prevent clickjacking | `DENY` |
| Content-Security-Policy | Resource restrictions | `default-src 'self'` |

### Location

| Header | Purpose | Example |
|--------|---------|---------|
| Location | Created resource URL | `/api/orders/789` |

## Custom Header Conventions

### Naming Rules

| Rule | Good | Bad |
|------|------|-----|
| Use `X-` prefix for custom | `X-Request-ID` | `Request-ID` |
| Use kebab-case | `X-Correlation-ID` | `X_Correlation_ID` |
| Be descriptive | `X-RateLimit-Remaining` | `X-Remaining` |

### Common Custom Headers

| Header | Purpose | Set By |
|--------|---------|--------|
| X-Request-ID | Unique request identifier | Client or Server |
| X-Correlation-ID | Cross-service trace ID | API Gateway |
| X-API-Version | API version | Server |
| X-Deprecation-Notice | Sunset warning | Server |

## Cache-Control Directives

| Directive | Meaning | Use Case |
|-----------|---------|----------|
| `public` | Any cache can store | Static content |
| `private` | Only browser cache | User-specific data |
| `no-cache` | Must revalidate | Frequently changing |
| `no-store` | Never cache | Sensitive data |
| `max-age=N` | Fresh for N seconds | TTL-based caching |
| `must-revalidate` | Revalidate when stale | Critical freshness |

### Cache-Control Examples

| Scenario | Value |
|----------|-------|
| Public static asset | `public, max-age=31536000` |
| User profile | `private, max-age=300` |
| Real-time data | `no-cache` |
| Auth tokens | `no-store` |
| API response (short TTL) | `private, max-age=60` |

## Authorization Header Formats

| Scheme | Format | Use Case |
|--------|--------|----------|
| Bearer | `Bearer <token>` | OAuth 2.0, JWT |
| Basic | `Basic <base64>` | Username/password |
| API Key | `X-API-Key: <key>` | Simple API auth |

## Content-Type Values

| Type | Use For |
|------|---------|
| `application/json` | JSON data |
| `application/xml` | XML data |
| `application/x-www-form-urlencoded` | Form data |
| `multipart/form-data` | File uploads |
| `text/plain` | Plain text |
| `application/octet-stream` | Binary data |
| `application/merge-patch+json` | JSON Merge Patch |
| `application/json-patch+json` | JSON Patch |

## Common Mistakes

| Mistake | Problem | Correct Approach |
|---------|---------|------------------|
| Missing Content-Type | Server can't parse body | Always set for POST/PUT/PATCH |
| Cache-Control: no-cache on GET | Hurts performance | Use appropriate max-age |
| Missing CORS headers | Browser blocks request | Set Access-Control-* headers |
| ETag without Cache-Control | Incomplete caching | Use both together |
| X-RateLimit without Retry-After | No guidance on 429 | Include Retry-After |

## CORS Headers

| Header | Purpose | Example |
|--------|---------|---------|
| Access-Control-Allow-Origin | Allowed origins | `https://app.example.com` |
| Access-Control-Allow-Methods | Allowed methods | `GET, POST, PUT, DELETE` |
| Access-Control-Allow-Headers | Allowed request headers | `Authorization, Content-Type` |
| Access-Control-Max-Age | Preflight cache time | `86400` |

## Related

- [Security Standards](../security/security-standards.md)
- [Rate Limiting Standards](../security/rate-limiting-standards.md)
- [Status Codes Reference](status-codes.md)
- [HTTP Methods Reference](http-methods.md)
