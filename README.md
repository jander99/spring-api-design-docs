# Spring Boot Microservices Architecture Reference

This repository contains comprehensive guidelines and standards for building microservices using Spring Boot, with a focus on both imperative (Spring MVC) and reactive (Spring WebFlux) implementation approaches. The architecture follows Domain-Driven Design principles and provides detailed patterns for consistent implementation across services.

## Project Structure

The project is organized into two main sections with focused subdirectories for easier navigation:

### API Design Standards

Framework-agnostic API design principles for consistent REST services:

#### Core API Design
- [API Version Strategy](api-design/API Version Strategy.md) - Guidelines for versioning APIs with URI-based patterns and deprecation policies
- [Resource Naming and URL Structure](api-design/Resource Naming and URL Structure.md) - RESTful resource naming conventions and URL design principles
- [Security Standards](api-design/Security Standards.md) - High-level approach to authentication, authorization, and API protection

#### Documentation and Integration
- [OpenAPI Standards](api-design/OpenAPI-Standards.md) - Standards for OpenAPI specifications and schema definitions
- [Documentation Tools and Integration](api-design/Documentation-Tools-and-Integration.md) - Tools, generators, and integration patterns for API documentation
- [Documentation Testing](api-design/Documentation-Testing.md) - Testing documentation accuracy and contract validation
- [Streaming Documentation Patterns](api-design/Streaming-Documentation-Patterns.md) - Documenting streaming APIs and event-driven patterns

#### Reactive and Event-Driven Patterns
- [HTTP Streaming Patterns](api-design/HTTP-Streaming-Patterns.md) - Server-Sent Events, streaming responses, and real-time communication
- [Event-Driven Architecture](api-design/Event-Driven-Architecture.md) - Event sourcing, CQRS, and event-driven system design
- [Reactive Error Handling](api-design/Reactive-Error-Handling.md) - Error handling patterns for reactive and streaming APIs

#### Request/Response Standards
Comprehensive patterns for data exchange and API contract design:
- **[Request/Response Documentation](api-design/request-response/)** - Complete guide to API request/response patterns
  - [Content Types and Structure](api-design/request-response/Content-Types-and-Structure.md) - Standard content types and payload structures
  - [Error Response Standards](api-design/request-response/Error-Response-Standards.md) - RFC 7807 Problem Details and error handling
  - [Pagination and Filtering](api-design/request-response/Pagination-and-Filtering.md) - Collection response patterns and query parameters
  - [Streaming APIs](api-design/request-response/Streaming-APIs.md) - NDJSON streaming and Server-Sent Events

### Spring Implementation Standards

Spring Boot-specific implementation patterns organized by functional area:

#### Project Structure and Organization
- **[Project Structure Documentation](spring-design/project-structure/)** - Comprehensive project organization patterns
  - [Package Organization](spring-design/project-structure/Package-Organization.md) - Domain-Driven Design package structure
  - [Imperative Examples](spring-design/project-structure/Imperative-Examples.md) - Spring MVC implementation patterns
  - [Reactive Examples](spring-design/project-structure/Reactive-Examples.md) - WebFlux implementation patterns
  - [Testing Structure](spring-design/project-structure/Testing-Structure.md) - Test organization and patterns

#### Controller Implementation
- **[Controllers Documentation](spring-design/controllers/)** - Complete controller implementation guide
  - [Controller Fundamentals](spring-design/controllers/Controller-Fundamentals.md) - Core principles and patterns
  - [Imperative Controllers](spring-design/controllers/Imperative-Controllers.md) - Spring MVC controller patterns
  - [Reactive Controllers](spring-design/controllers/Reactive-Controllers.md) - WebFlux controller patterns
  - [Request Response Mapping](spring-design/controllers/Request-Response-Mapping.md) - DTOs, mappers, and validation
  - [Controller Testing](spring-design/controllers/Controller-Testing.md) - Comprehensive testing strategies

#### Error Handling and Exception Management
- **[Error Handling Documentation](spring-design/error-handling/)** - Complete error management patterns
  - [Exception Hierarchy](spring-design/error-handling/Exception-Hierarchy.md) - Custom exception design and organization
  - [Error Response Formats](spring-design/error-handling/Error-Response-Formats.md) - RFC 7807 Problem Details implementation
  - [Imperative Error Handling](spring-design/error-handling/Imperative-Error-Handling.md) - Spring MVC error handling patterns
  - [Reactive Error Handling](spring-design/error-handling/Reactive-Error-Handling.md) - WebFlux error handling patterns
  - [Validation Standards](spring-design/error-handling/Validation-Standards.md) - Bean Validation and custom validators
  - [Error Logging and Monitoring](spring-design/error-handling/Error-Logging-and-Monitoring.md) - Structured logging and metrics

#### Security Implementation
- **[Security Documentation](spring-design/security/)** - Comprehensive security patterns
  - [OAuth2 Resource Server](spring-design/security/OAuth2-Resource-Server.md) - OAuth 2.1/OIDC authentication setup
  - [Authorization Patterns](spring-design/security/Authorization-Patterns.md) - Binary resource-based authorization
  - [Security Context Propagation](spring-design/security/Security-Context-Propagation.md) - Service-to-service security
  - [CORS and Headers](spring-design/security/CORS-and-Headers.md) - Cross-origin policies and security headers
  - [Rate Limiting and Protection](spring-design/security/Rate-Limiting-and-Protection.md) - Attack protection mechanisms
  - [Security Testing](spring-design/security/Security-Testing.md) - Security testing patterns

#### Configuration Management
- **[Configuration Documentation](spring-design/configuration/)** - Complete configuration patterns
  - [Configuration Principles](spring-design/configuration/Configuration-Principles.md) - Core configuration concepts
  - [Environment Profiles](spring-design/configuration/Environment-Profiles.md) - Environment-specific configuration
  - [Security Configuration](spring-design/configuration/Security-Configuration.md) - JWT and CORS configuration
  - [Database Configuration](spring-design/configuration/Database-Configuration.md) - JPA and R2DBC setup patterns
  - [External Services](spring-design/configuration/External-Services.md) - WebClient and service integration
  - [Observability Configuration](spring-design/configuration/Observability-Configuration.md) - Metrics, tracing, and monitoring

#### Testing Standards
- **[Testing Documentation](spring-design/testing/)** - Complete testing strategy and patterns
  - [Unit Testing Fundamentals](spring-design/testing/Unit-Testing-Fundamentals.md) - Core unit testing principles
  - [Domain Layer Testing](spring-design/testing/Domain-Layer-Testing.md) - Testing business entities and services
  - [Application Layer Testing](spring-design/testing/Application-Layer-Testing.md) - Testing application services
  - [Infrastructure Testing](spring-design/testing/Infrastructure-Testing.md) - Testing repositories and adapters
  - [Controller Unit Testing](spring-design/testing/Controller-Unit-Testing.md) - Testing controllers in isolation
  - [Reactive Testing](spring-design/testing/Reactive-Testing.md) - Testing reactive streams and operations
  - [Integration Testing Fundamentals](spring-design/testing/Integration-Testing-Fundamentals.md) - Core integration testing
  - [Database Integration Testing](spring-design/testing/Database-Integration-Testing.md) - Testing with real databases
  - [API Integration Testing](spring-design/testing/API-Integration-Testing.md) - End-to-end API testing
  - [External Service Testing](spring-design/testing/External-Service-Testing.md) - Testing with external service mocks

#### Additional Components
- [Dependency Injection and Component Management](spring-design/Dependency Injection and Component Management.md) - Best practices for DI and Spring component organization
- [Logging and Monitoring](spring-design/Logging and Monitoring.md) - Patterns for structured logging, metrics collection, and monitoring
- [Contract Testing Standards](spring-design/Contract Testing Standards.md) - Standards for consumer-driven contract testing

## Getting Started

This repository serves as a reference guide for implementing microservices. To get started:

1. **Understand the Architecture**: Review the [Package Organization](spring-design/project-structure/Package-Organization.md) document to understand the overall Domain-Driven Design structure
2. **Choose Your Implementation Style**: Decide between [imperative](spring-design/project-structure/Imperative-Examples.md) or [reactive](spring-design/project-structure/Reactive-Examples.md) approaches based on your requirements
3. **API Design**: Explore the framework-agnostic [API design principles](api-design/) and [request/response patterns](api-design/request-response/)
4. **Implementation Patterns**: Follow the [controller implementation guides](spring-design/controllers/) for your chosen approach
5. **Testing Strategy**: Implement comprehensive testing using the [testing documentation](spring-design/testing/)
6. **Security & Configuration**: Set up [security patterns](spring-design/security/) and [configuration management](spring-design/configuration/) for production readiness

## Key Architecture Principles

The architecture follows these core principles:

- **Domain-Driven Design**: Organizing code around business domains and bounded contexts
- **Hexagonal Architecture**: Separating domain logic from external concerns through ports and adapters
- **API-First Development**: Defining clear API contracts before implementation
- **Consistent Patterns**: Applying the same organizational and implementation patterns across services
- **Security by Design**: Implementing comprehensive security measures as a core requirement

## Technology Stack

### API Design Standards (Framework-Agnostic)
- **HTTP/REST**: Core protocol and architectural style
- **OpenAPI 3.1+**: API specification and documentation
- **OAuth 2.1/OIDC**: Authentication and authorization
- **RFC 7807**: Problem Details for error responses
- **JSON Schema**: Request/response validation

### Spring Implementation Stack
- **Spring Boot 3.x**: Core framework for microservices
- **Spring WebFlux**: Reactive programming model for high-throughput scenarios
- **Spring Security**: OAuth 2.1 implementation and resource-based authorization
- **Micrometer**: Metrics collection and observability
- **springdoc-openapi v2**: OpenAPI integration for Spring Boot
- **Spring Cloud Contract**: Consumer-driven contract testing

## Testing Approach

The architecture emphasizes comprehensive testing at multiple levels following the testing pyramid:

- **[Unit Testing](spring-design/testing/)**: Fast, isolated tests for individual components (domain, application, infrastructure layers)
- **[Integration Testing](spring-design/testing/Integration-Testing-Fundamentals.md)**: Testing interactions between components with real infrastructure
- **[API Testing](spring-design/testing/API-Integration-Testing.md)**: End-to-end testing of complete request-response cycles
- **[Contract Testing](spring-design/Contract Testing Standards.md)**: Consumer-driven contract testing for service interactions
- **[Security Testing](spring-design/security/Security-Testing.md)**: Comprehensive validation of security implementations
- **[Reactive Testing](spring-design/testing/Reactive-Testing.md)**: Specialized patterns for testing reactive streams and non-blocking operations

Each testing approach includes both imperative (Spring MVC) and reactive (WebFlux) implementation patterns, ensuring comprehensive coverage regardless of your chosen programming model.

## Quick Navigation Guide

### By Development Phase

| Phase | Framework-Agnostic | Spring Implementation |
|-------|-------------------|----------------------|
| **API Design** | [API Design Standards](api-design/) | [Controller Implementation](spring-design/controllers/) |
| **Project Setup** | [Resource Naming](api-design/Resource Naming and URL Structure.md) | [Project Structure](spring-design/project-structure/) |
| **Request/Response** | [Request/Response Standards](api-design/request-response/) | [Controller Mapping](spring-design/controllers/Request-Response-Mapping.md) |
| **Error Handling** | [Error Response Standards](api-design/request-response/Error-Response-Standards.md) | [Error Handling](spring-design/error-handling/) |
| **Security** | [Security Standards](api-design/Security Standards.md) | [Security Implementation](spring-design/security/) |
| **Configuration** | [OpenAPI Standards](api-design/OpenAPI-Standards.md) | [Configuration Management](spring-design/configuration/) |
| **Testing** | [Documentation Testing](api-design/Documentation-Testing.md) | [Testing Standards](spring-design/testing/) |

### By Technical Focus

| Focus Area | Primary Documentation | Supporting References |
|------------|----------------------|----------------------|
| **RESTful API Design** | [API Design Standards](api-design/) | [Controllers](spring-design/controllers/), [Error Handling](spring-design/error-handling/) |
| **Domain-Driven Design** | [Package Organization](spring-design/project-structure/Package-Organization.md) | [Imperative Examples](spring-design/project-structure/Imperative-Examples.md), [Reactive Examples](spring-design/project-structure/Reactive-Examples.md) |
| **Reactive Programming** | [HTTP Streaming Patterns](api-design/HTTP-Streaming-Patterns.md), [Reactive Error Handling](api-design/Reactive-Error-Handling.md) | [Reactive Controllers](spring-design/controllers/Reactive-Controllers.md), [Reactive Testing](spring-design/testing/Reactive-Testing.md) |
| **Event-Driven Architecture** | [Event-Driven Architecture](api-design/Event-Driven-Architecture.md) | [Streaming Documentation Patterns](api-design/Streaming-Documentation-Patterns.md) |
| **API Documentation** | [OpenAPI Standards](api-design/OpenAPI-Standards.md), [Documentation Tools and Integration](api-design/Documentation-Tools-and-Integration.md) | [Documentation Testing](api-design/Documentation-Testing.md) |
| **Security Implementation** | [Security Standards](api-design/Security Standards.md) | [Security Documentation](spring-design/security/) |
| **Testing Strategy** | [Documentation Testing](api-design/Documentation-Testing.md) | [Testing Overview](spring-design/testing/), [Controller Testing](spring-design/controllers/Controller-Testing.md) |
| **Production Readiness** | [Request/Response Standards](api-design/request-response/) | [Configuration](spring-design/configuration/), [Error Handling](spring-design/error-handling/) |

### Migration from Previous Structure

If you're familiar with the previous monolithic document structure:

- **Previous Controller Document** → Now split into [Controllers Directory](spring-design/controllers/)
- **Previous Error Handling Document** → Now split into [Error Handling Directory](spring-design/error-handling/)
- **Previous Security Document** → Now split into [Security Directory](spring-design/security/)
- **Previous Configuration Document** → Now split into [Configuration Directory](spring-design/configuration/)
- **Previous Testing Documents** → Now organized in [Testing Directory](spring-design/testing/)
- **Previous Request/Response Content** → Now in [Request/Response Directory](api-design/request-response/)