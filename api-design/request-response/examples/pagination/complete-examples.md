# Complete Pagination Examples

This document provides comprehensive code examples for implementing pagination, filtering, and sorting in collection APIs.

## Complete Collection Response

### Example Request
```
GET /v1/orders?status=PROCESSING&page=0&size=2&sort=createdDate,desc
```

### Example Response
```json
{
  "data": [
    {
      "id": "order-12346",
      "customerId": "cust-67890",
      "total": 149.50,
      "status": "PROCESSING",
      "createdDate": "2024-04-14T10:22:00Z"
    },
    {
      "id": "order-12345",
      "customerId": "cust-12345",
      "total": 99.95,
      "status": "PROCESSING",
      "createdDate": "2024-04-14T09:15:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 2,
      "totalElements": 54,
      "totalPages": 27
    },
    "filters": {
      "status": "PROCESSING"
    },
    "sort": [
      {"field": "createdDate", "direction": "DESC"}
    ],
    "timestamp": "2024-07-15T14:32:22Z",
    "requestId": "req-12345"
  }
}
```

## Sorting Examples

### Multiple Sort Fields
```
GET /v1/orders?sort=status,asc&sort=createdDate,desc
```

Response with multiple sort criteria:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "sort": [
      {"field": "status", "direction": "ASC"},
      {"field": "createdDate", "direction": "DESC"}
    ]
  }
}
```

### Alternative Sort Formats
```
# Single field, ascending (default)
GET /v1/orders?sort=createdDate

# Single field, descending
GET /v1/orders?sort=createdDate,desc

# Multiple fields, comma-separated
GET /v1/orders?sort=status,asc,createdDate,desc
```

## Filtering Examples

### Basic Equality Filter
```
GET /v1/orders?status=ACTIVE
```

Response:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "status": "ACTIVE"
    }
  }
}
```

### Date Range Filtering
```
GET /v1/orders?createdAfter=2024-01-01&createdBefore=2024-12-31
```

Response:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "createdAfter": "2024-01-01",
      "createdBefore": "2024-12-31"
    }
  }
}
```

### Multiple Value Filtering
```
GET /v1/orders?status=ACTIVE,PENDING,PROCESSING
```

Response:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "status": "ACTIVE,PENDING,PROCESSING"
    }
  }
}
```

### Numeric Range Filtering
```
GET /v1/orders?totalGt=100&totalLt=500
```

Response:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "totalGt": "100",
      "totalLt": "500"
    }
  }
}
```

## Search Examples

### Simple Text Search
```
GET /v1/orders?search=customer+smith
```

Response:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "search": {
      "query": "customer smith",
      "fields": ["customerName", "customerEmail", "notes"]
    }
  }
}
```

### Advanced Search with Metadata
```
GET /v1/orders?search=customer+smith&searchFields=customerName,customerEmail
```

Response:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "search": {
      "query": "customer smith",
      "operator": "and",
      "fields": ["customerName", "customerEmail"],
      "highlight": true
    }
  }
}
```

## Empty Results Examples

### No Results Found
```
GET /v1/orders?status=NONEXISTENT_STATUS
```

Response:
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

### Page Beyond Available Results
```
GET /v1/orders?page=50&size=20
```

Response (when only 10 total items exist):
```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 50,
      "size": 20,
      "totalElements": 10,
      "totalPages": 1
    }
  }
}
```

## Combined Examples

### Complex Query with Multiple Filters
```
GET /v1/orders?status=ACTIVE,PROCESSING&createdAfter=2024-01-01&totalGt=50&search=premium&page=1&size=10&sort=total,desc
```

Response:
```json
{
  "data": [
    {
      "id": "order-98765",
      "customerId": "cust-premium-123",
      "total": 299.99,
      "status": "PROCESSING",
      "createdDate": "2024-02-15T14:30:00Z",
      "items": [
        {
          "name": "Premium Product",
          "price": 299.99,
          "quantity": 1
        }
      ]
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "size": 10,
      "totalElements": 23,
      "totalPages": 3
    },
    "filters": {
      "status": "ACTIVE,PROCESSING",
      "createdAfter": "2024-01-01",
      "totalGt": "50"
    },
    "search": {
      "query": "premium",
      "fields": ["customerName", "notes", "items.name"]
    },
    "sort": [
      {"field": "total", "direction": "DESC"}
    ],
    "timestamp": "2024-07-15T14:32:22Z",
    "requestId": "req-complex-12345"
  }
}
```

## Framework Integration Examples

### Express.js Implementation
```javascript
app.get('/v1/orders', async (req, res) => {
  const {
    page = 0,
    size = 20,
    sort,
    status,
    createdAfter,
    search
  } = req.query;

  // Validate parameters
  const pageNum = parseInt(page);
  const pageSize = Math.min(parseInt(size), 100);
  
  // Build query
  const query = {};
  if (status) query.status = { $in: status.split(',') };
  if (createdAfter) query.createdDate = { $gte: new Date(createdAfter) };
  if (search) query.$text = { $search: search };

  // Execute query with pagination
  const [data, total] = await Promise.all([
    Order.find(query)
      .sort(parseSort(sort))
      .skip(pageNum * pageSize)
      .limit(pageSize),
    Order.countDocuments(query)
  ]);

  // Build response
  res.json({
    data,
    meta: {
      pagination: {
        page: pageNum,
        size: pageSize,
        totalElements: total,
        totalPages: Math.ceil(total / pageSize)
      },
      filters: { status, createdAfter },
      search: search ? { query: search } : undefined
    }
  });
});
```

### FastAPI Implementation
```python
from fastapi import FastAPI, Query
from pydantic import BaseModel
from typing import Optional, List

class PaginationMeta(BaseModel):
    page: int
    size: int
    totalElements: int
    totalPages: int

class ResponseMeta(BaseModel):
    pagination: PaginationMeta
    filters: Optional[dict] = None
    search: Optional[dict] = None

class PaginatedResponse(BaseModel):
    data: List[dict]
    meta: ResponseMeta

@app.get("/v1/orders", response_model=PaginatedResponse)
async def get_orders(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    createdAfter: Optional[str] = None,
    search: Optional[str] = None
):
    # Build query
    query = {}
    if status:
        query['status'] = {'$in': status.split(',')}
    if createdAfter:
        query['createdDate'] = {'$gte': createdAfter}
    if search:
        query['$text'] = {'$search': search}
    
    # Execute query
    total = await Order.count_documents(query)
    orders = await Order.find(query).skip(page * size).limit(size).to_list()
    
    return PaginatedResponse(
        data=orders,
        meta=ResponseMeta(
            pagination=PaginationMeta(
                page=page,
                size=size,
                totalElements=total,
                totalPages=(total + size - 1) // size
            ),
            filters={'status': status, 'createdAfter': createdAfter} if status or createdAfter else None,
            search={'query': search} if search else None
        )
    )
```

## Performance Optimization Examples

### Efficient Count Queries
```javascript
// Instead of counting all results
const total = await Order.countDocuments(query);

// Use estimated counts for large datasets
const total = await Order.estimatedDocumentCount();

// Or make counts optional
const includeCount = req.query.includeCount === 'true';
const total = includeCount ? await Order.countDocuments(query) : null;
```

### Indexed Query Optimization
```javascript
// Ensure indexes support common query patterns
db.orders.createIndex({ status: 1, createdDate: -1 });
db.orders.createIndex({ customerId: 1, status: 1 });
db.orders.createIndex({ "$**": "text" }); // For text search
```

### Cursor-Based Pagination Example
```javascript
// Cursor-based pagination for large datasets
app.get('/v1/orders/cursor', async (req, res) => {
  const { cursor, size = 20 } = req.query;
  
  let query = {};
  if (cursor) {
    const decoded = Buffer.from(cursor, 'base64').toString();
    const { id, date } = JSON.parse(decoded);
    query = {
      $or: [
        { createdDate: { $lt: new Date(date) } },
        { createdDate: new Date(date), _id: { $gt: id } }
      ]
    };
  }
  
  const orders = await Order.find(query)
    .sort({ createdDate: -1, _id: 1 })
    .limit(parseInt(size) + 1);
  
  const hasNext = orders.length > size;
  const data = hasNext ? orders.slice(0, -1) : orders;
  
  const nextCursor = hasNext ? 
    Buffer.from(JSON.stringify({
      id: data[data.length - 1]._id,
      date: data[data.length - 1].createdDate
    })).toString('base64') : null;
  
  res.json({
    data,
    meta: {
      cursor: {
        current: cursor,
        next: nextCursor,
        hasNext
      }
    }
  });
});
```

## Related Documentation

- [Main Pagination Guide](../../Pagination-and-Filtering.md)
- [Advanced Patterns](../reference/pagination/advanced-patterns.md)
- [Common Issues](../troubleshooting/pagination/common-issues.md)