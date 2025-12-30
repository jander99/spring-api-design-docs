---
name: api-testing
description: Design and implement API testing strategies including contract testing, integration testing, and schema validation. Use when creating API test suites, implementing consumer-driven contracts, validating OpenAPI compliance, or establishing API quality gates.
---

# API Testing

<!--
SOURCE DOCUMENTS:
- api-design/documentation/Documentation-Testing.md
- spring-design/testing/specialized-testing/Contract Testing Standards.md
- spring-design/testing/integration-testing/API-Integration-Testing.md
- spring-design/testing/unit-testing/Controller-Unit-Testing.md

REFERENCE FILES TO CREATE:
- references/contract-testing.md (consumer-driven contracts)
- references/api-testing-strategy.md (testing philosophy, pyramid)
- references/java-spring.md (Spring testing, MockMvc, WebTestClient, Spring Cloud Contract)
-->

## When to Use This Skill

Use this skill when you need to:
- Design an API testing strategy
- Implement contract testing
- Validate API against OpenAPI spec
- Test API integrations
- Set up CI/CD quality gates
- Prevent breaking changes

## Core Principles

TODO: Extract and condense from Documentation-Testing.md and Contract Testing Standards.md

### Testing Pyramid for APIs
- **Unit tests**: Controller logic, validation, mapping
- **Integration tests**: Full request/response cycle
- **Contract tests**: Provider-consumer compatibility
- **E2E tests**: Critical user journeys only

### Contract Testing
- Consumer-driven: Consumers define expectations
- Provider verification: Providers verify contracts
- Prevents breaking changes between services
- Catches incompatibilities early

### Schema Validation
- Validate requests/responses against OpenAPI spec
- Use Spectral or similar for linting
- Automate in CI/CD pipeline
- Detect breaking changes automatically

## Quick Reference

TODO: Add testing strategy decision tree

| Test Type | Scope | Speed | Confidence |
|-----------|-------|-------|------------|
| Unit | Controller method | Fast | Low |
| Integration | Single service | Medium | Medium |
| Contract | Service boundary | Medium | High |
| E2E | Full system | Slow | Highest |

### Contract Testing Flow
1. Consumer writes contract (expectations)
2. Contract shared with provider
3. Provider verifies contract passes
4. Both deploy independently

## Loading Additional Context

When you need deeper guidance:

- **Contract testing patterns**: Load `references/contract-testing.md`
- **Testing strategy**: Load `references/api-testing-strategy.md`
- **Java/Spring implementation**: Load `references/java-spring.md`

## Examples

TODO: Add minimal illustrative examples

### Contract Test (Pact/Spring Cloud Contract style)
```
Given: An order exists with ID 123
When: GET /orders/123
Then: Response status 200
  And: Response body contains orderId "123"
  And: Response body contains status matching "pending|processing|completed"
```

### OpenAPI Schema Validation
```yaml
# Spectral ruleset
rules:
  operation-operationId: error
  operation-description: warn
  response-schema-defined: error
```

### Integration Test Structure
```
1. Setup test data
2. Make HTTP request to API
3. Assert response status
4. Assert response body
5. Assert side effects (database, events)
6. Cleanup test data
```

## Anti-Patterns

TODO: Extract from source documents

- Testing implementation details instead of behavior
- No contract tests between services
- Manual API testing only
- Skipping schema validation in CI
- E2E tests for everything (slow, flaky)
- Not testing error scenarios
- Missing authentication/authorization tests
- No performance/load testing consideration
