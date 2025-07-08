# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Repository Overview

This is a **documentation repository** for API design standards and Spring Boot microservices architecture. It contains comprehensive guidelines for building APIs and microservices using both imperative and reactive approaches. The repository contains only documentation files (`.md` format) and serves as architectural reference documentation.

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

### Core Principles
- **Hexagonal Architecture**: Separation of domain logic from external concerns
- **API-First Development**: Define clear API contracts before implementation
- **Security by Design**: OAuth 2.1/OIDC and resource-based authorization
- **Dual Implementation Support**: Imperative (Spring MVC) and Reactive (WebFlux) patterns
- **Framework-Agnostic Design**: API standards independent of implementation technology

## Documentation Structure

### API Design Standards (`/api-design/`)
Framework-agnostic HTTP/REST principles organized into:
- **request-response/**: HTTP patterns, error formats, pagination, streaming

### Spring Implementation Standards (`/spring-design/`)
Spring Boot-specific patterns organized into:
- **project-structure/**: Package organization and DDD patterns
- **controllers/**: Web layer patterns for MVC and WebFlux
- **error-handling/**: Exception management and RFC 7807 implementation
- **security/**: OAuth 2.1, authorization, and security headers
- **configuration/**: Application config, profiles, and observability
- **testing/**: Unit, integration, and contract testing patterns

## Technology Stack

**API Standards**: HTTP/REST, OpenAPI 3.1+, OAuth 2.1/OIDC, RFC 7807, JSON Schema
**Spring Stack**: Spring Boot 3.x, WebFlux, Spring Security, Micrometer, springdoc-openapi v2

## Important Distinction

- **api-design/**: Universal principles applicable to any REST framework
- **spring-design/**: Specific to Spring Boot implementations with concrete code examples