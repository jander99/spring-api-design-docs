# API Lifecycle Management

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 13 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** REST, Documentation
> 
> **📊 Complexity:** 15.1 grade level • 0.8% technical density • difficult

## Overview

APIs change over time. Good lifecycle management helps APIs evolve smoothly. It also keeps trust with users. This guide covers the full lifecycle. It starts at design and ends at deprecation. It focuses on communication and migration.

## Core Principles

1. **Transparency**: Communicate changes early and clearly
2. **Stability**: Maintain backward compatibility when possible
3. **Predictability**: Follow consistent deprecation timelines
4. **Support**: Provide clear migration paths for breaking changes
5. **Monitoring**: Track usage to inform lifecycle decisions

## API Design Review Process

### Pre-Release Review

Before publishing any API endpoint, complete these review steps:

1. **Contract Review**: Validate request and response formats
2. **Breaking Change Assessment**: Identify potential compatibility issues
3. **Versioning Decision**: Determine if new version is required
4. **Documentation Check**: Ensure complete API documentation
5. **Security Review**: Verify authentication and authorization patterns

### Review Checklist

- [ ] Resource names follow naming conventions
- [ ] HTTP methods match semantic meaning
- [ ] Error responses use RFC 7807 format
- [ ] Field names are consistent across resources
- [ ] Required vs optional fields are clearly marked
- [ ] Breaking changes require new version number

## Breaking Change Detection

### What Counts as Breaking?

Breaking changes force clients to change their code:

**Request Changes** (Breaking):
- Removing request fields
- Making optional fields required
- Changing field data types
- Adding required query parameters
- Modifying authentication requirements

**Response Changes** (Breaking):
- Removing response fields
- Changing field data types
- Modifying field names
- Changing HTTP status codes for existing scenarios
- Altering error response structure

**URI Changes** (Breaking):
- Changing resource paths
- Removing endpoints
- Modifying path parameter formats

### Non-Breaking Changes

These changes maintain backward compatibility:

**Safe Additions**:
- Adding optional request fields
- Adding new response fields
- Adding new endpoints
- Adding optional query parameters
- Providing additional HTTP status codes

**Safe Enhancements**:
- More detailed error messages
- Additional link relations (HATEOAS)
- New media type options
- Performance improvements

### Detection Strategy

Use automation to find breaking changes:

1. **Schema Comparison**: Compare OpenAPI specs between versions
2. **Contract Testing**: Run client tests against the new version
3. **Type Analysis**: Check type compatibility in requests and responses
4. **Response Validation**: Ensure fields stay the same

## Deprecation Communication

### The Sunset Header (RFC 8594)

Use the `Sunset` header to tell when a resource will stop working:

```http
HTTP/1.1 200 OK
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
Content-Type: application/json
```

**Header Format**:
```http
Sunset: <HTTP-date>
```

The date shows when the resource will stop responding.

### Deprecation Header

Mark endpoints as deprecated while they remain functional:

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
Warning: 299 - "This API version is deprecated. Migrate to /v2/orders"
Content-Type: application/json
```

### Warning Header

Give clear deprecation messages:

```http
Warning: 299 - "This endpoint will be removed on 2025-12-31. Use /v2/orders instead"
```

**Format**:
```http
Warning: 299 - "<message text>"
```

Use code 299 for general warnings that stay relevant.

### Successor Version Link

Point to replacement endpoints using the `successor-version` link relation:

```http
Link: </v2/orders>; rel="successor-version"
Link: </v2/orders>; rel="successor-version"; title="Orders API v2"
```

### Complete Deprecation Response

Combine all headers for maximum clarity:

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"; title="Orders API v2"
Link: <https://api.example.com/docs/migration/v1-to-v2>; rel="sunset"
Warning: 299 - "API v1 will be removed on 2025-12-31. See migration guide"
Content-Type: application/json

{
  "orders": [],
  "_links": {
    "self": {"href": "/v1/orders"},
    "successor-version": {"href": "/v2/orders"}
  }
}
```

## Sunset Link Relation

Give detailed sunset info using the `sunset` link:

```http
Link: <https://api.example.com/sunset-policy>; rel="sunset"; type="text/html"
```

The linked resource can provide:

1. **Sunset Policy**: Service-wide retirement policies
2. **Migration Information**: Step-by-step upgrade guides
3. **Timeline Details**: Extended deprecation schedules
4. **Support Resources**: Contact information and help

### Sunset Policy Document

Example sunset policy response:

```http
GET /sunset-policy HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "policy": {
    "minimumNotice": "P6M",
    "deprecationProcess": [
      "Announce deprecation with Sunset header",
      "Provide 6-month minimum migration period",
      "Send email notifications to registered clients",
      "Publish migration documentation",
      "Return 410 Gone after sunset date"
    ],
    "supportedVersions": 2,
    "migrationSupport": "https://api.example.com/support"
  }
}
```

## Sunset Timelines

### Recommended Minimum Periods

**Standard APIs**:
- Minimum notice: 6 months
- Recommended notice: 12 months
- High-traffic APIs: 18+ months

**Critical Integrations**:
- Minimum notice: 12 months
- Partner integrations: Negotiate individually
- Enterprise SLAs: Per contract terms

### Timeline Phases

**Phase 1: Announcement (Month 0)**
- Add `Deprecation: true` header
- Add `Sunset` header with date
- Link to migration docs
- Email API users

**Phase 2: Active Deprecation (Month 1-10)**
- Keep serving deprecated endpoints
- Monitor usage
- Help with migration
- Send reminders (Month 3, 6, 9)

**Phase 3: Final Warning (Month 11)**
- Send final notice
- Make warnings more visible
- Offer help

**Phase 4: Sunset (Month 12)**
- Return `410 Gone` status
- Link to new resource
- Log access attempts

## Migration Path Strategies

### Strategy 1: Parallel Versions

Run old and new versions at the same time:

```http
# Old version continues working
GET /v1/orders HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"

# New version available
GET /v2/orders HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
```

**Benefits**:
- No downtime
- Clients pick when to migrate
- Can roll out slowly

**Challenges**:
- More work to maintain
- Keep data in sync
- Uses more resources

### Strategy 2: Field-Level Deprecation

Mark specific fields as deprecated. Keep the endpoint working:

```http
GET /v1/customers/12345 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "12345",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "555-0100",
  "phoneNumber": "555-0100",
  "_deprecated": {
    "fields": ["phone"],
    "message": "Use 'phoneNumber' instead of 'phone'",
    "sunsetDate": "2025-12-31"
  }
}
```

**Benefits**:
- Target specific fields
- Less disruptive
- Clear path forward

**Challenges**:
- Bigger responses
- May confuse users
- Needs good docs

### Strategy 3: Redirect-Based Migration

Use HTTP redirects to guide clients:

```http
GET /v1/orders HTTP/1.1
Host: api.example.com

HTTP/1.1 308 Permanent Redirect
Location: /v2/orders
Link: </v2/orders>; rel="successor-version"
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
```

**Benefits**:
- Clients auto-redirect
- Clear next version
- Less server load

**Challenges**:
- Some clients ignore redirects
- Complex for POST/PUT/PATCH
- May break auth

### Strategy 4: Gateway-Level Transformation

Change old requests to new format at the gateway:

```http
# Client sends old format
POST /v1/orders HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "customerId": "123",
  "items": [{"sku": "ITEM-001", "qty": 2}]
}

# Gateway transforms to new format
POST /v2/orders HTTP/1.1
Host: internal.example.com
Content-Type: application/json

{
  "customer": {"id": "123"},
  "lineItems": [{"productSku": "ITEM-001", "quantity": 2}]
}

# Response transformed back to old format
HTTP/1.1 201 Created
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
```

**Benefits**:
- Hidden from clients
- Transform in one place
- More time to migrate

**Challenges**:
- Complex transform code
- Slower performance
- Hides breaking changes

## Version Lifecycle States

### State 1: Development

API is still being built. Not released yet.

- No promises of stability
- Breaking changes OK
- Internal use only

### State 2: Beta

API is ready for testing. Not for production:

```http
HTTP/1.1 200 OK
Warning: 299 - "Beta API: subject to breaking changes without notice"
Content-Type: application/json
```

- Breaking changes may happen
- Want early feedback
- No SLA promises

### State 3: Stable

API is ready for production. Full support:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

- Breaking changes need new version
- SLA applies
- Full support

### State 4: Deprecated

API is marked to be retired:

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
Warning: 299 - "Deprecated. Migrate to v2 by 2025-12-31"
Content-Type: application/json
```

- Still works but not recommended
- Bug fixes only
- Shows path to new version

### State 5: Sunset

API is shut down:

```http
HTTP/1.1 410 Gone
Link: </v2/orders>; rel="successor-version"
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/endpoint-sunset",
  "title": "Endpoint No Longer Available",
  "status": 410,
  "detail": "This endpoint was sunset on 2025-12-31",
  "successorVersion": "/v2/orders"
}
```

- Returns `410 Gone`
- Links to new version
- No data

## Usage Monitoring

### Metrics to Track

**Adoption Metrics**:
- Active clients per version
- Requests per version
- New client rate
- Version split

**Migration Metrics**:
- Old endpoint usage
- Migration rate
- Average migration time
- Clients still on old version

**Health Metrics**:
- Errors per version
- Response time per version
- Auth failures
- Rate limit hits

### Monitoring Implementation

Include version information in logs:

```http
GET /v1/orders HTTP/1.1
Host: api.example.com
X-API-Version: v1
X-Client-ID: mobile-app-ios-1.2.3

HTTP/1.1 200 OK
X-API-Version: v1
X-Deprecated: true
X-Sunset-Date: 2025-12-31
```

### Usage Dashboard

Track key lifecycle indicators:

1. **Version Split**: Chart of requests by version
2. **Timeline**: Days until sunset with traffic
3. **Top Clients**: High-volume users on old versions
4. **Progress**: Percent migrated
5. **Risk**: Clients at risk

## Client Communication Strategy

### Communication Channels

**In-Band (API Response)**:
- `Deprecation` header
- `Sunset` header
- `Warning` header
- Response body metadata

**Out-of-Band**:
- Email to developers
- Portal messages
- Blog posts
- Newsletter
- Status page

### Communication Timeline

**T-12 months** (First Notice):
- Email all developers
- Post blog update
- Add headers to old endpoints
- Update docs

**T-9 months** (First Reminder):
- Email users on old version
- Share migration examples
- Offer help sessions

**T-6 months** (Second Reminder):
- Email with urgency
- Show migration tools
- Offer support

**T-3 months** (Urgent Notice):
- Email with clear deadline
- Find high-volume users
- Offer direct help

**T-1 month** (Final Warning):
- Daily emails
- Make warnings bigger
- Contact stragglers

**T-0** (Sunset):
- Return `410 Gone`
- Confirm via email
- Watch for problems

## Migration Documentation

### Essential Elements

**Overview Section**:
- What changed
- When to migrate
- List of breaking changes
- Why migrate

**Before/After Examples**:

```http
# Old version (v1)
GET /v1/orders?customer=123&status=pending HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "orders": [
    {
      "id": "ORD-001",
      "customer": "123",
      "status": "pending",
      "total": 99.99
    }
  ]
}
```

```http
# New version (v2)
GET /v2/orders?customerId=123&status=PENDING HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "ORD-001",
      "customer": {
        "id": "123"
      },
      "status": "PENDING",
      "total": {
        "amount": 99.99,
        "currency": "USD"
      }
    }
  ],
  "pagination": {
    "page": 0,
    "size": 20,
    "total": 1
  }
}
```

**Field Mapping Table**:

| v1 Field | v2 Field | Change Type | Notes |
|----------|----------|-------------|-------|
| `customer` | `customer.id` | Structure | Now nested object |
| `status` | `status` | Format | Now uppercase enum |
| `total` | `total.amount` | Structure | Now includes currency |
| N/A | `total.currency` | Addition | New required field |
| N/A | `pagination` | Addition | Added pagination metadata |

**Code Examples**:
- HTTP requests and responses
- Common use cases
- Error handling
- Auth changes

**Testing Guidance**:
- How to test new version
- Validation steps
- How to roll back

## Post-Sunset Actions

### Immediate Actions

**Day 1**:
- Watch errors and tickets
- Fix sunset issues
- Note common problems
- Get feedback

**Week 1**:
- Review metrics
- Find users who need help
- Update docs
- Hold team meeting

### Long-Term Actions

**Month 1**:
- Delete old code
- Archive old docs
- Update policy
- Share lessons

**Month 3**:
- Final report
- Close project
- Update process docs

## Best Practices

### Do

- Give 6 months notice minimum
- Use standard headers (`Sunset`, `Deprecation`, `Warning`)
- Provide clear migration docs with examples
- Track usage during deprecation
- Communicate early and often
- Stick to sunset dates
- Test for breaking changes in CI/CD

### Don't

- Sunset without notice
- Change sunset dates (except to extend)
- Deprecate without an alternative
- Ignore high-volume users
- Remove endpoints early
- Make custom headers
- Sunset many versions at once

## Integration with CI/CD

### Automated Checks

**Pre-Deployment**:
1. Compare OpenAPI specs for breaking changes
2. Validate deprecation headers are present
3. Ensure sunset dates are in future
4. Verify migration documentation exists
5. Check contract tests pass

**Post-Deployment**:
1. Verify headers appear in responses
2. Confirm monitoring is tracking version metrics
3. Validate sunset link targets are accessible
4. Send deprecation announcements

### Breaking Change Pipeline

```http
# CI/CD detects breaking change
$ api-diff v1.yaml v2.yaml

Breaking changes detected:
- Field removed: /orders[].customer (string -> object)
- Field added (required): /orders[].total.currency
- Enum values changed: /orders[].status

Action required:
- Increment major version (v1 -> v2)
- Add deprecation headers to v1
- Set sunset date (recommended: +12 months)
- Create migration documentation
```

## Governance

### Approval Process

**Minor Changes** (non-breaking):
- Tech lead approves
- Update docs
- Deploy normally

**Major Changes** (breaking):
- Architecture board approves
- Need deprecation plan
- Need communication plan
- Need migration docs
- Approve sunset timeline

### Version Support Policy

**Active Support**:
- Latest version: Full support
- Previous version: Bug fixes only
- Older versions: Security fixes only

**Support Windows**:
- Major versions: 24 months min
- Security fixes: 36 months
- Enterprise: Per contract

## Implementation Notes

These principles work for any REST API. The headers and formats follow HTTP standards and RFCs. This ensures they work across all frameworks and platforms.

## Related Documentation

- **[API Version Strategy](API%20Version%20Strategy.md)**: Version numbering and format
- **[Error Response Standards](../request-response/Error-Response-Standards.md)**: 410 Gone response format
- **[OpenAPI Standards](../documentation/OpenAPI-Standards.md)**: Schema comparison and documentation
- **Deprecation Examples**: [examples/versioning/](../examples/versioning/)
- **Migration Reference**: [reference/versioning/deprecation-policies.md](../reference/versioning/deprecation-policies.md)
