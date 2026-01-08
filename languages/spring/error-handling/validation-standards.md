# Validation Standards

> **Note**: For complete schema validation patterns including Jakarta Validation, JSON Schema, custom validators, and validation groups, see [Schema Validation](../validation/schema-validation.md).

## Overview

This document covers validation in Spring Boot. It shows how to use built-in validation tools. It also covers custom validation for specific business rules. Examples include both synchronous (imperative) and asynchronous (reactive) applications.

## Bean Validation

### Basic Validation Annotations

Spring includes built-in validation annotations for common checks. These annotations handle most validation needs without custom code:

```java
@Data
public class CreateOrderRequest {
    
    @NotNull(message = "Customer ID is required")
    private UUID customerId;
    
    @NotEmpty(message = "At least one item is required")
    private List<OrderItemRequest> items;
    
    @Valid
    @NotNull(message = "Shipping address is required")
    private AddressRequest shippingAddress;
    
    @Data
    public static class OrderItemRequest {
        @NotNull(message = "Product ID is required")
        private UUID productId;
        
        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;
        
        @DecimalMin(value = "0.01", message = "Price must be greater than 0")
        private BigDecimal price;
    }
    
    @Data
    public static class AddressRequest {
        @NotBlank(message = "Street is required")
        @Size(max = 255, message = "Street cannot exceed 255 characters")
        private String street;
        
        @NotBlank(message = "City is required")
        @Size(max = 100, message = "City cannot exceed 100 characters")
        private String city;
        
        @NotBlank(message = "Zip code is required")
        @Pattern(regexp = "^\\d{5}(-\\d{4})?$", message = "Invalid zip code format")
        private String zipCode;
        
        @NotBlank(message = "Country is required")
        @Size(min = 2, max = 2, message = "Country must be a 2-letter ISO code")
        private String country;
    }
}
```

### Common Validation Annotations

| Annotation | What It Checks |
|------------|--------|
| `@NotNull` | Field is required |
| `@NotEmpty` | Collection or string is required |
| `@NotBlank` | String is required and not spaces |
| `@Size` | String or list size limits |
| `@Min`/`@Max` | Number range limits |
| `@DecimalMin`/`@DecimalMax` | Decimal number range limits |
| `@Pattern` | Text pattern matching |
| `@Email` | Email format |
| `@Valid` | Check nested objects |

## Custom Validators

### Creating Custom Validation Annotations

Built-in annotations work for simple checks. For complex business logic, create custom validators. Custom validators let you write code that checks business rules:

```java
package com.example.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = OrderDateValidator.class)
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidOrderDate {
    String message() default "Order date must be in the future";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

### Custom Validator Implementation

```java
package com.example.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.LocalDate;

public class OrderDateValidator implements ConstraintValidator<ValidOrderDate, LocalDate> {
    
    @Override
    public boolean isValid(LocalDate value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // Let @NotNull handle null validation
        }
        
        return value.isAfter(LocalDate.now());
    }
}
```

### Cross-Field Validation

Some validations need to check multiple fields together. For example, an end date must be after a start date. Create validators that compare related fields:

```java
package com.example.validation;

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

```java
package com.example.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.lang.reflect.Field;
import java.time.LocalDate;

public class DateRangeValidator implements ConstraintValidator<ValidDateRange, Object> {
    
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
            
            if (startDate == null || endDate == null) {
                return true; // Let other validators handle null values
            }
            
            return endDate.isAfter(startDate);
            
        } catch (Exception e) {
            return false;
        }
    }
}
```

## Service-Level Validation

### Business Rule Validation

Some checks need to access the database or external systems. You cannot do this with simple annotations. Instead, implement these checks in your service layer. This keeps validation logic near your business logic:

```java
@Service
@RequiredArgsConstructor
public class OrderValidator {
    
    private final ProductService productService;
    private final CustomerService customerService;
    
    public void validateOrder(OrderCreationDto orderDto) {
        List<ValidationException.ValidationError> errors = new ArrayList<>();
        
        // Validate customer exists and is active
        try {
            CustomerDto customer = customerService.getCustomer(orderDto.getCustomerId());
            if (!customer.isActive()) {
                errors.add(new ValidationException.ValidationError(
                    "customerId", "CUSTOMER_INACTIVE", "Customer account is inactive"));
            }
        } catch (ResourceNotFoundException e) {
            errors.add(new ValidationException.ValidationError(
                "customerId", "CUSTOMER_NOT_FOUND", "Customer not found"));
        }
        
        // Validate products exist and have sufficient inventory
        for (int i = 0; i < orderDto.getItems().size(); i++) {
            OrderItemDto item = orderDto.getItems().get(i);
            try {
                ProductDto product = productService.getProduct(item.getProductId());
                if (product.getStock() < item.getQuantity()) {
                    errors.add(new ValidationException.ValidationError(
                        String.format("items[%d].quantity", i), 
                        "INSUFFICIENT_STOCK", 
                        "Insufficient stock for product " + product.getName()));
                }
            } catch (ResourceNotFoundException e) {
                errors.add(new ValidationException.ValidationError(
                    String.format("items[%d].productId", i), 
                    "PRODUCT_NOT_FOUND", 
                    "Product not found: " + item.getProductId()));
            }
        }
        
        // Validate minimum order amount
        BigDecimal total = calculateTotal(orderDto.getItems());
        if (total.compareTo(new BigDecimal("10.00")) < 0) {
            errors.add(new ValidationException.ValidationError(
                "items", "MINIMUM_ORDER_AMOUNT", "Order total must be at least $10.00"));
        }
        
        // Throw validation exception if any errors exist
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }
    
    private BigDecimal calculateTotal(List<OrderItemDto> items) {
        return items.stream()
            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

### Reactive Service-Level Validation

Reactive applications work differently. They do not block while waiting for database calls. Use async validation patterns with Mono and Flux instead of direct method calls:

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderValidator {
    
    private final ReactiveProductService productService;
    private final ReactiveCustomerService customerService;
    
    public Mono<Void> validateOrder(OrderCreationDto orderDto) {
        return Mono.defer(() -> {
            List<Mono<ValidationException.ValidationError>> validationTasks = new ArrayList<>();
            
            // Validate customer exists and is active
            Mono<ValidationException.ValidationError> customerValidation = customerService
                .getCustomer(orderDto.getCustomerId())
                .flatMap(customer -> {
                    if (!customer.isActive()) {
                        return Mono.just(new ValidationException.ValidationError(
                            "customerId", "CUSTOMER_INACTIVE", "Customer account is inactive"));
                    }
                    return Mono.<ValidationException.ValidationError>empty();
                })
                .onErrorReturn(CustomerNotFoundException.class, 
                    new ValidationException.ValidationError(
                        "customerId", "CUSTOMER_NOT_FOUND", "Customer not found"));
            
            validationTasks.add(customerValidation);
            
            // Validate products exist and have sufficient inventory
            Flux<ValidationException.ValidationError> productValidations = Flux
                .fromIterable(orderDto.getItems())
                .index()
                .flatMap(indexedItem -> {
                    int index = indexedItem.getT1().intValue();
                    OrderItemDto item = indexedItem.getT2();
                    
                    return productService.getProduct(item.getProductId())
                        .flatMap(product -> {
                            if (product.getStock() < item.getQuantity()) {
                                return Mono.just(new ValidationException.ValidationError(
                                    String.format("items[%d].quantity", index),
                                    "INSUFFICIENT_STOCK", 
                                    "Insufficient stock for product " + product.getName()));
                            }
                            return Mono.<ValidationException.ValidationError>empty();
                        })
                        .onErrorReturn(ProductNotFoundException.class, 
                            new ValidationException.ValidationError(
                                String.format("items[%d].productId", index),
                                "PRODUCT_NOT_FOUND", 
                                "Product not found: " + item.getProductId()));
                });
            
            // Validate minimum order amount
            BigDecimal total = calculateTotal(orderDto.getItems());
            Mono<ValidationException.ValidationError> amountValidation = Mono.defer(() -> {
                if (total.compareTo(new BigDecimal("10.00")) < 0) {
                    return Mono.just(new ValidationException.ValidationError(
                        "items", "MINIMUM_ORDER_AMOUNT", "Order total must be at least $10.00"));
                }
                return Mono.<ValidationException.ValidationError>empty();
            });
            
            validationTasks.add(amountValidation);
            
            // Combine all validation results
            return Flux.merge(
                    Flux.fromIterable(validationTasks).flatMap(task -> task),
                    productValidations
                )
                .collectList()
                .flatMap(errors -> {
                    List<ValidationException.ValidationError> nonEmptyErrors = errors.stream()
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                    
                    if (!nonEmptyErrors.isEmpty()) {
                        return Mono.error(new ValidationException(nonEmptyErrors));
                    }
                    return Mono.empty();
                });
        });
    }
}
```

## Validation Groups

### Defining Validation Groups

Different operations need different rules. For example, when you create an order, the ID must be empty. When you update an order, the ID must exist. Use validation groups to handle these different rules:

```java
public interface CreateValidation {}
public interface UpdateValidation {}

@Data
public class OrderRequest {
    @Null(groups = CreateValidation.class, message = "ID must be null for creation")
    @NotNull(groups = UpdateValidation.class, message = "ID is required for update")
    private UUID id;
    
    @NotNull(groups = {CreateValidation.class, UpdateValidation.class}, 
             message = "Customer ID is required")
    private UUID customerId;
    
    @NotEmpty(groups = CreateValidation.class, message = "At least one item is required")
    private List<OrderItemRequest> items;
}
```

### Using Validation Groups in Controllers

```java
@RestController
@RequestMapping("/v1/orders")
public class OrderController {
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Validated(CreateValidation.class) @RequestBody OrderRequest request) {
        // Handle order creation
    }
    
    @PutMapping("/{orderId}")
    public ResponseEntity<OrderResponse> updateOrder(
            @PathVariable UUID orderId,
            @Validated(UpdateValidation.class) @RequestBody OrderRequest request) {
        // Handle order update
    }
}
```

## Validation Configuration

### Global Validation Configuration

Configure how validation works across your entire application. Set up message sources and factories in one location. This keeps your validation consistent. See [Configuration Principles](../configuration/configuration-principles.md) for detailed examples.

### Custom Validation Messages

Create custom messages in `validation-messages.properties`. These messages show to users when validation fails. Always use clear language that users can understand and act on.

## Method-Level Validation

### Validating Method Parameters

You can validate method parameters in your service classes. This works without HTTP requests. Add `@Validated` to the class and use annotations on the method parameters.

### Validating Return Values

You can also validate what a method returns to callers. This ensures the method never returns invalid data. Add validation annotations to the return type.

## Testing Validation

### Unit Testing Custom Validators

Test custom validators in isolation. Write tests that check they accept valid data and reject invalid data. This ensures your business logic works correctly.

### Integration Testing Validation

Test validation in the full HTTP request flow. Verify that the API returns errors when validation fails. Check that error messages are clear to users. See [Validation Testing](../testing/validation-testing.md) for detailed examples and code.

## Best Practices

1. **Use Built-in Annotations**: Use standard annotations for common checks. They are simple and fast.
2. **Custom Validators for Business Logic**: Create custom validators only when built-in annotations do not work.
3. **Use Validation Groups**: Apply different rules in different situations. Separate create and update logic.
4. **Service-Level for Database Checks**: Validate against the database in the service layer. This is slower than annotations.
5. **Clear Error Messages**: Write error messages users can understand and act on. Avoid technical jargon.
6. **Validate Early**: Catch errors as soon as the request arrives. This stops bad data early.
7. **Keep Separation**: Keep validation separate from business logic. This makes code easier to test.

## Common Validation Patterns

### Pattern: Conditional Validation

Use validation groups when different fields are required in different situations. This lets you reuse the same class for multiple operations.

### Pattern: Collection Validation

Use `@NotEmpty` for lists to require at least one item. Use `@Size` to limit the maximum number of items in a collection.

### Pattern: Dependent Field Validation

When one field depends on another field's value, use custom validators. For example, payment type determines which payment fields are required. A credit card type needs a card number. A bank transfer type needs an account number.

## Related Documentation

- [Exception Hierarchy](./exception-hierarchy.md) - Exception classes and inheritance
- [Error Response Formats](./error-response-formats.md) - RFC 9457 and response structures
- [Imperative Error Handling](./imperative-error-handling.md) - Spring MVC global exception handlers
- [Reactive Error Handling](./reactive-error-handling.md) - WebFlux error handling patterns
- [Error Logging and Monitoring](./error-logging-and-monitoring.md) - Structured logging and metrics