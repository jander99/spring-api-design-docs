# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Repository Overview

This is a **documentation repository** organized as a multi-layered design system:

1. **Guides** (`/guides/`) - Language-agnostic theory and design principles
2. **Languages** (`/languages/`) - Technology-specific implementations (Spring, Java, etc.)
3. **Examples** (`/examples/`) - Format-agnostic examples (JSON, YAML, HTTP, etc.)

The repository contains only documentation files (`.md` format) and serves as an architectural reference for building well-designed software systems and APIs.

**Core Principle**: Each concrete implementation in a language should have a corresponding abstract theory in guides. Conversely, abstract theory should have concrete implementations in language-specific sections.

## Repository Structure

```
software-design-docs/
├── guides/                         # Language-agnostic design theory
│   ├── api-design/                 # REST/HTTP design principles and standards
│   │   ├── maturity-model/         # Richardson Maturity Model framework
│   │   ├── foundations/            # HTTP fundamentals, idempotency, versioning, governance
│   │   ├── request-response/       # Content types, schemas, errors, pagination, streaming
│   │   ├── security/               # Authentication, authorization standards
│   │   ├── advanced-patterns/      # Caching, rate limiting, async, batch, hypermedia
│   │   ├── documentation/          # OpenAPI standards, testing
│   │   ├── examples/               # HTTP/JSON/YAML examples (format-agnostic)
│   │   ├── reference/              # Detailed technical specifications
│   │   └── troubleshooting/        # Common issues and solutions
│   ├── architecture/               # System architecture patterns
│   │   └── Event-Driven-Architecture.md  # CQRS, event sourcing, saga patterns
│   └── observability/              # Monitoring and operational practices
│       └── Observability-Standards.md    # Metrics, logging, tracing
├── languages/                      # Technology-specific implementations
│   └── spring/                     # Spring Boot microservices reference implementation
│       ├── architecture/           # DI patterns, component management
│       ├── project-structure/      # DDD package organization, imperative/reactive examples
│       ├── controllers/            # MVC/WebFlux patterns, request mapping
│       ├── error-handling/         # Exception hierarchy, RFC 9457
│       ├── security/               # OAuth 2.1, authorization, CORS, rate limiting
│       ├── configuration/          # Profiles, database, external services
│       ├── observability/          # Logging, monitoring, metrics
│       └── testing/                # Unit, integration, specialized testing
├── examples/                       # Format-agnostic examples
├── _archive/                       # Work-in-progress artifacts and temporary reports
├── _reference/                     # Content to review and organize later
├── scripts/                        # Utility scripts (reading level analyzer, etc.)
└── CLAUDE.md                       # This file
```

## Core Principles

### Three-Layer Architecture

1. **Guide Layer** (`/guides/api-design/`)
   - Language and framework agnostic
   - Pure design principles and theory
   - Uses HTTP, JSON, YAML examples only (no programming code)
   - Applicable to any technology stack

2. **Language Layer** (`/languages/spring/`)
   - Spring Boot specific
   - Concrete implementations of guide theory
   - Java code examples and patterns
   - Must have analogous topic in guide layer

3. **Example Layer** (`/examples/`)
   - Format-agnostic (JSON, YAML, HTTP, TOML, XML, etc.)
   - Practical demonstrations
   - Can reference both theory and implementations

### Content Relationship Rules

- **Every Spring pattern** should have an abstract analog in API design guides
- **Every API design theory** should have a Spring implementation example
- **If a topic exists only in Spring**, create the abstract theory version in guides
- **If a theory exists without implementation**, create the Spring-specific version

## Guide Standards

### API Design Standards (`/guides/api-design/`)

Universal HTTP/REST principles with no programming language dependencies:

- **maturity-model/**: Richardson Maturity Model assessment framework
- **foundations/**: HTTP fundamentals, idempotency, versioning, lifecycle, governance
- **request-response/**: Content types, schemas, errors, pagination, filtering, streaming, negotiation
- **security/**: Security standards, authentication, authorization
- **advanced-patterns/**: Caching, rate limiting, batch operations, async operations, hypermedia, streaming
- **documentation/**: OpenAPI standards, testing

**Important Note**: All API design documentation uses only JSON, YAML, and HTTP examples. No programming code is included.

### Architecture Standards (`/guides/architecture/`)

System architecture patterns that go beyond HTTP/REST APIs:

- **Event-Driven-Architecture.md**: Event sourcing, CQRS, saga patterns, message broker architectures

### Observability Standards (`/guides/observability/`)

Comprehensive observability practices for production systems:

- **Observability-Standards.md**: Three pillars (metrics, logs, traces), distributed tracing, correlation, SLOs

## Spring Implementation Standards (`/languages/spring/`)

Spring Boot-specific patterns organized into:

- **architecture/**: Dependency injection and component management
- **project-structure/**: DDD package organization and project layout
- **controllers/**: Web layer patterns for MVC and WebFlux
- **error-handling/**: Exception hierarchy and RFC 9457 implementation
- **security/**: OAuth 2.1, authorization, CORS, rate limiting
- **configuration/**: Application config, profiles, database, external services
- **observability/**: Logging, monitoring, and operational patterns
- **testing/**: Unit, integration, and specialized testing patterns

### Spring Dual-Implementation Support

Spring documentation supports both patterns:
- **Imperative**: Spring MVC traditional request-response
- **Reactive**: Spring WebFlux non-blocking streams

Each pattern includes:
- Project structure examples
- Controller implementation examples
- Testing strategies
- Error handling approaches

## Supporting Directories

### Examples (`/examples/`)

Format-agnostic examples using standard data/configuration formats:
- JSON for data structures
- YAML for configuration
- HTTP requests/responses
- Other standard formats (TOML, XML, etc.)

These examples apply across languages and frameworks.

### Reference & Troubleshooting

Located within each section:
- `/guides/api-design/reference/`: Detailed API design specifications
- `/guides/api-design/troubleshooting/`: Common API design issues
- `/languages/spring/reference/`: Spring-specific technical details
- `/languages/spring/troubleshooting/`: Spring-specific issues

### Archive (`/_archive/`)

Work-in-progress and temporary artifacts:
- Analysis reports
- Reading level assessments
- TODO lists and tracking files

### Review Later (`/_reference/`)

Content that needs future organization:
- Examples and reference materials to integrate
- Materials from early stages of content creation

## Readability Standards

All documentation must follow these readability limits for accessibility:

### Grade Level Ceilings
- **Main documentation files**: Maximum Grade 14 (college sophomore level)
- **README and overview files**: Maximum Grade 12 (high school senior level)
- **Getting started guides**: Maximum Grade 10 (high school sophomore level)
- **Reference and troubleshooting**: Maximum Grade 16 (acceptable for deep technical content)

### Flesch Reading Ease Minimums
- **Main documentation**: Minimum 30 (Difficult but readable)
- **README and overview**: Minimum 40 (Fairly difficult but accessible)
- **Getting started guides**: Minimum 50 (Fairly easy to read)

### Writing Guidelines
1. **Sentence length**: Average maximum 20 words per sentence
2. **Paragraph length**: Maximum 4 sentences per paragraph
3. **Technical density**: Maximum 3% technical terms for main docs
4. **Active voice**: Use active voice when possible
5. **Plain language**: Replace jargon with simpler words when possible

### Quality Gates
Before publishing new documentation:
1. Run: `node scripts/reading-level-analyzer.js file [path]`
2. Check grade level meets ceiling requirements
3. If above ceiling, simplify language while keeping technical accuracy
4. Include reading guide metrics in your documentation

## Richardson Maturity Model Integration

The repository includes a **Richardson Maturity Model (RMM) assessment framework** at `/guides/api-design/maturity-model/`:

- **Level Assessment**: 5-minute survey to find current API maturity
- **Level-specific Documentation**: Detailed guides for each RMM level (0-3)
- **Migration Paths**: Step-by-step instructions for moving between levels
- **"You Are Here" Navigation**: Clear identification of current state and next steps

### RMM Levels
- **Level 0**: Single endpoint, RPC-style → Transition to resources
- **Level 1**: Multiple resources → Add HTTP verbs
- **Level 2**: HTTP verbs (Industry standard) → Add hypermedia (optional)
- **Level 3**: HATEOAS/Hypermedia controls → True REST implementation

When working with API design topics, consider the user's likely maturity level and reference the right RMM documentation.

## Technology Stack

**API Standards**: HTTP/REST, OpenAPI 3.1+, OAuth 2.1/OIDC, RFC 9457, JSON Schema

**Spring**: Spring Boot 3.x, WebFlux, Spring Security, Micrometer, springdoc-openapi v2, Spring Cloud Contract

## Maintenance Guidelines

**IMPORTANT**: After making large changes to the repository structure or content, **always update this CLAUDE.md file** to preserve context. This ensures:

1. **Accurate Context**: Claude has current information about repository structure
2. **Proper Navigation**: New directories and concepts are documented properly
3. **Consistent Guidance**: Documentation philosophy stays aligned
4. **Complete Coverage**: All major features and frameworks are included

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
5. **Quality gate assessment**: If grade level exceeds ceiling, determine if the issue is:
   - **Structural complexity** (code blocks, tables, technical formats): Accept as-is if >80% code/structured content
   - **Linguistic complexity** (sentence structure, jargon): MUST simplify language before publishing

### Content Standards
- NEVER create files unless absolutely necessary for the task
- ALWAYS prefer editing existing files over creating new ones  
- NEVER proactively create documentation files unless explicitly requested
- Maintain language-agnostic approach in `/api-design/` (no programming code)
- Ensure Spring-specific content stays in `/spring-design/`