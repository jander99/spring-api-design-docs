# HTTP Client Patterns

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 33 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Spring Boot basics, HTTP fundamentals, reactive programming concepts  
> **🎯 Key Topics:** RestTemplate, WebClient, Resilience4j, connection pooling
> 
> **📊 Complexity:** Grade 14 • 1.2% technical density • Difficult

## Overview

Spring provides two primary HTTP client implementations for making requests to external services:

- **RestTemplate**: Traditional blocking (imperative) HTTP client for Spring MVC applications
- **WebClient**: Non-blocking (reactive) HTTP client for Spring WebFlux and modern applications

This guide covers both approaches with production-ready patterns for resilience, error handling, timeouts, connection pooling, and observability.

### When to Use Each Client

| Client | Use When | Advantages | Disadvantages |
|--------|----------|------------|---------------|
| **RestTemplate** | Spring MVC applications, synchronous workflows | Simple API, familiar patterns | Blocking I/O, deprecated in favor of WebClient |
| **WebClient** | Spring WebFlux applications, high concurrency needs | Non-blocking, composable, modern | Steeper learning curve, reactive paradigm |

**Note**: While RestTemplate is in maintenance mode, it remains widely used in existing Spring MVC applications. For new projects, prefer WebClient even in non-reactive applications.

## RestTemplate Configuration

### Basic RestTemplate Setup

```java
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(30))
            .build();
    }
}
```

### Advanced RestTemplate with Apache HttpClient

For production environments, use Apache HttpClient for connection pooling:

```java
import org.apache.hc.client5.http.classic.HttpClient;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.core5.util.Timeout;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AdvancedRestTemplateConfig {

    @Bean
    public PoolingHttpClientConnectionManager connectionManager() {
        PoolingHttpClientConnectionManager connectionManager = 
            new PoolingHttpClientConnectionManager();
        
        // Maximum total connections
        connectionManager.setMaxTotal(200);
        
        // Maximum connections per route (per host)
        connectionManager.setDefaultMaxPerRoute(50);
        
        return connectionManager;
    }

    @Bean
    public RequestConfig requestConfig() {
        return RequestConfig.custom()
            .setConnectionRequestTimeout(Timeout.ofSeconds(5))
            .setConnectTimeout(Timeout.ofSeconds(5))
            .setResponseTimeout(Timeout.ofSeconds(30))
            .build();
    }

    @Bean
    public HttpClient httpClient(
            PoolingHttpClientConnectionManager connectionManager,
            RequestConfig requestConfig) {
        return HttpClientBuilder.create()
            .setConnectionManager(connectionManager)
            .setDefaultRequestConfig(requestConfig)
            .evictExpiredConnections()
            .evictIdleConnections(Timeout.ofSeconds(60))
            .build();
    }

    @Bean
    public RestTemplate restTemplate(HttpClient httpClient) {
        HttpComponentsClientHttpRequestFactory factory = 
            new HttpComponentsClientHttpRequestFactory(httpClient);
        
        return new RestTemplate(factory);
    }
}
```

### Per-Service RestTemplate Configuration

Create dedicated RestTemplate beans for different services:

```java
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class ServiceClientsConfig {

    @Bean
    @Qualifier("paymentServiceRestTemplate")
    public RestTemplate paymentServiceRestTemplate(
            RestTemplateBuilder builder,
            PaymentServiceProperties properties) {
        
        return builder
            .rootUri(properties.baseUrl())
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(properties.timeout())
            .build();
    }

    @Bean
    @Qualifier("customerServiceRestTemplate")
    public RestTemplate customerServiceRestTemplate(
            RestTemplateBuilder builder,
            CustomerServiceProperties properties) {
        
        return builder
            .rootUri(properties.baseUrl())
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(properties.timeout())
            .build();
    }
}

@ConfigurationProperties(prefix = "app.integration.payment-service")
record PaymentServiceProperties(
    String baseUrl,
    Duration timeout
) {}

@ConfigurationProperties(prefix = "app.integration.customer-service")
record CustomerServiceProperties(
    String baseUrl,
    Duration timeout
) {}
```

## RestTemplate Usage Patterns

### Basic HTTP Operations

```java
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceClient {

    @Qualifier("paymentServiceRestTemplate")
    private final RestTemplate restTemplate;

    public PaymentResponse processPayment(PaymentRequest request) {
        log.info("Processing payment request: {}", request.getTransactionId());
        
        ResponseEntity<PaymentResponse> response = restTemplate.postForEntity(
            "/v1/payments",
            request,
            PaymentResponse.class
        );
        
        if (response.getStatusCode().is2xxSuccessful()) {
            return response.getBody();
        }
        
        throw new PaymentException("Payment processing failed");
    }

    public PaymentStatus getPaymentStatus(UUID paymentId) {
        log.info("Fetching payment status: {}", paymentId);
        
        return restTemplate.getForObject(
            "/v1/payments/{paymentId}/status",
            PaymentStatus.class,
            paymentId
        );
    }

    public void updatePayment(UUID paymentId, PaymentUpdate update) {
        log.info("Updating payment: {}", paymentId);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<PaymentUpdate> entity = new HttpEntity<>(update, headers);
        
        restTemplate.exchange(
            "/v1/payments/{paymentId}",
            HttpMethod.PUT,
            entity,
            Void.class,
            paymentId
        );
    }

    public void cancelPayment(UUID paymentId) {
        log.info("Cancelling payment: {}", paymentId);
        
        restTemplate.delete("/v1/payments/{paymentId}", paymentId);
    }
}
```

### Custom Headers and Request Customization

```java
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class AuthenticatedServiceClient {

    private final RestTemplate restTemplate;
    private final TokenProvider tokenProvider;

    public CustomerResponse getCustomer(UUID customerId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(tokenProvider.getAccessToken());
        headers.set("X-Request-ID", UUID.randomUUID().toString());
        headers.set("X-Correlation-ID", getCorrelationId());
        
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        
        ResponseEntity<CustomerResponse> response = restTemplate.exchange(
            "/v1/customers/{customerId}",
            HttpMethod.GET,
            entity,
            CustomerResponse.class,
            customerId
        );
        
        return response.getBody();
    }

    private String getCorrelationId() {
        // Extract from MDC or generate new one
        return MDC.get("correlationId");
    }
}
```

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

### RestTemplate Error Handling

```java
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class ResilientPaymentClient {

    private final RestTemplate restTemplate;

    public PaymentResponse processPayment(PaymentRequest request) {
        try {
            ResponseEntity<PaymentResponse> response = restTemplate.postForEntity(
                "/v1/payments",
                request,
                PaymentResponse.class
            );
            
            return response.getBody();
            
        } catch (HttpClientErrorException ex) {
            // 4xx errors
            if (ex.getStatusCode() == HttpStatus.BAD_REQUEST) {
                throw new PaymentValidationException("Invalid payment request", ex);
            } else if (ex.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new PaymentNotFoundException("Payment resource not found", ex);
            }
            throw new PaymentException("Client error: " + ex.getStatusText(), ex);
            
        } catch (HttpServerErrorException ex) {
            // 5xx errors
            log.error("Payment service error: {}", ex.getStatusText());
            throw new PaymentServiceException("Payment service unavailable", ex);
            
        } catch (ResourceAccessException ex) {
            // Network errors, timeouts
            log.error("Network error accessing payment service", ex);
            throw new PaymentServiceException("Cannot reach payment service", ex);
        }
    }
}
```

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

## Resilience4j Integration

### Dependencies

```xml
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

### Circuit Breaker Configuration

```yaml
# application.yml
resilience4j:
  circuitbreaker:
    configs:
      default:
        sliding-window-type: COUNT_BASED
        sliding-window-size: 10
        minimum-number-of-calls: 5
        failure-rate-threshold: 50
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 3
        automatic-transition-from-open-to-half-open-enabled: true
        register-health-indicator: true
    
    instances:
      paymentService:
        base-config: default
        failure-rate-threshold: 60
        wait-duration-in-open-state: 60s
      
      customerService:
        base-config: default
        sliding-window-size: 20
        minimum-number-of-calls: 10
```

### Circuit Breaker with RestTemplate

```java
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CircuitBreakerPaymentClient {

    private final RestTemplate restTemplate;

    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    public PaymentResponse processPayment(PaymentRequest request) {
        return restTemplate.postForObject(
            "/v1/payments",
            request,
            PaymentResponse.class
        );
    }

    private PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
        log.warn("Payment circuit breaker activated, using fallback", ex);
        return PaymentResponse.failed("Service temporarily unavailable");
    }
}
```

### Circuit Breaker with WebClient

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.reactor.circuitbreaker.operator.CircuitBreakerOperator;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class ReactiveCircuitBreakerClient {

    private final WebClient webClient;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    public Mono<PaymentResponse> processPayment(PaymentRequest request) {
        CircuitBreaker circuitBreaker = 
            circuitBreakerRegistry.circuitBreaker("paymentService");
        
        return webClient
            .post()
            .uri("/v1/payments")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResponse.class)
            .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
            .onErrorResume(this::handleCircuitBreakerError);
    }

    private Mono<PaymentResponse> handleCircuitBreakerError(Throwable ex) {
        log.error("Payment service circuit breaker error", ex);
        return Mono.just(PaymentResponse.failed("Service temporarily unavailable"));
    }
}
```

## Retry Patterns

### Retry Configuration

```yaml
# application.yml
resilience4j:
  retry:
    configs:
      default:
        max-attempts: 3
        wait-duration: 1s
        enable-exponential-backoff: true
        exponential-backoff-multiplier: 2
        retry-exceptions:
          - org.springframework.web.client.ResourceAccessException
          - java.net.ConnectException
          - java.net.SocketTimeoutException
        ignore-exceptions:
          - com.example.exception.PaymentValidationException
    
    instances:
      paymentService:
        base-config: default
        max-attempts: 5
        wait-duration: 2s
```

### Retry with RestTemplate

```java
import io.github.resilience4j.retry.annotation.Retry;

@Service
@RequiredArgsConstructor
public class RetryablePaymentClient {

    private final RestTemplate restTemplate;

    @Retry(name = "paymentService", fallbackMethod = "paymentFallback")
    @CircuitBreaker(name = "paymentService")
    public PaymentResponse processPayment(PaymentRequest request) {
        log.info("Attempting payment processing");
        return restTemplate.postForObject(
            "/v1/payments",
            request,
            PaymentResponse.class
        );
    }

    private PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
        log.error("All retry attempts failed for payment", ex);
        return PaymentResponse.failed("Payment processing failed after retries");
    }
}
```

### Retry with WebClient

```java
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.reactor.retry.RetryOperator;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class ReactiveRetryableClient {

    private final WebClient webClient;
    private final RetryRegistry retryRegistry;

    public Mono<PaymentResponse> processPayment(PaymentRequest request) {
        Retry retry = retryRegistry.retry("paymentService");
        
        return webClient
            .post()
            .uri("/v1/payments")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResponse.class)
            .transformDeferred(RetryOperator.of(retry))
            .doOnError(ex -> 
                log.error("Payment failed after retries", ex)
            );
    }
}
```

### Spring Retry Alternative

For projects not using Resilience4j:

```xml
<dependency>
    <groupId>org.springframework.retry</groupId>
    <artifactId>spring-retry</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-aspects</artifactId>
</dependency>
```

```java
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;

@Service
public class SpringRetryPaymentClient {

    private final RestTemplate restTemplate;

    @Retryable(
        retryFor = {ResourceAccessException.class, HttpServerErrorException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public PaymentResponse processPayment(PaymentRequest request) {
        return restTemplate.postForObject(
            "/v1/payments",
            request,
            PaymentResponse.class
        );
    }

    @Recover
    public PaymentResponse recover(ResourceAccessException ex, PaymentRequest request) {
        log.error("Payment failed after all retries", ex);
        return PaymentResponse.failed("Service unavailable");
    }
}
```

## Rate Limiting

### Rate Limiter Configuration

```yaml
# application.yml
resilience4j:
  ratelimiter:
    configs:
      default:
        limit-for-period: 50
        limit-refresh-period: 1s
        timeout-duration: 5s
    
    instances:
      paymentService:
        base-config: default
        limit-for-period: 10
        limit-refresh-period: 1s
```

### Rate Limiter with RestTemplate

```java
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;

@Service
@RequiredArgsConstructor
public class RateLimitedClient {

    private final RestTemplate restTemplate;

    @RateLimiter(name = "paymentService", fallbackMethod = "rateLimitFallback")
    public PaymentResponse processPayment(PaymentRequest request) {
        return restTemplate.postForObject(
            "/v1/payments",
            request,
            PaymentResponse.class
        );
    }

    private PaymentResponse rateLimitFallback(PaymentRequest request, Exception ex) {
        log.warn("Rate limit exceeded for payment service");
        throw new RateLimitExceededException("Too many payment requests");
    }
}
```

### Rate Limiter with WebClient

```java
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import io.github.resilience4j.reactor.ratelimiter.operator.RateLimiterOperator;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class ReactiveRateLimitedClient {

    private final WebClient webClient;
    private final RateLimiterRegistry rateLimiterRegistry;

    public Mono<PaymentResponse> processPayment(PaymentRequest request) {
        RateLimiter rateLimiter = 
            rateLimiterRegistry.rateLimiter("paymentService");
        
        return webClient
            .post()
            .uri("/v1/payments")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResponse.class)
            .transformDeferred(RateLimiterOperator.of(rateLimiter));
    }
}
```

## Bulkhead Pattern

### Bulkhead Configuration

```yaml
# application.yml
resilience4j:
  bulkhead:
    configs:
      default:
        max-concurrent-calls: 25
        max-wait-duration: 0
    
    instances:
      paymentService:
        base-config: default
        max-concurrent-calls: 10
```

### Bulkhead with RestTemplate

```java
import io.github.resilience4j.bulkhead.annotation.Bulkhead;

@Service
@RequiredArgsConstructor
public class BulkheadProtectedClient {

    private final RestTemplate restTemplate;

    @Bulkhead(name = "paymentService", fallbackMethod = "bulkheadFallback")
    @CircuitBreaker(name = "paymentService")
    public PaymentResponse processPayment(PaymentRequest request) {
        return restTemplate.postForObject(
            "/v1/payments",
            request,
            PaymentResponse.class
        );
    }

    private PaymentResponse bulkheadFallback(PaymentRequest request, Exception ex) {
        log.warn("Bulkhead full for payment service");
        throw new ServiceUnavailableException("Payment service at capacity");
    }
}
```

## Timeout Configuration

### RestTemplate Timeouts

```java
@Configuration
public class TimeoutConfig {

    @Bean
    public RestTemplate quickTimeoutRestTemplate(RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(Duration.ofSeconds(2))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }

    @Bean
    public RestTemplate standardTimeoutRestTemplate(RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(30))
            .build();
    }

    @Bean
    public RestTemplate longRunningRestTemplate(RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(Duration.ofSeconds(10))
            .setReadTimeout(Duration.ofSeconds(120))
            .build();
    }
}
```

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

## Combined Resilience Patterns

### Complete Resilient Client

```java
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class FullyResilientPaymentClient {

    private final RestTemplate restTemplate;

    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    @Retry(name = "paymentService")
    @RateLimiter(name = "paymentService")
    @Bulkhead(name = "paymentService")
    public PaymentResponse processPayment(PaymentRequest request) {
        log.info("Processing payment with full resilience patterns");
        
        return restTemplate.postForObject(
            "/v1/payments",
            request,
            PaymentResponse.class
        );
    }

    private PaymentResponse paymentFallback(
            PaymentRequest request, 
            Exception ex) {
        
        log.error("Payment failed with all resilience patterns applied", ex);
        
        // Return cached result if available
        PaymentResponse cached = checkCache(request);
        if (cached != null) {
            return cached;
        }
        
        // Return graceful degradation
        return PaymentResponse.failed(
            "Payment service temporarily unavailable. Please try again later."
        );
    }

    private PaymentResponse checkCache(PaymentRequest request) {
        // Implementation for cache check
        return null;
    }
}
```

### Reactive Resilient Client

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import io.github.resilience4j.reactor.circuitbreaker.operator.CircuitBreakerOperator;
import io.github.resilience4j.reactor.ratelimiter.operator.RateLimiterOperator;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.reactor.retry.RetryOperator;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class FullyReactiveResilientClient {

    private final WebClient webClient;
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final RetryRegistry retryRegistry;
    private final RateLimiterRegistry rateLimiterRegistry;

    public Mono<PaymentResponse> processPayment(PaymentRequest request) {
        CircuitBreaker circuitBreaker = 
            circuitBreakerRegistry.circuitBreaker("paymentService");
        Retry retry = retryRegistry.retry("paymentService");
        RateLimiter rateLimiter = 
            rateLimiterRegistry.rateLimiter("paymentService");
        
        return webClient
            .post()
            .uri("/v1/payments")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResponse.class)
            .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
            .transformDeferred(RetryOperator.of(retry))
            .transformDeferred(RateLimiterOperator.of(rateLimiter))
            .timeout(Duration.ofSeconds(30))
            .onErrorResume(this::handleError);
    }

    private Mono<PaymentResponse> handleError(Throwable ex) {
        log.error("Payment processing failed with resilience patterns", ex);
        return Mono.just(PaymentResponse.failed("Service unavailable"));
    }
}
```

## Testing HTTP Clients

### RestTemplate Testing with MockRestServiceServer

```java
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

@SpringBootTest
class PaymentServiceClientTest {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private PaymentServiceClient paymentClient;

    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        mockServer = MockRestServiceServer.createServer(restTemplate);
    }

    @Test
    void shouldProcessPaymentSuccessfully() {
        // Given
        PaymentRequest request = new PaymentRequest();
        PaymentResponse expectedResponse = new PaymentResponse();
        expectedResponse.setPaymentId(UUID.randomUUID());
        expectedResponse.setStatus("SUCCESS");

        mockServer.expect(requestTo("/v1/payments"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andRespond(withSuccess(toJson(expectedResponse), MediaType.APPLICATION_JSON));

        // When
        PaymentResponse response = paymentClient.processPayment(request);

        // Then
        assertThat(response.getStatus()).isEqualTo("SUCCESS");
        mockServer.verify();
    }

    @Test
    void shouldHandleServiceError() {
        // Given
        PaymentRequest request = new PaymentRequest();

        mockServer.expect(requestTo("/v1/payments"))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        // When/Then
        assertThatThrownBy(() -> paymentClient.processPayment(request))
            .isInstanceOf(PaymentServiceException.class);
        
        mockServer.verify();
    }
}
```

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

## Best Practices Summary

### RestTemplate Best Practices

1. **Always configure timeouts**: Connection and read timeouts prevent hanging requests
2. **Use connection pooling**: Configure Apache HttpClient for production environments
3. **Create per-service beans**: Separate RestTemplate beans for different services
4. **Implement error handling**: Handle all HTTP status codes and network errors
5. **Add resilience patterns**: Circuit breakers, retries, and rate limiting
6. **Configure appropriate pool sizes**: Based on expected load and service capacity
7. **Monitor and log**: Track request metrics and failures

### WebClient Best Practices

1. **Configure connection providers**: Custom connection pools for high-concurrency scenarios
2. **Set appropriate timeouts**: Response timeout, connection timeout, and read/write timeouts
3. **Use reactive error handling**: Handle errors reactively with proper operators
4. **Avoid blocking**: Only use `.block()` when absolutely necessary
5. **Implement backpressure**: Handle slow consumers appropriately
6. **Chain resilience operators**: Apply circuit breakers, retries, and rate limiters
7. **Test reactively**: Use StepVerifier for testing reactive streams

### General HTTP Client Best Practices

1. **Externalize configuration**: Use application properties for URLs, timeouts, and pool sizes
2. **Implement fallbacks**: Provide graceful degradation when services fail
3. **Use correlation IDs**: Track requests across service boundaries
4. **Monitor circuit breaker states**: Alert on open circuits
5. **Log retry attempts**: Track retry behavior for troubleshooting
6. **Handle idempotency**: Use idempotency keys for non-idempotent operations
7. **Test failure scenarios**: Test timeouts, errors, and circuit breaker behavior

## Common Anti-patterns

### Anti-pattern: No Timeout Configuration

```java
// Bad: No timeouts configured
RestTemplate restTemplate = new RestTemplate();

// Good: Timeouts configured
RestTemplate restTemplate = new RestTemplateBuilder()
    .setConnectTimeout(Duration.ofSeconds(5))
    .setReadTimeout(Duration.ofSeconds(30))
    .build();
```

### Anti-pattern: Single RestTemplate for All Services

```java
// Bad: One RestTemplate for everything
@Bean
public RestTemplate restTemplate() {
    return new RestTemplate();
}

// Good: Per-service RestTemplate beans
@Bean
public RestTemplate paymentServiceRestTemplate() {
    return builder.rootUri("http://payment-service").build();
}

@Bean
public RestTemplate customerServiceRestTemplate() {
    return builder.rootUri("http://customer-service").build();
}
```

### Anti-pattern: Ignoring Errors

```java
// Bad: Swallowing exceptions
try {
    return restTemplate.getForObject(url, Response.class);
} catch (Exception e) {
    return null; // Don't do this
}

// Good: Proper error handling
try {
    return restTemplate.getForObject(url, Response.class);
} catch (HttpClientErrorException ex) {
    throw new ClientException("Client error", ex);
} catch (HttpServerErrorException ex) {
    throw new ServiceException("Service error", ex);
}
```

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

- [HTTP Client Best Practices](../../../guides/api-design/advanced-patterns/http-client-best-practices.md) - Language-agnostic HTTP client patterns
- [External Services Configuration](../configuration/external-services.md) - Service integration configuration
- [Reactive Error Handling](../error-handling/reactive-error-handling.md) - WebFlux error handling patterns
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) - Spring MVC error handling
- [Reactive Testing](../testing/specialized-testing/reactive-testing.md) - Testing reactive HTTP clients
- [External Service Testing](../testing/integration-testing/external-service-testing.md) - Integration testing patterns

---

**Next Steps**: Review the [language-agnostic HTTP client patterns](../../../guides/api-design/advanced-patterns/http-client-best-practices.md) for universal principles, then apply Spring-specific implementations from this guide.
