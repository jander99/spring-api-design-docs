---
name: api-security
description: Implement security for REST APIs including OAuth 2.1, JWT validation, authorization patterns, CORS, and rate limiting. Use when securing API endpoints, implementing authentication flows, designing authorization rules, or configuring security headers.
---

# API Security

## When to Use This Skill

Use this skill when you need to:
- Secure API endpoints with OAuth 2.1/OIDC
- Validate JWT tokens
- Implement authorization rules (scope-based, resource-based)
- Configure CORS policies
- Add rate limiting protection
- Set security headers

## Authentication: OAuth 2.1/OIDC

### Token Types

| Token Type | Purpose | Lifetime | Format |
|------------|---------|----------|--------|
| Access Token | API authorization | 15-60 minutes | JWT (stateless) |
| Refresh Token | Obtain new access tokens | 24 hours - 30 days | Opaque, single-use |
| ID Token | User identity (OIDC) | Same as access token | JWT with user claims |

### JWT Validation Requirements

Every request with a Bearer token must validate:

1. **Signature** - Verify using issuer's public keys (RS256/ES256)
2. **Expiration** (`exp`) - Token not expired
3. **Issuer** (`iss`) - Matches expected authorization server
4. **Audience** (`aud`) - Token intended for this service
5. **Not Before** (`nbf`) - Token is active
6. **JWT ID** (`jti`) - Optional replay protection

### Authorization Header Format

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Never accept tokens in:**
- Query parameters (logged, cached, visible in referrer)
- Request body (non-standard)

### Public Endpoints

Endpoints that don't require authentication:

```
/actuator/health          # Health checks
/actuator/info            # App info
/api-docs/**              # OpenAPI docs
/swagger-ui/**            # Swagger UI
/oauth/token              # Token endpoint
```

All other endpoints require authentication by default (fail closed).

## Authorization

### Authorization Model Decision

> **Recommended**: Use binary resource-based authorization where users either have full access to a resource or no access.

| Model | Best For | Implementation |
|-------|----------|----------------|
| Scope-based | API-level permissions | Check JWT scopes (`orders:read`) |
| Role-based | User categories | Check JWT roles (`ADMIN`, `USER`) |
| Resource-based | Per-resource ownership | Check resource owner in service layer |
| Combined | Fine-grained control | Scope + resource ownership |

### Scope-Based Authorization

Scopes define API-level permissions:

```
orders:read     - Read order data
orders:write    - Create/update orders
orders:delete   - Delete orders
admin:full      - Full administrative access
```

Check scopes in authorization rules:

```http
# Requires orders:read scope
GET /orders/123 HTTP/1.1
Authorization: Bearer {token with scope "orders:read"}
```

### Resource-Based Authorization

Check ownership at the service layer:

1. Verify user is authenticated (valid token)
2. Check user has required scope
3. Verify user owns or has access to specific resource

Example flow:
```
GET /orders/123
1. Token valid? → 401 if not
2. Has orders:read scope? → 403 if not
3. User owns order 123? → 403 if not
4. Return order → 200
```

### Authorization Response Codes

| Scenario | Status | Response |
|----------|--------|----------|
| No token provided | 401 Unauthorized | `WWW-Authenticate: Bearer` |
| Invalid/expired token | 401 Unauthorized | Error in body |
| Valid token, no permission | 403 Forbidden | Access denied |
| Valid token, resource not found | 404 Not Found | Resource doesn't exist |

**Important**: Don't reveal whether resource exists to unauthorized users. Some APIs return 404 instead of 403 to prevent information leakage.

## Security Headers

### Required Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforce HTTPS |
| `Content-Security-Policy` | `default-src 'self'` | Prevent XSS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Disable browser features |
| `Cache-Control` | `no-store, no-cache, must-revalidate` | Prevent sensitive data caching |

### Deprecated Headers

**Do NOT use:**
- `X-XSS-Protection` - Deprecated, can introduce vulnerabilities

## CORS Configuration

### Production CORS Rules

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### CORS Best Practices

| Rule | Production | Development |
|------|------------|-------------|
| Allowed Origins | Explicit list only | `localhost:*` patterns OK |
| Wildcards (`*`) | Never | Only for non-credentialed |
| Credentials | Only if needed | As needed |
| Max-Age | 24 hours (86400s) | 1 hour (3600s) |

### Preflight Response

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

## Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests in window |
| `X-RateLimit-Remaining` | Requests left in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |

### Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200

{
  "type": "https://example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded the rate limit. Try again in 60 seconds.",
  "retryAfter": 60
}
```

### Rate Limit Tiers

| Endpoint Type | Limit | Window | Rationale |
|---------------|-------|--------|-----------|
| Authentication | 5 req | 5 min | Prevent brute force |
| Standard API | 100 req | 1 min | Normal usage |
| Bulk operations | 10 req | 1 min | Resource intensive |
| Search | 30 req | 1 min | Database intensive |

### Rate Limit Keys

Priority order for identifying clients:
1. User ID from JWT (`sub` claim)
2. API key (if applicable)
3. Client IP address (fallback)

## Streaming Security

Long-lived connections (SSE, WebSocket) require special handling:

### Connection Authentication

```http
GET /orders/stream HTTP/1.1
Authorization: Bearer {token}
Accept: text/event-stream
```

### Token Expiration During Stream

Options:
1. **Close connection** when token expires (simplest)
2. **Refresh mechanism** - Client sends new token via separate channel
3. **Long-lived stream tokens** - Special tokens for streaming only

Handle expiration gracefully:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/token-expired",
  "title": "Token Expired",
  "status": 401,
  "detail": "Authentication token has expired during stream"
}
```

## Security Event Logging

Log these security events for audit:

```json
{
  "timestamp": "2024-07-15T14:32:22Z",
  "level": "WARN",
  "event_type": "authentication_failure",
  "user_id": "user-12345",
  "request_id": "req-98765",
  "resource_path": "/v1/orders/12345",
  "remote_ip": "192.168.1.100",
  "failure_reason": "expired_token"
}
```

Events to log:
- Authentication failures
- Authorization failures
- Rate limit exceeded
- Suspicious input patterns
- Token refresh events

## Anti-Patterns

| Anti-Pattern | Risk | Fix |
|--------------|------|-----|
| Token in query params | Logged, cached, leaked | Use Authorization header |
| Wildcard CORS (`*`) | Any origin can call API | Explicit origin list |
| No rate limiting | DoS vulnerability | Implement rate limits |
| Leaking auth details in errors | Information disclosure | Generic error messages |
| Symmetric JWT keys | Key sharing problems | Use asymmetric (RS256/ES256) |
| No token validation | Anyone can forge tokens | Validate signature + claims |
| Security by obscurity | Easily bypassed | Proper authentication |
| Hardcoded secrets | Exposed in code/logs | External secret management |

## Quick Reference: Security Response Codes

```
401 Unauthorized
├── Missing Authorization header
├── Malformed token
├── Expired token
├── Invalid signature
└── Unknown issuer/audience

403 Forbidden
├── Valid token, insufficient scope
├── Valid token, not resource owner
└── Valid token, action not allowed

429 Too Many Requests
├── Rate limit exceeded
├── Include Retry-After header
└── Include X-RateLimit-* headers
```

## Security Checklist

### Authentication
- [ ] JWT signature validation with public keys
- [ ] Validate `iss`, `aud`, `exp`, `nbf` claims
- [ ] Token only accepted in Authorization header
- [ ] Public endpoints explicitly listed
- [ ] All other endpoints require auth

### Authorization
- [ ] Scope-based checks for API permissions
- [ ] Resource ownership checks in service layer
- [ ] 401 for auth failures, 403 for authz failures
- [ ] No information leakage in error responses

### Security Headers
- [ ] HSTS enabled with long max-age
- [ ] CSP configured for content sources
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Cache-Control for sensitive responses

### CORS
- [ ] Explicit origin allowlist (no wildcards)
- [ ] Minimal allowed methods/headers
- [ ] Credentials only if required
- [ ] Appropriate max-age for preflight cache

### Rate Limiting
- [ ] Limits on all endpoints
- [ ] Stricter limits on auth endpoints
- [ ] X-RateLimit-* headers in responses
- [ ] 429 response with Retry-After

## Loading Additional Context

When you need deeper guidance:

- **OAuth 2.1/OIDC patterns**: Load `references/oauth2-oidc.md`
- **Authorization strategies**: Load `references/authorization.md`
- **Java/Spring implementation**: Load `references/java-spring.md`
