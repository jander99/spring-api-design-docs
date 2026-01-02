# Content Negotiation

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 12 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 12.7 grade level • 1.0% technical density • fairly difficult

## Overview

Content negotiation enables clients and servers to select the best representation from available options. This document covers HTTP content negotiation patterns using Accept headers, quality values, and media types.

## Accept Header Negotiation

### Basic Accept Header

The Accept header tells servers which media types the client can handle:

```http
GET /v1/customers/cust-123 HTTP/1.1
Host: api.example.com
Accept: application/json
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "cust-123",
  "name": "Example Customer"
}
```

### Multiple Media Types

Clients can accept multiple formats:

```http
GET /v1/products/prod-456 HTTP/1.1
Host: api.example.com
Accept: application/json, application/xml
```

The server chooses the best match from available formats.

### Wildcard Matching

Use wildcards to accept broad categories:

```http
Accept: text/*
```

Matches any text type (text/plain, text/html, text/csv).

```http
Accept: */*
```

Matches any media type.

## Quality Values

### Quality Parameter (q=)

Quality values (q-values) indicate preference strength. Values range from 0 (not acceptable) to 1 (most preferred):

```http
Accept: application/json;q=1.0, application/xml;q=0.8, text/plain;q=0.5
```

This means:
- JSON is most preferred (q=1.0)
- XML is second choice (q=0.8)
- Plain text is acceptable but least preferred (q=0.5)

### Default Quality Value

When no q-value is specified, the default is 1.0:

```http
Accept: application/json, application/xml;q=0.8
```

This is the same as:

```http
Accept: application/json;q=1.0, application/xml;q=0.8
```

### Quality Value Examples

**Example 1**: Prefer JSON, accept XML if needed

```http
GET /v1/orders HTTP/1.1
Accept: application/json;q=1.0, application/xml;q=0.5
```

**Example 2**: Accept JSON or fall back to any format

```http
GET /v1/reports HTTP/1.1
Accept: application/json, */*;q=0.1
```

**Example 3**: Explicit rejection

```http
Accept: application/json, application/xml;q=0
```

The q=0 means XML is not acceptable.

## Language Negotiation

### Accept-Language Header

Indicates preferred natural languages for content:

```http
GET /v1/help/getting-started HTTP/1.1
Accept-Language: en-US, en;q=0.9, es;q=0.8
```

This means:
- Prefer US English (en-US)
- Accept any English (en) with q=0.9
- Accept Spanish (es) with q=0.8

### Language Tags

Use standard language tags (RFC 5646):

- `en` - English
- `en-US` - US English
- `en-GB` - British English
- `es` - Spanish
- `es-MX` - Mexican Spanish
- `fr` - French
- `fr-CA` - Canadian French

### Language Response

Server indicates chosen language:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Language: en-US

{
  "title": "Getting Started",
  "content": "Welcome to our API..."
}
```

### Multiple Language Example

Request:
```http
GET /v1/documentation/overview HTTP/1.1
Accept-Language: da, en-gb;q=0.8, en;q=0.7
```

This means:
- Prefer Danish (da) with default q=1.0
- Accept British English (en-GB) with q=0.8
- Accept any English (en) with q=0.7

Response when Danish is available:
```http
HTTP/1.1 200 OK
Content-Language: da

{
  "title": "Oversigt",
  "description": "Velkommen til vores API"
}
```

## Encoding Negotiation

### Accept-Encoding Header

Specifies acceptable content encodings for compression:

```http
GET /v1/reports/large-dataset HTTP/1.1
Accept-Encoding: gzip, deflate, br
```

Common encodings:
- `gzip` - GNU zip compression
- `deflate` - Deflate compression
- `br` - Brotli compression
- `compress` - Unix compress
- `identity` - No encoding (uncompressed)

### Encoding with Quality Values

```http
Accept-Encoding: gzip;q=1.0, deflate;q=0.8, *;q=0.1
```

This means:
- Prefer gzip
- Accept deflate as second choice
- Accept any other encoding with low priority

### Encoding Response

Server indicates applied encoding:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Encoding: gzip

<compressed binary data>
```

### No Encoding Preference

```http
Accept-Encoding: identity;q=1.0, *;q=0
```

This requests uncompressed content and rejects all compression.

## Custom Media Types

### Vendor-Specific Media Types

Use custom media types for specialized formats:

```http
Accept: application/vnd.example.v1+json
```

Pattern: `application/vnd.{vendor}.{version}+{format}`

Examples:
- `application/vnd.github.v3+json` - GitHub API v3
- `application/vnd.example.order+xml` - Custom order format
- `application/vnd.api+json` - JSON:API specification

### Custom Media Type Request

```http
GET /v1/orders/order-123 HTTP/1.1
Accept: application/vnd.example.order.v2+json
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.example.order.v2+json

{
  "apiVersion": "2.0",
  "data": {
    "orderId": "order-123",
    "status": "processing"
  }
}
```

### Media Type Parameters

Add parameters to media types:

```http
Accept: application/json; charset=utf-8; version=2
```

Common parameters:
- `charset` - Character encoding
- `version` - Format version
- `profile` - Schema profile

## Media Type Versioning

### Version in Media Type

Embed version information in the media type:

```http
GET /orders/order-123 HTTP/1.1
Accept: application/vnd.example.v2+json
```

This approach allows different versions to coexist:

**Version 1 Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.example.v1+json

{
  "orderId": "order-123",
  "status": "processing"
}
```

**Version 2 Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.example.v2+json

{
  "apiVersion": "2.0",
  "data": {
    "id": "order-123",
    "processingStatus": "IN_PROGRESS"
  }
}
```

### Version Parameter

Use media type parameters for versions:

```http
Accept: application/json; version=2
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json; version=2

{
  "version": "2.0",
  "data": {...}
}
```

### Multiple Version Acceptance

Accept multiple versions with quality values:

```http
Accept: application/vnd.example.v3+json;q=1.0,
        application/vnd.example.v2+json;q=0.9,
        application/vnd.example.v1+json;q=0.7
```

Server returns the best match from available versions.

## Proactive vs Reactive Negotiation

### Proactive Negotiation

Server selects format based on request headers (shown in examples above).

Client sends preferences:
```http
GET /v1/products HTTP/1.1
Accept: application/json, application/xml;q=0.8
Accept-Language: en-US, es;q=0.9
Accept-Encoding: gzip
```

Server chooses best match:
```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Language: en-US
Content-Encoding: gzip
```

### Reactive Negotiation

Server provides links to different representations.

Request:
```http
GET /v1/reports/monthly-summary HTTP/1.1
```

Response with alternatives:
```http
HTTP/1.1 300 Multiple Choices
Content-Type: application/json

{
  "alternatives": [
    {
      "type": "application/json",
      "href": "/v1/reports/monthly-summary.json"
    },
    {
      "type": "application/xml",
      "href": "/v1/reports/monthly-summary.xml"
    },
    {
      "type": "application/pdf",
      "href": "/v1/reports/monthly-summary.pdf"
    }
  ]
}
```

Client then selects desired format:
```http
GET /v1/reports/monthly-summary.json HTTP/1.1
```

## Vary Header

### Cache Key Expansion

The Vary header tells caches which request headers affect the response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Vary: Accept, Accept-Language

{...}
```

This means responses vary based on Accept and Accept-Language headers.

### Multiple Vary Headers

```http
Vary: Accept-Encoding, Accept-Language
```

Caches must consider both headers when matching cached responses.

### Vary Wildcard

```http
Vary: *
```

This signals that anything might affect the response. Caches cannot determine matching.

## Not Acceptable Response

### 406 Status Code

When server cannot satisfy Accept headers:

Request:
```http
GET /v1/customers/cust-123 HTTP/1.1
Accept: application/pdf
```

Response:
```http
HTTP/1.1 406 Not Acceptable
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/not-acceptable",
  "title": "Not Acceptable",
  "status": 406,
  "detail": "The requested format is not available",
  "availableFormats": [
    "application/json",
    "application/xml"
  ]
}
```

### Handling 406 Errors

Best practices:
- List available formats in error response
- Provide links to supported representations
- Consider accepting */* as fallback
- Document supported formats clearly

## Practical Examples

### Example 1: JSON API with Compression

Request:
```http
GET /v1/orders HTTP/1.1
Host: api.example.com
Accept: application/json
Accept-Encoding: gzip, deflate
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Encoding: gzip
Vary: Accept-Encoding

<gzip compressed JSON data>
```

### Example 2: Multilingual API

Request:
```http
GET /v1/products/prod-789 HTTP/1.1
Accept: application/json
Accept-Language: es-MX, es;q=0.9, en;q=0.8
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Language: es-MX
Vary: Accept-Language

{
  "id": "prod-789",
  "nombre": "Producto de Ejemplo",
  "descripcion": "Una descripción en español mexicano",
  "precio": {
    "cantidad": 99.99,
    "moneda": "MXN"
  }
}
```

### Example 3: API Version Negotiation

Request:
```http
GET /customers/cust-456 HTTP/1.1
Accept: application/vnd.example.v2+json,
        application/vnd.example.v1+json;q=0.8,
        application/json;q=0.5
```

Server has v2 available:
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.example.v2+json
Vary: Accept

{
  "apiVersion": "2.0",
  "data": {
    "customerId": "cust-456",
    "profile": {
      "displayName": "Jane Smith",
      "primaryEmail": "jane@example.com"
    }
  }
}
```

### Example 4: Complex Negotiation

Request with multiple preferences:
```http
GET /v1/reports/quarterly HTTP/1.1
Accept: application/vnd.example+json;q=1.0,
        application/json;q=0.9,
        application/xml;q=0.5
Accept-Language: en-US, en;q=0.9, fr;q=0.7
Accept-Encoding: br, gzip;q=0.9, *;q=0.1
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.example+json
Content-Language: en-US
Content-Encoding: br
Vary: Accept, Accept-Language, Accept-Encoding

<Brotli compressed custom JSON>
```

## Implementation Guidelines

### Server-Side Best Practices

1. **Support Common Formats**: At minimum, support application/json
2. **Default Format**: Define a default when Accept is missing
3. **Quality Value Handling**: Respect client quality preferences
4. **Vary Header**: Always send Vary when content varies
5. **406 Responses**: Provide helpful error messages with available options

### Client-Side Best Practices

1. **Explicit Preferences**: Always send Accept headers
2. **Quality Values**: Use q-values to express fallback options
3. **Handle 406**: Be prepared to retry with different formats
4. **Cache Awareness**: Understand that Vary affects caching
5. **Wildcard Usage**: Use */* as last resort only

### Security Considerations

1. **Fingerprinting**: Detailed Accept headers can identify users
2. **Privacy**: Limit Accept-Language to protect user privacy
3. **Validation**: Validate media type parameters
4. **Injection**: Sanitize custom media type values

## Content Negotiation for API Versioning

### Media Type Versioning

Use custom media types to version APIs:

```http
Accept: application/vnd.example.customer.v2+json
```

This approach:
- Keeps URLs stable
- Allows multiple versions simultaneously
- Makes version explicit in requests
- Enables gradual migration

### Version Deprecation

Announce deprecation in responses:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.example.v1+json
Warning: 299 - "API version 1 is deprecated. Migrate to version 2"
Sunset: Wed, 31 Dec 2025 23:59:59 GMT

{...}
```

### Version Not Supported

When requested version is unavailable:

```http
HTTP/1.1 406 Not Acceptable
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/unsupported-version",
  "title": "API Version Not Supported",
  "status": 406,
  "detail": "API version 4 is not available",
  "supportedVersions": ["v1", "v2", "v3"],
  "latestVersion": "v3"
}
```

## Related Documentation

- [Content Types and Structure](content-types-and-structure.md) - Standard content type patterns
- [Error Response Standards](error-response-standards.md) - RFC 7807 error handling
- [API Version Strategy](../foundations/api-version-strategy.md) - Versioning approaches
