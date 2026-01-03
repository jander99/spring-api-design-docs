# Performance Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 18 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Data, Architecture
> 
> **📊 Complexity:** 10.6 grade level • 0.7% technical density • fairly easy

## Why Performance Matters

Slow APIs cost real money. A checkout API that takes 3 seconds instead of 300ms loses customers. Every extra second of delay reduces conversions by up to 7%.

**Real-world impact example:**

An e-commerce site processes 1000 orders per hour. Their order API responds in 2 seconds. Users abandon 15% of carts due to slowness. That's 150 lost orders per hour.

After optimization, the API responds in 300ms. Cart abandonment drops to 3%. They now lose only 30 orders per hour. That's 120 more orders per hour—over $50,000 more revenue per day.

Performance affects three key areas:
1. **User experience**: Fast APIs feel responsive
2. **Business revenue**: Speed drives conversions
3. **System costs**: Efficient APIs need fewer servers

## Overview

This guide shows you how to build fast APIs. You'll learn response time targets for different operations. You'll optimize pagination and payloads. You'll use modern HTTP versions. You'll monitor performance actively.

**What you'll learn:**
- Response time targets by operation type
- Pagination strategies for speed
- Payload size optimization
- HTTP/2 and HTTP/3 benefits
- Performance monitoring methods

**Good API performance means:**
- Most requests finish quickly
- Network bandwidth is used efficiently
- The system scales under heavy load
- Clients get predictable behavior

## Response Time SLAs

### Understanding SLAs

A Service Level Agreement (SLA) is a performance promise. It sets clear targets for how fast your API should respond.

Every SLA has three parts:
- **Target**: The desired response time (like 200ms)
- **Percentile**: How many requests must meet the target (like 95%)
- **Window**: How often you measure (like every hour)

**Example SLA**: "95% of GET requests finish in under 200ms each hour"

This means 95 out of 100 requests must complete in 200ms or less. The SLA balances user needs with what your system can deliver.

### Response Time Targets by Operation Type

Different operations need different response times. Simple lookups should be fast. Complex searches can take longer.

| Operation Type | Target (p50) | Target (p95) | Target (p99) | Why |
|----------------|--------------|--------------|--------------|-----|
| Simple GET | 50-100ms | 150-200ms | 250-300ms | Looks up one resource |
| Collection GET | 100-200ms | 250-400ms | 400-600ms | Combines multiple resources |
| Search/Filter | 200-400ms | 500-800ms | 800-1200ms | Processes queries |
| POST/PUT | 100-250ms | 300-500ms | 500-750ms | Writes and validates data |
| DELETE | 50-150ms | 200-300ms | 300-400ms | Usually simple |
| Batch operations | 500-2000ms | 2000-4000ms | 4000-6000ms | Processes many operations |

**Note**: These targets assume fast networks (under 50ms delay). Add your network time to these numbers.

### Simple Resource Retrieval

GET requests for individual resources should be fast:

```http
GET /users/user-123 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
Server-Timing: db;dur=12, total;dur=45

{
  "id": "user-123",
  "name": "Alice Smith",
  "email": "alice@example.com"
}
```

**Performance Targets**:
- p50: 50-100ms
- p95: 150-200ms
- p99: 250-300ms

**How to optimize**:
- Add database indexes on ID fields
- Cache resources that are accessed often
- Keep response payloads small
- Use connection pooling to reuse connections

### Collection Endpoints

Collections take longer than single items. They combine multiple resources into one response.

```http
GET /users?page=0&size=20 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
Server-Timing: db;dur=85, total;dur=145

{
  "data": [
    {"id": "user-123", "name": "Alice Smith"},
    {"id": "user-456", "name": "Bob Jones"}
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 1543
    }
  }
}
```

**Performance Targets**:
- p50: 100-200ms
- p95: 250-400ms
- p99: 400-600ms

**How to optimize**:
- Limit default page size to 20-50 items
- Add indexes on fields used for sorting
- Use cursor pagination for large datasets
- Make total counts optional when you have millions of records

### Search and Filter Operations

Search operations process queries. This takes more time than simple lookups.

```http
GET /products?search=laptop&category=electronics&minPrice=500 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
Server-Timing: search;dur=245, db;dur=156, total;dur=425

{
  "data": [
    {
      "id": "prod-789",
      "name": "Professional Laptop",
      "category": "electronics",
      "price": 1299.99
    }
  ],
  "meta": {
    "resultCount": 47,
    "searchTerms": ["laptop"],
    "appliedFilters": {
      "category": "electronics",
      "minPrice": 500
    }
  }
}
```

**Performance Targets**:
- p50: 200-400ms
- p95: 500-800ms
- p99: 800-1200ms

**How to optimize**:
- Add full-text search indexes
- Cache search results
- Limit how many filters run at once
- Use dedicated search tools like Elasticsearch for complex searches

### Write Operations

Write operations (POST and PUT) validate data and save it. This adds processing time.

```http
POST /orders HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "customerId": "cust-456",
  "items": [
    {"productId": "prod-789", "quantity": 1}
  ]
}

HTTP/1.1 201 Created
Location: /orders/order-abc123
Content-Type: application/json
Server-Timing: validation;dur=15, db;dur=120, total;dur=185

{
  "id": "order-abc123",
  "status": "PENDING",
  "total": 1299.99
}
```

**Performance Targets**:
- p50: 100-250ms
- p95: 300-500ms
- p99: 500-750ms

**How to optimize**:
- Run validation checks quickly
- Use database transactions only when needed
- Move complex work to background jobs
- Return a response right after saving data

### Batch Operations

Batch endpoints handle many operations in one request. This saves network round trips but takes longer.

```http
POST /products/batch HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "operations": [
    {"action": "create", "data": {"name": "Widget A"}},
    {"action": "create", "data": {"name": "Widget B"}},
    {"action": "update", "id": "prod-123", "data": {"price": 29.99}}
  ]
}

HTTP/1.1 207 Multi-Status
Content-Type: application/json
Server-Timing: batch;dur=1847, total;dur=1925

{
  "results": [
    {"index": 0, "status": 201, "id": "prod-new1"},
    {"index": 1, "status": 201, "id": "prod-new2"},
    {"index": 2, "status": 200, "id": "prod-123"}
  ],
  "summary": {
    "total": 3,
    "succeeded": 3,
    "failed": 0
  }
}
```

**Performance Targets**:
- p50: 500-2000ms (depends on batch size)
- p95: 2000-4000ms
- p99: 4000-6000ms

**How to optimize**:
- Limit batches to 100 operations maximum
- Process items in parallel when you can
- Use bulk database operations instead of one-by-one
- Move large batches to background processing

### Long-Running Operations

Some operations take too long for a normal HTTP request. Use async patterns for these.

```http
POST /reports/sales HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "format": "PDF"
}

HTTP/1.1 202 Accepted
Location: /operations/op-def456
Content-Type: application/json
Server-Timing: queue;dur=23, total;dur=35

{
  "operationId": "op-def456",
  "status": "PROCESSING",
  "statusUrl": "/operations/op-def456",
  "estimatedCompletion": "2024-07-15T14:35:00Z"
}
```

**When to Use Async**:
- Operations taking over 30 seconds
- Complex report generation
- Large file processing
- Multiple slow external service calls

See [Async Operations](async-operations.md) for detailed patterns.

## Pagination Performance Patterns

### Page Size Optimization

Page size has a big impact on performance. Smaller pages are faster. Larger pages need fewer requests.

**Small Pages (10-20 items)**:
- Faster response times
- More network requests
- Better for mobile clients
- Suitable for real-time feeds

**Medium Pages (20-50 items)**:
- Balanced approach
- Good default choice
- Works well for most use cases

**Large Pages (50-100 items)**:
- Fewer network requests
- Higher response times
- More bandwidth use
- Risk of timeouts

**Example Configuration**:

```http
GET /products?page=0&size=20 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
Link: </products?page=1&size=20>; rel="next"
X-Page-Size-Limit: 100
Server-Timing: total;dur=156

{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 5420,
      "totalPages": 271
    }
  }
}
```

**Recommendations**:
- Default: 20-25 items
- Maximum: 100 items
- Allow client to adjust within limits
- Document limits clearly

### Offset vs Cursor Pagination

**Offset-Based Pagination**:

```http
GET /products?page=10&size=20 HTTP/1.1

HTTP/1.1 200 OK
Server-Timing: db;dur=245, total;dur=287

{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 10,
      "size": 20
    }
  }
}
```

**What it does well**:
- Simple to build
- Easy to jump to any page
- Shows total record counts

**What it does poorly**:
- Slows down with high page numbers
- Inefficient for millions of records

**Use offset pagination when**:
- You have under 100,000 records
- Users need to jump to specific pages
- Total counts matter to users

**Cursor-Based Pagination**:

```http
GET /products?cursor=eyJpZCI6MTIzNDV9&limit=20 HTTP/1.1

HTTP/1.1 200 OK
Server-Timing: db;dur=45, total;dur=78

{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTIzNjV9",
    "hasMore": true,
    "limit": 20
  }
}
```

**What it does well**:
- Fast at any position in the dataset
- Scales to millions of records
- Handles data changes while paging

**What it does poorly**:
- Cannot jump to specific pages
- Harder to implement

**Use cursor pagination when**:
- You have over 100,000 records
- Users browse sequentially
- You stream real-time data
- Performance matters most

### Total Count Performance

Counting millions of records is slow. The database must scan all records to get an accurate count.

**With Count (Slower)**:

```http
GET /products?page=0&size=20 HTTP/1.1

HTTP/1.1 200 OK
Server-Timing: count;dur=1245, data;dur=45, total;dur=1312

{
  "data": [...],
  "meta": {
    "pagination": {
      "totalElements": 2847391,
      "totalPages": 142370
    }
  }
}
```

**Without Count (Faster)**:

```http
GET /products?page=0&size=20&includeCount=false HTTP/1.1

HTTP/1.1 200 OK
Server-Timing: data;dur=45, total;dur=67

{
  "data": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6MjB9"
  }
}
```

**How to optimize**:
- Make total counts optional for large collections
- Cache count values for a short time
- Use approximate counts for very large datasets
- Switch to cursor pagination to avoid counting

## Payload Size Optimization

### Response Compression

Compression makes responses smaller. This reduces bandwidth and speeds up transfers.

```http
GET /products HTTP/1.1
Host: api.example.com
Accept-Encoding: br, gzip, deflate

HTTP/1.1 200 OK
Content-Type: application/json
Content-Encoding: br
Vary: Accept-Encoding
Content-Length: 1247

[compressed data]
```

**Compression Methods**:

| Algorithm | Compression Ratio | Speed | Browser Support |
|-----------|-------------------|-------|-----------------|
| Brotli (br) | 15-20% better than gzip | Medium | Modern browsers (2016+) |
| Gzip | Good (60-70% reduction) | Fast | Universal |
| Deflate | Similar to gzip | Fast | Universal |

**Recommendations**:
- Use Brotli for static resources
- Use gzip for dynamic content
- Compress responses over 1KB
- Don't compress images or already-compressed files

**Size Impact Example**:

```json
// Uncompressed: 2,847 bytes
{
  "products": [
    {
      "id": "prod-12345",
      "name": "Professional Wireless Keyboard",
      "description": "High-quality wireless keyboard with mechanical switches...",
      "price": 129.99,
      "category": "electronics",
      "inStock": true,
      "tags": ["keyboard", "wireless", "mechanical", "gaming"]
    }
    // ... 19 more products
  ]
}

// Gzip compressed: ~875 bytes (69% reduction)
// Brotli compressed: ~734 bytes (74% reduction)
```

### Field Filtering

Let clients ask for only the fields they need. This reduces payload size significantly.

```http
GET /products/prod-123?fields=id,name,price HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
Server-Timing: total;dur=34

{
  "id": "prod-123",
  "name": "Wireless Keyboard",
  "price": 129.99
}
```

**Benefits**:
- Smaller payloads
- Faster serialization
- Less bandwidth use
- Reduced client processing

**Full vs Filtered Comparison**:

```http
# Full response: 847 bytes
GET /products/prod-123

{
  "id": "prod-123",
  "name": "Wireless Keyboard",
  "description": "High-quality wireless keyboard...",
  "price": 129.99,
  "category": "electronics",
  "manufacturer": {...},
  "specifications": {...},
  "reviews": {...},
  "relatedProducts": [...]
}

# Filtered response: 87 bytes (90% reduction)
GET /products/prod-123?fields=id,name,price

{
  "id": "prod-123",
  "name": "Wireless Keyboard",
  "price": 129.99
}
```

### Response Formats

JSON is the standard format. But other formats work better for some use cases.

**JSON (Default)**:

```http
GET /products HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 2847

{
  "products": [...]
}
```

**NDJSON for Streaming**:

```http
GET /products/stream HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked

{"id":"prod-1","name":"Keyboard","price":129.99}
{"id":"prod-2","name":"Mouse","price":49.99}
{"id":"prod-3","name":"Monitor","price":399.99}
```

**NDJSON Benefits**:
- Start processing immediately
- Lower memory usage
- Better for large datasets
- Easier error recovery

See [Streaming APIs](../request-response/streaming-apis.md) for detailed patterns.

### Payload Size Limits

Set limits on request sizes. This prevents abuse and protects your servers.

```http
POST /products HTTP/1.1
Content-Type: application/json
Content-Length: 15728640

[15MB payload]

HTTP/1.1 413 Content Too Large
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/payload-too-large",
  "title": "Payload Too Large",
  "status": 413,
  "detail": "Request body exceeds maximum size of 5MB",
  "maxSize": 5242880,
  "receivedSize": 15728640
}
```

**Recommended Limits**:

| Endpoint Type | Limit | Rationale |
|---------------|-------|-----------|
| Simple POST/PUT | 1-5MB | Sufficient for most entities |
| File uploads | 10-50MB | Balance between usability and resources |
| Batch operations | 5-10MB | Depends on batch size limits |
| Webhooks | 100-500KB | Fast delivery required |

## HTTP/2 and HTTP/3 Benefits

### HTTP/2 Improvements

HTTP/2 is much faster than HTTP/1.1. It handles multiple requests at once on one connection.

**Multiplexing**:

```
HTTP/1.1: Sequential requests
┌─────────┐ wait ┌─────────┐ wait ┌─────────┐
│Request 1│─────>│Request 2│─────>│Request 3│
└─────────┘      └─────────┘      └─────────┘

HTTP/2: Parallel requests on single connection
┌─────────┐
│Request 1│──┐
└─────────┘  │
┌─────────┐  │  ┌──────────────┐
│Request 2│──┼─>│Single TCP    │
└─────────┘  │  │Connection    │
┌─────────┐  │  └──────────────┘
│Request 3│──┘
└─────────┘
```

**Benefits**:
- Multiple requests don't block each other
- One connection handles many requests
- Resources load faster
- Lower latency overall

**Header Compression (HPACK)**:

HTTP/1.1 headers for 10 requests: ~5000 bytes
HTTP/2 headers for 10 requests: ~800 bytes (84% reduction)

**Server Push (Optional)**:

```http
# Client requests
GET /products/prod-123 HTTP/2

# Server responds and pushes related resources
HTTP/2 200 OK
Content-Type: application/json

{
  "id": "prod-123",
  "imageUrl": "/images/prod-123.jpg"
}

# Server pushes image before client requests it
PUSH_PROMISE
:path: /images/prod-123.jpg

HTTP/2 200 OK
Content-Type: image/jpeg
[image data]
```

**Server push trade-offs**:
- Reduces network round trips
- Might push resources the client doesn't need
- Clients can reject pushed resources
- Works poorly with caching

### HTTP/3 Improvements

HTTP/3 builds on HTTP/2 using the QUIC protocol. It's faster and more reliable.

**Key benefits**:

1. **No packet blocking**: Lost packets only affect one request
2. **Faster reconnect**: Known servers reconnect instantly (0-RTT)
3. **Better on mobile**: Handles network switches smoothly
4. **Faster recovery**: Resends data more efficiently

**Connection Upgrade**:

```http
# Client discovers HTTP/3 support
GET /products HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Alt-Svc: h3=":443"; ma=86400
Content-Type: application/json

# Subsequent requests use HTTP/3
GET /orders HTTP/3
Host: api.example.com

HTTP/3 200 OK
Content-Type: application/json
```

**Performance Impact**:
- 0-RTT reduces delay by 50-100ms on reconnect
- Better performance on unreliable networks
- 5-15% improvement in real use

### Protocol Migration Strategy

**Phase 1: Enable HTTP/2**

```http
# Announce HTTP/2 support
HTTP/1.1 200 OK
Upgrade: h2c
Connection: Upgrade
```

**Phase 2: Add HTTP/3 Support**

```http
# Advertise HTTP/3 availability
HTTP/2 200 OK
Alt-Svc: h3=":443"; ma=86400
```

**Phase 3: Monitor and Optimize**

Track protocol usage:
- HTTP/1.1 usage percentage
- HTTP/2 adoption rate
- HTTP/3 connection success rate
- Performance improvements per protocol

## Performance Monitoring

### Server-Timing Header

Use the Server-Timing header to show clients where time is spent. This helps debug slow requests.

```http
GET /products/search?q=laptop HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
Server-Timing: cache;desc="Cache Lookup";dur=3.2,
               db;desc="Database Query";dur=127.5,
               serialize;desc="JSON Serialization";dur=15.8,
               total;dur=156.4

{
  "results": [...]
}
```

**Common Metrics**:

| Metric | Description | Example |
|--------|-------------|---------|
| `cache` | Cache lookup time | `cache;dur=3.2` |
| `db` | Database query time | `db;dur=127.5` |
| `auth` | Authentication time | `auth;dur=12.3` |
| `serialize` | Serialization time | `serialize;dur=15.8` |
| `total` | Total processing time | `total;dur=156.4` |

### Response Time Percentiles

Percentiles show how response time varies across all requests. They tell you more than averages.

```
p50 (median):  145ms  ← Half of requests finish faster
p75:           234ms  ← 75% finish faster
p90:           387ms  ← 90% finish faster
p95:           512ms  ← SLAs usually target this
p99:           891ms  ← Watch for outliers here
p99.9:        2145ms  ← Extreme outliers
```

**Why percentiles matter**:
- Averages hide slow requests
- p50 (median) shows typical performance
- p95 and p99 show worst case for most users
- p99.9 catches extreme slowdowns

**Example Metrics**:

```http
# Good performance
p50: 120ms, p95: 280ms, p99: 450ms

# Performance degradation
p50: 125ms, p95: 1200ms, p99: 3400ms
# Action: Investigate p95+ latency causes
```

### Performance Budgets

A performance budget sets hard limits for each endpoint. This prevents performance from degrading over time.

```json
{
  "performanceBudgets": {
    "endpoints": {
      "GET /users/:id": {
        "p50": "100ms",
        "p95": "200ms",
        "p99": "300ms"
      },
      "GET /products": {
        "p50": "200ms",
        "p95": "400ms",
        "p99": "600ms"
      },
      "POST /orders": {
        "p50": "250ms",
        "p95": "500ms",
        "p99": "750ms"
      }
    },
    "payloadSizes": {
      "responseMax": "5MB",
      "requestMax": "1MB"
    }
  }
}
```

### Monitoring Best Practices

**1. Track core metrics**:
- Request rate: How many requests per second
- Error rate: What percentage fail
- Response time: Use percentiles not averages
- Payload sizes: Track p95 and p99

**2. Set alerts**:
- p95 exceeds your target by 50%
- Error rate goes over 1%
- Request rate spikes suddenly
- Database queries slow down

**3. Review regularly**:
- Check performance reports weekly
- Review SLA compliance monthly
- Adjust budgets quarterly
- Reassess targets yearly

## Best Practices Summary

### 1. Set Realistic Targets

Match your targets to what each operation does:
- Simple reads: 50-200ms at p95
- Complex searches: 500-800ms at p95
- Writes: 300-500ms at p95
- Batch operations: 2-4 seconds at p95

### 2. Optimize Pagination

Pick the right pagination for your data size:
- Under 100K records: Use offset pagination
- Over 100K records: Use cursor pagination
- Millions of records: Make counts optional

### 3. Reduce Payload Sizes

Send less data over the network:
- Turn on compression (Brotli or gzip)
- Let clients filter fields
- Use NDJSON for large streams
- Set payload size limits

### 4. Leverage Modern HTTP

Upgrade your HTTP version:
- Enable HTTP/2 for parallel requests
- Use header compression automatically
- Try HTTP/3 for mobile users
- Track which versions clients use

### 5. Monitor Continuously

Watch performance actively:
- Add Server-Timing headers
- Track percentiles not averages
- Set performance budgets
- Alert when performance drops

### 6. Document Performance

Make your SLAs clear to users:
- Publish your response time targets
- Document payload size limits
- Explain timeout values
- Share your monitoring dashboards

## Related Documentation

- [HTTP Caching](./http-caching.md): Reduce response times with effective caching
- [Rate Limiting](./rate-limiting.md): Protect performance under load
- [Pagination and Filtering](../request-response/pagination-and-filtering.md): Collection performance patterns
- [Async Operations](./async-operations.md): Handle long-running tasks
- [Streaming APIs](../request-response/streaming-apis.md): Efficient large dataset delivery
- [API Observability Standards](./api-observability-standards.md): Comprehensive monitoring patterns

## Performance Checklist

Before deploying your API:

- [ ] Response time targets defined for all endpoints
- [ ] Pagination strategy chosen based on dataset size
- [ ] Compression enabled for responses over 1KB
- [ ] Payload size limits enforced
- [ ] HTTP/2 enabled
- [ ] Server-Timing headers implemented
- [ ] Performance monitoring active
- [ ] SLAs documented and published
- [ ] Alert thresholds configured
- [ ] Performance budgets established

---

[← Back to Advanced Patterns](./README.md) | [View All API Design Guides](../README.md)
