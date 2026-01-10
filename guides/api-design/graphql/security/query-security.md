# GraphQL Query Security

GraphQL's flexible query language creates security risks. Malicious clients can craft expensive queries that overwhelm servers. This guide covers depth limiting, complexity analysis, and authorization patterns.

## Query Depth Limiting

### The Attack

Unlimited depth enables denial-of-service attacks:

```graphql
query MaliciousQuery {
  user(id: "1") {
    friends {          # Depth 1
      friends {        # Depth 2
        friends {      # Depth 3
          friends {    # Depth 4
            friends {  # Depth 5
              friends { # Depth 6
                name
              }
            }
          }
        }
      }
    }
  }
}
```

With 10 friends per user, depth 6 triggers **1,000,000 resolver calls** (10^6).

### Industry Standards

| Platform | Depth Limit |
|----------|-------------|
| AWS AppSync | 0-75 (configurable) |
| GitHub GraphQL API | 10 levels |
| Shopify | Variable by query |

**Recommended**: 5-7 levels for public APIs, 10-15 for internal APIs.

### Implementation

```javascript
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const depthLimit = 7;

const validationRules = [
  createDepthLimitRule(depthLimit),
];

const server = new ApolloServer({
  schema,
  validationRules,
});
```

**Error Response**:
```json
{
  "errors": [
    {
      "message": "Query exceeds maximum depth of 7",
      "extensions": {
        "code": "DEPTH_LIMIT_EXCEEDED",
        "maxDepth": 7,
        "actualDepth": 10
      }
    }
  ]
}
```

## Query Complexity Analysis

### Cost-Based Limits

Assign costs to fields based on computational expense:

```graphql
type Query {
  user(id: ID!): User           # Cost: 1
  users(limit: Int): [User!]!   # Cost: limit * 2
  search(query: String!): [SearchResult!]!  # Cost: 50
}

type User {
  name: String!                 # Cost: 0 (scalar)
  posts: [Post!]!               # Cost: 10 (list)
}
```

**Complexity Calculation**:
```graphql
query {
  users(limit: 10) {   # 10 * 2 = 20
    name               # 0
    posts {            # 10 * 10 = 100
      title            # 0
    }
  }
}
# Total: 120 points
```

### Implementation

```javascript
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const complexityLimit = 1000;

const validationRules = [
  createComplexityLimitRule(complexityLimit, {
    scalarCost: 1,
    objectCost: 2,
    listFactor: 10,
  }),
];
```

### Shopify's Approach

Shopify uses calculated query cost with limits:

```http
X-GraphQL-Cost-Include-Fields: true
```

**Response Headers**:
```http
X-Request-Cost: 452
X-Request-Cost-Limit: 1000
```

**Over-limit Response**:
```json
{
  "errors": [
    {
      "message": "Query cost 1250 exceeds limit of 1000",
      "extensions": {
        "code": "THROTTLED",
        "cost": 1250,
        "limit": 1000
      }
    }
  ]
}
```

## Rate Limiting

### Cost-Based Rate Limiting

Track query cost per time window:

```javascript
const rateLimiter = {
  budget: 1000,      // Points per minute
  window: 60000,     // 1 minute
  
  async checkLimit(userId, queryCost) {
    const used = await redis.get(`limit:${userId}`);
    
    if (used + queryCost > this.budget) {
      throw new Error('Rate limit exceeded');
    }
    
    await redis.incrby(`limit:${userId}`, queryCost);
    await redis.expire(`limit:${userId}`, this.window / 1000);
  }
};
```

### GitHub's Point System

- Users: 5,000 points/hour
- Enterprise: 10,000 points/hour per installation

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4750
X-RateLimit-Reset: 1609459200
```

## Authorization Patterns

### Field-Level Authorization

```graphql
directive @auth(requires: Role = ADMIN) on FIELD_DEFINITION

enum Role {
  ADMIN
  USER
  GUEST
}

type User {
  name: String!
  email: String! @auth(requires: USER)
  ssn: String! @auth(requires: ADMIN)
}
```

**Implementation**:

```javascript
const resolvers = {
  User: {
    ssn: (parent, args, context) => {
      if (context.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }
      return parent.ssn;
    },
  },
};
```

### Context-Based Auth

```javascript
const server = new ApolloServer({
  context: async ({ req }) => {
    const token = req.headers.authorization || '';
    const user = await validateToken(token);
    
    if (!user) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }
    
    return { user };
  },
});
```

## Introspection Security

### Production Hardening

Disable introspection for unauthenticated users:

```javascript
import { NoSchemaIntrospectionCustomRule } from 'graphql';

const server = new ApolloServer({
  validationRules: [
    context => {
      if (!context.user && process.env.NODE_ENV === 'production') {
        return NoSchemaIntrospectionCustomRule;
      }
      return [];
    },
  ],
});
```

### Partial Introspection

Allow introspection but hide sensitive fields:

```graphql
type User {
  name: String!
  email: String! @inaccessible  # Hidden from introspection
}
```

## Security Checklist

Production GraphQL APIs should implement:

- [ ] Query depth limits (5-7 levels)
- [ ] Query complexity limits (1000-1500 points)
- [ ] Cost-based rate limiting
- [ ] Field-level authorization
- [ ] Introspection disabled for unauthenticated users
- [ ] Request timeouts (30-60 seconds)
- [ ] Persistent query whitelisting (optional)
- [ ] Query validation before execution

## Key Takeaways

1. **Depth limits prevent DoS**: Limit nesting to 5-7 levels for public APIs
2. **Complexity analysis scales**: Point-based costs handle variable query sizes
3. **Rate limiting by cost**: More accurate than request counts
4. **Field-level auth**: Granular control over sensitive data
5. **Disable introspection**: Hide schema from unauthenticated users

## Next Steps

- Implement [Pagination](../advanced-patterns/pagination.md) securely
- Learn [Schema Evolution](../advanced-patterns/schema-evolution.md) for auth field changes
- Explore [Federation](../advanced-patterns/federation.md) security patterns

## References

- [GraphQL Security Best Practices](https://graphql.org/learn/security/)
- [Apollo Server Security](https://www.apollographql.com/docs/apollo-server/security/authentication/)
- [OWASP GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
