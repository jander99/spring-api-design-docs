# Security Testing

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 16 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Authentication, Security, Architecture
> 
> **📊 Complexity:** 9.6 grade level • 3.2% technical density • fairly difficult

## Overview

This guide shows you how to test security in Spring Boot apps.

You will learn to test:
- User login (authentication)
- Access control (authorization)
- Rate limits
- Security headers
- Protection against attacks

The guide covers both imperative and reactive styles.

## Test Authentication and Authorization

### Test Imperative Security

Imperative tests use MockMvc. They verify that users have the right permissions.

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

### Test Reactive Security

Reactive tests use WebTestClient. They verify async permissions.

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

## Test JWT Tokens

### Create JWT Test Helpers

JWT stands for JSON Web Token. These helpers create test tokens with specific claims.

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

## Test Rate Limiting

### Test Rate Limits with Redis

Rate limiting stops users from making too many requests. These tests use Redis and Testcontainers.

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

## Test Security Headers

### Verify Security Headers

Security headers protect your app from attacks. Test that your app sends the right headers.

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

## Test CORS

### Test CORS Settings

CORS stands for Cross-Origin Resource Sharing. It controls which websites can call your API.

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

## Test Security Against Attacks

### Test SQL Injection Protection

SQL injection is an attack where hackers insert malicious database commands. Test that your app blocks these attacks.

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

### Test XSS Protection

XSS stands for Cross-Site Scripting. Attackers inject scripts into your pages. Test that you block these scripts.

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

## Test Brute Force Protection

### Block Repeated Login Attempts

Brute force attacks try many passwords quickly. Test that you block users after too many failed tries.

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

## Best Practices for Security Tests

### Set Up Test Configuration

Use a test configuration to control time and external services. This makes tests predictable.

```java
@TestConfiguration
public class SecurityTestConfig {
    
    @Bean
    @Primary
    public Clock testClock() {
        // Use fixed clock for predictable testing
        return Clock.fixed(Instant.parse("2025-01-01T00:00:00Z"), ZoneOffset.UTC);
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

### Create Custom Test Annotations

Custom annotations make tests cleaner. They define common user roles and permissions.

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

### Organize Your Tests

Group related tests together. Use clear names that explain what you test.

Test both success and failure cases. Include edge cases too.

### Manage Test Data

Use separate data for each test. Clean up after each test runs.

Use test containers for external services. Mock external systems when needed.

### Verify Results

Check HTTP status codes and security headers. Test the full security flow.

Make sure errors don't leak sensitive data. Test timeouts and limits.

### Test Integration

Test security in realistic environments. Verify security across service boundaries.

Test how security context moves between services. Include performance tests.

## Related Documentation

- [OAuth2 Resource Server](oauth2-resource-server.md) - Authentication configuration
- [Authorization Patterns](authorization-patterns.md) - Authorization testing patterns
- [Rate Limiting and Protection](rate-limiting-and-protection.md) - Rate limiting implementation
- [CORS and Headers](cors-and-headers.md) - Security headers configuration