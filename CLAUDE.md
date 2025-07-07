# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **documentation repository** for API design standards and Spring Boot microservices architecture. It contains comprehensive guidelines for building APIs and microservices using both imperative and reactive approaches. The repository does not contain executable code but serves as architectural reference documentation.

## Architecture Standards

### Domain-Driven Design Structure
All microservices follow this standardized package structure:

```
com.example.{service-name}
├── domain           # Domain model and business logic
├── application      # Application services/use cases
├── infrastructure   # Technical implementations
├── interfaces       # API controllers and external interfaces
└── config           # Application configuration
```

### Dual Implementation Support
- **Imperative**: Traditional Spring MVC with blocking I/O
- **Reactive**: Spring WebFlux with non-blocking I/O

### Core Principles
- **Hexagonal Architecture**: Separation of domain logic from external concerns
- **API-First Development**: Define clear API contracts before implementation
- **Security by Design**: OAuth 2.1/OIDC and resource-based authorization
- **Framework-Agnostic Design**: API standards independent of implementation technology
- **Consistent Patterns**: Same organizational patterns across all services

## Key Documentation Sections

### API Design Standards (`/api-design/`)
**Framework-agnostic API design principles**:
- URI-based versioning strategy (e.g., `/v1/orders`, `/v2/orders`)
- RESTful resource naming conventions and HTTP semantics
- Consistent request/response formats and RFC 7807 Problem Details
- HTTP streaming protocols and reactive patterns
- OAuth 2.1/OIDC security standards and HTTP security headers
- OpenAPI 3.1+ documentation requirements

### Spring Implementation Standards (`/spring-design/`)
**Spring Boot-specific implementation patterns**:
- Controller patterns for both Spring MVC and WebFlux
- Domain-centric package organization
- Dependency injection and component management
- Exception handling and error management
- Security implementation with Spring Security and OAuth 2.1
- Testing standards (unit, integration, contract)
- Logging and monitoring patterns

## Technology Stack

### API Design Standards (Framework-Agnostic)
- **HTTP/REST**: Core protocol and architectural style
- **OpenAPI 3.1+**: API specification and documentation
- **OAuth 2.1/OIDC**: Authentication and authorization
- **RFC 7807**: Problem Details for error responses
- **JSON Schema**: Request/response validation

### Spring Implementation Stack
- **Spring Boot 3.x**: Core framework
- **Spring WebFlux**: Reactive programming model
- **Spring Security**: OAuth 2.1 implementation
- **Micrometer**: Metrics collection
- **springdoc-openapi v2**: OpenAPI integration
- **Spring Cloud Contract**: Consumer-driven contract testing

## Development Notes

- This repository contains only documentation files (`.md` format)
- No build scripts, package managers, or executable code
- Serves as reference guide for implementing APIs and microservices
- **API design standards** are framework-agnostic and focus on HTTP/REST principles
- **Spring design standards** provide specific implementation guidance for Spring Boot
- Code examples in API design are HTTP protocol-based
- Framework-specific code examples are in spring-design documentation

## Key Files

- `README.md`: Main project overview and navigation
- `api-design/`: Framework-agnostic API design standards and HTTP/REST conventions
- `spring-design/`: Spring Boot-specific implementation patterns and code examples
- `spring-design/Project Structure and Package Organization.md`: Core architectural patterns for Spring applications

## Important Distinction

- **api-design/**: Universal principles applicable to any REST framework (Express.js, FastAPI, Django REST, Spring Boot, etc.)
- **spring-design/**: Specific to Spring Boot implementations with concrete code examples and configuration