# Security Configuration

## Overview

This document outlines the security configuration patterns for Spring Boot microservices, covering JWT resource server setup, CORS configuration, and security patterns for both reactive and imperative applications.

## Security Configuration Properties

### Security Properties Structure

```yaml
# application.yml
app:
  security:
    jwt:
      issuer-uri: ${JWT_ISSUER_URI:http://localhost:8080/auth/realms/microservices}
    cors:
      allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000}
      allowed-methods: ${CORS_ALLOWED_METHODS:GET,POST,PUT,DELETE,PATCH}
      allowed-headers: ${CORS_ALLOWED_HEADERS:*}
      allow-credentials: ${CORS_ALLOW_CREDENTIALS:true}
```

### Security Properties Class

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

@ConfigurationProperties(prefix = "app.security")
@Validated
public record SecurityProperties(
    @Valid @NotNull Jwt jwt,
    @Valid @NotNull Cors cors
) {
    
    public record Jwt(
        @NotBlank String issuerUri
    ) {}
    
    public record Cors(
        @NotNull List<String> allowedOrigins,
        @NotNull List<String> allowedMethods,
        @NotNull List<String> allowedHeaders,
        boolean allowCredentials
    ) {}
}
```

## Reactive Security Configuration

### WebFlux Security Configuration

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class ReactiveSecurityConfig {

    private final SecurityProperties securityProperties;

    public ReactiveSecurityConfig(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/actuator/health", "/actuator/info").permitAll()
                .pathMatchers("/v1/orders/**").hasAuthority("SCOPE_orders")
                .pathMatchers("/v1/customers/**").hasAuthority("SCOPE_customers")
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtDecoder(reactiveJwtDecoder()))
            )
            .build();
    }

    @Bean
    public ReactiveJwtDecoder reactiveJwtDecoder() {
        return NimbusReactiveJwtDecoder
            .withIssuerLocation(securityProperties.jwt().issuerUri())
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(securityProperties.cors().allowedOrigins());
        configuration.setAllowedMethods(securityProperties.cors().allowedMethods());
        configuration.setAllowedHeaders(securityProperties.cors().allowedHeaders());
        configuration.setAllowCredentials(securityProperties.cors().allowCredentials());
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

## Imperative Security Configuration

### Web MVC Security Configuration

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class WebSecurityConfig {

    private final SecurityProperties securityProperties;

    public WebSecurityConfig(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/v1/orders/**").hasAuthority("SCOPE_orders")
                .requestMatchers("/v1/customers/**").hasAuthority("SCOPE_customers")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
            )
            .build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder
            .withIssuerLocation(securityProperties.jwt().issuerUri())
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(securityProperties.cors().allowedOrigins());
        configuration.setAllowedMethods(securityProperties.cors().allowedMethods());
        configuration.setAllowedHeaders(securityProperties.cors().allowedHeaders());
        configuration.setAllowCredentials(securityProperties.cors().allowCredentials());
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

## Advanced JWT Configuration

### Custom JWT Converter

```java
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import reactor.core.publisher.Mono;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class CustomJwtAuthenticationConverter 
        implements Converter<Jwt, Mono<AbstractAuthenticationToken>> {

    @Override
    public Mono<AbstractAuthenticationToken> convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        return Mono.just(new JwtAuthenticationToken(jwt, authorities));
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        // Extract authorities from realm_access and resource_access claims
        Collection<String> realmRoles = extractRealmRoles(jwt);
        Collection<String> resourceRoles = extractResourceRoles(jwt);
        
        return Stream.concat(realmRoles.stream(), resourceRoles.stream())
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private Collection<String> extractRealmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.containsKey("roles")) {
            return (Collection<String>) realmAccess.get("roles");
        }
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private Collection<String> extractResourceRoles(Jwt jwt) {
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess != null) {
            return resourceAccess.values().stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .filter(clientAccess -> clientAccess.containsKey("roles"))
                .flatMap(clientAccess -> ((Collection<String>) clientAccess.get("roles")).stream())
                .collect(Collectors.toList());
        }
        return List.of();
    }
}
```

### JWT Validation Configuration

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;

import java.time.Duration;
import java.util.List;

@Configuration
public class JwtValidationConfig {

    private final SecurityProperties securityProperties;

    public JwtValidationConfig(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    @Bean
    public ReactiveJwtDecoder reactiveJwtDecoder() {
        NimbusReactiveJwtDecoder jwtDecoder = NimbusReactiveJwtDecoder
            .withIssuerLocation(securityProperties.jwt().issuerUri())
            .jwsAlgorithm(SignatureAlgorithm.RS256)
            .cache(Duration.ofMinutes(5))
            .build();

        jwtDecoder.setJwtValidator(jwtValidator());
        return jwtDecoder;
    }

    @Bean
    public OAuth2TokenValidator<Jwt> jwtValidator() {
        List<OAuth2TokenValidator<Jwt>> validators = List.of(
            new JwtTimestampValidator(),
            new JwtIssuerValidator(securityProperties.jwt().issuerUri()),
            new JwtAudienceValidator("order-service")
        );
        return new DelegatingOAuth2TokenValidator<>(validators);
    }
}
```

## CORS Configuration

### Development CORS Configuration

```java
@Configuration
@Profile("development")
public class DevelopmentCorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("*"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("Authorization", "X-Total-Count"));
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

### Production CORS Configuration

```java
@Configuration
@Profile("production")
public class ProductionCorsConfig {

    private final SecurityProperties securityProperties;

    public ProductionCorsConfig(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(securityProperties.cors().allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH"));
        configuration.setAllowedHeaders(List.of(
            "Authorization", 
            "Content-Type", 
            "X-Requested-With",
            "Accept",
            "Origin"
        ));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("X-Total-Count"));
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

## Method-Level Security

### Security Annotations

```java
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping("/v1/orders")
public class OrderController {

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAuthority('SCOPE_orders:read') or @orderService.isOwner(#orderId, authentication.name)")
    public Mono<OrderResponse> getOrder(
            @PathVariable String orderId,
            @AuthenticationPrincipal Jwt jwt) {
        return orderService.findById(orderId)
            .map(orderMapper::toResponse);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_orders:write')")
    public Mono<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return orderService.create(request, jwt.getSubject())
            .map(orderMapper::toResponse);
    }

    @DeleteMapping("/{orderId}")
    @PreAuthorize("hasRole('ADMIN') or @orderService.isOwner(#orderId, authentication.name)")
    public Mono<Void> deleteOrder(
            @PathVariable String orderId,
            @AuthenticationPrincipal Jwt jwt) {
        return orderService.delete(orderId, jwt.getSubject());
    }
}
```

### Custom Security Expressions

```java
import org.springframework.security.access.expression.SecurityExpressionRoot;
import org.springframework.security.access.expression.method.MethodSecurityExpressionOperations;
import org.springframework.security.core.Authentication;

public class CustomMethodSecurityExpressionRoot extends SecurityExpressionRoot 
        implements MethodSecurityExpressionOperations {

    private final OrderService orderService;

    public CustomMethodSecurityExpressionRoot(Authentication authentication, OrderService orderService) {
        super(authentication);
        this.orderService = orderService;
    }

    public boolean isOrderOwner(String orderId) {
        String userId = getAuthentication().getName();
        return orderService.isOwner(orderId, userId);
    }

    public boolean hasOrderAccess(String orderId, String permission) {
        String userId = getAuthentication().getName();
        return orderService.hasAccess(orderId, userId, permission);
    }

    // MethodSecurityExpressionOperations implementation
    @Override
    public void setFilterObject(Object filterObject) {
        this.filterObject = filterObject;
    }

    @Override
    public Object getFilterObject() {
        return this.filterObject;
    }

    @Override
    public void setReturnObject(Object returnObject) {
        this.returnObject = returnObject;
    }

    @Override
    public Object getReturnObject() {
        return this.returnObject;
    }

    private Object filterObject;
    private Object returnObject;
}
```

## Security Testing Configuration

### Test Security Configuration

```java
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.time.Instant;
import java.util.Map;

@TestConfiguration
public class TestSecurityConfig {

    @Bean
    @Primary
    public JwtDecoder jwtDecoder() {
        return token -> createMockJwt();
    }

    private Jwt createMockJwt() {
        return Jwt.withTokenValue("mock-token")
            .header("alg", "RS256")
            .subject("test-user")
            .issuer("http://localhost:8080/auth/realms/test")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .claim("scope", "orders:read orders:write")
            .claim("preferred_username", "testuser")
            .build();
    }
}
```

### Security Integration Tests

```java
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class SecurityIntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    @WithMockUser(authorities = {"SCOPE_orders:read"})
    void shouldAllowAccessWithValidScope() {
        webTestClient.get()
            .uri("/v1/orders/123")
            .exchange()
            .expectStatus().isOk();
    }

    @Test
    void shouldRejectUnauthenticatedAccess() {
        webTestClient.get()
            .uri("/v1/orders/123")
            .exchange()
            .expectStatus().isUnauthorized();
    }

    @Test
    @WithMockUser(authorities = {"SCOPE_invalid"})
    void shouldRejectInvalidScope() {
        webTestClient.get()
            .uri("/v1/orders/123")
            .exchange()
            .expectStatus().isForbidden();
    }
}
```

## Security Configuration by Environment

### Development Security (Relaxed)

```yaml
# application-development.yml
app:
  security:
    jwt:
      issuer-uri: http://localhost:8080/auth/realms/dev
    cors:
      allowed-origins: ["http://localhost:3000", "http://localhost:8080"]
      allowed-methods: ["*"]
      allowed-headers: ["*"]
      allow-credentials: true

logging:
  level:
    org.springframework.security: DEBUG
```

### Production Security (Strict)

```yaml
# application-production.yml
app:
  security:
    jwt:
      issuer-uri: ${JWT_ISSUER_URI}
    cors:
      allowed-origins: ["https://api.example.com", "https://app.example.com"]
      allowed-methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
      allowed-headers: ["Authorization", "Content-Type", "Accept"]
      allow-credentials: true

logging:
  level:
    org.springframework.security: WARN
```

## Security Best Practices

### 1. Principle of Least Privilege

- Grant minimal required authorities
- Use specific scopes instead of broad permissions
- Implement resource-based authorization

### 2. JWT Validation

- Always validate JWT signature
- Verify issuer and audience claims
- Implement proper token expiration handling

### 3. CORS Configuration

- Never use wildcard origins in production
- Specify explicit allowed headers and methods
- Implement proper preflight handling

### 4. Security Headers

```java
@Bean
public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
    return http
        .headers(headers -> headers
            .frameOptions(ServerHttpSecurity.HeaderSpec.FrameOptionsSpec::deny)
            .contentTypeOptions(Customizer.withDefaults())
            .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                .maxAgeInSeconds(31536000)
                .includeSubdomains(true)
            )
        )
        // ... other configuration
        .build();
}
```

## Related Documentation

- [Configuration Principles](Configuration-Principles.md) - Core configuration concepts
- [Environment Profiles](Environment-Profiles.md) - Profile-specific security configuration
- [External Services](External-Services.md) - Secure service-to-service communication
- [Authorization Patterns](../security/Authorization-Patterns.md) - Authorization implementation patterns

This security configuration ensures robust authentication and authorization for Spring Boot microservices while maintaining flexibility across different environments.