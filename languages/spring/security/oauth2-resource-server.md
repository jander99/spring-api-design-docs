# OAuth 2.0 Resource Server Setup

> **📖 Reading Guide**
>
> **⏱️ Reading Time:** 4 minutes | **🟢 Level:** Intermediate
>
> **📋 Prerequisites:** HTTP fundamentals, basic API experience
>
> **🎯 Key Topics:** Authentication
>
> **📊 Complexity:** 11.1 grade level • Fairly difficult

## Overview

This guide shows how to set up OAuth 2.0 authentication in Spring Boot. We cover both traditional (MVC) and modern (WebFlux) approaches.

## Setting Up OAuth 2.0 in Spring

### Traditional Services (Spring MVC)

Here's how to set up OAuth 2.0 security checks in your app:

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
    }
    
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            // Extract what this user can do from the token
            return extractResourcePermissions(jwt);
        });
        return converter;
    }
    
    private Collection<GrantedAuthority> extractResourcePermissions(Jwt jwt) {
        // Get permissions from the token
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess == null) {
            return Collections.emptyList();
        }
        
        List<String> permissions = new ArrayList<>();
        
        // Look for permissions under "order-service"
        Map<String, Object> resources = 
            (Map<String, Object>) resourceAccess.get("order-service");
        if (resources != null && resources.containsKey("resources")) {
            List<String> resourceList = (List<String>) resources.get("resources");
            permissions.addAll(resourceList);
        }
        
        // Add prefix and return
        return permissions.stream()
            .map(p -> new SimpleGrantedAuthority("RESOURCE_" + p))
            .collect(Collectors.toList());
    }
}
```

### Modern Services (WebFlux)

```java
@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class ReactiveSecurityConfig {
    
    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeExchange(exchange -> exchange
                .pathMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .pathMatchers("/api-docs/**", "/swagger-ui/**").permitAll()
                .anyExchange().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
            .build();
    }
    
    @Bean
    public Converter<Jwt, Mono<AbstractAuthenticationToken>> jwtAuthenticationConverter() {
        return jwt -> {
            // Extract user permissions from the token
            Collection<GrantedAuthority> authorities = 
                extractResourcePermissions(jwt);
            return Mono.just(new JwtAuthenticationToken(jwt, authorities));
        };
    }
    
    private Collection<GrantedAuthority> extractResourcePermissions(Jwt jwt) {
        // Get permissions from the token
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess == null) {
            return Collections.emptyList();
        }
        
        List<String> permissions = new ArrayList<>();
        
        // Look for permissions under "order-service"
        Map<String, Object> resources = 
            (Map<String, Object>) resourceAccess.get("order-service");
        if (resources != null && resources.containsKey("resources")) {
            List<String> resourceList = (List<String>) resources.get("resources");
            permissions.addAll(resourceList);
        }
        
        // Add prefix and return
        return permissions.stream()
            .map(p -> new SimpleGrantedAuthority("RESOURCE_" + p))
            .collect(Collectors.toList());
    }
}
```

## Setting Up JWT Validation

Add these properties to check tokens:

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

## Core Security Rules

1. **Multiple Layers**: Use many security checks, not just one
2. **Minimum Access**: Only give users what they need
3. **Secure First**: Build security in from the start
4. **Visible Security**: Don't hide how security works
5. **Safe Failures**: When security fails, fail safely

## Best Practices

### Checking JWT Tokens

- Check the token signature using public keys
- Verify the issuer (`iss`) matches your auth server
- Check the audience (`aud`) to confirm the token is for your service
- Verify the token hasn't expired (`exp`)
- Add custom checks based on your needs

### Handling Errors

- Don't show security details in error messages
- Log security events for records
- Give generic error messages to users
- Limit login attempts to prevent attacks

### Keeping Configuration Safe

- Store secrets securely, not in code
- Use environment variables
- Don't commit secrets to version control
- Change credentials regularly

## Related Documentation

- [Authorization Patterns](authorization-patterns.md) - Resource-based authorization implementation
- [Security Context Propagation](security-context-propagation.md) - Service-to-service security
- [Security Testing](security-testing.md) - Testing OAuth 2.0 integration