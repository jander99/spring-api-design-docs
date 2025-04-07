# Unit Testing Standards

## Overview

This document outlines our standards for unit testing in Spring Boot applications, focusing on testing components in isolation.

## Core Principles

1. **Test in Isolation**: Mock external dependencies
2. **Focus on Behavior**: Test what components do, not how they do it
3. **Fast Execution**: Unit tests should run in milliseconds
4. **Repeatable Results**: Tests should produce consistent results
5. **Clear Intent**: Tests should clearly show what is being verified

## Structure and Organization

### Package Structure

Mirror the main package structure under `src/test/java`:

```
src/test/java/com/example/{service-name}/
├── domain/              # Domain model and logic tests
├── application/         # Application service tests
├── infrastructure/      # Infrastructure component tests
└── interfaces/          # API controller unit tests
```

### Naming Conventions

| Component | Test Class Name | Test Method Pattern |
|-----------|----------------|---------------------|
| Any Component | `{Component}Test` | `should{ExpectedBehavior}_when{Condition}` |

## Required Testing Libraries

- JUnit 5 for test framework
- Mockito for mocking
- AssertJ for assertions
- Reactor Test for reactive tests

## Testing Approaches By Layer

### Domain Layer

- Test entities and value objects without mocks
- Test business rules and invariants thoroughly
- For domain services, mock repositories and external services

### Application Layer

- Mock all dependencies (repositories, domain services)
- Verify proper calls to domain services
- Test proper event publication
- Verify error handling and validation logic

### Infrastructure Layer

- Test repository implementations with mocked JPA/R2DBC repositories
- Test API clients with mocked WebClient
- Test mappers thoroughly with different input combinations

### Interfaces Layer

- Test controllers with MockMvc or WebTestClient
- Mock application services
- Test appropriate status codes and response bodies
- Test validation errors

## Reactive Testing

- Use StepVerifier to test reactive streams
- Test both success and error paths
- Use virtual time for time-based operations
- Test proper backpressure handling

## Test Data Management

- Use factories for common test objects
- Use builders for complex objects
- Define test fixtures for reusable test data
- Keep test data minimal but sufficient

## Test Coverage Requirements

| Component Type | Minimum Line Coverage |
|----------------|----------------------|
| Domain Models | 90% |
| Domain Services | 90% |
| Application Services | 85% |
| Infrastructure Components | 80% |
| Controllers | 80% |

## Common Anti-patterns to Avoid

1. **Testing implementation details**: Focus on behavior
2. **Brittle tests**: Don't couple tests to implementation
3. **Excessive mocking**: Only mock what's necessary
4. **Overlapping tests**: Test each behavior once
5. **Slow unit tests**: Keep them fast
6. **Non-isolated tests**: Don't depend on other tests
7. **Missing edge cases**: Test failure paths and boundaries

## Mocking Best Practices

1. Mock at the boundaries (repositories, external services)
2. Use specific expectations
3. Verify only important interactions
4. Use argument matchers consistently

## Assertion Best Practices

1. Use descriptive assertions
2. Assert outcomes, not intermediate states
3. Use appropriate assertion methods for the task
4. Group related assertions together

## Testing with TDD

When using Test-Driven Development:
1. Write a failing test first
2. Write minimal code to pass
3. Refactor while keeping tests green
4. Repeat for next behavior