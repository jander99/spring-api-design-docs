# External Services Configuration

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 18 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Authentication
> 
> **📊 Complexity:** 10.6 grade level • 2.3% technical density • fairly difficult

## Overview

This guide shows you how to connect Spring Boot services to external APIs. You will learn to set up WebClient, add retry logic, and use circuit breakers. These patterns help your services talk to each other reliably.

## External Service Properties

### Define Service Settings

First, you define properties for each external service. These properties control timeouts, retries, and circuit breakers.

```yaml
# application.yml
app:
  integration:
    payment-service:
      base-url: ${PAYMENT_SERVICE_URL:http://localhost:8081}
      timeout: ${PAYMENT_SERVICE_TIMEOUT:PT30S}
      retry-attempts: ${PAYMENT_SERVICE_RETRY:3}
      circuit-breaker:
        enabled: ${PAYMENT_SERVICE_CB_ENABLED:true}
        failure-rate-threshold: ${PAYMENT_SERVICE_CB_FAILURE_RATE:50}
        minimum-number-of-calls: ${PAYMENT_SERVICE_CB_MIN_CALLS:10}
    
    customer-service:
      base-url: ${CUSTOMER_SERVICE_URL:http://localhost:8082}
      timeout: ${CUSTOMER_SERVICE_TIMEOUT:PT10S}
      retry-attempts: ${CUSTOMER_SERVICE_RETRY:2}
      circuit-breaker:
        enabled: ${CUSTOMER_SERVICE_CB_ENABLED:true}
        failure-rate-threshold: ${CUSTOMER_SERVICE_CB_FAILURE_RATE:60}
        minimum-number-of-calls: ${CUSTOMER_SERVICE_CB_MIN_CALLS:5}
    
    notification-service:
      base-url: ${NOTIFICATION_SERVICE_URL:http://localhost:8083}
      timeout: ${NOTIFICATION_SERVICE_TIMEOUT:PT5S}
      retry-attempts: ${NOTIFICATION_SERVICE_RETRY:1}
      async: ${NOTIFICATION_SERVICE_ASYNC:true}
```

### Create Properties Class

Next, create a Java class to hold these settings. Spring validates the properties when your app starts.

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Duration;

@ConfigurationProperties(prefix = "app.integration")
@Validated
public record IntegrationProperties(
    @Valid @NotNull PaymentService paymentService,
    @Valid @NotNull CustomerService customerService,
    @Valid @NotNull NotificationService notificationService
) {
    
    public record PaymentService(
        @NotBlank String baseUrl,
        @NotNull Duration timeout,
        @Positive int retryAttempts,
        @Valid @NotNull CircuitBreaker circuitBreaker
    ) {}
    
    public record CustomerService(
        @NotBlank String baseUrl,
        @NotNull Duration timeout,
        @Positive int retryAttempts,
        @Valid @NotNull CircuitBreaker circuitBreaker
    ) {}
    
    public record NotificationService(
        @NotBlank String baseUrl,
        @NotNull Duration timeout,
        @Positive int retryAttempts,
        boolean async
    ) {}
    
    public record CircuitBreaker(
        boolean enabled,
        @Positive int failureRateThreshold,
        @Positive int minimumNumberOfCalls
    ) {}
}
```

## WebClient Configuration

### Basic Setup

WebClient is Spring's HTTP client. It makes calls to external services. Configure one WebClient bean for each service you call.

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;

@Configuration
public class WebClientConfig {

    private final IntegrationProperties integrationProperties;

    public WebClientConfig(IntegrationProperties integrationProperties) {
        this.integrationProperties = integrationProperties;
    }

    @Bean
    public WebClient paymentServiceClient() {
        return createWebClient(
            integrationProperties.paymentService().baseUrl(),
            integrationProperties.paymentService().timeout()
        );
    }

    @Bean
    public WebClient customerServiceClient() {
        return createWebClient(
            integrationProperties.customerService().baseUrl(),
            integrationProperties.customerService().timeout()
        );
    }

    @Bean
    public WebClient notificationServiceClient() {
        return createWebClient(
            integrationProperties.notificationService().baseUrl(),
            integrationProperties.notificationService().timeout()
        );
    }

    private WebClient createWebClient(String baseUrl, Duration timeout) {
        ConnectionProvider connectionProvider = ConnectionProvider.builder("custom")
            .maxConnections(50)
            .maxIdleTime(Duration.ofSeconds(20))
            .maxLifeTime(Duration.ofSeconds(60))
            .pendingAcquireTimeout(Duration.ofSeconds(60))
            .evictInBackground(Duration.ofSeconds(120))
            .build();

        HttpClient httpClient = HttpClient.create(connectionProvider)
            .responseTimeout(timeout);

        return WebClient.builder()
            .baseUrl(baseUrl)
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
    }
}
```

### Add Logging and Error Handling

You can add filters to log requests and handle errors. Filters run before and after each HTTP call.

```java
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class AdvancedWebClientConfig {

    @Bean
    public WebClient customWebClient() {
        HttpClient httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
            .responseTimeout(Duration.ofMillis(5000))
            .doOnConnected(conn -> 
                conn.addHandlerLast(new ReadTimeoutHandler(5000, TimeUnit.MILLISECONDS))
                    .addHandlerLast(new WriteTimeoutHandler(5000, TimeUnit.MILLISECONDS)));

        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .filter(logRequest())
            .filter(logResponse())
            .filter(errorHandler())
            .build();
    }

    private ExchangeFilterFunction logRequest() {
        return ExchangeFilterFunction.ofRequestProcessor(clientRequest -> {
            log.debug("Request: {} {}", clientRequest.method(), clientRequest.url());
            clientRequest.headers().forEach((name, values) -> 
                values.forEach(value -> log.debug("{}={}", name, value)));
            return Mono.just(clientRequest);
        });
    }

    private ExchangeFilterFunction logResponse() {
        return ExchangeFilterFunction.ofResponseProcessor(clientResponse -> {
            log.debug("Response Status: {}", clientResponse.statusCode());
            return Mono.just(clientResponse);
        });
    }

    private ExchangeFilterFunction errorHandler() {
        return ExchangeFilterFunction.ofResponseProcessor(clientResponse -> {
            if (clientResponse.statusCode().is4xxClientError()) {
                return clientResponse.bodyToMono(String.class)
                    .flatMap(errorBody -> Mono.error(
                        new ClientException("Client error: " + errorBody)));
            } else if (clientResponse.statusCode().is5xxServerError()) {
                return Mono.error(new ServerException("Server error"));
            }
            return Mono.just(clientResponse);
        });
    }
}
```

## Service Integration Patterns

### Call Services Synchronously

Use this pattern when you need immediate results. The code waits for a response before continuing.

```java
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class PaymentServiceClient {

    private final WebClient paymentServiceClient;
    private final IntegrationProperties.PaymentService properties;

    public PaymentServiceClient(
            WebClient paymentServiceClient,
            IntegrationProperties integrationProperties) {
        this.paymentServiceClient = paymentServiceClient;
        this.properties = integrationProperties.paymentService();
    }

    public Mono<PaymentResponse> processPayment(PaymentRequest request) {
        return paymentServiceClient
            .post()
            .uri("/v1/payments")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResponse.class)
            .timeout(properties.timeout())
            .retryWhen(Retry.backoff(properties.retryAttempts(), Duration.ofSeconds(1))
                .filter(throwable -> throwable instanceof ConnectException))
            .onErrorMap(WebClientResponseException.class, this::mapException);
    }

    public Mono<PaymentStatus> getPaymentStatus(String paymentId) {
        return paymentServiceClient
            .get()
            .uri("/v1/payments/{paymentId}/status", paymentId)
            .retrieve()
            .bodyToMono(PaymentStatus.class)
            .timeout(properties.timeout());
    }

    private Exception mapException(WebClientResponseException ex) {
        return switch (ex.getStatusCode()) {
            case BAD_REQUEST -> new PaymentValidationException("Invalid payment request");
            case NOT_FOUND -> new PaymentNotFoundException("Payment not found");
            case INTERNAL_SERVER_ERROR -> new PaymentServiceException("Payment service error");
            default -> new PaymentServiceException("Unexpected error: " + ex.getStatusText());
        };
    }
}
```

### Call Services Asynchronously

Use this pattern when you don't need immediate results. The code continues without waiting for a response.

```java
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.concurrent.CompletableFuture;

@Service
public class NotificationServiceClient {

    private final WebClient notificationServiceClient;
    private final IntegrationProperties.NotificationService properties;

    public NotificationServiceClient(
            WebClient notificationServiceClient,
            IntegrationProperties integrationProperties) {
        this.notificationServiceClient = notificationServiceClient;
        this.properties = integrationProperties.notificationService();
    }

    @Async
    public CompletableFuture<Void> sendNotificationAsync(NotificationRequest request) {
        return sendNotification(request)
            .toFuture()
            .thenApply(response -> null);
    }

    public Mono<NotificationResponse> sendNotification(NotificationRequest request) {
        return notificationServiceClient
            .post()
            .uri("/v1/notifications")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(NotificationResponse.class)
            .timeout(properties.timeout())
            .onErrorResume(throwable -> {
                log.warn("Failed to send notification: {}", throwable.getMessage());
                return Mono.empty(); // Fail silently for notifications
            });
    }
}
```

## Circuit Breaker Configuration

### Protect Your Service

Circuit breakers stop calls to failing services. When a service fails too often, the breaker opens. This prevents cascading failures in your system.

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class CircuitBreakerConfig {

    private final IntegrationProperties integrationProperties;

    public CircuitBreakerConfig(IntegrationProperties integrationProperties) {
        this.integrationProperties = integrationProperties;
    }

    @Bean
    public CircuitBreakerRegistry circuitBreakerRegistry() {
        return CircuitBreakerRegistry.ofDefaults();
    }

    @Bean
    public CircuitBreaker paymentServiceCircuitBreaker(CircuitBreakerRegistry registry) {
        var cbProperties = integrationProperties.paymentService().circuitBreaker();
        
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(cbProperties.failureRateThreshold())
            .minimumNumberOfCalls(cbProperties.minimumNumberOfCalls())
            .slidingWindowSize(20)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .permittedNumberOfCallsInHalfOpenState(5)
            .automaticTransitionFromOpenToHalfOpenEnabled(true)
            .build();

        return registry.circuitBreaker("paymentService", config);
    }

    @Bean
    public CircuitBreaker customerServiceCircuitBreaker(CircuitBreakerRegistry registry) {
        var cbProperties = integrationProperties.customerService().circuitBreaker();
        
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(cbProperties.failureRateThreshold())
            .minimumNumberOfCalls(cbProperties.minimumNumberOfCalls())
            .slidingWindowSize(15)
            .waitDurationInOpenState(Duration.ofSeconds(20))
            .permittedNumberOfCallsInHalfOpenState(3)
            .build();

        return registry.circuitBreaker("customerService", config);
    }
}
```

### Use Circuit Breaker with WebClient

Apply the circuit breaker to your service calls. If the breaker opens, return a fallback response.

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.reactor.circuitbreaker.operator.CircuitBreakerOperator;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class ResilientPaymentService {

    private final PaymentServiceClient paymentServiceClient;
    private final CircuitBreaker circuitBreaker;

    public ResilientPaymentService(
            PaymentServiceClient paymentServiceClient,
            CircuitBreaker paymentServiceCircuitBreaker) {
        this.paymentServiceClient = paymentServiceClient;
        this.circuitBreaker = paymentServiceCircuitBreaker;
    }

    public Mono<PaymentResponse> processPaymentWithCircuitBreaker(PaymentRequest request) {
        return paymentServiceClient.processPayment(request)
            .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
            .onErrorResume(Exception.class, this::handlePaymentFailure);
    }

    private Mono<PaymentResponse> handlePaymentFailure(Exception ex) {
        log.error("Payment service failed: {}", ex.getMessage());
        
        if (ex instanceof CallNotPermittedException) {
            // Circuit breaker is open
            return Mono.just(PaymentResponse.failed("Service temporarily unavailable"));
        }
        
        return Mono.just(PaymentResponse.failed("Payment processing failed"));
    }
}
```

## Load Balancing Configuration

### Distribute Load Across Instances

Load balancers spread requests across multiple service instances. This improves reliability and performance.

```java
import org.springframework.cloud.loadbalancer.annotation.LoadBalancerClient;
import org.springframework.cloud.loadbalancer.core.ServiceInstanceListSupplier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@LoadBalancerClient(name = "payment-service", configuration = PaymentServiceLoadBalancerConfig.class)
public class LoadBalancerConfig {

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    @Bean
    public WebClient paymentServiceWebClient(WebClient.Builder builder) {
        return builder
            .baseUrl("http://payment-service")
            .build();
    }
}

@Configuration
class PaymentServiceLoadBalancerConfig {

    @Bean
    public ServiceInstanceListSupplier discoveryClientServiceInstanceListSupplier(
            ConfigurableApplicationContext context) {
        return ServiceInstanceListSupplier.builder()
            .withDiscoveryClient()
            .withCaching()
            .build(context);
    }
}
```

## Retry Configuration

### Retry Failed Requests

Retries help handle temporary network issues. Configure which errors trigger retries and how long to wait between attempts.

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.RetryPolicy;
import org.springframework.retry.backoff.BackOffPolicy;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

import java.util.Map;

@Configuration
public class RetryConfig {

    @Bean
    public RetryTemplate retryTemplate() {
        RetryTemplate retryTemplate = new RetryTemplate();
        retryTemplate.setRetryPolicy(retryPolicy());
        retryTemplate.setBackOffPolicy(backOffPolicy());
        return retryTemplate;
    }

    private RetryPolicy retryPolicy() {
        Map<Class<? extends Throwable>, Boolean> retryableExceptions = Map.of(
            ConnectException.class, true,
            SocketTimeoutException.class, true,
            WebClientRequestException.class, true
        );
        
        SimpleRetryPolicy policy = new SimpleRetryPolicy(3, retryableExceptions);
        return policy;
    }

    private BackOffPolicy backOffPolicy() {
        ExponentialBackOffPolicy policy = new ExponentialBackOffPolicy();
        policy.setInitialInterval(1000);
        policy.setMaxInterval(10000);
        policy.setMultiplier(2.0);
        return policy;
    }
}
```

## Service Health Monitoring

### Monitor External Services

Health checks tell you if external services are up or down. Spring Actuator runs these checks automatically.

```java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class PaymentServiceHealthIndicator implements HealthIndicator {

    private final WebClient paymentServiceClient;

    public PaymentServiceHealthIndicator(WebClient paymentServiceClient) {
        this.paymentServiceClient = paymentServiceClient;
    }

    @Override
    public Health health() {
        try {
            String response = paymentServiceClient
                .get()
                .uri("/actuator/health")
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(5))
                .block();

            return Health.up()
                .withDetail("payment-service", "Available")
                .withDetail("response", response)
                .build();
        } catch (Exception ex) {
            return Health.down(ex)
                .withDetail("payment-service", "Unavailable")
                .withDetail("error", ex.getMessage())
                .build();
        }
    }
}
```

## Service Configuration by Environment

### Development Settings

Use relaxed settings in development. Disable circuit breakers and retries for faster debugging.

```yaml
# application-development.yml
app:
  integration:
    payment-service:
      base-url: http://localhost:8081
      timeout: PT30S
      retry-attempts: 1
      circuit-breaker:
        enabled: false
    
    customer-service:
      base-url: http://localhost:8082
      timeout: PT10S
      retry-attempts: 1
      circuit-breaker:
        enabled: false

logging:
  level:
    org.springframework.web.reactive.function.client: DEBUG
```

### Production Settings

Use strict settings in production. Enable circuit breakers and retries to handle real-world failures.

```yaml
# application-production.yml
app:
  integration:
    payment-service:
      base-url: ${PAYMENT_SERVICE_URL}
      timeout: PT10S
      retry-attempts: 3
      circuit-breaker:
        enabled: true
        failure-rate-threshold: 50
        minimum-number-of-calls: 10
    
    customer-service:
      base-url: ${CUSTOMER_SERVICE_URL}
      timeout: PT5S
      retry-attempts: 2
      circuit-breaker:
        enabled: true
        failure-rate-threshold: 60
        minimum-number-of-calls: 5

logging:
  level:
    org.springframework.web.reactive.function.client: WARN
```

## Service Authentication Configuration

### Secure Service Calls with OAuth2

OAuth2 secures communication between services. Your service gets a token before making requests.

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.reactive.function.client.ServletOAuth2AuthorizedClientExchangeFilterFunction;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class OAuth2ClientConfig {

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        ClientRegistration registration = ClientRegistration
            .withRegistrationId("payment-service")
            .tokenUri("http://auth-server/oauth/token")
            .clientId("order-service")
            .clientSecret("client-secret")
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
            .scope("payment:process")
            .build();

        return new InMemoryClientRegistrationRepository(registration);
    }

    @Bean
    public WebClient oauth2WebClient(ClientRegistrationRepository repository) {
        ServletOAuth2AuthorizedClientExchangeFilterFunction oauth2 = 
            new ServletOAuth2AuthorizedClientExchangeFilterFunction(repository);
        oauth2.setDefaultClientRegistrationId("payment-service");

        return WebClient.builder()
            .apply(oauth2.oauth2Configuration())
            .build();
    }
}
```

## Testing External Services

### Test with Mock Services

WireMock creates fake external services for testing. Your tests run without calling real APIs.

```java
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
class PaymentServiceClientIntegrationTest {

    private WireMockServer wireMockServer;

    @BeforeEach
    void setUp() {
        wireMockServer = new WireMockServer(8089);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8089);
    }

    @AfterEach
    void tearDown() {
        wireMockServer.stop();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("app.integration.payment-service.base-url", 
            () -> "http://localhost:8089");
    }

    @Test
    void shouldProcessPaymentSuccessfully() {
        // Given
        WireMock.stubFor(WireMock.post(WireMock.urlEqualTo("/v1/payments"))
            .willReturn(WireMock.aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"id\":\"123\",\"status\":\"SUCCESS\"}")));

        // Test implementation
    }
}
```

## External Service Best Practices

### 1. Set Timeouts

Always configure timeouts for external calls. Use shorter timeouts for less important services. This prevents slow services from blocking your application.

### 2. Handle Errors

Add circuit breakers to protect against failing services. Use retry logic with exponential backoff for temporary failures. Fail fast when errors are permanent.

### 3. Secure Communications

Use OAuth2 to authenticate service calls. Always use SSL/TLS for encrypted connections. Store credentials in environment variables, never in code.

### 4. Monitor Services

Add health checks for all external dependencies. Track response times and error rates. Use distributed tracing to debug issues across services.

## Common Integration Anti-patterns

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| No timeouts | Hanging requests | Configure appropriate timeouts |
| No retry logic | Temporary failures cause errors | Implement retry with backoff |
| No circuit breaker | Cascading failures | Use circuit breaker pattern |
| Synchronous calls everywhere | Poor performance | Use async where appropriate |
| No error handling | Poor user experience | Implement proper error handling |

## Related Documentation

- [Configuration Principles](configuration-principles.md) - Core configuration concepts
- [Security Configuration](security-configuration.md) - Service authentication and authorization
- [Observability Configuration](observability-configuration.md) - Service monitoring and tracing
- [Environment Profiles](environment-profiles.md) - Environment-specific service configuration
- [HTTP Client Patterns](../http-clients/http-client-patterns.md) - Complete HTTP client implementation guide

## Summary

These patterns help you build reliable service integrations. Use WebClient for HTTP calls. Add retries for temporary failures. Use circuit breakers to prevent cascading failures. Monitor all external dependencies for production readiness.