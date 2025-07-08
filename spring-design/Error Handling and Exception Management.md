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

### RFC 7807 Problem Details (Primary)

Use RFC 7807 Problem Details as the primary error response format:

```java
package com.example.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProblemDetail {
    private URI type;           // RFC 7807: URI identifying the problem type
    private String title;       // RFC 7807: Short, human-readable summary
    private Integer status;     // RFC 7807: HTTP status code
    private String detail;      // RFC 7807: Human-readable explanation
    private URI instance;       // RFC 7807: URI identifying the specific occurrence
    
    // Extensions
    private OffsetDateTime timestamp;
    private String requestId;
    private List<ValidationError> errors;  // For validation failures
    
    @Data
    @Builder
    public static class ValidationError {
        private String field;
        private String code;
        private String message;
    }
}
```

### Legacy Error Response (Fallback)

For clients requiring the legacy format, maintain compatibility:

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
public class LegacyErrorResponse {
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

### Error Response Builder

Create a centralized error response builder supporting both RFC 7807 and legacy formats:

```java
package com.example.common.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;

@Component
public class ErrorResponseBuilder {
    
    @Value("${app.environment:development}")
    private String environment;
    
    @Value("${app.error.use-rfc7807:true}")
    private boolean useRfc7807;
    
    @Value("${app.error.problem-base-uri:https://api.example.com/problems}")
    private String problemBaseUri;
    
    public Object buildErrorResponse(
            String problemType,
            String title,
            int status,
            String detail,
            List<ProblemDetail.ValidationError> errors,
            String requestId) {
        
        if (useRfc7807) {
            return buildProblemDetail(problemType, title, status, detail, errors, requestId);
        } else {
            return buildLegacyErrorResponse(problemType, detail, errors, requestId);
        }
    }
    
    private ProblemDetail buildProblemDetail(
            String problemType,
            String title,
            int status,
            String detail,
            List<ProblemDetail.ValidationError> errors,
            String requestId) {
        
        return ProblemDetail.builder()
            .type(URI.create(problemBaseUri + "/" + problemType))
            .title(title)
            .status(status)
            .detail(sanitizeErrorMessage(detail))
            .instance(getCurrentRequestURI())
            .timestamp(OffsetDateTime.now())
            .requestId(requestId)
            .errors(errors)
            .build();
    }
    
    private LegacyErrorResponse buildLegacyErrorResponse(
            String code,
            String message,
            List<ProblemDetail.ValidationError> errors,
            String requestId) {
        
        List<LegacyErrorResponse.ValidationError> legacyErrors = null;
        if (errors != null) {
            legacyErrors = errors.stream()
                .map(error -> LegacyErrorResponse.ValidationError.builder()
                    .field(error.getField())
                    .code(error.getCode())
                    .message(error.getMessage())
                    .build())
                .toList();
        }
        
        return LegacyErrorResponse.builder()
            .code(code)
            .message(sanitizeErrorMessage(message))
            .details(legacyErrors)
            .timestamp(OffsetDateTime.now())
            .requestId(requestId)
            .build();
    }
    
    private String sanitizeErrorMessage(String originalMessage) {
        if ("production".equals(environment)) {
            // In production, return generic messages for security
            return switch (originalMessage) {
                case String msg when msg.contains("SQL") -> "Database error occurred";
                case String msg when msg.contains("Connection") -> "Service temporarily unavailable";
                case String msg when msg.contains("Authentication") -> "Authentication failed";
                default -> "An error occurred. Please contact support.";
            };
        }
        return originalMessage;
    }
    
    private URI getCurrentRequestURI() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                return URI.create(request.getRequestURI());
            }
        } catch (Exception e) {
            // Fallback if request context is not available
        }
        return URI.create("/unknown");
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
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
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
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final RequestIdProvider requestIdProvider;
    private final ErrorResponseBuilder errorResponseBuilder;
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        
        log.info("Resource not found: {}", ex.getMessage());
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "resource-not-found",
            "Resource Not Found", 
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage(),
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<Object> handleValidationException(
            ValidationException ex, WebRequest request) {
        
        log.info("Validation error: {}", ex.getMessage());
        
        List<ProblemDetail.ValidationError> validationErrors = ex.getErrors().stream()
            .map(error -> ProblemDetail.ValidationError.builder()
                .field(error.getField())
                .code(error.getCode())
                .message(error.getMessage())
                .build())
            .collect(Collectors.toList());
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "validation-error",
            "Validation Failed",
            HttpStatus.BAD_REQUEST.value(),
            ex.getMessage(),
            validationErrors,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, WebRequest request) {
        
        log.info("Validation error on request arguments");
        
        List<ProblemDetail.ValidationError> validationErrors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(this::mapToProblemValidationError)
            .collect(Collectors.toList());
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "validation-error",
            "Request Validation Failed",
            HttpStatus.BAD_REQUEST.value(),
            "One or more request parameters failed validation",
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
        
        ErrorResponse errorResponse = errorResponseBuilder.buildErrorResponse(
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
        
        ErrorResponse errorResponse = errorResponseBuilder.buildErrorResponse(
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
        
        ErrorResponse errorResponse = errorResponseBuilder.buildErrorResponse(
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
        
        ErrorResponse errorResponse = errorResponseBuilder.buildErrorResponse(
            "INTERNAL_SERVER_ERROR",
            "An unexpected error occurred",
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
    
    private ProblemDetail.ValidationError mapToProblemValidationError(FieldError fieldError) {
        return ProblemDetail.ValidationError.builder()
            .field(fieldError.getField())
            .code(fieldError.getCode())
            .message(fieldError.getDefaultMessage())
            .build();
    }
}
```

### Request ID Provider

#### Common Interface

Define a common interface for request ID providers:

```java
package com.example.common.api;

public interface RequestIdProvider {
    String getRequestId();
}
```

#### Servlet Implementation

Implement a servlet-specific request ID provider:

```java
package com.example.common.api;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;

@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ServletRequestIdProvider implements RequestIdProvider {
    
    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    
    @Override
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
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
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
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@Order(-2)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
@RequiredArgsConstructor
public class GlobalErrorWebExceptionHandler extends AbstractErrorWebExceptionHandler {

    private final ReactiveRequestIdProvider requestIdProvider;
    private final ErrorResponseBuilder errorResponseBuilder;

    public GlobalErrorWebExceptionHandler(
            ErrorAttributes errorAttributes,
            WebProperties.Resources resources,
            ApplicationContext applicationContext,
            ServerCodecConfigurer codecConfigurer,
            ReactiveRequestIdProvider requestIdProvider,
            ErrorResponseBuilder errorResponseBuilder) {
        
        super(errorAttributes, resources, applicationContext);
        this.setMessageReaders(codecConfigurer.getReaders());
        this.setMessageWriters(codecConfigurer.getWriters());
        this.requestIdProvider = requestIdProvider;
        this.errorResponseBuilder = errorResponseBuilder;
    }

    @Override
    protected RouterFunction<ServerResponse> getRoutingFunction(ErrorAttributes errorAttributes) {
        return RouterFunctions.route(RequestPredicates.all(), this::renderErrorResponse);
    }

    private Mono<ServerResponse> renderErrorResponse(ServerRequest request) {
        Throwable error = getError(request);
        
        return determineHttpStatus(error)
            .zipWith(buildErrorResponse(error))
            .flatMap(tuple -> {
                HttpStatus status = tuple.getT1();
                ErrorResponse errorResponse = tuple.getT2();
                
                return ServerResponse.status(status)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(errorResponse);
            });
    }
    
    private Mono<HttpStatus> determineHttpStatus(Throwable error) {
        return Mono.fromCallable(() -> {
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
        });
    }
    
    private Mono<ErrorResponse> buildErrorResponse(Throwable error) {
        return requestIdProvider.getRequestIdMono()
            .flatMap(requestId -> {
                if (error instanceof ApplicationException) {
                    ApplicationException ex = (ApplicationException) error;
                    
                    if (error instanceof ValidationException) {
                        ValidationException validationEx = (ValidationException) ex;
                        
                        List<ErrorResponse.ValidationError> details = validationEx.getErrors().stream()
                            .map(validationError -> ErrorResponse.ValidationError.builder()
                                .field(validationError.getField())
                                .code(validationError.getCode())
                                .message(validationError.getMessage())
                                .build())
                            .collect(Collectors.toList());
                        
                        return Mono.just(errorResponseBuilder.buildErrorResponse(
                            ex.getErrorCode(),
                            ex.getMessage(),
                            details,
                            requestId
                        ));
                    }
                    
                    return Mono.just(errorResponseBuilder.buildErrorResponse(
                        ex.getErrorCode(),
                        ex.getMessage(),
                        null,
                        requestId
                    ));
                }
                
                log.error("Unhandled exception", error);
                
                return Mono.just(errorResponseBuilder.buildErrorResponse(
                    "INTERNAL_SERVER_ERROR",
                    "An unexpected error occurred",
                    null,
                    requestId
                ));
            });
    }
}
```

#### Reactive Implementation

Implement a reactive-specific request ID provider:

```java
package com.example.common.api;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public class ReactiveRequestIdProvider implements RequestIdProvider {
    
    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String REQUEST_ID_ATTRIBUTE = "requestId";
    
    @Override
    public String getRequestId() {
        // Note: This should only be used in non-reactive contexts
        // For reactive contexts, use getRequestIdMono()
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
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
@RequiredArgsConstructor
public class RequestIdWebFilter implements WebFilter {
    
    private final ReactiveRequestIdProvider requestIdProvider;
    
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

### Service-Level Validation

For complex business rule validation, implement service-level validation:

```java
import java.util.Objects;
import java.util.stream.Collectors;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class OrderValidator {
    
    private final ProductService productService;
    private final CustomerService customerService;
    
    public Mono<Void> validateOrder(OrderCreationDto orderDto) {
        return Mono.defer(() -> {
            List<Mono<ValidationException.ValidationError>> validationTasks = new ArrayList<>();
            
            // Validate customer exists
            Mono<ValidationException.ValidationError> customerValidation = customerService
                .getCustomer(orderDto.getCustomerId())
                .then(Mono.<ValidationException.ValidationError>empty())
                .onErrorReturn(CustomerNotFoundException.class, 
                    new ValidationException.ValidationError(
                        "customerId", "CUSTOMER_NOT_FOUND", "Customer not found"));
            
            validationTasks.add(customerValidation);
            
            // Validate products exist and have sufficient inventory
            Flux<ValidationException.ValidationError> productValidations = Flux
                .fromIterable(orderDto.getItems())
                .flatMap(item -> productService.getProduct(item.getProductId())
                    .flatMap(product -> {
                        if (product.getStock() < item.getQuantity()) {
                            return Mono.just(new ValidationException.ValidationError(
                                "items", "INSUFFICIENT_STOCK", 
                                "Insufficient stock for product " + product.getId()));
                        }
                        return Mono.<ValidationException.ValidationError>empty();
                    })
                    .onErrorReturn(ProductNotFoundException.class, 
                        new ValidationException.ValidationError(
                            "items", "PRODUCT_NOT_FOUND", 
                            "Product not found: " + item.getProductId()))
                );
            
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