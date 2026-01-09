# API Design Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 3 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** Authentication, Security, Data
> 
> **📊 Complexity:** 9.7 grade level • 2.5% technical density • fairly difficult

## Who Should Use This Guide?

Do you build REST APIs? This guide is for you.

**You will learn:**
- How to build APIs for any language
- HTTP and JSON standards
- How to make APIs work the same way each time
- How to handle errors
- How to add security

## What You'll Find Here

These guides teach REST API design. 

We show you:
- HTTP examples
- JSON examples  
- YAML examples

We don't show code. This works for all languages.

**Want code?** Go to our [Spring guides](../../languages/spring/). See Java examples there.

## Start Here

**New to APIs?** 

Start with [Foundations](foundations/README.md). You will learn:
- HTTP basics
- How to name resources

**Have an API?** 

Use the [Maturity Model](maturity-model/README.md) to check its quality.

## Learn by Topic

### [Foundations](foundations/README.md)
Start here. Learn HTTP and REST basics.

- **[HTTP Fundamentals](foundations/http-fundamentals.md)** - Methods, status codes, headers
- **[Resource Naming](foundations/resource-naming-and-url-structure.md)** - Design clean URLs
- **[Versioning Strategy](foundations/api-version-strategy.md)** - Plan for changes
- **[API Lifecycle](foundations/api-lifecycle.md)** - Manage deprecation
- **[Idempotency & Safety](foundations/idempotency-and-safety.md)** - Build safe retries
- **[Governance](foundations/api-governance.md)** - Review and enforce rules

### [Request-Response](request-response/README.md)
Format data and errors.

- **[Content Types](request-response/content-types-and-structure.md)** - Structure JSON data
- **[Content Negotiation](request-response/content-negotiation.md)** - Support many formats
- **[Error Standards](request-response/error-response-standards.md)** - Use RFC 9457
- **[Pagination & Filtering](request-response/pagination-and-filtering.md)** - Handle large data
- **[Schema Conventions](request-response/schema-conventions.md)** - Name fields well
- **[Streaming APIs](request-response/streaming-apis.md)** - Stream with SSE and NDJSON

### [Security](security/README.md)
Protect your APIs.

- **[Security Standards](security/security-standards.md)** - Use OAuth 2.1 (draft), JWT, CORS, rate limiting

### [Advanced Patterns](advanced-patterns/README.md)
Go beyond basic operations.

- **[Async Operations](advanced-patterns/async-operations.md)** - Run long tasks in the background
- **[Batch Operations](advanced-patterns/batch-operations.md)** - Process many items at once
- **[HTTP Caching](advanced-patterns/http-caching.md)** - Speed up responses
- **[Rate Limiting](advanced-patterns/rate-limiting.md)** - Prevent abuse
- **[Streaming Patterns](advanced-patterns/http-streaming-patterns.md)** - Send real-time updates
- **[Hypermedia Controls](advanced-patterns/hypermedia-controls.md)** - Build self-describing APIs

### [Documentation](documentation/README.md)
Write and test your docs.

- **[OpenAPI Standards](documentation/openapi-standards.md)** - Write OpenAPI 3.1 specs
- **[Documentation Testing](documentation/documentation-testing.md)** - Validate docs
- **[Tools & Integration](documentation/documentation-tools-and-integration.md)** - Use Swagger UI, Redoc

### [Maturity Model](maturity-model/README.md)
Check and improve API quality.

- **[Assessment Guide](maturity-model/assessment-guide.md)** - Take a 5-minute test
- **[Level 0](maturity-model/level-0/)** - Single endpoint
- **[Level 1](maturity-model/level-1/)** - Many resources
- **[Level 2](maturity-model/level-2/)** - HTTP verbs (standard)
- **[Level 3](maturity-model/level-3/)** - Full hypermedia

## More Resources

### Examples
- [Streaming Examples](examples/streaming/) - See SSE, NDJSON, bulk processing
- [Versioning Examples](examples/versioning/) - See migration patterns

### Reference
- [Streaming Reference](reference/streaming/) - SSE spec, NDJSON spec, flow control
- [Versioning Reference](reference/versioning/) - Deprecation policies

### Troubleshooting
- [Streaming Issues](troubleshooting/streaming/) - Fix common issues
- [Versioning Issues](troubleshooting/versioning/) - Fix migration problems

## Key Standards

We follow these standards:

- **Errors:** RFC 9457 - [Error Standards](request-response/error-response-standards.md)
- **Deprecation:** RFC 8594 - [API Lifecycle](foundations/api-lifecycle.md)
- **Caching:** RFC 7234 - [HTTP Caching](advanced-patterns/http-caching.md)
- **Security:** OAuth 2.1 (draft), JWT - [Security Standards](security/security-standards.md)
- **Streaming:** SSE, NDJSON - [Streaming APIs](request-response/streaming-apis.md)

## Navigation

- [← Back to Guides](../README.md)
- [Spring Implementation →](../../languages/spring/)
