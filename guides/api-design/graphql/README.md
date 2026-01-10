# GraphQL API Design Guide

GraphQL is a query language for APIs that gives clients precise control over data fetching. This guide covers when to use GraphQL, how to design schemas, and production patterns from companies like Netflix, Shopify, and GitHub.

## Why GraphQL?

GraphQL solves three key problems with traditional REST APIs:

1. **Over-fetching**: REST endpoints return all fields. Clients waste bandwidth on unused data.
2. **Under-fetching**: Getting related data requires multiple requests. Mobile apps make 5-10 calls for one screen.
3. **Rigid contracts**: Adding fields means new API versions. Clients can't iterate without backend changes.

## Quick Start

**Choose GraphQL when:**
- Mobile apps need bandwidth efficiency
- Complex data relationships span multiple resources
- Multiple client types need different data shapes
- Frontend teams want query autonomy

**Choose REST when:**
- Simple CRUD operations on single resources
- HTTP caching is critical for performance
- Public API needs broad tool compatibility
- Microservice boundaries align with resources

## Industry Adoption (2025)

| Technology | Adoption Rate | Use Case |
|------------|---------------|----------|
| REST | 83-93% | Public APIs, simple CRUD |
| GraphQL | 33-45% | Complex queries, mobile apps |
| Both (Hybrid) | 45%+ | REST for stable resources, GraphQL for aggregations |

**Sources**: Postman State of API 2025, industry surveys

## When to Use GraphQL vs REST

### GraphQL Excels At

**Complex Nested Data**

Single query replaces multiple REST calls:

```graphql
query GetUserDashboard {
  user(id: "123") {
    name
    email
    orders(first: 10) {
      id
      total
      items {
        product { name price }
      }
    }
    recommendations {
      product { name rating }
    }
  }
}
```

Equivalent REST requires 3-4 separate HTTP requests.

**Mobile Bandwidth Constraints**

2025 benchmarks show GraphQL reduces bandwidth by 67% for typical mobile queries. Clients request only needed fields, eliminating waste.

**Multiple Client Types**

One schema serves web, mobile, and dashboards. Each client queries different fields without backend changes.

### REST Excels At

**HTTP Caching**

REST leverages built-in caching with `Cache-Control` and `ETag` headers. CDNs and browsers cache automatically. GraphQL requires application-level caching.

**Simple CRUD Operations**

For straightforward create, read, update, delete, REST is simpler:
- Clear resource mapping: `/users/{id}`
- Standard HTTP verbs
- 78% cache hit rates in production

**Public APIs**

93% of public APIs use REST. OpenAPI specification provides:
- Auto-generated documentation
- Client SDKs in 40+ languages
- Mature tooling ecosystem

## Documentation Structure

This guide is organized into:

### Foundations
- **[Schema Design](foundations/schema-design.md)**: Types, naming conventions, interfaces, unions
- **[Error Handling](foundations/error-handling.md)**: Errors as data vs extensions

### Performance
- **[N+1 Problem](performance/n-plus-one-problem.md)**: DataLoader pattern for batching

### Security
- **[Query Security](security/query-security.md)**: Depth limiting, complexity analysis, authorization

### Advanced Patterns
- **[Pagination](advanced-patterns/pagination.md)**: Relay Connection specification
- **[Federation](advanced-patterns/federation.md)**: Microservices with GraphQL
- **[Schema Evolution](advanced-patterns/schema-evolution.md)**: Versioning alternatives

### Documentation
- **[Tooling Ecosystem](documentation/tooling-ecosystem.md)**: GraphiQL, Apollo Studio, testing tools

### Examples
- **[Schemas](examples/schemas/)**: Complete GraphQL schema examples
- **[Queries](examples/queries/)**: Common query patterns

## Quick Decision Framework

Use this checklist to choose between GraphQL and REST:

| Criterion | Choose REST | Choose GraphQL |
|-----------|-------------|----------------|
| **API consumers** | Public, unknown clients | Single frontend team |
| **Data relationships** | 1-2 levels deep | 3+ levels of nesting |
| **Caching priority** | Critical (CDN, HTTP) | App-level acceptable |
| **Team expertise** | HTTP fundamentals | Full-stack, modern patterns |
| **Performance needs** | High-throughput CRUD | Bandwidth-sensitive mobile |
| **Real-time** | SSE over HTTP | Native subscriptions |
| **Evolution** | Breaking changes common | Additive, gradual |

## Hybrid Approaches

45% of enterprises use both REST and GraphQL:

- **REST for stable resources**: User authentication, simple CRUD
- **GraphQL for complex queries**: Dashboards, mobile aggregations
- **API Gateway**: Route by endpoint type, compose REST into GraphQL

## Getting Started

1. **Read the decision framework** (this page) to validate GraphQL fits your use case
2. **Design your schema** using [Schema Design](foundations/schema-design.md) patterns
3. **Implement security** with [Query Security](security/query-security.md) limits
4. **Optimize performance** using [DataLoader](performance/n-plus-one-problem.md) for N+1 prevention
5. **Choose tooling** from [Tooling Ecosystem](documentation/tooling-ecosystem.md)

## Learning Path

**Beginner**: Start with schema design, basic queries, and error handling.

**Intermediate**: Add pagination, implement DataLoader, set security limits.

**Advanced**: Federation for microservices, schema evolution strategies, subscriptions.

## Real-World Examples

**Netflix**: Uses federated GraphQL to unify 15+ years of microservices. Domain teams own subgraphs while clients query unified schema.

**Shopify**: Migrated from REST to GraphQL for Storefront API. Handles 1+ million queries/second with calculated query cost limits.

**GitHub**: Maintains both REST (v3) and GraphQL (v4) APIs. GraphQL provides flexible queries while REST handles webhooks.

## Key Takeaways

1. **GraphQL is not a REST replacement**: It solves different problems
2. **Caching differs fundamentally**: HTTP-level (REST) vs app-level (GraphQL)
3. **Learning curve exists**: Resolvers, DataLoader, schema design require investment
4. **Tooling is maturing**: Apollo, Relay, Hive provide production-ready solutions
5. **Hybrid is common**: Use both strategically based on use case fit

## Additional Resources

- [GraphQL Specification](https://spec.graphql.org/)
- [Apollo GraphQL Documentation](https://www.apollographql.com/docs/)
- [Shopify GraphQL Design Tutorial](https://github.com/Shopify/graphql-design-tutorial)
- [Netflix DGS Framework](https://netflix.github.io/dgs/)

## Contributing

This guide follows the [API Design Guide standards](../../README.md). See [CLAUDE.md](../../../CLAUDE.md) for contribution guidelines.

**Readability Target**: Grade 12-14 for technical accuracy while remaining accessible.
