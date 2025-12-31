# User Management API Example

> **Reading Guide**: ~19 min read | Grade 14 | Complete user authentication and management API

This example shows a complete user management API. It demonstrates registration flows, authentication with tokens, profile management, password reset, and account deletion using the soft delete pattern.

---

## Patterns Demonstrated

This example teaches these API design patterns:

| Pattern | Section | Documentation Reference |
|---------|---------|------------------------|
| User registration flow | Registration | [Resource Naming](../foundations/resource-naming-and-url-structure.md) |
| OAuth 2.1 token exchange | Authentication | [Security Standards](../security/security-standards.md) |
| Refresh token rotation | Token Refresh | [Security Standards](../security/security-standards.md) |
| Action endpoints (verbs) | Password Reset | [Special Endpoints](../foundations/resource-naming-and-url-structure.md#special-endpoints) |
| Soft delete pattern | Account Deletion | [Data Modeling](../foundations/data-modeling-standards.md) |
| RFC 9457 error responses | All Errors | [Error Standards](../request-response/error-response-standards.md) |
| Security headers | All Responses | [Security Standards](../security/security-standards.md) |

---

## Business Context

TechCorp builds a SaaS platform. Users create accounts, authenticate, manage their profiles, and control their account settings. The User Management API handles the complete user lifecycle from signup to account deletion.

### Key Entities

- **Users**: Platform accounts with profile information
- **Sessions**: Active authentication sessions
- **Tokens**: Access and refresh tokens for API authentication
- **Password Reset Requests**: Time-limited reset tokens

---

## Resource Design

### URL Structure

```
/v1/users                               # User collection (admin)
/v1/users/{userId}                      # Single user (admin)
/v1/users/me                            # Current authenticated user
/v1/users/me/profile                    # Current user's profile
/v1/users/me/sessions                   # Current user's active sessions

/v1/auth/register                       # User registration
/v1/auth/login                          # Authentication (token exchange)
/v1/auth/refresh                        # Token refresh
/v1/auth/logout                         # Session termination

/v1/auth/password/reset-request         # Request password reset
/v1/auth/password/reset                 # Complete password reset
/v1/auth/password/change                # Change password (authenticated)
```

### User Resource

```json
{
  "id": "user-8a4b2c1d",
  "email": "sarah.chen@example.com",
  "emailVerified": true,
  "profile": {
    "firstName": "Sarah",
    "lastName": "Chen",
    "displayName": "Sarah Chen",
    "avatarUrl": "https://cdn.techcorp.com/avatars/user-8a4b2c1d.jpg",
    "timezone": "America/Los_Angeles",
    "locale": "en-US"
  },
  "settings": {
    "twoFactorEnabled": true,
    "marketingEmails": false,
    "productUpdates": true
  },
  "status": "ACTIVE",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-07-10T14:22:15Z",
  "lastLoginAt": "2024-07-15T08:45:00Z"
}
```

### User Status Values

| Status | Description |
|--------|-------------|
| `PENDING_VERIFICATION` | Email verification required |
| `ACTIVE` | Normal active account |
| `SUSPENDED` | Temporarily disabled by admin |
| `DEACTIVATED` | User-initiated soft delete |
| `DELETED` | Permanently deleted (data purged) |

---

## User Registration

Creates a new user account and sends a verification email.

### Request

```http
POST /v1/auth/register HTTP/1.1
Host: api.techcorp.com
Content-Type: application/json
X-Request-ID: req-reg-001

{
  "email": "james.wilson@example.com",
  "password": "SecureP@ssw0rd123!",
  "profile": {
    "firstName": "James",
    "lastName": "Wilson"
  },
  "acceptedTerms": true,
  "acceptedPrivacyPolicy": true
}
```

### Response: Success (201 Created)

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /v1/users/user-9f3e2d1c
X-Request-ID: req-reg-001

{
  "id": "user-9f3e2d1c",
  "email": "james.wilson@example.com",
  "emailVerified": false,
  "profile": {
    "firstName": "James",
    "lastName": "Wilson",
    "displayName": "James Wilson"
  },
  "status": "PENDING_VERIFICATION",
  "createdAt": "2024-07-15T14:30:00Z",
  "message": "Account created. Please check your email to verify your account."
}
```

### Response: Duplicate Email (409 Conflict)

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json
X-Request-ID: req-reg-002

{
  "type": "https://api.techcorp.com/problems/email-already-registered",
  "title": "Email Already Registered",
  "status": 409,
  "detail": "An account with this email address already exists",
  "instance": "/v1/auth/register",
  "requestId": "req-reg-002"
}
```

### Response: Validation Error (400 Bad Request)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json
X-Request-ID: req-reg-003

{
  "type": "https://api.techcorp.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The registration request contains validation errors",
  "instance": "/v1/auth/register",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Email address is not valid"
    },
    {
      "field": "password",
      "code": "TOO_WEAK",
      "message": "Password must be at least 12 characters and include uppercase, lowercase, number, and special character"
    },
    {
      "field": "acceptedTerms",
      "code": "REQUIRED",
      "message": "You must accept the terms of service"
    }
  ],
  "requestId": "req-reg-003"
}
```

---

## Email Verification

Verifies the user's email address using the token sent via email.

### Request

```http
POST /v1/auth/verify-email HTTP/1.1
Host: api.techcorp.com
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTlmM2UyZDFjIiwidHlwZSI6ImVtYWlsX3ZlcmlmaWNhdGlvbiIsImV4cCI6MTcyMTEzOTAwMH0.signature"
}
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Email verified successfully",
  "userId": "user-9f3e2d1c",
  "email": "james.wilson@example.com",
  "status": "ACTIVE"
}
```

### Response: Token Expired (400 Bad Request)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.techcorp.com/problems/token-expired",
  "title": "Verification Token Expired",
  "status": 400,
  "detail": "The email verification token has expired. Please request a new verification email.",
  "instance": "/v1/auth/verify-email",
  "action": {
    "endpoint": "/v1/auth/resend-verification",
    "method": "POST"
  }
}
```

---

## Authentication (Login)

Authenticates a user and returns access and refresh tokens.

### Request

```http
POST /v1/auth/login HTTP/1.1
Host: api.techcorp.com
Content-Type: application/json
X-Request-ID: req-login-001

{
  "email": "sarah.chen@example.com",
  "password": "SecureP@ssw0rd456!"
}
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache
X-Request-ID: req-login-001

{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLThhNGIyYzFkIiwiZW1haWwiOiJzYXJhaC5jaGVuQGV4YW1wbGUuY29tIiwiaWF0IjoxNzIxMDUyODAwLCJleHAiOjE3MjEwNTY0MDB9.signature",
  "refreshToken": "dGhpcyBpcyBhIHNlY3VyZSByZWZyZXNoIHRva2VuIGZvciB1c2VyLThhNGIyYzFk",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "refreshExpiresIn": 604800,
  "user": {
    "id": "user-8a4b2c1d",
    "email": "sarah.chen@example.com",
    "profile": {
      "firstName": "Sarah",
      "lastName": "Chen",
      "displayName": "Sarah Chen",
      "avatarUrl": "https://cdn.techcorp.com/avatars/user-8a4b2c1d.jpg"
    }
  }
}
```

### Response: Invalid Credentials (401 Unauthorized)

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
X-Request-ID: req-login-002

{
  "type": "https://api.techcorp.com/problems/invalid-credentials",
  "title": "Invalid Credentials",
  "status": 401,
  "detail": "The email or password you entered is incorrect",
  "instance": "/v1/auth/login",
  "requestId": "req-login-002"
}
```

### Response: Account Locked (403 Forbidden)

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://api.techcorp.com/problems/account-locked",
  "title": "Account Locked",
  "status": 403,
  "detail": "Your account has been temporarily locked due to too many failed login attempts",
  "instance": "/v1/auth/login",
  "lockoutEndsAt": "2024-07-15T15:00:00Z",
  "remainingMinutes": 15,
  "action": {
    "description": "You can reset your password to unlock your account immediately",
    "endpoint": "/v1/auth/password/reset-request",
    "method": "POST"
  }
}
```

### Response: Two-Factor Required (200 OK with MFA Challenge)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "mfaRequired": true,
  "mfaToken": "mfa-challenge-token-abc123",
  "mfaMethods": [
    {
      "type": "TOTP",
      "hint": "Authenticator app"
    },
    {
      "type": "SMS",
      "hint": "Phone ending in **89"
    }
  ],
  "expiresIn": 300
}
```

---

## Token Refresh

Exchanges a refresh token for a new access token. Implements refresh token rotation for security.

### Request

```http
POST /v1/auth/refresh HTTP/1.1
Host: api.techcorp.com
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHNlY3VyZSByZWZyZXNoIHRva2VuIGZvciB1c2VyLThhNGIyYzFk"
}
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache

{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLThhNGIyYzFkIiwiZW1haWwiOiJzYXJhaC5jaGVuQGV4YW1wbGUuY29tIiwiaWF0IjoxNzIxMDU2NDAwLCJleHAiOjE3MjEwNjAwMDB9.new-signature",
  "refreshToken": "bmV3IHJvdGF0ZWQgcmVmcmVzaCB0b2tlbiBmb3IgdXNlci04YTRiMmMxZA",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "refreshExpiresIn": 604800
}
```

### Response: Invalid Refresh Token (401 Unauthorized)

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://api.techcorp.com/problems/invalid-refresh-token",
  "title": "Invalid Refresh Token",
  "status": 401,
  "detail": "The refresh token is invalid, expired, or has already been used",
  "instance": "/v1/auth/refresh"
}
```

---

## Profile Management

### Get Current User Profile

```http
GET /v1/users/me HTTP/1.1
Host: api.techcorp.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: private, max-age=60

{
  "id": "user-8a4b2c1d",
  "email": "sarah.chen@example.com",
  "emailVerified": true,
  "profile": {
    "firstName": "Sarah",
    "lastName": "Chen",
    "displayName": "Sarah Chen",
    "avatarUrl": "https://cdn.techcorp.com/avatars/user-8a4b2c1d.jpg",
    "timezone": "America/Los_Angeles",
    "locale": "en-US",
    "bio": "Software engineer passionate about building great products"
  },
  "settings": {
    "twoFactorEnabled": true,
    "marketingEmails": false,
    "productUpdates": true
  },
  "status": "ACTIVE",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-07-10T14:22:15Z",
  "lastLoginAt": "2024-07-15T08:45:00Z"
}
```

### Update Profile

```http
PATCH /v1/users/me/profile HTTP/1.1
Host: api.techcorp.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/merge-patch+json

{
  "displayName": "Sarah C.",
  "timezone": "America/New_York",
  "bio": "Engineering lead focused on API design and developer experience"
}
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "profile": {
    "firstName": "Sarah",
    "lastName": "Chen",
    "displayName": "Sarah C.",
    "avatarUrl": "https://cdn.techcorp.com/avatars/user-8a4b2c1d.jpg",
    "timezone": "America/New_York",
    "locale": "en-US",
    "bio": "Engineering lead focused on API design and developer experience"
  },
  "updatedAt": "2024-07-15T15:00:00Z"
}
```

---

## Password Reset Flow

### Step 1: Request Password Reset

Sends a password reset email to the user.

```http
POST /v1/auth/password/reset-request HTTP/1.1
Host: api.techcorp.com
Content-Type: application/json

{
  "email": "sarah.chen@example.com"
}
```

### Response: Success (202 Accepted)

Always returns success to prevent email enumeration attacks.

```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "message": "If an account exists with this email, you will receive a password reset link shortly",
  "expiresIn": 3600
}
```

### Step 2: Complete Password Reset

Resets the password using the token from the email.

```http
POST /v1/auth/password/reset HTTP/1.1
Host: api.techcorp.com
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLThhNGIyYzFkIiwidHlwZSI6InBhc3N3b3JkX3Jlc2V0IiwiZXhwIjoxNzIxMDU2NDAwfQ.signature",
  "newPassword": "NewSecureP@ssw0rd789!"
}
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Password reset successfully. All existing sessions have been terminated.",
  "sessionsTerminated": 3
}
```

### Response: Token Invalid (400 Bad Request)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.techcorp.com/problems/invalid-reset-token",
  "title": "Invalid Reset Token",
  "status": 400,
  "detail": "The password reset token is invalid or has expired",
  "instance": "/v1/auth/password/reset",
  "action": {
    "description": "Please request a new password reset",
    "endpoint": "/v1/auth/password/reset-request",
    "method": "POST"
  }
}
```

---

## Change Password (Authenticated)

Changes password for an authenticated user.

### Request

```http
POST /v1/auth/password/change HTTP/1.1
Host: api.techcorp.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currentPassword": "OldSecureP@ssw0rd456!",
  "newPassword": "NewSecureP@ssw0rd789!"
}
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Password changed successfully",
  "invalidateOtherSessions": true,
  "sessionsTerminated": 2
}
```

### Response: Incorrect Current Password (400 Bad Request)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.techcorp.com/problems/incorrect-password",
  "title": "Incorrect Password",
  "status": 400,
  "detail": "The current password you entered is incorrect",
  "instance": "/v1/auth/password/change"
}
```

---

## Session Management

### List Active Sessions

```http
GET /v1/users/me/sessions HTTP/1.1
Host: api.techcorp.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "sess-abc123",
      "current": true,
      "device": {
        "type": "desktop",
        "browser": "Chrome 115",
        "os": "macOS 14.0"
      },
      "ipAddress": "192.168.1.100",
      "location": {
        "city": "San Francisco",
        "region": "California",
        "country": "US"
      },
      "createdAt": "2024-07-15T08:45:00Z",
      "lastActiveAt": "2024-07-15T14:30:00Z"
    },
    {
      "id": "sess-def456",
      "current": false,
      "device": {
        "type": "mobile",
        "browser": "Safari Mobile",
        "os": "iOS 17.0"
      },
      "ipAddress": "10.0.0.50",
      "location": {
        "city": "San Francisco",
        "region": "California",
        "country": "US"
      },
      "createdAt": "2024-07-14T19:30:00Z",
      "lastActiveAt": "2024-07-14T21:15:00Z"
    }
  ],
  "meta": {
    "totalSessions": 2
  }
}
```

### Terminate Specific Session

```http
DELETE /v1/users/me/sessions/sess-def456 HTTP/1.1
Host: api.techcorp.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response: Success (204 No Content)

```http
HTTP/1.1 204 No Content
```

### Terminate All Other Sessions

```http
POST /v1/users/me/sessions/terminate-others HTTP/1.1
Host: api.techcorp.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "All other sessions terminated",
  "sessionsTerminated": 1
}
```

---

## Account Deletion (Soft Delete)

Implements the soft delete pattern. Account is marked as deactivated and data is retained for a grace period before permanent deletion.

### Request: Deactivate Account

```http
POST /v1/users/me/deactivate HTTP/1.1
Host: api.techcorp.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "password": "CurrentP@ssw0rd123!",
  "reason": "No longer using the service",
  "feedback": "Great product, just don't need it anymore"
}
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Account deactivated successfully",
  "status": "DEACTIVATED",
  "deactivatedAt": "2024-07-15T16:00:00Z",
  "dataRetentionEnds": "2024-08-14T16:00:00Z",
  "reactivationDeadline": "2024-08-14T16:00:00Z",
  "info": "Your account data will be permanently deleted after 30 days. You can reactivate your account by logging in before this date."
}
```

### Reactivate Account

Users can reactivate within the grace period by logging in.

```http
POST /v1/auth/login HTTP/1.1
Host: api.techcorp.com
Content-Type: application/json

{
  "email": "sarah.chen@example.com",
  "password": "CurrentP@ssw0rd123!"
}
```

### Response: Reactivation Prompt (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "accountStatus": "DEACTIVATED",
  "deactivatedAt": "2024-07-15T16:00:00Z",
  "permanentDeletionAt": "2024-08-14T16:00:00Z",
  "reactivationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Your account is scheduled for deletion. Would you like to reactivate it?",
  "action": {
    "endpoint": "/v1/users/me/reactivate",
    "method": "POST"
  }
}
```

### Confirm Reactivation

```http
POST /v1/users/me/reactivate HTTP/1.1
Host: api.techcorp.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reactivationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Account reactivated successfully",
  "status": "ACTIVE",
  "reactivatedAt": "2024-07-20T10:00:00Z",
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "bmV3IHJlZnJlc2ggdG9rZW4...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

---

## Logout

Terminates the current session and invalidates tokens.

### Request

```http
POST /v1/auth/logout HTTP/1.1
Host: api.techcorp.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHNlY3VyZSByZWZyZXNoIHRva2VuIGZvciB1c2VyLThhNGIyYzFk"
}
```

### Response: Success (204 No Content)

```http
HTTP/1.1 204 No Content
```

---

## Security Headers

All responses include these security headers:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cache-Control: no-store
Pragma: no-cache
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Summary

This example demonstrated a complete user management API with:

- **Registration**: Account creation with email verification
- **Authentication**: OAuth 2.1 style login with access and refresh tokens
- **Token refresh**: Secure rotation of refresh tokens
- **Profile management**: View and update user information
- **Password management**: Change password and reset flows
- **Session management**: View and terminate active sessions
- **Soft delete**: Account deactivation with grace period for reactivation
- **Security**: Proper headers, rate limiting, and protection against enumeration

---

## Related Documentation

- [Security Standards](../security/security-standards.md)
- [Resource Naming & URL Structure](../foundations/resource-naming-and-url-structure.md)
- [Error Response Standards](../request-response/error-response-standards.md)
- [API Lifecycle Management](../foundations/api-lifecycle-management.md)
- [Data Modeling Standards](../foundations/data-modeling-standards.md)
