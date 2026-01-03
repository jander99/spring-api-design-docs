# Project Structure

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 3 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 8.4 grade level • 0.9% technical density • fairly easy

Learn how to organize your Spring Boot projects. This guide helps you build apps that are easy to maintain and test.

## Project Organization Basics

Good organization makes code easier to find and change. We organize code by what it does, not by its type.

This guide uses two proven patterns:
- **Domain-Driven Design (DDD)**: Organize code around business features
- **Hexagonal Architecture**: Separate business rules from technical details

You can use these patterns with any Spring Boot style. They work with both traditional Spring MVC and reactive WebFlux.

## What You'll Learn

This guide covers four main topics. Each topic helps you organize different parts of your application.

## Documentation Structure

### 📋 [Package Organization](./package-organization.md)
**How to structure your code folders**

Learn the basic folder structure:
- Where to put business logic
- How to separate technical code
- Naming rules for packages
- Common mistakes to avoid

### 🔄 [Imperative Examples](./imperative-examples.md)
**Traditional Spring MVC code**

See real examples of Spring MVC apps:
- Controllers that handle web requests
- Services that run business logic
- Database access with JPA
- Standard web setup

### ⚡ [Reactive Examples](./reactive-examples.md)
**Modern WebFlux code**

See real examples of reactive apps:
- Reactive controllers and routes
- Database access with R2DBC
- Non-blocking services
- Reactive web setup

### 🧪 [Testing Structure](./testing-structure.md)
**How to organize tests**

Learn testing strategies:
- How to test each layer
- When to use mocks
- Integration test patterns
- Reactive testing tools

## Quick Navigation

| Aspect | Package Organization | Imperative | Reactive | Testing |
|--------|---------------------|------------|----------|---------|
| **Domain Layer** | [Structure](./package-organization.md#domain-package) | [Examples](./imperative-examples.md#domain-layer-examples) | [Examples](./reactive-examples.md#domain-layer-examples) | [Tests](./testing-structure.md#domain-layer-testing) |
| **Application Layer** | [Structure](./package-organization.md#application-package) | [Examples](./imperative-examples.md#application-layer-examples) | [Examples](./reactive-examples.md#application-layer-examples) | [Tests](./testing-structure.md#application-layer-testing) |
| **Infrastructure Layer** | [Structure](./package-organization.md#infrastructure-package) | [Examples](./imperative-examples.md#infrastructure-layer-examples) | [Examples](./reactive-examples.md#infrastructure-layer-examples) | [Tests](./testing-structure.md#infrastructure-layer-testing) |
| **Interface Layer** | [Structure](./package-organization.md#interfaces-package) | [Examples](./imperative-examples.md#interface-layer-examples) | [Examples](./reactive-examples.md#interface-layer-examples) | [Tests](./testing-structure.md#interface-layer-testing) |
| **Configuration** | [Structure](./package-organization.md#config-package) | [Examples](./imperative-examples.md#configuration-examples) | [Examples](./reactive-examples.md#configuration-examples) | [Integration](./testing-structure.md#integration-testing) |

## Core Ideas

### 🎯 Domain-Driven Design
Put your business rules in one place. Use the same words your business uses. Keep all related logic together.

### 🏗️ Hexagonal Architecture
Separate your business rules from technical details. Business logic doesn't depend on databases or web frameworks. This makes testing easier.

### 🔄 Two Ways to Build
You can use traditional Spring MVC or modern WebFlux. Both use the same folder structure. Your business logic stays the same either way.

## Choosing Your Approach

| What Matters | Spring MVC | WebFlux |
|---------------|------------|---------|
| **Ease of Learning** | Easier - most developers know this | Harder - new concepts to learn |
| **Speed** | Good for heavy processing | Great for many connections |
| **Scaling** | One thread per request | Shares threads efficiently |
| **Debugging** | Simple error messages | More complex to debug |
| **Libraries** | Many libraries available | Fewer reactive libraries |
| **Best For** | Standard database apps | Streaming or high-traffic apps |

## How to Start

1. **Pick Your Style**: Choose [Spring MVC](./imperative-examples.md) or [WebFlux](./reactive-examples.md)
2. **Learn the Structure**: Read [package organization](./package-organization.md) first
3. **Copy Examples**: Use examples as starting points
4. **Add Tests**: Follow [testing patterns](./testing-structure.md) for full coverage

## Common Patterns

### Repository Pattern
Define database interfaces in your business layer. Implement them in your technical layer. Use mocks for unit tests. Use real databases for integration tests.

### Application Services
Coordinate different parts of your app. Manage database transactions. Publish events when important things happen.

### API Layer
Convert web requests to internal data. Validate all incoming data. Return clear error messages.

## Best Practices

✅ **Do:**
- Keep business logic separate from technical code
- Put business rules in domain objects
- Keep clear lines between layers
- Test each layer on its own
- Use consistent names

❌ **Don't:**
- Put business logic in controllers
- Create objects with only getters and setters
- Mix reactive and blocking code
- Skip integration tests
- Let layers depend on wrong things

## Related Guides

- [Spring Design Standards](../) - More Spring patterns
- [API Design Standards](../../../guides/api-design/) - General API design rules

---

Use these patterns to build Spring Boot apps that are easy to maintain and test. Each guide covers one topic in detail.