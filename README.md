# Software Design Documentation

Comprehensive guides for designing software systems and APIs. This repository contains both abstract design theory and language-specific implementations.

## 📚 Table of Contents

### **Design Guides** (Theory & Principles)

The `guides/` directory contains language-agnostic design theory and standards:

- **[API Design](guides/api-design/)** - REST/HTTP design principles, standards, and patterns
  - Maturity Model assessment, foundations, request/response, security, advanced patterns, documentation
- **[Architecture](guides/architecture/)** - System architecture patterns beyond REST APIs
  - Event-driven architecture, CQRS, event sourcing, saga patterns
- **[Observability](guides/observability/)** - Monitoring, metrics, logging, and tracing standards
  - Three pillars of observability, distributed tracing, correlation IDs, SLOs
- **Domain-Driven Design** *(coming soon)* - Business logic modeling and bounded contexts
- **Hexagonal Architecture** *(coming soon)* - Separating domain logic from external systems

### **Language-Specific Implementations**

The `languages/` directory contains practical implementations for specific technologies:

- **[Spring](languages/spring/)** - Spring Boot microservices with DDD, MVC/WebFlux, testing, and observability
  - Architecture, project structure, controllers, security, configuration, testing, error handling

### **Examples** (Format-Agnostic)

The `examples/` directory contains practical examples using standard formats (JSON, YAML, etc.) that apply across languages and frameworks.

---

## 🎯 Richardson Maturity Model - Find Your API's Level

Assess your API's maturity and get a personalized improvement roadmap:

<div align="center">

| 📍 **Where is Your API?** | 🚀 **Quick Assessment** |
|---------------------------|-------------------------|
| [**Level 0** - Single endpoint, RPC-style](guides/api-design/maturity-model/level-0/) | [Take 5-minute assessment](guides/api-design/maturity-model/assessment-guide.md) |
| [**Level 1** - Multiple resources](guides/api-design/maturity-model/level-1/) | [View maturity levels](guides/api-design/maturity-model/) |
| [**Level 2** - HTTP verbs (Industry Standard)](guides/api-design/maturity-model/level-2/) | [See improvement paths](guides/api-design/maturity-model/#quick-assessment) |
| [**Level 3** - HATEOAS (True REST)](guides/api-design/maturity-model/level-3/) | [Check best practices](guides/api-design/maturity-model/level-3/best-practices.md) |

</div>

Most modern APIs are at Level 2, and that's perfectly fine! Use our guide to understand where you are and decide if moving up makes sense for your use case.

---

## 🚀 Quick Start Paths

### For API Design

1. **Assess Your API**: [Richardson Maturity Model assessment](guides/api-design/maturity-model/assessment-guide.md) (5 minutes)
2. **Learn Foundations**: [API versioning, resource naming, URL structure](guides/api-design/foundations/)
3. **Request/Response Patterns**: [Content types, errors (RFC 7807), pagination, streaming](guides/api-design/request-response/)
4. **Security**: [Authentication and authorization standards](guides/api-design/security/)
5. **Advanced Patterns**: [Event-driven, reactive, streaming](guides/api-design/advanced-patterns/)

### For Spring Implementation

1. **Project Setup**: [DDD package organization](languages/spring/project-structure/)
2. **Choose Your Style**: [Imperative (MVC)](languages/spring/project-structure/Imperative-Examples.md) or [Reactive (WebFlux)](languages/spring/project-structure/Reactive-Examples.md)
3. **Architecture**: [Dependency injection and component management](languages/spring/architecture/)
4. **Controllers**: [Implement request handling](languages/spring/controllers/)
5. **Error Handling**: [Exception hierarchy and RFC 7807](languages/spring/error-handling/)
6. **Security**: [OAuth 2.1 and authorization](languages/spring/security/)
7. **Testing**: [Unit, integration, and specialized tests](languages/spring/testing/)
8. **Production Ready**: [Configuration, observability, monitoring](languages/spring/configuration/)

---

## 🏗️ Core Principles

- **API-First Design**: Define clear contracts before implementation
- **Domain-Driven Design**: Code organized around business domains
- **Hexagonal Architecture**: Separate domain logic from external concerns
- **Consistent Patterns**: Same patterns across all services
- **Security by Design**: Security as core requirement

---

## 📖 Complete Navigation

### API Design Standards

- **[🎯 Maturity Assessment](guides/api-design/maturity-model/)** - Richardson Maturity Model framework
- **[🏗️ Foundations](guides/api-design/foundations/)** - API versioning, resource naming, URL structure
- **[🔄 Request/Response](guides/api-design/request-response/)** - Content types, errors (RFC 7807), pagination, streaming
- **[🔐 Security](guides/api-design/security/)** - Authentication, authorization, API protection
- **[🚀 Advanced Patterns](guides/api-design/advanced-patterns/)** - Event-driven, reactive, streaming architectures
- **[📚 Documentation](guides/api-design/documentation/)** - OpenAPI standards, tools, testing

### Spring Implementation

- **[🏗️ Project Structure](languages/spring/project-structure/)** - DDD package organization, imperative/reactive examples
- **[🎯 Architecture](languages/spring/architecture/)** - Dependency injection, component management
- **[🎮 Controllers](languages/spring/controllers/)** - MVC/WebFlux patterns, request mapping, testing
- **[⚠️ Error Handling](languages/spring/error-handling/)** - Exception hierarchy, RFC 7807, validation
- **[🔐 Security](languages/spring/security/)** - OAuth 2.1, authorization, CORS, rate limiting
- **[⚙️ Configuration](languages/spring/configuration/)** - Profiles, database, external services, observability
- **[📊 Observability](languages/spring/observability/)** - Logging, monitoring, metrics
- **[🧪 Testing](languages/spring/testing/)** - Unit, integration, and specialized testing patterns

---

## Technology Stack

**API Standards**: HTTP/REST, OpenAPI 3.1+, OAuth 2.1/OIDC, RFC 7807, JSON Schema

**Spring**: Spring Boot 3.x, WebFlux, Spring Security, Micrometer, springdoc-openapi v2, Spring Cloud Contract

---

## Repository Structure

```
software-design-docs/
├── guides/                    # Language-agnostic design theory
│   └── api-design/            # REST/HTTP design standards and patterns
├── languages/                 # Language-specific implementations
│   └── spring/                # Spring Boot reference implementation
├── examples/                  # Format-agnostic examples (JSON, YAML, etc.)
├── _reference/                # Work-in-progress and reference materials
└── scripts/                   # Utility scripts for documentation maintenance
```

---

## Contributing

When adding new content:
- **Theory**: Add to `guides/` with language-agnostic principles
- **Implementation**: Add to `languages/[framework]/` with specific technology details
- **Examples**: Use standard formats (JSON, YAML) in the `examples/` directory
- **Readability**: Follow reading level guidelines (see `scripts/READING_LEVEL_GUIDELINES.md`)

