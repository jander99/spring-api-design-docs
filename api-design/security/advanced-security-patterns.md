# Advanced Security Patterns

> **Reading Guide**
> 
> **Reading Time:** 35 minutes | **Level:** Advanced
> **Content Type:** Reference (high code/structured content ratio)
> 
> **Prerequisites:** OAuth 2.1/OIDC basics, TLS/PKI understanding, API security experience
> **Key Topics:** Zero trust, threat modeling, mTLS, token binding, DPoP, request signing
> 
> **Related Documents:**
> - [Security Standards](security-standards.md) - Core authentication and authorization
> - [Rate Limiting Standards](rate-limiting-standards.md) - Throttling and abuse prevention

---

## Executive Summary

Modern APIs face sophisticated threats that require defense-in-depth strategies. This document covers advanced security patterns beyond basic authentication and authorization.

**Key principles:**
- Never trust, always verify (zero trust)
- Defense in depth (multiple security layers)
- Least privilege (minimal access by default)
- Assume breach (design for compromise scenarios)

**What this document covers:**
- Zero-trust architecture for APIs
- Threat modeling approaches (STRIDE)
- Advanced authentication (step-up, adaptive, MFA)
- Token security (binding, DPoP)
- Request signing and mTLS
- Bot and abuse prevention
- Security logging and incident response
- Supply chain security

---

## Threat Landscape Overview

### API Attack Surface

APIs expose multiple attack vectors. Understanding these helps prioritize defenses.

```
                           Attack Surface Map
+------------------------------------------------------------------+
|                                                                  |
|   NETWORK LAYER              TRANSPORT LAYER                     |
|   +----------------+         +------------------+                |
|   | DDoS attacks   |         | TLS downgrade    |                |
|   | IP spoofing    |         | Certificate      |                |
|   | DNS hijacking  |         |   attacks        |                |
|   +----------------+         +------------------+                |
|                                                                  |
|   APPLICATION LAYER          IDENTITY LAYER                      |
|   +----------------+         +------------------+                |
|   | Injection      |         | Token theft      |                |
|   | Broken access  |         | Session hijack   |                |
|   | Data exposure  |         | Credential stuff |                |
|   | Rate abuse     |         | Account takeover |                |
|   +----------------+         +------------------+                |
|                                                                  |
|   BUSINESS LOGIC             SUPPLY CHAIN                        |
|   +----------------+         +------------------+                |
|   | Logic flaws    |         | Dependency       |                |
|   | Workflow abuse |         |   vulnerabilities|                |
|   | Price manip    |         | API key leaks    |                |
|   +----------------+         +------------------+                |
|                                                                  |
+------------------------------------------------------------------+
```

### OWASP API Security Top 10 (2023)

| Rank | Vulnerability | Description |
|------|--------------|-------------|
| 1 | Broken Object Level Auth | Accessing other users' resources |
| 2 | Broken Authentication | Weak or missing authentication |
| 3 | Broken Object Property Level Auth | Exposing or modifying hidden fields |
| 4 | Unrestricted Resource Consumption | No rate/resource limits |
| 5 | Broken Function Level Auth | Accessing admin functions |
| 6 | Unrestricted Access to Business Flows | Automating manual processes |
| 7 | Server-Side Request Forgery | Making server fetch internal URLs |
| 8 | Security Misconfiguration | Default/weak configs |
| 9 | Improper Inventory Management | Undocumented endpoints |
| 10 | Unsafe Consumption of APIs | Trusting third-party APIs blindly |

---

## Zero-Trust Architecture for APIs

### Core Principles

Zero trust means "never trust, always verify." Every request must prove its legitimacy, regardless of network location.

```
                    Zero Trust Architecture
                    
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  External        |     |  Internal        |     |  Database        |
|  Client          |     |  Service         |     |  Service         |
|                  |     |                  |     |                  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         | Authenticate           | Authenticate           | Authenticate
         | Authorize              | Authorize              | Authorize
         | Encrypt                | Encrypt                | Encrypt
         |                        |                        |
+--------v------------------------v------------------------v---------+
|                                                                     |
|                    Policy Enforcement Point                         |
|                    (Every request verified)                         |
|                                                                     |
+---------------------------------------------------------------------+
         |                        |                        |
         v                        v                        v
+------------------+     +------------------+     +------------------+
|  Identity        |     |  Policy          |     |  Audit           |
|  Provider        |     |  Engine          |     |  Log             |
+------------------+     +------------------+     +------------------+
```

### Zero-Trust Request Flow

```http
POST /v1/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9...
X-Request-ID: req-abc123
X-Correlation-ID: corr-xyz789
DPoP: eyJhbGciOiJFUzI1NiIsInR5cCI6ImRwb3Arand0In0...
X-Client-Cert-Hash: sha256:abc123...

{
  "customer_id": "cust-12345",
  "items": [...]
}
```

**Verification steps (every request):**
1. Validate TLS connection and client certificate
2. Verify token signature and claims
3. Confirm DPoP proof matches token
4. Check authorization for specific resource
5. Validate request integrity
6. Log security context

### Zero-Trust Response Headers

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Request-ID: req-abc123
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Cache-Control: no-store
X-Zero-Trust-Session: verified
X-Authorization-Context: user=u123;scope=orders:write;tenant=t456

{
  "order_id": "ord-789",
  "status": "created"
}
```

---

## API Threat Modeling with STRIDE

### STRIDE Categories

STRIDE helps identify threats systematically. Apply it to each API component.

| Category | Threat | API Example | Mitigation |
|----------|--------|-------------|------------|
| **S**poofing | Fake identity | Stolen tokens | mTLS, DPoP, token binding |
| **T**ampering | Modified data | Request modification | Request signing, HMAC |
| **R**epudiation | Deny actions | "I didn't place that order" | Audit logs, signing |
| **I**nformation Disclosure | Data leak | Verbose errors | Data classification |
| **D**enial of Service | Service down | Request flood | Rate limiting, quotas |
| **E**levation of Privilege | Unauthorized access | Admin bypass | RBAC, ABAC |

### Threat Model Template

For each API endpoint, document:

```yaml
endpoint: POST /v1/payments
assets:
  - Payment credentials
  - Customer financial data
  - Transaction records

threats:
  spoofing:
    risk: high
    attack: "Attacker uses stolen session to make payments"
    mitigation: "Step-up auth for high-value transactions"
    
  tampering:
    risk: high
    attack: "Attacker modifies payment amount in transit"
    mitigation: "Request signing with HMAC"
    
  repudiation:
    risk: medium
    attack: "User claims they didn't authorize payment"
    mitigation: "Signed audit trail, transaction receipts"
    
  information_disclosure:
    risk: high
    attack: "Card numbers exposed in logs or errors"
    mitigation: "Tokenization, field-level encryption"
    
  denial_of_service:
    risk: medium
    attack: "Flood payment endpoint"
    mitigation: "Strict rate limits, CAPTCHA"
    
  elevation_of_privilege:
    risk: high
    attack: "Access other users' payment methods"
    mitigation: "Object-level authorization checks"
```

---

## Advanced Authentication Patterns

### Step-Up Authentication

Step-up authentication requires stronger proof for sensitive operations.

```
                    Step-Up Authentication Flow
                    
    Client                    API                     Auth Server
      |                        |                           |
      |  1. GET /account       |                           |
      |  Auth: Bearer token    |                           |
      |----------------------->|                           |
      |                        |                           |
      |  2. 200 OK (read data) |                           |
      |<-----------------------|                           |
      |                        |                           |
      |  3. POST /transfer     |                           |
      |  Auth: Bearer token    |                           |
      |  Amount: $10,000       |                           |
      |----------------------->|                           |
      |                        |                           |
      |  4. 401 Step-up needed |                           |
      |  X-Step-Up-Methods:    |                           |
      |    mfa, biometric      |                           |
      |<-----------------------|                           |
      |                        |                           |
      |  5. Complete MFA       |                           |
      |----------------------------------------------->|   |
      |                        |                           |
      |  6. Enhanced token     |                           |
      |<-----------------------------------------------|   |
      |                        |                           |
      |  7. POST /transfer     |                           |
      |  Auth: Bearer enhanced |                           |
      |----------------------->|                           |
      |                        |                           |
      |  8. 200 OK (transfer)  |                           |
      |<-----------------------|                           |
      |                        |                           |
```

**Step-up challenge response:**

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
X-Step-Up-Required: true
X-Step-Up-Methods: mfa,biometric,security_key
X-Step-Up-URL: https://auth.example.com/step-up/abc123

{
  "type": "https://api.example.com/problems/step-up-required",
  "title": "Enhanced Authentication Required",
  "status": 401,
  "detail": "This operation requires additional authentication",
  "instance": "/v1/transfers",
  "stepUp": {
    "reason": "high_value_transaction",
    "threshold": "$5,000",
    "methods": ["mfa", "biometric", "security_key"],
    "authUrl": "https://auth.example.com/step-up/abc123",
    "expiresIn": 300
  }
}
```

**Enhanced token claims after step-up:**

```json
{
  "sub": "user-12345",
  "iss": "https://auth.example.com",
  "aud": "api.example.com",
  "exp": 1705320900,
  "iat": 1705320000,
  "acr": "urn:example:acr:mfa",
  "amr": ["pwd", "otp", "hwk"],
  "auth_time": 1705320000,
  "step_up": {
    "completed_at": 1705320000,
    "methods": ["mfa"],
    "session_id": "step-xyz789"
  }
}
```

### Adaptive Authentication

Adaptive authentication adjusts security requirements based on risk signals.

**Risk signals to evaluate:**

| Signal | Low Risk | Medium Risk | High Risk |
|--------|----------|-------------|-----------|
| Location | Known location | New city | New country |
| Device | Known device | New browser | New device |
| Time | Business hours | Off-hours | Unusual pattern |
| Behavior | Normal pattern | Slight deviation | Major change |
| IP reputation | Clean IP | Unknown IP | Flagged IP |

**Risk-based response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Risk-Score: 75
X-Risk-Factors: new_device,unusual_time,high_value
X-Auth-Strength: enhanced

{
  "message": "Transaction approved with enhanced verification"
}
```

**High-risk challenge:**

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json
X-Risk-Score: 92
X-Risk-Factors: impossible_travel,flagged_ip,velocity_exceeded

{
  "type": "https://api.example.com/problems/risk-blocked",
  "title": "Request Blocked Due to Risk",
  "status": 403,
  "detail": "This request triggered security controls",
  "instance": "/v1/transfers",
  "risk": {
    "score": 92,
    "factors": ["impossible_travel", "flagged_ip", "velocity_exceeded"],
    "action": "blocked",
    "appealUrl": "https://example.com/security/appeal"
  }
}
```

### Multi-Factor Authentication Flows

**MFA challenge during authentication:**

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
X-MFA-Required: true
X-MFA-Session: mfa-sess-abc123

{
  "type": "https://api.example.com/problems/mfa-required",
  "title": "Multi-Factor Authentication Required",
  "status": 401,
  "detail": "Please complete MFA verification",
  "mfa": {
    "session": "mfa-sess-abc123",
    "methods": [
      {
        "type": "totp",
        "hint": "Authenticator app"
      },
      {
        "type": "sms",
        "hint": "Phone ending in ****5678"
      },
      {
        "type": "webauthn",
        "hint": "Security key"
      }
    ],
    "expiresIn": 300
  }
}
```

**MFA verification request:**

```http
POST /v1/auth/mfa/verify HTTP/1.1
Host: api.example.com
Content-Type: application/json
X-MFA-Session: mfa-sess-abc123

{
  "method": "totp",
  "code": "123456"
}
```

**Successful MFA response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJFUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "mfa_verified": true,
  "amr": ["pwd", "otp"]
}
```

---

## Token Security Patterns

### Demonstrating Proof of Possession (DPoP)

DPoP binds tokens to client key pairs, preventing token theft and replay.

```
                         DPoP Flow
                         
    Client                    API                     Auth Server
      |                        |                           |
      |  1. Generate key pair  |                           |
      |  (one-time setup)      |                           |
      |                        |                           |
      |  2. Token request      |                           |
      |  DPoP: <proof JWT>     |                           |
      |----------------------------------------------->|   |
      |                        |                           |
      |  3. Access token with  |                           |
      |  cnf.jkt claim         |                           |
      |<-----------------------------------------------|   |
      |                        |                           |
      |  4. API request        |                           |
      |  Auth: DPoP <token>    |                           |
      |  DPoP: <new proof>     |                           |
      |----------------------->|                           |
      |                        |                           |
      |  5. Verify:            |                           |
      |  - Token signature     |                           |
      |  - DPoP proof matches  |                           |
      |    token's cnf.jkt     |                           |
      |  - Proof is fresh      |                           |
      |                        |                           |
      |  6. 200 OK             |                           |
      |<-----------------------|                           |
      |                        |                           |
```

**DPoP proof structure:**

```json
{
  "typ": "dpop+jwt",
  "alg": "ES256",
  "jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "base64url-encoded-x-coordinate",
    "y": "base64url-encoded-y-coordinate"
  }
}
```

**DPoP proof claims:**

```json
{
  "jti": "unique-proof-id-abc123",
  "htm": "POST",
  "htu": "https://api.example.com/v1/orders",
  "iat": 1705320000,
  "ath": "fUHyO2r2Z3DZ53EsNrWBb0xWXoaNy59IiKCAqksmQEo"
}
```

**API request with DPoP:**

```http
POST /v1/orders HTTP/1.1
Host: api.example.com
Authorization: DPoP eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9...
DPoP: eyJhbGciOiJFUzI1NiIsInR5cCI6ImRwb3Arand0IiwiandrIjp7...

{
  "items": [...]
}
```

**DPoP validation error:**

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: DPoP error="invalid_dpop_proof", error_description="Proof signature invalid"

{
  "type": "https://api.example.com/problems/invalid-dpop",
  "title": "Invalid DPoP Proof",
  "status": 401,
  "detail": "The DPoP proof signature could not be verified"
}
```

### Token Binding

Token binding ties tokens to TLS connections, preventing token export.

**Token with binding claim:**

```json
{
  "sub": "user-12345",
  "iss": "https://auth.example.com",
  "aud": "api.example.com",
  "exp": 1705320900,
  "iat": 1705320000,
  "cnf": {
    "tbh": "sha256-hash-of-tls-channel-binding"
  }
}
```

**Binding validation headers:**

```http
POST /v1/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
Sec-Token-Binding: encoded-token-binding-message
```

### Token Lifecycle Security

**Token revocation check:**

```http
POST /v1/auth/introspect HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

token=eyJhbGciOiJFUzI1NiIs...
```

**Revoked token response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "active": false,
  "revoked_at": "2024-01-15T10:30:00Z",
  "revocation_reason": "user_logout"
}
```

---

## Request Signing Patterns

### HMAC Request Signing

HMAC signing ensures request integrity and authenticity.

```
                    HMAC Signing Process
                    
+------------------+        +------------------+        +------------------+
|                  |        |                  |        |                  |
|  1. Build        |  --->  |  2. Create       |  --->  |  3. Sign         |
|  canonical       |        |  string to       |        |  with HMAC-      |
|  request         |        |  sign            |        |  SHA256          |
|                  |        |                  |        |                  |
+------------------+        +------------------+        +------------------+
         |                           |                           |
         v                           v                           v
+------------------+        +------------------+        +------------------+
| HTTP-Method      |        | Timestamp        |        | Signature        |
| Path             |        | Host             |        | (Base64)         |
| Query (sorted)   |        | Canonical Request|        |                  |
| Headers (sorted) |        | Hash             |        |                  |
| Body Hash        |        |                  |        |                  |
+------------------+        +------------------+        +------------------+
```

**Canonical request format:**

```
POST
/v1/orders

content-type:application/json
host:api.example.com
x-request-timestamp:2024-01-15T10:30:00Z

content-type;host;x-request-timestamp
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

**Signed request:**

```http
POST /v1/orders HTTP/1.1
Host: api.example.com
Content-Type: application/json
X-Request-Timestamp: 2024-01-15T10:30:00Z
X-API-Key: api-key-abc123
X-Signature-Algorithm: HMAC-SHA256
X-Signature: tL7Z8wF2nP9qR4mX5vY1bK3jH6gC0dA8eI2oU7sW=

{
  "customer_id": "cust-12345",
  "items": [...]
}
```

### AWS Signature v4 Style Signing

For complex signing requirements, use a structured approach.

**Authorization header format:**

```http
Authorization: EXAMPLE4-HMAC-SHA256 
  Credential=AKIAIOSFODNN7EXAMPLE/20240115/us-east-1/orders/example4_request,
  SignedHeaders=content-type;host;x-example-date,
  Signature=a1b2c3d4e5f6g7h8i9j0...
```

**Signing steps:**

1. **Create canonical request:**
```
POST
/v1/orders

content-type:application/json
host:api.example.com
x-example-date:20240115T103000Z

content-type;host;x-example-date
hash-of-request-body
```

2. **Create string to sign:**
```
EXAMPLE4-HMAC-SHA256
20240115T103000Z
20240115/us-east-1/orders/example4_request
hash-of-canonical-request
```

3. **Calculate signature using signing key derived from secret**

**Invalid signature response:**

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/signature-invalid",
  "title": "Request Signature Invalid",
  "status": 401,
  "detail": "The request signature does not match",
  "instance": "/v1/orders",
  "signature": {
    "expected_headers": ["content-type", "host", "x-example-date"],
    "received_headers": ["content-type", "host"],
    "timestamp_drift": "acceptable"
  }
}
```

---

## Mutual TLS (mTLS) for API Authentication

### mTLS Flow

mTLS provides strong client authentication at the transport layer.

```
                         mTLS Handshake
                         
    Client                                              Server
      |                                                    |
      |  1. ClientHello                                    |
      |  (supported ciphers, TLS version)                  |
      |--------------------------------------------------->|
      |                                                    |
      |  2. ServerHello + Certificate                      |
      |  + CertificateRequest                              |
      |<---------------------------------------------------|
      |                                                    |
      |  3. Client validates server cert                   |
      |     against trusted CA                             |
      |                                                    |
      |  4. Client Certificate                             |
      |  + CertificateVerify (signed with private key)     |
      |--------------------------------------------------->|
      |                                                    |
      |  5. Server validates client cert                   |
      |     against trusted CA                             |
      |     Extracts client identity                       |
      |                                                    |
      |  6. Finished (encrypted)                           |
      |<-------------------------------------------------->|
      |                                                    |
      |  7. Application data (encrypted)                   |
      |<=================================================>|
      |                                                    |
```

### mTLS Request with Certificate Headers

When TLS termination happens at a proxy, forward certificate info:

```http
POST /v1/orders HTTP/1.1
Host: api.example.com
Content-Type: application/json
X-Client-Cert-Subject: CN=service-payments,O=Example Corp,C=US
X-Client-Cert-Issuer: CN=Example Internal CA,O=Example Corp,C=US
X-Client-Cert-Serial: 1234567890ABCDEF
X-Client-Cert-Fingerprint: sha256:a1b2c3d4e5f6...
X-Client-Cert-Valid-From: 2024-01-01T00:00:00Z
X-Client-Cert-Valid-To: 2025-01-01T00:00:00Z

{
  "order_id": "ord-123"
}
```

### Certificate Validation Response

**Invalid certificate:**

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/certificate-invalid",
  "title": "Client Certificate Invalid",
  "status": 401,
  "detail": "The client certificate could not be validated",
  "certificate": {
    "error": "expired",
    "subject": "CN=service-payments,O=Example Corp",
    "expired_at": "2023-12-31T23:59:59Z"
  }
}
```

**Unknown certificate:**

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/certificate-unknown",
  "title": "Client Certificate Not Authorized",
  "status": 403,
  "detail": "The client certificate is not in the authorized list",
  "certificate": {
    "subject": "CN=unknown-service,O=Unknown Corp",
    "fingerprint": "sha256:xyz..."
  }
}
```

---

## API Key Security Best Practices

### API Key Structure

Use structured, rotatable API keys:

```
Format: {prefix}_{environment}_{random}_{checksum}

Example: sk_live_a1b2c3d4e5f6g7h8i9j0k1l2_x7y8
         |   |    |                    |
         |   |    |                    +-- Checksum (4 chars)
         |   |    +-- Random (24+ chars)
         |   +-- Environment (live/test)
         +-- Prefix (sk=secret, pk=public)
```

### Key Scoping

**Scoped API key request:**

```http
POST /v1/api-keys HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
Content-Type: application/json

{
  "name": "Payment Processing Key",
  "scopes": ["payments:read", "payments:write"],
  "allowed_ips": ["203.0.113.0/24"],
  "allowed_origins": ["https://app.example.com"],
  "rate_limit": {
    "requests_per_minute": 100
  },
  "expires_at": "2024-12-31T23:59:59Z"
}
```

**Scoped key response:**

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "key-abc123",
  "key": "sk_live_a1b2c3d4e5f6g7h8i9j0k1l2_x7y8",
  "name": "Payment Processing Key",
  "scopes": ["payments:read", "payments:write"],
  "restrictions": {
    "allowed_ips": ["203.0.113.0/24"],
    "allowed_origins": ["https://app.example.com"]
  },
  "rate_limit": {
    "requests_per_minute": 100
  },
  "created_at": "2024-01-15T10:00:00Z",
  "expires_at": "2024-12-31T23:59:59Z",
  "last_used_at": null
}
```

### Key Rotation

**Rotation request:**

```http
POST /v1/api-keys/key-abc123/rotate HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
Content-Type: application/json

{
  "grace_period_hours": 24
}
```

**Rotation response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "key-abc123",
  "current_key": "sk_live_m1n2o3p4q5r6s7t8u9v0w1x2_a1b2",
  "previous_key": {
    "key": "sk_live_a1b2c3d4e5f6g7h8i9j0k1l2_x7y8",
    "expires_at": "2024-01-16T10:00:00Z"
  },
  "rotated_at": "2024-01-15T10:00:00Z"
}
```

### Key Revocation

**Revocation request:**

```http
DELETE /v1/api-keys/key-abc123 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
Content-Type: application/json

{
  "reason": "suspected_compromise",
  "immediate": true
}
```

**Using revoked key:**

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/key-revoked",
  "title": "API Key Revoked",
  "status": 401,
  "detail": "This API key has been revoked",
  "key": {
    "id": "key-abc123",
    "revoked_at": "2024-01-15T10:00:00Z",
    "reason": "suspected_compromise"
  }
}
```

---

## Advanced Security Headers

### Content-Security-Policy for APIs

For APIs serving HTML documentation or admin interfaces:

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  block-all-mixed-content
```

### Permissions-Policy

Control browser features:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Permissions-Policy: 
  accelerometer=(),
  ambient-light-sensor=(),
  autoplay=(),
  battery=(),
  camera=(),
  display-capture=(),
  document-domain=(),
  encrypted-media=(),
  fullscreen=(),
  geolocation=(),
  gyroscope=(),
  magnetometer=(),
  microphone=(),
  midi=(),
  payment=(),
  picture-in-picture=(),
  publickey-credentials-get=(),
  screen-wake-lock=(),
  sync-xhr=(),
  usb=(),
  xr-spatial-tracking=()
```

### Security Headers Quick Reference

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforce HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Content-Security-Policy` | `default-src 'self'` | Control resource loading |
| `Permissions-Policy` | `geolocation=(), camera=()` | Disable browser features |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer |
| `Cache-Control` | `no-store` | Prevent caching sensitive data |
| `X-Request-ID` | `req-abc123` | Request tracing |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate browsing context |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevent cross-origin reads |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Enable cross-origin isolation |

---

## Bot Detection and Protection

### Bot Detection Signals

```
                    Bot Detection Pipeline
                    
+------------------+        +------------------+        +------------------+
|                  |        |                  |        |                  |
|  Request         |  --->  |  Signal          |  --->  |  Decision        |
|  Intake          |        |  Analysis        |        |  Engine          |
|                  |        |                  |        |                  |
+------------------+        +------------------+        +------------------+
         |                           |                           |
         v                           v                           v
+------------------+        +------------------+        +------------------+
| Headers          |        | Device signals   |        | Allow            |
| TLS fingerprint  |        | Behavior pattern |        | Challenge        |
| IP reputation    |        | Request timing   |        | Block            |
| User-Agent       |        | Mouse/touch data |        | Rate limit       |
+------------------+        +------------------+        +------------------+
```

### Bot Challenge Response

**Challenge required:**

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json
X-Bot-Challenge: required
X-Challenge-Type: js-challenge

{
  "type": "https://api.example.com/problems/bot-challenge",
  "title": "Bot Detection Challenge Required",
  "status": 403,
  "detail": "Please complete the challenge to continue",
  "challenge": {
    "type": "js-challenge",
    "url": "https://challenge.example.com/verify/abc123",
    "expires_in": 300
  }
}
```

### Bot Detection Headers

```http
POST /v1/orders HTTP/1.1
Host: api.example.com
X-Client-Data: encoded-client-signals
X-Device-Fingerprint: sha256:device-fingerprint-hash
X-Request-Timestamp: 1705320000
X-Request-Proof: proof-of-work-token
```

**Bot blocked response:**

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json
X-Bot-Score: 95
X-Bot-Signals: automated,headless,proxy

{
  "type": "https://api.example.com/problems/bot-blocked",
  "title": "Automated Request Blocked",
  "status": 403,
  "detail": "This request appears to be automated",
  "contact": "security@example.com"
}
```

---

## Abuse Prevention Patterns

### Credential Stuffing Protection

**Detection signals:**
- High failure rate from IP/range
- Login attempts across many accounts
- Known credential breach patterns
- Unusual geographic distribution

**Protection response:**

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
X-Credential-Protection: active
Retry-After: 3600

{
  "type": "https://api.example.com/problems/credential-protection",
  "title": "Account Protection Active",
  "status": 429,
  "detail": "Too many failed login attempts detected",
  "protection": {
    "type": "credential_stuffing_defense",
    "blocked_until": "2024-01-15T11:30:00Z",
    "affected_scope": "ip_range"
  }
}
```

### Account Takeover Prevention

**Risk indicators for ATO:**

| Signal | Risk Level | Action |
|--------|------------|--------|
| Password change + email change | Critical | Block, notify, require verification |
| New device + sensitive action | High | Step-up authentication |
| Impossible travel | High | Challenge or block |
| Multiple password resets | Medium | Rate limit, verify identity |
| Session from proxy/VPN | Low-Medium | Enhanced monitoring |

**ATO prevention response:**

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json
X-Security-Hold: account-protection

{
  "type": "https://api.example.com/problems/account-protection-hold",
  "title": "Account Security Hold",
  "status": 403,
  "detail": "Unusual activity detected. Please verify your identity.",
  "protection": {
    "reason": "impossible_travel",
    "last_location": "New York, US",
    "current_location": "London, UK",
    "time_difference_minutes": 30,
    "verification_required": true,
    "verification_url": "https://example.com/verify-identity"
  }
}
```

### Velocity Limits

Apply limits based on action patterns:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
X-Velocity-Limit: exceeded

{
  "type": "https://api.example.com/problems/velocity-limit",
  "title": "Action Velocity Limit Exceeded",
  "status": 429,
  "detail": "Too many password reset requests",
  "velocity": {
    "action": "password_reset",
    "limit": 3,
    "period": "1 hour",
    "count": 5,
    "reset_at": "2024-01-15T11:00:00Z"
  }
}
```

---

## Security Event Logging Standards

### Security Event Format

Use structured logging with consistent fields:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "event_type": "security.authentication.failure",
  "severity": "warn",
  "service": "api-gateway",
  "environment": "production",
  
  "request": {
    "id": "req-abc123",
    "correlation_id": "corr-xyz789",
    "method": "POST",
    "path": "/v1/auth/token",
    "client_ip": "203.0.113.45",
    "user_agent": "Mozilla/5.0...",
    "geo": {
      "country": "US",
      "region": "CA",
      "city": "San Francisco"
    }
  },
  
  "security": {
    "event_category": "authentication",
    "event_action": "login_failed",
    "outcome": "failure",
    "reason": "invalid_credentials",
    "risk_score": 35,
    "user_id": "user-12345",
    "session_id": null,
    "mfa_used": false,
    "auth_method": "password"
  },
  
  "context": {
    "device_fingerprint": "sha256:abc...",
    "tls_version": "TLSv1.3",
    "cipher_suite": "TLS_AES_256_GCM_SHA384",
    "attempt_count": 3
  }
}
```

### Event Types to Log

| Category | Events | Severity |
|----------|--------|----------|
| Authentication | Login success/failure, MFA events, token refresh | Info/Warn |
| Authorization | Access denied, privilege escalation attempt | Warn/Error |
| Account | Password change, email change, MFA enrollment | Info |
| API Keys | Creation, rotation, revocation, usage | Info |
| Rate Limiting | Limit exceeded, quota exhausted | Warn |
| Security | Bot detected, attack blocked, certificate issues | Warn/Error |
| Admin | Config change, user management, audit access | Info |

### Log Redaction Requirements

**Never log:**
- Passwords or secrets
- Full credit card numbers
- Full social security numbers
- Complete API keys (show prefix only)
- Session tokens or JWTs

**Redaction example:**

```json
{
  "event_type": "security.api_key.created",
  "api_key": {
    "id": "key-abc123",
    "prefix": "sk_live_",
    "suffix": "_x7y8",
    "full_key": "[REDACTED]"
  },
  "created_by": "user-12345"
}
```

---

## Incident Response Patterns

### Security Incident Response Flow

```
                    Incident Response Flow
                    
+-------------+     +-------------+     +-------------+     +-------------+
|             |     |             |     |             |     |             |
|  Detection  | --> | Triage      | --> | Containment | --> | Eradication |
|             |     |             |     |             |     |             |
+-------------+     +-------------+     +-------------+     +-------------+
      |                   |                   |                   |
      v                   v                   v                   v
+-------------+     +-------------+     +-------------+     +-------------+
| Alerts      |     | Severity    |     | Block bad   |     | Fix root    |
| Anomalies   |     | assessment  |     | actors      |     | cause       |
| Reports     |     | Scope       |     | Preserve    |     | Patch       |
|             |     | analysis    |     | evidence    |     | systems     |
+-------------+     +-------------+     +-------------+     +-------------+
                                              |
                                              v
                                        +-------------+
                                        |             |
                                        |  Recovery   |
                                        |  & Review   |
                                        |             |
                                        +-------------+
```

### Incident Status Endpoint

**Check security status:**

```http
GET /v1/security/status HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
```

**Active incident response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "degraded",
  "incidents": [
    {
      "id": "inc-abc123",
      "severity": "high",
      "type": "ddos_attack",
      "started_at": "2024-01-15T09:00:00Z",
      "status": "mitigating",
      "affected_services": ["orders-api", "payments-api"],
      "user_impact": "increased_latency",
      "updates_url": "https://status.example.com/incidents/inc-abc123"
    }
  ],
  "mitigations_active": [
    "rate_limits_reduced",
    "geographic_filtering"
  ]
}
```

### Emergency Response Headers

During active incidents:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/problem+json
Retry-After: 300
X-Incident-ID: inc-abc123
X-Incident-Status: mitigating

{
  "type": "https://api.example.com/problems/service-unavailable",
  "title": "Service Temporarily Unavailable",
  "status": 503,
  "detail": "We are addressing a service issue. Please retry later.",
  "incident": {
    "id": "inc-abc123",
    "status_url": "https://status.example.com/incidents/inc-abc123"
  },
  "retry_after": 300
}
```

---

## Security Automation

### Automated Vulnerability Scanning

**Scan status endpoint:**

```http
GET /v1/security/scans/latest HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
```

**Scan results:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "scan_id": "scan-abc123",
  "completed_at": "2024-01-15T08:00:00Z",
  "duration_seconds": 1847,
  "summary": {
    "critical": 0,
    "high": 2,
    "medium": 5,
    "low": 12,
    "informational": 23
  },
  "findings": [
    {
      "id": "finding-001",
      "severity": "high",
      "category": "injection",
      "title": "SQL Injection in Search Parameter",
      "endpoint": "GET /v1/products",
      "parameter": "search",
      "cwe": "CWE-89",
      "remediation": "Use parameterized queries"
    }
  ],
  "next_scan": "2024-01-16T08:00:00Z"
}
```

### Security Gates in CI/CD

**Gate check endpoint:**

```http
POST /v1/security/gates/check HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
Content-Type: application/json

{
  "pipeline_id": "pipe-abc123",
  "commit_sha": "a1b2c3d4e5f6",
  "branch": "main",
  "checks_requested": [
    "dependency_vulnerabilities",
    "secret_scanning",
    "sast_results",
    "container_scanning"
  ]
}
```

**Gate result:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "gate_status": "blocked",
  "checks": {
    "dependency_vulnerabilities": {
      "status": "failed",
      "critical": 1,
      "blocking_finding": {
        "package": "log4j-core",
        "version": "2.14.0",
        "vulnerability": "CVE-2021-44228",
        "severity": "critical"
      }
    },
    "secret_scanning": {
      "status": "passed",
      "secrets_found": 0
    },
    "sast_results": {
      "status": "passed",
      "high_findings": 0
    },
    "container_scanning": {
      "status": "passed",
      "critical": 0
    }
  },
  "recommendation": "Update log4j-core to version 2.17.1 or later"
}
```

---

## Supply Chain Security

### Dependency Verification

**Verify dependency integrity:**

```http
POST /v1/security/dependencies/verify HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
Content-Type: application/json

{
  "dependencies": [
    {
      "name": "lodash",
      "version": "4.17.21",
      "ecosystem": "npm",
      "checksum": "sha512:abc123..."
    }
  ]
}
```

**Verification response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "verified": true,
  "dependencies": [
    {
      "name": "lodash",
      "version": "4.17.21",
      "status": "verified",
      "checksum_match": true,
      "known_vulnerabilities": [],
      "license": "MIT",
      "maintainer_verified": true
    }
  ]
}
```

### SBOM (Software Bill of Materials)

**Request API SBOM:**

```http
GET /v1/security/sbom HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
Accept: application/spdx+json
```

**SBOM response (abbreviated):**

```http
HTTP/1.1 200 OK
Content-Type: application/spdx+json

{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "api.example.com-sbom",
  "documentNamespace": "https://api.example.com/sbom/2024-01-15",
  "creationInfo": {
    "created": "2024-01-15T10:00:00Z",
    "creators": ["Tool: sbom-generator-1.0"]
  },
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-1",
      "name": "spring-boot",
      "versionInfo": "3.2.1",
      "supplier": "Organization: VMware",
      "downloadLocation": "https://repo1.maven.org/...",
      "checksums": [
        {
          "algorithm": "SHA256",
          "checksumValue": "abc123..."
        }
      ]
    }
  ]
}
```

---

## Data Classification and Handling

### Classification Levels

| Level | Description | API Handling |
|-------|-------------|--------------|
| Public | Openly available | No restrictions |
| Internal | Business use only | Require authentication |
| Confidential | Sensitive business data | Require authorization + encryption |
| Restricted | PII, financial, health | Require strong auth + audit + encryption |

### Classification Headers

**Request with classification:**

```http
GET /v1/customers/12345 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
X-Data-Purpose: customer_service
X-Data-Justification: support_ticket_12345
```

**Response with classification:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Data-Classification: restricted
X-Data-Retention: 90d
X-Data-Handling: no-cache,no-log-full,audit-required
Cache-Control: no-store

{
  "id": "cust-12345",
  "email": "user@example.com",
  "classification": "restricted",
  "pii_fields": ["email", "phone", "address"]
}
```

### Field-Level Classification

**Response with field annotations:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "cust-12345",
  "name": "John Smith",
  "email": "j***@example.com",
  "_classification": {
    "id": "internal",
    "name": "confidential",
    "email": "restricted",
    "email_masked": true
  },
  "_data_access": {
    "purpose": "customer_service",
    "justification": "support_ticket_12345",
    "accessed_by": "agent-789",
    "accessed_at": "2024-01-15T10:30:00Z"
  }
}
```

### Data Handling Errors

**Insufficient clearance:**

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json
X-Data-Classification: restricted

{
  "type": "https://api.example.com/problems/insufficient-clearance",
  "title": "Data Access Denied",
  "status": 403,
  "detail": "You do not have clearance for restricted data",
  "classification": {
    "required": "restricted",
    "user_clearance": "confidential",
    "request_access_url": "https://example.com/request-access"
  }
}
```

---

## Implementation Checklist

### Zero Trust Implementation

- [ ] Verify identity on every request (not just at session start)
- [ ] Implement least-privilege access by default
- [ ] Use short-lived tokens (15-60 minutes)
- [ ] Enable mTLS for service-to-service communication
- [ ] Log all access attempts with context

### Authentication Security

- [ ] Implement step-up authentication for sensitive operations
- [ ] Configure adaptive authentication with risk scoring
- [ ] Support multiple MFA methods (TOTP, WebAuthn, SMS backup)
- [ ] Implement DPoP for token binding
- [ ] Set secure token lifetimes

### Request Security

- [ ] Implement request signing for sensitive endpoints
- [ ] Validate all request signatures on the server
- [ ] Include timestamp to prevent replay attacks
- [ ] Use strong HMAC algorithms (SHA-256 minimum)

### API Key Management

- [ ] Use structured key format with environment prefix
- [ ] Scope keys to specific permissions and IPs
- [ ] Implement automatic key rotation
- [ ] Provide immediate revocation capability
- [ ] Never log complete API keys

### Security Headers

- [ ] Set `Strict-Transport-Security` with long max-age
- [ ] Include `Content-Security-Policy` for HTML responses
- [ ] Add `Permissions-Policy` to disable unused browser features
- [ ] Set `X-Content-Type-Options: nosniff`
- [ ] Include `X-Frame-Options: DENY`

### Bot and Abuse Prevention

- [ ] Implement bot detection with challenge capability
- [ ] Configure credential stuffing protection
- [ ] Set velocity limits for sensitive actions
- [ ] Enable impossible travel detection
- [ ] Monitor for account takeover patterns

### Logging and Monitoring

- [ ] Log all security events with structured format
- [ ] Redact sensitive data from logs
- [ ] Enable real-time alerting for security events
- [ ] Retain logs per compliance requirements
- [ ] Implement audit trail for admin actions

### Incident Response

- [ ] Document incident response procedures
- [ ] Create emergency contact list
- [ ] Test incident response annually
- [ ] Maintain status page for transparency
- [ ] Enable emergency mitigation controls

### Supply Chain Security

- [ ] Scan dependencies for vulnerabilities
- [ ] Verify dependency checksums
- [ ] Generate and maintain SBOM
- [ ] Implement security gates in CI/CD
- [ ] Review third-party API security

### Data Protection

- [ ] Classify all data by sensitivity
- [ ] Implement field-level access controls
- [ ] Enable data access auditing
- [ ] Apply encryption for restricted data
- [ ] Configure appropriate cache controls

---

## Related Documentation

### Core Security
- [Security Standards](security-standards.md) - Authentication, authorization, and basic security
- [Rate Limiting Standards](rate-limiting-standards.md) - Throttling and quota management

### Implementation Patterns
- [Error Response Standards](../request-response/error-response-standards.md) - Security error formatting
- [HTTP Client Best Practices](../request-response/http-client-best-practices.md) - Secure client implementation

### Observability
- [API Observability Standards](../advanced-patterns/api-observability-standards.md) - Security monitoring
- [Performance Standards](../advanced-patterns/performance-standards.md) - Security and performance

### Spring Implementation
- [OAuth2 Resource Server](../../spring-design/security/oauth2-resource-server.md) - Spring OAuth2
- [Authorization Patterns](../../spring-design/security/authorization-patterns.md) - Spring authorization
- [Security Testing](../../spring-design/security/security-testing.md) - Security test patterns
