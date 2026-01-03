# Validation Standards

> **Note**: For complete schema validation patterns including Jakarta Validation, JSON Schema, custom validators, and validation groups, see [Schema Validation](../validation/schema-validation.md).

## Overview

This document outlines validation standards and patterns for Spring Boot applications, covering both Bean Validation (JSR-380) and custom validation approaches for both imperative and reactive applications.

## Bean Validation (JSR-380)

### Basic Validation Annotations

Use standard JSR-380 annotations for common validation scenarios:

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

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@NotNull` | Field cannot be null | `@NotNull private UUID id;` |
| `@NotEmpty` | Collection/String cannot be null or empty | `@NotEmpty private List<String> items;` |
| `@NotBlank` | String cannot be null, empty, or whitespace | `@NotBlank private String name;` |
| `@Size` | String/Collection size constraints | `@Size(min = 1, max = 50) private String name;` |
| `@Min`/`@Max` | Numeric value constraints | `@Min(1) @Max(100) private Integer quantity;` |
| `@DecimalMin`/`@DecimalMax` | Decimal value constraints | `@DecimalMin("0.01") private BigDecimal price;` |
| `@Pattern` | Regex pattern matching | `@Pattern(regexp = "^[A-Z]{2}$") private String country;` |
| `@Email` | Email format validation | `@Email private String email;` |
| `@Valid` | Nested object validation | `@Valid private AddressRequest address;` |

## Custom Validators

### Creating Custom Validation Annotations

For complex validation logic, implement custom validators:

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

Create validators that operate on multiple fields:

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

For complex business rule validation, implement service-level validation:

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

For reactive applications, use reactive validation patterns:

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

Use validation groups to apply different validation rules in different contexts:

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

Configure validation behavior globally:

```java
@Configuration
public class ValidationConfig {
    
    @Bean
    public LocalValidatorFactoryBean validator() {
        LocalValidatorFactoryBean factory = new LocalValidatorFactoryBean();
        factory.setValidationMessageSource(messageSource());
        return factory;
    }
    
    @Bean
    public MessageSource messageSource() {
        ReloadableResourceBundleMessageSource messageSource = 
            new ReloadableResourceBundleMessageSource();
        messageSource.setBasename("classpath:validation-messages");
        messageSource.setDefaultEncoding("UTF-8");
        return messageSource;
    }
    
    @Bean
    public MethodValidationPostProcessor methodValidationPostProcessor() {
        MethodValidationPostProcessor processor = new MethodValidationPostProcessor();
        processor.setValidator(validator());
        return processor;
    }
}
```

### Custom Validation Messages

Create custom validation messages in `validation-messages.properties`:

```properties
# Custom validation messages
customer.id.required=Customer ID is required and must be a valid UUID
order.items.required=Order must contain at least one item
order.amount.minimum=Order total must be at least {value}
product.stock.insufficient=Insufficient stock for product {productName}. Available: {available}, Requested: {requested}
```

## Method-Level Validation

### Validating Method Parameters

```java
@Service
@Validated
public class OrderService {
    
    public OrderDto createOrder(@Valid OrderCreationDto orderDto) {
        // Service logic
    }
    
    public OrderDto getOrder(@NotNull UUID orderId) {
        // Service logic
    }
    
    public List<OrderDto> getOrdersByCustomer(
            @NotNull UUID customerId,
            @Min(0) int page,
            @Min(1) @Max(100) int size) {
        // Service logic
    }
}
```

### Validating Return Values

```java
@Service
@Validated
public class OrderService {
    
    @NotNull
    public OrderDto createOrder(@Valid OrderCreationDto orderDto) {
        // Service logic
    }
    
    @NotEmpty
    public List<OrderDto> getActiveOrders() {
        // Service logic
    }
}
```

## Testing Validation

### Unit Testing Custom Validators

```java
@ExtendWith(MockitoExtension.class)
public class OrderDateValidatorTest {
    
    private OrderDateValidator validator;
    
    @Mock
    private ConstraintValidatorContext context;
    
    @BeforeEach
    void setUp() {
        validator = new OrderDateValidator();
    }
    
    @Test
    void shouldReturnTrue_WhenDateIsInFuture() {
        // Given
        LocalDate futureDate = LocalDate.now().plusDays(1);
        
        // When
        boolean result = validator.isValid(futureDate, context);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void shouldReturnFalse_WhenDateIsInPast() {
        // Given
        LocalDate pastDate = LocalDate.now().minusDays(1);
        
        // When
        boolean result = validator.isValid(pastDate, context);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void shouldReturnTrue_WhenDateIsNull() {
        // Given
        LocalDate nullDate = null;
        
        // When
        boolean result = validator.isValid(nullDate, context);
        
        // Then
        assertThat(result).isTrue();
    }
}
```

### Integration Testing Validation

```java
@WebMvcTest(OrderController.class)
public class OrderControllerValidationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void shouldReturnBadRequest_WhenRequiredFieldsAreMissing() throws Exception {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        // Missing required fields
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(asJsonString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").value("https://api.example.com/problems/validation-error"))
            .andExpect(jsonPath("$.errors").isArray())
            .andExpect(jsonPath("$.errors[?(@.field == 'customerId')]").exists())
            .andExpect(jsonPath("$.errors[?(@.field == 'items')]").exists());
    }
    
    @Test
    void shouldReturnBadRequest_WhenNestedValidationFails() throws Exception {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        request.setCustomerId(UUID.randomUUID());
        
        OrderItemRequest item = new OrderItemRequest();
        item.setProductId(UUID.randomUUID());
        item.setQuantity(0); // Invalid quantity
        
        request.setItems(List.of(item));
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(asJsonString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[?(@.field == 'items[0].quantity')]").exists());
    }
}
```

## Best Practices

1. **Use Standard Annotations**: Prefer JSR-380 annotations for common validation scenarios
2. **Custom Validators for Complex Logic**: Create custom validators for business-specific validation
3. **Validation Groups**: Use validation groups to apply different rules in different contexts
4. **Service-Level Validation**: Implement complex business rule validation at the service level
5. **Clear Error Messages**: Provide clear, actionable validation error messages
6. **Fail Fast**: Validate input as early as possible in the request processing pipeline
7. **Separate Concerns**: Keep validation logic separate from business logic

## Common Validation Patterns

### Pattern: Conditional Validation

```java
@Data
public class ConditionalValidationExample {
    
    private OrderType type;
    
    @NotNull(groups = ExpressOrderValidation.class)
    private LocalDateTime deliveryTime;
    
    @NotNull(groups = StandardOrderValidation.class)
    private String deliveryInstructions;
}
```

### Pattern: Collection Validation

```java
@Data
public class CollectionValidationExample {
    
    @NotEmpty(message = "Items cannot be empty")
    @Size(max = 50, message = "Cannot exceed 50 items")
    @Valid
    private List<OrderItemRequest> items;
    
    @NotEmpty(message = "Tags cannot be empty")
    @Size(max = 10, message = "Cannot exceed 10 tags")
    private Set<@NotBlank @Size(max = 50) String> tags;
}
```

### Pattern: Dependent Field Validation

```java
@ValidPaymentInfo
@Data
public class PaymentRequest {
    
    @NotNull
    private PaymentType paymentType;
    
    // Only required for CREDIT_CARD payment type
    private String cardNumber;
    
    // Only required for BANK_TRANSFER payment type
    private String bankAccount;
}
```

## Related Documentation

- [Exception Hierarchy](./exception-hierarchy.md) - Exception classes and inheritance
- [Error Response Formats](./error-response-formats.md) - RFC 7807 and response structures
- [Imperative Error Handling](./imperative-error-handling.md) - Spring MVC global exception handlers
- [Reactive Error Handling](./reactive-error-handling.md) - WebFlux error handling patterns
- [Error Logging and Monitoring](./error-logging-and-monitoring.md) - Structured logging and metrics