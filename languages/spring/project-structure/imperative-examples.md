# Imperative Examples (Spring MVC)

This document shows how to implement the [package organization structure](./package-organization.md) using Spring MVC. Spring MVC uses blocking I/O, where each request waits for a response before moving on.

## Domain Layer Examples

### Domain Entity

```java
package com.example.orderservice.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public class Order {
    private final UUID id;
    private final UUID customerId;
    private OrderStatus status;
    private final Set<OrderItem> items;
    private final Instant createdDate;
    private Instant lastModifiedDate;

    private Order(UUID id, UUID customerId, OrderStatus status, Set<OrderItem> items,
                  Instant createdDate, Instant lastModifiedDate) {
        this.id = id;
        this.customerId = customerId;
        this.status = status;
        this.items = new HashSet<>(items);
        this.createdDate = createdDate;
        this.lastModifiedDate = lastModifiedDate;
    }

    public static Order create(UUID customerId, Set<OrderItem> items) {
        return new Order(
            UUID.randomUUID(),
            customerId,
            OrderStatus.PENDING,
            items,
            Instant.now(),
            Instant.now()
        );
    }
    
    public void process() {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException("Cannot process order that is not in PENDING state");
        }
        status = OrderStatus.PROCESSING;
        lastModifiedDate = Instant.now();
    }
    
    public BigDecimal calculateTotal() {
        return items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    // Getters for all properties
    public UUID getId() { return id; }
    public UUID getCustomerId() { return customerId; }
    public OrderStatus getStatus() { return status; }
    public Set<OrderItem> getItems() { return Collections.unmodifiableSet(items); }
    public Instant getCreatedDate() { return createdDate; }
    public Instant getLastModifiedDate() { return lastModifiedDate; }
}
```

### Domain Repository Interface (Port)

```java
package com.example.orderservice.domain.repository;

import com.example.orderservice.domain.model.Order;
import java.util.Optional;
import java.util.UUID;

// Port that will be implemented in the infrastructure layer
public interface OrderRepository {
    Optional<Order> findById(UUID id);
    Order save(Order order);
    void deleteById(UUID id);
}
```

## Application Layer Examples

### Application Service

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
    public OrderResponse createOrder(OrderCreationRequest request) {
        // Convert request to domain objects
        Set<OrderItem> orderItems = request.getItems().stream()
            .map(item -> new OrderItem(
                item.getProductId(),
                item.getQuantity(),
                item.getUnitPrice()))
            .collect(Collectors.toSet());

        // Check inventory
        inventoryService.validateInventory(orderItems);

        // Create domain entity
        Order order = Order.create(request.getCustomerId(), orderItems);
        
        // Save to repository
        Order savedOrder = orderRepository.save(order);
        
        // Publish domain event
        eventPublisher.publishEvent(new OrderCreatedEvent(savedOrder));
        
        // Return response
        return orderMapper.toResponse(savedOrder);
    }
}
```

## Infrastructure Layer Examples

### Repository Implementation (Adapter)

```java
package com.example.orderservice.infrastructure.persistence.repository;

import com.example.orderservice.domain.model.Order;
import com.example.orderservice.domain.repository.OrderRepository;
import com.example.orderservice.infrastructure.persistence.entity.OrderEntity;
import com.example.orderservice.infrastructure.persistence.mapper.OrderEntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class OrderRepositoryImpl implements OrderRepository {
    private final JpaOrderRepository jpaOrderRepository;
    private final OrderEntityMapper mapper;

    @Override
    public Optional<Order> findById(UUID id) {
        return jpaOrderRepository.findById(id)
            .map(mapper::toDomain);
    }

    @Override
    public Order save(Order order) {
        OrderEntity entity = mapper.toEntity(order);
        OrderEntity savedEntity = jpaOrderRepository.save(entity);
        return mapper.toDomain(savedEntity);
    }

    @Override
    public void deleteById(UUID id) {
        jpaOrderRepository.deleteById(id);
    }
}
```

### JPA Repository

```java
package com.example.orderservice.infrastructure.persistence.repository;

import com.example.orderservice.infrastructure.persistence.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface JpaOrderRepository extends JpaRepository<OrderEntity, UUID> {
    // Spring Data JPA specific query methods
}
```

## Interface Layer Examples

### REST Controller

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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.UUID;

@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderApplicationService orderService;
    private final OrderApiMapper orderApiMapper;

    @PostMapping
    public ResponseEntity<OrderResponseDto> createOrder(
            @Valid @RequestBody OrderCreationRequestDto requestDto) {
        
        OrderCreationRequest applicationRequest = orderApiMapper.toApplicationRequest(requestDto);
        OrderResponse response = orderService.createOrder(applicationRequest);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(orderApiMapper.toApiResponse(response));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponseDto> getOrder(@PathVariable UUID orderId) {
        OrderResponse response = orderService.getOrder(orderId);
        return ResponseEntity.ok(orderApiMapper.toApiResponse(response));
    }
}
```

## Configuration Examples

### Web Configuration

```java
package com.example.orderservice.config.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableWebMvc
public class WebMvcConfig implements WebMvcConfigurer {
    // Spring MVC configuration
}
```

## Key Characteristics of Imperative Implementation

1. **Blocking Operations**: Methods return data types like `Optional<T>` and `List<T>` that hold the actual data
2. **Synchronous Processing**: Each operation finishes before the next one starts
3. **Traditional Spring MVC**: Uses `@RestController` and `@RequestMapping` annotations
4. **JPA Integration**: Uses Spring Data JPA repositories for database access
5. **Exception Handling**: Uses try-catch blocks and `@ExceptionHandler` methods

## See Also

- [Package Organization](./package-organization.md) - Core structure principles
- [Reactive Examples](./reactive-examples.md) - WebFlux implementation examples
- [Testing Structure](./testing-structure.md) - Test organization patterns