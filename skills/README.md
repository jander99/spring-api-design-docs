# API Design Skills

Agent Skills for REST API design and implementation.

## What Are These?

These are [Agent Skills](https://agentskills.io) - folders of instructions that AI agents can load to perform specialized tasks. Each skill contains:

- `SKILL.md` - Core instructions and when to use the skill
- `references/` - Detailed documentation loaded on-demand

## Available Skills

| Skill | Description |
|-------|-------------|
| `rest-api-design` | Resource naming, URL structure, HTTP methods, content negotiation, data modeling, HTTP client patterns |
| `api-error-handling` | RFC 9457 error responses, validation patterns |
| `api-pagination` | Cursor/offset pagination, filtering, sorting, performance optimization |
| `api-security` | OAuth 2.1, authorization patterns, CORS, rate limiting, multi-tenancy |
| `api-streaming` | Server-Sent Events, NDJSON, reactive streaming patterns |
| `api-observability` | Health checks, metrics, distributed tracing, correlation |
| `api-versioning` | Version strategies, deprecation policies, migration |
| `api-testing` | Contract testing, API testing strategies |

## Manual Installation

Copy the skill folder(s) you want to your agent's skill directory:

- **Claude Code**: `~/.claude/skills/`
- **OpenCode**: `~/.opencode/skill/`
- **Other agents**: Check your agent's skill directory documentation

Example:
```bash
cp -r skills/api-error-handling ~/.claude/skills/
```

## Language-Specific References

Skills include `references/java-spring.md` for Spring Boot implementation patterns. Additional language/framework references may be added in the future (e.g., `kotlin-spring.md`, `javascript-express.md`).

## Source Documentation

These skills are derived from the comprehensive API design and Spring implementation documentation in this repository:

- `api-design/` - Language-agnostic REST API standards
- `spring-design/` - Spring Boot implementation patterns
