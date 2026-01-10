# GraphQL Error Handling

GraphQL provides two approaches to error handling: errors in the response `errors` array, and errors as data in the schema. Production APIs use both strategically.

## GraphQL Error Response Structure

Every GraphQL response can contain both data and errors:

```json
{
  "data": {
    "user": null
  },
  "errors": [
    {
      "message": "User not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["user"]
    }
  ]
}
```

**Standard Error Fields**:
- `message`: Human-readable error description
- `locations`: Where in the query the error occurred
- `path`: Field path that caused the error
- `extensions`: Custom error metadata

## Errors in Extensions (Traditional Approach)

The `extensions` field adds structured error information:

```json
{
  "errors": [
    {
      "message": "Invalid email format",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "field": "email",
        "received": "not-an-email"
      }
    }
  ]
}
```

### Common Error Codes

```json
{
  "extensions": {
    "code": "UNAUTHENTICATED"      // User not logged in
  }
}
```

```json
{
  "extensions": {
    "code": "FORBIDDEN"            // Insufficient permissions
  }
}
```

```json
{
  "extensions": {
    "code": "BAD_USER_INPUT"       // Validation failure
  }
}
```

```json
{
  "extensions": {
    "code": "INTERNAL_SERVER_ERROR" // Unexpected server error
  }
}
```

### Example Schema

```graphql
type Mutation {
  createUser(email: String!, password: String!): User
}
```

**Success Response**:
```json
{
  "data": {
    "createUser": {
      "id": "123",
      "email": "user@example.com"
    }
  }
}
```

**Error Response**:
```json
{
  "data": {
    "createUser": null
  },
  "errors": [
    {
      "message": "Email already exists",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "field": "email"
      }
    }
  ]
}
```

### Pros and Cons

**Pros**:
- Built into GraphQL specification
- Works with all clients automatically
- Simple for basic errors

**Cons**:
- Not type-safe (clients can't know error shape)
- Partial data hard to reason about
- Error details in untyped `extensions` object

## Errors as Data (Modern Approach)

Model errors as part of your schema using union types:

```graphql
type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}

union CreateUserResult = CreateUserSuccess | EmailTakenError | InvalidEmailError

type CreateUserSuccess {
  user: User!
}

type EmailTakenError {
  message: String!
  email: String!
  suggestedEmails: [String!]!
}

type InvalidEmailError {
  message: String!
  email: String!
  reason: String!
}
```

### Querying with Fragments

Clients use fragments to handle different result types:

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    ... on CreateUserSuccess {
      user {
        id
        email
        name
      }
    }
    ... on EmailTakenError {
      message
      email
      suggestedEmails
    }
    ... on InvalidEmailError {
      message
      email
      reason
    }
  }
}
```

**Success Response**:
```json
{
  "data": {
    "createUser": {
      "__typename": "CreateUserSuccess",
      "user": {
        "id": "123",
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
  }
}
```

**Error Response**:
```json
{
  "data": {
    "createUser": {
      "__typename": "EmailTakenError",
      "message": "Email already registered",
      "email": "user@example.com",
      "suggestedEmails": [
        "user1@example.com",
        "user2@example.com"
      ]
    }
  }
}
```

### Pros and Cons

**Pros**:
- Type-safe errors (clients know exact shape)
- Rich error context (suggested actions, related data)
- Clear success vs error handling in client code
- No partial data confusion

**Cons**:
- More schema design work
- Clients must handle all union cases
- Verbose for simple errors

## Payload Pattern with Error Lists

Combine success data with an error list:

```graphql
type CreateUserPayload {
  user: User
  errors: [UserError!]!
}

type UserError {
  message: String!
  code: UserErrorCode!
  field: String
}

enum UserErrorCode {
  EMAIL_TAKEN
  INVALID_EMAIL
  PASSWORD_TOO_SHORT
  INVALID_INPUT
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
}
```

**Success Response**:
```json
{
  "data": {
    "createUser": {
      "user": {
        "id": "123",
        "email": "user@example.com"
      },
      "errors": []
    }
  }
}
```

**Error Response**:
```json
{
  "data": {
    "createUser": {
      "user": null,
      "errors": [
        {
          "message": "Email already exists",
          "code": "EMAIL_TAKEN",
          "field": "email"
        }
      ]
    }
  }
}
```

### Multiple Errors

The payload pattern handles multiple validation errors:

```json
{
  "data": {
    "createUser": {
      "user": null,
      "errors": [
        {
          "message": "Email format invalid",
          "code": "INVALID_EMAIL",
          "field": "email"
        },
        {
          "message": "Password must be at least 8 characters",
          "code": "PASSWORD_TOO_SHORT",
          "field": "password"
        }
      ]
    }
  }
}
```

## Reusable Error Interfaces

Create interfaces for consistent error handling:

```graphql
interface Error {
  message: String!
  code: String!
}

type ValidationError implements Error {
  message: String!
  code: String!
  field: String!
  constraint: String!
}

type AuthenticationError implements Error {
  message: String!
  code: String!
  requiredRole: String
}

type NotFoundError implements Error {
  message: String!
  code: String!
  resourceType: String!
  resourceId: ID!
}
```

## Mutation Response Pattern

Standard pattern for all mutations:

```graphql
interface MutationResponse {
  success: Boolean!
  message: String!
}

type CreateUserResponse implements MutationResponse {
  success: Boolean!
  message: String!
  user: User
}

type UpdatePostResponse implements MutationResponse {
  success: Boolean!
  message: String!
  post: Post
}

type DeleteCommentResponse implements MutationResponse {
  success: Boolean!
  message: String!
}
```

**Client Usage**:
```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    success
    message
    user {
      id
      email
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "createUser": {
      "success": true,
      "message": "User created successfully",
      "user": {
        "id": "123",
        "email": "user@example.com"
      }
    }
  }
}
```

## Field-Level Errors

Handle errors for specific fields:

```graphql
type User {
  id: ID!
  email: String!
  # Nullable - can return null on error
  profileImage: Image
}

type Image {
  url: String!
  width: Int!
  height: Int!
}
```

**Partial Success Response**:
```json
{
  "data": {
    "user": {
      "id": "123",
      "email": "user@example.com",
      "profileImage": null
    }
  },
  "errors": [
    {
      "message": "Image service unavailable",
      "path": ["user", "profileImage"],
      "extensions": {
        "code": "SERVICE_UNAVAILABLE"
      }
    }
  ]
}
```

## Error Handling Decision Matrix

| Scenario | Recommended Approach | Reason |
|----------|---------------------|--------|
| **Simple validation** | Errors in extensions | Quick to implement, standard pattern |
| **Complex business logic** | Errors as data (union) | Type-safe, rich context |
| **Multiple validation errors** | Payload with error list | Handles multiple errors gracefully |
| **Field-level failures** | Nullable fields + errors array | Partial data still useful |
| **Authentication/Authorization** | Errors in extensions | Standard HTTP-like semantics |

## Production Examples

### GitHub GraphQL API

Uses errors in extensions:

```graphql
mutation {
  createIssue(input: {
    repositoryId: "invalid"
    title: "Bug"
    body: "Description"
  }) {
    issue {
      id
      title
    }
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Could not resolve to a Repository with the ID 'invalid'",
      "type": "NOT_FOUND",
      "path": ["createIssue"],
      "locations": [{"line": 2, "column": 3}]
    }
  ]
}
```

### Shopify Storefront API

Uses payload pattern:

```graphql
mutation {
  customerCreate(input: {
    email: "invalid-email"
    password: "pass"
  }) {
    customer {
      id
    }
    customerUserErrors {
      code
      field
      message
    }
  }
}
```

Response:
```json
{
  "data": {
    "customerCreate": {
      "customer": null,
      "customerUserErrors": [
        {
          "code": "INVALID",
          "field": ["email"],
          "message": "Email is invalid"
        },
        {
          "code": "TOO_SHORT",
          "field": ["password"],
          "message": "Password is too short (minimum is 5 characters)"
        }
      ]
    }
  }
}
```

## Client-Side Error Handling

### TypeScript Example

```typescript
type CreateUserResult = 
  | { __typename: 'CreateUserSuccess'; user: User }
  | { __typename: 'EmailTakenError'; message: string; email: string }
  | { __typename: 'InvalidEmailError'; message: string; email: string };

async function createUser(input: CreateUserInput): Promise<User> {
  const result = await graphqlClient.mutate<CreateUserResult>({
    mutation: CREATE_USER_MUTATION,
    variables: { input },
  });

  switch (result.__typename) {
    case 'CreateUserSuccess':
      return result.user;
    
    case 'EmailTakenError':
      throw new Error(`Email already exists: ${result.email}`);
    
    case 'InvalidEmailError':
      throw new Error(`Invalid email: ${result.message}`);
    
    default:
      throw new Error('Unknown error');
  }
}
```

### React Hook Example

```typescript
function useCreateUser() {
  const [createUser, { loading, error }] = useMutation(CREATE_USER_MUTATION);

  return {
    createUser: async (input: CreateUserInput) => {
      const result = await createUser({ variables: { input } });
      
      // Check for GraphQL errors
      if (error) {
        throw error;
      }
      
      // Check for business logic errors
      const { user, errors } = result.data.createUser;
      if (errors.length > 0) {
        throw new Error(errors[0].message);
      }
      
      return user;
    },
    loading,
  };
}
```

## Best Practices

1. **Be consistent**: Choose one error pattern and use it across all mutations
2. **Provide context**: Include relevant data (field names, constraints, suggestions)
3. **Use error codes**: Make errors machine-readable with enum codes
4. **Document errors**: List possible errors in schema descriptions
5. **Avoid mixing approaches**: Don't use both union types and extensions for same error

### Error Documentation Example

```graphql
"""
Creates a new user account.

**Possible Errors**:
- `EMAIL_TAKEN`: Email already registered
- `INVALID_EMAIL`: Email format is invalid
- `PASSWORD_TOO_SHORT`: Password less than 8 characters
"""
createUser(input: CreateUserInput!): CreateUserPayload!
```

## Key Takeaways

1. **Two patterns**: Errors in extensions (simple) vs errors as data (type-safe)
2. **Union types**: Best for complex business logic errors
3. **Payload pattern**: Good for multiple validation errors
4. **Field-level errors**: Use nullable fields for partial failures
5. **Error codes**: Make errors machine-readable and actionable
6. **Client handling**: Type-safe error handling improves developer experience

## Next Steps

- Implement [Query Security](../security/query-security.md) to protect against malicious queries
- Learn [Schema Evolution](../advanced-patterns/schema-evolution.md) for handling error field changes
- Explore [Pagination](../advanced-patterns/pagination.md) error handling patterns

## References

- [GraphQL Specification - Errors](https://spec.graphql.org/October2021/#sec-Errors)
- [Apollo Server Error Handling](https://www.apollographql.com/docs/apollo-server/data/errors/)
- [Shopify Error Handling](https://shopify.dev/docs/api/usage/error-handling)
