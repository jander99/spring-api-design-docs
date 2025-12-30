---
name: api-pagination
description: Implement pagination, filtering, and sorting for REST API list endpoints. Use when designing collection endpoints that return large datasets, implementing cursor or offset pagination, adding filter query parameters, or optimizing list performance.
---

# API Pagination

<!--
SOURCE DOCUMENTS:
- api-design/request-response/Pagination-and-Filtering.md
- api-design/request-response/reference/pagination/cursor-pagination.md
- api-design/request-response/reference/pagination/advanced-patterns.md
- api-design/request-response/examples/pagination/complete-examples.md
- api-design/request-response/troubleshooting/pagination/common-issues.md
- spring-design/controllers/Request-Response-Mapping.md (pagination section)

REFERENCE FILES TO CREATE:
- references/cursor-pagination.md (cursor-based patterns)
- references/offset-pagination.md (offset/limit patterns)
- references/filtering.md (query parameter filtering)
- references/java-spring.md (Spring Data Pageable, PageRequest)
-->

## When to Use This Skill

Use this skill when you need to:
- Add pagination to collection endpoints
- Choose between cursor and offset pagination
- Implement filtering with query parameters
- Add sorting capabilities
- Design page response structures

## Core Principles

TODO: Extract and condense from Pagination-and-Filtering.md

### Pagination Strategies
- **Offset pagination**: Simple, allows jumping to pages, but inconsistent with changing data
- **Cursor pagination**: Stable results, better performance, but no random page access

### Query Parameter Conventions
- `page` or `offset`: Starting position
- `size` or `limit`: Items per page (with maximum cap)
- `sort`: Field and direction (e.g., `sort=createdAt,desc`)
- `filter`: Field-specific filters (e.g., `status=active`)

### Page Response Structure
- Include items array
- Include pagination metadata (total, page, size, hasNext)
- Include links for navigation (first, prev, next, last)

## Quick Reference

TODO: Add pagination strategy decision tree

| Use Case | Recommended Strategy |
|----------|---------------------|
| Admin dashboards | Offset (page jumping needed) |
| Infinite scroll | Cursor (stable, performant) |
| Real-time data | Cursor (handles insertions) |
| Static data | Either (data doesn't change) |
| Large datasets | Cursor (avoids offset scan) |

## Loading Additional Context

When you need deeper guidance:

- **Cursor pagination patterns**: Load `references/cursor-pagination.md`
- **Offset pagination patterns**: Load `references/offset-pagination.md`
- **Filtering strategies**: Load `references/filtering.md`
- **Java/Spring implementation**: Load `references/java-spring.md`

## Examples

TODO: Add minimal illustrative examples

### Offset Pagination Request
```
GET /orders?page=2&size=20&sort=createdAt,desc
```

### Cursor Pagination Request
```
GET /orders?cursor=eyJpZCI6MTIzfQ&size=20
```

### Page Response
```json
{
  "items": [...],
  "pagination": {
    "page": 2,
    "size": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Anti-Patterns

TODO: Extract from source documents

- No maximum page size (allows resource exhaustion)
- Returning total count on every request (expensive query)
- Using offset pagination for real-time feeds
- Exposing internal cursor implementation details
- Inconsistent parameter names across endpoints
