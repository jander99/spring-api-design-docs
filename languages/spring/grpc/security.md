# Spring Boot gRPC Security

> **📖 Reading Guide**
> **⏱️ Reading Time:** 14 minutes | **🎯 Level:** Intermediate to Advanced
> **📋 Prerequisites:** [Interceptors](interceptors.md), Spring Security knowledge
> **🎯 Key Topics:** TLS/mTLS • JWT validation • OAuth 2.0 • Authorization • Rate limiting
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

Secure your gRPC services with Spring Security integration, TLS/mTLS, and authentication/authorization.

---

## Overview

**Security layers:**

| Layer | Technology | Implementation |
|-------|------------|----------------|
| Transport | TLS/mTLS | grpc-spring-boot-starter config |
| Authentication | JWT, OAuth 2.0 | Spring Security + Interceptor |
| Authorization | RBAC, Method Security | `@PreAuthorize`, custom logic |
| Rate Limiting | Token bucket, sliding window | Interceptor + Redis |

**See theory:** [Security Guide](../../../guides/api-design/grpc/security.md)

---

## TLS Configuration

### Server TLS

**application.yml:**
```yaml
grpc:
  server:
    port: 9090
    
    # TLS Configuration
    security:
      enabled: true
      certificate-chain: classpath:certs/server-cert.pem
      private-key: classpath:certs/server-key.pem
      
      # Optional: Require client certificates (mTLS)
      client-auth: NONE  # NONE, OPTIONAL, REQUIRE
      trust-cert-collection: classpath:certs/client-ca.pem
```

### Client TLS

**application.yml:**
```yaml
grpc:
  client:
    order-service:
      address: 'static://api.example.com:9090'
      negotiationType: TLS
      
      # TLS Configuration
      security:
        # Verify server certificate
        trust-cert-collection: classpath:certs/ca-cert.pem
        
        # Optional: Client certificate for mTLS
        client-auth-enabled: false
        certificate-chain: classpath:certs/client-cert.pem
        private-key: classpath:certs/client-key.pem
```

### Generating Certificates (Development)

```bash
# Generate CA
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 365 -key ca-key.pem -out ca-cert.pem

# Generate server certificate
openssl genrsa -out server-key.pem 4096
openssl req -new -key server-key.pem -out server.csr
openssl x509 -req -days 365 -in server.csr -CA ca-cert.pem \
  -CAkey ca-key.pem -set_serial 01 -out server-cert.pem

# Generate client certificate (for mTLS)
openssl genrsa -out client-key.pem 4096
openssl req -new -key client-key.pem -out client.csr
openssl x509 -req -days 365 -in client.csr -CA ca-cert.pem \
  -CAkey ca-key.pem -set_serial 02 -out client-cert.pem
```

**Production:** Use cert-manager, Let's Encrypt, or your PKI infrastructure.

---

## JWT Authentication

### Spring Security Configuration

**Dependencies:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-oauth2-resource-server</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-oauth2-jose</artifactId>
</dependency>
```

**Configuration:**
```java
package com.example.grpc.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()  // gRPC uses interceptors for auth
            )
            .csrf(csrf -> csrf.disable());
        
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withJwkSetUri(
            "https://auth.example.com/.well-known/jwks.json"
        ).build();
    }
}
```

### JWT Validation Interceptor

```java
package com.example.grpc.security;

import io.grpc.*;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import java.util.List;
import java.util.stream.Collectors;

@Order(1)  // Run first
@GrpcGlobalServerInterceptor
public class JwtAuthenticationInterceptor implements ServerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationInterceptor.class);
    
    private static final Metadata.Key<String> AUTHORIZATION_KEY = 
        Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
    
    private final JwtDecoder jwtDecoder;

    public JwtAuthenticationInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        String methodName = call.getMethodDescriptor().getFullMethodName();
        
        // Allow health checks without authentication
        if (isPublicMethod(methodName)) {
            return next.startCall(call, headers);
        }
        
        // Extract token from metadata
        String authHeader = headers.get(AUTHORIZATION_KEY);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Missing or invalid authorization header for: {}", methodName);
            call.close(
                Status.UNAUTHENTICATED.withDescription("Missing authorization token"),
                new Metadata()
            );
            return new ServerCall.Listener<ReqT>() {};
        }
        
        String token = authHeader.substring(7);
        
        try {
            // Decode and validate JWT
            Jwt jwt = jwtDecoder.decode(token);
            
            // Extract claims
            String userId = jwt.getSubject();
            List<String> roles = jwt.getClaimAsStringList("roles");
            
            // Create authorities
            List<SimpleGrantedAuthority> authorities = roles != null
                ? roles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .collect(Collectors.toList())
                : List.of();
            
            // Set security context
            UsernamePasswordAuthenticationToken authentication = 
                new UsernamePasswordAuthenticationToken(userId, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            log.debug("Authenticated user: {} with roles: {}", userId, roles);
            
            return new ForwardingServerCallListener.SimpleForwardingServerCallListener<ReqT>(
                    next.startCall(call, headers)) {
                
                @Override
                public void onComplete() {
                    try {
                        super.onComplete();
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }

                @Override
                public void onCancel() {
                    try {
                        super.onCancel();
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }
            };
            
        } catch (JwtException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            call.close(
                Status.UNAUTHENTICATED.withDescription("Invalid or expired token"),
                new Metadata()
            );
            return new ServerCall.Listener<ReqT>() {};
        }
    }
    
    private boolean isPublicMethod(String methodName) {
        return methodName.equals("grpc.health.v1.Health/Check") ||
               methodName.equals("grpc.health.v1.Health/Watch");
    }
}
```

---

## OAuth 2.0 Integration

### OAuth 2.0 Configuration

**application.yml:**
```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com
          jwk-set-uri: https://auth.example.com/.well-known/jwks.json
          
          # Audience validation
          audiences:
            - grpc://api.example.com
            - api.example.com
```

### Client Credentials Flow (Service-to-Service)

**Client configuration:**
```java
@Configuration
public class OAuth2ClientConfig {

    @Bean
    OAuth2AuthorizedClientManager authorizedClientManager(
            ClientRegistrationRepository clientRegistrationRepository,
            OAuth2AuthorizedClientService authorizedClientService) {
        
        OAuth2AuthorizedClientProvider authorizedClientProvider =
            OAuth2AuthorizedClientProviderBuilder.builder()
                .clientCredentials()
                .build();

        AuthorizedClientServiceOAuth2AuthorizedClientManager manager =
            new AuthorizedClientServiceOAuth2AuthorizedClientManager(
                clientRegistrationRepository,
                authorizedClientService
            );
        
        manager.setAuthorizedClientProvider(authorizedClientProvider);
        return manager;
    }
}
```

**application.yml:**
```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          grpc-client:
            provider: auth-server
            client-id: ${OAUTH_CLIENT_ID}
            client-secret: ${OAUTH_CLIENT_SECRET}
            authorization-grant-type: client_credentials
            scope: grpc.orders.read,grpc.orders.write
        
        provider:
          auth-server:
            token-uri: https://auth.example.com/oauth/token
```

**Client interceptor:**
```java
@Component
public class OAuth2ClientInterceptor implements ClientInterceptor {

    private static final Metadata.Key<String> AUTHORIZATION_KEY = 
        Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
    
    private final OAuth2AuthorizedClientManager authorizedClientManager;

    public OAuth2ClientInterceptor(OAuth2AuthorizedClientManager authorizedClientManager) {
        this.authorizedClientManager = authorizedClientManager;
    }

    @Override
    public <ReqT, RespT> ClientCall<ReqT, RespT> interceptCall(
            MethodDescriptor<ReqT, RespT> method,
            CallOptions callOptions,
            Channel next) {
        
        return new ForwardingClientCall.SimpleForwardingClientCall<ReqT, RespT>(
                next.newCall(method, callOptions)) {
            
            @Override
            public void start(Listener<RespT> responseListener, Metadata headers) {
                // Get OAuth2 token
                OAuth2AuthorizeRequest authorizeRequest = 
                    OAuth2AuthorizeRequest.withClientRegistrationId("grpc-client")
                        .principal("grpc-service")
                        .build();
                
                OAuth2AuthorizedClient authorizedClient = 
                    authorizedClientManager.authorize(authorizeRequest);
                
                if (authorizedClient != null) {
                    String accessToken = authorizedClient.getAccessToken().getTokenValue();
                    headers.put(AUTHORIZATION_KEY, "Bearer " + accessToken);
                }
                
                super.start(responseListener, headers);
            }
        };
    }
}
```

---

## Authorization

### Method Security with @PreAuthorize

```java
package com.example.grpc.service;

import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.security.access.prepost.PreAuthorize;

@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    @Override
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public void getOrder(GetOrderRequest request, 
                        StreamObserver<Order> responseObserver) {
        // Implementation
    }

    @Override
    @PreAuthorize("hasRole('USER')")
    public void createOrder(CreateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        // Implementation
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteOrder(DeleteOrderRequest request,
                           StreamObserver<Empty> responseObserver) {
        // Implementation
    }
}
```

### Custom Authorization Logic

```java
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    private final OrderRepository orderRepository;

    @Override
    @PreAuthorize("hasRole('USER')")
    public void getOrder(GetOrderRequest request, 
                        StreamObserver<Order> responseObserver) {
        try {
            // Extract user ID from security context
            String userId = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();
            
            // Fetch order
            Order order = orderRepository.findByName(request.getName());
            
            // Authorization check: User can only access own orders
            if (!order.getCustomerId().equals(userId) && !isAdmin()) {
                responseObserver.onError(
                    Status.PERMISSION_DENIED
                        .withDescription("You can only access your own orders")
                        .asRuntimeException()
                );
                return;
            }
            
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.asRuntimeException());
        }
    }
    
    private boolean isAdmin() {
        return SecurityContextHolder.getContext()
            .getAuthentication()
            .getAuthorities()
            .stream()
            .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
    }
}
```

### Authorization Interceptor

```java
@Order(2)  // After authentication
@GrpcGlobalServerInterceptor
public class AuthorizationInterceptor implements ServerInterceptor {

    private static final Map<String, List<String>> METHOD_ROLES = Map.of(
        "example.order.v1.OrderService/GetOrder", List.of("USER", "ADMIN"),
        "example.order.v1.OrderService/CreateOrder", List.of("USER", "ADMIN"),
        "example.order.v1.OrderService/DeleteOrder", List.of("ADMIN")
    );

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        String methodName = call.getMethodDescriptor().getFullMethodName();
        List<String> requiredRoles = METHOD_ROLES.get(methodName);
        
        if (requiredRoles == null) {
            return next.startCall(call, headers);
        }
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            call.close(
                Status.UNAUTHENTICATED.withDescription("Not authenticated"),
                new Metadata()
            );
            return new ServerCall.Listener<ReqT>() {};
        }
        
        boolean hasRequiredRole = auth.getAuthorities().stream()
            .anyMatch(grantedAuth -> 
                requiredRoles.contains(grantedAuth.getAuthority().replace("ROLE_", ""))
            );
        
        if (!hasRequiredRole) {
            call.close(
                Status.PERMISSION_DENIED
                    .withDescription("Insufficient permissions"),
                new Metadata()
            );
            return new ServerCall.Listener<ReqT>() {};
        }
        
        return next.startCall(call, headers);
    }
}
```

---

## Rate Limiting

### Simple Rate Limiter

**Dependencies:**
```xml
<dependency>
    <groupId>com.google.guava</groupId>
    <artifactId>guava</artifactId>
    <version>32.1.3-jre</version>
</dependency>
```

**Implementation:**
```java
package com.example.grpc.security;

import com.google.common.util.concurrent.RateLimiter;
import io.grpc.*;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.springframework.core.annotation.Order;

import java.util.concurrent.ConcurrentHashMap;

@Order(3)
@GrpcGlobalServerInterceptor
public class RateLimitInterceptor implements ServerInterceptor {

    private final ConcurrentHashMap<String, RateLimiter> limiters = new ConcurrentHashMap<>();
    private final double permitsPerSecond = 10.0;

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        // Get user ID from security context
        String userId = getUserId();
        
        // Get or create rate limiter for user
        RateLimiter limiter = limiters.computeIfAbsent(
            userId,
            k -> RateLimiter.create(permitsPerSecond)
        );
        
        // Try to acquire permit
        if (!limiter.tryAcquire()) {
            call.close(
                Status.RESOURCE_EXHAUSTED
                    .withDescription("Rate limit exceeded"),
                new Metadata()
            );
            return new ServerCall.Listener<ReqT>() {};
        }
        
        return next.startCall(call, headers);
    }
    
    private String getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "anonymous";
    }
}
```

### Redis-Based Rate Limiting

**Dependencies:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

**Configuration:**
```java
@Service
public class RedisRateLimiter {

    private final RedisTemplate<String, String> redisTemplate;

    public RedisRateLimiter(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean allowRequest(String userId, int maxRequests, Duration window) {
        String key = "rate_limit:" + userId;
        long now = System.currentTimeMillis();
        long windowStart = now - window.toMillis();
        
        // Remove old entries
        redisTemplate.opsForZSet().removeRangeByScore(key, 0, windowStart);
        
        // Count current requests in window
        Long count = redisTemplate.opsForZSet().count(key, windowStart, now);
        
        if (count != null && count >= maxRequests) {
            return false;
        }
        
        // Add current request
        redisTemplate.opsForZSet().add(key, String.valueOf(now), now);
        redisTemplate.expire(key, window);
        
        return true;
    }
}
```

**Interceptor:**
```java
@GrpcGlobalServerInterceptor
public class RedisRateLimitInterceptor implements ServerInterceptor {

    private final RedisRateLimiter rateLimiter;

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        String userId = getUserId();
        
        if (!rateLimiter.allowRequest(userId, 100, Duration.ofMinutes(1))) {
            Metadata trailers = new Metadata();
            trailers.put(
                Metadata.Key.of("x-ratelimit-reset", Metadata.ASCII_STRING_MARSHALLER),
                String.valueOf(System.currentTimeMillis() + 60000)
            );
            
            call.close(
                Status.RESOURCE_EXHAUSTED.withDescription("Rate limit exceeded"),
                trailers
            );
            return new ServerCall.Listener<ReqT>() {};
        }
        
        return next.startCall(call, headers);
    }
}
```

---

## Testing Security

### JWT Authentication Test

```java
@SpringBootTest
@DirtiesContext
class JwtAuthenticationTest {

    @Autowired
    private JwtDecoder jwtDecoder;
    
    private OrderServiceGrpc.OrderServiceBlockingStub authenticatedStub;

    @BeforeEach
    void setUp() {
        String token = generateTestToken();
        
        Metadata metadata = new Metadata();
        metadata.put(
            Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER),
            "Bearer " + token
        );
        
        authenticatedStub = OrderServiceGrpc.newBlockingStub(channel)
            .withCallCredentials(new CallCredentials() {
                @Override
                public void applyRequestMetadata(
                        RequestInfo requestInfo,
                        Executor appExecutor,
                        MetadataApplier applier) {
                    applier.apply(metadata);
                }
            });
    }

    @Test
    void shouldAllowAuthenticatedRequest() {
        Order order = authenticatedStub.getOrder(
            GetOrderRequest.newBuilder()
                .setName("orders/123")
                .build()
        );
        
        assertNotNull(order);
    }

    @Test
    void shouldDenyUnauthenticatedRequest() {
        OrderServiceGrpc.OrderServiceBlockingStub unauthStub = 
            OrderServiceGrpc.newBlockingStub(channel);
        
        StatusRuntimeException exception = assertThrows(
            StatusRuntimeException.class,
            () -> unauthStub.getOrder(
                GetOrderRequest.newBuilder()
                    .setName("orders/123")
                    .build()
            )
        );
        
        assertEquals(Status.Code.UNAUTHENTICATED, exception.getStatus().getCode());
    }
}
```

---

## Best Practices

### ✅ Do:
- Use TLS in production (minimum TLS 1.2)
- Validate JWT signatures and expiration
- Use mTLS for service-to-service communication
- Implement rate limiting per user/service
- Log authentication and authorization failures
- Store secrets in vault (not config files)
- Use `@PreAuthorize` for method-level security
- Clear security context after request

### ❌ Don't:
- Don't disable TLS in production
- Don't skip certificate verification
- Don't hardcode secrets in code
- Don't log sensitive data (tokens, passwords)
- Don't expose internal errors to clients
- Don't implement custom crypto (use libraries)
- Don't forget to test security configurations

---

## Related Documentation

### Language-Agnostic Theory
- **[Security Guide](../../../guides/api-design/grpc/security.md)** - Security patterns and best practices
- **[Security Standards](/guides/api-design/security/security-standards.md)** - OAuth 2.1, JWT standards

### Other Spring Documentation
- **[Interceptors](interceptors.md)** - JWT validation interceptor patterns
- **[Spring Security](/languages/spring/security/README.md)** - Spring Security configuration
- **[Observability](observability/metrics.md)** - Security metrics and monitoring

---

**Navigation:** [← Interceptors](interceptors.md) | [Testing →](testing/unit-testing.md)
