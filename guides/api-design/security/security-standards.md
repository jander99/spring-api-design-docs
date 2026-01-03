# Security Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Authentication, Security, Architecture
> 
> **📊 Complexity:** 16.4 grade level • 2.5% technical density • very difficult

## Overview

Security is a fundamental aspect of API design that must be implemented consistently across all microservices. This document outlines our high-level approach to authentication, authorization, and API protection.

## Authentication

### OAuth 2.1/OIDC Implementation

All APIs must implement OAuth 2.1 with OpenID Connect (OIDC) authentication following modern security practices:

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
4. **Circuit Breaker**: Implement circuit breaker patterns for external service calls (see [HTTP Client Best Practices](../advanced-patterns/http-client-best-practices.md))

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
  "resource_path": "/v1/order/12345",
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