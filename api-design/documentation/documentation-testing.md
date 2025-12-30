# Documentation Testing

> **Reading Guide**: Grade Level 12 | 8 min read | Technical reference for API documentation validation

## Overview

Test API documentation to ensure accuracy and reliability. Use automated tools to validate schemas, examples, and detect breaking changes. Consistent testing prevents documentation drift where the API evolves but docs stay outdated.

## Core Validation

### Essential Checks
- **Schema Validation**: Examples match OpenAPI schemas
- **Breaking Changes**: Detect incompatible API changes
- **Coverage**: All endpoints documented
- **Links**: No broken internal/external links

### Required Tools
- **spectral**: OpenAPI linting and custom rules
- **openapi-diff**: Breaking change detection
- **prism**: Mock server for validation
- **markdown-link-check**: Link verification

## Spectral Configuration

Spectral validates OpenAPI documents against configurable rules. Create a `.spectral.yaml` file in your project root.

### Basic Configuration

```yaml
# .spectral.yaml
extends:
  - spectral:oas

rules:
  # Require operation descriptions
  operation-description: error
  
  # Require operation IDs
  operation-operationId: error
  
  # Require tags on operations
  operation-tags: error
  
  # Require contact information
  info-contact: warn
  
  # Require license information
  info-license: warn
  
  # Ensure paths are kebab-case
  paths-kebab-case:
    description: Paths must use kebab-case
    severity: error
    given: $.paths[*]~
    then:
      function: pattern
      functionOptions:
        match: "^(/[a-z0-9-]+)+$"
  
  # Require examples for request bodies
  request-body-example:
    description: Request bodies must have examples
    severity: error
    given: $.paths[*][*].requestBody.content[*]
    then:
      field: example
      function: truthy
  
  # Require response examples
  response-example:
    description: Responses must have examples
    severity: warn
    given: $.paths[*][*].responses[*].content[*]
    then:
      field: example
      function: truthy
```

### Custom Rules for API Standards

```yaml
# .spectral.yaml (extended)
rules:
  # Enforce RFC 7807 error responses
  error-response-format:
    description: Error responses must follow RFC 7807
    severity: error
    given: $.paths[*][*].responses[?(@property >= 400)].content['application/problem+json']
    then:
      function: truthy
  
  # Require pagination on collection endpoints
  collection-pagination:
    description: Collection endpoints must support pagination
    severity: warn
    given: $.paths[*].get.responses['200'].content['application/json'].schema
    then:
      field: properties.pagination
      function: truthy
  
  # Enforce semantic versioning in API version
  semantic-version:
    description: API version must follow semantic versioning
    severity: error
    given: $.info.version
    then:
      function: pattern
      functionOptions:
        match: "^[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9]+)?$"
```

### Validation Output Examples

**Successful validation:**
```
$ spectral lint openapi.yaml

OpenAPI 3.1.x detected

✔ openapi.yaml - No errors or warnings
```

**Validation with errors:**
```
$ spectral lint openapi.yaml

OpenAPI 3.1.x detected

/paths/~1v1~1users/get
  15:9  error  operation-description  Operation must have a description
  16:9  error  operation-operationId  Operation must have an operationId

/paths/~1v1~1Users/get
  22:5  error  paths-kebab-case       Paths must use kebab-case

/paths/~1v1~1orders/post/requestBody
  45:13 error  request-body-example   Request bodies must have examples

✖ 4 problems (4 errors, 0 warnings)
```

## Prism Mock Server

Prism creates a mock server from your OpenAPI spec. Use it to validate that examples work correctly and test client integrations.

### Basic Usage

```bash
# Start mock server
prism mock openapi.yaml

# Start with dynamic response generation
prism mock openapi.yaml --dynamic

# Specify port
prism mock openapi.yaml --port 4010
```

### Testing Against Mock Server

```bash
# Test a GET endpoint
curl http://localhost:4010/v1/orders

# Test POST with validation
curl -X POST http://localhost:4010/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId": "cust-123", "items": []}'

# Prism validates request matches schema
# Returns example response from OpenAPI spec
```

### Prism Validation Modes

```bash
# Strict mode - reject invalid requests
prism mock openapi.yaml --errors

# Proxy mode - validate real API responses
prism proxy openapi.yaml https://api.example.com
```

**Proxy validation output:**
```
[VALIDATOR] Response for GET /v1/orders
  ✓ Status code 200 matches spec
  ✓ Content-Type header matches spec
  ✗ Response body validation failed:
    - Missing required field: pagination.totalPages
    - Field 'status' expected enum value, got 'UNKNOWN'
```

## Contract Testing

Contract testing ensures your API implementation matches documentation. It verifies that real API responses conform to OpenAPI schemas.

### Contract Test Workflow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  OpenAPI Spec   │───▶│  Contract Test  │◀───│   Running API   │
│  (Contract)     │    │    Framework    │    │  (Provider)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Test Results   │
                    │  Pass / Fail    │
                    └─────────────────┘
```

### Contract Test Example

```yaml
# contract-tests.yaml
tests:
  - name: Get order returns valid response
    request:
      method: GET
      path: /v1/orders/order-123
      headers:
        Authorization: Bearer ${TEST_TOKEN}
    response:
      status: 200
      schema: $ref('#/components/schemas/Order')
      validate:
        - path: $.id
          equals: order-123
        - path: $.status
          oneOf: [PENDING, PROCESSING, COMPLETED, CANCELLED]

  - name: Create order validates request body
    request:
      method: POST
      path: /v1/orders
      headers:
        Content-Type: application/json
        Authorization: Bearer ${TEST_TOKEN}
      body:
        customerId: cust-456
        items:
          - productId: prod-789
            quantity: 2
    response:
      status: 201
      schema: $ref('#/components/schemas/Order')
      headers:
        Location: /v1/orders/*

  - name: Invalid request returns RFC 7807 error
    request:
      method: POST
      path: /v1/orders
      headers:
        Content-Type: application/json
        Authorization: Bearer ${TEST_TOKEN}
      body:
        customerId: ""
    response:
      status: 400
      contentType: application/problem+json
      schema: $ref('#/components/schemas/ProblemDetail')
```

### Contract Test Results

**Successful test run:**
```
Contract Tests: orders-api.yaml
═══════════════════════════════════════════════════════

✓ Get order returns valid response (245ms)
✓ Create order validates request body (312ms)
✓ Invalid request returns RFC 7807 error (89ms)

───────────────────────────────────────────────────────
Tests: 3 passed, 0 failed
Time:  0.646s
```

**Failed test run:**
```
Contract Tests: orders-api.yaml
═══════════════════════════════════════════════════════

✓ Get order returns valid response (245ms)
✗ Create order validates request body (312ms)

  Expected response to match schema:
  
  - Response missing required field: 'createdAt'
  - Field 'total' expected type 'number', got 'string'
  
  Actual response:
  {
    "id": "order-001",
    "status": "PENDING",
    "total": "99.95"  // Should be number: 99.95
  }

✓ Invalid request returns RFC 7807 error (89ms)

───────────────────────────────────────────────────────
Tests: 2 passed, 1 failed
Time:  0.646s
```

## Link Checking

### markdown-link-check Configuration

```json
{
  "ignorePatterns": [
    { "pattern": "^https://internal" },
    { "pattern": "^mailto:" }
  ],
  "replacementPatterns": [
    { "pattern": "^/", "replacement": "https://docs.example.com/" }
  ],
  "httpHeaders": [
    {
      "urls": ["https://api.example.com"],
      "headers": {
        "Authorization": "Bearer ${DOCS_TOKEN}"
      }
    }
  ],
  "timeout": "10s",
  "retryOn429": true,
  "retryCount": 3,
  "fallbackRetryDelay": "5s"
}
```

### Link Check Output

```
$ markdown-link-check docs/**/*.md

FILE: docs/api-reference.md
  [✓] ./pagination.md
  [✓] https://tools.ietf.org/html/rfc7807
  [✗] ./deprecated/old-api.md - Status: 404
  [✓] #error-handling

FILE: docs/getting-started.md
  [✓] ./quickstart.md
  [✗] https://example.com/broken-link - Status: 404

───────────────────────────────────────────────────────
2 dead links found in 2 files
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/docs-validation.yaml
name: Documentation Validation

on:
  push:
    paths:
      - 'openapi/**'
      - 'docs/**'
  pull_request:
    paths:
      - 'openapi/**'
      - 'docs/**'

jobs:
  lint-openapi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Spectral
        run: npm install -g @stoplight/spectral-cli
      
      - name: Lint OpenAPI
        run: spectral lint openapi/api.yaml --fail-severity=error

  check-breaking-changes:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Get base branch spec
        run: |
          git show origin/${{ github.base_ref }}:openapi/api.yaml > baseline.yaml
      
      - name: Install openapi-diff
        run: npm install -g openapi-diff
      
      - name: Check for breaking changes
        run: |
          openapi-diff baseline.yaml openapi/api.yaml \
            --fail-on-incompatible \
            --output-format markdown > breaking-changes.md
      
      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('breaking-changes.md', 'utf8');
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: '## Breaking Changes Detected\n\n' + body
            });

  validate-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check markdown links
        uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          config-file: '.markdown-link-check.json'
          folder-path: 'docs/'

  contract-tests:
    runs-on: ubuntu-latest
    needs: lint-openapi
    steps:
      - uses: actions/checkout@v4
      
      - name: Start API server
        run: docker-compose up -d api
      
      - name: Wait for API
        run: |
          timeout 60 bash -c 'until curl -s http://localhost:8080/health; do sleep 2; done'
      
      - name: Run contract tests
        run: |
          npm install -g prism-cli
          prism proxy openapi/api.yaml http://localhost:8080 \
            --errors \
            --validate-request
```

### GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - test

validate-openapi:
  stage: validate
  image: node:20
  script:
    - npm install -g @stoplight/spectral-cli
    - spectral lint openapi/api.yaml --fail-severity=error
  rules:
    - changes:
        - openapi/**/*

check-breaking-changes:
  stage: validate
  image: node:20
  script:
    - npm install -g openapi-diff
    - git fetch origin $CI_MERGE_REQUEST_TARGET_BRANCH_NAME
    - git show origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME:openapi/api.yaml > baseline.yaml
    - openapi-diff baseline.yaml openapi/api.yaml --fail-on-incompatible
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        - openapi/**/*

contract-tests:
  stage: test
  image: node:20
  services:
    - name: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
      alias: api
  script:
    - npm install -g prism-cli
    - prism proxy openapi/api.yaml http://api:8080 --errors
  needs:
    - validate-openapi
```

## Quality Assurance

### Review Process
1. **Technical Review**: Accuracy and completeness
2. **Clarity Review**: High school reading level
3. **Example Review**: All examples work correctly
4. **Coverage Review**: No missing endpoints

### Success Metrics
- 100% schema validation pass rate
- Zero broken links
- All examples execute successfully
- No undocumented endpoints

## Related Resources

- **[Testing Examples](../../examples/testing/)** - Complete CI/CD setups and test scripts
- **[Tool Reference](../../reference/testing/)** - Detailed tool comparisons and configurations
- **[Troubleshooting](../../troubleshooting/testing/)** - Common issues and solutions

## Quick Start

1. Install spectral: `npm install -g @stoplight/spectral-cli`
2. Create `.spectral.yaml` with validation rules
3. Run validation: `spectral lint openapi.yaml`
4. Add to CI/CD pipeline for continuous validation
