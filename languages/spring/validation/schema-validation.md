# Schema Validation

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 18 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Spring Boot basics, REST API knowledge  
> **🎯 Key Topics:** Jakarta Validation, JSON Schema, Custom Validators
> 
> **📊 Complexity:** Grade 14 • Intermediate technical content

## Overview

This guide shows how to validate request data in Spring Boot using Jakarta Validation, JSON Schema, and custom validators.

Schema validation checks data at the API boundary. It finds errors early and protects your business logic.

**Prerequisites**: Review [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md) for patterns.

## Jakarta Bean Validation Fundamentals

### Core Validation Annotations

Jakarta Validation provides standard annotations for checking common validation rules:

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

| Annotation | Purpose |
|------------|---------|
| `@NotNull` | Field cannot be null |
| `@NotEmpty` | Cannot be null or empty |
| `@NotBlank` | Cannot be null, empty, or spaces |
| `@Size` | Set min/max length |
| `@Min` / `@Max` | Set min/max numbers |
| `@DecimalMin` / `@DecimalMax` | Set min/max decimals |
| `@Pattern` | Match text pattern |
| `@Email` | Must be email format |
| `@Past` / `@Future` | Date checks |
| `@Valid` | Validate nested objects |

### Enabling Validation in Controllers

Add `@Valid` to your request body to enable validation:

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

When validation fails, Spring throws `MethodArgumentNotValidException`. Handle it in a global exception handler:

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

See [Error Response Formats](../error-handling/error-response-formats.md) for complete RFC 7807 examples.

## Custom Constraint Annotations

### Creating a Custom Validator

Create an annotation for your custom validator:

```java
@Documented
@Constraint(validatedBy = OrderDateValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidOrderDate {
    
    String message() default "Order date must be 24+ hours in future";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    int minHoursInFuture() default 24;
}
```

### Implementing the Validator

```java
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
    
    @ValidOrderDate(minHoursInFuture = 48)
    @NotNull(message = "Delivery date is required")
    private LocalDateTime deliveryDateTime;
    
    @NotEmpty(message = "Order needs at least one item")
    private List<@Valid OrderItemRequest> items;
}
```

## Cross-Field Validation

### Class-Level Validators

Check multiple fields at the same time:

```java
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
            Field startFieldRef = value.getClass()
                .getDeclaredField(startField);
            Field endFieldRef = value.getClass()
                .getDeclaredField(endField);
            
            startFieldRef.setAccessible(true);
            endFieldRef.setAccessible(true);
            
            LocalDate startDate = (LocalDate) startFieldRef.get(value);
            LocalDate endDate = (LocalDate) endFieldRef.get(value);
            
            if (startDate == null || endDate == null) {
                return true;
            }
            
            return endDate.isAfter(startDate);
            
        } catch (Exception e) {
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

Groups let you run different rules for creates, updates, and patches:

```java
public interface CreateValidation {}
public interface UpdateValidation {}
public interface PartialUpdateValidation {}
```

### Applying Validation Groups

```java
@Data
public class CustomerRequest {
    
    // Must be null for create, required for update
    @Null(groups = CreateValidation.class)
    @NotNull(groups = UpdateValidation.class)
    private UUID id;
    
    @NotBlank(groups = {CreateValidation.class, UpdateValidation.class})
    @Size(max = 200)
    private String name;
    
    @NotBlank(groups = CreateValidation.class)
    @Email(groups = {CreateValidation.class, UpdateValidation.class})
    private String email;
    
    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$")
    private String phoneNumber;
}
```

### Using Validation Groups in Controllers

```java
@RestController
@RequestMapping("/v1/customers")
public class CustomerController {
    
    @PostMapping
    public ResponseEntity<CustomerResponse> createCustomer(
            @Validated(CreateValidation.class) 
            @RequestBody CustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @PutMapping("/{customerId}")
    public ResponseEntity<CustomerResponse> updateCustomer(
            @PathVariable UUID customerId,
            @Validated(UpdateValidation.class) 
            @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(response);
    }
    
    @PatchMapping("/{customerId}")
    public ResponseEntity<CustomerResponse> partialUpdateCustomer(
            @PathVariable UUID customerId,
            @Validated(PartialUpdateValidation.class) 
            @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(response);
    }
}
```

## JSON Schema Validation

### Adding JSON Schema Dependencies

Add the JSON Schema validator library to your project:

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
                    "Validation failed", errorMessages);
            }
        } catch (IOException e) {
            throw new IllegalStateException(
                "Schema configuration error", e);
        }
    }
    
    private JsonSchema loadSchema(String schemaPath) 
            throws IOException {
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

Enable method validation by adding `@Validated` to your service class:

```java
@Service
@Validated
public class OrderService {
    
    public OrderDto getOrder(@NotNull UUID orderId) {
        return orderRepository.findById(orderId)
            .map(this::mapToDto)
            .orElseThrow(ResourceNotFoundException::new);
    }
    
    public OrderDto createOrder(@Valid OrderCreationDto orderDto) {
        Order order = mapToEntity(orderDto);
        return mapToDto(orderRepository.save(order));
    }
}
```

Spring validates method parameters before your code runs. You can also validate return values with `@NotNull` on the method.

## Validation Configuration

### Global Validator Configuration

Set up the validation framework for your entire application:

```java
@Configuration
public class ValidationConfig {
    
    @Bean
    public MessageSource validationMessageSource() {
        ReloadableResourceBundleMessageSource messageSource = 
            new ReloadableResourceBundleMessageSource();
        messageSource.setBasename("classpath:validation-messages");
        messageSource.setDefaultEncoding("UTF-8");
        return messageSource;
    }
    
    @Bean
    public LocalValidatorFactoryBean validator() {
        LocalValidatorFactoryBean factory = new LocalValidatorFactoryBean();
        factory.setValidationMessageSource(validationMessageSource());
        return factory;
    }
    
    @Bean
    public MethodValidationPostProcessor validationProcessor(
            Validator validator) {
        MethodValidationPostProcessor processor = 
            new MethodValidationPostProcessor();
        processor.setValidator(validator);
        return processor;
    }
}
```

### Custom Validation Messages

Create `validation-messages.properties` to customize error text:

```properties
NotNull.customerId=Customer ID is required
NotEmpty.items=Order needs at least one item
Size.name=Name must be {min} to {max} characters
Pattern.zipCode=Invalid ZIP code format
ValidOrderDate.deliveryDateTime=Order must ship {minHoursInFuture}+ hours ahead
```

## RFC 7807 Error Responses

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
@Slf4j
@ControllerAdvice
public class ValidationExceptionHandler {
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex) {
        List<ProblemDetail.ValidationError> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(this::mapFieldError)
            .collect(Collectors.toList());
        
        return ResponseEntity.badRequest().body(
            buildProblemDetail("validation-error", errors)
        );
    }
    
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolation(
            ConstraintViolationException ex) {
        List<ProblemDetail.ValidationError> errors = ex
            .getConstraintViolations()
            .stream()
            .map(this::mapConstraintViolation)
            .collect(Collectors.toList());
        
        return ResponseEntity.badRequest().body(
            buildProblemDetail("constraint-violation", errors)
        );
    }
}
```

See [Imperative Error Handling](../error-handling/imperative-error-handling.md) for complete patterns.

## Testing Validation

### Unit Testing Custom Validators

```java
@ExtendWith(MockitoExtension.class)
class OrderDateValidatorTest {
    
    private OrderDateValidator validator;
    
    @BeforeEach
    void setUp() {
        validator = new OrderDateValidator();
        validator.initialize(validOrderDate());
    }
    
    @Test
    void shouldReturnTrue_WhenDateIsBeyondMinimumHours() {
        LocalDateTime futureDate = LocalDateTime.now().plusHours(25);
        assertThat(validator.isValid(futureDate, context)).isTrue();
    }
    
    @Test
    void shouldReturnFalse_WhenDateIsBeforeMinimumHours() {
        LocalDateTime tooSoon = LocalDateTime.now().plusHours(23);
        assertThat(validator.isValid(tooSoon, context)).isFalse();
    }
    
    @Test
    void shouldReturnTrue_WhenDateIsNull() {
        assertThat(validator.isValid(null, context)).isTrue();
    }
}
```

### Integration Testing Controller Validation

```java
@WebMvcTest(OrderController.class)
class OrderControllerValidationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Test
    void shouldReturnBadRequest_WhenRequiredFieldsAreMissing() 
            throws Exception {
        CreateOrderRequest request = new CreateOrderRequest();
        
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.errors").isArray());
    }
    
    @Test
    void shouldReturnBadRequest_WhenQuantityInvalid() 
            throws Exception {
        CreateOrderRequest request = createOrderWithInvalidQuantity();
        
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[0].field")
                .value("items[0].quantity"));
    }
}
```

### Testing JSON Schema Validation

```java
class JsonSchemaValidatorTest {
    
    private JsonSchemaValidator validator;
    
    @BeforeEach
    void setUp() {
        validator = new JsonSchemaValidator(new ObjectMapper());
    }
    
    @Test
    void shouldPassValidation_WhenPayloadMatchesSchema() {
        OrderCreationDto validOrder = createValidOrder();
        validator.validate(validOrder, "schemas/order-v1.json");
    }
    
    @Test
    void shouldFailValidation_WhenRequiredFieldMissing() {
        OrderCreationDto invalidOrder = OrderCreationDto.builder()
            .items(Collections.singletonList(createItem()))
            .build();
        
        assertThatThrownBy(() -> 
            validator.validate(invalidOrder, "schemas/order-v1.json"))
            .isInstanceOf(JsonSchemaValidationException.class);
    }
    
    @Test
    void shouldFailValidation_WhenFieldTypeIsWrong() {
        Map<String, Object> invalidOrder = new HashMap<>();
        invalidOrder.put("customerId", 12345);
        
        assertThatThrownBy(() -> 
            validator.validate(invalidOrder, "schemas/order-v1.json"))
            .isInstanceOf(JsonSchemaValidationException.class);
    }
}
```

## Best Practices

### 1. Validation Layer Separation

Validate at multiple layers:

1. **Controller**: Use `@Valid` for basic constraints
2. **Service**: Check business logic and rules
3. **Domain**: Enforce object invariants

Example:

```java
// Layer 1: Controller
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest request) {
    return ResponseEntity.ok(response);
}

// Layer 2: Service
@Service
public class OrderService {
    public OrderDto createOrder(OrderCreationDto dto) {
        validateBusinessRules(dto);
        return save(dto);
    }
}

// Layer 3: Domain
@Entity
public class Order {
    public void addItem(OrderItem item) {
        if (items.size() >= 50) {
            throw new BusinessException("Too many items");
        }
        items.add(item);
    }
}
```

### 2. Clear Error Messages

Write messages that show users how to fix errors:

```java
@NotBlank(message = "Street address required")
@Size(max = 255, message = "Street max 255 characters")
private String street;

@Pattern(regexp = "^\\d{5}(-\\d{4})?$", 
         message = "ZIP: 12345 or 12345-6789")
private String zipCode;
```

### 3. Use Validation Groups Wisely

Apply different rules for creates vs updates:

```java
@NotNull(groups = CreateValidation.class)
private UUID customerId;

@Null(groups = CreateValidation.class)
@NotNull(groups = UpdateValidation.class)
private UUID id;
```

### 4. Fail Fast

Validate as soon as the request arrives. Spring validates the `@Valid` request before running your code.

### 5. Consistent Error Response Format

Always return errors in RFC 7807 format (Problem Details).

### 6. Document Validation Rules

Add validation constraints to your OpenAPI documentation:

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

Test all validation scenarios:

```java
@Test
void shouldValidateAllConstraints() {
    // Test each validation annotation
    // Test boundary conditions
    // Test null handling
    // Test nested validation
}
```

## See Also

- [Validation Standards](../error-handling/validation-standards.md)
- [Imperative Error Handling](../error-handling/imperative-error-handling.md)
- [Error Response Formats](../error-handling/error-response-formats.md)
- [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md)
- [Request Response Mapping](../controllers/request-response-mapping.md)
- [OpenAPI Standards](../../../guides/api-design/documentation/openapi-standards.md)
