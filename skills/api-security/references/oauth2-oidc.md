# OAuth 2.1 and OpenID Connect

## OAuth 2.1 Overview

OAuth 2.1 consolidates OAuth 2.0 with security best practices. Key changes from OAuth 2.0:

- **PKCE required** for all clients (not just public)
- **Refresh token rotation** recommended
- **Implicit grant removed** (use authorization code + PKCE)
- **Password grant removed** (deprecated)

## Token Flows

### Authorization Code + PKCE (Recommended)

For web and mobile apps:

```
1. Client generates code_verifier and code_challenge
2. Client redirects to authorization server with code_challenge
3. User authenticates
4. Authorization server redirects with authorization code
5. Client exchanges code + code_verifier for tokens
6. Authorization server validates and returns tokens
```

### Client Credentials

For service-to-service (machine-to-machine):

```
POST /oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=service-a
&client_secret=secret
&scope=orders:read orders:write
```

Response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "orders:read orders:write"
}
```

## JWT Structure

### Header

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id-123"
}
```

- `alg`: Signing algorithm (RS256, ES256 recommended)
- `kid`: Key ID for key rotation support

### Payload (Claims)

```json
{
  "iss": "https://auth.example.com",
  "sub": "user-123",
  "aud": ["order-service", "customer-service"],
  "exp": 1640995200,
  "iat": 1640991600,
  "nbf": 1640991600,
  "jti": "unique-token-id",
  "scope": "orders:read orders:write",
  "roles": ["user", "admin"]
}
```

### Standard Claims

| Claim | Description | Required |
|-------|-------------|----------|
| `iss` | Issuer URL | Yes |
| `sub` | Subject (user ID) | Yes |
| `aud` | Audience (intended recipients) | Yes |
| `exp` | Expiration time (Unix timestamp) | Yes |
| `iat` | Issued at time | Recommended |
| `nbf` | Not before time | Recommended |
| `jti` | JWT ID (unique identifier) | Optional |

### Custom Claims

```json
{
  "scope": "orders:read orders:write",
  "roles": ["user", "admin"],
  "tenant_id": "tenant-123",
  "resource_access": {
    "order-service": {
      "roles": ["order-manager"]
    }
  }
}
```

## Token Validation

### Required Validations

```javascript
function validateToken(token, expectedAudience) {
  const decoded = jwt.decode(token, { complete: true });
  
  // 1. Verify signature
  const publicKey = getPublicKey(decoded.header.kid);
  jwt.verify(token, publicKey, { algorithms: ['RS256', 'ES256'] });
  
  // 2. Check expiration
  if (decoded.payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }
  
  // 3. Check not-before
  if (decoded.payload.nbf && decoded.payload.nbf > Date.now() / 1000) {
    throw new Error('Token not yet valid');
  }
  
  // 4. Verify issuer
  if (decoded.payload.iss !== 'https://auth.example.com') {
    throw new Error('Invalid issuer');
  }
  
  // 5. Verify audience
  const audiences = Array.isArray(decoded.payload.aud) 
    ? decoded.payload.aud 
    : [decoded.payload.aud];
  if (!audiences.includes(expectedAudience)) {
    throw new Error('Invalid audience');
  }
  
  return decoded.payload;
}
```

### Key Rotation

Fetch public keys from JWKS endpoint:

```
GET https://auth.example.com/.well-known/jwks.json
```

Response:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-id-123",
      "use": "sig",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

Cache keys with appropriate TTL. Refetch when `kid` not found.

## OpenID Connect

OIDC adds identity layer on top of OAuth 2.0.

### ID Token

Contains user identity claims:

```json
{
  "iss": "https://auth.example.com",
  "sub": "user-123",
  "aud": "client-app",
  "exp": 1640995200,
  "iat": 1640991600,
  "nonce": "random-nonce",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true
}
```

### UserInfo Endpoint

Get additional user claims:

```http
GET /userinfo HTTP/1.1
Authorization: Bearer {access_token}
```

Response:
```json
{
  "sub": "user-123",
  "name": "John Doe",
  "email": "john@example.com",
  "picture": "https://example.com/photos/john.jpg"
}
```

### Discovery Document

```
GET https://auth.example.com/.well-known/openid-configuration
```

Returns endpoints and capabilities:

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "userinfo_endpoint": "https://auth.example.com/userinfo",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "scopes_supported": ["openid", "profile", "email"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials"]
}
```

## Token Refresh

### Refresh Flow

```http
POST /oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...
&client_id=my-app
```

Response:
```json
{
  "access_token": "new-access-token...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new-refresh-token...",
  "scope": "orders:read orders:write"
}
```

### Refresh Token Best Practices

1. **Rotation**: Issue new refresh token with each use
2. **One-time use**: Invalidate after use
3. **Detect reuse**: If old refresh token used, revoke all tokens
4. **Secure storage**: Store encrypted, never in browser storage

## Scope Design

### Naming Convention

```
{resource}:{action}

Examples:
orders:read
orders:write
orders:delete
customers:read
admin:full
```

### Scope Hierarchy

```
admin:full
├── orders:read
├── orders:write
├── orders:delete
├── customers:read
└── customers:write
```

### Common Patterns

| Scope | Description |
|-------|-------------|
| `openid` | Required for OIDC, returns `sub` claim |
| `profile` | User's name, picture, etc. |
| `email` | User's email address |
| `offline_access` | Request refresh token |
| `{resource}:read` | Read access to resource |
| `{resource}:write` | Create/update resource |
| `{resource}:delete` | Delete resource |
| `{resource}:admin` | Full access to resource |

## Security Considerations

### Token Storage

| Environment | Recommendation |
|-------------|----------------|
| Browser SPA | HttpOnly cookie or memory (not localStorage) |
| Mobile App | Secure storage (Keychain/Keystore) |
| Server | Secure environment variables |

### Token Transmission

- Always use HTTPS
- Use Authorization header, not query params
- Set short expiration (15-60 minutes)
- Use refresh tokens for longer sessions

### Algorithm Selection

| Algorithm | Type | Recommendation |
|-----------|------|----------------|
| RS256 | Asymmetric RSA | Recommended |
| ES256 | Asymmetric ECDSA | Recommended |
| HS256 | Symmetric HMAC | Only for same-system signing |

Never use `none` algorithm. Validate `alg` header matches expected.
