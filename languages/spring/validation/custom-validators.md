# Custom Validators

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 10 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Jakarta Bean Validation fundamentals  
> **🎯 Key Topics:** Custom Constraints, Cross-Field Validation, Validation Groups
> 
> **📊 Complexity:** Intermediate technical content

## Overview

This guide covers creating custom validators for business-specific validation rules. Learn how to build custom constraint annotations, implement cross-field validation, and use validation groups for different contexts.

**Prerequisites**: Review [Validation Fundamentals](validation-fundamentals.md) for Jakarta Bean Validation basics.

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

## Best Practices

### 1. Separate Concerns

Use custom validators for business logic, standard validators for format:

```java
@Data
public class ScheduleOrderRequest {
    
    // Standard validation for format
    @NotNull(message = "Delivery date is required")
    private LocalDateTime deliveryDateTime;
    
    // Custom validation for business rules
    @ValidOrderDate(minHoursInFuture = 48)
    private LocalDateTime deliveryDateTime;
}
```

### 2. Let @NotNull Handle Nulls

Custom validators should delegate null checking to `@NotNull`:

```java
@Override
public boolean isValid(LocalDateTime value, 
                      ConstraintValidatorContext context) {
    // Return true for null - let @NotNull handle this
    if (value == null) {
        return true;
    }
    
    // Validate non-null values
    return value.isAfter(LocalDateTime.now().plusHours(minHoursInFuture));
}
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

### 4. Provide Contextual Error Messages

Build custom error messages with context:

```java
if (!isValid) {
    context.disableDefaultConstraintViolation();
    context.buildConstraintViolationWithTemplate(
        "End date must be after start date")
        .addPropertyNode(endField)
        .addConstraintViolation();
}
```

### 5. Use Reflection Carefully

Cache reflected fields for performance in production validators:

```java
public class DateRangeValidator 
        implements ConstraintValidator<ValidDateRange, Object> {
    
    private Field startFieldRef;
    private Field endFieldRef;
    
    @Override
    public void initialize(ValidDateRange constraintAnnotation) {
        try {
            // Cache field references during initialization
            this.startFieldRef = getField(constraintAnnotation.startField());
            this.endFieldRef = getField(constraintAnnotation.endField());
        } catch (NoSuchFieldException e) {
            throw new IllegalArgumentException("Invalid field names", e);
        }
    }
}
```

## Related Documentation

### Next Steps
- [Advanced Validation](advanced-validation.md) - JSON Schema and method-level validation
- [Validation Testing](validation-testing.md) - Test custom validators

### Spring Implementation
- [Validation Fundamentals](validation-fundamentals.md) - Jakarta Bean Validation basics
- [Validation Standards](../error-handling/validation-standards.md) - Service-level validation
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) - Exception handlers

### Language-Agnostic Theory
- [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md) - Schema patterns
- [Error Response Standards](../../../guides/api-design/request-response/error-response-standards.md) - Error formats
