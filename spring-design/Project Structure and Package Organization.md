# Project Structure and Package Organization

## Overview

A consistent project structure facilitates code navigation, promotes separation of concerns, and enables teams to quickly understand new services. This document outlines our standard approach to organizing Spring Boot microservices following Domain-Driven Design principles.

## Core Structure Principles

1. **Domain-Centric Organization**: Structure packages around business domains rather than technical layers
2. **Bounded Contexts**: Align microservice boundaries with DDD bounded contexts
3. **Hexagonal Architecture**: Separate domain logic from external concerns through ports and adapters
4. **Consistent Conventions**: Apply the same organizational patterns across all microservices

## Standard Project Structure

### Root Package Naming

Use reverse domain notation with service name:

```
com.example.{service-name}
```

Example:
```
com.example.orderservice
com.example.customerservice
```

### High-Level Package Structure

```
com.example.{service-name}
├── domain           # Domain model and business logic
├── application      # Application services/use cases that orchestrate domain operations
├── infrastructure   # Technical implementations of ports defined in the domain
├── interfaces       # API controllers and external interfaces
└── config           # Application configuration
```

## Domain Package

The domain package contains core business logic and entities, independent of technical concerns:

```
domain
├── model           # Domain entities and value objects
├── repository      # Repository interfaces (ports)
├── service         # Domain services
├── event           # Domain events
└── exception       # Domain-specific exceptions
```

Example Domain Entity:

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

Example Domain Repository Interface:

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

## Application Package

The application package contains use cases that orchestrate domain operations:

```
application
├── service        # Application services implementing use cases
├── dto            # Data Transfer Objects for internal communication
├── mapper         # Mappers between domain and DTOs
└── exception      # Application-specific exceptions
```

Example Application Service:

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

## Infrastructure Package

The infrastructure package contains technical implementations of domain ports:

```
infrastructure
├── repository             # Repository implementations (adapters)
├── client                 # External service clients
├── messaging              # Message queue producers/consumers
├── persistence            # JPA entities and repositories
│   ├── entity             # JPA entities 
│   ├── repository         # Spring Data repositories
│   └── mapper             # Mappers between domain and JPA entities
└── security               # Security implementations
```

Example Repository Implementation:

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

Example JPA Repository:

```java
package com.example.orderservice.infrastructure.persistence.repository;

import com.example.orderservice.infrastructure.persistence.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface JpaOrderRepository extends JpaRepository<OrderEntity, UUID> {
    // Spring Data JPA specific query methods
}
```

## Interfaces Package

The interfaces package contains controllers and external interfaces:

```
interfaces
├── rest                   # REST controllers
│   ├── controller         # Controller classes
│   ├── request            # Request DTOs
│   ├── response           # Response DTOs
│   ├── mapper             # Mappers between application DTOs and API DTOs
│   └── advice             # Controller advice for exception handling
├── graphql                # GraphQL resolvers (if applicable)
└── grpc                   # gRPC service implementations (if applicable)
```

Example REST Controller:

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

## Config Package

The config package contains application configuration:

```
config
├── security              # Security configuration
├── cache                 # Cache configuration
├── database              # Database configuration
├── messaging             # Messaging configuration
└── web                   # Web configuration
```

Example Configuration:

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

## Reactive vs. Imperative Implementations

For **Reactive** services (WebFlux), return reactive types in repository and service interfaces:

```java
// Reactive repository interface
public interface OrderRepository {
    Mono<Order> findById(UUID id);
    Mono<Order> save(Order order);
    Mono<Void> deleteById(UUID id);
}
```

For **Imperative** services (Spring MVC), use standard return types:

```java
// Imperative repository interface
public interface OrderRepository {
    Optional<Order> findById(UUID id);
    Order save(Order order);
    void deleteById(UUID id);
}
```

## Test Structure

Mirror the main structure for tests:

```
src/test/java/com/example/{service-name}
├── domain               # Domain tests
├── application          # Application service tests
├── infrastructure       # Infrastructure tests
├── interfaces           # API tests
└── integration          # Integration tests across layers
```

## Implementation Guidelines

1. **Keep the Domain Pure**: Domain models should not have framework dependencies
2. **Rich Domain Models**: Use encapsulation and behavior-rich domain objects over anemic models
3. **Immutable Where Possible**: Prefer immutable objects for value objects and where appropriate
4. **Clear Boundaries**: Maintain clear separation between layers with appropriate mappers
5. **Package Private Scope**: Use package-private visibility to enforce layer boundaries where appropriate

## Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Anemic Domain Models | Entities with only getters/setters | Rich domain models with behavior |
| Technical Layer Packaging | Packages by type (controllers, services) | Domain-centric packaging |
| Leaky Abstractions | JPA annotations on domain models | Keep domain models pure |
| Service Orchestration in Controllers | Business logic in controllers | Use application services |
| Repository Method Explosion | Many specific finder methods | Consider query objects pattern |

This project structure ensures a clean separation of concerns while aligning with Domain-Driven Design principles across our microservice ecosystem.