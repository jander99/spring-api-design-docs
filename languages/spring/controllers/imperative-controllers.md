# Imperative Controllers (Spring MVC)

## Overview

Spring MVC controllers use a traditional blocking I/O model. This approach works well for most web applications. It prioritizes simplicity and direct request-response patterns. This document shows how to build imperative controllers.

## Basic Controller Structure

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
        
        // Map API DTO to application DTO
        OrderCreationDto creationDto = orderMapper.toCreationDto(request);
        
        // Call application service
        OrderDto orderDto = orderService.createOrder(creationDto);
        
        // Map to response DTO
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        // Return with correct status code
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response);
    }
    
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(
            @PathVariable UUID orderId) {
        
        OrderDto orderDto = orderService.getOrder(orderId);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping
    public ResponseEntity<PageResponse<OrderResponse>> getOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<OrderDto> orderPage = orderService.getOrders(pageRequest, status);
        
        PageResponse<OrderResponse> response = orderMapper.toPageResponse(orderPage);
        
        return ResponseEntity.ok(response);
    }
    
    @PutMapping("/{orderId}")
    public ResponseEntity<OrderResponse> updateOrder(
            @PathVariable UUID orderId,
            @Valid @RequestBody UpdateOrderRequest request) {
        
        OrderUpdateDto updateDto = orderMapper.toUpdateDto(request);
        OrderDto orderDto = orderService.updateOrder(orderId, updateDto);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{orderId}")
    public ResponseEntity<Void> deleteOrder(@PathVariable UUID orderId) {
        orderService.deleteOrder(orderId);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(@PathVariable UUID orderId) {
        OrderDto orderDto = orderService.cancelOrder(orderId);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity.ok(response);
    }
}
```

## Standard Response Pattern with ApiResponse

Use the ApiResponse wrapper for collection endpoints. Also use it for complex operations:

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderApplicationService orderService;
    private final OrderMapper orderMapper;
    private final RequestIdProvider requestIdProvider;
    
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Page<OrderDto> orderPage = orderService.getOrders(PageRequest.of(page, size));
        List<OrderResponse> orders = orderPage.getContent().stream()
            .map(orderMapper::toResponse)
            .collect(Collectors.toList());
        
        ApiResponse.Meta.Pagination pagination = ApiResponse.Meta.Pagination.builder()
            .page(orderPage.getNumber())
            .size(orderPage.getSize())
            .totalElements(orderPage.getTotalElements())
            .totalPages(orderPage.getTotalPages())
            .build();
        
        ApiResponse.Meta meta = ApiResponse.Meta.builder()
            .timestamp(OffsetDateTime.now())
            .requestId(requestIdProvider.getRequestId())
            .pagination(pagination)
            .build();
        
        ApiResponse<List<OrderResponse>> response = ApiResponse.<List<OrderResponse>>builder()
            .data(orders)
            .meta(meta)
            .build();
        
        return ResponseEntity.ok(response);
    }
}
```

## File Upload Handling

Here's how to handle file uploads in imperative controllers:

```java
@PostMapping("/upload")
public ResponseEntity<FileUploadResponse> uploadFile(
        @RequestParam("file") MultipartFile file) {
    
    String fileId = fileUploadService.storeFile(file);
    
    FileUploadResponse response = FileUploadResponse.builder()
        .fileId(fileId)
        .fileName(file.getOriginalFilename())
        .size(file.getSize())
        .contentType(file.getContentType())
        .build();
    
    return ResponseEntity
        .status(HttpStatus.CREATED)
        .body(response);
}
```

## Bulk Operations

Here's how to handle bulk operations in imperative controllers:

```java
@Data
@Builder
public class BulkOperationResponse {
    private int successCount;
    private int failureCount;
    private List<FailureDetail> failures;
    
    @Data
    @Builder
    public static class FailureDetail {
        private int index;
        private String error;
        private CreateOrderRequest request;
    }
}

@PostMapping("/bulk")
public ResponseEntity<BulkOperationResponse> bulkCreateOrders(
        @Valid @RequestBody BulkOrderCreationRequest request) {
    
    BulkOperationResult result = orderService.bulkCreateOrders(request.getOrders());
    
    BulkOperationResponse response = BulkOperationResponse.builder()
        .successCount(result.getSuccessCount())
        .failureCount(result.getFailureCount())
        .failures(result.getFailures().stream()
            .map(failure -> BulkOperationResponse.FailureDetail.builder()
                .index(failure.getIndex())
                .error(failure.getError())
                .request(failure.getRequest())
                .build())
            .collect(Collectors.toList()))
        .build();
    
    return ResponseEntity.status(HttpStatus.MULTI_STATUS).body(response);
}
```

## Security in Imperative Controllers

Here's how to add security with JWT token handling:

```java
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

## Imperative Controller Best Practices

### 1. Use ResponseEntity for Full Control

Use `ResponseEntity` to control HTTP status codes and headers:

```java
@GetMapping("/{orderId}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
    OrderDto orderDto = orderService.getOrder(orderId);
    OrderResponse response = orderMapper.toResponse(orderDto);
    
    return ResponseEntity.ok()
        .header("Cache-Control", "max-age=300")
        .body(response);
}
```

### 2. Handle Optional Results Properly

When operations might not find a result, use Optional:

```java
@GetMapping("/{orderId}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
    Optional<OrderDto> orderDto = orderService.findOrder(orderId);
    
    return orderDto
        .map(orderMapper::toResponse)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
}
```

### 3. Use Proper Validation

Use Jakarta Bean Validation to check requests:

```java
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            BindingResult bindingResult) {
        
        // The @Valid annotation automatically checks the request.
        // A global exception handler catches validation errors.
        
        OrderCreationDto creationDto = orderMapper.toCreationDto(request);
        OrderDto orderDto = orderService.createOrder(creationDto);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response);
    }
```

### 4. Use Appropriate Status Codes

Follow HTTP semantics for status codes:

```java
@PostMapping
public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
    // Create operations return 201 Created
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}

@PutMapping("/{orderId}")
public ResponseEntity<OrderResponse> updateOrder(@PathVariable UUID orderId, @Valid @RequestBody UpdateOrderRequest request) {
    // Update operations return 200 OK
    return ResponseEntity.ok(response);
}

@DeleteMapping("/{orderId}")
public ResponseEntity<Void> deleteOrder(@PathVariable UUID orderId) {
    orderService.deleteOrder(orderId);
    // Delete operations return 204 No Content
    return ResponseEntity.noContent().build();
}

@PostMapping("/{orderId}/cancel")
public ResponseEntity<OrderResponse> cancelOrder(@PathVariable UUID orderId) {
    // Action operations return 200 OK
    return ResponseEntity.ok(response);
}
```

### 5. Exception Handling Strategy

Use global exception handlers instead of try-catch blocks in controllers:

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
        
        // Don't catch exceptions here.
        // Let GlobalExceptionHandler catch them instead.
        OrderCreationDto creationDto = orderMapper.toCreationDto(request);
        OrderDto orderDto = orderService.createOrder(creationDto);
        OrderResponse response = orderMapper.toResponse(orderDto);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response);
    }
}
```

These patterns help you build solid REST APIs with Spring MVC's blocking I/O model. The code is easy to maintain and understand.

## Related Documentation

- [Schema Validation](../validation/schema-validation.md) - Complete validation patterns
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) - Error handling for Spring MVC
- [Request Response Mapping](./request-response-mapping.md) - DTO mapping patterns
- [Controller Testing](../testing/unit-testing/controller-unit-testing.md) - Testing strategies