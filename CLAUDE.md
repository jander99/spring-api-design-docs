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
- **maturity-model/**: Richardson Maturity Model assessment framework for API evaluation
- **foundations/**: Core API design principles (resource naming, versioning)
- **request-response/**: HTTP patterns, error formats, pagination, streaming
- **security/**: Security standards and authentication patterns
- **advanced-patterns/**: Reactive, event-driven, and streaming architectures
- **documentation/**: OpenAPI standards, testing, and tooling

### Spring Implementation Standards (`/spring-design/`)
Spring Boot-specific patterns organized into:
- **architecture/**: Architectural patterns and dependency injection
- **project-structure/**: Package organization and DDD patterns
- **controllers/**: Web layer patterns for MVC and WebFlux
- **error-handling/**: Exception management and RFC 7807 implementation
- **security/**: OAuth 2.1, authorization, and security headers
- **configuration/**: Application config, profiles, and observability
- **testing/**: Unit, integration, and specialized testing (organized by type)
- **observability/**: Logging, monitoring, and operational patterns

### Modular Supporting Structure
The documentation uses a modular approach with supporting directories:

#### **Examples Directories** (`/examples/`, `/*/examples/`)
Complete implementation examples and setup guides:
- **Root examples/**: Cross-cutting examples (testing, CI/CD)
- **Topic-specific examples/**: Detailed code implementations for specific areas
- **Framework integration**: Real-world usage patterns and configurations

#### **Reference Directories** (`/reference/`, `/*/reference/`)
Comprehensive technical specifications and comparisons:
- **Tool comparisons**: Feature matrices and selection criteria
- **Detailed specifications**: Complete technical references
- **Advanced patterns**: Complex implementation details

#### **Troubleshooting Directories** (`/troubleshooting/`, `/*/troubleshooting/`)
Common issues, solutions, and debugging guides:
- **Problem-solution pairs**: Specific issues with actionable solutions
- **Debugging strategies**: Systematic approaches to problem-solving
- **Prevention techniques**: Best practices to avoid common pitfalls

### Documentation Philosophy
- **Main files**: Concise, scannable content at high school reading level
- **Supporting files**: Detailed implementations for different skill levels
- **Progressive disclosure**: Core concepts accessible, depth available on demand
- **Modular maintenance**: Easy to update specific sections without affecting core docs

## Technology Stack

**API Standards**: HTTP/REST, OpenAPI 3.1+, OAuth 2.1/OIDC, RFC 7807, JSON Schema
**Spring Stack**: Spring Boot 3.x, WebFlux, Spring Security, Micrometer, springdoc-openapi v2

## Richardson Maturity Model Integration

The repository includes a comprehensive **Richardson Maturity Model (RMM) assessment framework** to help developers understand their API's REST maturity level:

### Assessment Framework (`/api-design/maturity-model/`)
- **Level Assessment**: 5-minute questionnaire to determine current API maturity
- **Level-specific Documentation**: Detailed guides for each RMM level (0-3)
- **Migration Paths**: Step-by-step instructions for progressing between levels
- **"You Are Here" Navigation**: Clear identification of current state and next steps

### RMM Integration Points
- **Level 0**: Single endpoint, RPC-style → Transition to resources
- **Level 1**: Multiple resources → Add HTTP verbs
- **Level 2**: HTTP verbs (Industry standard) → Add hypermedia (optional)
- **Level 3**: HATEOAS/Hypermedia controls → True REST implementation

When working with API design topics, consider the user's likely maturity level and reference appropriate RMM documentation.

## Important Distinction

- **api-design/**: Universal principles applicable to any REST framework
- **spring-design/**: Specific to Spring Boot implementations with concrete code examples

## Maintenance Guidelines

**IMPORTANT**: After making large changes or additions to the repository structure or content, **always reevaluate and update this CLAUDE.md file** to preserve context. This ensures:

1. **Accurate Context**: Claude has current information about repository structure
2. **Proper Navigation**: New directories and concepts are properly documented
3. **Consistent Guidance**: Documentation philosophy remains aligned
4. **Complete Coverage**: All major features and frameworks are represented

### When to Update CLAUDE.md:
- ✅ Adding new major directories or documentation sections
- ✅ Implementing new frameworks or assessment tools
- ✅ Restructuring existing documentation
- ✅ Adding new architectural patterns or principles
- ✅ Major content reorganization or modularization

### Quick Update Checklist:
- [ ] Document new directory structure
- [ ] Explain new concepts or frameworks
- [ ] Update navigation guidance
- [ ] Maintain documentation philosophy consistency
- [ ] Add any new architectural principles or standards