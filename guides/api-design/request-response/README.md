# Request/Response Format Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 2 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** REST, JSON, HTTP
> 
> **📊 Complexity:** 11.6 grade level • 2.7% technical density • fairly difficult

Format API requests and responses. Use these guides with any technology. Keep APIs consistent.

## Overview

Good formats make APIs easy. They help users. Structure data well. We cover content types. We cover errors. We cover collections.

## Documentation Structure

### 📄 [Content Types and Structure](content-types-and-structure.md)
**Structure requests and responses**
- Content types
- Validation
- Response structure
- HATEOAS links
- Empty fields

### 🔤 [Schema Conventions](schema-conventions.md)
**JSON field names and formats**
- Field naming
- Date formats
- Null handling
- Enum patterns
- Number formats

### 🔄 [Content Negotiation](content-negotiation.md)
**Select media types**
- Accept headers
- Type versions
- Language
- Encoding
- Compression

### ❌ [Error Response Standards](error-response-standards.md)
**Handle errors**
- Status codes
- Error formats
- RFC 7807
- Code names
- Error patterns

### 📊 [Pagination and Filtering](pagination-and-filtering.md)
**Collection responses**
- Pagination
- Filtering
- Sorting
- Queries
- Performance

### 🔧 [Advanced Schema Design](advanced-schema-design.md)
**Complex schemas**
- Schema composition
- Reusable parts
- OpenAPI setup
- Schema changes
- Compatibility
- Validation

### 🌊 [Streaming APIs](streaming-apis.md)
**Streaming responses**
- NDJSON streaming
- Server-Sent Events
- Flow control
- Error handling
- Performance

## Design Principles

### Any Framework
Use with any REST framework. Based on HTTP and JSON.

### Be Consistent
- Same field names
- Same metadata
- Same error format
- Same pagination

### Modern Standards
- RFC 7807 for errors
- JSON Schema
- HTTP streaming
- OAuth 2.1

### Good Experience
- Clear examples
- Helpful errors
- Simple contracts
- Easy debugging

## Common Patterns

### Standard Response Wrapper
```json
{
  "data": {
    // Resource data or array of resources
  },
  "meta": {
    "timestamp": "2024-07-15T14:32:22Z",
    "requestId": "req-12345"
  }
}
```

### Error Response Format
```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid parameters",
  "instance": "/v1/orders",
  "errors": [...]
}
```

### Collection Response
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    }
  }
}
```

## Quick Reference

### Content Types
- **Default**: `application/json`
- **Errors**: `application/problem+json`
- **Streaming**: `application/x-ndjson`, `text/event-stream`
- **Files**: `multipart/form-data`, `application/octet-stream`

### Schema Rules
- **Field Names**: Use camelCase
- **Dates**: Use ISO 8601
- **Nulls**: Omit null fields
- **Enums**: Use UPPER_SNAKE_CASE
- **Booleans**: Use `true` or `false`

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad request
- **401**: Not authenticated
- **403**: Not authorized
- **404**: Not found
- **422**: Validation error
- **500**: Server error

### Pagination Parameters
- `page`: Page number
- `size`: Items per page
- `sort`: Sort order

## Implementation

### Validation
Use validation with RFC 7807:
- Use JSON Schema
- Use standard patterns
- Use same formats

### Security
- Validate OAuth tokens
- Use security headers
- Limit request size
- Use rate limiting

### Performance
- Use good pagination
- Optimize indexes
- Stream large data
- Use caching

## Framework Use

Works with any REST framework. Uses standard features.

## Related Docs

- **[API Design Standards](../)**: Full API design
- **[Spring Design Standards](../../../languages/spring/)**: Spring Boot
- **[Security Standards](../security/security-standards.md)**: Security
- **[API Version Strategy](../foundations/api-version-strategy.md)**: Versioning

## Examples

Each document has examples:
- HTTP requests
- HTTP responses
- Error handling
- Edge cases
- Framework use

These standards create consistent APIs. They work for REST and streaming.