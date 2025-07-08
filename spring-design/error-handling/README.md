# Error Handling and Exception Management

## Overview

This directory contains comprehensive documentation for error handling and exception management in Spring Boot applications. The documentation covers both imperative (Spring MVC) and reactive (WebFlux) approaches to error handling, providing consistent patterns across all microservices.

## Documentation Structure

### Core Components

1. **[Exception Hierarchy](./Exception-Hierarchy.md)**
   - Base exception classes and inheritance structure
   - Custom exception types for different error scenarios
   - Domain-specific error codes and registry
   - Best practices for exception design

2. **[Error Response Formats](./Error-Response-Formats.md)**
   - RFC 7807 Problem Details implementation
   - Legacy error response formats for backward compatibility
   - Error response builder with content negotiation
   - Configuration and customization options

3. **[Imperative Error Handling](./Imperative-Error-Handling.md)**
   - Spring MVC global exception handlers (`@ControllerAdvice`)
   - Request ID providers for servlet applications
   - Error metrics collection with Micrometer
   - Testing patterns for error responses

4. **[Reactive Error Handling](./Reactive-Error-Handling.md)**
   - WebFlux error handling with `AbstractErrorWebExceptionHandler`
   - Reactive request ID providers and context management
   - Non-blocking error handling patterns
   - Circuit breaker and retry patterns

5. **[Validation Standards](./Validation-Standards.md)**
   - Bean Validation (JSR-380) implementation
   - Custom validator development
   - Service-level business rule validation
   - Reactive validation patterns

6. **[Error Logging and Monitoring](./Error-Logging-and-Monitoring.md)**
   - Structured logging with MDC and correlation IDs
   - Error metrics with Micrometer
   - Health indicators and alerting
   - Log analysis and dashboard creation

## Key Features

### Consistent Error Handling

- **Unified Exception Hierarchy**: All exceptions extend `ApplicationException`
- **Standardized Error Responses**: RFC 7807 Problem Details with legacy fallback
- **Global Exception Handlers**: Centralized error handling for all endpoints
- **Request Correlation**: Request IDs and correlation IDs for tracing

### Dual Implementation Support

- **Imperative**: Traditional Spring MVC with blocking I/O
- **Reactive**: Spring WebFlux with non-blocking I/O
- **Conditional Configuration**: Automatic configuration based on application type

### Security and Monitoring

- **Message Sanitization**: Prevents sensitive information exposure
- **Structured Logging**: JSON-formatted logs for better analysis
- **Comprehensive Metrics**: Error rates, types, and resolution times
- **Health Indicators**: Custom health checks for error monitoring

## Quick Start

### 1. Exception Hierarchy Setup

```java
// Base exception class
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
}

// Specific exception types
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends ApplicationException {
    public ResourceNotFoundException(String resourceType, Object identifier) {
        super("RESOURCE_NOT_FOUND", 
              String.format("%s with identifier %s not found", resourceType, identifier),
              resourceType, identifier);
    }
}
```

### 2. Global Exception Handler

```java
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {
    
    private final ErrorResponseBuilder errorResponseBuilder;
    private final RequestIdProvider requestIdProvider;
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        
        Object errorResponse = errorResponseBuilder.buildErrorResponse(
            "resource-not-found", "Resource Not Found", 
            HttpStatus.NOT_FOUND.value(), ex.getMessage(), 
            null, requestIdProvider.getRequestId()
        );
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }
}
```

### 3. Validation Implementation

```java
@Data
public class CreateOrderRequest {
    @NotNull(message = "Customer ID is required")
    private UUID customerId;
    
    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<OrderItemRequest> items;
    
    @Data
    public static class OrderItemRequest {
        @NotNull(message = "Product ID is required")
        private UUID productId;
        
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;
    }
}
```

## Configuration

### Application Properties

```yaml
app:
  error:
    use-rfc7807: true
    problem-base-uri: https://api.example.com/problems
    sanitize-messages: true
    
logging:
  level:
    com.example.common.api.GlobalExceptionHandler: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level [%X{requestId}] %logger{36} - %msg%n"
```

### Metrics Configuration

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active}
```

## Testing

### Unit Testing Exceptions

```java
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
```

### Integration Testing Error Responses

```java
@Test
void shouldReturnBadRequest_WhenValidationFails() throws Exception {
    mockMvc.perform(post("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .content(invalidRequestJson))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("https://api.example.com/problems/validation-error"))
        .andExpect(jsonPath("$.errors").isArray());
}
```

## Best Practices

1. **Centralized Handling**: Use global exception handlers for consistent error responses
2. **Specific Exception Types**: Create specific exception types for different error scenarios
3. **Security First**: Sanitize error messages to prevent information disclosure
4. **Request Correlation**: Include request IDs in all error responses
5. **Structured Logging**: Use structured logging for better analysis and monitoring
6. **Comprehensive Testing**: Test both success and error scenarios thoroughly

## Anti-patterns to Avoid

1. **Generic Exceptions**: Don't use generic `RuntimeException` for business logic errors
2. **Multiple Error Formats**: Don't use different error formats across services
3. **Exposing Stack Traces**: Never expose full stack traces in production
4. **Mixed Error Handling**: Don't mix global and local exception handling inconsistently
5. **Inconsistent Status Codes**: Don't use different status codes for similar errors

## Related Documentation

- **[Project Structure and Package Organization](../Project%20Structure%20and%20Package%20Organization.md)**: Overall project structure
- **[Controller Implementation](../Controller%20Implementation%20%28Reactive%20and%20Imperative%29.md)**: Controller design patterns
- **[Security Implementation](../Security%20Implementation.md)**: Security-related error handling
- **[Logging and Monitoring](../Logging%20and%20Monitoring.md)**: General logging and monitoring patterns

## Common Error Scenarios

### Resource Not Found

```java
// Usage
throw new ResourceNotFoundException("Order", orderId);

// Response
{
  "type": "https://api.example.com/problems/resource-not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Order with identifier 123 not found"
}
```

### Validation Failures

```java
// Usage
List<ValidationError> errors = List.of(
    new ValidationError("customerId", "NotNull", "Customer ID is required"),
    new ValidationError("items", "NotEmpty", "At least one item is required")
);
throw new ValidationException(errors);

// Response
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "errors": [
    {
      "field": "customerId",
      "code": "NotNull",
      "message": "Customer ID is required"
    }
  ]
}
```

### Business Rule Violations

```java
// Usage
throw new BusinessException("ORDER_ALREADY_SHIPPED", 
    "Cannot cancel order that has already been shipped");

// Response
{
  "type": "https://api.example.com/problems/business-error",
  "title": "Business Rule Violation",
  "status": 409,
  "detail": "Cannot cancel order that has already been shipped"
}
```

## Support and Maintenance

For questions or issues related to error handling implementation:

1. Review the specific documentation files for detailed patterns
2. Check the testing examples for implementation guidance
3. Refer to the configuration sections for setup instructions
4. Follow the best practices outlined in each document

This error handling framework provides a comprehensive foundation for consistent, secure, and maintainable error management across all Spring Boot microservices.