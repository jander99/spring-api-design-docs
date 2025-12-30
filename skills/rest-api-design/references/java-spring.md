# REST API Design: Java/Spring Implementation

## Controller Structure

### Package Organization

```
com.example.orderservice.interfaces.rest
├── controller/          # Controller classes
├── request/             # Request DTOs
├── response/            # Response DTOs
├── mapper/              # DTO mappers
└── advice/              # Exception handlers
```

### Controller Fundamentals

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Order management endpoints")
public class OrderController {

    private final OrderApplicationService orderService;
    private final OrderMapper orderMapper;

    // Endpoints here
}
```

Key annotations:
- `@RestController` - Combines `@Controller` + `@ResponseBody`
- `@RequestMapping` - Base path for all endpoints
- `@RequiredArgsConstructor` - Lombok constructor injection
- `@Tag` - OpenAPI documentation

## HTTP Method Mappings

### GET - Retrieve

```java
// Single resource
@GetMapping("/{orderId}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
    OrderDto order = orderService.getOrder(orderId);
    return ResponseEntity.ok(orderMapper.toResponse(order));
}

// Collection with pagination
@GetMapping
public ResponseEntity<PageResponse<OrderResponse>> getOrders(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String status) {
    
    Page<OrderDto> orders = orderService.findOrders(page, size, status);
    return ResponseEntity.ok(orderMapper.toPageResponse(orders));
}
```

### POST - Create

```java
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest request) {
    
    OrderDto created = orderService.createOrder(
        orderMapper.toCreationDto(request));
    
    URI location = ServletUriComponentsBuilder
        .fromCurrentRequest()
        .path("/{id}")
        .buildAndExpand(created.getId())
        .toUri();
    
    return ResponseEntity
        .created(location)  // 201 Created + Location header
        .body(orderMapper.toResponse(created));
}
```

### PUT - Replace

```java
@PutMapping("/{orderId}")
public ResponseEntity<OrderResponse> replaceOrder(
        @PathVariable UUID orderId,
        @Valid @RequestBody ReplaceOrderRequest request) {
    
    OrderDto updated = orderService.replaceOrder(
        orderId, orderMapper.toDto(request));
    
    return ResponseEntity.ok(orderMapper.toResponse(updated));
}
```

### PATCH - Partial Update

```java
@PatchMapping("/{orderId}")
public ResponseEntity<OrderResponse> updateOrder(
        @PathVariable UUID orderId,
        @Valid @RequestBody UpdateOrderRequest request) {
    
    OrderDto updated = orderService.updateOrder(
        orderId, orderMapper.toUpdateDto(request));
    
    return ResponseEntity.ok(orderMapper.toResponse(updated));
}
```

### DELETE - Remove

```java
@DeleteMapping("/{orderId}")
public ResponseEntity<Void> deleteOrder(@PathVariable UUID orderId) {
    orderService.deleteOrder(orderId);
    return ResponseEntity.noContent().build();  // 204 No Content
}
```

### Actions (Non-CRUD)

```java
@PostMapping("/{orderId}/cancel")
public ResponseEntity<OrderResponse> cancelOrder(@PathVariable UUID orderId) {
    OrderDto cancelled = orderService.cancelOrder(orderId);
    return ResponseEntity.ok(orderMapper.toResponse(cancelled));
}

@PostMapping("/{orderId}/ship")
public ResponseEntity<OrderResponse> shipOrder(
        @PathVariable UUID orderId,
        @Valid @RequestBody ShipOrderRequest request) {
    
    OrderDto shipped = orderService.shipOrder(orderId, request.getTrackingNumber());
    return ResponseEntity.ok(orderMapper.toResponse(shipped));
}
```

## Request DTOs

### Create Request

```java
@Data
public class CreateOrderRequest {
    
    @NotNull(message = "Customer ID is required")
    private UUID customerId;
    
    @NotEmpty(message = "At least one item is required")
    @Size(max = 50, message = "Maximum 50 items allowed")
    private List<@Valid OrderItemRequest> items;
    
    @Valid
    @NotNull(message = "Shipping address is required")
    private AddressRequest shippingAddress;
    
    @Data
    public static class OrderItemRequest {
        @NotNull(message = "Product ID is required")
        private UUID productId;
        
        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;
    }
    
    @Data
    public static class AddressRequest {
        @NotBlank(message = "Street is required")
        private String street;
        
        @NotBlank(message = "City is required")
        private String city;
        
        @NotBlank(message = "Zip code is required")
        @Pattern(regexp = "^\\d{5}(-\\d{4})?$", message = "Invalid zip code")
        private String zipCode;
    }
}
```

### Update Request (Partial)

```java
@Data
public class UpdateOrderRequest {
    
    @Valid
    private List<OrderItemRequest> items;  // Optional
    
    @Valid
    private AddressRequest shippingAddress;  // Optional
    
    private String notes;  // Optional
}
```

## Response DTOs

### Single Resource Response

```java
@Data
@Builder
public class OrderResponse {
    private UUID id;
    private UUID customerId;
    private String status;
    private BigDecimal totalAmount;
    private List<OrderItemResponse> items;
    private AddressResponse shippingAddress;
    private OffsetDateTime createdDate;
    private OffsetDateTime lastModifiedDate;
    
    @Data
    @Builder
    public static class OrderItemResponse {
        private UUID productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
    }
    
    @Data
    @Builder
    public static class AddressResponse {
        private String street;
        private String city;
        private String zipCode;
    }
}
```

### Page Response (Collections)

```java
@Data
@Builder
public class PageResponse<T> {
    private List<T> data;
    private PageMetadata meta;
    
    @Data
    @Builder
    public static class PageMetadata {
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
    }
    
    public static <T, U> PageResponse<U> from(
            Page<T> page, 
            Function<T, U> mapper) {
        
        List<U> mappedContent = page.getContent().stream()
            .map(mapper)
            .collect(Collectors.toList());
            
        return PageResponse.<U>builder()
            .data(mappedContent)
            .meta(PageMetadata.builder()
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build())
            .build();
    }
}
```

## Mappers

### Manual Mapper

```java
@Component
public class OrderMapper {

    public OrderCreationDto toCreationDto(CreateOrderRequest request) {
        return OrderCreationDto.builder()
            .customerId(request.getCustomerId())
            .items(request.getItems().stream()
                .map(this::toOrderItemDto)
                .collect(Collectors.toList()))
            .shippingAddress(toAddressDto(request.getShippingAddress()))
            .build();
    }
    
    public OrderResponse toResponse(OrderDto dto) {
        return OrderResponse.builder()
            .id(dto.getId())
            .customerId(dto.getCustomerId())
            .status(dto.getStatus().name())
            .totalAmount(dto.getTotalAmount())
            .items(dto.getItems().stream()
                .map(this::toOrderItemResponse)
                .collect(Collectors.toList()))
            .createdDate(dto.getCreatedDate())
            .build();
    }
    
    public PageResponse<OrderResponse> toPageResponse(Page<OrderDto> page) {
        return PageResponse.from(page, this::toResponse);
    }
    
    // Additional mapping methods...
}
```

### MapStruct Mapper

```java
@Mapper(componentModel = "spring", 
        unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface OrderMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdDate", ignore = true)
    OrderCreationDto toCreationDto(CreateOrderRequest request);
    
    @Mapping(target = "status", source = "status", qualifiedByName = "statusToString")
    OrderResponse toResponse(OrderDto dto);
    
    List<OrderResponse> toResponseList(List<OrderDto> dtos);
    
    @Named("statusToString")
    default String statusToString(OrderStatus status) {
        return status != null ? status.name() : null;
    }
    
    default PageResponse<OrderResponse> toPageResponse(Page<OrderDto> page) {
        return PageResponse.from(page, this::toResponse);
    }
}
```

## Query Parameters

### Filtering and Sorting

```java
@GetMapping
public ResponseEntity<PageResponse<OrderResponse>> getOrders(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) OrderStatus status,
        @RequestParam(required = false) 
            @DateTimeFormat(iso = ISO.DATE) LocalDate createdAfter,
        @RequestParam(defaultValue = "createdDate,desc") String sort) {
    
    Pageable pageable = PageRequest.of(page, size, parseSort(sort));
    OrderFilter filter = OrderFilter.builder()
        .status(status)
        .createdAfter(createdAfter)
        .build();
    
    Page<OrderDto> orders = orderService.findOrders(filter, pageable);
    return ResponseEntity.ok(orderMapper.toPageResponse(orders));
}

private Sort parseSort(String sort) {
    String[] parts = sort.split(",");
    String field = parts[0];
    Sort.Direction direction = parts.length > 1 && "asc".equalsIgnoreCase(parts[1])
        ? Sort.Direction.ASC 
        : Sort.Direction.DESC;
    return Sort.by(direction, field);
}
```

## OpenAPI Documentation

```java
@RestController
@RequestMapping("/v1/orders")
@Tag(name = "Orders", description = "Order management endpoints")
public class OrderController {

    @Operation(
        summary = "Create a new order",
        description = "Creates a new order with the specified items"
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
            content = @Content(schema = @Schema(implementation = ProblemDetail.class))
        ),
        @ApiResponse(
            responseCode = "401", 
            description = "Not authenticated"
        )
    })
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        // Implementation
    }
}
```

## Response Wrapper Guidelines

### Use Direct Response For:
- Single resource GET: `/orders/{id}`
- POST create operations
- PUT/PATCH update operations
- DELETE operations (204 No Content)

```java
@GetMapping("/{orderId}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
    // Returns OrderResponse directly
}

@DeleteMapping("/{orderId}")
public ResponseEntity<Void> deleteOrder(@PathVariable UUID orderId) {
    // Returns 204 No Content
}
```

### Use Wrapper (PageResponse) For:
- Collection endpoints: `/orders`
- Search results
- Any response needing pagination metadata

```java
@GetMapping
public ResponseEntity<PageResponse<OrderResponse>> getOrders(...) {
    // Returns wrapped with pagination
}
```

## Security Integration

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAuthority('SCOPE_orders:read')")
    public ResponseEntity<OrderResponse> getOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal Jwt jwt) {
        
        String userId = jwt.getClaimAsString("sub");
        OrderDto order = orderService.getOrder(orderId, userId);
        return ResponseEntity.ok(orderMapper.toResponse(order));
    }
    
    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_orders:write')")
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        
        String userId = jwt.getClaimAsString("sub");
        // Use userId for ownership
    }
}
```

## Common Patterns

### Thin Controllers

Controllers delegate to services - no business logic:

```java
// Good - thin controller
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest request) {
    OrderDto created = orderService.createOrder(orderMapper.toCreationDto(request));
    return ResponseEntity.created(location).body(orderMapper.toResponse(created));
}

// Bad - business logic in controller
@PostMapping
public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
    // DON'T: Calculate totals, validate inventory, send emails here
    if (inventoryService.checkStock(request.getItems())) {
        Order order = new Order();
        order.setTotal(calculateTotal(request));
        // More business logic...
    }
}
```

### Versioning

```java
@RestController
@RequestMapping({"/v1/orders", "/orders"})  // Support both
public class OrderControllerV1 {
    // V1 implementation
}

@RestController
@RequestMapping("/v2/orders")
public class OrderControllerV2 {
    // V2 with breaking changes
}
```

### Global Exception Handling

Controllers should NOT catch exceptions - use `@ControllerAdvice`:

```java
// Good - no try/catch, exceptions bubble to handler
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest request) {
    OrderDto created = orderService.createOrder(orderMapper.toCreationDto(request));
    return ResponseEntity.created(location).body(orderMapper.toResponse(created));
}
```

See `api-error-handling` skill for exception handling patterns.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Business logic in controller | Violates SRP | Move to service layer |
| Exposing domain objects | Tight coupling | Map to response DTOs |
| Inconsistent status codes | Confusing API | Use proper HTTP codes |
| Manual try/catch | Inconsistent errors | Use `@ControllerAdvice` |
| Missing validation | Bad data in system | Add `@Valid` |
