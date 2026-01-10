# RestClient Guide

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Spring Boot 3.2+ basics, HTTP fundamentals  
> **🎯 Key Topics:** RestClient configuration, HTTP operations, error handling, testing
> 
> **📊 Complexity:** Grade 12-14 • Intermediate difficulty

## Overview

RestClient is a modern synchronous HTTP client introduced in Spring Framework 6.1 and Spring Boot 3.2. It provides a fluent API similar to WebClient but for synchronous, blocking execution. 

Spring now recommends RestClient as the primary synchronous HTTP client for new applications. It offers a more readable and maintainable alternative to the aging RestTemplate.

### When to Use RestClient

| Use When | Advantages |
|----------|------------|
| New Spring Boot 3.2+ projects | Fluent API, modern observability, easy testing |
| Migrating from RestTemplate | Familiar patterns, simplified syntax |
| Synchronous microservices | No reactive overhead, standard thread-per-request model |

## Comparison Matrix

| Feature | RestClient | WebClient | RestTemplate |
|---------|------------|-----------|--------------|
| Programming Model | Synchronous | Reactive/Async | Synchronous |
| Recommended For | New sync code | Reactive apps | Legacy only |
| Spring Boot Support | 3.2+ | 2.0+ | All (maintenance) |
| Fluent API | ✅ Modern | ✅ Modern | ❌ Template methods |
| Observability | ✅ Native | ✅ Native | ⚠️ Manual |
| Status | Active development | Active | Deprecated (Nov 2025) |

## Basic Configuration

Spring Boot 3.2+ provides an auto-configured `RestClient.Builder`. You should inject this builder to create customized `RestClient` instances.

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
}
```

By using the builder, you inherit Spring Boot's default configurations. These include message converters and observability settings.

## Core API Patterns

RestClient uses a functional, fluent API. You chain methods to define the request and handle the response.

### GET Operations

```java
public User getUser(Long id) {
    return restClient.get()
        .uri("/users/{id}", id)
        .retrieve()
        .body(User.class);
}
```

### POST Operations

```java
public User createUser(User user) {
    return restClient.post()
        .uri("/users")
        .body(user)
        .retrieve()
        .body(User.class);
}
```

### PUT and DELETE Operations

```java
public void updateUser(Long id, User user) {
    restClient.put()
        .uri("/users/{id}", id)
        .body(user)
        .retrieve()
        .toBodilessEntity();
}

public void deleteUser(Long id) {
    restClient.delete()
        .uri("/users/{id}", id)
        .retrieve()
        .toBodilessEntity();
}
```

## Error Handling

The `retrieve()` method provides `onStatus()` callbacks. These allow you to handle specific HTTP status codes without catching exceptions.

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

If you need full access to the response, use `exchange()` instead of `retrieve()`. However, `retrieve()` is sufficient for most cases.

## Advanced Configuration

### Timeouts

RestClient uses a `ClientHttpRequestFactory` to manage underlying connections. You configure timeouts by customizing this factory. For Java 21+, the `JdkClientHttpRequestFactory` is recommended.

```java
@Configuration
public class ClientConfig {

    @Bean
    public RestClient restClient(RestClient.Builder builder) {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        
        return builder
            .requestFactory(requestFactory)
            .build();
    }
}
```

If you use Apache HttpClient or Jetty, you can use `HttpComponentsClientHttpRequestFactory` or `JettyClientHttpRequestFactory`. These offer more granular control over connection pools and keep-alive strategies.

### SSL/TLS with SslBundles

Spring Boot 3.1+ introduced `SslBundles` to simplify SSL configuration. You can apply these to RestClient via the builder to handle self-signed certificates or mutual TLS (mTLS).

```java
public RestClient securedClient(RestClient.Builder builder, SslBundles sslBundles) {
    return builder
        .apply(sslBundles.getBundle("my-bundle").setupRestClient())
        .build();
}
```

### Request Interceptors

Interceptors allow you to modify requests before they are sent. This is useful for adding authentication tokens, logging, or custom headers across all requests.

```java
public RestClient restClientWithInterceptor(RestClient.Builder builder) {
    return builder
        .requestInterceptor((request, body, execution) -> {
            request.getHeaders().add("X-Custom-Header", "Value");
            return execution.execute(request, body);
        })
        .build();
}
```

## Observability Integration

RestClient integrates natively with Micrometer. It automatically records metrics and traces for every request.

To view these metrics, check for `http.client.requests` in your Actuator metrics endpoint. The client includes tags for the URI template, status code, and client name.

## Testing with MockRestServiceServer

You can test RestClient using `MockRestServiceServer`. This allows you to simulate remote service responses without making actual network calls.

```java
@RestClientTest(UserService.class)
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private MockRestServiceServer server;

    @Test
    void shouldReturnUser() {
        this.server.expect(requestTo("/users/1"))
            .andRespond(withSuccess("{\"id\":1,\"name\":\"John\"}", MediaType.APPLICATION_JSON));

        User user = userService.getUser(1L);
        assertThat(user.getName()).isEqualTo("John");
    }
}
```

## Migration from RestTemplate

Moving from RestTemplate to RestClient is straightforward. Both use the same message converters, request factories, and interceptors. This makes the migration low-risk for existing production systems.

**Key differences:**
1. **API Style**: Use `RestClient.get()` (fluent) instead of `restTemplate.getForObject()` (template methods).
2. **Variable Mapping**: Use `.uri("/path/{id}", id)` for path variables instead of passing a Map.
3. **Response Handling**: Use `retrieve().body()` to extract the payload, which simplifies generic type handling.
4. **Error Handling**: Use `onStatus()` instead of wrapping calls in try-catch blocks or using `ResponseErrorHandler`.

Example Migration:
```java
// Legacy RestTemplate
User user = restTemplate.getForObject("https://api.example.com/users/{id}", User.class, 1L);

// Modern RestClient
User user = restClient.get()
    .uri("/users/{id}", 1L)
    .retrieve()
    .body(User.class);
```

## Best Practices

- **Inject the Builder**: Always use `RestClient.Builder` to ensure observability and message converters are correctly configured.
- **Use URI Templates**: Prefer `.uri("/path/{id}", id)` over manual string concatenation to prevent injection vulnerabilities.
- **Handle Status Codes**: Use `onStatus()` to map error codes to domain-specific exceptions.
- **Configure Timeouts**: Never rely on default timeouts. Always set explicit connection and read timeouts.

## Common Anti-patterns

- **Creating RestClient per request**: RestClient instances should be long-lived beans. Do not call `.build()` inside a method that executes frequently.
- **Ignoring 4xx/5xx errors**: Failing to use `onStatus()` or global error handling leads to generic `RestClientException` errors.
- **Hardcoding URLs**: Use configuration properties for base URLs instead of hardcoded strings in code.

## Related Documentation

- [RestTemplate Guide](./resttemplate-guide.md) - Legacy synchronous client documentation
- [WebClient Guide](./webclient-guide.md) - Reactive HTTP client documentation
- [HTTP Client Resilience](./http-client-resilience.md) - Retries, circuit breakers, and rate limiting
- [HTTP Client Best Practices](../../../guides/api-design/advanced-patterns/http-client-best-practices.md) - Language-agnostic design patterns
- [External Services Configuration](../configuration/external-services.md) - Spring configuration for remote services
- [External Service Testing](../testing/integration-testing/external-service-testing.md) - Advanced testing strategies

---

**Next Steps**: See the [HTTP Client Resilience Guide](./http-client-resilience.md) to add retries and circuit breakers to your RestClient.
