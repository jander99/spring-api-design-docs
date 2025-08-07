# Spring Boot Microservices Architecture Reference

Comprehensive guidelines for building Spring Boot microservices using Domain-Driven Design principles, supporting both imperative (Spring MVC) and reactive (Spring WebFlux) approaches.

## 🎯 Richardson Maturity Model - Find Your API's Level

**New!** Assess your API's maturity and get a personalized improvement roadmap:

<div align="center">

| 📍 **Where is Your API?** | 🚀 **Quick Assessment** |
|---------------------------|-------------------------|
| [**Level 0** - Single endpoint, RPC-style](api-design/maturity-model/level-0/) | [Take 5-minute assessment](api-design/maturity-model/assessment-guide.md) |
| [**Level 1** - Multiple resources](api-design/maturity-model/level-1/) | [View maturity levels](api-design/maturity-model/) |
| [**Level 2** - HTTP verbs (Industry Standard)](api-design/maturity-model/level-2/) | [See improvement paths](api-design/maturity-model/#quick-assessment) |
| [**Level 3** - HATEOAS (True REST)](api-design/maturity-model/level-3/) | [Check best practices](api-design/maturity-model/level-3/best-practices.md) |

</div>

Most modern APIs are at Level 2, and that's perfectly fine! Use our guide to understand where you are and decide if moving up makes sense for your use case.

## Project Structure

### API Design Standards (Framework-Agnostic)

- **[🎯 Maturity Assessment](api-design/maturity-model/)** - Richardson Maturity Model framework
- **[🏗️ Foundations](api-design/foundations/)** - API versioning, resource naming, URL structure
- **[🔄 Request/Response](api-design/request-response/)** - Content types, errors (RFC 7807), pagination, streaming
- **[🔐 Security](api-design/security/)** - Authentication, authorization, API protection
- **[🚀 Advanced Patterns](api-design/advanced-patterns/)** - Event-driven, reactive, streaming architectures
- **[📚 Documentation](api-design/documentation/)** - OpenAPI standards, tools, testing

### Spring Implementation Standards

- **[🏗️ Project Structure](spring-design/project-structure/)** - DDD package organization, imperative/reactive examples
- **[🎯 Architecture](spring-design/architecture/)** - Dependency injection, component management
- **[🎮 Controllers](spring-design/controllers/)** - MVC/WebFlux patterns, request mapping, testing
- **[⚠️ Error Handling](spring-design/error-handling/)** - Exception hierarchy, RFC 7807, validation
- **[🔐 Security](spring-design/security/)** - OAuth 2.1, authorization, CORS, rate limiting
- **[⚙️ Configuration](spring-design/configuration/)** - Profiles, database, external services, observability
- **[📊 Observability](spring-design/observability/)** - Logging, monitoring, metrics
- **[🧪 Testing](spring-design/testing/)** - Unit, integration, and specialized testing patterns

## Getting Started

### 🚀 Quick Start Path

1. **Assess Your API**: Use the [Richardson Maturity Model assessment](api-design/maturity-model/assessment-guide.md) (5 minutes)
2. **API Design**: Review [foundations](api-design/foundations/) and [request/response patterns](api-design/request-response/)
3. **Architecture**: Set up [DDD package structure](spring-design/project-structure/Package-Organization.md)
4. **Implementation**: Choose [imperative](spring-design/project-structure/Imperative-Examples.md) or [reactive](spring-design/project-structure/Reactive-Examples.md)
5. **Controllers**: Implement using [controller patterns](spring-design/controllers/)
6. **Error Handling**: Apply [error handling](spring-design/error-handling/) with RFC 7807
7. **Security**: Configure [OAuth 2.1](spring-design/security/OAuth2-Resource-Server.md) and [authorization](spring-design/security/)
8. **Testing**: Follow [testing patterns](spring-design/testing/) (unit, integration, specialized)
9. **Production**: Add [observability](spring-design/observability/) and [configuration](spring-design/configuration/)

## Key Architecture Principles

- **Domain-Driven Design**: Code organized around business domains
- **Hexagonal Architecture**: Domain logic separated from external concerns
- **API-First Development**: Contracts defined before implementation
- **Consistent Patterns**: Same patterns across all services
- **Security by Design**: Security as core requirement

## Technology Stack

**API Standards**: HTTP/REST, OpenAPI 3.1+, OAuth 2.1/OIDC, RFC 7807, JSON Schema

**Spring Stack**: Spring Boot 3.x, WebFlux, Spring Security, Micrometer, springdoc-openapi v2, Spring Cloud Contract

## Testing Strategy

- **[Unit Testing](spring-design/testing/unit-testing/)**: Fast, isolated component tests
- **[Integration Testing](spring-design/testing/integration-testing/)**: Component interaction with real infrastructure
- **[Specialized Testing](spring-design/testing/specialized-testing/)**: Reactive, contract, security testing

All testing patterns support both imperative (MVC) and reactive (WebFlux) implementations.

## Supporting Resources

Each main documentation section includes:
- **📁 Examples**: Complete implementations and setup guides
- **📚 Reference**: Technical specifications and comparisons
- **🔧 Troubleshooting**: Common issues and solutions

Key directories:
- [Testing Examples & Reference](examples/testing/)
- [Event-Driven Patterns](api-design/advanced-patterns/examples/event-driven/)
- [Streaming Implementations](api-design/examples/streaming/)
- [Documentation Tools](api-design/documentation/examples/documentation-tools/)

## Quick Navigation

### By Development Phase

| Phase | Framework-Agnostic | Spring Implementation |
|-------|-------------------|----------------------|
| **Assessment** | [Maturity Model](api-design/maturity-model/) | - |
| **API Design** | [API Standards](api-design/) | [Controllers](spring-design/controllers/) |
| **Project Setup** | [Foundations](api-design/foundations/) | [Project Structure](spring-design/project-structure/) |
| **Error Handling** | [Error Standards](api-design/request-response/Error-Response-Standards.md) | [Error Handling](spring-design/error-handling/) |
| **Security** | [Security Standards](api-design/security/) | [Security Implementation](spring-design/security/) |
| **Testing** | [Documentation Testing](api-design/documentation/Documentation-Testing.md) | [Testing Patterns](spring-design/testing/) |
| **Production** | [Advanced Patterns](api-design/advanced-patterns/) | [Observability](spring-design/observability/) |

