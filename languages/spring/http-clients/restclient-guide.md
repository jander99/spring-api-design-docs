# RestTemplate Guide

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 12 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Spring Boot basics, HTTP fundamentals  
> **🎯 Key Topics:** RestTemplate configuration, HTTP operations, error handling, testing
> 
> **📊 Complexity:** Grade 12 • Intermediate difficulty

## Overview

RestTemplate is Spring's traditional blocking (imperative) HTTP client for making requests to external services. While in maintenance mode, it remains widely used in existing Spring MVC applications.

**Note**: For new projects, prefer WebClient even in non-reactive applications. See [WebClient Guide](./webclient-guide.md) for the modern alternative.

### When to Use RestTemplate

| Use When | Advantages | Disadvantages |
|----------|------------|---------------|
| Spring MVC applications, synchronous workflows | Simple API, familiar patterns | Blocking I/O, deprecated in favor of WebClient |

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

## Best Practices

### RestTemplate Best Practices

1. **Always configure timeouts**: Connection and read timeouts prevent hanging requests
2. **Use connection pooling**: Configure Apache HttpClient for production environments
3. **Create per-service beans**: Separate RestTemplate beans for different services
4. **Implement error handling**: Handle all HTTP status codes and network errors
5. **Add resilience patterns**: Circuit breakers, retries, and rate limiting (see [Resilience Guide](./http-client-resilience.md))
6. **Configure appropriate pool sizes**: Based on expected load and service capacity
7. **Monitor and log**: Track request metrics and failures

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

## Related Documentation

- [WebClient Guide](./webclient-guide.md) - Modern reactive HTTP client
- [HTTP Client Resilience](./http-client-resilience.md) - Circuit breakers, retries, rate limiting
- [HTTP Client Best Practices](../../../guides/api-design/advanced-patterns/http-client-best-practices.md) - Language-agnostic patterns
- [External Services Configuration](../configuration/external-services.md) - Service integration configuration
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) - Spring MVC error handling
- [External Service Testing](../testing/integration-testing/external-service-testing.md) - Integration testing patterns

---

**Next Steps**: Review [WebClient Guide](./webclient-guide.md) for the modern reactive alternative, or [HTTP Client Resilience](./http-client-resilience.md) for production-ready resilience patterns.
