# Controller Implementation (Reactive and Imperative)

## Overview

Controllers act as the entry point for API requests, translating between HTTP and the application's domain. This document outlines our standards for implementing controllers in both reactive (WebFlux) and imperative (Spring MVC) applications, ensuring they adhere to our API design principles.

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

## Imperative Controllers (Spring MVC)

### Basic Controller Structure

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

### Request DTO Example

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class CreateOrderRequest {
    
    @NotNull(message = "Customer ID is required")
    private UUID customerId;
    
    @NotEmpty(message = "At least one item is required")
    private List<OrderItemRequest> items;
    
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
        @Pattern(regexp = "^\\d{5}(-\\d{4})?$", message = "Invalid zip code format")
        private String zipCode;
    }
}
```

### Response DTO Example

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

### Page Response DTO

```java
@Data
@Builder
public class PageResponse<T> {
    private List<T> data;
    private PageMetadata metadata;
    
    @Data
    @Builder
    public static class PageMetadata {
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
    }
    
    public static <T, U> PageResponse<U> from(Page<T> page, Function<T, U> mapper) {
        List<U> mappedContent = page.getContent().stream()
            .map(mapper)
            .collect(Collectors.toList());
            
        return PageResponse.<U>builder()
            .data(mappedContent)
            .metadata(PageMetadata.builder()
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build())
            .build();
    }
}
```

### Mapper Example

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
    
    public OrderItemDto toOrderItemDto(CreateOrderRequest.OrderItemRequest request) {
        return OrderItemDto.builder()
            .productId(request.getProductId())
            .quantity(request.getQuantity())
            .build();
    }
    
    public AddressDto toAddressDto(CreateOrderRequest.AddressRequest request) {
        return AddressDto.builder()
            .street(request.getStreet())
            .city(request.getCity())
            .zipCode(request.getZipCode())
            .build();
    }
    
    public OrderResponse toResponse(OrderDto orderDto) {
        return OrderResponse.builder()
            .id(orderDto.getId())
            .customerId(orderDto.getCustomerId())
            .status(orderDto.getStatus().name())
            .totalAmount(orderDto.getTotalAmount())
            .items(orderDto.getItems().stream()
                .map(this::toOrderItemResponse)
                .collect(Collectors.toList()))
            .shippingAddress(toAddressResponse(orderDto.getShippingAddress()))
            .createdDate(orderDto.getCreatedDate())
            .lastModifiedDate(orderDto.getLastModifiedDate())
            .build();
    }
    
    public OrderResponse.OrderItemResponse toOrderItemResponse(OrderItemDto itemDto) {
        return OrderResponse.OrderItemResponse.builder()
            .productId(itemDto.getProductId())
            .productName(itemDto.getProductName())
            .quantity(itemDto.getQuantity())
            .unitPrice(itemDto.getUnitPrice())
            .subtotal(itemDto.getSubtotal())
            .build();
    }
    
    public OrderResponse.AddressResponse toAddressResponse(AddressDto addressDto) {
        return OrderResponse.AddressResponse.builder()
            .street(addressDto.getStreet())
            .city(addressDto.getCity())
            .zipCode(addressDto.getZipCode())
            .build();
    }
    
    public PageResponse<OrderResponse> toPageResponse(Page<OrderDto> orderPage) {
        return PageResponse.from(orderPage, this::toResponse);
    }
}
```

## Reactive Controllers (WebFlux)

### Basic Reactive Controller Structure

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class ReactiveOrderController {

    private final ReactiveOrderApplicationService orderService;
    private final OrderMapper orderMapper;
    
    @PostMapping
    public Mono<ResponseEntity<OrderResponse>> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        
        return Mono.just(request)
            .map(orderMapper::toCreationDto)
            .flatMap(orderService::createOrder)
            .map(orderMapper::toResponse)
            .map(response -> ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response));
    }
    
    @GetMapping("/{orderId}")
    public Mono<ResponseEntity<OrderResponse>> getOrder(
            @PathVariable UUID orderId) {
        
        return orderService.getOrder(orderId)
            .map(orderMapper::toResponse)
            .map(ResponseEntity::ok)
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }
    
    @GetMapping
    public Mono<ResponseEntity<PageResponse<OrderResponse>>> getOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        
        return orderService.getOrders(page, size, status)
            .map(orderDtoPage -> orderMapper.toPageResponse(orderDtoPage))
            .map(ResponseEntity::ok);
    }
    
    @GetMapping("/stream")
    @ResponseStatus(HttpStatus.OK)
    public Flux<OrderResponse> streamOrders(
            @RequestParam(required = false) String status) {
        
        return orderService.streamOrders(status)
            .map(orderMapper::toResponse);
    }
    
    @PutMapping("/{orderId}")
    public Mono<ResponseEntity<OrderResponse>> updateOrder(
            @PathVariable UUID orderId,
            @Valid @RequestBody UpdateOrderRequest request) {
        
        return Mono.just(request)
            .map(orderMapper::toUpdateDto)
            .flatMap(updateDto -> orderService.updateOrder(orderId, updateDto))
            .map(orderMapper::toResponse)
            .map(ResponseEntity::ok)
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{orderId}")
    public Mono<ResponseEntity<Void>> deleteOrder(@PathVariable UUID orderId) {
        return orderService.deleteOrder(orderId)
            .thenReturn(ResponseEntity.noContent().<Void>build());
    }
    
    @PostMapping("/{orderId}/cancel")
    public Mono<ResponseEntity<OrderResponse>> cancelOrder(@PathVariable UUID orderId) {
        return orderService.cancelOrder(orderId)
            .map(orderMapper::toResponse)
            .map(ResponseEntity::ok)
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
```

### Reactive Service Interface Example

```java
public interface ReactiveOrderApplicationService {
    Mono<OrderDto> createOrder(OrderCreationDto creationDto);
    Mono<OrderDto> getOrder(UUID orderId);
    Mono<Page<OrderDto>> getOrders(int page, int size, String status);
    Flux<OrderDto> streamOrders(String status);
    Mono<OrderDto> updateOrder(UUID orderId, OrderUpdateDto updateDto);
    Mono<Void> deleteOrder(UUID orderId);
    Mono<OrderDto> cancelOrder(UUID orderId);
}
```

### Reactive Validation

For reactive applications, validation works similarly but with reactive types:

```java
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;

@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
@Validated
public class ReactiveOrderController {

    // Controller methods
    
    @PostMapping
    public Mono<ResponseEntity<OrderResponse>> createOrder(
            @Valid @RequestBody Mono<CreateOrderRequest> request) {
        return request
            .flatMap(req -> {
                // Validation happens automatically
                OrderCreationDto dto = orderMapper.toCreationDto(req);
                return orderService.createOrder(dto);
            })
            .map(orderMapper::toResponse)
            .map(response -> ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response));
    }
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

In reactive applications:

```java
@GetMapping("/{orderId}")
public Mono<ResponseEntity<OrderResponse>> getOrder(@PathVariable UUID orderId) {
    return securityService.checkOrderAccess(orderId)
        .then(orderService.getOrder(orderId))
        .map(orderMapper::toResponse)
        .map(ResponseEntity::ok)
        .defaultIfEmpty(ResponseEntity.notFound().build());
}
```

## Controller Testing

### Testing Imperative Controllers

```java
@WebMvcTest(OrderController.class)
@ExtendWith(MockitoExtension.class)
public class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderApplicationService orderService;
    
    @MockBean
    private OrderMapper orderMapper;
    
    @Test
    void shouldCreateOrder() throws Exception {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        // Setup request
        
        OrderCreationDto creationDto = new OrderCreationDto();
        when(orderMapper.toCreationDto(any(CreateOrderRequest.class))).thenReturn(creationDto);
        
        OrderDto orderDto = new OrderDto();
        when(orderService.createOrder(any(OrderCreationDto.class))).thenReturn(orderDto);
        
        OrderResponse response = new OrderResponse();
        when(orderMapper.toResponse(any(OrderDto.class))).thenReturn(response);
        
        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(asJsonString(request)))
            .andExpect(status().isCreated())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.id").exists());
    }
    
    private String asJsonString(Object obj) throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        return objectMapper.writeValueAsString(obj);
    }
}
```

### Testing Reactive Controllers

```java
@WebFluxTest(ReactiveOrderController.class)
public class ReactiveOrderControllerTest {

    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private ReactiveOrderApplicationService orderService;
    
    @MockBean
    private OrderMapper orderMapper;
    
    @Test
    void shouldCreateOrder() {
        // Given
        CreateOrderRequest request = new CreateOrderRequest();
        // Setup request
        
        OrderCreationDto creationDto = new OrderCreationDto();
        when(orderMapper.toCreationDto(any(CreateOrderRequest.class))).thenReturn(creationDto);
        
        OrderDto orderDto = new OrderDto();
        when(orderService.createOrder(any(OrderCreationDto.class))).thenReturn(Mono.just(orderDto));
        
        OrderResponse response = new OrderResponse();
        response.setId(UUID.randomUUID());
        when(orderMapper.toResponse(any(OrderDto.class))).thenReturn(response);
        
        // When & Then
        webTestClient.post().uri("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(OrderResponse.class)
            .value(orderResponse -> assertThat(orderResponse.getId()).isNotNull());
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

### Streaming Responses

For streaming data in reactive applications:

```java
@GetMapping(value = "/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<OrderResponse> streamOrders() {
    return orderService.streamOrders()
        .map(orderMapper::toResponse);
}
```

### File Uploads

For handling file uploads:

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

In reactive applications:

```java
@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public Mono<ResponseEntity<FileUploadResponse>> uploadFile(
        @RequestPart("file") Mono<FilePart> filePart) {
    
    return filePart
        .flatMap(part -> {
            String originalFilename = part.filename();
            return fileUploadService.storeFile(part)
                .map(fileId -> FileUploadResponse.builder()
                    .fileId(fileId)
                    .fileName(originalFilename)
                    .contentType(part.headers().getContentType() != null 
                        ? part.headers().getContentType().toString() 
                        : MediaType.APPLICATION_OCTET_STREAM_VALUE)
                    .build());
        })
        .map(response -> ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response));
}
```

### Bulk Operations

For handling bulk operations:

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

// In reactive controllers
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class ReactiveOrderController {

    private final ReactiveOrderApplicationService orderService;
    private final OrderMapper orderMapper;
    
    @PostMapping
    public Mono<ResponseEntity<OrderResponse>> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        
        return Mono.just(request)
            .map(orderMapper::toCreationDto)
            .flatMap(orderService::createOrder)
            .map(orderMapper::toResponse)
            .map(response -> ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response))
            // No error handling here - GlobalErrorWebExceptionHandler handles it
            .onErrorResume(ResourceNotFoundException.class, Mono::error);
    }
}
```

These controller implementation standards ensure that our API endpoints are consistent, maintainable, and aligned with our overall API design principles across both reactive and imperative microservices.