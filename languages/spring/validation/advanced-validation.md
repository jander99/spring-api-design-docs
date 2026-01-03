# Advanced Validation

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 10 minutes | **🟡 Level:** Advanced
> 
> **📋 Prerequisites:** Jakarta Bean Validation, Custom validators  
> **🎯 Key Topics:** JSON Schema, Method-Level Validation, RFC 7807 Integration
> 
> **📊 Complexity:** Advanced technical content

## Overview

This guide covers advanced validation patterns including JSON Schema validation, method-level validation in services, and comprehensive error handling with RFC 7807 Problem Details.

**Prerequisites**: Review [Validation Fundamentals](validation-fundamentals.md) and [Custom Validators](custom-validators.md).

## JSON Schema Validation

### Adding JSON Schema Dependencies

Add JSON Schema validator library to your project:

```xml
<dependency>
    <groupId>com.networknt</groupId>
    <artifactId>json-schema-validator</artifactId>
    <version>1.5.1</version>
</dependency>
```

### Defining JSON Schema

Create a JSON Schema file for validation:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.example.com/schemas/order-v1",
  "type": "object",
  "properties": {
    "customerId": {
      "type": "string",
      "format": "uuid",
      "description": "Customer identifier"
    },
    "items": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": {
        "type": "object",
        "properties": {
          "productId": {
            "type": "string",
            "format": "uuid"
          },
          "quantity": {
            "type": "integer",
            "minimum": 1,
            "maximum": 999
          },
          "unitPrice": {
            "type": "number",
            "minimum": 0,
            "exclusiveMinimum": true
          }
        },
        "required": ["productId", "quantity", "unitPrice"]
      }
    },
    "shippingAddress": {
      "$ref": "#/$defs/address"
    }
  },
  "required": ["customerId", "items", "shippingAddress"],
  "$defs": {
    "address": {
      "type": "object",
      "properties": {
        "street": {
          "type": "string",
          "maxLength": 255
        },
        "city": {
          "type": "string",
          "maxLength": 100
        },
        "state": {
          "type": "string",
          "pattern": "^[A-Z]{2}$"
        },
        "zipCode": {
          "type": "string",
          "pattern": "^\\d{5}(-\\d{4})?$"
        }
      },
      "required": ["street", "city", "state", "zipCode"]
    }
  }
}
```

### JSON Schema Validator Service

```java
package com.example.common.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
public class JsonSchemaValidator {
    
    private final ObjectMapper objectMapper;
    private final JsonSchemaFactory schemaFactory;
    
    public JsonSchemaValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.schemaFactory = JsonSchemaFactory.getInstance(
            SpecVersion.VersionFlag.V202012);
    }
    
    public void validate(Object payload, String schemaPath) {
        try {
            JsonNode jsonNode = objectMapper.valueToTree(payload);
            JsonSchema schema = loadSchema(schemaPath);
            
            Set<ValidationMessage> errors = schema.validate(jsonNode);
            
            if (!errors.isEmpty()) {
                List<String> errorMessages = errors.stream()
                    .map(ValidationMessage::getMessage)
                    .collect(Collectors.toList());
                
                throw new JsonSchemaValidationException(
                    "JSON Schema validation failed", errorMessages);
            }
            
        } catch (IOException e) {
            log.error("Failed to load JSON schema: {}", schemaPath, e);
            throw new IllegalStateException(
                "Schema validation configuration error", e);
        }
    }
    
    private JsonSchema loadSchema(String schemaPath) throws IOException {
        ClassPathResource resource = new ClassPathResource(schemaPath);
        try (InputStream inputStream = resource.getInputStream()) {
            JsonNode schemaNode = objectMapper.readTree(inputStream);
            return schemaFactory.getSchema(schemaNode);
        }
    }
}
```

### Custom JSON Schema Validation Exception

```java
package com.example.common.validation;

import lombok.Getter;
import java.util.List;

@Getter
public class JsonSchemaValidationException extends RuntimeException {
    
    private final List<String> validationErrors;
    
    public JsonSchemaValidationException(String message, 
                                        List<String> validationErrors) {
        super(message);
        this.validationErrors = validationErrors;
    }
}
```

### Using JSON Schema Validation

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final JsonSchemaValidator schemaValidator;
    private final OrderRepository orderRepository;
    
    public OrderDto createOrder(OrderCreationDto orderDto) {
        // Validate against JSON Schema
        schemaValidator.validate(orderDto, "schemas/order-v1.json");
        
        // Proceed with business logic
        Order order = mapToEntity(orderDto);
        order = orderRepository.save(order);
        
        return mapToDto(order);
    }
}
```

## Method-Level Validation

### Validating Service Method Parameters

Enable method validation by adding `@Validated` at the class level:

```java
package com.example.orders.application;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.UUID;

@Service
@Validated
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderRepository orderRepository;
    
    public OrderDto getOrder(@NotNull UUID orderId) {
        return orderRepository.findById(orderId)
            .map(this::mapToDto)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));
    }
    
    public List<OrderDto> getOrdersByCustomer(
            @NotNull UUID customerId,
            @Min(0) int page,
            @Min(1) @Max(100) int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        return orderRepository.findByCustomerId(customerId, pageable)
            .stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    public OrderDto createOrder(@Valid OrderCreationDto orderDto) {
        // Business logic
        Order order = mapToEntity(orderDto);
        order = orderRepository.save(order);
        return mapToDto(order);
    }
}
```

### Validating Return Values

```java
@Service
@Validated
@RequiredArgsConstructor
public class CustomerService {
    
    private final CustomerRepository customerRepository;
    
    @NotNull(message = "Customer must not be null")
    public CustomerDto createCustomer(@Valid CustomerCreationDto dto) {
        Customer customer = mapToEntity(dto);
        customer = customerRepository.save(customer);
        return mapToDto(customer);
    }
    
    @NotEmpty(message = "Active customers list must not be empty")
    public List<CustomerDto> getActiveCustomers() {
        return customerRepository.findByActiveTrue()
            .stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
}
```

## Integration with RFC 7807 Error Responses

### Comprehensive Validation Error Handler

```java
package com.example.common.api;

import com.example.common.validation.JsonSchemaValidationException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class ValidationExceptionHandler {
    
    private final RequestIdProvider requestIdProvider;
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex) {
        
        log.info("Request validation failed: {} errors", 
                 ex.getBindingResult().getErrorCount());
        
        List<ProblemDetail.ValidationError> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(this::mapFieldError)
            .collect(Collectors.toList());
        
        ProblemDetail problem = buildProblemDetail(
            "validation-error",
            "Request Validation Failed",
            HttpStatus.BAD_REQUEST,
            "One or more request parameters failed validation",
            errors
        );
        
        return ResponseEntity.badRequest().body(problem);
    }
    
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolation(
            ConstraintViolationException ex) {
        
        log.info("Method validation failed: {} violations", 
                 ex.getConstraintViolations().size());
        
        List<ProblemDetail.ValidationError> errors = ex.getConstraintViolations()
            .stream()
            .map(this::mapConstraintViolation)
            .collect(Collectors.toList());
        
        ProblemDetail problem = buildProblemDetail(
            "constraint-violation",
            "Constraint Violation",
            HttpStatus.BAD_REQUEST,
            "One or more constraints were violated",
            errors
        );
        
        return ResponseEntity.badRequest().body(problem);
    }
    
    @ExceptionHandler(BindException.class)
    public ResponseEntity<ProblemDetail> handleBindException(
            BindException ex) {
        
        log.info("Binding error: {} errors", ex.getErrorCount());
        
        List<ProblemDetail.ValidationError> errors = ex.getFieldErrors()
            .stream()
            .map(this::mapFieldError)
            .collect(Collectors.toList());
        
        ProblemDetail problem = buildProblemDetail(
            "binding-error",
            "Request Binding Failed",
            HttpStatus.BAD_REQUEST,
            "Request data could not be bound to the expected format",
            errors
        );
        
        return ResponseEntity.badRequest().body(problem);
    }
    
    @ExceptionHandler(JsonSchemaValidationException.class)
    public ResponseEntity<ProblemDetail> handleJsonSchemaValidation(
            JsonSchemaValidationException ex) {
        
        log.info("JSON Schema validation failed: {} errors", 
                 ex.getValidationErrors().size());
        
        List<ProblemDetail.ValidationError> errors = ex.getValidationErrors()
            .stream()
            .map(msg -> ProblemDetail.ValidationError.builder()
                .message(msg)
                .code("SCHEMA_VIOLATION")
                .build())
            .collect(Collectors.toList());
        
        ProblemDetail problem = buildProblemDetail(
            "schema-validation-error",
            "JSON Schema Validation Failed",
            HttpStatus.BAD_REQUEST,
            "Request does not conform to the expected schema",
            errors
        );
        
        return ResponseEntity.badRequest().body(problem);
    }
    
    private ProblemDetail.ValidationError mapFieldError(FieldError error) {
        return ProblemDetail.ValidationError.builder()
            .field(error.getField())
            .code(error.getCode())
            .message(error.getDefaultMessage())
            .rejectedValue(error.getRejectedValue())
            .build();
    }
    
    private ProblemDetail.ValidationError mapConstraintViolation(
            ConstraintViolation<?> violation) {
        return ProblemDetail.ValidationError.builder()
            .field(violation.getPropertyPath().toString())
            .code(violation.getConstraintDescriptor()
                .getAnnotation().annotationType().getSimpleName())
            .message(violation.getMessage())
            .rejectedValue(violation.getInvalidValue())
            .build();
    }
    
    private ProblemDetail buildProblemDetail(String type, String title, 
            HttpStatus status, String detail, 
            List<ProblemDetail.ValidationError> errors) {
        
        return ProblemDetail.builder()
            .type("https://api.example.com/problems/" + type)
            .title(title)
            .status(status.value())
            .detail(detail)
            .instance(requestIdProvider.getCurrentRequestPath())
            .timestamp(OffsetDateTime.now())
            .requestId(requestIdProvider.getRequestId())
            .errors(errors)
            .build();
    }
}
```

See [Imperative Error Handling](../error-handling/imperative-error-handling.md) for complete error handling patterns.

## Best Practices

### 1. Validation Layer Separation

Validate at multiple layers for defense in depth:

```java
// Layer 1: Controller validation (Jakarta Bean Validation)
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest request) {
    // ...
}

// Layer 2: Service validation (Business rules)
@Service
public class OrderService {
    
    public OrderDto createOrder(OrderCreationDto dto) {
        // Validate business rules
        validateBusinessRules(dto);
        
        // Proceed with creation
        // ...
    }
    
    private void validateBusinessRules(OrderCreationDto dto) {
        // Check inventory availability
        // Validate customer credit limit
        // Verify shipping availability
    }
}

// Layer 3: Domain validation (Invariants)
@Entity
public class Order {
    
    public void addItem(OrderItem item) {
        if (items.size() >= 50) {
            throw new BusinessException("Order cannot exceed 50 items");
        }
        items.add(item);
    }
}
```

### 2. Choose the Right Validation Tool

- **Jakarta Bean Validation**: Format and structure validation at the API boundary
- **JSON Schema**: Complex schema requirements or external schema definitions
- **Custom Validators**: Business-specific validation rules
- **Method Validation**: Service method parameter validation

### 3. Consistent Error Response Format

Always use RFC 7807 Problem Details for all validation errors:

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

### 4. Enable Method Validation Globally

Configure method validation at the application level:

```java
@Configuration
public class ValidationConfig {
    
    @Bean
    public MethodValidationPostProcessor methodValidationPostProcessor(
            Validator validator) {
        MethodValidationPostProcessor processor = 
            new MethodValidationPostProcessor();
        processor.setValidator(validator);
        return processor;
    }
}
```

### 5. Cache JSON Schemas

Load and cache JSON schemas to avoid repeated I/O:

```java
@Component
public class JsonSchemaValidator {
    
    private final Map<String, JsonSchema> schemaCache = new ConcurrentHashMap<>();
    
    public void validate(Object payload, String schemaPath) {
        JsonSchema schema = schemaCache.computeIfAbsent(
            schemaPath, this::loadSchema);
        // Validate using cached schema
    }
}
```

## Related Documentation

### Next Steps
- [Validation Testing](validation-testing.md) - Test validation patterns

### Spring Implementation
- [Validation Fundamentals](validation-fundamentals.md) - Jakarta Bean Validation basics
- [Custom Validators](custom-validators.md) - Custom validation logic
- [Validation Standards](../error-handling/validation-standards.md) - Service-level validation
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) - Exception handlers
- [Error Response Formats](../error-handling/error-response-formats.md) - RFC 7807 implementation

### Language-Agnostic Theory
- [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md) - Schema patterns
- [Error Response Standards](../../../guides/api-design/request-response/error-response-standards.md) - Error formats
