# GraphQL Pagination

Pagination prevents loading large datasets at once. GraphQL supports offset-based and cursor-based pagination. The Relay Connection specification is the industry standard.

## Relay Connection Specification

The Connection pattern provides consistent pagination across all types:

```graphql
type Query {
  users(first: Int, after: String): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  cursor: String!
  node: User!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

### Forward Pagination

```graphql
query {
  users(first: 10) {
    edges {
      cursor
      node {
        id
        name
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "users": {
      "edges": [
        {
          "cursor": "YXJyYXljb25uZWN0aW9uOjA=",
          "node": { "id": "1", "name": "Alice" }
        }
      ],
      "pageInfo": {
        "hasNextPage": true,
        "endCursor": "YXJyYXljb25uZWN0aW9uOjk="
      }
    }
  }
}
```

### Next Page

```graphql
query {
  users(first: 10, after: "YXJyYXljb25uZWN0aW9uOjk=") {
    edges { cursor node { id name } }
    pageInfo { hasNextPage endCursor }
  }
}
```

## Offset-Based Pagination

Simpler but less efficient:

```graphql
type Query {
  users(limit: Int = 10, offset: Int = 0): [User!]!
}
```

**Issues**:
- Data shifts during pagination
- Inefficient for large offsets
- Can't paginate infinite lists

## Key Takeaways

1. **Use Relay Connection**: Industry standard for consistency
2. **Cursors over offsets**: Handle data changes during pagination
3. **Include totalCount**: Help clients estimate progress
4. **Set default limits**: Prevent unbounded queries

## References

- [Relay Connection Specification](https://relay.dev/graphql/connections.htm)
- [GraphQL Pagination Best Practices](https://graphql.org/learn/pagination/)
