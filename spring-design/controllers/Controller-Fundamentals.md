# Controller Fundamentals

## Overview

Controllers act as the entry point for API requests, translating between HTTP and the application's domain. This document outlines the fundamental principles and patterns for implementing controllers in Spring Boot applications.

## Controller Design Principles

1. **Thin Controllers**: Controllers should delegate business logic to application services
2. **Clean Mapping**: Map between API DTOs and application/domain models
3. **Proper Response Codes**: Use appropriate HTTP status codes
4. **Consistent Error Handling**: Handle exceptions uniformly
5. **API Contract Adherence**: Implement controllers according to OpenAPI specifications

## Controller Structure

### Package Organization

Organize controllers in the interfaces layer:

```
com.example.orderservice.interfaces.rest
├── controller           # Controller classes
├── request              # Request DTOs
├── response             # Response DTOs
├── mapper               # Mappers between application DTOs and API DTOs
└── advice               # Controller advice for exception handling
```

### Naming Conventions

Follow these naming conventions:

| Component | Naming Pattern | Example |
|-----------|----------------|---------|
| Controller | `{Resource}Controller` | `OrderController` |
| Request DTO | `{Action}{Resource}Request` | `CreateOrderRequest` |
| Response DTO | `{Resource}Response` | `OrderResponse` |
| Mapper | `{Resource}Mapper` | `OrderMapper` |

## Response Structure Standards

Ensure all API responses follow the standard structure defined in the API design guide:

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
        private Pagination pagination; // For collection responses
        
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

### Response Wrapper Usage Guidelines

Follow these rules for consistent response structures:

#### Use ApiResponse Wrapper For:
- **Collection endpoints**: `/v1/orders` (always include pagination)
- **Complex operations**: Bulk operations, search results
- **Metadata-rich responses**: When timestamp, requestId, or other metadata is needed

```java
// Collection endpoint
@GetMapping
public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrders(...) {
    // Returns wrapped response with pagination
}

// Search endpoint
@GetMapping("/search")
public ResponseEntity<ApiResponse<List<OrderResponse>>> searchOrders(...) {
    // Returns wrapped response with search metadata
}
```

#### Use Direct Responses For:
- **Single resource operations**: `/v1/orders/{id}`, POST create operations
- **Simple operations**: Individual resource CRUD operations
- **Delete operations**: 204 No Content responses

```java
// Single resource endpoint
@GetMapping("/{orderId}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
    // Returns direct response without wrapper
}

// Create operation
@PostMapping
public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
    // Returns direct response without wrapper
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}

// Delete operation
@DeleteMapping("/{orderId}")
public ResponseEntity<Void> deleteOrder(@PathVariable UUID orderId) {
    // No content, no wrapper needed
    return ResponseEntity.noContent().build();
}
```

## OpenAPI Documentation

Add OpenAPI documentation to controllers:

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Order management endpoints")
public class OrderController {

    @Operation(
        summary = "Create a new order",
        description = "Creates a new order with the specified items and shipping address"
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
        // Implementation
    }
    
    // Other methods with similar documentation
}
```

## Security Implementation

Implement security at the controller level:

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
    
    @GetMapping("/{orderId}")
    @PreAuthorize("hasAuthority('SCOPE_orders:read')")
    public ResponseEntity<OrderResponse> getOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal Jwt jwt) {
        
        // Extract user ID from JWT
        String userId = jwt.getClaimAsString("sub");
        
        // Service layer handles authorization check
        OrderDto orderDto = orderService.getOrder(orderId, userId);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_orders:write')")
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        
        String userId = jwt.getClaimAsString("sub");
        OrderCreationDto dto = orderMapper.toCreationDto(request);
        dto.setUserId(userId); // Set authenticated user
        
        OrderDto orderDto = orderService.createOrder(dto);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response);
    }
}
```

## Common Patterns and Anti-patterns

### Patterns to Follow

| Pattern | Example | Description |
|---------|---------|-------------|
| Delegation to services | Controller calls service | Keep controllers thin |
| Proper status codes | 201 for creation | Use appropriate HTTP status codes |
| Request validation | `@Valid` annotation | Validate requests early |
| Clear mapping | Use mapper classes | Separate mapping concern from controller logic |
| Consistent response structure | `ApiResponse<T>` | Follow common response format |

### Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Business logic in controllers | Complex processing in controller methods | Move to application services |
| Inconsistent status codes | Using 200 for creation | Use proper HTTP status codes (201 for creation) |
| Anemic controllers | Controllers with one-line methods only | Balance with proper validation and mapping |
| Direct domain model exposure | Returning domain objects | Map to response DTOs |
| Custom error response formats | Ad-hoc error structures | Use global error handling |

## Special Considerations

### Versioning Implementation

Implement versioning as per our API Versioning Strategy:

```java
@RestController
@RequestMapping({"/v1/orders", "/orders"}) // Support both versioned and legacy paths
public class OrderControllerV1 {
    // Implementation
}

@RestController
@RequestMapping("/v2/orders")
public class OrderControllerV2 {
    // Implementation with breaking changes
}
```

### Global Error Handling Integration

Controllers should rely on global exception handlers for consistent error responses:

```java
// No try-catch blocks in controllers
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderApplicationService orderService;
    private final OrderMapper orderMapper;
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        
        // Exceptions are handled by GlobalExceptionHandler
        OrderCreationDto creationDto = orderMapper.toCreationDto(request);
        OrderDto orderDto = orderService.createOrder(creationDto);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response);
    }
}
```

These controller fundamentals ensure that our API endpoints are consistent, maintainable, and aligned with our overall API design principles across both reactive and imperative microservices.