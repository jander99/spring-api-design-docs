# API Design Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 2 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** REST, HTTP, API Design
> 
> **📊 Complexity:** 8.5 grade level • 2.1% technical density • easy

## Overview

This directory contains comprehensive, language-agnostic standards for designing well-structured REST APIs. These guides establish patterns, conventions, and best practices that apply to any technology stack.

All documentation uses only HTTP, JSON, and YAML examples—no programming language code. For language-specific implementations, see the [Spring implementation guides](../../languages/spring/).

## Quick Start

**New to API design?** Start with [Foundations](foundations/README.md) to learn HTTP fundamentals and resource naming conventions.

**Assessing an existing API?** Use the [Richardson Maturity Model](maturity-model/README.md) to evaluate your API's maturity level.

## Documentation Sections

### [Foundations](foundations/README.md)
Core HTTP concepts and REST principles that form the basis of all API design.

- **[HTTP Fundamentals](foundations/http-fundamentals.md)** - Methods, status codes, headers
- **[Resource Naming](foundations/resource-naming-and-url-structure.md)** - URL patterns and conventions
- **[Versioning Strategy](foundations/api-version-strategy.md)** - URI-based versioning patterns
- **[API Lifecycle](foundations/api-lifecycle.md)** - Deprecation and sunset policies
- **[Idempotency & Safety](foundations/idempotency-and-safety.md)** - Safe operations and retry patterns
- **[Governance](foundations/api-governance.md)** - Design review and enforcement

### [Request-Response](request-response/README.md)
Standards for request and response formatting, error handling, and data pagination.

- **[Content Types](request-response/content-types-and-structure.md)** - JSON structure standards
- **[Content Negotiation](request-response/content-negotiation.md)** - Accept headers and media types
- **[Error Standards](request-response/error-response-standards.md)** - RFC 7807 Problem Details
- **[Pagination & Filtering](request-response/pagination-and-filtering.md)** - Collection response patterns
- **[Schema Conventions](request-response/schema-conventions.md)** - Naming and format standards
- **[Streaming APIs](request-response/streaming-apis.md)** - SSE and NDJSON patterns

### [Security](security/README.md)
Authentication, authorization, and security header standards.

- **[Security Standards](security/security-standards.md)** - OAuth 2.1, JWT, CORS, rate limiting

### [Advanced Patterns](advanced-patterns/README.md)
Patterns for complex API scenarios beyond basic CRUD operations.

- **[Async Operations](advanced-patterns/async-operations.md)** - Long-running tasks and polling
- **[Batch Operations](advanced-patterns/batch-operations.md)** - Bulk create, update, delete
- **[HTTP Caching](advanced-patterns/http-caching.md)** - Cache-Control, ETags
- **[Rate Limiting](advanced-patterns/rate-limiting.md)** - Throttling and quota headers
- **[Streaming Patterns](advanced-patterns/http-streaming-patterns.md)** - Real-time data streaming
- **[Hypermedia Controls](advanced-patterns/hypermedia-controls.md)** - HATEOAS implementation

### [Documentation](documentation/README.md)
API documentation and OpenAPI specification standards.

- **[OpenAPI Standards](documentation/openapi-standards.md)** - OpenAPI 3.1 structure
- **[Documentation Testing](documentation/documentation-testing.md)** - Validating API docs
- **[Tools & Integration](documentation/documentation-tools-and-integration.md)** - Swagger UI, Redoc

### [Maturity Model](maturity-model/README.md)
Richardson Maturity Model assessment framework for evaluating API design quality.

- **[Assessment Guide](maturity-model/assessment-guide.md)** - 5-minute maturity assessment
- **[Level 0](maturity-model/level-0/)** - Single endpoint, RPC-style APIs
- **[Level 1](maturity-model/level-1/)** - Resource-based URIs
- **[Level 2](maturity-model/level-2/)** - HTTP verbs (industry standard)
- **[Level 3](maturity-model/level-3/)** - Hypermedia controls (HATEOAS)

## Supporting Materials

### Examples
- [Streaming Examples](examples/streaming/) - SSE, NDJSON, bulk processing
- [Versioning Examples](examples/versioning/) - Migration patterns

### Reference
- [Streaming Reference](reference/streaming/) - SSE spec, NDJSON spec, flow control
- [Versioning Reference](reference/versioning/) - Deprecation policies

### Troubleshooting
- [Streaming Issues](troubleshooting/streaming/) - Common problems and solutions
- [Versioning Issues](troubleshooting/versioning/) - Migration challenges

## Key Standards

| Topic | Standard | Reference |
|-------|----------|-----------|
| Error Format | RFC 7807 Problem Details | [Error Standards](request-response/error-response-standards.md) |
| Deprecation | RFC 8594 Sunset Header | [API Lifecycle](foundations/api-lifecycle.md) |
| Caching | RFC 7234 HTTP Caching | [HTTP Caching](advanced-patterns/http-caching.md) |
| Authentication | OAuth 2.1, JWT | [Security Standards](security/security-standards.md) |
| Streaming | SSE (W3C), NDJSON | [Streaming APIs](request-response/streaming-apis.md) |

## Navigation

- [← Back to Guides](../README.md)
- [Spring Implementation →](../../languages/spring/)
