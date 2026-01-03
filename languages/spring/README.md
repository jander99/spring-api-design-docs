# Spring Boot API Implementation Guide

This section provides **Spring Boot-specific implementation patterns** for the language-agnostic API design standards defined in `/guides/api-design/`.

## 🎯 Purpose

Each guide in this section:
- Implements language-agnostic principles from `/guides/api-design/`
- Provides Spring Boot code examples and configurations
- Covers both imperative (Spring MVC) and reactive (WebFlux) approaches
- Includes testing strategies and best practices

## 📚 Guide Structure

### 🏗️ [Architecture](architecture/)
**Dependency injection and component management**
- Dependency injection patterns
- Component lifecycle management
- Bean configuration best practices

### ⚙️ [Configuration](configuration/)
**Application configuration and profile management**
- Configuration principles and @ConfigurationProperties
- Environment profiles (dev, test, prod)
- Database configuration
- External service configuration
- Security configuration
- Observability configuration

### 🎮 [Controllers](controllers/)
**Web layer implementation patterns**
- Controller fundamentals
- Imperative controllers (Spring MVC)
- Reactive controllers (WebFlux)
- Request/response mapping
- Controller testing strategies

### 🚨 [Error Handling](error-handling/)
**Exception hierarchy and error response patterns**
- Exception hierarchy design
- Imperative error handling (@ExceptionHandler, @ControllerAdvice)
- Reactive error handling (WebFlux error handling)
- Error response formats (RFC 7807 Problem Details)
- Validation standards

### ✅ [Validation](validation/)
**Schema validation and data integrity**
- Schema validation with Jakarta Bean Validation
- JSON Schema validation
- Custom validators and constraint annotations
- Validation groups
- RFC 7807 integration

### 🌐 [HTTP Clients](http-clients/)
**External service communication patterns**
- RestTemplate patterns (imperative)
- WebClient patterns (reactive)
- Resilience4j integration (circuit breakers, retry, rate limiting)
- Connection pooling and timeout configuration
- HTTP client testing

### 🔒 [Security](security/)
**Authentication, authorization, and API protection**
- OAuth 2.1 resource server configuration
- Authorization patterns
- CORS and security headers
- Rate limiting and DDoS protection
- Security context propagation
- Security testing

### 📊 [Observability](observability/)
**Monitoring, logging, and metrics**
- Logging standards and structured logging
- Metrics with Micrometer
- Distributed tracing
- Health checks and readiness probes

### 📦 [Project Structure](project-structure/)
**Package organization and project layout**
- Domain-driven design package organization
- Imperative project examples
- Reactive project examples
- Testing structure

### 🧪 [Testing](testing/)
**Comprehensive testing strategies**
- **Unit Testing**: Controllers, services, repositories, domain logic, utilities
- **Integration Testing**: API integration, database integration, reactive integration, external services, security integration
- **Specialized Testing**: Contract testing, performance testing, reactive testing, infrastructure testing

## 🔄 Implementation Approach

### Dual Pattern Support

Most guides support both approaches:

| Pattern | Description | Technology |
|---------|-------------|------------|
| **Imperative** | Traditional blocking request-response | Spring MVC, RestTemplate |
| **Reactive** | Non-blocking reactive streams | Spring WebFlux, WebClient |

### When to Use Each

**Use Imperative (Spring MVC) when:**
- Simple CRUD operations
- Synchronous workflows
- Team familiarity with blocking I/O
- Integrating with blocking libraries

**Use Reactive (WebFlux) when:**
- High concurrency requirements
- Streaming data
- Backpressure handling needed
- Non-blocking I/O beneficial

## 🚀 Quick Start

### New to Spring Boot APIs?

1. Start with **[Controller Fundamentals](controllers/controller-fundamentals.md)**
2. Learn **[Error Handling](error-handling/imperative-error-handling.md)**
3. Understand **[Validation](validation/schema-validation.md)**
4. Explore **[Testing Strategies](testing/README.md)**

### Building Reactive APIs?

1. Read **[Reactive Controllers](controllers/reactive-controllers.md)**
2. Study **[Reactive Error Handling](error-handling/reactive-error-handling.md)**
3. Learn **[WebClient Patterns](http-clients/http-client-patterns.md#webclient-patterns)**
4. Practice **[Reactive Testing](testing/specialized-testing/reactive-testing.md)**

### Calling External Services?

1. Choose client: **[RestTemplate vs WebClient](http-clients/http-client-patterns.md#overview)**
2. Add resilience: **[Resilience4j Integration](http-clients/http-client-patterns.md#resilience4j-integration)**
3. Configure properly: **[Timeouts and Connection Pooling](http-clients/http-client-patterns.md#timeout-configuration)**
4. Test thoroughly: **[HTTP Client Testing](http-clients/http-client-patterns.md#testing-http-clients)**

## 🔗 Relationship to API Design Guides

Each Spring guide implements patterns from `/guides/api-design/`:

| API Design Guide | Spring Implementation |
|------------------|----------------------|
| [HTTP Fundamentals](../../guides/api-design/foundations/http-fundamentals.md) | [Controller Fundamentals](controllers/controller-fundamentals.md) |
| [Error Response Standards](../../guides/api-design/request-response/error-response-standards.md) | [Error Response Formats](error-handling/error-response-formats.md) |
| [Schema Conventions](../../guides/api-design/request-response/schema-conventions.md) | [Schema Validation](validation/schema-validation.md) |
| [HTTP Client Best Practices](../../guides/api-design/advanced-patterns/http-client-best-practices.md) | [HTTP Client Patterns](http-clients/http-client-patterns.md) |
| [Security Standards](../../guides/api-design/security/security-standards.md) | [OAuth2 Resource Server](security/oauth2-resource-server.md) |
| [API Observability](../../guides/api-design/advanced-patterns/api-observability-standards.md) | [Logging and Monitoring](observability/logging-and-monitoring.md) |

## 📖 Documentation Standards

All Spring guides follow these standards:

✅ **Code Examples**: Real, working Spring Boot code  
✅ **Both Patterns**: Imperative and reactive approaches where applicable  
✅ **Testing**: Testing strategies for all patterns  
✅ **Best Practices**: Production-ready patterns  
✅ **Anti-patterns**: Common mistakes to avoid  
✅ **Configuration**: Complete configuration examples  

## 🎓 Learning Path

### Beginner
1. Controller fundamentals
2. Basic error handling
3. Simple validation
4. Unit testing

### Intermediate
5. Reactive controllers
6. Advanced validation
7. HTTP clients with resilience
8. Integration testing

### Advanced
9. Security patterns
10. Performance optimization
11. Distributed tracing
12. Contract testing

## 🛠️ Technology Stack

**Core:**
- Spring Boot 3.x
- Spring Framework 6.x
- Java 17+

**Web:**
- Spring MVC (imperative)
- Spring WebFlux (reactive)

**Validation:**
- Jakarta Bean Validation 3.x
- JSON Schema libraries

**HTTP Clients:**
- RestTemplate
- WebClient
- Resilience4j

**Security:**
- Spring Security 6.x
- OAuth 2.1 / OpenID Connect

**Observability:**
- Micrometer
- Spring Boot Actuator
- OpenTelemetry

**Testing:**
- JUnit 5
- Mockito
- Spring Boot Test
- TestContainers
- WireMock

## 📝 Contributing

When adding new Spring guides:

1. **Reference language-agnostic guide**: Link to corresponding `/guides/api-design/` documentation
2. **Include both patterns**: Provide imperative and reactive examples where applicable
3. **Add tests**: Include comprehensive testing examples
4. **Follow structure**: Match existing guide organization
5. **Cross-reference**: Link to related Spring and API design guides

## 🔍 Finding Information

**By Topic:**
- Error handling? → [Error Handling](error-handling/)
- Validation? → [Validation](validation/)
- External calls? → [HTTP Clients](http-clients/)
- Testing? → [Testing](testing/)

**By Pattern:**
- Imperative? → Look for "Spring MVC", "RestTemplate", "@Controller"
- Reactive? → Look for "WebFlux", "WebClient", "Mono/Flux"

**By Use Case:**
- Building APIs? → [Controllers](controllers/)
- Calling APIs? → [HTTP Clients](http-clients/)
- Securing APIs? → [Security](security/)
- Testing APIs? → [Testing](testing/)

---

**[← Back to Main Documentation](../../README.md)** | **[API Design Guides →](../../guides/api-design/README.md)**
