# Security Context Propagation

## Reading Guide

**⏱️ Reading Time:** 10 minutes | **Level:** Advanced (Grade 12.6)
**Flesch Score:** 34.2 (Fairly Difficult)
**Key Topics:** Authentication, Microservices, Headers

## Overview

When services call each other, they must share security information. This document shows how to do that in Spring Boot.

Topics covered:
- OAuth 2.0 setup for service-to-service calls
- Passing user info between services
- Token management
- Traditional and reactive examples

## OAuth 2.0 Client Configuration

### What is OAuth 2.0?

OAuth 2.0 is a standard for services to request access tokens. A token proves one service's identity to another.

### Imperative Services

This setup lets one service talk to another safely:

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

An interceptor is code that runs before each request. It adds user information to the request headers.

### Imperative Implementation

In traditional Spring code:

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

In non-blocking reactive code:

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

Token relay means passing along the token you received to the next service. It keeps the same authentication chain.

### OAuth 2.0 Token Relay for Imperative Services

Here's how to pass tokens in traditional code:

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

Here's how to pass tokens in reactive code:

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

Client credentials is a way for services to prove their identity. Use this when service A needs to call service B.

Configuration:

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

A correlation ID is a unique ID that tracks a request across all services. It helps you find where problems happen.

### Correlation ID Propagation

Add the correlation ID to outgoing requests:

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

This filter checks each incoming request for a correlation ID. If none exists, it creates one:

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

Security headers carry important information like user ID or tenant ID. Your code can forward these headers to downstream services.

### Custom Security Headers

This code extracts headers from the incoming request and adds them to outgoing requests:

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

- Use tokens that expire quickly
- Refresh tokens automatically
- Cache tokens to reduce requests
- Never print tokens in logs

### Security Context

- Always send user information for audit trails
- Use correlation IDs to track requests
- Check that forwarded context is valid
- Use circuit breakers for outside service calls

### Performance

- Cache tokens to avoid repeated token requests
- Use connection pooling for HTTP clients
- Set timeouts for requests
- Track token refresh speed and response times

### Error Handling

- Plan for failures when getting tokens
- Log errors safely without exposing tokens
- Send simple error messages to clients
- Use circuit breakers to prevent cascading failures

## Related Documentation

- [OAuth2 Resource Server](oauth2-resource-server.md) - JWT token validation configuration
- [Authorization Patterns](authorization-patterns.md) - Resource-based authorization
- [Security Testing](security-testing.md) - Testing security context propagation