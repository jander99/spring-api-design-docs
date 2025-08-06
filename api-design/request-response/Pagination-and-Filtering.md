# Pagination and Filtering

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 2 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Data, Architecture
> 
> **📊 Complexity:** 17.2 grade level • 1.5% technical density • very difficult

## Overview

This document defines the essential patterns for pagination, filtering, and sorting in collection responses. These patterns ensure consistent behavior across all APIs that return multiple resources.

## Core Concepts

### Pagination Types

1. **Offset-based pagination**: Uses page numbers and sizes (best for small datasets)
2. **Cursor-based pagination**: Uses tokens for position (best for large datasets)

### Standard Response Structure

All paginated responses follow this structure:

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    }
  }
}
```

## Basic Pagination

### Query Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `page` | Page number (0-indexed) | 0 | `?page=2` |
| `size` | Items per page | 20 | `?size=50` |
| `sort` | Sorting criteria | none | `?sort=createdDate,desc` |

### Standards

- Start page numbering from 0
- Default page size: 20 items
- Maximum page size: 100 items
- Always include total counts

## Basic Filtering

### Common Filter Patterns

| Filter Type | Parameter Pattern | Example |
|-------------|-------------------|---------|
| Equality | `field=value` | `?status=ACTIVE` |
| Date range | `field[After/Before]=date` | `?createdAfter=2024-01-01` |
| Numeric range | `field[Gt/Lt]=number` | `?totalGt=100` |
| Multiple values | `field=value1,value2` | `?status=ACTIVE,PENDING` |
| Text search | `search=text` | `?search=customer+name` |

### Filter Response

Always echo back applied filters:

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

## Quick Implementation Guide

### Step 1: Define Query Parameters
- Accept `page`, `size`, and `sort` parameters
- Validate parameter types and ranges
- Set reasonable defaults and limits

### Step 2: Apply Filters
- Parse filter parameters
- Validate filter values against allowed options
- Combine filters with AND logic by default

### Step 3: Build Response
- Include filtered data in `data` array
- Add pagination metadata in `meta.pagination`
- Echo applied filters in `meta.filters`

### Step 4: Handle Edge Cases
- Return empty arrays for no results
- Validate page numbers don't exceed total pages
- Provide clear error messages for invalid parameters

## Essential Response Format

```json
{
  "data": [
    {
      "id": "order-12346",
      "customerId": "cust-67890",
      "total": 149.50,
      "status": "PROCESSING",
      "createdDate": "2024-04-14T10:22:00Z"
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
    ]
  }
}
```

## Performance Tips

- Use cursor-based pagination for large datasets
- Index commonly filtered and sorted fields
- Consider making total counts optional for performance
- Limit maximum page sizes to prevent resource exhaustion

## Related Documentation

### Detailed Examples
- [Complete Examples](examples/pagination/complete-examples.md) - Full code examples and use cases
- [Framework Integration](examples/pagination/framework-integration.md) - Implementation patterns for specific frameworks

### Advanced Patterns
- [Complex Filtering](reference/pagination/advanced-patterns.md) - Advanced query operators and search patterns
- [Cursor Pagination](reference/pagination/cursor-pagination.md) - High-performance pagination for large datasets

### Troubleshooting
- [Common Issues](troubleshooting/pagination/common-issues.md) - Error handling and edge cases
- [Performance Problems](troubleshooting/pagination/performance-problems.md) - Optimization strategies

### API Design Standards
- [Content Types and Structure](Content-Types-and-Structure.md) - Basic request/response patterns
- [Error Response Standards](Error-Response-Standards.md) - Error handling patterns
- [Streaming APIs](Streaming-APIs.md) - Alternative patterns for large datasets