# WebClient Guide

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 12 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Spring Boot basics, HTTP fundamentals, reactive programming concepts  
> **🎯 Key Topics:** WebClient configuration, reactive patterns, error handling, testing
> 
> **📊 Complexity:** Grade 13 • Advanced difficulty

## Overview

WebClient is Spring's modern non-blocking (reactive) HTTP client for making requests to external services. It provides a functional API for building HTTP requests and supports both reactive and blocking usage patterns.

**Recommendation**: Prefer WebClient for all new projects, even in non-reactive applications, as it is the future of HTTP clients in Spring.

### When to Use WebClient

| Use When | Advantages | Disadvantages |
|----------|------------|---------------|
| Spring WebFlux applications, high concurrency needs | Non-blocking, composable, modern | Steeper learning curve, reactive paradigm |

## WebClient Configuration

### Basic WebClient Setup

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder
            .baseUrl("https://api.example.com")
            .defaultHeader("User-Agent", "order-service/1.0")
            .build();
    }
}
```

### Advanced WebClient with Connection Pooling

```java
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class AdvancedWebClientConfig {

    @Bean
    public ConnectionProvider connectionProvider() {
        return ConnectionProvider.builder("custom-pool")
            .maxConnections(200)              // Maximum total connections
            .maxIdleTime(Duration.ofSeconds(60))
            .maxLifeTime(Duration.ofMinutes(10))
            .pendingAcquireMaxCount(500)
            .pendingAcquireTimeout(Duration.ofSeconds(45))
            .evictInBackground(Duration.ofSeconds(120))
            .build();
    }

    @Bean
    public HttpClient httpClient(ConnectionProvider connectionProvider) {
        return HttpClient.create(connectionProvider)
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
            .responseTimeout(Duration.ofSeconds(30))
            .doOnConnected(conn -> 
                conn.addHandlerLast(new ReadTimeoutHandler(30, TimeUnit.SECONDS))
                    .addHandlerLast(new WriteTimeoutHandler(30, TimeUnit.SECONDS))
            );
    }

    @Bean
    public WebClient webClient(HttpClient httpClient) {
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
    }
}
```

### Per-Service WebClient Configuration

```java
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class ServiceWebClientsConfig {

    @Bean
    @Qualifier("paymentServiceWebClient")
    public WebClient paymentServiceWebClient(
            WebClient.Builder builder,
            PaymentServiceProperties properties) {
        
        HttpClient httpClient = HttpClient.create()
            .responseTimeout(properties.timeout());
        
        return builder
            .baseUrl(properties.baseUrl())
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
    }

    @Bean
    @Qualifier("customerServiceWebClient")
    public WebClient customerServiceWebClient(
            WebClient.Builder builder,
            CustomerServiceProperties properties) {
        
        HttpClient httpClient = HttpClient.create()
            .responseTimeout(properties.timeout());
        
        return builder
            .baseUrl(properties.baseUrl())
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
    }
}
```

## WebClient Usage Patterns

### Reactive HTTP Operations

```java
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactivePaymentServiceClient {

    @Qualifier("paymentServiceWebClient")
    private final WebClient webClient;

    public Mono<PaymentResponse> processPayment(PaymentRequest request) {
        log.info("Processing payment request: {}", request.getTransactionId());
        
        return webClient
            .post()
            .uri("/v1/payments")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResponse.class)
            .doOnSuccess(response -> 
                log.info("Payment processed: {}", response.getPaymentId())
            )
            .doOnError(error -> 
                log.error("Payment processing failed", error)
            );
    }

    public Mono<PaymentStatus> getPaymentStatus(UUID paymentId) {
        log.info("Fetching payment status: {}", paymentId);
        
        return webClient
            .get()
            .uri("/v1/payments/{paymentId}/status", paymentId)
            .retrieve()
            .bodyToMono(PaymentStatus.class);
    }

    public Mono<Void> updatePayment(UUID paymentId, PaymentUpdate update) {
        log.info("Updating payment: {}", paymentId);
        
        return webClient
            .put()
            .uri("/v1/payments/{paymentId}", paymentId)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(update)
            .retrieve()
            .bodyToMono(Void.class);
    }

    public Mono<Void> cancelPayment(UUID paymentId) {
        log.info("Cancelling payment: {}", paymentId);
        
        return webClient
            .delete()
            .uri("/v1/payments/{paymentId}", paymentId)
            .retrieve()
            .bodyToMono(Void.class);
    }
}
```

### Blocking Usage of WebClient

WebClient can be used in imperative code when needed:

```java
@Service
@RequiredArgsConstructor
public class BlockingWebClientExample {

    private final WebClient webClient;

    public PaymentResponse processPaymentBlocking(PaymentRequest request) {
        return webClient
            .post()
            .uri("/v1/payments")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResponse.class)
            .block(Duration.ofSeconds(30)); // Blocks for up to 30 seconds
    }
}
```

**Warning**: Blocking WebClient defeats its non-blocking benefits. Use only when necessary.

## Error Handling Patterns

### WebClient Error Handling

```java
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class ReactiveResilientPaymentClient {

    private final WebClient webClient;

    public Mono<PaymentResponse> processPayment(PaymentRequest request) {
        return webClient
            .post()
            .uri("/v1/payments")
            .bodyValue(request)
            .retrieve()
            .onStatus(
                HttpStatus.BAD_REQUEST::equals,
                response -> response.bodyToMono(String.class)
                    .flatMap(body -> Mono.error(
                        new PaymentValidationException("Invalid payment: " + body)
                    ))
            )
            .onStatus(
                HttpStatus.NOT_FOUND::equals,
                response -> Mono.error(
                    new PaymentNotFoundException("Payment not found")
                )
            )
            .onStatus(
                HttpStatus::is5xxServerError,
                response -> response.bodyToMono(String.class)
                    .flatMap(body -> Mono.error(
                        new PaymentServiceException("Service error: " + body)
                    ))
            )
            .bodyToMono(PaymentResponse.class)
            .onErrorMap(
                WebClientResponseException.class,
                this::mapWebClientException
            );
    }

    private Exception mapWebClientException(WebClientResponseException ex) {
        return switch (ex.getStatusCode().value()) {
            case 400 -> new PaymentValidationException("Invalid payment request");
            case 404 -> new PaymentNotFoundException("Payment not found");
            case 409 -> new PaymentConflictException("Payment conflict");
            case 500, 502, 503, 504 -> new PaymentServiceException("Service unavailable");
            default -> new PaymentException("Unexpected error: " + ex.getStatusText());
        };
    }
}
```

## Timeout Configuration

### WebClient Timeouts

```java
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class TimeoutControlledClient {

    private final WebClient webClient;

    public Mono<PaymentResponse> processPaymentWithTimeout(
            PaymentRequest request, 
            Duration timeout) {
        
        return webClient
            .post()
            .uri("/v1/payments")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResponse.class)
            .timeout(timeout)
            .onErrorResume(TimeoutException.class, ex -> {
                log.error("Payment request timed out after {}", timeout);
                return Mono.error(new PaymentTimeoutException("Request timed out"));
            });
    }
}
```

## Testing HTTP Clients

### WebClient Testing with WireMock

```java
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import reactor.test.StepVerifier;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

class ReactivePaymentServiceClientTest {

    private WireMockServer wireMockServer;
    private ReactivePaymentServiceClient client;

    @BeforeEach
    void setUp() {
        wireMockServer = new WireMockServer(8089);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8089);
        
        WebClient webClient = WebClient.builder()
            .baseUrl("http://localhost:8089")
            .build();
        
        client = new ReactivePaymentServiceClient(webClient);
    }

    @AfterEach
    void tearDown() {
        wireMockServer.stop();
    }

    @Test
    void shouldProcessPaymentReactively() {
        // Given
        PaymentRequest request = new PaymentRequest();
        String responseBody = """
            {
                "paymentId": "123e4567-e89b-12d3-a456-426614174000",
                "status": "SUCCESS"
            }
            """;

        stubFor(post(urlEqualTo("/v1/payments"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(responseBody)));

        // When/Then
        StepVerifier.create(client.processPayment(request))
            .assertNext(response -> {
                assertThat(response.getStatus()).isEqualTo("SUCCESS");
            })
            .verifyComplete();

        verify(postRequestedFor(urlEqualTo("/v1/payments")));
    }

    @Test
    void shouldHandleErrorResponse() {
        // Given
        PaymentRequest request = new PaymentRequest();

        stubFor(post(urlEqualTo("/v1/payments"))
            .willReturn(aResponse()
                .withStatus(500)));

        // When/Then
        StepVerifier.create(client.processPayment(request))
            .expectError(PaymentServiceException.class)
            .verify();
    }
}
```

## Best Practices

### WebClient Best Practices

1. **Configure connection providers**: Custom connection pools for high-concurrency scenarios
2. **Set appropriate timeouts**: Response timeout, connection timeout, and read/write timeouts
3. **Use reactive error handling**: Handle errors reactively with proper operators
4. **Avoid blocking**: Only use `.block()` when absolutely necessary
5. **Implement backpressure**: Handle slow consumers appropriately
6. **Chain resilience operators**: Apply circuit breakers, retries, and rate limiters (see [Resilience Guide](./http-client-resilience.md))
7. **Test reactively**: Use StepVerifier for testing reactive streams

## Common Anti-patterns

### Anti-pattern: Blocking in Reactive Code

```java
// Bad: Blocking defeats reactive benefits
public Mono<PaymentResponse> processPayment(PaymentRequest request) {
    PaymentResponse response = webClient
        .post()
        .uri("/v1/payments")
        .bodyValue(request)
        .retrieve()
        .bodyToMono(PaymentResponse.class)
        .block(); // Don't block in reactive pipelines
    
    return Mono.just(response);
}

// Good: Stay reactive
public Mono<PaymentResponse> processPayment(PaymentRequest request) {
    return webClient
        .post()
        .uri("/v1/payments")
        .bodyValue(request)
        .retrieve()
        .bodyToMono(PaymentResponse.class);
}
```

## Related Documentation

- [RestClient Guide](./restclient-guide.md) - Traditional blocking HTTP client
- [HTTP Client Resilience](./http-client-resilience.md) - Circuit breakers, retries, rate limiting
- [HTTP Client Best Practices](../../../guides/api-design/advanced-patterns/http-client-best-practices.md) - Language-agnostic patterns
- [External Services Configuration](../configuration/external-services.md) - Service integration configuration
- [Reactive Error Handling](../error-handling/reactive-error-handling.md) - WebFlux error handling patterns
- [Reactive Testing](../testing/specialized-testing/reactive-testing.md) - Testing reactive HTTP clients

---

**Next Steps**: Review [HTTP Client Resilience](./http-client-resilience.md) for production-ready resilience patterns like circuit breakers and retries.
