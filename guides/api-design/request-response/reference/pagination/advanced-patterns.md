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

A cursor encodes the position in the result set using sort key values. The cursor is Base64-encoded for URL safety:

```json
{
  "id": "12345",
  "createdDate": "2024-07-15T10:30:00Z",
  "total": 299.99
}
```

When Base64-encoded, this becomes:
```
eyJpZCI6IjEyMzQ1IiwiY3JlYXRlZERhdGUiOiIyMDI0LTA3LTE1VDEwOjMwOjAwWiIsInRvdGFsIjoyOTkuOTl9
```

#### Query Generation

For **forward pagination** (next page), the query uses `less than` operators on descending fields and `greater than` on ascending fields:

```http
GET /v1/orders?cursor=eyJpZCI6IjEyMzQ1Ii...&direction=next&size=20 HTTP/1.1
Accept: application/json
```

The server interprets this cursor to find records that come after the cursor position in the sort order.

For **backward pagination** (previous page), the operators are reversed:

```http
GET /v1/orders?cursor=eyJpZCI6IjEyMzQ1Ii...&direction=prev&size=20 HTTP/1.1
Accept: application/json
```

#### Cursor Query Logic

The cursor comparison follows this precedence for multi-field sorting:

| Sort Order | Forward (next) | Backward (prev) |
|------------|----------------|-----------------|
| `createdDate DESC` | Find records with `createdDate < cursor.createdDate` | Find records with `createdDate > cursor.createdDate` |
| `total DESC` (tie-breaker) | Find records with same `createdDate` AND `total < cursor.total` | Find records with same `createdDate` AND `total > cursor.total` |
| `id ASC` (final tie-breaker) | Find records with same values AND `id > cursor.id` | Find records with same values AND `id < cursor.id` |

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

Switch between pagination types based on query characteristics. The server can automatically choose the optimal strategy:

**Small result sets (< 1000 items)** - Use offset pagination:
```http
GET /v1/orders?page=0&size=20 HTTP/1.1
Accept: application/json
```

Response includes offset-based metadata:
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 543,
      "totalPages": 28
    }
  }
}
```

**Large result sets (>= 1000 items)** - Use cursor pagination:
```http
GET /v1/orders?size=20 HTTP/1.1
Accept: application/json
```

Response includes cursor-based metadata:
```json
{
  "data": [...],
  "meta": {
    "cursor": {
      "next": "eyJpZCI6IjEyMzQ2Ii4uLn0=",
      "hasNext": true
    },
    "paginationType": "cursor",
    "estimatedTotal": 15000
  }
}
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

Design indexes that support common query patterns. For a query filtering by status, date range, and customer:

```http
GET /v1/orders?status[in]=ACTIVE,PENDING&createdDate[gte]=2024-01-01&customerId=cust-123 HTTP/1.1
Accept: application/json
```

The database index should include these fields in order of selectivity:

| Index Position | Field | Direction | Purpose |
|----------------|-------|-----------|---------|
| 1 | `status` | ASC | Equality filter (most selective) |
| 2 | `createdDate` | DESC | Range filter |
| 3 | `customerId` | ASC | Equality filter |

#### Covering Index Pattern

For optimal performance, the index can include all projected fields to avoid table lookups:

| Index Position | Field | Purpose |
|----------------|-------|---------|
| 1 | `status` | Filter |
| 2 | `createdDate` | Filter + Sort |
| 3 | `customerId` | Filter |
| 4 | `total` | Projection |
| 5 | `id` | Projection |

This allows the query to be satisfied entirely from the index without accessing the main table.

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

The query parser transforms URL query parameters with operators into database filter conditions:

**Input URL:**
```http
GET /v1/orders?status[in]=ACTIVE,PENDING&total[gte]=100&customerName[contains]=smith HTTP/1.1
Accept: application/json
```

**Parsed filter structure:**
```json
{
  "filters": [
    {
      "field": "status",
      "operator": "in",
      "values": ["ACTIVE", "PENDING"]
    },
    {
      "field": "total",
      "operator": "gte",
      "value": 100
    },
    {
      "field": "customerName",
      "operator": "contains",
      "value": "smith"
    }
  ]
}
```

**Operator mapping reference:**

| URL Syntax | Filter Type | Description |
|------------|-------------|-------------|
| `?field=value` | Equality (default) | Exact match |
| `?field[ne]=value` | Not equals | Exclude matches |
| `?field[in]=a,b,c` | In list | Match any value |
| `?field[gt]=value` | Greater than | Numeric/date comparison |
| `?field[gte]=value` | Greater than or equal | Numeric/date range |
| `?field[lt]=value` | Less than | Numeric/date comparison |
| `?field[lte]=value` | Less than or equal | Numeric/date range |
| `?field[contains]=value` | Contains | Case-insensitive substring |
| `?field[startsWith]=value` | Starts with | Prefix match |
| `?field[endsWith]=value` | Ends with | Suffix match |

### Cursor Generator

The cursor generator creates opaque cursor tokens from result documents and parses them for subsequent requests.

#### Generating a Cursor

Given a document and sort configuration:

```json
{
  "document": {
    "id": "order-456",
    "createdDate": "2024-07-15T10:30:00Z",
    "total": 299.99,
    "customerName": "John Smith"
  },
  "sortFields": [
    {"name": "createdDate", "direction": "DESC"},
    {"name": "total", "direction": "DESC"}
  ]
}
```

The cursor captures only the sort field values plus the unique identifier:

```json
{
  "createdDate": "2024-07-15T10:30:00Z",
  "total": 299.99,
  "id": "order-456"
}
```

Base64-encoded for the response:
```
eyJjcmVhdGVkRGF0ZSI6IjIwMjQtMDctMTVUMTA6MzA6MDBaIiwidG90YWwiOjI5OS45OSwiaWQiOiJvcmRlci00NTYifQ==
```

#### Parsing a Cursor

When receiving a cursor in a request:

```http
GET /v1/orders?cursor=eyJjcmVhdGVkRGF0ZSI6IjIwMjQt...&direction=next HTTP/1.1
Accept: application/json
```

The server decodes and validates the cursor:

1. Base64 decode the cursor string
2. Parse the JSON structure
3. Validate required fields exist
4. Use values to build the continuation query

#### Invalid Cursor Response

If the cursor cannot be parsed:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-cursor",
  "title": "Invalid Cursor",
  "status": 400,
  "detail": "The cursor format is invalid or corrupted"
}
```

## Related Documentation

- [Main Pagination Guide](../../pagination-and-filtering.md)
- [Complete Examples](../../examples/pagination/complete-examples.md)
- [Common Issues](../../troubleshooting/pagination/common-issues.md)
- [Performance Problems](../../troubleshooting/pagination/performance-problems.md)