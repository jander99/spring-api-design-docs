# CORS Configuration and Security Headers

## Overview

This document covers Cross-Origin Resource Sharing (CORS) configuration and security headers implementation in Spring Boot applications. It includes patterns for both imperative and reactive implementations, along with comprehensive security header configurations.

## CORS Configuration

### Imperative Services (Spring MVC)

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

### Reactive Services (WebFlux)

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

### Environment-Specific CORS Configuration

```java
@Configuration
public class CorsConfig {
    
    @Bean
    @Profile("development")
    public CorsConfigurationSource developmentCorsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // More permissive for development
        configuration.setAllowedOriginPatterns(Arrays.asList("http://localhost:*", "https://localhost:*"));
        configuration.setAllowedMethods(Arrays.asList("*"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
    
    @Bean
    @Profile({"staging", "production"})
    public CorsConfigurationSource productionCorsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Restrictive for production
        configuration.setAllowedOrigins(Arrays.asList(
            "https://app.example.com",
            "https://admin.example.com"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", 
            "Content-Type", 
            "X-Requested-With",
            "X-Correlation-ID"
        ));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(86400L); // 24 hours
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

## Content Security Policy

Configure Content Security Policy headers:

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

### CSP Configuration for Different Environments

```java
@Configuration
public class ContentSecurityPolicyConfig {
    
    @Value("${app.security.csp.enabled:true}")
    private boolean cspEnabled;
    
    @Value("${app.security.csp.report-only:false}")
    private boolean cspReportOnly;
    
    @Bean
    public ContentSecurityPolicyHeaderWriter contentSecurityPolicyHeaderWriter() {
        String policy = buildContentSecurityPolicy();
        
        ContentSecurityPolicyHeaderWriter writer = new ContentSecurityPolicyHeaderWriter(policy);
        writer.setReportOnly(cspReportOnly);
        
        return writer;
    }
    
    private String buildContentSecurityPolicy() {
        StringBuilder policy = new StringBuilder();
        
        // Default sources
        policy.append("default-src 'self'; ");
        
        // Script sources
        policy.append("script-src 'self' 'unsafe-inline' https://trusted.cdn.com; ");
        
        // Style sources
        policy.append("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ");
        
        // Image sources
        policy.append("img-src 'self' data: https:; ");
        
        // Connect sources (for AJAX, WebSocket, etc.)
        policy.append("connect-src 'self' https://api.example.com wss://api.example.com; ");
        
        // Font sources
        policy.append("font-src 'self' https://fonts.gstatic.com; ");
        
        // Frame options
        policy.append("frame-ancestors 'none'; ");
        
        // Form actions
        policy.append("form-action 'self'; ");
        
        // Base URI
        policy.append("base-uri 'self'; ");
        
        return policy.toString();
    }
}
```

## Security Headers Configuration

Configure comprehensive security headers for all responses:

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

### Custom Security Headers Filter

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class SecurityHeadersFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // Security headers
        addSecurityHeaders(httpResponse);
        
        chain.doFilter(request, response);
    }
    
    private void addSecurityHeaders(HttpServletResponse response) {
        // Prevent content type sniffing
        response.setHeader("X-Content-Type-Options", "nosniff");
        
        // Prevent framing
        response.setHeader("X-Frame-Options", "DENY");
        
        // Referrer policy
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        
        // Permissions policy
        response.setHeader("Permissions-Policy", 
            "camera=(), microphone=(), geolocation=(), payment=()");
        
        // Cross-Origin-Embedder-Policy
        response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        
        // Cross-Origin-Opener-Policy
        response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        
        // Cross-Origin-Resource-Policy
        response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
        
        // Expect-CT header (deprecated but still useful for legacy browsers)
        response.setHeader("Expect-CT", "max-age=86400, enforce");
        
        // Custom security headers
        response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
        response.setHeader("X-Robots-Tag", "noindex, nofollow, nosnippet, noarchive");
    }
}
```

### Reactive Security Headers

```java
@Component
public class ReactiveSecurityHeadersFilter implements WebFilter {
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return chain.filter(exchange).doFinally(signalType -> {
            ServerHttpResponse response = exchange.getResponse();
            addSecurityHeaders(response);
        });
    }
    
    private void addSecurityHeaders(ServerHttpResponse response) {
        HttpHeaders headers = response.getHeaders();
        
        // Security headers
        headers.add("X-Content-Type-Options", "nosniff");
        headers.add("X-Frame-Options", "DENY");
        headers.add("Referrer-Policy", "strict-origin-when-cross-origin");
        headers.add("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        headers.add("Cross-Origin-Embedder-Policy", "require-corp");
        headers.add("Cross-Origin-Opener-Policy", "same-origin");
        headers.add("Cross-Origin-Resource-Policy", "same-origin");
        headers.add("X-Permitted-Cross-Domain-Policies", "none");
    }
}
```

## HSTS Configuration

### HTTP Strict Transport Security

```java
@Configuration
public class HSTSConfig {
    
    @Bean
    public HstsHeaderWriter hstsHeaderWriter() {
        return new HstsHeaderWriter(
            Duration.ofDays(365).getSeconds(), // Max age: 1 year
            true,  // Include subdomains
            true   // Preload
        );
    }
    
    @Bean
    @ConditionalOnProperty(name = "app.security.hsts.enabled", havingValue = "true", matchIfMissing = true)
    public FilterRegistrationBean<HSTSFilter> hstsFilter() {
        FilterRegistrationBean<HSTSFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new HSTSFilter());
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}

@Component
public class HSTSFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // Only add HSTS header for HTTPS requests
        if (httpRequest.isSecure()) {
            httpResponse.setHeader("Strict-Transport-Security", 
                "max-age=31536000; includeSubDomains; preload");
        }
        
        chain.doFilter(request, response);
    }
}
```

## Content Type and XSS Prevention

**Note**: The `X-XSS-Protection` header is deprecated and should not be used. Instead, rely on Content Security Policy and proper output encoding.

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

## Configuration Properties

### CORS Properties

```java
@ConfigurationProperties(prefix = "app.cors")
@Data
public class CorsProperties {
    private boolean enabled = true;
    private List<String> allowedOrigins = new ArrayList<>();
    private List<String> allowedOriginPatterns = new ArrayList<>();
    private List<String> allowedMethods = Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS");
    private List<String> allowedHeaders = Arrays.asList("*");
    private List<String> exposedHeaders = new ArrayList<>();
    private boolean allowCredentials = true;
    private long maxAge = 3600;
}
```

### Security Headers Properties

```java
@ConfigurationProperties(prefix = "app.security.headers")
@Data
public class SecurityHeadersProperties {
    private boolean enabled = true;
    private ContentSecurityPolicy csp = new ContentSecurityPolicy();
    private Hsts hsts = new Hsts();
    private FrameOptions frameOptions = new FrameOptions();
    
    @Data
    public static class ContentSecurityPolicy {
        private boolean enabled = true;
        private boolean reportOnly = false;
        private String policy = "default-src 'self'";
        private String reportUri;
    }
    
    @Data
    public static class Hsts {
        private boolean enabled = true;
        private long maxAge = 31536000; // 1 year
        private boolean includeSubDomains = true;
        private boolean preload = true;
    }
    
    @Data
    public static class FrameOptions {
        private String policy = "DENY"; // DENY, SAMEORIGIN, or ALLOW-FROM
        private String allowFromUri;
    }
}
```

## Best Practices

### CORS Security

- Always specify explicit allowed origins instead of using wildcards in production
- Be restrictive with allowed methods and headers
- Set appropriate max-age values for preflight cache
- Regularly review and update CORS policies
- Use HTTPS-only origins in production environments

### Security Headers

- Implement all relevant security headers for comprehensive protection
- Use CSP reporting to monitor and refine policies
- Test headers thoroughly across different browsers
- Monitor for security header compliance using tools like SecurityHeaders.com
- Regularly update security policies based on new threats

### Performance Considerations

- Use appropriate max-age values for preflight requests
- Cache security headers where possible
- Consider the performance impact of complex CSP policies
- Monitor the overhead of security header processing

### Monitoring and Compliance

- Implement logging for CORS violations
- Monitor CSP violation reports
- Regularly audit security header configurations
- Use automated tools to verify security header presence
- Implement alerting for security policy violations

## Related Documentation

- [OAuth2 Resource Server](OAuth2-Resource-Server.md) - JWT token validation
- [Rate Limiting and Protection](Rate-Limiting-and-Protection.md) - Attack protection mechanisms
- [Security Testing](Security-Testing.md) - Testing CORS and security headers