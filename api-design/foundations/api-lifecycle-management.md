# API Lifecycle Management

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 12 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge, familiarity with versioning concepts  
> **🎯 Key Topics:** API lifecycle stages, deprecation, sunset procedures, migration strategies
> 
> **📊 Complexity:** 12.6 grade level • 0.6% technical density • fairly difficult

## Overview

APIs change over time. You add new features. Old patterns stop working well. Security needs grow. Lifecycle management helps you make these changes without breaking client apps.

This guide covers the full life of an API—from design to shutdown. You will learn how to retire APIs safely, tell clients about changes, and help them move to new versions.

**Key benefits:**
- **Predictability**: Clients know what to expect and when
- **Trust**: Clear timelines build confidence
- **Easier upkeep**: Set processes reduce work
- **Compliance**: Written procedures pass audits

---

## API Lifecycle Stages

Every API moves through clear stages. Knowing these stages helps you plan work and set client expectations.

### Stage Overview

| Stage | Duration | Description | Key Activities |
|-------|----------|-------------|----------------|
| **Design** | 2-8 weeks | Define the API contract | Requirements, OpenAPI spec, review |
| **Development** | 4-12 weeks | Build and test the API | Implementation, testing, documentation |
| **Beta** | 2-8 weeks | Limited release for feedback | Early adopter testing, refinement |
| **Published** | 1-5+ years | Full production availability | Support, monitoring, minor updates |
| **Deprecated** | 6-12 months | Active but scheduled for removal | Migration support, usage monitoring |
| **Retired** | Permanent | No longer available | Return 410 Gone, archive documentation |

### API Lifecycle State Diagram

```
                         ┌─────────────────────────────────────┐
                         │         API LIFECYCLE               │
                         └─────────────────────────────────────┘

  ┌────────┐      ┌─────────────┐      ┌────────┐      ┌───────────┐
  │ DESIGN │─────▶│ DEVELOPMENT │─────▶│  BETA  │─────▶│ PUBLISHED │
  └────────┘      └─────────────┘      └────────┘      └─────┬─────┘
       │                │                   │                 │
       │                │                   │                 │
       ▼                ▼                   ▼                 │
  ┌─────────────────────────────────────────────┐            │
  │              Can be cancelled               │            │
  │           (return to Design or              │            │
  │            abandon project)                 │            │
  └─────────────────────────────────────────────┘            │
                                                             │
       ┌─────────────────────────────────────────────────────┘
       │
       │  Breaking change needed?
       │  Security issue?
       │  End of support?
       ▼
  ┌────────────┐                              ┌─────────┐
  │ DEPRECATED │─────────────────────────────▶│ RETIRED │
  └────────────┘                              └─────────┘
       │              6-12 months                  │
       │              notice period                │
       │                                           ▼
       │                                    ┌─────────────┐
       └───────────────────────────────────▶│  410 Gone   │
                                            │  responses  │
                                            └─────────────┘
```

Each stage has clear entry and exit criteria. APIs can only move forward through the lifecycle (no reverting from Published to Beta). The deprecation period gives clients time to migrate before retirement.

### Stage Transitions

```
┌─────────┐     ┌─────────────┐     ┌──────┐     ┌───────────┐
│ Design  │ ──▶ │ Development │ ──▶ │ Beta │ ──▶ │ Published │
└─────────┘     └─────────────┘     └──────┘     └─────┬─────┘
                                                       │
                                                       ▼
                                    ┌─────────┐     ┌────────────┐
                                    │ Retired │ ◀── │ Deprecated │
                                    └─────────┘     └────────────┘
```

### Stage Details

#### Design Stage
- Define resource models and endpoints
- Create OpenAPI specification
- Conduct API design review
- Plan versioning strategy
- Document expected consumers

#### Development Stage
- Implement API endpoints
- Write integration tests
- Create developer documentation
- Set up monitoring and alerting
- Configure security controls

#### Beta Stage
- Release to selected clients
- Gather feedback on usability
- Identify performance issues
- Refine based on real usage
- Finalize documentation

#### Published Stage
- Full production support
- Monitor usage patterns
- Apply security patches
- Add non-breaking features
- Maintain SLA commitments

#### Deprecated Stage
- Announce deprecation to clients
- Add deprecation headers to responses
- Provide migration guides
- Monitor migration progress
- Support clients during transition

#### Retired Stage
- Return 410 Gone for all requests
- Archive documentation
- Remove infrastructure (after monitoring period)
- Maintain audit records

---

## Versioning in Context

Versioning is one tool in lifecycle management—not a replacement for it. A new version creates a branch in your API's life. Both versions need care.

### When Versioning Applies

| Scenario | Action | Lifecycle Impact |
|----------|--------|------------------|
| Bug fix | Patch within version | No lifecycle change |
| New optional feature | Add within version | No lifecycle change |
| Breaking change needed | Create new version | Start deprecation of old version |
| Security vulnerability | Patch or emergency version | May bypass standard notice periods per security incident policy |

### Version and Lifecycle Relationship

```
v1 ─────────────────────────────────────────────────────▶
    Published ──▶ Deprecated ──▶ Retired

v2 ────────────────────────────────────────────────────────────▶
                  Published ──▶ (continues)
```

When you release v2:
1. v1 enters the **Deprecated** stage
2. Both versions run in parallel during migration
3. v1 moves to **Retired** after the deprecation period ends

For detailed versioning strategies, see [API Version Strategy](api-version-strategy.md).

---

## Deprecation Process

Deprecation signals that an API version or endpoint will be removed. A clear process protects you and your clients.

### Deprecation Timeline Standards

| API Type | Minimum Notice | Recommended Notice |
|----------|----------------|-------------------|
| Public APIs | 12 months | 18 months |
| Partner APIs | 6 months | 12 months |
| Internal APIs | 3 months | 6 months |

**Exceptions:**
- **Security vulnerabilities**: May require immediate deprecation with 30-day removal
- **Legal/compliance issues**: Timelines may be shortened as required
- **High-traffic endpoints**: Consider extended timelines of 18-24 months

### HTTP Deprecation Headers

Use standard HTTP headers to signal deprecation. Clients can detect these headers and alert developers.

#### Required Headers

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: true
Sunset: Sat, 30 Jun 2025 23:59:59 GMT
```

| Header | Purpose | Format |
|--------|---------|--------|
| `Deprecation` | Signals the endpoint is deprecated | `true` or RFC 9530 date |
| `Sunset` | When the endpoint will be removed | HTTP date format (RFC 7231) |

#### Recommended Headers

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: true
Sunset: Sat, 30 Jun 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
Warning: 299 - "API v1 deprecated. Migrate to v2 by June 30, 2025."
```

| Header | Purpose | Format |
|--------|---------|--------|
| `Link` | Points to replacement endpoint | URI with `rel="successor-version"` |
| `Warning` | Human-readable deprecation message | Code 299 with message text |

### Deprecation Response Body

Include deprecation info in response bodies for extra visibility:

```json
{
  "data": {
    "orderId": "ord-12345",
    "status": "shipped"
  },
  "_deprecation": {
    "deprecated": true,
    "sunsetDate": "2025-06-30",
    "message": "This endpoint is deprecated. Please migrate to /v2/orders.",
    "migrationGuide": "https://docs.example.com/migrate-to-v2",
    "successor": "/v2/orders"
  }
}
```

### OpenAPI Deprecation Marking

Mark deprecated endpoints in your OpenAPI specification:

```yaml
paths:
  /v1/orders:
    get:
      deprecated: true
      summary: List orders (DEPRECATED)
      description: |
        **Deprecated**: This endpoint will be removed on 2025-06-30.
        Use [GET /v2/orders](/v2/orders) instead.
        See [migration guide](https://docs.example.com/migrate-to-v2).
      x-sunset-date: "2025-06-30"
      x-successor: "/v2/orders"
```

For complete deprecation header specifications, see [Deprecation Policies Reference](../reference/versioning/deprecation-policies.md).

---

## Sunset Procedures

Sunsetting is the final phase of an API's life. A clear process prevents problems and keeps trust.

### Sunset Timeline

| Phase | Timing | Actions |
|-------|--------|---------|
| **Announcement** | Day 0 | Send deprecation notices, add headers |
| **Reminder 1** | 90 days before | Email all known consumers |
| **Reminder 2** | 60 days before | Escalate to high-usage clients |
| **Reminder 3** | 30 days before | Final warning, confirm readiness |
| **Warning Period** | 7 days before | Increase warning header frequency |
| **Soft Sunset** | Day of | Begin returning 410 to new clients |
| **Hard Sunset** | +7 days | Return 410 to all requests |
| **Removal** | +30 days | Remove infrastructure |

### Announcing Sunset

Include these elements in your sunset announcement:

1. **Sunset date**: Exact date and time (with timezone)
2. **Reason**: Why the API is being retired
3. **Replacement**: Link to successor API (if applicable)
4. **Migration guide**: Step-by-step instructions
5. **Support contacts**: How to get help during migration
6. **Timeline**: Key milestones and reminders

### Final Shutdown Steps

#### Step 1: Soft Sunset
Return 410 Gone to new clients while maintaining service for existing clients:

```http
HTTP/1.1 410 Gone
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/api-sunset",
  "title": "API Version Retired",
  "status": 410,
  "detail": "API v1 has been retired as of 2025-06-30. Please use v2.",
  "instance": "/v1/orders",
  "successor": {
    "uri": "/v2/orders",
    "documentation": "https://docs.example.com/v2"
  }
}
```

#### Step 2: Hard Sunset
Return 410 Gone to all requests:

```http
HTTP/1.1 410 Gone
Content-Type: application/problem+json
Cache-Control: no-cache

{
  "type": "https://api.example.com/problems/api-sunset",
  "title": "API Version Retired",
  "status": 410,
  "detail": "API v1 was retired on 2025-06-30. Migrate to v2 immediately.",
  "instance": "/v1/orders/123",
  "successor": {
    "uri": "/v2/orders/123",
    "documentation": "https://docs.example.com/v2"
  }
}
```

#### Step 3: Infrastructure Removal
After a monitoring period (typically 30 days):
- Archive access logs for compliance
- Remove API endpoints from gateway
- Decommission backend services
- Archive documentation (do not delete)

### Handling Late Clients

Some clients may still call retired endpoints. Handle these cases:

| Situation | Response | Action |
|-----------|----------|--------|
| Unknown client | 410 Gone | Standard sunset response |
| Known low-volume client | 410 Gone | Direct outreach to assist migration |
| Known high-volume client | Extend temporarily | Negotiate emergency timeline |
| Critical integration | Case-by-case | Executive escalation |

**How to help late clients:**
- Watch 410 response rates to find affected clients
- Use API keys or OAuth IDs to reach out directly
- Offer short extensions for valid cases
- Write down exceptions with clear end dates

---

## Migration Strategies

Help clients move to new API versions smoothly. Good support speeds up adoption.

### Migration Guide Structure

Every version migration should include:

1. **Summary of changes**: What is different between versions
2. **Breaking changes list**: Changes that require client updates
3. **Field mapping table**: Old fields to new fields
4. **Endpoint mapping**: Old endpoints to new endpoints
5. **Code examples**: Before and after request/response samples
6. **Testing recommendations**: How to validate migration
7. **Rollback instructions**: How to revert if needed

### Field Mapping Example

```yaml
# Migration: v1 → v2 Field Changes
mappings:
  - v1Field: "customer_name"
    v2Field: "customerName"
    change: "Renamed to camelCase"
    
  - v1Field: "order_date"
    v2Field: "createdAt"
    change: "Renamed for consistency"
    
  - v1Field: "total"
    v2Field: "orderTotal.amount"
    change: "Moved to nested object"
    
  - v1Field: "currency"
    v2Field: "orderTotal.currency"
    change: "Moved to nested object"
    
  - v1Field: "status"
    v2Field: "status"
    change: "Values changed (see table below)"
    valueMapping:
      "OPEN": "pending"
      "CLOSED": "completed"
      "CANCELED": "cancelled"
```

### Parallel Running

Run both versions simultaneously during migration:

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway                          │
├─────────────────────────────────────────────────────────┤
│  /v1/* ──▶ Orders Service v1 (deprecated)               │
│  /v2/* ──▶ Orders Service v2 (current)                  │
└─────────────────────────────────────────────────────────┘
```

**Keep in mind:**
- Allocate resources for both versions
- Keep data in sync between versions
- Monitor both versions
- Use separate deployment pipelines

### Client Onboarding to New Versions

Support clients through the migration process:

| Phase | Duration | Activities |
|-------|----------|------------|
| **Awareness** | Week 1-2 | Announce new version, share documentation |
| **Exploration** | Week 3-4 | Sandbox access, office hours, Q&A |
| **Development** | Week 5-8 | Client implements changes, support available |
| **Testing** | Week 9-10 | Integration testing, validation support |
| **Rollout** | Week 11-12 | Production migration, monitoring |

---

## Client Communication

Clear messages throughout the lifecycle build trust and cut support costs.

### Communication Templates

#### Deprecation Announcement

```
Subject: [Action Required] API v1 Deprecation Notice - Migrate by {DATE}

Dear API Consumer,

We are writing to inform you that API v1 will be deprecated on {DATE} and 
retired on {SUNSET_DATE}.

WHAT'S CHANGING
- API v1 endpoints will stop accepting requests on {SUNSET_DATE}
- All clients must migrate to API v2 before this date

WHY WE'RE MAKING THIS CHANGE
{Brief explanation of benefits of v2 or reasons for deprecation}

WHAT YOU NEED TO DO
1. Review the migration guide: {MIGRATION_GUIDE_URL}
2. Update your integration to use v2 endpoints
3. Test your changes in our sandbox environment
4. Deploy to production before {SUNSET_DATE}

TIMELINE
- {DATE}: Deprecation begins, v1 responses include deprecation headers
- {DATE - 90 days}: First reminder
- {DATE - 30 days}: Final reminder
- {SUNSET_DATE}: v1 retired, returns 410 Gone

NEED HELP?
- Documentation: {DOCS_URL}
- Migration guide: {MIGRATION_GUIDE_URL}
- Support: {SUPPORT_EMAIL}
- Office hours: {OFFICE_HOURS_INFO}

Thank you for your continued partnership.

{TEAM_NAME}
```

#### Timeline Reminder (30 Days)

```
Subject: [Urgent] 30 Days Until API v1 Sunset - {SUNSET_DATE}

Dear API Consumer,

This is a reminder that API v1 will be retired in 30 days on {SUNSET_DATE}.

OUR RECORDS SHOW
- Your application made {REQUEST_COUNT} requests to v1 endpoints last week
- Affected endpoints: {ENDPOINT_LIST}

IF YOU HAVEN'T STARTED MIGRATION
Please begin immediately. Our team is available to help:
- Migration guide: {MIGRATION_GUIDE_URL}
- Support: {SUPPORT_EMAIL}

IF YOU'VE ALREADY MIGRATED
Please verify you have no remaining v1 traffic in production.

WHAT HAPPENS ON {SUNSET_DATE}
All v1 endpoints will return HTTP 410 Gone. Requests will fail.

{TEAM_NAME}
```

#### Final Notice (7 Days)

```
Subject: [Critical] 7 Days Until API v1 Shutdown - {SUNSET_DATE}

Dear API Consumer,

API v1 will be retired in 7 days on {SUNSET_DATE}.

CURRENT V1 USAGE FROM YOUR APPLICATION
- Requests in past 24 hours: {REQUEST_COUNT}
- Endpoints still in use: {ENDPOINT_LIST}

IMMEDIATE ACTION REQUIRED
If you see usage above, your application will break on {SUNSET_DATE}.
Contact us immediately if you need assistance: {SUPPORT_EMAIL}

{TEAM_NAME}
```

### Communication Channels

| Channel | Use Case | Timing |
|---------|----------|--------|
| Email | Formal announcements, reminders | All major milestones |
| Developer portal | Documentation, banners | Continuous |
| API responses | Deprecation headers | Every response |
| Status page | Sunset events | Day of sunset |
| Support tickets | Individual outreach | High-usage clients |

---

## Monitoring Deprecated APIs

Track usage of deprecated endpoints to manage the sunset process well.

### Key Metrics

| Metric | Purpose | Target |
|--------|---------|--------|
| Daily request count | Track overall usage decline | Trending to zero |
| Unique clients | Identify who needs to migrate | All clients migrated |
| Error rate | Ensure quality during deprecation | Below normal SLA |
| Response time | Maintain performance | Within SLA |

### Usage Tracking Dashboard

Monitor these data points:

```yaml
deprecated_api_metrics:
  - name: "v1_daily_requests"
    description: "Total requests to v1 endpoints per day"
    alert_threshold: 1000  # Alert if still high near sunset
    
  - name: "v1_unique_clients"
    description: "Unique API keys calling v1 per day"
    alert_threshold: 10  # Alert if clients remain
    
  - name: "v1_endpoint_breakdown"
    description: "Requests per deprecated endpoint"
    dimensions: ["endpoint", "client_id"]
    
  - name: "migration_progress"
    description: "Percentage of clients migrated to v2"
    calculation: "v2_unique_clients / total_unique_clients * 100"
```

### Finding Affected Clients

Use API keys or OAuth IDs to:
- List all clients using deprecated endpoints
- Count each client's request volume
- Contact high-volume clients first
- Track migration status per client

### Alerting Rules

| Alert | Condition | Action |
|-------|-----------|--------|
| High usage near sunset | >1000 req/day at 30 days | Escalate to management |
| New client on deprecated API | New API key using v1 | Block or warn immediately |
| Migration stalled | No decline in 2 weeks | Investigate blockers |
| Client still active at sunset | Any requests on sunset day | Direct outreach |

---

## Rollback Planning

Sometimes migrations go wrong. Plan for rollback before you need it.

### When to Rollback

Consider rollback when:
- Critical bugs discovered in new version
- Performance degradation affects clients
- Data integrity issues emerge
- Security vulnerability in new version

### Rollback Checklist

```yaml
rollback_checklist:
  before_migration:
    - Document current state of v1
    - Create backup of v1 configuration
    - Test rollback procedure in staging
    - Define rollback triggers and thresholds
    - Assign rollback decision authority
    
  during_migration:
    - Monitor error rates closely
    - Watch for client complaints
    - Track performance metrics
    - Keep v1 infrastructure running
    
  rollback_decision:
    - Assess scope of issue
    - Estimate time to fix forward vs. rollback
    - Consider client impact
    - Document decision rationale
    
  executing_rollback:
    - Communicate to affected clients
    - Revert gateway routing to v1
    - Verify v1 is serving correctly
    - Investigate root cause
    - Plan remediation
```

### Post-Rollback Actions

After rolling back:
1. **Communicate**: Notify clients of the rollback and revised timeline
2. **Investigate**: Determine root cause of the failure
3. **Remediate**: Fix the issue in the new version
4. **Retest**: Validate the fix thoroughly
5. **Reschedule**: Set new migration timeline with lessons learned
6. **Document**: Record what happened and how to prevent recurrence

---

## Related Resources

- [API Version Strategy](api-version-strategy.md) - Versioning patterns and strategies
- [Deprecation Policies Reference](../reference/versioning/deprecation-policies.md) - Detailed deprecation specifications
- [Migration Examples](../examples/versioning/migration-examples.md) - Complete migration scenarios

---

## Summary

Good API lifecycle management needs:

1. **Clear stages**: Define and share lifecycle stages
2. **Standard timelines**: Use consistent deprecation periods
3. **Machine-readable signals**: Use HTTP headers for deprecation
4. **Active communication**: Keep clients informed
5. **Migration support**: Help clients with clear guides
6. **Usage monitoring**: Track deprecated API usage
7. **Rollback plans**: Prepare for when things go wrong

These practices work with any REST API framework.
