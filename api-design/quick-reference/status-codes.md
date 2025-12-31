# HTTP Status Codes Quick Reference

> One-page reference card for HTTP status codes. For detailed guidance, see [Error Response Standards](../request-response/error-response-standards.md).

## Code Ranges

| Range | Category | Meaning |
|-------|----------|---------|
| 1xx | Informational | Request received, continuing |
| 2xx | Success | Request succeeded |
| 3xx | Redirection | Further action needed |
| 4xx | Client Error | Bad request from client |
| 5xx | Server Error | Server failed to process |

## Success Codes (2xx)

| Code | Name | When to Use | Response Body |
|------|------|-------------|---------------|
| 200 | OK | GET, PUT, PATCH success | Yes |
| 201 | Created | POST created resource | Created resource |
| 202 | Accepted | Async processing started | Status info |
| 204 | No Content | DELETE success, PUT with no body | No |

### 2xx Decision Table

| Scenario | Use |
|----------|-----|
| GET returns data | 200 |
| POST creates resource | 201 + Location header |
| Background job started | 202 + job status URL |
| DELETE completed | 204 |
| PUT/PATCH with no return data | 204 |

## Redirection Codes (3xx)

| Code | Name | When to Use | Cacheable |
|------|------|-------------|-----------|
| 301 | Moved Permanently | URL changed forever | Yes |
| 302 | Found | Temporary redirect | No |
| 304 | Not Modified | Cache is still valid | N/A |
| 307 | Temporary Redirect | Keep method, temp move | No |
| 308 | Permanent Redirect | Keep method, perm move | Yes |

## Client Error Codes (4xx)

| Code | Name | When to Use |
|------|------|-------------|
| 400 | Bad Request | Malformed syntax, invalid data |
| 401 | Unauthorized | Missing or invalid credentials |
| 403 | Forbidden | Valid credentials, no permission |
| 404 | Not Found | Resource does not exist |
| 405 | Method Not Allowed | HTTP method not supported |
| 409 | Conflict | State conflict (duplicate, version) |
| 410 | Gone | Resource deleted permanently |
| 415 | Unsupported Media Type | Wrong Content-Type |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |

### 4xx Decision Table

| Problem | Use |
|---------|-----|
| JSON parse error | 400 |
| No auth token sent | 401 |
| Token valid, no access | 403 |
| Resource ID not found | 404 |
| POST to read-only endpoint | 405 |
| Duplicate email/username | 409 |
| Deleted 6 months ago | 410 |
| Sent XML, need JSON | 415 |
| Email format invalid | 422 |
| Too many API calls | 429 |

### 401 vs 403

| Scenario | Code | Reason |
|----------|------|--------|
| No token provided | 401 | Identity unknown |
| Token expired | 401 | Identity unknown |
| Token valid, wrong role | 403 | Identity known, access denied |
| Token valid, not owner | 403 | Identity known, access denied |

## Server Error Codes (5xx)

| Code | Name | When to Use |
|------|------|-------------|
| 500 | Internal Server Error | Unexpected server failure |
| 502 | Bad Gateway | Upstream service failed |
| 503 | Service Unavailable | Maintenance or overload |
| 504 | Gateway Timeout | Upstream service timeout |

### 5xx Usage

| Scenario | Use |
|----------|-----|
| Unhandled exception | 500 |
| Database connection failed | 500 |
| Payment service down | 502 |
| Planned maintenance | 503 + Retry-After |
| Upstream API timeout | 504 |

## Common Mistakes

| Mistake | Problem | Correct Approach |
|---------|---------|------------------|
| 200 for created | Missing Location header | 201 + Location |
| 200 for deleted | Inconsistent | 204 No Content |
| 500 for validation | Hides client error | 400 or 422 |
| 401 for no permission | Confusing | 403 Forbidden |
| 404 for unauthorized | Security, but confusing | Use 403 or 404 consistently |
| 200 with error body | Breaks error handling | Use 4xx/5xx codes |

## Error Response Format (RFC 7807)

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Failed",
  "status": 422,
  "detail": "Email format is invalid",
  "instance": "/api/users/123"
}
```

## Quick Lookup by Situation

| Situation | Code |
|-----------|------|
| Everything worked | 200 |
| Created something new | 201 |
| Will process later | 202 |
| Nothing to return | 204 |
| Bad JSON/format | 400 |
| Need to log in | 401 |
| Logged in, can't access | 403 |
| Doesn't exist | 404 |
| Already exists | 409 |
| Data invalid | 422 |
| Slow down requests | 429 |
| Something broke | 500 |
| Dependency failed | 502 |
| Be back soon | 503 |

## Related

- [Error Response Standards](../request-response/error-response-standards.md)
- [HTTP Methods Reference](http-methods.md)
- [Error Handling Skill](../../skills/api-error-handling/SKILL.md)
