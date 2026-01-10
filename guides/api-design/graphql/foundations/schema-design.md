# GraphQL Schema Design

A GraphQL schema defines the contract between clients and servers. Well-designed schemas are intuitive, maintainable, and performant.

## Core Principles

1. **Business domain first**: Model your domain, not your database
2. **Client-driven**: Design for how data is used, not how it's stored
3. **Explicit over implicit**: Make relationships and nullability clear
4. **Evolvable**: Design for change without breaking existing clients

## Type System Basics

### Scalar Types

GraphQL has five built-in scalar types:

```graphql
type User {
  id: ID!           # Unique identifier (serialized as String)
  name: String!     # UTF-8 character sequence
  age: Int!         # Signed 32-bit integer
  score: Float!     # Signed double-precision floating-point
  isActive: Boolean! # true or false
}
```

**Custom Scalars**:

```graphql
scalar DateTime
scalar Email
scalar URL
scalar JSON

type Post {
  createdAt: DateTime!
  authorEmail: Email!
  featuredImage: URL
  metadata: JSON
}
```

### Object Types

Objects represent entities in your domain:

```graphql
type User {
  id: ID!
  email: String!
  name: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  publishedAt: DateTime
}
```

**Naming Convention**: Use `PascalCase` for all type names.

### Fields

Fields are properties of an object type:

```graphql
type User {
  # Scalar field - simple value
  id: ID!
  
  # Nullable field - can return null
  nickname: String
  
  # Non-null field - guaranteed value
  email: String!
  
  # List field - array of values
  tags: [String!]!
  
  # Relationship field - references another type
  posts: [Post!]!
}
```

**Naming Convention**: Use `camelCase` for all field names.

**Nullability Rules**:
- `String`: Nullable string
- `String!`: Non-null string (guaranteed)
- `[String]`: Nullable list of nullable strings
- `[String!]`: Nullable list of non-null strings
- `[String!]!`: Non-null list of non-null strings

### Enums

Enums define a fixed set of values:

```graphql
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

enum Role {
  ADMIN
  MODERATOR
  USER
  GUEST
}

type Order {
  id: ID!
  status: OrderStatus!
  createdBy: User!
}
```

**Naming Convention**: 
- Type name: `PascalCase`
- Values: `SCREAMING_SNAKE_CASE`

### Interfaces

Interfaces define common fields shared by multiple types:

```graphql
interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}

type User implements Node & Timestamped {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  email: String!
  name: String!
}

type Post implements Node & Timestamped {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  title: String!
  content: String!
}
```

**When to use**:
- Common fields across multiple types
- Polymorphic queries (fetch any Node by ID)
- Reusable patterns (Timestamped, Ownable, Searchable)

### Unions

Unions represent types that could be one of several object types:

```graphql
union SearchResult = User | Post | Comment

type Query {
  search(query: String!): [SearchResult!]!
}

# Client must use fragments to access fields
query Search {
  search(query: "GraphQL") {
    ... on User {
      id
      name
      email
    }
    ... on Post {
      id
      title
      content
    }
    ... on Comment {
      id
      text
      author { name }
    }
  }
}
```

**When to use**:
- Types have no common fields (use interface if they do)
- Search results with different types
- Polymorphic responses from mutations

## Input Types

Input types are used for mutation arguments:

```graphql
input CreateUserInput {
  email: String!
  name: String!
  password: String!
  role: Role = USER
}

input UpdateUserInput {
  name: String
  email: String
  # All fields optional for partial updates
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
}
```

**Naming Convention**: `{Action}{Type}Input`

**Key Rules**:
- Input types cannot reference output types
- Input types cannot have circular references
- Input types can have default values

## Query Design

### Root Query Type

```graphql
type Query {
  # Single item - use singular noun
  user(id: ID!): User
  post(id: ID!): Post
  
  # Collection - use plural noun
  users(filter: UserFilter, pagination: Pagination): UserConnection!
  posts(status: PostStatus): [Post!]!
  
  # Specific query - be descriptive
  userByEmail(email: String!): User
  postsByAuthor(authorId: ID!): [Post!]!
}
```

**Naming Convention**:
- Single items: Singular noun (`user`, `post`)
- Collections: Plural noun (`users`, `posts`)
- Specific queries: Descriptive name (`userByEmail`, `postsByTag`)

### Arguments

```graphql
type Query {
  # Required argument
  user(id: ID!): User
  
  # Optional argument
  users(limit: Int): [User!]!
  
  # Multiple arguments
  posts(
    status: PostStatus
    authorId: ID
    limit: Int
    offset: Int
  ): [Post!]!
  
  # Default values
  posts(
    status: PostStatus = PUBLISHED
    limit: Int = 10
    sortBy: PostSort = CREATED_DESC
  ): [Post!]!
}
```

**Best Practices**:
- Use input types for complex arguments
- Provide sensible defaults
- Make required arguments truly required

## Mutation Design

### Mutation Pattern

```graphql
type Mutation {
  # Pattern: verb + noun
  createUser(input: CreateUserInput!): CreateUserPayload!
  updatePost(id: ID!, input: UpdatePostInput!): UpdatePostPayload!
  deleteComment(id: ID!): DeleteCommentPayload!
  
  # Boolean toggles
  publishPost(id: ID!): Post!
  archiveUser(id: ID!): User!
}
```

**Naming Convention**: `{verb}{noun}` pattern
- Create: `createUser`, `createPost`
- Update: `updateUser`, `updatePost`
- Delete: `deleteUser`, `deletePost`
- Actions: `publishPost`, `archiveProject`, `enableNotifications`

### Mutation Payload Pattern

```graphql
type CreateUserPayload {
  user: User
  errors: [Error!]!
}

type UpdatePostPayload {
  post: Post
  errors: [Error!]!
}

type Error {
  message: String!
  code: String!
  field: String
}
```

**Benefits**:
- Consistent error handling
- Room for future metadata
- Type-safe response structure

## Field Relationships

### One-to-Many

```graphql
type User {
  id: ID!
  name: String!
  # User has many posts
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  # Post belongs to one user
  author: User!
}
```

### Many-to-Many

```graphql
type User {
  id: ID!
  name: String!
  # Many users can like many posts
  likedPosts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  # Many posts can be liked by many users
  likers: [User!]!
}
```

### Circular References

GraphQL allows circular references:

```graphql
type User {
  friends: [User!]!  # Users can reference other users
}

type Category {
  parent: Category
  children: [Category!]!
}
```

## Schema Composition

### Organizing Large Schemas

Split schema into logical modules:

```
schema/
├── types/
│   ├── user.graphql
│   ├── post.graphql
│   └── comment.graphql
├── queries/
│   ├── user-queries.graphql
│   └── post-queries.graphql
├── mutations/
│   ├── user-mutations.graphql
│   └── post-mutations.graphql
└── schema.graphql  # Imports all files
```

### Extending Types

```graphql
# user.graphql
type User {
  id: ID!
  name: String!
}

# post.graphql
extend type User {
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
}
```

## Documentation Best Practices

### Description Strings

Use triple-quoted strings for documentation:

```graphql
"""
A user in the system.
Users can create posts and comment on other users' posts.
"""
type User {
  """Unique identifier for the user."""
  id: ID!
  
  """
  User's email address.
  Must be unique across all users.
  """
  email: String!
  
  """
  Posts created by this user.
  Returns most recent posts first.
  """
  posts(
    """Maximum number of posts to return."""
    first: Int = 10
  ): [Post!]!
}
```

**Best Practices**:
- Describe what fields represent
- Document constraints and validation rules
- Explain edge cases
- Include examples for complex fields

### Deprecation

```graphql
type User {
  """User's full name."""
  fullName: String!
  
  """
  @deprecated Use `fullName` instead.
  Will be removed in 2026-06-01.
  """
  name: String! @deprecated(reason: "Use `fullName`.")
}
```

## Complete Example

```graphql
"""
E-commerce schema example
"""
schema {
  query: Query
  mutation: Mutation
}

# Enums
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

enum Role {
  ADMIN
  USER
  GUEST
}

# Interfaces
interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Object Types
type User implements Node & Timestamped {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  email: String!
  name: String!
  role: Role!
  orders: [Order!]!
}

type Product implements Node & Timestamped {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  name: String!
  description: String
  price: Float!
  sku: String!
  inventory: Int!
}

type Order implements Node & Timestamped {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  user: User!
  items: [OrderItem!]!
  total: Float!
  status: OrderStatus!
}

type OrderItem {
  product: Product!
  quantity: Int!
  price: Float!
}

# Input Types
input CreateUserInput {
  email: String!
  name: String!
  password: String!
  role: Role = USER
}

input CreateOrderInput {
  userId: ID!
  items: [OrderItemInput!]!
}

input OrderItemInput {
  productId: ID!
  quantity: Int!
}

# Queries
type Query {
  user(id: ID!): User
  users(role: Role, limit: Int = 10): [User!]!
  
  product(id: ID!): Product
  productBySku(sku: String!): Product
  products(limit: Int = 20): [Product!]!
  
  order(id: ID!): Order
  orders(userId: ID, status: OrderStatus): [Order!]!
}

# Mutations
type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  
  createOrder(input: CreateOrderInput!): CreateOrderPayload!
  updateOrderStatus(id: ID!, status: OrderStatus!): Order!
}

# Payloads
type CreateUserPayload {
  user: User
  errors: [Error!]!
}

type CreateOrderPayload {
  order: Order
  errors: [Error!]!
}

type Error {
  message: String!
  code: String!
  field: String
}

# Custom Scalars
scalar DateTime
```

## Anti-Patterns to Avoid

**❌ Database-driven design**:
```graphql
# Bad - exposes database structure
type user_table {
  user_id: Int!
  user_email: String!
  created_timestamp: String!
}
```

**✅ Domain-driven design**:
```graphql
# Good - models business domain
type User {
  id: ID!
  email: String!
  createdAt: DateTime!
}
```

**❌ Generic field names**:
```graphql
# Bad - unclear what data represents
type User {
  data: String!
  value: Int!
}
```

**✅ Descriptive field names**:
```graphql
# Good - clear meaning
type User {
  name: String!
  age: Int!
}
```

**❌ Over-nesting**:
```graphql
# Bad - unnecessary wrapper types
type UserResponse {
  userData: UserData!
}

type UserData {
  userInfo: UserInfo!
}

type UserInfo {
  name: String!
}
```

**✅ Flat structure**:
```graphql
# Good - direct access
type User {
  name: String!
}
```

## Key Takeaways

1. **Model business domain**: Schema should reflect how clients think, not database structure
2. **Use consistent naming**: PascalCase for types, camelCase for fields, SCREAMING_SNAKE_CASE for enums
3. **Document everything**: Description strings make schemas self-documenting
4. **Design for evolution**: Additive changes, deprecation over removal
5. **Input types for mutations**: Consistent pattern across all mutations
6. **Nullability matters**: Make nullability explicit and intentional

## Next Steps

- Learn [Error Handling](error-handling.md) patterns for mutations
- Implement [Pagination](../advanced-patterns/pagination.md) for large datasets
- Explore [Federation](../advanced-patterns/federation.md) for microservices

## References

- [GraphQL Specification - Type System](https://spec.graphql.org/October2021/#sec-Type-System)
- [Apollo Schema Design Guide](https://www.apollographql.com/docs/apollo-server/schema/schema/)
- [Shopify GraphQL Design Tutorial](https://github.com/Shopify/graphql-design-tutorial)
