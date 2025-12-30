# Package Organization

## Overview

A consistent project structure facilitates code navigation, promotes separation of concerns, and enables teams to quickly understand new services. This document outlines our standard approach to organizing Spring Boot microservices following Domain-Driven Design principles.

## Core Structure Principles

1. **Domain-Centric Organization**: Structure packages around business domains rather than technical layers
2. **Bounded Contexts**: Align microservice boundaries with DDD bounded contexts
3. **Hexagonal Architecture**: Separate domain logic from external concerns through ports and adapters
4. **Consistent Conventions**: Apply the same organizational patterns across all microservices

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

The domain package contains core business logic and entities, independent of technical concerns:

```
domain
├── model           # Domain entities and value objects
├── repository      # Repository interfaces (ports)
├── service         # Domain services
├── event           # Domain events
└── exception       # Domain-specific exceptions
```

## Application Package

The application package contains use cases that orchestrate domain operations:

```
application
├── service        # Application services implementing use cases
├── dto            # Data Transfer Objects for internal communication
├── mapper         # Mappers between domain and DTOs
└── exception      # Application-specific exceptions
```

## Infrastructure Package

The infrastructure package contains technical implementations of domain ports:

```
infrastructure
├── repository             # Repository implementations (adapters)
├── client                 # External service clients
├── messaging              # Message queue producers/consumers
├── persistence            # JPA entities and repositories
│   ├── entity             # JPA entities 
│   ├── repository         # Spring Data repositories
│   └── mapper             # Mappers between domain and JPA entities
└── security               # Security implementations
```

## Interfaces Package

The interfaces package contains controllers and external interfaces:

```
interfaces
├── rest                   # REST controllers
│   ├── controller         # Controller classes
│   ├── request            # Request DTOs
│   ├── response           # Response DTOs
│   ├── mapper             # Mappers between application DTOs and API DTOs
│   └── advice             # Controller advice for exception handling
├── graphql                # GraphQL resolvers (if applicable)
└── grpc                   # gRPC service implementations (if applicable)
```

## Config Package

The config package contains application configuration:

```
config
├── security              # Security configuration
├── cache                 # Cache configuration
├── database              # Database configuration
├── messaging             # Messaging configuration
└── web                   # Web configuration
```

## Implementation Guidelines

1. **Keep the Domain Pure**: Domain models should not have framework dependencies
2. **Rich Domain Models**: Use encapsulation and behavior-rich domain objects over anemic models
3. **Immutable Where Possible**: Prefer immutable objects for value objects and where appropriate
4. **Clear Boundaries**: Maintain clear separation between layers with appropriate mappers
5. **Package Private Scope**: Use package-private visibility to enforce layer boundaries where appropriate

## Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Anemic Domain Models | Entities with only getters/setters | Rich domain models with behavior |
| Technical Layer Packaging | Packages by type (controllers, services) | Domain-centric packaging |
| Leaky Abstractions | JPA annotations on domain models | Keep domain models pure |
| Service Orchestration in Controllers | Business logic in controllers | Use application services |
| Repository Method Explosion | Many specific finder methods | Consider query objects pattern |

## See Also

- [Imperative Examples](./imperative-examples.md) - Spring MVC implementation examples
- [Reactive Examples](./reactive-examples.md) - WebFlux implementation examples
- [Testing Structure](./testing-structure.md) - Test organization patterns