# HTTP Clients

This section covers Spring HTTP client implementations for making requests to external services.

## Contents

- [HTTP Client Patterns](./http-client-patterns.md) - Comprehensive guide to RestTemplate and WebClient with resilience patterns

## Overview

Spring provides two primary HTTP client implementations:

- **RestTemplate**: Traditional blocking HTTP client for Spring MVC applications
- **WebClient**: Non-blocking reactive HTTP client for Spring WebFlux and modern applications

## Quick Start

### RestTemplate (Imperative)

```java
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

### WebClient (Reactive)

```java
@Configuration
public class WebClientConfig {
    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder
            .baseUrl("https://api.example.com")
            .build();
    }
}
```

## Key Topics Covered

### HTTP Client Fundamentals
- RestTemplate configuration and usage
- WebClient configuration and usage
- Connection pooling
- Timeout configuration
- Error handling patterns

### Resilience Patterns
- Circuit breakers with Resilience4j
- Retry mechanisms with exponential backoff
- Rate limiting
- Bulkhead isolation
- Combined resilience strategies

### Testing
- MockRestServiceServer for RestTemplate
- WireMock for integration testing
- Reactive testing with StepVerifier

## When to Use Each Client

| Scenario | Recommended Client | Reason |
|----------|-------------------|--------|
| New Spring Boot projects | WebClient | Modern, non-blocking, future-proof |
| Spring MVC applications | RestTemplate or WebClient | RestTemplate simpler, WebClient more powerful |
| Spring WebFlux applications | WebClient | Native reactive support |
| High concurrency requirements | WebClient | Non-blocking I/O handles more concurrent requests |
| Simple synchronous calls | RestTemplate | Simpler API, less learning curve |

## Related Documentation

### API Design Guides
- [HTTP Client Best Practices](../../../guides/api-design/advanced-patterns/http-client-best-practices.md) - Language-agnostic patterns

### Spring Configuration
- [External Services Configuration](../configuration/external-services.md) - Service integration setup
- [Configuration Principles](../configuration/configuration-principles.md) - General configuration patterns

### Error Handling
- [Reactive Error Handling](../error-handling/reactive-error-handling.md) - WebClient error patterns
- [Imperative Error Handling](../error-handling/imperative-error-handling.md) - RestTemplate error patterns

### Testing
- [External Service Testing](../testing/integration-testing/external-service-testing.md) - Integration testing
- [Reactive Testing](../testing/specialized-testing/reactive-testing.md) - WebClient testing patterns

---

[← Back to Spring Documentation](../README.md)
