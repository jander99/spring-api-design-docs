---
name: api-security
description: Implement and configure REST API security with authentication (OAuth 2.1, JWT, API keys), authorization (scopes, roles, resource-based), and protection (CORS, rate limiting, security headers). Use when securing endpoints, validating tokens, designing access rules, or configuring security policies.
---

# API Security

Secure REST APIs with authentication, authorization, and protection mechanisms.

## When to Use

- Securing API endpoints with OAuth 2.1/OIDC
- Validating JWT tokens
- Implementing scope-based or resource-based authorization
- Configuring CORS policies
- Adding rate limiting protection
- Setting security headers

## Quick Start

JWT validation requirements for every request:

```http
GET /orders/123 HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

Validate: signature (RS256), `exp`, `iss`, `aud`, `nbf` claims.

## Authentication

| Token Type | Purpose | Lifetime |
|------------|---------|----------|
| Access Token | API authorization | 15-60 min |
| Refresh Token | Get new access tokens | 24h - 30d |
| ID Token | User identity (OIDC) | Same as access |

**Never accept tokens in**: query parameters, request body.

## Authorization Models

| Model | Best For | Check |
|-------|----------|-------|
| Scope-based | API permissions | JWT scopes (`orders:read`) |
| Role-based | User categories | JWT roles (`ADMIN`) |
| Resource-based | Ownership | Service layer check |

## Response Codes

| Scenario | Code |
|----------|------|
| No/invalid token | 401 Unauthorized |
| Valid token, no permission | 403 Forbidden |
| Valid token, not found | 404 Not Found |

## Security Headers

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |

## Rate Limiting

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
Retry-After: 60
```

## Anti-Patterns

| Anti-Pattern | Risk | Fix |
|--------------|------|-----|
| Token in query params | Logged, leaked | Use Authorization header |
| Wildcard CORS (`*`) | Any origin access | Explicit allowlist |
| No rate limiting | DoS vulnerability | Implement limits |
| Symmetric JWT keys | Key sharing issues | Use RS256/ES256 |

## References

- `references/oauth2-oidc.md` - OAuth 2.1/OIDC patterns
- `references/authorization.md` - Authorization strategies
- `references/java-spring.md` - Spring Security implementation
- `../../api-design/security/rate-limiting-standards.md` - Rate limiting details
- `../../api-design/security/advanced-security-patterns.md` - Zero-trust, mTLS, DPoP
