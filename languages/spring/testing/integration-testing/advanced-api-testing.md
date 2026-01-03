# Advanced API Testing

## Overview

Advanced API testing covers HTTP-specific features beyond basic CRUD operations. This includes content negotiation, CORS policies, rate limiting, and specialized HTTP headers. These tests validate that your API correctly implements HTTP standards and handles edge cases.

## Content Negotiation Testing

Content negotiation allows clients to request different response formats using Accept headers. Test that your API responds correctly to format requests.

### Testing Different Response Formats

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ContentNegotiationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldReturnJsonByDefault() {
        // Given
        UUID orderId = createPersistedOrder().getId();

        // When
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/v1/orders/{orderId}", String.class, orderId);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType())
            .isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(response.getBody()).startsWith("{");
    }

    @Test
    void shouldReturnXmlWhenRequested() {
        // Given
        UUID orderId = createPersistedOrder().getId();
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_XML));
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // When
        ResponseEntity<String> response = restTemplate.exchange(
            "/v1/orders/{orderId}", HttpMethod.GET, entity, String.class, orderId);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType())
            .isEqualTo(MediaType.APPLICATION_XML);
        assertThat(response.getBody()).startsWith("<?xml");
    }

    @Test
    void shouldReturnNotAcceptableForUnsupportedFormat() {
        // Given
        UUID orderId = createPersistedOrder().getId();
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_PDF)); // Unsupported format
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // When
        ResponseEntity<ErrorResponse> response = restTemplate.exchange(
            "/v1/orders/{orderId}", HttpMethod.GET, entity, ErrorResponse.class, orderId);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_ACCEPTABLE);
    }
}
```

**Content Negotiation Checklist:**
- Default format returns correctly
- Accept header drives format selection
- Unsupported formats return 406 Not Acceptable
- Content-Type header matches returned format

### Testing Multiple Accept Headers

```java
@Test
void shouldSelectBestMatchFromMultipleAcceptTypes() {
    // Given
    UUID orderId = createPersistedOrder().getId();
    HttpHeaders headers = new HttpHeaders();
    headers.setAccept(List.of(
        MediaType.APPLICATION_XML,
        MediaType.APPLICATION_JSON,
        MediaType.ALL
    ));
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    // When
    ResponseEntity<String> response = restTemplate.exchange(
        "/v1/orders/{orderId}", HttpMethod.GET, entity, String.class, orderId);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    // Should match first supported type (typically JSON or XML based on config)
    assertThat(response.getHeaders().getContentType())
        .isIn(MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML);
}
```

### Testing Quality Values (q-values)

```java
@Test
void shouldRespectQualityValues() {
    // Given
    UUID orderId = createPersistedOrder().getId();
    HttpHeaders headers = new HttpHeaders();
    headers.set("Accept", "application/json;q=0.9, application/xml;q=1.0");
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    // When
    ResponseEntity<String> response = restTemplate.exchange(
        "/v1/orders/{orderId}", HttpMethod.GET, entity, String.class, orderId);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    // Should prefer XML due to higher q-value
    assertThat(response.getHeaders().getContentType())
        .isEqualTo(MediaType.APPLICATION_XML);
}
```

## CORS Testing

Cross-Origin Resource Sharing (CORS) controls which origins can access your API from browsers. Test CORS configuration to ensure security and accessibility.

### Testing Preflight Requests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CorsIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldHandlePreflightRequest() {
        // Given
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("https://example.com");
        headers.setAccessControlRequestMethod(HttpMethod.POST);
        headers.setAccessControlRequestHeaders(List.of("Content-Type", "Authorization"));
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // When
        ResponseEntity<Void> response = restTemplate.exchange(
            "/v1/orders", HttpMethod.OPTIONS, entity, Void.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin())
            .isEqualTo("https://example.com");
        assertThat(response.getHeaders().getAccessControlAllowMethods())
            .contains(HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE);
        assertThat(response.getHeaders().getAccessControlAllowHeaders())
            .contains("Content-Type", "Authorization");
    }

    @Test
    void shouldRejectUnauthorizedOrigin() {
        // Given
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("https://malicious-site.com");
        headers.setAccessControlRequestMethod(HttpMethod.POST);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // When
        ResponseEntity<Void> response = restTemplate.exchange(
            "/v1/orders", HttpMethod.OPTIONS, entity, Void.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
```

**CORS Testing Checklist:**
- Allowed origins return correct headers
- Blocked origins receive 403 Forbidden
- Allowed methods include required verbs
- Allowed headers include required headers
- Credentials handling works correctly

### Testing CORS with Actual Requests

```java
@Test
void shouldIncludeCorsHeadersInActualRequest() {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    HttpHeaders headers = new HttpHeaders();
    headers.setOrigin("https://example.com");
    headers.setContentType(MediaType.APPLICATION_JSON);
    HttpEntity<CreateOrderRequest> entity = new HttpEntity<>(request, headers);

    // When
    ResponseEntity<OrderResponse> response = restTemplate.exchange(
        "/v1/orders", HttpMethod.POST, entity, OrderResponse.class);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(response.getHeaders().getAccessControlAllowOrigin())
        .isEqualTo("https://example.com");
}
```

### Testing CORS Credentials

```java
@Test
void shouldAllowCredentialsForTrustedOrigins() {
    // Given
    HttpHeaders headers = new HttpHeaders();
    headers.setOrigin("https://trusted-app.com");
    headers.setAccessControlRequestMethod(HttpMethod.POST);
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    // When
    ResponseEntity<Void> response = restTemplate.exchange(
        "/v1/orders", HttpMethod.OPTIONS, entity, Void.class);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getHeaders().getAccessControlAllowCredentials()).isTrue();
}
```

## Rate Limiting Testing

Rate limiting protects APIs from abuse by limiting request frequency. Test that rate limits enforce correctly.

### Testing Rate Limit Enforcement

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RateLimitingTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldEnforceRateLimit() {
        // Given
        CreateOrderRequest request = createValidOrderRequest();
        String clientId = "test-client";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Client-ID", clientId);
        HttpEntity<CreateOrderRequest> entity = new HttpEntity<>(request, headers);

        // When - Make requests up to the limit
        for (int i = 0; i < 10; i++) {
            ResponseEntity<OrderResponse> response = restTemplate.exchange(
                "/v1/orders", HttpMethod.POST, entity, OrderResponse.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        }

        // When - Exceed the rate limit
        ResponseEntity<ErrorResponse> response = restTemplate.exchange(
            "/v1/orders", HttpMethod.POST, entity, ErrorResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(response.getHeaders().get("X-RateLimit-Remaining")).contains("0");
        assertThat(response.getHeaders().get("Retry-After")).isNotEmpty();
    }
}
```

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Total requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when window resets
- `Retry-After`: Seconds until client can retry

### Testing Rate Limit Headers

```java
@Test
void shouldIncludeRateLimitHeadersInResponse() {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Client-ID", "test-client");
    HttpEntity<CreateOrderRequest> entity = new HttpEntity<>(request, headers);

    // When
    ResponseEntity<OrderResponse> response = restTemplate.exchange(
        "/v1/orders", HttpMethod.POST, entity, OrderResponse.class);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(response.getHeaders().get("X-RateLimit-Limit")).isNotEmpty();
    assertThat(response.getHeaders().get("X-RateLimit-Remaining")).isNotEmpty();
    assertThat(response.getHeaders().get("X-RateLimit-Reset")).isNotEmpty();
}
```

### Testing Rate Limit Reset

```java
@Test
void shouldResetRateLimitAfterWindow() throws InterruptedException {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    String clientId = "test-client";
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Client-ID", clientId);
    HttpEntity<CreateOrderRequest> entity = new HttpEntity<>(request, headers);

    // Exhaust rate limit
    for (int i = 0; i < 10; i++) {
        restTemplate.exchange("/v1/orders", HttpMethod.POST, entity, OrderResponse.class);
    }

    // Verify limit reached
    ResponseEntity<ErrorResponse> limitReached = restTemplate.exchange(
        "/v1/orders", HttpMethod.POST, entity, ErrorResponse.class);
    assertThat(limitReached.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);

    // Wait for window to reset
    Thread.sleep(60000); // Wait 1 minute for window reset

    // When - Try again after reset
    ResponseEntity<OrderResponse> afterReset = restTemplate.exchange(
        "/v1/orders", HttpMethod.POST, entity, OrderResponse.class);

    // Then
    assertThat(afterReset.getStatusCode()).isEqualTo(HttpStatus.CREATED);
}
```

### Testing Per-User Rate Limits

```java
@Test
void shouldApplyRateLimitsPerUser() {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    
    HttpHeaders client1Headers = new HttpHeaders();
    client1Headers.set("X-Client-ID", "client-1");
    HttpEntity<CreateOrderRequest> client1Entity = new HttpEntity<>(request, client1Headers);
    
    HttpHeaders client2Headers = new HttpHeaders();
    client2Headers.set("X-Client-ID", "client-2");
    HttpEntity<CreateOrderRequest> client2Entity = new HttpEntity<>(request, client2Headers);

    // When - Client 1 exhausts their limit
    for (int i = 0; i < 10; i++) {
        restTemplate.exchange("/v1/orders", HttpMethod.POST, client1Entity, OrderResponse.class);
    }

    // Client 1 is rate limited
    ResponseEntity<ErrorResponse> client1Response = restTemplate.exchange(
        "/v1/orders", HttpMethod.POST, client1Entity, ErrorResponse.class);
    assertThat(client1Response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);

    // Client 2 can still make requests
    ResponseEntity<OrderResponse> client2Response = restTemplate.exchange(
        "/v1/orders", HttpMethod.POST, client2Entity, OrderResponse.class);
    assertThat(client2Response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
}
```

## HTTP Caching Testing

Test cache control headers and conditional requests.

### Testing Cache-Control Headers

```java
@Test
void shouldIncludeCacheControlHeaders() {
    // Given
    UUID orderId = createPersistedOrder().getId();

    // When
    ResponseEntity<OrderResponse> response = restTemplate.getForEntity(
        "/v1/orders/{orderId}", OrderResponse.class, orderId);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getHeaders().getCacheControl()).isNotNull();
    assertThat(response.getHeaders().getCacheControl()).contains("max-age=300");
}
```

### Testing ETag Support

```java
@Test
void shouldSupportETagConditionalRequests() {
    // Given
    UUID orderId = createPersistedOrder().getId();
    
    // Get initial response with ETag
    ResponseEntity<OrderResponse> initialResponse = restTemplate.getForEntity(
        "/v1/orders/{orderId}", OrderResponse.class, orderId);
    String etag = initialResponse.getHeaders().getETag();

    // When - Make conditional request with If-None-Match
    HttpHeaders headers = new HttpHeaders();
    headers.setIfNoneMatch(etag);
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    ResponseEntity<OrderResponse> conditionalResponse = restTemplate.exchange(
        "/v1/orders/{orderId}", HttpMethod.GET, entity, OrderResponse.class, orderId);

    // Then
    assertThat(conditionalResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_MODIFIED);
    assertThat(conditionalResponse.getBody()).isNull();
}
```

### Testing Last-Modified Headers

```java
@Test
void shouldSupportLastModifiedConditionalRequests() {
    // Given
    UUID orderId = createPersistedOrder().getId();
    
    // Get initial response with Last-Modified
    ResponseEntity<OrderResponse> initialResponse = restTemplate.getForEntity(
        "/v1/orders/{orderId}", OrderResponse.class, orderId);
    long lastModified = initialResponse.getHeaders().getLastModified();

    // When - Make conditional request with If-Modified-Since
    HttpHeaders headers = new HttpHeaders();
    headers.setIfModifiedSince(lastModified);
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    ResponseEntity<OrderResponse> conditionalResponse = restTemplate.exchange(
        "/v1/orders/{orderId}", HttpMethod.GET, entity, OrderResponse.class, orderId);

    // Then
    assertThat(conditionalResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_MODIFIED);
}
```

## Custom Header Testing

Test custom headers your API uses for tracking, versioning, or feature flags.

### Testing Request ID Propagation

```java
@Test
void shouldPropagateRequestId() {
    // Given
    CreateOrderRequest request = createValidOrderRequest();
    String requestId = UUID.randomUUID().toString();
    
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Request-ID", requestId);
    HttpEntity<CreateOrderRequest> entity = new HttpEntity<>(request, headers);

    // When
    ResponseEntity<OrderResponse> response = restTemplate.exchange(
        "/v1/orders", HttpMethod.POST, entity, OrderResponse.class);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(response.getHeaders().get("X-Request-ID")).contains(requestId);
}
```

### Testing API Version Headers

```java
@Test
void shouldAcceptApiVersionHeader() {
    // Given
    UUID orderId = createPersistedOrder().getId();
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-API-Version", "2023-10-01");
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    // When
    ResponseEntity<OrderResponse> response = restTemplate.exchange(
        "/v1/orders/{orderId}", HttpMethod.GET, entity, OrderResponse.class, orderId);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getHeaders().get("X-API-Version")).contains("2023-10-01");
}
```

## Best Practices

### 1. Test Both Success and Failure Cases

```java
// Good: Test both allowed and blocked scenarios
@Test
void shouldAllowCorsForTrustedOrigin() {
    // Test allowed origin succeeds
}

@Test
void shouldBlockCorsForUntrustedOrigin() {
    // Test blocked origin fails
}

// Bad: Only test happy path
@Test
void shouldHandleCors() {
    // Only tests allowed origin
}
```

### 2. Verify All Required Headers

```java
// Good: Check all expected headers
@Test
void shouldReturnCompleteHeaders() {
    ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
        "/v1/orders", request, OrderResponse.class);
    
    assertThat(response.getHeaders().getContentType()).isNotNull();
    assertThat(response.getHeaders().getLocation()).isNotNull();
    assertThat(response.getHeaders().get("X-Request-ID")).isNotEmpty();
    assertThat(response.getHeaders().getCacheControl()).isNotNull();
}

// Bad: Only check some headers
@Test
void shouldReturnHeaders() {
    ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
        "/v1/orders", request, OrderResponse.class);
    assertThat(response.getHeaders().getContentType()).isNotNull();
}
```

### 3. Test Rate Limit Edge Cases

```java
// Good: Test boundary conditions
@Test
void shouldHandleRateLimitBoundary() {
    // Test exactly at limit
    // Test one over limit
    // Test reset behavior
}

// Bad: Only test exceeding limit
@Test
void shouldEnforceRateLimit() {
    // Only tests when limit exceeded
}
```

## Common Pitfalls

### Pitfall 1: Not Testing Unsupported Scenarios

```java
// Bad: Only test supported formats
@Test
void shouldReturnJson() {
    // Tests JSON works
}

// Good: Test unsupported formats return proper errors
@Test
void shouldReturnNotAcceptableForUnsupportedFormat() {
    // Tests PDF format returns 406
}
```

### Pitfall 2: Ignoring Header Case Sensitivity

```java
// Bad: Assume header names are case-sensitive
headers.set("x-request-id", requestId);

// Good: Use standard header name constants
headers.set("X-Request-ID", requestId);
// Or use Spring's header setters
headers.setBearerAuth(token);
```

### Pitfall 3: Not Verifying Rate Limit Reset

```java
// Bad: Only test limit enforcement
@Test
void shouldEnforceRateLimit() {
    // Exhaust limit
    // Verify 429 response
}

// Good: Also test reset behavior
@Test
void shouldResetRateLimitAfterWindow() {
    // Exhaust limit
    // Wait for reset
    // Verify requests allowed again
}
```

## Related Documentation

- [Spring Boot Test Fundamentals](springboot-test-fundamentals.md) - Basic @SpringBootTest patterns
- [Reactive API Testing](reactive-api-testing.md) - WebTestClient for reactive endpoints
- [HTTP Fundamentals](../../../../guides/api-design/foundations/http-fundamentals.md) - HTTP protocol basics
- [Content Negotiation](../../../../guides/api-design/request-response/content-negotiation.md) - Content negotiation theory
- [HTTP Caching](../../../../guides/api-design/advanced-patterns/http-caching.md) - Caching strategies
- [Rate Limiting](../../../../guides/api-design/advanced-patterns/rate-limiting.md) - Rate limiting patterns
- [CORS Configuration](../../security/cors-and-headers.md) - CORS setup in Spring
