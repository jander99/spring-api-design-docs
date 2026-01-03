# Imperative Error Handling

## Overview

This document covers error handling for Spring MVC applications. We show how to use `@ControllerAdvice` and global exception handlers. These approaches handle all errors in one place for servlet-based Spring Boot.

## Global Exception Handler

Use `@ControllerAdvice` to handle all exceptions globally:

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
    public ResponseEntity<Object> handleBindException(
            BindException ex, WebRequest request) {
        
        log.info("Binding error: {}", ex.getMessage());
        
        List<ProblemDetail.ValidationError> validationErrors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(this::mapToProblemValidationError)
            .collect(Collectors.toList());
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "validation-error",
            "Binding Failed",
            HttpStatus.BAD_REQUEST.value(),
            "Request binding failed",
            validationErrors,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }
    
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Object> handleBusinessException(
            BusinessException ex, WebRequest request) {
        
        log.warn("Business exception: {}", ex.getMessage());
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "business-error",
            "Business Rule Violation",
            HttpStatus.CONFLICT.value(),
            ex.getMessage(),
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }
    
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Object> handleSecurityException(
            SecurityException ex, WebRequest request) {
        
        log.warn("Security exception: {}", ex.getMessage());
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "security-error",
            "Access Denied",
            HttpStatus.FORBIDDEN.value(),
            ex.getMessage(),
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }
    
    @ExceptionHandler(TechnicalException.class)
    public ResponseEntity<Object> handleTechnicalException(
            TechnicalException ex, WebRequest request) {
        
        log.error("Technical exception", ex);
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "technical-error",
            "Internal Server Error",
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "An internal server error occurred",
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleGenericException(
            Exception ex, WebRequest request) {
        
        log.error("Unhandled exception", ex);
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "internal-error",
            "Internal Server Error",
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
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

## Request ID Provider

### Common Interface

Create an interface for request ID providers:

```java
package com.example.common.api;

public interface RequestIdProvider {
    String getRequestId();
}
```

### Servlet Implementation

Add a servlet request ID provider:

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

## Error Metrics Collection

Track errors with Micrometer:

```java
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {
    
    private final MeterRegistry meterRegistry;
    private final RequestIdProvider requestIdProvider;
    private final ErrorResponseBuilder errorResponseBuilder;
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleException(Exception ex, WebRequest request) {
        // Record metric
        meterRegistry.counter("application.errors", 
                "exception", ex.getClass().getSimpleName(),
                "path", getCurrentRequestPath())
            .increment();
            
        log.error("Unhandled exception", ex);
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "internal-error",
            "Internal Server Error",
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "An unexpected error occurred",
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
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

## Controller-Level Error Handling

Global handlers are better. But you can handle specific errors at the controller level:

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {
    
    private final OrderService orderService;
    private final ErrorResponseBuilder errorResponseBuilder;
    private final RequestIdProvider requestIdProvider;
    
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
        try {
            OrderDto order = orderService.getOrder(orderId);
            return ResponseEntity.ok(mapToResponse(order));
        } catch (ResourceNotFoundException ex) {
            // This will be handled by the global exception handler
            throw ex;
        }
    }
    
    // Controller-specific exception handler (if needed)
    @ExceptionHandler(OrderSpecificException.class)
    public ResponseEntity<Object> handleOrderSpecificException(OrderSpecificException ex) {
        log.warn("Order-specific exception: {}", ex.getMessage());
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "order-specific-error",
            "Order Processing Error",
            HttpStatus.UNPROCESSABLE_ENTITY.value(),
            ex.getMessage(),
            null,
            requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(errorResponse);
    }
}
```

## Testing Error Responses

### Unit Tests

```java
@ExtendWith(MockitoExtension.class)
public class GlobalExceptionHandlerTest {
    
    @Mock
    private RequestIdProvider requestIdProvider;
    
    @Mock
    private ErrorResponseBuilder errorResponseBuilder;
    
    @InjectMocks
    private GlobalExceptionHandler globalExceptionHandler;
    
    @Test
    void shouldHandleResourceNotFoundException() {
        // Given
        ResourceNotFoundException ex = new ResourceNotFoundException("Order", "123");
        when(requestIdProvider.getRequestId()).thenReturn("test-request-id");
        when(errorResponseBuilder.buildErrorResponse(any(), any(), any(), any(), any(), any()))
            .thenReturn(new Object());
        
        // When
        ResponseEntity<Object> response = globalExceptionHandler.handleResourceNotFoundException(ex, null);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(errorResponseBuilder).buildErrorResponse(
            eq("resource-not-found"),
            eq("Resource Not Found"),
            eq(404),
            any(),
            eq(null),
            eq("test-request-id")
        );
    }
}
```

### Integration Tests

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
            .andExpect(jsonPath("$.type").value("https://api.example.com/problems/resource-not-found"))
            .andExpect(jsonPath("$.title").value("Resource Not Found"))
            .andExpect(jsonPath("$.status").value(404))
            .andExpect(jsonPath("$.detail").exists())
            .andExpect(jsonPath("$.timestamp").exists())
            .andExpect(jsonPath("$.requestId").exists());
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
            .andExpect(jsonPath("$.type").value("https://api.example.com/problems/validation-error"))
            .andExpect(jsonPath("$.title").value("Request Validation Failed"))
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.errors").isArray())
            .andExpect(jsonPath("$.errors[0].field").exists())
            .andExpect(jsonPath("$.errors[0].message").exists());
    }
}
```

## Best Practices

1. **Centralized Handling**: Use `@ControllerAdvice` for all errors
2. **Specific Exceptions**: Handle specific errors. Avoid generic catches
3. **Log Levels**: Use INFO for client errors. Use ERROR for server errors
4. **Request IDs**: Add request IDs to trace each error
5. **Security**: Hide sensitive details from error messages
6. **Metrics**: Track error counts for monitoring

## Common Patterns

### Exception Mapping

```java
@ExceptionHandler({
    ConstraintViolationException.class,
    MethodArgumentNotValidException.class,
    BindException.class
})
public ResponseEntity<Object> handleValidationExceptions(Exception ex, WebRequest request) {
    List<ProblemDetail.ValidationError> errors = extractValidationErrors(ex);
    
    Object errorResponse = errorResponseBuilder.buildErrorResponse(
        "validation-error",
        "Validation Failed",
        HttpStatus.BAD_REQUEST.value(),
        "One or more request parameters failed validation",
        errors,
        requestIdProvider.getRequestId()
    );
    
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
}
```

### Conditional Error Handling

```java
@ExceptionHandler(DataAccessException.class)
public ResponseEntity<Object> handleDataAccessException(DataAccessException ex, WebRequest request) {
    if (ex.getCause() instanceof ConstraintViolationException) {
        return handleConstraintViolation((ConstraintViolationException) ex.getCause(), request);
    }
    
    log.error("Data access error", ex);
    
    Object errorResponse = errorResponseBuilder.buildErrorResponse(
        "data-access-error",
        "Data Access Error",
        HttpStatus.INTERNAL_SERVER_ERROR.value(),
        "A database error occurred",
        null,
        requestIdProvider.getRequestId()
    );
    
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
}
```

## Related Documentation

- [Exception Hierarchy](./exception-hierarchy.md) - Exception classes and inheritance
- [Error Response Formats](./error-response-formats.md) - RFC 7807 and response structures
- [Reactive Error Handling](./reactive-error-handling.md) - WebFlux error handling patterns
- [Validation Standards](./validation-standards.md) - Bean validation and custom validators
- [Schema Validation](../validation/schema-validation.md) - Complete validation patterns and error handling
- [Error Logging and Monitoring](./error-logging-and-monitoring.md) - Structured logging and metrics