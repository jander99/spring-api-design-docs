# HTTP Caching

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 19 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** HTTP fundamentals, API design basics  
> **🎯 Key Topics:** Caching, Performance, Scalability
> 
> **📊 Complexity:** 14.4 grade level • 0.7% technical density • fairly difficult

## Overview

HTTP caching stores API responses for reuse. This improves performance and reduces server load.

Good caching strategies offer:
- Faster response times
- Less bandwidth use
- Lower infrastructure costs
- Better user experience

This guide covers RFC 7234 caching rules. It shows best practices for REST APIs.

## Why HTTP Caching Matters

### Benefits of Caching

1. **Reduced Latency**: Cached responses return instantly without server processing
2. **Lower Bandwidth**: Fewer bytes transferred between client and server
3. **Decreased Server Load**: Fewer requests reach your backend services
4. **Improved Scalability**: Handle more users with existing infrastructure
5. **Cost Savings**: Reduced computational and network costs

### When to Use Caching

| Resource Type | Caching Strategy |
|---------------|------------------|
| Static content (images, CSS, JS) | Long-term caching with versioned URLs |
| Product catalogs | Short to medium-term caching with validation |
| User-specific data | Private caching with short TTL |
| Real-time data | No caching or very short TTL |
| Search results | Short-term caching with validation |

## Cache-Control Directives

The `Cache-Control` header controls caching behavior in HTTP/1.1 and later versions. It is the main tool for managing cache rules.

### Basic Cache-Control Patterns

#### Public Caching

Allow any cache (browser, proxy, CDN) to store the response:

```http
GET /products/product-123 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
Content-Type: application/json

{
  "id": "product-123",
  "name": "Widget",
  "price": 29.99
}
```

#### Private Caching

Only allow browser caches to store the response:

```http
GET /users/me HTTP/1.1
Host: api.example.com
Authorization: Bearer token123

HTTP/1.1 200 OK
Cache-Control: private, max-age=300
Content-Type: application/json

{
  "id": "user-456",
  "email": "user@example.com",
  "preferences": {...}
}
```

#### No Caching

Prevent all caching:

```http
GET /orders/current HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Cache-Control: no-store, no-cache, must-revalidate
Content-Type: application/json

{
  "orderId": "order-789",
  "status": "PENDING",
  "total": 99.99
}
```

### Common Cache-Control Directives

| Directive | Purpose | Example Use Case |
|-----------|---------|------------------|
| `public` | Allow shared caches | Product catalogs, public content |
| `private` | Browser cache only | User-specific data |
| `max-age=N` | Cache for N seconds | Time-based expiration |
| `s-maxage=N` | Shared cache max age | CDN-specific caching |
| `no-cache` | Revalidate before use | Frequently updated content |
| `no-store` | Never cache | Sensitive data |
| `must-revalidate` | Validate when stale | Critical data accuracy |
| `immutable` | Never revalidate | Versioned static assets |

### Advanced Cache-Control Combinations

#### CDN with Browser Fallback

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=300, s-maxage=3600
Content-Type: application/json

{
  "products": [...]
}
```

This response sets these rules:
- CDNs cache for 1 hour (`s-maxage=3600`)
- Browsers cache for 5 minutes (`max-age=300`)
- Any cache can store it (public)

#### Conditional Caching

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=600, must-revalidate
Content-Type: application/json

{
  "data": "content"
}
```

This response sets these rules:
- Caches for 10 minutes
- Must check with server when expired
- Keeps data accurate after cache expires

## ETags and Conditional Requests

ETags (entity tags) help with validation-based caching. They let clients check if cached content is still valid. This check happens without downloading the content again.

### Strong ETags

Strong ETags mean the response is exactly the same, byte-for-byte:

```http
GET /products/product-123 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
ETag: "v1-abc123def456"
Cache-Control: public, max-age=3600
Content-Type: application/json

{
  "id": "product-123",
  "name": "Widget",
  "price": 29.99
}
```

### Weak ETags

Weak ETags mean the content is the same but minor details may differ:

```http
HTTP/1.1 200 OK
ETag: W/"v1-abc123"
Cache-Control: public, max-age=600
Content-Type: application/json

{
  "id": "product-123",
  "name": "Widget",
  "price": 29.99,
  "timestamp": "2024-07-15T14:30:00Z"
}
```

Use weak ETags when:
- Response includes timestamps that change but content stays the same
- Small formatting differences are okay
- Gzip compression might differ

### Conditional GET with If-None-Match

The client sends the cached ETag. The server checks if the content is still fresh:

```http
GET /products/product-123 HTTP/1.1
Host: api.example.com
If-None-Match: "v1-abc123def456"

HTTP/1.1 304 Not Modified
ETag: "v1-abc123def456"
Cache-Control: public, max-age=3600
```

The 304 response tells the client:
- No body is sent (saves bandwidth)
- The cached content is still good
- Here are updated cache headers (new expiration time)

### Conditional GET with Multiple ETags

```http
GET /products/product-123 HTTP/1.1
Host: api.example.com
If-None-Match: "v1-abc123", "v2-def456", W/"v3-ghi789"

HTTP/1.1 200 OK
ETag: "v4-jkl012"
Content-Type: application/json

{
  "id": "product-123",
  "name": "Widget Pro",
  "price": 39.99
}
```

None of the ETags matched. The server sends the new content.

## Last-Modified and Time-Based Validation

The `Last-Modified` header provides time-based validation. You can use it instead of ETags or together with them.

### Last-Modified Response

```http
GET /products/product-123 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Last-Modified: Mon, 15 Jul 2024 14:00:00 GMT
Cache-Control: public, max-age=3600
Content-Type: application/json

{
  "id": "product-123",
  "name": "Widget",
  "price": 29.99
}
```

### Conditional Request with If-Modified-Since

```http
GET /products/product-123 HTTP/1.1
Host: api.example.com
If-Modified-Since: Mon, 15 Jul 2024 14:00:00 GMT

HTTP/1.1 304 Not Modified
Last-Modified: Mon, 15 Jul 2024 14:00:00 GMT
Cache-Control: public, max-age=3600
```

### Combined ETag and Last-Modified

Use both headers together. This works with more clients:

```http
HTTP/1.1 200 OK
ETag: "v1-abc123"
Last-Modified: Mon, 15 Jul 2024 14:00:00 GMT
Cache-Control: public, max-age=3600
Content-Type: application/json

{
  "id": "product-123",
  "name": "Widget",
  "price": 29.99
}
```

The client can use one method or both:

```http
GET /products/product-123 HTTP/1.1
Host: api.example.com
If-None-Match: "v1-abc123"
If-Modified-Since: Mon, 15 Jul 2024 14:00:00 GMT

HTTP/1.1 304 Not Modified
ETag: "v1-abc123"
Last-Modified: Mon, 15 Jul 2024 14:00:00 GMT
```

## Validation Patterns

### Successful Validation (304 Not Modified)

When cached content is still valid:

```http
# Request with validation
GET /api/products HTTP/1.1
If-None-Match: "v1-hash123"
If-Modified-Since: Mon, 15 Jul 2024 14:00:00 GMT

# Response confirming validity
HTTP/1.1 304 Not Modified
ETag: "v1-hash123"
Last-Modified: Mon, 15 Jul 2024 14:00:00 GMT
Cache-Control: public, max-age=3600
```

### Failed Validation (200 OK with New Content)

When cached content is outdated:

```http
# Request with validation
GET /api/products HTTP/1.1
If-None-Match: "v1-hash123"

# Response with updated content
HTTP/1.1 200 OK
ETag: "v2-hash456"
Last-Modified: Mon, 15 Jul 2024 16:00:00 GMT
Cache-Control: public, max-age=3600
Content-Type: application/json

{
  "products": [
    {"id": "product-123", "name": "Updated Widget", "price": 34.99}
  ]
}
```

### Precondition Failed (412)

When the client requires a specific version:

```http
# Request requiring exact match
GET /api/products/product-123 HTTP/1.1
If-Match: "v1-hash123"

# Response when version doesn't match
HTTP/1.1 412 Precondition Failed
ETag: "v2-hash456"
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/precondition-failed",
  "title": "Precondition Failed",
  "status": 412,
  "detail": "Resource version has changed"
}
```

## CDN Integration Patterns

### CDN Cache Control

Set different cache times for CDN and browser:

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=300, s-maxage=86400
Vary: Accept-Encoding
Content-Type: application/json

{
  "products": [...]
}
```

This configuration sets these rules:
- CDN caches for 24 hours (`s-maxage=86400`)
- Browser caches for 5 minutes (`max-age=300`)
- Different cache entries for different compression types

### CDN with Stale-While-Revalidate

Serve old content while updating in the background:

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=600, stale-while-revalidate=86400
Content-Type: application/json

{
  "products": [...]
}
```

How it works:
- Fresh for 10 minutes
- Can serve old content for up to 24 hours while checking for updates
- Improves performance during cache updates

### CDN with Stale-If-Error

Serve old content when the origin server is down:

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600, stale-if-error=86400
Content-Type: application/json

{
  "products": [...]
}
```

How it works:
- Fresh for 1 hour
- If origin errors, serve old content for up to 24 hours
- Keeps your API working during outages

### Vary Header for Content Negotiation

Cache different versions based on request headers. The CDN stores separate copies for each variation:

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
Vary: Accept, Accept-Encoding, Accept-Language
Content-Type: application/json

{
  "products": [...]
}
```

The CDN stores separate cache entries for each:
- Content type (`Accept`)
- Compression method (`Accept-Encoding`)
- Language (`Accept-Language`)

## Cache Invalidation Strategies

### Time-Based Expiration

The simplest approach. Content expires after a fixed time period:

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
Content-Type: application/json
```

**Pros**: Simple and automatic  
**Cons**: May serve old data until it expires

### Validation-Based Invalidation

Client validates on each request:

```http
HTTP/1.1 200 OK
Cache-Control: public, no-cache
ETag: "v1-hash123"
Content-Type: application/json
```

**Pros**: Data is always current  
**Cons**: Needs a validation request each time

### Event-Based Invalidation

Invalidate cache when data changes:

```http
# Purge request to CDN
PURGE /products/product-123 HTTP/1.1
Host: cdn.example.com
X-Purge-Key: secret-key-123

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "purged",
  "urls": ["/products/product-123"]
}
```

**Pros**: Updates happen right away  
**Cons**: Needs CDN support for purging

### Surrogate Keys for Bulk Invalidation

Group related content for efficient purging:

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
Surrogate-Key: products product-123 category-electronics
Content-Type: application/json
```

Purge all products in category:

```http
PURGE /invalidate HTTP/1.1
Host: cdn.example.com
Surrogate-Key: category-electronics

HTTP/1.1 200 OK
```

### Cache Versioning with URLs

Put the version number in the URL. This allows permanent caching:

```http
GET /api/v1/products/product-123?v=abc123 HTTP/1.1

HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
Content-Type: application/json
```

**Pros**: Always hits cache, no validation needed  
**Cons**: Must use versioned URLs

## Collection and List Caching

### Paginated List Caching

Cache individual pages with validation:

```http
GET /products?page=1&size=20 HTTP/1.1

HTTP/1.1 200 OK
Cache-Control: public, max-age=300
ETag: "page1-hash123"
Link: </products?page=2&size=20>; rel="next"
Content-Type: application/json

{
  "items": [...],
  "page": 1,
  "totalPages": 10
}
```

### Vary by Query Parameters

Each query gets its own cache entry:

```http
GET /products?category=electronics&sort=price HTTP/1.1

HTTP/1.1 200 OK
Cache-Control: public, max-age=600
Vary: Accept
ETag: "electronics-price-hash456"
Content-Type: application/json
```

### Collection Invalidation

Clear the list cache when items change:

```http
# Product updated
PUT /products/product-123 HTTP/1.1
Content-Type: application/json

{
  "name": "Updated Widget",
  "price": 34.99
}

HTTP/1.1 200 OK
X-Invalidate-Cache: /products, /products?category=electronics
```

## POST, PUT, DELETE and Cache Invalidation

### POST Response Caching

Do not cache POST responses in most cases:

```http
POST /orders HTTP/1.1
Content-Type: application/json

{
  "productId": "product-123",
  "quantity": 1
}

HTTP/1.1 201 Created
Cache-Control: no-store
Location: /orders/order-456
Content-Type: application/json

{
  "id": "order-456",
  "status": "PENDING"
}
```

### PUT with Cache Invalidation

Update the resource and clear caches:

```http
PUT /products/product-123 HTTP/1.1
Content-Type: application/json

{
  "name": "Updated Widget",
  "price": 34.99
}

HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
ETag: "v2-newhash"
X-Cache-Invalidated: /products, /products/product-123
Content-Type: application/json

{
  "id": "product-123",
  "name": "Updated Widget",
  "price": 34.99
}
```

### DELETE with Cache Purge

Delete the resource and clear it from caches:

```http
DELETE /products/product-123 HTTP/1.1

HTTP/1.1 204 No Content
X-Cache-Purged: /products/product-123, /products?category=electronics
```

## Caching Headers Summary

### Request Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `If-None-Match` | Validate using ETag | `If-None-Match: "v1-hash"` |
| `If-Modified-Since` | Validate using date | `If-Modified-Since: Mon, 15 Jul 2024 14:00:00 GMT` |
| `If-Match` | Require exact version | `If-Match: "v1-hash"` |
| `If-Unmodified-Since` | Require no change | `If-Unmodified-Since: Mon, 15 Jul 2024 14:00:00 GMT` |
| `Cache-Control` | Override cache behavior | `Cache-Control: no-cache` |

### Response Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `Cache-Control` | Caching directives | `Cache-Control: public, max-age=3600` |
| `ETag` | Version identifier | `ETag: "v1-hash123"` |
| `Last-Modified` | Last change timestamp | `Last-Modified: Mon, 15 Jul 2024 14:00:00 GMT` |
| `Expires` | Absolute expiration | `Expires: Tue, 16 Jul 2024 14:00:00 GMT` |
| `Vary` | Vary cache by headers | `Vary: Accept-Encoding` |
| `Age` | Time in cache | `Age: 300` |

## Best Practices

### 1. Choose Appropriate Cache Durations

Match cache time to how often your data changes:

- **Static content**: 1 year (`max-age=31536000`)
- **Product data**: 1 hour (`max-age=3600`)
- **User sessions**: 5 minutes (`max-age=300`)
- **Real-time data**: No caching (`no-store`)

### 2. Use ETags for Dynamic Content

Create ETags from the content:

```http
HTTP/1.1 200 OK
ETag: "hash-of-content-abc123"
Cache-Control: public, max-age=600
```

### 3. Support Validation

Allow conditional requests:

```http
HTTP/1.1 200 OK
ETag: "v1-hash"
Last-Modified: Mon, 15 Jul 2024 14:00:00 GMT
Cache-Control: public, max-age=3600
```

### 4. Use Different Cache Times for CDN and Browser

Use `s-maxage` to control CDN caching separately:

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=300, s-maxage=3600
```

### 5. Version Static Assets

Use immutable caching with versioned URLs:

```http
GET /static/v1.2.3/app.js HTTP/1.1

HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
```

### 6. Handle Vary Carefully

Only vary by headers that change the response in important ways:

```http
# Good - meaningful variation
Vary: Accept-Encoding

# Avoid - too many cache variations
Vary: User-Agent, Accept, Accept-Language, Accept-Encoding
```

### 7. Monitor Cache Performance

Track these key metrics:
- Cache hit ratio (how often cache is used)
- Bandwidth savings (data transfer reduced)
- Average response time (speed improvements)
- Validation request frequency (how often clients check freshness)

### 8. Plan Invalidation Strategy

Choose based on your needs:
- Time-based when old data is okay for a while
- Validation when data changes often
- Purging when you need immediate updates
- Versioned URLs for static files

## Common Pitfalls

### 1. Caching Authenticated Responses as Public

**Wrong**:
```http
GET /users/me HTTP/1.1
Authorization: Bearer token123

HTTP/1.1 200 OK
Cache-Control: public, max-age=3600  # WRONG!
```

**Correct**:
```http
HTTP/1.1 200 OK
Cache-Control: private, max-age=300
```

### 2. Not Setting Cache Headers

**Wrong**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
# No cache headers
```

**Correct**:
```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
ETag: "v1-hash"
```

### 3. Conflicting Cache Directives

**Wrong**:
```http
Cache-Control: public, private, max-age=3600  # Conflicting!
```

**Correct**:
```http
Cache-Control: private, max-age=3600
```

### 4. Ignoring Vary Header

**Wrong**:
```http
# Returns different content based on Accept header
# but doesn't specify Vary
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
Content-Type: application/json
```

**Correct**:
```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
Vary: Accept
Content-Type: application/json
```

## Testing Cache Behavior

### Test Cache Headers

```http
# Request
GET /products/product-123 HTTP/1.1

# Verify response includes proper headers
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
ETag: "v1-hash123"
Last-Modified: Mon, 15 Jul 2024 14:00:00 GMT
```

### Test Conditional Requests

```http
# Request with If-None-Match
GET /products/product-123 HTTP/1.1
If-None-Match: "v1-hash123"

# Verify 304 when content unchanged
HTTP/1.1 304 Not Modified
ETag: "v1-hash123"
```

### Test Cache Invalidation

```http
# Update resource
PUT /products/product-123 HTTP/1.1
Content-Type: application/json
{"price": 39.99}

# Verify new ETag
HTTP/1.1 200 OK
ETag: "v2-hash456"  # Changed from v1-hash123
```

### Test Vary Header

```http
# Request JSON
GET /products/product-123 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Vary: Accept
Content-Type: application/json

# Request XML (different cache entry)
GET /products/product-123 HTTP/1.1
Accept: application/xml

HTTP/1.1 200 OK
Vary: Accept
Content-Type: application/xml
```

## Related Documentation

- [HTTP Streaming Patterns](./http-streaming-patterns.md): Real-time data delivery patterns
- [API Observability Standards](./api-observability-standards.md): Monitoring and metrics for cache performance
- [Content Types and Structure](../request-response/content-types-and-structure.md): Response format considerations

## Implementation Notes

When implementing HTTP caching:

- **Security**: Never cache sensitive data in shared caches
- **Consistency**: Balance data freshness with performance needs
- **Monitoring**: Track cache effectiveness and adjust as needed
- **Documentation**: Document caching behavior clearly in your API docs
- **Testing**: Test cache behavior with different clients and proxies

These patterns help you build fast, scalable APIs. They work with any technology stack.
