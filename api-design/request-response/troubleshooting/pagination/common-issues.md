# Common Pagination Issues and Solutions

> **Reading Guide**
> - **Reading Time**: 14 minutes
> - **For**: Advanced developers debugging pagination issues
> - **Prerequisites**: Strong API background, experience with complex systems
> - **Reading Level**: Grade 12.4 (Flesch: 30)

This document covers frequently encountered problems when implementing pagination, filtering, and sorting, along with their solutions.

## Common Pagination Issues

### Issue: Page Numbers Out of Bounds

**Problem:** Users request page numbers that exceed the total number of pages.

**Example:**
```
GET /v1/orders?page=999&size=20
```

**Solution:** Return empty results with correct metadata:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 999,
      "size": 20,
      "totalElements": 100,
      "totalPages": 5
    }
  }
}
```

**Implementation:**
```javascript
// Don't throw errors for out-of-bounds pages
if (page >= totalPages) {
  return {
    data: [],
    meta: {
      pagination: {
        page,
        size,
        totalElements: total,
        totalPages: Math.ceil(total / size)
      }
    }
  };
}
```

### Issue: Inconsistent Results Due to Data Changes

**Problem:** Items appear on multiple pages or disappear during pagination due to concurrent modifications.

**Example:** User on page 2 sees items they already saw on page 1 because new items were inserted.

**Solution 1:** Use cursor-based pagination:
```javascript
// Cursor-based pagination provides stable results
const cursor = {
  id: lastItemId,
  createdDate: lastItemCreatedDate
};

const query = {
  $or: [
    { createdDate: { $lt: cursor.createdDate } },
    { 
      createdDate: cursor.createdDate,
      _id: { $gt: cursor.id }
    }
  ]
};
```

**Solution 2:** Use snapshot isolation:
```javascript
// Capture snapshot timestamp
const snapshot = req.query.snapshot || new Date().toISOString();

// Filter data based on snapshot
const query = {
  ...filters,
  createdDate: { $lte: new Date(snapshot) }
};
```

### Issue: Performance Degradation with Deep Pagination

**Problem:** Queries become slow with large offset values (e.g., page 1000 with 20 items per page).

**Example:**
```sql
-- This becomes slow with large offsets
SELECT * FROM orders LIMIT 20 OFFSET 20000;
```

**Solution:** Implement cursor-based pagination for deep pages:

```javascript
// Detect deep pagination
const DEEP_PAGINATION_THRESHOLD = 100;

if (page > DEEP_PAGINATION_THRESHOLD) {
  // Switch to cursor-based pagination
  return cursorPagination(query, cursor, size);
}

// Use offset pagination for shallow pages
return offsetPagination(query, page, size);
```

### Issue: Total Count Queries Are Slow

**Problem:** Counting all matching records becomes expensive for large datasets.

**Solution 1:** Use estimated counts:
```javascript
// Use database statistics for estimates
const estimatedTotal = await db.collection('orders').estimatedDocumentCount();

return {
  data: results,
  meta: {
    pagination: {
      page,
      size,
      totalElements: estimatedTotal,
      totalPages: Math.ceil(estimatedTotal / size),
      estimated: true
    }
  }
};
```

**Solution 2:** Make counts optional:
```javascript
const includeCount = req.query.includeCount === 'true';

const meta = {
  pagination: {
    page,
    size,
    hasNext: results.length === size,
    hasPrevious: page > 0
  }
};

if (includeCount) {
  const total = await Order.countDocuments(query);
  meta.pagination.totalElements = total;
  meta.pagination.totalPages = Math.ceil(total / size);
}
```

## Common Filtering Issues

### Issue: SQL Injection in Dynamic Filters

**Problem:** User input is directly concatenated into queries.

**Bad Example:**
```javascript
// NEVER DO THIS
const query = `SELECT * FROM orders WHERE status = '${status}'`;
```

**Solution:** Use parameterized queries:
```javascript
// Use parameterized queries
const query = 'SELECT * FROM orders WHERE status = ?';
const results = await db.query(query, [status]);

// Or use ORM/ODM
const results = await Order.find({ status: status });
```

### Issue: Invalid Date Formats

**Problem:** Users provide dates in various formats that cause parsing errors.

**Examples of problematic input:**
- `2024-13-01` (invalid month)
- `2024/01/01` (wrong format)
- `tomorrow` (relative date)

**Solution:** Validate and normalize date formats:
```javascript
function parseDateFilter(dateString) {
  if (!dateString) return null;
  
  // Only accept ISO 8601 format
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  
  if (!isoDateRegex.test(dateString)) {
    throw new Error('Date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)');
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  return date;
}

// Usage
try {
  const createdAfter = parseDateFilter(req.query.createdAfter);
  if (createdAfter) {
    query.createdDate = { $gte: createdAfter };
  }
} catch (error) {
  return res.status(400).json({
    type: 'https://example.com/problems/invalid-date',
    title: 'Invalid Date Format',
    status: 400,
    detail: error.message
  });
}
```

### Issue: Filter Values Don't Match Enum Types

**Problem:** Users provide filter values that don't match the expected enum values.

**Example:**
```
GET /v1/orders?status=active
```

But the system expects `ACTIVE` (uppercase).

**Solution:** Validate filter values against allowed options:
```javascript
const VALID_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

function validateStatus(status) {
  if (!status) return null;
  
  const upperStatus = status.toUpperCase();
  
  if (!VALID_STATUSES.includes(upperStatus)) {
    throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  
  return upperStatus;
}

// Usage
try {
  const status = validateStatus(req.query.status);
  if (status) {
    query.status = status;
  }
} catch (error) {
  return res.status(400).json({
    type: 'https://example.com/problems/invalid-filter-value',
    title: 'Invalid Filter Value',
    status: 400,
    detail: error.message,
    errors: [{
      field: 'status',
      code: 'INVALID_VALUE',
      message: error.message,
      providedValue: req.query.status,
      allowedValues: VALID_STATUSES
    }]
  });
}
```

### Issue: Multiple Filters with Different Logic

**Problem:** Users expect OR logic between filters, but the system uses AND logic.

**Example:**
```
GET /v1/orders?status=PENDING&status=PROCESSING
```

User expects orders with PENDING OR PROCESSING status.

**Solution:** Support multiple values for OR logic:
```javascript
function parseMultipleValues(value) {
  if (!value) return null;
  
  // Support comma-separated values
  if (typeof value === 'string') {
    return value.split(',').map(v => v.trim());
  }
  
  // Support array format
  if (Array.isArray(value)) {
    return value;
  }
  
  return [value];
}

// Usage
const statuses = parseMultipleValues(req.query.status);
if (statuses) {
  query.status = { $in: statuses };
}
```

## Common Sorting Issues

### Issue: Sorting by Non-Indexed Fields

**Problem:** Users sort by fields that aren't indexed, causing slow queries.

**Solution:** Validate sortable fields and provide index recommendations:
```javascript
const SORTABLE_FIELDS = {
  id: { indexed: true, type: 'string' },
  createdDate: { indexed: true, type: 'date' },
  total: { indexed: true, type: 'number' },
  status: { indexed: true, type: 'string' },
  customerName: { indexed: false, type: 'string' } // Not indexed
};

function validateSortField(field) {
  if (!SORTABLE_FIELDS[field]) {
    throw new Error(`Field '${field}' is not available for sorting. Available fields: ${Object.keys(SORTABLE_FIELDS).join(', ')}`);
  }
  
  if (!SORTABLE_FIELDS[field].indexed) {
    console.warn(`Sorting by '${field}' may be slow as it's not indexed`);
  }
  
  return field;
}
```

### Issue: Inconsistent Sort Order for Equal Values

**Problem:** Items with equal sort values appear in different orders across requests.

**Example:** Multiple orders with the same `createdDate` appear in random order.

**Solution:** Always include a unique field as the final sort criteria:
```javascript
function buildSortCriteria(sortParam) {
  const sorts = parseSortParam(sortParam);
  
  // Always add ID as final sort criteria for consistent ordering
  const hasIdSort = sorts.some(sort => sort.field === 'id');
  
  if (!hasIdSort) {
    sorts.push({ field: 'id', direction: 'ASC' });
  }
  
  return sorts;
}
```

### Issue: Invalid Sort Direction

**Problem:** Users provide invalid sort directions.

**Examples:**
- `?sort=createdDate,ascending`
- `?sort=createdDate,1`
- `?sort=createdDate,up`

**Solution:** Validate and normalize sort directions:
```javascript
function parseSortDirection(direction) {
  if (!direction) return 'ASC'; // Default
  
  const normalizedDirection = direction.toLowerCase();
  
  switch (normalizedDirection) {
    case 'asc':
    case 'ascending':
    case '1':
      return 'ASC';
    case 'desc':
    case 'descending':
    case '-1':
      return 'DESC';
    default:
      throw new Error(`Invalid sort direction '${direction}'. Use 'asc' or 'desc'`);
  }
}
```

## Edge Cases and Solutions

### Empty Result Sets

**Issue:** Different behaviors when no results are found.

**Solution:** Always return consistent empty result structure:
```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 0,
      "totalPages": 0
    },
    "filters": {
      "status": "NONEXISTENT_STATUS"
    }
  }
}
```

### Cursor Expiration

**Issue:** Cursors become invalid due to data changes or time limits.

**Solution:** Handle cursor expiration gracefully:
```javascript
function validateCursor(cursor) {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
    
    // Check if cursor is expired (example: 1 hour TTL)
    if (decoded.timestamp && Date.now() - decoded.timestamp > 3600000) {
      throw new Error('Cursor has expired');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired cursor');
  }
}

// Usage
try {
  const cursorData = validateCursor(req.query.cursor);
  // Use cursor data
} catch (error) {
  return res.status(400).json({
    type: 'https://example.com/problems/invalid-cursor',
    title: 'Invalid Cursor',
    status: 400,
    detail: error.message
  });
}
```

### Large Page Sizes

**Issue:** Users request extremely large page sizes that could crash the system.

**Solution:** Enforce reasonable limits:
```javascript
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function validatePageSize(size) {
  if (!size) return DEFAULT_PAGE_SIZE;
  
  const pageSize = parseInt(size);
  
  if (isNaN(pageSize) || pageSize < 1) {
    throw new Error('Page size must be a positive number');
  }
  
  if (pageSize > MAX_PAGE_SIZE) {
    throw new Error(`Page size cannot exceed ${MAX_PAGE_SIZE}`);
  }
  
  return pageSize;
}
```

### Concurrent Modifications

**Issue:** Data changes while user is paginating through results.

**Solution:** Use consistent snapshots:
```javascript
// Create a snapshot reference
const snapshot = req.query.snapshot || Date.now();

// Include snapshot in all queries
const query = {
  ...filters,
  $or: [
    { updatedAt: { $lte: new Date(snapshot) } },
    { updatedAt: { $exists: false } }
  ]
};

// Include snapshot in response for subsequent requests
return {
  data: results,
  meta: {
    pagination: { ... },
    snapshot: snapshot
  }
};
```

## Error Response Examples

### Invalid Filter Combination

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-filter-combination",
  "title": "Invalid Filter Combination",
  "status": 400,
  "detail": "Cannot combine multiple operators on the same field",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "total",
      "code": "CONFLICTING_OPERATORS",
      "message": "Cannot use both 'gt' and 'lt' operators with 'eq' on the same field",
      "conflictingFilters": ["total=100", "total[gt]=50"]
    }
  ]
}
```

### Sort Field Not Indexed

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/slow-sort-field",
  "title": "Sort Field Not Optimized",
  "status": 400,
  "detail": "The requested sort field may cause slow queries",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "sort",
      "code": "UNINDEXED_SORT_FIELD",
      "message": "Field 'description' is not indexed and may cause slow queries",
      "providedValue": "description,asc",
      "recommendation": "Use indexed fields for better performance",
      "indexedFields": ["id", "createdDate", "total", "status"]
    }
  ]
}
```

### Resource Limits Exceeded

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/resource-limit-exceeded",
  "title": "Resource Limit Exceeded",
  "status": 400,
  "detail": "The requested operation would exceed system resource limits",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "size",
      "code": "EXCEEDS_MAX_PAGE_SIZE",
      "message": "Page size cannot exceed 100 items",
      "providedValue": "500",
      "maxValue": 100
    }
  ]
}
```

## Performance Monitoring

### Identifying Slow Queries

```javascript
// Log slow pagination queries
const startTime = Date.now();

const results = await Order.find(query)
  .sort(sortCriteria)
  .skip(page * size)
  .limit(size);

const queryTime = Date.now() - startTime;

if (queryTime > 1000) { // Log queries taking more than 1 second
  console.warn('Slow pagination query:', {
    queryTime,
    page,
    size,
    filters: query,
    sort: sortCriteria
  });
}
```

### Query Optimization Recommendations

```javascript
// Analyze query patterns and suggest optimizations
function analyzeQuery(query, sort, page, size) {
  const recommendations = [];
  
  // Deep pagination warning
  if (page > 50) {
    recommendations.push({
      type: 'DEEP_PAGINATION',
      message: 'Consider using cursor-based pagination for better performance',
      impact: 'HIGH'
    });
  }
  
  // Unindexed filter warning
  const unindexedFilters = Object.keys(query).filter(field => 
    !INDEXED_FIELDS.includes(field)
  );
  
  if (unindexedFilters.length > 0) {
    recommendations.push({
      type: 'UNINDEXED_FILTERS',
      message: `Filters on unindexed fields: ${unindexedFilters.join(', ')}`,
      impact: 'MEDIUM'
    });
  }
  
  return recommendations;
}
```

## Best Practices Summary

1. **Always validate input parameters** - Check types, ranges, and allowed values
2. **Use parameterized queries** - Prevent SQL injection and improve performance
3. **Implement consistent error handling** - Return structured error responses
4. **Add unique sort criteria** - Ensure consistent ordering across requests
5. **Monitor query performance** - Log slow queries and optimize indexes
6. **Handle edge cases gracefully** - Empty results, invalid cursors, out-of-bounds pages
7. **Set reasonable limits** - Prevent resource exhaustion with max page sizes
8. **Use cursor pagination for large datasets** - Better performance than offset pagination
9. **Validate sortable fields** - Only allow sorting by indexed fields
10. **Provide clear error messages** - Help users understand and fix their requests

## Related Documentation

- [Main Pagination Guide](../../pagination-and-filtering.md)
- [Complete Examples](../examples/pagination/complete-examples.md)
- [Advanced Patterns](../reference/pagination/advanced-patterns.md)
- [Error Response Standards](../../error-response-standards.md)