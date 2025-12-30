---
name: api-versioning
description: Design and implement API versioning strategies including URL path versioning, deprecation policies, and migration paths. Use when planning API evolution, deprecating old versions, communicating breaking changes, or managing multiple API versions.
---

# API Versioning

## When to Use This Skill

Use this skill when you need to:
- Choose an API versioning strategy
- Plan for breaking changes
- Deprecate old API versions
- Communicate deprecation to clients
- Maintain multiple versions simultaneously
- Migrate clients to new versions

## Versioning Strategy Decision

### Recommended: URL Path Versioning

```
GET /v1/orders/{orderId}
GET /v2/orders/{orderId}
```

**Why URL path versioning:**
- Explicit and visible in every request
- Easy to route at load balancer level
- Cacheable by version
- Simple to test and debug
- Most widely adopted

### Version Format

Use simple major version integers:

```
/v1/resource
/v2/resource
/v3/resource
```

**Rules:**
- Major versions only (v1, v2, v3)
- Once published, never change a version's contract
- Different resources can be at different versions

## Breaking vs Non-Breaking Changes

### Breaking Changes (Require New Version)

| Change Type | Example |
|-------------|---------|
| Remove field | Delete `legacyField` from response |
| Rename field | `customer_id` → `customerId` |
| Change field type | `price: "99.99"` → `price: 99.99` |
| Add required field | New required `taxId` in request |
| Change URI structure | `/orders/123` → `/order/123` |
| Change auth requirements | Add OAuth2 where none existed |
| Change HTTP status codes | `201` → `200` for creates |
| Change error format | Custom format → RFC 7807 |

### Non-Breaking Changes (Same Version OK)

| Change Type | Example |
|-------------|---------|
| Add optional field | New optional `nickname` field |
| Add new endpoint | New `GET /v1/orders/summary` |
| Add optional parameter | New `?include=details` |
| Add response field | New `createdAt` in response |
| Improve error message | Better validation messages |
| Performance improvements | Faster response times |

## Deprecation Process

### Timeline Requirements

| API Type | Minimum Notice |
|----------|---------------|
| Public APIs | 12 months |
| Partner APIs | 6 months |
| Internal APIs | 3 months |
| Security issues | Immediate (30 days removal) |

### Deprecation Headers

Add these headers to deprecated endpoint responses:

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
Warning: 299 - "This API version is deprecated. Use v2."
Content-Type: application/json
```

| Header | Required | Description |
|--------|----------|-------------|
| `Deprecation` | Yes | Boolean indicating deprecated status |
| `Sunset` | Yes | HTTP date when endpoint will be removed |
| `Link` | Recommended | Points to replacement endpoint |
| `Warning` | Optional | Human-readable deprecation message |

### Deprecation Response Body

Optionally include deprecation info in response:

```json
{
  "data": { ... },
  "_deprecation": {
    "message": "This endpoint is deprecated",
    "sunsetDate": "2025-12-31",
    "migrationGuide": "https://docs.example.com/migrate-v1-to-v2",
    "successor": "/v2/orders"
  }
}
```

## Migration Process

### Phase 1: Dual Support

1. Deploy v2 alongside v1
2. Add deprecation headers to v1
3. Update documentation
4. Notify API consumers

### Phase 2: Client Migration

1. Send email notifications at 90, 60, 30, 7 days before sunset
2. Provide migration guides with code examples
3. Monitor v1 usage decline
4. Offer migration support

### Phase 3: Sunset

1. **Warning period**: Increase warning frequency 30 days before
2. **Soft sunset**: Return 410 for new clients, maintain for existing
3. **Hard sunset**: Return 410 Gone for all requests
4. **Removal**: Remove v1 code after monitoring period

### 410 Gone Response

```http
HTTP/1.1 410 Gone
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/version-deprecated",
  "title": "API Version Removed",
  "status": 410,
  "detail": "This API version has been removed. Please use v2.",
  "instance": "/v1/orders/123",
  "sunset_date": "2025-12-31",
  "successor": {
    "url": "/v2/orders/123",
    "documentation": "https://docs.example.com/api/v2"
  }
}
```

## Field-Level Deprecation

Deprecate individual fields without new version:

### OpenAPI Specification

```yaml
components:
  schemas:
    Customer:
      properties:
        id:
          type: string
        legacyField:
          type: string
          deprecated: true
          description: "DEPRECATED: Use newField instead. Removal: 2025-06-01"
        newField:
          type: string
```

### Response with Deprecated Fields

```json
{
  "id": "123",
  "legacyField": "old_value",
  "newField": "new_value",
  "_deprecated_fields": ["legacyField"]
}
```

### Exclude Deprecated Fields (Optional)

```http
GET /v1/customers/123?exclude_deprecated=true
```

## Quick Reference

### Versioning Strategy Comparison

| Strategy | URL Example | Pros | Cons |
|----------|-------------|------|------|
| URL path | `/v1/orders` | Explicit, cacheable | URL pollution |
| Header | `API-Version: 1` | Clean URLs | Hidden, harder to test |
| Query | `?version=1` | Easy to add | Often cached incorrectly |
| Content-type | `Accept: application/vnd.api.v1+json` | RESTful | Complex |

### Deprecation Checklist

- [ ] Set deprecation timeline (6-12 months minimum)
- [ ] Add `Deprecation` header to all responses
- [ ] Add `Sunset` header with removal date
- [ ] Add `Link` header pointing to successor
- [ ] Update OpenAPI spec with deprecation notices
- [ ] Publish migration guide
- [ ] Set up usage monitoring for deprecated endpoints
- [ ] Schedule notification emails
- [ ] Test 410 Gone response
- [ ] Plan removal after sunset

### Monitoring Metrics

| Metric | Alert Threshold |
|--------|-----------------|
| Deprecated endpoint requests | > 1000/day at 30 days before sunset |
| Unique clients on deprecated | Any at 7 days before sunset |
| Error rate on deprecated | > 5% |

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Breaking changes in same version | Breaks existing clients | Create new version |
| No deprecation notice | Surprises clients | Always announce 6-12 months ahead |
| Removing without sunset headers | Clients can't prepare | Add deprecation headers first |
| Versioning minor changes | Too many versions to maintain | Only version breaking changes |
| Maintaining 5+ versions | High maintenance cost | Actively migrate and sunset old versions |
| No migration docs | Clients struggle to migrate | Provide step-by-step guides |
| No usage monitoring | Don't know who's affected | Track usage before deprecation |

## Loading Additional Context

When you need deeper guidance:

- **Java/Spring implementation**: Load `references/java-spring.md`

**Note**: Spring-specific versioning documentation is limited in source materials. Consider using URL path versioning with separate controller classes per version.
