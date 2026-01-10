# HTTP Client Patterns

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 35 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Spring Boot basics, HTTP fundamentals, reactive programming concepts  
> **🎯 Key Topics:** RestClient, RestTemplate, WebClient, Resilience4j, connection pooling
> 
> **📊 Complexity:** Grade 14 • 1.2% technical density • Difficult

## Overview

Spring provides three HTTP client options:

- **RestClient** (Recommended): Modern synchronous client with fluent API (Spring Boot 3.2+)
- **WebClient**: Non-blocking reactive client for high-concurrency apps
- **RestTemplate** (Deprecated): Legacy synchronous client in maintenance mode

This guide shows all three approaches. You'll learn about resilience, error handling, timeouts, and connection pooling.

### When to Use Each Client

| Client | Use When | Advantages | Disadvantages |
|--------|----------|------------|---------------|
| **RestClient** | New Spring Boot 3.2+ sync apps | Fluent API, native observability, modern | Requires Spring Boot 3.2+ |
| **WebClient** | Spring WebFlux apps, high concurrency | Non-blocking, backpressure support | Steeper learning curve |
| **RestTemplate** | Legacy codebases only | Familiar to existing teams | Deprecated (Nov 2025), no new features |

**Note**: For new synchronous projects, use RestClient. For reactive apps, use WebClient. RestTemplate should only be used for maintaining existing code.

## RestClient Patterns (Recommended for Spring Boot 3.2+)

RestClient is the modern synchronous HTTP client introduced in Spring Framework 6.1. It provides a fluent API similar to WebClient but for blocking execution. See the [RestClient Guide](./restclient-guide.md) for comprehensive documentation.

### Basic RestClient Setup

```java
@Service
public class UserService {
    private final RestClient restClient;

    public UserService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
            .baseUrl("https://api.example.com")
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }

    public User getUser(Long id) {
        return restClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .body(User.class);
    }

    public User createUser(User user) {
        return restClient.post()
            .uri("/users")
            .body(user)
            .retrieve()
            .body(User.class);
    }
}
```

### RestClient Error Handling

```java
public User getUser(Long id) {
    return restClient.get()
        .uri("/users/{id}", id)
        .retrieve()
        .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
            throw new UserNotFoundException("User not found: " + id);
        })
        .onStatus(HttpStatusCode::is5xxServerError, (request, response) -> {
            throw new ServiceUnavailableException("Service temporarily unavailable");
        })
        .body(User.class);
}
```

### RestClient with Resilience4j

```java
@Service
@RequiredArgsConstructor
public class ResilientUserService {
    private final RestClient restClient;
    private final CircuitBreaker circuitBreaker;
    private final Retry retry;

    public User getUser(Long id) {
        Supplier<User> supplier = () -> restClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .body(User.class);

        return Decorators.ofSupplier(supplier)
            .withCircuitBreaker(circuitBreaker)
            .withRetry(retry)
            .get();
    }
}
```

For complete RestClient documentation, see the [RestClient Guide](./restclient-guide.md).

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

Use Apache HttpClient in production for connection pooling:

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

Create a RestTemplate bean for each service:

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

You can block WebClient when needed:

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
             .block(Duration.ofSeconds(30));
     }
}
```

**Warning**: Blocking reduces WebClient's benefits. Use only when necessary.

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
                 "/v1/payments", request, PaymentResponse.class);
             return response.getBody();
             
         } catch (HttpClientErrorException ex) {
             if (ex.getStatusCode() == HttpStatus.BAD_REQUEST) {
                 throw new PaymentValidationException("Invalid request", ex);
             }
             throw new PaymentException("Client error", ex);
             
         } catch (HttpServerErrorException ex) {
             log.error("Service error: {}", ex.getStatusText());
             throw new PaymentServiceException("Service unavailable", ex);
             
         } catch (ResourceAccessException ex) {
             log.error("Network error", ex);
             throw new PaymentServiceException("Cannot reach service", ex);
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
             .onStatus(HttpStatus.BAD_REQUEST::equals,
                 response -> Mono.error(
                     new PaymentValidationException("Invalid payment")))
             .onStatus(HttpStatus.NOT_FOUND::equals,
                 response -> Mono.error(
                     new PaymentNotFoundException("Not found")))
             .onStatus(HttpStatus::is5xxServerError,
                 response -> Mono.error(
                     new PaymentServiceException("Service error")))
             .bodyToMono(PaymentResponse.class)
             .onErrorMap(WebClientResponseException.class,
                 this::mapWebClientException);
     }

     private Exception mapWebClientException(WebClientResponseException ex) {
         return switch (ex.getStatusCode().value()) {
             case 400 -> new PaymentValidationException("Invalid");
             case 404 -> new PaymentNotFoundException("Not found");
             case 409 -> new PaymentConflictException("Conflict");
             case 500, 502, 503, 504 -> new PaymentServiceException("Unavailable");
             default -> new PaymentException("Error");
         };
     }
}
```

## Resilience4j Integration

Add Resilience4j dependencies:

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
         return restTemplate.postForObject("/v1/payments", request, 
             PaymentResponse.class);
     }

     private PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
         log.warn("Circuit breaker activated", ex);
         return PaymentResponse.failed("Service unavailable");
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
     private final CircuitBreakerRegistry registry;

     public Mono<PaymentResponse> processPayment(PaymentRequest request) {
         CircuitBreaker breaker = registry.circuitBreaker("paymentService");
         
         return webClient.post()
             .uri("/v1/payments")
             .bodyValue(request)
             .retrieve()
             .bodyToMono(PaymentResponse.class)
             .transformDeferred(CircuitBreakerOperator.of(breaker))
             .onErrorResume(this::handleError);
     }

     private Mono<PaymentResponse> handleError(Throwable ex) {
         log.error("Circuit breaker error", ex);
         return Mono.just(PaymentResponse.failed("Service unavailable"));
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
         retry-exceptions:
           - org.springframework.web.client.ResourceAccessException
           - java.net.ConnectException
     instances:
       paymentService:
         base-config: default
         max-attempts: 5
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
         log.info("Processing payment");
         return restTemplate.postForObject("/v1/payments", request, 
             PaymentResponse.class);
     }

     private PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
         log.error("Retries failed", ex);
         return PaymentResponse.failed("Payment failed after retries");
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
         
         return webClient.post()
             .uri("/v1/payments")
             .bodyValue(request)
             .retrieve()
             .bodyToMono(PaymentResponse.class)
             .transformDeferred(RetryOperator.of(retry))
             .doOnError(ex -> log.error("Retries failed", ex));
     }
}
```

### Spring Retry Alternative

Use Spring Retry if not using Resilience4j:

```xml
<dependency>
    <groupId>org.springframework.retry</groupId>
    <artifactId>spring-retry</artifactId>
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
         retryFor = {ResourceAccessException.class},
         maxAttempts = 3,
         backoff = @Backoff(delay = 1000, multiplier = 2)
     )
     public PaymentResponse processPayment(PaymentRequest request) {
         return restTemplate.postForObject("/v1/payments", request, 
             PaymentResponse.class);
     }

     @Recover
     public PaymentResponse recover(Exception ex, PaymentRequest request) {
         log.error("Retries failed", ex);
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
         return restTemplate.postForObject("/v1/payments", request, 
             PaymentResponse.class);
     }

     private PaymentResponse rateLimitFallback(PaymentRequest request, Exception ex) {
         log.warn("Rate limit exceeded");
         throw new RateLimitExceededException("Too many requests");
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
     private final RateLimiterRegistry registry;

     public Mono<PaymentResponse> processPayment(PaymentRequest request) {
         RateLimiter limiter = registry.rateLimiter("paymentService");
         
         return webClient.post()
             .uri("/v1/payments")
             .bodyValue(request)
             .retrieve()
             .bodyToMono(PaymentResponse.class)
             .transformDeferred(RateLimiterOperator.of(limiter));
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
         return restTemplate.postForObject("/v1/payments", request, 
             PaymentResponse.class);
     }

     private PaymentResponse bulkheadFallback(PaymentRequest request, Exception ex) {
         log.warn("Bulkhead full");
         throw new ServiceUnavailableException("Service at capacity");
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
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class TimeoutControlledClient {
     private final WebClient webClient;

     public Mono<PaymentResponse> processPaymentWithTimeout(
             PaymentRequest request, Duration timeout) {
         
         return webClient.post()
             .uri("/v1/payments")
             .bodyValue(request)
             .retrieve()
             .bodyToMono(PaymentResponse.class)
             .timeout(timeout)
             .onErrorResume(TimeoutException.class, ex -> {
                 log.error("Request timed out");
                 return Mono.error(new PaymentTimeoutException("Timed out"));
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
         log.info("Processing payment");
         
         return restTemplate.postForObject("/v1/payments", request, 
             PaymentResponse.class);
     }

     private PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
         log.error("Payment failed", ex);
         
         PaymentResponse cached = checkCache(request);
         if (cached != null) {
             return cached;
         }
         
         return PaymentResponse.failed("Service unavailable. Try later.");
     }

     private PaymentResponse checkCache(PaymentRequest request) {
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
     private final CircuitBreakerRegistry cbRegistry;
     private final RetryRegistry retryRegistry;
     private final RateLimiterRegistry rlRegistry;

     public Mono<PaymentResponse> processPayment(PaymentRequest request) {
         CircuitBreaker cb = cbRegistry.circuitBreaker("paymentService");
         Retry retry = retryRegistry.retry("paymentService");
         RateLimiter rl = rlRegistry.rateLimiter("paymentService");
         
         return webClient.post()
             .uri("/v1/payments")
             .bodyValue(request)
             .retrieve()
             .bodyToMono(PaymentResponse.class)
             .transformDeferred(CircuitBreakerOperator.of(cb))
             .transformDeferred(RetryOperator.of(retry))
             .transformDeferred(RateLimiterOperator.of(rl))
             .timeout(Duration.ofSeconds(30))
             .onErrorResume(this::handleError);
     }

     private Mono<PaymentResponse> handleError(Throwable ex) {
         log.error("Payment failed", ex);
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

1. **Configure timeouts**: Prevent hanging requests
2. **Use connection pooling**: Use Apache HttpClient in production
3. **Create per-service beans**: Separate beans for each service
4. **Handle errors**: Deal with all HTTP errors and network failures
5. **Add resilience**: Use circuit breakers and retries
6. **Monitor**: Track metrics and failures
7. **Log requests**: Record important events

### WebClient Best Practices

1. **Configure connections**: Set up custom pools for high concurrency
2. **Set timeouts**: Response and connection timeouts
3. **Handle errors reactively**: Use proper operators
4. **Avoid blocking**: Use `.block()` only when necessary
5. **Handle backpressure**: Manage slow consumers
6. **Chain operators**: Apply circuit breakers and retries
7. **Test reactively**: Use StepVerifier

### General Best Practices

1. **Externalize config**: Use properties for URLs and timeouts
2. **Implement fallbacks**: Handle service failures gracefully
3. **Use correlation IDs**: Track across services
4. **Monitor circuits**: Alert on failures
5. **Log retries**: Track retry behavior
6. **Handle idempotency**: Use idempotency keys
7. **Test failures**: Test timeouts and errors

## Common Anti-patterns

### Anti-pattern: No Timeout Configuration

```java
// Bad - no timeouts
RestTemplate restTemplate = new RestTemplate();

// Good - with timeouts
RestTemplate restTemplate = new RestTemplateBuilder()
    .setConnectTimeout(Duration.ofSeconds(5))
    .setReadTimeout(Duration.ofSeconds(30))
    .build();
```

### Anti-pattern: Single RestTemplate for All Services

```java
// Bad - one for everything
@Bean
public RestTemplate restTemplate() {
    return new RestTemplate();
}

// Good - one per service
@Bean
public RestTemplate paymentRestTemplate() {
    return builder.rootUri("http://payment-service").build();
}
```

### Anti-pattern: Ignoring Errors

```java
// Bad - swallows exceptions
try {
    return restTemplate.getForObject(url, Response.class);
} catch (Exception e) {
    return null; // Don't do this
}

// Good - handles errors properly
try {
    return restTemplate.getForObject(url, Response.class);
} catch (HttpClientErrorException ex) {
    throw new ClientException("Client error", ex);
}
```

### Anti-pattern: Blocking in Reactive Code

```java
// Bad - blocking defeats benefits
public Mono<PaymentResponse> processPayment(PaymentRequest request) {
    return webClient.post()
        .uri("/v1/payments")
        .bodyValue(request)
        .retrieve()
        .bodyToMono(PaymentResponse.class)
        .block(); // Don't block
}

// Good - stays reactive
public Mono<PaymentResponse> processPayment(PaymentRequest request) {
    return webClient.post()
        .uri("/v1/payments")
        .bodyValue(request)
        .retrieve()
        .bodyToMono(PaymentResponse.class);
}
```

## Related Documentation

- [HTTP Client Best Practices](../../../guides/api-design/advanced-patterns/http-client-best-practices.md) - HTTP patterns
- [External Services Configuration](../configuration/external-services.md) - Service config
- [Reactive Error Handling](../error-handling/reactive-error-handling.md) - WebFlux errors
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) - Spring MVC errors
- [Reactive Testing](../testing/specialized-testing/reactive-testing.md) - Testing clients
- [External Service Testing](../testing/integration-testing/external-service-testing.md) - Integration tests

---

**Next Steps**: Read [HTTP client patterns](../../../guides/api-design/advanced-patterns/http-client-best-practices.md) for universal principles. Then apply Spring implementations from this guide.
