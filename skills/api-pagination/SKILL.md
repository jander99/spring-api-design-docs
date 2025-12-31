---
name: api-pagination
description: Implement and optimize pagination for REST API collections with strategies (cursor, offset), filtering (operators, query params), and sorting (multi-field, direction). Use when building list endpoints, choosing pagination approach, adding filter parameters, or optimizing large dataset performance.
---

# API Pagination

Implement efficient pagination, filtering, and sorting for collection endpoints.

## When to Use

- Adding pagination to collection endpoints
- Choosing between cursor and offset pagination
- Implementing filtering with query parameters
- Adding multi-field sorting
- Optimizing large dataset performance

## Quick Start

Offset pagination request:

```http
GET /orders?page=0&size=20&sort=createdDate,desc HTTP/1.1

HTTP/1.1 200 OK
{
  "data": [{"id": "order-123", "status": "PROCESSING"}],
  "meta": {
    "pagination": {"page": 0, "size": 20, "totalElements": 54, "totalPages": 3}
  }
}
```

## Strategy Decision

| Use Case | Strategy | Reason |
|----------|----------|--------|
| Admin dashboards | Offset | Page jumping needed |
| Infinite scroll | Cursor | Stable, performant |
| Real-time feeds | Cursor | Handles concurrent changes |
| Large datasets (>10K) | Cursor | O(1) vs O(n) performance |
| Simple CRUD APIs | Offset | Simpler implementation |

## Offset Pagination

| Parameter | Default | Max |
|-----------|---------|-----|
| `page` | 0 | - |
| `size` | 20 | 100 |
| `sort` | none | - |

Response includes: `page`, `size`, `totalElements`, `totalPages`

## Cursor Pagination

```http
GET /orders?cursor=eyJpZCI6IjEyMyJ9&size=20 HTTP/1.1
```

Response includes: `current`, `next`, `previous`, `hasNext`, `hasPrevious`

**Benefits**: O(1) performance, stable results, no duplicates during changes.

## Filtering

| Pattern | Example |
|---------|---------|
| Equality | `?status=ACTIVE` |
| Multiple | `?status=ACTIVE,PENDING` |
| Range | `?createdAfter=2024-01-01` |
| Comparison | `?total[gt]=100` |

## Sorting

```http
GET /orders?sort=priority,desc&sort=createdDate,asc HTTP/1.1
```

Format: `sort={field},{direction}` - multiple allowed for priority.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| No max page size | Resource exhaustion | Cap at 100 |
| Offset for large data | O(n) performance | Use cursor |
| Exposing cursor internals | Tight coupling | Use opaque tokens |

## References

- `references/cursor-pagination.md` - Cursor implementation details
- `references/offset-pagination.md` - Offset implementation details
- `references/java-spring.md` - Spring Data implementation
- `../../api-design/advanced-patterns/performance-standards.md` - Performance optimization
