# Reactive Error Handling

## Overview

This guide covers how to handle errors in Spring WebFlux reactive applications. Reactive applications work differently from traditional request-response programming. They use asynchronous streams, so error handling must also be asynchronous.

## Global Exception Handler

Catch all errors and return consistent error responses:

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
         // Route all errors to the response renderer
         return RouterFunctions.route(RequestPredicates.all(), this::renderErrorResponse);
     }

     private Mono<ServerResponse> renderErrorResponse(ServerRequest request) {
         Throwable error = getError(request);
         
         // Get the HTTP status and error response body
         return determineHttpStatus(error)
             .zipWith(buildErrorResponse(error))
             .flatMap(tuple -> {
                 HttpStatus status = tuple.getT1();
                 Object errorResponse = tuple.getT2();
                 
                 // Send back the status and JSON error response
                 return ServerResponse.status(status)
                     .contentType(MediaType.APPLICATION_JSON)
                     .bodyValue(errorResponse);
             });
     }
    
     private Mono<HttpStatus> determineHttpStatus(Throwable error) {
         return Mono.fromCallable(() -> {
             // Map each error type to the correct HTTP status code
             if (error instanceof ResourceNotFoundException) {
                 return HttpStatus.NOT_FOUND;           // 404
             } else if (error instanceof ValidationException) {
                 return HttpStatus.BAD_REQUEST;         // 400
             } else if (error instanceof BusinessException) {
                 return HttpStatus.CONFLICT;            // 409
             } else if (error instanceof SecurityException) {
                 return HttpStatus.FORBIDDEN;           // 403
             } else {
                 return HttpStatus.INTERNAL_SERVER_ERROR; // 500
             }
         });
     }
    
    private Mono<Object> buildErrorResponse(Throwable error) {
         // Get the request ID for logging
         return requestIdProvider.getRequestIdMono()
             .flatMap(requestId -> {
                 if (error instanceof ApplicationException) {
                     ApplicationException ex = (ApplicationException) error;
                     
                     // Handle validation errors (input not valid)
                     if (error instanceof ValidationException) {
                         ValidationException validationEx = (ValidationException) ex;
                         
                         // Format each validation error
                         List<ProblemDetail.ValidationError> details = validationEx.getErrors().stream()
                             .map(validationError -> ProblemDetail.ValidationError.builder()
                                 .field(validationError.getField())
                                 .code(validationError.getCode())
                                 .message(validationError.getMessage())
                                 .build())
                             .collect(Collectors.toList());
                         
                         // Return validation error response
                         return Mono.just(errorResponseBuilder.buildErrorResponse(
                             "validation-error",
                             "Validation Failed",
                             HttpStatus.BAD_REQUEST.value(),
                             ex.getMessage(),
                             details,
                             requestId
                         ));
                     }
                    
                    if (error instanceof ResourceNotFoundException) {
                        return Mono.just(errorResponseBuilder.buildErrorResponse(
                            "resource-not-found",
                            "Resource Not Found",
                            HttpStatus.NOT_FOUND.value(),
                            ex.getMessage(),
                            null,
                            requestId
                        ));
                    }
                    
                    if (error instanceof BusinessException) {
                        return Mono.just(errorResponseBuilder.buildErrorResponse(
                            "business-error",
                            "Business Rule Violation",
                            HttpStatus.CONFLICT.value(),
                            ex.getMessage(),
                            null,
                            requestId
                        ));
                    }
                    
                    if (error instanceof SecurityException) {
                        return Mono.just(errorResponseBuilder.buildErrorResponse(
                            "security-error",
                            "Access Denied",
                            HttpStatus.FORBIDDEN.value(),
                            ex.getMessage(),
                            null,
                            requestId
                        ));
                    }
                    
                    return Mono.just(errorResponseBuilder.buildErrorResponse(
                        "technical-error",
                        "Internal Server Error",
                        HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        "An internal server error occurred",
                        null,
                        requestId
                    ));
                }
                
                log.error("Unhandled exception", error);
                
                return Mono.just(errorResponseBuilder.buildErrorResponse(
                    "internal-error",
                    "Internal Server Error",
                    HttpStatus.INTERNAL_SERVER_ERROR.value(),
                    "An unexpected error occurred",
                    null,
                    requestId
                ));
            });
    }
}
```

## Request ID Provider

Request IDs help track errors across log messages. Create a reactive version that works with async streams.

### Interface Extension

```java
package com.example.common.api;

import reactor.core.publisher.Mono;

public interface ReactiveRequestIdProvider extends RequestIdProvider {
    Mono<String> getRequestIdMono();
}
```

### Reactive Implementation

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
         // Use this only for non-reactive code
         // For reactive code, use getRequestIdMono() instead
         return Mono.deferContextual(Mono::just)
             .map(context -> context.getOrDefault(REQUEST_ID_ATTRIBUTE, "unknown"))
             .map(Object::toString)
             .block();
     }
     
     public Mono<String> getRequestIdMono() {
         // Get the request ID from the reactive context
         return Mono.deferContextual(Mono::just)
             .map(context -> context.getOrDefault(REQUEST_ID_ATTRIBUTE, "unknown"))
             .map(Object::toString);
     }
     
     public Mono<Void> extractAndStoreRequestId(ServerWebExchange exchange, Mono<Void> chain) {
         // Get the request ID header or use a default
         String requestId = exchange.getRequest().getHeaders().getFirst(REQUEST_ID_HEADER);
         String finalRequestId = requestId != null ? requestId : "unknown";
         
         // Store it in the context for the request
         return chain.contextWrite(context -> context.put(REQUEST_ID_ATTRIBUTE, finalRequestId));
     }
}
```

## Web Filter for Request ID

Extract the request ID from headers and store it for the entire request:

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
         // Extract the request ID and add it to the reactive context
         return requestIdProvider.extractAndStoreRequestId(exchange, chain.filter(exchange));
     }
}
```

## Error Handling in Services

Services should handle errors without blocking. Use reactive operators to transform errors into domain exceptions.

### Non-Blocking Error Handling

Handle errors without stopping the stream using reactive operators:

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderService {
    
    private final ReactiveOrderRepository orderRepository;
    
    public Mono<OrderDto> getOrder(UUID orderId) {
         return orderRepository.findById(orderId)
             .map(this::mapToDto)                    // Convert to DTO if found
             .switchIfEmpty(Mono.error(             // Fail if not found
                 new ResourceNotFoundException("Order", orderId)
             ));
     }
    
    public Mono<OrderDto> createOrder(OrderCreationDto orderDto) {
         return validateOrder(orderDto)
             .then(Mono.defer(() -> {          // Wait for validation, then save
                 Order order = mapToEntity(orderDto);
                 return orderRepository.save(order);
             }))
             .map(this::mapToDto)              // Convert to DTO
             .onErrorMap(DataAccessException.class, ex -> // Handle database errors
                 new TechnicalException("ORD_PERSISTENCE_ERROR", "Error saving order", ex)
             );
     }
    
    private Mono<Void> validateOrder(OrderCreationDto orderDto) {
         return Mono.defer(() -> {
             List<ValidationException.ValidationError> errors = new ArrayList<>();
             
             // Check that order has at least one item
             if (orderDto.getItems() == null || orderDto.getItems().isEmpty()) {
                 errors.add(new ValidationException.ValidationError(
                     "items", "REQUIRED", "At least one item is required"
                 ));
             }
             
             // Return error if validation failed
             if (!errors.isEmpty()) {
                 return Mono.error(new ValidationException(errors));
             }
             
             return Mono.empty();  // Success - continue to next step
         });
     }
}
```

### Validating with Multiple Services

Run validation checks against multiple services at the same time:

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderValidator {
    
    private final ReactiveProductService productService;
    private final ReactiveCustomerService customerService;
    
    public Mono<Void> validateOrder(OrderCreationDto orderDto) {
         return Mono.defer(() -> {
             List<Mono<ValidationException.ValidationError>> validationTasks = new ArrayList<>();
             
             // Check that customer exists
             Mono<ValidationException.ValidationError> customerValidation = 
                 customerService.getCustomer(orderDto.getCustomerId())
                     .then(Mono.<ValidationException.ValidationError>empty())
                     .onErrorReturn(CustomerNotFoundException.class, 
                         new ValidationException.ValidationError(
                             "customerId", "CUSTOMER_NOT_FOUND", "Customer not found"
                         )
                     );
             
             validationTasks.add(customerValidation);
             
             // Check that products exist and have enough inventory
             Flux<ValidationException.ValidationError> productValidations = Flux
                 .fromIterable(orderDto.getItems())
                 .flatMap(item -> productService.getProduct(item.getProductId())
                     .flatMap(product -> {
                         if (product.getStock() < item.getQuantity()) {
                             return Mono.just(new ValidationException.ValidationError(
                                 "items", "INSUFFICIENT_STOCK", 
                                 "Insufficient stock for product " + product.getId()
                             ));
                         }
                         return Mono.<ValidationException.ValidationError>empty();
                     })
                     .onErrorReturn(ProductNotFoundException.class, 
                         new ValidationException.ValidationError(
                             "items", "PRODUCT_NOT_FOUND", 
                             "Product not found: " + item.getProductId()
                         )
                     )
                 );
             
             // Combine all validation checks
             return Flux.merge(
                     Flux.fromIterable(validationTasks).flatMap(task -> task),
                     productValidations
                 )
                 .collectList()
                 .flatMap(errors -> {
                     List<ValidationException.ValidationError> nonEmptyErrors = errors.stream()
                         .filter(Objects::nonNull)
                         .collect(Collectors.toList());
                     
                     // Report all errors found
                     if (!nonEmptyErrors.isEmpty()) {
                         return Mono.error(new ValidationException(nonEmptyErrors));
                     }
                     return Mono.empty();  // All checks passed
                 });
         });
     }
}
```

## Handling Errors in Controllers

Controllers should catch specific errors and let the global handler manage them:

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
             // Let the global handler process not-found errors
             .onErrorResume(ResourceNotFoundException.class, ex -> Mono.error(ex))
             // Convert unexpected errors to technical errors
             .onErrorResume(e -> {
                 log.error("Error retrieving order", e);
                 return Mono.error(new TechnicalException(
                     "ORD_RETRIEVAL_ERROR", "Error retrieving order", e
                 ));
             });
     }
    
    @PostMapping
     public Mono<ResponseEntity<OrderResponse>> createOrder(@Valid @RequestBody CreateOrderRequest request) {
         return orderService.createOrder(mapToDto(request))
             .map(orderDto -> ResponseEntity.status(HttpStatus.CREATED)
                 .body(mapToResponse(orderDto)))
             // Let the global handler process application errors
             .onErrorResume(ValidationException.class, ex -> Mono.error(ex))
             .onErrorResume(BusinessException.class, ex -> Mono.error(ex))
             // Convert unexpected errors to technical errors
             .onErrorResume(e -> {
                 log.error("Error creating order", e);
                 return Mono.error(new TechnicalException(
                     "ORD_CREATION_ERROR", "Error creating order", e
                 ));
             });
     }
}
```

## Tracking Errors with Metrics

Count errors and track them by operation type:

```java
@Component
@RequiredArgsConstructor
public class ReactiveErrorMetrics {
    
    private final MeterRegistry meterRegistry;
    
    public <T> Mono<T> recordErrorMetrics(Mono<T> mono, String operationName) {
         return mono.onErrorResume(e -> {
             // Count the error by operation and exception type
             meterRegistry.counter("application.errors",
                     "operation", operationName,
                     "exception", e.getClass().getSimpleName())
                 .increment();
                 
             // Continue with the error
             return Mono.error(e);
         });
     }
     
     public <T> Flux<T> recordErrorMetrics(Flux<T> flux, String operationName) {
         return flux.onErrorResume(e -> {
             // Count the error by operation and exception type
             meterRegistry.counter("application.errors",
                     "operation", operationName,
                     "exception", e.getClass().getSimpleName())
                 .increment();
                 
             // Continue with the error
             return Flux.error(e);
         });
     }
}
```

## Common Error Handling Patterns

### Fallback Values

When data is not available, return a default value instead of failing:

```java
public Mono<OrderDto> getOrderWithFallback(UUID orderId) {
     return orderRepository.findById(orderId)
         .map(this::mapToDto)
         .switchIfEmpty(Mono.just(createDefaultOrder(orderId)))  // Return default if not found
         .onErrorReturn(createErrorOrder(orderId));               // Return error order on failure
 }
```

### Retry with Exponential Backoff

Retry failed operations. Wait longer each time before retrying:

```java
public Mono<OrderDto> getOrderWithRetry(UUID orderId) {
     return orderRepository.findById(orderId)
         .map(this::mapToDto)
         .switchIfEmpty(Mono.error(new ResourceNotFoundException("Order", orderId)))
         // Retry up to 3 times with 1-second delays for transient errors
         .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
             .filter(ex -> ex instanceof TransientException)
         );
 }
```

### Circuit Breaker

Stop calling a service when it has repeated failures. This protects both services:

```java
@Component
@RequiredArgsConstructor
public class ReactiveOrderService {
    
    private final CircuitBreaker circuitBreaker;
    
    public Mono<OrderDto> getOrder(UUID orderId) {
         return orderRepository.findById(orderId)
             .map(this::mapToDto)
             .switchIfEmpty(Mono.error(new ResourceNotFoundException("Order", orderId)))
             // Use circuit breaker for resilience
             .transform(CircuitBreakerOperator.of(circuitBreaker))
             // Handle when circuit breaker is open
             .onErrorResume(CallNotPermittedException.class, 
                 ex -> Mono.error(new TechnicalException(
                     "ORD_CIRCUIT_OPEN", 
                     "Order service is temporarily unavailable", 
                     ex
                 ))
             );
     }
}
```

## Testing Error Handling

### Unit Tests

Test error handling in isolation:

```java
@ExtendWith(MockitoExtension.class)
public class ReactiveOrderServiceTest {
    
    @Mock
    private ReactiveOrderRepository orderRepository;
    
    @InjectMocks
    private ReactiveOrderService orderService;
    
    @Test
     void shouldThrowResourceNotFoundException_WhenOrderNotFound() {
         // Setup: prepare the test data
         UUID orderId = UUID.randomUUID();
         when(orderRepository.findById(orderId)).thenReturn(Mono.empty());
         
         // Test: get the order and verify error is thrown
         StepVerifier.create(orderService.getOrder(orderId))
             .expectError(ResourceNotFoundException.class)
             .verify();
     }
}
```

### Integration Tests

Test the entire error handling flow from controller to response:

```java
@WebFluxTest(ReactiveOrderController.class)
public class ReactiveOrderControllerTest {

    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private ReactiveOrderService orderService;
    
    @Test
     void shouldReturnNotFound_WhenOrderDoesNotExist() {
         // Setup: prepare the test data
         UUID orderId = UUID.randomUUID();
         when(orderService.getOrder(orderId))
             .thenReturn(Mono.error(new ResourceNotFoundException("Order", orderId)));
         
         // Test: call the endpoint and verify 404 response
         webTestClient.get()
             .uri("/v1/orders/{orderId}", orderId)
             .exchange()
             .expectStatus().isNotFound()
             .expectBody()
             .jsonPath("$.type").isEqualTo("https://api.example.com/problems/resource-not-found")
             .jsonPath("$.title").isEqualTo("Resource Not Found")
             .jsonPath("$.status").isEqualTo(404)
             .jsonPath("$.detail").exists()
             .jsonPath("$.timestamp").exists()
             .jsonPath("$.requestId").exists();
     }
}
```

## Best Practices

1. **Use Reactive Operators**: Use operators like `onErrorResume`, `onErrorMap`, and `switchIfEmpty` to handle errors in streams
2. **Avoid Blocking**: Do not use `block()` or other blocking operations in reactive error handlers
3. **Preserve Context**: Use reactor context to store request-specific information
4. **Map Errors Clearly**: Convert technical errors into domain-specific errors
5. **Provide Fallbacks**: Use fallback values and circuit breakers to continue when errors happen
6. **Log Structured Data**: Log errors with request IDs and context information

## Common Anti-patterns

1. **Blocking in Reactive Chains**: Never use `block()` in reactive flows. This stops the entire application
2. **Catching Generic Errors**: Catch specific exception types, not the generic `Exception` class
3. **Ignoring Context**: Always keep request context available through reactive chains
4. **Synchronous Error Handling**: Do not use traditional try-catch blocks in reactive flows

## Related Documentation

- [Exception Hierarchy](./exception-hierarchy.md) - Exception classes and inheritance
- [Error Response Formats](./error-response-formats.md) - RFC 9457 and response structures
- [Imperative Error Handling](./imperative-error-handling.md) - Spring MVC global exception handlers
- [Validation Standards](./validation-standards.md) - Bean validation and custom validators
- [Schema Validation](../validation/schema-validation.md) - Complete validation patterns (imperative examples apply to reactive)
- [Error Logging and Monitoring](./error-logging-and-monitoring.md) - Structured logging and metrics