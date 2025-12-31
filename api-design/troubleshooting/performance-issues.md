# API Performance Troubleshooting

> **Reading Level:** Grade 11 | **Audience:** Developers debugging API performance

This guide helps you diagnose and fix common API performance problems.

---

## Slow Response Times

API requests take longer than expected to complete.

### General Slow Responses

**Symptoms:**
- Requests take several seconds to complete
- Response time varies significantly between requests
- Users complain about slow loading
- Timeouts occur intermittently

**Common Causes:**

1. **Large response payloads**
   ```http
   # Problem: Requesting all fields when you only need a few
   GET /api/users/123
   # Returns 50 KB of data
   
   # Solution: Use field selection
   GET /api/users/123?fields=id,name,email
   # Returns 500 bytes
   ```

2. **Missing pagination**
   ```http
   # Problem: Fetching all records at once
   GET /api/orders
   # Returns 10,000 orders
   
   # Solution: Paginate results
   GET /api/orders?limit=20&offset=0
   # Returns 20 orders per page
   ```

3. **N+1 query pattern**
   ```
   Problem: Making one request per item
   - GET /api/orders         (1 request)
   - GET /api/users/1        (N requests for each order's user)
   - GET /api/users/2
   - ...
   
   Solution: Use expand/include parameters
   - GET /api/orders?include=user    (1 request with embedded data)
   ```

4. **No request caching**
   ```http
   # Problem: Re-fetching unchanged data
   GET /api/config  # Every page load
   
   # Solution: Use conditional requests
   GET /api/config
   If-None-Match: "abc123"
   # Returns 304 Not Modified if unchanged
   ```

5. **Server under heavy load**
   - Check API status page
   - Request during off-peak hours
   - Consider upgrading plan

**Solutions:**

1. **Measure actual response time**
   ```bash
   curl -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" \
     -o /dev/null -s "https://api.example.com/users"
   ```

2. **Request only what you need**
   ```http
   # Use field selection if available
   GET /api/users?fields=id,name,email
   
   # Use pagination
   GET /api/users?limit=20&page=1
   ```

3. **Implement caching**
   ```http
   # Respect Cache-Control headers
   Cache-Control: max-age=3600
   
   # Use conditional requests
   If-Modified-Since: Wed, 21 Oct 2025 07:28:00 GMT
   If-None-Match: "etag-value"
   ```

4. **Batch related requests**
   ```http
   # Instead of multiple requests
   GET /api/users/1
   GET /api/users/2
   GET /api/users/3
   
   # Use batch endpoint
   GET /api/users?ids=1,2,3
   ```

**Prevention:**
- Set performance budgets (e.g., P95 < 500ms)
- Monitor response times continuously
- Cache responses at appropriate layers
- Use CDN for static or rarely-changing data

---

### Slow Search or Filter Operations

**Symptoms:**
- Search queries take several seconds
- Filtering large datasets is slow
- Complex queries timeout

**Common Causes:**

1. **Searching too many fields**
   ```http
   # Problem: Full-text search across all fields
   GET /api/products?q=laptop
   
   # Solution: Search specific fields
   GET /api/products?name=laptop
   ```

2. **Missing query limits**
   ```http
   # Problem: Unbounded result set
   GET /api/logs?date=2025-01-01
   
   # Solution: Always include limits
   GET /api/logs?date=2025-01-01&limit=100
   ```

3. **Complex filter combinations**
   ```http
   # Problem: Too many filter conditions
   GET /api/products?category=electronics&brand=apple&price_min=100&price_max=500&rating=4&in_stock=true&...
   ```

**Solutions:**

1. **Simplify search queries**
   - Start broad, then narrow down
   - Use specific field searches when possible

2. **Add limits to all queries**
   ```http
   GET /api/search?q=term&limit=20
   ```

3. **Use cursor pagination for large datasets**
   ```http
   GET /api/events?cursor=abc123&limit=50
   ```

**Prevention:**
- Always include limits in search requests
- Cache common search results
- Consider using search-specific endpoints

---

## Timeout Issues

Requests fail because they take too long to complete.

### Connection Timeouts

**Symptoms:**
- Error message mentions "connection timeout"
- Request fails before any response is received
- Error occurs within seconds of starting request

**Common Causes:**

1. **API server unreachable**
   - Server is down
   - Network path is blocked
   - DNS resolution failed

2. **Firewall blocking connection**
   - Corporate firewall rules
   - IP allowlist restrictions

3. **Wrong hostname or port**
   ```http
   # Wrong
   https://api.example.com:8080
   
   # Correct
   https://api.example.com:443
   ```

**Solutions:**

1. **Test connectivity**
   ```bash
   # Check DNS resolution
   nslookup api.example.com
   
   # Check if port is open
   nc -zv api.example.com 443
   
   # Check basic HTTP connectivity
   curl -v --connect-timeout 5 "https://api.example.com/health"
   ```

2. **Verify correct URL and port**

3. **Check firewall and proxy settings**

4. **Try from different network**
   - Test from mobile hotspot
   - Test from different location

**Prevention:**
- Monitor endpoint availability
- Configure appropriate connection timeouts
- Have fallback endpoints when available

---

### Read Timeouts

**Symptoms:**
- Connection succeeds but response never completes
- Error message mentions "read timeout" or "socket timeout"
- Takes longer than connection timeout to fail

**Common Causes:**

1. **Server processing takes too long**
   - Complex database query
   - Heavy computation
   - Waiting for external service

2. **Large response payload**
   - Downloading large file
   - Response has too much data

3. **Network congestion**
   - Slow or unstable connection
   - Packet loss

4. **Timeout set too low**
   ```
   Client timeout: 10 seconds
   Server processing: 15 seconds
   Result: Timeout error
   ```

**Solutions:**

1. **Increase timeout for known slow operations**
   ```bash
   curl --max-time 60 "https://api.example.com/reports/generate"
   ```

2. **Reduce response size**
   ```http
   # Use pagination
   GET /api/data?limit=100
   
   # Use field selection
   GET /api/data?fields=id,name
   ```

3. **Use async operations for long-running tasks**
   ```http
   # Start async job
   POST /api/reports/generate
   # Response: 202 Accepted with job ID
   
   # Poll for completion
   GET /api/jobs/job-123
   # Response: status=completed, download_url=...
   ```

4. **Check for API-specific timeout recommendations**

**Prevention:**
- Set appropriate timeouts for each endpoint
- Use async patterns for operations > 30 seconds
- Monitor actual response times
- Implement progress indicators for long operations

---

## Pagination Problems

Issues with retrieving pages of data.

### Missing or Incomplete Data

**Symptoms:**
- Some records seem to be missing
- Total count doesn't match returned records
- Duplicate records across pages

**Common Causes:**

1. **Data changed during pagination**
   ```
   Page 1: items 1-20
   # New item inserted at position 10
   Page 2: items 20-40 (item 20 appears twice)
   ```

2. **Using offset with changing data**
   ```http
   # Problem: Data changes between requests
   GET /api/orders?offset=0&limit=20   # Gets orders 1-20
   # Order deleted
   GET /api/orders?offset=20&limit=20  # Skips what was order 21
   ```

3. **Sort order not stable**
   - Results in different order each request
   - No secondary sort field

**Solutions:**

1. **Use cursor-based pagination**
   ```http
   # First page
   GET /api/orders?limit=20
   # Response includes: "next_cursor": "abc123"
   
   # Next page
   GET /api/orders?limit=20&cursor=abc123
   ```

2. **Add stable sort order**
   ```http
   # Always include unique field in sort
   GET /api/orders?sort=created_at,id&limit=20
   ```

3. **Use timestamps for time-sensitive data**
   ```http
   # Get orders created before specific time
   GET /api/orders?created_before=2025-01-01T00:00:00Z&limit=20
   ```

**Prevention:**
- Use cursor pagination for large or changing datasets
- Always include stable sort order
- Document pagination behavior in API usage

---

### Pagination Performance Degrades

**Symptoms:**
- First pages load quickly
- Later pages get progressively slower
- Page 100+ takes several seconds

**Common Causes:**

1. **OFFSET-based pagination with large offsets**
   ```http
   # Gets slower as offset increases
   GET /api/items?offset=100000&limit=20
   ```

2. **COUNT query on large tables**
   - Total count calculation is expensive
   - Count runs on every page request

**Solutions:**

1. **Switch to cursor-based pagination**
   ```http
   # Consistent performance regardless of position
   GET /api/items?cursor=xyz789&limit=20
   ```

2. **Avoid requesting total count**
   ```http
   # Don't request total on every page
   GET /api/items?limit=20&include_total=false
   ```

3. **Use keyset pagination**
   ```http
   # Instead of offset
   GET /api/items?created_after=2025-01-01T00:00:00Z&limit=20
   ```

**Prevention:**
- Use cursor pagination by default
- Cache total counts separately
- Limit maximum page depth

---

## Caching Not Working

Responses are not being cached as expected.

### Browser/Client Not Caching

**Symptoms:**
- Same request made multiple times
- No cache headers in response
- Data always fetched fresh

**Common Causes:**

1. **No cache headers from API**
   ```http
   # Response missing cache headers
   HTTP/1.1 200 OK
   Content-Type: application/json
   # No Cache-Control header
   ```

2. **Cache-Control: no-store or no-cache**
   ```http
   Cache-Control: no-store  # Prevents all caching
   Cache-Control: no-cache  # Must revalidate every time
   ```

3. **POST/PUT/DELETE requests**
   - These methods are not cached by default
   - Only GET and HEAD are cacheable

4. **Authorization header present**
   - Some caches skip authenticated requests
   - Need explicit `Cache-Control: public` or `private`

**Solutions:**

1. **Check response cache headers**
   ```bash
   curl -v "https://api.example.com/data" 2>&1 | grep -i cache
   ```

2. **Implement client-side caching**
   ```
   Store response in local cache
   Check cache before making request
   Respect max-age directive
   ```

3. **Use conditional requests**
   ```http
   # First request - note ETag or Last-Modified
   GET /api/config
   # Response: ETag: "abc123"
   
   # Subsequent requests
   GET /api/config
   If-None-Match: "abc123"
   # Response: 304 Not Modified (use cached version)
   ```

**Prevention:**
- Implement client-side response caching
- Use ETags for conditional requests
- Set appropriate Cache-Control on cacheable endpoints

---

### Cache Returning Stale Data

**Symptoms:**
- Updated data not appearing
- Old values persist after changes
- Different clients see different data

**Common Causes:**

1. **Cache TTL too long**
   ```http
   Cache-Control: max-age=86400  # Cached for 24 hours
   ```

2. **CDN or proxy caching**
   - Multiple cache layers
   - Each with own TTL

3. **Cache key doesn't include all variables**
   - Missing user ID in cache key
   - Missing query parameters

**Solutions:**

1. **Force cache refresh**
   ```http
   # Bypass cache
   Cache-Control: no-cache
   
   # Or use cache-busting parameter
   GET /api/data?_t=1640000000
   ```

2. **Use shorter cache TTL**
   ```http
   Cache-Control: max-age=60  # 1 minute
   ```

3. **Implement cache invalidation**
   ```
   After updating data:
   - Invalidate related cache entries
   - Or use versioned URLs
   ```

4. **Use conditional requests**
   ```http
   GET /api/data
   If-None-Match: "old-etag"
   # Returns 200 with new data if changed
   ```

**Prevention:**
- Set appropriate cache TTL based on data volatility
- Implement cache invalidation strategy
- Use ETags for precise freshness checking
- Document caching behavior

---

## Quick Diagnosis Table

| Problem | First Check | Quick Fix |
|---------|-------------|-----------|
| Slow response | Response size | Add pagination, field selection |
| Connection timeout | DNS and connectivity | Check network, firewall |
| Read timeout | Request complexity | Increase timeout, use async |
| Missing page data | Pagination type | Switch to cursor pagination |
| Slow pagination | Offset value | Use cursor or keyset pagination |
| Not caching | Response headers | Implement conditional requests |
| Stale cache | Cache TTL | Reduce TTL, use ETags |

---

## Performance Monitoring

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| P50 Response Time | < 200ms | > 500ms |
| P95 Response Time | < 500ms | > 2s |
| P99 Response Time | < 1s | > 5s |
| Error Rate | < 0.1% | > 1% |
| Timeout Rate | < 0.01% | > 0.1% |

### How to Measure

```bash
# Measure response time
curl -w "Total: %{time_total}s\n" -o /dev/null -s "https://api.example.com/endpoint"

# Run multiple tests
for i in {1..10}; do
  curl -w "%{time_total}\n" -o /dev/null -s "https://api.example.com/endpoint"
done

# Calculate percentiles from results
```

---

## Related Resources

- [Performance Standards](../advanced-patterns/performance-standards.md)
- [Pagination and Filtering](../request-response/pagination-and-filtering.md)
- [HTTP Client Best Practices](../request-response/http-client-best-practices.md)
- [Common HTTP Errors](common-http-errors.md)
