# Project Structure Documentation

This directory contains comprehensive documentation for organizing Spring Boot microservices following Domain-Driven Design principles and Hexagonal Architecture patterns.

## Overview

Our project structure standards ensure consistent organization across all microservices, promoting code maintainability, clear separation of concerns, and team productivity. The documentation is organized into focused areas covering package organization, implementation examples, and testing patterns.

## Documentation Structure

### 📋 [Package Organization](./package-organization.md)
**Core structure principles and package layout**

Defines the foundational structure for Spring Boot microservices:
- Domain-Driven Design package organization
- Hexagonal Architecture separation
- Standard naming conventions
- Implementation guidelines and anti-patterns

### 🔄 [Imperative Examples](./imperative-examples.md)
**Spring MVC implementation patterns**

Concrete examples for traditional blocking I/O implementations:
- Spring MVC controllers and services
- JPA repository implementations
- Synchronous application services
- Traditional web configuration

### ⚡ [Reactive Examples](./reactive-examples.md)
**WebFlux implementation patterns**

Concrete examples for non-blocking reactive implementations:
- WebFlux controllers and functional routing
- R2DBC repository implementations
- Reactive application services
- Reactive web configuration

### 🧪 [Testing Structure](./testing-structure.md)
**Test organization and patterns**

Comprehensive testing strategies for both imperative and reactive implementations:
- Layer-specific testing approaches
- Mock management and assertions
- Integration testing patterns
- Reactive testing with StepVerifier

## Quick Navigation

| Aspect | Package Organization | Imperative | Reactive | Testing |
|--------|---------------------|------------|----------|---------|
| **Domain Layer** | [Structure](./package-organization.md#domain-package) | [Examples](./imperative-examples.md#domain-layer-examples) | [Examples](./reactive-examples.md#domain-layer-examples) | [Tests](./testing-structure.md#domain-layer-testing) |
| **Application Layer** | [Structure](./package-organization.md#application-package) | [Examples](./imperative-examples.md#application-layer-examples) | [Examples](./reactive-examples.md#application-layer-examples) | [Tests](./testing-structure.md#application-layer-testing) |
| **Infrastructure Layer** | [Structure](./package-organization.md#infrastructure-package) | [Examples](./imperative-examples.md#infrastructure-layer-examples) | [Examples](./reactive-examples.md#infrastructure-layer-examples) | [Tests](./testing-structure.md#infrastructure-layer-testing) |
| **Interface Layer** | [Structure](./package-organization.md#interfaces-package) | [Examples](./imperative-examples.md#interface-layer-examples) | [Examples](./reactive-examples.md#interface-layer-examples) | [Tests](./testing-structure.md#interface-layer-testing) |
| **Configuration** | [Structure](./package-organization.md#config-package) | [Examples](./imperative-examples.md#configuration-examples) | [Examples](./reactive-examples.md#configuration-examples) | [Integration](./testing-structure.md#integration-testing) |

## Key Principles

### 🎯 Domain-Driven Design
- **Bounded Contexts**: Align service boundaries with business domains
- **Ubiquitous Language**: Use domain terminology consistently
- **Rich Domain Models**: Encapsulate business logic within domain entities

### 🏗️ Hexagonal Architecture
- **Ports and Adapters**: Clear separation between domain logic and technical concerns
- **Dependency Inversion**: Domain layer defines contracts, infrastructure implements them
- **Testability**: Each layer can be tested independently

### 🔄 Implementation Flexibility
- **Dual Support**: Both imperative (Spring MVC) and reactive (WebFlux) patterns
- **Consistent Structure**: Same organizational principles regardless of implementation style
- **Technology Agnostic**: Domain layer remains independent of framework choices

## Implementation Decision Matrix

| Consideration | Imperative (Spring MVC) | Reactive (WebFlux) |
|---------------|------------------------|-------------------|
| **Learning Curve** | Lower - familiar patterns | Higher - reactive concepts |
| **Performance** | Good for CPU-bound tasks | Excellent for I/O-bound tasks |
| **Scalability** | Thread-per-request model | Non-blocking, event-driven |
| **Debugging** | Straightforward stack traces | More complex reactive debugging |
| **Ecosystem** | Mature, extensive library support | Growing, modern reactive libraries |
| **Use Cases** | Traditional CRUD operations | High-concurrency, streaming data |

## Getting Started

1. **Choose Implementation Style**: Decide between [imperative](./imperative-examples.md) or [reactive](./reactive-examples.md) based on your use case
2. **Review Package Organization**: Understand the [core structure principles](./package-organization.md)
3. **Follow Examples**: Use the concrete examples as templates for your implementation
4. **Implement Tests**: Apply the [testing patterns](./testing-structure.md) for comprehensive coverage

## Common Patterns

### Repository Pattern
- **Domain Layer**: Define repository interfaces (ports)
- **Infrastructure Layer**: Implement repositories using JPA or R2DBC
- **Testing**: Mock repositories for unit tests, use real implementations for integration tests

### Application Services
- **Orchestration**: Coordinate domain operations and external dependencies
- **Transaction Management**: Handle transactional boundaries
- **Event Publishing**: Publish domain events for cross-cutting concerns

### API Layer
- **Request/Response Mapping**: Convert between API DTOs and application DTOs
- **Validation**: Validate incoming requests using Bean Validation
- **Error Handling**: Provide consistent error responses across all endpoints

## Best Practices Summary

✅ **Do:**
- Keep domain models free of framework dependencies
- Use rich domain models with encapsulated business logic
- Maintain clear boundaries between layers
- Test each layer independently
- Follow consistent naming conventions

❌ **Don't:**
- Put business logic in controllers
- Create anemic domain models
- Mix reactive and imperative code inappropriately
- Skip integration tests
- Violate layer dependencies

## Related Documentation

- [Spring Design Standards](../) - Parent directory with additional Spring patterns
- [API Design Standards](../../../guides/api-design/) - Framework-agnostic API design principles

---

This documentation provides the foundation for building maintainable, testable, and scalable Spring Boot microservices. Each document focuses on specific aspects while maintaining consistency across the entire project structure.