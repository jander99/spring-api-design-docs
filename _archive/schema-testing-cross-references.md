# Schema Testing Guide - Cross-Reference Recommendations

This document lists recommended cross-references to add to existing documentation after creating the Schema Testing guide.

## Cross-References to Add

### 1. Advanced Schema Design (`guides/api-design/request-response/advanced-schema-design.md`)

**Location**: End of document, in "Related Documentation" section

**Add**:
```markdown
- [Schema Testing](../testing/schema-testing.md) - Testing schemas for validity and compatibility
```

**Context**: After users learn about schema design patterns, they need to know how to test them.

### 2. OpenAPI Standards (`guides/api-design/documentation/openapi-standards.md`)

**Location**: In "Example Documentation" section or "Related Documentation" section

**Add**:
```markdown
- [Schema Testing](../testing/schema-testing.md) - Validating OpenAPI examples and schemas
```

**Context**: OpenAPI specs need testing to ensure examples match schemas.

### 3. Documentation Testing (`guides/api-design/documentation/documentation-testing.md`)

**Location**: In "What to Test" > "Schema Validation" section

**Update the existing text**:
```markdown
**Schema Validation**
- Request examples match schemas
- Response examples match schemas
- Data types stay consistent
- Fields are marked as required or optional

See [Schema Testing](../testing/schema-testing.md) for detailed schema testing strategies.
```

**Context**: The documentation testing guide mentions schema validation but doesn't have detailed guidance. Link to the comprehensive guide.

### 4. Schema Conventions (`guides/api-design/request-response/schema-conventions.md`)

**Location**: End of document, in "Related Documentation" section

**Add**:
```markdown
- [Schema Testing](../testing/schema-testing.md) - Testing schema validity and compatibility
```

**Context**: After learning conventions, developers should test their schemas follow those conventions.

### 5. API Version Strategy (`guides/api-design/foundations/api-version-strategy.md`)

**Location**: In sections discussing schema versioning or breaking changes

**Add**:
```markdown
For testing schema compatibility and detecting breaking changes, see [Schema Testing](../testing/schema-testing.md).
```

**Context**: Version strategy discusses breaking changes; schema testing shows how to detect them.

### 6. Error Response Standards (`guides/api-design/request-response/error-response-standards.md`)

**Location**: End of document, in "Related Documentation" section

**Add**:
```markdown
- [Schema Testing](../testing/schema-testing.md) - Validating error response schemas
```

**Context**: Error responses have schemas that should be tested.

## Spring Testing Guide Updates

The following Spring-specific testing guides should reference the language-agnostic schema testing concepts:

### 7. Spring Schema Validation (`languages/spring/validation/schema-validation.md`)

**Add introduction**:
```markdown
This guide shows Spring-specific implementations of schema validation patterns. For language-agnostic testing strategies, see [Schema Testing](../../../guides/api-design/testing/schema-testing.md).
```

**Context**: Spring implementation should reference general principles.

### 8. Spring Controller Testing (`languages/spring/testing/unit-testing/controller-unit-testing.md`)

**Add in request/response validation section**:
```markdown
For comprehensive schema testing strategies applicable to any technology, see [Schema Testing](../../../../guides/api-design/testing/schema-testing.md).
```

**Context**: Controller tests validate request/response schemas.

### 9. Spring Contract Testing (`languages/spring/testing/specialized-testing/contract-testing-standards.md`)

**Add introduction or overview**:
```markdown
This guide covers Spring Cloud Contract implementation. For language-agnostic contract testing concepts and schema validation, see [Schema Testing](../../../../guides/api-design/testing/schema-testing.md).
```

**Context**: Contract testing uses schemas as contracts.

### 10. Spring Integration Testing (`languages/spring/testing/integration-testing/api-integration-testing.md`)

**Add in schema validation section**:
```markdown
See [Schema Testing](../../../../guides/api-design/testing/schema-testing.md) for comprehensive schema testing strategies.
```

**Context**: Integration tests validate API schemas.

## Main README Updates

### 11. Main Repository README (`README.md`)

**In the "Testing" section** (if it exists, or create one):
```markdown
### Testing

- **[Schema Testing](guides/api-design/testing/schema-testing.md)** - Validate API schemas, detect breaking changes, ensure compatibility
- **[Documentation Testing](guides/api-design/documentation/documentation-testing.md)** - Test API documentation quality
```

**Context**: Make schema testing discoverable from the main README.

### 12. API Design README (`guides/api-design/README.md`)

**Add to structure overview**:
```markdown
- **[testing/](testing/)** - API testing strategies
  - [Schema Testing](testing/schema-testing.md) - Schema validation and compatibility testing
```

**Context**: Make the new testing section discoverable.

## Priority Order

Implement cross-references in this order:

1. **High Priority** (Direct relationships):
   - Advanced Schema Design
   - OpenAPI Standards
   - Documentation Testing
   - Schema Conventions

2. **Medium Priority** (Related concepts):
   - API Version Strategy
   - Error Response Standards
   - Spring Schema Validation
   - Spring Contract Testing

3. **Low Priority** (Indirect relationships):
   - Spring Controller Testing
   - Spring Integration Testing
   - Main README
   - API Design README

## Notes

- All cross-references use relative paths
- Links are bidirectional where appropriate
- Context is provided for why the cross-reference is relevant
- Spring-specific docs reference general principles, not the other way around
- The language-agnostic guide remains independent of any implementation
