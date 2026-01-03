# Resource Naming & URL Structure

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Data, Architecture
> 
> **📊 Complexity:** 11.2 grade level • 1.4% technical density • fairly difficult

## Overview

Good URLs make APIs easy to understand and use. This guide shows how to design clear, consistent API endpoints. You'll learn standards for naming resources and organizing URLs.

## Quick Examples

Here's what good API design looks like:

```
GET /customers                      - List all customers
GET /customers/12345                - Get one customer
POST /customers                     - Create a customer
PATCH /customers/12345              - Update a customer
DELETE /customers/12345             - Delete a customer

GET /orders?customerId=12345        - List customer's orders
POST /orders/{orderId}/cancel       - Cancel an order
```

Notice:
- Resources use plural nouns (`/customers`, not `/customer`)
- HTTP verbs describe the action (GET, POST, PATCH, DELETE)
- IDs go in the URL path (`/customers/12345`)
- Filters use query parameters (`?customerId=12345`)

## Core Principles

1. **Resources as Nouns**: APIs represent things, not actions
2. **HTTP Verbs for Operations**: Use HTTP methods for operations
3. **Hierarchical Organization**: Resources reflect domain hierarchies
4. **Consistency**: Apply the same patterns everywhere
5. **Semantic Clarity**: Names and paths should be clear

## URL Design Patterns

### Resource Naming Conventions

| Pattern | Example | Description |
|---------|---------|-------------|
| Use nouns for resources | `/orders`, `/customers` | Resources are things, not actions |
| Use plural for collections | `/orders` | Endpoints returning many items use plural nouns |
| Use consistent plural resources | `/orders/{orderId}` | All endpoints use plural nouns |
| Use kebab-case for multi-word resources | `/shipping-addresses` | Multi-word names use kebab-case |
| Use lowercase letters | `/orders` not `/Orders` | All URL paths use lowercase |
| Use descriptive identifiers | `/orders/12345` not `/orders/id/12345` | Avoid redundant segments |

### HTTP Verbs Usage

| HTTP Verb | Collection (`/orders`) | Specific Item (`/orders/{orderId}`) |
|-----------|------------------------|-----------------------------------|
| GET | Retrieve list of orders | Retrieve specific order |
| POST | Create new order | N/A (use PUT or PATCH for the specific resource) |
| PUT | Bulk update (if applicable) | Replace order completely |
| PATCH | Bulk partial update (if applicable) | Update order partially |
| DELETE | Delete all orders (use with caution) | Delete specific order |

### Important Distinction

Collection endpoints and single resource endpoints serve different purposes:

**Plural Endpoint (`/orders`):**
- Represents a collection of resources
- Returns an array or list
- Used for operations on multiple items

**Specific Resource (`/orders/{orderId}`):**
- Represents one resource instance
- Returns a single object
- Used for operations on one item

This distinction affects what data you get back. It's not just about URL structure.

## Resource Hierarchy

### Parent-Child Relationships and Domain Boundaries

How should you organize related resources? Consider your domain model and business boundaries.

#### Primary Domain Resources

Important domain concepts get top-level endpoints:

```
/employees
/orders
/customers
/products
```

#### Relationships Through Query Parameters

Use query parameters to filter by relationships. This works when you focus on the main resource:

```
/employees?departmentId={departmentId}    // Preferred
/orders?customerId={customerId}           // Better than /customers/{customerId}/orders
```

Query parameters keep the focus on what you're querying. They also respect domain boundaries.

#### When to Use Nested Paths

Nested paths work best for true parent-child relationships. Use them when:
1. The child cannot exist without the parent
2. The child is owned by the parent
3. The child is part of the parent's domain

Examples:
```
/orders/{orderId}/items              // Items belong to orders
/products/{productId}/variants       // Variants belong to products
```

Guidelines:

1. Keep nesting to 2 levels maximum
2. Give aggregate roots their own top-level endpoints
3. Use query parameters for filters
4. Think about bounded contexts when designing paths

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

Default values:
- `page`: 0 (first page)
- `size`: 20 items

Apply these defaults when clients don't provide pagination. Use these values consistently across all services.

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

For complex filtering:
1. Use multiple specific parameters for common filters
2. Use a query language parameter for advanced cases

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
| Inconsistent pluralization | Mix of `/order` and `/customers/{id}` | Use plural consistently |
| Deep nesting | `/customers/{id}/accounts/{id}/transactions/{id}/details` | Limit nesting depth to 2 levels |
| Non-resource endpoints | `/generateReport` | `POST /reports` with appropriate request body |

## Special Considerations for Streaming APIs

Design streaming endpoints with these considerations:

1. **Collection endpoints**: Provide both complete and streaming variants
2. **Streaming protocols**: Use the right content types and HTTP methods
3. **Backpressure handling**: Document how clients should handle flow control

Example URL patterns:
```
GET /orders         - Returns complete collection (JSON array)
GET /orders/stream  - Returns streaming collection (NDJSON or SSE)
```

### Real-time and Streaming Patterns

1. **Server-Sent Events**: For real-time updates, use consistent URL patterns
   ```
   GET /order/{orderId}/events  - SSE stream for order updates
   ```

2. **WebSocket Endpoints**: For bi-directional communication
   ```
   WS /order/{orderId}/ws  - WebSocket connection for order updates
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

These examples show the principles from this guide in action.

## Implementation Notes

When implementing these URL structures:

- **REST framework compatibility**: These patterns work with any framework
- **HTTP method semantics**: Follow standard HTTP method definitions
- **Error handling**: Use HTTP status codes and RFC 7807 format

These principles apply to any REST API. They follow HTTP standards and REST architecture.