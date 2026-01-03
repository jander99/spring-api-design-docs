# Validation

This section covers validation patterns for Spring Boot applications.

## Overview

Validation ensures data quality at the API boundary and throughout the application. This guide shows how to validate requests using Jakarta Bean Validation, JSON Schema libraries, and custom validators.

## Contents

- [Schema Validation](schema-validation.md) - Complete validation patterns for Spring Boot

## Key Concepts

### Jakarta Bean Validation

Standard validation annotations for common rules:
- `@NotNull`, `@NotEmpty`, `@NotBlank` - Null and empty checks
- `@Size`, `@Min`, `@Max` - Size and range constraints
- `@Pattern`, `@Email` - Format validation
- `@Valid` - Nested object validation

### Custom Validators

Build custom constraint annotations for business-specific rules:
- Field-level validators
- Class-level validators
- Cross-field validation

### Validation Groups

Apply different validation rules in different contexts:
- Create vs. update operations
- Full vs. partial updates
- Different user roles

### JSON Schema Validation

Validate against JSON Schema definitions for complex schema requirements.

## Quick Example

```java
@Data
public class CreateOrderRequest {
    
    @NotNull(message = "Customer ID is required")
    private UUID customerId;
    
    @NotEmpty(message = "At least one item is required")
    @Size(max = 50, message = "Maximum 50 items per order")
    private List<@Valid OrderItemRequest> items;
    
    @Valid
    @NotNull(message = "Shipping address is required")
    private AddressRequest shippingAddress;
}

@RestController
@RequestMapping("/v1/orders")
public class OrderController {
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        // Validation happens automatically
        // ...
    }
}
```

## Related Documentation

### Spring Implementation
- [Error Handling - Validation Standards](../error-handling/validation-standards.md) - Service-level validation
- [Error Handling - Imperative](../error-handling/imperative-error-handling.md) - Exception handlers
- [Error Handling - Error Response Formats](../error-handling/error-response-formats.md) - RFC 7807
- [Controllers - Request Response Mapping](../controllers/request-response-mapping.md) - DTOs and mappers

### Language-Agnostic Theory
- [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md) - Schema patterns
- [Schema Conventions](../../../guides/api-design/request-response/schema-conventions.md) - Naming standards
- [Error Response Standards](../../../guides/api-design/request-response/error-response-standards.md) - Error formats
- [OpenAPI Standards](../../../guides/api-design/documentation/openapi-standards.md) - API documentation

## Best Practices

1. **Validate Early** - Fail fast at the API boundary
2. **Clear Messages** - Provide actionable error messages
3. **Multiple Layers** - Validate at controller, service, and domain layers
4. **Consistent Format** - Use RFC 7807 Problem Details for errors
5. **Test Thoroughly** - Write comprehensive validation tests
6. **Document Rules** - Include validation constraints in OpenAPI specs
