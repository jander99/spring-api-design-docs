---
name: api-security
description: Implement security for REST APIs including OAuth 2.1, JWT validation, authorization patterns, CORS, and rate limiting. Use when securing API endpoints, implementing authentication flows, designing authorization rules, or configuring security headers.
---

# API Security

<!--
SOURCE DOCUMENTS:
- api-design/security/Security Standards.md
- spring-design/security/OAuth2-Resource-Server.md
- spring-design/security/Authorization-Patterns.md
- spring-design/security/CORS-and-Headers.md
- spring-design/security/Rate-Limiting-and-Protection.md
- spring-design/security/Security-Context-Propagation.md
- spring-design/security/Security-Testing.md

REFERENCE FILES TO CREATE:
- references/oauth2-oidc.md (OAuth 2.1/OIDC patterns)
- references/authorization.md (resource-based authorization)
- references/cors-headers.md (CORS and security headers)
- references/java-spring.md (Spring Security implementation)
-->

## When to Use This Skill

Use this skill when you need to:
- Secure API endpoints with OAuth 2.1/OIDC
- Validate JWT tokens
- Implement authorization rules
- Configure CORS policies
- Add rate limiting protection
- Set security headers

## Core Principles

TODO: Extract and condense from Security Standards.md

### Authentication (OAuth 2.1/OIDC)
- Use OAuth 2.1 with PKCE for authorization
- Validate JWT tokens on each request
- Extract claims for user identity and roles
- Use short-lived access tokens with refresh tokens

### Authorization
- Resource-based: Check permissions on specific resources
- Role-based: Check user roles/scopes
- Combine both for fine-grained access control
- Fail closed (deny by default)

### Security Headers
- `Strict-Transport-Security`: Enforce HTTPS
- `Content-Security-Policy`: Prevent XSS
- `X-Content-Type-Options`: Prevent MIME sniffing
- `X-Frame-Options`: Prevent clickjacking

### Rate Limiting
- Protect against abuse and DoS
- Return 429 Too Many Requests when exceeded
- Include `Retry-After` header
- Use `X-RateLimit-*` headers for transparency

## Quick Reference

TODO: Add security decision tree

| Scenario | Response |
|----------|----------|
| Missing token | 401 Unauthorized |
| Invalid/expired token | 401 Unauthorized |
| Valid token, no permission | 403 Forbidden |
| Rate limit exceeded | 429 Too Many Requests |

## Loading Additional Context

When you need deeper guidance:

- **OAuth 2.1/OIDC patterns**: Load `references/oauth2-oidc.md`
- **Authorization strategies**: Load `references/authorization.md`
- **CORS and headers**: Load `references/cors-headers.md`
- **Java/Spring implementation**: Load `references/java-spring.md`

## Examples

TODO: Add minimal illustrative examples

### JWT Authorization Header
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

### CORS Headers
```
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

## Anti-Patterns

TODO: Extract from source documents

- Accepting tokens in query parameters (logged, cached)
- Overly permissive CORS (`*` origin in production)
- Missing rate limiting on expensive operations
- Leaking authorization details in error messages
- Not validating token signature and claims
- Using symmetric keys for JWT in distributed systems
