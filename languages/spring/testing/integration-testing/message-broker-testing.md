# Message Broker Integration Testing

## Overview

Message broker integration testing verifies message production, consumption, and processing with real message brokers running in containers. These tests ensure that your application correctly publishes events, consumes messages, handles serialization, and manages message processing failures.

## Core Principles

1. **Use Real Brokers**: Run actual message brokers in Testcontainers for realistic testing
2. **Test Both Sides**: Verify message production and consumption
3. **Test Error Handling**: Simulate message processing failures and dead letter queues
4. **Test Serialization**: Verify message serialization and deserialization
5. **Test Ordering**: Ensure message ordering guarantees are maintained

## RabbitMQ Integration Testing

### Basic RabbitMQ Setup

```java
@SpringBootTest
@Testcontainers
class OrderEventIntegrationTest {

    @Container
    static RabbitMQContainer rabbitMQ = new RabbitMQContainer("rabbitmq:3.11-management")
            .withReuse(true);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.rabbitmq.host", rabbitMQ::getHost);
        registry.add("spring.rabbitmq.port", rabbitMQ::getAmqpPort);
        registry.add("spring.rabbitmq.username", rabbitMQ::getAdminUsername);
        registry.add("spring.rabbitmq.password", rabbitMQ::getAdminPassword);
    }

    @Autowired
    private OrderEventPublisher eventPublisher;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Test
    void shouldPublishOrderCreatedEvent() {
        // Given
        OrderCreatedEvent event = OrderCreatedEvent.builder()
            .orderId(UUID.randomUUID())
            .customerId(UUID.randomUUID())
            .totalAmount(BigDecimal.valueOf(100.00))
            .timestamp(OffsetDateTime.now())
            .build();

        // When
        eventPublisher.publishOrderCreated(event);

        // Then
        Message receivedMessage = rabbitTemplate.receive("order.events.created", 5000);
        assertThat(receivedMessage).isNotNull();
        
        OrderCreatedEvent receivedEvent = (OrderCreatedEvent) rabbitTemplate
            .getMessageConverter().fromMessage(receivedMessage);
        assertThat(receivedEvent.getOrderId()).isEqualTo(event.getOrderId());
        assertThat(receivedEvent.getCustomerId()).isEqualTo(event.getCustomerId());
    }

    @Test
    void shouldHandleMessageProcessingFailure() {
        // Given
        OrderCreatedEvent invalidEvent = OrderCreatedEvent.builder()
            .orderId(null) // Invalid event
            .customerId(UUID.randomUUID())
            .build();

        // When
        eventPublisher.publishOrderCreated(invalidEvent);

        // Then
        // Verify message ends up in dead letter queue
        Message dlqMessage = rabbitTemplate.receive("order.events.dlq", 5000);
        assertThat(dlqMessage).isNotNull();
    }

    @Test
    void shouldConsumeExternalEvents() throws InterruptedException {
        // Given
        PaymentCompletedEvent externalEvent = PaymentCompletedEvent.builder()
            .orderId(UUID.randomUUID())
            .transactionId("txn-123")
            .amount(BigDecimal.valueOf(100.00))
            .timestamp(OffsetDateTime.now())
            .build();

        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<PaymentCompletedEvent> receivedEvent = new AtomicReference<>();

        // Configure test listener
        @RabbitListener(queues = "payment.events.completed")
        class TestListener {
            @RabbitHandler
            public void handlePaymentCompleted(PaymentCompletedEvent event) {
                receivedEvent.set(event);
                latch.countDown();
            }
        }

        // When
        rabbitTemplate.convertAndSend("payment.exchange", "payment.completed", externalEvent);

        // Then
        assertThat(latch.await(5, TimeUnit.SECONDS)).isTrue();
        assertThat(receivedEvent.get().getOrderId()).isEqualTo(externalEvent.getOrderId());
        assertThat(receivedEvent.get().getTransactionId()).isEqualTo(externalEvent.getTransactionId());
    }
}
```

### Testing Message Ordering and Delivery

```java
@Test
void shouldMaintainMessageOrdering() throws InterruptedException {
    // Given
    List<OrderCreatedEvent> events = List.of(
        createOrderEvent(1),
        createOrderEvent(2),
        createOrderEvent(3)
    );

    List<OrderCreatedEvent> receivedEvents = new CopyOnWriteArrayList<>();
    CountDownLatch latch = new CountDownLatch(3);

    @RabbitListener(queues = "order.events.created")
    class OrderedListener {
        @RabbitHandler
        public void handleOrderCreated(OrderCreatedEvent event) {
            receivedEvents.add(event);
            latch.countDown();
        }
    }

    // When
    events.forEach(eventPublisher::publishOrderCreated);

    // Then
    assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
    assertThat(receivedEvents).hasSize(3);
    assertThat(receivedEvents.get(0).getOrderId()).isEqualTo(events.get(0).getOrderId());
    assertThat(receivedEvents.get(1).getOrderId()).isEqualTo(events.get(1).getOrderId());
    assertThat(receivedEvents.get(2).getOrderId()).isEqualTo(events.get(2).getOrderId());
}

@Test
void shouldHandleMessageRetry() throws InterruptedException {
    // Given
    OrderCreatedEvent event = createOrderEvent(1);
    AtomicInteger attemptCount = new AtomicInteger(0);
    CountDownLatch latch = new CountDownLatch(3); // Expect 3 delivery attempts

    @RabbitListener(queues = "order.events.created")
    class RetryListener {
        @RabbitHandler
        public void handleOrderCreated(OrderCreatedEvent event) {
            attemptCount.incrementAndGet();
            latch.countDown();
            if (attemptCount.get() < 3) {
                throw new RuntimeException("Simulated processing failure");
            }
        }
    }

    // When
    eventPublisher.publishOrderCreated(event);

    // Then
    assertThat(latch.await(15, TimeUnit.SECONDS)).isTrue();
    assertThat(attemptCount.get()).isEqualTo(3);
}
```

## Kafka Integration Testing

### Basic Kafka Setup

```java
@SpringBootTest
@Testcontainers
class OrderKafkaIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"))
            .withReuse(true);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private OrderEventProducer eventProducer;

    @Test
    void shouldProduceOrderEvent() throws InterruptedException {
        // Given
        OrderCreatedEvent event = OrderCreatedEvent.builder()
            .orderId(UUID.randomUUID())
            .customerId(UUID.randomUUID())
            .totalAmount(BigDecimal.valueOf(100.00))
            .timestamp(OffsetDateTime.now())
            .build();

        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<OrderCreatedEvent> receivedEvent = new AtomicReference<>();

        // Configure test consumer
        @KafkaListener(topics = "order-events", groupId = "test-group")
        class TestConsumer {
            @KafkaHandler
            public void handleOrderCreated(OrderCreatedEvent event) {
                receivedEvent.set(event);
                latch.countDown();
            }
        }

        // When
        eventProducer.publishOrderCreated(event);

        // Then
        assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
        assertThat(receivedEvent.get().getOrderId()).isEqualTo(event.getOrderId());
    }

    @Test
    void shouldHandleSerializationErrors() {
        // Given
        Map<String, Object> invalidEvent = Map.of(
            "orderId", "not-a-uuid",
            "customerId", 12345 // Wrong type
        );

        // When & Then
        assertThrows(SerializationException.class, 
            () -> kafkaTemplate.send("order-events", invalidEvent));
    }
}
```

### Testing Kafka Partitioning and Consumer Groups

```java
@Test
void shouldDistributeMessagesAcrossPartitions() throws InterruptedException {
    // Given
    List<OrderCreatedEvent> events = IntStream.range(0, 10)
        .mapToObj(i -> createOrderEvent(i))
        .toList();

    Map<Integer, List<OrderCreatedEvent>> partitionDistribution = new ConcurrentHashMap<>();
    CountDownLatch latch = new CountDownLatch(10);

    @KafkaListener(topics = "order-events", groupId = "partition-test-group")
    class PartitionAwareConsumer {
        @KafkaHandler
        public void handleOrderCreated(
            OrderCreatedEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition
        ) {
            partitionDistribution.computeIfAbsent(partition, k -> new ArrayList<>()).add(event);
            latch.countDown();
        }
    }

    // When
    events.forEach(event -> 
        eventProducer.publishOrderCreated(event.getOrderId().toString(), event)
    );

    // Then
    assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
    assertThat(partitionDistribution).isNotEmpty();
    // Verify messages were distributed across multiple partitions
    assertThat(partitionDistribution.keySet().size()).isGreaterThan(1);
}

@Test
void shouldConsumeFromMultipleConsumersInSameGroup() throws InterruptedException {
    // Given
    int messageCount = 20;
    List<OrderCreatedEvent> events = IntStream.range(0, messageCount)
        .mapToObj(i -> createOrderEvent(i))
        .toList();

    AtomicInteger consumer1Count = new AtomicInteger(0);
    AtomicInteger consumer2Count = new AtomicInteger(0);
    CountDownLatch latch = new CountDownLatch(messageCount);

    @KafkaListener(topics = "order-events", groupId = "multi-consumer-group", concurrency = "2")
    class MultiConsumer {
        @KafkaHandler
        public void handleOrderCreated(OrderCreatedEvent event) {
            // Track which consumer handled the message
            String threadName = Thread.currentThread().getName();
            if (threadName.contains("-0")) {
                consumer1Count.incrementAndGet();
            } else {
                consumer2Count.incrementAndGet();
            }
            latch.countDown();
        }
    }

    // When
    events.forEach(eventProducer::publishOrderCreated);

    // Then
    assertThat(latch.await(15, TimeUnit.SECONDS)).isTrue();
    // Verify both consumers received messages
    assertThat(consumer1Count.get()).isGreaterThan(0);
    assertThat(consumer2Count.get()).isGreaterThan(0);
    assertThat(consumer1Count.get() + consumer2Count.get()).isEqualTo(messageCount);
}
```

## Message Broker Testing Best Practices

### 1. Use Testcontainers for Real Brokers

```java
// Good: Use real message broker
@Container
static RabbitMQContainer rabbitMQ = new RabbitMQContainer("rabbitmq:3.11-management")
    .withReuse(true);

// Bad: Use in-memory mock that doesn't match production behavior
// Don't use embedded brokers for integration tests
```

### 2. Test Message Contract Compliance

```java
// Good: Verify complete message structure
@Test
void shouldPublishValidOrderEvent() {
    OrderCreatedEvent event = createOrderEvent();
    eventPublisher.publishOrderCreated(event);

    Message message = rabbitTemplate.receive("order.events.created", 5000);
    OrderCreatedEvent received = (OrderCreatedEvent) rabbitTemplate
        .getMessageConverter().fromMessage(message);

    // Verify all required fields
    assertThat(received.getOrderId()).isNotNull();
    assertThat(received.getCustomerId()).isNotNull();
    assertThat(received.getTotalAmount()).isPositive();
    assertThat(received.getTimestamp()).isNotNull();
}

// Bad: Only verify message was sent
@Test
void shouldPublishEvent() {
    eventPublisher.publishOrderCreated(event);
    // Missing verification of message content
}
```

### 3. Test Error Scenarios and Dead Letter Queues

```java
// Good: Test error handling and DLQ
@Test
void shouldRouteFailedMessagesToDeadLetterQueue() {
    OrderCreatedEvent invalidEvent = OrderCreatedEvent.builder()
        .orderId(null)
        .build();

    eventPublisher.publishOrderCreated(invalidEvent);

    Message dlqMessage = rabbitTemplate.receive("order.events.dlq", 5000);
    assertThat(dlqMessage).isNotNull();
    assertThat(dlqMessage.getMessageProperties().getHeader("x-exception-message"))
        .isNotNull();
}
```

### 4. Use Realistic Timing

```java
// Good: Use appropriate timeouts
Message message = rabbitTemplate.receive("queue-name", 5000); // 5 second timeout
assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();

// Bad: Use unrealistic timeouts
Message message = rabbitTemplate.receive("queue-name", 100); // Too short
assertThat(latch.await(1, TimeUnit.MILLISECONDS)).isTrue(); // Too short
```

### 5. Clean Up Between Tests

```java
@BeforeEach
void setUp() {
    // Purge queues before each test
    rabbitAdmin.purgeQueue("order.events.created");
    rabbitAdmin.purgeQueue("order.events.dlq");
}

@AfterEach
void tearDown() {
    // Clean up any test-specific configuration
    rabbitAdmin.removeQueue("test-queue");
}
```

## Related Documentation

- [Integration Testing Fundamentals](integration-testing-fundamentals.md) - Core integration testing principles
- [WireMock Testing](wiremock-testing.md) - HTTP service mocking with WireMock
- [Event-Driven Architecture](../../../../guides/architecture/event-driven-architecture.md) - Event-driven design patterns
- [Testcontainers Testing](../specialized-testing/infrastructure-testing.md) - Infrastructure testing with containers
