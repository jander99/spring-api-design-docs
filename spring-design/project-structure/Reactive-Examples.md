# Reactive Examples (WebFlux)

This document provides concrete examples of implementing the [package organization structure](./Package-Organization.md) using Spring WebFlux with non-blocking I/O operations.

## Domain Layer Examples

### Reactive Repository Interface (Port)

For **Reactive** services (WebFlux), return reactive types in repository and service interfaces:

```java
package com.example.orderservice.domain.repository;

import com.example.orderservice.domain.model.Order;
import reactor.core.publisher.Mono;
import java.util.UUID;

// Reactive port that will be implemented in the infrastructure layer
public interface OrderRepository {
    Mono<Order> findById(UUID id);
    Mono<Order> save(Order order);
    Mono<Void> deleteById(UUID id);
}
```

### Domain Service with Reactive Operations

```java
package com.example.orderservice.domain.service;

import com.example.orderservice.domain.model.OrderItem;
import reactor.core.publisher.Mono;
import java.util.Set;

public interface InventoryService {
    Mono<Void> validateInventory(Set<OrderItem> items);
    Mono<Boolean> isInventoryAvailable(UUID productId, Integer quantity);
}
```

## Application Layer Examples

### Reactive Application Service

```java
package com.example.orderservice.application.service;

import com.example.orderservice.application.dto.OrderCreationRequest;
import com.example.orderservice.application.dto.OrderResponse;
import com.example.orderservice.application.mapper.OrderMapper;
import com.example.orderservice.domain.event.OrderCreatedEvent;
import com.example.orderservice.domain.model.Order;
import com.example.orderservice.domain.model.OrderItem;
import com.example.orderservice.domain.repository.OrderRepository;
import com.example.orderservice.domain.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderApplicationService {
    private final OrderRepository orderRepository;
    private final InventoryService inventoryService;
    private final OrderMapper orderMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public Mono<OrderResponse> createOrder(OrderCreationRequest request) {
        // Convert request to domain objects
        Set<OrderItem> orderItems = request.getItems().stream()
            .map(item -> new OrderItem(
                item.getProductId(),
                item.getQuantity(),
                item.getUnitPrice()))
            .collect(Collectors.toSet());

        return inventoryService.validateInventory(orderItems)
            .then(Mono.fromSupplier(() -> Order.create(request.getCustomerId(), orderItems)))
            .flatMap(orderRepository::save)
            .doOnNext(savedOrder -> eventPublisher.publishEvent(new OrderCreatedEvent(savedOrder)))
            .map(orderMapper::toResponse);
    }

    public Mono<OrderResponse> getOrder(UUID orderId) {
        return orderRepository.findById(orderId)
            .map(orderMapper::toResponse)
            .switchIfEmpty(Mono.error(new OrderNotFoundException(orderId)));
    }

    @Transactional
    public Mono<OrderResponse> processOrder(UUID orderId) {
        return orderRepository.findById(orderId)
            .switchIfEmpty(Mono.error(new OrderNotFoundException(orderId)))
            .doOnNext(Order::process)
            .flatMap(orderRepository::save)
            .map(orderMapper::toResponse);
    }
}
```

## Infrastructure Layer Examples

### Reactive Repository Implementation

```java
package com.example.orderservice.infrastructure.persistence.repository;

import com.example.orderservice.domain.model.Order;
import com.example.orderservice.domain.repository.OrderRepository;
import com.example.orderservice.infrastructure.persistence.entity.OrderEntity;
import com.example.orderservice.infrastructure.persistence.mapper.OrderEntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class OrderRepositoryImpl implements OrderRepository {
    private final R2dbcOrderRepository r2dbcOrderRepository;
    private final OrderEntityMapper mapper;

    @Override
    public Mono<Order> findById(UUID id) {
        return r2dbcOrderRepository.findById(id)
            .map(mapper::toDomain);
    }

    @Override
    public Mono<Order> save(Order order) {
        return Mono.fromSupplier(() -> mapper.toEntity(order))
            .flatMap(r2dbcOrderRepository::save)
            .map(mapper::toDomain);
    }

    @Override
    public Mono<Void> deleteById(UUID id) {
        return r2dbcOrderRepository.deleteById(id);
    }
}
```

### R2DBC Repository

```java
package com.example.orderservice.infrastructure.persistence.repository;

import com.example.orderservice.infrastructure.persistence.entity.OrderEntity;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface R2dbcOrderRepository extends R2dbcRepository<OrderEntity, UUID> {
    Flux<OrderEntity> findByCustomerId(UUID customerId);
    Mono<Boolean> existsByIdAndStatus(UUID id, String status);
}
```

### Reactive External Service Client

```java
package com.example.orderservice.infrastructure.client;

import com.example.orderservice.domain.service.InventoryService;
import com.example.orderservice.domain.model.OrderItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class InventoryServiceClient implements InventoryService {
    private final WebClient webClient;

    @Override
    public Mono<Void> validateInventory(Set<OrderItem> items) {
        return Flux.fromIterable(items)
            .flatMap(item -> isInventoryAvailable(item.getProductId(), item.getQuantity()))
            .all(available -> available)
            .flatMap(allAvailable -> {
                if (!allAvailable) {
                    return Mono.error(new InsufficientInventoryException());
                }
                return Mono.empty();
            });
    }

    @Override
    public Mono<Boolean> isInventoryAvailable(UUID productId, Integer quantity) {
        return webClient.get()
            .uri("/inventory/{productId}/available?quantity={quantity}", productId, quantity)
            .retrieve()
            .bodyToMono(Boolean.class)
            .onErrorReturn(false);
    }
}
```

## Interface Layer Examples

### Reactive REST Controller

```java
package com.example.orderservice.interfaces.rest.controller;

import com.example.orderservice.application.dto.OrderCreationRequest;
import com.example.orderservice.application.dto.OrderResponse;
import com.example.orderservice.application.service.OrderApplicationService;
import com.example.orderservice.interfaces.rest.mapper.OrderApiMapper;
import com.example.orderservice.interfaces.rest.request.OrderCreationRequestDto;
import com.example.orderservice.interfaces.rest.response.OrderResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import javax.validation.Valid;
import java.util.UUID;

@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderApplicationService orderService;
    private final OrderApiMapper orderApiMapper;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<OrderResponseDto> createOrder(
            @Valid @RequestBody OrderCreationRequestDto requestDto) {
        
        return Mono.fromSupplier(() -> orderApiMapper.toApplicationRequest(requestDto))
            .flatMap(orderService::createOrder)
            .map(orderApiMapper::toApiResponse);
    }

    @GetMapping("/{orderId}")
    public Mono<OrderResponseDto> getOrder(@PathVariable UUID orderId) {
        return orderService.getOrder(orderId)
            .map(orderApiMapper::toApiResponse);
    }

    @PutMapping("/{orderId}/process")
    public Mono<OrderResponseDto> processOrder(@PathVariable UUID orderId) {
        return orderService.processOrder(orderId)
            .map(orderApiMapper::toApiResponse);
    }

    @GetMapping("/customer/{customerId}")
    public Flux<OrderResponseDto> getCustomerOrders(@PathVariable UUID customerId) {
        return orderService.getOrdersByCustomerId(customerId)
            .map(orderApiMapper::toApiResponse);
    }
}
```

### Reactive Functional Router

```java
package com.example.orderservice.interfaces.rest.router;

import com.example.orderservice.interfaces.rest.handler.OrderHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerResponse;

import static org.springframework.web.reactive.function.server.RequestPredicates.*;
import static org.springframework.web.reactive.function.server.RouterFunctions.route;

@Configuration
public class OrderRouter {

    @Bean
    public RouterFunction<ServerResponse> orderRoutes(OrderHandler orderHandler) {
        return route()
            .nest(path("/v1/orders"), builder -> builder
                .POST("", orderHandler::createOrder)
                .GET("/{orderId}", orderHandler::getOrder)
                .PUT("/{orderId}/process", orderHandler::processOrder)
                .GET("/customer/{customerId}", orderHandler::getCustomerOrders)
            )
            .build();
    }
}
```

### Reactive Handler

```java
package com.example.orderservice.interfaces.rest.handler;

import com.example.orderservice.application.service.OrderApplicationService;
import com.example.orderservice.interfaces.rest.mapper.OrderApiMapper;
import com.example.orderservice.interfaces.rest.request.OrderCreationRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OrderHandler {
    private final OrderApplicationService orderService;
    private final OrderApiMapper orderApiMapper;

    public Mono<ServerResponse> createOrder(ServerRequest request) {
        return request.bodyToMono(OrderCreationRequestDto.class)
            .map(orderApiMapper::toApplicationRequest)
            .flatMap(orderService::createOrder)
            .map(orderApiMapper::toApiResponse)
            .flatMap(response -> ServerResponse
                .status(201)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(response));
    }

    public Mono<ServerResponse> getOrder(ServerRequest request) {
        UUID orderId = UUID.fromString(request.pathVariable("orderId"));
        return orderService.getOrder(orderId)
            .map(orderApiMapper::toApiResponse)
            .flatMap(response -> ServerResponse
                .ok()
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(response));
    }
}
```

## Configuration Examples

### WebFlux Configuration

```java
package com.example.orderservice.config.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.config.EnableWebFlux;
import org.springframework.web.reactive.config.WebFluxConfigurer;

@Configuration
@EnableWebFlux
public class WebFluxConfig implements WebFluxConfigurer {
    // WebFlux configuration
}
```

### R2DBC Configuration

```java
package com.example.orderservice.config.database;

import io.r2dbc.spi.ConnectionFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.r2dbc.config.AbstractR2dbcConfiguration;
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories;

@Configuration
@EnableR2dbcRepositories
public class R2dbcConfig extends AbstractR2dbcConfiguration {
    
    @Override
    public ConnectionFactory connectionFactory() {
        // R2DBC connection factory configuration
        return null; // Implementation specific
    }
}
```

## Key Characteristics of Reactive Implementation

1. **Non-blocking Operations**: Methods return `Mono<T>`, `Flux<T>` for reactive streams
2. **Asynchronous Processing**: Operations are composed in reactive chains
3. **WebFlux Framework**: Uses reactive annotations and functional routing
4. **R2DBC Integration**: Reactive database access instead of JPA
5. **Backpressure Handling**: Built-in support for reactive streams backpressure
6. **Error Handling**: Uses reactive operators like `onErrorReturn`, `onErrorResume`

## Performance Considerations

1. **Memory Efficiency**: Lower memory footprint due to non-blocking operations
2. **Scalability**: Better handling of concurrent requests
3. **Resource Utilization**: More efficient use of threads
4. **Latency**: Reduced latency for I/O bound operations

## See Also

- [Package Organization](./Package-Organization.md) - Core structure principles
- [Imperative Examples](./Imperative-Examples.md) - Spring MVC implementation examples
- [Testing Structure](./Testing-Structure.md) - Test organization patterns