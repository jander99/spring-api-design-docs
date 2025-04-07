# Documentation Requirements

## Overview

Comprehensive and consistent API documentation is essential for enabling rapid adoption and proper usage of microservices. This document outlines our documentation standards, with emphasis on OpenAPI specifications, example formats, and integration with tooling platforms like Swagger and Backstage.

## OpenAPI Specification Requirements

### OpenAPI Version and Format

- All APIs must provide OpenAPI 3.0+ specifications
- Specifications must be available in both YAML and JSON formats
- Use standardized paths for specification access:
  ```
  /api-docs
  /swagger-ui.html
  ```

### Required Documentation Elements

Every API must document the following elements:

#### General API Information

```yaml
openapi: 3.0.3
info:
  title: Order Service API
  description: API for managing orders and order items
  version: 1.2.0
  contact:
    name: Order Team
    email: order-team@example.com
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

### Documentation Annotations

For Spring-based services, use appropriate annotations:

```java
@Operation(
    summary = "Create a new order",
    description = "Creates an order with the provided details"
)
@ApiResponses({
    @ApiResponse(
        responseCode = "201", 
        description = "Order created successfully",
        content = @Content(schema = @Schema(implementation = OrderResponse.class))
    ),
    @ApiResponse(
        responseCode = "400", 
        description = "Invalid request",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class))
    )
})
public Mono<ResponseEntity<OrderResponse>> createOrder(@RequestBody OrderRequest request) {
    // Implementation
}
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

Document examples of error responses for each error code:

```yaml
components:
  examples:
    ValidationError:
      summary: Validation error example
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

### Swagger UI Integration

- Configure Swagger UI for interactive API exploration
- Ensure proper styling and branding
- Enable request execution capabilities for testing

### Backstage Integration

- Register API specifications with Backstage API catalog
- Include additional metadata required by Backstage
- Link to related services and components

Example Backstage annotation:

```yaml
metadata:
  annotations:
    backstage.io/techdocs-ref: dir:.
    backstage.io/owner: order-team
    backstage.io/api-lifecycle: production
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
        **Deprecated:** This endpoint will be removed on Dec 31, 2023.
        Use `/v2/orders` instead which provides enhanced filtering capabilities.
```

## Reactive API Documentation

### Documenting Reactive Patterns

For reactive APIs, clearly document:

1. **Streaming behavior**: Indicate when endpoints return Flux vs. Mono
2. **Backpressure handling**: Describe how backpressure is managed
3. **Connection management**: Explain connection behavior for long-lived streams

Example:

```yaml
paths:
  /orders/stream:
    get:
      summary: Stream orders in real-time
      description: >
        Returns a stream of orders as they are created or updated.
        Uses server-sent events with backpressure managed through HTTP flow control.
        Clients should implement proper connection handling for unexpected disconnects.
      responses:
        '200':
          description: Successful streaming operation
          content:
            application/stream+json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Order'
```

## Documentation Validation and Testing

### Validation Requirements

- Run OpenAPI linting as part of CI/CD pipeline
- Validate examples against schemas
- Ensure all endpoints are documented

### Testing Documentation

- Verify that documentation examples work against actual APIs
- Test documentation rendering in Swagger UI and Backstage
- Include documentation testing in integration tests

## Example Documentation Checklist

For each API, ensure:

- [ ] OpenAPI 3.0+ specification is available and valid
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

These documentation standards ensure that developers have the information needed to successfully integrate with and use our microservices.