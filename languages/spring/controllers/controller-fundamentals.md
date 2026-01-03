# Controller Fundamentals

**📖 Reading Guide**

- **Reading Time:** 7 minutes
- **Level:** Intermediate
- **Prerequisites:** Basic REST API knowledge
- **Grade Level:** 10.8 • **Flesch Score:** 42.8

## Overview

Controllers receive incoming HTTP requests. They translate these requests into your application code. This guide shows you how to build Spring Boot controllers properly.

## Core Design Principles

Follow these five rules for good controllers:

1. **Keep Controllers Thin**: Let services handle business logic, not controllers
2. **Map Data Cleanly**: Convert between request/response objects and business objects
3. **Use Right Status Codes**: Return 200, 201, 404, etc. correctly
4. **Handle Errors Consistently**: Use the same error format everywhere
5. **Follow API Specs**: Match your OpenAPI documentation in code

## How to Organize Controllers

### Folder Structure

Place controllers and related code in an organized structure:

```
com.example.orderservice.interfaces.rest
├── controller           # Your REST controller classes
├── request              # Classes for incoming requests
├── response             # Classes for outgoing responses
├── mapper               # Code to convert between formats
└── advice               # Global error handling code
```

### Naming Your Classes

Use consistent names that show what each class does:

| Type | Pattern | Example |
|------|---------|---------|
| Controller | `{Resource}Controller` | `OrderController` |
| Request object | `{Action}{Resource}Request` | `CreateOrderRequest` |
| Response object | `{Resource}Response` | `OrderResponse` |
| Converter | `{Resource}Mapper` | `OrderMapper` |

## Response Format Standards

All responses must follow a standard format. This format includes data and metadata.

### The Standard Response Class

Use this response class for your API responses:

```java
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private T data;
    private Meta meta;
    
    @Data
    @Builder
    public static class Meta {
        private OffsetDateTime timestamp;
        private String requestId;
        private Pagination pagination;
        
        @Data
        @Builder
        public static class Pagination {
            private int page;
            private int size;
            private long totalElements;
            private int totalPages;
        }
    }
}
```

### When to Wrap Responses

**Use ApiResponse wrapper for:**
- Lists of items with pagination (`/v1/orders`)
- Search results
- Operations that return metadata

**Use direct responses for:**
- Single item operations (`/v1/orders/{id}`)
- Create operations (POST)
- Delete operations (204 No Content)

### Examples

**Collection endpoint with wrapper:**

```java
@GetMapping
public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrders(...) {
    // Returns items with pagination metadata
}
```

**Single resource without wrapper:**

```java
@GetMapping("/{orderId}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
    // Returns just the order data
}
```

**Create operation without wrapper:**

```java
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}
```

**Delete operation with no content:**

```java
@DeleteMapping("/{orderId}")
public ResponseEntity<Void> deleteOrder(@PathVariable UUID orderId) {
    return ResponseEntity.noContent().build();
}
```

## Add API Documentation

Use OpenAPI annotations to document your endpoints. These annotations help generate API documentation automatically.

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Order management endpoints")
public class OrderController {

    @Operation(
        summary = "Create a new order",
        description = "Creates a new order with items and shipping address"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "201", 
            description = "Order created successfully",
            content = @Content(schema = @Schema(implementation = OrderResponse.class))
        ),
        @ApiResponse(
            responseCode = "400", 
            description = "Invalid request",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))
        )
    })
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        // Implementation here
    }
}
```

## Add Security Checks

Use Spring Security annotations to control who can call each endpoint.

```java
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderApplicationService orderService;
    private final OrderMapper orderMapper;
    
    // Only allow users with read permission
    @GetMapping("/{orderId}")
    @PreAuthorize("hasAuthority('SCOPE_orders:read')")
    public ResponseEntity<OrderResponse> getOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal Jwt jwt) {
        
        // Get the user ID from JWT token
        String userId = jwt.getClaimAsString("sub");
        
        // Service layer checks if user owns this order
        OrderDto orderDto = orderService.getOrder(orderId, userId);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity.ok(response);
    }
    
    // Only allow users with write permission
    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_orders:write')")
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        
        // Get user ID from JWT and set on order
        String userId = jwt.getClaimAsString("sub");
        OrderCreationDto dto = orderMapper.toCreationDto(request);
        dto.setUserId(userId);
        
        // Create order in service
        OrderDto orderDto = orderService.createOrder(dto);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response);
    }
}
```

## Patterns to Follow

Use these proven approaches in your controllers:

| Pattern | What to Do |
|---------|-----------|
| **Call services** | Let services do the work, not controllers |
| **Use right status codes** | Return 201 for create, 404 for not found |
| **Validate input** | Use `@Valid` on request parameters |
| **Use mappers** | Convert between DTOs and domain objects |
| **Consistent responses** | Use the same response format everywhere |

## Anti-patterns to Avoid

Don't do these things in controllers:

| What NOT to Do | Problem | Solution |
|---|---|---|
| **Business logic in controller** | Controllers become hard to test | Move logic to service classes |
| **Wrong status codes** | Clients get confused | Use 201 for create, 200 for success |
| **No validation** | Bad data enters the system | Add `@Valid` annotation |
| **Return domain objects** | Exposes internal structure | Convert to response DTOs |
| **Custom error formats** | Clients can't understand errors | Use global error handling |

## Handle API Versions

Support different API versions in your endpoints:

```java
// V1 controller supports both paths for compatibility
@RestController
@RequestMapping({"/v1/orders", "/orders"})
public class OrderControllerV1 {
    // V1 implementation
}

// V2 controller with breaking changes
@RestController
@RequestMapping("/v2/orders")
public class OrderControllerV2 {
    // V2 implementation
}
```

## Use Global Error Handling

Don't catch exceptions in controllers. Let a global handler manage errors.

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderApplicationService orderService;
    private final OrderMapper orderMapper;
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        
        // No try-catch here
        // GlobalExceptionHandler catches all errors
        OrderCreationDto creationDto = orderMapper.toCreationDto(request);
        OrderDto orderDto = orderService.createOrder(creationDto);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response);
    }
}
```

## Summary

Good controllers are simple and consistent. They receive requests, call services, and return responses. Keep them thin. Let services handle the complex work. Use standard response formats and error handlers for all endpoints.