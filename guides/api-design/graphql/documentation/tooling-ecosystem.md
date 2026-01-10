# GraphQL Tooling Ecosystem

Modern GraphQL development relies on robust tooling for documentation, development, and testing.

## Interactive Documentation

### GraphiQL

Browser-based GraphQL IDE:
- Query editor with autocomplete
- Schema explorer
- Real-time validation
- Response visualization

### Apollo Studio

Production schema management:
- Multi-environment support
- Schema registry
- Breaking change detection
- Usage analytics

### Apollo Sandbox

Local development without account:
- Loads schema via introspection
- Full IDE experience
- Works offline

## Static Documentation

### GraphQL-Markdown

Generates markdown from schemas:
- MDX support
- Custom templates
- Framework integration

### Spectaql

Creates static HTML documentation:
- Schema diagrams
- Type reference
- Custom themes

## Client Libraries

### Apollo Client

- Normalized caching
- Query batching
- Optimistic UI updates
- DevTools integration

### Relay

- Fragment colocation
- Type-safe code generation
- Connection pagination

### URQL

- Lightweight
- Exchange-based architecture
- Normalized cache

## Testing Tools

### GraphQL-ESLint

Lints schemas and operations:
- Schema validation
- Best practice rules
- Custom rule support

### MSW (Mock Service Worker)

Intercepts GraphQL requests:
- Specification-compliant
- Type-safe
- Works in browser and Node.js

## Key Takeaways

1. **GraphiQL for development**: Interactive schema exploration
2. **Apollo Studio for production**: Schema registry and analytics
3. **Client libraries vary**: Choose based on needs (Apollo, Relay, URQL)
4. **Testing essential**: Use ESLint and MSW for quality

## References

- [GraphQL Tools](https://graphql.org/community/tools-and-libraries/)
- [Apollo Client](https://www.apollographql.com/docs/react/)
- [GraphiQL](https://github.com/graphql/graphiql)
