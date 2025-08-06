# OpenAPI Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Architecture, Documentation
> 
> **📊 Complexity:** 22.1 grade level • 2.2% technical density • very difficult

## Overview

This document outlines the OpenAPI 3.1+ standards and requirements for creating comprehensive API specifications. These standards ensure consistency, completeness, and interoperability across all API documentation.

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

## Documentation Checklist

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

These OpenAPI standards ensure that developers have the information needed to successfully integrate with and use our APIs, with specifications that are both developer-friendly and machine-readable.

## Implementation Notes

When implementing these OpenAPI standards:

- **OpenAPI generators**: Use appropriate OpenAPI code generators
- **Documentation hosting**: Deploy documentation to accessible locations
- **Version management**: Maintain documentation versions alongside API versions
- **Automation**: Integrate documentation generation and validation into CI/CD pipelines

These standards work with any REST API framework and are based on OpenAPI specifications and industry-standard tooling.