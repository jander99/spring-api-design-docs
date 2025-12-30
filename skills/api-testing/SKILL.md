---
name: api-testing
description: Design and implement API testing strategies including contract testing, integration testing, and schema validation. Use when creating API test suites, implementing consumer-driven contracts, validating OpenAPI compliance, or establishing API quality gates.
---

# API Testing

## When to Use This Skill

Use this skill when you need to:
- Design an API testing strategy
- Implement consumer-driven contract testing
- Write API integration tests
- Validate API against OpenAPI spec
- Set up CI/CD quality gates for APIs
- Prevent breaking changes between services

## Testing Pyramid for APIs

| Test Type | Scope | Speed | When to Use |
|-----------|-------|-------|-------------|
| Unit | Controller method | Fast | Logic, validation, mapping |
| Integration | Single service | Medium | Full HTTP request/response |
| Contract | Service boundary | Medium | Provider-consumer compatibility |
| E2E | Full system | Slow | Critical user journeys only |

### Test Distribution

```
        /\
       /E2E\        < 5% - Critical paths only
      /------\
     /Contract\     10-20% - Service boundaries
    /----------\
   /Integration \   20-30% - API endpoints
  /--------------\
 /     Unit       \ 50-70% - Controller logic
/------------------\
```

## Contract Testing

### What is Contract Testing?

Contracts define the expected request/response format between services. Consumer-driven contracts ensure providers don't break consumers.

### Contract Testing Flow

```
1. Consumer writes contract (expectations)
   ↓
2. Contract shared with provider (via broker or repo)
   ↓
3. Provider verifies contract passes
   ↓
4. Both deploy independently with confidence
```

### Contract Structure

```yaml
# contracts/v1/order/get_order.yml
description: "Get order by ID"
request:
  method: GET
  url: /v1/orders/123
  headers:
    Accept: application/json
response:
  status: 200
  headers:
    Content-Type: application/json
  body:
    id: 123
    status: "PENDING"
    customerId: "customer-123"
  matchers:
    body:
      - path: $.id
        type: by_regex
        predefined: number
      - path: $.status
        type: by_regex
        regex: "PENDING|PROCESSING|COMPLETED"
```

### Contract File Organization

```
src/test/resources/contracts/
├── v1/
│   ├── order/
│   │   ├── get_order.yml
│   │   ├── create_order.yml
│   │   └── get_orders_paginated.yml
│   └── customer/
│       └── get_customer.yml
└── v2/
    └── ...
```

## Integration Testing

### Test Complete HTTP Cycles

```
Request → Controller → Service → Repository → Database
   ↑                                              |
   └──────────── Response ←───────────────────────┘
```

### What to Test

| Test Type | What to Assert |
|-----------|---------------|
| Success cases | Status code, body, headers |
| Validation errors | 400 status, error details |
| Not found | 404 status, error message |
| Auth failures | 401/403 status |
| Server errors | 500 status, error format |
| Side effects | Database changes, events published |

### Integration Test Structure

```
1. Arrange: Set up test data, mocks
2. Act: Make HTTP request
3. Assert: Verify response
4. Verify: Check side effects
5. Cleanup: Reset state (if needed)
```

## API Test Checklist

### Request Testing

- [ ] Valid request returns expected response
- [ ] Missing required fields return 400
- [ ] Invalid field values return 400 with details
- [ ] Extra fields are handled (ignored or rejected)
- [ ] Correct Content-Type accepted
- [ ] Unsupported Content-Type returns 415

### Response Testing

- [ ] Correct status codes (200, 201, 204, etc.)
- [ ] Response body matches schema
- [ ] Correct Content-Type header
- [ ] Location header for 201 responses
- [ ] Pagination metadata correct
- [ ] HATEOAS links valid (if applicable)

### Error Testing

- [ ] 400 for validation errors
- [ ] 401 for missing/invalid auth
- [ ] 403 for insufficient permissions
- [ ] 404 for missing resources
- [ ] 409 for conflicts
- [ ] 429 for rate limits
- [ ] 500 errors return RFC 7807 format

### Security Testing

- [ ] Unauthenticated requests rejected
- [ ] Invalid tokens rejected
- [ ] Expired tokens rejected
- [ ] Authorization enforced per endpoint
- [ ] CORS headers correct
- [ ] Rate limiting enforced

## Schema Validation

### OpenAPI Validation

Validate requests/responses against OpenAPI specification:

```yaml
# spectral.yml
extends: [[spectral:oas, all]]
rules:
  operation-operationId: error
  operation-description: warn
  response-schema-defined: error
  no-$ref-siblings: error
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Lint OpenAPI
  run: npx @stoplight/spectral-cli lint openapi.yml

- name: Validate Response Schema
  run: npm run test:schema
```

## Quick Reference

### HTTP Status Codes to Test

| Status | Scenario | Test Case |
|--------|----------|-----------|
| 200 | Success | GET existing resource |
| 201 | Created | POST new resource |
| 204 | No content | DELETE resource |
| 400 | Bad request | Invalid payload |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not found | Non-existent resource |
| 409 | Conflict | Duplicate creation |
| 422 | Unprocessable | Business rule violation |
| 429 | Too many requests | Exceed rate limit |
| 500 | Server error | Unexpected exception |

### Test Naming Convention

```
should{ExpectedBehavior}When{Condition}

Examples:
- shouldReturn201WhenOrderCreated
- shouldReturn400WhenCustomerIdMissing
- shouldReturn404WhenOrderNotFound
- shouldReturn403WhenUserNotAuthorized
```

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Testing implementation | Brittle tests | Test behavior, not code |
| No contract tests | Breaking changes undetected | Add consumer-driven contracts |
| E2E for everything | Slow, flaky CI | Use testing pyramid |
| No error testing | Production surprises | Test all error scenarios |
| Manual API testing | Inconsistent coverage | Automate in CI |
| Skipping auth tests | Security vulnerabilities | Test auth on every endpoint |
| Testing happy path only | Missing edge cases | Include failure scenarios |
| No schema validation | API drift | Validate against OpenAPI |

## Breaking Change Detection

### Changes That Need Tests

| Change Type | Test Required |
|-------------|---------------|
| Remove field | Contract test |
| Rename field | Contract test |
| Change field type | Schema validation |
| Add required field | Contract test |
| Change status code | Integration test |
| Modify error format | Contract test |

### CI Quality Gate

```yaml
# Required checks before merge
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Contract tests pass
- [ ] OpenAPI schema valid
- [ ] No breaking changes detected
- [ ] Code coverage > 80%
```

## Loading Additional Context

When you need deeper guidance:

- **Contract testing patterns**: Load `references/contract-testing.md`
- **Java/Spring implementation**: Load `references/java-spring.md`
