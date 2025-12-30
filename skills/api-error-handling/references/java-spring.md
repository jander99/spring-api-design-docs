# Java/Spring Error Handling Implementation

This reference covers Spring Boot implementation patterns for RFC 7807 error responses, including exception hierarchies, global exception handlers, and validation integration.

## Exception Hierarchy

### Base Exception Class

```java
@Getter
public abstract class ApplicationException extends RuntimeException {
    private final String errorCode;
    private final transient Object[] args;
    
    protected ApplicationException(String errorCode, String message, Object... args) {
        super(message);
        this.errorCode = errorCode;
        this.args = args;
    }
    
    protected ApplicationException(String errorCode, String message, 
                                   Throwable cause, Object... args) {
        super(message, cause);
        this.errorCode = errorCode;
        this.args = args;
    }
}
```

### Specific Exception Types

```java
// 404 Not Found
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends ApplicationException {
    public ResourceNotFoundException(String resourceType, Object identifier) {
        super("RESOURCE_NOT_FOUND",
              String.format("%s with identifier %s not found", resourceType, identifier),
              resourceType, identifier);
    }
}

// 400 Bad Request - Validation
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ValidationException extends ApplicationException {
    @Getter
    private final List<ValidationError> errors;
    
    public ValidationException(List<ValidationError> errors) {
        super("VALIDATION_ERROR", "Validation failed");
        this.errors = List.copyOf(errors);
    }
    
    @Getter
    @AllArgsConstructor
    public static class ValidationError {
        private final String field;
        private final String code;
        private final String message;
    }
}

// 409 Conflict - Business rule
@ResponseStatus(HttpStatus.CONFLICT)
public class BusinessException extends ApplicationException {
    public BusinessException(String errorCode, String message, Object... args) {
        super(errorCode, message, args);
    }
}

// 403 Forbidden
@ResponseStatus(HttpStatus.FORBIDDEN)
public class AccessDeniedException extends ApplicationException {
    public AccessDeniedException(String message) {
        super("ACCESS_DENIED", message);
    }
}
```

## RFC 7807 Response DTOs

### ProblemDetail Class

Spring 6+ has built-in `ProblemDetail`, but you can create a custom one:

```java
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProblemDetail {
    private URI type;
    private String title;
    private Integer status;
    private String detail;
    private URI instance;
    
    // Extensions
    private OffsetDateTime timestamp;
    private String requestId;
    private List<ValidationError> errors;
    
    @Data
    @Builder
    public static class ValidationError {
        private String field;
        private String code;
        private String message;
        private Object rejectedValue;
    }
}
```

## Global Exception Handler

### @ControllerAdvice Implementation

```java
@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    @Value("${app.error.problem-base-uri:https://api.example.com/problems}")
    private String problemBaseUri;
    
    private final RequestIdProvider requestIdProvider;
    
    // Handle custom validation exception
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ProblemDetail> handleValidation(ValidationException ex) {
        log.info("Validation failed: {}", ex.getMessage());
        
        List<ProblemDetail.ValidationError> errors = ex.getErrors().stream()
            .map(e -> ProblemDetail.ValidationError.builder()
                .field(e.getField())
                .code(e.getCode())
                .message(e.getMessage())
                .build())
            .toList();
        
        ProblemDetail problem = ProblemDetail.builder()
            .type(URI.create(problemBaseUri + "/validation-error"))
            .title("Validation Failed")
            .status(400)
            .detail("One or more fields failed validation")
            .instance(getCurrentRequestUri())
            .timestamp(OffsetDateTime.now())
            .requestId(requestIdProvider.getRequestId())
            .errors(errors)
            .build();
        
        return ResponseEntity.badRequest()
            .contentType(MediaType.parseMediaType("application/problem+json"))
            .body(problem);
    }
    
    // Handle Bean Validation (@Valid) failures
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleBeanValidation(
            MethodArgumentNotValidException ex) {
        
        List<ProblemDetail.ValidationError> errors = ex.getBindingResult()
            .getFieldErrors().stream()
            .map(fe -> ProblemDetail.ValidationError.builder()
                .field(fe.getField())
                .code(fe.getCode())
                .message(fe.getDefaultMessage())
                .rejectedValue(fe.getRejectedValue())
                .build())
            .toList();
        
        ProblemDetail problem = ProblemDetail.builder()
            .type(URI.create(problemBaseUri + "/validation-error"))
            .title("Validation Failed")
            .status(400)
            .detail("Request validation failed")
            .instance(getCurrentRequestUri())
            .timestamp(OffsetDateTime.now())
            .requestId(requestIdProvider.getRequestId())
            .errors(errors)
            .build();
        
        return ResponseEntity.badRequest()
            .contentType(MediaType.parseMediaType("application/problem+json"))
            .body(problem);
    }
    
    // Handle resource not found
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex) {
        log.info("Resource not found: {}", ex.getMessage());
        
        ProblemDetail problem = ProblemDetail.builder()
            .type(URI.create(problemBaseUri + "/resource-not-found"))
            .title("Resource Not Found")
            .status(404)
            .detail(ex.getMessage())
            .instance(getCurrentRequestUri())
            .timestamp(OffsetDateTime.now())
            .requestId(requestIdProvider.getRequestId())
            .build();
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .contentType(MediaType.parseMediaType("application/problem+json"))
            .body(problem);
    }
    
    // Handle business rule violations
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ProblemDetail> handleBusiness(BusinessException ex) {
        log.warn("Business rule violation: {}", ex.getMessage());
        
        ProblemDetail problem = ProblemDetail.builder()
            .type(URI.create(problemBaseUri + "/business-error"))
            .title("Business Rule Violation")
            .status(409)
            .detail(ex.getMessage())
            .instance(getCurrentRequestUri())
            .timestamp(OffsetDateTime.now())
            .requestId(requestIdProvider.getRequestId())
            .build();
        
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .contentType(MediaType.parseMediaType("application/problem+json"))
            .body(problem);
    }
    
    // Catch-all for unhandled exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        
        ProblemDetail problem = ProblemDetail.builder()
            .type(URI.create(problemBaseUri + "/internal-error"))
            .title("Internal Server Error")
            .status(500)
            .detail("An unexpected error occurred")
            .instance(getCurrentRequestUri())
            .timestamp(OffsetDateTime.now())
            .requestId(requestIdProvider.getRequestId())
            .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .contentType(MediaType.parseMediaType("application/problem+json"))
            .body(problem);
    }
    
    private URI getCurrentRequestUri() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) 
            RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            return URI.create(attrs.getRequest().getRequestURI());
        }
        return URI.create("/unknown");
    }
}
```

## Bean Validation Integration

### Request DTO with Validation

```java
@Data
public class CreateOrderRequest {
    
    @NotNull(message = "Customer ID is required")
    private UUID customerId;
    
    @NotEmpty(message = "At least one item is required")
    @Size(max = 50, message = "Cannot exceed 50 items")
    @Valid
    private List<OrderItemRequest> items;
    
    @Valid
    @NotNull(message = "Shipping address is required")
    private AddressRequest shippingAddress;
}

@Data
public class OrderItemRequest {
    
    @NotNull(message = "Product ID is required")
    private UUID productId;
    
    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 1000, message = "Quantity cannot exceed 1000")
    private Integer quantity;
}

@Data  
public class AddressRequest {
    
    @NotBlank(message = "Street is required")
    @Size(max = 255, message = "Street cannot exceed 255 characters")
    private String street;
    
    @NotBlank(message = "City is required")
    private String city;
    
    @NotBlank(message = "Zip code is required")
    @Pattern(regexp = "^\\d{5}(-\\d{4})?$", message = "Invalid zip code format")
    private String zipCode;
}
```

### Controller with Validation

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {
    
    private final OrderService orderService;
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        // If validation fails, MethodArgumentNotValidException is thrown
        // and handled by GlobalExceptionHandler
        Order order = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(order));
    }
}
```

## Custom Validators

### Annotation Definition

```java
@Documented
@Constraint(validatedBy = FutureDateValidator.class)
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
public @interface FutureDate {
    String message() default "Date must be in the future";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

### Validator Implementation

```java
public class FutureDateValidator implements ConstraintValidator<FutureDate, LocalDate> {
    
    @Override
    public boolean isValid(LocalDate value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // Let @NotNull handle null
        }
        return value.isAfter(LocalDate.now());
    }
}
```

## Service-Level Validation

For business rules that require database lookups:

```java
@Service
@RequiredArgsConstructor
public class OrderValidator {
    
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    
    public void validateOrder(CreateOrderRequest request) {
        List<ValidationException.ValidationError> errors = new ArrayList<>();
        
        // Check customer exists
        if (!customerRepository.existsById(request.getCustomerId())) {
            errors.add(new ValidationException.ValidationError(
                "customerId", "CUSTOMER_NOT_FOUND", "Customer not found"));
        }
        
        // Check inventory for each item
        for (int i = 0; i < request.getItems().size(); i++) {
            OrderItemRequest item = request.getItems().get(i);
            Product product = productRepository.findById(item.getProductId())
                .orElse(null);
            
            if (product == null) {
                errors.add(new ValidationException.ValidationError(
                    String.format("items[%d].productId", i),
                    "PRODUCT_NOT_FOUND",
                    "Product not found"));
            } else if (product.getStock() < item.getQuantity()) {
                errors.add(new ValidationException.ValidationError(
                    String.format("items[%d].quantity", i),
                    "INSUFFICIENT_STOCK",
                    String.format("Only %d available", product.getStock())));
            }
        }
        
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }
}
```

## WebFlux (Reactive) Error Handling

For reactive applications:

```java
@Component
@Order(-2)
public class GlobalErrorWebExceptionHandler extends AbstractErrorWebExceptionHandler {
    
    public GlobalErrorWebExceptionHandler(ErrorAttributes errorAttributes,
                                          WebProperties.Resources resources,
                                          ApplicationContext applicationContext,
                                          ServerCodecConfigurer configurer) {
        super(errorAttributes, resources, applicationContext);
        this.setMessageWriters(configurer.getWriters());
    }
    
    @Override
    protected RouterFunction<ServerResponse> getRoutingFunction(ErrorAttributes attrs) {
        return RouterFunctions.route(RequestPredicates.all(), this::renderError);
    }
    
    private Mono<ServerResponse> renderError(ServerRequest request) {
        Throwable error = getError(request);
        
        if (error instanceof ValidationException ve) {
            return buildValidationResponse(ve, request);
        }
        if (error instanceof ResourceNotFoundException rnf) {
            return buildNotFoundResponse(rnf, request);
        }
        
        return buildInternalErrorResponse(error, request);
    }
    
    private Mono<ServerResponse> buildValidationResponse(ValidationException ex, 
                                                         ServerRequest request) {
        ProblemDetail problem = ProblemDetail.builder()
            .type(URI.create("https://api.example.com/problems/validation-error"))
            .title("Validation Failed")
            .status(400)
            .detail(ex.getMessage())
            .instance(URI.create(request.path()))
            .errors(mapErrors(ex.getErrors()))
            .build();
        
        return ServerResponse.badRequest()
            .contentType(MediaType.parseMediaType("application/problem+json"))
            .bodyValue(problem);
    }
}
```

## Testing Error Responses

### Unit Test for Exception Handler

```java
@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {
    
    @Mock
    private RequestIdProvider requestIdProvider;
    
    @InjectMocks
    private GlobalExceptionHandler handler;
    
    @Test
    void shouldHandleValidationException() {
        // Given
        var errors = List.of(
            new ValidationException.ValidationError("email", "REQUIRED", "Email is required")
        );
        var exception = new ValidationException(errors);
        when(requestIdProvider.getRequestId()).thenReturn("req-123");
        
        // When
        ResponseEntity<ProblemDetail> response = handler.handleValidation(exception);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getTitle()).isEqualTo("Validation Failed");
        assertThat(response.getBody().getErrors()).hasSize(1);
        assertThat(response.getBody().getErrors().get(0).getField()).isEqualTo("email");
    }
}
```

### Integration Test for Error Response

```java
@WebMvcTest(OrderController.class)
class OrderControllerErrorTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void shouldReturn400WhenValidationFails() throws Exception {
        String invalidRequest = """
            {
              "customerId": null,
              "items": []
            }
            """;
        
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentType("application/problem+json"))
            .andExpect(jsonPath("$.type").value(containsString("validation-error")))
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.errors").isArray())
            .andExpect(jsonPath("$.errors[?(@.field == 'customerId')]").exists())
            .andExpect(jsonPath("$.errors[?(@.field == 'items')]").exists());
    }
    
    @Test
    void shouldReturn404WhenOrderNotFound() throws Exception {
        UUID orderId = UUID.randomUUID();
        when(orderService.getOrder(orderId))
            .thenThrow(new ResourceNotFoundException("Order", orderId));
        
        mockMvc.perform(get("/v1/orders/{id}", orderId))
            .andExpect(status().isNotFound())
            .andExpect(content().contentType("application/problem+json"))
            .andExpect(jsonPath("$.type").value(containsString("resource-not-found")))
            .andExpect(jsonPath("$.status").value(404));
    }
}
```

## Configuration

### Application Properties

```yaml
app:
  error:
    problem-base-uri: ${PROBLEM_BASE_URI:https://api.example.com/problems}
    include-stack-trace: ${INCLUDE_STACK_TRACE:false}
    sanitize-in-production: ${SANITIZE_ERRORS:true}
```

### Error Sanitization

```java
@Component
@RequiredArgsConstructor
public class ErrorSanitizer {
    
    @Value("${spring.profiles.active:}")
    private String activeProfile;
    
    public String sanitize(String message) {
        if ("production".equals(activeProfile)) {
            // Remove potentially sensitive information
            if (message.contains("SQL") || message.contains("constraint")) {
                return "A database error occurred";
            }
            if (message.contains("Connection")) {
                return "A connection error occurred";
            }
        }
        return message;
    }
}
```
