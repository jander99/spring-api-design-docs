# API Versioning Strategy

## Why Version Your APIs?

APIs need to evolve to meet changing business requirements while maintaining compatibility for existing users. Versioning allows you to:

- Add new features without breaking existing clients
- Fix design mistakes in a controlled way
- Provide clear upgrade paths for consumers
- Maintain service reliability during changes

## When to Create a New Version

Create a new version when making **breaking changes**:

- Removing or renaming fields
- Changing field types 
- Adding required fields to requests
- Changing resource URIs
- Modifying authentication requirements

**Non-breaking changes** don't need a new version:

- Adding optional fields or endpoints
- Adding optional query parameters
- Adding new response fields (clients ignore unknown fields)

## Version Format

Use simple major version numbers in the URI path:

```
/v{major}/resource
```

Examples:
```
/v1/customers/{customerId}
/v2/orders
```

**Key Rules:**
- Use only major version numbers (v1, v2, v3)
- Different resources can have different versions
- Once published, don't change a version's contract

## Deprecation Policy

### Timeline
- **Minimum support**: 6 months after deprecation notice
- **High-traffic APIs**: 12+ months of support
- **Critical integrations**: Negotiate specific timelines

### Implementation Steps
1. **Mark as deprecated** in documentation and OpenAPI specs
2. **Add deprecation headers** to responses:
   ```http
   Deprecation: true
   Sunset: Sat, 31 Dec 2025 23:59:59 GMT
   Link: </v2/resource>; rel="successor-version"
   ```
3. **Monitor usage** to track migration progress
4. **Notify clients** of upcoming sunset dates
5. **Return 410 Gone** when ready to remove

## Quick Implementation Steps

1. **Design new version** with breaking changes
2. **Deploy both versions** simultaneously
3. **Add deprecation notices** to old version
4. **Support client migration** with documentation
5. **Monitor usage** of old version
6. **Sunset old version** after minimum support period

## Detailed Resources

For comprehensive guidance, see:

- **Migration Examples**: [examples/versioning/](../examples/versioning/) - Complete scenarios with before/after code
- **Deprecation Reference**: [reference/versioning/](../reference/versioning/) - Detailed policies and HTTP headers
- **Troubleshooting**: [troubleshooting/versioning/](../troubleshooting/versioning/) - Common problems and solutions

## Implementation Notes

These principles apply to any REST API framework. For Spring Boot-specific examples, see the spring-design documentation.