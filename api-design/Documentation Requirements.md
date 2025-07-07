# Documentation Requirements

## Overview

Comprehensive and consistent API documentation is essential for enabling rapid adoption and proper usage of APIs. This document outlines our documentation standards, with emphasis on OpenAPI specifications, example formats, and integration with tooling platforms like Swagger UI and API catalogs.

## OpenAPI Specification Requirements

### OpenAPI Version and Format

- All APIs must provide OpenAPI 3.1+ specifications
- Specifications must be available in both YAML and JSON formats
- Use standardized paths for specification access:
  ```
  /openapi.json         # OpenAPI JSON specification
  /openapi.yaml         # OpenAPI YAML specification
  /docs                 # Interactive documentation (Swagger UI or similar)
  /api-docs             # Alternative documentation path
  ```

### Required Documentation Elements

Every API must document the following elements:

#### General API Information

```yaml
openapi: 3.1.0
info:
  title: Order Service API
  description: API for managing orders and order items
  version: 1.2.0
  contact:
    name: Order Team
    email: order-team@example.com
    url: https://wiki.example.com/teams/order-team
  license:
    name: Internal Use Only
    identifier: proprietary
  summary: Order management microservice API
```

#### Server Information

```yaml
servers:
  - url: https://api.example.com/v1
    description: Production environment
  - url: https://staging-api.example.com/v1
    description: Staging environment
```

#### Path Documentation

Each path must include:

1. Summary and description
2. All possible response codes
3. Request and response schemas
4. Security requirements

```yaml
paths:
  /orders:
    get:
      summary: Retrieve orders
      description: Returns a paginated list of orders with filtering options
      parameters:
        - name: status
          in: query
          description: Filter by order status
          schema:
            type: string
            enum: [PENDING, PROCESSING, COMPLETED, CANCELLED]
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderListResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      security:
        - bearerAuth: []
```

#### Component Documentation

Detailed schema definitions with examples:

```yaml
components:
  schemas:
    Order:
      type: object
      properties:
        id:
          type: string
          example: "ord-12345"
        customerId:
          type: string
          example: "cust-6789"
        status:
          type: string
          enum: [PENDING, PROCESSING, COMPLETED, CANCELLED]
          example: "PROCESSING"
      required:
        - customerId
```

### Documentation Completeness

Every API operation should be fully documented with:

```yaml
paths:
  /orders:
    post:
      summary: Create a new order
      description: Creates an order with the provided details
      tags:
        - Orders
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderRequest'
            examples:
              standard:
                summary: Standard order creation
                value:
                  customerId: "cust-6789"
                  items:
                    - productId: "prod-1234"
                      quantity: 2
      responses:
        '201':
          description: Order created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
              examples:
                created:
                  summary: Successfully created order
                  value:
                    id: "ord-12345"
                    customerId: "cust-6789"
                    status: "PENDING"
                    total: 99.95
        '400':
          description: Invalid request
          content:
            application/problem+json:
              schema:
                $ref: '#/components/schemas/ProblemDetails'
              examples:
                validation-error:
                  summary: Request validation failed
                  value:
                    type: "https://example.com/problems/validation-error"
                    title: "Validation Error"
                    status: 400
                    detail: "Customer ID is required"
      security:
        - bearerAuth: []
```

### Security Documentation

Configure security schemes in OpenAPI specification:

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token for API authentication
    
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for service-to-service authentication
    
    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/oauth/authorize
          tokenUrl: https://auth.example.com/oauth/token
          scopes:
            read:orders: Read access to orders
            write:orders: Write access to orders
```

### API Grouping and Organization

Organize APIs into logical groups:

```yaml
# public-api.yaml
openapi: 3.1.0
info:
  title: Public Order API
  version: 1.0.0
paths:
  /orders: # Public endpoints only

# internal-api.yaml  
openapi: 3.1.0
info:
  title: Internal Order API
  version: 1.0.0
paths:
  /internal/orders: # Internal endpoints only
```

## Example Documentation

### Request/Response Examples

Provide realistic examples for every significant operation:

```yaml
# Example for creating an order
paths:
  /orders:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderRequest'
            examples:
              standard:
                summary: Standard order creation
                value:
                  customerId: "cust-6789"
                  items:
                    - productId: "prod-1234"
                      quantity: 2
                  shippingAddress:
                    street: "123 Main St"
                    city: "Anytown"
                    zipCode: "12345"
```

### Error Examples

Document examples of error responses using RFC 7807 Problem Details format:

```yaml
components:
  examples:
    ValidationError:
      summary: Validation error example (RFC 7807)
      value:
        type: "https://example.com/problems/validation-error"
        title: "Validation Error"
        status: 400
        detail: "The request contains invalid parameters"
        instance: "/v1/orders"
        errors:
          - field: "items"
            code: "REQUIRED"
            message: "At least one item is required"
    
    LegacyValidationError:
      summary: Legacy validation error format
      value:
        error:
          code: "VALIDATION_ERROR"
          message: "The request contains invalid parameters"
          details:
            - field: "items"
              code: "REQUIRED"
              message: "At least one item is required"
```

## Documentation Integration

### Interactive Documentation

Implement interactive documentation with these features:

**Swagger UI Configuration**:
- Interactive API exploration with "Try it out" functionality
- Multiple API group support
- Enhanced filtering and sorting options
- Deep linking to specific operations
- Custom branding and styling

**Alternative Documentation Tools**:
- **Redoc**: Clean, responsive documentation
- **Stoplight Elements**: Modern API documentation
- **Insomnia**: API design and testing platform
- **Postman**: API documentation and testing

**Key Documentation Features**:
```yaml
# Multiple API specifications
urls:
  - name: "Public API"
    url: "/openapi/public.yaml"
  - name: "Internal API"
    url: "/openapi/internal.yaml"
  - name: "Admin API"
    url: "/openapi/admin.yaml"

# Configuration options
options:
  tryItOutEnabled: true
  filter: true
  deepLinking: true
  defaultModelsExpandDepth: 1
  defaultModelExpandDepth: 1
  operationsSorter: "alpha"
  tagsSorter: "alpha"
```

### API Catalog Integration

**Backstage Integration**:
- Register API specifications with Backstage API catalog
- Include metadata for service discovery and management
- Link to related services and components

```yaml
# catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: order-api
  annotations:
    backstage.io/techdocs-ref: dir:.
    backstage.io/owner: order-team
    backstage.io/api-lifecycle: production
spec:
  type: openapi
  lifecycle: production
  owner: order-team
  definition:
    $text: ./openapi.yaml
```

**Other API Catalog Platforms**:
- **Kong Portal**: API documentation and developer portal
- **Azure API Management**: Microsoft's API catalog solution
- **AWS API Gateway**: Documentation and developer portal
- **Postman API Network**: Public API discovery platform

## Versioning Documentation

### Version-Specific Documentation

- Maintain separate OpenAPI specifications for each API version
- Document changes between versions
- Include deprecation notices for obsolete endpoints

### Deprecation Documentation

Clearly indicate deprecated elements:

```yaml
paths:
  /v1/orders:
    get:
      deprecated: true
      description: >
        **Deprecated:** This endpoint will be removed on Dec 31, 2025.
        Use `/v2/orders` instead which provides enhanced filtering capabilities.
```

## Streaming API Documentation

### Documenting Streaming Patterns

For streaming APIs, clearly document:

1. **Streaming behavior**: Indicate content types and protocols used
2. **Flow control**: Describe how backpressure is managed
3. **Connection management**: Explain connection behavior for long-lived streams
4. **Error handling**: Document how errors are communicated in streams

Example:

```yaml
paths:
  /orders/stream:
    get:
      summary: Stream orders in real-time
      description: >
        Returns a stream of orders as they are created or updated.
        Uses Server-Sent Events with HTTP flow control for backpressure management.
        Clients should implement proper connection handling for unexpected disconnects.
        Stream will automatically reconnect on connection loss.
      parameters:
        - name: Last-Event-ID
          in: header
          description: Resume stream from specific event ID
          schema:
            type: string
      responses:
        '200':
          description: Successful streaming operation
          headers:
            Cache-Control:
              description: Prevents caching of stream
              schema:
                type: string
                example: "no-cache"
          content:
            text/event-stream:
              schema:
                type: string
                description: Server-Sent Events format
              examples:
                order-events:
                  summary: Order event stream
                  value: |
                    id: 1
                    event: order-created
                    data: {"id":"ord-123","status":"CREATED"}
                    
                    id: 2
                    event: order-updated
                    data: {"id":"ord-123","status":"PROCESSING"}
            application/x-ndjson:
              schema:
                type: string
                description: Newline-delimited JSON format
              examples:
                order-stream:
                  summary: NDJSON order stream
                  value: |
                    {"id":"ord-123","status":"CREATED"}
                    {"id":"ord-124","status":"PROCESSING"}
```

## Documentation Validation and Testing

### Validation Requirements

Modern validation approaches for API documentation:

- **OpenAPI Linting**: Use tools like `spectral` or `redocly` in CI/CD pipeline
- **Schema Validation**: Ensure examples match schemas using automated testing
- **Coverage Analysis**: Verify all endpoints are documented with 100% coverage
- **Breaking Change Detection**: Use tools to detect API breaking changes

```yaml
# CI/CD pipeline example
validate-docs:
  stage: test
  script:
    - spectral lint openapi.yaml --ruleset .spectral.yaml
    - redocly lint openapi.yaml
    - openapi-diff baseline.yaml current.yaml --fail-on-incompatible
    - openapi-generator validate -i openapi.yaml
  artifacts:
    reports:
      junit: test-results.xml
```

**Recommended Validation Tools**:
- **Spectral**: OpenAPI linting with custom rules
- **Redocly CLI**: Comprehensive OpenAPI validation
- **OpenAPI Diff**: Breaking change detection
- **Swagger Parser**: Schema validation
- **Prism**: Mock server validation

### Testing Documentation

Comprehensive documentation testing strategy:

**Automated Testing Approaches**:

```bash
# Example test script
#!/bin/bash

# Validate OpenAPI specification
openapi-generator validate -i openapi.yaml

# Test all documented examples
for example in examples/*.json; do
    echo "Testing example: $example"
    curl -X POST \
        -H "Content-Type: application/json" \
        -d @"$example" \
        "$API_BASE_URL/orders" \
        | jq . # Validate JSON response
done

# Verify response schemas
prism mock openapi.yaml &
PRISM_PID=$!
newman run postman-collection.json
kill $PRISM_PID
```

**Testing Tools and Frameworks**:
- **Postman/Newman**: Automated API testing with collection runs
- **Insomnia**: API testing with environment management
- **Pact**: Consumer-driven contract testing with OpenAPI
- **Dredd**: API testing against OpenAPI specifications
- **Schemathesis**: Property-based testing for OpenAPI

**Testing Considerations**:
- **Contract Testing**: Ensure consumers and providers agree on API contracts
- **Load Testing**: Verify documented rate limits and performance characteristics
- **Security Testing**: Validate documented security requirements
- **Example Validation**: Ensure all examples are executable and produce expected results

## Example Documentation Checklist

For each API, ensure:

- [ ] OpenAPI 3.1+ specification is available and valid
- [ ] All endpoints, parameters, request bodies, and responses are documented
- [ ] Example requests and responses are provided
- [ ] Error responses are documented for each possible error
- [ ] Security requirements are clearly specified
- [ ] Versioning and deprecation information is included
- [ ] Special considerations for reactive endpoints are documented

## Documentation Governance

Implement a documentation review process as part of API design reviews:

1. **Initial Review**: During API design phase
2. **Pre-Release Review**: Before deployment to production
3. **Periodic Audits**: Regular reviews of documentation accuracy

These documentation standards ensure that developers have the information needed to successfully integrate with and use our APIs. With OpenAPI 3.1+ specifications, modern tooling integration, and comprehensive validation approaches, these patterns provide documentation that is both developer-friendly and machine-readable.

## Implementation Notes

When implementing these documentation standards:

- **Framework-specific tools**: For Spring Boot implementations using springdoc-openapi, see the spring-design standards documentation
- **OpenAPI generators**: Use appropriate OpenAPI code generators for your technology stack
- **Documentation hosting**: Deploy documentation to accessible locations (GitHub Pages, Netlify, internal portals)
- **Version management**: Maintain documentation versions alongside API versions
- **Automation**: Integrate documentation generation and validation into CI/CD pipelines

These standards work with any REST API framework and are based on OpenAPI specifications and industry-standard tooling, making them applicable across different programming languages and platforms.