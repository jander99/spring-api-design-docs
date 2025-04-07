# Resource Naming & URL Structure

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
| Use singular for specific resources | `/order/{orderId}` | Endpoints returning a single resource use singular nouns |
| Use kebab-case for multi-word resources | `/shipping-addresses` | Multi-word resource names should use kebab-case |
| Use lowercase letters | `/orders` not `/Orders` | All URL paths should use lowercase letters |

### HTTP Verbs Usage

| HTTP Verb | Collection (`/orders`) | Specific Item (`/order/{orderId}`) |
|-----------|------------------------|-----------------------------------|
| GET | Retrieve list of orders | Retrieve specific order |
| POST | Create new order | N/A (use PUT or PATCH for the specific resource) |
| PUT | Bulk update (if applicable) | Replace order completely |
| PATCH | Bulk partial update (if applicable) | Update order partially |
| DELETE | Delete all orders (use with caution) | Delete specific order |

### Important Distinction

A key distinction in our API convention is the semantic difference between plural and singular resource endpoints:

- **Plural Endpoint (`/orders`)**: 
  - Represents a collection resource
  - Returns `Mono<List<Order>>` or `Flux<Order>` 
  - Used for collection operations

- **Singular Endpoint (`/order/{orderId}`)**: 
  - Represents a specific resource instance
  - Returns `Mono<Order>` for a single resource
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
/orders?status=PROCESSING&createdAfter=2023-01-01
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
| Inconsistent pluralization | Mix of `/order` and `/customers` | Consistent use of plurals for collections |
| Deep nesting | `/customers/{id}/accounts/{id}/transactions/{id}/details` | Limit nesting depth, provide alternative access paths |
| Non-resource endpoints | `/generateReport` | `POST /reports` with appropriate request body |

## Special Considerations for Reactive APIs

When designing endpoints that will return reactive types:

1. Collection endpoints should consistently return `Flux<T>` or `Mono<List<T>>` depending on streaming requirements
2. Consider providing both streaming and batch endpoints for large collections
3. Document expected behavior for backpressure handling

Example designations:
```
GET /orders         - Returns Mono<List<Order>> (complete collection)
GET /orders/stream  - Returns Flux<Order> (streaming collection)
```

## Examples

### Well-Designed Endpoints

```
GET /customers                     - List all customers (paginated)
GET /customers/{customerId}        - Get a specific customer
POST /customers                    - Create a new customer
PUT /customers/{customerId}        - Replace a customer
PATCH /customers/{customerId}      - Update a customer partially
DELETE /customers/{customerId}     - Delete a customer

GET /customers/{customerId}/orders - List orders for a customer
POST /customers/{customerId}/orders - Create an order for a customer

GET /orders                        - List all orders (paginated)
GET /orders/{orderId}              - Get a specific order
POST /orders/{orderId}/cancel      - Cancel an order (action)
```

These examples demonstrate the consistent application of the principles outlined in this guide.