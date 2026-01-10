# Spring Boot gRPC Interceptors

> **📖 Reading Guide**
> **⏱️ Reading Time:** 10 minutes | **🎯 Level:** Intermediate
> **📋 Prerequisites:** [Getting Started](getting-started.md), basic interceptor concepts
> **🎯 Key Topics:** Server interceptors • Client interceptors • Authentication • Logging • Metrics
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

Interceptors provide cross-cutting concerns for gRPC services (authentication, logging, metrics, tracing).

---

## Overview

**Interceptor types:**

| Type | Applies To | Use Cases |
|------|------------|-----------|
| Global Server | All services | Logging, authentication, metrics |
| Service-Specific Server | Single service | Service-level auth, validation |
| Global Client | All clients | Token injection, retry, tracing |
| Service-Specific Client | Single client | Client-specific headers |

---

## Server Interceptors

### Global Server Interceptor

Applies to all gRPC services in your application.

```java
package com.example.grpc.interceptor;

import io.grpc.*;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@GrpcGlobalServerInterceptor
public class LoggingInterceptor implements ServerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(LoggingInterceptor.class);

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        String methodName = call.getMethodDescriptor().getFullMethodName();
        log.info("gRPC call started: {}", methodName);
        
        return new ForwardingServerCallListener.SimpleForwardingServerCallListener<ReqT>(
                next.startCall(call, headers)) {
            
            @Override
            public void onMessage(ReqT message) {
                log.debug("Request: {}", message);
                super.onMessage(message);
            }

            @Override
            public void onComplete() {
                log.info("gRPC call completed: {}", methodName);
                super.onComplete();
            }

            @Override
            public void onCancel() {
                log.warn("gRPC call cancelled: {}", methodName);
                super.onCancel();
            }
        };
    }
}
```

### Service-Specific Interceptor

Applies to a single service only.

```java
@Configuration
public class InterceptorConfig {

    @GrpcServiceInterceptor("OrderService")
    ServerInterceptor orderServiceInterceptor() {
        return new ServerInterceptor() {
            @Override
            public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
                    ServerCall<ReqT, RespT> call,
                    Metadata headers,
                    ServerCallHandler<ReqT, RespT> next) {
                
                log.debug("OrderService interceptor");
                return next.startCall(call, headers);
            }
        };
    }
}
```

---

## Authentication Interceptor

### JWT Validation

```java
package com.example.grpc.interceptor;

import io.grpc.*;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@GrpcGlobalServerInterceptor
public class AuthenticationInterceptor implements ServerInterceptor {

    private static final Metadata.Key<String> AUTHORIZATION_HEADER = 
        Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
    
    private final JwtDecoder jwtDecoder;

    public AuthenticationInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        String methodName = call.getMethodDescriptor().getFullMethodName();
        
        // Allow health checks without auth
        if (methodName.equals("grpc.health.v1.Health/Check")) {
            return next.startCall(call, headers);
        }
        
        // Extract token
        String authHeader = headers.get(AUTHORIZATION_HEADER);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            call.close(
                Status.UNAUTHENTICATED.withDescription("Missing or invalid token"),
                new Metadata()
            );
            return new ServerCall.Listener<ReqT>() {};
        }
        
        String token = authHeader.substring(7);
        
        try {
            // Validate JWT
            Jwt jwt = jwtDecoder.decode(token);
            
            // Set security context
            JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt);
            SecurityContextHolder.getContext().setAuthentication(auth);
            
            return next.startCall(call, headers);
            
        } catch (Exception e) {
            call.close(
                Status.UNAUTHENTICATED.withDescription("Invalid token: " + e.getMessage()),
                new Metadata()
            );
            return new ServerCall.Listener<ReqT>() {};
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
```

### Configuration

```java
@Configuration
public class SecurityConfig {

    @Bean
    JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withJwkSetUri("https://auth.example.com/.well-known/jwks.json")
            .build();
    }
    
    @Bean
    AuthenticationInterceptor authenticationInterceptor(JwtDecoder jwtDecoder) {
        return new AuthenticationInterceptor(jwtDecoder);
    }
}
```

---

## Metadata Propagation

### Correlation ID

```java
@GrpcGlobalServerInterceptor
public class CorrelationIdInterceptor implements ServerInterceptor {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = 
        Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    
    private static final ThreadLocal<String> CORRELATION_ID = new ThreadLocal<>();

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        // Extract or generate correlation ID
        String correlationId = headers.get(CORRELATION_ID_KEY);
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
        }
        
        // Store in thread local
        CORRELATION_ID.set(correlationId);
        
        // Add to MDC for logging
        MDC.put("correlationId", correlationId);
        
        try {
            return next.startCall(
                new ForwardingServerCall.SimpleForwardingServerCall<ReqT, RespT>(call) {
                    @Override
                    public void sendHeaders(Metadata headers) {
                        // Add correlation ID to response headers
                        headers.put(CORRELATION_ID_KEY, correlationId);
                        super.sendHeaders(headers);
                    }
                },
                headers
            );
        } finally {
            CORRELATION_ID.remove();
            MDC.remove("correlationId");
        }
    }
    
    public static String getCorrelationId() {
        return CORRELATION_ID.get();
    }
}
```

---

## Metrics Interceptor

### Micrometer Integration

```java
package com.example.grpc.interceptor;

import io.grpc.*;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;

@GrpcGlobalServerInterceptor
public class MetricsInterceptor implements ServerInterceptor {

    private final MeterRegistry meterRegistry;

    public MetricsInterceptor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        String methodName = call.getMethodDescriptor().getFullMethodName();
        String serviceName = call.getMethodDescriptor().getServiceName();
        
        // Start timer
        Timer.Sample sample = Timer.start(meterRegistry);
        
        // Increment request counter
        Counter.builder("grpc.server.requests")
            .tag("service", serviceName)
            .tag("method", methodName)
            .register(meterRegistry)
            .increment();
        
        return new ForwardingServerCallListener.SimpleForwardingServerCallListener<ReqT>(
                next.startCall(
                    new ForwardingServerCall.SimpleForwardingServerCall<ReqT, RespT>(call) {
                        @Override
                        public void close(Status status, Metadata trailers) {
                            // Record duration
                            sample.stop(Timer.builder("grpc.server.duration")
                                .tag("service", serviceName)
                                .tag("method", methodName)
                                .tag("status", status.getCode().name())
                                .register(meterRegistry));
                            
                            // Count by status
                            Counter.builder("grpc.server.responses")
                                .tag("service", serviceName)
                                .tag("method", methodName)
                                .tag("status", status.getCode().name())
                                .register(meterRegistry)
                                .increment();
                            
                            super.close(status, trailers);
                        }
                    },
                    headers
                )
        ) {};
    }
}
```

---

## Client Interceptors

### Global Client Interceptor

Applies to all gRPC clients.

```java
package com.example.grpc.interceptor;

import io.grpc.*;
import net.devh.boot.grpc.client.interceptor.GrpcGlobalClientInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@GrpcGlobalClientInterceptor
public class ClientLoggingInterceptor implements ClientInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ClientLoggingInterceptor.class);

    @Override
    public <ReqT, RespT> ClientCall<ReqT, RespT> interceptCall(
            MethodDescriptor<ReqT, RespT> method,
            CallOptions callOptions,
            Channel next) {
        
        log.debug("Calling remote service: {}", method.getFullMethodName());
        
        return new ForwardingClientCall.SimpleForwardingClientCall<ReqT, RespT>(
                next.newCall(method, callOptions)) {
            
            @Override
            public void start(Listener<RespT> responseListener, Metadata headers) {
                super.start(
                    new ForwardingClientCallListener.SimpleForwardingClientCallListener<RespT>(responseListener) {
                        @Override
                        public void onClose(Status status, Metadata trailers) {
                            if (status.isOk()) {
                                log.debug("Call succeeded: {}", method.getFullMethodName());
                            } else {
                                log.warn("Call failed: {} - {}", 
                                    method.getFullMethodName(), 
                                    status);
                            }
                            super.onClose(status, trailers);
                        }
                    },
                    headers
                );
            }
        };
    }
}
```

### Token Injection Interceptor

```java
@Component
public class ClientAuthInterceptor implements ClientInterceptor {

    private static final Metadata.Key<String> AUTHORIZATION_HEADER = 
        Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
    
    private final TokenProvider tokenProvider;

    public ClientAuthInterceptor(TokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
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
                // Get access token
                String token = tokenProvider.getAccessToken();
                
                // Add to headers
                headers.put(AUTHORIZATION_HEADER, "Bearer " + token);
                
                super.start(responseListener, headers);
            }
        };
    }
}

@Configuration
public class ClientConfig {

    @GrpcGlobalClientInterceptor
    ClientInterceptor clientAuthInterceptor(TokenProvider tokenProvider) {
        return new ClientAuthInterceptor(tokenProvider);
    }
}
```

---

## Interceptor Ordering

### Order Configuration

```java
@Configuration
public class InterceptorConfig {

    @Bean
    @Order(1)  // First
    @GrpcGlobalServerInterceptor
    ServerInterceptor correlationIdInterceptor() {
        return new CorrelationIdInterceptor();
    }
    
    @Bean
    @Order(2)  // Second
    @GrpcGlobalServerInterceptor
    ServerInterceptor authenticationInterceptor(JwtDecoder jwtDecoder) {
        return new AuthenticationInterceptor(jwtDecoder);
    }
    
    @Bean
    @Order(3)  // Third
    @GrpcGlobalServerInterceptor
    ServerInterceptor loggingInterceptor() {
        return new LoggingInterceptor();
    }
    
    @Bean
    @Order(4)  // Last
    @GrpcGlobalServerInterceptor
    ServerInterceptor metricsInterceptor(MeterRegistry meterRegistry) {
        return new MetricsInterceptor(meterRegistry);
    }
}
```

**Execution order:**
```
Request → CorrelationId → Auth → Logging → Metrics → Service
Response ← CorrelationId ← Auth ← Logging ← Metrics ← Service
```

---

## Exception Handling Interceptor

### Global Error Handler

```java
@GrpcGlobalServerInterceptor
public class ExceptionHandlingInterceptor implements ServerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ExceptionHandlingInterceptor.class);

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        ServerCall<ReqT, RespT> wrappedCall = 
            new ForwardingServerCall.SimpleForwardingServerCall<ReqT, RespT>(call) {
            
            @Override
            public void close(Status status, Metadata trailers) {
                // Log errors
                if (!status.isOk()) {
                    String method = call.getMethodDescriptor().getFullMethodName();
                    
                    if (status.getCause() != null) {
                        log.error("gRPC error in {}: {}", 
                            method, 
                            status.getDescription(), 
                            status.getCause());
                    } else {
                        log.warn("gRPC error in {}: {}", 
                            method, 
                            status.getDescription());
                    }
                }
                
                super.close(status, trailers);
            }
        };
        
        try {
            return next.startCall(wrappedCall, headers);
            
        } catch (Exception e) {
            log.error("Unexpected exception in interceptor", e);
            wrappedCall.close(
                Status.INTERNAL.withDescription("Internal server error"),
                new Metadata()
            );
            return new ServerCall.Listener<ReqT>() {};
        }
    }
}
```

---

## Testing Interceptors

### Unit Test

```java
class AuthenticationInterceptorTest {

    private AuthenticationInterceptor interceptor;
    private JwtDecoder jwtDecoder;
    private ServerCall<String, String> call;
    private Metadata headers;

    @BeforeEach
    void setUp() {
        jwtDecoder = mock(JwtDecoder.class);
        interceptor = new AuthenticationInterceptor(jwtDecoder);
        call = mock(ServerCall.class);
        headers = new Metadata();
    }

    @Test
    void shouldAcceptValidToken() {
        // Arrange
        String token = "valid.jwt.token";
        headers.put(
            Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER),
            "Bearer " + token
        );
        
        Jwt jwt = mock(Jwt.class);
        when(jwtDecoder.decode(token)).thenReturn(jwt);
        
        ServerCallHandler<String, String> next = mock(ServerCallHandler.class);
        when(next.startCall(any(), any())).thenReturn(mock(ServerCall.Listener.class));
        
        // Act
        interceptor.interceptCall(call, headers, next);
        
        // Assert
        verify(next).startCall(any(), eq(headers));
        verify(call, never()).close(any(), any());
    }

    @Test
    void shouldRejectInvalidToken() {
        // Arrange
        headers.put(
            Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER),
            "Bearer invalid"
        );
        
        when(jwtDecoder.decode(anyString())).thenThrow(new JwtException("Invalid"));
        
        // Act
        interceptor.interceptCall(call, headers, mock(ServerCallHandler.class));
        
        // Assert
        verify(call).close(
            argThat(status -> status.getCode() == Status.Code.UNAUTHENTICATED),
            any()
        );
    }
}
```

---

## Common Patterns

### Request/Response Logging

```java
@GrpcGlobalServerInterceptor
public class DetailedLoggingInterceptor implements ServerInterceptor {

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        return new ForwardingServerCallListener.SimpleForwardingServerCallListener<ReqT>(
                next.startCall(
                    new ForwardingServerCall.SimpleForwardingServerCall<ReqT, RespT>(call) {
                        @Override
                        public void sendMessage(RespT message) {
                            log.debug("Response: {}", message);
                            super.sendMessage(message);
                        }
                    },
                    headers
                )
        ) {
            @Override
            public void onMessage(ReqT message) {
                log.debug("Request: {}", message);
                super.onMessage(message);
            }
        };
    }
}
```

### Rate Limiting

```java
@GrpcGlobalServerInterceptor
public class RateLimitInterceptor implements ServerInterceptor {

    private final RateLimiter rateLimiter;

    public RateLimitInterceptor(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        
        String clientId = extractClientId(headers);
        
        if (!rateLimiter.tryAcquire(clientId)) {
            call.close(
                Status.RESOURCE_EXHAUSTED.withDescription("Rate limit exceeded"),
                new Metadata()
            );
            return new ServerCall.Listener<ReqT>() {};
        }
        
        return next.startCall(call, headers);
    }
    
    private String extractClientId(Metadata headers) {
        // Extract from JWT, API key, or IP address
        return "default";
    }
}
```

---

## Best Practices

### ✅ Do:
- Use `@Order` to control interceptor execution order
- Clean up resources (MDC, SecurityContext) in finally blocks
- Use `@GrpcGlobalServerInterceptor` for cross-cutting concerns
- Log only what's necessary (avoid sensitive data)
- Keep interceptors focused on single responsibility
- Test interceptors independently

### ❌ Don't:
- Don't block in interceptors (use async operations)
- Don't throw exceptions (close call with error status instead)
- Don't log full request/response in production (sensitive data)
- Don't create new threads in interceptors
- Don't modify business logic in interceptors
- Don't forget to call `super` methods in forwarding classes

---

## Related Documentation

### Spring Documentation
- **[Server Configuration](server-configuration.md)** - Configure interceptors
- **[Security](security.md)** - Authentication and authorization
- **[Observability](observability/metrics.md)** - Metrics and tracing

### Language-Agnostic Theory
- **[Security Guide](../../../guides/api-design/grpc/security.md)** - Authentication patterns
- **[Observability](/guides/observability/Observability-Standards.md)** - Monitoring standards

---

**Navigation:** [← Error Handling](error-handling.md) | [Security →](security.md)
