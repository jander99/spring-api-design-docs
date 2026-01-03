# API Testing

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟢 Level:** Beginner-friendly
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Testing, Quality Assurance
> 
> **📊 Complexity:** 8.4 grade level • 1.1% technical density • easy

## Why Test Your APIs?

Testing helps you catch bugs before users do. It gives you confidence that your API works correctly.

**Without tests:**
- Users find bugs in production
- You break things when you make changes
- You don't know if your API works until you deploy it

**With tests:**
- You find bugs before deployment
- You can change code safely
- You know exactly what works and what doesn't

## Overview

This guide shows you how to test your APIs. You'll learn to test two main areas:

1. **API Documentation** - Check that your docs match reality
2. **HTTP Clients** - Make sure your code handles errors well

## What to Test

### Documentation Testing

Check that your API docs are accurate and complete:

- **Schema validation** - Do your examples match your schemas?
- **Breaking changes** - Will updates break existing clients?
- **Documentation coverage** - Did you document all endpoints?
- **Link integrity** - Do all your links work?

Learn more: [Documentation Testing](./documentation-testing.md)

### Client-Side Testing

Test how your HTTP client handles problems:

- **Retry logic** - Does it retry failed requests correctly?
- **Circuit breakers** - Does it stop calling broken services?
- **Timeout handling** - Does it handle slow responses well?
- **Mock servers** - Can you test without real servers?
- **Contract testing** - Do consumers and providers agree?
- **Chaos engineering** - Can you handle network failures?

Learn more: [Client-Side Testing](./client-side-testing.md)

## Benefits of Testing

### Stop Production Problems

Tests catch problems before users see them:

**Without tests:**
```
Deploy code change
→ Client retry breaks
→ Service gets overwhelmed
→ Users see errors
```

**With tests:**
```
Write code change
→ Tests fail
→ Fix the bug
→ Deploy safely
```

### Make Changes Safely

Good tests let you improve code without fear:

- Change how things work internally
- Know the behavior stays the same
- Find bugs right away
- Show how the API should work

### Help Your Team

Tests make development easier:

- New developers learn faster
- Everyone finds bugs quicker
- The team trusts the API more
- Integration goes smoothly

## Testing Strategy

### The Test Pyramid

Use more small tests and fewer large tests:

```
        /\
       /  \  E2E Tests (Few)
      /----\
     /      \ Integration Tests (Some)
    /--------\
   /          \ Unit Tests (Many)
  /____________\
```

**Unit Tests** (Write many):
- Test one small piece at a time
- Run fast
- Use fake data instead of real services

**Integration Tests** (Write some):
- Test how pieces work together
- Check that contracts match
- Use test servers

**End-to-End Tests** (Write few):
- Test complete user actions
- Make sure real workflows work
- Run on staging servers

### Quality Gates

Check quality at each step:

**Before you commit code**:
- Fix formatting issues
- Run unit tests
- Do basic checks

**Before you merge code**:
- Run all tests
- Check code coverage
- Update documentation

**Before you deploy**:
- Run integration tests
- Verify contracts match
- Check performance

## Common Tools

### For Documentation Testing
- **OpenAPI validators** - Check schemas
- **Link checkers** - Find broken links
- **Contract testing** - Verify specs match code

### For Client Testing
- **Mock servers** - WireMock, MockServer, Prism
- **Contract testing** - Pact, Spring Cloud Contract
- **Chaos tools** - Toxiproxy, Chaos Monkey
- **Load testing** - JMeter, Gatling, k6

## Best Practices

### Write Code That's Easy to Test

Make your code testable from the start:

1. **Use dependency injection** - Swap real services for fakes
2. **Design with interfaces** - Replace parts easily
3. **Put settings in config files** - Change test settings
4. **Keep functions small** - Test one thing at a time

### Keep Tests Good

Make sure tests stay helpful:

1. **Run fast** - Get results quickly
2. **Run alone** - Don't depend on other tests
3. **Use clear names** - Show what you're testing
4. **Don't flake** - Pass or fail consistently
5. **Clean up** - Don't leave test data around

### Focus on What Matters

Test the important things:

**Do test:**
- Your business rules
- How you handle errors
- Edge cases and limits
- How parts connect

**Don't test:**
- Framework code
- Libraries you didn't write
- Simple getters and setters

## Automate Your Tests

### Add Tests to Your Pipeline

Run tests automatically when you deploy:

```
Commit code
→ Run unit tests
→ Run integration tests
→ Run contract tests
→ Build your app
→ Deploy to staging
→ Run E2E tests
→ Deploy to production
```

### Track Test Health

Watch these numbers:

| What to Track | Goal | What to Do |
|---------------|------|------------|
| Tests passing | 100% | Fix failures right away |
| Code coverage | 80%+ | Add tests for uncovered code |
| Test run time | Under 10 minutes | Make tests faster |
| Flaky tests | 0% | Fix or delete flaky tests |

## More Testing Resources

### Detailed Guides

- **[Documentation Testing](./documentation-testing.md)** - How to test API docs
- **[Client-Side Testing](./client-side-testing.md)** - How to test HTTP clients

### Related Topics

- **[OpenAPI Standards](../documentation/openapi-standards.md)** - Define and validate schemas
- **[HTTP Client Best Practices](../advanced-patterns/http-client-best-practices.md)** - Build resilient clients
- **[Contract Testing](./client-side-testing.md#contract-testing-from-client-perspective)** - Test consumer contracts

## Getting Started

### Step 1: Test Your Documentation

Check that your API docs are correct:

```bash
# Check your OpenAPI file
openapi-validator api-spec.yaml

# Test your examples
validate-examples api-spec.yaml
```

### Step 2: Test Your HTTP Client

Make sure your client handles errors:

```bash
# Start a fake server
wiremock --port 8080

# Run your tests
run-client-tests
```

### Step 3: Add Contract Tests

Check that consumers and providers match:

```bash
# Create a consumer contract
pact-consumer-test

# Check the provider matches
pact-provider-verify
```

### Step 4: Add Tests to Your Pipeline

Run tests automatically:

```yaml
test:
  - run: validate-openapi
  - run: unit-tests
  - run: integration-tests
  - run: contract-tests
```

## Common Test Patterns

### How to Test Retries

```
1. Make your fake server fail several times
2. Send a request
3. Check it retried the right number of times
4. Check the delays between retries
5. Check the final result
```

### How to Test Circuit Breakers

```
1. Send requests until the circuit opens
2. Check that no requests go through
3. Wait for the timeout
4. Check it tries one test request
5. Check the circuit closes on success
```

### How to Test Timeouts

```
1. Make your fake server delay responses
2. Send a request with a timeout
3. Check the timeout fires on time
4. Check resources get cleaned up
5. Check the error message is clear
```

## What to Read Next

1. **[Client-Side Testing](./client-side-testing.md)** - Complete guide to testing HTTP clients
2. **[Documentation Testing](./documentation-testing.md)** - How to validate your docs
3. **[HTTP Client Best Practices](../advanced-patterns/http-client-best-practices.md)** - Build better clients
4. **[Error Response Standards](../request-response/error-response-standards.md)** - Handle errors correctly

---

[← Back to API Design](../README.md) | [View All Guides](/guides/README.md)
