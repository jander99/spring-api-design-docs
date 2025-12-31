# Security Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🔴 Level:** Advanced
> **Implementation Complexity:** Medium | **Team Skills:** OAuth understanding, security mindset
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Authentication, Security, Architecture

## Overview

Security is a fundamental aspect of API design that must be implemented consistently across all microservices. This document outlines our high-level approach to authentication, authorization, and API protection.

## Authentication

### OAuth 2.1/OIDC Implementation

> **Note:** OAuth 2.1 is currently in final draft status (draft-ietf-oauth-v2-1). It consolidates OAuth 2.0 security best practices and deprecates insecure patterns. While not yet a finalized RFC, it represents the current industry direction and should be followed for new implementations.

All APIs must implement OAuth 2.1 with OpenID Connect (OIDC) authentication following modern security practices.

#### OAuth 2.1 Authorization Code Flow

```
┌──────────┐                                  ┌───────────────┐
│  Client  │                                  │ Authorization │
│   App    │                                  │    Server     │
└────┬─────┘                                  └───────┬───────┘
     │                                                │
     │  1. Redirect to /authorize                     │
     │   (client_id, redirect_uri, scope, state,      │
     │    code_challenge, code_challenge_method)      │
     │───────────────────────────────────────────────▶│
     │                                                │
     │                    ┌──────────┐                │
     │                    │   User   │                │
     │                    └────┬─────┘                │
     │                         │                      │
     │                         │ 2. User authenticates│
     │                         │    and consents      │
     │                         │─────────────────────▶│
     │                                                │
     │  3. Redirect to callback                       │
     │   (authorization_code, state)                  │
     │◀───────────────────────────────────────────────│
     │                                                │
     │  4. POST /token                                │
     │   (code, redirect_uri, code_verifier)          │
     │───────────────────────────────────────────────▶│
     │                                                │
     │  5. Token response                             │
     │   (access_token, refresh_token, id_token)      │
     │◀───────────────────────────────────────────────│
     │                                                │
     ▼                                                ▼
```

The flow above shows PKCE (Proof Key for Code Exchange), which is required in OAuth 2.1 for all clients. The `code_challenge` prevents authorization code interception attacks.

#### Token Validation

1. **JWT Format**: Authentication tokens use the JWT (JSON Web Token) format with modern security practices
2. **Token Validation**: Services must validate:
   - Token signature using appropriate algorithms (RS256, ES256)
   - Expiration time (`exp` claim)
   - Issuer claim (`iss` claim)
   - Audience claim (`aud` claim)
   - Not before time (`nbf` claim)
   - JWT ID (`jti` claim) for replay protection

#### Token Types

| Token Type | Use Case | Lifetime | Security Considerations |
|------------|----------|----------|-------------------------|
| Access Token | API access authorization | Short-lived (15-60 minutes) | Should be stateless JWT |
| Refresh Token | Obtaining new access tokens | Medium-lived (24 hours - 30 days) | Should be opaque, single-use |
| ID Token | User identity information (OIDC) | Same as access token | Contains user claims |

#### Public Paths

Each API must maintain a list of public paths that don't require authentication:
- Actuator health endpoints (`/actuator/health`, `/actuator/info`)
- OpenAPI documentation endpoints (`/v3/api-docs`, `/swagger-ui/**`)
- Static resources for documentation
- Authentication endpoints (`/oauth/token`, `/login`)
- Other publicly accessible resources (carefully controlled)

### Authentication Headers

Use standard Authorization header format following RFC 6750:
```
Authorization: Bearer {access_token}
```

Additional security headers for enhanced protection:
```
X-Correlation-ID: {correlation-id}
X-Request-ID: {unique-request-id}
```

## Authorization

### Resource-Based Authorization

Our authorization model is resource-based rather than role or scope-based:

1. **Binary Authorization**: A user either has access to a resource or doesn't
2. **Authentication vs. Authorization**: Users can be authenticated (valid token) but not authorized for specific resources

### Token Refresh

Implement proactive token refresh several minutes before expiration to maintain session continuity.

#### Token Refresh Flow

```
┌──────────┐                         ┌────────────┐
│  Client  │                         │   Auth     │
│   App    │                         │  Server    │
└────┬─────┘                         └─────┬──────┘
     │                                     │
     │  Access token expires soon          │
     │  (check exp claim)                  │
     │                                     │
     │  1. POST /token                     │
     │   grant_type=refresh_token          │
     │   refresh_token=<current_token>     │
     │────────────────────────────────────▶│
     │                                     │
     │                                     │ 2. Validate refresh
     │                                     │    token, rotate it
     │                                     │
     │  3. New tokens                      │
     │   access_token=<new>                │
     │   refresh_token=<new_rotated>       │
     │◀────────────────────────────────────│
     │                                     │
     │  4. Store new tokens,               │
     │     discard old refresh token       │
     │                                     │
     ▼                                     ▼
```

Refresh tokens should be single-use. Each refresh request returns a new refresh token, and the old one becomes invalid. This limits the damage if a refresh token is compromised.

## API Protection

### Security Headers

Implement these security headers in all API responses following modern security practices:

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | `default-src 'self'` | Prevents XSS attacks |
| X-Content-Type-Options | `nosniff` | Prevents MIME type sniffing |
| Cache-Control | `no-store, no-cache, must-revalidate` | Prevents sensitive data caching |
| X-Frame-Options | `DENY` | Prevents clickjacking |
| Referrer-Policy | `strict-origin-when-cross-origin` | Controls referrer information |
| Permissions-Policy | `geolocation=(), microphone=(), camera=()` | Controls browser features |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | Enforces HTTPS |

**Note**: `X-XSS-Protection` header is deprecated and should not be used as it can introduce vulnerabilities in older browsers.

### CORS Configuration

For APIs that support browser clients, implement strict CORS policies:

1. **Specific Origins**: Explicitly list allowed origins, avoid wildcards (`*`) in production
2. **Credentials**: Control whether credentials can be included (`Access-Control-Allow-Credentials`)
3. **Methods & Headers**: Only expose necessary methods and headers
4. **Preflight Handling**: Properly handle OPTIONS requests for complex CORS scenarios

Example CORS response headers:
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 3600
Content-Type: application/json
```

Example preflight OPTIONS response:
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With
Access-Control-Max-Age: 3600
```

### Rate Limiting and Throttling

Rate limiting and throttling are primarily handled at the infrastructure level (API Gateway, nginx/traefik) rather than in individual microservices. However, consider these additional protections:

1. **Infrastructure Level**: Primary rate limiting at gateway/proxy level
2. **Application Level**: Additional protection for resource-intensive operations
3. **Database Level**: Connection pooling and query timeout configurations
4. **Circuit Breaker**: Implement circuit breaker patterns for external service calls

When rate limits are exceeded, return appropriate HTTP status codes:
- `429 Too Many Requests` with `Retry-After` header
- Include rate limit information in response headers:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 999
  X-RateLimit-Reset: 1640995200
  ```

## Security Considerations for Streaming APIs

### Streaming Authentication

For long-lived streaming connections:

1. **Token Refreshing**: Implement token refresh mechanism during active streams
2. **Connection Termination**: Handle authentication failures during streaming gracefully
3. **Server-Sent Events Security**: Validate authentication for each SSE connection
4. **WebSocket Security**: Implement authentication at connection establishment and maintain throughout session

### Streaming Security Patterns

1. **Connection-level Authentication**: Establish security context at stream initiation
   ```http
   GET /orders/stream HTTP/1.1
   Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
   Accept: text/event-stream
   ```

2. **Per-message Authorization**: Validate permissions for each streamed item
   - Filter streaming data based on user permissions
   - Include only authorized data in the stream

3. **Token Validation**: Handle token expiration during long-lived connections
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

## Security Logging and Monitoring

### Audit Logging Requirements

Log the following security events:

1. Authentication failures
2. Authorization failures
3. Access to sensitive resources

### Security Event Format

Security events should include these fields following structured logging principles:

```json
{
  "timestamp": "2024-07-15T14:32:22Z",
  "level": "WARN",
  "event_type": "authentication_failure",
  "user_id": "user-12345",
  "request_id": "req-98765",
  "correlation_id": "corr-abcd",
  "resource_path": "/v1/orders/12345",
  "remote_ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "failure_reason": "expired_token",
  "security_context": {
    "attempted_scopes": ["read:orders"],
    "jwt_claims": {
      "iss": "auth.example.com",
      "exp": 1640995200
    }
  }
}
```

### Modern Security Practices

Additional security considerations for modern APIs:

1. **Content Security Policy**: Implement strict CSP for any web interfaces
2. **Dependency Scanning**: Regular security scanning of dependencies
3. **Secrets Management**: Use external secret management (Vault, AWS Secrets Manager)
4. **Security Testing**: Include security testing in CI/CD pipelines
5. **Zero Trust**: Implement zero-trust networking principles
6. **API Security Standards**: Follow OWASP API Security Top 10 guidelines

## Implementation Notes

When implementing these security standards:

- **OAuth 2.1 libraries**: Use well-maintained OAuth 2.1/OIDC libraries
- **JWT validation**: Implement proper JWT validation including signature verification and claims validation
- **Security headers**: Configure security headers at the web server or application level
- **Monitoring**: Implement security event logging and monitoring

These security standards are based on industry best practices and modern authentication protocols (OAuth 2.1, OpenID Connect), making them universally applicable.

This security standards document provides a foundation for consistent security implementation across all APIs in our ecosystem, aligned with modern authentication standards and HTTP security best practices.

## Common Mistakes

### ❌ Tokens in URLs

**Problem:**
```http
GET /orders?access_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9... HTTP/1.1
GET /customers/123?api_key=sk_live_abc123 HTTP/1.1
```

**Why it's wrong:** URLs appear in browser history, server logs, referrer headers, and proxy logs. Tokens in URLs are easily leaked and cannot be automatically scrubbed.

**✅ Correct approach:**
```http
GET /orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

GET /customers/123 HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### ❌ Wildcard CORS in Production

**Problem:**
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: *
Access-Control-Allow-Headers: *
```

**Why it's wrong:** Allows any website to make authenticated requests to your API. Attackers can create malicious sites that steal user data through the browser.

**✅ Correct approach:**
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
```

---

### ❌ Missing Security Headers

**Problem:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{"data": {...}}
```

**Why it's wrong:** Without security headers, responses are vulnerable to MIME sniffing, clickjacking, and content injection attacks.

**✅ Correct approach:**
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Cache-Control: no-store

{"data": {...}}
```

---

### ❌ Exposing Sensitive Data in Error Messages

**Problem:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Invalid password for user admin@example.com",
  "sql_query": "SELECT * FROM users WHERE email='admin@example.com'",
  "stack_trace": "at com.example.auth.UserService.authenticate..."
}
```

**Why it's wrong:** Confirms valid usernames to attackers, exposes database schema, and reveals implementation details useful for exploitation.

**✅ Correct approach:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/authentication-failed",
  "title": "Authentication Failed",
  "status": 401,
  "detail": "Invalid credentials provided"
}
```

---

### ❌ Long-Lived Access Tokens

**Problem:**
```http
POST /oauth/token HTTP/1.1

{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 31536000
}
```

**Why it's wrong:** A one-year token gives attackers extended access if compromised. There's no way to revoke access without a complex token revocation system.

**✅ Correct approach:**
```http
POST /oauth/token HTTP/1.1

{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

---

### ❌ No Rate Limit Headers

**Problem:**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{"error": "Rate limit exceeded"}
```

**Why it's wrong:** Clients have no way to know their limits or when to retry. This leads to aggressive retry loops that worsen the problem.

**✅ Correct approach:**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200

{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded the rate limit. Please retry after 60 seconds."
}
```

## Implementation Checklist

Use this checklist when implementing API security:

### Phase 1: Authentication Setup

- [ ] Configure OAuth 2.1/OIDC provider integration
- [ ] Implement JWT token validation (signature, expiration, issuer, audience)
- [ ] Set access token lifetime to 15-60 minutes
- [ ] Configure refresh token rotation with single-use tokens
- [ ] Define and document public paths that bypass authentication

### Phase 2: Authorization Configuration

- [ ] Implement resource-based authorization checks
- [ ] Configure permission validation for each protected endpoint
- [ ] Add per-message authorization for streaming connections
- [ ] Implement proactive token refresh before expiration

### Phase 3: Security Headers

- [ ] Add `Content-Security-Policy: default-src 'self'`
- [ ] Add `X-Content-Type-Options: nosniff`
- [ ] Add `X-Frame-Options: DENY`
- [ ] Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] Add `Cache-Control: no-store` for sensitive responses
- [ ] Add `Referrer-Policy: strict-origin-when-cross-origin`

### Phase 4: CORS and Rate Limiting

- [ ] Configure explicit allowed origins (no wildcards in production)
- [ ] Define allowed methods and headers for each origin
- [ ] Implement rate limiting at gateway or application level
- [ ] Add rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- [ ] Return `429 Too Many Requests` with `Retry-After` header when exceeded

### Phase 5: Verification

- [ ] Test authentication failure responses (401 with generic message)
- [ ] Test authorization failure responses (403 without leaking details)
- [ ] Verify no tokens appear in URLs or logs
- [ ] Confirm security event logging is enabled
- [ ] Run security scanner against the API

## Related Documentation

### Core Security
- [Rate Limiting Standards](rate-limiting-standards.md) - Throttling and DDoS protection
- [API Governance](../documentation/api-governance.md) - Security governance and compliance

### Foundations
- [Resource Naming and URL Structure](../foundations/resource-naming-and-url-structure.md) - URL design patterns
- [API Lifecycle Management](../foundations/api-lifecycle-management.md) - Security in API lifecycle

### Request/Response Patterns
- [Error Response Standards](../request-response/error-response-standards.md) - Security error responses (401, 403)
- [HTTP Client Best Practices](../request-response/http-client-best-practices.md) - Secure client implementation

### Advanced Topics
- [API Observability Standards](../advanced-patterns/api-observability-standards.md) - Security logging and monitoring
- [Event-Driven Architecture](../advanced-patterns/event-driven-architecture.md) - Event security patterns
- [Streaming APIs](../request-response/streaming-apis.md) - Streaming connection security

### Spring Implementation
- [OAuth2 Resource Server](../../spring-design/security/oauth2-resource-server.md) - Spring Security OAuth2
- [Authorization Patterns](../../spring-design/security/authorization-patterns.md) - Spring authorization
- [Security Testing](../../spring-design/security/security-testing.md) - Security test patterns