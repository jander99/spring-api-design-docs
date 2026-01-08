# Error Response Formats

## Overview

API clients need consistent error responses. This document shows two error formats:
1. RFC 9457 Problem Details (recommended)
2. Legacy format (for backward compatibility)

> **Note**: RFC 9457 (July 2023) supersedes RFC 7807. The structure is identical, so existing implementations remain fully compatible.

## Error Response Principles

1. **Consistent Structure**: Use the same format for all errors
2. **RFC 9457 Compliance**: Use RFC 9457 Problem Details as primary format
3. **Legacy Support**: Support old formats for existing clients
4. **Security First**: Hide sensitive information in production
5. **Clear Messages**: Help clients understand and fix errors

## RFC 9457 Problem Details

This is the recommended error format. Use it for all new APIs:

```java
package com.example.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProblemDetail {
    private URI type;           // RFC 9457: URI identifying the problem type
    private String title;       // RFC 9457: Short, human-readable summary
    private Integer status;     // RFC 9457: HTTP status code
    private String detail;      // RFC 9457: Human-readable explanation
    private URI instance;       // RFC 9457: URI identifying the specific occurrence
    
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

### Example RFC 9457 Response

```json
{
  "type": "https://api.example.com/problems/resource-not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Order with identifier 123e4567-e89b-12d3-a456-426614174000 not found",
  "instance": "/v1/orders/123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2023-10-15T10:30:00Z",
  "requestId": "req-123-456"
}
```

## Legacy Error Response (Fallback)

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

### Example Legacy Response

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "Order with identifier 123e4567-e89b-12d3-a456-426614174000 not found",
  "timestamp": "2023-10-15T10:30:00Z",
  "requestId": "req-123-456"
}
```

## Error Response Builder

Use a centralized builder to create both RFC 9457 and legacy error responses:

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
    
    @Value("${app.error.use-rfc9457:true}")
    private boolean useRfc9457;
    
    @Value("${app.error.problem-base-uri:https://api.example.com/problems}")
    private String problemBaseUri;
    
    public Object buildErrorResponse(
            String problemType,
            String title,
            int status,
            String detail,
            List<ProblemDetail.ValidationError> errors,
            String requestId) {
        
        if (useRfc9457) {
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

## Validation Error Response Examples

### Single Validation Error (RFC 9457)

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more request parameters failed validation",
  "instance": "/v1/orders",
  "timestamp": "2023-10-15T10:30:00Z",
  "requestId": "req-123-456",
  "errors": [
    {
      "field": "customerId",
      "code": "NotNull",
      "message": "Customer ID is required"
    }
  ]
}
```

### Multiple Validation Errors (RFC 9457)

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more request parameters failed validation",
  "instance": "/v1/orders",
  "timestamp": "2023-10-15T10:30:00Z",
  "requestId": "req-123-456",
  "errors": [
    {
      "field": "customerId",
      "code": "NotNull",
      "message": "Customer ID is required"
    },
    {
      "field": "items",
      "code": "NotEmpty",
      "message": "At least one item is required"
    },
    {
      "field": "items[0].quantity",
      "code": "Min",
      "message": "Quantity must be at least 1"
    }
  ]
}
```

## Configuration Properties

Configure error response behavior through application properties:

```yaml
app:
  environment: ${ENVIRONMENT:development}
  error:
    use-rfc9457: ${USE_RFC9457:true}
    problem-base-uri: ${PROBLEM_BASE_URI:https://api.example.com/problems}
    include-stack-trace: ${INCLUDE_STACK_TRACE:false}
    sanitize-messages: ${SANITIZE_MESSAGES:true}
```

## Spring Framework Native Support

Spring Framework 6.x and Spring Boot 3.x include native RFC 9457 Problem Details support.

### Enable Problem Details (Spring MVC)

```yaml
spring:
  mvc:
    problemdetails:
      enabled: true
```

### Enable Problem Details (Spring WebFlux)

```yaml
spring:
  webflux:
    problemdetails:
      enabled: true
```

### Using Spring's Built-in ProblemDetail

Spring provides `org.springframework.http.ProblemDetail` that implements RFC 9457:

```java
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponse;
import java.net.URI;

@ExceptionHandler(ResourceNotFoundException.class)
public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
        HttpStatus.NOT_FOUND,
        ex.getMessage()
    );
    problem.setTitle("Resource Not Found");
    problem.setType(URI.create("https://api.example.com/problems/resource-not-found"));
    problem.setProperty("resourceType", ex.getResourceType());
    problem.setProperty("resourceId", ex.getResourceId());
    return problem;
}
```

### ErrorResponse Interface

Exceptions can implement `ErrorResponse` for automatic Problem Details conversion:

```java
public class ResourceNotFoundException extends RuntimeException implements ErrorResponse {
    
    private final String resourceType;
    private final Object resourceId;
    
    @Override
    public HttpStatusCode getStatusCode() {
        return HttpStatus.NOT_FOUND;
    }
    
    @Override
    public ProblemDetail getBody() {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            getStatusCode(),
            getMessage()
        );
        problem.setTitle("Resource Not Found");
        problem.setProperty("resourceType", resourceType);
        problem.setProperty("resourceId", resourceId);
        return problem;
    }
}
```

## Security Considerations

1. **Hide Sensitive Data**: Remove sensitive information from production errors
2. **No Stack Traces**: Never show stack traces in production
3. **Use Request IDs**: Include request IDs to help trace errors without exposing details
4. **Generic Messages**: Use simple messages for technical errors in production

## Format Selection

Allow clients to choose their error format through the Accept header:

```java
@Component
public class ContentNegotiatingErrorResponseBuilder {
    
    public ResponseEntity<Object> buildErrorResponse(
            String problemType,
            String title,
            int status,
            String detail,
            List<ProblemDetail.ValidationError> errors,
            String requestId,
            String acceptHeader) {
        
        Object responseBody;
        MediaType contentType;
        
        if (acceptHeader != null && acceptHeader.contains("application/problem+json")) {
            responseBody = buildProblemDetail(problemType, title, status, detail, errors, requestId);
            contentType = MediaType.parseMediaType("application/problem+json");
        } else {
            responseBody = buildLegacyErrorResponse(problemType, detail, errors, requestId);
            contentType = MediaType.APPLICATION_JSON;
        }
        
        return ResponseEntity.status(status)
            .contentType(contentType)
            .body(responseBody);
    }
}
```

## Best Practices

1. **Consistent Format**: Use the same format for all endpoints
2. **Correct Status Codes**: Match HTTP status codes to error types
3. **Clear Messages**: Explain what went wrong and how to fix it
4. **Security First**: Hide details in production
5. **Include Request IDs**: Help clients trace errors
6. **Show Validation Errors**: List which fields failed validation

## Related Documentation

- [Exception Hierarchy](./exception-hierarchy.md) - Exception classes and inheritance
- [Imperative Error Handling](./imperative-error-handling.md) - Spring MVC global exception handlers
- [Reactive Error Handling](./reactive-error-handling.md) - WebFlux error handling patterns
- [Validation Standards](./validation-standards.md) - Bean validation and custom validators
- [Schema Validation](../validation/schema-validation.md) - Complete validation error handling examples