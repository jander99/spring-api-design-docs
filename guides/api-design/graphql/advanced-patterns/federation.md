# GraphQL Federation

Federation enables distributed schema ownership across microservices while presenting a unified graph to clients.

## Core Concepts

### Entity References

```graphql
# Users Service
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

# Orders Service
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}

type Order @key(fields: "id") {
  id: ID!
  total: Float!
  user: User!
}
```

### Federation Directives

- `@key`: Defines entity that can be referenced
- `extend type`: Adds fields to entity from another service (schema keyword, not a directive)
- `@external`: Marks field from owning service
- `@requires`: Dependencies on other service fields
- `@provides`: Optimization hint for field inclusion

## Reference Resolvers

Handle cross-service entity lookups:

```javascript
const resolvers = {
  User: {
    __resolveReference: (reference) => {
      return findUserById(reference.id);
    },
  },
};
```

## Gateway Responsibilities

1. **Query Planning**: Determine which services fulfill each field
2. **Execution**: Execute subgraph queries in parallel
3. **Entity Resolution**: Join results using @key fields
4. **Caching**: Cache entities to reduce cross-service calls

## Key Takeaways

1. **Distributed ownership**: Teams own their domain schemas
2. **Unified graph**: Clients query single endpoint
3. **Entity references**: `@key` enables cross-service relationships
4. **Query planning**: Gateway optimizes execution automatically

## References

- [Apollo Federation](https://www.apollographql.com/docs/federation/)
- [Netflix DGS Framework](https://netflix.github.io/dgs/)
