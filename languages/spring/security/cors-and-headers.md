# CORS Configuration and Security Headers

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 14 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Authentication, Security, Architecture
> 
> **📊 Complexity:** 10.8 grade level • 1.5% technical density • fairly difficult

## Overview

This guide shows you how to set up CORS and security headers in Spring Boot. CORS stands for Cross-Origin Resource Sharing. It controls which websites can access your API.

You'll learn two approaches:
- **Imperative** - Traditional Spring MVC
- **Reactive** - Modern Spring WebFlux

Both approaches add security headers to protect your application.

## CORS Configuration

### What is CORS?

CORS lets you control which websites can call your API. Without CORS, browsers block cross-site requests for security.

### Imperative Services (Spring MVC)

Use this pattern with traditional Spring MVC applications.

```java
@Configuration
@EnableWebSecurity
public class WebSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()));
        return http.build();
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

Use this pattern with Spring WebFlux reactive applications.

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

Your CORS rules should differ by environment. Development needs looser rules. Production needs strict rules.

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

### What is CSP?

Content Security Policy (CSP) tells browsers what resources your site can load. This prevents attacks like XSS (Cross-Site Scripting).

### Basic CSP Setup

```java
@Configuration
@EnableWebSecurity
public class WebSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; script-src 'self' https://trusted.cdn.com; " +
                        "style-src 'self' https://trusted.cdn.com; img-src 'self' data: https://trusted.cdn.com; " +
                        "connect-src 'self' https://api.example.com; frame-ancestors 'none'; form-action 'self'"))
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN))
                .frameOptions(frame -> frame.deny()));
        return http.build();
    }
}
```

### CSP Configuration for Different Environments

You can customize CSP rules based on your environment. This example shows a flexible approach.

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

### Why Security Headers Matter

Security headers protect your users from common attacks. They tell browsers how to handle your content safely.

### Complete Security Headers Setup

This configuration adds all key security headers to every response.

```java
@Configuration
@EnableWebSecurity
public class SecurityHeadersConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'"))
                .contentTypeOptions(Customizer.withDefaults())
                .frameOptions(frame -> frame.deny())
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicy.STRICT_ORIGIN))
                .permissionsPolicy(permissions -> permissions
                    .policy("camera=(), microphone=(), geolocation=()"))
                .cacheControl(Customizer.withDefaults())
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)));
        return http.build();
    }
}
```

### Custom Security Headers Filter

Sometimes you need fine control over headers. This custom filter adds headers to every request.

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
        
        // Note: Expect-CT header is deprecated and no longer needed
        // Modern browsers enforce Certificate Transparency by default
        
        // Custom security headers
        response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
        response.setHeader("X-Robots-Tag", "noindex, nofollow, nosnippet, noarchive");
    }
}
```

### Reactive Security Headers

For WebFlux applications, use this reactive filter pattern.

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

### What is HSTS?

HTTP Strict Transport Security (HSTS) forces browsers to use HTTPS only. This prevents downgrade attacks.

### HSTS Setup

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

### Preventing XSS Attacks

XSS (Cross-Site Scripting) happens when attackers inject harmful scripts. You can prevent this by escaping HTML characters.

**Note**: Don't use the `X-XSS-Protection` header. It's outdated. Use CSP and proper encoding instead.

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

These properties let you configure CORS via application.properties or application.yml files.

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

These properties centralize security header configuration.

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

**Set Explicit Origins**
Always list exact allowed origins in production. Never use wildcards (`*`).

**Be Restrictive**
Only allow the HTTP methods and headers you actually need.

**Cache Preflight Requests**
Set `max-age` to reduce unnecessary preflight requests.

**Review Regularly**
Update CORS policies as your application changes.

**Use HTTPS Only**
In production, only allow HTTPS origins.

### Security Headers

**Implement All Headers**
Use every relevant security header for complete protection.

**Monitor CSP Reports**
CSP can report violations. Use these reports to refine your policy.

**Test Across Browsers**
Different browsers handle headers differently. Test thoroughly.

**Use Validation Tools**
Tools like SecurityHeaders.com check your configuration.

**Stay Updated**
New threats emerge. Update policies regularly.

### Performance Considerations

**Optimize Preflight Cache**
Set appropriate `max-age` values to reduce network overhead.

**Cache Headers**
Security headers rarely change. Cache them when possible.

**Measure CSP Impact**
Complex CSP policies can slow rendering. Monitor performance.

**Track Processing Overhead**
Measure how much time header processing adds to requests.

### Monitoring and Compliance

**Log CORS Violations**
Track when CORS blocks requests. This helps debug issues.

**Monitor CSP Reports**
Set up CSP reporting to catch policy violations.

**Audit Regularly**
Review security header configurations monthly.

**Automate Checks**
Use tools to verify headers are present on all responses.

**Alert on Violations**
Set up alerts for security policy violations.

## Related Documentation

- [OAuth2 Resource Server](oauth2-resource-server.md) - JWT token validation
- [Rate Limiting and Protection](rate-limiting-and-protection.md) - Attack protection mechanisms
- [Security Testing](security-testing.md) - Testing CORS and security headers