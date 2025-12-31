# API Design Standards

> **Reading Guide**
> 
> **Reading Time:** 3 minutes | **Level:** Beginner
> 
> **What You'll Learn:** How to navigate API design documentation
> **Who This Is For:** Anyone building or consuming REST APIs

## Overview

This section contains language-agnostic API design standards. The patterns here work with any programming language or framework. You won't find code here - just HTTP, JSON, and YAML examples.

For Spring Boot implementation details, see [Spring Design](/spring-design/).

## When to Use This Section

Use this documentation when you need to:

- Design new REST API endpoints
- Understand HTTP methods and status codes
- Handle errors consistently
- Implement pagination or filtering
- Version your APIs
- Add security to your APIs
- Build streaming or real-time APIs

## Quick Navigation

### Getting Started

| If you want to... | Start here |
|-------------------|------------|
| Assess your API maturity | [Richardson Maturity Model](maturity-model/README.md) |
| Name resources and URLs | [Resource Naming](foundations/resource-naming-and-url-structure.md) |
| Version your API | [API Version Strategy](foundations/api-version-strategy.md) |

### Core Topics

| Topic | Description |
|-------|-------------|
| [Foundations](foundations/README.md) | Resource naming, URL structure, versioning |
| [Request/Response](request-response/README.md) | Content types, errors, pagination, streaming |
| [Security](security/README.md) | Authentication, authorization, protection |
| [Advanced Patterns](advanced-patterns/README.md) | Reactive, event-driven, observability |
| [Documentation](documentation/README.md) | OpenAPI standards, testing, tooling |

### Assessment & Planning

| Resource | Purpose |
|----------|---------|
| [Maturity Model](maturity-model/README.md) | Assess and improve your API design |
| [Assessment Guide](maturity-model/assessment-guide.md) | 5-minute API evaluation |

### Quick Reference

| Resource | Purpose |
|----------|---------|
| [Topic Index](INDEX.md) | A-Z index of all patterns and concepts |
| [HTTP Methods](quick-reference/http-methods.md) | Method quick reference card |
| [Status Codes](quick-reference/status-codes.md) | Status code quick reference card |
| [Headers](quick-reference/headers.md) | Common API headers reference |

## Directory Structure

```
api-design/
├── foundations/          # Core principles (naming, versioning)
├── request-response/     # HTTP patterns (errors, pagination)
│   ├── examples/         # Complete examples
│   ├── reference/        # Detailed specifications
│   └── troubleshooting/  # Common problems
├── security/             # Auth and protection standards
├── advanced-patterns/    # Reactive, streaming, observability
├── documentation/        # OpenAPI and testing standards
├── maturity-model/       # Richardson Maturity Model guides
└── examples/             # Cross-cutting examples
```

## Key Principles

1. **Resources as Nouns**: URLs represent things, not actions
2. **HTTP Verbs for Actions**: GET reads, POST creates, PUT replaces, DELETE removes
3. **Consistent Patterns**: Same structure across all endpoints
4. **Clear Errors**: RFC 9457 Problem Details format
5. **Security First**: OAuth 2.1 and proper authorization

## Common Patterns Quick Reference

### URL Structure
```
GET  /v1/orders              # List orders
GET  /v1/orders/{id}         # Get one order
POST /v1/orders              # Create order
PUT  /v1/orders/{id}         # Replace order
DELETE /v1/orders/{id}       # Delete order
```

### Error Response (RFC 9457)
```json
{
  "type": "https://api.example.com/problems/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Order with ID 123 was not found"
}
```

### Pagination
```
GET /v1/orders?page=0&size=20
```

## Related Documentation

- [Spring Design Standards](/spring-design/) - Spring Boot implementation
- [Skills Directory](/skills/) - AI agent skills for API development
- [Examples](/examples/) - Testing and CI/CD examples

## Contributing

When adding to this section:
- Keep content language-agnostic (no programming code)
- Use HTTP, JSON, and YAML examples only
- Follow the reading level guidelines in [CLAUDE.md](/CLAUDE.md)
- READMEs should be Grade 12 or below
