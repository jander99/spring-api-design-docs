# Exception Hierarchy

## Overview

Create a clear exception structure. This ensures consistent error handling. This document shows how to organize and use exceptions across microservices.

## Exception Hierarchy Structure

Separate errors into different exception types:

```
ApplicationException (abstract)
├── ResourceNotFoundException
├── ValidationException
├── BusinessException
├── SecurityException
└── TechnicalException
```

## Base Exception Class

Create a base class that all exceptions extend. This provides standard features:

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

Each exception type handles a specific error scenario. Here are the main types:

### Resource Not Found Exception

Use this when a resource cannot be found:

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

Use this when input validation fails:

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

Use this for business logic errors:

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

Use this for security-related errors:

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

Use this for system and infrastructure errors:

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

Create exceptions for your business domains. Use them to handle specific errors.

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

Create a registry of error codes. Use it to keep codes consistent:

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

Use this format for error codes:

```
{DOMAIN}_{ERROR_TYPE}_{DETAIL}
```

Examples:
- `ORD_NOT_FOUND_ORDER`: Order not found
- `ORD_INVALID_STATUS`: Bad order status
- `PAY_DECLINED_INSUFFICIENT_FUNDS`: No payment funds

## Best Practices

1. **Extend ApplicationException**: All exceptions must extend `ApplicationException`
2. **Use Specific Types**: Create an exception for each error scenario
3. **Include Context**: Pass context as constructor parameters
4. **Consistent Error Codes**: Use the error code registry
5. **Meaningful Messages**: Write clear error messages
6. **Avoid Generic Exceptions**: Don't use `RuntimeException` for business errors

## Related Documentation

- [Error Response Formats](./error-response-formats.md) - How to format error responses
- [Imperative Error Handling](./imperative-error-handling.md) - Exception handlers for Spring MVC
- [Reactive Error Handling](./reactive-error-handling.md) - Exception handlers for WebFlux
- [Validation Standards](./validation-standards.md) - Input validation techniques