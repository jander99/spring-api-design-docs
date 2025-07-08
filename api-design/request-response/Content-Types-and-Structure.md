# Content Types and Structure

## Overview

This document defines the standard content types and payload structures for API requests and responses. These patterns ensure consistent data exchange across all microservices in our ecosystem.

## Content Types

### Standard Content Type

- Use `application/json` as the default content type for all API requests and responses
- Set appropriate Content-Type headers in both requests and responses

```http
Content-Type: application/json
Accept: application/json
```

### Alternative Content Types

When supporting alternative content types, follow these guidelines:

| Content Type | Use Case | Considerations |
|--------------|----------|----------------|
| `application/xml` | Legacy system integration | Include XML schema references |
| `application/octet-stream` | Binary data transfer | Use with appropriate content length headers |
| `multipart/form-data` | File uploads | Document part specifications clearly |
| `application/x-ndjson` | Streaming JSON data | Newline-delimited JSON for streaming APIs |
| `text/event-stream` | Server-Sent Events | For real-time data streaming |
| `application/problem+json` | RFC 7807 Problem Details | Modern error response format |

## Request Payload Structure

### Basic Request Structure

Keep request payloads focused on the necessary data:

```json
{
  "field1": "value1",
  "field2": "value2",
  "nestedObject": {
    "nestedField": "nestedValue"
  }
}
```

### Validation Rules

1. **Required Fields**: Clearly document required vs. optional fields
2. **Type Validation**: Validate field types and formats (e.g., dates, emails)
3. **Size Limits**: Enforce reasonable size limits on request payloads

### Request Validation Standards

Implement consistent validation across all APIs:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "customerId": {
      "type": "string",
      "minLength": 1,
      "description": "Customer ID is required"
    },
    "items": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/definitions/OrderItem" },
      "description": "At least one item is required"
    },
    "contactEmail": {
      "type": "string",
      "format": "email",
      "description": "Valid email address is required"
    },
    "orderDate": {
      "type": "string",
      "format": "date-time",
      "description": "Order date in ISO 8601 format"
    }
  },
  "required": ["customerId", "items", "contactEmail"]
}
```

**Validation Response Integration**: Modern APIs should return RFC 7807 Problem Details format for validation errors. See [Error Response Standards](Error-Response-Standards.md) for detailed error handling patterns.

### Bulk Operations

For bulk operations, use a consistent array wrapper:

```json
{
  "items": [
    { "id": "item1", "name": "First Item" },
    { "id": "item2", "name": "Second Item" }
  ],
  "options": {
    "processingMode": "all-or-nothing"
  }
}
```

## Response Payload Structure

### Standard Response Structure

All response bodies should follow this general structure:

```json
{
  "data": {
    // Primary resource data
  },
  "meta": {
    "timestamp": "2024-07-15T14:32:22Z",
    "requestId": "req-12345"
  }
}
```

### Collection Response Structure

For collection endpoints (returning multiple resources):

```json
{
  "data": [
    { "id": "item1", "name": "First Item" },
    { "id": "item2", "name": "Second Item" }
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    },
    "timestamp": "2023-04-15T14:32:22Z"
  }
}
```

For detailed pagination patterns, see [Pagination and Filtering](Pagination-and-Filtering.md).

### Empty/Null Field Handling

1. **Omit vs. Null**: Prefer omitting fields over including null values
2. **Empty Collections**: Return empty arrays (`[]`) rather than null for empty collections
3. **Default Values**: Document default values for fields when appropriate

## HATEOAS Links (Optional)

For more sophisticated APIs, consider including hypermedia links:

```json
{
  "data": {
    "id": "order-12345",
    "status": "PROCESSING"
  },
  "links": {
    "self": {"href": "/v1/orders/order-12345"},
    "items": {"href": "/v1/orders/order-12345/items"},
    "cancel": {"href": "/v1/orders/order-12345/cancel", "method": "POST"}
  },
  "meta": { ... }
}
```

## Examples

### Single Resource Response

**GET /v1/customers/{customerId}**

Response:
```json
{
  "data": {
    "id": "cust-12345",
    "name": "Example Customer",
    "email": "customer@example.com",
    "status": "ACTIVE",
    "createdDate": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2024-07-15T14:32:22Z",
    "requestId": "req-12345"
  }
}
```

## Implementation Notes

When implementing these request/response formats:

- **Framework-specific examples**: For Spring Boot implementations, see the spring-design standards documentation
- **Validation libraries**: Use JSON Schema validation or framework-specific validation that produces RFC 7807 responses
- **Content negotiation**: Implement proper Accept header handling for different response formats

These patterns work with any REST framework (Express.js, FastAPI, Django REST Framework, Spring Boot, etc.) and are based on HTTP and JSON standards.

## Related Documentation

- [Error Response Standards](Error-Response-Standards.md) - Error handling and RFC 7807 Problem Details
- [Pagination and Filtering](Pagination-and-Filtering.md) - Collection response patterns
- [Streaming APIs](Streaming-APIs.md) - Streaming response formats