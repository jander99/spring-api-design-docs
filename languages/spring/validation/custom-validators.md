# Custom Validators

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 10 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Jakarta Bean Validation basics  
> **🎯 Key Topics:** Custom Constraints, Cross-Field Validation, Groups
> 
> **📊 Complexity:** Intermediate technical content

## Overview

This guide teaches you to create custom validators.

**You will learn:**

- How to build constraint annotations
- How to validate multiple fields together
- How to use groups for different operations

**Start here**: Review [Validation Fundamentals](validation-fundamentals.md) first.

## Custom Constraint Annotations

### Creating a Custom Validator

Write validators for business logic. Here we validate order dates:

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

Apply your custom validator to a field:

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

Validate multiple fields together. Ensure the end date is after the start date:

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

Apply cross-field validation to a class:

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

Use groups to apply different rules for different operations:

```java
package com.example.common.validation;

public interface CreateValidation {}
public interface UpdateValidation {}
public interface PartialUpdateValidation {}
```

### Applying Validation Groups

Use different rules for different operations:

```java
@Data
public class CustomerRequest {
    
    // Creation: must be null
    @Null(groups = CreateValidation.class, 
          message = "ID must be null when creating")
    // Update: must exist
    @NotNull(groups = UpdateValidation.class, 
             message = "ID is required when updating")
    private UUID id;
    
    // Name required for create and update
    @NotBlank(groups = {CreateValidation.class, UpdateValidation.class}, 
              message = "Name is required")
    @Size(max = 200, 
          groups = {CreateValidation.class, UpdateValidation.class})
    private String name;
    
    // Email required for create
    @NotBlank(groups = CreateValidation.class, 
              message = "Email is required")
    @Email(groups = {CreateValidation.class, UpdateValidation.class})
    private String email;
    
    // Phone optional everywhere - only validate format if provided
    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$", 
             groups = {CreateValidation.class, UpdateValidation.class, 
                      PartialUpdateValidation.class},
             message = "Invalid phone number format")
    private String phoneNumber;
}
```

### Using Validation Groups in Controllers

Apply different groups in different endpoints:

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
        // Handle creation with create validation
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(response);
    }
    
    @PutMapping("/{customerId}")
    public ResponseEntity<CustomerResponse> updateCustomer(
            @PathVariable UUID customerId,
            @Validated(UpdateValidation.class) 
            @RequestBody CustomerRequest request) {
        // Handle full update with update validation
        return ResponseEntity.ok(response);
    }
    
    @PatchMapping("/{customerId}")
    public ResponseEntity<CustomerResponse> partialUpdate(
            @PathVariable UUID customerId,
            @Validated(PartialUpdateValidation.class) 
            @RequestBody CustomerRequest request) {
        // Handle partial with different validation
        return ResponseEntity.ok(response);
    }
}
```

## Validation Configuration

### Global Validator Configuration

Set up validation globally for your application:

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

Add custom messages in `validation-messages.properties`:

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

Use custom validators for business rules. Use standard validators for format checks:

```java
@Data
public class ScheduleOrderRequest {
    
    // Standard: Check that value exists
    @NotNull(message = "Delivery date is required")
    private LocalDateTime deliveryDateTime;
    
    // Custom: Check business rule
    @ValidOrderDate(minHoursInFuture = 48)
    private LocalDateTime deliveryDateTime;
}
```

### 2. Let @NotNull Handle Nulls

Let `@NotNull` check for null values. Your validator only handles non-null values:

```java
@Override
public boolean isValid(LocalDateTime value, 
                       ConstraintValidatorContext context) {
    
    // Null values: let @NotNull handle them
    if (value == null) {
        return true;
    }
    
    // Check if date is in the future enough
    LocalDateTime minimum = LocalDateTime.now()
        .plusHours(minHoursInFuture);
    return value.isAfter(minimum);
}
```

### 3. Use Validation Groups Wisely

Different operations need different rules. Create operations are different from updates:

```java
// For creation: customer must exist
@NotNull(groups = CreateValidation.class)
private UUID customerId;

// For updates: ID must exist but must be null on creation
@Null(groups = CreateValidation.class)
@NotNull(groups = UpdateValidation.class)
private UUID id;
```

### 4. Provide Contextual Error Messages

Tell users which field has the problem and how to fix it:

```java
if (!isValid) {
    // Replace default message
    context.disableDefaultConstraintViolation();
    
    // Attach error to specific field
    context.buildConstraintViolationWithTemplate(
            "End date must be after start date")
        .addPropertyNode(endField)
        .addConstraintViolation();
}
```

### 5. Use Reflection Carefully

Cache (store) field references during setup. This improves performance:

```java
public class DateRangeValidator 
        implements ConstraintValidator<ValidDateRange, Object> {
    
    private Field startFieldRef;
    private Field endFieldRef;
    
    @Override
    public void initialize(ValidDateRange constraintAnnotation) {
        try {
            // Store field references once during setup
            // This avoids reflection overhead during validation
            this.startFieldRef = getField(
                constraintAnnotation.startField());
            this.endFieldRef = getField(
                constraintAnnotation.endField());
        } catch (NoSuchFieldException e) {
            throw new IllegalArgumentException(
                "Invalid field names", e);
        }
    }
}
```

## Related Documentation

### Next Steps

- [Advanced Validation](advanced-validation.md) — JSON Schema and methods
- [Validation Testing](validation-testing.md) — Test your validators

### Spring Implementation

- [Validation Fundamentals](validation-fundamentals.md) — Bean Validation basics
- [Validation Standards](../error-handling/validation-standards.md) — Service layer
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) — Exception handling

### Language-Agnostic Theory

- [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md) — Schema patterns
- [Error Response Standards](../../../guides/api-design/request-response/error-response-standards.md) — Error formats
