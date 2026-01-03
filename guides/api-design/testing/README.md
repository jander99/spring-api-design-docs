# API Testing

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Testing, Quality Assurance
> 
> **📊 Complexity:** 14.1 grade level • 1.6% technical density • difficult

## Overview

Testing ensures API quality and reliability. This section covers testing strategies for both API documentation and client implementations.

Good testing practices provide:
- Confidence in API behavior
- Fast feedback on changes
- Regression prevention
- Clear documentation of expected behavior

## Testing Areas

### Documentation Testing

Validate API documentation accuracy and completeness:

- **Schema validation** - Examples match schemas
- **Breaking change detection** - Compatibility checks
- **Documentation coverage** - All endpoints documented
- **Link integrity** - References work correctly

See: [Documentation Testing](./documentation-testing.md)

### Client-Side Testing

Test HTTP client resilience and error handling:

- **Retry logic** - Exponential backoff, idempotency
- **Circuit breakers** - State transitions, failure thresholds
- **Timeout handling** - Connection, read, request timeouts
- **Mock servers** - WireMock, MockServer, Prism
- **Contract testing** - Consumer-driven contracts
- **Chaos engineering** - Network failures, service degradation

See: [Client-Side Testing](./client-side-testing.md)

## Why Testing Matters

### Prevents Production Issues

Comprehensive testing catches issues early:

**Without Testing**:
```
Code change deployed
→ Client retry logic broken
→ Overwhelms recovering service
→ Production incident
```

**With Testing**:
```
Code change made
→ Client tests fail
→ Issue caught in CI/CD
→ Fix before production
```

### Enables Confident Changes

Good tests support refactoring:

- Change implementation safely
- Verify behavior stays correct
- Catch regressions immediately
- Document expected behavior

### Improves Developer Experience

Quality tests help developers:

- Understand API behavior quickly
- Debug issues faster
- Trust API responses
- Integrate with confidence

## Testing Strategy

### Test Pyramid

Balance different test types:

```
        /\
       /  \  E2E Tests (Few)
      /----\
     /      \ Integration Tests (Some)
    /--------\
   /          \ Unit Tests (Many)
  /____________\
```

**Unit Tests**:
- Fast, focused, isolated
- Test individual components
- Mock external dependencies

**Integration Tests**:
- Test component interactions
- Verify API contracts
- Use test environments

**End-to-End Tests**:
- Test complete workflows
- Validate user scenarios
- Run against staging

### Quality Gates

Enforce quality at each stage:

**Pre-Commit**:
- Linting and formatting
- Unit tests pass
- Basic validation

**Pull Request**:
- Full test suite passes
- Code coverage meets threshold
- Documentation updated

**Pre-Deployment**:
- Integration tests pass
- Contract tests verify compatibility
- Performance benchmarks met

## Testing Tools

### Documentation Testing
- **OpenAPI validators** - Schema validation
- **Link checkers** - Broken link detection
- **Contract testing** - Spec compliance

### Client Testing
- **Mock servers** - WireMock, MockServer, Prism
- **Contract testing** - Pact, Spring Cloud Contract
- **Chaos tools** - Toxiproxy, Chaos Monkey
- **Load testing** - JMeter, Gatling, k6

## Best Practices

### Write Testable Code

Design for testability:

1. **Dependency injection** - Easy mocking
2. **Interface-based design** - Swap implementations
3. **Configuration externalization** - Test settings
4. **Small, focused functions** - Easy to test

### Maintain Test Quality

Keep tests valuable:

1. **Keep tests fast** - Quick feedback
2. **Make tests independent** - No coupling
3. **Use clear names** - Document intent
4. **Avoid flaky tests** - Reliable results
5. **Clean up resources** - No side effects

### Test the Right Things

Focus testing effort:

**Do Test**:
- Business logic
- Error handling
- Edge cases
- Integration points

**Don't Test**:
- Framework code
- Third-party libraries
- Trivial getters/setters

## Continuous Testing

### CI/CD Integration

Automate testing in pipelines:

```
Code Commit
→ Run unit tests
→ Run integration tests
→ Run contract tests
→ Build artifact
→ Deploy to staging
→ Run E2E tests
→ Deploy to production
```

### Monitoring Test Health

Track test metrics:

| Metric | Target | Action if Missed |
|--------|--------|------------------|
| Test pass rate | 100% | Fix failing tests immediately |
| Code coverage | 80%+ | Add tests for uncovered code |
| Test execution time | < 10 minutes | Optimize or parallelize |
| Flaky test rate | 0% | Fix or remove flaky tests |

## Testing Documentation

### Test Documentation Guides

- **[Documentation Testing](./documentation-testing.md)** - Validate API docs
- **[Client-Side Testing](./client-side-testing.md)** - Test HTTP clients

### Related Testing Topics

In other sections:

- **[OpenAPI Standards](../documentation/openapi-standards.md)** - Schema definition and validation
- **[HTTP Client Best Practices](../advanced-patterns/http-client-best-practices.md)** - Resilient client patterns
- **[Contract Testing](./client-side-testing.md#contract-testing-from-client-perspective)** - Consumer-driven contracts

## Quick Start

### 1. Start with Documentation Testing

Validate your API documentation:

```bash
# Validate OpenAPI spec
openapi-validator api-spec.yaml

# Test examples against schemas
validate-examples api-spec.yaml
```

### 2. Add Client-Side Tests

Test your HTTP client:

```bash
# Start mock server
wiremock --port 8080

# Run client tests
run-client-tests
```

### 3. Implement Contract Testing

Verify consumer-provider compatibility:

```bash
# Generate consumer contract
pact-consumer-test

# Verify provider
pact-provider-verify
```

### 4. Integrate with CI/CD

Add to your pipeline:

```yaml
test:
  - run: validate-openapi
  - run: unit-tests
  - run: integration-tests
  - run: contract-tests
```

## Common Testing Patterns

### Pattern: Test Retry Logic

```
1. Configure mock server to fail N times
2. Send request
3. Verify retry count matches expected
4. Verify backoff delays correct
5. Verify final success or failure
```

### Pattern: Test Circuit Breaker

```
1. Send requests until circuit opens
2. Verify no requests sent when open
3. Wait timeout period
4. Verify test request in half-open
5. Verify circuit closes on success
```

### Pattern: Test Timeout

```
1. Configure mock server with delay
2. Send request with timeout
3. Verify timeout fires at expected time
4. Verify resources cleaned up
5. Verify clear error message
```

## Next Steps

1. **Read [Client-Side Testing](./client-side-testing.md)** - Comprehensive client testing guide
2. **Review [Documentation Testing](./documentation-testing.md)** - Documentation validation
3. **Explore [HTTP Client Best Practices](../advanced-patterns/http-client-best-practices.md)** - Implementation patterns
4. **Check [Error Response Standards](../request-response/error-response-standards.md)** - Error handling

---

[← Back to API Design](../README.md) | [View All Guides](/guides/README.md)
