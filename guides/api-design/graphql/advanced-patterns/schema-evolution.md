# Schema Evolution

GraphQL favors continuous evolution over versioning. Add new capabilities without breaking existing clients.

## Evolution Philosophy

**GraphQL approach**: Single versionless endpoint that evolves gradually

**REST approach**: Explicit versions (/v1, /v2) with breaking changes

## Safe Changes

### Adding Nullable Fields

```graphql
# Version 1
type User {
  id: ID!
  email: String!
}

# Version 2 - safe
type User {
  id: ID!
  email: String!
  phoneNumber: String  # New nullable field
}
```

### Adding Optional Arguments

```graphql
# Safe - existing queries work
type Query {
  users(limit: Int, sort: SortOrder): [User!]!
}
```

## Deprecation

Mark fields for removal:

```graphql
type User {
  name: String! @deprecated(reason: "Use fullName instead")
  fullName: String!
}
```

**Timeline**:
1. Add replacement field
2. Mark old field deprecated
3. Monitor usage for 6-12 months
4. Remove when usage < 1%

## Breaking Changes

**Removing field**: Breaks queries requesting it
**Required argument**: Breaks calls without it
**Type change**: May break client assumptions

**Process**:
1. Introduce replacement
2. Deprecate old field
3. Migrate clients
4. Remove after grace period

## Key Takeaways

1. **Evolution > Versioning**: GraphQL designed for continuous change
2. **Additive changes safe**: New fields don't affect existing queries
3. **Deprecate before removing**: Give clients time to migrate
4. **Monitor usage**: Data-driven deprecation decisions

## References

- [GraphQL Schema Design](https://graphql.org/learn/schema-design/)
- [Apollo Schema Evolution](https://www.apollographql.com/docs/apollo-server/schema/schema-design/)
