# Pagination and Filtering

## Overview

This document defines the standards for pagination, filtering, and sorting in collection responses. These patterns ensure consistent behavior across all APIs that return multiple resources.

## Pagination Response Structure

Paginated responses must include these metadata fields:

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,          // Current page (0-indexed)
      "size": 20,         // Items per page
      "totalElements": 54, // Total items across all pages
      "totalPages": 3     // Total number of pages
    }
  }
}
```

### Pagination Standards

1. **Zero-indexed pages**: Start page numbering from 0
2. **Default page size**: Use 20 items per page as default
3. **Maximum page size**: Limit maximum page size (e.g., 100 items)
4. **Total counts**: Always include total element and page counts

### Pagination Query Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `page` | Page number (0-indexed) | 0 | `?page=2` |
| `size` | Items per page | 20 | `?size=50` |
| `sort` | Sorting criteria | none | `?sort=createdDate,desc` |

## Filtering Response Structure

When filters are applied, include them in the metadata:

```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "status": "ACTIVE",
      "createdAfter": "2024-01-01"
    }
  }
}
```

### Filter Standards

1. **Applied filters**: Always echo back applied filters in the response
2. **Filter validation**: Validate filter values and return appropriate errors
3. **Filter combinations**: Support multiple filters with AND logic by default
4. **Date formats**: Use ISO 8601 format for date/time filters

### Common Filter Patterns

| Filter Type | Parameter Pattern | Example |
|-------------|-------------------|---------|
| Equality | `field=value` | `?status=ACTIVE` |
| Date range | `field[After/Before]=date` | `?createdAfter=2024-01-01` |
| Numeric range | `field[Gt/Lt]=number` | `?totalGt=100` |
| Multiple values | `field=value1,value2` | `?status=ACTIVE,PENDING` |
| Text search | `search=text` | `?search=customer+name` |

## Sorting Response Structure

When sorting is applied, include sort criteria in the metadata:

```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "sort": [
      {"field": "createdDate", "direction": "DESC"},
      {"field": "total", "direction": "ASC"}
    ]
  }
}
```

### Sorting Standards

1. **Multiple sort fields**: Support multiple sort criteria
2. **Sort direction**: Use `ASC` and `DESC` for direction values
3. **Default sorting**: Define sensible default sort order for each endpoint
4. **Sort validation**: Validate sortable fields and return errors for invalid fields

### Sort Query Parameter Format

Support flexible sort parameter formats:

```
# Single field, ascending (default)
?sort=createdDate

# Single field, descending
?sort=createdDate,desc

# Multiple fields
?sort=status,asc&sort=createdDate,desc

# Alternative comma-separated format
?sort=status,asc,createdDate,desc
```

## Complete Collection Response Example

**GET /v1/orders?status=PROCESSING&page=0&size=2&sort=createdDate,desc**

Response:
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

## Advanced Filtering Patterns

### Complex Filter Queries

For more sophisticated filtering, consider supporting query expressions:

```
# Range queries
?createdDate[gte]=2024-01-01&createdDate[lt]=2024-02-01

# IN queries
?status[in]=ACTIVE,PENDING,PROCESSING

# NOT queries
?status[not]=CANCELLED

# Text search with operators
?customerName[contains]=smith
?email[startsWith]=admin
```

### Filter Response with Applied Filters

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
      }
    }
  }
}
```

## Search and Full-Text Queries

### Simple Search

```
GET /v1/orders?search=customer+smith
```

Response includes search metadata:
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

### Advanced Search

For complex search requirements:

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

## Empty Result Handling

### No Results Found

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

### Page Beyond Results

When requesting a page beyond available data:

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

## Performance Considerations

### Efficient Pagination

1. **Limit deep pagination**: Consider cursor-based pagination for large datasets
2. **Index optimization**: Ensure database indexes support common filter and sort combinations
3. **Count queries**: For performance, consider making total counts optional for large datasets

### Cursor-Based Pagination

For high-performance scenarios:

```json
{
  "data": [...],
  "meta": {
    "cursor": {
      "current": "eyJpZCI6IjEyMzQ1IiwiZGF0ZSI6IjIwMjQtMDctMTUifQ==",
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

Query parameters:
```
?cursor=eyJpZCI6IjEyMzQ1IiwiZGF0ZSI6IjIwMjQtMDctMTUifQ==&size=20
```

## Error Handling

### Invalid Filter Values

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-filter",
  "title": "Invalid Filter Value",
  "status": 400,
  "detail": "The provided filter value is not valid",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "status",
      "code": "INVALID_VALUE",
      "message": "Status must be one of: PENDING, PROCESSING, COMPLETED, CANCELLED",
      "providedValue": "INVALID_STATUS"
    }
  ]
}
```

### Invalid Sort Fields

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-sort-field",
  "title": "Invalid Sort Field",
  "status": 400,
  "detail": "The specified sort field is not supported",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "sort",
      "code": "UNSUPPORTED_SORT_FIELD",
      "message": "Field 'invalidField' is not available for sorting",
      "supportedFields": ["id", "createdDate", "total", "status"]
    }
  ]
}
```

## Implementation Guidelines

### Query Parameter Validation

1. **Type validation**: Ensure proper types for numeric and date parameters
2. **Range validation**: Validate page numbers and sizes are within acceptable ranges
3. **Field validation**: Verify filter and sort fields exist and are queryable
4. **Value validation**: Check filter values against allowed enums/ranges

### Database Optimization

1. **Indexed fields**: Ensure commonly filtered and sorted fields are indexed
2. **Composite indexes**: Create composite indexes for common filter combinations
3. **Query optimization**: Monitor and optimize slow queries from pagination endpoints

### Framework Integration

These pagination patterns work with any REST framework:

- **Express.js**: Use query parameter parsing middleware
- **FastAPI**: Pydantic models for query parameter validation
- **Django REST Framework**: DRF pagination classes and filter backends
- **Spring Boot**: See spring-design documentation for specific implementation patterns

## Related Documentation

- [Content Types and Structure](Content-Types-and-Structure.md) - Basic request/response patterns
- [Error Response Standards](Error-Response-Standards.md) - Error handling patterns
- [Streaming APIs](Streaming-APIs.md) - Alternative patterns for large datasets