# Security Context Propagation

## Overview

This document covers security context propagation patterns for service-to-service communication in microservices architectures. It includes OAuth 2.0 client configuration, context propagation interceptors, and secure header management for both imperative and reactive implementations.

## OAuth 2.0 Client Configuration

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

## Security Context Propagation Interceptor

### Imperative Implementation

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

### Reactive Implementation

```java
@Component
public class ReactiveSecurityContextPropagationFilter implements ExchangeFilterFunction {
    
    private static final String USER_ID_HEADER = "X-User-ID";
    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    
    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        return ReactiveSecurityContextHolder.getContext()
            .map(SecurityContext::getAuthentication)
            .cast(JwtAuthenticationToken.class)
            .map(auth -> (Jwt) auth.getPrincipal())
            .map(jwt -> {
                String userId = jwt.getClaimAsString("sub");
                String correlationId = UUID.randomUUID().toString();
                
                return ClientRequest.from(request)
                    .header(USER_ID_HEADER, userId)
                    .header(CORRELATION_ID_HEADER, correlationId)
                    .build();
            })
            .defaultIfEmpty(request)
            .flatMap(next::exchange);
    }
}
```

## Token Relay Configuration

### OAuth 2.0 Token Relay for Imperative Services

```java
@Configuration
public class TokenRelayConfig {
    
    @Bean
    public RestTemplate restTemplate(OAuth2AuthorizedClientManager authorizedClientManager) {
        RestTemplate restTemplate = new RestTemplate();
        
        // Add OAuth 2.0 token relay interceptor
        restTemplate.getInterceptors().add(
            new OAuth2TokenRelayInterceptor(authorizedClientManager));
        
        // Add security context propagation
        restTemplate.getInterceptors().add(
            new SecurityContextPropagationInterceptor());
        
        return restTemplate;
    }
}

@Component
@RequiredArgsConstructor
public class OAuth2TokenRelayInterceptor implements ClientHttpRequestInterceptor {
    
    private final OAuth2AuthorizedClientManager authorizedClientManager;
    
    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
            ClientHttpRequestExecution execution) throws IOException {
        
        // Get current authentication
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication instanceof JwtAuthenticationToken) {
            JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
            
            // Add the Bearer token to the request
            String token = jwtAuth.getToken().getTokenValue();
            ClientHttpRequest decoratedRequest = new HttpRequestDecorator(request);
            decoratedRequest.getHeaders().setBearerAuth(token);
            
            return execution.execute(decoratedRequest, body);
        }
        
        return execution.execute(request, body);
    }
}
```

### OAuth 2.0 Token Relay for Reactive Services

```java
@Configuration
public class ReactiveTokenRelayConfig {
    
    @Bean
    public WebClient tokenRelayWebClient() {
        return WebClient.builder()
            .filter(tokenRelayFilter())
            .filter(new ReactiveSecurityContextPropagationFilter())
            .build();
    }
    
    private ExchangeFilterFunction tokenRelayFilter() {
        return (request, next) -> 
            ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .cast(JwtAuthenticationToken.class)
                .map(auth -> (Jwt) auth.getPrincipal())
                .map(jwt -> 
                    ClientRequest.from(request)
                        .headers(headers -> headers.setBearerAuth(jwt.getTokenValue()))
                        .build())
                .defaultIfEmpty(request)
                .flatMap(next::exchange);
    }
}
```

## Service-to-Service Authentication

### Client Credentials Flow

Configure client credentials for service authentication:

```yaml
# application.yml
spring:
  security:
    oauth2:
      client:
        registration:
          order-service:
            client-id: order-service-client
            client-secret: ${ORDER_SERVICE_CLIENT_SECRET}
            authorization-grant-type: client_credentials
            scope: order.read,order.write,customer.read
        provider:
          auth-server:
            issuer-uri: https://auth.example.com/realms/services
```

### Service Account Configuration

```java
@Configuration
@EnableConfigurationProperties(ServiceAccountProperties.class)
public class ServiceAccountConfig {
    
    @Bean
    @ConditionalOnProperty(name = "app.security.service-account.enabled", havingValue = "true")
    public ClientRegistration serviceAccountRegistration(ServiceAccountProperties properties) {
        return ClientRegistration.withRegistrationId("service-account")
            .clientId(properties.getClientId())
            .clientSecret(properties.getClientSecret())
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
            .tokenUri(properties.getTokenUri())
            .scope(properties.getScopes())
            .build();
    }
}

@ConfigurationProperties(prefix = "app.security.service-account")
@Data
public class ServiceAccountProperties {
    private boolean enabled = false;
    private String clientId;
    private String clientSecret;
    private String tokenUri;
    private Set<String> scopes = new HashSet<>();
}
```

## Correlation ID and Tracing

### Correlation ID Propagation

```java
@Component
public class CorrelationIdInterceptor implements ClientHttpRequestInterceptor {
    
    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    private static final String CORRELATION_ID_MDC_KEY = "correlationId";
    
    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
            ClientHttpRequestExecution execution) throws IOException {
        
        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
            MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
        }
        
        ClientHttpRequest decoratedRequest = new HttpRequestDecorator(request);
        decoratedRequest.getHeaders().add(CORRELATION_ID_HEADER, correlationId);
        
        return execution.execute(decoratedRequest, body);
    }
}
```

### Request Tracing Filter

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestTracingFilter implements Filter {
    
    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    private static final String CORRELATION_ID_MDC_KEY = "correlationId";
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String correlationId = httpRequest.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.trim().isEmpty()) {
            correlationId = UUID.randomUUID().toString();
        }
        
        // Set in MDC for logging
        MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
        
        // Add to response headers
        httpResponse.setHeader(CORRELATION_ID_HEADER, correlationId);
        
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

## Security Headers Propagation

### Custom Security Headers

```java
@Component
public class SecurityHeadersPropagationInterceptor implements ClientHttpRequestInterceptor {
    
    private static final List<String> SECURITY_HEADERS = Arrays.asList(
        "X-User-ID",
        "X-Tenant-ID", 
        "X-Client-Type",
        "X-Request-Source"
    );
    
    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
            ClientHttpRequestExecution execution) throws IOException {
        
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes) {
            HttpServletRequest currentRequest = 
                ((ServletRequestAttributes) attributes).getRequest();
            
            ClientHttpRequest decoratedRequest = new HttpRequestDecorator(request);
            
            // Propagate specific security headers
            for (String headerName : SECURITY_HEADERS) {
                String headerValue = currentRequest.getHeader(headerName);
                if (headerValue != null) {
                    decoratedRequest.getHeaders().add(headerName, headerValue);
                }
            }
            
            return execution.execute(decoratedRequest, body);
        }
        
        return execution.execute(request, body);
    }
}
```

## Best Practices

### Token Management

- Use short-lived access tokens with automatic refresh
- Implement proper token caching to avoid unnecessary requests
- Handle token expiration gracefully with retry logic
- Never log or expose tokens in error messages

### Security Context

- Always propagate user context for audit trails
- Include correlation IDs for request tracing
- Validate propagated context at service boundaries
- Implement circuit breaker patterns for external service calls

### Performance Considerations

- Cache OAuth 2.0 tokens appropriately
- Use connection pooling for HTTP clients
- Implement timeout and retry policies
- Monitor token refresh rates and service latency

### Error Handling

- Implement proper fallback mechanisms
- Log security-related errors appropriately
- Return generic error messages to clients
- Implement proper circuit breaker patterns

## Related Documentation

- [OAuth2 Resource Server](OAuth2-Resource-Server.md) - JWT token validation configuration
- [Authorization Patterns](Authorization-Patterns.md) - Resource-based authorization
- [Security Testing](Security-Testing.md) - Testing security context propagation