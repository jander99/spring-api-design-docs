---
name: rest-api-design
description: Design RESTful APIs with proper resource naming, URL structure, HTTP methods, and content negotiation. Use when creating new API endpoints, designing resource hierarchies, choosing HTTP verbs, or structuring request/response payloads. Covers Richardson Maturity Model levels for REST compliance.
---

# REST API Design

<!--
SOURCE DOCUMENTS:
- api-design/foundations/Resource Naming and URL Structure.md
- api-design/foundations/API Version Strategy.md (partial - versioning has own skill)
- api-design/request-response/Content-Types-and-Structure.md
- api-design/maturity-model/assessment-guide.md
- api-design/maturity-model/level-0/ through level-3/
- spring-design/controllers/Controller-Fundamentals.md
- spring-design/controllers/Request-Response-Mapping.md

REFERENCE FILES TO CREATE:
- references/resource-naming.md (from Resource Naming and URL Structure.md)
- references/http-methods.md (HTTP verb semantics, idempotency)
- references/richardson-maturity.md (from maturity-model/)
- references/java-spring.md (from Controller-Fundamentals.md, Request-Response-Mapping.md)
-->

## When to Use This Skill

Use this skill when you need to:
- Design new REST API endpoints or resources
- Structure URL paths and query parameters
- Choose appropriate HTTP methods for operations
- Define request/response payload structures
- Evaluate or improve REST maturity level

## Core Principles

TODO: Extract and condense from Resource Naming and URL Structure.md

### Resource-Oriented Design
- URLs represent resources (nouns), not actions
- Use plural nouns for collections: `/orders`, `/users`
- Nest resources to show relationships: `/orders/{id}/items`

### HTTP Method Semantics
- GET: Retrieve (safe, idempotent)
- POST: Create (not idempotent)
- PUT: Replace (idempotent)
- PATCH: Partial update (not necessarily idempotent)
- DELETE: Remove (idempotent)

### Content Negotiation
- Use `Accept` header for response format
- Use `Content-Type` header for request format
- Support `application/json` as primary format

## Quick Reference

TODO: Add decision tree for URL structure design

## Loading Additional Context

When you need deeper guidance:

- **Resource naming patterns**: Load `references/resource-naming.md`
- **HTTP method semantics**: Load `references/http-methods.md`
- **REST maturity assessment**: Load `references/richardson-maturity.md`
- **Java/Spring implementation**: Load `references/java-spring.md`

## Examples

TODO: Add minimal illustrative examples

### Resource URL Patterns
```
GET    /orders              # List orders
POST   /orders              # Create order
GET    /orders/{id}         # Get specific order
PUT    /orders/{id}         # Replace order
PATCH  /orders/{id}         # Update order fields
DELETE /orders/{id}         # Delete order
GET    /orders/{id}/items   # List order items
```

## Anti-Patterns

TODO: Extract from source documents

- Using verbs in URLs: `/getOrders`, `/createUser`
- Mixing singular and plural: `/order/{id}/items`
- Deep nesting beyond 2 levels: `/users/{id}/orders/{id}/items/{id}/details`
- Using query parameters for resource identification
