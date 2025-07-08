# Reactive Controllers (WebFlux)

## Overview

Spring WebFlux controllers use reactive programming with non-blocking I/O, making them ideal for high-throughput applications and scenarios requiring efficient resource utilization. This document covers implementation patterns for reactive controllers using Mono and Flux.

## Basic Reactive Controller Structure

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

## Reactive Service Interface Example

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

## Reactive Validation

For reactive applications, validation works with reactive types:

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

## Streaming Responses

For streaming data in reactive applications:

```java
@GetMapping(value = "/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<OrderResponse> streamOrders() {
    return orderService.streamOrders()
        .map(orderMapper::toResponse);
}

@GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<OrderResponse>> streamOrderEvents() {
    return orderService.streamOrderEvents()
        .map(orderMapper::toResponse)
        .map(order -> ServerSentEvent.builder(order)
            .id(order.getId().toString())
            .event("order-update")
            .build());
}
```

## File Upload Handling

For handling file uploads in reactive applications:

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

## Security in Reactive Controllers

Implement security in reactive controllers:

```java
@GetMapping("/{orderId}")
public Mono<ResponseEntity<OrderResponse>> getOrder(@PathVariable UUID orderId) {
    return securityService.checkOrderAccess(orderId)
        .then(orderService.getOrder(orderId))
        .map(orderMapper::toResponse)
        .map(ResponseEntity::ok)
        .defaultIfEmpty(ResponseEntity.notFound().build());
}

@PostMapping
public Mono<ResponseEntity<OrderResponse>> createOrder(
        @Valid @RequestBody CreateOrderRequest request) {
    
    return ReactiveSecurityContextHolder.getContext()
        .map(SecurityContext::getAuthentication)
        .cast(JwtAuthenticationToken.class)
        .map(auth -> auth.getToken().getClaimAsString("sub"))
        .flatMap(userId -> {
            OrderCreationDto dto = orderMapper.toCreationDto(request);
            dto.setUserId(userId);
            return orderService.createOrder(dto);
        })
        .map(orderMapper::toResponse)
        .map(response -> ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response));
}
```

## Reactive Controller Best Practices

### 1. Use Proper Reactive Operators

Choose the right operators for your use case:

```java
// Use map() for synchronous transformations
.map(orderMapper::toResponse)

// Use flatMap() for asynchronous operations
.flatMap(orderService::createOrder)

// Use switchMap() for cancellable operations
.switchMap(orderService::searchOrders)

// Use concatMap() to preserve order
.concatMap(orderService::processOrder)

// Use mergeWith() to combine streams
orders.mergeWith(archivedOrders)
```

### 2. Handle Empty Results Gracefully

```java
@GetMapping("/{orderId}")
public Mono<ResponseEntity<OrderResponse>> getOrder(@PathVariable UUID orderId) {
    return orderService.getOrder(orderId)
        .map(orderMapper::toResponse)
        .map(ResponseEntity::ok)
        .defaultIfEmpty(ResponseEntity.notFound().build())
        .onErrorReturn(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build());
}
```

### 3. Use Flux for Collections and Streams

```java
@GetMapping("/all")
public Flux<OrderResponse> getAllOrders() {
    return orderService.findAllOrders()
        .map(orderMapper::toResponse)
        .onBackpressureBuffer(1000) // Handle backpressure
        .doOnError(error -> log.error("Error streaming orders", error));
}
```

### 4. Implement Timeout and Error Handling

```java
@GetMapping("/{orderId}")
public Mono<ResponseEntity<OrderResponse>> getOrder(@PathVariable UUID orderId) {
    return orderService.getOrder(orderId)
        .timeout(Duration.ofSeconds(30))
        .map(orderMapper::toResponse)
        .map(ResponseEntity::ok)
        .defaultIfEmpty(ResponseEntity.notFound().build())
        .onErrorResume(TimeoutException.class, e -> 
            Mono.just(ResponseEntity.status(HttpStatus.REQUEST_TIMEOUT).build()))
        .onErrorResume(Exception.class, e -> 
            Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()));
}
```

### 5. Use Reactive Context for Request Tracing

```java
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
        .contextWrite(Context.of("requestId", UUID.randomUUID().toString()));
}
```

## Exception Handling Strategy

Rely on global exception handlers for reactive controllers:

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
                .body(response))
            // No error handling here - GlobalErrorWebExceptionHandler handles it
            .onErrorResume(ResourceNotFoundException.class, Mono::error);
    }
}
```

## Advanced Reactive Patterns

### Parallel Processing

```java
@GetMapping("/parallel-processing")
public Mono<ResponseEntity<ProcessingResult>> processOrdersInParallel() {
    return Flux.range(1, 10)
        .parallel(4) // Use 4 parallel rails
        .runOn(Schedulers.parallel())
        .flatMap(orderService::processOrder)
        .sequential()
        .collectList()
        .map(results -> ProcessingResult.builder()
            .processedCount(results.size())
            .results(results)
            .build())
        .map(ResponseEntity::ok);
}
```

### Request Deduplication

```java
private final Map<String, Mono<OrderResponse>> cache = new ConcurrentHashMap<>();

@PostMapping("/deduplicated")
public Mono<ResponseEntity<OrderResponse>> createOrderDeduplicated(
        @Valid @RequestBody CreateOrderRequest request,
        @RequestHeader("Idempotency-Key") String idempotencyKey) {
    
    return cache.computeIfAbsent(idempotencyKey, key ->
        Mono.just(request)
            .map(orderMapper::toCreationDto)
            .flatMap(orderService::createOrder)
            .map(orderMapper::toResponse)
            .cache()) // Cache the result
        .map(response -> ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response));
}
```

These reactive controller patterns provide efficient, non-blocking implementations for high-throughput applications using Spring WebFlux.