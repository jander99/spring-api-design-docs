# Controllers Documentation

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Authentication, Architecture
> 
> **📊 Complexity:** 10.9 grade level • 1.8% technical density • fairly difficult

## What are Controllers?

Controllers handle HTTP requests in your Spring Boot application. They receive requests from clients. They process the requests. Then they send back responses.

Think of controllers as your application's front desk. They greet incoming requests. They route them to the right place.

Spring offers two ways to build controllers:

- **Spring MVC**: Traditional approach. Processes one request at a time. Uses separate threads for each request.
- **WebFlux**: Modern approach. Handles many requests at once. Does not block threads.

This guide covers both approaches with practical examples.

## 📋 Table of Contents

### [Controller Fundamentals](./controller-fundamentals.md)
**Core principles that apply to all controllers**
- How to design and structure controllers
- How to organize packages and name files
- How to format response data
- How to add API documentation
- How to secure your endpoints
- Common patterns to follow (and avoid)
- How to version APIs and handle errors

### [Imperative Controllers](./imperative-controllers.md)
**Spring MVC patterns for traditional applications**
- Basic controller setup and CRUD operations
- How to format responses with the ApiResponse wrapper
- How to handle file uploads and bulk operations
- How to secure endpoints with JWT tokens
- When to use each HTTP status code
- How to handle exceptions and errors

### [Reactive Controllers](./reactive-controllers.md)
**WebFlux patterns for high-performance applications**
- How to build reactive controllers with Mono and Flux
- How to validate data in reactive services
- How to stream responses and send events
- How to handle file uploads without blocking
- How to secure reactive endpoints
- Advanced patterns like parallel processing

### [Request Response Mapping](./request-response-mapping.md)
**How to transform data between layers**
- How to structure request DTOs with validation
- How to build immutable response DTOs
- How to map between DTOs and domain objects
- How to validate input and create custom validators
- Best practices for clean code and null safety

### [Controller Testing](./controller-testing.md)
**How to test your controllers**
- Unit testing MVC controllers with MockMvc
- Testing reactive controllers with WebTestClient
- How to test security and permissions
- Integration testing with Testcontainers
- Building test data and custom assertions

## 🏗️ How Controllers Fit In

Controllers sit at the top of your application. They receive HTTP requests. Then they send work to lower layers:

```
┌─────────────────────┐
│   Controllers       │ ← HTTP/REST Interface Layer
├─────────────────────┤
│   Mappers/DTOs      │ ← Data Transformation Layer
├─────────────────────┤
│ Application Services│ ← Business Logic Orchestration
├─────────────────────┤
│   Domain Services   │ ← Core Business Logic
├─────────────────────┤
│   Infrastructure    │ ← Data Access & External APIs
└─────────────────────┘
```

## 🔄 Spring MVC vs WebFlux

Choose the right approach for your needs:

| Feature | Spring MVC | WebFlux |
|---------|------------|---------|
| **How it works** | Waits for each operation to finish | Handles many operations at once |
| **Threads** | One thread per request | Few threads handle all requests |
| **Return types** | `ResponseEntity<T>` | `Mono<ResponseEntity<T>>` |
| **Collections** | `List<T>`, `Page<T>` | `Flux<T>` |
| **Best for** | Standard CRUD apps | High-traffic apps, streaming |
| **Testing tool** | `MockMvc` | `WebTestClient` |

## 📚 Simple Examples

### Spring MVC Controller
```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        OrderDto order = orderService.createOrder(mapper.toDto(request));
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(mapper.toResponse(order));
    }
}
```

### Reactive Controller
```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class ReactiveOrderController {
    
    @PostMapping
    public Mono<ResponseEntity<OrderResponse>> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        return Mono.just(request)
            .map(mapper::toDto)
            .flatMap(orderService::createOrder)
            .map(mapper::toResponse)
            .map(response -> ResponseEntity.status(HttpStatus.CREATED).body(response));
    }
}
```

## 🛡️ How to Secure Controllers

All controllers use OAuth 2.1 for security. Here's a basic example:

```java
@PreAuthorize("hasAuthority('SCOPE_orders:read')")
@GetMapping("/{orderId}")
public ResponseEntity<OrderResponse> getOrder(
        @PathVariable UUID orderId,
        @AuthenticationPrincipal Jwt jwt) {
    String userId = jwt.getClaimAsString("sub");
    // Implementation with user context
}
```

## ✅ How to Validate Input

Use validation annotations to check incoming data:

```java
@Data
public class CreateOrderRequest {
    @NotNull(message = "Customer ID is required")
    private UUID customerId;
    
    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<OrderItemRequest> items;
}
```

## 📊 How to Format Responses

### Returning One Item
```java
// Direct response for single resources
@GetMapping("/{id}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID id) {
    return ResponseEntity.ok(orderResponse);
}
```

### Returning Multiple Items
```java
// Wrapped response for collections with metadata
@GetMapping
public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrders() {
    return ResponseEntity.ok(ApiResponse.<List<OrderResponse>>builder()
        .data(orders)
        .meta(metadata)
        .build());
}
```

## 🧪 How to Test Controllers

### Unit Tests
- Use `@WebMvcTest` for Spring MVC controllers
- Use `@WebFluxTest` for WebFlux controllers
- Mock all dependencies with `@MockBean`
- Test validation, errors, and security

### Integration Tests
- Use `@SpringBootTest` with `@Testcontainers`
- Test the full request-response cycle
- Verify database operations work correctly
- Test security features end-to-end

## 🔗 Related Documentation

- **API Design Standards**: See `/guides/api-design/` for REST principles
- **Error Handling**: See `../error-handling/` for exception patterns
- **Security**: See `../security/` for OAuth 2.1 setup
- **Testing**: See `../testing/` for detailed testing guides

## 📝 About This Documentation

We split one large document into focused guides. Each guide covers one topic. You can read them independently.

Benefits:
- Find what you need faster
- Focus on MVC or WebFlux separately
- Look up specific patterns easily
- Update topics independently