# API Design Guide - Gap Analysis Report

**Date**: January 2, 2026  
**Scope**: `/guides/api-design/` directory  
**Purpose**: Identify what's missing, what doesn't belong, and what needs relocation

---

## Executive Summary

**Overall Assessment**: 70-80% of content is properly scoped for language-agnostic API design.

**Critical Issues**:
- 🔴 **Implementation creep** in pagination reference docs (JavaScript/database code)
- 🔴 **Tool-specific content** in documentation sections
- 🟡 **Architectural content** mixed with API design (event-driven patterns)
- 🟢 **11 fundamental API design topics missing**

**Recommendation**: Clean up implementation code, fill critical gaps, establish scope discipline.

---

## What's Properly Scoped ✅

### Excellent Sections (Keep As-Is)

| Section | Status | Notes |
|---------|--------|-------|
| **Foundations** | ✅ Excellent | Pure REST/HTTP, no code |
| **Request-Response** | ✅ Excellent | JSON/HTTP examples only |
| **Security** | ✅ Excellent | OAuth 2.1, headers, CORS |
| **Maturity Model** | ✅ Excellent | Richardson model, HTTP examples |
| **OpenAPI Standards** | ✅ Good | Standard format, YAML examples |
| **HTTP Streaming Patterns** | ✅ Good | SSE, NDJSON, WebSocket |

---

## Critical Implementation Creep 🔴

### 1. cursor-pagination.md - SEVERE VIOLATION

**Location**: `guides/api-design/request-response/reference/pagination/cursor-pagination.md`

**Problem**: Contains 674 lines of JavaScript/database implementation code

**Evidence**:
- Lines 68-262: JavaScript implementation code
- Lines 264-338: PostgreSQL implementation code
- Lines 343-444: More JavaScript/Node.js code
- Lines 452-537: MongoDB-specific implementation
- Lines 600-672: JavaScript unit tests

**Impact**: Violates core principle of language-agnostic design

**Recommendation**:
- **KEEP**: Conceptual explanation, HTTP examples, cursor structure theory (first ~67 lines)
- **MOVE**: All implementation code to `/languages/javascript/pagination/` or `/languages/node/pagination/`
- **Alternative**: Delete code sections entirely if no JavaScript guide exists

**Urgency**: HIGH - This is the most egregious scope violation

---

### 2. Documentation-Testing.md - MODERATE VIOLATION

**Location**: `guides/api-design/documentation/Documentation-Testing.md`

**Problem**: Tool-specific commands and CI/CD configurations

**Evidence**:
- Lines 16-19: Specific tools (spectral, openapi-diff, prism)
- Lines 29-35: CI/CD YAML configuration
- Line 59: `npm install` command

**Impact**: Crosses into implementation territory

**Recommendation**:
- **KEEP**: Testing strategy concepts, what to test, why test
- **MOVE**: Tool-specific commands to `/languages/spring/testing/` or new `/guides/tooling/`
- **DELETE**: CI/CD configs (out of scope)

**Urgency**: MEDIUM

---

### 3. Documentation-Tools-and-Integration.md - MODERATE VIOLATION

**Location**: `guides/api-design/documentation/Documentation-Tools-and-Integration.md`

**Problem**: Tool selection guide with specific recommendations

**Evidence**:
- Lines 18-32: Lists specific tools (Swagger UI, Redoc, Postman, GitHub Pages, GitBook)
- Lines 42-52: YAML configuration

**Impact**: Tool comparisons aren't language-agnostic design theory

**Recommendation**:
- **KEEP**: OpenAPI integration patterns (language-agnostic)
- **MOVE**: Tool comparisons to separate guide `/guides/tooling/` (if desired)
- **DELETE**: Tool-specific configs

**Urgency**: MEDIUM

---

## Content Belonging Elsewhere 🟡

### 4. Event-Driven-Architecture.md - SCOPE CREEP

**Location**: `guides/api-design/advanced-patterns/Event-Driven-Architecture.md`

**Problem**: Architectural patterns beyond REST API design

**Content Issues**:
- Event Sourcing, CQRS, Saga patterns are architecture topics
- Mentions specific technologies (Kafka, RabbitMQ)
- Goes beyond HTTP-based API design

**Impact**: Blurs line between API design and system architecture

**Recommendation**:
- **OPTION 1**: Move to `/guides/architecture/Event-Driven-Architecture.md`
- **OPTION 2**: Reduce to HTTP-based event notification patterns only (webhooks, polling, SSE for events)
- **OPTION 3**: Keep but clearly mark as "Related Architecture Patterns" with caveat

**Urgency**: LOW - Content is valuable, just potentially misplaced

---

### 5. API-Observability-Standards.md - BORDERLINE

**Location**: `guides/api-design/advanced-patterns/API-Observability-Standards.md`

**Problem**: Mixes HTTP-based observability with infrastructure concerns

**Content Assessment**:
- ✅ Health check endpoints (HTTP-based) - KEEP
- ✅ Readiness/liveness probes (HTTP-based) - KEEP
- ⚠️ Detailed metrics, logging, tracing - MOVE

**Recommendation**:
- **KEEP**: HTTP health/readiness/liveness endpoints
- **MOVE**: Detailed metrics/logging/tracing to `/guides/observability/`
- **Alternative**: Keep all if renamed to "HTTP-Based Observability Endpoints"

**Urgency**: LOW

---

## Missing Fundamental Topics 🚨

### Priority 1 - Critical Gaps (Create Immediately)

#### 1. HTTP Fundamentals
**Missing File**: `/guides/api-design/foundations/HTTP-Fundamentals.md`

**Should Cover**:
- HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- When to use each method
- HTTP status codes comprehensive reference
- Standard HTTP headers
- Request/response lifecycle

**Why Critical**: Foundation for all REST API design

---

#### 2. Idempotency and Safety
**Missing File**: `/guides/api-design/foundations/Idempotency-and-Safety.md`

**Should Cover**:
- Idempotency guarantees by HTTP method
- Idempotency keys for POST operations
- Safe vs unsafe operations
- Retry patterns and idempotent design
- Client expectations

**Why Critical**: Core REST principle, impacts reliability

---

#### 3. Schema Design Conventions
**Missing File**: `/guides/api-design/request-response/Schema-Conventions.md`

**Should Cover**:
- JSON field naming conventions (camelCase vs snake_case)
- Date/time formats (ISO 8601)
- Null vs omission vs empty values
- Boolean representation
- Numeric precision and types
- Enum handling
- Consistent property ordering

**Why Critical**: Consistency across APIs, developer experience

---

### Priority 2 - Important Gaps (Create Soon)

#### 4. HTTP Caching Strategies
**Missing File**: `/guides/api-design/advanced-patterns/HTTP-Caching.md`

**Should Cover**:
- Cache-Control headers
- ETags and conditional requests
- Last-Modified headers
- Validation patterns (304 Not Modified)
- CDN integration patterns
- Cache invalidation strategies

---

#### 5. Content Negotiation
**Missing File**: `/guides/api-design/request-response/Content-Negotiation.md`

**Should Cover**:
- Accept headers and media type negotiation
- Language negotiation (Accept-Language)
- Encoding negotiation (Accept-Encoding)
- Custom media types
- Versioning via content negotiation

---

#### 6. Batch and Bulk Operations
**Missing File**: `/guides/api-design/advanced-patterns/Batch-Operations.md`

**Should Cover**:
- Bulk create/update/delete patterns
- Partial success handling
- Transaction boundaries in HTTP
- Error aggregation
- Response formats for bulk operations

---

#### 7. Rate Limiting and Throttling
**Missing File**: `/guides/api-design/advanced-patterns/Rate-Limiting.md`

**Should Cover**:
- Rate limit headers (X-RateLimit-*, RateLimit-* RFC draft)
- 429 response patterns with Retry-After
- Token bucket vs leaky bucket (conceptual)
- Per-endpoint vs global rate limits
- Client handling strategies

**Note**: Mentioned briefly in Security Standards but needs dedicated coverage

---

### Priority 3 - Nice to Have

#### 8. Long-Running Operations (Async Operations)
**Missing File**: `/guides/api-design/advanced-patterns/Async-Operations.md`

**Current State**: Briefly mentioned in HTTP-Streaming-Patterns.md

**Should Cover**:
- 202 Accepted pattern in depth
- Polling patterns with Location header
- Webhook callbacks
- WebSockets for status updates
- Job status endpoints

---

#### 9. Hypermedia Controls (HATEOAS)
**Missing File**: `/guides/api-design/advanced-patterns/Hypermedia-Controls.md`

**Current State**: Mentioned in maturity model Level 3, briefly in Content-Types-and-Structure.md

**Should Cover**:
- HAL, JSON:API, Collection+JSON formats
- Link relations and affordances
- Practical HATEOAS implementation patterns
- When HATEOAS makes sense vs overkill

---

#### 10. API Lifecycle Management
**Missing File**: `/guides/api-design/foundations/API-Lifecycle.md`

**Should Cover**:
- API design review processes
- Breaking change detection
- Deprecation communication strategies
- Sunset timelines and migration paths
- Versioning integration

---

#### 11. API Governance
**Missing File**: `/guides/api-design/foundations/API-Governance.md`

**Should Cover**:
- Design standards enforcement
- API review processes
- Breaking change policies
- Consistency enforcement across teams
- API catalog and discovery

---

## Scope Discipline Rules 📏

To prevent future scope creep, establish these rules:

### ✅ ALLOWED in `/guides/api-design/`

- HTTP methods, status codes, headers
- JSON, XML, YAML examples
- HTTP request/response patterns
- OpenAPI specifications
- REST/HTTP standards and RFCs
- Media types and content types
- URL structure and resource modeling
- Conceptual patterns (language-agnostic)

### ❌ NOT ALLOWED in `/guides/api-design/`

- Programming language code (Java, JavaScript, Python, Go, etc.)
- Framework-specific patterns (Spring, Express, FastAPI, etc.)
- Database queries (SQL, MongoDB, etc.)
- Infrastructure/deployment configs (Kubernetes, Docker, etc.)
- Tool-specific commands (`npm install`, `mvn`, `gradle`, etc.)
- CI/CD pipeline configurations
- Language-specific build tools
- Implementation libraries and dependencies

### ⚠️ GRAY AREA (Case-by-Case Decision)

- Tool comparisons (consider moving to separate guide)
- Architectural patterns (consider `/guides/architecture/`)
- Detailed observability (consider `/guides/observability/`)
- Testing strategies (keep conceptual, move implementation)

---

## Recommended Structure Additions

Consider creating these new guide directories:

```
guides/
├── api-design/           (current, cleaned up)
├── architecture/         (NEW - for DDD, event-driven, microservices)
├── observability/        (NEW - for detailed metrics, logging, tracing)
├── testing/              (NEW - for testing strategies across languages)
└── tooling/              (OPTIONAL - for tool comparisons)
```

---

## Action Plan Summary

### Immediate Actions (This Session)

1. ✅ Create this gap analysis document
2. 🔲 Extract code from cursor-pagination.md
3. 🔲 Clean up Documentation-Testing.md
4. 🔲 Clean up Documentation-Tools-and-Integration.md
5. 🔲 Decide on Event-Driven-Architecture.md placement

### Short-Term (Next Session)

1. 🔲 Create Priority 1 missing docs (HTTP Fundamentals, Idempotency, Schema Conventions)
2. 🔲 Review and clean API-Observability-Standards.md
3. 🔲 Establish scope discipline guidelines document

### Long-Term (Future Sessions)

1. 🔲 Create Priority 2 missing docs (Caching, Content Negotiation, Batch Ops, Rate Limiting)
2. 🔲 Create Priority 3 missing docs (Async Ops, HATEOAS, Lifecycle, Governance)
3. 🔲 Create `/guides/architecture/` for architectural patterns
4. 🔲 Create `/guides/observability/` for detailed observability content

---

## File Inventory

**Total Files**: 51 markdown files

**By Section**:
- Foundations: 3 files
- Request-Response: 11 files
- Security: 2 files
- Advanced Patterns: 9 files
- Documentation: 6 files
- Maturity Model: 8 files
- Examples: 4 files
- Reference: 4 files
- Troubleshooting: 4 files

**Scope Assessment**:
- ✅ Properly scoped: ~36 files (70%)
- ⚠️ Needs cleanup: ~10 files (20%)
- 🔴 Major violations: ~5 files (10%)

---

## Conclusion

The API design guide has a strong foundation with excellent coverage of core REST/HTTP principles. However, it suffers from:

1. **Implementation creep** (primarily in pagination reference docs)
2. **Missing fundamentals** (HTTP basics, idempotency, schema conventions)
3. **Blurred boundaries** (architecture vs API design, tooling vs standards)

**Next Steps**: Clean up scope violations, fill critical gaps, establish clear boundaries for future content.

---

**Report Generated**: January 2, 2026  
**Analyst**: Claude Code (OpenCode)  
**Status**: Ready for review and action
