# OAuth 2.0/OIDC Resource Server Configuration

> **Reading Guide**
> - **Level**: Intermediate-Advanced
> - **Audience**: Engineers implementing OAuth 2.0 resource servers
> - **Prerequisites**: Basic Spring Security knowledge, OAuth 2.0 concepts
> - **Time to Read**: 15-20 minutes

## Overview

This document covers OAuth 2.0/OIDC resource server configuration in Spring Boot. A resource server validates access tokens and protects API endpoints. It provides patterns for both imperative (Spring MVC) and reactive (WebFlux) implementations.

Resource servers receive tokens from clients and validate them before granting access. Spring Security supports two token types: JWT (self-contained) and opaque tokens (reference tokens requiring introspection).

## Basic Resource Server Configuration

### Imperative Services (Spring MVC)

Configure Spring Security as an OAuth 2.0 resource server:

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())))
            .build();
    }
    
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            return extractResourcePermissions(jwt);
        });
        return converter;
    }
    
    private Collection<GrantedAuthority> extractResourcePermissions(Jwt jwt) {
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess == null) {
            return Collections.emptyList();
        }
        
        List<String> permissions = new ArrayList<>();
        
        @SuppressWarnings("unchecked")
        Map<String, Object> resources = (Map<String, Object>) 
            resourceAccess.get("order-service");
        if (resources != null && resources.containsKey("resources")) {
            @SuppressWarnings("unchecked")
            List<String> resourceList = (List<String>) resources.get("resources");
            permissions.addAll(resourceList);
        }
        
        return permissions.stream()
            .map(p -> new SimpleGrantedAuthority("RESOURCE_" + p))
            .collect(Collectors.toList());
    }
}
```

### Reactive Services (WebFlux)

```java
@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class ReactiveSecurityConfig {
    
    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .pathMatchers("/api-docs/**", "/swagger-ui/**").permitAll()
                .anyExchange().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())))
            .build();
    }
    
    @Bean
    public Converter<Jwt, Mono<AbstractAuthenticationToken>> jwtAuthenticationConverter() {
        return jwt -> {
            Collection<GrantedAuthority> authorities = extractResourcePermissions(jwt);
            return Mono.just(new JwtAuthenticationToken(jwt, authorities));
        };
    }
    
    private Collection<GrantedAuthority> extractResourcePermissions(Jwt jwt) {
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess == null) {
            return Collections.emptyList();
        }
        
        List<String> permissions = new ArrayList<>();
        
        @SuppressWarnings("unchecked")
        Map<String, Object> resources = (Map<String, Object>) 
            resourceAccess.get("order-service");
        if (resources != null && resources.containsKey("resources")) {
            @SuppressWarnings("unchecked")
            List<String> resourceList = (List<String>) resources.get("resources");
            permissions.addAll(resourceList);
        }
        
        return permissions.stream()
            .map(p -> new SimpleGrantedAuthority("RESOURCE_" + p))
            .collect(Collectors.toList());
    }
}
```

## JWT Configuration Properties

Configure JWT validation properties in application.yml:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/services
          jwk-set-uri: https://auth.example.com/realms/services/protocol/openid-connect/certs
```

## Multi-Tenant JWT Validation

Multi-tenant applications need to validate tokens from multiple identity providers. Each tenant may have its own OAuth server with different issuer URIs.

### Multiple Issuers Support

Spring Security's `JwtIssuerAuthenticationManagerResolver` handles multiple issuers:

```java
@Configuration
@EnableWebSecurity
public class MultiTenantSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .authenticationManagerResolver(multiTenantAuthenticationManager()))
            .build();
    }
    
    @Bean
    public JwtIssuerAuthenticationManagerResolver multiTenantAuthenticationManager() {
        // Define trusted issuers for each tenant
        List<String> trustedIssuers = List.of(
            "https://auth.tenant-a.example.com/realms/api",
            "https://auth.tenant-b.example.com/realms/api",
            "https://auth.tenant-c.example.com/realms/api"
        );
        
        return JwtIssuerAuthenticationManagerResolver
            .fromTrustedIssuers(trustedIssuers);
    }
}
```

### Tenant-Based Issuer Resolution

For dynamic tenant resolution based on request context:

```java
@Component
public class TenantJwtIssuerResolver implements AuthenticationManagerResolver<HttpServletRequest> {
    
    private final TenantRepository tenantRepository;
    private final Map<String, AuthenticationManager> authenticationManagers = 
        new ConcurrentHashMap<>();
    
    public TenantJwtIssuerResolver(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }
    
    @Override
    public AuthenticationManager resolve(HttpServletRequest request) {
        String tenantId = extractTenantId(request);
        
        return authenticationManagers.computeIfAbsent(tenantId, this::buildAuthManager);
    }
    
    private String extractTenantId(HttpServletRequest request) {
        // Extract tenant from header, subdomain, or path
        String tenantHeader = request.getHeader("X-Tenant-ID");
        if (tenantHeader != null) {
            return tenantHeader;
        }
        
        // Fallback: extract from host subdomain
        String host = request.getServerName();
        if (host.contains(".")) {
            return host.split("\\.")[0];
        }
        
        throw new TenantNotFoundException("Cannot determine tenant from request");
    }
    
    private AuthenticationManager buildAuthManager(String tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
            .orElseThrow(() -> new TenantNotFoundException(tenantId));
        
        JwtDecoder jwtDecoder = JwtDecoders.fromIssuerLocation(tenant.getIssuerUri());
        JwtAuthenticationProvider provider = new JwtAuthenticationProvider(jwtDecoder);
        provider.setJwtAuthenticationConverter(new JwtAuthenticationConverter());
        
        return provider::authenticate;
    }
}
```

### Custom JwtIssuerValidator

Validate the issuer claim with custom logic:

```java
@Component
public class CustomJwtIssuerValidator implements OAuth2TokenValidator<Jwt> {
    
    private final Set<String> allowedIssuers;
    private final TenantService tenantService;
    
    public CustomJwtIssuerValidator(TenantService tenantService) {
        this.tenantService = tenantService;
        this.allowedIssuers = new ConcurrentHashSet<>();
        refreshAllowedIssuers();
    }
    
    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        String issuer = token.getIssuer().toString();
        
        if (!allowedIssuers.contains(issuer)) {
            OAuth2Error error = new OAuth2Error(
                OAuth2ErrorCodes.INVALID_TOKEN,
                "Untrusted issuer: " + issuer,
                null
            );
            return OAuth2TokenValidatorResult.failure(error);
        }
        
        return OAuth2TokenValidatorResult.success();
    }
    
    @Scheduled(fixedRate = 300000) // Refresh every 5 minutes
    public void refreshAllowedIssuers() {
        Set<String> issuers = tenantService.getAllActiveTenants().stream()
            .map(Tenant::getIssuerUri)
            .collect(Collectors.toSet());
        
        allowedIssuers.clear();
        allowedIssuers.addAll(issuers);
    }
}
```

## Opaque Token Introspection

Opaque tokens are reference tokens. They require introspection calls to the authorization server for validation. Use opaque tokens when you need immediate token revocation or want to hide token contents.

### Configuration for Opaque Tokens

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        opaquetoken:
          introspection-uri: https://auth.example.com/oauth2/introspect
          client-id: resource-server
          client-secret: ${INTROSPECTION_CLIENT_SECRET}
```

```java
@Configuration
@EnableWebSecurity
public class OpaqueTokenSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .opaqueToken(opaque -> opaque
                    .introspector(opaqueTokenIntrospector())))
            .build();
    }
    
    @Bean
    public OpaqueTokenIntrospector opaqueTokenIntrospector() {
        return new NimbusOpaqueTokenIntrospector(
            "https://auth.example.com/oauth2/introspect",
            "resource-server",
            "client-secret"
        );
    }
}
```

### Custom Introspection with Authority Extraction

```java
@Component
public class CustomOpaqueTokenIntrospector implements OpaqueTokenIntrospector {
    
    private final OpaqueTokenIntrospector delegate;
    
    public CustomOpaqueTokenIntrospector(
            @Value("${spring.security.oauth2.resourceserver.opaquetoken.introspection-uri}") 
            String introspectionUri,
            @Value("${spring.security.oauth2.resourceserver.opaquetoken.client-id}") 
            String clientId,
            @Value("${spring.security.oauth2.resourceserver.opaquetoken.client-secret}") 
            String clientSecret) {
        
        this.delegate = new NimbusOpaqueTokenIntrospector(
            introspectionUri, clientId, clientSecret);
    }
    
    @Override
    public OAuth2AuthenticatedPrincipal introspect(String token) {
        OAuth2AuthenticatedPrincipal principal = delegate.introspect(token);
        
        // Extract and transform authorities from introspection response
        Collection<GrantedAuthority> authorities = extractAuthorities(principal);
        
        return new DefaultOAuth2AuthenticatedPrincipal(
            principal.getName(),
            principal.getAttributes(),
            authorities
        );
    }
    
    private Collection<GrantedAuthority> extractAuthorities(
            OAuth2AuthenticatedPrincipal principal) {
        
        List<GrantedAuthority> authorities = new ArrayList<>();
        
        // Extract scope-based authorities
        Object scopeClaim = principal.getAttribute("scope");
        if (scopeClaim instanceof String scope) {
            Arrays.stream(scope.split(" "))
                .map(s -> new SimpleGrantedAuthority("SCOPE_" + s))
                .forEach(authorities::add);
        }
        
        // Extract custom resource permissions
        Object permissions = principal.getAttribute("permissions");
        if (permissions instanceof List<?> permList) {
            permList.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .map(p -> new SimpleGrantedAuthority("RESOURCE_" + p))
                .forEach(authorities::add);
        }
        
        return authorities;
    }
}
```

### Caching Introspection Results

Introspection calls add latency. Cache results to improve performance:

```java
@Configuration
public class CachingIntrospectorConfig {
    
    @Bean
    public OpaqueTokenIntrospector cachingIntrospector(
            OpaqueTokenIntrospector delegate,
            CacheManager cacheManager) {
        
        return new CachingOpaqueTokenIntrospector(delegate, cacheManager);
    }
}

@Component
public class CachingOpaqueTokenIntrospector implements OpaqueTokenIntrospector {
    
    private static final String CACHE_NAME = "token-introspection";
    
    private final OpaqueTokenIntrospector delegate;
    private final Cache cache;
    
    public CachingOpaqueTokenIntrospector(
            OpaqueTokenIntrospector delegate,
            CacheManager cacheManager) {
        this.delegate = delegate;
        this.cache = cacheManager.getCache(CACHE_NAME);
    }
    
    @Override
    public OAuth2AuthenticatedPrincipal introspect(String token) {
        // Use token hash as cache key to avoid storing tokens directly
        String cacheKey = DigestUtils.sha256Hex(token);
        
        OAuth2AuthenticatedPrincipal cached = cache.get(cacheKey, 
            OAuth2AuthenticatedPrincipal.class);
        
        if (cached != null) {
            // Verify token hasn't expired since caching
            Instant expiry = cached.getAttribute("exp");
            if (expiry != null && expiry.isAfter(Instant.now())) {
                return cached;
            }
            cache.evict(cacheKey);
        }
        
        OAuth2AuthenticatedPrincipal principal = delegate.introspect(token);
        
        // Cache with TTL based on token expiry
        Instant tokenExpiry = principal.getAttribute("exp");
        if (tokenExpiry != null) {
            Duration ttl = Duration.between(Instant.now(), tokenExpiry);
            if (ttl.toSeconds() > 30) {
                cache.put(cacheKey, principal);
            }
        }
        
        return principal;
    }
}
```

## Custom Claim Validation

Beyond standard JWT validation, add custom validators for business-specific requirements.

### Audience Validation

Ensure tokens are intended for your service:

```java
@Configuration
public class JwtValidationConfig {
    
    @Value("${app.security.jwt.audience}")
    private String expectedAudience;
    
    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") 
            String jwkSetUri) {
        
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder
            .withJwkSetUri(jwkSetUri)
            .build();
        
        OAuth2TokenValidator<Jwt> audienceValidator = new AudienceValidator(expectedAudience);
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(
            "https://auth.example.com/realms/api");
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
            withIssuer, audienceValidator);
        
        jwtDecoder.setJwtValidator(validator);
        
        return jwtDecoder;
    }
}

public class AudienceValidator implements OAuth2TokenValidator<Jwt> {
    
    private final String expectedAudience;
    
    public AudienceValidator(String expectedAudience) {
        this.expectedAudience = expectedAudience;
    }
    
    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        List<String> audiences = jwt.getAudience();
        
        if (audiences == null || !audiences.contains(expectedAudience)) {
            OAuth2Error error = new OAuth2Error(
                OAuth2ErrorCodes.INVALID_TOKEN,
                "Token audience does not include: " + expectedAudience,
                null
            );
            return OAuth2TokenValidatorResult.failure(error);
        }
        
        return OAuth2TokenValidatorResult.success();
    }
}
```

### Custom Claim Validators

Validate custom claims for your business rules:

```java
public class TenantClaimValidator implements OAuth2TokenValidator<Jwt> {
    
    private final TenantService tenantService;
    
    public TenantClaimValidator(TenantService tenantService) {
        this.tenantService = tenantService;
    }
    
    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        String tenantId = jwt.getClaimAsString("tenant_id");
        
        if (tenantId == null) {
            OAuth2Error error = new OAuth2Error(
                OAuth2ErrorCodes.INVALID_TOKEN,
                "Missing required claim: tenant_id",
                null
            );
            return OAuth2TokenValidatorResult.failure(error);
        }
        
        if (!tenantService.isActiveTenant(tenantId)) {
            OAuth2Error error = new OAuth2Error(
                OAuth2ErrorCodes.INVALID_TOKEN,
                "Tenant is not active: " + tenantId,
                null
            );
            return OAuth2TokenValidatorResult.failure(error);
        }
        
        return OAuth2TokenValidatorResult.success();
    }
}

public class RequiredScopesValidator implements OAuth2TokenValidator<Jwt> {
    
    private final Set<String> requiredScopes;
    
    public RequiredScopesValidator(String... requiredScopes) {
        this.requiredScopes = Set.of(requiredScopes);
    }
    
    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        List<String> tokenScopes = jwt.getClaimAsStringList("scope");
        
        if (tokenScopes == null) {
            String scopeString = jwt.getClaimAsString("scope");
            tokenScopes = scopeString != null 
                ? Arrays.asList(scopeString.split(" "))
                : Collections.emptyList();
        }
        
        Set<String> missingScopes = requiredScopes.stream()
            .filter(required -> !tokenScopes.contains(required))
            .collect(Collectors.toSet());
        
        if (!missingScopes.isEmpty()) {
            OAuth2Error error = new OAuth2Error(
                OAuth2ErrorCodes.INSUFFICIENT_SCOPE,
                "Missing required scopes: " + missingScopes,
                null
            );
            return OAuth2TokenValidatorResult.failure(error);
        }
        
        return OAuth2TokenValidatorResult.success();
    }
}
```

### Combining Multiple Validators

```java
@Configuration
public class ComprehensiveJwtValidationConfig {
    
    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") 
            String jwkSetUri,
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") 
            String issuerUri,
            TenantService tenantService) {
        
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder
            .withJwkSetUri(jwkSetUri)
            .build();
        
        // Build composite validator
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(issuerUri),
            new AudienceValidator("order-service"),
            new TenantClaimValidator(tenantService),
            new RequiredScopesValidator("api.read")
        );
        
        jwtDecoder.setJwtValidator(validator);
        
        return jwtDecoder;
    }
}
```

## JWT Decoder Customization

Fine-tune JWT decoding behavior for security and performance.

### Clock Skew Configuration

Account for time differences between servers:

```java
@Bean
public JwtDecoder jwtDecoder(
        @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") 
        String jwkSetUri) {
    
    NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder
        .withJwkSetUri(jwkSetUri)
        .build();
    
    // Allow 30 seconds of clock skew
    OAuth2TokenValidator<Jwt> withClockSkew = new JwtTimestampValidator(
        Duration.ofSeconds(30));
    
    OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
        withClockSkew,
        new JwtIssuerValidator("https://auth.example.com/realms/api")
    );
    
    jwtDecoder.setJwtValidator(validator);
    
    return jwtDecoder;
}
```

### Custom Algorithm Restrictions

Restrict allowed signing algorithms for security:

```java
@Bean
public JwtDecoder jwtDecoder(
        @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") 
        String jwkSetUri) {
    
    // Only allow RS256 and RS384 algorithms
    NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder
        .withJwkSetUri(jwkSetUri)
        .jwsAlgorithms(algorithms -> {
            algorithms.add(SignatureAlgorithm.RS256);
            algorithms.add(SignatureAlgorithm.RS384);
            // Explicitly exclude weaker algorithms
        })
        .build();
    
    return jwtDecoder;
}
```

### JWK Set Caching

Configure caching for JWK set retrieval:

```java
@Bean
public JwtDecoder jwtDecoder(
        @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") 
        String jwkSetUri) {
    
    // Configure HTTP client with caching
    RestOperations restOperations = new RestTemplateBuilder()
        .setConnectTimeout(Duration.ofSeconds(5))
        .setReadTimeout(Duration.ofSeconds(5))
        .build();
    
    NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder
        .withJwkSetUri(jwkSetUri)
        .restOperations(restOperations)
        .cache(Duration.ofMinutes(5))  // Cache JWKs for 5 minutes
        .build();
    
    return jwtDecoder;
}
```

### Reactive JWK Set Caching

For WebFlux applications:

```java
@Bean
public ReactiveJwtDecoder reactiveJwtDecoder(
        @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") 
        String jwkSetUri) {
    
    NimbusReactiveJwtDecoder jwtDecoder = NimbusReactiveJwtDecoder
        .withJwkSetUri(jwkSetUri)
        .jwsAlgorithm(SignatureAlgorithm.RS256)
        .build();
    
    // Add custom validators
    jwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefault(),
        new AudienceValidator("order-service")
    ));
    
    return jwtDecoder;
}
```

## Token Refresh Patterns

Resource servers don't handle token refresh directly. However, they should handle expired tokens gracefully and provide clear feedback to clients.

### Client-Side Refresh Handling

Configure proper error responses for expired tokens:

```java
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {
    
    private final ObjectMapper objectMapper;
    
    public JwtAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }
    
    @Override
    public void commence(HttpServletRequest request, 
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        
        ErrorResponse errorResponse = createErrorResponse(authException);
        
        objectMapper.writeValue(response.getOutputStream(), errorResponse);
    }
    
    private ErrorResponse createErrorResponse(AuthenticationException exception) {
        String error = "invalid_token";
        String description = "Access token is invalid or expired";
        
        if (exception instanceof JwtExpiredException) {
            description = "Access token has expired. Please refresh your token.";
        } else if (exception instanceof JwtValidationException jwtEx) {
            Collection<OAuth2Error> errors = jwtEx.getErrors();
            description = errors.stream()
                .map(OAuth2Error::getDescription)
                .collect(Collectors.joining("; "));
        }
        
        return new ErrorResponse(error, description);
    }
    
    public record ErrorResponse(String error, String errorDescription) {}
}
```

### Token Expiry Detection Middleware

Log and track token expiry patterns:

```java
@Component
public class TokenExpiryLoggingFilter extends OncePerRequestFilter {
    
    private static final Logger log = LoggerFactory.getLogger(TokenExpiryLoggingFilter.class);
    private final MeterRegistry meterRegistry;
    
    public TokenExpiryLoggingFilter(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        
        try {
            filterChain.doFilter(request, response);
        } finally {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                checkTokenExpiry(jwtAuth.getToken());
            }
        }
    }
    
    private void checkTokenExpiry(Jwt jwt) {
        Instant expiry = jwt.getExpiresAt();
        if (expiry == null) return;
        
        Duration remaining = Duration.between(Instant.now(), expiry);
        
        if (remaining.toMinutes() < 5) {
            log.debug("Token expiring soon for subject: {}, remaining: {}s",
                jwt.getSubject(), remaining.toSeconds());
            
            meterRegistry.counter("jwt.expiring_soon").increment();
        }
    }
}
```

### Grace Period Configuration

Allow a brief grace period for nearly-expired tokens:

```java
public class GracePeriodJwtValidator implements OAuth2TokenValidator<Jwt> {
    
    private final Duration gracePeriod;
    private final MeterRegistry meterRegistry;
    
    public GracePeriodJwtValidator(Duration gracePeriod, MeterRegistry meterRegistry) {
        this.gracePeriod = gracePeriod;
        this.meterRegistry = meterRegistry;
    }
    
    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Instant expiry = jwt.getExpiresAt();
        
        if (expiry == null) {
            return OAuth2TokenValidatorResult.success();
        }
        
        Instant now = Instant.now();
        
        if (expiry.isBefore(now)) {
            // Token is expired - check if within grace period
            Duration expired = Duration.between(expiry, now);
            
            if (expired.compareTo(gracePeriod) <= 0) {
                // Within grace period - allow but log
                meterRegistry.counter("jwt.grace_period_used").increment();
                return OAuth2TokenValidatorResult.success();
            }
            
            OAuth2Error error = new OAuth2Error(
                OAuth2ErrorCodes.INVALID_TOKEN,
                "Token has expired",
                null
            );
            return OAuth2TokenValidatorResult.failure(error);
        }
        
        return OAuth2TokenValidatorResult.success();
    }
}
```

## Testing OAuth2 Resource Server

Thorough testing ensures your security configuration works correctly.

### Unit Testing with Mock JWTs

Use `@WithMockUser` and `SecurityMockMvcRequestPostProcessors`:

```java
@WebMvcTest(OrderController.class)
@Import(SecurityConfig.class)
class OrderControllerSecurityTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void getOrder_withValidJwt_returnsOrder() throws Exception {
        Order order = new Order("123", "Test Order");
        when(orderService.findById("123")).thenReturn(Optional.of(order));
        
        mockMvc.perform(get("/api/v1/orders/123")
                .with(jwt()
                    .jwt(jwt -> jwt
                        .subject("user123")
                        .claim("scope", "api.read")
                        .claim("tenant_id", "tenant-a"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("123"));
    }
    
    @Test
    void getOrder_withoutToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/orders/123"))
            .andExpect(status().isUnauthorized());
    }
    
    @Test
    void getOrder_withExpiredToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/orders/123")
                .with(jwt()
                    .jwt(jwt -> jwt
                        .subject("user123")
                        .expiresAt(Instant.now().minus(Duration.ofHours(1))))))
            .andExpect(status().isUnauthorized());
    }
    
    @Test
    void getOrder_withWrongAudience_returnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/orders/123")
                .with(jwt()
                    .jwt(jwt -> jwt
                        .subject("user123")
                        .audience(List.of("wrong-service")))))
            .andExpect(status().isForbidden());
    }
}
```

### Testing Custom Authority Extraction

```java
@SpringBootTest
class JwtAuthenticationConverterTest {
    
    @Autowired
    private JwtAuthenticationConverter converter;
    
    @Test
    void shouldExtractResourcePermissions() {
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .subject("user123")
            .claim("resource_access", Map.of(
                "order-service", Map.of(
                    "resources", List.of("order:view", "order:create")
                )
            ))
            .build();
        
        AbstractAuthenticationToken authentication = converter.convert(jwt);
        
        assertThat(authentication.getAuthorities())
            .extracting(GrantedAuthority::getAuthority)
            .containsExactlyInAnyOrder(
                "RESOURCE_order:view",
                "RESOURCE_order:create"
            );
    }
    
    @Test
    void shouldHandleMissingResourceAccess() {
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .subject("user123")
            .build();
        
        AbstractAuthenticationToken authentication = converter.convert(jwt);
        
        assertThat(authentication.getAuthorities()).isEmpty();
    }
}
```

### Integration Testing Patterns

Test the full security chain with a test container or WireMock:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class OAuth2IntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private JwtEncoder jwtEncoder;  // Test encoder for creating valid JWTs
    
    @Test
    void fullSecurityChain_withValidToken_succeeds() throws Exception {
        String token = createTestToken("user123", "tenant-a", "api.read");
        
        mockMvc.perform(get("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isOk());
    }
    
    @Test
    void fullSecurityChain_withRevokedToken_fails() throws Exception {
        // This test requires a token revocation check implementation
        String revokedToken = createTestToken("user123", "tenant-a", "api.read");
        revokeToken(revokedToken);
        
        mockMvc.perform(get("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + revokedToken))
            .andExpect(status().isUnauthorized());
    }
    
    private String createTestToken(String subject, String tenant, String... scopes) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .subject(subject)
            .issuer("https://test-auth.example.com")
            .audience(List.of("order-service"))
            .claim("tenant_id", tenant)
            .claim("scope", String.join(" ", scopes))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plus(Duration.ofHours(1)))
            .build();
        
        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
}
```

### Reactive Testing

```java
@WebFluxTest(OrderController.class)
@Import(ReactiveSecurityConfig.class)
class ReactiveOrderControllerSecurityTest {
    
    @Autowired
    private WebTestClient webClient;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void getOrder_withValidJwt_returnsOrder() {
        Order order = new Order("123", "Test Order");
        when(orderService.findById("123")).thenReturn(Mono.just(order));
        
        webClient.mutateWith(mockJwt()
                .jwt(jwt -> jwt
                    .subject("user123")
                    .claim("scope", "api.read")))
            .get().uri("/api/v1/orders/123")
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.id").isEqualTo("123");
    }
    
    @Test
    void getOrder_withoutToken_returnsUnauthorized() {
        webClient.get().uri("/api/v1/orders/123")
            .exchange()
            .expectStatus().isUnauthorized();
    }
}
```

## Security Principles

1. **Defense in Depth**: Implement multiple layers of security controls
2. **Least Privilege**: Grant only the minimum access necessary
3. **Secure by Default**: Apply security by default, not as an afterthought
4. **No Security by Obscurity**: Don't rely on secrecy of implementation
5. **Fail Securely**: Security controls should fail in a secure manner

## Best Practices

### JWT Token Validation

- Always validate JWT signatures using the issuer's public keys
- Verify the issuer (`iss`) claim matches your expected authorization server
- Check the audience (`aud`) claim to ensure the token is intended for your service
- Validate token expiration (`exp`) and not-before (`nbf`) claims
- Implement additional custom claim validation based on business requirements

### Error Handling

- Never expose internal security details in error responses
- Log security events for audit purposes
- Return generic error messages for authentication failures
- Implement proper rate limiting to prevent brute force attacks

### Configuration Security

- Store sensitive values (client secrets, JWK URIs) securely
- Use environment variables or secure configuration services
- Never commit sensitive values to version control
- Regularly rotate client credentials and secrets

## Related Documentation

- [Authorization Patterns](authorization-patterns.md) - Resource-based authorization implementation
- [Security Context Propagation](security-context-propagation.md) - Service-to-service security
- [Security Testing](security-testing.md) - Testing OAuth 2.0 integration
