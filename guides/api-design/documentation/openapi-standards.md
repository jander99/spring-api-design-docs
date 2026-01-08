# OpenAPI Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Authentication, Architecture, Documentation
> 
> **📊 Complexity:** 9.2 grade level • 1.8% technical density • fairly difficult

## Quick Start

OpenAPI is a standard way to document your APIs. Here's a minimal example:

```yaml
openapi: 3.1.0
info:
  title: Order Service API
  version: 1.0.0
paths:
  /orders:
    get:
      summary: Get orders
      responses:
        '200':
          description: Success
```

**Why use OpenAPI?** You can generate interactive docs, client SDKs, and tests from one spec file. Machines can read it. Humans can read it.

## Overview

This guide shows you how to write OpenAPI 3.1+ specs. You'll create consistent, complete API documentation. Your specs will work with standard tools.

## Basic Requirements

### Version and Format

Use OpenAPI 3.1 or higher. Provide both YAML and JSON formats.

**Standard paths:**
```
/openapi.json         # JSON format
/openapi.yaml         # YAML format
/docs                 # Interactive docs (Swagger UI)
/api-docs             # Alternative docs path
```

**Why both formats?** Humans prefer YAML. Machines prefer JSON. Offer both.

### Required Elements

Document these elements for every API:

#### API Information

Tell users what your API does. Include contact info.

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

#### Server URLs

List your environments. Users need to know where to send requests.

```yaml
servers:
  - url: https://api.example.com/v1
    description: Production environment
  - url: https://staging-api.example.com/v1
    description: Staging environment
```

#### Endpoint Documentation

Document each endpoint fully. Include these parts:

1. Summary and description
2. All response codes
3. Request and response schemas
4. Security needs

```yaml
paths:
  /orders:
    get:
      summary: Retrieve orders
      description: Returns a paginated list of orders with filters
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

**Why document everything?** Users need to know what to send and what to expect.

#### Schema Definitions

Define your data structures. Add examples to show real values.

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

**Why examples matter:** They show users how data looks. They prevent confusion.

### Complete Endpoint Example

Here's a full endpoint with all recommended parts:

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

This example shows request examples, success responses, and error responses.

### Security Documentation

Define your security schemes. OpenAPI supports JWT, API keys, and OAuth2.

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

**Why document security?** Users need to know how to authenticate. Tools need to test auth flows.

### Organizing Multiple APIs

Split large APIs into logical groups. Use separate files for public and internal APIs.

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

**Why split specs?** You keep public and internal docs separate. You control what external users see.

## Working with Examples

### Request and Response Examples

Provide realistic examples. Show users what real data looks like.

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

**Good examples save time.** Users copy and modify them. They don't guess at formats.

### Error Examples

Show what errors look like. Use RFC 9457 Problem Details format.

```yaml
components:
  examples:
    ValidationError:
      summary: Validation error example (RFC 9457)
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

**Why error examples?** Users need to handle errors. Show them the exact format.

## Versioning and Deprecation

### Version-Specific Specs

Maintain one spec per API version. Document what changed between versions. Mark old endpoints as deprecated.

### Marking Deprecated Endpoints

Tell users when endpoints will disappear. Point them to replacements.

```yaml
paths:
  /v1/orders:
    get:
      deprecated: true
      description: >
        **Deprecated:** This endpoint will be removed on Dec 31, 2025.
        Use `/v2/orders` instead. The new version has better filters.
```

**Why deprecation notices?** Users need time to migrate. Clear warnings prevent surprises.

## Documentation Checklist

Check these items for each API:

- [ ] OpenAPI 3.1+ spec is valid
- [ ] All endpoints are documented
- [ ] Example requests and responses exist
- [ ] Error responses are documented
- [ ] Security requirements are clear
- [ ] Deprecation notices are included
- [ ] Reactive endpoints have special notes (if applicable)

## Review Process

Review docs at these stages:

1. **Design phase**: Check docs during initial API design
2. **Pre-release**: Verify docs before production deploy
3. **Regular audits**: Review docs periodically for accuracy

**Why review?** Docs get outdated. Regular checks keep them accurate.

Good OpenAPI specs help developers integrate quickly. They work for humans and machines.

## Advanced Topics

Need advanced schema patterns? See [Advanced Schema Design](../request-response/advanced-schema-design.md) for:
- Polymorphism
- Composition
- Schema versioning
- Backward compatibility

## Implementation Tips

Follow these practices:

- **Code generators**: Use OpenAPI generators for client SDKs
- **Hosting**: Deploy docs where users can find them
- **Version control**: Keep docs in sync with API versions
- **Automation**: Add spec validation to CI/CD pipelines

**Why automate?** Manual doc updates get skipped. Automation keeps docs fresh.

These standards work with any REST framework. They follow OpenAPI specs and industry tools.

## Related Documentation

- [Advanced Schema Design](../request-response/advanced-schema-design.md) - Schema composition, versioning, and evolution
- [Schema Conventions](../request-response/schema-conventions.md) - Basic schema design principles
- [API Version Strategy](../foundations/api-version-strategy.md) - API versioning approaches
- [Schema Testing](../testing/schema-testing.md) - Testing OpenAPI schemas and examples
- [Documentation Testing](./documentation-testing.md) - Testing API documentation

### Spring Implementation
- [Schema Validation](../../../languages/spring/validation/schema-validation.md) - Implementing schema validation in Spring Boot