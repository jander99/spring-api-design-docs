# API Troubleshooting Guide

> **Reading Level:** Grade 10 | **Audience:** Developers debugging API issues

This guide helps you diagnose and fix common API problems quickly.

---

## Quick Diagnosis

**What error are you seeing?**

| Error Code | Problem Type | Go To |
|------------|--------------|-------|
| 400 | Bad request data | [HTTP Errors - 400](#400-bad-request) |
| 401 | Not authenticated | [HTTP Errors - 401](#401-unauthorized) |
| 403 | Not authorized | [HTTP Errors - 403](#403-forbidden) |
| 404 | Resource not found | [HTTP Errors - 404](#404-not-found) |
| 429 | Too many requests | [HTTP Errors - 429](#429-too-many-requests) |
| 500/502/503 | Server problems | [HTTP Errors - 5xx](#server-errors-5xx) |
| Slow responses | Performance issue | [Performance Issues](performance-issues.md) |
| Timeouts | Connection problem | [Performance Issues](performance-issues.md#timeout-issues) |

---

## Troubleshooting Guides

### Core Guides

| Guide | Description |
|-------|-------------|
| [Common HTTP Errors](common-http-errors.md) | Fix 4xx and 5xx status code errors |
| [Performance Issues](performance-issues.md) | Resolve slow responses, timeouts, and caching problems |

### Topic-Specific Guides

| Guide | Description |
|-------|-------------|
| [Streaming Issues](streaming/common-issues.md) | SSE, WebSocket, and streaming problems |
| [Streaming Testing](streaming/testing-strategies.md) | Test streaming endpoints |
| [Versioning Problems](versioning/common-problems.md) | API version migration issues |

---

## General Debugging Steps

When you encounter any API issue, follow these steps:

### Step 1: Gather Information

Collect this information before debugging:

```
- HTTP method and full URL
- Request headers (especially Content-Type, Authorization)
- Request body (if any)
- Response status code
- Response body (error message)
- Response headers
- Timestamp of the error
```

### Step 2: Check the Basics

Rule out simple problems first:

1. **Is the API running?** Check health endpoint
2. **Is the URL correct?** Check for typos
3. **Is authentication valid?** Check token expiration
4. **Is the request format correct?** Validate JSON syntax

### Step 3: Reproduce the Issue

Try to reproduce with a simple tool:

```bash
# Test with curl
curl -v -X GET "https://api.example.com/resource" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

The `-v` flag shows full request and response details.

### Step 4: Check Logs

Look at both client and server logs:

- **Client side:** Network tab in browser dev tools
- **Server side:** Application logs, access logs

### Step 5: Isolate the Problem

Narrow down the cause:

1. Does it fail for all users or just one?
2. Does it fail for all resources or just one?
3. Did it work before? What changed?
4. Does it fail in all environments?

---

## Common Debugging Tools

### Command Line

```bash
# Basic request
curl -X GET "https://api.example.com/users/123"

# With headers and verbose output
curl -v -X POST "https://api.example.com/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token123" \
  -d '{"name": "Test"}'

# Check response time
curl -w "Time: %{time_total}s\n" -o /dev/null -s "https://api.example.com/health"
```

### HTTP Client Libraries

Most HTTP libraries provide debug modes:

```
# Enable debug logging in your client
# Check library documentation for specific flags
```

### Browser Developer Tools

1. Open DevTools (F12)
2. Go to Network tab
3. Find the failed request
4. Check Headers, Payload, Response tabs

---

## When to Escalate

Contact the API team if:

- Server errors (5xx) persist after retrying
- You suspect a bug in the API
- Documentation doesn't match behavior
- You need higher rate limits
- Security vulnerabilities found

**Include in your report:**
- Steps to reproduce
- Request/response examples
- Timestamps
- Environment details

---

## Related Resources

- [Error Response Standards](../request-response/error-response-standards.md)
- [HTTP Methods Reference](../quick-reference/http-methods.md)
- [Status Codes Reference](../quick-reference/status-codes.md)
- [Rate Limiting Standards](../security/rate-limiting-standards.md)
