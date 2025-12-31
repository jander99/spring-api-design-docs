# API Governance

> **Reading Guide**
> 
> **Reading Time:** 9 minutes | **Level:** Intermediate
> 
> **Prerequisites:** Basic REST API knowledge, familiarity with API design concepts  
> **Key Topics:** Review processes, quality gates, change management, compliance
> 
> **Note:** This document contains many tables and templates. Grade level metrics reflect structured content.

## Overview

API governance helps teams build consistent, secure, and well-documented APIs. It balances speed with quality. Good governance prevents fragmented APIs that confuse consumers.

This document covers review processes, quality gates, and change management. Use the checklists and templates in your workflow.

## Why Governance Matters

Without governance, teams create APIs on their own. Each team makes different choices about naming, errors, and security. Consumers must learn new patterns for each API. This makes integration harder.

**Benefits of API governance:**
- **Consistency**: Consumers learn one set of patterns
- **Quality**: Standards prevent common mistakes
- **Security**: Systematic review catches vulnerabilities
- **Discoverability**: Centralized catalog helps teams find existing APIs
- **Maintainability**: Consistent patterns simplify long-term support

**Balancing speed and consistency:**
- Apply lightweight reviews for minor changes
- Reserve deep reviews for new APIs and breaking changes
- Automate checks where possible
- Provide clear standards so teams can self-serve

## API Design Review Process

### Review Stages

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Design    │───▶│   Review    │───▶│   Approve   │───▶│   Deploy    │
│   Draft     │    │   Process   │    │   & Sign    │    │   to Prod   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼
  OpenAPI spec      Automated +        Formal sign-off    Production
  first draft       manual review      from reviewers     release
```

### Stage 1: Design Draft

Before review, prepare these artifacts:
- OpenAPI specification (3.1+)
- API design rationale document
- Consumer use cases
- Security considerations
- Data model diagrams (if complex)

### Stage 2: Review Process

**Automated checks (run first):**
- OpenAPI linting with Spectral
- Breaking change detection
- Security scanning
- Naming convention validation

**Manual review (after automated checks pass):**
- Architecture review for new APIs
- Security review for sensitive data
- Domain expert review for business logic

### Stage 3: Approval and Sign-off

| Change Type | Required Approvers | SLA |
|-------------|-------------------|-----|
| New API | API architect + Security + Domain owner | 5 business days |
| Breaking change | API architect + All affected consumers | 10 business days |
| Non-breaking change | Team lead | 2 business days |
| Documentation only | Any reviewer | 1 business day |

### Stage 4: Deploy to Production

After approval:
- Update API catalog entry
- Deploy to production
- Notify consumers of changes
- Update changelog

## Design Review Checklist

Use this checklist during manual reviews. Check each item or mark as not applicable.

### Resource Design

| Check | Status | Notes |
|-------|--------|-------|
| Resource names are plural nouns | [ ] | Example: `/orders` not `/order` |
| URLs use kebab-case | [ ] | Example: `/order-items` not `/orderItems` |
| Resources represent business entities | [ ] | Not implementation details |
| Appropriate HTTP methods used | [ ] | GET, POST, PUT, PATCH, DELETE |
| Collection and item endpoints exist | [ ] | `/orders` and `/orders/{id}` |
| Nested resources limited to one level | [ ] | `/orders/{id}/items` is OK |

### Request/Response Design

| Check | Status | Notes |
|-------|--------|-------|
| Request bodies use JSON | [ ] | Content-Type: application/json |
| Response bodies use JSON | [ ] | Consistent envelope structure |
| Pagination on collection endpoints | [ ] | Cursor or offset-based |
| Filtering uses query parameters | [ ] | `?status=active&type=premium` |
| Field names use camelCase | [ ] | `customerId` not `customer_id` |
| Dates use ISO 8601 format | [ ] | `2024-01-15T10:30:00Z` |

### Error Handling

| Check | Status | Notes |
|-------|--------|-------|
| Errors use RFC 9457 format | [ ] | `application/problem+json` |
| Appropriate HTTP status codes | [ ] | 400 for client, 500 for server |
| Error messages are actionable | [ ] | Tell consumer how to fix |
| Validation errors list all fields | [ ] | Not just first error |
| No sensitive data in errors | [ ] | No stack traces, internal paths |

### Security

| Check | Status | Notes |
|-------|--------|-------|
| Authentication required | [ ] | Bearer token or API key |
| Authorization checks present | [ ] | Resource-level access control |
| Sensitive data encrypted | [ ] | HTTPS only, no sensitive query params |
| Rate limiting configured | [ ] | Protect against abuse |
| Input validation present | [ ] | Length limits, format checks |
| CORS configured correctly | [ ] | Restrict to known origins |

### Versioning

| Check | Status | Notes |
|-------|--------|-------|
| Version strategy documented | [ ] | URL path, header, or media type |
| Breaking changes identified | [ ] | Field removal, type changes |
| Deprecation timeline defined | [ ] | Minimum 6-month notice |
| Migration guide provided | [ ] | For breaking changes |

### Documentation

| Check | Status | Notes |
|-------|--------|-------|
| OpenAPI spec complete | [ ] | All endpoints, parameters, responses |
| Examples provided | [ ] | Request and response examples |
| Error responses documented | [ ] | All possible error codes |
| Authentication documented | [ ] | How to obtain and use tokens |
| Rate limits documented | [ ] | Limits and retry guidance |

## Quality Gates

Quality gates are checkpoints APIs must pass. Automate these checks when possible.

### Automated Quality Gates

Run these checks in CI/CD pipelines:

**Gate 1: OpenAPI Validation**
```yaml
# Spectral configuration for quality gate
rules:
  # Must pass - blocks deployment
  operation-description: error
  operation-operationId: error
  paths-kebab-case: error
  info-contact: error
  
  # Should pass - warns but allows deployment
  response-example: warn
  request-body-example: warn
```

**Gate 2: Breaking Change Detection**
```
Compares current spec to baseline:
- Removed endpoints: BLOCK
- Removed required fields: BLOCK
- Changed field types: BLOCK
- Added required fields on request: BLOCK
- Added optional fields: PASS
- New endpoints: PASS
```

**Gate 3: Security Scan**
```
Checks for common vulnerabilities:
- Authentication defined: REQUIRED
- Sensitive data exposure: BLOCK
- Injection vulnerabilities: BLOCK
- Rate limiting: WARN if missing
```

### Manual Quality Gates

| Gate | When Required | Reviewer | Criteria |
|------|--------------|----------|----------|
| Architecture Review | New APIs, major changes | API Architect | Follows patterns, appropriate scope |
| Security Review | Sensitive data, auth changes | Security Team | No vulnerabilities, proper controls |
| Domain Review | Business logic changes | Domain Owner | Correct business rules |
| Consumer Impact | Breaking changes | Affected Teams | Migration plan acceptable |

### Quality Gate Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                        QUALITY GATE PIPELINE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │
│  │ OpenAPI  │──▶│ Breaking │──▶│ Security │──▶│ Manual   │        │
│  │ Linting  │   │ Changes  │   │   Scan   │   │ Review   │        │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘        │
│       │              │              │              │               │
│       ▼              ▼              ▼              ▼               │
│    PASS/FAIL     PASS/FAIL     PASS/WARN     APPROVE/REJECT       │
│                                                                     │
│  All gates must PASS before production deployment                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Change Management

### Types of Changes

**Non-breaking changes** (safe to deploy):
- Adding new endpoints
- Adding optional request fields
- Adding response fields
- Adding new enum values (response only)
- Relaxing validation rules
- Performance improvements

**Breaking changes** (require migration plan):
- Removing endpoints
- Removing or renaming fields
- Changing field types
- Adding required request fields
- Removing enum values
- Tightening validation rules
- Changing authentication

### Approval Requirements by Change Type

| Change Category | Examples | Approval Required | Notice Period |
|----------------|----------|-------------------|---------------|
| Patch (bug fix) | Fix typo in error message | Team lead | None |
| Minor (additive) | New endpoint, new field | Team lead | None |
| Major (breaking) | Remove field, change type | Architect + consumers | 6 months |
| Security (urgent) | Fix vulnerability | Security team | None (hotfix) |

### Breaking Change Process

1. **Announce deprecation**: Add `deprecated: true` to OpenAPI spec
2. **Document migration**: Provide migration guide with examples
3. **Notify consumers**: Email, changelog, API portal notification
4. **Support period**: Maintain deprecated version for 6+ months
5. **Final warning**: Send reminder 30 days before removal
6. **Remove**: Delete deprecated functionality

### Change Request Template

```yaml
# API Change Request

## Overview
change_type: major | minor | patch
api_name: Order Service API
affected_endpoints:
  - POST /orders
  - GET /orders/{id}

## Description
summary: Add shipping options to order creation
rationale: Support multiple carriers for international shipping
consumer_impact: Existing integrations continue working unchanged

## Breaking Changes
is_breaking: false
breaking_details: null
migration_guide: null

## Timeline
proposed_date: 2024-03-15
deprecation_date: null  # For breaking changes
removal_date: null      # For breaking changes

## Approvals
requested_by: Jane Smith
team: Order Platform
approvers:
  - name: API Architect
    status: pending
  - name: Security Team
    status: pending
```

## Compliance Requirements

### Security Review Requirements

All APIs must complete security review before production deployment.

**Security review covers:**
- Authentication and authorization implementation
- Data encryption (in transit and at rest)
- Input validation and sanitization
- Rate limiting and abuse prevention
- Logging of security events
- Secrets management

**Security review triggers:**
- New API creation
- Authentication changes
- New sensitive data handling
- Third-party integrations
- Public API exposure

### Data Privacy Considerations

| Data Category | Requirements | Review Level |
|--------------|--------------|--------------|
| Public data | Standard review | Team lead |
| Internal data | Privacy review | Privacy team |
| Personal data (PII) | Full privacy review | Privacy + Legal |
| Financial data | Compliance review | Compliance + Security |
| Health data | HIPAA review | Compliance + Legal |

**Privacy checklist:**
- [ ] Data minimization: Only collect required fields
- [ ] Purpose limitation: Document why data is needed
- [ ] Retention policy: Define how long data is kept
- [ ] Access controls: Limit who can access data
- [ ] Consent tracking: Document user consent where required
- [ ] Right to deletion: Support data deletion requests

### Audit Logging Requirements

APIs must log security-relevant events:

```yaml
required_audit_events:
  - authentication_success
  - authentication_failure
  - authorization_denied
  - data_access (for sensitive data)
  - data_modification
  - admin_actions

audit_log_fields:
  - timestamp (ISO 8601)
  - event_type
  - user_id
  - resource_accessed
  - action_taken
  - result (success/failure)
  - client_ip
  - correlation_id
```

## Documentation Standards

Every API requires these documentation elements:

### Required Documentation

| Document | Purpose | Owner | Review Frequency |
|----------|---------|-------|------------------|
| OpenAPI Specification | Technical reference | Development team | Every release |
| Getting Started Guide | Onboarding new consumers | Developer relations | Quarterly |
| Authentication Guide | How to authenticate | Security team | On auth changes |
| Changelog | Version history | Development team | Every release |
| Error Reference | All error codes | Development team | On error changes |
| Rate Limit Guide | Usage limits | Platform team | On limit changes |

### OpenAPI Completeness Checklist

- [ ] API info section complete (title, version, contact, license)
- [ ] Server URLs for all environments
- [ ] All endpoints documented
- [ ] All parameters documented with descriptions
- [ ] All request bodies with schemas and examples
- [ ] All response codes with schemas and examples
- [ ] Security schemes defined
- [ ] Tags for logical grouping

### Documentation Quality Standards

| Criterion | Requirement |
|-----------|-------------|
| Reading level | High school level (Grade 12 or below) |
| Examples | Every endpoint has working examples |
| Currency | Updated within 1 week of API changes |
| Accessibility | Meets WCAG 2.1 AA standards |
| Searchability | All content indexed in API portal |

## API Catalog and Registry

### Catalog Entry Requirements

Every API must register in the central catalog:

```yaml
# API Catalog Entry Template
api_name: Order Service API
api_id: order-service-v1
version: 1.2.0
status: production  # draft | beta | production | deprecated | retired

ownership:
  team: Order Platform
  team_lead: Jane Smith
  contact_email: order-platform@company.com
  slack_channel: "#order-platform"

classification:
  visibility: internal  # public | partner | internal
  data_sensitivity: confidential
  business_domain: Commerce

endpoints:
  production: https://api.company.com/orders/v1
  staging: https://staging-api.company.com/orders/v1
  documentation: https://developer.company.com/apis/orders

dependencies:
  - Payment Service API v2
  - Inventory Service API v1

consumers:
  - Mobile App Team
  - Web Storefront Team
  - Partner Integration Team

metrics:
  requests_per_day: 1.2M
  p99_latency_ms: 150
  error_rate: 0.02%
  
created_date: 2023-01-15
last_updated: 2024-02-20
deprecation_date: null
retirement_date: null
```

### API Lifecycle Status

| Status | Description | Actions Allowed |
|--------|-------------|-----------------|
| Draft | In design phase | Design changes freely |
| Beta | Testing with select consumers | Breaking changes with notice |
| Production | Generally available | Non-breaking changes only |
| Deprecated | Scheduled for retirement | Bug fixes only |
| Retired | No longer available | None |

### Catalog Maintenance

- **Weekly**: Automated health checks, update metrics
- **Monthly**: Review deprecated APIs, contact owners
- **Quarterly**: Audit all catalog entries for accuracy
- **Yearly**: Review API portfolio, identify consolidation opportunities

## Exception Process

Sometimes teams must deviate from standards. The exception process tracks these cases.

### When to Request an Exception

- Technical constraint prevents compliance
- Business deadline requires faster delivery
- Legacy system integration requires different patterns
- Third-party API requires different format

### Exception Request Template

```yaml
# API Standards Exception Request

## Request Details
api_name: Legacy Payment Gateway Integration
requesting_team: Payments Team
requested_by: John Doe
request_date: 2024-02-15

## Exception Details
standard_violated: Error Response Format (RFC 9457)
current_requirement: All errors use application/problem+json
requested_deviation: Use legacy XML error format

## Justification
reason: |
  Third-party payment gateway returns XML errors.
  Transforming to JSON adds latency and complexity.
  Gateway vendor has no plans to support JSON.

alternatives_considered:
  - Transform XML to JSON (rejected: adds 50ms latency)
  - Request vendor change (rejected: no vendor support)
  - Use different vendor (rejected: 6-month migration)

## Risk Assessment
security_impact: None - error format doesn't affect security
consumer_impact: Consumers must handle XML errors for this API only
maintenance_impact: Additional error handling code required

## Mitigation
proposed_mitigation: |
  Document XML error format in API specification.
  Provide client library that transforms to standard format.
  Add monitoring for error rate increases.

## Timeline
exception_duration: permanent | temporary
if_temporary_end_date: null
review_date: 2025-02-15  # Annual review

## Approvals
api_architect:
  name: null
  decision: pending
  date: null
security_team:
  name: null
  decision: pending
  date: null
```

### Exception Approval Matrix

| Exception Type | Approvers | Validity Period |
|---------------|-----------|-----------------|
| Naming conventions | API Architect | 1 year |
| Error format | API Architect + Security | 1 year |
| Authentication | Security Team + CISO | 6 months |
| Data privacy | Privacy + Legal | 6 months |
| Breaking change process | API Architect + VP Engineering | 1 year |

### Exception Tracking

- All exceptions logged in governance system
- Exceptions reviewed at expiration
- Exception count tracked per team (indicator of adoption issues)
- Recurring exceptions trigger standards review

## Implementation Recommendations

### Getting Started

1. **Start small**: Begin with automated linting before adding manual reviews
2. **Document existing APIs**: Create catalog entries for current APIs
3. **Train teams**: Share standards and review process with all developers
4. **Measure adoption**: Track compliance rate over time

### Scaling Governance

| Team Size | Recommended Approach |
|-----------|---------------------|
| 1-5 teams | Lightweight: automated checks + peer review |
| 5-20 teams | Standard: add API architect reviews |
| 20+ teams | Full: dedicated API governance team |

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Standards compliance | 90%+ | Automated linting pass rate |
| Review turnaround | < 3 days | Time from request to decision |
| Consumer satisfaction | 4.0+ / 5.0 | API consumer surveys |
| Breaking change incidents | < 2/year | Unplanned breaking changes |
| Catalog accuracy | 95%+ | Quarterly audit results |

## Related Resources

- **[OpenAPI Standards](openapi-standards.md)** - Specification requirements
- **[Documentation Testing](documentation-testing.md)** - Automated validation
- **[Documentation Tools](documentation-tools-and-integration.md)** - Tooling and CI/CD
- **[Security Standards](../security/security-standards.md)** - Security requirements
- **[API Version Strategy](../foundations/api-version-strategy.md)** - Versioning approach

## Quick Reference

### Review Checklist Summary

Before submitting for review:
- [ ] OpenAPI spec passes Spectral linting
- [ ] No breaking changes (or migration plan provided)
- [ ] Security review scheduled (if required)
- [ ] Documentation complete
- [ ] Catalog entry created or updated

### Approval Quick Reference

| Change | Approver | SLA |
|--------|----------|-----|
| New API | Architect + Security | 5 days |
| Breaking change | Architect + Consumers | 10 days |
| Non-breaking | Team lead | 2 days |
| Docs only | Any reviewer | 1 day |
