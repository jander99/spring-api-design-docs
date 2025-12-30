---
name: api-error-handling
description: Design and implement error responses for REST APIs using RFC 7807 Problem Details. Use when creating error handling strategies, validation error formats, exception hierarchies, or implementing consistent error responses across API endpoints.
---

# API Error Handling

<!--
SOURCE DOCUMENTS:
- api-design/request-response/Error-Response-Standards.md
- spring-design/error-handling/Error-Response-Formats.md
- spring-design/error-handling/Reactive-Error-Handling.md
- spring-design/error-handling/Validation-Standards.md
- spring-design/error-handling/Exception-Hierarchy.md
- spring-design/error-handling/Imperative-Error-Handling.md

REFERENCE FILES TO CREATE:
- references/rfc-7807.md (RFC 7807 Problem Details deep-dive)
- references/validation-patterns.md (input validation error structures)
- references/java-spring.md (Spring exception handling, @ControllerAdvice)
-->

## When to Use This Skill

Use this skill when you need to:
- Design error response formats for an API
- Implement RFC 7807 Problem Details
- Handle validation errors consistently
- Create exception hierarchies
- Map exceptions to HTTP status codes

## Core Principles

TODO: Extract and condense from Error-Response-Standards.md

### RFC 7807 Problem Details
Standard error response format with these fields:
- `type`: URI identifying the error type
- `title`: Human-readable error summary
- `status`: HTTP status code
- `detail`: Human-readable explanation
- `instance`: URI for this specific occurrence

### HTTP Status Code Categories
- 4xx: Client errors (bad request, unauthorized, not found)
- 5xx: Server errors (internal error, service unavailable)
- Never use 2xx for errors

### Validation Error Structure
- Return 400 Bad Request for validation failures
- Include field-level errors with paths
- Provide actionable error messages

## Quick Reference

TODO: Add status code decision tree

| Scenario | Status Code |
|----------|-------------|
| Invalid input | 400 Bad Request |
| Missing/invalid auth | 401 Unauthorized |
| Insufficient permissions | 403 Forbidden |
| Resource not found | 404 Not Found |
| Method not allowed | 405 Method Not Allowed |
| Conflict (duplicate) | 409 Conflict |
| Validation failed | 422 Unprocessable Entity |
| Server error | 500 Internal Server Error |

## Loading Additional Context

When you need deeper guidance:

- **RFC 7807 implementation**: Load `references/rfc-7807.md`
- **Validation error patterns**: Load `references/validation-patterns.md`
- **Java/Spring implementation**: Load `references/java-spring.md`

## Examples

TODO: Add minimal illustrative examples

### RFC 7807 Error Response
```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid fields",
  "instance": "/orders/12345",
  "errors": [
    {
      "field": "email",
      "message": "must be a valid email address"
    }
  ]
}
```

## Anti-Patterns

TODO: Extract from source documents

- Returning 200 OK with error in body
- Generic error messages without actionable details
- Exposing stack traces or internal details to clients
- Inconsistent error formats across endpoints
- Using non-standard error response structures
