# Multi-Tenancy Patterns

> **Reading Guide**
> 
> **Reading Time:** 13 minutes | **Level:** Advanced
> **Implementation Complexity:** Complex | **Team Skills:** Database design, security architecture, caching strategies
> 
> **Prerequisites:** REST API basics, authentication patterns  
> **Key Topics:** Tenant isolation, URL design, security, rate limiting
> 
> **Note:** This document contains many HTTP examples. Skim the examples on first read.

## Overview

Multi-tenancy lets one API serve many customers. Each customer is a "tenant" with separate data. Tenants share the same API but cannot see each other's resources.

This pattern cuts costs and simplifies operations. One deployment serves all tenants with strong security between them.

## What is Multi-Tenancy?

A multi-tenant API serves many organizations from one system. Each organization is a "tenant" with its own isolated data. Tenants share code and servers but cannot access each other's resources.

**Common use cases:**

| Use Case | Example |
|----------|---------|
| SaaS platforms | CRM serving multiple companies |
| Enterprise APIs | Internal API serving business units |
| White-label products | Same product with different branding |
| Partner integrations | Separate data for each partner |

**Key benefits:**

- **Cost efficiency**: One deployment serves all tenants
- **Simplified operations**: Single codebase to maintain
- **Faster onboarding**: New tenants use existing infrastructure
- **Consistent updates**: All tenants get improvements together

## Tenant Identification Strategies

Every request must identify its tenant. Four strategies exist, each with tradeoffs.

### Strategy 1: URL Path

Put the tenant ID in the URL path:

```http
GET /v1/tenants/acme-corp/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "orderId": "ord-12345",
      "tenant": "acme-corp",
      "amount": 150.00
    }
  ]
}
```

**Advantages:**
- Explicit and visible in logs
- Easy to route at load balancer level
- Works with any authentication method
- Simple to debug and trace

**Disadvantages:**
- Longer URLs
- Tenant ID appears in browser history
- Requires tenant validation on every request

### Strategy 2: Subdomain

Use tenant-specific subdomains:

```http
GET /v1/orders HTTP/1.1
Host: acme-corp.api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "orderId": "ord-12345",
      "amount": 150.00
    }
  ]
}
```

**Advantages:**
- Clean URL paths
- Easy SSL certificate management with wildcards
- Natural for white-label deployments
- Tenant isolation at DNS level

**Disadvantages:**
- Requires DNS configuration per tenant
- CORS complexity with multiple origins
- Certificate management for custom domains

### Strategy 3: Request Header

Pass tenant context in a custom header:

```http
GET /v1/orders HTTP/1.1
X-Tenant-ID: acme-corp
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Tenant-ID: acme-corp

{
  "data": [
    {
      "orderId": "ord-12345",
      "amount": 150.00
    }
  ]
}
```

**Advantages:**
- Cleaner URLs
- Easy to add to existing APIs
- Flexible for server-to-server calls
- Tenant ID hidden from URL logs

**Disadvantages:**
- Not visible in browser address bar
- Requires client configuration
- Must validate header on every request
- Can be accidentally omitted

### Strategy 4: JWT Claim

Extract tenant from the authentication token:

```http
GET /v1/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJ0ZW5hbnQiOiJhY21lLWNvcnAiLCJzdWIiOiJ1c2VyLTEyMyJ9...
```

**JWT payload:**

```json
{
  "sub": "user-123",
  "tenant": "acme-corp",
  "iss": "https://auth.example.com",
  "exp": 1720000000
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "orderId": "ord-12345",
      "amount": 150.00
    }
  ]
}
```

**Advantages:**
- No extra headers or URL changes
- Tenant bound to authentication
- Cannot access other tenants without new token
- Simplest client integration

**Disadvantages:**
- Requires token refresh to switch tenants
- Token must be decoded on every request
- Less flexible for admin/support scenarios

### Strategy Comparison

| Factor | URL Path | Subdomain | Header | JWT Claim |
|--------|----------|-----------|--------|-----------|
| **Visibility** | High | High | Low | Low |
| **Client complexity** | Low | Low | Medium | Low |
| **Routing flexibility** | High | High | Medium | Low |
| **Multi-tenant users** | Easy | Easy | Easy | Hard |
| **Security** | Medium | Medium | Medium | High |
| **Setup effort** | Low | High | Low | Medium |

**Recommendation:** Use JWT claims for most SaaS apps. Add URL path for admin APIs. Use subdomain for white-label products.

## URL Structure Patterns

### Pattern 1: Tenant in Path (Explicit)

Place tenant identifier at the start of resource paths:

```
/v1/tenants/{tenant-id}/orders
/v1/tenants/{tenant-id}/orders/{order-id}
/v1/tenants/{tenant-id}/customers
/v1/tenants/{tenant-id}/customers/{customer-id}/orders
```

**Example requests:**

```http
GET /v1/tenants/acme-corp/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

```http
POST /v1/tenants/acme-corp/orders HTTP/1.1
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...

{
  "customerId": "cust-456",
  "items": [
    {"productId": "prod-789", "quantity": 2}
  ]
}
```

**Response with tenant context:**

```http
HTTP/1.1 201 Created
Location: /v1/tenants/acme-corp/orders/ord-12345
Content-Type: application/json

{
  "orderId": "ord-12345",
  "tenant": "acme-corp",
  "customerId": "cust-456",
  "status": "pending",
  "links": {
    "self": "/v1/tenants/acme-corp/orders/ord-12345",
    "customer": "/v1/tenants/acme-corp/customers/cust-456"
  }
}
```

### Pattern 2: Implicit Tenant (From Auth)

Keep URLs clean by deriving tenant from authentication:

```
/v1/orders
/v1/orders/{order-id}
/v1/customers
/v1/customers/{customer-id}/orders
```

**Example requests:**

```http
GET /v1/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJ0ZW5hbnQiOiJhY21lLWNvcnAifQ...
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Tenant-ID: acme-corp

{
  "data": [
    {
      "orderId": "ord-12345",
      "customerId": "cust-456",
      "status": "pending"
    }
  ]
}
```

### Pattern 3: Hybrid (Admin and Tenant APIs)

Combine both patterns for different use cases:

**Tenant API (implicit):**

```http
GET /v1/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJ0ZW5hbnQiOiJhY21lLWNvcnAifQ...
```

**Admin API (explicit):**

```http
GET /v1/admin/tenants/acme-corp/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ...
```

Regular users work within their tenant. Admins can access any tenant for support.

## Data Isolation

### Tenant Context in Responses

Include tenant information in responses for clarity:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Tenant-ID: acme-corp

{
  "orderId": "ord-12345",
  "tenant": "acme-corp",
  "metadata": {
    "tenantRegion": "us-east",
    "tenantPlan": "enterprise"
  }
}
```

### Cross-Reference Validation

When resources link to each other, check they belong to the same tenant:

**Invalid cross-tenant reference:**

```http
POST /v1/orders HTTP/1.1
Content-Type: application/json
X-Tenant-ID: acme-corp
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...

{
  "customerId": "cust-999"
}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/resource-not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Customer cust-999 not found in tenant acme-corp",
  "instance": "/v1/orders"
}
```

Return 404 (not 403) so you don't reveal that the resource exists in another tenant.

### Tenant-Scoped Identifiers

Resource IDs should be unique within a tenant but may repeat across tenants:

| Approach | Example ID | Pros | Cons |
|----------|-----------|------|------|
| Globally unique | `ord-a1b2c3d4-e5f6` | No collision risk | Longer IDs |
| Tenant-scoped | `ORD-0001` | Shorter, readable | Requires tenant context |
| Composite | `acme:ord-0001` | Self-documenting | Longer IDs |

**Recommendation:** Use globally unique IDs (UUIDs or prefixed IDs). They make data moves easier and prevent cross-tenant mix-ups.

## Security Considerations

### Tenant Boundary Enforcement

Enforce tenant boundaries at multiple layers:

**Layer 1: Authentication** - Validate that the token is valid and contains tenant claims.

**Layer 2: Authorization** - Verify the user can access the requested tenant.

**Layer 3: Data Access** - Filter all database queries by tenant.

**Layer 4: Response Filtering** - Ensure responses contain only tenant-specific data.

### Cross-Tenant Access Prevention

Never allow cross-tenant access in normal operations:

```http
GET /v1/tenants/other-corp/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJ0ZW5hbnQiOiJhY21lLWNvcnAifQ...
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/tenant-access-denied",
  "title": "Tenant Access Denied",
  "status": 403,
  "detail": "You do not have access to tenant other-corp"
}
```

### Audit Logging

Log all tenant-related actions with full context:

```json
{
  "timestamp": "2024-07-15T14:32:22Z",
  "event": "resource.accessed",
  "tenant": "acme-corp",
  "userId": "user-123",
  "resource": "/v1/orders/ord-12345",
  "method": "GET",
  "sourceIp": "192.168.1.100",
  "correlationId": "req-abc-123"
}
```

**Critical events to log:**

| Event | Priority | Details to Include |
|-------|----------|-------------------|
| Tenant access denied | High | Requested tenant, user's tenant |
| Cross-tenant attempt | Critical | Both tenant IDs, resource path |
| Tenant admin action | High | Admin user, target tenant, action |
| Tenant created/deleted | High | Tenant ID, initiator |

### Tenant Isolation Validation

Regularly test isolation with these checks:

1. **Authentication without tenant**: Requests without tenant context should fail
2. **Wrong tenant in path**: Token tenant must match path tenant
3. **Cross-tenant references**: Resources from other tenants return 404
4. **Bulk operations**: Batch requests cannot mix tenants

## Rate Limiting Per Tenant

### Separate Quotas

Each tenant should have independent rate limits:

```http
GET /v1/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJ0ZW5hbnQiOiJhY21lLWNvcnAifQ...
```

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1720000000
X-RateLimit-Scope: tenant
Content-Type: application/json

{
  "data": []
}
```

### Rate Limit Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests in window |
| `X-RateLimit-Remaining` | Requests left in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `X-RateLimit-Scope` | Limit scope: `tenant`, `user`, or `global` |

### Plan-Based Limits

Different tenant plans can have different limits:

| Plan | Requests/Hour | Requests/Day | Burst Limit |
|------|---------------|--------------|-------------|
| Free | 100 | 1,000 | 10/second |
| Standard | 1,000 | 10,000 | 50/second |
| Enterprise | 10,000 | 100,000 | 200/second |

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 3600
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1720003600

{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Tenant acme-corp has exceeded the hourly rate limit of 1000 requests",
  "tenant": "acme-corp",
  "limit": 1000,
  "resetAt": "2024-07-15T15:00:00Z"
}
```

## Error Handling

### Tenant Not Found

When a tenant identifier is invalid or doesn't exist:

```http
GET /v1/tenants/unknown-corp/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/tenant-not-found",
  "title": "Tenant Not Found",
  "status": 404,
  "detail": "Tenant 'unknown-corp' does not exist or is not active"
}
```

### Tenant Suspended

When a tenant account is suspended:

```http
GET /v1/orders HTTP/1.1
X-Tenant-ID: suspended-corp
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/tenant-suspended",
  "title": "Tenant Suspended",
  "status": 403,
  "detail": "Tenant account is suspended. Contact support for assistance.",
  "supportEmail": "support@example.com"
}
```

### Missing Tenant Context

When tenant cannot be determined:

```http
GET /v1/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/tenant-required",
  "title": "Tenant Context Required",
  "status": 400,
  "detail": "Request must include tenant context via X-Tenant-ID header or tenant claim in JWT"
}
```

### Tenant Mismatch

When path tenant doesn't match authenticated tenant:

```http
GET /v1/tenants/other-corp/orders HTTP/1.1
X-Tenant-ID: acme-corp
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJ0ZW5hbnQiOiJhY21lLWNvcnAifQ...
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/tenant-mismatch",
  "title": "Tenant Mismatch",
  "status": 403,
  "detail": "Authenticated tenant does not match requested tenant"
}
```

## Headers and Context Propagation

### Standard Headers

Use consistent headers for tenant context:

| Header | Direction | Purpose |
|--------|-----------|---------|
| `X-Tenant-ID` | Request/Response | Identifies the tenant |
| `X-Tenant-Region` | Response | Tenant's data region |
| `X-Tenant-Plan` | Response | Tenant's subscription plan |
| `X-Correlation-ID` | Request/Response | Request tracing |

### Request Headers Example

```http
POST /v1/orders HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
X-Tenant-ID: acme-corp
X-Correlation-ID: req-abc-123
X-Request-ID: unique-request-456

{
  "customerId": "cust-789",
  "items": []
}
```

### Response Headers Example

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Tenant-ID: acme-corp
X-Tenant-Region: us-east-1
X-Correlation-ID: req-abc-123
X-Request-ID: unique-request-456

{
  "orderId": "ord-12345"
}
```

### Service-to-Service Propagation

When services call each other, pass along the tenant context:

```http
GET /internal/v1/inventory/prod-789 HTTP/1.1
Host: inventory-service.internal
X-Tenant-ID: acme-corp
X-Correlation-ID: req-abc-123
X-Calling-Service: order-service
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Required propagation headers:**

| Header | Purpose |
|--------|---------|
| `X-Tenant-ID` | Maintain tenant context |
| `X-Correlation-ID` | Distributed tracing |
| `X-Calling-Service` | Audit trail |
| `Authorization` | Service-to-service auth |

## Implementation Checklist

Before deploying multi-tenant APIs, verify:

- [ ] Tenant identification strategy chosen and documented
- [ ] All database queries filter by tenant
- [ ] Cross-tenant access returns 404 (not 403)
- [ ] Rate limits configured per tenant
- [ ] Audit logging includes tenant context
- [ ] Error responses don't leak cross-tenant information
- [ ] Service-to-service calls propagate tenant context
- [ ] Tenant suspension handling implemented
- [ ] Bulk operations validate single-tenant scope

## Related Documentation

- [Security Standards](../security/security-standards.md) - Authentication and authorization patterns
- [Rate Limiting Standards](../security/rate-limiting-standards.md) - Detailed rate limiting guidance
- [Error Response Standards](../request-response/error-response-standards.md) - RFC 9457 error format
- [API Observability Standards](api-observability-standards.md) - Logging and monitoring
