# Infrastructure Testing

## Overview

Infrastructure testing focuses on testing technical components that interact with external systems like databases, APIs, and message queues. These tests verify that infrastructure adapters correctly translate between domain models and external system representations.

## Core Principles

1. **Mock external dependencies**: Database connections, HTTP clients, message brokers
2. **Test adapter logic**: Focus on mapping and translation between layers
3. **Verify error handling**: Test network failures, timeouts, and error responses
4. **Test contract compliance**: Ensure external API contracts are followed

## Repository Testing

Repository implementations should be tested in isolation by mocking the underlying data access technology.

### Testing JPA Repository Implementations

```java
@ExtendWith(MockitoExtension.class)
class JpaOrderRepositoryTest {

    @Mock
    private JpaRepository<OrderEntity, UUID> jpaRepository;

    @Mock
    private OrderEntityMapper orderMapper;

    @InjectMocks
    private JpaOrderRepository orderRepository;

    @Test
    void shouldSaveOrder() {
        // Given
        Order order = createTestOrder();
        OrderEntity orderEntity = createTestOrderEntity();
        OrderEntity savedEntity = createTestOrderEntity();
        savedEntity.setId(UUID.randomUUID());
        Order savedOrder = createTestOrder();
        savedOrder.setId(savedEntity.getId());

        when(orderMapper.toEntity(order)).thenReturn(orderEntity);
        when(jpaRepository.save(orderEntity)).thenReturn(savedEntity);
        when(orderMapper.toDomain(savedEntity)).thenReturn(savedOrder);

        // When
        Order result = orderRepository.save(order);

        // Then
        assertThat(result.getId()).isEqualTo(savedEntity.getId());
        verify(orderMapper).toEntity(order);
        verify(jpaRepository).save(orderEntity);
        verify(orderMapper).toDomain(savedEntity);
    }

    @Test
    void shouldFindOrderById() {
        // Given
        UUID orderId = UUID.randomUUID();
        OrderEntity orderEntity = createTestOrderEntity();
        orderEntity.setId(orderId);
        Order order = createTestOrder();
        order.setId(orderId);

        when(jpaRepository.findById(orderId)).thenReturn(Optional.of(orderEntity));
        when(orderMapper.toDomain(orderEntity)).thenReturn(order);

        // When
        Optional<Order> result = orderRepository.findById(orderId);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(orderId);
        verify(jpaRepository).findById(orderId);
        verify(orderMapper).toDomain(orderEntity);
    }

    @Test
    void shouldReturnEmptyWhenOrderNotFound() {
        // Given
        UUID orderId = UUID.randomUUID();
        when(jpaRepository.findById(orderId)).thenReturn(Optional.empty());

        // When
        Optional<Order> result = orderRepository.findById(orderId);

        // Then
        assertThat(result).isEmpty();
        verify(jpaRepository).findById(orderId);
        verifyNoInteractions(orderMapper);
    }

    @Test
    void shouldFindOrdersByCustomerId() {
        // Given
        UUID customerId = UUID.randomUUID();
        List<OrderEntity> entities = List.of(createTestOrderEntity(), createTestOrderEntity());
        List<Order> orders = List.of(createTestOrder(), createTestOrder());

        when(jpaRepository.findByCustomerId(customerId)).thenReturn(entities);
        when(orderMapper.toDomain(entities.get(0))).thenReturn(orders.get(0));
        when(orderMapper.toDomain(entities.get(1))).thenReturn(orders.get(1));

        // When
        List<Order> result = orderRepository.findByCustomerId(customerId);

        // Then
        assertThat(result).hasSize(2);
        verify(jpaRepository).findByCustomerId(customerId);
        verify(orderMapper, times(2)).toDomain(any(OrderEntity.class));
    }

    @Test
    void shouldHandleDataAccessException() {
        // Given
        Order order = createTestOrder();
        OrderEntity orderEntity = createTestOrderEntity();
        when(orderMapper.toEntity(order)).thenReturn(orderEntity);
        when(jpaRepository.save(orderEntity)).thenThrow(new DataIntegrityViolationException("Constraint violation"));

        // When & Then
        assertThrows(RepositoryException.class, () -> orderRepository.save(order));
        verify(orderMapper).toEntity(order);
        verify(jpaRepository).save(orderEntity);
    }

    private Order createTestOrder() {
        return Order.builder()
            .customerId(UUID.randomUUID())
            .status(OrderStatus.CREATED)
            .totalAmount(BigDecimal.valueOf(100.00))
            .items(List.of())
            .build();
    }

    private OrderEntity createTestOrderEntity() {
        return OrderEntity.builder()
            .customerId(UUID.randomUUID())
            .status("CREATED")
            .totalAmount(BigDecimal.valueOf(100.00))
            .build();
    }
}
```

### Testing Repository with Custom Queries

```java
@ExtendWith(MockitoExtension.class)
class CustomOrderRepositoryTest {

    @Mock
    private EntityManager entityManager;

    @Mock
    private TypedQuery<OrderEntity> typedQuery;

    @Mock
    private OrderEntityMapper orderMapper;

    @InjectMocks
    private CustomOrderRepositoryImpl orderRepository;

    @Test
    void shouldFindOrdersByStatusAndDateRange() {
        // Given
        OrderStatus status = OrderStatus.CONFIRMED;
        OffsetDateTime startDate = OffsetDateTime.now().minusDays(7);
        OffsetDateTime endDate = OffsetDateTime.now();
        Pageable pageable = PageRequest.of(0, 10);

        List<OrderEntity> entities = List.of(createTestOrderEntity());
        List<Order> orders = List.of(createTestOrder());

        when(entityManager.createQuery(anyString(), eq(OrderEntity.class))).thenReturn(typedQuery);
        when(typedQuery.setParameter("status", status.name())).thenReturn(typedQuery);
        when(typedQuery.setParameter("startDate", startDate)).thenReturn(typedQuery);
        when(typedQuery.setParameter("endDate", endDate)).thenReturn(typedQuery);
        when(typedQuery.setFirstResult(0)).thenReturn(typedQuery);
        when(typedQuery.setMaxResults(10)).thenReturn(typedQuery);
        when(typedQuery.getResultList()).thenReturn(entities);
        when(orderMapper.toDomain(any(OrderEntity.class))).thenReturn(orders.get(0));

        // When
        Page<Order> result = orderRepository.findByStatusAndCreatedDateBetween(status, startDate, endDate, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        verify(entityManager).createQuery(anyString(), eq(OrderEntity.class));
        verify(typedQuery).setParameter("status", status.name());
        verify(typedQuery).setParameter("startDate", startDate);
        verify(typedQuery).setParameter("endDate", endDate);
        verify(orderMapper).toDomain(entities.get(0));
    }
}
```

## HTTP Client Testing

Test HTTP clients that interact with external services by mocking WebClient and its reactive chain.

### Testing WebClient-based API Clients

```java
@ExtendWith(MockitoExtension.class)
class PaymentServiceClientTest {

    @Mock
    private WebClient webClient;

    @Mock
    private WebClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private WebClient.RequestBodySpec requestBodySpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    @InjectMocks
    private PaymentServiceClient paymentServiceClient;

    @Test
    void shouldProcessPaymentSuccessfully() {
        // Given
        PaymentRequest request = PaymentRequest.builder()
            .orderId(UUID.randomUUID())
            .amount(BigDecimal.valueOf(100.00))
            .currency("USD")
            .build();
        
        PaymentResponse response = PaymentResponse.builder()
            .transactionId("txn-123")
            .status(PaymentStatus.COMPLETED)
            .amount(BigDecimal.valueOf(100.00))
            .build();

        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri("/v1/payments")).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(request)).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(PaymentResponse.class)).thenReturn(Mono.just(response));

        // When
        PaymentResponse result = paymentServiceClient.processPayment(request).block();

        // Then
        assertThat(result.getTransactionId()).isEqualTo("txn-123");
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(result.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(100.00));
        
        verify(webClient).post();
        verify(requestBodyUriSpec).uri("/v1/payments");
        verify(requestBodySpec).bodyValue(request);
        verify(requestBodySpec).retrieve();
        verify(responseSpec).bodyToMono(PaymentResponse.class);
    }

    @Test
    void shouldHandleHttpErrorResponse() {
        // Given
        PaymentRequest request = PaymentRequest.builder()
            .orderId(UUID.randomUUID())
            .amount(BigDecimal.valueOf(100.00))
            .currency("USD")
            .build();

        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri("/v1/payments")).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(request)).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(PaymentResponse.class))
            .thenReturn(Mono.error(new WebClientResponseException(400, "Bad Request", 
                HttpHeaders.EMPTY, "Invalid payment request".getBytes(), StandardCharsets.UTF_8)));

        // When & Then
        assertThrows(PaymentServiceException.class, 
            () -> paymentServiceClient.processPayment(request).block());
        
        verify(responseSpec).bodyToMono(PaymentResponse.class);
    }

    @Test
    void shouldHandleNetworkTimeout() {
        // Given
        PaymentRequest request = PaymentRequest.builder()
            .orderId(UUID.randomUUID())
            .amount(BigDecimal.valueOf(100.00))
            .currency("USD")
            .build();

        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri("/v1/payments")).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(request)).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(PaymentResponse.class))
            .thenReturn(Mono.error(new TimeoutException("Request timeout")));

        // When & Then
        assertThrows(PaymentServiceException.class, 
            () -> paymentServiceClient.processPayment(request).block());
    }

    @Test
    void shouldRetryOnTransientFailures() {
        // Given
        PaymentRequest request = PaymentRequest.builder()
            .orderId(UUID.randomUUID())
            .amount(BigDecimal.valueOf(100.00))
            .currency("USD")
            .build();

        PaymentResponse response = PaymentResponse.builder()
            .transactionId("txn-123")
            .status(PaymentStatus.COMPLETED)
            .build();

        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri("/v1/payments")).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(request)).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(PaymentResponse.class))
            .thenReturn(Mono.error(new ConnectException("Connection failed"))) // First attempt fails
            .thenReturn(Mono.just(response)); // Second attempt succeeds

        // When
        PaymentResponse result = paymentServiceClient.processPaymentWithRetry(request).block();

        // Then
        assertThat(result.getTransactionId()).isEqualTo("txn-123");
        verify(responseSpec, times(2)).bodyToMono(PaymentResponse.class);
    }
}
```

### Testing REST Template-based Clients

```java
@ExtendWith(MockitoExtension.class)
class InventoryServiceClientTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private InventoryServiceClient inventoryClient;

    @Test
    void shouldCheckInventoryAvailability() {
        // Given
        UUID productId = UUID.randomUUID();
        int quantity = 5;
        InventoryResponse response = InventoryResponse.builder()
            .productId(productId)
            .availableQuantity(10)
            .available(true)
            .build();

        when(restTemplate.getForObject("/v1/inventory/{productId}?quantity={quantity}", 
            InventoryResponse.class, productId, quantity)).thenReturn(response);

        // When
        boolean result = inventoryClient.isAvailable(productId, quantity);

        // Then
        assertThat(result).isTrue();
        verify(restTemplate).getForObject("/v1/inventory/{productId}?quantity={quantity}", 
            InventoryResponse.class, productId, quantity);
    }

    @Test
    void shouldHandleInventoryServiceException() {
        // Given
        UUID productId = UUID.randomUUID();
        int quantity = 5;

        when(restTemplate.getForObject(anyString(), eq(InventoryResponse.class), any(), any()))
            .thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND, "Product not found"));

        // When & Then
        assertThrows(ProductNotFoundException.class, 
            () -> inventoryClient.isAvailable(productId, quantity));
    }

    @Test
    void shouldReserveInventory() {
        // Given
        List<InventoryReservationRequest> reservations = List.of(
            InventoryReservationRequest.builder()
                .productId(UUID.randomUUID())
                .quantity(2)
                .build()
        );

        InventoryReservationResponse response = InventoryReservationResponse.builder()
            .reservationId(UUID.randomUUID())
            .successful(true)
            .build();

        when(restTemplate.postForObject("/v1/inventory/reserve", reservations, InventoryReservationResponse.class))
            .thenReturn(response);

        // When
        InventoryReservationResponse result = inventoryClient.reserveItems(reservations);

        // Then
        assertThat(result.isSuccessful()).isTrue();
        assertThat(result.getReservationId()).isNotNull();
        verify(restTemplate).postForObject("/v1/inventory/reserve", reservations, InventoryReservationResponse.class);
    }
}
```

## Message Queue Client Testing

Test messaging clients that produce and consume messages from queues.

### Testing RabbitMQ Producer

```java
@ExtendWith(MockitoExtension.class)
class OrderEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private MessageConverter messageConverter;

    @InjectMocks
    private OrderEventPublisher eventPublisher;

    @Test
    void shouldPublishOrderCreatedEvent() {
        // Given
        OrderCreatedEvent event = OrderCreatedEvent.builder()
            .orderId(UUID.randomUUID())
            .customerId(UUID.randomUUID())
            .totalAmount(BigDecimal.valueOf(100.00))
            .timestamp(OffsetDateTime.now())
            .build();

        Message message = new Message("serialized-event".getBytes());
        when(messageConverter.toMessage(event, new MessageProperties())).thenReturn(message);

        // When
        eventPublisher.publishOrderCreated(event);

        // Then
        verify(rabbitTemplate).send("order.exchange", "order.created", message);
        verify(messageConverter).toMessage(eq(event), any(MessageProperties.class));
    }

    @Test
    void shouldHandleMessagingException() {
        // Given
        OrderCreatedEvent event = OrderCreatedEvent.builder()
            .orderId(UUID.randomUUID())
            .customerId(UUID.randomUUID())
            .build();

        doThrow(new AmqpException("Connection failed"))
            .when(rabbitTemplate).send(anyString(), anyString(), any(Message.class));

        // When & Then
        assertThrows(EventPublishingException.class, 
            () -> eventPublisher.publishOrderCreated(event));
    }
}
```

### Testing Message Consumer

```java
@ExtendWith(MockitoExtension.class)
class PaymentEventListenerTest {

    @Mock
    private OrderService orderService;

    @InjectMocks
    private PaymentEventListener paymentEventListener;

    @Test
    void shouldProcessPaymentCompletedEvent() {
        // Given
        PaymentCompletedEvent event = PaymentCompletedEvent.builder()
            .orderId(UUID.randomUUID())
            .transactionId("txn-123")
            .amount(BigDecimal.valueOf(100.00))
            .timestamp(OffsetDateTime.now())
            .build();

        // When
        paymentEventListener.handlePaymentCompleted(event);

        // Then
        verify(orderService).confirmPayment(event.getOrderId(), event.getTransactionId());
    }

    @Test
    void shouldHandleProcessingException() {
        // Given
        PaymentCompletedEvent event = PaymentCompletedEvent.builder()
            .orderId(UUID.randomUUID())
            .transactionId("txn-123")
            .build();

        doThrow(new OrderNotFoundException("Order not found"))
            .when(orderService).confirmPayment(any(), anyString());

        // When & Then
        assertThrows(EventProcessingException.class, 
            () -> paymentEventListener.handlePaymentCompleted(event));
    }
}
```

## File Storage Client Testing

Test clients that interact with file storage systems.

### Testing S3 Client

```java
@ExtendWith(MockitoExtension.class)
class S3DocumentStorageTest {

    @Mock
    private AmazonS3 amazonS3;

    @InjectMocks
    private S3DocumentStorage documentStorage;

    @Test
    void shouldUploadDocument() {
        // Given
        String bucketName = "order-documents";
        String key = "orders/order-123/invoice.pdf";
        byte[] content = "PDF content".getBytes();
        
        PutObjectResult putResult = new PutObjectResult();
        putResult.setETag("etag-123");
        
        when(amazonS3.putObject(any(PutObjectRequest.class))).thenReturn(putResult);

        // When
        DocumentUploadResult result = documentStorage.uploadDocument(key, content);

        // Then
        assertThat(result.getKey()).isEqualTo(key);
        assertThat(result.getETag()).isEqualTo("etag-123");
        
        verify(amazonS3).putObject(argThat(request -> 
            request.getBucketName().equals(bucketName) && 
            request.getKey().equals(key)
        ));
    }

    @Test
    void shouldDownloadDocument() {
        // Given
        String key = "orders/order-123/invoice.pdf";
        byte[] content = "PDF content".getBytes();
        
        S3Object s3Object = new S3Object();
        s3Object.setObjectContent(new ByteArrayInputStream(content));
        
        when(amazonS3.getObject("order-documents", key)).thenReturn(s3Object);

        // When
        byte[] result = documentStorage.downloadDocument(key);

        // Then
        assertThat(result).isEqualTo(content);
        verify(amazonS3).getObject("order-documents", key);
    }

    @Test
    void shouldHandleS3Exception() {
        // Given
        String key = "orders/order-123/invoice.pdf";
        byte[] content = "PDF content".getBytes();
        
        when(amazonS3.putObject(any(PutObjectRequest.class)))
            .thenThrow(new AmazonS3Exception("Access denied"));

        // When & Then
        assertThrows(DocumentStorageException.class, 
            () -> documentStorage.uploadDocument(key, content));
    }
}
```

## Infrastructure Testing Best Practices

### 1. Focus on Adapter Logic

```java
// Good: Testing mapping and error handling
@Test
void shouldMapDomainEntityToJpaEntity() {
    Order order = createTestOrder();
    OrderEntity entity = orderMapper.toEntity(order);
    
    assertThat(entity.getCustomerId()).isEqualTo(order.getCustomerId());
    assertThat(entity.getStatus()).isEqualTo(order.getStatus().name());
}

// Bad: Testing framework behavior
@Test
void shouldSaveToDatabase() {
    // This tests JPA behavior, not our adapter logic
}
```

### 2. Mock External Systems

```java
// Good: Mock the external dependency
@Mock
private WebClient webClient;

@Test
void shouldCallExternalApi() {
    when(webClient.post()).thenReturn(requestBodyUriSpec);
    // ... test our client logic
}

// Bad: Making real HTTP calls
@Test
void shouldCallRealApi() {
    // This is an integration test, not a unit test
    PaymentResponse response = paymentClient.processPayment(request);
}
```

### 3. Test Error Scenarios

```java
@Test
void shouldHandleNetworkError() {
    when(webClient.post()).thenThrow(new ConnectException("Network error"));
    
    assertThrows(ExternalServiceException.class, 
        () -> paymentClient.processPayment(request));
}

@Test
void shouldRetryOnTransientFailure() {
    when(repository.save(any()))
        .thenThrow(new TransientDataAccessException("Temporary failure"))
        .thenReturn(savedEntity);
    
    Order result = repository.saveWithRetry(order);
    
    assertThat(result).isNotNull();
    verify(repository, times(2)).save(order);
}
```

### 4. Use Argument Matchers Appropriately

```java
// Good: Specific matching for important parameters
verify(restTemplate).postForObject(
    eq("/v1/payments"), 
    argThat(request -> request.getAmount().equals(expectedAmount)), 
    eq(PaymentResponse.class)
);

// Good: Any matcher for less important parameters
verify(rabbitTemplate).send(eq("payment.exchange"), anyString(), any(Message.class));
```

## Related Documentation

- [Unit Testing Fundamentals](Unit-Testing-Fundamentals.md) - Core testing principles and setup
- [External Service Testing](External-Service-Testing.md) - Integration testing with external services
- [Database Integration Testing](Database-Integration-Testing.md) - Testing with real databases