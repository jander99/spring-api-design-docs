# REST vs GraphQL Decision Guide

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 9 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Architecture, Data, Documentation
> 
> **📊 Complexity:** 21.4 grade level • 0.9% technical density • difficult

## Overview

REST and GraphQL are two common ways to design APIs over HTTP.

- **REST** models your API as resources (nouns) addressed by URLs and operated on with standard HTTP methods.
- **GraphQL** models your API as a typed graph. Clients request exactly the fields they need using a query language.

This document helps you choose between them (and understand where gRPC fits), using production-oriented decision criteria, trade-offs, and example request patterns.

## Why This Topic Matters

Choosing the wrong API style creates avoidable costs:

- **Over-engineering**: complex infrastructure for simple needs
- **Under-engineering**: slow client development or excessive network chatter
- **Maintenance burden**: hard-to-evolve contracts and inconsistent patterns
- **Performance and security risk**: poor caching, costly queries, or weak governance

## Quick Definitions

### REST (Resource-Oriented HTTP)

REST commonly means:

- Resources addressed by stable URLs (for example, `/orders/123`)
- Standard HTTP methods and semantics (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- Status codes and headers as first-class API behavior
- Caching, retries, intermediaries, and tooling built around HTTP

### GraphQL (Client-Selected Fields)

GraphQL commonly means:

- One primary HTTP endpoint (often `POST /graphql`)
- A typed schema that describes the graph
- Client-selected fields and nested selections
- Queries for reads, mutations for writes, subscriptions for server-to-client pushes

### Where gRPC Fits

gRPC is typically used for internal service-to-service APIs, especially when low latency, streaming, and strongly typed contracts matter. It is not a direct replacement for public HTTP APIs in browsers, and it requires different tooling and infrastructure than HTTP/JSON.

This guide focuses on REST and GraphQL, but includes gRPC in the decision criteria because teams often compare all three.

---

## 1) Decision Criteria

### Choose REST When

REST is a strong default for many APIs, especially when the HTTP ecosystem is a good fit.

Choose REST when you need:

- **Simple CRUD and straightforward workflows**
- **Well-defined resources** with stable identifiers
- **HTTP-native caching** (CDNs, proxies, browser caches) to matter
- **Clear HTTP semantics** (idempotency, conditional requests, partial updates)
- **Broad client compatibility** (any HTTP client, easy debugging)
- **Mature standards and tooling** (OpenAPI ecosystems, API gateways, off-the-shelf middleware)
- **Operational simplicity** with predictable request shapes

### Choose GraphQL When

GraphQL can reduce client friction and network chatter when clients need many different “views” of the same underlying data.

Choose GraphQL when you need:

- **Complex data relationships** and nested graphs (for example, “order → line items → product → reviews”)
- **Multiple clients with different data shapes** (mobile, web, partner dashboards)
- **Avoiding over-fetching and under-fetching** to be a major problem
- **Rapid client iteration** where field-by-field changes are frequent
- **Single-request composition** for a “page” or “screen” worth of data
- **Client-driven selection** of fields (within server-controlled limits)
- **Subscriptions / real-time updates** as a first-class requirement

### Choose gRPC When

Choose gRPC primarily for internal APIs when you need:

- **Service-to-service communication** under your operational control
- **High performance and low latency**
- **Bi-directional streaming** and flow control
- **Strong typing and code generation** across multiple languages
- **Explicit contracts** that are not centered on HTTP semantics

---

## 2) Side-by-Side Trade-Offs

### REST: Strengths

- **Fits the HTTP model**: methods, status codes, and headers carry meaning
- **HTTP caching works well** with URL-addressed resources and validators
- **Tooling and observability** are mature across the ecosystem
- **Intermediaries are effective**: CDNs, proxies, gateways, service meshes
- **Failure modes are familiar**: timeouts, retries, rate limiting, partial outages

### REST: Common Costs

- **Over-fetching**: endpoints return more data than a client needs
- **Under-fetching and extra round trips**: clients call multiple endpoints to build a view
- **Representation drift**: different endpoints return inconsistent shapes for the same resource
- **Versioning pressure** when clients require different representations over time
- **Relationship navigation complexity** when the domain graph is deep

### GraphQL: Strengths

- **Clients request exactly what they need** (field selection)
- **Schema is a strong contract** that supports client tooling and validation
- **Single endpoint for most operations** simplifies some network layers
- **Excellent for composed views** where a screen needs data from many sources
- **Introspection and strong typing** enable exploration and generation

### GraphQL: Common Costs

- **Caching is harder** because many requests share the same URL and differ by document + variables
- **Query complexity and abuse risk**: expensive nested queries can overload backends
- **Authorization often becomes field-level** which is harder to get right
- **Operational complexity**: cost limits, depth limits, persisted operations, schema governance
- **N+1-style backend load** can still happen at resolver boundaries

---

## 3) Concrete Examples (REST vs GraphQL)

The examples below show the most common differences: resource URLs and HTTP semantics for REST, vs. client-selected fields for GraphQL.

### REST Example: Resource-Oriented Requests

Retrieve an order:

```http
GET /orders/12345 HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "W/\"order-12345-v7\""
Cache-Control: private, max-age=60

{
  "orderId": "12345",
  "status": "SHIPPED",
  "customerId": "customer-456",
  "total": {
    "amount": 99.99,
    "currency": "USD"
  }
}
```

Update part of an order:

```http
PATCH /orders/12345 HTTP/1.1
Host: api.example.com
Content-Type: application/json
If-Match: "W/\"order-12345-v7\""

{
  "status": "CANCELLED"
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "W/\"order-12345-v8\""

{
  "orderId": "12345",
  "status": "CANCELLED"
}
```

### GraphQL Example: Client-Selected Fields

Request nested data in one call:

```http
POST /graphql HTTP/1.1
Host: api.example.com
Content-Type: application/json
Accept: application/json

{
  "query": "query OrderPage($id: ID!) { order(id: $id) { id status total { amount currency } customer { id name } items { quantity product { id name } } } }",
  "variables": { "id": "12345" }
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "order": {
      "id": "12345",
      "status": "SHIPPED",
      "total": { "amount": 99.99, "currency": "USD" },
      "customer": { "id": "customer-456", "name": "A. Customer" },
      "items": [
        {
          "quantity": 2,
          "product": { "id": "prod-789", "name": "Widget" }
        }
      ]
    }
  }
}
```

A mutation for a state change:

```graphql
mutation CancelOrder($id: ID!, $reason: String) {
  cancelOrder(id: $id, reason: $reason) {
    order {
      id
      status
    }
    warnings
  }
}
```

A typical HTTP request body for that mutation:

```json
{
  "query": "mutation CancelOrder($id: ID!, $reason: String) { cancelOrder(id: $id, reason: $reason) { order { id status } warnings } }",
  "variables": {
    "id": "12345",
    "reason": "Customer requested cancellation"
  }
}
```

### What the Examples Show

- REST makes caching and conditional requests straightforward because resources have stable URLs.
- GraphQL can reduce client round trips for composed views, but requires server-side controls to prevent expensive queries.

---

## 4) Performance Comparison

### REST Performance Characteristics

REST performance often benefits from the HTTP ecosystem:

- **Cache keys are natural** (resource URLs + headers)
- **Conditional requests** using `ETag` / `If-None-Match` reduce payload
- **CDN-friendly** for public and semi-public resources
- **Predictable shape per endpoint** makes capacity planning easier

Common REST performance risks:

- Many requests per screen (chatty clients)
- Endpoints that become “mega-responses” to avoid round trips
- N+1-style backend calls when the server expands relationships naively

### GraphQL Performance Characteristics

GraphQL performance depends heavily on your server’s governance:

- **Response size can be smaller** when clients request fewer fields
- **One request can replace many** when composing a view
- **The server can optimize** by batching and caching behind resolvers

Common GraphQL performance risks:

- **Expensive queries** (deep nesting, large lists, broad selections)
- **Hot paths hidden inside resolvers**, making performance less predictable
- **Caching requires strategy** (see below)

#### GraphQL Caching Strategies (High-Level)

GraphQL caching is possible, but it tends to be less automatic than REST:

- **Client normalized caches** can reduce repeat fetches within an app
- **Persisted operations** (pre-registered documents) make requests more cacheable and governable
- **GET for queries** can help with some caches, but URL size limits often require persisted operations

---

## 5) Security Comparison

### REST Security Characteristics

REST aligns with common HTTP security practices:

- **Per-endpoint authorization** maps to resource paths and methods
- **Rate limiting** can be applied per route or per resource type
- **Input validation** is localized to specific endpoints
- **Logging and auditing** are straightforward per request

Common REST security risks:

- Overly broad endpoints that expose too much data
- Missing authorization checks on resource IDs
- Inconsistent validation across endpoints

### GraphQL Security Characteristics

GraphQL security has all the normal API concerns plus GraphQL-specific ones:

- **Query complexity attacks**: small requests that trigger expensive work
- **Depth and breadth**: nested selections that amplify backend load
- **Field-level authorization**: rules depend on which fields are selected
- **Introspection exposure**: schema discovery can reveal capabilities

Typical GraphQL production controls:

- **Depth limits**: cap nesting levels
- **Complexity / cost limits**: cap estimated work per operation
- **Pagination requirements**: enforce limits on list fields
- **Persisted operations**: only allow known documents (when appropriate)

---

## 6) Versioning and Evolution

### REST Versioning (Common Patterns)

REST APIs often evolve using explicit version boundaries:

- Versioned paths (for example, `/v1/orders/...`)
- Breaking changes released under a new major version
- Parallel support and deprecation periods

REST’s challenge is that representation changes may require versioning even when only some clients need the new shape.

### GraphQL Schema Evolution

GraphQL commonly evolves by changing the schema over time:

- Add fields without breaking existing clients (clients only request what they know)
- Deprecate fields and types gradually
- Introduce new types for new capabilities

GraphQL’s challenge is governance: schema sprawl and inconsistent deprecation policies can still create long-term maintenance burden.

---

## 7) Developer Experience and Tooling

### REST Developer Experience

Typical strengths:

- Many tools understand HTTP + OpenAPI patterns
- Easy to test and debug using basic HTTP clients
- Clear mapping from URLs to capabilities

Typical friction:

- Clients often need custom “view endpoints” to avoid over-fetching
- Multiple endpoints can make client integration slower for complex screens

### GraphQL Developer Experience

Typical strengths:

- Schema-first workflows and strong typing
- Exploratory queries in development tooling
- Field selection reduces the need for per-client endpoints

Typical friction:

- Debugging often requires understanding resolvers and query planning
- Production governance (limits, caching, persisted operations) adds work

---

## 8) Hybrid Approaches

Many production systems combine styles rather than choosing exactly one.

### REST + GraphQL Side-by-Side

Common pattern:

- REST for standard resource operations
- GraphQL for complex composed reads
- Shared backend services and data stores

Key requirement: consistency in authorization and audit policies across both.

### BFF (Backend for Frontend)

Common pattern:

- A REST or GraphQL layer tailored to each major client type
- A shared core domain API beneath it

This reduces cross-client coupling while keeping the core stable.

### GraphQL Gateway Over Existing Services

Common pattern:

- GraphQL as a composition layer
- Downstream services can be REST, other internal APIs, or data sources

This can improve client experience, but it adds a critical piece of infrastructure that needs strong reliability and governance.

---

## 9) Migration Patterns

### REST to GraphQL (Incremental)

A common approach is to introduce GraphQL without breaking existing clients:

1. Add a GraphQL endpoint that calls existing REST endpoints or shared services
2. Migrate specific screens or use cases first
3. Keep REST endpoints stable while GraphQL evolves
4. Deprecate REST endpoints later if desired

Key risk: duplicating business logic if REST and GraphQL layers diverge.

### GraphQL to REST (Selective)

Some teams introduce REST endpoints alongside GraphQL for specific needs:

- **Performance-critical paths** where HTTP caching is highly valuable
- **Public endpoints** where broad client compatibility matters
- **Operational simplicity** where predictable request/response shapes matter

---

## 10) Use Case Examples

The patterns below are common in production. They are not rules.

### E-Commerce

- **Product catalog**: often REST when responses are highly cacheable
- **Shopping cart**: often REST for straightforward CRUD
- **Product page composition**: often GraphQL for nested, client-specific views
- **Order history**: REST or GraphQL depending on the client needs and caching strategy

### Social / Community

- **User profiles**: often REST when profile shapes are stable
- **Feed composition**: often GraphQL when the feed aggregates many sources
- **Real-time chat updates**: often GraphQL subscriptions (or other push mechanisms)
- **Media upload**: often REST (file upload fits HTTP well)

### Internal Platform APIs

- **Service-to-service**: often gRPC when latency and typed contracts dominate
- **External/public APIs**: often REST or GraphQL depending on client needs

---

## 11) Decision Matrix

Use this matrix as a quick comparison. It is intentionally simplified.

| Factor | REST | GraphQL | gRPC |
|--------|------|---------|------|
| HTTP caching | ⭐⭐⭐ | ⭐ | ⭐ |
| Flexible client shaping | ⭐ | ⭐⭐⭐ | ⭐ |
| Strong contract typing | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Broad client compatibility | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| Internal service performance | ⭐⭐ | ⭐ | ⭐⭐⭐ |
| Operational governance complexity | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Streaming support | ⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## 12) Example Decision Process

Use these questions to drive a decision in an architecture review.

1) **Is this primarily a public HTTP API?**
- If yes, REST and GraphQL are the most common choices.

2) **Is caching a primary performance lever?**
- If yes, REST usually fits better because HTTP caching is more direct.

3) **Do different clients need very different data shapes?**
- If yes, GraphQL can reduce endpoint sprawl and client round trips.

4) **Can your organization support GraphQL governance?**
- If no, REST may produce better long-term outcomes.
- Governance includes query limits, field authorization consistency, and schema lifecycle policies.

5) **Is this internal service-to-service with strong performance needs?**
- If yes, consider gRPC.

---

## Industry References

- GraphQL Official Documentation: https://graphql.org/
- GraphQL Security: https://graphql.org/learn/security/
- GraphQL Performance: https://graphql.org/learn/performance/

## Related Documentation

### gRPC Alternative

For internal service-to-service communication, consider gRPC as described in this guide's decision criteria. Learn more:

- **[gRPC Overview](../grpc/README.md)** - Complete gRPC documentation for high-performance internal APIs
- **[gRPC vs REST](../grpc/grpc-vs-rest.md)** - Detailed comparison and when to use gRPC instead of REST or GraphQL
