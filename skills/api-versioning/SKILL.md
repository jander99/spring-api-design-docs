---
name: api-versioning
description: Design and implement API versioning strategies including URL path versioning, deprecation policies, and migration paths. Use when planning API evolution, deprecating old versions, communicating breaking changes, or managing multiple API versions.
---

# API Versioning

<!--
SOURCE DOCUMENTS:
- api-design/foundations/API Version Strategy.md
- api-design/reference/versioning/deprecation-policies.md
- api-design/examples/versioning/migration-examples.md
- api-design/troubleshooting/versioning/common-problems.md
- spring-design/controllers/Controller-Fundamentals.md (partial - versioning section)

REFERENCE FILES TO CREATE:
- references/version-strategies.md (URL vs header vs content-type)
- references/deprecation.md (sunset headers, migration communication)
- references/java-spring.md (Spring versioning patterns - NOTE: incomplete in source)

TODO: Spring versioning implementation documentation is sparse. 
Flag for enhancement per TODO.md and READING_LEVEL_TODOS.md
-->

## When to Use This Skill

Use this skill when you need to:
- Choose an API versioning strategy
- Plan for breaking changes
- Deprecate old API versions
- Communicate deprecation to clients
- Maintain multiple versions simultaneously
- Migrate clients to new versions

## Core Principles

TODO: Extract and condense from API Version Strategy.md

### Versioning Strategies
- **URL path**: `/v1/orders` - Most common, explicit
- **Query parameter**: `/orders?version=1` - Less common
- **Header**: `Accept: application/vnd.api+json;version=1` - Cleaner URLs
- **Content-type**: `Accept: application/vnd.api.v1+json` - RESTful

### Version Format
- Use simple integers: `v1`, `v2`
- Major versions only (breaking changes)
- Minor/patch handled without version bump

### Deprecation Policy
- Announce deprecation well in advance (6-12 months)
- Use `Deprecation` and `Sunset` headers
- Provide migration guides
- Monitor deprecated endpoint usage
- Remove only after sunset date

## Quick Reference

TODO: Add versioning strategy decision tree

| Strategy | Pros | Cons |
|----------|------|------|
| URL path | Explicit, cacheable | URL pollution |
| Header | Clean URLs | Hidden, harder to test |
| Content-type | RESTful | Complex content negotiation |

### Deprecation Headers
```
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
```

## Loading Additional Context

When you need deeper guidance:

- **Versioning strategies**: Load `references/version-strategies.md`
- **Deprecation policies**: Load `references/deprecation.md`
- **Java/Spring implementation**: Load `references/java-spring.md`

## Examples

TODO: Add minimal illustrative examples

### URL Path Versioning
```
GET /v1/orders
GET /v2/orders
```

### Header Versioning
```
GET /orders
Accept: application/vnd.myapi.v1+json
```

### Deprecation Response Headers
```
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
```

### Migration Communication
```json
{
  "warning": "This API version is deprecated",
  "sunset": "2024-12-31",
  "migration": "https://docs.example.com/api/v2-migration"
}
```

## Anti-Patterns

TODO: Extract from source documents

- Breaking changes without version bump
- No deprecation warning period
- Removing versions without sunset notice
- Versioning every minor change
- Maintaining too many versions simultaneously
- No migration documentation
- Missing usage monitoring for deprecated versions
