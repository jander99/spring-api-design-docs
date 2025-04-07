# Error Handling and Exception Management

## Overview

Consistent error handling is crucial for creating robust and maintainable microservices. This document outlines our approach to exception management, error responses, and validation across both imperative and reactive Spring Boot applications.

## Error Handling Principles

1. **Consistent Error Responses**: All error responses follow the same structure
2. **Appropriate Status Codes**: Use HTTP status codes correctly
3. **Meaningful Error Messages**: Provide clear, actionable error information
4. **Security-Conscious**: Avoid exposing sensitive information in errors
5. **Centralized Handling**: Use global exception handlers

## Exception Hierarchy

Implement a clear exception hierarchy to differentiate between different types of errors:

```
ApplicationException (abstract)
├── ResourceNotFoundException
├── ValidationException
├── BusinessException
├── SecurityException
└── TechnicalException
```

### Base Exception Class

```java
package com.example.common.exception;

import lombok.Getter;

@Getter
public abstract class ApplicationException extends RuntimeException {
    
    private final String errorCode;
    private final String message;
    private final transient Object[] args;
    
    protected ApplicationException(String errorCode, String message, Object... args) {
        super(message);
        this.errorCode = errorCode;
        this.message = message;
        this.args = args;
    }
    
    protected ApplicationException(String errorCode, String message, Throwable cause, Object... args) {
        super(message, cause);
        this.errorCode = errorCode;
        this.message = message;
        this.args = args;
    }
}
```

### Specific Exception Classes

```java
package com.example.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends ApplicationException {
    
    public ResourceNotFoundException(String resourceType, Object identifier) {
        super(
            "RESOURCE_NOT_FOUND",
            String.format("%s with identifier %s not found", resourceType, identifier),
            resourceType, identifier
        );
    }
}

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ValidationException extends ApplicationException {
    
    private final List<ValidationError> errors;
    
    public ValidationException(List<ValidationError> errors) {
        super("VALIDATION_ERROR", "Validation failed");
        this.errors = List.copyOf(errors);
    }
    
    public ValidationException(String field, String code, String message) {
        super("VALIDATION_ERROR", "Validation failed");
        this.errors = List.of(new ValidationError(field, code, message));
    }
    
    @Getter
    public static class ValidationError {
        private final String field;
        private final String code;
        private final String message;
        
        public ValidationError(String field, String code, String message) {
            this.field = field;
            this.code = code;
            this.message = message;
        }
    }
    
    public List<ValidationError> getErrors() {
        return errors;
    }
}

@ResponseStatus(HttpStatus.CONFLICT)
public class BusinessException extends ApplicationException {
    
    public BusinessException(String errorCode, String message, Object... args) {
        super(errorCode, message, args);
    }
}

@ResponseStatus(HttpStatus.FORBIDDEN)
public class SecurityException extends ApplicationException {
    
    public SecurityException(String errorCode, String message, Object... args) {
        super(errorCode, message, args);
    }
}

@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
public class TechnicalException extends ApplicationException {
    
    public TechnicalException(String errorCode, String message, Throwable cause, Object... args) {
        super(errorCode, message, cause, args);
    }
}
```

## Error Response Structure

Define a standard error response structure:

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
public class ErrorResponse {
    private String code;
    private String message;
    private List<ValidationError> details;
    private OffsetDateTime timestamp;
    private String requestId;
    
    @Data
    @Builder
    public static class ValidationError {
        private String field;
        private String code;
        private String message;
    }
}
```

## Exception Handling with Spring MVC

### Global Exception Handler

Create a global `@ControllerAdvice` for handling exceptions:

```java
package com.example.common.api;

import com.example.common.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final RequestIdProvider requestIdProvider;
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        
        log.info("Resource not found: {}", ex.getMessage());
        
        ErrorResponse errorResponse = buildErrorResponse(
            ex.getErrorCode(), 
            ex.getMessage(),
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            ValidationException ex, WebRequest request) {
        
        log.info("Validation error: {}", ex.getMessage());
        
        List<ErrorResponse.ValidationError> validationErrors = ex.getErrors().stream()
            .map(error -> ErrorResponse.ValidationError.builder()
                .field(error.getField())
                .code(error.getCode())
                .message(error.getMessage())
                .build())
            .collect(Collectors.toList());
        
        ErrorResponse errorResponse = buildErrorResponse(
            ex.getErrorCode(),
            ex.getMessage(),
            validationErrors,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, WebRequest request) {
        
        log.info("Validation error on request arguments");
        
        List<ErrorResponse.ValidationError> validationErrors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(this::mapToValidationError)
            .collect(Collectors.toList());
        
        ErrorResponse errorResponse = buildErrorResponse(
            "VALIDATION_ERROR",
            "Validation failed",
            validationErrors,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }
    
    @ExceptionHandler(BindException.class)
    public ResponseEntity<ErrorResponse> handleBindException(
            BindException ex, WebRequest request) {
        
        log.info("Binding error: {}", ex.getMessage());
        
        List<ErrorResponse.ValidationError> validationErrors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(this::mapToValidationError)
            .collect(Collectors.toList());
        
        ErrorResponse errorResponse = buildErrorResponse(
            "VALIDATION_ERROR",
            "Binding failed",
            validationErrors,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }
    
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(
            BusinessException ex, WebRequest request) {
        
        log.warn("Business exception: {}", ex.getMessage());
        
        ErrorResponse errorResponse = buildErrorResponse(
            ex.getErrorCode(),
            ex.getMessage(),
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }
    
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ErrorResponse> handleSecurityException(
            SecurityException ex, WebRequest request) {
        
        log.warn("Security exception: {}", ex.getMessage());
        
        ErrorResponse errorResponse = buildErrorResponse(
            ex.getErrorCode(),
            ex.getMessage(),
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }
    
    @ExceptionHandler(TechnicalException.class)
    public ResponseEntity<ErrorResponse> handleTechnicalException(
            TechnicalException ex, WebRequest request) {
        
        log.error("Technical exception", ex);
        
        ErrorResponse errorResponse = buildErrorResponse(
            ex.getErrorCode(),
            "An internal server error occurred",
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, WebRequest request) {
        
        log.error("Unhandled exception", ex);
        
        ErrorResponse errorResponse = buildErrorResponse(
            "INTERNAL_SERVER_ERROR",
            "An unexpected error occurred",
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
    
    private ErrorResponse buildErrorResponse(
            String code, 
            String message, 
            List<ErrorResponse.ValidationError> details,
            String requestId) {
        
        return ErrorResponse.builder()
            .code(code)
            .message(message)
            .details(details)
            .timestamp(OffsetDateTime.now())
            .requestId(requestId)
            .build();
    }
    
    private ErrorResponse.ValidationError mapToValidationError(FieldError fieldError) {
        return ErrorResponse.ValidationError.builder()
            .field(fieldError.getField())
            .code(fieldError.getCode())
            .message(fieldError.getDefaultMessage())
            .build();
    }
}
```

### Request ID Provider

Implement a request ID provider for correlating errors:

```java
package com.example.common.api;

import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.util.Optional;

@Component
public class RequestIdProvider {
    
    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    
    public String getRequestId() {
        return Optional.ofNullable(RequestContextHolder.getRequestAttributes())
            .filter(ServletRequestAttributes.class::isInstance)
            .map(ServletRequestAttributes.class::cast)
            .map(ServletRequestAttributes::getRequest)
            .map(request -> request.getHeader(REQUEST_ID_HEADER))
            .orElse("unknown");
    }
}
```

## Exception Handling with WebFlux

### Reactive Global Exception Handler

```java
package com.example.common.api;

import com.example.common.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.web.WebProperties;
import org.springframework.boot.autoconfigure.web.reactive.error.AbstractErrorWebExceptionHandler;
import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.web.reactive.error.ErrorAttributes;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerCodecConfigurer;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.*;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.Map;

@Slf4j
@Component
@Order(-2)
@RequiredArgsConstructor
public class GlobalErrorWebExceptionHandler extends AbstractErrorWebExceptionHandler {

    private final RequestIdProvider requestIdProvider;

    public GlobalErrorWebExceptionHandler(
            ErrorAttributes errorAttributes,
            WebProperties.Resources resources,
            ApplicationContext applicationContext,
            ServerCodecConfigurer codecConfigurer,
            RequestIdProvider requestIdProvider) {
        
        super(errorAttributes, resources, applicationContext);
        this.setMessageReaders(codecConfigurer.getReaders());
        this.setMessageWriters(codecConfigurer.getWriters());
        this.requestIdProvider = requestIdProvider;
    }

    @Override
    protected RouterFunction<ServerResponse> getRoutingFunction(ErrorAttributes errorAttributes) {
        return RouterFunctions.route(RequestPredicates.all(), this::renderErrorResponse);
    }

    private Mono<ServerResponse> renderErrorResponse(ServerRequest request) {
        Map<String, Object> errorPropertiesMap = getErrorAttributes(
            request, ErrorAttributeOptions.defaults());
        
        Throwable error = getError(request);
        HttpStatus status = determineHttpStatus(error);
        ErrorResponse errorResponse = buildErrorResponse(error);
        
        return ServerResponse.status(status)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(errorResponse);
    }
    
    private HttpStatus determineHttpStatus(Throwable error) {
        if (error instanceof ResourceNotFoundException) {
            return HttpStatus.NOT_FOUND;
        } else if (error instanceof ValidationException) {
            return HttpStatus.BAD_REQUEST;
        } else if (error instanceof BusinessException) {
            return HttpStatus.CONFLICT;
        } else if (error instanceof SecurityException) {
            return HttpStatus.FORBIDDEN;
        } else {
            return HttpStatus.INTERNAL_SERVER_ERROR;
        }
    }
    
    private ErrorResponse buildErrorResponse(Throwable error) {
        if (error instanceof ApplicationException) {
            ApplicationException ex = (ApplicationException) error;
            
            if (error instanceof ValidationException) {
                ValidationException validationEx = (ValidationException) ex;
                
                return buildErrorResponseWithDetails(
                    ex.getErrorCode(),
                    ex.getMessage(),
                    validationEx.getErrors(),
                    requestIdProvider.getRequestId()
                );
            }
            
            return buildErrorResponse(
                ex.getErrorCode(),
                ex.getMessage(),
                requestIdProvider.getRequestId()
            );
        }
        
        log.error("Unhandled exception", error);
        
        return buildErrorResponse(
            "INTERNAL_SERVER_ERROR",
            "An unexpected error occurred",
            requestIdProvider.getRequestId()
        );
    }
    
    private ErrorResponse buildErrorResponse(
            String code, String message, String requestId) {
        
        return ErrorResponse.builder()
            .code(code)
            .message(message)
            .timestamp(OffsetDateTime.now())
            .requestId(requestId)
            .build();
    }
    
    private ErrorResponse buildErrorResponseWithDetails(
            String code, 
            String message, 
            List<ValidationException.ValidationError> validationErrors,
            String requestId) {
        
        List<ErrorResponse.ValidationError> details = validationErrors.stream()
            .map(error -> ErrorResponse.ValidationError.builder()
                .field(error.getField())
                .code(error.getCode())
                .message(error.getMessage())
                .build())
            .collect(Collectors.toList());
        
        return ErrorResponse.builder()
            .code(code)
            .message(message)
            .details(details)
            .timestamp(OffsetDateTime.now())
            .requestId(requestId)
            .build();
    }
}
```

### Reactive Request ID Provider

```java
package com.example.common.api;

import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class RequestIdProvider {
    
    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String REQUEST_ID_ATTRIBUTE = "requestId";
    
    public String getRequestId() {
        return Mono.deferContextual(Mono::just)
            .map(context -> context.getOrDefault(REQUEST_ID_ATTRIBUTE, "unknown"))
            .map(Object::toString)
            .block();
    }
    
    public Mono<String> getRequestIdMono() {
        return Mono.deferContextual(Mono::just)
            .map(context -> context.getOrDefault(REQUEST_ID_ATTRIBUTE, "unknown"))
            .map(Object::toString);
    }
    
    public Mono<Void> extractAndStoreRequestId(ServerWebExchange exchange, Mono<Void> chain) {
        String requestId = exchange.getRequest().getHeaders().getFirst(REQUEST_ID_HEADER);
        return chain.contextWrite(context -> context.put(REQUEST_ID_ATTRIBUTE, requestId != null ? requestId : "unknown"));
    }
}
```

### Reactive WebFilter for Request ID

```java
package com.example.common.api;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class RequestIdWebFilter implements WebFilter {
    
    private final RequestIdProvider requestIdProvider;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return requestIdProvider.extractAndStoreRequestId(exchange, chain.filter(exchange));
    }
}
```

## Validation

### Bean Validation

Use JSR-380 (Bean Validation) annotations for validation:

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

### Custom Validators

For complex validation, implement custom validators:

```java
package com.example.validation;

import javax.validation.Constraint;
import javax.validation.Payload;
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

package com.example.validation;

import javax.validation.ConstraintValidator;
import javax.validation.ConstraintValidatorContext;
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

### Service-Level Validation

For complex business rule validation, implement service-level validation:

```java
@Service
@RequiredArgsConstructor
public class OrderValidator {
    
    private final ProductService productService;
    private final CustomerService customerService;
    
    public void validateOrder(OrderCreationDto orderDto) {
        List<ValidationException.ValidationError> errors = new ArrayList<>();
        
        // Validate customer exists
        customerService.getCustomer(orderDto.getCustomerId())
            .onErrorResume(CustomerNotFoundException.class, e -> {
                errors.add(new ValidationException.ValidationError(
                    "customerId", "CUSTOMER_NOT_FOUND", "Customer not found"));
                return Mono.empty();
            });
        
        // Validate products exist and have sufficient inventory
        Flux.fromIterable(orderDto.getItems())
            .flatMap(item -> productService.getProduct(item.getProductId())
                .flatMap(product -> {
                    if (product.getStock() < item.getQuantity()) {
                        errors.add(new ValidationException.ValidationError(
                            "items", "INSUFFICIENT_STOCK", 
                            "Insufficient stock for product " + product.getId()));
                    }
                    return Mono.empty();
                })
                .onErrorResume(ProductNotFoundException.class, e -> {
                    errors.add(new ValidationException.ValidationError(
                        "items", "PRODUCT_NOT_FOUND", 
                        "Product not found: " + item.getProductId()));
                    return Mono.empty();
                })
            )
            .blockLast(); // Block only for validation
        
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }
}
```

## Logging Best Practices

### Structured Logging

Use structured logging for better searchability:

```java
@ExceptionHandler(ResourceNotFoundException.class)
public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
        ResourceNotFoundException ex, WebRequest request) {
    
    log.info("Resource not found: type={}, identifier={}, message={}",
        ex.getArgs()[0], ex.getArgs()[1], ex.getMessage());
    
    // Handle exception
}
```

### Log Levels

Use appropriate log levels:

| Level | Usage |
|-------|-------|
| ERROR | Errors that need immediate attention |
| WARN | Potential issues that don't prevent operation |
| INFO | Significant events in normal operation |
| DEBUG | Detailed information for troubleshooting |
| TRACE | Most detailed information (rarely used) |

### MDC for Request Context

Use Mapped Diagnostic Context (MDC) to include request information in logs:

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter implements Filter {

    @Override
    public void doFilter(
            ServletRequest request, 
            ServletResponse response, 
            FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        String requestId = httpRequest.getHeader("X-Request-ID");
        if (requestId == null) {
            requestId = UUID.randomUUID().toString();
        }
        
        MDC.put("requestId", requestId);
        MDC.put("method", httpRequest.getMethod());
        MDC.put("path", httpRequest.getRequestURI());
        
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

## Testing Exception Handling

### Unit Testing Exceptions

```java
@ExtendWith(MockitoExtension.class)
public class OrderServiceTest {
    
    @Mock
    private OrderRepository orderRepository;
    
    @InjectMocks
    private OrderService orderService;
    
    @Test
    void shouldThrowResourceNotFoundException_WhenOrderNotFound() {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderRepository.findById(orderId)).thenReturn(Optional.empty());
        
        // When & Then
        assertThrows(ResourceNotFoundException.class, () -> {
            orderService.getOrder(orderId);
        });
    }
}
```

### Testing Error Responses

```java
@WebMvcTest(OrderController.class)
public class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void shouldReturnNotFound_WhenOrderDoesNotExist() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        doThrow(new ResourceNotFoundException("Order", orderId))
            .when(orderService).getOrder(orderId);
        
        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
            .andExpect(jsonPath("$.message").exists())
            .andExpect(jsonPath("$.timestamp").exists());
    }
    
    @Test
    void shouldReturnBadRequest_WhenValidationFails() throws Exception {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        // Missing required fields
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(asJsonString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.details").isArray())
            .andExpect(jsonPath("$.details[0].field").exists())
            .andExpect(jsonPath("$.details[0].message").exists());
    }
}
```

## Common Patterns and Anti-patterns

### Patterns to Follow

| Pattern | Example | Description |
|---------|---------|-------------|
| Global exception handlers | `@ControllerAdvice` | Centralized error handling |
| Custom exception hierarchy | `ApplicationException` | Clear exception types |
| Consistent error responses | Standard format | Uniform error structure |
| Detailed validation errors | Field-level errors | Actionable validation feedback |
| Appropriate status codes | Using 404 for not found | Follow HTTP standards |

### Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Generic exceptions | Generic RuntimeException | Use specific exceptions |
| Multiple error formats | Different formats per service | Use consistent error structure |
| Exposing stack traces | Returning full traces | Sanitize errors for security |
| Mixed error handling | Some global, some local | Use global exception handlers |
| Inconsistent status codes | 200 with error flag | Use proper status codes |

## Domain-Specific Error Codes

### Error Code Structure

Implement domain-specific error codes with a consistent format:

```
{DOMAIN}_{ERROR_TYPE}_{DETAIL}
```

Examples:
- `ORD_NOT_FOUND_ORDER`: Order not found
- `ORD_INVALID_STATUS`: Invalid order status
- `PAY_DECLINED_INSUFFICIENT_FUNDS`: Payment declined due to insufficient funds

### Error Code Registry

Maintain an error code registry for consistency:

```java
package com.example.common.error;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ErrorCodes {
    
    // Order domain error codes
    public static final String ORD_NOT_FOUND = "ORD_NOT_FOUND";
    public static final String ORD_INVALID_STATUS = "ORD_INVALID_STATUS";
    public static final String ORD_INSUFFICIENT_INVENTORY = "ORD_INSUFFICIENT_INVENTORY";
    
    // Customer domain error codes
    public static final String CUST_NOT_FOUND = "CUST_NOT_FOUND";
    public static final String CUST_INVALID_ADDRESS = "CUST_INVALID_ADDRESS";
    
    // Payment domain error codes
    public static final String PAY_DECLINED = "PAY_DECLINED";
    public static final String PAY_INVALID_AMOUNT = "PAY_INVALID_AMOUNT";
    
    // Security related error codes
    public static final String SEC_UNAUTHORIZED = "SEC_UNAUTHORIZED";
    public static final String SEC_FORBIDDEN = "SEC_FORBIDDEN";
    
    // Validation error codes
    public static final String VAL_REQUIRED_FIELD = "VAL_REQUIRED_FIELD";
    public static final String VAL_INVALID_FORMAT = "VAL_INVALID_FORMAT";
    public static final String VAL_OUT_OF_RANGE = "VAL_OUT_OF_RANGE";
}
```

## Special Considerations for Reactive Applications

### Non-Blocking Error Handling

Use reactive error handling operators:

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderService {
    
    private final ReactiveOrderRepository orderRepository;
    
    public Mono<OrderDto> getOrder(UUID orderId) {
        return orderRepository.findById(orderId)
            // Use map to transform the result if present
            .map(this::mapToDto)
            // Handle when the order is not found
            .switchIfEmpty(Mono.error(new ResourceNotFoundException("Order", orderId)));
    }
    
    public Mono<OrderDto> createOrder(OrderCreationDto orderDto) {
        return validateOrder(orderDto)
            // Only proceed if validation passes
            .then(Mono.defer(() -> {
                Order order = mapToEntity(orderDto);
                return orderRepository.save(order);
            }))
            .map(this::mapToDto)
            // Handle technical exceptions
            .onErrorMap(DataAccessException.class, ex -> 
                new TechnicalException("ORD_PERSISTENCE_ERROR", "Error saving order", ex));
    }
    
    private Mono<Void> validateOrder(OrderCreationDto orderDto) {
        return Mono.defer(() -> {
            List<ValidationException.ValidationError> errors = new ArrayList<>();
            
            // Perform validation checks
            if (orderDto.getItems() == null || orderDto.getItems().isEmpty()) {
                errors.add(new ValidationException.ValidationError(
                    "items", "REQUIRED", "At least one item is required"));
            }
            
            if (!errors.isEmpty()) {
                return Mono.error(new ValidationException(errors));
            }
            
            return Mono.empty();
        });
    }
}
```

### Reactive Error Propagation

Handle errors at each layer of the application:

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class ReactiveOrderController {
    
    private final ReactiveOrderService orderService;
    
    @GetMapping("/{orderId}")
    public Mono<ResponseEntity<OrderResponse>> getOrder(@PathVariable UUID orderId) {
        return orderService.getOrder(orderId)
            .map(orderDto -> ResponseEntity.ok(mapToResponse(orderDto)))
            // Let the global exception handler manage the ResourceNotFoundException
            .onErrorResume(ResourceNotFoundException.class, ex -> Mono.error(ex))
            // Handle any technical errors with a more generic error
            .onErrorResume(e -> {
                log.error("Error retrieving order", e);
                return Mono.error(new TechnicalException(
                    "ORD_RETRIEVAL_ERROR", "Error retrieving order", e));
            });
    }
}
```

## Error Monitoring and Alerting

### Capturing Error Metrics

Register error metrics with Micrometer:

```java
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {
    
    private final MeterRegistry meterRegistry;
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception ex) {
        // Record metric
        meterRegistry.counter("application.errors", 
                "exception", ex.getClass().getSimpleName(),
                "path", getCurrentRequestPath())
            .increment();
            
        // Handle exception
        // ...
    }
    
    private String getCurrentRequestPath() {
        return Optional.ofNullable(RequestContextHolder.getRequestAttributes())
            .filter(ServletRequestAttributes.class::isInstance)
            .map(ServletRequestAttributes.class::cast)
            .map(ServletRequestAttributes::getRequest)
            .map(HttpServletRequest::getRequestURI)
            .orElse("unknown");
    }
}
```

### Reactive Metrics

For reactive applications, use reactive metrics:

```java
@Component
@RequiredArgsConstructor
public class ReactiveErrorMetrics {
    
    private final MeterRegistry meterRegistry;
    
    public <T> Mono<T> recordErrorMetrics(Mono<T> mono, String operationName) {
        return mono.onErrorResume(e -> {
            meterRegistry.counter("application.errors",
                    "operation", operationName,
                    "exception", e.getClass().getSimpleName())
                .increment();
                
            return Mono.error(e);
        });
    }
}
```

## Examples

### Domain Exception Example

```java
package com.example.orderservice.domain.exception;

import com.example.common.exception.BusinessException;
import static com.example.common.error.ErrorCodes.ORD_INVALID_STATUS;

public class InvalidOrderStatusException extends BusinessException {
    
    public InvalidOrderStatusException(String currentStatus, String targetStatus) {
        super(
            ORD_INVALID_STATUS,
            String.format("Cannot transition order from %s to %s", currentStatus, targetStatus),
            currentStatus, targetStatus
        );
    }
}
```

### Validation Example

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    
    public Order createOrder(OrderCreationDto dto) {
        // Validate the order
        validateOrder(dto);
        
        // Map to domain entity
        Order order = mapToEntity(dto);
        
        // Save and return
        return orderRepository.save(order);
    }
    
    private void validateOrder(OrderCreationDto dto) {
        List<ValidationException.ValidationError> errors = new ArrayList<>();
        
        // Business rule: Order must have at least one item
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            errors.add(new ValidationException.ValidationError(
                "items", "REQUIRED", "Order must have at least one item"));
        }
        
        // Business rule: Order total must exceed minimum order amount
        BigDecimal total = calculateTotal(dto.getItems());
        if (total.compareTo(new BigDecimal("10.00")) < 0) {
            errors.add(new ValidationException.ValidationError(
                "items", "MINIMUM_ORDER_AMOUNT", "Order total must be at least $10.00"));
        }
        
        // Throw validation exception if any errors exist
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }
}
```

These error handling and exception management practices ensure that our microservices provide consistent, informative error responses while maintaining security and enabling effective monitoring.