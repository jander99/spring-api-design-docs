# CI/CD Integration for APIs

> **Reading Guide**
> 
> **Reading Time:** 20 minutes | **Level:** Intermediate
> 
> **Prerequisites:** Basic CI/CD knowledge, familiarity with OpenAPI specifications  
> **Key Topics:** Pipeline design, automation, quality gates, deployment patterns
> 
> **Complexity:** 12.9 grade level | 0.7% technical density | 36 code examples
> 
> **Note:** This document has many pipeline examples. Prose targets high school reading level. Code blocks add complexity to metrics.

## Executive Summary

**What this covers:** How to add API checks to your CI/CD pipeline. Learn validation, testing, security scans, docs, and safe deployment.

**Key takeaways:**
- Validate API specs before writing code
- Catch breaking changes before they reach production
- Use quality gates to keep APIs consistent
- Deploy safely with blue-green or canary patterns

**When to use this guide:** Use when setting up new API pipelines or fixing existing ones. The checklists help you audit what you have.

---

## CI/CD Pipeline Stages for APIs

API pipelines do more than app pipelines. They check contracts, find breaking changes, and keep docs current. Here are the stages you need.

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API CI/CD PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐       │
│  │ COMMIT  │──▶│  BUILD  │──▶│  TEST   │──▶│ PUBLISH │──▶│ DEPLOY  │       │
│  └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘       │
│       │             │             │             │             │             │
│       ▼             ▼             ▼             ▼             ▼             │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐       │
│  │  Spec   │   │  Lint   │   │Contract │   │  Docs   │   │ Staged  │       │
│  │Validate │   │   &     │   │   &     │   │   &     │   │Rollout  │       │
│  │   &     │   │Security │   │  API    │   │Changelog│   │   &     │       │
│  │Breaking │   │  Scan   │   │ Tests   │   │ Publish │   │Monitor  │       │
│  │ Change  │   │         │   │         │   │         │   │         │       │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘       │
│                                                                             │
│  Quality Gates:                                                             │
│  ──────────────                                                             │
│  [G1] Spec Valid   [G2] Lint Pass   [G3] Tests Pass   [G4] Docs OK         │
│  [G1] No Breaking  [G2] Secure      [G3] Coverage     [G4] Tagged          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage Responsibilities

| Stage | Purpose | Key Activities | Failure Impact |
|-------|---------|----------------|----------------|
| **Commit** | Validate API contract | Spec validation, breaking change detection | Blocks pipeline |
| **Build** | Verify code quality | Linting, security scanning, mock generation | Blocks pipeline |
| **Test** | Confirm behavior | Contract tests, integration tests, performance | Blocks pipeline |
| **Publish** | Release artifacts | Documentation, changelog, version tagging | Blocks deploy |
| **Deploy** | Release to production | Staged rollout, monitoring, rollback ready | Affects users |

---

## Stage 1: Commit Stage

The commit stage checks your API spec before code runs. This is the core of API-first work.

### OpenAPI Specification Validation

Every commit that changes a spec must pass checks. Catch syntax errors, missing fields, and style issues early.

**Validation checks:**
- OpenAPI syntax is valid (YAML/JSON parsing)
- Required fields are present (info, paths, components)
- References resolve correctly ($ref pointers)
- Examples match their schemas
- Security schemes are defined for protected endpoints

**Pipeline configuration example:**

```yaml
# Pipeline stage: Validate OpenAPI specification
validate-spec:
  stage: commit
  script:
    - openapi-lint validate openapi.yaml
    - openapi-lint validate openapi.yaml --ruleset=./spectral.yaml
  artifacts:
    reports:
      - lint-results.json
  rules:
    - changes:
        - "**/*.yaml"
        - "**/*.json"
```

**Spectral ruleset example:**

```yaml
# spectral.yaml - API linting rules
extends: ["spectral:oas"]

rules:
  # Require operation descriptions
  operation-description:
    severity: error
    given: "$.paths[*][*]"
    then:
      field: description
      function: truthy
  
  # Require examples for request bodies
  request-body-example:
    severity: warn
    given: "$.paths[*][*].requestBody.content[*]"
    then:
      field: example
      function: truthy
  
  # Enforce kebab-case for paths
  paths-kebab-case:
    severity: error
    given: "$.paths[*]~"
    then:
      function: pattern
      functionOptions:
        match: "^(/[a-z0-9-]+)+$"
  
  # Require contact information
  info-contact:
    severity: error
    given: "$.info"
    then:
      field: contact
      function: truthy
```

### Breaking Change Detection

Find breaking changes before they hit production. Compare the new spec against the old one to spot problems.

**Breaking changes to detect:**

| Change Type | Breaking? | Detection Rule |
|-------------|-----------|----------------|
| Remove endpoint | Yes | Endpoint exists in baseline but not in current |
| Remove required field from response | Yes | Field exists in baseline schema but not current |
| Add required field to request | Yes | New required field in request body or parameters |
| Change field type | Yes | Type mismatch between baseline and current |
| Remove enum value | Yes | Enum value exists in baseline but not current |
| Add optional field | No | New optional field in request or response |
| Add new endpoint | No | New path not in baseline |
| Add enum value (response) | No | New value in response enum |

**Pipeline configuration:**

```yaml
# Pipeline stage: Detect breaking changes
breaking-changes:
  stage: commit
  script:
    - openapi-diff baseline.yaml openapi.yaml --format=json > diff.json
    - check-breaking-changes diff.json --fail-on-breaking
  artifacts:
    reports:
      - diff.json
  allow_failure: false
```

**Breaking change report example:**

```json
{
  "breakingChanges": [
    {
      "type": "removed-endpoint",
      "path": "/orders/{orderId}/items",
      "method": "DELETE",
      "severity": "breaking",
      "message": "Endpoint removed. Consumers will receive 404 errors."
    },
    {
      "type": "required-field-added",
      "path": "/orders",
      "method": "POST",
      "field": "shippingAddress",
      "severity": "breaking",
      "message": "New required field. Existing requests will fail validation."
    }
  ],
  "nonBreakingChanges": [
    {
      "type": "optional-field-added",
      "path": "/orders",
      "method": "GET",
      "field": "estimatedDelivery",
      "severity": "info",
      "message": "New optional response field. No consumer impact."
    }
  ]
}
```

### Quality Gate: Commit Stage

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMMIT STAGE GATE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MUST PASS (blocks pipeline):                                   │
│  ├── OpenAPI specification is valid                             │
│  ├── All required fields present                                │
│  ├── No breaking changes detected                               │
│  └── References resolve correctly                               │
│                                                                 │
│  SHOULD PASS (warns but allows):                                │
│  ├── All operations have descriptions                           │
│  ├── Examples provided for request/response                     │
│  └── Consistent naming conventions                              │
│                                                                 │
│  Exception process: Breaking changes require architect approval │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 2: Build Stage

The build stage makes artifacts and runs checks. For APIs, this means linting, security scans, and mock servers.

### API Linting

Linting finds style issues and common mistakes. Check both the spec and the code.

**Linting areas:**

| Area | What It Checks | Tools |
|------|----------------|-------|
| **Spec style** | Naming conventions, structure | Spectral, Redocly |
| **Documentation** | Completeness, accuracy | Spectral custom rules |
| **Security** | Auth defined, no sensitive data | Spectral, custom rules |
| **Performance** | Pagination, response sizes | Custom rules |

**Comprehensive lint configuration:**

```yaml
# Extended Spectral ruleset for API governance
extends: ["spectral:oas"]

rules:
  # Naming conventions
  paths-kebab-case:
    severity: error
  
  # Documentation requirements  
  operation-description:
    severity: error
  operation-operationId:
    severity: error
  operation-tags:
    severity: error
    
  # Error handling
  error-response-schema:
    severity: error
    given: "$.paths[*][*].responses[?(@property >= 400)]"
    then:
      field: content.application/problem+json
      function: truthy
      
  # Pagination for collections
  collection-pagination:
    severity: warn
    given: "$.paths[*].get"
    then:
      function: schema
      functionOptions:
        schema:
          properties:
            parameters:
              contains:
                properties:
                  name:
                    pattern: "^(limit|offset|cursor|page)$"
```

### Security Scanning

Security scans find problems in your API specs before deploy. Run these checks on every build.

**Security checks:**

| Check | Risk | Detection Method |
|-------|------|------------------|
| Missing authentication | High | Endpoints without security schemes |
| Sensitive data exposure | High | PII in query parameters or logs |
| Injection vulnerabilities | High | Missing input validation patterns |
| Broken access control | High | Missing authorization scopes |
| Security misconfiguration | Medium | Weak TLS, missing CORS |
| Rate limiting absent | Medium | No rate limit documentation |

**Security scan configuration:**

```yaml
# Security scanning rules
security-scan:
  stage: build
  script:
    - api-security-scan openapi.yaml --output=security-report.json
  artifacts:
    reports:
      - security-report.json
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

**Security ruleset example:**

```yaml
# security-rules.yaml
rules:
  # All endpoints must have security defined
  security-defined:
    severity: error
    given: "$.paths[*][*]"
    then:
      field: security
      function: truthy
    except:
      - "$.paths['/health'][*]"
      - "$.paths['/ready'][*]"
  
  # No sensitive data in query parameters
  no-sensitive-query-params:
    severity: error
    given: "$.paths[*][*].parameters[?(@.in == 'query')]"
    then:
      field: name
      function: pattern
      functionOptions:
        notMatch: "(password|secret|token|key|credential)"
  
  # HTTPS required for servers
  https-only:
    severity: error
    given: "$.servers[*].url"
    then:
      function: pattern
      functionOptions:
        match: "^https://"
```

### API Mock Generation

Build mock servers from your OpenAPI specs. Mocks let teams work in parallel. Test without needing the real backend.

**Mock server uses:**
- Frontend development before backend is ready
- Integration testing in isolated environments
- Contract testing for consumers
- Demo environments

**Mock generation configuration:**

```yaml
# Generate mock server from spec
generate-mocks:
  stage: build
  script:
    - prism mock openapi.yaml --port 4010
    - mock-validator validate --spec=openapi.yaml --mock-port=4010
  artifacts:
    paths:
      - mock-config/
```

### Quality Gate: Build Stage

```
┌─────────────────────────────────────────────────────────────────┐
│                     BUILD STAGE GATE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MUST PASS (blocks pipeline):                                   │
│  ├── All lint rules pass (error severity)                       │
│  ├── No critical security vulnerabilities                       │
│  ├── Authentication defined for protected endpoints             │
│  └── Mock server generates successfully                         │
│                                                                 │
│  SHOULD PASS (warns but allows):                                │
│  ├── All lint rules pass (warning severity)                     │
│  ├── No medium security vulnerabilities                         │
│  └── Response examples validate against schemas                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 3: Test Stage

The test stage checks that your API works as the spec says. Run contract tests, integration tests, and performance tests.

### Contract Testing

Contract tests make sure providers and consumers agree on the API. This stops integration failures.

**Contract testing workflow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONTRACT TESTING FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CONSUMER SIDE                    PROVIDER SIDE                 │
│  ─────────────                    ─────────────                 │
│                                                                 │
│  ┌──────────────┐                 ┌──────────────┐              │
│  │  Consumer    │                 │  Provider    │              │
│  │  writes      │                 │  implements  │              │
│  │  contract    │                 │  API         │              │
│  └──────┬───────┘                 └──────┬───────┘              │
│         │                                │                      │
│         ▼                                │                      │
│  ┌──────────────┐                        │                      │
│  │  Publish     │                        │                      │
│  │  contract to │                        │                      │
│  │  broker      │                        │                      │
│  └──────┬───────┘                        │                      │
│         │                                │                      │
│         └──────────────┬─────────────────┘                      │
│                        ▼                                        │
│                 ┌──────────────┐                                │
│                 │  Provider    │                                │
│                 │  verifies    │                                │
│                 │  contract    │                                │
│                 └──────┬───────┘                                │
│                        │                                        │
│                        ▼                                        │
│                 ┌──────────────┐                                │
│                 │  PASS: Deploy│                                │
│                 │  FAIL: Fix   │                                │
│                 └──────────────┘                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Consumer contract example:**

```json
{
  "consumer": {
    "name": "order-frontend"
  },
  "provider": {
    "name": "order-service"
  },
  "interactions": [
    {
      "description": "Get order by ID",
      "request": {
        "method": "GET",
        "path": "/v1/orders/ord-12345",
        "headers": {
          "Authorization": "Bearer token123"
        }
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "id": "ord-12345",
          "status": "processing",
          "total": {
            "amount": 99.95,
            "currency": "USD"
          }
        },
        "matchingRules": {
          "body": {
            "$.id": { "match": "type" },
            "$.status": { "match": "regex", "regex": "^(pending|processing|completed|cancelled)$" },
            "$.total.amount": { "match": "type" }
          }
        }
      }
    }
  ]
}
```

**Provider verification configuration:**

```yaml
# Provider contract verification
verify-contracts:
  stage: test
  script:
    - pact-verifier verify 
        --provider-base-url=http://localhost:8080
        --pact-broker-url=https://pact-broker.example.com
        --provider=order-service
        --publish-verification-results
  dependencies:
    - build
```

### Integration Testing

Integration tests check full API behavior. They send real requests to running services.

**Integration test categories:**

| Category | Purpose | When to Run |
|----------|---------|-------------|
| **Smoke tests** | Basic connectivity | Every commit |
| **Functional tests** | Business logic | Every commit |
| **Security tests** | Auth and authz | Every commit |
| **Edge case tests** | Error handling | Every commit |
| **Performance tests** | Response times | Nightly or release |

**Integration test configuration:**

```yaml
# Integration test stage
integration-tests:
  stage: test
  services:
    - name: database
      image: postgres:15
    - name: api-service
      image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  script:
    - newman run tests/integration/api-tests.json
        --environment=tests/environments/ci.json
        --reporters=cli,junit
        --reporter-junit-export=results/junit.xml
  artifacts:
    reports:
      junit: results/junit.xml
```

**Test collection example:**

```json
{
  "info": {
    "name": "Order API Integration Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test('Status is 200', function() {",
              "  pm.response.to.have.status(200);",
              "});",
              "pm.test('Response time under 500ms', function() {",
              "  pm.expect(pm.response.responseTime).to.be.below(500);",
              "});"
            ]
          }
        }
      ]
    },
    {
      "name": "Create Order - Valid Request",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/v1/orders",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{accessToken}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"customerId\": \"cust-123\", \"items\": [{\"productId\": \"prod-456\", \"quantity\": 2}]}"
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test('Status is 201', function() {",
              "  pm.response.to.have.status(201);",
              "});",
              "pm.test('Response has order ID', function() {",
              "  var json = pm.response.json();",
              "  pm.expect(json.id).to.match(/^ord-/);",
              "});",
              "pm.test('Content-Type is JSON', function() {",
              "  pm.response.to.have.header('Content-Type', 'application/json');",
              "});"
            ]
          }
        }
      ]
    }
  ]
}
```

### Performance Testing

Performance tests check that APIs respond fast enough. Run these often to catch slowdowns early.

**Performance test configuration:**

```yaml
# Performance test configuration
performance-tests:
  stage: test
  script:
    - k6 run tests/performance/load-test.js
        --out json=results/performance.json
        --tag testid=$CI_PIPELINE_ID
  artifacts:
    reports:
      - results/performance.json
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
```

**Performance thresholds:**

```json
{
  "thresholds": {
    "http_req_duration": {
      "p95": 500,
      "p99": 1000
    },
    "http_req_failed": {
      "rate": 0.01
    },
    "http_reqs": {
      "rate": 100
    }
  },
  "scenarios": {
    "baseline": {
      "executor": "constant-vus",
      "vus": 10,
      "duration": "5m"
    },
    "spike": {
      "executor": "ramping-vus",
      "startVUs": 10,
      "stages": [
        { "duration": "1m", "target": 100 },
        { "duration": "2m", "target": 100 },
        { "duration": "1m", "target": 10 }
      ]
    }
  }
}
```

### Quality Gate: Test Stage

```
┌─────────────────────────────────────────────────────────────────┐
│                      TEST STAGE GATE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MUST PASS (blocks pipeline):                                   │
│  ├── All contract tests pass                                    │
│  ├── All integration tests pass                                 │
│  ├── Security tests pass                                        │
│  └── Test coverage meets minimum (80%)                          │
│                                                                 │
│  SHOULD PASS (warns but allows):                                │
│  ├── Performance thresholds met                                 │
│  └── No flaky tests detected                                    │
│                                                                 │
│  Performance exceptions: Document in release notes if skipped   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 4: Publish Stage

The publish stage makes docs, changelogs, and version tags. Automate this to keep docs in sync with your API.

### Documentation Generation

Build docs from your OpenAPI specs. This keeps docs and code matched.

**Documentation workflow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 DOCUMENTATION PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │ OpenAPI  │──▶│ Generate │──▶│ Validate │──▶│ Publish  │     │
│  │   Spec   │   │   Docs   │   │   Links  │   │  to CDN  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│       │              │              │              │             │
│       │              ▼              │              ▼             │
│       │        ┌──────────┐        │        ┌──────────┐       │
│       │        │  Redoc   │        │        │ developer│       │
│       └───────▶│ Swagger  │        │        │ portal   │       │
│                │ Postman  │        │        │ update   │       │
│                └──────────┘        │        └──────────┘       │
│                                    │                            │
│                                    ▼                            │
│                             ┌──────────┐                        │
│                             │ Check    │                        │
│                             │ examples │                        │
│                             │ work     │                        │
│                             └──────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Documentation generation configuration:**

```yaml
# Generate and publish documentation
generate-docs:
  stage: publish
  script:
    # Generate static documentation
    - redoc-cli bundle openapi.yaml -o docs/index.html
    
    # Generate Postman collection
    - openapi-to-postman -s openapi.yaml -o docs/postman-collection.json
    
    # Validate all links work
    - link-checker docs/index.html
    
    # Validate examples execute correctly
    - example-validator openapi.yaml --execute
  artifacts:
    paths:
      - docs/
```

### Changelog Generation

Make changelogs from spec changes. This shows what changed between versions.

**Changelog format:**

```markdown
# Changelog

## [2.1.0] - 2024-03-15

### Added
- `GET /v2/orders/{orderId}/tracking` - New endpoint for order tracking
- `estimatedDelivery` field added to Order response
- Support for `X-Idempotency-Key` header on POST requests

### Changed
- `GET /v2/orders` now supports `cursor` pagination (backward compatible)
- Improved error messages for validation failures

### Deprecated
- `GET /v1/orders` - Use v2 instead. Sunset date: 2024-09-15

### Security
- Added rate limiting headers to all responses

## [2.0.0] - 2024-01-10

### Breaking Changes
- Renamed `customer_name` to `customerName` (camelCase convention)
- Removed `GET /v1/orders/legacy` endpoint
- `status` field enum values changed (see migration guide)

### Migration Guide
See [v1 to v2 migration guide](./docs/migration-v1-v2.md)
```

**Changelog generation configuration:**

```yaml
# Generate changelog from spec changes
generate-changelog:
  stage: publish
  script:
    - openapi-changelog generate
        --old=baseline.yaml
        --new=openapi.yaml
        --output=CHANGELOG.md
        --format=markdown
  artifacts:
    paths:
      - CHANGELOG.md
  only:
    - tags
```

### Version Tagging

Tag releases with version numbers. Keep tags consistent so you can track changes.

**Tagging conventions:**

| Tag Format | Example | Use Case |
|------------|---------|----------|
| `v{major}.{minor}.{patch}` | `v2.1.0` | Production releases |
| `v{major}.{minor}.{patch}-beta.{n}` | `v2.1.0-beta.1` | Beta releases |
| `v{major}.{minor}.{patch}-rc.{n}` | `v2.1.0-rc.1` | Release candidates |

**Version bumping configuration:**

```yaml
# Version bumping rules
version-bump:
  stage: publish
  script:
    - |
      # Determine version bump type from commit messages
      if git log --oneline -1 | grep -q "BREAKING:"; then
        VERSION_BUMP="major"
      elif git log --oneline -1 | grep -q "feat:"; then
        VERSION_BUMP="minor"
      else
        VERSION_BUMP="patch"
      fi
      
      # Bump version in OpenAPI spec
      semver bump $VERSION_BUMP openapi.yaml --in-place
      
      # Create git tag
      NEW_VERSION=$(grep "version:" openapi.yaml | head -1 | cut -d'"' -f2)
      git tag "v$NEW_VERSION"
      git push origin "v$NEW_VERSION"
  only:
    - main
```

### Quality Gate: Publish Stage

```
┌─────────────────────────────────────────────────────────────────┐
│                    PUBLISH STAGE GATE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MUST PASS (blocks deployment):                                 │
│  ├── Documentation generates without errors                     │
│  ├── All documentation links valid                              │
│  ├── Version tag created successfully                           │
│  └── Changelog includes all changes                             │
│                                                                 │
│  SHOULD PASS (warns but allows):                                │
│  ├── All examples execute successfully                          │
│  └── Documentation published to portal                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 5: Deploy Stage

The deploy stage puts your API into production. Use staged rollouts to cut risk.

### Deployment Patterns for APIs

Deploy APIs with care to avoid breaking clients. Pick a pattern based on your risk level.

**Pattern comparison:**

| Pattern | Risk Level | Rollback Time | Consumer Impact | Best For |
|---------|------------|---------------|-----------------|----------|
| **Rolling** | Medium | Minutes | Possible mixed versions | Minor updates |
| **Blue-Green** | Low | Seconds | Clean cutover | Major releases |
| **Canary** | Low | Seconds | Limited exposure | High-traffic APIs |
| **Feature Flags** | Very Low | Instant | Gradual rollout | Breaking changes |

### Blue-Green Deployment

Blue-green uses two matching environments. Switch traffic between them in seconds.

```
┌─────────────────────────────────────────────────────────────────┐
│                  BLUE-GREEN DEPLOYMENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────┐                              │
│                    │   Gateway   │                              │
│                    │   /Router   │                              │
│                    └──────┬──────┘                              │
│                           │                                     │
│              ┌────────────┼────────────┐                        │
│              │            │            │                        │
│              ▼            │            ▼                        │
│       ┌──────────┐        │     ┌──────────┐                    │
│       │   BLUE   │        │     │  GREEN   │                    │
│       │  (v2.0)  │◀───────┘     │  (v2.1)  │                    │
│       │  Active  │              │  Standby │                    │
│       └──────────┘              └──────────┘                    │
│                                                                 │
│  Deployment Steps:                                              │
│  1. Deploy new version to GREEN (standby)                       │
│  2. Run smoke tests against GREEN                               │
│  3. Switch gateway to route traffic to GREEN                    │
│  4. GREEN becomes active, BLUE becomes standby                  │
│  5. If issues occur, switch back to BLUE instantly              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Blue-green configuration:**

```yaml
# Blue-green deployment
deploy-blue-green:
  stage: deploy
  script:
    # Deploy to standby environment
    - deploy-to-environment --target=standby --version=$CI_COMMIT_TAG
    
    # Run smoke tests
    - smoke-tests --environment=standby
    
    # Switch traffic
    - switch-traffic --from=active --to=standby
    
    # Update environment labels
    - label-environment --name=standby --label=active
  environment:
    name: production
    url: https://api.example.com
```

### Canary Deployment

Canary sends a small slice of traffic to the new version. Increase the slice slowly if things look good.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CANARY DEPLOYMENT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────┐                              │
│                    │   Gateway   │                              │
│                    └──────┬──────┘                              │
│                           │                                     │
│           ┌───────────────┼───────────────┐                     │
│           │               │               │                     │
│           ▼               │               ▼                     │
│    ┌──────────┐           │        ┌──────────┐                 │
│    │ STABLE   │◀──────────┤        │  CANARY  │                 │
│    │  (v2.0)  │    90%    │   10%  │  (v2.1)  │                 │
│    │          │           │        │          │                 │
│    └──────────┘           │        └──────────┘                 │
│                           │                                     │
│  Traffic Progression:                                           │
│  ──────────────────                                             │
│  Stage 1:  5% canary, 95% stable   (10 min observation)         │
│  Stage 2: 10% canary, 90% stable   (10 min observation)         │
│  Stage 3: 25% canary, 75% stable   (30 min observation)         │
│  Stage 4: 50% canary, 50% stable   (30 min observation)         │
│  Stage 5: 100% canary (promote to stable)                       │
│                                                                 │
│  Automatic rollback if error rate > 1% or p99 latency > 1s      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Canary configuration:**

```yaml
# Canary deployment with progressive rollout
deploy-canary:
  stage: deploy
  script:
    # Deploy canary version
    - deploy-canary --version=$CI_COMMIT_TAG --initial-weight=5
    
    # Monitor for 10 minutes
    - monitor-canary --duration=10m --error-threshold=0.01
    
    # Increase traffic progressively
    - increase-canary-weight --target=10 --duration=10m
    - increase-canary-weight --target=25 --duration=30m
    - increase-canary-weight --target=50 --duration=30m
    
    # Promote to full traffic
    - promote-canary --version=$CI_COMMIT_TAG
  environment:
    name: production
```

### Environment-Specific Configuration

Some settings change between environments. Keep API logic the same but adjust URLs and limits.

**Configuration categories:**

| Category | Environment-Specific? | Example |
|----------|----------------------|---------|
| API behavior | No | Business logic, validation rules |
| Service URLs | Yes | Database hosts, dependency URLs |
| Credentials | Yes | API keys, certificates |
| Rate limits | Sometimes | Higher limits in production |
| Feature flags | Sometimes | Enable beta features in staging |

**Environment configuration example:**

```yaml
# Environment configuration
environments:
  development:
    api_base_url: "https://dev-api.example.com"
    rate_limit: 100
    log_level: "debug"
    features:
      beta_endpoints: true
      detailed_errors: true
      
  staging:
    api_base_url: "https://staging-api.example.com"
    rate_limit: 500
    log_level: "info"
    features:
      beta_endpoints: true
      detailed_errors: false
      
  production:
    api_base_url: "https://api.example.com"
    rate_limit: 1000
    log_level: "warn"
    features:
      beta_endpoints: false
      detailed_errors: false
```

### Rollback Strategies

Plan your rollback before you deploy. Auto-rollback cuts recovery time.

**Rollback triggers:**

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Error rate increase | >1% above baseline | Automatic rollback |
| Latency spike | >2x baseline p99 | Automatic rollback |
| Failed health checks | 3 consecutive failures | Automatic rollback |
| Manual trigger | Engineer decision | Immediate rollback |

**Rollback configuration:**

```yaml
# Automatic rollback configuration
rollback:
  triggers:
    - metric: error_rate
      threshold: 0.01
      comparison: "greater_than"
      window: "5m"
    - metric: latency_p99
      threshold_multiplier: 2.0
      baseline_window: "1h"
      comparison: "greater_than"
      window: "5m"
  actions:
    - revert_deployment
    - notify_oncall
    - create_incident
```

### Quality Gate: Deploy Stage

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOY STAGE GATE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PRE-DEPLOY CHECKS:                                             │
│  ├── All previous stages passed                                 │
│  ├── Deployment approval obtained (for production)              │
│  ├── Rollback plan documented                                   │
│  └── On-call engineer notified                                  │
│                                                                 │
│  POST-DEPLOY VERIFICATION:                                      │
│  ├── Health checks passing                                      │
│  ├── Smoke tests passing                                        │
│  ├── Error rate within threshold                                │
│  └── Latency within threshold                                   │
│                                                                 │
│  ROLLBACK CRITERIA:                                             │
│  ├── Error rate > 1% for 5 minutes                              │
│  ├── P99 latency > 2x baseline for 5 minutes                    │
│  └── Critical security vulnerability discovered                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Breaking Change Detection Patterns

Auto-detect breaking changes to stop contract violations. Use these patterns.

### Detection Rules

**Response breaking changes:**

```yaml
# Breaking change: Removed field from response
detection_rule:
  name: removed-response-field
  severity: breaking
  description: "Field removed from response schema"
  pattern:
    baseline: "$.paths[*][*].responses[*].content[*].schema.properties[*]"
    current: "property does not exist"
  
# Breaking change: Changed field type
detection_rule:
  name: changed-field-type
  severity: breaking
  description: "Field type changed in schema"
  pattern:
    baseline: "$.components.schemas[*].properties[*].type"
    current: "type differs from baseline"
```

**Request breaking changes:**

```yaml
# Breaking change: New required field in request
detection_rule:
  name: new-required-request-field
  severity: breaking
  description: "New required field added to request body"
  pattern:
    baseline: "$.paths[*][*].requestBody.content[*].schema.required"
    current: "contains new value not in baseline"
    
# Breaking change: Removed enum value
detection_rule:
  name: removed-enum-value
  severity: breaking
  description: "Enum value removed from parameter or field"
  pattern:
    baseline: "$.components.schemas[*].properties[*].enum"
    current: "missing value that exists in baseline"
```

### Exception Handling

Some breaking changes are on purpose. Use an exception process to approve them.

**Exception workflow:**

```
┌─────────────────────────────────────────────────────────────────┐
│               BREAKING CHANGE EXCEPTION FLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Breaking change detected in CI                              │
│     ├── Pipeline fails with breaking change report              │
│     └── Developer reviews the changes                           │
│                                                                 │
│  2. Developer determines if intentional                         │
│     ├── Unintentional: Fix the spec and re-run                  │
│     └── Intentional: Request exception approval                 │
│                                                                 │
│  3. Exception approval process                                  │
│     ├── API architect reviews change                            │
│     ├── Consumer impact assessed                                │
│     └── Migration plan documented                               │
│                                                                 │
│  4. Exception granted                                           │
│     ├── Add exception annotation to spec                        │
│     ├── Update baseline version                                 │
│     └── Pipeline continues                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Exception annotation example:**

```yaml
# OpenAPI spec with breaking change exception
paths:
  /v2/orders:
    post:
      x-breaking-change-approved:
        date: "2024-03-01"
        approver: "api-architect@example.com"
        reason: "Adding shipping address as required for international orders"
        migration-guide: "https://docs.example.com/migration/shipping-address"
        sunset-old-behavior: "2024-09-01"
```

---

## Implementation Checklist

Use this list when you set up or audit API pipelines.

### Pipeline Setup Checklist

**Commit stage:**
- [ ] OpenAPI specification validation configured
- [ ] Spectral or similar linting tool integrated
- [ ] Breaking change detection against baseline
- [ ] Pipeline fails on validation errors

**Build stage:**
- [ ] Extended linting rules for organization standards
- [ ] Security scanning for API vulnerabilities
- [ ] Mock server generation from spec
- [ ] Artifacts stored for later stages

**Test stage:**
- [ ] Contract tests for consumer-provider agreements
- [ ] Integration tests for API functionality
- [ ] Security tests for authentication and authorization
- [ ] Performance tests with defined thresholds
- [ ] Test coverage requirements enforced

**Publish stage:**
- [ ] Documentation generated from OpenAPI spec
- [ ] Changelog generated automatically
- [ ] Version tagging automation configured
- [ ] Documentation published to developer portal

**Deploy stage:**
- [ ] Staged deployment pattern selected
- [ ] Health checks configured
- [ ] Automatic rollback triggers defined
- [ ] Environment-specific configuration managed
- [ ] Post-deployment verification tests

### Quality Gates Summary

| Stage | Gate | Blocking? | Exception Process |
|-------|------|-----------|-------------------|
| Commit | Spec valid | Yes | None |
| Commit | No breaking changes | Yes | Architect approval |
| Build | Lint errors | Yes | None |
| Build | Critical security issues | Yes | Security approval |
| Test | Contract tests pass | Yes | None |
| Test | Integration tests pass | Yes | None |
| Test | Performance thresholds | No | Document in release |
| Publish | Docs generated | Yes | None |
| Deploy | Smoke tests pass | Yes | None |
| Deploy | Error rate threshold | Yes | Automatic rollback |

---

## Related Resources

- **[OpenAPI Standards](openapi-standards.md)** - Specification requirements and documentation
- **[API Version Strategy](../foundations/api-version-strategy.md)** - Versioning approaches and migration
- **[API Governance](api-governance.md)** - Review processes and quality gates
- **[API Lifecycle Management](../foundations/api-lifecycle-management.md)** - Deprecation and sunset procedures
- **[Documentation Tools](documentation-tools-and-integration.md)** - Documentation generation and hosting
- **[Security Standards](../security/security-standards.md)** - Authentication and security requirements

---

## Summary

Good API CI/CD pipelines include:

1. **Spec-first checks**: Find contract issues before code runs
2. **Breaking change detection**: Stop accidental API breaks
3. **Full testing**: Contract, integration, security, and performance tests
4. **Auto documentation**: Keep docs matched with code
5. **Staged deploys**: Cut risk with blue-green or canary patterns
6. **Auto rollback**: Recover fast when things break

These practices work with any API framework and CI/CD platform. Adapt the tools to your stack while following the patterns here.
