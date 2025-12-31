---
name: api-testing
description: Design and automate API testing with strategies (contract, integration, schema validation), tools (OpenAPI, Spectral, consumer-driven), and CI/CD integration (quality gates, breaking change detection). Use when creating test suites, preventing breaking changes, validating compliance, or configuring pipelines.
---

# API Testing

Design comprehensive API test strategies from unit tests to contract verification.

## When to Use

- Designing API testing strategy for a new service
- Implementing consumer-driven contract testing
- Setting up CI/CD quality gates for APIs
- Validating API responses against OpenAPI spec
- Detecting breaking changes before deployment

## Quick Start

```yaml
# Contract test definition
description: "Get order by ID"
request:
  method: GET
  url: /v1/orders/123
  headers:
    Accept: application/json
response:
  status: 200
  body:
    id: 123
    status: "PENDING"
```

## Testing Pyramid

| Test Type | Scope | Distribution | When to Use |
|-----------|-------|--------------|-------------|
| Unit | Controller method | 50-70% | Logic, validation, mapping |
| Integration | Single service | 20-30% | Full HTTP request/response |
| Contract | Service boundary | 10-20% | Provider-consumer compatibility |
| E2E | Full system | <5% | Critical user journeys only |

## What to Test

| Category | Test Cases |
|----------|------------|
| Success | 200/201/204 responses, correct body/headers |
| Validation | Missing fields → 400, invalid values → 400 |
| Auth | Missing token → 401, wrong scope → 403 |
| Not found | Non-existent resource → 404 |
| Errors | Server errors return RFC 9457 format |

## Breaking Change Detection

| Change Type | Requires |
|-------------|----------|
| Remove/rename field | Contract test |
| Change field type | Schema validation |
| Add required field | Contract test |
| Change status code | Integration test |

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Testing implementation | Brittle tests | Test behavior, not code |
| No contract tests | Breaking changes undetected | Add consumer-driven contracts |
| E2E for everything | Slow, flaky CI | Use testing pyramid |
| Happy path only | Missing edge cases | Include failure scenarios |
| No schema validation | API drift | Validate against OpenAPI |

## Coverage Targets

| Component | Minimum |
|-----------|---------|
| Domain Models/Services | 90% |
| Application Services | 85% |
| Controllers/Infrastructure | 80% |

## References

- `references/java-spring.md` - Spring test implementation
- `../../api-design/documentation/ci-cd-integration.md` - Pipeline configuration
- `../../api-design/documentation/development-tooling.md` - Linting and mocking tools
- `../../api-design/documentation/documentation-testing.md` - Schema validation
