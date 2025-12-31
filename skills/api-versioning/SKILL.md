---
name: api-versioning
description: Design and manage API versioning with strategies (URL path, header), deprecation (Sunset headers, migration guides), and lifecycle management (dual support, sunset dates). Use when planning API evolution, deprecating versions, communicating breaking changes, or managing multi-version support.
---

# API Versioning

Manage API versions, deprecation, and client migration strategies.

## When to Use

- Choosing an API versioning strategy
- Planning breaking changes that require new version
- Deprecating old API versions with proper notice
- Communicating deprecation timeline to clients
- Managing dual-version support during migration

## Quick Start

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
Content-Type: application/json
```

## Versioning Strategy

| Strategy | Example | Recommendation |
|----------|---------|----------------|
| URL path | `/v1/orders` | **Recommended** - explicit, cacheable |
| Header | `API-Version: 1` | Clean URLs but hidden |
| Query | `?version=1` | Caching issues |
| Content-type | `Accept: .../v1+json` | Complex |

**URL path rules**: Major versions only (v1, v2). Once published, never change contract.

## Breaking vs Non-Breaking

| Breaking (New Version) | Non-Breaking (Same Version) |
|------------------------|----------------------------|
| Remove/rename field | Add optional field |
| Change field type | Add new endpoint |
| Add required field | Add optional parameter |
| Change URI structure | Improve error messages |
| Change auth requirements | Performance improvements |

## Deprecation Timeline

| API Type | Minimum Notice |
|----------|---------------|
| Public | 12 months |
| Partner | 6 months |
| Internal | 3 months |
| Security issues | 30 days |

## Deprecation Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Deprecation` | Yes | `true` when deprecated |
| `Sunset` | Yes | HTTP date of removal |
| `Link` | Recommended | Points to successor |

## Migration Process

1. **Dual Support**: Deploy v2, add deprecation headers to v1
2. **Notifications**: Email at 90, 60, 30, 7 days before sunset
3. **Soft Sunset**: Return 410 for new clients, maintain existing
4. **Hard Sunset**: Return 410 Gone for all requests

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Breaking changes in same version | Breaks clients | Create new version |
| No deprecation notice | Surprises clients | Announce 6-12 months ahead |
| Removing without sunset headers | Clients can't prepare | Add deprecation headers first |
| Maintaining 5+ versions | High maintenance cost | Actively sunset old versions |
| No migration docs | Clients struggle | Provide step-by-step guides |

## References

- `references/java-spring.md` - Spring versioning implementation
- `../../api-design/foundations/api-lifecycle-management.md` - Complete lifecycle management
- `../../api-design/reference/versioning/deprecation-policies.md` - Deprecation examples
- `../../api-design/examples/versioning/migration-examples.md` - Migration guides
