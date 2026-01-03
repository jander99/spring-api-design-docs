# HTTP Clients

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 2 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 8.6 grade level • 2.4% technical density • fairly difficult

Spring offers tools to call external APIs from your application. This section shows you how to use these HTTP clients.

## Contents

### Core Guides
- [RestClient Guide](./restclient-guide.md) - How to set up and use RestTemplate
- [WebClient Guide](./webclient-guide.md) - How to use reactive WebClient
- [HTTP Client Resilience](./http-client-resilience.md) - Add retry logic and circuit breakers

### Legacy Documentation
- [HTTP Client Patterns](./http-client-patterns.md) - Original guide (33 minutes)

## Overview

Spring gives you two ways to call external APIs:

- **RestTemplate**: Simple blocking calls for traditional Spring MVC apps
- **WebClient**: Non-blocking reactive calls for modern apps

## Quick Start

### RestTemplate (Traditional)

Use RestTemplate for simple blocking HTTP calls:

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

Read the [RestClient Guide](./restclient-guide.md) for more details.

### WebClient (Reactive)

Use WebClient for non-blocking HTTP calls:

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

Read the [WebClient Guide](./webclient-guide.md) for more details.

## Key Topics

### HTTP Client Basics
- How to set up RestTemplate ([RestClient Guide](./restclient-guide.md))
- How to set up WebClient ([WebClient Guide](./webclient-guide.md))
- Connection pooling (both guides)
- Timeout settings (both guides)
- Error handling (both guides)

### Resilience Patterns
See [HTTP Client Resilience](./http-client-resilience.md) to learn:
- Circuit breakers with Resilience4j
- Retry logic with exponential backoff
- Rate limiting
- Bulkhead isolation
- Combining multiple strategies

### Testing
- MockRestServiceServer for RestTemplate ([RestClient Guide](./restclient-guide.md))
- WireMock for integration tests ([WebClient Guide](./webclient-guide.md))
- Reactive testing with StepVerifier ([WebClient Guide](./webclient-guide.md))

## Which Client Should You Use?

| Your Situation | Best Choice | Why |
|----------|-------------------|--------|
| New Spring Boot project | WebClient | Modern and non-blocking |
| Spring MVC app | RestTemplate or WebClient | RestTemplate is simpler, WebClient is more powerful |
| Spring WebFlux app | WebClient | Built for reactive apps |
| High traffic app | WebClient | Handles more requests at once |
| Simple API calls | RestTemplate | Easier to learn |

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
