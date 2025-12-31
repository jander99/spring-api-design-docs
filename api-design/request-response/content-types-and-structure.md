# Content Types and Structure

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 3 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** REST, Architecture, Data
> 
> **📊 Complexity:** 13.7 grade level • 3.2% technical density • difficult

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
| `application/problem+json` | RFC 9457 Problem Details | Modern error response format |

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

**Validation Response Integration**: Modern APIs should return RFC 9457 Problem Details format for validation errors. See [Error Response Standards](error-response-standards.md) for detailed error handling patterns.

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

For detailed pagination patterns, see [Pagination and Filtering](pagination-and-filtering.md).

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

### Choosing a Response Pattern

Two common response patterns exist. Choose based on your API's maturity level:

| Pattern | Structure | Best For |
|---------|-----------|----------|
| **Envelope Pattern** | `{"data": {...}, "meta": {...}}` | Most REST APIs (RMM Level 2) |
| **HAL/HATEOAS Pattern** | `{"id": ..., "_links": {...}}` | Hypermedia APIs (RMM Level 3) |

**Envelope Pattern** (Recommended for most APIs):
- Separates resource data from metadata
- Consistent structure across all endpoints
- Easy to add pagination, timestamps, request IDs

**HAL/HATEOAS Pattern**:
- Resources include hypermedia links
- Self-describing responses
- Best for public APIs requiring discoverability

You can combine patterns by including `_links` within the `data` object:

```json
{
  "data": {
    "id": "order-123",
    "status": "PROCESSING",
    "_links": {
      "self": {"href": "/v1/orders/order-123"},
      "cancel": {"href": "/v1/orders/order-123/cancel"}
    }
  },
  "meta": {
    "timestamp": "2024-07-15T14:32:22Z"
  }
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

- **Validation**: Use JSON Schema validation or standard validation patterns that produce RFC 9457 responses
- **Content negotiation**: Implement proper Accept header handling for different response formats

These patterns are based on HTTP and JSON standards and work with any REST framework.

## Common Mistakes

### ❌ Inconsistent Response Envelopes

**Problem:**
```http
GET /orders/123 HTTP/1.1

{
  "id": "123",
  "status": "SHIPPED"
}

GET /customers/456 HTTP/1.1

{
  "data": {
    "id": "456",
    "name": "Acme Corp"
  },
  "meta": { ... }
}
```

**Why it's wrong:** Clients cannot rely on a consistent structure. Some responses have envelopes, others don't. This forces special handling for each endpoint.

**✅ Correct approach:**
```http
GET /orders/123 HTTP/1.1

{
  "data": {
    "id": "123",
    "status": "SHIPPED"
  },
  "meta": {
    "timestamp": "2024-07-15T14:32:22Z"
  }
}
```

---

### ❌ Returning Null Instead of Empty Collections

**Problem:**
```http
GET /customers/123/orders HTTP/1.1

{
  "data": null
}
```

**Why it's wrong:** Clients must add null checks before iterating. This creates ambiguity—does `null` mean "no orders" or "orders not loaded"?

**✅ Correct approach:**
```http
GET /customers/123/orders HTTP/1.1

{
  "data": [],
  "meta": {
    "pagination": {
      "totalElements": 0,
      "totalPages": 0
    }
  }
}
```

---

### ❌ Missing Content-Type Headers

**Problem:**
```http
POST /orders HTTP/1.1

{"customerId": "123", "items": [...]}
```

**Why it's wrong:** Without `Content-Type`, servers may reject the request or misparse the body. Responses without this header leave clients guessing the format.

**✅ Correct approach:**
```http
POST /orders HTTP/1.1
Content-Type: application/json
Accept: application/json

{"customerId": "123", "items": [...]}
```

---

### ❌ Embedding Metadata in Resource Objects

**Problem:**
```http
GET /orders/123 HTTP/1.1

{
  "id": "123",
  "status": "SHIPPED",
  "timestamp": "2024-07-15T14:32:22Z",
  "requestId": "req-12345",
  "serverVersion": "2.1.0"
}
```

**Why it's wrong:** Mixing resource data with request metadata pollutes the domain model. Clients cannot easily separate business data from operational data.

**✅ Correct approach:**
```http
GET /orders/123 HTTP/1.1

{
  "data": {
    "id": "123",
    "status": "SHIPPED"
  },
  "meta": {
    "timestamp": "2024-07-15T14:32:22Z",
    "requestId": "req-12345"
  }
}
```

---

### ❌ Inconsistent Date Formats

**Problem:**
```http
GET /orders/123 HTTP/1.1

{
  "data": {
    "createdDate": "07/15/2024",
    "shippedAt": "2024-07-16T10:30:00Z",
    "deliveryDate": "July 18, 2024"
  }
}
```

**Why it's wrong:** Multiple date formats require clients to implement multiple parsers. Locale-specific formats cause confusion across regions.

**✅ Correct approach:**
```http
GET /orders/123 HTTP/1.1

{
  "data": {
    "createdDate": "2024-07-15T08:00:00Z",
    "shippedAt": "2024-07-16T10:30:00Z",
    "deliveryDate": "2024-07-18T14:00:00Z"
  }
}
```

---

### ❌ Using Arrays as Root Response Element

**Problem:**
```http
GET /orders HTTP/1.1

[
  {"id": "123", "status": "SHIPPED"},
  {"id": "124", "status": "PENDING"}
]
```

**Why it's wrong:** No room for pagination metadata, timestamps, or links. Adding metadata later breaks existing clients. Also vulnerable to JSON hijacking in older browsers.

**✅ Correct approach:**
```http
GET /orders HTTP/1.1

{
  "data": [
    {"id": "123", "status": "SHIPPED"},
    {"id": "124", "status": "PENDING"}
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "totalElements": 2
    }
  }
}
```

## Related Documentation

### Core Standards
- [Resource Naming and URL Structure](../foundations/resource-naming-and-url-structure.md) - URL design and HTTP methods
- [Data Modeling Standards](../foundations/data-modeling-standards.md) - Entity design and field conventions
- [Error Response Standards](error-response-standards.md) - RFC 9457 Problem Details format

### Request/Response Patterns
- [Pagination and Filtering](pagination-and-filtering.md) - Collection response patterns
- [Streaming APIs](streaming-apis.md) - Streaming response formats
- [HTTP Client Best Practices](http-client-best-practices.md) - Client-side implementation

### Advanced Topics
- [Async and Batch Patterns](../advanced-patterns/async-batch-patterns.md) - Bulk operations handling
- [Performance Standards](../advanced-patterns/performance-standards.md) - Caching and content negotiation

### Documentation
- [OpenAPI Standards](../documentation/openapi-standards.md) - API specification and schemas

### Quick Reference
- [HTTP Methods Quick Reference](../quick-reference/README.md) - Method and status code guide