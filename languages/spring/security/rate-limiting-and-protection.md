# Rate Limiting and Attack Protection

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 18 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Authentication, Security, Architecture
> 
> **📊 Complexity:** 10.1 grade level • 1.7% technical density • fairly difficult

## Overview

This guide shows how to protect your Spring Boot apps from attacks.

You will learn how to:
- Limit how many requests users can make
- Block denial of service attacks
- Validate user input to prevent injection attacks
- Monitor security events

## Rate Limiting Implementation

Rate limiting controls how many requests a user can make in a time period. This prevents abuse and protects your API.

### Rate Limiting with Bucket4j

Bucket4j is a library that helps limit requests. It uses a token bucket algorithm.

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

### Custom Rate Limiting with Redis

You can build your own rate limiter using Redis. Redis stores the count of requests for each user.

```java
@Component
@RequiredArgsConstructor
public class RedisRateLimitService {
    
    private final ReactiveRedisTemplate<String, String> redisTemplate;
    
    /**
     * Check if a request should be allowed.
     * @param key User ID or IP address
     * @param limit Max requests allowed
     * @param window Time period in seconds
     * @return true if allowed, false if blocked
     */
    public Mono<Boolean> isAllowed(String key, int limit, int window) {
        String redisKey = "rate_limit:" + key;
        long currentTime = System.currentTimeMillis();
        long windowStart = currentTime - (window * 1000L);
        
        return redisTemplate.opsForZSet()
            .removeRangeByScore(redisKey, 0, windowStart)
            .then(redisTemplate.opsForZSet().count(redisKey, windowStart, currentTime))
            .flatMap(count -> {
                if (count < limit) {
                    return redisTemplate.opsForZSet()
                        .add(redisKey, UUID.randomUUID().toString(), currentTime)
                        .then(redisTemplate.expire(redisKey, Duration.ofSeconds(window)))
                        .thenReturn(true);
                } else {
                    return Mono.just(false);
                }
            });
    }
    
    /**
     * Get remaining requests for a key
     */
    public Mono<Long> getRemainingRequests(String key, int limit, int window) {
        String redisKey = "rate_limit:" + key;
        long currentTime = System.currentTimeMillis();
        long windowStart = currentTime - (window * 1000L);
        
        return redisTemplate.opsForZSet()
            .removeRangeByScore(redisKey, 0, windowStart)
            .then(redisTemplate.opsForZSet().count(redisKey, windowStart, currentTime))
            .map(count -> Math.max(0, limit - count));
    }
}
```

### Rate Limiting Filter

A filter intercepts requests before they reach your controllers. This filter checks rate limits and blocks requests that exceed the limit.

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
@RequiredArgsConstructor
public class RateLimitingFilter implements Filter {
    
    private final RedisRateLimitService rateLimitService;
    private final ObjectMapper objectMapper;
    
    // Different limits for different endpoints
    private final Map<String, RateLimit> rateLimits = Map.of(
        "/api/auth/login", new RateLimit(5, 300),  // Login: 5 per 5 minutes
        "/api/orders", new RateLimit(100, 60),     // Orders: 100 per minute
        "/api/payments", new RateLimit(10, 60)     // Payments: 10 per minute
    );
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String path = httpRequest.getRequestURI();
        String key = getRateLimitKey(httpRequest);
        
        RateLimit rateLimit = getRateLimitForPath(path);
        if (rateLimit != null) {
            boolean allowed = rateLimitService.isAllowed(key, rateLimit.getLimit(), rateLimit.getWindow())
                .block();
                
            if (!allowed) {
                sendRateLimitExceededResponse(httpResponse);
                return;
            }
            
            // Add rate limit headers
            addRateLimitHeaders(httpResponse, key, rateLimit);
        }
        
        chain.doFilter(request, response);
    }
    
    private String getRateLimitKey(HttpServletRequest request) {
        // Try to get user ID from JWT
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt) {
            return ((Jwt) auth.getPrincipal()).getSubject();
        }
        
        // Fall back to IP address
        return getClientIpAddress(request);
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String[] headerNames = {
            "X-Forwarded-For",
            "X-Real-IP",
            "X-Originating-IP",
            "X-Cluster-Client-IP"
        };
        
        for (String headerName : headerNames) {
            String ip = request.getHeader(headerName);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        
        return request.getRemoteAddr();
    }
    
    private void sendRateLimitExceededResponse(HttpServletResponse response) 
            throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        Map<String, Object> errorResponse = Map.of(
            "error", "Rate limit exceeded",
            "message", "Too many requests. Please try again later.",
            "timestamp", Instant.now().toString()
        );
        
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
    
    private void addRateLimitHeaders(HttpServletResponse response, String key, RateLimit rateLimit) {
        Long remaining = rateLimitService.getRemainingRequests(key, rateLimit.getLimit(), rateLimit.getWindow())
            .block();
            
        response.setHeader("X-RateLimit-Limit", String.valueOf(rateLimit.getLimit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        response.setHeader("X-RateLimit-Reset", String.valueOf(System.currentTimeMillis() + (rateLimit.getWindow() * 1000)));
    }
    
    @Data
    @AllArgsConstructor
    private static class RateLimit {
        private int limit;
        private int window; // in seconds
    }
}
```

### Reactive Rate Limiting Filter

This is the reactive version of the rate limiting filter. Use this with Spring WebFlux for non-blocking applications.

```java
@Component
@RequiredArgsConstructor
public class ReactiveRateLimitingFilter implements WebFilter {
    
    private final RedisRateLimitService rateLimitService;
    private final ObjectMapper objectMapper;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        
        return getRateLimitKey(exchange)
            .flatMap(key -> {
                RateLimit rateLimit = getRateLimitForPath(path);
                if (rateLimit != null) {
                    return rateLimitService.isAllowed(key, rateLimit.getLimit(), rateLimit.getWindow())
                        .flatMap(allowed -> {
                            if (allowed) {
                                return addRateLimitHeaders(exchange, key, rateLimit)
                                    .then(chain.filter(exchange));
                            } else {
                                return sendRateLimitExceededResponse(exchange);
                            }
                        });
                }
                return chain.filter(exchange);
            });
    }
    
    private Mono<String> getRateLimitKey(ServerWebExchange exchange) {
        return exchange.getPrincipal()
            .filter(principal -> principal instanceof JwtAuthenticationToken)
            .cast(JwtAuthenticationToken.class)
            .map(auth -> ((Jwt) auth.getPrincipal()).getSubject())
            .switchIfEmpty(Mono.fromCallable(() -> getClientIpAddress(exchange.getRequest())));
    }
    
    private Mono<Void> sendRateLimitExceededResponse(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        
        Map<String, Object> errorResponse = Map.of(
            "error", "Rate limit exceeded",
            "message", "Too many requests. Please try again later.",
            "timestamp", Instant.now().toString()
        );
        
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(errorResponse);
            DataBuffer buffer = response.bufferFactory().wrap(bytes);
            return response.writeWith(Mono.just(buffer));
        } catch (Exception e) {
            return response.setComplete();
        }
    }
}
```

## Attack Protection Mechanisms

### CSRF Protection Configuration

CSRF (Cross-Site Request Forgery) is an attack where malicious sites trick users into making unwanted requests. Spring Security provides built-in CSRF protection.

```java
@Configuration
@EnableWebSecurity
public class CsrfConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                // Turn off CSRF for public APIs and webhooks
                .ignoringRequestMatchers("/api/webhooks/**", "/api/public/**"));
        return http.build();
    }
}
```

### Request Size Limiting

Large requests can crash your server. Set maximum sizes for requests and file uploads.

```java
@Configuration
public class RequestSizeLimitConfig {
    
    @Bean
    public FilterRegistrationBean<RequestSizeLimitFilter> requestSizeLimitFilter() {
        FilterRegistrationBean<RequestSizeLimitFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new RequestSizeLimitFilter());
        registration.addUrlPatterns("/api/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 3);
        return registration;
    }
}

@Component
public class RequestSizeLimitFilter implements Filter {
    
    private static final long MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;     // 5MB
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        // Check content length
        long contentLength = httpRequest.getContentLengthLong();
        if (contentLength > MAX_REQUEST_SIZE) {
            sendPayloadTooLargeResponse((HttpServletResponse) response);
            return;
        }
        
        // Additional checks for file uploads
        if (isFileUpload(httpRequest) && contentLength > MAX_FILE_SIZE) {
            sendPayloadTooLargeResponse((HttpServletResponse) response);
            return;
        }
        
        chain.doFilter(request, response);
    }
    
    private boolean isFileUpload(HttpServletRequest request) {
        String contentType = request.getContentType();
        return contentType != null && contentType.toLowerCase().startsWith("multipart/");
    }
    
    private void sendPayloadTooLargeResponse(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.PAYLOAD_TOO_LARGE.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\": \"Request entity too large\"}");
    }
}
```

### Brute Force Protection

Brute force attacks try many passwords rapidly. This service blocks users after too many failed login attempts.

```java
@Component
@RequiredArgsConstructor
public class BruteForceProtectionService {
    
    private final RedisTemplate<String, String> redisTemplate;
    
    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION = 300; // 5 minutes
    
    public boolean isBlocked(String identifier) {
        String key = "brute_force:blocked:" + identifier;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
    
    public void recordFailedAttempt(String identifier) {
        String attemptsKey = "brute_force:attempts:" + identifier;
        String blockedKey = "brute_force:blocked:" + identifier;
        
        // Add one to failed attempts count
        Long attempts = redisTemplate.opsForValue().increment(attemptsKey);
        redisTemplate.expire(attemptsKey, Duration.ofSeconds(LOCKOUT_DURATION));
        
        // Block user after 5 failed attempts
        if (attempts >= MAX_ATTEMPTS) {
            redisTemplate.opsForValue().set(blockedKey, "true", Duration.ofSeconds(LOCKOUT_DURATION));
            redisTemplate.delete(attemptsKey);
        }
    }
    
    public void recordSuccessfulAttempt(String identifier) {
        String attemptsKey = "brute_force:attempts:" + identifier;
        String blockedKey = "brute_force:blocked:" + identifier;
        
        // Reset counter after successful login
        redisTemplate.delete(attemptsKey);
        redisTemplate.delete(blockedKey);
    }
    
    public int getRemainingAttempts(String identifier) {
        String attemptsKey = "brute_force:attempts:" + identifier;
        String attempts = redisTemplate.opsForValue().get(attemptsKey);
        int failedAttempts = attempts != null ? Integer.parseInt(attempts) : 0;
        return Math.max(0, MAX_ATTEMPTS - failedAttempts);
    }
}
```

### Input Validation and Sanitization

Input validation prevents injection attacks. Always check user input for malicious patterns before processing it.

```java
@Component
public class InputSanitizationService {
    
    private static final Pattern SQL_INJECTION_PATTERN = Pattern.compile(
        "(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)", 
        Pattern.CASE_INSENSITIVE);
    
    private static final Pattern XSS_PATTERN = Pattern.compile(
        "<script|javascript:|onload=|onerror=|onclick=", 
        Pattern.CASE_INSENSITIVE);
    
    public String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        
        // Remove SQL injection patterns
        String sanitized = input.replaceAll(SQL_INJECTION_PATTERN.pattern(), "");
        
        // Remove XSS patterns
        sanitized = sanitized.replaceAll(XSS_PATTERN.pattern(), "");
        
        // Encode HTML characters
        sanitized = StringEscapeUtils.escapeHtml4(sanitized);
        
        return sanitized;
    }
    
    public boolean containsSuspiciousPatterns(String input) {
        if (input == null) {
            return false;
        }
        
        return SQL_INJECTION_PATTERN.matcher(input).find() || 
               XSS_PATTERN.matcher(input).find();
    }
}

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 4)
@RequiredArgsConstructor
public class InputValidationFilter implements Filter {
    
    private final InputSanitizationService sanitizationService;
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        // Check parameters for attacks
        for (String paramName : Collections.list(httpRequest.getParameterNames())) {
            String paramValue = httpRequest.getParameter(paramName);
            if (sanitizationService.containsSuspiciousPatterns(paramValue)) {
                sendBadRequestResponse((HttpServletResponse) response, 
                    "Invalid characters detected in request");
                return;
            }
        }
        
        // Check headers for attacks
        for (String headerName : Collections.list(httpRequest.getHeaderNames())) {
            String headerValue = httpRequest.getHeader(headerName);
            if (sanitizationService.containsSuspiciousPatterns(headerValue)) {
                sendBadRequestResponse((HttpServletResponse) response, 
                    "Invalid characters detected in headers");
                return;
            }
        }
        
        chain.doFilter(request, response);
    }
    
    private void sendBadRequestResponse(HttpServletResponse response, String message) 
            throws IOException {
        response.setStatus(HttpStatus.BAD_REQUEST.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(String.format("{\"error\": \"%s\"}", message));
    }
}
```

## DDoS Protection

DDoS (Distributed Denial of Service) attacks flood your server with requests. Connection limiting helps prevent these attacks.

### Connection Limiting

This filter limits how many active connections each IP address can have.

```java
@Configuration
public class ConnectionLimitingConfig {
    
    @Bean
    public FilterRegistrationBean<ConnectionLimitingFilter> connectionLimitingFilter() {
        FilterRegistrationBean<ConnectionLimitingFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new ConnectionLimitingFilter());
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}

@Component
@RequiredArgsConstructor
public class ConnectionLimitingFilter implements Filter {
    
    private final ConcurrentHashMap<String, AtomicInteger> connectionCounts = new ConcurrentHashMap<>();
    private final RedisTemplate<String, String> redisTemplate;
    
    private static final int MAX_CONNECTIONS_PER_IP = 50;
    private static final int CLEANUP_INTERVAL = 60000; // 1 minute
    
    @PostConstruct
    public void init() {
        // Clean up old connections every minute
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(this::cleanupStaleConnections, 
            CLEANUP_INTERVAL, CLEANUP_INTERVAL, TimeUnit.MILLISECONDS);
    }
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        String clientIp = getClientIpAddress((HttpServletRequest) request);
        
        if (exceedsConnectionLimit(clientIp)) {
            sendTooManyConnectionsResponse((HttpServletResponse) response);
            return;
        }
        
        incrementConnectionCount(clientIp);
        
        try {
            chain.doFilter(request, response);
        } finally {
            decrementConnectionCount(clientIp);
        }
    }
    
    private boolean exceedsConnectionLimit(String clientIp) {
        AtomicInteger count = connectionCounts.computeIfAbsent(clientIp, k -> new AtomicInteger(0));
        return count.get() >= MAX_CONNECTIONS_PER_IP;
    }
    
    private void incrementConnectionCount(String clientIp) {
        connectionCounts.computeIfAbsent(clientIp, k -> new AtomicInteger(0)).incrementAndGet();
    }
    
    private void decrementConnectionCount(String clientIp) {
        AtomicInteger count = connectionCounts.get(clientIp);
        if (count != null && count.decrementAndGet() <= 0) {
            connectionCounts.remove(clientIp);
        }
    }
    
    private void cleanupStaleConnections() {
        connectionCounts.entrySet().removeIf(entry -> entry.getValue().get() <= 0);
    }
}
```

## Security Monitoring and Logging

### Security Event Logging

Log all security events so you can detect and respond to attacks. This service creates structured logs for security incidents.

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class SecurityEventLogger {
    
    private final ObjectMapper objectMapper;
    
    public void logRateLimitExceeded(String clientId, String endpoint) {
        SecurityEvent event = SecurityEvent.builder()
            .eventType("RATE_LIMIT_EXCEEDED")
            .clientId(clientId)
            .endpoint(endpoint)
            .timestamp(Instant.now())
            .severity("MEDIUM")
            .build();
        
        log.warn("Security Event: {}", serializeEvent(event));
    }
    
    public void logBruteForceAttempt(String clientId, String endpoint) {
        SecurityEvent event = SecurityEvent.builder()
            .eventType("BRUTE_FORCE_ATTEMPT")
            .clientId(clientId)
            .endpoint(endpoint)
            .timestamp(Instant.now())
            .severity("HIGH")
            .build();
        
        log.error("Security Event: {}", serializeEvent(event));
    }
    
    public void logSuspiciousInput(String clientId, String suspiciousContent) {
        SecurityEvent event = SecurityEvent.builder()
            .eventType("SUSPICIOUS_INPUT")
            .clientId(clientId)
            .details(suspiciousContent)
            .timestamp(Instant.now())
            .severity("HIGH")
            .build();
        
        log.error("Security Event: {}", serializeEvent(event));
    }
    
    private String serializeEvent(SecurityEvent event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            log.error("Failed to serialize security event", e);
            return event.toString();
        }
    }
    
    @Data
    @Builder
    private static class SecurityEvent {
        private String eventType;
        private String clientId;
        private String endpoint;
        private String details;
        private Instant timestamp;
        private String severity;
    }
}
```

## Best Practices

### Rate Limiting Strategy

Set different limits for different endpoints. Critical endpoints like login need stricter limits.

Use sliding window algorithms. They provide more accurate rate limiting than fixed windows.

Consider user tiers. Give premium users higher limits than free users. Authenticated users can have higher limits than anonymous users.

Apply rate limiting at multiple layers. Use it at your API gateway, application layer, and database layer.

### Attack Protection

Validate input at every layer. Check data when it enters your system and before you use it.

Handle errors carefully. Don't expose system details in error messages.

Use strong authentication. Require secure passwords and multi-factor authentication.

Update dependencies regularly. New security patches fix known vulnerabilities.

### Monitoring and Alerting

Log all security events. Include timestamps, user IDs, and event details.

Set up real-time alerts. Get notified immediately when critical security events occur.

Monitor rate limit effectiveness. Adjust limits based on actual usage patterns.

Run regular security audits. Test your defenses with penetration testing.

### Performance Considerations

Use efficient data structures. Hash maps and sorted sets work well for rate limiting.

Clean up stale data. Remove old entries to prevent memory leaks.

Measure filter performance. Security filters add processing time to each request.

Cache when possible. Store rate limit data in memory for fast access.

## Related Documentation

- [OAuth2 Resource Server](oauth2-resource-server.md) - Authentication mechanisms
- [CORS and Headers](cors-and-headers.md) - Security headers configuration
- [Security Testing](security-testing.md) - Testing rate limiting and protection mechanisms