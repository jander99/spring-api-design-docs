# API Versioning Strategy

## Overview

A clear versioning strategy enables API evolution while maintaining backward compatibility where needed. This document outlines our approach to versioning APIs across our microservice ecosystem, with emphasis on URI-based versioning, deprecation policies, and compatibility requirements.

## URI-Based Versioning

### Version Format

All APIs should include a version designation in the URI path:

```
/v{major}/resource
```

Examples:
```
/v1/customers/{customerId}
/v2/orders
```

### Version Specification Rules

1. **No Version is Version 1**: For backward compatibility with existing services, endpoints without an explicit version are considered v1. However:
   - All new services MUST include explicit versions
   - Legacy services should be updated to support both `/resource` and `/v1/resource` (using HTTP redirects or controller mappings)

2. **Major Version Increments Only**: URI versions should change only for breaking changes, using only major version numbers

3. **Version Aliasing**: Implementing services must ensure both these URIs resolve to the same resource:
   ```
   /v1/orders/{orderId}
   /orders/{orderId}  (legacy pattern)
   ```

4. **Independent Resource Versioning**: Different resources may have different versions within the same service
   ```
   /v1/customers/{customerId}
   /v2/orders
   ```

5. **Version Persistence**: Once a versioned API is published, its contract must not be altered in a breaking way

## Deprecation Policy

### Marking Endpoints as Deprecated

1. **Documentation**: Mark deprecated endpoints in API documentation and OpenAPI specifications
   ```yaml
   # OpenAPI 3.1+ specification
   /v1/resource:
     get:
       deprecated: true
       summary: "Get resource (deprecated)"
       description: "This endpoint is deprecated. Use /v2/resource instead."
   ```

2. **Response Headers**: Include deprecation headers in responses from deprecated endpoints following RFC 8594
   ```http
   HTTP/1.1 200 OK
   Deprecation: true
   Sunset: Sat, 31 Dec 2025 23:59:59 GMT
   Link: </v2/resource>; rel="successor-version"
   Warning: 299 - "This API version is deprecated and will be removed on 2025-12-31"
   Content-Type: application/json
   ```

3. **Monitoring**: Implement metrics to track usage of deprecated endpoints to inform sunset decisions

### Strangulation Pattern Implementation

For migrating from older to newer API versions:

1. **Dual Support Phase**:
   - Deploy new API version (v2)
   - Maintain old version (v1)
   - Add deprecation notices to v1
   - Monitor usage of v1 endpoints

2. **Client Migration Phase**:
   - Actively notify clients of upcoming sunset date
   - Provide migration documentation
   - Offer support for updating client implementations

3. **Sunsetting Phase**:
   - Return 410 Gone status with informational message for minor traffic
   ```http
   HTTP/1.1 410 Gone
   Content-Type: application/problem+json
   
   {
     "type": "https://example.com/problems/version-deprecated",
     "title": "API Version Deprecated",
     "status": 410,
     "detail": "This API version has been removed. Please use v2.",
     "instance": "/v1/orders/123"
   }
   ```
   - Eventually remove v1 implementation when traffic drops below threshold

### Support Timeframes

1. **Minimum Support Duration**: Deprecated endpoints must be supported for at least 6 months after deprecation notice
2. **Extended Support**: High-traffic deprecated endpoints may require 12+ months of support
3. **Negotiated Sunsetting**: For critical external integrations, specific sunset plans may be negotiated with key customers

## Backward Compatibility

### When Breaking Changes are Acceptable

Breaking changes (requiring a version increment) include:

1. Removing or renaming fields in request/response
2. Changing field types in a non-compatible way
3. Adding new required fields to requests
4. Changing resource URIs
5. Changing authentication or authorization requirements

### Non-Breaking Changes (No Version Change Needed)

1. Adding new optional endpoints
2. Adding new optional request fields (with defaults)
3. Adding new response fields (existing clients will ignore)
4. Adding query parameters with default behaviors
5. Extending enumeration values (with proper fallback handling)

### Data Field Deprecation

For evolving APIs without version changes:

1. **Field Deprecation Markers**: Document deprecated fields in OpenAPI spec
   ```yaml
   properties:
     oldField:
       type: string
       deprecated: true
       description: "Deprecated - use newField instead"
   ```

2. **Dual-Field Support**: Maintain both old and new fields during transition
   ```json
   {
     "oldField": "value",     // Deprecated
     "newField": "value"      // New field with same data
   }
   ```

3. **Response Shaping**: Consider allowing clients to request fields be excluded via query parameters
   ```
   /v1/resource?fields=id,name,address
   ```

### Data Response Consistency

1. **Required Fields**: New versions must continue to provide all non-deprecated data from previous versions
2. **Response Formatting**: Structure format should be maintained for compatibility (e.g., pagination structure)
3. **Default Values**: Use sensible defaults when older fields can't be directly mapped to new data models

## API Evolution without Version Changes

### Expansion Pattern

Add new capabilities without breaking changes:

1. **New Optional Parameters**: Add query parameters with defaults matching previous behavior
2. **Extended Response Data**: Add new fields to existing responses
3. **Optional Endpoints**: Add new endpoints for new capabilities

## Modern API Considerations

### HTTP Standards and Best Practices

1. **HTTP Problem Details**: Leverage RFC 7807 Problem Details for consistent error responses across versions
   ```http
   HTTP/1.1 410 Gone
   Content-Type: application/problem+json
   
   {
     "type": "https://example.com/problems/version-deprecated",
     "title": "API Version Deprecated",
     "status": 410,
     "detail": "This API version has been removed. Please use v2.",
     "instance": "/v1/orders/123"
   }
   ```

2. **Content Negotiation**: Consider using Accept headers for minor version changes within major versions
   ```http
   GET /api/orders HTTP/1.1
   Accept: application/vnd.api+json;version=1.2
   Host: api.example.com
   ```

3. **Version Discovery**: Provide version information in response headers
   ```http
   HTTP/1.1 200 OK
   API-Version: 1.0
   API-Supported-Versions: 1.0, 1.1, 2.0
   Content-Type: application/json
   ```

### Error Response Versioning

Maintain consistent error response formats across versions while allowing for evolution:

1. **Version-Specific Error Codes**: Use prefixed error codes to avoid conflicts
   ```
   V1_VALIDATION_ERROR vs V2_VALIDATION_ERROR
   ```

2. **Backward-Compatible Error Fields**: Ensure error response structure remains consistent
   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Request validation failed",
       "version": "1.0"
     }
   }
   ```

3. **Standard Error Formats**: Use RFC 7807 Problem Details for modern APIs
   ```json
   {
     "type": "https://example.com/problems/validation-error",
     "title": "Validation Error",
     "status": 400,
     "detail": "Request validation failed",
     "instance": "/v1/orders",
     "api_version": "1.0"
   }
   ```

## Migration Examples

### Example 1: Adding a new field (Non-breaking)

1. Add new optional field to response
2. Clients that don't expect it will ignore it
3. New clients can begin using the new field

### Example 2: Replacing a field (Breaking)

1. Create new API version with new field
2. Support both versions during transition
3. Implement strangulation pattern
4. Eventually sunset old version

## Versioning Decision Flowchart

```
Is the change breaking?
├── No → Make change in current version
│       Add documentation
│       Test backward compatibility
│
└── Yes → Create new major version
        Support both versions
        Implement strangulation pattern
        Set deprecation timeline
```

This versioning strategy ensures APIs can evolve while providing reliable interfaces for client applications. These patterns align with modern HTTP standards like RFC 7807 Problem Details and provide a robust foundation for API evolution across different implementation technologies.

## Implementation Notes

When implementing these versioning strategies:

- **Framework-specific examples**: For Spring Boot implementations, see the spring-design standards documentation
- **OpenAPI documentation**: Use OpenAPI 3.1+ specifications to document version deprecation
- **Monitoring tools**: Implement API usage monitoring to track version adoption
- **Client libraries**: Provide version-aware client libraries when possible

The principles outlined here apply regardless of the underlying technology stack, whether using REST frameworks in Java, Python, Node.js, or other platforms.