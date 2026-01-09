# API Design Guide

A comprehensive, language-agnostic guide to designing REST APIs. Learn the theory once, implement in any language.

## Why This Guide?

Most API documentation mixes theory with framework-specific code. This makes it hard to:
- Learn principles that transfer across technologies
- Find the right pattern for your stack
- Onboard teams using different languages

**This guide separates concerns:**
- **Theory** → Universal HTTP/REST principles (works everywhere)
- **Implementation** → Language-specific examples (currently Spring, more coming)

## 📚 What's Inside

### **Design Guides** (Language-Agnostic Theory)

The `guides/` directory contains principles that apply to any technology:

- **[API Design](guides/api-design/)** - REST/HTTP design principles and standards
  - Maturity Model assessment, foundations, request/response, security, advanced patterns, documentation
- **[Architecture](guides/architecture/)** - System architecture patterns
  - Event-driven architecture, CQRS, event sourcing, saga patterns
- **[Observability](guides/observability/)** - Monitoring and operational standards
  - Metrics, logging, tracing, correlation IDs, SLOs

### **Language Implementations**

The `languages/` directory contains framework-specific implementations:

| Language | Framework | Status |
|----------|-----------|--------|
| Java | [Spring Boot](languages/spring/) | ✅ Complete |
| Node.js | Express/Fastify | 🔜 Planned |
| Python | FastAPI/Flask | 🔜 Planned |
| Go | Standard library | 🔜 Planned |

### **Examples** (Format-Agnostic)

The `examples/` directory contains HTTP, JSON, and YAML examples that work with any stack.

---

## 🎯 Richardson Maturity Model - Find Your API's Level

Assess your API's maturity and get a personalized improvement roadmap:

<div align="center">

| 📍 **Where is Your API?** | 🚀 **Quick Assessment** |
|---------------------------|-------------------------|
| [**Level 0** - Single endpoint, RPC-style](guides/api-design/maturity-model/level-0/) | [Take 5-minute assessment](guides/api-design/maturity-model/assessment-guide.md) |
| [**Level 1** - Multiple resources](guides/api-design/maturity-model/level-1/) | [View maturity levels](guides/api-design/maturity-model/) |
| [**Level 2** - HTTP verbs (Industry Standard)](guides/api-design/maturity-model/level-2/) | [See improvement paths](guides/api-design/maturity-model/#quick-assessment) |
| [**Level 3** - HATEOAS/Hypermedia](guides/api-design/maturity-model/level-3/) | [Check best practices](guides/api-design/maturity-model/level-3/best-practices.md) |

</div>

Most modern APIs are at Level 2, and that's perfectly fine! Use our guide to understand where you are and decide if moving up makes sense for your use case.

---

## 🚀 Quick Start

### Learn API Design (Any Language)

1. **Assess Your API**: [Richardson Maturity Model assessment](guides/api-design/maturity-model/assessment-guide.md) (5 minutes)
2. **Learn Foundations**: [API versioning, resource naming, URL structure](guides/api-design/foundations/)
3. **Request/Response Patterns**: [Content types, errors (RFC 9457), pagination, streaming](guides/api-design/request-response/)
4. **Security**: [Authentication and authorization standards](guides/api-design/security/)
5. **Advanced Patterns**: [Event-driven, reactive, streaming](guides/api-design/advanced-patterns/)

### Implement in Your Stack

<details>
<summary><strong>Spring Boot (Java)</strong></summary>

1. [Project Structure](languages/spring/project-structure/) - DDD package organization
2. [Controllers](languages/spring/controllers/) - MVC/WebFlux patterns
3. [Error Handling](languages/spring/error-handling/) - RFC 9457 implementation
4. [Security](languages/spring/security/) - OAuth 2.1, authorization
5. [Testing](languages/spring/testing/) - Unit, integration, specialized tests
6. [Configuration](languages/spring/configuration/) - Profiles, observability

</details>

<details>
<summary><strong>Other Languages</strong> (Coming Soon)</summary>

We're working on implementations for:
- **Node.js** - Express, Fastify
- **Python** - FastAPI, Flask
- **Go** - Standard library, Gin

Want to contribute? See [Contributing](#contributing).

</details>

---

## 🏗️ Core Principles

- **API-First Design**: Define clear contracts before implementation
- **Domain-Driven Design**: Code organized around business domains
- **Hexagonal Architecture**: Separate domain logic from external concerns
- **Consistent Patterns**: Same patterns across all services
- **Security by Design**: Security as core requirement

---

## 📖 Full Navigation

### API Design (Theory)

| Section | What You'll Learn |
|---------|-------------------|
| [🎯 Maturity Model](guides/api-design/maturity-model/) | Assess your API's REST maturity level |
| [🏗️ Foundations](guides/api-design/foundations/) | HTTP fundamentals, versioning, resource naming |
| [🔄 Request/Response](guides/api-design/request-response/) | Content types, errors (RFC 9457), pagination |
| [🔐 Security](guides/api-design/security/) | OAuth 2.1, JWT, authorization patterns |
| [🚀 Advanced Patterns](guides/api-design/advanced-patterns/) | Caching, rate limiting, async, streaming |
| [📚 Documentation](guides/api-design/documentation/) | OpenAPI standards, testing |
| [🧪 Testing](guides/api-design/testing/) | Schema testing, client testing |

### Spring Implementation

| Section | What You'll Learn |
|---------|-------------------|
| [🏗️ Project Structure](languages/spring/project-structure/) | DDD packages, MVC vs WebFlux |
| [🎮 Controllers](languages/spring/controllers/) | Request mapping, validation |
| [⚠️ Error Handling](languages/spring/error-handling/) | Exception hierarchy, RFC 9457 |
| [🔐 Security](languages/spring/security/) | OAuth 2.1, CORS, rate limiting |
| [🧪 Testing](languages/spring/testing/) | Unit, integration, contract tests |
| [⚙️ Configuration](languages/spring/configuration/) | Profiles, observability |

---

## Standards Used

**API Standards**: HTTP/REST, OpenAPI 3.1+, OAuth 2.1 (draft)/OIDC, RFC 9457, JSON Schema

---

## Repository Structure

```
api-design-guide/
├── guides/                    # Language-agnostic design theory
│   ├── api-design/            # REST/HTTP standards (71 documents)
│   ├── architecture/          # System architecture patterns
│   └── observability/         # Monitoring standards
├── languages/                 # Framework-specific implementations
│   └── spring/                # Spring Boot (complete)
├── examples/                  # HTTP, JSON, YAML examples
└── scripts/                   # Documentation utilities
```

---

## Contributing

We welcome contributions! Here's how:

### Add API Design Theory
Add to `guides/` using only HTTP, JSON, and YAML examples. No programming code.

### Add Language Implementation
Create `languages/[your-framework]/` following the Spring structure as a template.

### Guidelines
- **Readability**: Max Grade 14 reading level (run `node scripts/reading-level-analyzer.js`)
- **Cross-references**: Link theory ↔ implementation where applicable
- **Examples**: Use real-world scenarios, not foo/bar

