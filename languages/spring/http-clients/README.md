# HTTP Clients

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 3 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** RestClient, WebClient, HTTP operations
> 
> **📊 Complexity:** 8.6 grade level • 2.4% technical density • fairly difficult

Spring offers tools to call external APIs from your application. This section shows you how to use these HTTP clients.

## Contents

### Core Guides
- [RestClient Guide](./restclient-guide.md) - **Recommended** for new synchronous projects (Spring Boot 3.2+)
- [WebClient Guide](./webclient-guide.md) - Reactive and non-blocking HTTP client
- [HTTP Client Resilience](./http-client-resilience.md) - Add retry logic and circuit breakers

### Legacy Documentation
- [RestTemplate Guide](./resttemplate-guide.md) - Legacy synchronous client (deprecated Nov 2025)
- [HTTP Client Patterns](./http-client-patterns.md) - Original guide (33 minutes)

## Overview

Spring gives you three ways to call external APIs:

- **RestClient** (Recommended): Modern synchronous client with fluent API (Spring Boot 3.2+)
- **WebClient**: Non-blocking reactive calls for high-concurrency apps
- **RestTemplate** (Deprecated): Legacy synchronous client in maintenance mode

## Quick Start

### RestClient (Recommended for New Projects)

Use RestClient for synchronous HTTP calls in Spring Boot 3.2+:

```java
@Service
public class UserService {
    private final RestClient restClient;

    public UserService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
            .baseUrl("https://api.example.com")
            .build();
    }

    public User getUser(Long id) {
        return restClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .body(User.class);
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
- How to set up RestClient ([RestClient Guide](./restclient-guide.md)) - **Start here for new projects**
- How to set up WebClient ([WebClient Guide](./webclient-guide.md))
- How to set up RestTemplate ([RestTemplate Guide](./resttemplate-guide.md)) - Legacy only
- Connection pooling (all guides)
- Timeout settings (all guides)
- Error handling (all guides)

### Resilience Patterns
See [HTTP Client Resilience](./http-client-resilience.md) to learn:
- Circuit breakers with Resilience4j
- Retry logic with exponential backoff
- Rate limiting
- Bulkhead isolation
- Combining multiple strategies

### Testing
- MockRestServiceServer for RestClient and RestTemplate
- WireMock for integration tests ([WebClient Guide](./webclient-guide.md))
- Reactive testing with StepVerifier ([WebClient Guide](./webclient-guide.md))

## Which Client Should You Use?

| Your Situation | Best Choice | Why |
|----------|-------------------|--------|
| New Spring Boot 3.2+ project (sync) | RestClient | Modern fluent API, native observability |
| Spring WebFlux app | WebClient | Built for reactive apps |
| High concurrency / streaming | WebClient | Non-blocking, handles backpressure |
| Existing Spring MVC app | RestClient or WebClient | Migrate from RestTemplate |
| Legacy codebase | RestTemplate | Only for maintaining existing code |

## Client Comparison

| Feature | RestClient | WebClient | RestTemplate |
|---------|------------|-----------|--------------|
| Programming Model | Synchronous | Reactive/Async | Synchronous |
| Recommended For | New sync code | Reactive apps | Legacy only |
| Spring Boot Support | 3.2+ | 2.0+ | All (maintenance) |
| Fluent API | ✅ Modern | ✅ Modern | ❌ Template methods |
| Observability | ✅ Native | ✅ Native | ⚠️ Manual |
| Status | Active development | Active | Deprecated (Nov 2025) |

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
