# Request Response Mapping

## Overview

This document covers the implementation of DTOs, mappers, and validation for controller request and response handling. Proper mapping between API DTOs and application/domain models is crucial for maintaining clean architecture boundaries.

## Request DTOs

### Request DTO Structure

Request DTOs should include validation annotations and follow clear naming patterns:

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;
import java.util.UUID;

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
    }
    
    @Data
    public static class AddressRequest {
        @NotBlank(message = "Street is required")
        private String street;
        
        @NotBlank(message = "City is required")
        private String city;
        
        @NotBlank(message = "Zip code is required")
        @Pattern(regexp = "^\\d{5}(-\\d{4})?$", message = "Invalid zip code format")
        private String zipCode;
    }
}
```

### Update Request DTO Pattern

```java
@Data
public class UpdateOrderRequest {
    
    @Valid
    private List<OrderItemRequest> items;
    
    @Valid
    private AddressRequest shippingAddress;
    
    private String notes;
    
    // Nested classes similar to CreateOrderRequest
}
```

### Complex Request DTO with Custom Validation

```java
@Data
@ValidOrderRequest // Custom class-level validation
public class CreateOrderRequest {
    
    @NotNull(message = "Customer ID is required")
    private UUID customerId;
    
    @NotEmpty(message = "At least one item is required")
    @Size(max = 50, message = "Maximum 50 items allowed")
    private List<@Valid OrderItemRequest> items;
    
    @Valid
    @NotNull(message = "Shipping address is required")
    private AddressRequest shippingAddress;
    
    @Valid
    private AddressRequest billingAddress;
    
    @Pattern(regexp = "STANDARD|EXPRESS|OVERNIGHT", message = "Invalid shipping method")
    private String shippingMethod = "STANDARD";
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Discount must be positive")
    @DecimalMax(value = "100.0", message = "Discount cannot exceed 100%")
    private BigDecimal discountPercentage;
}

// Custom validation annotation
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = OrderRequestValidator.class)
public @interface ValidOrderRequest {
    String message() default "Invalid order request";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

@Component
public class OrderRequestValidator implements ConstraintValidator<ValidOrderRequest, CreateOrderRequest> {
    
    @Override
    public boolean isValid(CreateOrderRequest request, ConstraintValidatorContext context) {
        if (request == null) return true;
        
        // Custom validation logic
        if (request.getBillingAddress() == null && 
            "EXPRESS".equals(request.getShippingMethod())) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                "Billing address is required for express shipping")
                .addPropertyNode("billingAddress")
                .addConstraintViolation();
            return false;
        }
        
        return true;
    }
}
```

## Response DTOs

### Response DTO Structure

Response DTOs should be immutable and include all necessary data:

```java
@Data
@Builder
public class OrderResponse {
    private UUID id;
    private UUID customerId;
    private String status;
    private BigDecimal totalAmount;
    private List<OrderItemResponse> items;
    private AddressResponse shippingAddress;
    private OffsetDateTime createdDate;
    private OffsetDateTime lastModifiedDate;
    
    @Data
    @Builder
    public static class OrderItemResponse {
        private UUID productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
    }
    
    @Data
    @Builder
    public static class AddressResponse {
        private String street;
        private String city;
        private String zipCode;
    }
}
```

### Page Response DTO

```java
@Data
@Builder
public class PageResponse<T> {
    private List<T> data;
    private PageMetadata metadata;
    
    @Data
    @Builder
    public static class PageMetadata {
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
    }
    
    public static <T, U> PageResponse<U> from(Page<T> page, Function<T, U> mapper) {
        List<U> mappedContent = page.getContent().stream()
            .map(mapper)
            .collect(Collectors.toList());
            
        return PageResponse.<U>builder()
            .data(mappedContent)
            .metadata(PageMetadata.builder()
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build())
            .build();
    }
}
```

### Error Response DTO

```java
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    private String type;
    private String title;
    private int status;
    private String detail;
    private String instance;
    private OffsetDateTime timestamp;
    private List<ValidationError> errors;
    
    @Data
    @Builder
    public static class ValidationError {
        private String field;
        private Object rejectedValue;
        private String message;
    }
}
```

## Mappers

### Basic Mapper Implementation

```java
@Component
public class OrderMapper {

    public OrderCreationDto toCreationDto(CreateOrderRequest request) {
        return OrderCreationDto.builder()
            .customerId(request.getCustomerId())
            .items(request.getItems().stream()
                .map(this::toOrderItemDto)
                .collect(Collectors.toList()))
            .shippingAddress(toAddressDto(request.getShippingAddress()))
            .build();
    }
    
    public OrderItemDto toOrderItemDto(CreateOrderRequest.OrderItemRequest request) {
        return OrderItemDto.builder()
            .productId(request.getProductId())
            .quantity(request.getQuantity())
            .build();
    }
    
    public AddressDto toAddressDto(CreateOrderRequest.AddressRequest request) {
        return AddressDto.builder()
            .street(request.getStreet())
            .city(request.getCity())
            .zipCode(request.getZipCode())
            .build();
    }
    
    public OrderResponse toResponse(OrderDto orderDto) {
        return OrderResponse.builder()
            .id(orderDto.getId())
            .customerId(orderDto.getCustomerId())
            .status(orderDto.getStatus().name())
            .totalAmount(orderDto.getTotalAmount())
            .items(orderDto.getItems().stream()
                .map(this::toOrderItemResponse)
                .collect(Collectors.toList()))
            .shippingAddress(toAddressResponse(orderDto.getShippingAddress()))
            .createdDate(orderDto.getCreatedDate())
            .lastModifiedDate(orderDto.getLastModifiedDate())
            .build();
    }
    
    public OrderResponse.OrderItemResponse toOrderItemResponse(OrderItemDto itemDto) {
        return OrderResponse.OrderItemResponse.builder()
            .productId(itemDto.getProductId())
            .productName(itemDto.getProductName())
            .quantity(itemDto.getQuantity())
            .unitPrice(itemDto.getUnitPrice())
            .subtotal(itemDto.getSubtotal())
            .build();
    }
    
    public OrderResponse.AddressResponse toAddressResponse(AddressDto addressDto) {
        return OrderResponse.AddressResponse.builder()
            .street(addressDto.getStreet())
            .city(addressDto.getCity())
            .zipCode(addressDto.getZipCode())
            .build();
    }
    
    public PageResponse<OrderResponse> toPageResponse(Page<OrderDto> orderPage) {
        return PageResponse.from(orderPage, this::toResponse);
    }
}
```

### Advanced Mapper with MapStruct

```java
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface OrderMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdDate", ignore = true)
    @Mapping(target = "lastModifiedDate", ignore = true)
    OrderCreationDto toCreationDto(CreateOrderRequest request);
    
    @Mapping(target = "status", source = "status", qualifiedByName = "statusToString")
    OrderResponse toResponse(OrderDto orderDto);
    
    @Mapping(target = "items", source = "items")
    OrderUpdateDto toUpdateDto(UpdateOrderRequest request);
    
    List<OrderResponse> toResponseList(List<OrderDto> orderDtos);
    
    @Named("statusToString")
    default String statusToString(OrderStatus status) {
        return status != null ? status.name() : null;
    }
    
    default PageResponse<OrderResponse> toPageResponse(Page<OrderDto> orderPage) {
        return PageResponse.from(orderPage, this::toResponse);
    }
}
```

### Conditional Mapping

```java
@Component
public class OrderMapper {

    public OrderResponse toResponse(OrderDto orderDto, boolean includeItems) {
        OrderResponse.OrderResponseBuilder builder = OrderResponse.builder()
            .id(orderDto.getId())
            .customerId(orderDto.getCustomerId())
            .status(orderDto.getStatus().name())
            .totalAmount(orderDto.getTotalAmount())
            .shippingAddress(toAddressResponse(orderDto.getShippingAddress()))
            .createdDate(orderDto.getCreatedDate())
            .lastModifiedDate(orderDto.getLastModifiedDate());
        
        if (includeItems && orderDto.getItems() != null) {
            builder.items(orderDto.getItems().stream()
                .map(this::toOrderItemResponse)
                .collect(Collectors.toList()));
        }
        
        return builder.build();
    }
    
    public OrderResponse toSummaryResponse(OrderDto orderDto) {
        return toResponse(orderDto, false);
    }
    
    public OrderResponse toDetailedResponse(OrderDto orderDto) {
        return toResponse(orderDto, true);
    }
}
```

## Validation Standards

### Standard Validation Annotations

```java
public class ValidationExamples {
    
    @NotNull(message = "Field is required")
    private String requiredField;
    
    @NotBlank(message = "Field cannot be blank")
    private String nonBlankField;
    
    @NotEmpty(message = "Collection cannot be empty")
    private List<String> nonEmptyList;
    
    @Size(min = 2, max = 50, message = "Field must be between 2 and 50 characters")
    private String sizedField;
    
    @Min(value = 1, message = "Value must be at least 1")
    private Integer minValue;
    
    @Max(value = 100, message = "Value cannot exceed 100")
    private Integer maxValue;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Value must be positive")
    private BigDecimal positiveDecimal;
    
    @Pattern(regexp = "^[A-Z]{2,3}$", message = "Invalid format")
    private String patternField;
    
    @Email(message = "Invalid email format")
    private String emailField;
    
    @Valid
    private NestedObject nestedObject;
}
```

### Custom Validation Groups

```java
public interface CreateValidation {}
public interface UpdateValidation {}

@Data
public class OrderRequest {
    
    @NotNull(groups = CreateValidation.class, message = "Customer ID is required for creation")
    @Null(groups = UpdateValidation.class, message = "Customer ID cannot be changed")
    private UUID customerId;
    
    @NotEmpty(groups = {CreateValidation.class, UpdateValidation.class})
    private List<OrderItemRequest> items;
}

// In controller
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Validated(CreateValidation.class) @RequestBody OrderRequest request) {
    // Implementation
}

@PutMapping("/{orderId}")
public ResponseEntity<OrderResponse> updateOrder(
        @PathVariable UUID orderId,
        @Validated(UpdateValidation.class) @RequestBody OrderRequest request) {
    // Implementation
}
```

### Programmatic Validation

```java
@Component
public class OrderValidationService {
    
    private final Validator validator;
    
    public OrderValidationService(Validator validator) {
        this.validator = validator;
    }
    
    public void validateOrderCreation(CreateOrderRequest request) {
        Set<ConstraintViolation<CreateOrderRequest>> violations = 
            validator.validate(request, CreateValidation.class);
        
        if (!violations.isEmpty()) {
            throw new ValidationException("Order validation failed", violations);
        }
        
        // Additional business validation
        validateBusinessRules(request);
    }
    
    private void validateBusinessRules(CreateOrderRequest request) {
        // Custom business validation logic
        if (request.getItems().size() > 10 && 
            "EXPRESS".equals(request.getShippingMethod())) {
            throw new BusinessValidationException(
                "Express shipping not available for orders with more than 10 items");
        }
    }
}
```

## Best Practices

### 1. Separation of Concerns

Keep API DTOs separate from application DTOs:

```java
// API layer DTOs (controllers package)
public class CreateOrderRequest { /* API structure */ }
public class OrderResponse { /* API structure */ }

// Application layer DTOs (application package)
public class OrderCreationDto { /* Application structure */ }
public class OrderDto { /* Application structure */ }

// Domain objects (domain package)
public class Order { /* Domain structure */ }
```

### 2. Immutable Response DTOs

Use builders and make response DTOs immutable:

```java
@Value
@Builder
public class OrderResponse {
    UUID id;
    UUID customerId;
    String status;
    BigDecimal totalAmount;
    List<OrderItemResponse> items;
    OffsetDateTime createdDate;
}
```

### 3. Null Safety

Handle null values appropriately:

```java
public OrderResponse toResponse(OrderDto orderDto) {
    if (orderDto == null) {
        return null;
    }
    
    return OrderResponse.builder()
        .id(orderDto.getId())
        .customerId(orderDto.getCustomerId())
        .status(orderDto.getStatus() != null ? orderDto.getStatus().name() : null)
        .items(Optional.ofNullable(orderDto.getItems())
            .orElse(Collections.emptyList())
            .stream()
            .map(this::toOrderItemResponse)
            .collect(Collectors.toList()))
        .build();
}
```

### 4. Validation Error Handling

Consistent error response formatting:

```java
@ControllerAdvice
public class ValidationExceptionHandler {
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException ex) {
        
        List<ErrorResponse.ValidationError> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> ErrorResponse.ValidationError.builder()
                .field(error.getField())
                .rejectedValue(error.getRejectedValue())
                .message(error.getDefaultMessage())
                .build())
            .collect(Collectors.toList());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .type("about:blank")
            .title("Validation Failed")
            .status(400)
            .detail("Request validation failed")
            .timestamp(OffsetDateTime.now())
            .errors(errors)
            .build();
        
        return ResponseEntity.badRequest().body(errorResponse);
    }
}
```

These mapping patterns ensure clean separation between API contracts and internal application structures while providing robust validation and error handling.