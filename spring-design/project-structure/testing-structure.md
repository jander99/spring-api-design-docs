# Testing Structure

This document outlines the testing structure and patterns that mirror the main [package organization](./package-organization.md) for both [imperative](./imperative-examples.md) and [reactive](./reactive-examples.md) implementations.

## Test Package Structure

Mirror the main structure for tests:

```
src/test/java/com/example/{service-name}
├── domain               # Domain tests
├── application          # Application service tests
├── infrastructure       # Infrastructure tests
├── interfaces           # API tests
└── integration          # Integration tests across layers
```

## Domain Layer Testing

### Domain Entity Tests

```java
package com.example.orderservice.domain.model;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class OrderTest {

    @Test
    @DisplayName("Should create order with PENDING status")
    void shouldCreateOrderWithPendingStatus() {
        // Given
        UUID customerId = UUID.randomUUID();
        Set<OrderItem> items = Set.of(
            new OrderItem(UUID.randomUUID(), 2, new BigDecimal("10.00"))
        );

        // When
        Order order = Order.create(customerId, items);

        // Then
        assertNotNull(order.getId());
        assertEquals(customerId, order.getCustomerId());
        assertEquals(OrderStatus.PENDING, order.getStatus());
        assertEquals(items, order.getItems());
        assertNotNull(order.getCreatedDate());
    }

    @Test
    @DisplayName("Should process order when in PENDING state")
    void shouldProcessOrderWhenPending() {
        // Given
        Order order = Order.create(UUID.randomUUID(), Set.of());

        // When
        order.process();

        // Then
        assertEquals(OrderStatus.PROCESSING, order.getStatus());
    }

    @Test
    @DisplayName("Should throw exception when processing non-pending order")
    void shouldThrowExceptionWhenProcessingNonPendingOrder() {
        // Given
        Order order = Order.create(UUID.randomUUID(), Set.of());
        order.process(); // Move to PROCESSING state

        // When & Then
        assertThrows(IllegalStateException.class, order::process);
    }

    @Test
    @DisplayName("Should calculate correct total")
    void shouldCalculateCorrectTotal() {
        // Given
        Set<OrderItem> items = Set.of(
            new OrderItem(UUID.randomUUID(), 2, new BigDecimal("10.00")),
            new OrderItem(UUID.randomUUID(), 1, new BigDecimal("15.00"))
        );
        Order order = Order.create(UUID.randomUUID(), items);

        // When
        BigDecimal total = order.calculateTotal();

        // Then
        assertEquals(new BigDecimal("35.00"), total);
    }
}
```

## Application Layer Testing

### Imperative Application Service Test

```java
package com.example.orderservice.application.service;

import com.example.orderservice.application.dto.OrderCreationRequest;
import com.example.orderservice.application.dto.OrderResponse;
import com.example.orderservice.application.mapper.OrderMapper;
import com.example.orderservice.domain.event.OrderCreatedEvent;
import com.example.orderservice.domain.model.Order;
import com.example.orderservice.domain.repository.OrderRepository;
import com.example.orderservice.domain.service.InventoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderApplicationServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private InventoryService inventoryService;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private OrderApplicationService orderApplicationService;

    @Test
    void shouldCreateOrderSuccessfully() {
        // Given
        OrderCreationRequest request = new OrderCreationRequest();
        request.setCustomerId(UUID.randomUUID());

        Order mockOrder = mock(Order.class);
        OrderResponse expectedResponse = new OrderResponse();

        when(orderRepository.save(any(Order.class))).thenReturn(mockOrder);
        when(orderMapper.toResponse(mockOrder)).thenReturn(expectedResponse);

        // When
        OrderResponse result = orderApplicationService.createOrder(request);

        // Then
        assertEquals(expectedResponse, result);
        verify(inventoryService).validateInventory(any());
        verify(orderRepository).save(any(Order.class));
        verify(eventPublisher).publishEvent(any(OrderCreatedEvent.class));
        verify(orderMapper).toResponse(mockOrder);
    }
}
```

### Reactive Application Service Test

```java
package com.example.orderservice.application.service;

import com.example.orderservice.application.dto.OrderCreationRequest;
import com.example.orderservice.application.dto.OrderResponse;
import com.example.orderservice.application.mapper.OrderMapper;
import com.example.orderservice.domain.model.Order;
import com.example.orderservice.domain.repository.OrderRepository;
import com.example.orderservice.domain.service.InventoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReactiveOrderApplicationServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private InventoryService inventoryService;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private OrderApplicationService orderApplicationService;

    @Test
    void shouldCreateOrderSuccessfully() {
        // Given
        OrderCreationRequest request = new OrderCreationRequest();
        request.setCustomerId(UUID.randomUUID());

        Order mockOrder = mock(Order.class);
        OrderResponse expectedResponse = new OrderResponse();

        when(inventoryService.validateInventory(any())).thenReturn(Mono.empty());
        when(orderRepository.save(any(Order.class))).thenReturn(Mono.just(mockOrder));
        when(orderMapper.toResponse(mockOrder)).thenReturn(expectedResponse);

        // When & Then
        StepVerifier.create(orderApplicationService.createOrder(request))
            .expectNext(expectedResponse)
            .verifyComplete();

        verify(inventoryService).validateInventory(any());
        verify(orderRepository).save(any(Order.class));
        verify(eventPublisher).publishEvent(any());
        verify(orderMapper).toResponse(mockOrder);
    }

    @Test
    void shouldHandleInventoryValidationError() {
        // Given
        OrderCreationRequest request = new OrderCreationRequest();
        request.setCustomerId(UUID.randomUUID());

        when(inventoryService.validateInventory(any()))
            .thenReturn(Mono.error(new InsufficientInventoryException()));

        // When & Then
        StepVerifier.create(orderApplicationService.createOrder(request))
            .expectError(InsufficientInventoryException.class)
            .verify();

        verify(inventoryService).validateInventory(any());
        verify(orderRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }
}
```

## Infrastructure Layer Testing

### Repository Implementation Test

```java
package com.example.orderservice.infrastructure.persistence.repository;

import com.example.orderservice.domain.model.Order;
import com.example.orderservice.infrastructure.persistence.entity.OrderEntity;
import com.example.orderservice.infrastructure.persistence.mapper.OrderEntityMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderRepositoryImplTest {

    @Mock
    private JpaOrderRepository jpaOrderRepository;

    @Mock
    private OrderEntityMapper mapper;

    @InjectMocks
    private OrderRepositoryImpl orderRepository;

    @Test
    void shouldFindOrderById() {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderEntity entity = new OrderEntity();
        Order expectedOrder = mock(Order.class);

        when(jpaOrderRepository.findById(orderId)).thenReturn(Optional.of(entity));
        when(mapper.toDomain(entity)).thenReturn(expectedOrder);

        // When
        Optional<Order> result = orderRepository.findById(orderId);

        // Then
        assertTrue(result.isPresent());
        assertEquals(expectedOrder, result.get());
        verify(jpaOrderRepository).findById(orderId);
        verify(mapper).toDomain(entity);
    }

    @Test
    void shouldReturnEmptyWhenOrderNotFound() {
        // Given
        UUID orderId = UUID.randomUUID();
        when(jpaOrderRepository.findById(orderId)).thenReturn(Optional.empty());

        // When
        Optional<Order> result = orderRepository.findById(orderId);

        // Then
        assertFalse(result.isPresent());
        verify(jpaOrderRepository).findById(orderId);
        verify(mapper, never()).toDomain(any());
    }
}
```

### Reactive Repository Test

```java
package com.example.orderservice.infrastructure.persistence.repository;

import com.example.orderservice.domain.model.Order;
import com.example.orderservice.infrastructure.persistence.entity.OrderEntity;
import com.example.orderservice.infrastructure.persistence.mapper.OrderEntityMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReactiveOrderRepositoryImplTest {

    @Mock
    private R2dbcOrderRepository r2dbcOrderRepository;

    @Mock
    private OrderEntityMapper mapper;

    @InjectMocks
    private OrderRepositoryImpl orderRepository;

    @Test
    void shouldFindOrderById() {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderEntity entity = new OrderEntity();
        Order expectedOrder = mock(Order.class);

        when(r2dbcOrderRepository.findById(orderId)).thenReturn(Mono.just(entity));
        when(mapper.toDomain(entity)).thenReturn(expectedOrder);

        // When & Then
        StepVerifier.create(orderRepository.findById(orderId))
            .expectNext(expectedOrder)
            .verifyComplete();

        verify(r2dbcOrderRepository).findById(orderId);
        verify(mapper).toDomain(entity);
    }

    @Test
    void shouldReturnEmptyWhenOrderNotFound() {
        // Given
        UUID orderId = UUID.randomUUID();
        when(r2dbcOrderRepository.findById(orderId)).thenReturn(Mono.empty());

        // When & Then
        StepVerifier.create(orderRepository.findById(orderId))
            .verifyComplete();

        verify(r2dbcOrderRepository).findById(orderId);
        verify(mapper, never()).toDomain(any());
    }
}
```

## Interface Layer Testing

### REST Controller Test (Imperative)

```java
package com.example.orderservice.interfaces.rest.controller;

import com.example.orderservice.application.dto.OrderResponse;
import com.example.orderservice.application.service.OrderApplicationService;
import com.example.orderservice.interfaces.rest.mapper.OrderApiMapper;
import com.example.orderservice.interfaces.rest.request.OrderCreationRequestDto;
import com.example.orderservice.interfaces.rest.response.OrderResponseDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OrderApplicationService orderService;

    @MockBean
    private OrderApiMapper orderApiMapper;

    @Test
    void shouldCreateOrderSuccessfully() throws Exception {
        // Given
        OrderCreationRequestDto requestDto = new OrderCreationRequestDto();
        OrderResponse serviceResponse = new OrderResponse();
        OrderResponseDto expectedResponse = new OrderResponseDto();

        when(orderApiMapper.toApplicationRequest(any())).thenReturn(new OrderCreationRequest());
        when(orderService.createOrder(any())).thenReturn(serviceResponse);
        when(orderApiMapper.toApiResponse(serviceResponse)).thenReturn(expectedResponse);

        // When & Then
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestDto)))
            .andExpect(status().isCreated())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    void shouldGetOrderSuccessfully() throws Exception {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderResponse serviceResponse = new OrderResponse();
        OrderResponseDto expectedResponse = new OrderResponseDto();

        when(orderService.getOrder(orderId)).thenReturn(serviceResponse);
        when(orderApiMapper.toApiResponse(serviceResponse)).thenReturn(expectedResponse);

        // When & Then
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpected(status().isOk())
            .andExpected(content().contentType(MediaType.APPLICATION_JSON));
    }
}
```

### REST Controller Test (Reactive)

```java
package com.example.orderservice.interfaces.rest.controller;

import com.example.orderservice.application.dto.OrderResponse;
import com.example.orderservice.application.service.OrderApplicationService;
import com.example.orderservice.interfaces.rest.mapper.OrderApiMapper;
import com.example.orderservice.interfaces.rest.request.OrderCreationRequestDto;
import com.example.orderservice.interfaces.rest.response.OrderResponseDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@WebFluxTest(OrderController.class)
class ReactiveOrderControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private OrderApplicationService orderService;

    @MockBean
    private OrderApiMapper orderApiMapper;

    @Test
    void shouldCreateOrderSuccessfully() {
        // Given
        OrderCreationRequestDto requestDto = new OrderCreationRequestDto();
        OrderResponse serviceResponse = new OrderResponse();
        OrderResponseDto expectedResponse = new OrderResponseDto();

        when(orderApiMapper.toApplicationRequest(any())).thenReturn(new OrderCreationRequest());
        when(orderService.createOrder(any())).thenReturn(Mono.just(serviceResponse));
        when(orderApiMapper.toApiResponse(serviceResponse)).thenReturn(expectedResponse);

        // When & Then
        webTestClient.post()
            .uri("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(requestDto)
            .exchange()
            .expectStatus().isCreated()
            .expectHeader().contentType(MediaType.APPLICATION_JSON);
    }

    @Test
    void shouldGetOrderSuccessfully() {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderResponse serviceResponse = new OrderResponse();
        OrderResponseDto expectedResponse = new OrderResponseDto();

        when(orderService.getOrder(orderId)).thenReturn(Mono.just(serviceResponse));
        when(orderApiMapper.toApiResponse(serviceResponse)).thenReturn(expectedResponse);

        // When & Then
        webTestClient.get()
            .uri("/v1/orders/{orderId}", orderId)
            .exchange()
            .expectStatus().isOk()
            .expectHeader().contentType(MediaType.APPLICATION_JSON);
    }
}
```

## Integration Testing

### Integration Test Structure

```java
package com.example.orderservice.integration;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Testcontainers
class OrderServiceIntegrationTest {
    // Integration tests that test the entire application flow
}
```

## Testing Best Practices

1. **Layer Isolation**: Test each layer independently with appropriate mocking
2. **Reactive Testing**: Use `StepVerifier` for reactive components
3. **Test Data Builders**: Use builder pattern for test data creation
4. **Container Testing**: Use Testcontainers for integration tests
5. **Mock Management**: Keep mocks focused and verify interactions appropriately
6. **Assertion Quality**: Use meaningful assertions that verify business logic

## Testing Dependencies

```xml
<dependencies>
    <!-- JUnit 5 -->
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- Mockito -->
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- Spring Test -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- Reactor Test -->
    <dependency>
        <groupId>io.projectreactor</groupId>
        <artifactId>reactor-test</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- Testcontainers -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## See Also

- [Package Organization](./package-organization.md) - Core structure principles
- [Imperative Examples](./imperative-examples.md) - Spring MVC implementation examples
- [Reactive Examples](./reactive-examples.md) - WebFlux implementation examples