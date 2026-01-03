# Performance Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 17 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** HTTP fundamentals, API design experience  
> **🎯 Key Topics:** Performance, Optimization, SLAs
> 
> **📊 Complexity:** Grade 14 • Advanced technical density • difficult

## Overview

Performance standards define the speed and efficiency targets for API operations. Meeting these standards ensures a responsive user experience and efficient resource use.

This guide covers:
- Response time targets for different operation types
- Pagination performance patterns
- Payload size optimization
- HTTP/2 and HTTP/3 benefits
- Performance monitoring approaches

Good API performance means:
- Fast response times for most requests
- Efficient use of network bandwidth
- Scalable operation under load
- Predictable behavior for clients

## Response Time SLAs

### Understanding SLAs

Service Level Agreements (SLAs) set performance targets. These targets balance user needs with system limits.

**Common SLA Parts**:
- **Target**: Desired response time (200ms)
- **Percentile**: What portion meets the target (p95)
- **Window**: Measurement period (per hour or day)

**Example SLA**: "95% of GET requests finish in under 200ms, measured each hour"

### Response Time Targets by Operation Type

Different operations have different performance needs:

| Operation Type | Target (p50) | Target (p95) | Target (p99) | Rationale |
|----------------|--------------|--------------|--------------|-----------|
| Simple GET | 50-100ms | 150-200ms | 250-300ms | Direct resource lookup |
| Collection GET | 100-200ms | 250-400ms | 400-600ms | Multiple resource aggregation |
| Search/Filter | 200-400ms | 500-800ms | 800-1200ms | Query processing overhead |
| POST/PUT | 100-250ms | 300-500ms | 500-750ms | Write + validation costs |
| DELETE | 50-150ms | 200-300ms | 300-400ms | Usually lightweight |
| Batch operations | 500-2000ms | 2000-4000ms | 4000-6000ms | Multiple operations bundled |

**Note**: These targets assume network delay under 50ms. Add network time to total response time.

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

**Optimization Strategies**:
- Use database indexes on ID fields
- Cache frequently accessed resources
- Minimize response payload size
- Use connection pooling

### Collection Endpoints

Paginated collections take longer because they combine multiple items:

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

**Optimization Strategies**:
- Limit default page size (20-50 items)
- Index sort fields
- Consider cursor-based pagination for large sets
- Make total counts optional for very large collections

### Search and Filter Operations

Search operations involve query processing:

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

**Optimization Strategies**:
- Use full-text search indexes
- Implement search result caching
- Limit concurrent filter complexity
- Consider dedicated search services (Elasticsearch, etc.)

### Write Operations

POST and PUT operations include validation and saving data:

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

**Optimization Strategies**:
- Validate inputs quickly
- Use database transactions carefully
- Consider async processing for complex work
- Return right after saving data

### Batch Operations

Batch endpoints process multiple operations:

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

**Optimization Strategies**:
- Limit batch size (e.g., max 100 operations)
- Process items in parallel when possible
- Use bulk database operations
- Consider async processing for large batches

### Long-Running Operations

Operations exceeding typical response times should use async patterns:

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

Page size strongly affects performance:

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

**Characteristics**:
- Simple to implement
- Easy to jump to any page
- Performance degrades with high offsets
- Inefficient for large datasets (millions of records)

**Use When**:
- Dataset under 100,000 records
- Random page access needed
- Total count is important

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

**Characteristics**:
- Same performance at any position
- Works well for large datasets
- Handles updates during paging
- Cannot jump to specific pages

**Use When**:
- Dataset over 100,000 records
- Sequential access pattern
- Real-time data streams
- Performance is critical

### Total Count Performance

Counting large datasets is expensive:

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

**Optimization Strategies**:
- Make total count optional for large collections
- Cache count values with short TTL
- Use approximate counts for very large sets
- Consider cursor pagination to avoid counts

## Payload Size Optimization

### Response Compression

Compress responses to reduce bandwidth:

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

Let clients request only needed fields:

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

JSON is standard but not always optimal:

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

Set reasonable limits to prevent abuse:

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

HTTP/2 provides major performance gains over HTTP/1.1:

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
- No request blocking at HTTP level
- Better connection use
- Faster loading of multiple resources
- Lower delay

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

**Server Push Notes**:
- Can reduce round trips
- May push unwanted resources
- Client can reject pushes
- Use with care when caching

### HTTP/3 Improvements

HTTP/3 builds on HTTP/2 with QUIC protocol:

**Key Benefits**:

1. **No TCP Request Blocking**: Lost packets affect only one stream
2. **Faster Setup**: 0-RTT reconnect for known servers
3. **Better Mobile Use**: Handles network switches smoothly
4. **Better Recovery**: More efficient resending

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

Report performance metrics to clients:

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

Track how performance varies:

```
p50 (median):  145ms  ← Half of requests faster
p75:           234ms
p90:           387ms  ← 90% of requests faster
p95:           512ms  ← SLA target often here
p99:           891ms  ← Watch for outliers
p99.9:        2145ms  ← Extreme outliers
```

**Why Percentiles Matter**:
- Average hides slow requests
- Median shows typical speed
- p95/p99 show worst case for most users
- p99.9 catches very slow requests

**Example Metrics**:

```http
# Good performance
p50: 120ms, p95: 280ms, p99: 450ms

# Performance degradation
p50: 125ms, p95: 1200ms, p99: 3400ms
# Action: Investigate p95+ latency causes
```

### Performance Budgets

Set clear performance limits:

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

**1. Track Core Metrics**:
- Request rate (requests/second)
- Error rate (percentage)
- Response time (percentiles)
- Payload sizes (percentiles)

**2. Set Alerts**:
- p95 exceeds target by 50%
- Error rate over 1%
- Request rate unusual spikes
- Database query time increases

**3. Regular Review**:
- Weekly performance reports
- Monthly SLA compliance review
- Quarterly budget adjustments
- Annual target reassessment

## Best Practices Summary

### 1. Set Realistic Targets

Match targets to operation complexity:
- Simple reads: 50-200ms (p95)
- Complex searches: 500-800ms (p95)
- Writes: 300-500ms (p95)
- Batch: 2-4 seconds (p95)

### 2. Optimize Pagination

Choose pagination strategy based on dataset:
- Small (<100K): Offset-based
- Large (>100K): Cursor-based
- Very large: Make counts optional

### 3. Reduce Payload Sizes

Minimize data transfer:
- Enable compression (Brotli/gzip)
- Support field filtering
- Use NDJSON for streams
- Set payload limits

### 4. Leverage Modern HTTP

Upgrade protocols progressively:
- Enable HTTP/2 for multiplexing
- Use header compression
- Consider HTTP/3 for mobile
- Monitor protocol adoption

### 5. Monitor Continuously

Track performance actively:
- Use Server-Timing headers
- Report percentiles, not averages
- Set performance budgets
- Alert on degradation

### 6. Document Performance

Make SLAs transparent:
- Publish response time targets
- Document payload limits
- Explain timeout values
- Share monitoring dashboards

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
