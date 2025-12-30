# API Security: Java/Spring Implementation

## OAuth 2.0 Resource Server

### Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

### Configuration Properties

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/services
          jwk-set-uri: https://auth.example.com/realms/services/protocol/openid-connect/certs
```

### Security Configuration (Spring MVC)

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            );
        
        return http.build();
    }
    
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = 
            new JwtGrantedAuthoritiesConverter();
        grantedAuthoritiesConverter.setAuthoritiesClaimName("scope");
        grantedAuthoritiesConverter.setAuthorityPrefix("SCOPE_");
        
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        return converter;
    }
}
```

### Security Configuration (WebFlux)

```java
@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class ReactiveSecurityConfig {

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .pathMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            .build();
    }
    
    @Bean
    public Converter<Jwt, Mono<AbstractAuthenticationToken>> jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = 
            new JwtGrantedAuthoritiesConverter();
        grantedAuthoritiesConverter.setAuthoritiesClaimName("scope");
        grantedAuthoritiesConverter.setAuthorityPrefix("SCOPE_");
        
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        
        return jwt -> Mono.just(converter.convert(jwt));
    }
}
```

## Authorization with @PreAuthorize

### Scope-Based

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAuthority('SCOPE_orders:read')")
    public ResponseEntity<OrderResponse> getOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal Jwt jwt) {
        
        String userId = jwt.getSubject();
        OrderDto order = orderService.getOrder(orderId, userId);
        return ResponseEntity.ok(orderMapper.toResponse(order));
    }
    
    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_orders:write')")
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        
        String userId = jwt.getSubject();
        OrderDto order = orderService.createOrder(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(orderMapper.toResponse(order));
    }
    
    @DeleteMapping("/{orderId}")
    @PreAuthorize("hasAuthority('SCOPE_orders:delete')")
    public ResponseEntity<Void> deleteOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal Jwt jwt) {
        
        String userId = jwt.getSubject();
        orderService.deleteOrder(orderId, userId);
        return ResponseEntity.noContent().build();
    }
}
```

### Role-Based

```java
@GetMapping("/admin/all")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<List<OrderResponse>> getAllOrders() {
    // Admin-only endpoint
}

@PostMapping("/{orderId}/refund")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
public ResponseEntity<OrderResponse> refundOrder(@PathVariable UUID orderId) {
    // Admin or Support can refund
}
```

### Combined Checks

```java
@PreAuthorize("hasAuthority('SCOPE_orders:read') and hasRole('ADMIN')")
public ResponseEntity<OrderResponse> getOrderWithAudit(@PathVariable UUID orderId) {
    // Requires both scope and role
}
```

## Resource-Based Authorization

### Security Service

```java
@Service
@RequiredArgsConstructor
public class SecurityService {

    private final OrderRepository orderRepository;

    public void checkOrderAccess(UUID orderId, String userId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));
        
        if (!order.getOwnerId().equals(userId)) {
            throw new AccessDeniedException("Access denied to order: " + orderId);
        }
    }
    
    public boolean isOrderOwner(UUID orderId, String userId) {
        return orderRepository.findById(orderId)
            .map(order -> order.getOwnerId().equals(userId))
            .orElse(false);
    }
}
```

### Service with Ownership Check

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final SecurityService securityService;

    @PreAuthorize("hasAuthority('SCOPE_orders:read')")
    public OrderDto getOrder(UUID orderId, String userId) {
        // Scope check via annotation, ownership check manually
        securityService.checkOrderAccess(orderId, userId);
        
        Order order = orderRepository.findById(orderId).orElseThrow();
        return orderMapper.toDto(order);
    }
}
```

### Custom Security Expression

```java
@Component("orderSecurity")
public class OrderSecurityEvaluator {

    private final OrderRepository orderRepository;

    public boolean isOwner(UUID orderId, Authentication authentication) {
        String userId = ((Jwt) authentication.getPrincipal()).getSubject();
        return orderRepository.findById(orderId)
            .map(order -> order.getOwnerId().equals(userId))
            .orElse(false);
    }
}

// Usage in controller
@GetMapping("/{orderId}")
@PreAuthorize("hasAuthority('SCOPE_orders:read') and @orderSecurity.isOwner(#orderId, authentication)")
public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
    // Both scope and ownership checked
}
```

## CORS Configuration

```java
@Configuration
public class CorsConfig {

    @Bean
    @Profile("production")
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
            "https://app.example.com",
            "https://admin.example.com"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(86400L); // 24 hours
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
    
    @Bean
    @Profile("development")
    public CorsConfigurationSource devCorsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("http://localhost:*"));
        configuration.setAllowedMethods(List.of("*"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

## Security Headers

```java
@Configuration
@EnableWebSecurity
public class SecurityHeadersConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'")
                )
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(Customizer.withDefaults())
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                )
                .permissionsPolicy(permissions -> permissions
                    .policy("camera=(), microphone=(), geolocation=()")
                )
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
            );
        
        return http.build();
    }
}
```

## Rate Limiting

### Rate Limit Filter

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response,
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        
        String key = getRateLimitKey(request);
        RateLimitResult result = rateLimitService.checkLimit(key);
        
        // Add rate limit headers
        response.setHeader("X-RateLimit-Limit", String.valueOf(result.getLimit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.getRemaining()));
        response.setHeader("X-RateLimit-Reset", String.valueOf(result.getResetTime()));
        
        if (!result.isAllowed()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(result.getRetryAfter()));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                """
                {
                  "type": "https://example.com/problems/rate-limit-exceeded",
                  "title": "Rate Limit Exceeded",
                  "status": 429,
                  "detail": "Too many requests. Try again later."
                }
                """
            );
            return;
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getRateLimitKey(HttpServletRequest request) {
        // Try to get user ID from JWT
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return "user:" + jwt.getSubject();
        }
        // Fall back to IP
        return "ip:" + request.getRemoteAddr();
    }
}
```

### Rate Limit Service

```java
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final StringRedisTemplate redisTemplate;
    
    private static final int DEFAULT_LIMIT = 100;
    private static final int WINDOW_SECONDS = 60;

    public RateLimitResult checkLimit(String key) {
        String redisKey = "rate_limit:" + key;
        long now = System.currentTimeMillis() / 1000;
        long windowStart = now - WINDOW_SECONDS;
        
        // Remove old entries
        redisTemplate.opsForZSet().removeRangeByScore(redisKey, 0, windowStart);
        
        // Count requests in window
        Long count = redisTemplate.opsForZSet().count(redisKey, windowStart, now);
        long currentCount = count != null ? count : 0;
        
        if (currentCount < DEFAULT_LIMIT) {
            // Add this request
            redisTemplate.opsForZSet().add(redisKey, UUID.randomUUID().toString(), now);
            redisTemplate.expire(redisKey, Duration.ofSeconds(WINDOW_SECONDS));
            
            return RateLimitResult.allowed(DEFAULT_LIMIT, DEFAULT_LIMIT - currentCount - 1, now + WINDOW_SECONDS);
        }
        
        return RateLimitResult.denied(DEFAULT_LIMIT, 0, now + WINDOW_SECONDS, WINDOW_SECONDS);
    }
}

@Value
@Builder
public class RateLimitResult {
    boolean allowed;
    int limit;
    long remaining;
    long resetTime;
    long retryAfter;
    
    public static RateLimitResult allowed(int limit, long remaining, long resetTime) {
        return RateLimitResult.builder()
            .allowed(true)
            .limit(limit)
            .remaining(remaining)
            .resetTime(resetTime)
            .build();
    }
    
    public static RateLimitResult denied(int limit, long remaining, long resetTime, long retryAfter) {
        return RateLimitResult.builder()
            .allowed(false)
            .limit(limit)
            .remaining(remaining)
            .resetTime(resetTime)
            .retryAfter(retryAfter)
            .build();
    }
}
```

## Security Exception Handling

```java
@ControllerAdvice
public class SecurityExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.FORBIDDEN);
        problem.setType(URI.create("https://example.com/problems/access-denied"));
        problem.setTitle("Access Denied");
        problem.setDetail("You do not have permission to access this resource");
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }
    
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthentication(AuthenticationException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
        problem.setType(URI.create("https://example.com/problems/unauthorized"));
        problem.setTitle("Unauthorized");
        problem.setDetail("Authentication required");
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .header("WWW-Authenticate", "Bearer")
            .body(problem);
    }
}
```

## Testing Security

### With MockMvc

```java
@WebMvcTest(OrderController.class)
@Import(SecurityConfig.class)
class OrderControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldRejectUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/v1/orders/123"))
            .andExpect(status().isUnauthorized());
    }
    
    @Test
    @WithMockUser(authorities = "SCOPE_orders:read")
    void shouldAllowWithCorrectScope() throws Exception {
        mockMvc.perform(get("/v1/orders/123"))
            .andExpect(status().isOk());
    }
    
    @Test
    @WithMockUser(authorities = "SCOPE_other:read")
    void shouldDenyWithWrongScope() throws Exception {
        mockMvc.perform(get("/v1/orders/123"))
            .andExpect(status().isForbidden());
    }
    
    @Test
    void shouldAllowWithJwt() throws Exception {
        mockMvc.perform(get("/v1/orders/123")
                .with(jwt().authorities(new SimpleGrantedAuthority("SCOPE_orders:read"))))
            .andExpect(status().isOk());
    }
}
```

### Custom JWT for Tests

```java
@Test
void shouldExtractUserFromJwt() throws Exception {
    Jwt jwt = Jwt.withTokenValue("token")
        .header("alg", "RS256")
        .claim("sub", "user-123")
        .claim("scope", "orders:read orders:write")
        .build();
    
    mockMvc.perform(get("/v1/orders/123")
            .with(jwt().jwt(jwt)))
        .andExpect(status().isOk());
}
```
