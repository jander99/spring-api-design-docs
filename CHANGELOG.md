# Changelog

All notable changes to the Software Design Documentation repository.

## [2.0.0] - 2026-01-02

### Major Repository Reorganization

This release represents a complete restructuring of the repository from a Spring-specific API design guide to a comprehensive, multi-layered software design documentation system.

### Added

#### New Repository Structure
- **`/guides/`** - Language-agnostic design theory and principles
  - `api-design/` - REST/HTTP design standards (existing content reorganized)
  - `architecture/` - System architecture patterns (NEW)
  - `observability/` - Monitoring and operational practices (NEW)

- **`/languages/`** - Technology-specific implementations
  - `spring/` - Spring Boot reference implementation (moved from `/spring-design/`)

- **`/_archive/`** - Work-in-progress artifacts and analysis reports
- **`/_reference/`** - Content staged for future organization

#### New API Design Guides (11 comprehensive guides added)

**Priority 1 - Fundamentals:**
1. `HTTP-Fundamentals.md` - HTTP methods, status codes, headers, request/response lifecycle
2. `Idempotency-and-Safety.md` - Idempotency keys, safe operations, retry patterns
3. `Schema-Conventions.md` - JSON field naming, date formats, null handling, enums

**Priority 2 - Advanced Patterns:**
4. `HTTP-Caching.md` - Cache-Control, ETags, conditional requests, CDN integration
5. `Content-Negotiation.md` - Accept headers, media types, language/encoding negotiation
6. `Batch-Operations.md` - Bulk CRUD operations, partial success handling
7. `Rate-Limiting.md` - 429 responses, RateLimit headers, token bucket patterns

**Priority 3 - Lifecycle & Design:**
8. `Async-Operations.md` - 202 Accepted pattern, polling, webhooks, WebSocket updates
9. `Hypermedia-Controls.md` - HAL, JSON:API, HATEOAS, link relations
10. `API-Lifecycle.md` - Deprecation strategies, Sunset header (RFC 8594)
11. `API-Governance.md` - Design standards enforcement, review processes

#### New Architectural Documentation
- `guides/architecture/Event-Driven-Architecture.md` - Event sourcing, CQRS, saga patterns, message brokers
- `guides/observability/Observability-Standards.md` - Three pillars (metrics, logs, traces), distributed tracing, SLOs

#### Analysis & Planning Documents
- `_archive/API-DESIGN-GAP-ANALYSIS.md` - Comprehensive gap analysis identifying missing content
- `_archive/PHASE-3-VERIFICATION.md` - Verification report for all changes
- `_archive/PROGRESSIVE-LOADING-STRATEGY.md` - Token count analysis and loading strategies

### Changed

#### Scope Violations Cleaned
- **cursor-pagination.md** - Removed 498 lines of JavaScript/PostgreSQL/MongoDB implementation code
- **Documentation-Testing.md** - Removed tool-specific commands and CI/CD configurations
- **Documentation-Tools-and-Integration.md** - Removed tool comparisons, kept OpenAPI integration patterns

#### Content Split & Reorganized
- **Event-Driven-Architecture.md** - Split into:
  - HTTP-based event patterns (webhooks, SSE, polling) - stays in `api-design/`
  - Architectural patterns (CQRS, event sourcing, sagas) - moved to `guides/architecture/`

- **API-Observability-Standards.md** - Split into:
  - HTTP observability endpoints (health checks) - stays in `api-design/`
  - Detailed observability practices - moved to `guides/observability/`

#### Documentation Updates
- Updated all section READMEs to reference new content
- Created `guides/architecture/README.md` (minimal)
- Created `guides/observability/README.md` (minimal)
- Updated root `README.md` with new guide sections
- Updated `CLAUDE.md` with complete structure documentation

### Removed

#### File Relocations
- Moved `/api-design/` → `/guides/api-design/`
- Moved `/spring-design/` → `/languages/spring/`
- Moved analysis reports → `_archive/`
- Moved testing examples/reference/troubleshooting → `_reference/`

### Statistics

- **Total Commits**: 5 (reorganization + 3 phases + progressive loading analysis)
- **Lines Added**: 11,620
- **Lines Removed**: 1,379
- **Net Change**: +10,241 lines
- **Files Changed**: 150
- **New Guides Created**: 11
- **New Directories**: 4 (`guides/`, `languages/`, `guides/architecture/`, `guides/observability/`)

### Repository Metrics

- **Total Files**: 63 markdown files in `/guides/api-design/`
- **Total Words**: 63,687
- **Estimated Tokens**: ~127,000 tokens (complete guide)
- **Progressive Loading Sections**: 9 sections (2.5K to 39K tokens each)

### Quality Compliance

All new guides meet readability standards:
- Grade Level: ≤14 (with acceptable exceptions for reference docs)
- Flesch Score: ≥30 (with near-target scores for technical content)
- Technical Density: 0.7-1.6% (well below 3% ceiling)
- Language-Agnostic: ✅ All guides use only HTTP/JSON/YAML examples

### Migration Notes

**Breaking Changes:**
- Repository renamed from `spring-api-design-docs` to `software-design-docs`
- All file paths updated from `/api-design/` to `/guides/api-design/`
- All file paths updated from `/spring-design/` to `/languages/spring/`

**For Users:**
- Update any bookmarks or links to point to new paths
- Documentation now separated into theory (`/guides/`) and implementation (`/languages/`)
- Progressive loading strategies available for efficient LLM context usage

### Contributors

- Repository reorganization and gap analysis completed January 2, 2026
- All content created following existing repository style guidelines
- Research-based content using RFCs and industry best practices

---

## [1.x.x] - Prior to 2026-01-02

Initial repository structure with Spring-specific API design documentation.

See git history for detailed changelog of previous versions.
