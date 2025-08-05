# Request/Response Format Standards

This directory contains comprehensive documentation for API request and response format standards. These documents provide framework-agnostic guidelines for consistent data exchange across microservices.

## Overview

Consistent request and response formats are crucial for creating predictable, usable APIs. These standards outline the patterns for structuring data exchange across our microservices ecosystem, with emphasis on content types, payload structures, error handling, and collection management.

## Documentation Structure

### 📄 [Content Types and Structure](Content-Types-and-Structure.md)
**Basic request/response patterns and payload structures**
- Standard content types and alternatives
- Request payload validation standards
- Response structure conventions
- HATEOAS link patterns
- Empty/null field handling guidelines

### ❌ [Error Response Standards](Error-Response-Standards.md)
**Comprehensive error handling and RFC 7807 Problem Details**
- HTTP status code guidelines
- Standardized error response formats
- RFC 7807 Problem Details implementation
- Error code naming conventions
- Framework-agnostic error handling patterns

### 📊 [Pagination and Filtering](Pagination-and-Filtering.md)
**Collection response patterns for lists and search results**
- Pagination response structures
- Filtering and search patterns
- Sorting criteria standards
- Advanced query capabilities
- Performance optimization guidelines

### 🌊 [Streaming APIs](Streaming-APIs.md)
**Streaming response formats for real-time and bulk data**
- NDJSON streaming patterns
- Server-Sent Events (SSE) implementation
- Flow control and backpressure handling
- Streaming error management
- Performance considerations for large datasets

## Key Design Principles

### Framework Agnostic
All patterns are based on HTTP and JSON standards, working with any REST framework.

### Consistency First
- Standardized field naming conventions
- Consistent metadata structures
- Uniform error response formats
- Predictable pagination patterns

### Modern Standards
- RFC 7807 Problem Details for errors
- JSON Schema for validation
- HTTP streaming protocols
- OAuth 2.1/OIDC security integration

### Developer Experience
- Clear documentation with examples
- Comprehensive error messages
- Intuitive API contracts
- Excellent debugging capabilities

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
- **Errors**: `application/problem+json` (RFC 7807)
- **Streaming**: `application/x-ndjson`, `text/event-stream`
- **Files**: `multipart/form-data`, `application/octet-stream`

### HTTP Status Codes
- **200**: Success with response body
- **201**: Resource created
- **400**: Client error (validation, format)
- **401**: Authentication required
- **403**: Authorization denied
- **404**: Resource not found
- **422**: Business validation error
- **500**: Server error

### Pagination Parameters
- `page`: Page number (0-indexed)
- `size`: Items per page (default: 20)
- `sort`: Sorting criteria (`field,direction`)

## Implementation Notes

### Validation Integration
Modern APIs should integrate validation with RFC 7807 Problem Details:
- JSON Schema validation
- Standard validation patterns
- Consistent error response formats

### Security Considerations
- OAuth 2.1/OIDC token validation
- Proper HTTP security headers
- Request payload size limits
- Rate limiting implementation

### Performance Optimization
- Efficient pagination strategies
- Database index optimization
- Streaming for large datasets
- Proper HTTP caching headers

## Framework Integration

These standards are framework-agnostic and can be implemented using any REST framework's standard features.

## Related Documentation

- **[API Design Standards](../)**: Complete API design documentation
- **[Spring Design Standards](../../spring-design/)**: Spring Boot-specific implementation patterns
- **[Security Standards](../security/Security Standards.md)**: Security implementation standards
- **[API Version Strategy](../foundations/API Version Strategy.md)**: Versioning strategies and patterns

## Usage Examples

Each document includes comprehensive examples showing:
- Complete HTTP request/response examples
- Error scenario handling
- Edge case management
- Framework integration patterns

These standards ensure consistent, predictable interaction patterns across all APIs in our ecosystem, supporting both traditional REST APIs and modern streaming services.