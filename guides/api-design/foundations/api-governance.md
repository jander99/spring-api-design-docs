# API Governance

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 11 minutes | **🟢 Level:** Accessible
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Authentication, Data, Architecture
> 
> **📊 Complexity:** 10.8 grade level • 0.6% technical density • fairly difficult
>
> **Note:** Concrete examples throughout. Short sentences. Active voice.

## Quick Reference

**What is API Governance?** Rules and processes that keep APIs consistent across your organization.

**Key Benefits:**
- Consistent API quality
- Faster development
- Better collaboration
- Fewer breaking changes

**Core Activities:**
- Set design standards
- Review API designs
- Automate validation
- Track compliance

## What is API Governance?

Think of API governance like building codes for houses. Building codes ensure:
- Electrical work is safe
- Plumbing meets standards
- Structures are sound
- Renovations follow rules

API governance does the same for your APIs. It ensures:
- Security works correctly
- Errors use standard formats
- URLs follow patterns
- Changes don't break clients

**Example:** Without governance, Team A returns errors like this:

```json
{
  "error": "bad request"
}
```

Team B returns errors like this:

```json
{
  "message": "Invalid input",
  "code": 400
}
```

Clients must handle two different formats. That wastes developer time.

With governance, all teams use RFC 7807:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Customer ID is required"
}
```

Now clients handle errors the same way everywhere.

## Overview

API governance defines how you create and manage APIs. It sets rules and processes. These keep APIs consistent and high quality.

Good governance balances two needs:
- Enforce standards for consistency
- Give teams freedom to move fast

This guide focuses on processes and standards. It does not prescribe specific tools. The patterns work across teams and technologies.

## Core Governance Principles

### 1. Design-First Approach

Design APIs before you write code.

**Why?** Specs are easier to change than code.

**How to do it:**
- Create OpenAPI specs first
- Review designs with stakeholders
- Test with mock servers
- Document design decisions

**Example:** Write this spec before coding:

```yaml
paths:
  /customers/{id}:
    get:
      summary: Get customer by ID
      responses:
        '200':
          description: Customer found
        '404':
          description: Customer not found
```

Then build code to match the spec.

### 2. Consistent Standards

Use the same patterns everywhere.

**Apply standards to:**
- Resource naming (use plural nouns)
- Error handling (use RFC 7807)
- Security (use OAuth 2.0)
- Versioning (use URI versioning)

**Example:** All teams use `/v1/customers` not `/customer` or `/api/v1/Customer`.

### 3. Federated Ownership

Central teams set standards. Product teams own their APIs.

**Division of responsibility:**
- **Central team**: Define standards, provide tools, review designs
- **Product teams**: Build APIs, write tests, deploy code
- **Shared**: Review process, learning sessions, pattern library

**Example:** Central team requires RFC 7807 errors. Product teams implement error handling in their services.

### 4. Quality Gates

Check quality at key points.

**Four gates:**
- **Design review**: Before coding starts
- **Code review**: During development
- **Pre-production**: Before deployment
- **Post-release**: After going live

**Example:** At design review, check if the API follows naming standards. At code review, check if tests exist. At pre-production, check if monitoring is configured.

## Design Standards Enforcement

### Standard Categories

Organize standards into three levels.

#### Required Standards

All APIs must follow these:

- Security (OAuth 2.0 authentication)
- Error formats (RFC 7807)
- Versioning (URI-based like `/v1/`)
- Pagination (page-based or cursor-based)
- HTTP status codes (200, 404, 500, etc.)

**Result:** Non-compliance blocks deployment.

#### Recommended Standards

Follow these unless you have a good reason not to:

- Resource naming (plural nouns)
- Query parameters (snake_case)
- Response envelopes (consistent structure)
- Filtering and sorting (standard params)
- Rate limiting (standard headers)

**Result:** Need approval to skip.

#### Optional Standards

Use these for specific use cases:

- Streaming APIs (Server-Sent Events)
- Bulk operations (batch endpoints)
- WebSockets (real-time data)
- GraphQL (federation patterns)

**Result:** Guidance available if needed.

### Standards Documentation

Document each standard with five parts.

**Template:**

1. **Rationale**: Why this exists
2. **Requirements**: What teams must do
3. **Examples**: Correct usage
4. **Anti-patterns**: Common mistakes
5. **Exceptions**: When to deviate

**Example standard:**

```
Standard: Error Response Format
Category: Required

Rationale: 
Clients can parse errors the same way everywhere.

Requirements:
- Use RFC 7807 Problem Details format
- Set Content-Type to application/problem+json
- Include type, title, status, and detail fields
- Add instance and custom fields if helpful

Example:
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Customer ID is required",
  "instance": "/v1/orders/12345"
}

Anti-patterns:
- Using plain text error messages
- Returning different formats from different endpoints
- Omitting status codes

Exceptions:
- Legacy APIs (v1) can keep old formats until sunset
- Must transition by Q2 2026
```

### Enforcement Mechanisms

#### Automated Validation

Tools check APIs automatically.

**What to automate:**
- OpenAPI linting (Spectral checks specs)
- Schema validation (responses match specs)
- Contract testing (Pact verifies contracts)
- Security scanning (OWASP checks vulnerabilities)

**Example:** Spectral fails the build if error responses don't use RFC 7807.

#### Manual Review

Humans check complex standards.

**What to review manually:**
- Design decisions (does this API make sense?)
- Architecture fit (does it match our patterns?)
- Security implementation (is auth correct?)
- Documentation quality (can developers understand it?)

**Example:** Architects review if a new API should use REST or events.

#### Continuous Monitoring

Watch production APIs.

**What to monitor:**
- Runtime validation (responses match schemas)
- Performance (response times meet SLAs)
- Security (unauthorized access attempts)
- Usage (which endpoints get called most)

**Example:** Alert if error rate exceeds 1% for any endpoint.

## API Review Process

### Review Stages

Review APIs at four key points.

#### 1. Design Review (Before Coding)

**When:** Before writing code

**Who attends:**
- API designer
- Architect
- Security rep
- Potential consumers

**What to check:**
- Resource naming (follows standards?)
- Request/response formats (correct?)
- Error handling (uses RFC 7807?)
- Security (OAuth 2.0 configured?)
- Pagination (which pattern?)
- Versioning (URI-based?)

**What to bring:**
- OpenAPI spec
- Design rationale
- Example flows
- Security assessment

**Exit criteria:**
- Spec meets required standards
- Security approved
- Consumers needs met
- Architecture approved

#### 2. Implementation Review (During Development)

**When:** During coding

**Who attends:**
- Development team
- Code reviewers
- QA team

**What to check:**
- Code matches spec
- Error handling complete
- Security implemented correctly
- Tests cover key scenarios
- Documentation accurate

**What to bring:**
- Source code
- Unit and integration tests
- Updated OpenAPI spec
- Implementation notes

**Exit criteria:**
- Automated checks pass
- Test coverage meets threshold (80%+)
- No critical security issues
- Documentation complete

#### 3. Pre-Production Review (Before Deploy)

**When:** Before production deployment

**Who attends:**
- Product owner
- Operations team
- Security team
- Architecture team

**What to check:**
- Meets business requirements
- Monitoring configured
- Deployment process validated
- Rollback plan documented
- Rate limiting configured

**What to bring:**
- Deployment plan
- Monitoring setup
- Runbook
- Load test results

**Exit criteria:**
- Load tests pass
- Dashboards operational
- Deployment automated
- Rollback tested

#### 4. Post-Release Review (After Launch)

**When:** 30-60 days after launch

**Who attends:**
- Product owner
- Development team
- Operations team
- API consumers

**What to check:**
- Usage matches expectations
- Performance meets SLAs
- Error rates acceptable
- Consumer feedback positive

**What to bring:**
- Usage metrics
- Performance data
- Error analytics
- Consumer feedback

**Exit criteria:**
- SLAs met
- No critical issues
- Documentation accurate
- Lessons documented

### Review Templates

Use checklists for consistency.

**Design Review Checklist:**

- [ ] OpenAPI spec complete and valid
- [ ] Resource naming follows standards
- [ ] Errors use RFC 7807
- [ ] Security defined
- [ ] Pagination documented
- [ ] Breaking change policy clear
- [ ] Deprecation timeline set (if needed)
- [ ] Consumer feedback gathered

**Implementation Review Checklist:**

- [ ] Code matches OpenAPI spec
- [ ] All endpoints tested
- [ ] Error handling complete
- [ ] Security implemented
- [ ] Documentation accurate
- [ ] Logging adequate
- [ ] Performance tested

## Breaking Change Policies

### What Constitutes a Breaking Change

#### Always Breaking

These changes always break clients:
- Remove an endpoint
- Remove a response field
- Rename a field or endpoint
- Change field data types
- Add required request fields
- Change authentication
- Change error format

**Example:** Renaming `customer_id` to `customerId` breaks existing clients.

#### Sometimes Breaking

These changes may break clients:
- Change validation rules (stricter rules reject valid requests)
- Add enum values (strict clients may reject new values)
- Change status codes (clients may check specific codes)

**Example:** Changing email validation to require `.com` breaks clients using `.org`.

#### Never Breaking

These changes are safe:
- Add optional request fields
- Add response fields
- Add new endpoints
- Add optional query parameters
- Improve error messages

**Example:** Adding optional `phone` field to customer doesn't break existing clients.

### Breaking Change Process

Follow these five phases.

#### 1. Justify the Change

Answer these questions:
- What business need drives this?
- What technical limits exist?
- How will clients be affected?
- What alternatives exist?

**Example:** "We need to split `name` into `first_name` and `last_name` for internationalization."

#### 2. Communicate

Tell everyone at least 30 days before.

**Communication methods:**
- Email known consumers
- Add deprecation notices to docs
- Add HTTP headers to responses
- Post to API portal dashboard

**Example headers:**

```http
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
```

#### 3. Help Migration

Make it easy to switch.

**Provide:**
- Step-by-step migration guide
- Before and after code examples
- Migration scripts or tools
- Support during transition

**Run both versions:**
- Public APIs: 12 months
- Partner APIs: 6 months
- Internal APIs: 3 months

#### 4. Deprecate

Phase out the old version.

**Actions:**
- Track who still uses old version
- Contact remaining users
- Offer help to migrate
- Set firm end date

**Example:** "Only 5 clients still use v1. Contact them directly."

#### 5. Remove

Turn off the old version safely.

**Return 410 Gone:**

```http
HTTP/1.1 410 Gone
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/endpoint-removed",
  "title": "Endpoint Removed",
  "status": 410,
  "detail": "This endpoint was removed on Dec 31, 2025",
  "instance": "/v1/orders",
  "successorVersion": "/v2/orders"
}
```

Keep code ready for emergency rollback.

### Emergency Breaking Changes

Use for critical security or data issues only.

**Fast process:**
1. Assess urgency (is this critical?)
2. Notify immediately (email all consumers)
3. Provide workaround (temporary fix)
4. Use accelerated timeline (days not months)
5. Document what happened (post-mortem)

**Example:** Security vulnerability requires immediate API change. Notify all clients today. Deploy fix tomorrow.

## Consistency Enforcement Across Teams

### Central Governance Structure

Create an API Governance Board.

**Who sits on the board:**
- Architecture team rep
- Security team rep
- Operations team rep
- Product experts
- Developer advocates

**What the board does:**
- Define API standards
- Review major API designs
- Approve standard exceptions
- Help teams collaborate
- Monitor API quality

**Meeting schedule:**
- Monthly reviews (planned designs)
- Ad-hoc reviews (urgent needs)
- Quarterly retrospectives (improve process)

### Standards Evolution

Standards must evolve.

#### Propose Changes

Any team can suggest changes.

**Proposal includes:**
- Why change is needed
- Example implementation
- Impact assessment

**Example:** "We should allow cursor pagination. Page-based pagination doesn't work for real-time feeds."

#### Review Changes

Board reviews all proposals.

**Review process:**
- Gather feedback from teams
- Check backward compatibility
- Assess implementation cost
- Vote to approve or reject

#### Adopt Changes

Communicate approved changes.

**Adoption steps:**
- Announce new standard
- Provide migration guide
- Update documentation
- Update linter rules

#### Monitor Adoption

Track how teams adopt new standards.

**What to monitor:**
- Compliance percentage
- Common blockers
- Support requests
- Time to adoption

**Example:** "60% of teams adopted cursor pagination in first month. Top blocker: lack of examples."

### Cross-Team Collaboration

#### Communities of Practice

Teams share knowledge.

**Activities:**
- Monthly meetings
- Teams demo solutions
- Group troubleshooting
- Pattern library maintenance

**Example:** Payments team shares rate limiting pattern. Other teams adopt it.

#### API Champions

Each team assigns a champion.

**Champion role:**
- Attend governance meetings
- Share standards with team
- Gather team feedback
- Help team comply

**Support provided:**
- Training sessions
- Documentation access
- Direct help from board

**Example:** Champion learns new error standard. Teaches team. Helps implement it.

#### Shared Tooling

All teams use the same tools.

**Common tools:**
- OpenAPI editors (Swagger Editor)
- Linters (Spectral)
- Doc generators (ReDoc)
- Testing frameworks (Pact)

**Benefit:** Solutions work across teams.

## API Catalog and Discovery

### Catalog Purpose

A central catalog helps teams find and use APIs.

**What it provides:**
- Find available APIs
- Access documentation
- Track compliance
- View usage metrics
- Monitor API lifecycle

**Example:** Developer searches "customer" and finds Customer API with docs and examples.

### Catalog Contents

Store this info for each API.

#### Basic Information
- Name and description
- Version (v1, v2, etc.)
- Status (dev, production, deprecated)
- Owning team
- Business domain

#### Technical Details
- OpenAPI spec
- Base URLs (dev, staging, prod)
- Auth requirements (OAuth 2.0)
- Rate limits (1000 req/min)
- SLA (99.9% uptime)

#### Lifecycle Information
- Release date
- Last updated
- Deprecation status
- Sunset date
- Version history

#### Operational Metrics
- Availability (99.95%)
- Response time (50ms avg)
- Error rate (0.1%)
- Request volume (10M/day)
- Consumer count (25 apps)

### Discovery Mechanisms

Make APIs easy to find.

#### Search and Browse
- Search by name or description
- Browse by domain
- Filter by status or team

**Example:** Search "payment" returns Payment API, Billing API, Invoice API.

#### Categorization
- Business domain (customers, orders, payments)
- Technical capability (CRUD, streaming, batch)
- Keywords (tags)

#### Recommendations
- Related APIs
- Popular APIs
- Replacement for deprecated APIs

**Example:** Viewing Orders API suggests Customers API and Inventory API.

### Catalog Maintenance

Keep info current.

#### Automated Updates
- Pull specs from Git repos
- Collect metrics from monitoring
- Get metadata from CI/CD

**Example:** Deploy pipeline auto-updates API version in catalog.

#### Manual Updates
- Team adds descriptions
- Team adds use cases
- Team adds migration guides

#### Quality Checks
- Validate OpenAPI specs
- Flag outdated info
- Flag missing docs

**Example:** Alert if API has no description or examples.

## Governance Metrics

Track how well governance works.

### Compliance Metrics

Measure standards adherence.

**What to track:**
- Spec coverage: 95% of APIs have OpenAPI specs
- Standards conformance: 88% meet required standards
- Review completion: 100% complete design reviews
- Doc quality: 80% have complete docs

**Example:** "12 of 50 APIs lack OpenAPI specs. Target: 0 by Q2."

### Quality Metrics

Measure API quality.

**What to track:**
- Availability: 99.9% uptime
- Performance: 95th percentile response time
- Errors: 0.1% error rate
- Security: 0 critical vulnerabilities

**Example:** "Orders API at 99.95% uptime. Exceeds target."

### Adoption Metrics

Measure API usage.

**What to track:**
- Active consumers: 45 apps use this API
- Request volume: 10M requests/day
- Growth rate: +20% this quarter
- Satisfaction: 4.5/5 developer rating

**Example:** "New Payment API has 5 consumers. Target: 10 by Q3."

### Process Metrics

Measure governance efficiency.

**What to track:**
- Review turnaround: 3 days average
- Exception rate: 5% of projects
- Breaking changes: 2 per quarter
- Migration success: 90% complete in 6 months

**Example:** "Design reviews take 3 days. Target: 2 days."

## Exception Handling

### When Exceptions Are Appropriate

Some situations need different approaches.

**Valid reasons:**
- Platform limits prevent compliance
- Legacy systems need different patterns
- Standard approach is too slow
- Critical business deadline

**Example:** "Legacy mainframe returns XML. Can't use JSON standard for this integration."

### Exception Request Process

Follow these steps to request an exception.

1. **Document why**: Explain why standard doesn't work
2. **Propose alternative**: Describe your planned approach
3. **Assess risks**: What could go wrong? How to mitigate?
4. **Submit for review**: Board reviews request
5. **Get time-bound approval**: Exception expires after set time
6. **Plan fix**: Define path to eventual compliance

**Example request:**
```
Standard: RFC 7807 errors
Exception needed: Legacy XML errors
Reason: Mainframe integration can't change
Alternative: Document XML error format
Mitigation: Convert XML to RFC 7807 at gateway
Duration: 12 months
Remediation: Replace mainframe by Q4 2026
```

### Exception Tracking

Keep a register of all exceptions.

**Track this info:**
- What exception was granted
- Start and end dates
- Why it was needed
- How to fix it eventually
- Current status

**Review quarterly:** Are exceptions still needed?

**Example:** "5 active exceptions. 2 expire next quarter. 1 can be closed early."

## Implementation Guidance

### Getting Started

Start small and grow.

**Five steps:**

1. **Pick 3-5 critical standards**
   - Example: Error format, auth, versioning

2. **Pilot with one team**
   - Test the process
   - Find what works

3. **Gather feedback**
   - What was hard?
   - What helped?

4. **Expand gradually**
   - Add one team per quarter
   - Add standards as needed

5. **Automate over time**
   - Start with manual reviews
   - Add tools when patterns emerge

**Example:** Start with error standard only. Add versioning after 3 months. Add automation after 6 months.

### Governance Maturity Model

Grow through four levels.

**Level 1: Ad Hoc**
- No formal standards
- Each API is different
- Teams work independently

**Level 2: Documented**
- Written standards exist
- Manual reviews
- Teams follow standards voluntarily

**Level 3: Managed**
- Enforced standards
- Automated validation
- Regular audits

**Level 4: Optimized**
- Continuous improvement
- Predictive analytics
- Self-service tools

**Progress gradually.** Most orgs take 12-24 months to reach Level 3.

### Common Pitfalls

Avoid these mistakes.

**Too many rules**
- Teams can't keep up
- **Fix:** Start with 5 standards max

**Not enforcing standards**
- Teams ignore them
- **Fix:** Block deployment if standards fail

**No team input**
- Standards don't fit needs
- **Fix:** Include developers in governance board

**Tool obsession**
- Focus on tools not process
- **Fix:** Get process working first, then automate

**One size fits all**
- Different APIs have different needs
- **Fix:** Allow exceptions with justification

## Implementation Notes

These principles work everywhere.

**Applies to:**
- Any tech stack
- Any framework
- Small or large teams
- Any organization type

**Success requires balance:**
- Consistency without rigidity
- Standards with flexibility
- Enforcement with support
- Central control with team ownership

Start small. Listen to teams. Automate gradually. Adjust as you learn.
