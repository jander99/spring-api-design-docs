# Error Handling and Exception Management

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 7 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 10.1 grade level • 1.3% technical density • fairly difficult

## Error Handling Basics

Errors happen in every application. Users send bad data. Resources disappear. Networks fail. Your API needs to handle these problems gracefully.

Good error handling helps users understand what went wrong. It makes debugging easier. It keeps your application secure by hiding internal details.

This guide shows you how to build a solid error handling system in Spring Boot.

## Overview

This directory provides complete guides for handling errors in Spring Boot. You'll learn how to build error responses that help users fix problems. The guides cover both traditional (Spring MVC) and reactive (WebFlux) approaches.

## Documentation Structure

### Core Components

1. **[Exception Hierarchy](./exception-hierarchy.md)**
   - Build a family of custom exceptions
   - Create error codes for your domain
   - Design exceptions that tell clear stories
   - Follow proven exception patterns

2. **[Error Response Formats](./error-response-formats.md)**
   - Use RFC 7807 standard error format
   - Build consistent error messages
   - Support older error formats when needed
   - Customize errors for your API

3. **[Imperative Error Handling](./imperative-error-handling.md)**
   - Handle errors globally with `@ControllerAdvice`
   - Track requests with unique IDs
   - Measure errors with Micrometer
   - Test your error responses

4. **[Reactive Error Handling](./reactive-error-handling.md)**
   - Handle errors in reactive streams
   - Manage context in async operations
   - Build non-blocking error handlers
   - Add circuit breakers and retries

5. **[Validation Standards](./validation-standards.md)**
   - Validate requests with Bean Validation
   - Create custom validators
   - Check business rules at the service layer
   - Validate reactive streams

6. **[Error Logging and Monitoring](./error-logging-and-monitoring.md)**
   - Log errors with correlation IDs
   - Track error metrics
   - Build health checks
   - Create error dashboards

## Key Features

### Consistent Error Handling

- **Unified Exception Hierarchy**: All exceptions share a common base
- **Standard Error Format**: Use RFC 7807 Problem Details (a web standard)
- **Global Exception Handlers**: Handle all errors in one place
- **Request Tracking**: Track errors across distributed systems

### Dual Implementation Support

- **Imperative**: Traditional Spring MVC (blocking)
- **Reactive**: Spring WebFlux (non-blocking streams)
- **Smart Configuration**: Spring picks the right handler automatically

### Security and Monitoring

- **Message Sanitization**: Hide sensitive data from error messages
- **Structured Logging**: Format logs as JSON for easy searching
- **Error Metrics**: Track error rates and types
- **Health Checks**: Monitor application health with custom checks

## Quick Start

### Simple Error Example

Here's a basic error response when a user tries to find a missing order:

```java
// When this happens in your service
throw new ResourceNotFoundException("Order", orderId);

// Users get this clear response
{
  "type": "https://api.example.com/problems/resource-not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Order with identifier 123 not found"
}
```

This follows RFC 7807, a standard way to format errors in REST APIs. The standard defines five fields that describe what went wrong.

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

1. **Centralized Handling**: Handle all errors in one global handler
2. **Specific Exception Types**: Create exceptions for each error type
3. **Security First**: Remove sensitive data from error messages
4. **Request Correlation**: Add request IDs to track errors
5. **Structured Logging**: Format logs as JSON for easy analysis
6. **Comprehensive Testing**: Test error cases just like success cases

## Anti-patterns to Avoid

1. **Generic Exceptions**: Don't use `RuntimeException` for business errors
2. **Multiple Error Formats**: Use one format across all services
3. **Exposing Stack Traces**: Never show stack traces to users
4. **Mixed Error Handling**: Pick global or local handling, not both
5. **Inconsistent Status Codes**: Use the same codes for the same errors

## Related Documentation

- **[Project Structure](../project-structure/package-organization.md)**: Where to put error handling code
- **[Controller Implementation](../controllers/README.md)**: How controllers use error handlers
- **[Security Implementation](../security/README.md)**: Handle authentication errors
- **[Logging and Monitoring](../observability/logging-and-monitoring.md)**: Log and track errors

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

Need help with error handling?

1. Read the specific guide for your use case
2. Check the testing examples for working code
3. Review the configuration sections for setup steps
4. Follow the best practices in each guide

This framework gives you everything you need for consistent error handling. Your errors will be secure, traceable, and easy to debug across all services.