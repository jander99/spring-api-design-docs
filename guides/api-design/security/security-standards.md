# Security Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 7 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** Authentication, Security, Architecture
> 
> **📊 Complexity:** 9.1 grade level • 1.2% technical density • fairly difficult

## Overview

Every API needs security. This document shows you how to protect your APIs. You will learn about authentication, authorization, and protection techniques.

## Security Basics

APIs face three main threats:

1. **Impersonation**: Attackers pretend to be valid users
2. **Unauthorized Access**: Users try to access data they shouldn't see  
3. **Data Theft**: Attackers intercept sensitive information

We protect against these threats using:
- **Authentication**: Verify who the user is
- **Authorization**: Control what users can access
- **Encryption**: Protect data during transmission

## Authentication

Authentication proves who you are. Think of it like showing your ID at airport security.

### Simple Authentication Example

Here's the basic pattern. A client sends a token with each request:

```http
GET /api/orders/123 HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

The server checks the token. If valid, the request proceeds. If invalid, the server returns an error.

**Why this protects you**: Without a valid token, attackers cannot access your API.

### OAuth 2.1 and OpenID Connect

> **Note**: OAuth 2.1 is currently in draft status (as of 2025). It consolidates OAuth 2.0 best practices including mandatory PKCE, removal of implicit flow, and improved security defaults. Many organizations are already implementing these patterns ahead of formal ratification.

OAuth 2.1 represents the current best practice for API authentication. OpenID Connect (OIDC) adds user identity.

**Simple analogy**: OAuth is like a hotel key card. The card proves you have permission. It expires after checkout. You can't copy it.

Modern APIs should use OAuth 2.1 patterns with OIDC. This provides:
- Secure token generation
- Automatic expiration
- Protection against replay attacks

#### Token Validation

Your API must verify tokens. Check these elements:

1. **Signature**: Confirms the token is authentic (use RS256 or ES256)
2. **Expiration** (`exp`): Ensures the token hasn't expired
3. **Issuer** (`iss`): Verifies who created the token
4. **Audience** (`aud`): Confirms the token is for your API
5. **Not Before** (`nbf`): Prevents use of future-dated tokens
6. **JWT ID** (`jti`): Stops replay attacks

**Why this protects you**: Each check blocks a different attack method.

#### Token Types

Use three types of tokens:

| Token Type | Purpose | Lifetime | Format |
|------------|---------|----------|--------|
| Access Token | Access the API | Short (15-60 min) | Readable JWT |
| Refresh Token | Get new access tokens | Medium (1-30 days) | Opaque, single-use |
| ID Token | User identity (OIDC) | Same as access | Contains user info |

**Why short lifetimes**: If an attacker steals a token, it expires quickly. This limits damage.

#### Public Paths

Some endpoints don't need authentication. Keep this list small:

- Health check endpoints (`/actuator/health`)
- API documentation (`/v3/api-docs`, `/swagger-ui/**`)
- Login endpoints (`/oauth/token`, `/login`)

**Why limit public paths**: Each public path is a potential attack surface.

### Authentication Headers

Use the standard Authorization header:

```http
Authorization: Bearer {access_token}
```

Add tracking headers for security monitoring:

```http
X-Correlation-ID: {correlation-id}
X-Request-ID: {unique-request-id}
```

**Why tracking helps**: These headers help trace suspicious activity across services.

## Authorization

Authorization controls what users can access. Authentication proves who you are. Authorization decides what you can do.

### Resource-Based Authorization

We use resource-based authorization. Each user either has access or doesn't. There's no middle ground.

**Example**: User A can view Order 123. User B cannot. This is binary authorization.

**Why this is simple**: Binary decisions are easy to audit. You can quickly answer "Can this user access this resource?"

### Authentication vs Authorization

A user can be authenticated but not authorized:
- **Authenticated**: The token is valid
- **Authorized**: The user can access this specific resource

**Example**: Alice has a valid token (authenticated). She tries to view Bob's order. The system rejects her (not authorized).

### Token Refresh

Refresh tokens before they expire. Don't wait until expiration.

**Why refresh early**: Prevents session interruption. Users stay logged in smoothly.

## API Protection

Protect your API with multiple layers of defense.

### Security Headers

Add these headers to all API responses:

| Header | Value | Protection |
|--------|-------|------------|
| Content-Security-Policy | `default-src 'self'` | Blocks script injection |
| X-Content-Type-Options | `nosniff` | Stops type confusion |
| Cache-Control | `no-store` | Prevents data caching |
| X-Frame-Options | `DENY` | Stops clickjacking |
| Strict-Transport-Security | `max-age=31536000` | Forces HTTPS |

**Why headers matter**: Each header blocks a specific attack type. Use all of them.

**Note**: Don't use `X-XSS-Protection`. It's deprecated and can create vulnerabilities.

### CORS Configuration

CORS controls which websites can call your API from a browser.

**Why CORS matters**: Without it, any website could call your API using a visitor's credentials. This would be dangerous.

Use strict CORS policies:

1. **Specific Origins**: List allowed domains explicitly. Never use wildcards (`*`) in production.
2. **Credentials**: Control whether browsers send cookies and tokens.
3. **Methods**: Only allow needed HTTP methods.
4. **Headers**: Only expose required headers.

Example CORS response:

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
Content-Type: application/json
```

Example preflight response:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 3600
```

### Rate Limiting

Rate limiting stops attackers from overwhelming your API.

**Why this protects you**: Attackers often send thousands of requests. Rate limiting blocks this attack.

Handle rate limiting at multiple levels:

1. **Infrastructure**: Use API Gateway or nginx as the first defense
2. **Application**: Add limits for expensive operations
3. **Database**: Configure connection pools and query timeouts
4. **Circuit Breaker**: Stop calling failed services (see [HTTP Client Best Practices](../advanced-patterns/http-client-best-practices.md))

When you exceed limits, return this status:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
```

**Why these headers help**: Clients know when to retry. This prevents wasted requests.

## Security for Streaming APIs

Streaming connections stay open for long periods. This creates unique security challenges.

### Streaming Authentication

Long-lived streams need special handling:

1. **Token Refresh**: Refresh tokens while the stream is active
2. **Graceful Termination**: Close streams properly when auth fails
3. **Server-Sent Events**: Validate auth for each SSE connection
4. **WebSocket**: Authenticate at connection and maintain security throughout

**Why this matters**: Tokens expire. Your stream might outlive the token. Plan for this.

### Streaming Security Patterns

**Pattern 1: Connection Authentication**

Authenticate when the stream starts:

```http
GET /orders/stream HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: text/event-stream
```

**Pattern 2: Per-Message Authorization**

Check permissions for each item in the stream. Filter data based on user access. Only send authorized data.

**Why filter per message**: User permissions might change during the stream. Check each item.

**Pattern 3: Handle Token Expiration**

When a token expires during streaming, return this error:

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

Log security events. You can't fix what you can't see.

### What to Log

Record these security events:

1. Authentication failures
2. Authorization failures  
3. Access to sensitive resources

**Why log these**: Patterns reveal attacks. Multiple failures from one IP? Probable attack.

### Security Event Format

Use structured logging. Include these fields:

```json
{
  "timestamp": "2024-07-15T14:32:22Z",
  "level": "WARN",
  "event_type": "authentication_failure",
  "user_id": "user-12345",
  "request_id": "req-98765",
  "resource_path": "/v1/order/12345",
  "remote_ip": "192.168.1.100",
  "failure_reason": "expired_token"
}
```

**Why structured logging**: You can search and analyze logs programmatically. Find attack patterns quickly.

### Modern Security Practices

Follow these additional practices:

1. **Content Security Policy**: Use strict CSP for web interfaces
2. **Dependency Scanning**: Scan dependencies regularly for vulnerabilities
3. **Secrets Management**: Use Vault or AWS Secrets Manager
4. **Security Testing**: Test security in your CI/CD pipeline
5. **Zero Trust**: Never trust. Always verify.
6. **OWASP Guidelines**: Follow the OWASP API Security Top 10

**Why these matter**: Security is not a one-time task. You must maintain it constantly.

## Implementation Checklist

When you implement these standards:

- ✅ Use maintained OAuth 2.1/OIDC libraries
- ✅ Validate JWT signatures and claims
- ✅ Configure security headers
- ✅ Log security events
- ✅ Monitor for suspicious activity

These standards follow industry best practices. They work with any technology stack.

## Summary

Security protects your API and your users. This document covered:

- **Authentication**: Prove who users are (OAuth 2.1/OIDC)
- **Authorization**: Control what users access (resource-based)
- **Protection**: Defend against attacks (headers, CORS, rate limiting)
- **Monitoring**: Detect threats (security logging)

Apply these standards consistently across all your APIs.

## Spring Implementation

For Spring Boot implementations of these security patterns:

- **[Spring Security Guide](../../../languages/spring/security/README.md)** - Complete implementation guide covering OAuth2, authorization, CORS, rate limiting, and security testing
- **[OAuth2 Resource Server](../../../languages/spring/security/oauth2-resource-server.md)** - JWT validation and authentication setup
- **[Authorization Patterns](../../../languages/spring/security/authorization-patterns.md)** - Resource-based permissions and access control
- **[CORS and Headers](../../../languages/spring/security/cors-and-headers.md)** - Security headers configuration
- **[Rate Limiting](../../../languages/spring/security/rate-limiting-and-protection.md)** - Request rate limiting implementation

## gRPC Security

For high-performance internal microservices using gRPC:

- **[gRPC Security](../grpc/security.md)** - TLS, JWT authentication, and authorization patterns for gRPC services