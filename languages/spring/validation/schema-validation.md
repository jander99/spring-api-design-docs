# Schema Validation

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 18 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Spring Boot basics, REST API knowledge  
> **🎯 Key Topics:** Jakarta Validation, JSON Schema, Custom Validators
> 
> **📊 Complexity:** Grade 15 • Intermediate technical content

## Overview

This guide covers schema validation in Spring Boot applications. It shows how to validate request data using Jakarta Validation (Bean Validation), JSON Schema libraries, and custom validators.

Schema validation ensures data quality at the API boundary. It catches errors early, provides clear feedback, and protects business logic from invalid input.

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

### Handling Validation Errors

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

**Example error response:**

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

## Custom Constraint Annotations

### Creating a Custom Validator

Build custom validators for business-specific validation rules:

```java
package com.example.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = OrderDateValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidOrderDate {
    
    String message() default "Order date must be at least 24 hours in the future";
    
    Class<?>[] groups() default {};
    
    Class<? extends Payload>[] payload() default {};
    
    int minHoursInFuture() default 24;
}
```

### Implementing the Validator

```java
package com.example.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.LocalDateTime;

public class OrderDateValidator 
        implements ConstraintValidator<ValidOrderDate, LocalDateTime> {
    
    private int minHoursInFuture;
    
    @Override
    public void initialize(ValidOrderDate constraintAnnotation) {
        this.minHoursInFuture = constraintAnnotation.minHoursInFuture();
    }
    
    @Override
    public boolean isValid(LocalDateTime value, 
                          ConstraintValidatorContext context) {
        // Null values should be validated by @NotNull
        if (value == null) {
            return true;
        }
        
        LocalDateTime minDateTime = LocalDateTime.now()
            .plusHours(minHoursInFuture);
        
        return value.isAfter(minDateTime);
    }
}
```

### Using Custom Validators

```java
@Data
public class ScheduleOrderRequest {
    
    @NotNull(message = "Customer ID is required")
    private UUID customerId;
    
    @ValidOrderDate(minHoursInFuture = 48, 
                    message = "Scheduled orders require 48 hours notice")
    @NotNull(message = "Delivery date is required")
    private LocalDateTime deliveryDateTime;
    
    @NotEmpty(message = "Order must contain at least one item")
    private List<@Valid OrderItemRequest> items;
}
```

## Cross-Field Validation

### Class-Level Validators

Validate multiple fields together:

```java
package com.example.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = DateRangeValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidDateRange {
    
    String message() default "End date must be after start date";
    
    Class<?>[] groups() default {};
    
    Class<? extends Payload>[] payload() default {};
    
    String startField() default "startDate";
    
    String endField() default "endDate";
}
```

### Cross-Field Validator Implementation

```java
package com.example.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.Field;
import java.time.LocalDate;

@Slf4j
public class DateRangeValidator 
        implements ConstraintValidator<ValidDateRange, Object> {
    
    private String startField;
    private String endField;
    
    @Override
    public void initialize(ValidDateRange constraintAnnotation) {
        this.startField = constraintAnnotation.startField();
        this.endField = constraintAnnotation.endField();
    }
    
    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        try {
            Field startFieldRef = value.getClass().getDeclaredField(startField);
            Field endFieldRef = value.getClass().getDeclaredField(endField);
            
            startFieldRef.setAccessible(true);
            endFieldRef.setAccessible(true);
            
            LocalDate startDate = (LocalDate) startFieldRef.get(value);
            LocalDate endDate = (LocalDate) endFieldRef.get(value);
            
            // Allow null values (let @NotNull handle nulls)
            if (startDate == null || endDate == null) {
                return true;
            }
            
            boolean isValid = endDate.isAfter(startDate);
            
            if (!isValid) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate(
                    "End date must be after start date")
                    .addPropertyNode(endField)
                    .addConstraintViolation();
            }
            
            return isValid;
            
        } catch (NoSuchFieldException | IllegalAccessException e) {
            log.error("Error accessing fields for validation", e);
            return false;
        }
    }
}
```

### Using Cross-Field Validation

```java
@Data
@ValidDateRange(startField = "startDate", endField = "endDate")
public class ReportRequest {
    
    @NotNull(message = "Start date is required")
    @Past(message = "Start date must be in the past")
    private LocalDate startDate;
    
    @NotNull(message = "End date is required")
    @PastOrPresent(message = "End date cannot be in the future")
    private LocalDate endDate;
    
    @Pattern(regexp = "PDF|CSV|EXCEL", message = "Invalid format")
    private String format = "PDF";
}
```

## Validation Groups

### Defining Validation Groups

Use groups to apply different validation rules in different contexts:

```java
package com.example.common.validation;

public interface CreateValidation {}
public interface UpdateValidation {}
public interface PartialUpdateValidation {}
```

### Applying Validation Groups

```java
@Data
public class CustomerRequest {
    
    // ID must be null during creation but required for updates
    @Null(groups = CreateValidation.class, 
          message = "ID must be null when creating a customer")
    @NotNull(groups = UpdateValidation.class, 
             message = "ID is required when updating a customer")
    private UUID id;
    
    @NotBlank(groups = {CreateValidation.class, UpdateValidation.class}, 
              message = "Name is required")
    @Size(max = 200, groups = {CreateValidation.class, UpdateValidation.class})
    private String name;
    
    @NotBlank(groups = CreateValidation.class, 
              message = "Email is required")
    @Email(groups = {CreateValidation.class, UpdateValidation.class})
    private String email;
    
    // Phone is optional for creation, updates, and partial updates
    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$", 
             groups = {CreateValidation.class, UpdateValidation.class, 
                      PartialUpdateValidation.class},
             message = "Invalid phone number format")
    private String phoneNumber;
}
```

### Using Validation Groups in Controllers

```java
@RestController
@RequestMapping("/v1/customers")
@RequiredArgsConstructor
public class CustomerController {
    
    private final CustomerService customerService;
    
    @PostMapping
    public ResponseEntity<CustomerResponse> createCustomer(
            @Validated(CreateValidation.class) 
            @RequestBody CustomerRequest request) {
        // Handle creation
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @PutMapping("/{customerId}")
    public ResponseEntity<CustomerResponse> updateCustomer(
            @PathVariable UUID customerId,
            @Validated(UpdateValidation.class) 
            @RequestBody CustomerRequest request) {
        // Handle full update
        return ResponseEntity.ok(response);
    }
    
    @PatchMapping("/{customerId}")
    public ResponseEntity<CustomerResponse> partialUpdateCustomer(
            @PathVariable UUID customerId,
            @Validated(PartialUpdateValidation.class) 
            @RequestBody CustomerRequest request) {
        // Handle partial update
        return ResponseEntity.ok(response);
    }
}
```

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

## Validation Configuration

### Global Validator Configuration

Configure the validation framework globally:

```java
package com.example.common.config;

import jakarta.validation.Validator;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.validation.beanvalidation.MethodValidationPostProcessor;

@Configuration
public class ValidationConfig {
    
    @Bean
    public MessageSource validationMessageSource() {
        ReloadableResourceBundleMessageSource messageSource = 
            new ReloadableResourceBundleMessageSource();
        messageSource.setBasename("classpath:validation-messages");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setCacheSeconds(3600);
        return messageSource;
    }
    
    @Bean
    public LocalValidatorFactoryBean validator() {
        LocalValidatorFactoryBean factory = new LocalValidatorFactoryBean();
        factory.setValidationMessageSource(validationMessageSource());
        return factory;
    }
    
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

### Custom Validation Messages

Create `validation-messages.properties`:

```properties
# Standard constraint messages
NotNull.customerId=Customer ID is required
NotEmpty.items=Order must contain at least one item
Size.name=Name must be between {min} and {max} characters
Pattern.zipCode=Invalid ZIP code format. Expected format: 12345 or 12345-6789

# Custom constraint messages
ValidOrderDate.deliveryDateTime=Delivery date must be at least {minHoursInFuture} hours in the future
ValidDateRange.endDate=End date must be after start date

# Field-specific messages
CreateOrderRequest.customerId=Customer ID is required for order creation
UpdateOrderRequest.items=At least one item must be updated
```

## Integration with RFC 7807 Error Responses

### Problem Detail DTO

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

## Testing Validation Logic

### Unit Testing Custom Validators

```java
package com.example.common.validation;

import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class OrderDateValidatorTest {
    
    private OrderDateValidator validator;
    
    @Mock
    private ConstraintValidatorContext context;
    
    @BeforeEach
    void setUp() {
        validator = new OrderDateValidator();
        
        // Initialize with default 24 hours
        ValidOrderDate annotation = new ValidOrderDate() {
            @Override
            public Class<? extends java.lang.annotation.Annotation> 
                    annotationType() {
                return ValidOrderDate.class;
            }
            
            @Override
            public String message() {
                return "Order date must be at least 24 hours in the future";
            }
            
            @Override
            public Class<?>[] groups() {
                return new Class[0];
            }
            
            @Override
            public Class<? extends jakarta.validation.Payload>[] payload() {
                return new Class[0];
            }
            
            @Override
            public int minHoursInFuture() {
                return 24;
            }
        };
        
        validator.initialize(annotation);
    }
    
    @Test
    void shouldReturnTrue_WhenDateIsBeyondMinimumHours() {
        // Given
        LocalDateTime futureDate = LocalDateTime.now().plusHours(25);
        
        // When
        boolean result = validator.isValid(futureDate, context);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void shouldReturnFalse_WhenDateIsBeforeMinimumHours() {
        // Given
        LocalDateTime tooSoon = LocalDateTime.now().plusHours(23);
        
        // When
        boolean result = validator.isValid(tooSoon, context);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void shouldReturnTrue_WhenDateIsNull() {
        // Given
        LocalDateTime nullDate = null;
        
        // When
        boolean result = validator.isValid(nullDate, context);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void shouldReturnFalse_WhenDateIsInPast() {
        // Given
        LocalDateTime pastDate = LocalDateTime.now().minusHours(1);
        
        // When
        boolean result = validator.isValid(pastDate, context);
        
        // Then
        assertThat(result).isFalse();
    }
}
```

### Integration Testing Controller Validation

```java
package com.example.orders.api;

import com.example.orders.application.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderController.class)
class OrderControllerValidationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void shouldReturnBadRequest_WhenRequiredFieldsAreMissing() 
            throws Exception {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        // All required fields are null
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").value(
                "https://api.example.com/problems/validation-error"))
            .andExpect(jsonPath("$.title").value("Request Validation Failed"))
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.errors").isArray())
            .andExpect(jsonPath("$.errors[?(@.field == 'customerId')]").exists())
            .andExpect(jsonPath("$.errors[?(@.field == 'items')]").exists())
            .andExpect(jsonPath("$.errors[?(@.field == 'shippingAddress')]")
                .exists());
    }
    
    @Test
    void shouldReturnBadRequest_WhenNestedValidationFails() throws Exception {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        request.setCustomerId(UUID.randomUUID());
        request.setShippingAddress(new CreateOrderRequest.AddressRequest());
        
        CreateOrderRequest.OrderItemRequest invalidItem = 
            new CreateOrderRequest.OrderItemRequest();
        invalidItem.setProductId(UUID.randomUUID());
        invalidItem.setQuantity(0); // Invalid: must be at least 1
        
        request.setItems(Collections.singletonList(invalidItem));
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[?(@.field == 'items[0].quantity')]")
                .exists())
            .andExpect(jsonPath("$.errors[?(@.field == 'items[0].quantity')]" +
                ".message").value("Quantity must be at least 1"));
    }
    
    @Test
    void shouldReturnBadRequest_WhenPatternValidationFails() 
            throws Exception {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        request.setCustomerId(UUID.randomUUID());
        
        CreateOrderRequest.AddressRequest address = 
            new CreateOrderRequest.AddressRequest();
        address.setStreet("123 Main St");
        address.setCity("Springfield");
        address.setState("INVALID"); // Invalid: must be 2-letter state code
        address.setZipCode("12345");
        
        request.setShippingAddress(address);
        request.setItems(Collections.singletonList(createValidItem()));
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[?(@.field == 'shippingAddress.state')]")
                .exists());
    }
    
    private CreateOrderRequest.OrderItemRequest createValidItem() {
        CreateOrderRequest.OrderItemRequest item = 
            new CreateOrderRequest.OrderItemRequest();
        item.setProductId(UUID.randomUUID());
        item.setQuantity(1);
        item.setUnitPrice(new java.math.BigDecimal("19.99"));
        return item;
    }
}
```

### Testing JSON Schema Validation

```java
package com.example.common.validation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JsonSchemaValidatorTest {
    
    private JsonSchemaValidator validator;
    private ObjectMapper objectMapper;
    
    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        validator = new JsonSchemaValidator(objectMapper);
    }
    
    @Test
    void shouldPassValidation_WhenPayloadMatchesSchema() {
        // Given
        OrderCreationDto validOrder = OrderCreationDto.builder()
            .customerId(UUID.randomUUID())
            .items(Collections.singletonList(createValidItem()))
            .shippingAddress(createValidAddress())
            .build();
        
        // When & Then
        // Should not throw exception
        validator.validate(validOrder, "schemas/order-v1.json");
    }
    
    @Test
    void shouldFailValidation_WhenRequiredFieldMissing() {
        // Given
        OrderCreationDto invalidOrder = OrderCreationDto.builder()
            .items(Collections.singletonList(createValidItem()))
            .shippingAddress(createValidAddress())
            // Missing customerId
            .build();
        
        // When & Then
        assertThatThrownBy(() -> 
            validator.validate(invalidOrder, "schemas/order-v1.json"))
            .isInstanceOf(JsonSchemaValidationException.class)
            .hasMessageContaining("customerId");
    }
    
    @Test
    void shouldFailValidation_WhenFieldTypeIsWrong() {
        // Given - Create invalid payload as a Map to bypass type checking
        Map<String, Object> invalidOrder = new HashMap<>();
        invalidOrder.put("customerId", 12345); // Wrong type: should be UUID
        invalidOrder.put("items", Collections.singletonList(createValidItem()));
        invalidOrder.put("shippingAddress", createValidAddress());
        
        // When & Then
        assertThatThrownBy(() -> 
            validator.validate(invalidOrder, "schemas/order-v1.json"))
            .isInstanceOf(JsonSchemaValidationException.class);
    }
    
    private OrderItemDto createValidItem() {
        return OrderItemDto.builder()
            .productId(UUID.randomUUID())
            .quantity(1)
            .unitPrice(new java.math.BigDecimal("19.99"))
            .build();
    }
    
    private AddressDto createValidAddress() {
        return AddressDto.builder()
            .street("123 Main St")
            .city("Springfield")
            .state("IL")
            .zipCode("62701")
            .build();
    }
}
```

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

### 2. Clear Error Messages

Provide actionable error messages:

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

### 3. Use Validation Groups Wisely

Apply different rules for different operations:

```java
// Creation requires certain fields
@NotNull(groups = CreateValidation.class)
private UUID customerId;

// Updates may have different requirements
@Null(groups = CreateValidation.class)
@NotNull(groups = UpdateValidation.class)
private UUID id;
```

### 4. Fail Fast

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

### 5. Consistent Error Response Format

Always use RFC 7807 Problem Details:

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

### 6. Document Validation Rules

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

### 7. Test Validation Thoroughly

Write comprehensive tests for validation logic:

```java
@Test
void shouldValidateAllConstraints() {
    // Test each validation annotation
    // Test boundary conditions
    // Test null handling
    // Test nested validation
}
```

## Related Documentation

- [Validation Standards](../error-handling/validation-standards.md) - Service-level validation patterns
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) - Global exception handlers
- [Error Response Formats](../error-handling/error-response-formats.md) - RFC 7807 implementation
- [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md) - Language-agnostic schema patterns
- [Request Response Mapping](../controllers/request-response-mapping.md) - DTO and mapper patterns
- [OpenAPI Standards](../../../guides/api-design/documentation/openapi-standards.md) - API documentation standards
