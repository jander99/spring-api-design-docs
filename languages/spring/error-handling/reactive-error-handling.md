# Reactive Error Handling

## Overview

This document covers error handling patterns for Spring WebFlux (reactive) applications. Reactive error handling requires different approaches compared to imperative programming due to the asynchronous nature of reactive streams.

## Reactive Global Exception Handler

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
        return RouterFunctions.route(RequestPredicates.all(), this::renderErrorResponse);
    }

    private Mono<ServerResponse> renderErrorResponse(ServerRequest request) {
        Throwable error = getError(request);
        
        return determineHttpStatus(error)
            .zipWith(buildErrorResponse(error))
            .flatMap(tuple -> {
                HttpStatus status = tuple.getT1();
                Object errorResponse = tuple.getT2();
                
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
    
    private Mono<Object> buildErrorResponse(Throwable error) {
        return requestIdProvider.getRequestIdMono()
            .flatMap(requestId -> {
                if (error instanceof ApplicationException) {
                    ApplicationException ex = (ApplicationException) error;
                    
                    if (error instanceof ValidationException) {
                        ValidationException validationEx = (ValidationException) ex;
                        
                        List<ProblemDetail.ValidationError> details = validationEx.getErrors().stream()
                            .map(validationError -> ProblemDetail.ValidationError.builder()
                                .field(validationError.getField())
                                .code(validationError.getCode())
                                .message(validationError.getMessage())
                                .build())
                            .collect(Collectors.toList());
                        
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

## Reactive Request ID Provider

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

## Reactive WebFilter for Request ID

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

## Reactive Error Handling in Services

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

### Reactive Validation with External Services

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderValidator {
    
    private final ReactiveProductService productService;
    private final ReactiveCustomerService customerService;
    
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

## Reactive Error Propagation in Controllers

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
    
    @PostMapping
    public Mono<ResponseEntity<OrderResponse>> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.createOrder(mapToDto(request))
            .map(orderDto -> ResponseEntity.status(HttpStatus.CREATED)
                .body(mapToResponse(orderDto)))
            .onErrorResume(ValidationException.class, ex -> Mono.error(ex))
            .onErrorResume(BusinessException.class, ex -> Mono.error(ex))
            .onErrorResume(e -> {
                log.error("Error creating order", e);
                return Mono.error(new TechnicalException(
                    "ORD_CREATION_ERROR", "Error creating order", e));
            });
    }
}
```

## Reactive Error Metrics

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
    
    public <T> Flux<T> recordErrorMetrics(Flux<T> flux, String operationName) {
        return flux.onErrorResume(e -> {
            meterRegistry.counter("application.errors",
                    "operation", operationName,
                    "exception", e.getClass().getSimpleName())
                .increment();
                
            return Flux.error(e);
        });
    }
}
```

## Reactive Error Handling Patterns

### Pattern: Fallback Values

```java
public Mono<OrderDto> getOrderWithFallback(UUID orderId) {
    return orderRepository.findById(orderId)
        .map(this::mapToDto)
        .switchIfEmpty(Mono.just(createDefaultOrder(orderId)))
        .onErrorReturn(createErrorOrder(orderId));
}
```

### Pattern: Retry with Exponential Backoff

```java
public Mono<OrderDto> getOrderWithRetry(UUID orderId) {
    return orderRepository.findById(orderId)
        .map(this::mapToDto)
        .switchIfEmpty(Mono.error(new ResourceNotFoundException("Order", orderId)))
        .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
            .filter(ex -> ex instanceof TransientException));
}
```

### Pattern: Circuit Breaker

```java
@Component
@RequiredArgsConstructor
public class ReactiveOrderService {
    
    private final CircuitBreaker circuitBreaker;
    
    public Mono<OrderDto> getOrder(UUID orderId) {
        return orderRepository.findById(orderId)
            .map(this::mapToDto)
            .switchIfEmpty(Mono.error(new ResourceNotFoundException("Order", orderId)))
            .transform(CircuitBreakerOperator.of(circuitBreaker))
            .onErrorResume(CallNotPermittedException.class, 
                ex -> Mono.error(new TechnicalException("ORD_CIRCUIT_OPEN", 
                    "Order service is temporarily unavailable", ex)));
    }
}
```

## Testing Reactive Error Handling

### Unit Testing

```java
@ExtendWith(MockitoExtension.class)
public class ReactiveOrderServiceTest {
    
    @Mock
    private ReactiveOrderRepository orderRepository;
    
    @InjectMocks
    private ReactiveOrderService orderService;
    
    @Test
    void shouldThrowResourceNotFoundException_WhenOrderNotFound() {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderRepository.findById(orderId)).thenReturn(Mono.empty());
        
        // When & Then
        StepVerifier.create(orderService.getOrder(orderId))
            .expectError(ResourceNotFoundException.class)
            .verify();
    }
}
```

### Integration Testing

```java
@WebFluxTest(ReactiveOrderController.class)
public class ReactiveOrderControllerTest {

    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private ReactiveOrderService orderService;
    
    @Test
    void shouldReturnNotFound_WhenOrderDoesNotExist() {
        // Given
        UUID orderId = UUID.randomUUID();
        when(orderService.getOrder(orderId))
            .thenReturn(Mono.error(new ResourceNotFoundException("Order", orderId)));
        
        // When & Then
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

1. **Use Reactive Operators**: Leverage reactive operators like `onErrorResume`, `onErrorMap`, and `switchIfEmpty`
2. **Avoid Blocking**: Never use blocking operations in reactive error handlers
3. **Context Propagation**: Use reactor context for request-scoped information
4. **Proper Error Mapping**: Map technical exceptions to domain exceptions appropriately
5. **Graceful Degradation**: Consider fallback values and circuit breakers for resilience
6. **Structured Logging**: Use structured logging with context information

## Common Anti-patterns

1. **Blocking in Reactive Chains**: Using `block()` or other blocking operations
2. **Catching Generic Exceptions**: Catching `Exception` instead of specific types
3. **Ignoring Context**: Not preserving reactive context across error handling
4. **Synchronous Error Handling**: Using traditional try-catch blocks in reactive flows

## Related Documentation

- [Exception Hierarchy](./exception-hierarchy.md) - Exception classes and inheritance
- [Error Response Formats](./error-response-formats.md) - RFC 7807 and response structures
- [Imperative Error Handling](./imperative-error-handling.md) - Spring MVC global exception handlers
- [Validation Standards](./validation-standards.md) - Bean validation and custom validators
- [Schema Validation](../validation/schema-validation.md) - Complete validation patterns (imperative examples apply to reactive)
- [Error Logging and Monitoring](./error-logging-and-monitoring.md) - Structured logging and metrics