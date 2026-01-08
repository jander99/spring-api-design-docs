# API Deprecation Policies Reference

> **Reading Guide:** Grade Level 14.3 • Fairly Difficult (34.6 Flesch) • 12 min read  
> **Prerequisites:** Basic HTTP knowledge, API versioning concepts  
> **Purpose:** Step-by-step policies for retiring API versions safely

## Quick Start

**What is API deprecation?** You mark an old API version as outdated. You give clients time to switch to the new version. Then you remove the old version.

**Why deprecation matters:**
- Protects your clients from sudden API changes
- Reduces maintenance costs over time
- Ensures smooth transitions to better designs
- Maintains trust with API consumers

**Basic deprecation flow:**
1. Announce the deprecation. Add headers and notify clients.
2. Support both versions. This is the dual support phase.
3. Help clients migrate. Provide guides and tools.
4. Remove the old version. Wait until after the sunset date.

**Key policy elements:**
- **Timeline**: How long you support the old version
- **HTTP headers**: How you mark deprecated endpoints
- **Migration support**: How you help clients switch
- **Final removal**: How you handle the sunset date

## Timeline Policies

### How Long to Support Old Versions

You must support old API versions for minimum periods. These minimums protect your clients.

**Minimum support by API type:**
- **Public APIs**: 12 months
- **Partner APIs**: 6 months  
- **Internal APIs**: 3 months

**Example:** You deprecate a public endpoint on January 1, 2025. Support continues until January 1, 2026 minimum.

### When to Extend Support

Some situations require longer support periods.

**High traffic endpoints:**
- Endpoints with over 10,000 requests per day
- Extend support to 18-24 months
- More clients depend on these endpoints

**Critical integrations:**
- Major customers with complex dependencies
- Negotiate custom timelines case by case
- Document agreements in writing

**Security issues:**
- Deprecate immediately when you find critical vulnerabilities
- Remove the endpoint within 30 days
- Security takes priority over standard timelines

### Traffic-Based Support Levels

You adjust timelines based on usage patterns.

**Low traffic** (under 100 requests per day):
- Use standard minimum support periods
- Use standard migration communication

**Medium traffic** (100 to 1000 requests per day):
- Consider extended support
- Evaluate client dependencies

**High traffic** (over 1000 requests per day):
- Extend support automatically
- Provide premium migration assistance

### Metrics to Track

You monitor these metrics for deprecated endpoints:
- Daily request counts per endpoint
- Client identities using each endpoint
- Error rates for deprecated versions
- Response times compared to new versions

## HTTP Headers for Deprecation

You use specific HTTP headers to mark deprecated endpoints. These headers follow RFC 8594 standards.

### Required Headers

**Deprecation header** tells machines the endpoint is deprecated:
```http
Deprecation: true
```
- Add this to every deprecated endpoint response
- Use the boolean value `true`
- Machines can detect this automatically

**Sunset header** specifies when you will remove the endpoint:
```http
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
```
- Include the exact removal date and time
- Use HTTP date format
- Clients can plan migration deadlines

### Recommended Headers

**Link header** points to the replacement endpoint:
```http
Link: </v2/customers>; rel="successor-version"
```
- Shows clients where to migrate
- Use the `successor-version` relation type
- Include the full replacement path

**Warning header** provides human-readable messages:
```http
Warning: 299 - "This API version is deprecated and will be removed on 2025-12-31"
```
- Use warning code 299
- Write clear, direct messages
- Include the sunset date

### Complete Example

Here is a full deprecated endpoint response:
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/customers>; rel="successor-version"
Warning: 299 - "This API version is deprecated and will be removed on 2025-12-31"
X-API-Version: 1.0
X-Supported-Versions: 1.0, 2.0
Content-Type: application/json

{
  "data": "...",
  "deprecation_notice": {
    "message": "This endpoint is deprecated",
    "sunset_date": "2025-12-31",
    "migration_guide": "https://docs.example.com/migrate-v1-to-v2"
  }
}
```

**Why include deprecation info in the body:**
- Headers might be ignored by some clients
- Body data is easier to log and track
- Migration guides need URLs

## Three-Phase Deprecation Process

You retire old versions through three phases. Each phase has specific tasks.

### Phase 1: Dual Support

You run both old and new versions together.

**Deployment steps:**
1. Deploy v2 alongside v1
2. Add deprecation headers to v1
3. Update docs to mark v1 as deprecated
4. Set up monitoring for both versions
5. Test both versions work correctly

**Load balancing setup:**
- Route requests by version header or URL path
- Create separate health checks for each version
- Plan server capacity for running two versions

**Example routing:**
```
/v1/customers → Route to v1 service
/v2/customers → Route to v2 service
```

### Phase 2: Client Migration

You help clients switch to the new version.

**How to notify clients:**
1. Send emails to registered API users
2. Post announcements in your developer portal
3. Message internal teams via Slack or Teams
4. Write blog posts for public API changes
5. Update open support tickets

**Migration assistance you provide:**
- Write detailed guides with code examples
- Host office hours for complex cases
- Build automated migration tools when possible
- Maintain an FAQ for common questions

**Track migration progress:**
- Generate weekly reports on v1 usage
- Create dashboards showing client status
- Send alerts to clients near sunset date
- Measure migration completion rates

**Example migration dashboard:**
- Total clients using v1: 150
- Migrated to v2: 120 clients
- Not started: 30 clients
- Days until sunset: 45

### Phase 3: Sunset and Removal

You stop supporting the old version.

**Graceful shutdown steps:**
1. **30 days before**: Increase warning frequency
2. **Soft sunset**: Return 410 for new clients. Support existing clients.
3. **Hard sunset**: Return 410 for all requests
4. **Final removal**: Delete v1 code. Wait for monitoring period to end.

**410 Gone response format:**
```http
HTTP/1.1 410 Gone
Content-Type: application/problem+json
Cache-Control: no-cache

{
  "type": "https://example.com/problems/version-deprecated",
  "title": "API Version Deprecated",
  "status": 410,
  "detail": "This API version has been removed. Please use v2.",
  "instance": "/v1/customers/123",
  "deprecated_on": "2025-01-01T00:00:00Z",
  "sunset_on": "2025-12-31T23:59:59Z",
  "successor_version": {
    "url": "/v2/customers/123",
    "documentation": "https://docs.example.com/api/v2"
  }
}
```

**Why use 410 instead of 404:**
- 410 means "gone permanently"
- 404 means "not found" (might be temporary)
- Clients should stop retrying 410 responses

## Deprecating Individual Fields

You can deprecate specific fields without changing the whole API version.

### Mark Fields in OpenAPI

Show deprecated fields in your API specification:
```yaml
components:
  schemas:
    Customer:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        oldField:
          type: string
          deprecated: true
          description: "Deprecated - use newField instead. Will be removed in v2."
        newField:
          type: string
          description: "Replacement for oldField"
```

### Include Deprecation Metadata

Add deprecation info to your responses:
```json
{
  "id": "12345",
  "name": "John Doe",
  "oldField": "legacy_value",
  "newField": "new_value",
  "_deprecated_fields": ["oldField"],
  "_field_deprecation_info": {
    "oldField": {
      "deprecated_on": "2024-01-01",
      "removal_date": "2024-12-31",
      "replacement": "newField"
    }
  }
}
```

**Why include metadata:**
- Clients can detect deprecated fields automatically
- Migration tools can parse this info
- Logs show which clients use old fields

### Let Clients Hide Deprecated Fields

Support query parameters to exclude old fields:
```http
GET /v1/customers/123?exclude_deprecated=true
```
```json
{
  "id": "12345",
  "name": "John Doe",
  "newField": "new_value"
}
```

**Benefits of this approach:**
- Clients can test migrations incrementally
- Reduces response payload size
- Helps identify field dependencies

## Breaking vs Non-Breaking Changes

You need to know which changes require a new version.

### Breaking Changes (New Version Required)

These changes break existing clients. You must create a new API version.

**Request breaking changes:**
- You remove request parameters
- You change parameter data types
- You make optional parameters required
- You change validation rules
- You modify authentication requirements

**Example of breaking request change:**
```json
// v1: email is optional
{"name": "John"}

// v2: email is required (BREAKING)
{"name": "John", "email": "john@example.com"}
```

**Response breaking changes:**
- You remove response fields
- You change field data types
- You change what fields mean
- You modify error formats
- You change HTTP status codes

**Example of breaking response change:**
```json
// v1: id is a string
{"id": "12345"}

// v2: id is a number (BREAKING)
{"id": 12345}
```

**Behavior breaking changes:**
- You modify side effects
- You change idempotency guarantees
- You alter rate limiting rules
- You change caching behavior

### Non-Breaking Changes (Same Version)

These changes keep existing clients working. You can add them without a new version.

**Safe additions:**
- New optional request parameters
- New response fields
- New HTTP methods on resources
- New query parameters with defaults
- New error codes for new scenarios

**Example of non-breaking addition:**
```json
// v1 response
{"id": "12345", "name": "John"}

// v1 enhanced (non-breaking)
{"id": "12345", "name": "John", "email": "john@example.com"}
```

**Safe improvements:**
- Better validation messages
- Clearer error descriptions
- Performance optimizations
- Security fixes that don't change behavior

**Key principle:** If existing client code still works, the change is non-breaking.

## Version-Specific Errors

You include version info in error responses. This helps clients understand which version failed.

### Include Version in Error Codes

Add the version to error identifiers:
```json
{
  "error": {
    "code": "V1_VALIDATION_ERROR",
    "message": "Request validation failed",
    "version": "1.0",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**Why prefix error codes with version:**
- Different versions might have different validation rules
- Error logs show which version caused the problem
- Clients can handle version-specific errors

### Use RFC 9457 Problem Details

Include the API version in standard problem responses:
```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/v1/customers",
  "api_version": "1.0",
  "invalid_params": [
    {
      "name": "email",
      "reason": "invalid format"
    }
  ]
}
```

**Benefits of including version:**
- Support teams know which API version failed
- Analytics track errors by version
- Clients can provide better error context

## Content Negotiation for Minor Versions

You can version through HTTP headers instead of URLs. This works well for minor version changes.

### Request a Specific Minor Version

Clients specify the version in the Accept header:
```http
GET /api/customers HTTP/1.1
Accept: application/vnd.api+json;version=1.2
Host: api.example.com
```

**When to use Accept header versioning:**
- Minor version updates (1.0 → 1.1)
- Non-breaking changes
- Backward-compatible enhancements

### Return Version in Response

Tell clients which version you returned:
```http
HTTP/1.1 200 OK
API-Version: 1.2
API-Supported-Versions: 1.0, 1.1, 1.2, 2.0
Content-Type: application/vnd.api+json;version=1.2
```

**Why include supported versions:**
- Clients discover available versions automatically
- Migration planning becomes easier
- Version negotiation is transparent

## Monitoring and Metrics

You track specific metrics during deprecation. These metrics guide your decisions.

### Usage Metrics

Track how clients use each version:
- Request count per API version
- Unique client count per version
- Geographic distribution by version
- Success rate by version

**Example usage dashboard:**
- v1: 10,000 requests per day (declining)
- v2: 25,000 requests per day (growing)
- v1 clients: 50 total (down from 150)
- v2 clients: 200 total (up from 100)

### Performance Metrics

Monitor version health separately:
- Response time by version
- Error rate by version
- Throughput by version
- Resource usage by version

**Why track separately:**
- Old versions might perform worse
- Resource allocation decisions need data
- Performance degradation signals problems

### Migration Progress Metrics

Measure migration success:
- Client migration completion rate
- Average migration time per client
- Support tickets about deprecation
- Migration guide page views

**Example migration tracking:**
- Week 1: 10% migrated
- Week 4: 40% migrated
- Week 8: 75% migrated
- Week 12: 95% migrated

### Alert Thresholds

Set automatic alerts for these conditions:

**High usage alert:**
- Trigger when >1000 requests/day to deprecated endpoint
- Send 30 days before sunset
- Contact heavy users directly

**Individual client alert:**
- Trigger when single client makes >100 requests/day
- Send personalized migration assistance
- Escalate if no response

**Error rate alert:**
- Trigger when error rate >5% on deprecated endpoints
- Investigate immediately
- May indicate breaking changes

**Sunset reminders:**
- Send at 90 days before sunset
- Send at 60 days before sunset
- Send at 30 days before sunset
- Send at 7 days before sunset

## Documentation Requirements

You maintain specific documentation during deprecation.

### Update API Documentation

Mark deprecated endpoints clearly:
- Add deprecation badges to endpoint docs
- Include the sunset date prominently
- Show migration timeline
- Provide before/after code examples

**Example deprecation notice:**
```
⚠️ DEPRECATED: This endpoint will be removed on 2025-12-31
Migration guide: https://docs.example.com/migrate-v1-to-v2
Replacement: GET /v2/customers
```

### Create Migration Guides

Write step-by-step instructions:
- List all breaking changes
- Show code comparisons (old vs new)
- Explain testing strategies
- Document rollback procedures

**Migration guide sections:**
1. What changed
2. Why we changed it
3. Step-by-step migration steps
4. Before and after code examples
5. Testing checklist
6. Common problems and solutions
7. Rollback instructions

### Prepare Communication Templates

Create templates for each deprecation phase:

**Email template (initial announcement):**
```
Subject: [Action Required] API v1 Deprecation - Migrate by Dec 31, 2025

We are deprecating API v1 on Dec 31, 2025.

Action required:
- Migrate to v2 before the sunset date
- Review the migration guide: [link]
- Test your integration with v2

Timeline:
- Now: v1 marked as deprecated
- Dec 31, 2025: v1 will stop working

Need help? Reply to this email or visit [support link]
```

**Developer portal announcement:**
```
API v1 Deprecation Notice
Sunset Date: December 31, 2025
Migration Guide: [link]
Support: [contact info]
```

**Support ticket template:**
```
Thank you for contacting support.

API v1 is deprecated and will be removed on Dec 31, 2025.
Please migrate to v2 using our guide: [link]

We can help with:
- Migration questions
- Testing assistance
- Custom timeline discussions
```

## Legal and Compliance

You update legal agreements during deprecation.

### Update Terms of Service

Revise your API terms to cover deprecation:
- State your deprecation timeline policies
- Define support obligations for old versions
- Specify client migration responsibilities
- Limit liability for deprecated endpoints

**Example ToS clause:**
```
We may deprecate API versions with 12 months notice.
Deprecated versions receive limited support.
You must migrate before the sunset date.
We are not liable for issues with deprecated versions after sunset.
```

### Adjust Service Level Agreements

Change SLA commitments for deprecated versions:
- Reduce uptime guarantees (from 99.9% to 99%)
- Lower performance commitments
- Limit support response times
- Define incident response priorities

**Example SLA adjustment:**
```
Current version v2:
- 99.9% uptime
- Under 200ms p95 latency

Deprecated version v1:
- 99% uptime
- Under 500ms p95 latency
```

### Document Data Retention

Clarify data handling during deprecation:
- State how long you keep data from deprecated endpoints
- Explain data migration procedures
- Provide data export capabilities
- Maintain audit logs for compliance

**Example data policy:**
```
We retain request logs for deprecated endpoints for 90 days after sunset.
You can export your data before the sunset date using [export tool].
After sunset, data may not be recoverable.
```

## Summary

Good deprecation policies balance several goals:
- Protect clients from breaking changes
- Reduce your maintenance burden
- Maintain client trust and relationships
- Meet legal obligations

**Key success factors:**
- Clear timelines with adequate notice periods
- Standard HTTP headers for machine detection
- Comprehensive migration support
- Proactive client communication
- Careful monitoring and metrics

Follow these policies to ensure smooth API evolution.