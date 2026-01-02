# Advanced Pagination Patterns

This document covers sophisticated pagination, filtering, and search patterns for complex API requirements.

## Advanced Filtering Patterns

### Complex Filter Queries

For sophisticated filtering beyond simple equality, support query expressions with operators:

```
# Range queries
GET /v1/orders?createdDate[gte]=2024-01-01&createdDate[lt]=2024-02-01

# IN queries
GET /v1/orders?status[in]=ACTIVE,PENDING,PROCESSING

# NOT queries
GET /v1/orders?status[not]=CANCELLED

# Text search with operators
GET /v1/orders?customerName[contains]=smith
GET /v1/orders?email[startsWith]=admin
GET /v1/orders?description[endsWith]=urgent
```

### Structured Filter Response

When using advanced operators, structure the filter response to show the applied operators:

```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "status": {
        "operator": "in",
        "values": ["ACTIVE", "PENDING"]
      },
      "createdDate": {
        "operator": "gte",
        "value": "2024-01-01"
      },
      "customerName": {
        "operator": "contains",
        "value": "smith"
      },
      "total": {
        "operator": "between",
        "min": 100,
        "max": 500
      }
    }
  }
}
```

### Filter Operator Reference

| Operator | Description | Example | Use Case |
|----------|-------------|---------|----------|
| `eq` | Equals (default) | `?status=ACTIVE` | Exact matches |
| `ne` | Not equals | `?status[ne]=CANCELLED` | Exclusions |
| `in` | In list | `?status[in]=ACTIVE,PENDING` | Multiple values |
| `nin` | Not in list | `?status[nin]=CANCELLED,FAILED` | Multiple exclusions |
| `gt` | Greater than | `?total[gt]=100` | Numeric comparisons |
| `gte` | Greater than or equal | `?total[gte]=100` | Numeric ranges |
| `lt` | Less than | `?total[lt]=500` | Numeric comparisons |
| `lte` | Less than or equal | `?total[lte]=500` | Numeric ranges |
| `between` | Between values | `?total[between]=100,500` | Numeric ranges |
| `contains` | Contains substring | `?name[contains]=smith` | Text search |
| `startsWith` | Starts with | `?email[startsWith]=admin` | Prefix matching |
| `endsWith` | Ends with | `?description[endsWith]=urgent` | Suffix matching |
| `regex` | Regular expression | `?email[regex]=.*@company\.com` | Pattern matching |
| `exists` | Field exists | `?notes[exists]=true` | Presence checks |
| `null` | Field is null | `?deletedAt[null]=true` | Null checks |

## Advanced Search Patterns

### Full-Text Search with Scoring

```json
{
  "data": [
    {
      "id": "order-123",
      "customerName": "John Smith",
      "description": "Premium customer order",
      "_score": 0.85
    }
  ],
  "meta": {
    "pagination": { ... },
    "search": {
      "query": "premium customer",
      "operator": "and",
      "fields": ["customerName", "description", "notes"],
      "highlight": true,
      "minScore": 0.1
    }
  }
}
```

### Multi-Field Search with Weights

```
GET /v1/orders?search=john+smith&searchFields=customerName^2,email^1,notes^0.5
```

Response with weighted search:
```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "search": {
      "query": "john smith",
      "fields": [
        {"name": "customerName", "weight": 2.0},
        {"name": "email", "weight": 1.0},
        {"name": "notes", "weight": 0.5}
      ],
      "operator": "and",
      "highlight": true
    }
  }
}
```

### Faceted Search

Support faceted search for drill-down navigation:

```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "search": {
      "query": "premium",
      "facets": {
        "status": {
          "ACTIVE": 45,
          "PENDING": 12,
          "PROCESSING": 8
        },
        "category": {
          "electronics": 23,
          "clothing": 18,
          "books": 14
        },
        "priceRange": {
          "0-50": 15,
          "50-100": 28,
          "100-500": 22
        }
      }
    }
  }
}
```

## Cursor-Based Pagination

### Basic Cursor Pagination

For high-performance pagination with large datasets:

```json
{
  "data": [...],
  "meta": {
    "cursor": {
      "current": "eyJpZCI6IjEyMzQ1IiwiZGF0ZSI6IjIwMjQtMDctMTUifQ==",
      "next": "eyJpZCI6IjEyMzQ2IiwiZGF0ZSI6IjIwMjQtMDctMTYifQ==",
      "previous": "eyJpZCI6IjEyMzQ0IiwiZGF0ZSI6IjIwMjQtMDctMTQifQ==",
      "hasNext": true,
      "hasPrevious": true
    }
  }
}
```

### Cursor Query Parameters

```
# First page
GET /v1/orders?size=20

# Next page
GET /v1/orders?cursor=eyJpZCI6IjEyMzQ1IiwiZGF0ZSI6IjIwMjQtMDctMTUifQ==&size=20

# Previous page
GET /v1/orders?cursor=eyJpZCI6IjEyMzQ0IiwiZGF0ZSI6IjIwMjQtMDctMTQifQ==&size=20&direction=prev
```

### Cursor Implementation Details

#### Cursor Structure
```javascript
// Cursor contains sort key values
const cursor = {
  id: "12345",
  createdDate: "2024-07-15T10:30:00Z",
  total: 299.99
};

// Base64 encoded for URL safety
const encodedCursor = Buffer.from(JSON.stringify(cursor)).toString('base64');
```

#### Query Generation
```javascript
// For next page (forward pagination)
const query = {
  $or: [
    { createdDate: { $lt: cursor.createdDate } },
    { 
      createdDate: cursor.createdDate,
      total: { $lt: cursor.total }
    },
    {
      createdDate: cursor.createdDate,
      total: cursor.total,
      _id: { $gt: cursor.id }
    }
  ]
};

// For previous page (backward pagination)
const query = {
  $or: [
    { createdDate: { $gt: cursor.createdDate } },
    { 
      createdDate: cursor.createdDate,
      total: { $gt: cursor.total }
    },
    {
      createdDate: cursor.createdDate,
      total: cursor.total,
      _id: { $lt: cursor.id }
    }
  ]
};
```

## Hybrid Pagination

### Offset + Cursor Combination

For APIs that need both offset-based and cursor-based pagination:

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    },
    "cursor": {
      "current": "eyJpZCI6IjEyMzQ1IiwiZGF0ZSI6IjIwMjQtMDctMTUifQ==",
      "next": "eyJpZCI6IjEyMzQ2IiwiZGF0ZSI6IjIwMjQtMDctMTYifQ==",
      "hasNext": true
    }
  }
}
```

### Adaptive Pagination

Switch between pagination types based on query characteristics:

```javascript
// Use offset pagination for small result sets
if (estimatedTotal < 1000) {
  return offsetPagination(query, page, size);
}

// Use cursor pagination for large result sets
return cursorPagination(query, cursor, size);
```

## Advanced Sorting Patterns

### Multi-Level Sorting

Support complex sorting with multiple fields and directions:

```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "sort": [
      {
        "field": "priority",
        "direction": "DESC",
        "nullsFirst": true
      },
      {
        "field": "createdDate",
        "direction": "ASC",
        "nullsFirst": false
      },
      {
        "field": "id",
        "direction": "ASC"
      }
    ]
  }
}
```

### Dynamic Sorting

Allow sorting by calculated fields:

```
GET /v1/orders?sort=totalWithTax,desc&sort=customerName,asc
```

```json
{
  "data": [
    {
      "id": "order-123",
      "total": 100.00,
      "tax": 8.50,
      "totalWithTax": 108.50,
      "customerName": "Alice Johnson"
    }
  ],
  "meta": {
    "pagination": { ... },
    "sort": [
      {
        "field": "totalWithTax",
        "direction": "DESC",
        "calculated": true
      },
      {
        "field": "customerName",
        "direction": "ASC"
      }
    ]
  }
}
```

## Performance Optimization Patterns

### Efficient Count Strategies

#### Estimated Counts
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 10000,
      "totalPages": 500,
      "estimated": true
    }
  }
}
```

#### Optional Counts
```
GET /v1/orders?page=0&size=20&includeCount=false
```

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Index-Optimized Queries

#### Composite Index Strategy
```javascript
// Create indexes that support common query patterns
db.orders.createIndex({ 
  status: 1, 
  createdDate: -1, 
  customerId: 1 
});

// Query that uses the index efficiently
const query = {
  status: { $in: ['ACTIVE', 'PENDING'] },
  createdDate: { $gte: new Date('2024-01-01') },
  customerId: 'cust-123'
};
```

#### Covering Index Pattern
```javascript
// Index that covers all projected fields
db.orders.createIndex({ 
  status: 1, 
  createdDate: -1,
  customerId: 1,
  total: 1,
  id: 1
});
```

## Real-Time Pagination

### Live Updates with Cursors

For real-time data that changes frequently:

```json
{
  "data": [...],
  "meta": {
    "cursor": {
      "current": "eyJpZCI6IjEyMzQ1IiwiZGF0ZSI6IjIwMjQtMDctMTUifQ==",
      "next": "eyJpZCI6IjEyMzQ2IiwiZGF0ZSI6IjIwMjQtMDctMTYifQ==",
      "hasNext": true,
      "stable": false,
      "refreshToken": "refresh-token-12345"
    },
    "updates": {
      "newItems": 3,
      "updatedItems": 1,
      "deletedItems": 0
    }
  }
}
```

### Snapshot Isolation

For consistent pagination across requests:

```
GET /v1/orders?snapshot=2024-07-15T10:30:00Z&cursor=...
```

```json
{
  "data": [...],
  "meta": {
    "cursor": { ... },
    "snapshot": {
      "timestamp": "2024-07-15T10:30:00Z",
      "version": "v1.2.3",
      "ttl": 300
    }
  }
}
```

## Error Handling for Advanced Patterns

### Cursor Validation Errors

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "The provided cursor is invalid or expired",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "cursor",
      "code": "INVALID_CURSOR",
      "message": "Cursor format is invalid or has expired",
      "providedValue": "invalid-cursor-value"
    }
  ]
}
```

### Complex Filter Errors

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-filter-combination",
  "title": "Invalid Filter Combination",
  "status": 400,
  "detail": "The combination of filters is not supported",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "filters",
      "code": "UNSUPPORTED_COMBINATION",
      "message": "Cannot combine 'contains' and 'exact' operators on the same field",
      "conflictingFilters": ["customerName[contains]", "customerName[exact]"]
    }
  ]
}
```

## Implementation Guidelines

### Query Parser Architecture

```javascript
class QueryParser {
  constructor() {
    this.operators = {
      eq: (field, value) => ({ [field]: value }),
      ne: (field, value) => ({ [field]: { $ne: value } }),
      in: (field, values) => ({ [field]: { $in: values.split(',') } }),
      gt: (field, value) => ({ [field]: { $gt: this.parseValue(value) } }),
      gte: (field, value) => ({ [field]: { $gte: this.parseValue(value) } }),
      lt: (field, value) => ({ [field]: { $lt: this.parseValue(value) } }),
      lte: (field, value) => ({ [field]: { $lte: this.parseValue(value) } }),
      contains: (field, value) => ({ [field]: { $regex: value, $options: 'i' } }),
      startsWith: (field, value) => ({ [field]: { $regex: `^${value}`, $options: 'i' } }),
      endsWith: (field, value) => ({ [field]: { $regex: `${value}$`, $options: 'i' } })
    };
  }

  parseFilters(query) {
    const filters = {};
    
    for (const [key, value] of Object.entries(query)) {
      const match = key.match(/^(.+)\[(.+)\]$/);
      
      if (match) {
        const [, field, operator] = match;
        if (this.operators[operator]) {
          Object.assign(filters, this.operators[operator](field, value));
        }
      } else {
        // Default to equality
        Object.assign(filters, this.operators.eq(key, value));
      }
    }
    
    return filters;
  }
}
```

### Cursor Generator

```javascript
class CursorGenerator {
  constructor(sortFields) {
    this.sortFields = sortFields;
  }

  generate(document) {
    const cursor = {};
    
    for (const field of this.sortFields) {
      cursor[field.name] = document[field.name];
    }
    
    // Always include ID for uniqueness
    cursor.id = document.id;
    
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
  }

  parse(cursorString) {
    try {
      const decoded = Buffer.from(cursorString, 'base64').toString();
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }

  buildQuery(cursor, direction = 'next') {
    const conditions = [];
    
    for (let i = 0; i < this.sortFields.length; i++) {
      const field = this.sortFields[i];
      const operator = this.getOperator(field.direction, direction);
      
      // Build condition for this field
      const condition = { [field.name]: { [operator]: cursor[field.name] } };
      
      // Add equality conditions for previous fields
      const equalityConditions = {};
      for (let j = 0; j < i; j++) {
        const prevField = this.sortFields[j];
        equalityConditions[prevField.name] = cursor[prevField.name];
      }
      
      conditions.push({ ...equalityConditions, ...condition });
    }
    
    return { $or: conditions };
  }
}
```

## Related Documentation

- [Main Pagination Guide](../../pagination-and-filtering.md)
- [Complete Examples](../examples/pagination/complete-examples.md)
- [Common Issues](../troubleshooting/pagination/common-issues.md)
- [Performance Problems](../troubleshooting/pagination/performance-problems.md)