# Complete Pagination Examples

This document provides comprehensive examples for implementing pagination, filtering, and sorting in collection APIs.

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

### Multiple Values (IN Filter)
```
GET /v1/orders?status=ACTIVE,PROCESSING
```

Response:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "status": "ACTIVE,PROCESSING"
    }
  }
}
```

### Date Range Filter
```
GET /v1/orders?createdAfter=2024-01-01&createdBefore=2024-03-31
```

Response:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "createdAfter": "2024-01-01",
      "createdBefore": "2024-03-31"
    }
  }
}
```

## Search Examples

### Simple Text Search
```
GET /v1/orders?search=urgent
```

Response:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "search": {
      "query": "urgent"
    }
  }
}
```

### Complex Search Query
```
GET /v1/orders?search="customer email"&searchFields=customerName,customerEmail
```

Response:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "search": {
      "query": "customer email",
      "fields": ["customerName", "customerEmail"]
    }
  }
}
```

## Empty Collection Response

When no results match the query:

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
      "status": "CANCELLED",
      "createdAfter": "2024-12-01"
    },
    "timestamp": "2024-07-15T14:32:22Z",
    "requestId": "req-empty-12345"
  }
}
```

## Edge Cases

### Last Page with Partial Results
```
GET /v1/orders?page=26&size=2
```

Response (54 total items, last page):
```json
{
  "data": [
    {
      "id": "order-54321",
      "customerId": "cust-99999",
      "total": 75.00,
      "status": "COMPLETED",
      "createdDate": "2024-01-01T08:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 26,
      "size": 2,
      "totalElements": 54,
      "totalPages": 27
    }
  }
}
```

### Page Beyond Available Results
```
GET /v1/orders?page=100&size=20
```

Response:
```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 100,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    }
  }
}
```

## Complex Query Example

Combining all features:

### Request
```
GET /v1/orders?status=ACTIVE,PROCESSING&createdAfter=2024-01-01&search=priority&page=1&size=10&sort=total,desc&sort=createdDate,asc
```

### Response
```json
{
  "data": [
    {
      "id": "order-78901",
      "customerId": "cust-45678",
      "total": 250.00,
      "status": "PROCESSING",
      "createdDate": "2024-02-15T14:30:00Z",
      "description": "Priority shipping requested"
    },
    {
      "id": "order-67890",
      "customerId": "cust-34567",
      "total": 175.50,
      "status": "ACTIVE",
      "createdDate": "2024-03-01T09:00:00Z",
      "description": "High priority order"
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
      "createdAfter": "2024-01-01"
    },
    "search": {
      "query": "priority"
    },
    "sort": [
      {"field": "total", "direction": "DESC"},
      {"field": "createdDate", "direction": "ASC"}
    ],
    "timestamp": "2024-07-15T14:32:22Z",
    "requestId": "req-complex-12345"
  }
}
```

## Performance Optimization Patterns

### Efficient Count Strategies

For large datasets, consider making counts optional:
- Add `includeCount=false` parameter to skip counting
- Use estimated counts for approximate totals
- Cache count results for frequently accessed queries

### Index Optimization

Ensure database indexes support common query patterns:
- Composite indexes for multi-field filters
- Text indexes for search functionality
- Sort field indexes for performance

### Cursor-Based Pagination

For very large datasets or real-time data, consider cursor-based pagination:
- More efficient for deep pagination
- Stable results for changing data
- Better performance characteristics

## Related Documentation

- [Main Pagination Guide](../../pagination-and-filtering.md)
- [Advanced Patterns](../../reference/pagination/advanced-patterns.md)
- [Common Issues](../../troubleshooting/pagination/common-issues.md)