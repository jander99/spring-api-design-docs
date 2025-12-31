# Resource Naming & URL Structure

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Architecture, Data
> 
> **📊 Complexity:** 15.6 grade level • 1.6% technical density • difficult

## Overview

Consistent resource naming and URL structure are fundamental to creating intuitive, maintainable APIs across our microservices ecosystem. This document establishes standards for designing RESTful and Reactive API endpoints with predictable patterns that enhance discoverability and usability.

## Core Principles

1. **Resources as Nouns**: APIs represent resources (entities or concepts), not actions or operations
2. **HTTP Verbs for Operations**: Use standard HTTP methods to perform operations on resources
3. **Hierarchical Organization**: Resources should reflect natural domain hierarchies
4. **Consistency**: Apply the same patterns across all microservices
5. **Semantic Clarity**: Resource names and paths should be self-explanatory

## URL Design Patterns

### Resource Naming Conventions

| Pattern | Example | Description |
|---------|---------|-------------|
| Use nouns for resources | `/orders`, `/customers` | Resources represent entities, not actions |
| Use plural for collections | `/orders` | Endpoints returning multiple resources use plural nouns |
| Use consistent plural resources | `/orders/{orderId}` | All resource endpoints use plural nouns for consistency |
| Use kebab-case for multi-word resources | `/shipping-addresses` | Multi-word resource names should use kebab-case |
| Use lowercase letters | `/orders` not `/Orders` | All URL paths should use lowercase letters |
| Use descriptive identifiers | `/orders/12345` not `/orders/id/12345` | Avoid redundant path segments |

### HTTP Verbs Usage

| HTTP Verb | Collection (`/orders`) | Specific Item (`/orders/{orderId}`) |
|-----------|------------------------|-----------------------------------|
| GET | Retrieve list of orders | Retrieve specific order |
| POST | Create new order | N/A (use PUT or PATCH for the specific resource) |
| PUT | Bulk update (if applicable) | Replace order completely |
| PATCH | Bulk partial update (if applicable) | Update order partially |
| DELETE | Delete all orders (use with caution) | Delete specific order |

### PATCH Method Formats

Two standard formats exist for PATCH operations:

| Format | Content-Type | Use Case |
|--------|-------------|----------|
| JSON Merge Patch | `application/merge-patch+json` | Simple partial updates |
| JSON Patch | `application/json-patch+json` | Complex operations (add, remove, move, copy) |

**Recommendation:** Use JSON Merge Patch (RFC 7396) for simple field updates. Use JSON Patch (RFC 6902) when you need operations like array manipulation, conditional updates, or moving values between fields.

**JSON Merge Patch Example:**
```http
PATCH /orders/123 HTTP/1.1
Content-Type: application/merge-patch+json

{"status": "SHIPPED", "trackingNumber": "ABC123"}
```

**JSON Patch Example:**
```http
PATCH /orders/123 HTTP/1.1
Content-Type: application/json-patch+json

[
  {"op": "replace", "path": "/status", "value": "SHIPPED"},
  {"op": "add", "path": "/trackingNumber", "value": "ABC123"}
]
```

### Important Distinction

A key distinction in our API convention is the semantic difference between collection and specific resource endpoints:

- **Plural Endpoint (`/orders`)**: 
  - Represents a collection resource
  - Returns a collection of resources (array/list)
  - Used for collection operations

- **Specific Resource (`/orders/{orderId}`)**: 
  - Represents a specific resource instance
  - Returns a single resource object
  - Used for instance operations

This is not merely a "folder" structure - the distinction carries semantic meaning about the return type and operation scope.

## Resource Hierarchy

### Parent-Child Relationships and Domain Boundaries

When expressing relationships between resources, consider the domain boundaries and aggregate roots according to Domain Driven Design principles:

#### Primary Domain Resources

Resources that represent aggregate roots or important domain concepts should have direct top-level endpoints:

```
/employees
/orders
/customers
/products
```

#### Relationships Through Query Parameters

For filtering resources based on relationships, prefer query parameters when the requested resource is the primary focus:

```
/employees?departmentId={departmentId}    // Preferred over /departments/{departmentId}/employees
/orders?customerId={customerId}           // Preferred over /customers/{customerId}/orders when the focus is on orders
```

This approach respects domain boundaries and keeps the focus on the primary resource being queried.

#### When to Use Nested Paths

Use nested paths only when:
1. The relationship represents a true parent-child ownership
2. The child cannot exist independently of the parent
3. The child is an integral part of the parent's domain

Example of appropriate nesting:
```
/orders/{orderId}/items              // Order items typically don't exist outside an order
/products/{productId}/variants       // Product variants are part of a product
```

Guidelines:

1. Limit hierarchy depth to 2 levels to maintain readability
2. Always provide top-level endpoints for domain aggregate roots
3. Use query parameters for filtering by related entities
4. Consider the bounded context when designing resource paths

### Alternative Access Paths

Resources often need to be accessed through multiple paths. Both examples below are valid and may coexist:

```
/customers/{customerId}/orders/{orderId}
/orders/{orderId}
```

The first emphasizes the relationship to a customer, while the second provides direct access.

## Query Parameter Standards

### Common Parameters

| Parameter | Purpose | Format | Example |
|-----------|---------|--------|---------|
| `page` | Page number for pagination | Integer ≥ 0 | `?page=0` |
| `size` | Page size for pagination | Integer 1-100 | `?size=20` |
| `sort` | Sort specification | `{field},{direction}` | `?sort=createdDate,desc` |
| `filter` | Filter criteria | Varies by resource | `?status=ACTIVE` |

### Pagination Parameters

All collection endpoints should support pagination with these parameters:

```
/orders?page=0&size=20
```

Default values if not specified:
- `page`: 0 (first page)
- `size`: 20 items

These default values should be applied automatically if the client does not provide pagination parameters. All APIs must implement these defaults consistently across microservices.

### Sorting Parameters

Support multiple sort criteria with the `sort` parameter:

```
/orders?sort=createdDate,desc&sort=total,asc
```

### Filtering Standards

Resource-specific filters should use intuitive parameter names:

```
/orders?status=PROCESSING&createdAfter=2024-01-01
```

For more complex filtering, consider these approaches:
1. Multiple specific parameters (preferred for common filters)
2. A structured query language parameter for advanced cases

## Special Endpoints

### Bulk Operations

For operations affecting multiple resources:

```
POST /orders/bulk-create
POST /orders/bulk-update
POST /orders/bulk-delete
```

### Actions and Operations

For operations that don't fit the standard CRUD model:

```
POST /orders/{orderId}/cancel
POST /orders/{orderId}/refund
POST /orders/search
```

Use the verb after the resource, prefixed with an appropriate HTTP method.

## Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Verbs in URLs | `/getOrders` | `GET /orders` |
| Operation names in URLs | `/orders/findByCustomer` | `GET /orders?customerId=123` |
| Inconsistent pluralization | Mix of `/order` and `/customers/{id}` | Use plural form consistently: `/orders` and `/customers/{id}` |
| Deep nesting | `/customers/{id}/accounts/{id}/transactions/{id}/details` | Limit nesting depth, provide alternative access paths |
| Non-resource endpoints | `/generateReport` | `POST /reports` with appropriate request body |

## Special Considerations for Streaming APIs

When designing endpoints that support streaming or real-time data:

1. **Collection endpoints**: Consider providing both complete and streaming variants
2. **Streaming protocols**: Use appropriate content types and HTTP methods
3. **Backpressure handling**: Document expected client behavior for flow control

Example URL patterns:
```
GET /orders         - Returns complete collection (JSON array)
GET /orders/stream  - Returns streaming collection (NDJSON or SSE)
```

### Real-time and Streaming Patterns

1. **Server-Sent Events**: For real-time updates, use consistent URL patterns
   ```
   GET /orders/{orderId}/events  - SSE stream for order updates
   ```

2. **WebSocket Endpoints**: For bi-directional communication
   ```
   WS /orders/{orderId}/ws  - WebSocket connection for order updates
   ```

3. **HTTP Streaming**: Use appropriate content types
   ```http
   GET /orders/stream HTTP/1.1
   Accept: application/x-ndjson
   ```

## Examples

### Well-Designed Endpoints

```
GET /customers                      - List all customers (paginated)
GET /customers/{customerId}         - Get a specific customer
POST /customers                     - Create a new customer
PUT /customers/{customerId}         - Replace a customer
PATCH /customers/{customerId}       - Update a customer partially
DELETE /customers/{customerId}      - Delete a customer

GET /customers/{customerId}/orders  - List orders for a customer
POST /customers/{customerId}/orders - Create an order for a customer

GET /orders                         - List all orders (paginated)
GET /orders/{orderId}               - Get a specific order
POST /orders/{orderId}/cancel       - Cancel an order (action)
```

These examples demonstrate the consistent application of the principles outlined in this guide.

## Implementation Notes

When implementing these URL structures:

- **REST framework compatibility**: These patterns work with any REST framework
- **HTTP method semantics**: Follow standard HTTP method definitions regardless of implementation technology
- **Error handling**: Use appropriate HTTP status codes and RFC 9457 Problem Details format

The principles outlined here are based on REST architectural constraints and HTTP standards, making them universally applicable.

## Common Mistakes

### ❌ Verbs in Resource URLs

**Problem:**
```http
GET /getOrders HTTP/1.1
GET /fetchCustomerById/123 HTTP/1.1
POST /createNewOrder HTTP/1.1
```

**Why it's wrong:** URLs should identify resources, not actions. HTTP methods already express the action (GET retrieves, POST creates). Adding verbs creates redundancy and inconsistency.

**✅ Correct approach:**
```http
GET /orders HTTP/1.1
GET /customers/123 HTTP/1.1
POST /orders HTTP/1.1
```

---

### ❌ Inconsistent Pluralization

**Problem:**
```http
GET /order/123 HTTP/1.1
GET /customers HTTP/1.1
GET /product/456/review HTTP/1.1
```

**Why it's wrong:** Mixing singular and plural forms confuses API consumers. They must memorize which resources use which form instead of following a predictable pattern.

**✅ Correct approach:**
```http
GET /orders/123 HTTP/1.1
GET /customers HTTP/1.1
GET /products/456/reviews HTTP/1.1
```

---

### ❌ Deep URL Nesting

**Problem:**
```http
GET /companies/123/departments/456/employees/789/timesheets/2024/entries/42 HTTP/1.1
```

**Why it's wrong:** Deep nesting creates long, fragile URLs. Changes to parent resources break child paths. It also implies tight coupling that may not exist in the domain.

**✅ Correct approach:**
```http
GET /timesheet-entries/42 HTTP/1.1
GET /timesheet-entries?employeeId=789&year=2024 HTTP/1.1
```

---

### ❌ Query Parameters for Resource Identification

**Problem:**
```http
GET /orders?orderId=123 HTTP/1.1
DELETE /customers?id=456 HTTP/1.1
```

**Why it's wrong:** Resource identifiers belong in the path, not query parameters. Query parameters are for filtering collections, not identifying specific resources.

**✅ Correct approach:**
```http
GET /orders/123 HTTP/1.1
DELETE /customers/456 HTTP/1.1
```

---

### ❌ File Extensions in URLs

**Problem:**
```http
GET /orders/123.json HTTP/1.1
GET /customers.xml HTTP/1.1
```

**Why it's wrong:** Content format should be negotiated via headers, not embedded in URLs. This creates duplicate URLs for the same resource and complicates caching.

**✅ Correct approach:**
```http
GET /orders/123 HTTP/1.1
Accept: application/json

GET /customers HTTP/1.1
Accept: application/xml
```

---

### ❌ Inconsistent Case Styles

**Problem:**
```http
GET /OrderItems HTTP/1.1
GET /shipping_addresses HTTP/1.1
GET /CustomerOrders HTTP/1.1
```

**Why it's wrong:** Mixed case styles (PascalCase, snake_case, camelCase) force developers to check documentation for every endpoint. URLs should use lowercase with kebab-case for multi-word resources.

**✅ Correct approach:**
```http
GET /order-items HTTP/1.1
GET /shipping-addresses HTTP/1.1
GET /customer-orders HTTP/1.1
```

## Related Documentation

### Core Standards
- [Data Modeling Standards](data-modeling-standards.md) - Entity design and field naming conventions
- [API Version Strategy](api-version-strategy.md) - URL versioning and compatibility
- [API Lifecycle Management](api-lifecycle-management.md) - Managing API evolution

### Request/Response Patterns
- [Content Types and Structure](../request-response/content-types-and-structure.md) - Payload formats and structure
- [Pagination and Filtering](../request-response/pagination-and-filtering.md) - Collection query patterns
- [Error Response Standards](../request-response/error-response-standards.md) - RFC 9457 error handling
- [Streaming APIs](../request-response/streaming-apis.md) - Real-time and streaming endpoints

### Advanced Topics
- [Async and Batch Patterns](../advanced-patterns/async-batch-patterns.md) - Bulk operations and long-running tasks
- [Performance Standards](../advanced-patterns/performance-standards.md) - Caching and optimization

### Quick Reference
- [HTTP Methods Quick Reference](../quick-reference/README.md) - Method selection guide