# Request/Response Format

## Overview

Consistent request and response formats are crucial for creating predictable, usable APIs. This document outlines the standards for structuring data exchange across our microservices ecosystem, with emphasis on content types, payload structures, error handling, and pagination patterns.

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
    "timestamp": "2023-04-15T14:32:22Z",
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

### Empty/Null Field Handling

1. **Omit vs. Null**: Prefer omitting fields over including null values
2. **Empty Collections**: Return empty arrays (`[]`) rather than null for empty collections
3. **Default Values**: Document default values for fields when appropriate

## Error Handling

### HTTP Status Codes

Use appropriate HTTP status codes for different error scenarios:

| Status Code | Description | Example Usage |
|-------------|-------------|---------------|
| 400 Bad Request | Invalid request format or parameters | Missing required field, invalid format |
| 401 Unauthorized | Authentication required | Missing or invalid authentication token |
| 403 Forbidden | Authenticated but not authorized | User lacks required permissions |
| 404 Not Found | Resource not found | Requested entity doesn't exist |
| 409 Conflict | Request conflicts with current state | Duplicate entity, outdated version |
| 422 Unprocessable Entity | Validation errors | Business rule violations |
| 429 Too Many Requests | Rate limit exceeded | Client has sent too many requests |
| 500 Internal Server Error | Unexpected server error | Unhandled exceptions, system errors |

### Error Response Structure

All error responses should follow this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid parameters",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email address is not properly formatted"
      }
    ]
  },
  "meta": {
    "timestamp": "2023-04-15T14:32:22Z",
    "requestId": "req-12345"
  }
}
```

### Error Code Standards

1. **Unique Error Codes**: Define unique, descriptive error codes
2. **Domain Prefixes**: Prefix error codes with domain area (e.g., `ORD_` for order-related errors)
3. **Versioned Error Codes**: Maintain backward compatibility of error codes across versions

## Pagination, Filtering, and Sorting

### Pagination Response Structure

Paginated responses must include these metadata fields:

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 0,          // Current page (0-indexed)
      "size": 20,         // Items per page
      "totalElements": 54, // Total items across all pages
      "totalPages": 3     // Total number of pages
    }
  }
}
```

### Filtering Response Structure

When filters are applied, include them in the metadata:

```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "status": "ACTIVE",
      "createdAfter": "2023-01-01"
    }
  }
}
```

### Sorting Response Structure

When sorting is applied, include sort criteria in the metadata:

```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "sort": [
      {"field": "createdDate", "direction": "DESC"},
      {"field": "total", "direction": "ASC"}
    ]
  }
}
```

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

## Reactive API Considerations

### Streaming Responses

For streaming endpoints using reactive programming:

1. **Content-Type**: Use `application/stream+json` for JSON streaming
2. **Chunked Transfer**: Ensure proper chunked transfer encoding
3. **Individual Items**: Each streamed item should be a complete, valid JSON object

### Back-pressure Signaling

Document how clients can signal back-pressure capabilities:

```http
Prefer: respond-async
```

## Examples

### Request/Response Examples

**GET /v1/customers/{customerId}**

Response:
```json
{
  "data": {
    "id": "cust-12345",
    "name": "Example Customer",
    "email": "customer@example.com",
    "status": "ACTIVE",
    "createdDate": "2023-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2023-04-15T14:32:22Z",
    "requestId": "req-12345"
  }
}
```

**GET /v1/orders?status=PROCESSING&page=0&size=2**

Response:
```json
{
  "data": [
    {
      "id": "order-12345",
      "customerId": "cust-12345",
      "total": 99.95,
      "status": "PROCESSING",
      "createdDate": "2023-04-14T09:15:00Z"
    },
    {
      "id": "order-12346",
      "customerId": "cust-67890",
      "total": 149.50,
      "status": "PROCESSING",
      "createdDate": "2023-04-14T10:22:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 2,
      "totalElements": 54,
      "totalPages": 27
    },
    "filters": {
      "status": "PROCESSING"
    },
    "timestamp": "2023-04-15T14:32:22Z",
    "requestId": "req-12345"
  }
}
```

**Validation Error Example**

```json
{
  "error": {
    "code": "ORD_VALIDATION_ERROR",
    "message": "Order validation failed",
    "details": [
      {
        "field": "shippingAddress.zipCode",
        "code": "REQUIRED",
        "message": "Zip code is required"
      },
      {
        "field": "paymentMethod",
        "code": "INVALID_VALUE",
        "message": "Payment method must be one of: CREDIT_CARD, PAYPAL, BANK_TRANSFER"
      }
    ]
  },
  "meta": {
    "timestamp": "2023-04-15T14:32:22Z",
    "requestId": "req-12345"
  }
}
```

These standards ensure consistent, predictable interaction patterns across all microservices in our ecosystem.