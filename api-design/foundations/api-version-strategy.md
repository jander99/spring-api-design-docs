# API Versioning Strategy

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge, HTTP fundamentals  
> **🎯 Key Topics:** Versioning, API lifecycle, backward compatibility
> 
> **📊 Complexity:** 14.4 grade level • 1.3% technical density • moderate

## Why Version Your APIs?

APIs change over time. Versioning lets you add features without breaking existing clients. With versions, you can:

- Add new features without breaking existing clients
- Fix design mistakes in a controlled way
- Provide clear upgrade paths for consumers
- Maintain service reliability during changes

## When to Create a New Version

Create a new version when making **breaking changes**:

- Removing or renaming fields
- Changing field types 
- Adding required fields to requests
- Changing resource URIs
- Modifying authentication requirements

**Non-breaking changes** don't need a new version:

- Adding optional fields or endpoints
- Adding optional query parameters
- Adding new response fields (clients ignore unknown fields)

## Version Format

Use simple major version numbers in the URI path:

```
/v{major}/resource
```

Examples:
```
/v1/customers/{customerId}
/v2/orders
```

**Key Rules:**
- Use only major version numbers (v1, v2, v3)
- Different resources can have different versions
- Once published, don't change a version's contract

---

## Version Negotiation Alternatives

There are several ways to specify API versions. Each has trade-offs.

### URI Path Versioning (Recommended)

Place the version in the URL path:

```http
GET /v1/orders HTTP/1.1
Host: api.example.com
```

### Header-Based Versioning

Use the `Accept` header with a custom media type:

```http
GET /orders HTTP/1.1
Host: api.example.com
Accept: application/vnd.example.v1+json
```

### Query Parameter Versioning

Add version as a query parameter:

```http
GET /orders?version=1 HTTP/1.1
Host: api.example.com
```

### Custom Header Versioning

Use a custom header for version:

```http
GET /orders HTTP/1.1
Host: api.example.com
X-API-Version: 1
```

### Version Strategy Decision Tree

Use this tree to choose the right versioning approach for your API:

```
Do you need versions visible in browser/logs?
├── Yes ─┬─> Is caching critical for performance?
│        ├── Yes → URI Path Versioning (Recommended)
│        │         Example: /v1/orders
│        └── No ──> Do you want simple client integration?
│                   ├── Yes → URI Path Versioning
│                   └── No ──> Query Parameter Versioning
│                              Example: /orders?version=1
│
└── No ──┬─> Do you want clean, version-free URLs?
         ├── Yes ─┬─> Is strict REST compliance important?
         │        ├── Yes → Accept Header (Content Negotiation)
         │        │         Example: Accept: application/vnd.example.v1+json
         │        └── No ──> Custom Header Versioning
         │                   Example: X-API-Version: 1
         └── No ──> URI Path Versioning (Recommended)
```

**Quick decision summary:**
- **Most APIs**: Use URI path versioning (`/v1/resource`)
- **Clean URL requirement**: Use header-based versioning
- **Legacy system integration**: Use query parameters if required

### Comparison Table

| Approach | Pros | Cons |
|----------|------|------|
| **URI Path** | Easy to understand, cache-friendly, visible in logs | URLs change between versions |
| **Accept Header** | Clean URLs, follows HTTP spec | Harder to test, not visible in browser |
| **Query Parameter** | Easy to use, visible | Can conflict with other params, less RESTful |
| **Custom Header** | Clean URLs, flexible | Requires header setup, easy to forget |

**Why URI versioning is preferred:**
- Clear and visible in every request
- Works with all HTTP tools without config
- Easy to route in load balancers and gateways
- Simple to document and test
- Cache keys naturally include version

---

## Version Discovery

Help clients find available API versions and their status.

### API Root Version Listing

Expose available versions at your API root:

```http
GET / HTTP/1.1
Host: api.example.com
```

```json
{
  "versions": [
    {
      "version": "v1",
      "status": "deprecated",
      "sunset": "2025-06-30",
      "docs": "https://api.example.com/docs/v1"
    },
    {
      "version": "v2",
      "status": "current",
      "docs": "https://api.example.com/docs/v2"
    },
    {
      "version": "v3",
      "status": "beta",
      "docs": "https://api.example.com/docs/v3"
    }
  ],
  "current": "v2"
}
```

### OpenAPI Version Documentation

Document versions in your OpenAPI specification:

```yaml
openapi: 3.1.0
info:
  title: Orders API
  version: "2.0.0"
  x-api-status: current
  x-deprecation-date: null
  x-sunset-date: null
servers:
  - url: https://api.example.com/v2
    description: Current version
  - url: https://api.example.com/v1
    description: Deprecated (sunset 2025-06-30)
```

### Version Metadata in Responses

Include version info in response headers:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: 2
X-API-Deprecated: false
```

For deprecated versions, add more context:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: 1
X-API-Deprecated: true
Deprecation: true
Sunset: Mon, 30 Jun 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
```

---

## Semantic Versioning for APIs

Semantic versioning shows how big a change is. The version number tells clients what to expect.

### Version Number Meaning

| Version Part | When to Increment | Example |
|--------------|-------------------|---------|
| **Major** (v1 → v2) | Breaking changes | Remove field, change type |
| **Minor** (internal) | New features | Add endpoint, add field |
| **Patch** (internal) | Bug fixes | Fix validation, improve docs |

### What Clients See

Clients only see major versions in the URI (v1, v2, v3). Minor and patch changes happen inside a major version. The URL stays the same.

### Backward Compatibility Rules

A change is **backward compatible** if old clients still work:

**Safe changes (no new version needed):**
- Add optional request fields
- Add response fields
- Add new endpoints
- Add new query parameters
- Relax validation rules
- Add new enum values (if clients ignore unknown)

**Breaking changes (new major version needed):**
- Remove or rename fields
- Change field types
- Add required request fields
- Remove endpoints
- Tighten validation rules
- Change authentication methods

### Version Increment Guidelines

1. **Start at v1** — Don't use v0 in production
2. **Increment major version rarely** — Breaking changes have high cost
3. **Batch breaking changes** — Combine into one major release
4. **Never reuse versions** — v2 always means the same thing
5. **Document all changes** — Keep a changelog per version

---

## API Gateway Considerations

API gateways help manage multiple versions in production.

### Routing Based on Version

Configure your gateway to route requests by version:

```yaml
# Example gateway route configuration
routes:
  - path: /v1/*
    backend: orders-service-v1.internal:8080
  - path: /v2/*
    backend: orders-service-v2.internal:8080
  - path: /v3/*
    backend: orders-service-v3.internal:8080
```

This allows:
- Different services per version
- Gradual migration between versions
- Independent scaling per version

### Version Header Forwarding

Forward version information to backend services:

```yaml
# Gateway adds headers before forwarding
headers:
  add:
    X-Original-Version: "${request.path.version}"
    X-Client-Requested-Version: "${request.header.X-API-Version}"
```

Backend services can use these headers for:
- Logging and debugging
- Analytics on version usage
- Conditional behavior

### Version-Based Rate Limiting

Apply different rate limits by version:

| Version | Status | Rate Limit | Reason |
|---------|--------|------------|--------|
| v1 | Deprecated | 100 req/min | Encourage migration |
| v2 | Current | 1000 req/min | Full support |
| v3 | Beta | 500 req/min | Limited capacity |

Example gateway configuration:

```yaml
rate_limits:
  - match:
      path_prefix: /v1/
    limit: 100
    window: 60s
    response_headers:
      X-RateLimit-Reason: "v1 is deprecated, migrate to v2"
  - match:
      path_prefix: /v2/
    limit: 1000
    window: 60s
  - match:
      path_prefix: /v3/
    limit: 500
    window: 60s
```

---

## Deprecation Policy

### Timeline
- **Minimum support**: 6 months after deprecation notice
- **High-traffic APIs**: 12+ months of support
- **Critical integrations**: Negotiate specific timelines

### Implementation Steps
1. **Mark as deprecated** in documentation and OpenAPI specs
2. **Add deprecation headers** to responses:
   ```http
   Deprecation: true
   Sunset: Sat, 31 Dec 2025 23:59:59 GMT
   Link: </v2/resource>; rel="successor-version"
   ```
3. **Monitor usage** to track migration progress
4. **Notify clients** of upcoming sunset dates
5. **Return 410 Gone** when ready to remove

## Quick Implementation Steps

1. **Design new version** with breaking changes
2. **Deploy both versions** simultaneously
3. **Add deprecation notices** to old version
4. **Support client migration** with documentation
5. **Monitor usage** of old version
6. **Sunset old version** after minimum support period

## Detailed Resources

For comprehensive guidance, see:

- **Migration Examples**: [examples/versioning/](../examples/versioning/) - Complete scenarios with before/after code
- **Deprecation Reference**: [reference/versioning/](../reference/versioning/) - Detailed policies and HTTP headers
- **Troubleshooting**: [troubleshooting/versioning/](../troubleshooting/versioning/) - Common problems and solutions

## Implementation Notes

These principles apply to any REST API framework, regardless of implementation technology or programming language.