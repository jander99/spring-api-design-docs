# Integration Testing Standards

## Overview

Integration tests verify that multiple components work together correctly. This document outlines our standards for integration testing in Spring Boot applications.

## Core Principles

1. **Test Real Interactions**: Verify actual integration between components
2. **Limited Scope**: Focus on specific integration points
3. **Test Isolation**: Use separate test databases/infrastructure  
4. **Representative Data**: Use realistic test data

## Structure and Organization

### Package Structure

Organize integration tests in a dedicated package:

```
src/test/java/com/example/{service-name}/
└── integration/              # Integration tests
    ├── repository/           # Repository integration tests
    ├── service/              # Service integration tests  
    ├── controller/           # API integration tests
    └── external/             # External service integration tests
```

### Naming Conventions

| Test Type | Test Class Name |
|-----------|----------------|
| Integration Tests | `{Component}IntegrationTest` |

## Testing Approaches

### Database Integration Tests

- Use `@DataJpaTest` or `@DataR2dbcTest` for repository tests
- Configure test database with test-specific properties
- Use test containers for database integration tests
- Set up and tear down test data for each test

### API Integration Tests

- Use `@WebMvcTest` or `@WebFluxTest` for controller-level tests
- Use `@SpringBootTest` with `WebEnvironment.RANDOM_PORT` for full API tests
- Test request/response cycles including serialization/deserialization
- Verify correct status codes, headers, and response bodies

### External Service Integration Tests

- Use WireMock to simulate external service responses
- Test both successful and error scenarios
- Verify correct request formatting and response handling
- Test timeout and retry mechanisms

### Messaging Integration Tests

- Use embedded message brokers for tests (RabbitMQ, Kafka)
- Test message production and consumption
- Verify correct message structure and routing
- Test error handling and dead letter queues

## Test Data Management

### Test Database Setup

- Use Flyway or Liquibase for schema creation
- Separate test data migration scripts
- Reset database between tests
- Use transaction rollback for test isolation

### Test Containers

- Use Testcontainers for realistic infrastructure components
- Define reusable container configurations
- Use container composition for complex setups
- Optimize container startup for faster tests

## Reactive Integration Testing

- Use `WebTestClient` for testing reactive APIs
- Test both sync and async interactions
- Verify correct backpressure handling
- Test streaming endpoints

## Security In Integration Tests

- Test with security contexts
- Verify authorization rules
- Test with different user roles
- Verify secured endpoints reject unauthorized access

## Test Configuration

### Application Properties

```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    username: sa
    password: password
  jpa:
    hibernate:
      ddl-auto: create-drop
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:9999/auth/realms/test
```

### Test Profiles

- Use `@ActiveProfiles("test")` to activate test configurations
- Override beans for testing with `@TestConfiguration`
- Replace external dependencies with test doubles

## Performance Considerations

- Keep integration tests focused and fast
- Limit the number of slow tests
- Consider separating slow integration tests into a separate suite
- Use parallel test execution where possible

## Common Integration Test Patterns

### Repository Layer Integration Tests

- Test CRUD operations against real database
- Verify query methods return expected results
- Test transaction behavior
- Test database constraints and error conditions

### Service Layer Integration Tests

- Test service interactions with repositories
- Verify transaction boundaries
- Test service-to-service interactions
- Mock external dependencies outside test scope

### Controller Layer Integration Tests

- Test API contracts
- Verify serialization/deserialization
- Test input validation
- Verify security constraints

## Common Anti-patterns to Avoid

1. **Excessive setup**: Keep test setup focused and minimal
2. **Testing everything together**: Limit scope to specific integration points
3. **Flaky tests**: Ensure consistent test results
4. **Slow test suites**: Optimize for reasonable execution time
5. **Using production systems**: Use test containers or embedded alternatives

## CI/CD Integration

- Run integration tests in CI pipeline after unit tests
- Set up dedicated test environments
- Cache test containers to speed up execution
- Configure retry mechanism for flaky tests