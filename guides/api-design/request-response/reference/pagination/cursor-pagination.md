# Cursor-Based Pagination

This document provides detailed guidance on implementing cursor-based pagination for high-performance APIs handling large datasets.

## Overview

Cursor-based pagination uses opaque tokens (cursors) to navigate through result sets instead of offset-based page numbers. This approach provides better performance and consistency for large datasets.

## When to Use Cursor Pagination

### Advantages
- **Constant performance**: O(1) lookup time regardless of position
- **Consistent results**: No duplicate or missing items during concurrent modifications
- **Real-time friendly**: Works well with frequently changing data
- **Scalable**: Performance doesn't degrade with dataset size

### Use Cases
- Large datasets (>10,000 items)
- Real-time feeds or timelines
- Frequently updated data
- Mobile applications requiring smooth scrolling
- APIs with high concurrency

## Basic Cursor Implementation

### Response Structure

```json
{
  "data": [
    {
      "id": "order-12345",
      "customerId": "cust-67890",
      "total": 149.50,
      "status": "PROCESSING",
      "createdDate": "2024-04-14T10:22:00Z"
    }
  ],
  "meta": {
    "cursor": {
      "current": "eyJpZCI6Im9yZGVyLTEyMzQ1IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0VDEwOjIyOjAwWiJ9",
      "next": "eyJpZCI6Im9yZGVyLTEyMzQ2IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0VDEwOjIzOjAwWiJ9",
      "previous": null,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Query Parameters

```
# First page
GET /v1/orders?size=20

# Next page
GET /v1/orders?cursor=eyJpZCI6Im9yZGVyLTEyMzQ1IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0VDEwOjIyOjAwWiJ9&size=20

# Previous page
GET /v1/orders?cursor=eyJpZCI6Im9yZGVyLTEyMzQ0IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA0LTE0VDEwOjIxOjAwWiJ9&size=20&direction=prev
```

## Cursor Structure Design

### Simple Cursor (Single Sort Field)

```javascript
// For sorting by created date only
const cursor = {
  id: "order-12345",
  createdDate: "2024-04-14T10:22:00Z"
};

// Base64 encoded
const encodedCursor = Buffer.from(JSON.stringify(cursor)).toString('base64');
```

### Complex Cursor (Multiple Sort Fields)

```javascript
// For sorting by status, then created date, then total
const cursor = {
  id: "order-12345",
  status: "PROCESSING",
  createdDate: "2024-04-14T10:22:00Z",
  total: 149.50
};

// Base64 encoded
const encodedCursor = Buffer.from(JSON.stringify(cursor)).toString('base64');
```

### Cursor with Metadata

```javascript
// Enhanced cursor with additional metadata
const cursor = {
  // Sort field values
  id: "order-12345",
  createdDate: "2024-04-14T10:22:00Z",
  
  // Metadata
  timestamp: Date.now(),
  version: "1.0",
  direction: "next"
};
```

## Implementation Patterns

### MongoDB Implementation

```javascript
class CursorPagination {
  constructor(collection, sortFields) {
    this.collection = collection;
    this.sortFields = sortFields; // [{ field: 'createdDate', direction: -1 }, { field: 'id', direction: 1 }]
  }

  async paginate(cursor, size, direction = 'next') {
    const query = this.buildQuery(cursor, direction);
    const sort = this.buildSort(direction);
    
    // Fetch one extra item to determine hasNext/hasPrevious
    const documents = await this.collection
      .find(query)
      .sort(sort)
      .limit(size + 1)
      .toArray();
    
    const hasMore = documents.length > size;
    const data = hasMore ? documents.slice(0, size) : documents;
    
    // Generate cursors for navigation
    const cursors = this.generateCursors(data, direction, hasMore);
    
    return {
      data: direction === 'prev' ? data.reverse() : data,
      meta: {
        cursor: cursors
      }
    };
  }

  buildQuery(cursor, direction) {
    if (!cursor) return {};
    
    const conditions = [];
    
    // Build query for each sort field
    for (let i = 0; i < this.sortFields.length; i++) {
      const field = this.sortFields[i];
      const operator = this.getOperator(field.direction, direction);
      
      // Create condition for this field
      const condition = { [field.field]: { [operator]: cursor[field.field] } };
      
      // Add equality conditions for previous fields
      const equalityConditions = {};
      for (let j = 0; j < i; j++) {
        const prevField = this.sortFields[j];
        equalityConditions[prevField.field] = cursor[prevField.field];
      }
      
      conditions.push({ ...equalityConditions, ...condition });
    }
    
    return { $or: conditions };
  }

  buildSort(direction) {
    const sort = {};
    
    for (const field of this.sortFields) {
      const sortDirection = direction === 'prev' ? -field.direction : field.direction;
      sort[field.field] = sortDirection;
    }
    
    return sort;
  }

  getOperator(fieldDirection, navigationDirection) {
    if (navigationDirection === 'next') {
      return fieldDirection === 1 ? '$gt' : '$lt';
    } else {
      return fieldDirection === 1 ? '$lt' : '$gt';
    }
  }

  generateCursors(data, direction, hasMore) {
    if (data.length === 0) {
      return {
        current: null,
        next: null,
        previous: null,
        hasNext: false,
        hasPrevious: false
      };
    }
    
    const firstItem = data[0];
    const lastItem = data[data.length - 1];
    
    return {
      current: this.createCursor(direction === 'prev' ? firstItem : lastItem),
      next: hasMore && direction === 'next' ? this.createCursor(lastItem) : null,
      previous: hasMore && direction === 'prev' ? this.createCursor(firstItem) : null,
      hasNext: hasMore && direction === 'next',
      hasPrevious: hasMore && direction === 'prev'
    };
  }

  createCursor(document) {
    const cursor = {};
    
    for (const field of this.sortFields) {
      cursor[field.field] = document[field.field];
    }
    
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
  }

  parseCursor(cursorString) {
    if (!cursorString) return null;
    
    try {
      const decoded = Buffer.from(cursorString, 'base64').toString();
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }
}

// Usage
const pagination = new CursorPagination(
  db.collection('orders'),
  [
    { field: 'createdDate', direction: -1 },
    { field: 'id', direction: 1 }
  ]
);

app.get('/v1/orders', async (req, res) => {
  try {
    const cursor = pagination.parseCursor(req.query.cursor);
    const size = Math.min(parseInt(req.query.size) || 20, 100);
    const direction = req.query.direction || 'next';
    
    const result = await pagination.paginate(cursor, size, direction);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      type: 'https://example.com/problems/invalid-cursor',
      title: 'Invalid Cursor',
      status: 400,
      detail: error.message
    });
  }
});
```

### PostgreSQL Implementation

```javascript
class PostgresCursorPagination {
  constructor(tableName, sortFields) {
    this.tableName = tableName;
    this.sortFields = sortFields;
  }

  async paginate(db, cursor, size, direction = 'next') {
    const whereClause = this.buildWhereClause(cursor, direction);
    const orderClause = this.buildOrderClause(direction);
    
    const query = `
      SELECT * FROM ${this.tableName}
      ${whereClause ? `WHERE ${whereClause}` : ''}
      ORDER BY ${orderClause}
      LIMIT $1
    `;
    
    const result = await db.query(query, [size + 1]);
    const documents = result.rows;
    
    const hasMore = documents.length > size;
    const data = hasMore ? documents.slice(0, size) : documents;
    
    return {
      data: direction === 'prev' ? data.reverse() : data,
      meta: {
        cursor: this.generateCursors(data, direction, hasMore)
      }
    };
  }

  buildWhereClause(cursor, direction) {
    if (!cursor) return '';
    
    const conditions = [];
    
    for (let i = 0; i < this.sortFields.length; i++) {
      const field = this.sortFields[i];
      const operator = this.getOperator(field.direction, direction);
      
      let condition = '';
      
      // Add equality conditions for previous fields
      for (let j = 0; j < i; j++) {
        const prevField = this.sortFields[j];
        condition += `${prevField.field} = '${cursor[prevField.field]}' AND `;
      }
      
      condition += `${field.field} ${operator} '${cursor[field.field]}'`;
      conditions.push(`(${condition})`);
    }
    
    return conditions.join(' OR ');
  }

  buildOrderClause(direction) {
    return this.sortFields.map(field => {
      const sortDirection = direction === 'prev' ? 
        (field.direction === 'ASC' ? 'DESC' : 'ASC') : 
        field.direction;
      return `${field.field} ${sortDirection}`;
    }).join(', ');
  }

  getOperator(fieldDirection, navigationDirection) {
    if (navigationDirection === 'next') {
      return fieldDirection === 'ASC' ? '>' : '<';
    } else {
      return fieldDirection === 'ASC' ? '<' : '>';
    }
  }
}
```

## Advanced Cursor Patterns

### Encrypted Cursors

```javascript
const crypto = require('crypto');

class EncryptedCursorPagination {
  constructor(collection, sortFields, secretKey) {
    this.collection = collection;
    this.sortFields = sortFields;
    this.secretKey = secretKey;
  }

  createCursor(document) {
    const cursor = {};
    
    for (const field of this.sortFields) {
      cursor[field.field] = document[field.field];
    }
    
    // Add timestamp for expiration
    cursor.timestamp = Date.now();
    
    const jsonString = JSON.stringify(cursor);
    const cipher = crypto.createCipher('aes-256-ctr', this.secretKey);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }

  parseCursor(cursorString) {
    if (!cursorString) return null;
    
    try {
      const decipher = crypto.createDecipher('aes-256-ctr', this.secretKey);
      let decrypted = decipher.update(cursorString, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const cursor = JSON.parse(decrypted);
      
      // Check expiration (e.g., 1 hour)
      if (Date.now() - cursor.timestamp > 3600000) {
        throw new Error('Cursor has expired');
      }
      
      return cursor;
    } catch (error) {
      throw new Error('Invalid or expired cursor');
    }
  }
}
```

### Stable Cursors with Snapshots

```javascript
class StableCursorPagination {
  constructor(collection, sortFields) {
    this.collection = collection;
    this.sortFields = sortFields;
  }

  async paginate(cursor, size, direction = 'next') {
    const snapshotTime = cursor?.snapshotTime || new Date();
    
    // Add snapshot filter to query
    const baseQuery = {
      $or: [
        { updatedAt: { $lte: snapshotTime } },
        { updatedAt: { $exists: false } }
      ]
    };
    
    const cursorQuery = this.buildQuery(cursor, direction);
    const finalQuery = cursor ? { $and: [baseQuery, cursorQuery] } : baseQuery;
    
    const documents = await this.collection
      .find(finalQuery)
      .sort(this.buildSort(direction))
      .limit(size + 1)
      .toArray();
    
    const hasMore = documents.length > size;
    const data = hasMore ? documents.slice(0, size) : documents;
    
    return {
      data: direction === 'prev' ? data.reverse() : data,
      meta: {
        cursor: this.generateCursors(data, direction, hasMore, snapshotTime)
      }
    };
  }

  createCursor(document, snapshotTime) {
    const cursor = { snapshotTime };
    
    for (const field of this.sortFields) {
      cursor[field.field] = document[field.field];
    }
    
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
  }
}
```

## Performance Optimization

### Index Strategy

```javascript
// MongoDB index for cursor pagination
db.orders.createIndex({ 
  createdDate: -1, 
  id: 1 
});

// Composite index for multiple sort fields
db.orders.createIndex({ 
  status: 1, 
  createdDate: -1, 
  total: 1,
  id: 1 
});

// Partial index for active records only
db.orders.createIndex(
  { createdDate: -1, id: 1 },
  { partialFilterExpression: { status: { $in: ['ACTIVE', 'PROCESSING'] } } }
);
```

### Query Optimization

```javascript
// Use projection to reduce data transfer
const documents = await this.collection
  .find(query, {
    projection: {
      id: 1,
      customerId: 1,
      total: 1,
      status: 1,
      createdDate: 1
    }
  })
  .sort(sort)
  .limit(size + 1)
  .toArray();

// Use lean queries in Mongoose
const documents = await Order
  .find(query)
  .select('id customerId total status createdDate')
  .sort(sort)
  .limit(size + 1)
  .lean();
```

### Cursor Caching

```javascript
class CachedCursorPagination {
  constructor(collection, sortFields, cache) {
    this.collection = collection;
    this.sortFields = sortFields;
    this.cache = cache; // Redis or similar
  }

  async paginate(cursor, size, direction = 'next') {
    // Try to get from cache first
    const cacheKey = this.getCacheKey(cursor, size, direction);
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Execute query
    const result = await this.executeQuery(cursor, size, direction);
    
    // Cache result for a short time
    await this.cache.setex(cacheKey, 60, JSON.stringify(result));
    
    return result;
  }

  getCacheKey(cursor, size, direction) {
    const cursorHash = cursor ? 
      crypto.createHash('md5').update(JSON.stringify(cursor)).digest('hex') : 
      'null';
    
    return `cursor:${cursorHash}:${size}:${direction}`;
  }
}
```

## Error Handling

### Cursor Validation

```javascript
function validateCursor(cursorString) {
  if (!cursorString) return null;
  
  try {
    const decoded = Buffer.from(cursorString, 'base64').toString();
    const cursor = JSON.parse(decoded);
    
    // Validate required fields
    const requiredFields = ['id', 'createdDate'];
    for (const field of requiredFields) {
      if (!(field in cursor)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate data types
    if (typeof cursor.id !== 'string') {
      throw new Error('Invalid cursor: id must be a string');
    }
    
    if (!Date.parse(cursor.createdDate)) {
      throw new Error('Invalid cursor: createdDate must be a valid ISO date');
    }
    
    return cursor;
  } catch (error) {
    throw new Error(`Invalid cursor format: ${error.message}`);
  }
}
```

### Error Responses

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "The provided cursor is malformed or expired",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "cursor",
      "code": "INVALID_CURSOR_FORMAT",
      "message": "Cursor format is invalid",
      "providedValue": "invalid-cursor-string"
    }
  ]
}
```

## Testing Cursor Pagination

### Unit Tests

```javascript
describe('Cursor Pagination', () => {
  let pagination;
  
  beforeEach(() => {
    pagination = new CursorPagination(
      mockCollection,
      [
        { field: 'createdDate', direction: -1 },
        { field: 'id', direction: 1 }
      ]
    );
  });

  test('should paginate forward correctly', async () => {
    const result = await pagination.paginate(null, 2, 'next');
    
    expect(result.data).toHaveLength(2);
    expect(result.meta.cursor.hasNext).toBe(true);
    expect(result.meta.cursor.next).toBeTruthy();
  });

  test('should paginate backward correctly', async () => {
    const firstPage = await pagination.paginate(null, 2, 'next');
    const cursor = pagination.parseCursor(firstPage.meta.cursor.next);
    
    const secondPage = await pagination.paginate(cursor, 2, 'prev');
    
    expect(secondPage.data).toHaveLength(2);
    expect(secondPage.meta.cursor.hasPrevious).toBe(true);
  });

  test('should handle invalid cursor', async () => {
    await expect(
      pagination.paginate('invalid-cursor', 2, 'next')
    ).rejects.toThrow('Invalid cursor format');
  });
});
```

### Integration Tests

```javascript
describe('Cursor Pagination API', () => {
  test('should return first page without cursor', async () => {
    const response = await request(app)
      .get('/v1/orders?size=2')
      .expect(200);
    
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.cursor.current).toBeTruthy();
    expect(response.body.meta.cursor.next).toBeTruthy();
    expect(response.body.meta.cursor.previous).toBeNull();
  });

  test('should navigate to next page', async () => {
    const firstPage = await request(app)
      .get('/v1/orders?size=2')
      .expect(200);
    
    const nextCursor = firstPage.body.meta.cursor.next;
    
    const secondPage = await request(app)
      .get(`/v1/orders?size=2&cursor=${nextCursor}`)
      .expect(200);
    
    expect(secondPage.body.data).toHaveLength(2);
    expect(secondPage.body.meta.cursor.previous).toBeTruthy();
  });
});
```

## Best Practices

1. **Always include a unique field** (like ID) in sort criteria for consistent ordering
2. **Use composite indexes** that match your sort criteria exactly
3. **Validate cursor format** and handle parsing errors gracefully
4. **Set cursor expiration** to prevent stale cursor issues
5. **Cache cursor results** for frequently accessed pages
6. **Use projections** to minimize data transfer
7. **Implement proper error handling** for invalid or expired cursors
8. **Test edge cases** thoroughly, including empty results and boundary conditions
9. **Monitor query performance** and optimize indexes based on usage patterns
10. **Consider hybrid approaches** for different use cases (offset for small datasets, cursor for large ones)

## Migration from Offset Pagination

### Hybrid Approach

```javascript
class HybridPagination {
  constructor(collection, sortFields) {
    this.collection = collection;
    this.sortFields = sortFields;
    this.cursorPagination = new CursorPagination(collection, sortFields);
  }

  async paginate(params) {
    const { page, cursor, size, direction } = params;
    
    // Use cursor pagination if cursor is provided
    if (cursor) {
      return this.cursorPagination.paginate(cursor, size, direction);
    }
    
    // Use offset pagination for small page numbers
    if (page !== undefined && page < 10) {
      return this.offsetPaginate(page, size);
    }
    
    // Default to cursor pagination
    return this.cursorPagination.paginate(null, size, 'next');
  }

  async offsetPaginate(page, size) {
    const skip = page * size;
    const [data, total] = await Promise.all([
      this.collection.find({}).sort({ createdDate: -1 }).skip(skip).limit(size).toArray(),
      this.collection.countDocuments({})
    ]);
    
    return {
      data,
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
}
```

## Related Documentation

- [Main Pagination Guide](../../Pagination-and-Filtering.md)
- [Advanced Patterns](advanced-patterns.md)
- [Complete Examples](../examples/pagination/complete-examples.md)
- [Common Issues](../troubleshooting/pagination/common-issues.md)