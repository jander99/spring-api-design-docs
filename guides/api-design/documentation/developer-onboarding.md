# Developer Onboarding Guide

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 11 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic HTTP knowledge
> 
> **🎯 Key Topics:** Getting started, authentication, sandbox, troubleshooting, support
> 
> **📊 Complexity:** _TBD after reading level analysis_

## Overview

Good onboarding helps developers make a first successful API call fast. It reduces support tickets and increases adoption.

This guide defines a production-ready onboarding flow for any HTTP API. It focuses on:

- Fast time-to-first-call
- Clear prerequisites and success signals
- Safe testing with a sandbox
- Copy‑paste HTTP and JSON examples
- Common integration patterns and troubleshooting

## Goals and Success Metrics

### The 5‑Minute Rule

A new developer should complete a working request within 5 minutes.

To meet this goal:

- Keep prerequisites minimal.
- Provide a single copy‑paste request that works.
- Show a clear success response.
- Tell the developer what to do next.

### What “Success” Looks Like

Use measurable signals:

- A 200 or 201 response from the API
- A response body with expected fields
- A request ID header that can be shared with support
- A simple next step that builds on the first call

## Getting Started Template (Recommended Structure)

Use this structure for your primary “Getting Started” page.

1. **Get credentials** (under 1 minute)
2. **Choose an environment** (sandbox first)
3. **Make your first request** (copy‑paste)
4. **Confirm success** (expected response)
5. **Next steps** (2–4 links or bullets inside your docs portal)

### Step 1: Get Your API Credentials

Tell developers exactly what they need.

- Where to sign up
- Where to find credentials
- What permissions/scopes are required for the first call

If you support multiple auth methods, pick one as the default onboarding path.

**Recommended default:** Bearer token in the `Authorization` header.

### Step 2: Choose an Environment

Offer at least two environments:

- **Sandbox**: Safe testing, no real-world impact
- **Production**: Real data and billing implications (if applicable)

Document the base URLs clearly.

Example:

```yaml
environments:
  sandbox:
    baseUrl: https://sandbox-api.example.com
  production:
    baseUrl: https://api.example.com
```

### Step 3: Make the First Request (Copy‑Paste)

Provide a single request that is:

- Read-only
- Fast
- Stable (unlikely to change)
- Useful for verifying auth

A common choice is a “who am I” style endpoint.

```http
GET /v1/hello HTTP/1.1
Host: sandbox-api.example.com
Authorization: Bearer YOUR_SANDBOX_API_KEY
Accept: application/json
User-Agent: example-api-docs/1.0
```

### Step 4: Show the Expected Response

Show a realistic response with an obvious success indicator.

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Request-Id: req_01HZY8Q5N7R2YQW1K2M3N4P5Q6
```

```json
{
  "message": "Hello, developer!",
  "environment": "sandbox",
  "timestamp": "2026-01-09T12:00:00Z"
}
```

### Step 5: Next Steps

After the first call, provide a short path forward.

Good next steps:

- Create a resource (POST)
- List resources (GET with pagination)
- Set up webhooks (if applicable)
- Review authentication options and token rotation

Keep the list short. The goal is momentum.

## Quick Start Pattern

A quick start is a compact version of onboarding. It should work even if the developer skips the rest of the docs.

### Minimal Quick Start

1) Get a sandbox API key.

2) Make a request.

```http
GET /v1/orders?limit=2 HTTP/1.1
Host: sandbox-api.example.com
Authorization: Bearer YOUR_SANDBOX_API_KEY
Accept: application/json
```

3) See the response.

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Request-Id: req_01HZY8Q5N7R2YQW1K2M3N4P5Q6
```

```json
{
  "data": [
    {
      "id": "ord_1001",
      "status": "pending",
      "createdAt": "2026-01-09T11:55:00Z"
    },
    {
      "id": "ord_1002",
      "status": "processing",
      "createdAt": "2026-01-09T11:57:00Z"
    }
  ],
  "pagination": {
    "limit": 2,
    "nextCursor": "eyJpZCI6Im9yZF8xMDAyIn0"
  }
}
```

### Keep Language Choices Separate

If you publish language-specific snippets, do it as an optional section. Your primary onboarding path should work with raw HTTP.

Recommended ordering:

- HTTP example (copy‑paste)
- Optional generated snippets (if you provide them)

## Sandbox Environment Setup

A sandbox lets developers experiment without risk. It should feel close to production.

### Sandbox Characteristics

A good sandbox environment:

- Has no real-world data impact
- Contains pre-loaded test data
- Uses predictable example IDs
- Has relaxed rate limits (but not unlimited)
- Is free to use

### Sandbox Credentials

Document how sandbox keys differ from production keys.

Examples:

```yaml
credentials:
  sandbox:
    keyPrefix: "sk_sandbox_"
    example: "sk_sandbox_abc123"
  production:
    keyPrefix: "sk_live_"
    example: "sk_live_def456"
```

### Reset and Test Data Management

Provide an easy way to reset sandbox state.

If you offer a reset endpoint, document it clearly.

```http
POST /v1/sandbox/reset HTTP/1.1
Host: sandbox-api.example.com
Authorization: Bearer YOUR_SANDBOX_API_KEY
Content-Type: application/json
Accept: application/json
```

```json
{
  "scope": "account",
  "confirm": true
}
```

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
```

```json
{
  "status": "reset_started",
  "estimatedSeconds": 10
}
```

If resets are destructive, add a warning and require explicit confirmation fields.

## Interactive Examples

Interactive tools reduce onboarding time by removing setup steps.

### API Console (“Try It Out”)

A production-grade API console should support:

- “Try it out” requests directly from docs
- Pre-filled example values that work
- Clear display of request headers and bodies
- Copy export of the generated HTTP request
- Display of response headers (especially request IDs)

### Postman Collection (Optional)

If you publish a Postman collection, treat it as a convenience layer. The source of truth should remain your HTTP reference and OpenAPI.

Example (simplified Postman collection shape):

```json
{
  "info": {
    "name": "Example API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "List Orders",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/v1/orders?limit=2",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{apiKey}}"
          }
        ]
      }
    }
  ]
}
```

## Common Integration Patterns

This section covers the patterns most developers implement in the first week.

### Authentication Setup

A reliable onboarding flow includes:

1. Get credentials
2. Store credentials securely
3. Configure requests
4. Verify authentication

**Common guidance to include:**

- Do not hard-code keys in source control.
- Use separate keys for sandbox and production.
- Rotate keys on a schedule.

Example authentication request:

```http
GET /v1/account HTTP/1.1
Host: sandbox-api.example.com
Authorization: Bearer YOUR_SANDBOX_API_KEY
Accept: application/json
```

### Error Handling Setup

Your onboarding should show how errors look and how to act on them.

Include:

- How to read error status codes
- How to use request IDs when contacting support
- Which errors are safe to retry

Example: invalid request (client error)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json
X-Request-Id: req_01HZY9A1B2C3D4E5F6G7H8J9K0
```

```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "items",
      "code": "REQUIRED",
      "message": "At least one item is required."
    }
  ]
}
```

Example: transient failure (server error)

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/problem+json
Retry-After: 2
X-Request-Id: req_01HZY9A1B2C3D4E5F6G7H8J9K0
```

```json
{
  "type": "https://example.com/problems/unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "The service is temporarily unavailable. Please retry.",
  "instance": "/v1/orders"
}
```

### Pagination Handling

If your API returns lists, document pagination early. Most integrations need it.

Include:

- How to set `limit`
- How to use cursors or page tokens
- How to detect the end of the list

Example cursor-based pagination:

```http
GET /v1/orders?limit=2 HTTP/1.1
Host: sandbox-api.example.com
Authorization: Bearer YOUR_SANDBOX_API_KEY
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "data": [
    { "id": "ord_1001" },
    { "id": "ord_1002" }
  ],
  "pagination": {
    "limit": 2,
    "nextCursor": "eyJpZCI6Im9yZF8xMDAyIn0"
  }
}
```

Next page:

```http
GET /v1/orders?limit=2&cursor=eyJpZCI6Im9yZF8xMDAyIn0 HTTP/1.1
Host: sandbox-api.example.com
Authorization: Bearer YOUR_SANDBOX_API_KEY
Accept: application/json
```

## Sample Applications (What to Provide)

Even for language-agnostic docs, you should define what sample apps exist and what they demonstrate.

### Reference Implementation Topics

Recommended samples:

- Simple CRUD workflow (create, read, update, list)
- OAuth authorization flow walkthrough (if your API uses OAuth)
- Webhook receiver behavior and signature verification flow (conceptual)
- Batch operation usage (if supported)

### Sample Repository Layout (Example)

```yaml
examples:
  - name: quickstart
    goal: "Make first request and parse response"
  - name: oauth-flow
    goal: "Complete authorization and call protected endpoint"
  - name: webhook-receiver
    goal: "Receive event and acknowledge delivery"
  - name: batch-processing
    goal: "Submit batch and poll for completion"
```

## Troubleshooting First Issues

This section should be written for developers under time pressure.

### Common First-Time Errors

#### 401 Unauthorized

Typical causes:

- Missing `Authorization` header
- Using a production key against the sandbox base URL (or the reverse)
- Using an expired or revoked key

#### 403 Forbidden

Typical causes:

- Missing required permissions or scopes
- Account not enabled for a feature

#### 404 Not Found

Typical causes:

- Wrong base URL
- Wrong API version prefix
- Typo in the path

#### 400 Bad Request

Typical causes:

- Invalid JSON
- Missing required fields
- Wrong content type

### Debug Checklist

- [ ] Confirm you are using the correct base URL.
- [ ] Confirm `Authorization` is present and uses the expected scheme.
- [ ] Confirm `Content-Type: application/json` is set for JSON request bodies.
- [ ] Validate JSON is well-formed.
- [ ] Check the response headers for a request ID.
- [ ] Reproduce the problem in the sandbox.

## Support Channels (What to Offer)

Good onboarding ends with a clear support path.

### Documentation Support

Offer:

- API reference
- Tutorials or guides
- FAQ
- Status page

### Community Support

Common options:

- Developer forum
- Q&A tag (public)
- Community chat (Slack/Discord)
- Discussions board

### Direct Support

Define:

- How to open a support ticket
- Expected response times
- Escalation paths for incidents

### What Support Needs to Help Quickly

Tell developers what to include in requests:

- The request ID (from `X-Request-Id`)
- The timestamp and timezone
- The endpoint path (no secrets)
- The HTTP status code
- A redacted request/response example

## Final Reading Level Metrics

Run the repository reading level analyzer for this file and record the output here.

- **Grade level:** _TBD_
- **Flesch reading ease:** _TBD_
- **Estimated reading time:** _TBD_
