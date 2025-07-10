# Spring Boot Microservices Architecture Reference

This repository contains comprehensive guidelines and standards for building microservices using Spring Boot, with a focus on both imperative (Spring MVC) and reactive (Spring WebFlux) implementation approaches. The architecture follows Domain-Driven Design principles and provides detailed patterns for consistent implementation across services.

## Project Structure

The project is organized into two main sections with focused subdirectories for easier navigation:

### API Design Standards

Framework-agnostic API design principles organized into focused categories for easier navigation:

#### 🏗️ Foundations
Core principles for building consistent RESTful APIs:
- **[Foundations Documentation](api-design/foundations/)** - Essential API design principles
  - [API Version Strategy](api-design/foundations/API-Version-Strategy.md) - URI-based versioning with deprecation policies
  - [Resource Naming and URL Structure](api-design/foundations/Resource-Naming-and-URL-Structure.md) - RESTful naming conventions and URL design

#### 🔄 Request/Response Patterns
Comprehensive patterns for data exchange and API contract design:
- **[Request/Response Documentation](api-design/request-response/)** - Complete guide to API request/response patterns
  - [Content Types and Structure](api-design/request-response/Content-Types-and-Structure.md) - Standard content types and payload structures
  - [Error Response Standards](api-design/request-response/Error-Response-Standards.md) - RFC 7807 Problem Details and error handling
  - [Pagination and Filtering](api-design/request-response/Pagination-and-Filtering.md) - Collection response patterns and query parameters
  - [Streaming APIs](api-design/request-response/Streaming-APIs.md) - NDJSON streaming and Server-Sent Events

#### 🔐 Security Standards
Authentication, authorization, and API protection:
- **[Security Documentation](api-design/security/)** - Comprehensive security patterns
  - [Security Standards](api-design/security/Security-Standards.md) - High-level approach to authentication, authorization, and API protection

#### 🚀 Advanced Patterns
Sophisticated patterns for reactive and event-driven architectures:
- **[Advanced Patterns Documentation](api-design/advanced-patterns/)** - Complex architectural patterns
  - [HTTP Streaming Patterns](api-design/advanced-patterns/HTTP-Streaming-Patterns.md) - Server-Sent Events, streaming responses, and real-time communication
  - [Event-Driven Architecture](api-design/advanced-patterns/Event-Driven-Architecture.md) - Event sourcing, CQRS, and event-driven system design
  - [Reactive Error Handling](api-design/advanced-patterns/Reactive-Error-Handling.md) - Error handling patterns for reactive and streaming APIs
  - [Streaming Documentation Patterns](api-design/advanced-patterns/Streaming-Documentation-Patterns.md) - Documenting streaming APIs and event-driven patterns

#### 📚 Documentation Standards
OpenAPI specifications and API documentation patterns:
- **[Documentation Standards](api-design/documentation/)** - Complete documentation approach
  - [OpenAPI Standards](api-design/documentation/OpenAPI-Standards.md) - Standards for OpenAPI specifications and schema definitions
  - [Documentation Tools and Integration](api-design/documentation/Documentation-Tools-and-Integration.md) - Tools, generators, and integration patterns for API documentation
  - [Documentation Testing](api-design/documentation/Documentation-Testing.md) - Testing documentation accuracy and contract validation

### Spring Implementation Standards

Spring Boot-specific implementation patterns organized by functional area with enhanced directory structure:

#### 🏗️ Project Structure and Organization
Foundation patterns for organizing Spring Boot applications:
- **[Project Structure Documentation](spring-design/project-structure/)** - Comprehensive project organization patterns
  - [Package Organization](spring-design/project-structure/Package-Organization.md) - Domain-Driven Design package structure
  - [Imperative Examples](spring-design/project-structure/Imperative-Examples.md) - Spring MVC implementation patterns
  - [Reactive Examples](spring-design/project-structure/Reactive-Examples.md) - WebFlux implementation patterns
  - [Testing Structure](spring-design/project-structure/Testing-Structure.md) - Test organization and patterns

#### 🎯 Architecture Patterns
Core architectural patterns for Spring applications:
- **[Architecture Documentation](spring-design/architecture/)** - Essential architectural patterns
  - [Dependency Injection and Component Management](spring-design/architecture/Dependency-Injection-and-Component-Management.md) - Best practices for DI and Spring component organization

#### 🎮 Controller Implementation
Complete controller implementation guide for both paradigms:
- **[Controllers Documentation](spring-design/controllers/)** - Complete controller implementation guide
  - [Controller Fundamentals](spring-design/controllers/Controller-Fundamentals.md) - Core principles and patterns
  - [Imperative Controllers](spring-design/controllers/Imperative-Controllers.md) - Spring MVC controller patterns
  - [Reactive Controllers](spring-design/controllers/Reactive-Controllers.md) - WebFlux controller patterns
  - [Request Response Mapping](spring-design/controllers/Request-Response-Mapping.md) - DTOs, mappers, and validation
  - [Controller Testing](spring-design/controllers/Controller-Testing.md) - Comprehensive testing strategies

#### ⚠️ Error Handling and Exception Management
Comprehensive error management patterns:
- **[Error Handling Documentation](spring-design/error-handling/)** - Complete error management patterns
  - [Exception Hierarchy](spring-design/error-handling/Exception-Hierarchy.md) - Custom exception design and organization
  - [Error Response Formats](spring-design/error-handling/Error-Response-Formats.md) - RFC 7807 Problem Details implementation
  - [Imperative Error Handling](spring-design/error-handling/Imperative-Error-Handling.md) - Spring MVC error handling patterns
  - [Reactive Error Handling](spring-design/error-handling/Reactive-Error-Handling.md) - WebFlux error handling patterns
  - [Validation Standards](spring-design/error-handling/Validation-Standards.md) - Bean Validation and custom validators
  - [Error Logging and Monitoring](spring-design/error-handling/Error-Logging-and-Monitoring.md) - Structured logging and metrics

#### 🔐 Security Implementation
Comprehensive security patterns and OAuth 2.1 implementation:
- **[Security Documentation](spring-design/security/)** - Comprehensive security patterns
  - [OAuth2 Resource Server](spring-design/security/OAuth2-Resource-Server.md) - OAuth 2.1/OIDC authentication setup
  - [Authorization Patterns](spring-design/security/Authorization-Patterns.md) - Binary resource-based authorization
  - [Security Context Propagation](spring-design/security/Security-Context-Propagation.md) - Service-to-service security
  - [CORS and Headers](spring-design/security/CORS-and-Headers.md) - Cross-origin policies and security headers
  - [Rate Limiting and Protection](spring-design/security/Rate-Limiting-and-Protection.md) - Attack protection mechanisms
  - [Security Testing](spring-design/security/Security-Testing.md) - Security testing patterns

#### ⚙️ Configuration Management
Complete configuration patterns for all environments:
- **[Configuration Documentation](spring-design/configuration/)** - Complete configuration patterns
  - [Configuration Principles](spring-design/configuration/Configuration-Principles.md) - Core configuration concepts
  - [Environment Profiles](spring-design/configuration/Environment-Profiles.md) - Environment-specific configuration
  - [Security Configuration](spring-design/configuration/Security-Configuration.md) - JWT and CORS configuration
  - [Database Configuration](spring-design/configuration/Database-Configuration.md) - JPA and R2DBC setup patterns
  - [External Services](spring-design/configuration/External-Services.md) - WebClient and service integration
  - [Observability Configuration](spring-design/configuration/Observability-Configuration.md) - Metrics, tracing, and monitoring

#### 📊 Observability and Monitoring
Patterns for production-ready monitoring and observability:
- **[Observability Documentation](spring-design/observability/)** - Complete observability patterns
  - [Logging and Monitoring](spring-design/observability/Logging-and-Monitoring.md) - Patterns for structured logging, metrics collection, and monitoring

#### 🧪 Testing Standards
Comprehensive testing strategy organized by testing type:
- **[Testing Documentation](spring-design/testing/)** - Complete testing strategy and patterns
  - **Unit Testing** - Fast, isolated component testing
    - [Unit Testing Fundamentals](spring-design/testing/unit-testing/Unit-Testing-Fundamentals.md) - Core unit testing principles
    - [Domain Layer Testing](spring-design/testing/unit-testing/Domain-Layer-Testing.md) - Testing business entities and services
    - [Application Layer Testing](spring-design/testing/unit-testing/Application-Layer-Testing.md) - Testing application services
    - [Controller Unit Testing](spring-design/testing/unit-testing/Controller-Unit-Testing.md) - Testing controllers in isolation
  - **Integration Testing** - Component interaction testing
    - [Integration Testing Fundamentals](spring-design/testing/integration-testing/Integration-Testing-Fundamentals.md) - Core integration testing
    - [Database Integration Testing](spring-design/testing/integration-testing/Database-Integration-Testing.md) - Testing with real databases
    - [API Integration Testing](spring-design/testing/integration-testing/API-Integration-Testing.md) - End-to-end API testing
    - [External Service Testing](spring-design/testing/integration-testing/External-Service-Testing.md) - Testing with external service mocks
  - **Specialized Testing** - Advanced testing patterns
    - [Infrastructure Testing](spring-design/testing/specialized-testing/Infrastructure-Testing.md) - Testing repositories and adapters
    - [Reactive Testing](spring-design/testing/specialized-testing/Reactive-Testing.md) - Testing reactive streams and operations
    - [Contract Testing Standards](spring-design/testing/specialized-testing/Contract-Testing-Standards.md) - Consumer-driven contract testing

## Getting Started

This repository serves as a reference guide for implementing microservices. The enhanced directory structure makes it easier to find exactly what you need:

### 🚀 Quick Start Path

1. **Foundation Principles**: Start with [API design foundations](api-design/foundations/) to understand core REST principles
2. **Choose Your Architecture**: Review [Package Organization](spring-design/project-structure/Package-Organization.md) for Domain-Driven Design structure
3. **Select Implementation Style**: Choose between [imperative](spring-design/project-structure/Imperative-Examples.md) or [reactive](spring-design/project-structure/Reactive-Examples.md) approaches
4. **Request/Response Design**: Define your API contracts using [request/response patterns](api-design/request-response/)
5. **Controller Implementation**: Follow the [controller guides](spring-design/controllers/) for your chosen approach
6. **Error Handling**: Implement comprehensive [error handling](spring-design/error-handling/) patterns
7. **Security Setup**: Configure [security patterns](spring-design/security/) and [OAuth 2.1](spring-design/security/OAuth2-Resource-Server.md)
8. **Testing Strategy**: Build confidence with [organized testing approaches](spring-design/testing/)
9. **Production Readiness**: Add [observability](spring-design/observability/) and [configuration management](spring-design/configuration/)

### 🎯 Navigate by Focus Area

- **API Design First**: Start with [API design standards](api-design/) (framework-agnostic)
- **Spring Implementation**: Jump to [Spring implementation standards](spring-design/) (Spring Boot-specific)
- **Testing Focus**: Explore the [organized testing directory](spring-design/testing/) with unit, integration, and specialized testing patterns
- **Security Focus**: Deep dive into [security implementation](spring-design/security/) and [security standards](api-design/security/)
- **Advanced Patterns**: Explore [reactive patterns](api-design/advanced-patterns/) and [streaming APIs](api-design/advanced-patterns/HTTP-Streaming-Patterns.md)

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

The architecture emphasizes comprehensive testing at multiple levels following the testing pyramid, now organized into focused categories:

### 🧪 Organized Testing Strategy

- **[Unit Testing](spring-design/testing/unit-testing/)**: Fast, isolated tests for individual components
  - [Unit Testing Fundamentals](spring-design/testing/unit-testing/Unit-Testing-Fundamentals.md) - Core principles and patterns
  - [Domain Layer Testing](spring-design/testing/unit-testing/Domain-Layer-Testing.md) - Testing business entities and services
  - [Application Layer Testing](spring-design/testing/unit-testing/Application-Layer-Testing.md) - Testing application services
  - [Controller Unit Testing](spring-design/testing/unit-testing/Controller-Unit-Testing.md) - Testing controllers in isolation

- **[Integration Testing](spring-design/testing/integration-testing/)**: Component interaction testing with real infrastructure
  - [Integration Testing Fundamentals](spring-design/testing/integration-testing/Integration-Testing-Fundamentals.md) - Core integration testing
  - [Database Integration Testing](spring-design/testing/integration-testing/Database-Integration-Testing.md) - Testing with real databases
  - [API Integration Testing](spring-design/testing/integration-testing/API-Integration-Testing.md) - End-to-end API testing
  - [External Service Testing](spring-design/testing/integration-testing/External-Service-Testing.md) - Testing with external service mocks

- **[Specialized Testing](spring-design/testing/specialized-testing/)**: Advanced testing patterns
  - [Infrastructure Testing](spring-design/testing/specialized-testing/Infrastructure-Testing.md) - Testing repositories and adapters
  - [Reactive Testing](spring-design/testing/specialized-testing/Reactive-Testing.md) - Testing reactive streams and operations
  - [Contract Testing Standards](spring-design/testing/specialized-testing/Contract-Testing-Standards.md) - Consumer-driven contract testing
  - [Security Testing](spring-design/security/Security-Testing.md) - Comprehensive validation of security implementations

Each testing approach includes both imperative (Spring MVC) and reactive (WebFlux) implementation patterns, ensuring comprehensive coverage regardless of your chosen programming model.

## Supporting Resources

The documentation now includes comprehensive supporting materials:

### 📁 **Examples Directories**
Detailed code examples and implementation guides:
- **[Testing Examples](examples/testing/)** - Complete CI/CD setups and test scripts
- **[Event-Driven Examples](api-design/advanced-patterns/examples/event-driven/)** - Full event processing implementations
- **[Pagination Examples](api-design/request-response/examples/pagination/)** - Complete pagination patterns
- **[Streaming Examples](api-design/examples/streaming/)** - Real-time data streaming implementations  
- **[Versioning Examples](api-design/examples/versioning/)** - API migration scenarios
- **[Documentation Tool Examples](api-design/documentation/examples/documentation-tools/)** - Complete setup configurations

### 📚 **Reference Directories**
Comprehensive technical specifications:
- **[Testing Reference](reference/testing/)** - Tool comparisons and quality metrics
- **[Event-Driven Reference](api-design/advanced-patterns/reference/event-driven/)** - Detailed patterns and configurations
- **[Pagination Reference](api-design/request-response/reference/pagination/)** - Advanced filtering and cursor patterns
- **[Streaming Reference](api-design/reference/streaming/)** - NDJSON and SSE specifications
- **[Versioning Reference](api-design/reference/versioning/)** - Comprehensive deprecation policies
- **[Documentation Tools Reference](api-design/documentation/reference/documentation-tools/)** - Detailed tool comparisons

### 🔧 **Troubleshooting Directories**
Common issues and solutions:
- **[Testing Troubleshooting](troubleshooting/testing/)** - Validation and CI/CD issues
- **[Event-Driven Troubleshooting](api-design/advanced-patterns/troubleshooting/event-driven/)** - Event processing problems
- **[Pagination Troubleshooting](api-design/request-response/troubleshooting/pagination/)** - Performance and edge cases
- **[Streaming Troubleshooting](api-design/troubleshooting/streaming/)** - Connection and testing issues
- **[Versioning Troubleshooting](api-design/troubleshooting/versioning/)** - Migration and compatibility problems
- **[Documentation Tools Troubleshooting](api-design/documentation/troubleshooting/documentation-tools/)** - Integration and setup issues

## Quick Navigation Guide

### By Development Phase

| Phase | Framework-Agnostic | Spring Implementation |
|-------|-------------------|----------------------|
| **Foundation** | [API Foundations](api-design/foundations/) | [Architecture Patterns](spring-design/architecture/) |
| **API Design** | [API Design Standards](api-design/) | [Controller Implementation](spring-design/controllers/) |
| **Project Setup** | [Resource Naming](api-design/foundations/Resource-Naming-and-URL-Structure.md) | [Project Structure](spring-design/project-structure/) |
| **Request/Response** | [Request/Response Standards](api-design/request-response/) | [Controller Mapping](spring-design/controllers/Request-Response-Mapping.md) |
| **Error Handling** | [Error Response Standards](api-design/request-response/Error-Response-Standards.md) | [Error Handling](spring-design/error-handling/) |
| **Security** | [Security Standards](api-design/security/) | [Security Implementation](spring-design/security/) |
| **Configuration** | [OpenAPI Standards](api-design/documentation/) | [Configuration Management](spring-design/configuration/) |
| **Testing** | [Documentation Testing](api-design/documentation/Documentation-Testing.md) | [Organized Testing](spring-design/testing/) |
| **Production** | [Advanced Patterns](api-design/advanced-patterns/) | [Observability](spring-design/observability/) |

### By Technical Focus

| Focus Area | Primary Documentation | Supporting References |
|------------|----------------------|----------------------|
| **RESTful API Design** | [API Foundations](api-design/foundations/), [Request/Response](api-design/request-response/) | [Controllers](spring-design/controllers/), [Error Handling](spring-design/error-handling/) |
| **Domain-Driven Design** | [Package Organization](spring-design/project-structure/Package-Organization.md) | [Architecture Patterns](spring-design/architecture/), [Imperative Examples](spring-design/project-structure/Imperative-Examples.md), [Reactive Examples](spring-design/project-structure/Reactive-Examples.md) |
| **Reactive Programming** | [Advanced Patterns](api-design/advanced-patterns/) | [Reactive Controllers](spring-design/controllers/Reactive-Controllers.md), [Reactive Testing](spring-design/testing/specialized-testing/Reactive-Testing.md) |
| **Event-Driven Architecture** | [Event-Driven Architecture](api-design/advanced-patterns/Event-Driven-Architecture.md) | [Streaming Documentation Patterns](api-design/advanced-patterns/Streaming-Documentation-Patterns.md) |
| **API Documentation** | [Documentation Standards](api-design/documentation/) | [OpenAPI Standards](api-design/documentation/OpenAPI-Standards.md), [Documentation Testing](api-design/documentation/Documentation-Testing.md) |
| **Security Implementation** | [Security Standards](api-design/security/) | [Security Implementation](spring-design/security/), [OAuth 2.1](spring-design/security/OAuth2-Resource-Server.md) |
| **Testing Strategy** | [Organized Testing](spring-design/testing/) | [Unit Testing](spring-design/testing/unit-testing/), [Integration Testing](spring-design/testing/integration-testing/), [Specialized Testing](spring-design/testing/specialized-testing/) |
| **Production Readiness** | [Request/Response Standards](api-design/request-response/) | [Configuration](spring-design/configuration/), [Observability](spring-design/observability/), [Error Handling](spring-design/error-handling/) |

### 🎯 Benefits of the New Structure

The enhanced directory organization provides several key advantages:

#### 📁 **Focused Categories**
- **API Design**: Organized into logical categories (foundations, request-response, security, advanced-patterns, documentation)
- **Spring Implementation**: Grouped by functional area with clear separation of concerns
- **Testing**: Structured by testing type (unit, integration, specialized) for easier navigation

#### 🔍 **Improved Discoverability**
- **Descriptive Section Names**: Each directory has a clear purpose and scope
- **Logical Grouping**: Related concepts are co-located for better understanding
- **Progressive Complexity**: From foundations to advanced patterns

#### 🚀 **Enhanced Usability**
- **Faster Navigation**: Find exactly what you need without scrolling through monolithic documents
- **Context-Aware**: Each directory focuses on specific use cases and patterns
- **Consistent Structure**: Similar organizational patterns across both API design and Spring implementation

#### 📚 **Better Learning Path**
- **Structured Learning**: Follow a logical progression from basics to advanced topics
- **Focused Study**: Concentrate on specific areas without distraction
- **Cross-References**: Clear connections between related concepts across directories

### Migration from Previous Structure

If you're familiar with the previous monolithic document structure:

- **Previous Controller Document** → Now organized in [Controllers Directory](spring-design/controllers/)
- **Previous Error Handling Document** → Now structured in [Error Handling Directory](spring-design/error-handling/)
- **Previous Security Document** → Now categorized in [Security Directory](spring-design/security/)
- **Previous Configuration Document** → Now organized in [Configuration Directory](spring-design/configuration/)
- **Previous Testing Documents** → Now systematically organized in [Testing Directory](spring-design/testing/) with unit, integration, and specialized testing
- **Previous Request/Response Content** → Now focused in [Request/Response Directory](api-design/request-response/)
- **New Architecture Patterns** → Added [Architecture Directory](spring-design/architecture/) for foundational patterns
- **New Observability Focus** → Added [Observability Directory](spring-design/observability/) for monitoring and logging