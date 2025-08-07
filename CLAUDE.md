# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Repository Overview

This is a **documentation repository** for API design standards and Spring Boot microservices architecture. It contains comprehensive guidelines for building APIs and microservices using both imperative and reactive approaches. The repository contains only documentation files (`.md` format) and serves as architectural reference documentation.

**Important**: The API design section (`/api-design/`) is completely language-agnostic and contains no programming language-specific code examples. It focuses purely on HTTP/REST principles, patterns, and standards that apply universally to any implementation technology.

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

### API Design Standards (`/api-design/`) - Language Agnostic
Universal HTTP/REST principles with no programming language dependencies:
- **maturity-model/**: Richardson Maturity Model assessment framework for API evaluation
- **foundations/**: Core API design principles (resource naming, versioning)
- **request-response/**: HTTP patterns, error formats, pagination, streaming
- **security/**: Security standards and authentication patterns
- **advanced-patterns/**: Reactive, event-driven, and streaming architectures
- **documentation/**: OpenAPI standards, testing, and tooling

**Note**: All API design documentation uses only JSON, YAML, and HTTP examples. No programming language code is included.

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
Complete examples and setup guides:
- **Root examples/**: Cross-cutting examples (testing, CI/CD)
- **Topic-specific examples/**: Configuration and pattern examples
- **API design examples**: HTTP/JSON/YAML examples only, no code

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

### Readability Standards
All documentation must adhere to these readability caps to ensure accessibility:

#### **Grade Level Ceilings**
- **Main documentation files**: Maximum Grade 14 (college sophomore level)
- **README and overview files**: Maximum Grade 12 (high school senior level)
- **Getting started guides**: Maximum Grade 10 (high school sophomore level)
- **Reference and troubleshooting**: Maximum Grade 16 (college level acceptable for deep technical content)

#### **Flesch Reading Ease Minimums**
- **Main documentation**: Minimum 30 (Difficult but readable)
- **README and overview**: Minimum 40 (Fairly difficult but accessible)
- **Getting started guides**: Minimum 50 (Fairly easy to read)

#### **Writing Guidelines**
1. **Sentence length**: Average maximum 20 words per sentence
2. **Paragraph length**: Maximum 4 sentences per paragraph
3. **Technical density**: Maximum 3% technical terms for main docs
4. **Active voice**: Use active voice whenever possible
5. **Plain language**: Replace jargon with simpler alternatives where possible

#### **Quality Gates**
Before publishing new documentation:
1. Run reading level analysis with `node scripts/reading-level-analyzer.js file [path]`
2. Ensure grade level meets ceiling requirements
3. If above ceiling, simplify language while maintaining technical accuracy
4. Update reading guide with accurate metrics

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

- **api-design/**: Universal principles applicable to any REST framework (language-agnostic, no code)
- **spring-design/**: Specific to Spring Boot implementations with concrete Java code examples

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

# important-instruction-reminders
## Critical Guidelines for Documentation Work

### Readability Requirements (MANDATORY)
When creating or editing documentation:

1. **ALWAYS run reading level analysis**: `node scripts/reading-level-analyzer.js file [path]`
2. **Enforce grade level ceilings**:
   - Main docs: ≤ Grade 14
   - READMEs: ≤ Grade 12  
   - Getting started: ≤ Grade 10
   - Reference/troubleshooting: ≤ Grade 16
3. **Ensure Flesch scores meet minimums**:
   - Main docs: ≥ 30
   - READMEs: ≥ 40
   - Getting started: ≥ 50
4. **Add reading guides**: Include the generated reading guide at the top of every new document
5. **Quality gate**: If grade level exceeds ceiling, MUST simplify language before publishing

### Content Standards
- NEVER create files unless absolutely necessary for the task
- ALWAYS prefer editing existing files over creating new ones  
- NEVER proactively create documentation files unless explicitly requested
- Maintain language-agnostic approach in `/api-design/` (no programming code)
- Ensure Spring-specific content stays in `/spring-design/`