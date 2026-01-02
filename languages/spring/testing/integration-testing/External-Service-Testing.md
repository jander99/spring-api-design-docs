# External Service Testing

## Overview

External service testing verifies interactions with third-party APIs, message brokers, and other external systems. These tests focus on simulating external service responses, testing error handling, and verifying contract compliance using tools like WireMock.

## Core Principles

1. **Simulate External Services**: Use mock servers instead of real external dependencies
2. **Test Contract Compliance**: Verify request/response formats match API contracts
3. **Test Error Scenarios**: Simulate network failures, timeouts, and error responses
4. **Verify Retry Logic**: Test exponential backoff and circuit breaker patterns
5. **Test Authentication**: Verify OAuth flows and API key handling

## WireMock Integration Testing

WireMock is the primary tool for simulating external HTTP services in integration tests.

### Basic WireMock Setup

```java
@SpringBootTest
@Testcontainers
class PaymentServiceClientIntegrationTest {

    @RegisterExtension
    static WireMockExtension wireMock = WireMockExtension.newInstance()
        .options(wireMockConfig().port(8089))
        .build();

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        public PaymentServiceClient paymentServiceClient() {
            return new PaymentServiceClient(
                WebClient.builder()
                    .baseUrl("http://localhost:8089")
                    .build()
            );
        }
    }

    @Autowired
    private PaymentServiceClient paymentServiceClient;

    @Test
    void shouldProcessPaymentSuccessfully() {
        // Given
        PaymentRequest request = PaymentRequest.builder()
            .orderId(UUID.randomUUID())
            .amount(BigDecimal.valueOf(100.00))
            .currency("USD")
            .cardToken("card_123")
            .build();

        wireMock.stubFor(post(urlEqualTo("/v1/payments"))
            .withRequestBody(matchingJsonPath("$.orderId"))
            .withRequestBody(matchingJsonPath("$.amount", equalTo("100.00")))
            .withHeader("Content-Type", equalTo("application/json"))
            .withHeader("Authorization", matching("Bearer .*"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "transactionId": "txn-123",
                        "status": "COMPLETED",
                        "amount": 100.00,
                        "currency": "USD",
                        "processedAt": "2023-12-01T10:00:00Z"
                    }
                    """)));

        // When
        PaymentResult result = paymentServiceClient.processPayment(request);

        // Then
        assertThat(result.getTransactionId()).isEqualTo("txn-123");
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(result.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(100.00));
        
        // Verify the request was made correctly
        wireMock.verify(postRequestedFor(urlEqualTo("/v1/payments"))
            .withRequestBody(matchingJsonPath("$.orderId", equalTo(request.getOrderId().toString())))
            .withRequestBody(matchingJsonPath("$.cardToken", equalTo("card_123")))
            .withHeader("Authorization", matching("Bearer .*")));
    }

    @Test
    void shouldHandlePaymentDeclined() {
        // Given
        PaymentRequest request = PaymentRequest.builder()
            .orderId(UUID.randomUUID())
            .amount(BigDecimal.valueOf(100.00))
            .currency("USD")
            .cardToken("invalid_card")
            .build();

        wireMock.stubFor(post(urlEqualTo("/v1/payments"))
            .willReturn(aResponse()
                .withStatus(422)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "code": "PAYMENT_DECLINED",
                        "message": "Card was declined",
                        "details": {
                            "reason": "insufficient_funds",
                            "declineCode": "51"
                        }
                    }
                    """)));

        // When & Then
        assertThrows(PaymentDeclinedException.class, 
            () -> paymentServiceClient.processPayment(request));
            
        PaymentDeclinedException exception = assertThrows(PaymentDeclinedException.class,
            () -> paymentServiceClient.processPayment(request));
        assertThat(exception.getDeclineCode()).isEqualTo("51");
        assertThat(exception.getReason()).isEqualTo("insufficient_funds");
    }
}
```

### Testing Network Error Scenarios

```java
@Test
void shouldHandlePaymentServiceTimeout() {
    // Given
    PaymentRequest request = PaymentRequest.builder()
        .orderId(UUID.randomUUID())
        .amount(BigDecimal.valueOf(100.00))
        .currency("USD")
        .build();

    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .willReturn(aResponse()
            .withStatus(200)
            .withFixedDelay(5000))); // Longer than client timeout

    // When & Then
    assertThrows(PaymentServiceTimeoutException.class, 
        () -> paymentServiceClient.processPayment(request));
}

@Test
void shouldHandleConnectionFailure() {
    // Given
    PaymentRequest request = PaymentRequest.builder()
        .orderId(UUID.randomUUID())
        .amount(BigDecimal.valueOf(100.00))
        .currency("USD")
        .build();

    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .willReturn(aResponse()
            .withFault(Fault.CONNECTION_RESET_BY_PEER)));

    // When & Then
    assertThrows(PaymentServiceException.class, 
        () -> paymentServiceClient.processPayment(request));
}

@Test
void shouldHandleServerError() {
    // Given
    PaymentRequest request = PaymentRequest.builder()
        .orderId(UUID.randomUUID())
        .amount(BigDecimal.valueOf(100.00))
        .currency("USD")
        .build();

    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .willReturn(aResponse()
            .withStatus(500)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "error": "Internal Server Error",
                    "message": "Payment processing service temporarily unavailable"
                }
                """)));

    // When & Then
    assertThrows(PaymentServiceException.class, 
        () -> paymentServiceClient.processPayment(request));
}
```

### Testing Retry Logic and Circuit Breaker

```java
@Test
void shouldRetryOnTransientFailures() {
    // Given
    PaymentRequest request = PaymentRequest.builder()
        .orderId(UUID.randomUUID())
        .amount(BigDecimal.valueOf(100.00))
        .currency("USD")
        .build();

    PaymentResponse successResponse = PaymentResponse.builder()
        .transactionId("txn-123")
        .status(PaymentStatus.COMPLETED)
        .build();

    // First two attempts fail with 503, third succeeds
    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .inScenario("retry-scenario")
        .whenScenarioStateIs(Scenario.STARTED)
        .willReturn(aResponse().withStatus(503))
        .willSetStateTo("first-retry"));

    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .inScenario("retry-scenario")
        .whenScenarioStateIs("first-retry")
        .willReturn(aResponse().withStatus(503))
        .willSetStateTo("second-retry"));

    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .inScenario("retry-scenario")
        .whenScenarioStateIs("second-retry")
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBodyFile("payment-success-response.json")));

    // When
    PaymentResult result = paymentServiceClient.processPaymentWithRetry(request);

    // Then
    assertThat(result.getTransactionId()).isEqualTo("txn-123");
    
    // Verify retry attempts
    wireMock.verify(3, postRequestedFor(urlEqualTo("/v1/payments")));
}

@Test
void shouldOpenCircuitBreakerAfterFailureThreshold() {
    // Given
    PaymentRequest request = PaymentRequest.builder()
        .orderId(UUID.randomUUID())
        .amount(BigDecimal.valueOf(100.00))
        .currency("USD")
        .build();

    // Configure all requests to fail
    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .willReturn(aResponse().withStatus(500)));

    // When - Make requests to trigger circuit breaker
    for (int i = 0; i < 5; i++) {
        assertThrows(PaymentServiceException.class, 
            () -> paymentServiceClient.processPaymentWithCircuitBreaker(request));
    }

    // Then - Circuit breaker should be open, requests should fail fast
    long startTime = System.currentTimeMillis();
    assertThrows(CircuitBreakerOpenException.class,
        () -> paymentServiceClient.processPaymentWithCircuitBreaker(request));
    long endTime = System.currentTimeMillis();
    
    assertThat(endTime - startTime).isLessThan(100); // Should fail fast
}
```

### Testing Authentication and Authorization

```java
@Test
void shouldIncludeAuthenticationHeaders() {
    // Given
    PaymentRequest request = PaymentRequest.builder()
        .orderId(UUID.randomUUID())
        .amount(BigDecimal.valueOf(100.00))
        .currency("USD")
        .build();

    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .withHeader("Authorization", equalTo("Bearer valid-token"))
        .withHeader("X-API-Key", equalTo("api-key-123"))
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "transactionId": "txn-123",
                    "status": "COMPLETED"
                }
                """)));

    // When
    PaymentResult result = paymentServiceClient.processPayment(request);

    // Then
    assertThat(result.getTransactionId()).isEqualTo("txn-123");
    
    wireMock.verify(postRequestedFor(urlEqualTo("/v1/payments"))
        .withHeader("Authorization", equalTo("Bearer valid-token"))
        .withHeader("X-API-Key", equalTo("api-key-123")));
}

@Test
void shouldHandleTokenExpiration() {
    // Given
    PaymentRequest request = PaymentRequest.builder()
        .orderId(UUID.randomUUID())
        .amount(BigDecimal.valueOf(100.00))
        .currency("USD")
        .build();

    // First request fails with 401, second succeeds with new token
    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .inScenario("token-refresh")
        .whenScenarioStateIs(Scenario.STARTED)
        .withHeader("Authorization", equalTo("Bearer expired-token"))
        .willReturn(aResponse()
            .withStatus(401)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "error": "invalid_token",
                    "message": "Token has expired"
                }
                """))
        .willSetStateTo("token-refreshed"));

    wireMock.stubFor(post(urlEqualTo("/oauth/token"))
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "access_token": "new-valid-token",
                    "token_type": "Bearer",
                    "expires_in": 3600
                }
                """)));

    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .inScenario("token-refresh")
        .whenScenarioStateIs("token-refreshed")
        .withHeader("Authorization", equalTo("Bearer new-valid-token"))
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "transactionId": "txn-123",
                    "status": "COMPLETED"
                }
                """)));

    // When
    PaymentResult result = paymentServiceClient.processPaymentWithTokenRefresh(request);

    // Then
    assertThat(result.getTransactionId()).isEqualTo("txn-123");
    
    // Verify token refresh flow
    wireMock.verify(postRequestedFor(urlEqualTo("/oauth/token")));
    wireMock.verify(2, postRequestedFor(urlEqualTo("/v1/payments")));
}
```

## Message Broker Integration Testing

Test message production and consumption with embedded brokers.

### RabbitMQ Integration Testing

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

### Kafka Integration Testing

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

## Testing OAuth 2.0 and OIDC Flows

Test authentication flows with external identity providers.

### OAuth Client Testing

```java
@SpringBootTest
class OAuthClientIntegrationTest {

    @RegisterExtension
    static WireMockExtension authServer = WireMockExtension.newInstance()
        .options(wireMockConfig().port(8090))
        .build();

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        public OAuth2AuthorizedClientManager authorizedClientManager() {
            // Configure OAuth client to use WireMock auth server
            return new AuthorizedClientServiceOAuth2AuthorizedClientManager(
                clientRegistrationRepository(), 
                authorizedClientService()
            );
        }
    }

    @Autowired
    private ExternalApiClient externalApiClient;

    @Test
    void shouldObtainAccessTokenViaClientCredentials() {
        // Given
        authServer.stubFor(post(urlEqualTo("/oauth/token"))
            .withRequestBody(containing("grant_type=client_credentials"))
            .withRequestBody(containing("client_id=test-client"))
            .withRequestBody(containing("client_secret=test-secret"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "access_token": "access-token-123",
                        "token_type": "Bearer",
                        "expires_in": 3600,
                        "scope": "read write"
                    }
                    """)));

        authServer.stubFor(get(urlEqualTo("/api/users/profile"))
            .withHeader("Authorization", equalTo("Bearer access-token-123"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "id": "user-123",
                        "name": "John Doe",
                        "email": "john@example.com"
                    }
                    """)));

        // When
        UserProfile profile = externalApiClient.getUserProfile("user-123");

        // Then
        assertThat(profile.getId()).isEqualTo("user-123");
        assertThat(profile.getName()).isEqualTo("John Doe");
        
        // Verify OAuth flow
        authServer.verify(postRequestedFor(urlEqualTo("/oauth/token")));
        authServer.verify(getRequestedFor(urlEqualTo("/api/users/profile"))
            .withHeader("Authorization", equalTo("Bearer access-token-123")));
    }

    @Test
    void shouldRefreshExpiredToken() {
        // Given
        // First token request returns short-lived token
        authServer.stubFor(post(urlEqualTo("/oauth/token"))
            .inScenario("token-lifecycle")
            .whenScenarioStateIs(Scenario.STARTED)
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "access_token": "short-lived-token",
                        "token_type": "Bearer",
                        "expires_in": 1,
                        "refresh_token": "refresh-token-123"
                    }
                    """))
            .willSetStateTo("token-issued"));

        // API call with expired token returns 401
        authServer.stubFor(get(urlEqualTo("/api/users/profile"))
            .withHeader("Authorization", equalTo("Bearer short-lived-token"))
            .willReturn(aResponse().withStatus(401)));

        // Token refresh request
        authServer.stubFor(post(urlEqualTo("/oauth/token"))
            .inScenario("token-lifecycle")
            .whenScenarioStateIs("token-issued")
            .withRequestBody(containing("grant_type=refresh_token"))
            .withRequestBody(containing("refresh_token=refresh-token-123"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "access_token": "new-access-token",
                        "token_type": "Bearer",
                        "expires_in": 3600
                    }
                    """))
            .willSetStateTo("token-refreshed"));

        // API call with new token succeeds
        authServer.stubFor(get(urlEqualTo("/api/users/profile"))
            .withHeader("Authorization", equalTo("Bearer new-access-token"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "id": "user-123",
                        "name": "John Doe"
                    }
                    """)));

        // When
        Thread.sleep(2000); // Wait for token to expire
        UserProfile profile = externalApiClient.getUserProfile("user-123");

        // Then
        assertThat(profile.getId()).isEqualTo("user-123");
        
        // Verify token refresh flow
        authServer.verify(2, postRequestedFor(urlEqualTo("/oauth/token")));
        authServer.verify(getRequestedFor(urlEqualTo("/api/users/profile"))
            .withHeader("Authorization", equalTo("Bearer new-access-token")));
    }
}
```

## External Service Testing Best Practices

### 1. Use Contract Testing

```java
// Good: Test API contract compliance
@Test
void shouldComplyWithPaymentApiContract() {
    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .withRequestBody(matchingJsonPath("$.amount"))
        .withRequestBody(matchingJsonPath("$.currency"))
        .withRequestBody(matchingJsonPath("$.orderId"))
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBodyFile("payment-response-schema.json")));
    
    PaymentResult result = paymentClient.processPayment(request);
    
    // Verify response matches expected contract
    assertThat(result.getTransactionId()).matches("[a-zA-Z0-9-]+");
    assertThat(result.getStatus()).isIn(PaymentStatus.values());
}

// Bad: Only test happy path
@Test
void shouldProcessPayment() {
    // Missing contract validation and error scenarios
}
```

### 2. Test Error Scenarios Thoroughly

```java
// Good: Test various error conditions
@Test
void shouldHandleVariousErrorScenarios() {
    // Test network timeout
    testTimeout();
    
    // Test server errors
    testServerError();
    
    // Test client errors
    testClientError();
    
    // Test malformed responses
    testMalformedResponse();
}

private void testTimeout() {
    wireMock.stubFor(post(urlEqualTo("/v1/payments"))
        .willReturn(aResponse().withFixedDelay(5000)));
    
    assertThrows(TimeoutException.class, 
        () -> paymentClient.processPayment(request));
}
```

### 3. Verify Request Details

```java
// Good: Verify request content and headers
wireMock.verify(postRequestedFor(urlEqualTo("/v1/payments"))
    .withRequestBody(matchingJsonPath("$.orderId", equalTo(orderId.toString())))
    .withRequestBody(matchingJsonPath("$.amount", equalTo("100.00")))
    .withHeader("Content-Type", equalTo("application/json"))
    .withHeader("Authorization", matching("Bearer .*"))
    .withHeader("Idempotency-Key", matching("[0-9a-f-]+")));

// Bad: Only verify endpoint was called
wireMock.verify(postRequestedFor(urlEqualTo("/v1/payments")));
```

### 4. Use Realistic Test Data

```java
// Good: Use realistic test data that matches production
PaymentRequest request = PaymentRequest.builder()
    .orderId(UUID.randomUUID())
    .amount(new BigDecimal("129.99")) // Realistic amount
    .currency("USD")
    .cardToken("card_1234567890abcdef") // Realistic token format
    .merchantId("merchant_123")
    .description("Order #12345 payment")
    .build();

// Bad: Use unrealistic test data
PaymentRequest request = PaymentRequest.builder()
    .amount(BigDecimal.valueOf(1)) // Unrealistic amount
    .currency("XXX") // Invalid currency
    .build();
```

### 5. Test Authentication Flows

```java
@Test
void shouldHandleAuthenticationFlows() {
    // Test initial authentication
    testInitialAuth();
    
    // Test token refresh
    testTokenRefresh();
    
    // Test authentication failure
    testAuthFailure();
}
```

## Related Documentation

- [Integration Testing Fundamentals](Integration-Testing-Fundamentals.md) - Core integration testing principles
- [Infrastructure Testing](Infrastructure-Testing.md) - Unit testing external service clients
- [API Integration Testing](API-Integration-Testing.md) - Testing complete API workflows