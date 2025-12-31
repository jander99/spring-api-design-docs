# API Performance Standards

> **Reading Guide**
> 
> **Reading Time:** 11 minutes | **Level:** Intermediate
> 
> **Prerequisites:** Basic REST API knowledge  
> **Key Topics:** Caching, response times, optimization, HTTP/2
> 
> **Complexity:** 13.2 grade level • 1.6% technical density • difficult

## Overview

Fast APIs create better user experiences. This document defines performance standards for REST APIs. It covers caching strategies, response time targets, payload optimization, and modern HTTP protocol features.

These standards apply to any technology stack. All examples use HTTP and JSON formats only.

## HTTP Caching

Caching reduces server load and speeds up responses. Proper cache headers tell clients and intermediaries when to reuse responses.

### Cache-Control Header

The `Cache-Control` header controls how responses are cached. Use different directives based on your data freshness needs.

#### Cache-Control Directives

| Directive | Description | Use Case |
|-----------|-------------|----------|
| `public` | Any cache can store this | Static content, public data |
| `private` | Only browser can cache | User-specific data |
| `no-cache` | Must revalidate before use | Frequently changing data |
| `no-store` | Never cache this response | Sensitive data |
| `max-age=N` | Cache is fresh for N seconds | Most API responses |
| `s-maxage=N` | Shared cache max age | CDN-specific caching |
| `must-revalidate` | Must check when stale | Critical freshness needs |
| `immutable` | Never changes | Versioned resources |

#### Cache Strategies by Resource Type

| Resource Type | Cache-Control | Max-Age | Example |
|---------------|---------------|---------|---------|
| Static reference data | `public, max-age=86400` | 24 hours | Country codes, currencies |
| Product catalog | `public, max-age=3600` | 1 hour | Product listings |
| User profile | `private, max-age=300` | 5 minutes | Account details |
| Search results | `private, max-age=60` | 1 minute | Dynamic queries |
| Real-time data | `no-store` | None | Stock prices, live scores |
| Authentication tokens | `no-store` | None | Security credentials |

#### Example: Cacheable Response

```http
GET /v1/products/12345 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=3600
ETag: "a1b2c3d4"
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT

{
  "id": "12345",
  "name": "Widget Pro",
  "price": 29.99,
  "category": "electronics"
}
```

#### Example: Non-Cacheable Response

```http
GET /v1/users/me HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJ...

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: private, no-store

{
  "id": "user-789",
  "email": "user@example.com",
  "preferences": {...}
}
```

### Conditional Requests

Conditional requests save bandwidth by returning `304 Not Modified` when content has not changed. Use ETags or Last-Modified timestamps for validation.

#### ETag Validation

ETags are unique identifiers for resource versions. They enable precise cache validation.

```http
GET /v1/products/12345 HTTP/1.1
Host: api.example.com
If-None-Match: "a1b2c3d4"

HTTP/1.1 304 Not Modified
ETag: "a1b2c3d4"
Cache-Control: public, max-age=3600
```

#### Last-Modified Validation

Use timestamps when ETags are too expensive to compute.

```http
GET /v1/reports/daily HTTP/1.1
Host: api.example.com
If-Modified-Since: Mon, 15 Jan 2024 00:00:00 GMT

HTTP/1.1 304 Not Modified
Last-Modified: Mon, 15 Jan 2024 00:00:00 GMT
Cache-Control: public, max-age=3600
```

#### Conditional Request Comparison

| Method | Header Sent | Header Received | Best For |
|--------|-------------|-----------------|----------|
| ETag | `If-None-Match` | `ETag` | Precise content validation |
| Last-Modified | `If-Modified-Since` | `Last-Modified` | Time-based validation |

**When to Use Each:**
- **ETag**: When content hash is available or content changes frequently
- **Last-Modified**: When tracking modification time is simpler
- **Both**: Maximum compatibility with caches and clients

### Bandwidth Savings

Conditional requests dramatically reduce bandwidth for unchanged resources.

| Scenario | Full Response | 304 Response | Savings |
|----------|---------------|--------------|---------|
| 10KB product | 10KB | ~200 bytes | 98% |
| 100KB report | 100KB | ~200 bytes | 99.8% |
| 1MB document | 1MB | ~200 bytes | 99.98% |

## Response Time Standards

Define clear targets for API response times. Use percentiles to capture real user experience.

### Percentile Targets

| Percentile | Meaning | Why It Matters |
|------------|---------|----------------|
| P50 (median) | Half of requests are faster | Typical user experience |
| P95 | 95% of requests are faster | Most users' experience |
| P99 | 99% of requests are faster | Catches outliers and edge cases |

### Response Time SLAs by Endpoint Type

| Endpoint Type | P50 Target | P95 Target | P99 Target | Notes |
|---------------|------------|------------|------------|-------|
| **Simple reads** | < 50ms | < 100ms | < 200ms | Single resource GET |
| **List queries** | < 100ms | < 250ms | < 500ms | Paginated collections |
| **Complex queries** | < 200ms | < 500ms | < 1000ms | Filters, joins, aggregations |
| **Write operations** | < 100ms | < 300ms | < 500ms | POST, PUT, PATCH |
| **Delete operations** | < 50ms | < 150ms | < 300ms | DELETE requests |
| **Report generation** | < 2000ms | < 5000ms | < 10000ms | Complex analytics |
| **File uploads** | Size-dependent | Size-dependent | Size-dependent | Add 100ms per MB |

### Response Time Headers

Include timing information in responses for debugging and monitoring.

#### Server-Timing Header

The `Server-Timing` header exposes server-side metrics to clients and browser developer tools.

```http
HTTP/1.1 200 OK
Content-Type: application/json
Server-Timing: db;dur=12.5, cache;dur=0.8, total;dur=45.2

{
  "data": [...]
}
```

#### Server-Timing Metrics

| Metric | Description | Example |
|--------|-------------|---------|
| `db` | Database query time | `db;dur=12.5` |
| `cache` | Cache lookup time | `cache;dur=0.8` |
| `auth` | Authentication time | `auth;dur=5.2` |
| `external` | External API calls | `external;dur=120.0` |
| `total` | Total processing time | `total;dur=45.2` |

#### Full Example with Timing

```http
GET /v1/orders?status=pending HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
Server-Timing: db;dur=23.5;desc="Order query", cache;dur=1.2;desc="User cache", total;dur=38.7
X-Request-ID: req-abc123

{
  "data": [...],
  "meta": {
    "pagination": {...}
  }
}
```

## Pagination Performance

Choose the right pagination strategy based on dataset size and access patterns.

### Offset vs Cursor Performance

| Aspect | Offset Pagination | Cursor Pagination |
|--------|-------------------|-------------------|
| **Implementation** | Simple | Moderate |
| **Performance at page 1** | Fast | Fast |
| **Performance at page 1000** | Slow | Fast |
| **Random page access** | Supported | Not supported |
| **Consistent results** | Can skip/duplicate | Always consistent |
| **Best for** | Small datasets, UI tables | Large datasets, infinite scroll |

### Page Size Recommendations

| Dataset Size | Default Size | Max Size | Reasoning |
|--------------|--------------|----------|-----------|
| < 1,000 items | 20 | 100 | Standard pagination works well |
| 1,000 - 100,000 items | 20 | 50 | Limit max to control load |
| > 100,000 items | 20 | 25 | Use cursor pagination instead |

### Cursor Pagination Example

```http
GET /v1/events?limit=20 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...],
  "meta": {
    "cursors": {
      "next": "eyJpZCI6MTIzNDV9",
      "previous": null
    },
    "hasMore": true
  }
}
```

#### Fetching Next Page

```http
GET /v1/events?limit=20&cursor=eyJpZCI6MTIzNDV9 HTTP/1.1
Host: api.example.com
```

### Pagination Performance Tips

1. **Index sort columns**: Ensure database indexes on fields used for sorting
2. **Avoid COUNT(*)**: Skip total counts for large datasets; use `hasMore` flag instead
3. **Use keyset pagination**: For very large datasets, use indexed column values as cursors
4. **Limit sort options**: Restrict sorting to indexed columns only
5. **Cache total counts**: If totals are needed, cache them with short TTL

## Payload Optimization

Smaller payloads mean faster transfers. Optimize response size without losing important data.

### Compression

Always support response compression. Modern compression reduces payload size by 70-90%.

#### Compression Methods

| Algorithm | Compression Ratio | Speed | Browser Support |
|-----------|-------------------|-------|-----------------|
| gzip | Good (70-80%) | Fast | Universal |
| br (Brotli) | Best (80-90%) | Medium | Modern browsers |
| deflate | Fair (60-70%) | Fast | Universal |

#### Request with Compression

```http
GET /v1/products HTTP/1.1
Host: api.example.com
Accept-Encoding: br, gzip, deflate

HTTP/1.1 200 OK
Content-Type: application/json
Content-Encoding: br
Content-Length: 1247

[compressed response body]
```

#### Compression Guidelines

| Original Size | Should Compress? | Reason |
|---------------|------------------|--------|
| < 1KB | No | Overhead exceeds savings |
| 1KB - 10KB | Yes | Good compression ratio |
| > 10KB | Always | Significant bandwidth savings |

### Sparse Fieldsets

Let clients request only the fields they need. This reduces response size and processing time.

#### Using Fields Parameter

```http
GET /v1/products/12345?fields=id,name,price HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "12345",
  "name": "Widget Pro",
  "price": 29.99
}
```

#### Full Response (Without Fields)

```http
GET /v1/products/12345 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "12345",
  "name": "Widget Pro",
  "price": 29.99,
  "description": "A professional-grade widget for...",
  "specifications": {...},
  "images": [...],
  "reviews": {...},
  "relatedProducts": [...]
}
```

### Response Size Limits

| Response Type | Recommended Limit | Hard Limit |
|---------------|-------------------|------------|
| Single resource | 100KB | 500KB |
| Collection page | 500KB | 2MB |
| Report/export | 5MB | 50MB |
| File download | No limit | Use streaming |

### Payload Optimization Checklist

- [ ] Enable gzip/Brotli compression
- [ ] Support sparse fieldsets for large resources
- [ ] Remove null and empty fields (optional)
- [ ] Use efficient date formats (ISO 8601)
- [ ] Avoid deeply nested structures
- [ ] Paginate all collections
- [ ] Use IDs instead of embedding full related objects

## HTTP/2 and HTTP/3 Considerations

Modern HTTP protocols improve performance through multiplexing and header compression.

### HTTP/2 Benefits

| Feature | HTTP/1.1 | HTTP/2 | Performance Impact |
|---------|----------|--------|-------------------|
| Connections | Multiple per domain | Single connection | Reduced latency |
| Requests | Sequential | Multiplexed | Parallel loading |
| Headers | Repeated each request | Compressed (HPACK) | 85-90% smaller headers |
| Server Push | Not supported | Supported | Preemptive resource loading |

### HTTP/2 Header Compression

Header compression significantly reduces overhead for APIs with authentication and custom headers.

| Scenario | HTTP/1.1 Headers | HTTP/2 Headers | Savings |
|----------|------------------|----------------|---------|
| First request | 800 bytes | 800 bytes | 0% |
| Subsequent requests | 800 bytes | ~50 bytes | 94% |

### HTTP/3 Advantages

HTTP/3 uses QUIC protocol over UDP for additional improvements:

- **Zero-RTT connections**: Faster initial requests
- **No head-of-line blocking**: Lost packets don't delay other streams
- **Better mobile performance**: Handles network changes gracefully
- **Built-in encryption**: TLS 1.3 required

### Protocol Recommendations

| Environment | Recommended Protocol | Fallback |
|-------------|---------------------|----------|
| Public APIs | HTTP/2 | HTTP/1.1 |
| Internal microservices | HTTP/2 or gRPC | HTTP/2 |
| Mobile clients | HTTP/3 | HTTP/2 |
| Legacy systems | HTTP/1.1 | N/A |

### API Design for HTTP/2

1. **Avoid domain sharding**: HTTP/2 handles this automatically
2. **Don't concatenate requests**: Multiplexing makes this unnecessary
3. **Use smaller, focused endpoints**: Multiple parallel requests are efficient
4. **Consider server push carefully**: Often adds complexity without benefit

## CDN Integration

Content Delivery Networks (CDNs) cache responses at edge locations closer to users.

### Cache Headers for CDN

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=60, s-maxage=300
Vary: Accept, Accept-Encoding
Surrogate-Control: max-age=3600

{
  "data": [...]
}
```

#### CDN-Specific Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `s-maxage` | CDN cache duration (overrides max-age) | `s-maxage=300` |
| `Surrogate-Control` | CDN-specific caching rules | `max-age=3600` |
| `Vary` | Cache key variations | `Vary: Accept, Accept-Encoding` |
| `Surrogate-Key` | Cache tag for invalidation | `Surrogate-Key: products product-123` |

### Vary Header Usage

The `Vary` header tells caches which request headers affect the response.

```http
HTTP/1.1 200 OK
Content-Type: application/json
Vary: Accept, Accept-Encoding, Authorization
Cache-Control: private, max-age=300
```

#### Common Vary Header Values

| Header | When to Include | Impact |
|--------|-----------------|--------|
| `Accept` | Content negotiation | Separate cache per format |
| `Accept-Encoding` | Compression varies | Separate cache per encoding |
| `Accept-Language` | Localized responses | Separate cache per language |
| `Authorization` | User-specific data | Usually means no shared caching |

### CDN Cache Invalidation

```http
PURGE /v1/products/12345 HTTP/1.1
Host: api.example.com
X-Purge-Key: secret-purge-key
```

Or using surrogate keys:

```http
PURGE / HTTP/1.1
Host: api.example.com
Surrogate-Key: product-12345
X-Purge-Key: secret-purge-key
```

## Performance Monitoring

Track these metrics to maintain API performance.

### Key Performance Indicators

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| P50 latency | < 100ms | > 200ms |
| P95 latency | < 300ms | > 500ms |
| P99 latency | < 500ms | > 1000ms |
| Error rate | < 0.1% | > 1% |
| Cache hit rate | > 80% | < 50% |
| Compression ratio | > 70% | < 50% |

### Performance Headers Summary

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Cache-Control` | Response | Caching instructions |
| `ETag` | Response | Resource version identifier |
| `Last-Modified` | Response | Modification timestamp |
| `If-None-Match` | Request | Conditional ETag check |
| `If-Modified-Since` | Request | Conditional time check |
| `Accept-Encoding` | Request | Supported compression |
| `Content-Encoding` | Response | Applied compression |
| `Vary` | Response | Cache key variations |
| `Server-Timing` | Response | Performance diagnostics |

## Common Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| No caching headers | Every request hits origin | Add appropriate Cache-Control |
| `Cache-Control: no-cache` everywhere | Defeats caching benefits | Use specific cache strategies |
| Missing compression | Large payloads, slow transfers | Enable gzip/Brotli |
| Offset pagination on large datasets | Slow queries at high page numbers | Use cursor pagination |
| Returning all fields always | Wasted bandwidth | Support sparse fieldsets |
| Ignoring ETags | Repeated full downloads | Implement conditional requests |
| No response time monitoring | Blind to performance issues | Add Server-Timing header |

## Implementation Checklist

### Caching
- [ ] Set appropriate `Cache-Control` headers for each endpoint
- [ ] Implement ETag generation for cacheable resources
- [ ] Support `If-None-Match` conditional requests
- [ ] Configure CDN cache rules

### Response Times
- [ ] Define SLAs for each endpoint type
- [ ] Add `Server-Timing` header for diagnostics
- [ ] Monitor P50, P95, P99 latencies
- [ ] Set up alerts for threshold violations

### Optimization
- [ ] Enable gzip and Brotli compression
- [ ] Support sparse fieldsets where beneficial
- [ ] Implement cursor pagination for large collections
- [ ] Set response size limits

### Protocol
- [ ] Enable HTTP/2 on all servers
- [ ] Test HTTP/3 support for mobile clients
- [ ] Remove HTTP/1.1-era optimizations (domain sharding, concatenation)

## Related Documentation

- [API Observability Standards](api-observability-standards.md) - Monitoring and metrics
- [API Analytics & Insights](api-analytics-insights.md) - Usage analytics and business metrics
- [Pagination and Filtering](../request-response/pagination-and-filtering.md) - Detailed pagination patterns
- [Streaming APIs](../request-response/streaming-apis.md) - Large data transfer patterns
- [Rate Limiting Standards](../security/rate-limiting-standards.md) - Request throttling
