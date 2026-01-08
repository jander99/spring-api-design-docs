# HTTP Fundamentals

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 10 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic API experience  
> **🎯 Key Topics:** HTTP Methods, Status Codes, Headers
> 
> **📊 Complexity:** 13.0 grade level • 18% technical density • fairly difficult

## Overview

HTTP (Hypertext Transfer Protocol) is the foundation of data communication on the web. Understanding HTTP fundamentals is essential for designing effective APIs. This guide covers the core concepts: HTTP methods, status codes, headers, and the request-response lifecycle.

## HTTP Methods

HTTP methods define the action to perform on a resource. Each method has specific semantics that determine how servers and clients should behave.

### Core HTTP Methods

| Method | Purpose | Safe | Idempotent | Common Use |
|--------|---------|------|------------|------------|
| GET | Retrieve resource | Yes | Yes | Fetch data |
| POST | Create resource | No | No | Submit forms, create records |
| PUT | Replace resource | No | Yes | Full updates |
| PATCH | Partial update | No | No | Partial updates |
| DELETE | Remove resource | No | Yes | Delete records |
| HEAD | Get headers only | Yes | Yes | Check existence |
| OPTIONS | Get available methods | Yes | Yes | CORS preflight |

### Method Definitions

#### GET - Retrieve Resources

Use GET to retrieve data without modifying server state.

```http
GET /orders/12345 HTTP/1.1
Host: api.example.com
Accept: application/json
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "orderId": "12345",
  "status": "SHIPPED",
  "total": 99.99
}
```

**GET Characteristics:**
- Retrieves data only
- No request body
- Results can be cached
- Can be bookmarked
- Safe (no side effects)

#### POST - Create New Resources

Use POST to create new resources or submit data that causes server-side changes.

```http
POST /orders HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "customerId": "customer-456",
  "items": [
    {
      "productId": "prod-789",
      "quantity": 2
    }
  ]
}
```

Response:
```http
HTTP/1.1 201 Created
Location: /orders/12346
Content-Type: application/json

{
  "orderId": "12346",
  "status": "PENDING",
  "createdAt": "2024-07-15T14:32:00Z"
}
```

**POST Characteristics:**
- Creates new resources
- Not idempotent (repeating creates duplicates)
- Causes server-side changes
- Response includes new resource location

#### PUT - Replace Entire Resource

Use PUT to replace a resource completely.

```http
PUT /orders/12345 HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "orderId": "12345",
  "status": "CANCELLED",
  "customerId": "customer-456",
  "items": []
}
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "orderId": "12345",
  "status": "CANCELLED",
  "updatedAt": "2024-07-15T15:00:00Z"
}
```

**PUT Characteristics:**
- Replaces entire resource
- Idempotent (same result if repeated)
- Requires full resource representation
- Creates resource if it doesn't exist (optional)

#### PATCH - Partial Updates

Use PATCH to update specific fields without replacing the entire resource.

```http
PATCH /orders/12345 HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "status": "SHIPPED",
  "trackingNumber": "TRACK-12345"
}
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "orderId": "12345",
  "status": "SHIPPED",
  "trackingNumber": "TRACK-12345",
  "updatedAt": "2024-07-15T16:00:00Z"
}
```

**PATCH Characteristics:**
- Updates only specified fields
- More efficient than PUT for small changes
- Not guaranteed idempotent
- Server determines how to apply changes

#### DELETE - Remove Resources

Use DELETE to remove a resource.

```http
DELETE /orders/12345 HTTP/1.1
Host: api.example.com
```

Response:
```http
HTTP/1.1 204 No Content
```

**DELETE Characteristics:**
- Removes the resource
- Idempotent (same result if repeated)
- Usually returns 204 (no content)
- Second DELETE returns 404 (not found)

#### HEAD - Metadata Only

Use HEAD to retrieve headers without the response body.

```http
HEAD /orders/12345 HTTP/1.1
Host: api.example.com
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 256
Last-Modified: Mon, 15 Jul 2024 14:32:00 GMT
```

**HEAD Characteristics:**
- Same as GET but no body
- Check if resource exists
- Get metadata (size, modified date)
- Useful for caching decisions

#### OPTIONS - Discover Capabilities

Use OPTIONS to discover what methods a resource supports.

```http
OPTIONS /orders/12345 HTTP/1.1
Host: api.example.com
```

Response:
```http
HTTP/1.1 200 OK
Allow: GET, PUT, PATCH, DELETE, HEAD, OPTIONS
```

**OPTIONS Characteristics:**
- Returns allowed methods
- Used in CORS preflight requests
- No request or response body needed
- Safe and idempotent

### Safe and Idempotent Methods

**Safe Methods:**
Safe methods do not modify server state. They only retrieve data.
- GET, HEAD, OPTIONS are safe

**Idempotent Methods:**
Idempotent methods produce the same result when called multiple times.
- GET, PUT, DELETE, HEAD, OPTIONS are idempotent
- POST and PATCH are not idempotent

## HTTP Status Codes

Status codes indicate the result of an HTTP request. They are grouped into five categories.

### 1xx Informational Responses

These codes indicate that the request is in progress.

| Code | Name | Usage |
|------|------|-------|
| 100 | Continue | Client should continue sending request body |
| 101 | Switching Protocols | Server switching to protocol from Upgrade header |

Example:
```http
HTTP/1.1 100 Continue
```

### 2xx Success Responses

These codes indicate that the request succeeded.

| Code | Name | Usage |
|------|------|-------|
| 200 | OK | Request succeeded, response contains data |
| 201 | Created | New resource created successfully |
| 202 | Accepted | Request accepted for processing (async) |
| 204 | No Content | Success but no response body |
| 206 | Partial Content | Partial data (range request) |

#### 200 OK Example

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "orderId": "12345",
  "status": "SHIPPED"
}
```

#### 201 Created Example

```http
HTTP/1.1 201 Created
Location: /orders/12346
Content-Type: application/json

{
  "orderId": "12346",
  "status": "PENDING"
}
```

#### 204 No Content Example

```http
HTTP/1.1 204 No Content
```

### 3xx Redirection Responses

These codes indicate that the client must take additional action.

| Code | Name | Usage |
|------|------|-------|
| 301 | Moved Permanently | Resource permanently moved to new URL |
| 302 | Found | Resource temporarily at different URL |
| 303 | See Other | Redirect to GET another URL |
| 304 | Not Modified | Cached version is still valid |
| 307 | Temporary Redirect | Temporary redirect, keep method |
| 308 | Permanent Redirect | Permanent redirect, keep method |

#### 301 Moved Permanently Example

```http
HTTP/1.1 301 Moved Permanently
Location: https://api.example.com/v2/orders/12345
```

#### 304 Not Modified Example

```http
HTTP/1.1 304 Not Modified
ETag: "abc123"
```

### 4xx Client Error Responses

These codes indicate that the client made an error.

| Code | Name | Usage |
|------|------|-------|
| 400 | Bad Request | Invalid request syntax or parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource does not exist |
| 405 | Method Not Allowed | HTTP method not supported |
| 409 | Conflict | Request conflicts with current state |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |

#### 400 Bad Request Example

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request contains invalid parameters"
}
```

#### 401 Unauthorized Example

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api"
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/authentication-required",
  "title": "Authentication Required",
  "status": 401
}
```

#### 404 Not Found Example

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Order 12345 does not exist"
}
```

#### 429 Too Many Requests Example

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Maximum 100 requests per minute exceeded"
}
```

### 5xx Server Error Responses

These codes indicate that the server encountered an error.

| Code | Name | Usage |
|------|------|-------|
| 500 | Internal Server Error | Unexpected server error |
| 501 | Not Implemented | Method not supported by server |
| 502 | Bad Gateway | Invalid response from upstream server |
| 503 | Service Unavailable | Server temporarily unavailable |
| 504 | Gateway Timeout | Upstream server timeout |

#### 500 Internal Server Error Example

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred"
}
```

#### 503 Service Unavailable Example

```http
HTTP/1.1 503 Service Unavailable
Retry-After: 120
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "Service under maintenance"
}
```

## HTTP Headers

HTTP headers pass additional information between clients and servers. Headers are grouped into request headers, response headers, and representation headers.

### Common Request Headers

Request headers provide information about the client and the requested resource.

| Header | Purpose | Example |
|--------|---------|---------|
| Accept | Acceptable content types | `Accept: application/json` |
| Accept-Language | Preferred languages | `Accept-Language: en-US,en;q=0.9` |
| Accept-Encoding | Acceptable encodings | `Accept-Encoding: gzip, deflate` |
| Authorization | Authentication credentials | `Authorization: Bearer token123` |
| Content-Type | Request body media type | `Content-Type: application/json` |
| Content-Length | Request body size in bytes | `Content-Length: 256` |
| Host | Target server hostname | `Host: api.example.com` |
| User-Agent | Client application info | `User-Agent: MyApp/1.0` |
| If-Match | Conditional based on ETag | `If-Match: "abc123"` |
| If-None-Match | Cache validation | `If-None-Match: "abc123"` |
| If-Modified-Since | Conditional based on date | `If-Modified-Since: Mon, 15 Jul 2024 14:00:00 GMT` |

#### Request Headers Example

```http
GET /orders/12345 HTTP/1.1
Host: api.example.com
Accept: application/json
Accept-Language: en-US
Accept-Encoding: gzip
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
User-Agent: MyApp/1.0
If-None-Match: "abc123"
```

### Common Response Headers

Response headers provide information about the server and the response.

| Header | Purpose | Example |
|--------|---------|---------|
| Content-Type | Response body media type | `Content-Type: application/json` |
| Content-Length | Response body size | `Content-Length: 256` |
| Content-Encoding | Encoding applied | `Content-Encoding: gzip` |
| Content-Language | Response language | `Content-Language: en-US` |
| Location | Redirect or created resource URL | `Location: /orders/12346` |
| ETag | Resource version identifier | `ETag: "abc123"` |
| Last-Modified | Last modification date | `Last-Modified: Mon, 15 Jul 2024 14:32:00 GMT` |
| Cache-Control | Caching directives | `Cache-Control: max-age=3600` |
| Expires | Cache expiration date | `Expires: Mon, 15 Jul 2024 15:32:00 GMT` |
| Retry-After | Retry delay in seconds | `Retry-After: 60` |
| Allow | Allowed HTTP methods | `Allow: GET, POST, PUT, DELETE` |

#### Response Headers Example

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 256
Content-Encoding: gzip
ETag: "abc123"
Last-Modified: Mon, 15 Jul 2024 14:32:00 GMT
Cache-Control: max-age=3600

{
  "orderId": "12345",
  "status": "SHIPPED"
}
```

### Authentication Headers

| Header | Type | Purpose | Example |
|--------|------|---------|---------|
| Authorization | Request | Send credentials | `Authorization: Bearer token123` |
| WWW-Authenticate | Response | Request authentication | `WWW-Authenticate: Bearer realm="api"` |

#### Authentication Example

Request:
```http
GET /orders/12345 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

Response (when token is invalid):
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api", error="invalid_token"
```

### Caching Headers

Caching headers control how responses are cached by clients and intermediaries.

| Header | Type | Purpose | Example |
|--------|------|---------|---------|
| Cache-Control | Both | Caching directives | `Cache-Control: max-age=3600, public` |
| ETag | Response | Version identifier | `ETag: "abc123"` |
| Last-Modified | Response | Last modification date | `Last-Modified: Mon, 15 Jul 2024 14:00:00 GMT` |
| If-None-Match | Request | Cache validation with ETag | `If-None-Match: "abc123"` |
| If-Modified-Since | Request | Cache validation with date | `If-Modified-Since: Mon, 15 Jul 2024 14:00:00 GMT` |
| Expires | Response | Absolute expiration date | `Expires: Mon, 15 Jul 2024 15:00:00 GMT` |

#### Caching Example

Initial request:
```http
GET /orders/12345 HTTP/1.1
Host: api.example.com
```

Initial response:
```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "abc123"
Last-Modified: Mon, 15 Jul 2024 14:00:00 GMT
Cache-Control: max-age=3600

{
  "orderId": "12345",
  "status": "SHIPPED"
}
```

Cache validation request:
```http
GET /orders/12345 HTTP/1.1
Host: api.example.com
If-None-Match: "abc123"
```

Not modified response:
```http
HTTP/1.1 304 Not Modified
ETag: "abc123"
```

### Content Negotiation Headers

Content negotiation allows clients to request specific formats.

| Header | Type | Purpose | Example |
|--------|------|---------|---------|
| Accept | Request | Acceptable media types | `Accept: application/json` |
| Accept-Language | Request | Preferred languages | `Accept-Language: en-US,en;q=0.9` |
| Accept-Encoding | Request | Acceptable encodings | `Accept-Encoding: gzip, deflate, br` |
| Content-Type | Both | Actual media type | `Content-Type: application/json; charset=utf-8` |
| Content-Language | Response | Actual language | `Content-Language: en-US` |
| Content-Encoding | Response | Actual encoding | `Content-Encoding: gzip` |

#### Content Negotiation Example

Request:
```http
GET /orders/12345 HTTP/1.1
Host: api.example.com
Accept: application/json, application/xml;q=0.9
Accept-Language: en-US, es;q=0.8
Accept-Encoding: gzip, deflate
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Language: en-US
Content-Encoding: gzip

{
  "orderId": "12345"
}
```

### CORS Headers

CORS (Cross-Origin Resource Sharing) headers control cross-domain access.

| Header | Type | Purpose | Example |
|--------|------|---------|---------|
| Origin | Request | Request origin | `Origin: https://app.example.com` |
| Access-Control-Allow-Origin | Response | Allowed origins | `Access-Control-Allow-Origin: *` |
| Access-Control-Allow-Methods | Response | Allowed methods | `Access-Control-Allow-Methods: GET, POST, PUT` |
| Access-Control-Allow-Headers | Response | Allowed headers | `Access-Control-Allow-Headers: Content-Type, Authorization` |
| Access-Control-Max-Age | Response | Preflight cache duration | `Access-Control-Max-Age: 86400` |

#### CORS Preflight Example

Preflight request:
```http
OPTIONS /orders HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

Preflight response:
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

## HTTP Request-Response Lifecycle

Understanding the complete lifecycle helps troubleshoot issues and optimize performance.

### 1. Client Creates Request

The client builds an HTTP request with:
- Method (GET, POST, etc.)
- URL and path
- Headers
- Optional body

```http
POST /orders HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer token123

{
  "customerId": "customer-456",
  "items": [{"productId": "prod-789", "quantity": 2}]
}
```

### 2. DNS Resolution

The client resolves the hostname to an IP address:
- Checks local cache
- Queries DNS servers
- Returns IP address (e.g., 192.0.2.1)

### 3. TCP Connection

The client establishes a TCP connection:
- Three-way handshake (SYN, SYN-ACK, ACK)
- Connection established on port 80 (HTTP) or 443 (HTTPS)

### 4. TLS Handshake (HTTPS Only)

For HTTPS, the client and server negotiate encryption:
- Exchange certificates
- Agree on encryption method
- Establish encrypted channel

### 5. Send Request

The client sends the HTTP request over the connection:
- Request line (method, path, version)
- Headers
- Blank line
- Body (if present)

### 6. Server Processes Request

The server:
- Parses the request
- Authenticates and authorizes
- Executes business logic
- Generates response

### 7. Server Sends Response

The server sends the HTTP response:
- Status line (version, code, reason)
- Headers
- Blank line
- Body (if present)

```http
HTTP/1.1 201 Created
Location: /orders/12346
Content-Type: application/json
Content-Length: 145

{
  "orderId": "12346",
  "status": "PENDING",
  "createdAt": "2024-07-15T14:32:00Z"
}
```

### 8. Connection Handling

The connection is either:
- Closed (HTTP/1.0 default)
- Kept alive for reuse (HTTP/1.1 default)
- Multiplexed (HTTP/2, HTTP/3)

### 9. Client Processes Response

The client:
- Reads status code
- Processes headers
- Parses response body
- Updates application state

## Best Practices

### Choose the Right Method

- Use GET for reading data
- Use POST for creating resources
- Use PUT for full replacements
- Use PATCH for partial updates
- Use DELETE for removing resources

### Use Appropriate Status Codes

- 2xx for success
- 3xx for redirects
- 4xx for client errors
- 5xx for server errors

### Set Proper Headers

- Always include Content-Type
- Use caching headers for performance
- Include authentication headers when required
- Set CORS headers for cross-domain access

### Follow HTTP Semantics

- Make GET, PUT, DELETE idempotent
- Keep GET and HEAD safe (no side effects)
- Use proper status codes for different scenarios

### Handle Errors Consistently

Use RFC 9457 Problem Details format:
```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Invalid email format",
  "instance": "/orders"
}
```

## Related Documentation

- [Error Response Standards](../request-response/error-response-standards.md) - Detailed error handling patterns
- [Resource Naming and URL Structure](resource-naming-and-url-structure.md) - URL design principles
- [Content Types and Structure](../request-response/content-types-and-structure.md) - Request/response body formats
- [Performance Standards](../advanced-patterns/performance-standards.md) - HTTP/2 and HTTP/3 performance benefits

---
