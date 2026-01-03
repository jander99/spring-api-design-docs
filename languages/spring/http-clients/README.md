# HTTP Clients

This section covers Spring HTTP client implementations for making requests to external services.

## Contents

### Core Guides
- [RestClient Guide](./restclient-guide.md) - RestTemplate configuration, usage patterns, and testing
- [WebClient Guide](./webclient-guide.md) - WebClient reactive patterns, configuration, and testing
- [HTTP Client Resilience](./http-client-resilience.md) - Circuit breakers, retries, rate limiting, and bulkhead patterns

### Legacy Documentation
- [HTTP Client Patterns](./http-client-patterns.md) - Original comprehensive guide (33 minutes)

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

See the [RestClient Guide](./restclient-guide.md) for complete RestTemplate patterns.

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

See the [WebClient Guide](./webclient-guide.md) for complete reactive patterns.

## Key Topics Covered

### HTTP Client Fundamentals
- RestTemplate configuration and usage ([RestClient Guide](./restclient-guide.md))
- WebClient configuration and usage ([WebClient Guide](./webclient-guide.md))
- Connection pooling (covered in both guides)
- Timeout configuration (covered in both guides)
- Error handling patterns (covered in both guides)

### Resilience Patterns
See [HTTP Client Resilience](./http-client-resilience.md) for:
- Circuit breakers with Resilience4j
- Retry mechanisms with exponential backoff
- Rate limiting
- Bulkhead isolation
- Combined resilience strategies

### Testing
- MockRestServiceServer for RestTemplate ([RestClient Guide](./restclient-guide.md))
- WireMock for integration testing ([WebClient Guide](./webclient-guide.md))
- Reactive testing with StepVerifier ([WebClient Guide](./webclient-guide.md))

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
