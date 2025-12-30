# OAuth 2.0/OIDC Resource Server Configuration

## Overview

This document covers the implementation of OAuth 2.0/OIDC resource server configuration in Spring Boot applications. It provides patterns for both imperative (Spring MVC) and reactive (WebFlux) implementations.

## OAuth 2.0 Resource Server Configuration

### Imperative Services (Spring MVC)

Configure Spring Security as an OAuth 2.0 resource server:

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

### Reactive Services (WebFlux)

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

## JWT Configuration Properties

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
- Consider implementing additional custom claim validation based on your business requirements

### Error Handling

- Never expose internal security details in error responses
- Log security events for audit purposes
- Return generic error messages for authentication failures
- Implement proper rate limiting to prevent brute force attacks

### Configuration Security

- Store sensitive configuration values (client secrets, JWK URIs) securely
- Use environment variables or secure configuration services
- Never commit sensitive values to version control
- Regularly rotate client credentials and secrets

## Related Documentation

- [Authorization Patterns](authorization-patterns.md) - Resource-based authorization implementation
- [Security Context Propagation](security-context-propagation.md) - Service-to-service security
- [Security Testing](security-testing.md) - Testing OAuth 2.0 integration