# Pagination Performance Problems

This document identifies common performance issues in pagination implementations and provides solutions for optimization.

## Common Performance Issues

### Deep Pagination Performance Degradation

**Problem:** Queries become exponentially slower as page numbers increase due to large OFFSET values.

**Symptoms:**
- Response times increase dramatically for pages beyond 100-1000
- Database CPU usage spikes with large offset queries
- Memory usage increases with deep pagination

**Example of problematic query:**
```sql
-- This becomes extremely slow with large offsets
SELECT * FROM orders 
ORDER BY created_date DESC 
LIMIT 20 OFFSET 50000;
```

**Solutions:**

#### 1. Switch to Cursor-Based Pagination
```javascript
// Instead of offset pagination
const skipAmount = page * size; // Becomes expensive
const orders = await Order.find()
  .sort({ createdDate: -1 })
  .skip(skipAmount)
  .limit(size);

// Use cursor-based pagination
const cursor = parseCursor(req.query.cursor);
const query = cursor ? {
  $or: [
    { createdDate: { $lt: cursor.createdDate } },
    { 
      createdDate: cursor.createdDate,
      _id: { $gt: cursor.id }
    }
  ]
} : {};

const orders = await Order.find(query)
  .sort({ createdDate: -1, _id: 1 })
  .limit(size);
```

#### 2. Implement Hybrid Pagination
```javascript
const DEEP_PAGINATION_THRESHOLD = 100;

async function paginate(page, size, cursor) {
  // Use offset pagination for shallow pages
  if (page < DEEP_PAGINATION_THRESHOLD && !cursor) {
    return offsetPagination(page, size);
  }
  
  // Switch to cursor pagination for deep pages
  return cursorPagination(cursor, size);
}
```

#### 3. Use Keyset Pagination for Numeric IDs
```javascript
// For auto-incrementing IDs
async function keysetPagination(lastId, size) {
  const query = lastId ? { id: { $gt: lastId } } : {};
  
  const orders = await Order.find(query)
    .sort({ id: 1 })
    .limit(size);
  
  return {
    data: orders,
    meta: {
      lastId: orders.length > 0 ? orders[orders.length - 1].id : null,
      hasNext: orders.length === size
    }
  };
}
```

### Slow Count Queries

**Problem:** Counting total results becomes expensive for large datasets with complex filters.

**Symptoms:**
- Total count queries take several seconds
- Database locks during count operations
- Memory usage spikes during count calculations

**Solutions:**

#### 1. Use Estimated Counts
```javascript
async function getEstimatedCount(query) {
  // Use database statistics for estimation
  const stats = await db.collection('orders').stats();
  const totalDocs = stats.count;
  
  // Apply simple estimation logic
  const estimatedTotal = Math.round(totalDocs * 0.8); // Rough estimate
  
  return {
    totalElements: estimatedTotal,
    estimated: true
  };
}

// Usage
const pagination = {
  page,
  size,
  totalElements: estimatedTotal,
  totalPages: Math.ceil(estimatedTotal / size),
  estimated: true
};
```

#### 2. Make Counts Optional
```javascript
async function paginateWithOptionalCount(query, page, size, includeCount = false) {
  const data = await Order.find(query)
    .sort({ createdDate: -1 })
    .skip(page * size)
    .limit(size);
  
  const meta = {
    pagination: {
      page,
      size,
      hasNext: data.length === size,
      hasPrevious: page > 0
    }
  };
  
  // Only count if explicitly requested
  if (includeCount) {
    const total = await Order.countDocuments(query);
    meta.pagination.totalElements = total;
    meta.pagination.totalPages = Math.ceil(total / size);
  }
  
  return { data, meta };
}
```

#### 3. Use Cached Counts
```javascript
async function getCachedCount(query, cacheKey) {
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Calculate count
  const count = await Order.countDocuments(query);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(count));
  
  return count;
}
```

### Inefficient Sorting

**Problem:** Sorting by unindexed fields or complex expressions causes full table scans.

**Symptoms:**
- Queries timeout on sort operations
- High disk I/O during sorting
- Memory usage spikes for in-memory sorts

**Solutions:**

#### 1. Create Appropriate Indexes
```javascript
// MongoDB indexes for common sort patterns
db.orders.createIndex({ status: 1, createdDate: -1 });
db.orders.createIndex({ customerId: 1, total: -1 });
db.orders.createIndex({ createdDate: -1, id: 1 }); // For pagination

// PostgreSQL indexes
CREATE INDEX idx_orders_status_created_date ON orders (status, created_date DESC);
CREATE INDEX idx_orders_customer_total ON orders (customer_id, total DESC);
```

#### 2. Validate Sortable Fields
```javascript
const SORTABLE_FIELDS = {
  id: { indexed: true, type: 'string' },
  createdDate: { indexed: true, type: 'date' },
  total: { indexed: true, type: 'number' },
  status: { indexed: true, type: 'string' },
  customerName: { indexed: false, type: 'string' } // Warn about performance
};

function validateSortField(field) {
  if (!SORTABLE_FIELDS[field]) {
    throw new Error(`Field '${field}' is not available for sorting`);
  }
  
  if (!SORTABLE_FIELDS[field].indexed) {
    console.warn(`Performance warning: Field '${field}' is not indexed`);
  }
  
  return SORTABLE_FIELDS[field];
}
```

#### 3. Use Composite Indexes for Multi-Field Sorting
```javascript
// For queries like: sort by status ASC, then createdDate DESC
db.orders.createIndex({ 
  status: 1, 
  createdDate: -1 
});

// Query that uses the index efficiently
const orders = await Order.find(query)
  .sort({ status: 1, createdDate: -1 })
  .limit(size);
```

### Expensive Filter Operations

**Problem:** Complex filters or filters on unindexed fields cause performance issues.

**Symptoms:**
- Slow response times for filtered queries
- High CPU usage during filtering
- Full collection scans

**Solutions:**

#### 1. Index Strategy for Filters
```javascript
// Create indexes for common filter combinations
db.orders.createIndex({ 
  status: 1, 
  createdDate: -1, 
  customerId: 1 
});

// Partial indexes for specific use cases
db.orders.createIndex(
  { createdDate: -1 },
  { 
    partialFilterExpression: { 
      status: { $in: ['ACTIVE', 'PROCESSING'] } 
    } 
  }
);
```

#### 2. Filter Optimization
```javascript
// Optimize filter order (most selective first)
const query = {};

// Apply most selective filters first
if (customerId) query.customerId = customerId; // High selectivity
if (status) query.status = { $in: status.split(',') }; // Medium selectivity
if (createdAfter) query.createdDate = { $gte: createdAfter }; // Low selectivity

// Avoid expensive operations
// Instead of regex for starts with:
query.customerName = { $regex: `^${searchTerm}`, $options: 'i' };

// Use text index for full-text search:
query.$text = { $search: searchTerm };
```

#### 3. Query Optimization
```javascript
// Use explain to analyze query performance
const explain = await Order.find(query).explain('executionStats');

console.log('Query execution stats:', {
  totalDocsExamined: explain.executionStats.totalDocsExamined,
  totalDocsReturned: explain.executionStats.totalDocsReturned,
  executionTimeMillis: explain.executionStats.executionTimeMillis,
  indexesUsed: explain.executionStats.allPlansExecution
});

// Alert if query is inefficient
const efficiency = explain.executionStats.totalDocsReturned / 
                   explain.executionStats.totalDocsExamined;

if (efficiency < 0.1) {
  console.warn('Inefficient query detected', { query, efficiency });
}
```

## Database-Specific Optimizations

### MongoDB Performance Tuning

#### 1. Aggregation Pipeline Optimization
```javascript
// Optimized aggregation for filtered pagination
const pipeline = [
  // Match stage should be first and use indexes
  { $match: { status: { $in: ['ACTIVE', 'PROCESSING'] } } },
  
  // Sort early to use indexes
  { $sort: { createdDate: -1, _id: 1 } },
  
  // Skip and limit
  { $skip: page * size },
  { $limit: size },
  
  // Project only needed fields
  { $project: { 
    id: 1, 
    customerId: 1, 
    total: 1, 
    status: 1, 
    createdDate: 1 
  } }
];

const orders = await Order.aggregate(pipeline);
```

#### 2. Connection Pool Optimization
```javascript
const mongoose = require('mongoose');

// Optimize connection pool
mongoose.connect(uri, {
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0
});
```

### PostgreSQL Performance Tuning

#### 1. Query Optimization
```sql
-- Use covering indexes
CREATE INDEX idx_orders_covering ON orders (status, created_date) 
INCLUDE (id, customer_id, total);

-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM orders 
WHERE status IN ('ACTIVE', 'PROCESSING') 
ORDER BY created_date DESC 
LIMIT 20 OFFSET 100;
```

#### 2. Connection Pool Configuration
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'user',
  password: 'password',
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Memory Usage Optimization

### Efficient Data Loading

#### 1. Use Streaming for Large Results
```javascript
const stream = Order.find(query)
  .sort({ createdDate: -1 })
  .cursor();

const results = [];
let count = 0;

stream.on('data', (doc) => {
  if (count >= page * size && count < (page + 1) * size) {
    results.push(doc);
  }
  count++;
  
  if (count >= (page + 1) * size) {
    stream.close();
  }
});

stream.on('end', () => {
  // Process results
  res.json({ data: results });
});
```

#### 2. Projection to Reduce Memory
```javascript
// Only select necessary fields
const orders = await Order.find(query, {
  id: 1,
  customerId: 1,
  total: 1,
  status: 1,
  createdDate: 1
}).sort({ createdDate: -1 }).limit(size);

// Use lean() in Mongoose to reduce memory
const orders = await Order.find(query)
  .select('id customerId total status createdDate')
  .lean()
  .sort({ createdDate: -1 })
  .limit(size);
```

### Connection Management

#### 1. Connection Pooling
```javascript
// Implement connection pooling
const connectionPool = {
  max: 10,
  min: 2,
  acquire: 30000,
  idle: 10000
};

// Monitor connection usage
function monitorConnections() {
  setInterval(() => {
    console.log('Active connections:', pool.totalCount);
    console.log('Idle connections:', pool.idleCount);
    console.log('Waiting requests:', pool.waitingCount);
  }, 5000);
}
```

## Monitoring and Alerting

### Performance Metrics

#### 1. Query Performance Monitoring
```javascript
class QueryMonitor {
  constructor() {
    this.metrics = {
      slowQueries: [],
      avgResponseTime: 0,
      queryCount: 0
    };
  }

  async trackQuery(queryFn, queryInfo) {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      this.recordMetrics(duration, queryInfo);
      
      if (duration > 1000) { // Log slow queries
        this.metrics.slowQueries.push({
          ...queryInfo,
          duration,
          timestamp: new Date()
        });
      }
      
      return result;
    } catch (error) {
      this.recordError(error, queryInfo);
      throw error;
    }
  }

  recordMetrics(duration, queryInfo) {
    this.metrics.queryCount++;
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.queryCount - 1) + duration) / 
      this.metrics.queryCount;
  }

  getMetrics() {
    return {
      ...this.metrics,
      slowQueriesCount: this.metrics.slowQueries.length,
      slowQueries: this.metrics.slowQueries.slice(-10) // Last 10 slow queries
    };
  }
}

// Usage
const monitor = new QueryMonitor();

app.get('/v1/orders', async (req, res) => {
  const result = await monitor.trackQuery(
    () => paginateOrders(req.query),
    { 
      endpoint: '/v1/orders',
      page: req.query.page,
      size: req.query.size,
      filters: req.query
    }
  );
  
  res.json(result);
});
```

#### 2. Resource Usage Monitoring
```javascript
// Monitor memory and CPU usage
function monitorResources() {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    console.log('Memory usage:', {
      rss: (memUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
      heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB'
    });
    
    // Alert if memory usage is high
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      console.warn('High memory usage detected');
    }
  }, 10000);
}
```

## Caching Strategies

### Query Result Caching

#### 1. Redis-Based Caching
```javascript
class PaginationCache {
  constructor(redisClient) {
    this.redis = redisClient;
    this.defaultTTL = 300; // 5 minutes
  }

  async get(key) {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key, data, ttl = this.defaultTTL) {
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  generateKey(query, page, size, sort) {
    const queryStr = JSON.stringify(query);
    const hash = crypto.createHash('md5').update(queryStr).digest('hex');
    return `pagination:${hash}:${page}:${size}:${sort}`;
  }

  async paginateWithCache(query, page, size, sort) {
    const cacheKey = this.generateKey(query, page, size, sort);
    
    // Try cache first
    const cached = await this.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Execute query
    const result = await this.executePagination(query, page, size, sort);
    
    // Cache result
    await this.set(cacheKey, result);
    
    return result;
  }
}
```

#### 2. Application-Level Caching
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function cachedPagination(query, page, size) {
  const cacheKey = `pagination:${JSON.stringify(query)}:${page}:${size}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Execute query
  const result = await executePagination(query, page, size);
  
  // Cache result
  cache.set(cacheKey, result);
  
  return result;
}
```

## Load Testing

### Performance Testing Scripts

#### 1. Artillery.io Configuration
```yaml
# artillery-pagination.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: "Pagination Load Test"
    weight: 100
    requests:
      - get:
          url: "/v1/orders"
          qs:
            page: "{{ $randomInt(0, 100) }}"
            size: "{{ $randomInt(10, 50) }}"
            status: "{{ $randomString() }}"
```

#### 2. Node.js Load Testing
```javascript
const axios = require('axios');

async function loadTest() {
  const concurrent = 100;
  const totalRequests = 1000;
  const baseUrl = 'http://localhost:3000';
  
  const results = [];
  
  for (let i = 0; i < totalRequests; i += concurrent) {
    const batch = [];
    
    for (let j = 0; j < concurrent && i + j < totalRequests; j++) {
      const page = Math.floor(Math.random() * 100);
      const size = Math.floor(Math.random() * 40) + 10;
      
      batch.push(
        axios.get(`${baseUrl}/v1/orders`, {
          params: { page, size }
        }).then(response => ({
          status: response.status,
          responseTime: response.headers['x-response-time']
        })).catch(error => ({
          status: error.response?.status || 500,
          error: error.message
        }))
      );
    }
    
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    
    console.log(`Completed ${i + concurrent} requests`);
  }
  
  // Analyze results
  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + parseInt(r.responseTime), 0) / results.length;
  
  const errorRate = results.filter(r => r.status >= 400).length / results.length;
  
  console.log('Load test results:', {
    totalRequests: results.length,
    avgResponseTime: avgResponseTime + 'ms',
    errorRate: (errorRate * 100).toFixed(2) + '%'
  });
}
```

## Best Practices Summary

1. **Use cursor-based pagination** for large datasets or deep pagination
2. **Create appropriate indexes** for sort and filter fields
3. **Make counts optional** or use estimates for large datasets
4. **Implement query monitoring** to identify performance bottlenecks
5. **Use connection pooling** to manage database connections efficiently
6. **Cache frequently accessed results** to reduce database load
7. **Validate sortable fields** to prevent queries on unindexed fields
8. **Monitor resource usage** and set up alerts for performance issues
9. **Test with realistic data volumes** to identify scalability issues
10. **Use projection** to reduce memory usage and network transfer

## Related Documentation

- [Main Pagination Guide](../../Pagination-and-Filtering.md)
- [Cursor Pagination](../reference/pagination/cursor-pagination.md)
- [Common Issues](common-issues.md)
- [Complete Examples](../examples/pagination/complete-examples.md)