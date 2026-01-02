# Security Testing

## Overview

This document covers comprehensive security testing patterns for Spring Boot applications. It includes testing for authentication, authorization, rate limiting, security headers, and other security mechanisms for both imperative and reactive implementations.

## Authentication and Authorization Testing

### Imperative Security Tests

```java
@WebMvcTest(OrderController.class)
@WithMockUser(username = "test-user", authorities = {"RESOURCE_order:view"})
public class OrderControllerSecurityTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    public void shouldAllowAccessToOrderWithProperAuthority() throws Exception {
        UUID orderId = UUID.randomUUID();
        OrderDto orderDto = new OrderDto();
        orderDto.setId(orderId);
        
        when(orderService.getOrder(orderId)).thenReturn(orderDto);
        
        mockMvc.perform(get("/api/orders/" + orderId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
    
    @Test
    @WithMockUser(username = "unauthorized-user")
    public void shouldDenyAccessWithoutProperAuthority() throws Exception {
        UUID orderId = UUID.randomUUID();
        
        mockMvc.perform(get("/api/orders/" + orderId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
    
    @Test
    public void shouldRequireAuthenticationForProtectedEndpoint() throws Exception {
        UUID orderId = UUID.randomUUID();
        
        mockMvc.perform(get("/api/orders/" + orderId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
    
    @Test
    @WithMockUser(username = "test-user", authorities = {"RESOURCE_order:create"})
    public void shouldAllowOrderCreationWithProperAuthority() throws Exception {
        OrderCreationDto creationDto = new OrderCreationDto();
        OrderDto orderDto = new OrderDto();
        
        when(orderService.createOrder(any(OrderCreationDto.class))).thenReturn(orderDto);
        
        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(creationDto)))
                .andExpect(status().isCreated());
    }
}
```

### Reactive Security Tests

```java
@WebFluxTest(ReactiveOrderController.class)
public class ReactiveOrderControllerSecurityTest {
    
    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private ReactiveOrderService orderService;
    
    @Test
    public void shouldAllowAccessToOrderWithProperAuthority() {
        UUID orderId = UUID.randomUUID();
        OrderDto orderDto = new OrderDto();
        orderDto.setId(orderId);
        
        when(orderService.getOrder(orderId)).thenReturn(Mono.just(orderDto));
        
        webTestClient.mutateWith(mockJwt().authorities(new SimpleGrantedAuthority("RESOURCE_order:view")))
            .get().uri("/api/orders/" + orderId)
            .exchange()
            .expectStatus().isOk();
    }
    
    @Test
    public void shouldDenyAccessWithoutProperAuthority() {
        UUID orderId = UUID.randomUUID();
        
        webTestClient.mutateWith(mockJwt())
            .get().uri("/api/orders/" + orderId)
            .exchange()
            .expectStatus().isForbidden();
    }
    
    @Test
    public void shouldRequireAuthenticationForProtectedEndpoint() {
        UUID orderId = UUID.randomUUID();
        
        webTestClient.get().uri("/api/orders/" + orderId)
            .exchange()
            .expectStatus().isUnauthorized();
    }
    
    @Test
    public void shouldAllowOrderCreationWithProperAuthority() {
        OrderCreationDto creationDto = new OrderCreationDto();
        OrderDto orderDto = new OrderDto();
        
        when(orderService.createOrder(any(OrderCreationDto.class))).thenReturn(Mono.just(orderDto));
        
        webTestClient.mutateWith(mockJwt().authorities(new SimpleGrantedAuthority("RESOURCE_order:create")))
            .post().uri("/api/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(creationDto)
            .exchange()
            .expectStatus().isCreated();
    }
}
```

## JWT Token Testing

### Custom JWT Test Utilities

```java
@TestComponent
public class JwtTestUtils {
    
    public static final String TEST_USER_ID = "test-user-123";
    public static final String TEST_CLIENT_ID = "test-client";
    
    public static MockJwtMutator mockJwtWithResourcePermissions(String... permissions) {
        Map<String, Object> resourceAccess = new HashMap<>();
        Map<String, Object> clientResource = new HashMap<>();
        clientResource.put("resources", Arrays.asList(permissions));
        resourceAccess.put(TEST_CLIENT_ID, clientResource);
        
        return mockJwt()
            .claim("sub", TEST_USER_ID)
            .claim("resource_access", resourceAccess)
            .claim("client_id", TEST_CLIENT_ID);
    }
    
    public static MockJwtMutator mockJwtWithAdminRole() {
        return mockJwt()
            .claim("sub", TEST_USER_ID)
            .claim("client_id", TEST_CLIENT_ID)
            .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }
    
    public static MockJwtMutator mockJwtForUser(String userId) {
        return mockJwt()
            .claim("sub", userId)
            .claim("client_id", TEST_CLIENT_ID);
    }
}

@ExtendWith(SpringExtension.class)
@WebMvcTest(OrderController.class)
public class JwtAuthorizationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    public void shouldExtractUserIdFromJwtToken() throws Exception {
        String userId = "user-123";
        OrderDto orderDto = new OrderDto();
        
        when(orderService.getOrder(any())).thenReturn(orderDto);
        
        mockMvc.perform(get("/api/orders/current")
                .with(JwtTestUtils.mockJwtForUser(userId)))
                .andExpect(status().isOk());
        
        // Verify that the service was called with the correct user context
        verify(orderService).getOrder(any());
    }
    
    @Test
    public void shouldValidateResourcePermissionsFromJwt() throws Exception {
        OrderDto orderDto = new OrderDto();
        when(orderService.getOrder(any())).thenReturn(orderDto);
        
        mockMvc.perform(get("/api/orders/123")
                .with(JwtTestUtils.mockJwtWithResourcePermissions("order:view")))
                .andExpect(status().isOk());
    }
}
```

## Rate Limiting Tests

### Rate Limiting Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "spring.redis.host=localhost",
    "spring.redis.port=6379"
})
@Testcontainers
public class RateLimitingIntegrationTest {
    
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:6-alpine")
        .withExposedPorts(6379);
    
    @Autowired
    private WebTestClient webTestClient;
    
    @Autowired
    private RedisRateLimitService rateLimitService;
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
    }
    
    @Test
    public void shouldEnforceRateLimitForAuthenticatedUser() {
        String userId = "test-user";
        int limit = 5;
        int window = 60;
        
        // Make requests up to the limit
        for (int i = 0; i < limit; i++) {
            webTestClient.mutateWith(JwtTestUtils.mockJwtForUser(userId))
                .get().uri("/api/orders")
                .exchange()
                .expectStatus().isOk()
                .expectHeader().exists("X-RateLimit-Limit")
                .expectHeader().exists("X-RateLimit-Remaining");
        }
        
        // Next request should be rate limited
        webTestClient.mutateWith(JwtTestUtils.mockJwtForUser(userId))
            .get().uri("/api/orders")
            .exchange()
            .expectStatus().isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }
    
    @Test
    public void shouldResetRateLimitAfterWindow() throws InterruptedException {
        String userId = "test-user-2";
        
        // Exhaust rate limit
        StepVerifier.create(rateLimitService.isAllowed(userId, 1, 1))
            .expectNext(true)
            .verifyComplete();
        
        StepVerifier.create(rateLimitService.isAllowed(userId, 1, 1))
            .expectNext(false)
            .verifyComplete();
        
        // Wait for window to reset (1 second + buffer)
        Thread.sleep(1500);
        
        // Should be allowed again
        StepVerifier.create(rateLimitService.isAllowed(userId, 1, 1))
            .expectNext(true)
            .verifyComplete();
    }
    
    @Test
    public void shouldTrackRemainingRequests() {
        String userId = "test-user-3";
        int limit = 3;
        int window = 60;
        
        // Initial state
        StepVerifier.create(rateLimitService.getRemainingRequests(userId, limit, window))
            .expectNext(3L)
            .verifyComplete();
        
        // After one request
        rateLimitService.isAllowed(userId, limit, window).block();
        StepVerifier.create(rateLimitService.getRemainingRequests(userId, limit, window))
            .expectNext(2L)
            .verifyComplete();
    }
}
```

## Security Headers Testing

### Security Headers Verification

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class SecurityHeadersTest {
    
    @Autowired
    private WebTestClient webTestClient;
    
    @Test
    public void shouldIncludeSecurityHeaders() {
        webTestClient.get().uri("/api/health")
            .exchange()
            .expectStatus().isOk()
            .expectHeader().exists("X-Content-Type-Options")
            .expectHeader().valueEquals("X-Content-Type-Options", "nosniff")
            .expectHeader().exists("X-Frame-Options")
            .expectHeader().valueEquals("X-Frame-Options", "DENY")
            .expectHeader().exists("Referrer-Policy")
            .expectHeader().exists("Permissions-Policy")
            .expectHeader().exists("Cross-Origin-Embedder-Policy")
            .expectHeader().exists("Cross-Origin-Opener-Policy");
    }
    
    @Test
    public void shouldIncludeHSTSHeaderForSecureRequests() {
        webTestClient.get().uri("/api/health")
            .exchange()
            .expectStatus().isOk()
            .expectHeader().exists("Strict-Transport-Security");
    }
    
    @Test
    public void shouldIncludeContentSecurityPolicy() {
        webTestClient.get().uri("/api/health")
            .exchange()
            .expectStatus().isOk()
            .expectHeader().exists("Content-Security-Policy")
            .expectHeader().value("Content-Security-Policy", 
                value -> assertThat(value).contains("default-src 'self'"));
    }
}
```

## CORS Testing

### CORS Configuration Testing

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class CorsConfigurationTest {
    
    @Autowired
    private WebTestClient webTestClient;
    
    @Test
    public void shouldAllowCorsFromAllowedOrigin() {
        webTestClient.options().uri("/api/orders")
            .header("Origin", "https://app.example.com")
            .header("Access-Control-Request-Method", "GET")
            .exchange()
            .expectStatus().isOk()
            .expectHeader().valueEquals("Access-Control-Allow-Origin", "https://app.example.com")
            .expectHeader().exists("Access-Control-Allow-Methods")
            .expectHeader().exists("Access-Control-Allow-Headers");
    }
    
    @Test
    public void shouldRejectCorsFromDisallowedOrigin() {
        webTestClient.options().uri("/api/orders")
            .header("Origin", "https://malicious.com")
            .header("Access-Control-Request-Method", "GET")
            .exchange()
            .expectStatus().isForbidden();
    }
    
    @Test
    public void shouldAllowCredentialsInCorsRequest() {
        webTestClient.options().uri("/api/orders")
            .header("Origin", "https://app.example.com")
            .header("Access-Control-Request-Method", "POST")
            .exchange()
            .expectStatus().isOk()
            .expectHeader().valueEquals("Access-Control-Allow-Credentials", "true");
    }
}
```

## Security Audit Testing

### SQL Injection Protection Tests

```java
@SpringBootTest
public class SqlInjectionProtectionTest {
    
    @Autowired
    private InputSanitizationService sanitizationService;
    
    @Test
    public void shouldDetectSqlInjectionAttempts() {
        String[] maliciousInputs = {
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "UNION SELECT * FROM sensitive_data",
            "admin'--",
            "' OR 1=1#"
        };
        
        for (String input : maliciousInputs) {
            assertThat(sanitizationService.containsSuspiciousPatterns(input))
                .as("Should detect SQL injection in: " + input)
                .isTrue();
        }
    }
    
    @Test
    public void shouldSanitizeMaliciousInput() {
        String maliciousInput = "'; DROP TABLE users; --";
        String sanitized = sanitizationService.sanitizeInput(maliciousInput);
        
        assertThat(sanitized).doesNotContain("DROP");
        assertThat(sanitized).doesNotContain("--");
    }
    
    @Test
    public void shouldAllowLegitimateInput() {
        String[] legitimateInputs = {
            "John Doe",
            "user@example.com",
            "Normal search query",
            "Product-123",
            "Some description with punctuation!"
        };
        
        for (String input : legitimateInputs) {
            assertThat(sanitizationService.containsSuspiciousPatterns(input))
                .as("Should allow legitimate input: " + input)
                .isFalse();
        }
    }
}
```

### XSS Protection Tests

```java
@SpringBootTest
public class XssProtectionTest {
    
    @Autowired
    private InputSanitizationService sanitizationService;
    
    @Test
    public void shouldDetectXssAttempts() {
        String[] xssPayloads = {
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "onload=alert('xss')",
            "<iframe src=javascript:alert('xss')></iframe>"
        };
        
        for (String payload : xssPayloads) {
            assertThat(sanitizationService.containsSuspiciousPatterns(payload))
                .as("Should detect XSS in: " + payload)
                .isTrue();
        }
    }
    
    @Test
    public void shouldSanitizeXssPayloads() {
        String xssPayload = "<script>alert('xss')</script>";
        String sanitized = sanitizationService.sanitizeInput(xssPayload);
        
        assertThat(sanitized).doesNotContain("<script>");
        assertThat(sanitized).doesNotContain("alert");
    }
}
```

## Brute Force Protection Tests

### Brute Force Protection Testing

```java
@SpringBootTest
@Testcontainers
public class BruteForceProtectionTest {
    
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:6-alpine")
        .withExposedPorts(6379);
    
    @Autowired
    private BruteForceProtectionService bruteForceService;
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
    }
    
    @Test
    public void shouldBlockAfterMaxFailedAttempts() {
        String identifier = "test-user";
        
        // Record failed attempts up to the limit
        for (int i = 0; i < 5; i++) {
            bruteForceService.recordFailedAttempt(identifier);
            assertThat(bruteForceService.isBlocked(identifier)).isFalse();
        }
        
        // One more attempt should trigger block
        bruteForceService.recordFailedAttempt(identifier);
        assertThat(bruteForceService.isBlocked(identifier)).isTrue();
    }
    
    @Test
    public void shouldClearAttemptsOnSuccessfulLogin() {
        String identifier = "test-user-2";
        
        // Record some failed attempts
        bruteForceService.recordFailedAttempt(identifier);
        bruteForceService.recordFailedAttempt(identifier);
        
        // Successful attempt should clear
        bruteForceService.recordSuccessfulAttempt(identifier);
        
        assertThat(bruteForceService.getRemainingAttempts(identifier)).isEqualTo(5);
        assertThat(bruteForceService.isBlocked(identifier)).isFalse();
    }
    
    @Test
    public void shouldTrackRemainingAttempts() {
        String identifier = "test-user-3";
        
        assertThat(bruteForceService.getRemainingAttempts(identifier)).isEqualTo(5);
        
        bruteForceService.recordFailedAttempt(identifier);
        assertThat(bruteForceService.getRemainingAttempts(identifier)).isEqualTo(4);
        
        bruteForceService.recordFailedAttempt(identifier);
        assertThat(bruteForceService.getRemainingAttempts(identifier)).isEqualTo(3);
    }
}
```

## Security Testing Best Practices

### Test Configuration

```java
@TestConfiguration
public class SecurityTestConfig {
    
    @Bean
    @Primary
    public Clock testClock() {
        // Use fixed clock for predictable testing
        return Clock.fixed(Instant.parse("2023-01-01T00:00:00Z"), ZoneOffset.UTC);
    }
    
    @Bean
    @Primary
    @Profile("test")
    public RedisTemplate<String, String> testRedisTemplate() {
        // Use embedded Redis for testing
        return new RedisTemplate<>();
    }
}
```

### Custom Security Test Annotations

```java
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@WithMockUser(authorities = {"RESOURCE_order:view", "RESOURCE_order:create"})
public @interface WithOrderServiceUser {
    String username() default "order-user";
}

@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@WithMockUser(authorities = {"ROLE_ADMIN"})
public @interface WithAdminUser {
    String username() default "admin";
}

// Usage in tests
@Test
@WithOrderServiceUser
public void shouldAllowOrderOperationsForOrderUser() {
    // Test implementation
}

@Test
@WithAdminUser
public void shouldAllowAdminOperations() {
    // Test implementation
}
```

## Best Practices

### Test Organization

- Group related security tests in dedicated test classes
- Use descriptive test names that explain the security behavior being tested
- Test both positive and negative scenarios
- Include edge cases and boundary conditions

### Test Data Management

- Use test-specific data that doesn't interfere with other tests
- Clean up security state between tests
- Use isolated test containers for external dependencies
- Mock external security services when appropriate

### Assertions and Verification

- Verify both HTTP status codes and security headers
- Test the complete security flow, not just individual components
- Verify that sensitive information is not leaked in error responses
- Test timeout and rate limiting scenarios

### Integration Testing

- Test security configurations in realistic environments
- Verify security behavior across service boundaries
- Test security context propagation between services
- Include performance testing for security mechanisms

## Related Documentation

- [OAuth2 Resource Server](oauth2-resource-server.md) - Authentication configuration
- [Authorization Patterns](authorization-patterns.md) - Authorization testing patterns
- [Rate Limiting and Protection](rate-limiting-and-protection.md) - Rate limiting implementation
- [CORS and Headers](cors-and-headers.md) - Security headers configuration