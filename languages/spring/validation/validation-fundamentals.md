# Validation Fundamentals

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 10 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Spring Boot basics, REST API knowledge  
> **🎯 Key Topics:** Jakarta Validation, Standard Annotations, Error Handling
> 
> **📊 Complexity:** Intermediate technical content

## Overview

This guide covers the fundamentals of schema validation in Spring Boot using Jakarta Bean Validation (formerly JSR-380). Learn how to validate request data at the API boundary using standard annotations and handle validation errors properly.

**Prerequisites**: Review [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md) for language-agnostic schema patterns.

## Jakarta Bean Validation Fundamentals

### Core Validation Annotations

Jakarta Validation (formerly JSR-380) provides standard annotations for common validation rules:

```java
package com.example.orders.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CreateOrderRequest {
    
    @NotNull(message = "Customer ID is required")
    private UUID customerId;
    
    @NotEmpty(message = "Order must contain at least one item")
    @Size(max = 50, message = "Maximum 50 items per order")
    private List<@Valid OrderItemRequest> items;
    
    @Valid
    @NotNull(message = "Shipping address is required")
    private AddressRequest shippingAddress;
    
    @Pattern(regexp = "STANDARD|EXPRESS|OVERNIGHT", 
             message = "Invalid shipping method")
    private String shippingMethod = "STANDARD";
    
    @Data
    public static class OrderItemRequest {
        
        @NotNull(message = "Product ID is required")
        private UUID productId;
        
        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = 999, message = "Quantity cannot exceed 999")
        private Integer quantity;
        
        @DecimalMin(value = "0.01", message = "Price must be positive")
        private BigDecimal unitPrice;
    }
    
    @Data
    public static class AddressRequest {
        
        @NotBlank(message = "Street address is required")
        @Size(max = 255, message = "Street cannot exceed 255 characters")
        private String street;
        
        @NotBlank(message = "City is required")
        @Size(max = 100, message = "City cannot exceed 100 characters")
        private String city;
        
        @NotBlank(message = "State is required")
        @Pattern(regexp = "^[A-Z]{2}$", message = "State must be 2-letter code")
        private String state;
        
        @NotBlank(message = "ZIP code is required")
        @Pattern(regexp = "^\\d{5}(-\\d{4})?$", 
                 message = "Invalid ZIP code format")
        private String zipCode;
    }
}
```

### Standard Validation Annotations

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@NotNull` | Value cannot be null | `@NotNull private UUID id;` |
| `@NotEmpty` | Collection or string cannot be null or empty | `@NotEmpty private List<String> items;` |
| `@NotBlank` | String cannot be null, empty, or whitespace | `@NotBlank private String name;` |
| `@Size` | String or collection size constraints | `@Size(min = 1, max = 50) private String name;` |
| `@Min` / `@Max` | Numeric minimum and maximum values | `@Min(1) @Max(100) private Integer qty;` |
| `@DecimalMin` / `@DecimalMax` | Decimal value constraints | `@DecimalMin("0.01") private BigDecimal price;` |
| `@Pattern` | Regular expression pattern matching | `@Pattern(regexp = "^[A-Z]{2}$") private String code;` |
| `@Email` | Email format validation | `@Email private String email;` |
| `@Past` / `@Future` | Date must be in the past or future | `@Past private LocalDate birthDate;` |
| `@Valid` | Triggers nested object validation | `@Valid private Address address;` |

### Enabling Validation in Controllers

Use `@Valid` or `@Validated` in controller methods to trigger validation:

```java
package com.example.orders.api;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {
    
    private final OrderService orderService;
    private final OrderMapper orderMapper;
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        
        OrderCreationDto dto = orderMapper.toCreationDto(request);
        OrderDto order = orderService.createOrder(dto);
        OrderResponse response = orderMapper.toResponse(order);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response);
    }
    
    @PutMapping("/{orderId}")
    public ResponseEntity<OrderResponse> updateOrder(
            @PathVariable UUID orderId,
            @Valid @RequestBody UpdateOrderRequest request) {
        
        OrderUpdateDto dto = orderMapper.toUpdateDto(request);
        OrderDto order = orderService.updateOrder(orderId, dto);
        OrderResponse response = orderMapper.toResponse(order);
        
        return ResponseEntity.ok(response);
    }
}
```

## Handling Validation Errors

### Global Exception Handler

Validation errors throw `MethodArgumentNotValidException`. Handle them in a global exception handler:

```java
package com.example.common.api;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class ValidationExceptionHandler {
    
    private final RequestIdProvider requestIdProvider;
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationErrors(
            MethodArgumentNotValidException ex) {
        
        log.info("Request validation failed: {} errors", 
                 ex.getBindingResult().getErrorCount());
        
        List<ProblemDetail.ValidationError> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(this::mapToValidationError)
            .collect(Collectors.toList());
        
        ProblemDetail problem = ProblemDetail.builder()
            .type("https://api.example.com/problems/validation-error")
            .title("Request Validation Failed")
            .status(HttpStatus.BAD_REQUEST.value())
            .detail("One or more request parameters failed validation")
            .instance(requestIdProvider.getCurrentRequestPath())
            .timestamp(java.time.OffsetDateTime.now())
            .requestId(requestIdProvider.getRequestId())
            .errors(errors)
            .build();
        
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(problem);
    }
    
    private ProblemDetail.ValidationError mapToValidationError(
            FieldError fieldError) {
        return ProblemDetail.ValidationError.builder()
            .field(fieldError.getField())
            .code(fieldError.getCode())
            .message(fieldError.getDefaultMessage())
            .rejectedValue(fieldError.getRejectedValue())
            .build();
    }
}
```

### Error Response Format

Example validation error response following RFC 7807:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Request Validation Failed",
  "status": 400,
  "detail": "One or more request parameters failed validation",
  "instance": "/v1/orders",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req-abc-123",
  "errors": [
    {
      "field": "customerId",
      "code": "NotNull",
      "message": "Customer ID is required",
      "rejectedValue": null
    },
    {
      "field": "items[0].quantity",
      "code": "Min",
      "message": "Quantity must be at least 1",
      "rejectedValue": 0
    }
  ]
}
```

See [Error Response Formats](../error-handling/error-response-formats.md) for complete RFC 7807 implementation details.

## Problem Detail DTO

```java
package com.example.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProblemDetail {
    
    private String type;
    private String title;
    private Integer status;
    private String detail;
    private String instance;
    private OffsetDateTime timestamp;
    private String requestId;
    private List<ValidationError> errors;
    
    @Data
    @Builder
    public static class ValidationError {
        private String field;
        private String code;
        private String message;
        private Object rejectedValue;
    }
}
```

## Best Practices

### 1. Fail Fast at the API Boundary

Validate as early as possible in the request pipeline:

```java
@RestController
@RequestMapping("/v1/orders")
public class OrderController {
    
    // Validation happens immediately when request is bound
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        // By the time we reach here, basic validation passed
        // ...
    }
}
```

### 2. Provide Clear Error Messages

Make error messages actionable:

```java
@NotBlank(message = "Street address is required")
@Size(max = 255, message = "Street address cannot exceed 255 characters")
private String street;

@Pattern(regexp = "^\\d{5}(-\\d{4})?$", 
         message = "ZIP code must be in format 12345 or 12345-6789")
private String zipCode;

@DecimalMin(value = "0.01", 
            message = "Price must be at least $0.01")
private BigDecimal price;
```

### 3. Use Nested Validation

Always validate nested objects with `@Valid`:

```java
@Data
public class CreateOrderRequest {
    
    @NotEmpty(message = "Order must contain at least one item")
    private List<@Valid OrderItemRequest> items;
    
    @Valid
    @NotNull(message = "Shipping address is required")
    private AddressRequest shippingAddress;
}
```

### 4. Consistent Error Response Format

Always use RFC 7807 Problem Details for validation errors:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Request Validation Failed",
  "status": 400,
  "detail": "One or more request parameters failed validation",
  "instance": "/v1/orders",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req-abc-123",
  "errors": [
    {
      "field": "items[0].quantity",
      "code": "Min",
      "message": "Quantity must be at least 1",
      "rejectedValue": 0
    }
  ]
}
```

### 5. Document Validation Rules

Include validation constraints in OpenAPI documentation:

```yaml
components:
  schemas:
    CreateOrderRequest:
      type: object
      required:
        - customerId
        - items
        - shippingAddress
      properties:
        customerId:
          type: string
          format: uuid
          description: Customer identifier
        items:
          type: array
          minItems: 1
          maxItems: 50
          description: Order line items
          items:
            $ref: '#/components/schemas/OrderItemRequest'
```

See [OpenAPI Standards](../../../guides/api-design/documentation/openapi-standards.md) for complete documentation patterns.

## Related Documentation

### Next Steps
- [Custom Validators](custom-validators.md) - Build custom validation logic
- [Advanced Validation](advanced-validation.md) - JSON Schema and method-level validation
- [Validation Testing](validation-testing.md) - Test validation rules

### Spring Implementation
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) - Global exception handlers
- [Error Response Formats](../error-handling/error-response-formats.md) - RFC 7807 implementation
- [Request Response Mapping](../controllers/request-response-mapping.md) - DTO and mapper patterns

### Language-Agnostic Theory
- [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md) - Schema patterns
- [Error Response Standards](../../../guides/api-design/request-response/error-response-standards.md) - Error formats
- [OpenAPI Standards](../../../guides/api-design/documentation/openapi-standards.md) - API documentation standards
