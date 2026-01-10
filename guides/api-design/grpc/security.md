# gRPC Security

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic gRPC concepts, security fundamentals  
> **🎯 Key Topics:** TLS, Authentication, Authorization, Rate Limiting
> 
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

## Overview

Production gRPC services require multiple security layers: transport encryption, authentication, authorization, and rate limiting. This guide covers essential security patterns.

**Key Principle:** Security must be built in, not bolted on. Use TLS for all production services.

## Transport Security (TLS)

### Why TLS is Required

**Protobuf is binary and unencrypted:**
- Network sniffing reveals all data
- Man-in-the-middle attacks possible
- No integrity verification

**TLS provides:**
- Encryption (confidentiality)
- Authentication (server identity)
- Integrity (tamper detection)

### TLS Configuration (Conceptual)

**Server side:**
```yaml
tls:
  enabled: true
  certificate: /path/to/server-cert.pem
  private_key: /path/to/server-key.pem
  
  # Optional: Client certificate validation
  client_auth: REQUIRE  # or OPTIONAL, NONE
  client_ca: /path/to/client-ca.pem
```

**Client side:**
```yaml
tls:
  enabled: true
  server_ca: /path/to/server-ca.pem  # Verify server
  
  # Optional: Client certificate
  certificate: /path/to/client-cert.pem
  private_key: /path/to/client-key.pem
```

### Certificate Management

**Development:**
```yaml
# Self-signed certificates for testing
# DO NOT use in production
tls:
  self_signed: true
  skip_verification: true  # Insecure
```

**Production:**
```yaml
# Certificate authority signed
# Automatic renewal (Let's Encrypt, cert-manager)
tls:
  certificate_source: cert-manager
  auto_renew: true
  renewal_threshold: 30days
```

## Mutual TLS (mTLS)

### Concept

Both client and server authenticate each other:

```
Client                           Server
  │                                │
  ├──TLS Handshake────────────────►│
  │  + Client Certificate          │
  │                                │
  │◄────Server Certificate─────────┤
  │     + Validates Client Cert    │
  │                                │
  ├──Encrypted Request────────────►│
  │                                │
  │◄──Encrypted Response───────────┤
```

### When to Use mTLS

**Use for:**
- Service-to-service communication
- Zero-trust networks
- Highly sensitive data
- Regulatory requirements (HIPAA, PCI-DSS)

**Avoid for:**
- Public APIs (clients can't manage certs)
- Browser clients (complexity)
- Third-party integration (unless required)

### Configuration

**Server verifies clients:**
```yaml
mtls:
  require_client_cert: true
  trusted_ca: /path/to/client-ca.pem
  
  # Extract identity from certificate
  client_identity_field: CN  # Common Name
  # or: SAN (Subject Alternative Name)
```

**Client provides certificate:**
```yaml
mtls:
  client_certificate: /path/to/client-cert.pem
  client_private_key: /path/to/client-key.pem
```

## Authentication

### Token-Based (JWT)

**Flow:**
```
1. Client obtains JWT from auth service
2. Client includes JWT in gRPC metadata
3. Server validates JWT
4. Server extracts user identity
```

**Metadata format:**
```http
authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Validation steps:**
```yaml
jwt_validation:
  - verify_signature: true
    public_key_url: https://auth.example.com/.well-known/jwks.json
  
  - verify_expiration: true
  
  - verify_issuer: true
    expected_issuer: https://auth.example.com
  
  - verify_audience: true
    expected_audience: grpc://api.example.com
  
  - extract_claims:
      user_id: sub
      roles: roles
      permissions: permissions
```

### API Keys

**Simple authentication for services:**

```http
x-api-key: sk_live_abc123def456
```

**Validation:**
```yaml
api_key_validation:
  header_name: x-api-key
  prefix: sk_live_
  
  # Storage
  key_store: database  # or redis, vault
  
  # Features per key
  track_usage: true
  rate_limit_by_key: true
```

### OAuth 2.0

**Authorization Code Flow (for user-facing apps):**
```
1. User authenticates with OAuth provider
2. App receives access token
3. App includes token in gRPC calls
4. Server validates token with provider
```

**Client Credentials Flow (for service accounts):**
```
1. Service authenticates with client_id + client_secret
2. Receives access token
3. Includes token in gRPC metadata
4. Server validates token
```

**Token introspection:**
```yaml
oauth:
  introspection_endpoint: https://auth.example.com/introspect
  client_id: grpc-service
  client_secret: ${OAUTH_CLIENT_SECRET}
  
  cache:
    enabled: true
    ttl: 300s  # Cache valid tokens for 5 min
```

## Authorization

### Role-Based Access Control (RBAC)

**Define roles and permissions:**
```yaml
roles:
  admin:
    permissions:
      - orders:read
      - orders:write
      - orders:delete
  
  customer:
    permissions:
      - orders:read-own
      - orders:create
  
  viewer:
    permissions:
      - orders:read
```

**Enforce at method level:**
```yaml
method_permissions:
  - service: OrderService
    method: GetOrder
    require_any:
      - orders:read
      - orders:read-own
  
  - service: OrderService
    method: DeleteOrder
    require_all:
      - orders:delete
      - admin  # Role check
```

### Attribute-Based Access Control (ABAC)

**Policy-based authorization:**
```yaml
policy:
  - name: own_orders_only
    description: Users can only access their own orders
    rule: |
      request.customer_id == user.id
      OR user.role == "admin"
  
  - name: working_hours
    description: Sensitive operations only during business hours
    rule: |
      current_time.hour >= 9
      AND current_time.hour < 17
      AND user.role == "operator"
```

### Resource-Level Permissions

**Check ownership before operation:**
```yaml
authorization_flow:
  1. Extract user_id from JWT
  2. Parse order_id from request
  3. Query: SELECT customer_id FROM orders WHERE id = ?
  4. Check: customer_id == user_id OR user.role == 'admin'
  5. Allow or deny
```

## Rate Limiting

### Per-User Limits

```yaml
rate_limits:
  - identifier: user_id  # From JWT
    limits:
      - 100 requests per minute
      - 1000 requests per hour
      - 10000 requests per day
  
  - identifier: api_key
    limits:
      - 1000 requests per minute
      - 100000 requests per day
```

### Per-Method Limits

```yaml
method_limits:
  - service: OrderService
    method: CreateOrder
    limit: 10 per minute per user
  
  - service: OrderService
    method: ListOrders
    limit: 100 per minute per user
  
  - service: OrderService
    method: GetOrder
    limit: 1000 per minute per user
```

### Quota Management

```yaml
quotas:
  free_tier:
    requests_per_day: 1000
    burst_limit: 10
  
  pro_tier:
    requests_per_day: 100000
    burst_limit: 100
  
  enterprise_tier:
    requests_per_day: unlimited
    burst_limit: 1000
```

**Response headers (for client visibility):**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1704758400
```

### Error Response

```yaml
# When rate limit exceeded
status:
  code: RESOURCE_EXHAUSTED
  message: "Rate limit exceeded"
  details:
    - type: "google.rpc.QuotaFailure"
      violations:
        - subject: "user:12345"
          description: "Exceeded 100 requests per minute"
    - type: "google.rpc.RetryInfo"
      retryDelay: "60s"
```

## Security Headers

### Metadata Propagation

**Trace request through services:**
```http
# Client → Gateway
x-request-id: req-abc123
x-correlation-id: corr-xyz789
authorization: Bearer jwt-token

# Gateway → Backend Service
x-request-id: req-abc123
x-correlation-id: corr-xyz789
x-user-id: user-12345  # Extracted from JWT
x-user-roles: admin,developer
```

### Standard Security Headers

```http
# Authentication
authorization: Bearer <token>

# API Keys
x-api-key: <key>

# Request tracking
x-request-id: <uuid>
x-correlation-id: <uuid>

# Client info
user-agent: grpc-java/1.60.0
x-client-version: 2.1.0
```

## CORS and gRPC-Web

### gRPC-Web for Browsers

**Problem:** Browsers can't make gRPC calls directly  
**Solution:** gRPC-Web proxy translates HTTP/1.1 to gRPC

**Architecture:**
```
Browser (gRPC-Web)
  │ HTTP/1.1
  ▼
Envoy Proxy
  │ HTTP/2 gRPC
  ▼
gRPC Service
```

**CORS configuration:**
```yaml
cors:
  allowed_origins:
    - https://app.example.com
    - https://admin.example.com
  
  allowed_methods:
    - POST  # gRPC-Web uses POST
  
  allowed_headers:
    - content-type
    - x-grpc-web
    - authorization
    - x-user-agent
  
  exposed_headers:
    - grpc-status
    - grpc-message
    - grpc-status-details-bin
  
  max_age: 86400  # 24 hours
```

## Best Practices

### Security Layers

**Defense in depth:**
```
┌─────────────────────────────────────┐
│ Layer 1: Network (Firewall, VPC)   │
├─────────────────────────────────────┤
│ Layer 2: Transport (TLS/mTLS)      │
├─────────────────────────────────────┤
│ Layer 3: Authentication (JWT)       │
├─────────────────────────────────────┤
│ Layer 4: Authorization (RBAC/ABAC)  │
├─────────────────────────────────────┤
│ Layer 5: Rate Limiting              │
├─────────────────────────────────────┤
│ Layer 6: Audit Logging              │
└─────────────────────────────────────┘
```

### Security Checklist

✅ **Production Requirements:**
- [ ] TLS enabled (minimum TLS 1.2)
- [ ] Valid certificates (not self-signed)
- [ ] Authentication on all methods
- [ ] Authorization checks enforced
- [ ] Rate limiting configured
- [ ] Security headers validated
- [ ] Audit logging enabled
- [ ] Secrets in vault (not config files)
- [ ] Regular security scanning
- [ ] Incident response plan

❌ **Never in Production:**
- Self-signed certificates
- TLS disabled
- `skip_verification: true`
- Hardcoded secrets
- Unauthenticated endpoints (unless truly public)
- Missing authorization
- Disabled rate limits

### Secrets Management

```yaml
# BAD: Secrets in config
tls:
  private_key: /secrets/key.pem  # File on disk
  password: "hardcoded123"       # In config!

# GOOD: Secrets from vault
tls:
  private_key: ${VAULT:secret/tls/private-key}
  password: ${ENV:TLS_PASSWORD}  # From environment
  
  # Or use secret manager
  secret_provider: vault
  secret_path: secret/grpc/tls
```

## Monitoring and Auditing

### Security Events to Log

```yaml
audit_events:
  - authentication_failure
  - authorization_failure
  - rate_limit_exceeded
  - invalid_token
  - expired_token
  - suspicious_activity
  - privilege_escalation_attempt
```

### Security Metrics

```yaml
metrics:
  - auth_failures_total
  - authz_denials_total
  - rate_limit_hits_total
  - tls_handshake_errors_total
  - invalid_tokens_total
  - suspicious_requests_total
```

### Alert Conditions

```yaml
alerts:
  - name: auth_failure_spike
    condition: rate(auth_failures_total[5m]) > 100
    severity: warning
  
  - name: authz_denial_spike
    condition: rate(authz_denials_total[5m]) > 50
    severity: critical
  
  - name: tls_errors
    condition: tls_handshake_errors_total > 10
    severity: critical
```

## Related Topics

- [Spring Security Integration](../../../languages/spring/grpc/security.md) - Java implementation
- [Error Handling](error-handling.md) - Security error codes
- [Observability](../../../languages/spring/grpc/observability/) - Security monitoring

## Navigation

- [← Versioning](versioning.md)
- [Health Checking →](health-checking.md)
- [Back to gRPC Overview](README.md)
