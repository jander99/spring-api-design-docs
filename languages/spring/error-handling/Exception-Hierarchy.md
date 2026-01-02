# Exception Hierarchy

## Overview

A well-structured exception hierarchy is fundamental to consistent error handling in Spring Boot applications. This document outlines the standard exception hierarchy and implementation patterns used across all microservices.

## Exception Hierarchy Structure

Implement a clear exception hierarchy to differentiate between different types of errors:

```
ApplicationException (abstract)
├── ResourceNotFoundException
├── ValidationException
├── BusinessException
├── SecurityException
└── TechnicalException
```

## Base Exception Class

All custom exceptions should extend this base class:

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

## Specific Exception Classes

### Resource Not Found Exception

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
```

### Validation Exception

```java
package com.example.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

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
```

### Business Exception

```java
package com.example.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class BusinessException extends ApplicationException {
    
    public BusinessException(String errorCode, String message, Object... args) {
        super(errorCode, message, args);
    }
}
```

### Security Exception

```java
package com.example.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class SecurityException extends ApplicationException {
    
    public SecurityException(String errorCode, String message, Object... args) {
        super(errorCode, message, args);
    }
}
```

### Technical Exception

```java
package com.example.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
public class TechnicalException extends ApplicationException {
    
    public TechnicalException(String errorCode, String message, Throwable cause, Object... args) {
        super(errorCode, message, cause, args);
    }
}
```

## Domain-Specific Exception Examples

### Order Domain Exception

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

## Error Code Registry

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

## Error Code Structure

Implement domain-specific error codes with a consistent format:

```
{DOMAIN}_{ERROR_TYPE}_{DETAIL}
```

Examples:
- `ORD_NOT_FOUND_ORDER`: Order not found
- `ORD_INVALID_STATUS`: Invalid order status
- `PAY_DECLINED_INSUFFICIENT_FUNDS`: Payment declined due to insufficient funds

## Best Practices

1. **Extend ApplicationException**: All custom exceptions should extend the base `ApplicationException` class
2. **Use Specific Types**: Create specific exception types for different error scenarios
3. **Include Context**: Pass relevant context information as constructor parameters
4. **Consistent Error Codes**: Use the error code registry for consistent error identification
5. **Meaningful Messages**: Provide clear, actionable error messages
6. **Avoid Generic Exceptions**: Don't use generic `RuntimeException` for business logic errors

## Related Documentation

- [Error Response Formats](./Error-Response-Formats.md) - RFC 7807 and response structures
- [Imperative Error Handling](./Imperative-Error-Handling.md) - Spring MVC global exception handlers
- [Reactive Error Handling](./Reactive-Error-Handling.md) - WebFlux error handling patterns
- [Validation Standards](./Validation-Standards.md) - Bean validation and custom validators