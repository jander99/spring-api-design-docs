# Pagination in Spring Boot

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 3 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic Spring Boot knowledge  
> **🎯 Key Topics:** Pagination, Pageable, cursors
> 
> **📊 Complexity:** 13.7 grade level • 2.4% technical density • code-heavy

This directory contains Spring Boot patterns for paginating API responses.

## What You'll Learn

Pagination splits large result sets into pages. This guide covers:

- Offset pagination with Spring's `Pageable`
- Cursor pagination for large datasets
- When to use each approach

## Documentation

### [Cursor Pagination Implementation](./cursor-pagination-implementation.md)

**Complete cursor-based pagination patterns**

- Cursor encoding and decoding
- JPA repository queries
- Reactive WebFlux support
- Encrypted cursors for security
- Error handling
- Testing strategies

## Quick Reference

### Basic Offset Pagination

Use Spring's `Pageable` for simple offset pagination:

```java
@GetMapping("/orders")
public ResponseEntity<Page<OrderResponse>> getOrders(
        @PageableDefault(size = 20, sort = "createdDate", direction = DESC) 
        Pageable pageable) {
    
    Page<Order> orders = orderRepository.findAll(pageable);
    Page<OrderResponse> response = orders.map(mapper::toResponse);
    return ResponseEntity.ok(response);
}
```

**Request:**
```http
GET /orders?page=0&size=20&sort=createdDate,desc
```

**Response:**
```json
{
  "content": [
    { "id": "order-1", "status": "shipped" },
    { "id": "order-2", "status": "pending" }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20
  },
  "totalElements": 156,
  "totalPages": 8,
  "first": true,
  "last": false
}
```

### Cursor Pagination

Use cursors for large or real-time datasets:

```java
@GetMapping("/orders")
public ResponseEntity<CursorPageResponse<OrderResponse>> getOrders(
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "20") int size) {
    
    CursorPageResponse<Order> result = paginationService.getOrders(cursor, size);
    return ResponseEntity.ok(result);
}
```

**Request:**
```http
GET /orders?cursor=eyJpZCI6Im9yZGVyLTIwIiwiY3JlYXRlZERhdGUiOiIyMDI0LTA3LTE1In0&size=20
```

**Response:**
```json
{
  "data": [
    { "id": "order-21", "status": "shipped" },
    { "id": "order-22", "status": "pending" }
  ],
  "meta": {
    "cursor": {
      "current": "eyJpZCI6...",
      "next": "eyJpZCI6...",
      "previous": "eyJpZCI6...",
      "hasNext": true,
      "hasPrevious": true
    }
  }
}
```

## When to Use Each Approach

| Scenario | Recommended | Why |
|----------|-------------|-----|
| Small datasets (<10K rows) | Offset | Simpler, supports jumping to any page |
| Large datasets | Cursor | Consistent performance, no skipping rows |
| Real-time data | Cursor | New records don't shift pages |
| Admin dashboards | Offset | Users expect page numbers |
| Mobile infinite scroll | Cursor | Natural "load more" pattern |
| Reporting exports | Cursor | Memory-efficient streaming |

## Common Patterns

### Limit Page Size

Always cap the maximum page size:

```java
@GetMapping("/orders")
public ResponseEntity<Page<OrderResponse>> getOrders(
        @RequestParam(defaultValue = "20") @Max(100) int size,
        @RequestParam(defaultValue = "0") @Min(0) int page) {
    
    Pageable pageable = PageRequest.of(page, size);
    return ResponseEntity.ok(orderService.findAll(pageable));
}
```

### Default Sort Order

Provide sensible defaults for sorting:

```java
@PageableDefault(
    size = 20, 
    sort = "createdDate", 
    direction = Sort.Direction.DESC
)
Pageable pageable
```

### Total Count Optimization

Skip total count for large tables when not needed:

```java
// Use Slice instead of Page to skip COUNT query
Slice<Order> orders = orderRepository.findByStatus(status, pageable);
```

## Related Documentation

### Spring Design
- [Controllers](../controllers/) - Request handling patterns
- [Testing](../testing/) - Testing pagination endpoints

### API Design (Language-Agnostic)
- [Pagination and Filtering](../../api-design/request-response/pagination-and-filtering.md) - HTTP pagination standards
- [Cursor Pagination Reference](../../api-design/request-response/reference/pagination/cursor-pagination.md) - Cursor design concepts
