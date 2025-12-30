# Controllers Documentation

This directory contains comprehensive documentation for implementing controllers in Spring Boot applications, covering both imperative (Spring MVC) and reactive (WebFlux) approaches.

## 📋 Table of Contents

### [Controller Fundamentals](./Controller-Fundamentals.md)
**Core principles and patterns for all controller implementations**
- Controller design principles and structure
- Package organization and naming conventions
- Response structure standards and wrapper usage guidelines
- OpenAPI documentation patterns
- Security implementation basics
- Common patterns and anti-patterns
- Versioning and global error handling integration

### [Imperative Controllers](./Imperative-Controllers.md)
**Spring MVC patterns with blocking I/O**
- Basic controller structure and CRUD operations
- Standard response patterns with ApiResponse wrapper
- File upload and bulk operation handling
- Security implementation with JWT
- Best practices for status codes and validation
- Exception handling strategies

### [Reactive Controllers](./Reactive-Controllers.md)
**WebFlux patterns with non-blocking I/O**
- Reactive controller structure using Mono and Flux
- Reactive service interfaces and validation patterns
- Streaming responses and Server-Sent Events
- File upload handling in reactive applications
- Security in reactive controllers
- Advanced reactive patterns (parallel processing, deduplication)

### [Request Response Mapping](./Request-Response-Mapping.md)
**DTOs, mappers, and validation patterns**
- Request DTO structure with validation annotations
- Response DTO patterns and immutability
- Mapper implementations (basic and MapStruct)
- Validation standards and custom validation
- Best practices for separation of concerns and null safety

### [Controller Testing](./Controller-Testing.md)
**Comprehensive testing strategies**
- Unit testing for imperative controllers with MockMvc
- Reactive controller testing with WebTestClient
- Security testing patterns and custom annotations
- Integration testing with Testcontainers
- Test data builders and custom assertions

## 🏗️ Architecture Overview

Controllers in our Spring Boot applications follow a layered architecture pattern:

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

## 🔄 Imperative vs Reactive

| Aspect | Imperative (Spring MVC) | Reactive (WebFlux) |
|--------|-------------------------|-------------------|
| **Programming Model** | Blocking I/O | Non-blocking I/O |
| **Threading** | One thread per request | Event loop with few threads |
| **Return Types** | `ResponseEntity<T>` | `Mono<ResponseEntity<T>>` |
| **Collections** | `List<T>`, `Page<T>` | `Flux<T>` |
| **Best For** | Traditional CRUD operations | High-throughput, streaming data |
| **Testing** | `MockMvc` | `WebTestClient` |

## 📚 Quick Start Examples

### Imperative Controller
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

## 🛡️ Security Patterns

All controllers implement OAuth 2.1/OIDC security:

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

## ✅ Validation Standards

Consistent validation across all controllers:

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

## 📊 Response Standards

### Single Resource Response
```java
// Direct response for single resources
@GetMapping("/{id}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID id) {
    return ResponseEntity.ok(orderResponse);
}
```

### Collection Response
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

## 🧪 Testing Approach

### Unit Tests
- Use `@WebMvcTest` for imperative controllers
- Use `@WebFluxTest` for reactive controllers
- Mock all dependencies (`@MockBean`)
- Test validation, error handling, and security

### Integration Tests
- Use `@SpringBootTest` with `@Testcontainers`
- Test complete request-response cycle
- Verify database interactions
- Test security integration

## 🔗 Cross-References

- **API Design Standards**: See `../api-design/` for framework-agnostic REST principles
- **Error Handling**: See `../error-handling/` for exception management patterns
- **Security Implementation**: See `../security/` for detailed OAuth 2.1 configuration
- **Testing Standards**: See `../testing/unit-testing/Unit-Testing-Fundamentals.md` and `../testing/integration-testing/Integration-Testing-Fundamentals.md`

## 📝 Migration Notes

When migrating from the original monolithic controller document:
- All code examples and patterns have been preserved
- Cross-references between sections are maintained
- Each focused document can be read independently
- Navigation between related concepts is provided through this README

This modular approach makes it easier to:
- Find specific implementation patterns
- Focus on either imperative or reactive approaches
- Reference testing strategies during development
- Maintain and update individual aspects independently