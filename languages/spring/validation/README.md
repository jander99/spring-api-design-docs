# Validation

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 3 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Documentation
> 
> **📊 Complexity:** 11.6 grade level • 1.2% technical density • difficult

This section covers validation patterns for Spring Boot applications.

## Overview

Validation checks data quality at your API boundary and inside your app. This guide shows how to validate requests. You can use Jakarta Bean Validation, JSON Schema libraries, and custom validators.

## Contents

### Getting Started
- [Validation Fundamentals](validation-fundamentals.md) - Learn the basics of Jakarta Bean Validation. See standard annotations and error handling.
- [Custom Validators](custom-validators.md) - Build your own validators. Learn cross-field validation and validation groups.

### Advanced Topics
- [Advanced Validation](advanced-validation.md) - Use JSON Schema validation. Apply method-level validation and RFC 7807 integration.
- [Validation Testing](validation-testing.md) - Write unit tests and integration tests for your validation logic.

### Legacy Documentation
- [Schema Validation](schema-validation.md) - Original guide (being phased out)

## Key Concepts

### Jakarta Bean Validation

Use standard annotations for common rules:
- `@NotNull`, `@NotEmpty`, `@NotBlank` - Check for null and empty values
- `@Size`, `@Min`, `@Max` - Check size and range
- `@Pattern`, `@Email` - Check formats
- `@Valid` - Validate nested objects

### Custom Validators

Build custom annotations for your business rules:
- Validate individual fields
- Validate entire classes
- Validate across multiple fields

### Validation Groups

Apply different rules in different contexts:
- Create operations vs. update operations
- Full updates vs. partial updates
- Different user roles

### JSON Schema Validation

Validate data against JSON Schema definitions. This works well for complex schemas.

### Method-Level Validation

Validate service method parameters and return values:
- Use `@Validated` to validate parameters
- Validate what methods return
- Handle `ConstraintViolationException` errors

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
- [Error Handling - Validation Standards](../error-handling/validation-standards.md) - Learn service-level validation
- [Error Handling - Imperative](../error-handling/imperative-error-handling.md) - Handle exceptions
- [Error Handling - Error Response Formats](../error-handling/error-response-formats.md) - Use RFC 7807
- [Controllers - Request Response Mapping](../controllers/request-response-mapping.md) - Work with DTOs and mappers

### Language-Agnostic Theory
- [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md) - Learn schema patterns
- [Schema Conventions](../../../guides/api-design/request-response/schema-conventions.md) - Follow naming standards
- [Error Response Standards](../../../guides/api-design/request-response/error-response-standards.md) - Use error formats
- [OpenAPI Standards](../../../guides/api-design/documentation/openapi-standards.md) - Document your API

## Best Practices

1. **Validate Early** - Check data at the API boundary and fail fast
2. **Clear Messages** - Give users helpful error messages
3. **Multiple Layers** - Validate at controller, service, and domain layers
4. **Consistent Format** - Use RFC 7807 Problem Details for all errors
5. **Test Thoroughly** - Write tests that cover all validation rules
6. **Document Rules** - Add validation constraints to your OpenAPI specs
