# API Design Decision Framework

> Practical guidance for common API design choices. Use this framework when starting a new API or evaluating existing designs. Reading time: 8-10 minutes.

## Quick Navigation

| Decision | Jump To |
|----------|---------|
| API Style (REST vs GraphQL vs gRPC) | [API Style Selection](#api-style-selection) |
| Versioning Strategy | [Versioning Strategy](#versioning-strategy-selection) |
| Authentication Method | [Authentication Selection](#authentication-method-selection) |
| Pagination Approach | [Pagination Strategy](#pagination-strategy-selection) |
| Caching Strategy | [Caching Strategy](#caching-strategy-selection) |
| Error Detail Level | [Error Granularity](#error-granularity-selection) |

---

## API Style Selection

Choose your API style based on client needs, data patterns, and team expertise.

### When to Choose REST

- You need broad compatibility with any HTTP client
- Resources map naturally to CRUD operations
- Caching at the HTTP layer is important
- Your team has REST experience
- You want simple debugging with standard tools
- Public APIs serving diverse consumers

### When to Choose GraphQL

- Clients need flexible, custom data shapes
- You want to reduce over-fetching and under-fetching
- Mobile apps need bandwidth efficiency
- You have complex, interconnected data
- Multiple clients need different data from same endpoint
- Rapid frontend iteration is a priority

### When to Choose gRPC

- You need high-performance service-to-service calls
- Strong typing and code generation are valuable
- Bi-directional streaming is required
- You control both client and server
- Bandwidth efficiency is critical
- Microservices with heavy internal traffic

### API Style Decision Matrix

| Factor | REST | GraphQL | gRPC |
|--------|------|---------|------|
| **Learning curve** | Low | Medium | High |
| **Browser support** | Native | Requires client | Requires proxy |
| **Caching** | HTTP native | Custom needed | Custom needed |
| **File uploads** | Simple | Complex | Built-in streaming |
| **Real-time** | Webhooks/SSE | Subscriptions | Bi-directional streams |
| **Tooling maturity** | Excellent | Good | Good |
| **Debugging** | Easy (curl, browser) | Moderate | Requires tools |
| **Bandwidth** | Medium | Low (precise) | Low (binary) |
| **Type safety** | Via OpenAPI | Built-in | Built-in |

### Hybrid Approaches

Many systems combine styles effectively:

| Pattern | Use Case |
|---------|----------|
| REST + GraphQL | REST for simple CRUD, GraphQL for complex queries |
| REST + gRPC | REST for external, gRPC for internal services |
| GraphQL + gRPC | GraphQL gateway, gRPC backends |

---

## Versioning Strategy Selection

Choose based on client update patterns, breaking change frequency, and infrastructure.

### When to Choose URL Path Versioning

- You want explicit, visible version in every request
- Clients bookmark or share API URLs
- You prefer simple routing logic
- Breaking changes are infrequent (yearly)
- You want easy debugging and logging

```http
GET /api/v1/orders/123
GET /api/v2/orders/123
```

### When to Choose Header Versioning

- You want clean, version-free URLs
- You need fine-grained version control
- Clients can easily set custom headers
- You want to encourage latest version adoption
- API gateway handles version routing

```http
GET /api/orders/123
Api-Version: 2
```

### When to Choose Query Parameter Versioning

- You need quick version switching for testing
- Browser-based testing is common
- You want optional versioning with defaults
- Gradual migration is important

```http
GET /api/orders/123?version=2
```

### When to Choose Content Negotiation

- You follow strict REST principles
- Version represents resource representation change
- You want HTTP-native approach
- Sophisticated clients consume your API

```http
GET /api/orders/123
Accept: application/vnd.company.order.v2+json
```

### Versioning Decision Matrix

| Factor | URL Path | Header | Query Param | Content Type |
|--------|----------|--------|-------------|--------------|
| **Visibility** | High | Low | Medium | Low |
| **Cacheability** | Excellent | Varies | Good | Varies |
| **Browser testing** | Easy | Hard | Easy | Hard |
| **Routing complexity** | Simple | Medium | Simple | Complex |
| **URL cleanliness** | Cluttered | Clean | Moderate | Clean |
| **Client effort** | None | Headers | Params | Accept header |
| **Industry adoption** | Very high | Medium | Low | Low |

### Recommendation

**URL path versioning** is recommended for most APIs. It offers clarity, simplicity, and broad compatibility.

---

## Authentication Method Selection

Choose based on client type, security requirements, and user experience needs.

### When to Choose API Keys

- Machine-to-machine communication
- Simple integrations without user context
- Rate limiting and usage tracking are primary goals
- Quick developer onboarding is important
- Low-security internal services

```http
GET /api/orders
X-API-Key: sk_live_abc123def456
```

### When to Choose OAuth 2.0

- User authorization for third-party apps
- Granular permission scopes needed
- Token refresh and revocation required
- Enterprise or B2B applications
- You need delegated access patterns

```http
GET /api/orders
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### When to Choose JWT (without OAuth)

- Stateless authentication is required
- You control both client and server
- Microservices need to validate tokens locally
- Session state at server is undesirable
- Short-lived access with embedded claims

### When to Choose Mutual TLS (mTLS)

- Zero-trust network architecture
- Service mesh environments
- Highest security requirements
- Certificate management infrastructure exists
- Service-to-service in regulated industries

### Authentication Decision Matrix

| Factor | API Key | OAuth 2.0 | JWT Only | mTLS |
|--------|---------|-----------|----------|------|
| **Setup complexity** | Low | High | Medium | High |
| **User delegation** | No | Yes | No | No |
| **Revocation** | Rotate key | Token revoke | Wait for expiry | Revoke cert |
| **Stateless** | No (lookup) | Depends | Yes | Yes |
| **Granular scopes** | Manual | Built-in | Custom | No |
| **Browser apps** | Not recommended | Yes | Yes | No |
| **Mobile apps** | Not recommended | Yes (PKCE) | Yes | Complex |
| **Server-to-server** | Good | Good | Good | Excellent |

### Authentication by Client Type

| Client Type | Recommended | Alternative |
|-------------|-------------|-------------|
| Single-page app (SPA) | OAuth 2.0 + PKCE | JWT with secure storage |
| Mobile app | OAuth 2.0 + PKCE | JWT with secure storage |
| Server application | OAuth 2.0 client credentials | API key |
| Internal microservice | mTLS | JWT with service accounts |
| Third-party integration | OAuth 2.0 | API key with IP allowlist |
| CLI tool | OAuth 2.0 device flow | API key |

---

## Pagination Strategy Selection

Choose based on data characteristics, consistency needs, and client patterns.

### When to Choose Offset Pagination

- Data changes infrequently
- Users need to jump to specific pages
- Simple implementation is preferred
- Dataset is small to medium (under 100K records)
- SQL databases with good indexing

```http
GET /api/orders?offset=100&limit=25
```

### When to Choose Cursor Pagination

- Data changes frequently during pagination
- Large or infinite datasets
- Real-time feeds or timelines
- Consistent results are critical
- Infinite scroll UI patterns

```http
GET /api/orders?cursor=eyJpZCI6MTIzfQ&limit=25
```

### When to Choose Keyset Pagination

- High-performance is critical
- You can sort by indexed columns
- Cursor encoding is unwanted overhead
- Database supports efficient keyset queries
- Deep pagination is common

```http
GET /api/orders?after_id=123&after_date=2024-01-15&limit=25
```

### When to Choose Page-Based Pagination

- Users expect traditional page numbers
- Total count display is important
- Jumping between pages is frequent
- UI shows page navigation controls
- Dataset is stable during session

```http
GET /api/orders?page=5&per_page=25
```

### Pagination Decision Matrix

| Factor | Offset | Cursor | Keyset | Page-Based |
|--------|--------|--------|--------|------------|
| **Implementation** | Simple | Medium | Medium | Simple |
| **Performance at depth** | Poor | Excellent | Excellent | Poor |
| **Jump to page** | Yes | No | No | Yes |
| **Consistent during changes** | No | Yes | Yes | No |
| **Total count needed** | Yes | No | No | Yes |
| **Infinite scroll** | Poor fit | Excellent | Good | Poor fit |
| **Database efficiency** | O(offset) | O(1) | O(1) | O(offset) |
| **Bookmarkable** | Yes | Limited | Yes | Yes |

### Pagination by Use Case

| Use Case | Recommended | Reason |
|----------|-------------|--------|
| Admin data table | Offset or Page | Users expect page jumping |
| Social media feed | Cursor | Real-time, infinite scroll |
| Search results | Offset | Users expect page numbers |
| Log/event stream | Cursor | High volume, time-ordered |
| Product catalog | Keyset | Stable ordering, good performance |
| Analytics export | Cursor | Large datasets, consistency |

---

## Caching Strategy Selection

Choose based on data freshness needs, traffic patterns, and consistency requirements.

### When to Use No Caching

- Data is user-specific and sensitive
- Real-time accuracy is critical
- Write operations (POST, PUT, DELETE)
- Personalized content
- Transactional data

```http
Cache-Control: no-store
```

### When to Use Short Cache (seconds to minutes)

- Frequently updated data with some tolerance
- High-traffic endpoints
- Aggregated statistics
- Near real-time dashboards

```http
Cache-Control: max-age=60
```

### When to Use Medium Cache (minutes to hours)

- Reference data that changes periodically
- Search results
- Filtered collections
- Session-stable data

```http
Cache-Control: max-age=3600
```

### When to Use Long Cache (hours to days)

- Static reference data
- Versioned content
- Historical records
- Media assets metadata

```http
Cache-Control: max-age=86400
```

### When to Use Immutable Cache

- Versioned assets
- Content-addressed resources
- Historical snapshots
- API responses with version in URL

```http
Cache-Control: max-age=31536000, immutable
```

### Cache Duration by Resource Type

| Resource Type | Duration | Cache-Control | Example |
|---------------|----------|---------------|---------|
| User profile (own) | None | `no-store` | `/api/me` |
| User profile (public) | 5 min | `max-age=300, public` | `/api/users/123` |
| Product details | 1 hour | `max-age=3600, public` | `/api/products/456` |
| Product list | 5 min | `max-age=300, public` | `/api/products` |
| Categories/tags | 24 hours | `max-age=86400, public` | `/api/categories` |
| Country list | 7 days | `max-age=604800, public` | `/api/countries` |
| Order details | None | `private, no-store` | `/api/orders/789` |
| Order history | 1 min | `private, max-age=60` | `/api/orders` |
| API version info | 1 hour | `max-age=3600, public` | `/api/version` |
| Health check | None | `no-cache` | `/api/health` |

### Caching Decision Matrix

| Factor | No Cache | Short | Medium | Long | Immutable |
|--------|----------|-------|--------|------|-----------|
| **Data freshness** | Real-time | Near real-time | Periodic | Stable | Never changes |
| **Update frequency** | Constant | Minutes | Hours | Days | Never |
| **Personalization** | High | Low | None | None | None |
| **Traffic reduction** | None | Good | Better | Best | Best |
| **Invalidation need** | N/A | Rare | Sometimes | Rare | Never |

### Conditional Caching

Use `ETag` and `Last-Modified` for efficient revalidation:

```http
# Response
ETag: "abc123"
Last-Modified: Wed, 15 Jan 2025 10:30:00 GMT

# Subsequent request
If-None-Match: "abc123"
If-Modified-Since: Wed, 15 Jan 2025 10:30:00 GMT

# If unchanged: 304 Not Modified
```

---

## Error Granularity Selection

Choose error detail level based on audience, security, and debugging needs.

### Error Detail Levels

| Level | Description | Use When |
|-------|-------------|----------|
| **Minimal** | Generic message only | Public APIs, security-sensitive |
| **Standard** | Error code + user message | Most production APIs |
| **Detailed** | Field errors + suggestions | Developer-facing APIs |
| **Debug** | Stack trace + internal details | Development only |

### When to Choose Minimal Errors

- Public-facing APIs with unknown consumers
- Security-sensitive operations (auth, payments)
- Preventing information leakage
- Simple error handling is sufficient

```json
{
  "error": "Bad Request",
  "status": 400
}
```

### When to Choose Standard Errors

- General production APIs
- Balance of security and usability
- Error codes for programmatic handling
- Consumer-friendly messages

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid data."
}
```

### When to Choose Detailed Errors

- Developer-focused APIs
- APIs with complex validation
- Partner integrations
- When reducing support burden

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "Multiple fields failed validation.",
  "errors": [
    {
      "field": "email",
      "code": "invalid_format",
      "message": "Must be a valid email address"
    },
    {
      "field": "age",
      "code": "out_of_range",
      "message": "Must be between 18 and 120"
    }
  ]
}
```

### When to Choose Debug Errors

- Development and staging environments only
- Internal tools and debugging
- Never in production for external consumers

```json
{
  "type": "https://api.example.com/errors/internal",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Database connection failed",
  "debug": {
    "exception": "ConnectionTimeoutException",
    "stack": ["at Database.connect()", "..."],
    "requestId": "req_abc123"
  }
}
```

### Error Granularity Decision Matrix

| Factor | Minimal | Standard | Detailed | Debug |
|--------|---------|----------|----------|-------|
| **Security** | Highest | High | Medium | Low |
| **Developer UX** | Poor | Good | Excellent | Excellent |
| **Support burden** | High | Medium | Low | N/A |
| **Information leakage** | None | Low | Medium | High |
| **Production safe** | Yes | Yes | Yes | No |
| **Debugging ease** | Hard | Moderate | Easy | Easiest |

### Error Detail by API Type

| API Type | Recommended Level | Security Note |
|----------|-------------------|---------------|
| Public API | Standard | Never expose internals |
| Partner API | Detailed | Document error codes |
| Internal API | Detailed | Full validation feedback |
| Auth endpoints | Minimal | Prevent enumeration attacks |
| Admin API | Standard to Detailed | Audit logging required |
| Development | Debug | Toggle off in production |

### Security-Sensitive Error Patterns

Always use minimal errors for:

| Scenario | Bad (Reveals Info) | Good (Minimal) |
|----------|-------------------|----------------|
| Login failure | "Password incorrect" | "Invalid credentials" |
| User lookup | "User not found" | "Invalid credentials" |
| Rate limit | "5 requests remaining" | "Too many requests" |
| Permission | "Admin role required" | "Access denied" |

---

## Decision Checklist

Use this checklist when designing a new API:

### Before You Start
- [ ] Identified primary consumers (public, partners, internal)
- [ ] Understood data access patterns
- [ ] Evaluated security requirements
- [ ] Considered scalability needs

### Core Decisions
- [ ] API style selected (REST/GraphQL/gRPC)
- [ ] Versioning strategy chosen
- [ ] Authentication method defined
- [ ] Error response format standardized

### Data Decisions
- [ ] Pagination strategy selected
- [ ] Caching headers defined
- [ ] Response filtering approach chosen

### Documentation
- [ ] Decisions documented with rationale
- [ ] OpenAPI or schema defined
- [ ] Error codes cataloged

---

## Related Resources

| Topic | Location |
|-------|----------|
| HTTP Methods | [http-methods.md](http-methods.md) |
| Status Codes | [status-codes.md](status-codes.md) |
| Headers Reference | [headers.md](headers.md) |
| Error Standards | [../request-response/error-response-standards.md](../request-response/error-response-standards.md) |
| Pagination Guide | [../request-response/pagination-and-filtering.md](../request-response/pagination-and-filtering.md) |
| Security Standards | [../security/security-standards.md](../security/security-standards.md) |
| Versioning Strategy | [../foundations/api-version-strategy.md](../foundations/api-version-strategy.md) |
