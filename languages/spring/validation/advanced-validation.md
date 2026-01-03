# Advanced Validation

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 12 minutes | **🟡 Level:** Advanced
> 
> **📋 Prerequisites:** Jakarta Bean Validation, Custom validators  
> **🎯 Key Topics:** JSON Schema, Method-Level Validation, RFC 7807 Integration
> 
> **📊 Complexity:** Grade 13.8 • 2.1% technical density • Difficult

## Overview

This guide covers three validation approaches:

1. **JSON Schema** - Validate complex data
2. **Method Validation** - Check service parameters
3. **RFC 7807** - Standard error format

Read [Validation Fundamentals](validation-fundamentals.md) first.

## JSON Schema Validation

### Add the Library

Add this dependency to your Maven project:

```xml
<dependency>
    <groupId>com.networknt</groupId>
    <artifactId>json-schema-validator</artifactId>
    <version>1.5.1</version>
</dependency>
```

### Create Your Schema

Save this as `schemas/order-v1.json`:

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

### Build a Validator

Create this component:

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
            JsonNode node = objectMapper.valueToTree(payload);
            JsonSchema schema = loadSchema(schemaPath);
            Set<ValidationMessage> errors = schema.validate(node);
            
            if (!errors.isEmpty()) {
                throw new JsonSchemaValidationException(
                    "Validation failed", getMessages(errors));
            }
        } catch (IOException e) {
            throw new IllegalStateException("Load failed", e);
        }
    }
    
    private JsonSchema loadSchema(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        try (InputStream in = resource.getInputStream()) {
            JsonNode schemaNode = objectMapper.readTree(in);
            return schemaFactory.getSchema(schemaNode);
        }
    }
    
    private List<String> getMessages(Set<ValidationMessage> errors) {
        return errors.stream()
            .map(ValidationMessage::getMessage)
            .collect(Collectors.toList());
    }
}
```

### Create an Exception Class

Define this exception:

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

### Use the Validator

Call it before saving data:

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final JsonSchemaValidator schemaValidator;
    private final OrderRepository orderRepository;
    
    public OrderDto createOrder(OrderCreationDto orderDto) {
        schemaValidator.validate(orderDto, "schemas/order-v1.json");
        
        Order order = mapToEntity(orderDto);
        order = orderRepository.save(order);
        return mapToDto(order);
    }
}
```

## Method-Level Validation

### Check Method Parameters

Add `@Validated` to your service:

```java
@Service
@Validated
public class OrderService {
    private final OrderRepository orderRepo;
    
    public OrderService(OrderRepository orderRepo) {
        this.orderRepo = orderRepo;
    }
    
    public OrderDto getOrder(@NotNull UUID orderId) {
        return orderRepo.findById(orderId)
            .map(this::toDto)
            .orElseThrow();
    }
    
    public List<OrderDto> getOrders(
            @NotNull UUID customerId,
            @Min(0) int page,
            @Min(1) @Max(100) int size) {
        
        Pageable p = PageRequest.of(page, size);
        return orderRepo.findByCustomerId(customerId, p)
            .stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }
    
    public OrderDto create(@Valid OrderCreationDto dto) {
        Order order = toEntity(dto);
        return toDto(orderRepo.save(order));
    }
}
```

### Validate Return Values

Check what methods return:

```java
@Service
@Validated
public class CustomerService {
    private final CustomerRepository customerRepo;
    
    public CustomerService(CustomerRepository customerRepo) {
        this.customerRepo = customerRepo;
    }
    
    @NotNull
    public CustomerDto create(@Valid CustomerCreationDto dto) {
        Customer c = toEntity(dto);
        return toDto(customerRepo.save(c));
    }
    
    @NotEmpty
    public List<CustomerDto> getActive() {
        return customerRepo.findByActiveTrue()
            .stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }
}
```

## RFC 7807 Error Responses

### Handle All Validation Errors

Create this exception handler:

```java
@ControllerAdvice
public class ValidationHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleInvalid(
            MethodArgumentNotValidException ex) {
        List<ValidationError> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(this::toError)
            .collect(Collectors.toList());
        
        return error("validation-error", "Failed", errors);
    }
    
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleViolation(
            ConstraintViolationException ex) {
        List<ValidationError> errors = ex.getConstraintViolations()
            .stream()
            .map(this::toError)
            .collect(Collectors.toList());
        
        return error("constraint-violation", "Broken", errors);
    }
    
    private ValidationError toError(FieldError e) {
        return ValidationError.builder()
            .field(e.getField())
            .code(e.getCode())
            .message(e.getDefaultMessage())
            .rejectedValue(e.getRejectedValue())
            .build();
    }
    
    private ResponseEntity<ProblemDetail> error(
            String type, String title,
            List<ValidationError> errors) {
        
        ProblemDetail detail = ProblemDetail.builder()
            .type("https://api.example.com/problems/" + type)
            .title(title)
            .status(400)
            .errors(errors)
            .timestamp(OffsetDateTime.now())
            .build();
        
        return ResponseEntity.badRequest().body(detail);
    }
}
```

See [Imperative Error Handling](../error-handling/imperative-error-handling.md).

## Best Practices

### 1. Validate at Each Layer

Check format at the controller. Check rules at the service. Check limits in the domain.

```java
// Controller: format checks
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest req) {
    // ...
}

// Service: business rules
@Service
public class OrderService {
    public OrderDto createOrder(OrderCreationDto dto) {
        // Check inventory
        // Validate credit limit
        // Verify shipping
    }
}

// Domain: limits
public void addItem(OrderItem item) {
    if (items.size() >= 50) {
        throw new BusinessException("Too many items");
    }
    items.add(item);
}
```

### 2. Pick the Right Approach

- **Jakarta Validation** - API format checks
- **JSON Schema** - Complex data rules
- **Custom Validators** - Business logic
- **Method Validation** - Parameter checks

### 3. Use RFC 7807 Always

Return errors using RFC 7807:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Request Validation Failed",
  "status": 400,
  "detail": "One or more request parameters failed validation",
  "instance": "/v1/orders",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req-abc-123",
  "errors": [
    {
      "field": "items[0].quantity",
      "code": "Min",
      "message": "Quantity must be at least 1",
      "rejectedValue": 0
    }
  ]
}
```

### 4. Enable Method Validation

Create this configuration:

```java
@Configuration
public class ValidationConfig {
    @Bean
    public MethodValidationPostProcessor processor(
            Validator validator) {
        MethodValidationPostProcessor p = 
            new MethodValidationPostProcessor();
        p.setValidator(validator);
        return p;
    }
}
```

### 5. Cache Schemas for Speed

Store loaded schemas in a map:

```java
@Component
public class JsonSchemaValidator {
    private final Map<String, JsonSchema> cache = 
        new ConcurrentHashMap<>();
    
    public void validate(Object payload, String path) {
        JsonSchema schema = cache.computeIfAbsent(
            path, this::loadSchema);
        // validate
    }
}
```

## Related Docs

### Next Steps
- [Validation Testing](validation-testing.md)

### Spring Implementation
- [Validation Fundamentals](validation-fundamentals.md)
- [Custom Validators](custom-validators.md)
- [Validation Standards](../error-handling/validation-standards.md)
- [Imperative Error Handling](../error-handling/imperative-error-handling.md)
- [Error Response Formats](../error-handling/error-response-formats.md)

### Theory
- [Advanced Schema Design](../../../guides/api-design/request-response/advanced-schema-design.md)
- [Error Response Standards](../../../guides/api-design/request-response/error-response-standards.md)
