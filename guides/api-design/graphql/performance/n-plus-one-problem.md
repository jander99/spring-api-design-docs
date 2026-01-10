# The N+1 Problem and DataLoader Pattern

The N+1 problem is the most common performance issue in GraphQL APIs. One query triggers N+1 database calls instead of 1-2 batched queries. DataLoader solves this with automatic batching and caching.

## What is the N+1 Problem?

### The Problem

This innocent-looking query can trigger hundreds of database calls:

```graphql
query GetUsersAndPosts {
  users {           # 1 query
    name
    posts {         # N queries (one per user!)
      title
    }
  }
}
```

**Database Calls**:
```sql
-- Call 1: Fetch all users
SELECT * FROM users;

-- Call 2-11: Fetch posts for EACH user (if 10 users)
SELECT * FROM posts WHERE user_id = 1;
SELECT * FROM posts WHERE user_id = 2;
SELECT * FROM posts WHERE user_id = 3;
... (7 more queries)
```

Total: **11 queries** instead of **2 queries**.

With 100 users, you make **101 queries**. With 1000 users, **1001 queries**.

### Why It Happens

GraphQL resolvers execute independently:

```javascript
// Resolver runs once
const resolvers = {
  Query: {
    users: () => db.users.findAll(),  // 1 call
  },
  User: {
    // This resolver runs for EACH user
    posts: (user) => db.posts.findByUserId(user.id),  // N calls
  },
};
```

Each `user` triggers its own `posts` resolver, causing separate database calls.

## The Solution: DataLoader

DataLoader batches multiple individual loads into a single request:

```javascript
import DataLoader from 'dataloader';

// Batch function: receives array of user IDs, returns array of post arrays
const batchLoadPosts = async (userIds) => {
  // Single query for all users
  const posts = await db.posts.findByUserIds(userIds);
  
  // Group posts by user ID
  return userIds.map(userId => 
    posts.filter(post => post.userId === userId)
  );
};

// Create DataLoader
const postLoader = new DataLoader(batchLoadPosts);
```

### Updated Resolver

```javascript
const resolvers = {
  Query: {
    users: () => db.users.findAll(),
  },
  User: {
    // DataLoader batches these calls automatically
    posts: (user) => postLoader.load(user.id),
  },
};
```

**Database Calls**:
```sql
-- Call 1: Fetch all users
SELECT * FROM users;

-- Call 2: Fetch posts for ALL users at once (batched!)
SELECT * FROM posts WHERE user_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
```

Total: **2 queries** regardless of user count.

## How DataLoader Works

### Batching Window

DataLoader collects requests within a single event loop tick:

```javascript
// All three loads happen in same tick
postLoader.load(1);
postLoader.load(2);
postLoader.load(3);

// DataLoader batches into single call:
batchLoadPosts([1, 2, 3]);
```

### Deduplication

Duplicate requests are automatically deduplicated:

```javascript
postLoader.load(1);
postLoader.load(2);
postLoader.load(1);  // Duplicate!

// DataLoader calls batch function with unique IDs:
batchLoadPosts([1, 2]);  // Only calls for [1, 2]

// Both load(1) calls receive the same result
```

### Caching

DataLoader caches results per request:

```javascript
// First call: fetches from database
const posts1 = await postLoader.load(1);

// Second call: returns cached result
const posts2 = await postLoader.load(1);  // Cache hit!
```

**Per-request cache**: New DataLoader instance per GraphQL request prevents stale data.

## Implementation Patterns

### Basic DataLoader Setup

```javascript
import DataLoader from 'dataloader';
import db from './database';

// Batch function
async function batchLoadPostsByUserId(userIds) {
  const posts = await db.query(`
    SELECT * FROM posts WHERE user_id = ANY($1)
  `, [userIds]);
  
  // Group by user ID
  const postsByUserId = {};
  posts.forEach(post => {
    if (!postsByUserId[post.userId]) {
      postsByUserId[post.userId] = [];
    }
    postsByUserId[post.userId].push(post);
  });
  
  // Return in same order as userIds
  return userIds.map(id => postsByUserId[id] || []);
}

// Create loader
export const postLoader = new DataLoader(batchLoadPostsByUserId);
```

### Context Pattern

Create new DataLoader per request:

```javascript
// server.js
import { ApolloServer } from '@apollo/server';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: () => ({
    // New loaders for each request
    loaders: {
      posts: new DataLoader(batchLoadPostsByUserId),
      users: new DataLoader(batchLoadUsersByIds),
      comments: new DataLoader(batchLoadCommentsByIds),
    },
  }),
});
```

**Resolver usage**:

```javascript
const resolvers = {
  User: {
    posts: (user, args, context) => {
      return context.loaders.posts.load(user.id);
    },
  },
  Post: {
    author: (post, args, context) => {
      return context.loaders.users.load(post.authorId);
    },
    comments: (post, args, context) => {
      return context.loaders.comments.load(post.id);
    },
  },
};
```

### Advanced: Multiple Keys

Load by composite keys:

```javascript
async function batchLoadOrderItems(keys) {
  // keys = [{ orderId: 1, productId: 5 }, { orderId: 2, productId: 3 }]
  
  const orderIds = keys.map(k => k.orderId);
  const productIds = keys.map(k => k.productId);
  
  const items = await db.query(`
    SELECT * FROM order_items 
    WHERE (order_id, product_id) IN (VALUES ${buildTuples(keys)})
  `);
  
  // Map results back to keys
  return keys.map(key => 
    items.find(item => 
      item.orderId === key.orderId && 
      item.productId === key.productId
    )
  );
}

const orderItemLoader = new DataLoader(
  batchLoadOrderItems,
  {
    cacheKeyFn: (key) => `${key.orderId}:${key.productId}`,
  }
);

// Usage
orderItemLoader.load({ orderId: 1, productId: 5 });
```

## Performance Impact

### Real-World Metrics

Production data from companies using DataLoader:

| Metric | Without DataLoader | With DataLoader | Improvement |
|--------|-------------------|-----------------|-------------|
| **Response Time** | 2.3s | 350ms | **85% faster** |
| **Database Queries** | 1,247 | 23 | **98% reduction** |
| **Database Load** | High CPU | Normal | **Stable** |

**Source**: Shopify engineering blog

### Benchmarks

Query fetching 100 users with posts:

```
Without DataLoader:
- Database calls: 101
- Response time: 1,850ms

With DataLoader:
- Database calls: 2
- Response time: 180ms

Improvement: 90% faster
```

## Common Patterns

### One-to-Many Relationships

```javascript
// User has many posts
const postsByUserIdLoader = new DataLoader(async (userIds) => {
  const posts = await db.posts.findByUserIds(userIds);
  
  const grouped = {};
  posts.forEach(post => {
    if (!grouped[post.userId]) grouped[post.userId] = [];
    grouped[post.userId].push(post);
  });
  
  return userIds.map(id => grouped[id] || []);
});
```

### Many-to-One Relationships

```javascript
// Post belongs to one user
const userByIdLoader = new DataLoader(async (userIds) => {
  const users = await db.users.findByIds(userIds);
  
  // Return in same order as requested
  const userMap = {};
  users.forEach(user => userMap[user.id] = user);
  
  return userIds.map(id => userMap[id]);
});
```

### Many-to-Many Relationships

```javascript
// User has many roles, Role has many users
const rolesByUserIdLoader = new DataLoader(async (userIds) => {
  const userRoles = await db.query(`
    SELECT user_id, role_id FROM user_roles WHERE user_id = ANY($1)
  `, [userIds]);
  
  const roleIds = [...new Set(userRoles.map(ur => ur.roleId))];
  const roles = await db.roles.findByIds(roleIds);
  
  const rolesMap = {};
  roles.forEach(role => rolesMap[role.id] = role);
  
  const grouped = {};
  userRoles.forEach(ur => {
    if (!grouped[ur.userId]) grouped[ur.userId] = [];
    grouped[ur.userId].push(rolesMap[ur.roleId]);
  });
  
  return userIds.map(id => grouped[id] || []);
});
```

## Error Handling

### Individual Errors

Return errors for specific items:

```javascript
const userLoader = new DataLoader(async (userIds) => {
  const users = await db.users.findByIds(userIds);
  const userMap = {};
  users.forEach(user => userMap[user.id] = user);
  
  return userIds.map(id => {
    const user = userMap[id];
    if (!user) {
      return new Error(`User ${id} not found`);
    }
    return user;
  });
});
```

**Client handling**:

```javascript
try {
  const user = await userLoader.load(999);
} catch (error) {
  console.error('User not found:', error.message);
}
```

### Batch Errors

Handle batch-level failures:

```javascript
const userLoader = new DataLoader(async (userIds) => {
  try {
    const users = await db.users.findByIds(userIds);
    // ... mapping logic
  } catch (error) {
    // Return error for ALL items in batch
    return userIds.map(() => error);
  }
});
```

## DataLoader Options

```javascript
const loader = new DataLoader(batchFunction, {
  // Maximum batch size
  maxBatchSize: 100,
  
  // Custom cache key function
  cacheKeyFn: (key) => JSON.stringify(key),
  
  // Disable caching
  cache: false,
  
  // Custom cache implementation
  cacheMap: new Map(),
  
  // Batch scheduler
  batchScheduleFn: (callback) => setTimeout(callback, 10),
});
```

### Common Configurations

**High-throughput APIs**:
```javascript
new DataLoader(batchFn, {
  maxBatchSize: 1000,  // Larger batches
  batchScheduleFn: (cb) => setImmediate(cb),  // Immediate batching
});
```

**Memory-constrained**:
```javascript
new DataLoader(batchFn, {
  cache: false,  // Disable caching
});
```

## Debugging N+1 Issues

### Apollo Server Tracing

Enable query tracing:

```javascript
import { ApolloServer } from '@apollo/server';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      async requestDidStart() {
        return {
          async executionDidStart() {
            console.log('Query execution started');
          },
          async willResolveField({ info }) {
            const start = Date.now();
            return () => {
              const duration = Date.now() - start;
              console.log(`${info.parentType}.${info.fieldName} took ${duration}ms`);
            };
          },
        };
      },
    },
  ],
});
```

### Database Query Logging

Log all database queries:

```javascript
// Sequelize example
const sequelize = new Sequelize({
  logging: (sql, timing) => {
    console.log(`[${timing}ms] ${sql}`);
  },
});
```

**Output**:
```
[12ms] SELECT * FROM users;
[8ms] SELECT * FROM posts WHERE user_id = 1;
[7ms] SELECT * FROM posts WHERE user_id = 2;
[9ms] SELECT * FROM posts WHERE user_id = 3;
... (repeating pattern = N+1 detected!)
```

### Batch Load Counter

Track DataLoader effectiveness:

```javascript
let batchCallCount = 0;
let totalLoads = 0;

const loader = new DataLoader(async (keys) => {
  batchCallCount++;
  totalLoads += keys.length;
  console.log(`Batch #${batchCallCount}: ${keys.length} items`);
  
  return batchLoadFunction(keys);
});

// After request
console.log(`Total batches: ${batchCallCount}`);
console.log(`Total loads: ${totalLoads}`);
console.log(`Avg batch size: ${totalLoads / batchCallCount}`);
```

## Anti-Patterns

### ❌ Calling DataLoader in Loops

```javascript
// Bad - defeats batching
const posts = [];
for (const userId of userIds) {
  const userPosts = await postLoader.load(userId);  // await in loop!
  posts.push(...userPosts);
}
```

**Fix**:
```javascript
// Good - parallel loads batch automatically
const posts = await Promise.all(
  userIds.map(userId => postLoader.load(userId))
);
```

### ❌ Shared DataLoader Across Requests

```javascript
// Bad - cache persists across requests
const globalUserLoader = new DataLoader(batchLoadUsers);

app.use((req, res, next) => {
  req.loaders = { users: globalUserLoader };  // Stale data risk!
  next();
});
```

**Fix**:
```javascript
// Good - new loader per request
app.use((req, res, next) => {
  req.loaders = {
    users: new DataLoader(batchLoadUsers),  // Fresh cache
  };
  next();
});
```

### ❌ Incorrect Batch Function Order

```javascript
// Bad - returns results in wrong order
async function batchLoadUsers(ids) {
  const users = await db.users.findByIds(ids);
  return users;  // Order might not match ids!
}
```

**Fix**:
```javascript
// Good - preserves order
async function batchLoadUsers(ids) {
  const users = await db.users.findByIds(ids);
  const userMap = {};
  users.forEach(user => userMap[user.id] = user);
  
  // Return in exact order of ids
  return ids.map(id => userMap[id]);
}
```

## Key Takeaways

1. **N+1 is common**: GraphQL's resolver model naturally causes N+1 without batching
2. **DataLoader solves it**: Automatic batching and caching eliminate redundant queries
3. **Per-request instances**: Create new DataLoader per request to avoid stale cache
4. **85% performance gain**: Real-world metrics show massive improvements
5. **Order matters**: Batch functions must return results in request order
6. **Use context**: Pass DataLoader instances via GraphQL context

## Next Steps

- Implement [Query Security](../security/query-security.md) to limit query depth
- Learn [Pagination](../advanced-patterns/pagination.md) for large datasets
- Explore [Federation](../advanced-patterns/federation.md) DataLoader patterns

## References

- [DataLoader GitHub Repository](https://github.com/graphql/dataloader)
- [Shopify: Solving the N+1 Problem](https://shopify.engineering/solving-the-n-1-problem-for-graphql-through-batching)
- [Apollo Server: Data Sources](https://www.apollographql.com/docs/apollo-server/data/fetching-data/)
