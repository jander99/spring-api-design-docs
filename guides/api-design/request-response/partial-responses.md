# Partial Responses and Field Selection

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, JSON, basic REST API knowledge  
> **🎯 Key Topics:** Performance, Data Optimization, Architecture
> 
> **📊 Complexity:** 10.8 grade level • 1.2% technical density • fairly difficult

## Why Partial Responses Matter

In many APIs, resources can become quite large. A `User` resource might contain dozens of fields, including profile details, preferences, and related IDs. If a client only needs a user's name and ID to populate a dropdown list, fetching the entire object is wasteful.

Partial responses allow clients to request only the specific fields they need. This pattern is critical for:

- **Mobile Optimization**: Reducing bandwidth usage and improving battery life on mobile devices.
- **Reduced Latency**: Smaller payloads travel faster over the network and require less time for the server to serialize and the client to parse.
- **Improved Performance**: Servers can optimize database queries to fetch only the requested columns, reducing memory and CPU usage.
- **Forward Compatibility**: Clients that request specific fields are less likely to be affected by the addition of new, large fields to a resource.

## Basic Field Selection

The most common way to implement partial responses is through a `fields` query parameter.

### Simple Syntax

Clients provide a comma-separated list of the fields they want to receive.

**Request:**
```http
GET /v1/users/123?fields=id,name,email HTTP/1.1
```

**Response:**
```json
{
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

## Nested Field Selection

Modern APIs often involve nested objects and relationships. There are several ways to represent selection within these structures.

### Parentheses Notation (Recommended)

This notation is highly readable and handles deep nesting efficiently. It is widely used in Google APIs and is the preferred standard for this guide.

**Request:**
```http
GET /v1/orders/456?fields=id,status,customer(id,name),items(productId,quantity) HTTP/1.1
```

**Response:**
```json
{
  "data": {
    "id": "456",
    "status": "SHIPPED",
    "customer": {
      "id": "user-789",
      "name": "Jane Smith"
    },
    "items": [
      {
        "productId": "prod-1",
        "quantity": 2
      }
    ]
  }
}
```

### Dot Notation

Dot notation is simpler to parse but can become repetitive for deeply nested structures.

**Request:**
```http
GET /v1/users/123?fields=id,address.city,address.country HTTP/1.1
```

**Response:**
```json
{
  "data": {
    "id": "123",
    "address": {
      "city": "San Francisco",
      "country": "USA"
    }
  }
}
```

## Google FieldMask Pattern

Google APIs often use a formalized version of field selection called `FieldMask`. This pattern is particularly powerful because it applies to both data retrieval and data updates.

### Retrieval (`field_mask`)

When retrieving data, the `field_mask` parameter tells the server which fields to include in the response.

```http
GET /v1/users/123?field_mask=name,email,profile.avatar HTTP/1.1
```

### Partial Updates (`update_mask`)

One of the most valuable uses of field masks is in `PATCH` requests. The `update_mask` parameter explicitly lists which fields in the request body should be applied to the resource. This avoids ambiguity when fields are omitted or set to null.

**Request:**
```http
PATCH /v1/users/123?update_mask=name,preferences.notifications HTTP/1.1
Content-Type: application/json

{
  "name": "New Name",
  "preferences": {
    "notifications": true
  }
}
```

The server will update ONLY the `name` and `notifications` fields, leaving all other fields (like `email` or other `preferences`) untouched.

## JSON:API Sparse Fieldsets

The [JSON:API](https://jsonapi.org/) specification uses a specialized syntax for field selection known as "sparse fieldsets". This approach is particularly effective when a single request returns multiple resource types (e.g., an article and its included authors).

**Syntax:** `fields[TYPE]=field1,field2`

**Request:**
```http
GET /articles?include=author&fields[articles]=title,body&fields[people]=name HTTP/1.1
```

In this example:
- For the `articles` resource type, only `title` and `body` are returned.
- For the `people` resource type (the authors), only the `name` is returned.

## Performance Implications

Implementing partial responses provides significant performance gains across the entire stack.

### Server-Side Benefits

- **Database Optimization**: Advanced implementations translate field selections directly into SQL `SELECT` clauses, fetching only necessary columns from the database.
- **Reduced Serialization**: Converting large objects to JSON is CPU-intensive. Serializing only requested fields saves significant processing time.
- **Memory Efficiency**: Smaller objects consume less memory during request processing, allowing the server to handle more concurrent requests.

### Client-Side Benefits

- **Smaller Payloads**: Reduced bandwidth usage, which is critical for mobile users and low-latency environments.
- **Faster Parsing**: Clients spend less time parsing JSON and building in-memory objects.
- **Reduced Memory Footprint**: Useful for resource-constrained devices like IoT hardware or low-end mobile phones.

### Caching Considerations

Partial responses can complicate caching strategies. Since different clients may request different field combinations for the same resource, each request potentially creates a unique cache entry.

- **Vary Header**: Ensure the `Vary` header includes the field selection parameter (e.g., `Vary: Accept-Encoding, fields`).
- **Granularity vs. Efficiency**: If the number of possible field combinations is extremely high, cache hit rates may drop significantly. In such cases, consider promoting standard "presets" (see below).

## Implementation Patterns

### Default Field Sets

If a client does not provide a `fields` parameter, the API should return a sensible default set of fields.

- **Minimal Default**: Return only the most essential fields (IDs, names, primary status).
- **Standard Presets**: Offer named presets to simplify common use cases.
  - `?view=summary`: Basic fields for list views.
  - `?view=full`: Every available field (use with caution).

### Field Validation

Strict validation of field names is recommended to help developers find errors quickly.

- **Invalid Fields**: Return a `400 Bad Request` if a client requests a field that does not exist.
- **Shadowing**: Ensure that internal-only fields or sensitive data cannot be requested via field selection.

### Security Considerations

Field selection must not bypass authorization rules.

- **Field-Level Authorization**: Some fields might be visible to administrators but not to regular users. The field selection logic must apply these rules before returning data.
- **Sensitive Data**: Never allow selection of fields like `password_hash`, `internal_id`, or `api_keys`.

## Error Handling

When an invalid field is requested, follow the [RFC 9457 (Problem Details)](error-response-standards.md) standard.

**Response (400 Bad Request):**
```json
{
  "type": "https://api.example.com/problems/invalid-field",
  "title": "Invalid Field Requested",
  "status": 400,
  "detail": "One or more requested fields do not exist on resource 'User'.",
  "invalid_params": [
    {
      "name": "fields",
      "reason": "Field 'nonexistent_field' does not exist"
    }
  ]
}
```

## Related Documentation

- [Pagination and Filtering](pagination-and-filtering.md) - Combining field selection with collection patterns.
- [Content Types and Structure](content-types-and-structure.md) - Standard payload wrappers and meta-data.
- [Performance Standards](../advanced-patterns/performance-standards.md) - Broad optimization strategies for high-performance APIs.
- [Error Response Standards](error-response-standards.md) - Detailed implementation of RFC 9457 error handling.
