# Package Organization

## Overview

A consistent project structure makes it easier to find code. It separates different concerns. It helps teams understand new services quickly. This guide shows how to organize Spring Boot microservices using Domain-Driven Design principles.

## Core Structure Principles

1. **Domain-Centric Organization**: Organize packages by business domain, not by technical type
2. **Bounded Contexts**: Match microservice boundaries to business domains
3. **Hexagonal Architecture**: Keep domain logic separate from external tools through ports and adapters
4. **Consistent Conventions**: Use the same patterns across all microservices

## Standard Project Structure

### Root Package Naming

Use reverse domain notation with service name:

```
com.example.{service-name}
```

Example:
```
com.example.orderservice
com.example.customerservice
```

### High-Level Package Structure

```
com.example.{service-name}
├── domain           # Domain model and business logic
├── application      # Application services/use cases that orchestrate domain operations
├── infrastructure   # Technical implementations of ports defined in the domain
├── interfaces       # API controllers and external interfaces
└── config           # Application configuration
```

## Domain Package

The domain package holds your core business logic. It has no framework dependencies.

```
domain
├── model           # Business entities and value objects
├── repository      # Repository interfaces (ports)
├── service         # Domain services
├── event           # Domain events
└── exception       # Business-specific exceptions
```

## Application Package

The application package contains use cases. It coordinates domain operations.

```
application
├── service        # Application services that run use cases
├── dto            # Data objects for internal communication
├── mapper         # Convert between domain and DTOs
└── exception      # Application-specific exceptions
```

## Infrastructure Package

The infrastructure package implements your technical tools. It adapts to what your domain needs.

```
infrastructure
├── repository             # Repository implementations
├── client                 # External service clients
├── messaging              # Message queue tools
├── persistence            # Database entities and repositories
│   ├── entity             # Database entities 
│   ├── repository         # Spring Data repositories
│   └── mapper             # Convert between domain and database entities
└── security               # Security tools
```

## Interfaces Package

The interfaces package exposes your API to the outside world.

```
interfaces
├── rest                   # REST API
│   ├── controller         # Controller classes
│   ├── request            # Request data objects
│   ├── response           # Response data objects
│   ├── mapper             # Convert between application and API data
│   └── advice             # Handle exceptions in controllers
├── graphql                # GraphQL resolvers (optional)
└── grpc                   # gRPC services (optional)
```

## Config Package

The config package sets up your application.

```
config
├── security              # Security setup
├── cache                 # Cache setup
├── database              # Database setup
├── messaging             # Messaging setup
└── web                   # Web setup
```

## Implementation Guidelines

1. **Keep the Domain Pure**: Domain models should not depend on frameworks
2. **Rich Domain Models**: Use objects with behavior and encapsulation, not just data holders
3. **Immutable When Possible**: Make value objects unchangeable when you can
4. **Clear Boundaries**: Separate layers clearly with mappers between them
5. **Package Private Access**: Restrict visibility to enforce boundaries between layers

## Anti-patterns to Avoid

| Anti-pattern | Problem | Better Way |
|--------------|---------|-----------|
| Anemic Domain Models | Only getters and setters | Add behavior to your models |
| Technical Layer Packaging | Organize by type (controllers, services) | Organize by business domain |
| Leaky Abstractions | JPA annotations in domain models | Keep domain models framework-free |
| Business Logic in Controllers | Controllers do too much | Move logic to application services |
| Too Many Finder Methods | Repository has many specific methods | Use query objects instead |

## See Also

- [Imperative Examples](./imperative-examples.md) - Spring MVC implementation examples
- [Reactive Examples](./reactive-examples.md) - WebFlux implementation examples
- [Testing Structure](./testing-structure.md) - Test organization patterns