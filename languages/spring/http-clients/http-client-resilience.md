# HTTP Client Resilience Patterns

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 18 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** RestClient, RestTemplate, or WebClient basics; Resilience4j concepts  
> **🎯 Key Topics:** Circuit breakers, retry logic, rate limiting, bulkhead isolation, timeouts
> 
> **📊 Complexity:** Grade 14 • Advanced difficulty

## Overview

Production HTTP clients require resilience patterns to handle failures gracefully. This guide covers Resilience4j integration with RestClient, RestTemplate, and WebClient for building fault-tolerant service integrations.

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

## Circuit Breaker Patterns

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

### Circuit Breaker with RestClient (Recommended)

RestClient works with Resilience4j using the `Decorators` API for programmatic resilience:

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.decorators.Decorators;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class CircuitBreakerPaymentClient {

    private final RestClient restClient;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    public PaymentResponse processPayment(PaymentRequest request) {
        CircuitBreaker circuitBreaker = 
            circuitBreakerRegistry.circuitBreaker("paymentService");

        Supplier<PaymentResponse> supplier = () -> restClient
            .post()
            .uri("/v1/payments")
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);

        return Decorators.ofSupplier(supplier)
            .withCircuitBreaker(circuitBreaker)
            .withFallback(this::paymentFallback)
            .get();
    }

    private PaymentResponse paymentFallback(Throwable ex) {
        log.warn("Payment circuit breaker activated, using fallback", ex);
        return PaymentResponse.failed("Service temporarily unavailable");
    }
}
```

You can also use annotation-based circuit breakers with RestClient by wrapping the call in a method:

```java
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;

@Service
@RequiredArgsConstructor
public class AnnotatedCircuitBreakerClient {

    private final RestClient restClient;

    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    public PaymentResponse processPayment(PaymentRequest request) {
        return restClient
            .post()
            .uri("/v1/payments")
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);
    }

    private PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
        log.warn("Payment circuit breaker activated", ex);
        return PaymentResponse.failed("Service temporarily unavailable");
    }
}
```

### Circuit Breaker with RestTemplate (Legacy)

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

### Retry with RestClient (Recommended)

```java
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.decorators.Decorators;

@Service
@RequiredArgsConstructor
public class RetryableRestClientPaymentClient {

    private final RestClient restClient;
    private final RetryRegistry retryRegistry;

    public PaymentResponse processPayment(PaymentRequest request) {
        Retry retry = retryRegistry.retry("paymentService");

        Supplier<PaymentResponse> supplier = () -> restClient
            .post()
            .uri("/v1/payments")
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);

        return Decorators.ofSupplier(supplier)
            .withRetry(retry)
            .get();
    }
}
```

For annotation-based retry with RestClient:

```java
import io.github.resilience4j.retry.annotation.Retry;

@Service
@RequiredArgsConstructor
public class AnnotatedRetryClient {

    private final RestClient restClient;

    @Retry(name = "paymentService", fallbackMethod = "paymentFallback")
    @CircuitBreaker(name = "paymentService")
    public PaymentResponse processPayment(PaymentRequest request) {
        log.info("Attempting payment processing");
        return restClient
            .post()
            .uri("/v1/payments")
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);
    }

    private PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
        log.error("All retry attempts failed for payment", ex);
        return PaymentResponse.failed("Payment failed after retries");
    }
}
```

### Retry with RestTemplate (Legacy)

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

## Combined Resilience Patterns

### Complete Resilient RestClient (Recommended)

```java
import io.github.resilience4j.bulkhead.Bulkhead;
import io.github.resilience4j.bulkhead.BulkheadRegistry;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.decorators.Decorators;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.function.Supplier;

@Slf4j
@Service
@RequiredArgsConstructor
public class FullyResilientRestClient {

    private final RestClient restClient;
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final RetryRegistry retryRegistry;
    private final RateLimiterRegistry rateLimiterRegistry;
    private final BulkheadRegistry bulkheadRegistry;

    public PaymentResponse processPayment(PaymentRequest request) {
        CircuitBreaker circuitBreaker = circuitBreakerRegistry.circuitBreaker("paymentService");
        Retry retry = retryRegistry.retry("paymentService");
        RateLimiter rateLimiter = rateLimiterRegistry.rateLimiter("paymentService");
        Bulkhead bulkhead = bulkheadRegistry.bulkhead("paymentService");

        Supplier<PaymentResponse> supplier = () -> restClient
            .post()
            .uri("/v1/payments")
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);

        return Decorators.ofSupplier(supplier)
            .withCircuitBreaker(circuitBreaker)
            .withRetry(retry)
            .withRateLimiter(rateLimiter)
            .withBulkhead(bulkhead)
            .withFallback(ex -> paymentFallback(request, ex))
            .get();
    }

    private PaymentResponse paymentFallback(PaymentRequest request, Throwable ex) {
        log.error("Payment failed with all resilience patterns applied", ex);
        
        // Return cached result if available
        PaymentResponse cached = checkCache(request);
        if (cached != null) {
            return cached;
        }
        
        return PaymentResponse.failed("Service temporarily unavailable. Please try again later.");
    }

    private PaymentResponse checkCache(PaymentRequest request) {
        // Implementation for cache check
        return null;
    }
}
```

Alternatively, use annotation-based resilience with RestClient:

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class AnnotatedResilientRestClient {

    private final RestClient restClient;

    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    @Retry(name = "paymentService")
    @RateLimiter(name = "paymentService")
    @Bulkhead(name = "paymentService")
    public PaymentResponse processPayment(PaymentRequest request) {
        log.info("Processing payment with full resilience patterns");
        
        return restClient
            .post()
            .uri("/v1/payments")
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);
    }

    private PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
        log.error("Payment failed with all resilience patterns applied", ex);
        return PaymentResponse.failed("Service temporarily unavailable. Please try again later.");
    }
}
```

### Complete Resilient RestTemplate (Legacy)

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

## Best Practices

### General HTTP Client Best Practices

1. **Externalize configuration**: Use application properties for URLs, timeouts, and pool sizes
2. **Implement fallbacks**: Provide graceful degradation when services fail
3. **Use correlation IDs**: Track requests across service boundaries
4. **Monitor circuit breaker states**: Alert on open circuits
5. **Log retry attempts**: Track retry behavior for troubleshooting
6. **Handle idempotency**: Use idempotency keys for non-idempotent operations
7. **Test failure scenarios**: Test timeouts, errors, and circuit breaker behavior

## Related Documentation

- [RestClient Guide](./restclient-guide.md) - RestTemplate configuration and patterns
- [WebClient Guide](./webclient-guide.md) - WebClient configuration and patterns
- [HTTP Client Best Practices](../../../guides/api-design/advanced-patterns/http-client-best-practices.md) - Language-agnostic patterns
- [External Services Configuration](../configuration/external-services.md) - Service integration configuration
- [Reactive Error Handling](../error-handling/reactive-error-handling.md) - WebFlux error handling
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) - Spring MVC error handling

---

**Next Steps**: Review client-specific guides ([RestClient](./restclient-guide.md) or [WebClient](./webclient-guide.md)) for detailed HTTP client configuration.
