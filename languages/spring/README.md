# Spring Boot API Implementation Guide

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 4 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** Authentication, Security, Architecture
> 
> **📊 Complexity:** 9.3 grade level • 1.7% technical density • fairly easy

This section shows **how to build APIs with Spring Boot**. It uses the design standards from `/guides/api-design/`.

## 🎯 Purpose

Each guide shows you how to:
- Use the principles from `/guides/api-design/`
- Write Spring Boot code and config files
- Build both blocking (Spring MVC) and streaming (WebFlux) APIs
- Test your code properly

## 📚 Guide Structure

### 🏗️ [Architecture](architecture/)
**How to organize your code**
- Inject dependencies between classes
- Manage component lifecycles
- Configure beans properly

### ⚙️ [Configuration](configuration/)
**Set up your application**
- Use @ConfigurationProperties
- Switch between dev, test, and prod
- Configure databases
- Connect to external services
- Set up security
- Add monitoring tools

### 🎮 [Controllers](controllers/)
**Handle web requests**
- Learn controller basics
- Build blocking controllers (Spring MVC)
- Build streaming controllers (WebFlux)
- Map requests to responses
- Test your controllers

### 🚨 [Error Handling](error-handling/)
**Handle errors properly**
- Design your error types
- Handle blocking errors (@ExceptionHandler, @ControllerAdvice)
- Handle streaming errors (WebFlux)
- Format error responses (RFC 9457)
- Validate input data

### ✅ [Validation](validation/)
**Check input data**
- Use Jakarta Bean Validation
- Use JSON Schema
- Write custom validators
- Group validations
- Connect to RFC 9457

### 🌐 [HTTP Clients](http-clients/)
**Call other services**
- Use RestTemplate (blocking)
- Use WebClient (streaming)
- Add circuit breakers and retries (Resilience4j)
- Configure connections and timeouts
- Test your HTTP calls

### 🔒 [Security](security/)
**Protect your API**
- Set up OAuth 2.1
- Control who can access what
- Configure CORS headers
- Limit request rates
- Pass security context around
- Test security features

### 📊 [Observability](observability/)
**Monitor your API**
- Write structured logs
- Track metrics with Micrometer
- Trace requests across services
- Add health checks

### 🚀 [gRPC](grpc/)
**Build high-performance internal APIs**
- Get started with Spring gRPC
- Configure servers and clients
- Handle errors with status codes
- Implement unary and streaming services
- Add security and observability
- Test gRPC services

### 📦 [Project Structure](project-structure/)
**Organize your files**
- Use domain-driven design
- See blocking examples
- See streaming examples
- Structure your tests

### 🧪 [Testing](testing/)
**Test your code**
- **Unit Testing**: Test controllers, services, data access, logic, and utilities
- **Integration Testing**: Test full APIs, databases, streaming, external calls, and security
- **Specialized Testing**: Test contracts, performance, streaming, and infrastructure

## 🔄 Two Ways to Build APIs

### Both Styles Supported

Most guides show both styles:

| Style | What It Does | Tools |
|---------|-------------|------------|
| **Blocking** | Waits for each request to finish | Spring MVC, RestTemplate |
| **Reactive** | Non-blocking, handles many concurrent requests | Spring WebFlux, WebClient |

### Pick the Right Style

**Use Blocking (Spring MVC) when:**
- You need simple create/read/update/delete
- Each step waits for the last one
- Your team knows blocking code
- Other libraries use blocking

**Use Reactive (WebFlux) when:**
- Many users connect at once
- High concurrency is required
- You need non-blocking I/O
- Backpressure and flow control matter

## 🚀 Quick Start

### New to Spring Boot APIs?

1. Start with **[Controller Basics](controllers/controller-fundamentals.md)**
2. Learn **[Error Handling](error-handling/imperative-error-handling.md)**
3. Read **[Validation](validation/schema-validation.md)**
4. Try **[Testing](testing/README.md)**

### Building Reactive APIs?

1. Read **[Reactive Controllers](controllers/reactive-controllers.md)**
2. Learn **[Reactive Error Handling](error-handling/reactive-error-handling.md)**
3. Use **[WebClient](http-clients/http-client-patterns.md#webclient-patterns)**
4. Practice **[Reactive Testing](testing/specialized-testing/reactive-testing.md)**

### Calling Other Services?

1. Pick a client: **[RestTemplate vs WebClient](http-clients/http-client-patterns.md#overview)**
2. Add safety: **[Circuit Breakers](http-clients/http-client-patterns.md#resilience4j-integration)**
3. Set limits: **[Timeouts and Pools](http-clients/http-client-patterns.md#timeout-configuration)**
4. Test it: **[Client Testing](http-clients/http-client-patterns.md#testing-http-clients)**

## 🔗 How This Connects to API Design

Each Spring guide shows you how to use patterns from `/guides/api-design/`:

| API Design Guide | Spring Guide |
|------------------|----------------------|
| [HTTP Basics](../../guides/api-design/foundations/http-fundamentals.md) | [Controller Basics](controllers/controller-fundamentals.md) |
| [Error Standards](../../guides/api-design/request-response/error-response-standards.md) | [Error Formats](error-handling/error-response-formats.md) |
| [Schema Rules](../../guides/api-design/request-response/schema-conventions.md) | [Schema Validation](validation/schema-validation.md) |
| [Client Tips](../../guides/api-design/advanced-patterns/http-client-best-practices.md) | [Client Patterns](http-clients/http-client-patterns.md) |
| [Security Rules](../../guides/api-design/security/security-standards.md) | [OAuth2 Setup](security/oauth2-resource-server.md) |
| [Monitoring](../../guides/api-design/advanced-patterns/api-observability-standards.md) | [Logging Setup](observability/logging-and-monitoring.md) |

## 📖 What You Get

All Spring guides include:

✅ **Code Examples**: Real code that works  
✅ **Both Styles**: Blocking and streaming versions  
✅ **Testing**: How to test each pattern  
✅ **Best Practices**: Patterns for production  
✅ **Mistakes to Avoid**: Common errors  
✅ **Setup**: Complete config examples  

## 🎓 Learning Path

### Beginner
1. Controller basics
2. Error handling
3. Input validation
4. Unit tests

### Intermediate
5. Streaming controllers
6. Complex validation
7. HTTP clients with safety features
8. Integration tests

### Advanced
9. Security setup
10. Speed improvements
11. Request tracing
12. Contract tests

## 🛠️ Tools We Use

**Core:**
- Spring Boot 3.x
- Spring Framework 6.x
- Java 17 or newer

**Web:**
- Spring MVC (blocking)
- Spring WebFlux (streaming)

**Validation:**
- Jakarta Bean Validation 3.x
- JSON Schema tools

**HTTP Clients:**
- RestTemplate
- WebClient
- Resilience4j

**Security:**
- Spring Security 6.x
- OAuth 2.1 and OpenID Connect

**Monitoring:**
- Micrometer
- Spring Boot Actuator
- OpenTelemetry

**Testing:**
- JUnit 5
- Mockito
- Spring Boot Test
- TestContainers
- WireMock

## 📝 Adding New Guides

When you add a new Spring guide:

1. **Link to design guide**: Connect to the matching `/guides/api-design/` doc
2. **Show both styles**: Give blocking and streaming examples
3. **Add tests**: Show how to test it
4. **Match the format**: Use the same structure as other guides
5. **Link related guides**: Point to other helpful docs

## 🔍 Find What You Need

**By Topic:**
- Handle errors? → [Error Handling](error-handling/)
- Check inputs? → [Validation](validation/)
- Call other services? → [HTTP Clients](http-clients/)
- Write tests? → [Testing](testing/)

**By Style:**
- Blocking code? → Look for "Spring MVC", "RestTemplate", "@Controller"
- Streaming code? → Look for "WebFlux", "WebClient", "Mono/Flux"

**By Task:**
- Build APIs? → [Controllers](controllers/)
- Call APIs? → [HTTP Clients](http-clients/)
- Secure APIs? → [Security](security/)
- Test APIs? → [Testing](testing/)

---

**[← Back to Main Documentation](../../README.md)** | **[API Design Guides →](../../guides/api-design/README.md)**
