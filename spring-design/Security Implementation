# Security Implementation

## Overview

Consistent security implementation is essential for protecting our microservices ecosystem. This document outlines our approach to implementing security in Spring Boot applications, covering authentication, authorization, secure communication, and security best practices for both imperative and reactive services.

## Security Principles

1. **Defense in Depth**: Implement multiple layers of security controls
2. **Least Privilege**: Grant only the minimum access necessary
3. **Secure by Default**: Apply security by default, not as an afterthought
4. **No Security by Obscurity**: Don't rely on secrecy of implementation
5. **Fail Securely**: Security controls should fail in a secure manner

## OAuth 2.0 Implementation

### OAuth 2.0 Resource Server Configuration

Configure Spring Security as an OAuth 2.0 resource server:

#### Imperative Services (Spring MVC)

```java
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .authorizeRequests()
                .antMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .antMatchers("/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated()
            .and()
            .oauth2ResourceServer()
                .jwt()
                .jwtAuthenticationConverter(jwtAuthenticationConverter());
    }
    
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            // Custom logic to extract resource permissions from JWT
            // Instead of using roles/scopes, extract resource permissions
            return extractResourcePermissions(jwt);
        });
        return converter;
    }
    
    private Collection<GrantedAuthority> extractResourcePermissions(Jwt jwt) {
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess == null) {
            return Collections.emptyList();
        }
        
        // Extract resource permissions based on our custom binary 
        // resource-based authorization model
        List<String> permissions = new ArrayList<>();
        
        // Extract permissions based on claims structure
        Map<String, Object> resources = (Map<String, Object>) resourceAccess.get("order-service");
        if (resources != null && resources.containsKey("resources")) {
            List<String> resourceList = (List<String>) resources.get("resources");
            permissions.addAll(resourceList);
        }
        
        return permissions.stream()
            .map(p -> new SimpleGrantedAuthority("RESOURCE_" + p))
            .collect(Collectors.toList());
    }
}
```

#### Reactive Services (WebFlux)

```java
@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class ReactiveSecurityConfig {
    
    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf().disable()
            .authorizeExchange()
                .pathMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .pathMatchers("/api-docs/**", "/swagger-ui/**").permitAll()
                .anyExchange().authenticated()
            .and()
            .oauth2ResourceServer()
                .jwt()
                .jwtAuthenticationConverter(jwtAuthenticationConverter())
            .and()
            .build();
    }
    
    @Bean
    public Converter<Jwt, Mono<AbstractAuthenticationToken>> jwtAuthenticationConverter() {
        return jwt -> {
            // Custom logic to extract resource permissions from JWT
            Collection<GrantedAuthority> authorities = extractResourcePermissions(jwt);
            return Mono.just(new JwtAuthenticationToken(jwt, authorities));
        };
    }
    
    private Collection<GrantedAuthority> extractResourcePermissions(Jwt jwt) {
        // Same extraction logic as in imperative example
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess == null) {
            return Collections.emptyList();
        }
        
        List<String> permissions = new ArrayList<>();
        
        Map<String, Object> resources = (Map<String, Object>) resourceAccess.get("order-service");
        if (resources != null && resources.containsKey("resources")) {
            List<String> resourceList = (List<String>) resources.get("resources");
            permissions.addAll(resourceList);
        }
        
        return permissions.stream()
            .map(p -> new SimpleGrantedAuthority("RESOURCE_" + p))
            .collect(Collectors.toList());
    }
}
```

### JWT Configuration Properties

Configure JWT validation properties:

```yaml
# application.yml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/services
          jwk-set-uri: https://auth.example.com/realms/services/protocol/openid-connect/certs
```

## Binary Resource-Based Authorization

Implement our custom binary resource-based authorization model:

### Resource Permission Mapping

Define resource permissions for our services:

```java
package com.example.common.security;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class OrderServicePermissions {
    
    // Create permissions with resource identifier and action
    public static final String VIEW_ORDERS = "order:view";
    public static final String CREATE_ORDERS = "order:create";
    public static final String UPDATE_ORDERS = "order:update";
    public static final String DELETE_ORDERS = "order:delete";
    
    // Fine-grained administrative permissions
    public static final String CANCEL_ORDER = "order:cancel";
    public static final String REFUND_ORDER = "order:refund";
    
    // Customer-specific permissions
    public static final String VIEW_CUSTOMER_ORDERS = "customer-order:view";
}
```

### Method-Level Security

Apply method-level security with our binary resource-based permissions:

#### Imperative Services

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final SecurityService securityService;
    
    @PreAuthorize("hasAuthority('RESOURCE_order:view')")
    public OrderDto getOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));
        
        // Secondary check for resource ownership
        securityService.checkOrderAccess(order);
        
        return orderMapper.toDto(order);
    }
    
    @PreAuthorize("hasAuthority('RESOURCE_order:create')")
    public OrderDto createOrder(OrderCreationDto creationDto) {
        // Implementation
    }
    
    @PreAuthorize("hasAuthority('RESOURCE_order:cancel')")
    public OrderDto cancelOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));
        
        // Check ownership
        securityService.checkOrderAccess(order);
        
        order.cancel();
        Order savedOrder = orderRepository.save(order);
        return orderMapper.toDto(savedOrder);
    }
}
```

#### Reactive Services

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderService {
    
    private final ReactiveOrderRepository orderRepository;
    private final ReactiveSecurityService securityService;
    
    @PreAuthorize("hasAuthority('RESOURCE_order:view')")
    public Mono<OrderDto> getOrder(UUID orderId) {
        return orderRepository.findById(orderId)
            .switchIfEmpty(Mono.error(new ResourceNotFoundException("Order", orderId)))
            .flatMap(order -> securityService.checkOrderAccess(order)
                .thenReturn(order))
            .map(orderMapper::toDto);
    }
    
    @PreAuthorize("hasAuthority('RESOURCE_order:create')")
    public Mono<OrderDto> createOrder(OrderCreationDto creationDto) {
        // Implementation
    }
    
    @PreAuthorize("hasAuthority('RESOURCE_order:cancel')")
    public Mono<OrderDto> cancelOrder(UUID orderId) {
        return orderRepository.findById(orderId)
            .switchIfEmpty(Mono.error(new ResourceNotFoundException("Order", orderId)))
            .flatMap(order -> securityService.checkOrderAccess(order)
                .thenReturn(order))
            .flatMap(order -> {
                order.cancel();
                return orderRepository.save(order);
            })
            .map(orderMapper::toDto);
    }
}
```

### Security Service Implementation

Implement the security service to check resource access:

#### Imperative Services

```java
@Service
@RequiredArgsConstructor
public class SecurityService {
    
    private final AccessDecisionService accessDecisionService;
    
    public void checkOrderAccess(Order order) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new AccessDeniedException("Not authenticated");
        }
        
        // Binary access check based on resource ID
        boolean hasAccess = accessDecisionService.hasOrderAccess(
            authentication.getName(), order.getId());
        
        if (!hasAccess) {
            throw new AccessDeniedException("No access to order: " + order.getId());
        }
    }
    
    public void checkCustomerAccess(UUID customerId) {
        // Similar implementation for customer resources
    }
}
```

#### Reactive Services

```java
@Service
@RequiredArgsConstructor
public class ReactiveSecurityService {
    
    private final ReactiveAccessDecisionService accessDecisionService;
    
    public Mono<Void> checkOrderAccess(Order order) {
        return ReactiveSecurityContextHolder.getContext()
            .map(SecurityContext::getAuthentication)
            .switchIfEmpty(Mono.error(new AccessDeniedException("Not authenticated")))
            .flatMap(authentication -> 
                accessDecisionService.hasOrderAccess(authentication.getName(), order.getId())
                    .flatMap(hasAccess -> {
                        if (hasAccess) {
                            return Mono.empty();
                        } else {
                            return Mono.error(
                                new AccessDeniedException("No access to order: " + order.getId()));
                        }
                    })
            );
    }
    
    public Mono<Void> checkCustomerAccess(UUID customerId) {
        // Similar implementation for customer resources
    }
}
```

### Access Decision Service

Implement the access decision service to determine resource access rights:

```java
@Service
@RequiredArgsConstructor
public class AccessDecisionService {
    
    private final AuthorizationRepository authorizationRepository;
    
    /**
     * Determines if a user has access to a specific order
     */
    public boolean hasOrderAccess(String username, UUID orderId) {
        // Check if user is admin (has global access)
        if (isAdmin(username)) {
            return true;
        }
        
        // Check if user is the owner of the order
        return authorizationRepository.isUserAuthorizedForResource(
            username, "order", orderId.toString());
    }
    
    /**
     * Check if user has admin rights
     */
    public boolean isAdmin(String username) {
        return authorizationRepository.hasGlobalPermission(username, "admin");
    }
}

@Service
@RequiredArgsConstructor
public class ReactiveAccessDecisionService {
    
    private final ReactiveAuthorizationRepository authorizationRepository;
    
    /**
     * Determines if a user has access to a specific order
     */
    public Mono<Boolean> hasOrderAccess(String username, UUID orderId) {
        // Check if user is admin (has global access)
        return isAdmin(username)
            .flatMap(isAdmin -> {
                if (isAdmin) {
                    return Mono.just(true);
                }
                
                // Check if user is the owner of the order
                return authorizationRepository.isUserAuthorizedForResource(
                    username, "order", orderId.toString());
            });
    }
    
    /**
     * Check if user has admin rights
     */
    public Mono<Boolean> isAdmin(String username) {
        return authorizationRepository.hasGlobalPermission(username, "admin");
    }
}
```

## Security Context Propagation

### Imperative Services

Set up security context propagation for service-to-service communication:

```java
@Configuration
@EnableWebSecurity
public class WebClientConfig {
    
    @Bean
    public WebClient webClient(OAuth2AuthorizedClientManager authorizedClientManager) {
        ServletOAuth2AuthorizedClientExchangeFilterFunction oauth2Client =
            new ServletOAuth2AuthorizedClientExchangeFilterFunction(authorizedClientManager);
        oauth2Client.setDefaultOAuth2AuthorizedClient(true);
        
        return WebClient.builder()
            .apply(oauth2Client.oauth2Configuration())
            .build();
    }
    
    @Bean
    public OAuth2AuthorizedClientManager authorizedClientManager(
            ClientRegistrationRepository clientRegistrationRepository,
            OAuth2AuthorizedClientRepository authorizedClientRepository) {
        
        OAuth2AuthorizedClientProvider authorizedClientProvider =
            OAuth2AuthorizedClientProviderBuilder.builder()
                .clientCredentials()
                .build();
        
        DefaultOAuth2AuthorizedClientManager authorizedClientManager =
            new DefaultOAuth2AuthorizedClientManager(
                clientRegistrationRepository, authorizedClientRepository);
        authorizedClientManager.setAuthorizedClientProvider(authorizedClientProvider);
        
        return authorizedClientManager;
    }
}
```

### Reactive Services

```java
@Configuration
public class ReactiveSecurityClientConfig {
    
    @Bean
    public WebClient webClient(ReactiveClientRegistrationRepository clientRegistrations) {
        ServerOAuth2AuthorizedClientExchangeFilterFunction oauth =
            new ServerOAuth2AuthorizedClientExchangeFilterFunction(
                clientRegistrations,
                new UnAuthenticatedServerOAuth2AuthorizedClientRepository());
                
        oauth.setDefaultClientRegistrationId("order-service");
        
        return WebClient.builder()
            .filter(oauth)
            .build();
    }
    
    @Bean
    public ReactiveOAuth2AuthorizedClientManager authorizedClientManager(
            ReactiveClientRegistrationRepository clientRegistrationRepository) {
        
        ReactiveOAuth2AuthorizedClientProvider authorizedClientProvider =
            ReactiveOAuth2AuthorizedClientProviderBuilder.builder()
                .clientCredentials()
                .build();
        
        AuthorizedClientServiceReactiveOAuth2AuthorizedClientManager manager =
            new AuthorizedClientServiceReactiveOAuth2AuthorizedClientManager(
                clientRegistrationRepository,
                new InMemoryReactiveOAuth2AuthorizedClientService(clientRegistrationRepository));
                
        manager.setAuthorizedClientProvider(authorizedClientProvider);
        
        return manager;
    }
}
```

### Propagating Security Context Between Services

```java
@Component
@RequiredArgsConstructor
public class SecurityContextPropagationInterceptor implements ClientHttpRequestInterceptor {
    
    private static final String USER_ID_HEADER = "X-User-ID";
    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    
    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
            ClientHttpRequestExecution execution) throws IOException {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();
            String userId = jwt.getClaimAsString("sub");
            String correlationId = UUID.randomUUID().toString();
            
            ClientHttpRequest decoratedRequest = new HttpRequestDecorator(request);
            decoratedRequest.getHeaders().add(USER_ID_HEADER, userId);
            decoratedRequest.getHeaders().add(CORRELATION_ID_HEADER, correlationId);
            
            return execution.execute(decoratedRequest, body);
        }
        
        return execution.execute(request, body);
    }
}
```

## CORS Configuration

### Imperative Services

```java
@Configuration
@EnableWebSecurity
public class WebSecurityConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        // Other security configuration
        
        http.cors().configurationSource(corsConfigurationSource());
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("https://example.com", "https://app.example.com"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

### Reactive Services

```java
@Configuration
@EnableWebFluxSecurity
public class ReactiveSecurityConfig {
    
    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            // Other security configuration
            .cors(corsSpec -> corsSpec.configurationSource(corsConfigurationSource()))
            .build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("https://example.com", "https://app.example.com"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

## Content Security Policy

Configure Content Security Policy:

```java
@Configuration
public class WebSecurityConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        // Other security configuration
        
        http.headers()
            .contentSecurityPolicy("default-src 'self'; script-src 'self' https://trusted.cdn.com; " +
                "style-src 'self' https://trusted.cdn.com; img-src 'self' data: https://trusted.cdn.com; " +
                "connect-src 'self' https://api.example.com; frame-ancestors 'none'; form-action 'self'")
            .and()
            .referrerPolicy(ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN)
            .and()
            .frameOptions().deny()
            .contentSecurityPolicy("script-src 'self'");
    }
}
```

## Rate Limiting

### Implement Rate Limiting with Bucket4j

```java
@Configuration
public class RateLimitingConfig {
    
    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            // Use user ID from JWT as rate limit key
            return exchange.getPrincipal()
                .filter(principal -> principal instanceof Jwt)
                .map(principal -> ((Jwt) principal).getSubject())
                .switchIfEmpty(Mono.just("anonymous"));
        };
    }
    
    @Bean
    public RateLimiterGatewayFilterFactory rateLimiterGatewayFilterFactory(RedisRateLimiter redisRateLimiter) {
        return new RateLimiterGatewayFilterFactory(redisRateLimiter, userKeyResolver());
    }
    
    @Bean
    public RedisRateLimiter redisRateLimiter(ReactiveRedisTemplate<String, String> redisTemplate) {
        return new RedisRateLimiter(10, 20); // replenishRate, burstCapacity
    }
}
```

## Security Headers

Configure security headers for all responses:

```java
@Configuration
@EnableWebSecurity
public class SecurityHeadersConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .headers()
                .contentSecurityPolicy("default-src 'self'")
                .and()
                .contentTypeOptions()
                .and()
                .frameOptions().deny()
                .and()
                .xssProtection().block(true)
                .and()
                .referrerPolicy(ReferrerPolicy.STRICT_ORIGIN)
                .and()
                .permissionsPolicy(permissions -> permissions
                    .policy("camera=(), microphone=(), geolocation=()"))
                .and()
                .cacheControl()
                .and()
                .httpStrictTransportSecurity()
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000);
    }
}
```

## Secure Configuration Management

### Vault Integration

```java
@Configuration
@EnableConfigurationProperties
@Profile("!test")
public class VaultConfig {
    
    @Bean
    public VaultTemplate vaultTemplate(VaultEndpoint vaultEndpoint,
                                      ClientAuthentication clientAuthentication) {
        SessionManager sessionManager = new TokenSession(
            VaultEndpoint.create("vault.example.com", 8200), 
            new ClientToken(getVaultToken())
        );
        return new VaultTemplate(sessionManager);
    }
    
    private String getVaultToken() {
        // Get vault token from environment or file
        return System.getenv("VAULT_TOKEN");
    }
}
```

### Secure Properties Configuration

```java
@Configuration
@EnableConfigurationProperties
@EnableConfigurationProperties(SecurityProperties.class)
public class SecurityPropertiesConfig {
    
    @Bean
    public static EnvironmentPostProcessor securityPropertiesProcessor() {
        return (environment, application) -> {
            // Load sensitive properties from secure location
            Properties secureProps = loadSecureProperties();
            PropertySource<?> propertySource = new PropertiesPropertySource(
                "secureProperties", secureProps);
            environment.getPropertySources().addLast(propertySource);
        };
    }
    
    private static Properties loadSecureProperties() {
        Properties props = new Properties();
        // Load from secure location (e.g., Vault, encrypted file)
        return props;
    }
}
```

## Security Testing

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
}
```

## Security Logging

Configure security event logging:

```java
@Configuration
public class SecurityAuditingConfig {
    
    @Bean
    public AbstractAuthenticationAuditListener authenticationAuditListener() {
        return new AbstractAuthenticationAuditListener() {
            @Override
            public void onApplicationEvent(AbstractAuthenticationEvent event) {
                if (event instanceof AuthenticationSuccessEvent) {
                    log.info("Successful authentication for user: {}", 
                        ((AuthenticationSuccessEvent) event).getAuthentication().getName());
                } else if (event instanceof AbstractAuthenticationFailureEvent) {
                    log.warn("Authentication failure: {}", 
                        ((AbstractAuthenticationFailureEvent) event).getException().getMessage());
                }
            }
        };
    }
    
    @Bean
    public AbstractAuthorizationEventPublisher authorizationEventPublisher(
            ApplicationEventPublisher publisher) {
        return new SpringAuthorizationEventPublisher(publisher);
    }
    
    @Bean
    public AbstractAuthorizationEventListener authorizationEventListener() {
        return new AbstractAuthorizationEventListener() {
            @Override
            public void onApplicationEvent(AbstractAuthorizationEvent event) {
                if (event instanceof AuthorizationFailureEvent) {
                    AuthorizationFailureEvent failureEvent = (AuthorizationFailureEvent) event;
                    log.warn("Authorization failure: {} for user {}", 
                        failureEvent.getAccessDeniedException().getMessage(),
                        failureEvent.getAuthentication().getName());
                }
            }
        };
    }
}
```

## Security Best Practices

### Password Encoding

```java
@Configuration
public class PasswordEncoderConfig {
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        // Use BCrypt with strength 12 and add a random prefix to protect against hash attacks
        return new BCryptPasswordEncoder(12);
    }
}
```

### CSRF Protection

```java
@Configuration
@EnableWebSecurity
public class CsrfConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .csrf()
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .and()
            // Disable CSRF for API endpoints that are designed to be called by non-browser clients
            .csrf()
                .ignoringAntMatchers("/api/webhooks/**")
                .and();
    }
}
```

### XSS Protection

```java
@Configuration
public class WebMvcSecurityConfig extends WebMvcConfigurer {
    
    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        // Use Jackson converters with HTML escaping
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        ObjectMapper mapper = new ObjectMapper();
        mapper.getFactory().setCharacterEscapes(new HtmlCharacterEscapes());
        converter.setObjectMapper(mapper);
        converters.add(converter);
    }
    
    public class HtmlCharacterEscapes extends CharacterEscapes {
        private final int[] escapes;
        
        public HtmlCharacterEscapes() {
            int[] esc = CharacterEscapes.standardAsciiEscapesForJSON();
            esc['<'] = CharacterEscapes.ESCAPE_CUSTOM;
            esc['>'] = CharacterEscapes.ESCAPE_CUSTOM;
            esc['&'] = CharacterEscapes.ESCAPE_CUSTOM;
            esc['\''] = CharacterEscapes.ESCAPE_CUSTOM;
            esc['"'] = CharacterEscapes.ESCAPE_CUSTOM;
            escapes = esc;
        }
        
        @Override
        public int[] getEscapeCodesForAscii() {
            return escapes;
        }
        
        @Override
        public SerializableString getEscapeSequence(int ch) {
            switch (ch) {
                case '<':
                    return new SerializedString("&lt;");
                case '>':
                    return new SerializedString("&gt;");
                case '&':
                    return new SerializedString("&amp;");
                case '\'':
                    return new SerializedString("&apos;");
                case '"':
                    return new SerializedString("&quot;");
                default:
                    return null;
            }
        }
    }
}
```

## Security Patterns

### Defense in Depth

Implement multiple layers of security:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            // Layer 1: Network Security
            .requiresChannel().anyRequest().requiresSecure()
            .and()
            // Layer 2: Authentication
            .oauth2ResourceServer().jwt()
            .and().and()
            // Layer 3: Authorization
            .authorizeRequests()
                .antMatchers("/actuator/health").permitAll()
                .antMatchers("/api/**").authenticated()
                .anyRequest().denyAll()
            .and()
            // Layer 4: Attack Protection
            .headers()
                .xssProtection().and()
                .contentSecurityPolicy("default-src 'self'").and()
                .frameOptions().deny().and()
            .and()
            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS);
    }
}
```

### Defense in Depth for Methods

```java
@Service
public class SecureService {
    
    private final AuthorizationService authorizationService;
    
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostAuthorize("returnObject.owner == authentication.name")
    public Resource accessSecureResource(String resourceId) {
        // Method level authorization
        authorizationService.checkAccess(resourceId);
        
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException(resourceId));
            
        // Domain level security check
        if (!resource.canBeAccessedBy(SecurityContextHolder.getContext().getAuthentication())) {
            throw new AccessDeniedException("Access denied to resource: " + resourceId);
        }
        
        return resource;
    }
}
```

## Common Security Patterns and Anti-patterns

### Patterns to Follow

| Pattern | Example | Description |
|---------|---------|-------------|
| Defense in Depth | Multiple security layers | Use multiple security controls |
| Fail Securely | Deny by default | Default to secure state on failure |
| Least Privilege | Minimal permissions | Grant only necessary access |
| Input Validation | Validate all inputs | Validate at controller level |
| Proper Error Handling | No sensitive data in errors | Don't leak information in errors |

### Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Security by Obscurity | Hiding endpoints | Use proper authentication |
| Hard-coded Secrets | Passwords in code | Use external configuration |
| Insecure Defaults | Not overriding defaults | Configure security explicitly |
| Security Annotations Only | No defense in depth | Multiple layers of security |
| Global Exception Handlers | Leaking errors | Sanitize error messages |

These security implementation practices ensure a consistent and robust security posture across our microservices ecosystem, following the principle of defense in depth and implementing our binary resource-based authorization model.