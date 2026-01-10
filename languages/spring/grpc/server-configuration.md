# Spring Boot gRPC Server Configuration

> **📖 Reading Guide**
> **⏱️ Reading Time:** 12 minutes | **🎯 Level:** Intermediate
> **📋 Prerequisites:** Completed [Getting Started](getting-started.md), basic YAML/properties knowledge
> **🎯 Key Topics:** Server properties • TLS configuration • Connection limits • Keepalive • Performance tuning
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

This guide covers all aspects of configuring the gRPC server in Spring Boot.

---

## Overview

The `grpc-spring-boot-starter` library provides auto-configuration for gRPC servers through `application.yml` or `application.properties`. Configuration options include:

- **Network settings** - Port, address, TLS
- **Message limits** - Request/response size limits
- **Connection management** - Idle timeout, keepalive
- **Performance tuning** - Thread pools, flow control
- **Security** - TLS certificates, client authentication
- **Debugging** - Reflection, logging

---

## Basic Server Configuration

### Minimal Configuration

**application.yml:**
```yaml
grpc:
  server:
    port: 9090
```

This starts a gRPC server on port `9090` with all default settings.

### Recommended Development Configuration

```yaml
spring:
  application:
    name: order-service

grpc:
  server:
    # Network
    port: 9090
    address: 0.0.0.0  # Bind to all interfaces
    
    # Debugging
    reflection-service-enabled: true  # Enable grpcurl/reflection
    
logging:
  level:
    net.devh.boot.grpc: DEBUG
    io.grpc: DEBUG
```

### Recommended Production Configuration

```yaml
spring:
  application:
    name: order-service

grpc:
  server:
    # Network
    port: 9090
    address: 0.0.0.0
    
    # Message limits
    max-inbound-message-size: 4MB
    max-inbound-metadata-size: 8KB
    
    # Connection management
    max-connection-idle: 30m
    max-connection-age: 30m
    max-connection-age-grace: 5m
    
    # Keepalive
    keep-alive-time: 2h
    keep-alive-timeout: 20s
    permit-keep-alive-time: 5m
    permit-keep-alive-without-calls: false
    
    # Security
    security:
      enabled: true
      certificate-chain: classpath:certs/server-cert.pem
      private-key: classpath:certs/server-key.pem
      trust-cert-collection: classpath:certs/ca-cert.pem
      client-auth: REQUIRE
    
    # Disable reflection in production
    reflection-service-enabled: false

logging:
  level:
    net.devh.boot.grpc: INFO
    io.grpc: WARN
```

---

## Network Configuration

### Port and Address

```yaml
grpc:
  server:
    # Port to listen on (default: 9090)
    port: 9090
    
    # Bind address (default: 0.0.0.0 = all interfaces)
    address: 0.0.0.0
    # Or specific interface:
    # address: 127.0.0.1   # localhost only
    # address: 10.0.0.5    # specific IP
```

**Environment-specific ports:**
```yaml
# application-dev.yml
grpc:
  server:
    port: 9090

---
# application-staging.yml
grpc:
  server:
    port: 9091

---
# application-prod.yml
grpc:
  server:
    port: 50051  # Standard gRPC port
```

### Multiple Profiles

```yaml
spring:
  profiles:
    active: dev

---
spring:
  config:
    activate:
      on-profile: dev
grpc:
  server:
    port: 9090
    reflection-service-enabled: true

---
spring:
  config:
    activate:
      on-profile: prod
grpc:
  server:
    port: 50051
    reflection-service-enabled: false
```

---

## Message Size Limits

### Inbound Message Size

Controls the maximum size of messages received by the server.

```yaml
grpc:
  server:
    # Maximum inbound message size
    max-inbound-message-size: 4MB  # Default: 4MB
    # Also accepts: KB, MB, GB
    # max-inbound-message-size: 10485760  # Bytes (10MB)
```

**Common scenarios:**

| Use Case | Recommended Limit |
|----------|-------------------|
| Simple CRUD operations | 1MB - 4MB (default) |
| File uploads | 10MB - 50MB |
| Bulk operations | 10MB - 100MB |
| Streaming (use streaming instead) | Keep at 4MB |

**Example: Large file uploads**
```yaml
grpc:
  server:
    max-inbound-message-size: 50MB  # For file uploads
```

### Metadata Size Limit

Controls the maximum size of request metadata (headers).

```yaml
grpc:
  server:
    # Maximum metadata size (default: 8KB)
    max-inbound-metadata-size: 8KB
    # Increase if you have large auth tokens
    # max-inbound-metadata-size: 16KB
```

---

## Connection Management

### Idle Connection Timeout

Automatically close connections that are idle for too long.

```yaml
grpc:
  server:
    # Close connections idle for more than 30 minutes
    max-connection-idle: 30m
    # Also accepts: s (seconds), m (minutes), h (hours)
```

**Recommended values:**

| Environment | Idle Timeout | Reason |
|-------------|--------------|--------|
| Development | No limit (omit) | Keep connections for debugging |
| Staging | 30m | Moderate resource cleanup |
| Production | 10m - 30m | Free resources, prevent stale connections |

### Connection Age Limits

Force clients to reconnect periodically to distribute load evenly.

```yaml
grpc:
  server:
    # Force reconnect after 30 minutes
    max-connection-age: 30m
    
    # Allow 5 minutes grace period for in-flight RPCs
    max-connection-age-grace: 5m
```

**Use case:** Prevents sticky connections in load-balanced environments.

**How it works:**
1. After `max-connection-age`, server sends GOAWAY frame
2. Client stops sending new requests
3. Server waits up to `max-connection-age-grace` for ongoing RPCs
4. Connection closes
5. Client reconnects to potentially different server instance

---

## Keepalive Configuration

Keepalive prevents connections from being closed by intermediate proxies or load balancers.

### Server-Side Keepalive

```yaml
grpc:
  server:
    # Send keepalive ping every 2 hours (if no activity)
    keep-alive-time: 2h
    
    # Wait 20 seconds for keepalive response
    keep-alive-timeout: 20s
    
    # Minimum time between client keepalive pings (prevent abuse)
    permit-keep-alive-time: 5m
    
    # Allow keepalive pings even when no RPCs active
    permit-keep-alive-without-calls: false  # Default: false
```

### Tuning for Different Scenarios

**Behind AWS ALB (60-second idle timeout):**
```yaml
grpc:
  server:
    keep-alive-time: 30s      # Send keepalive before ALB timeout
    keep-alive-timeout: 10s
    permit-keep-alive-time: 10s
    permit-keep-alive-without-calls: true
```

**Behind GCP Load Balancer (10-minute idle timeout):**
```yaml
grpc:
  server:
    keep-alive-time: 5m
    keep-alive-timeout: 20s
    permit-keep-alive-time: 1m
    permit-keep-alive-without-calls: true
```

**Long-lived streaming connections:**
```yaml
grpc:
  server:
    keep-alive-time: 30s      # Frequent pings
    keep-alive-timeout: 10s
    permit-keep-alive-time: 10s
    permit-keep-alive-without-calls: true
```

---

## TLS Configuration

### Enable TLS (Server Authentication Only)

```yaml
grpc:
  server:
    security:
      enabled: true
      # Server's certificate chain
      certificate-chain: classpath:certs/server-cert.pem
      # Server's private key
      private-key: classpath:certs/server-key.pem
```

**Certificate files:**
```
src/main/resources/
└── certs/
    ├── server-cert.pem   # Server public certificate
    └── server-key.pem    # Server private key
```

### Mutual TLS (Client and Server Authentication)

```yaml
grpc:
  server:
    security:
      enabled: true
      certificate-chain: classpath:certs/server-cert.pem
      private-key: classpath:certs/server-key.pem
      # CA certificate to validate clients
      trust-cert-collection: classpath:certs/ca-cert.pem
      # Require client certificates
      client-auth: REQUIRE  # Options: NONE, OPTIONAL, REQUIRE
```

**Client authentication modes:**

| Mode | Behavior |
|------|----------|
| `NONE` | No client certificate required (server-only TLS) |
| `OPTIONAL` | Client certificate requested but not required |
| `REQUIRE` | Client certificate required (mutual TLS) |

### File-based vs Classpath Certificates

**Classpath (embedded in JAR):**
```yaml
grpc:
  server:
    security:
      certificate-chain: classpath:certs/server-cert.pem
      private-key: classpath:certs/server-key.pem
```

**File system (external configuration):**
```yaml
grpc:
  server:
    security:
      certificate-chain: file:/etc/grpc/certs/server-cert.pem
      private-key: file:/etc/grpc/certs/server-key.pem
```

### Generate Self-Signed Certificates (Development Only)

```bash
# Generate CA
openssl req -x509 -newkey rsa:4096 -days 365 -nodes \
  -keyout ca-key.pem -out ca-cert.pem \
  -subj "/CN=My CA"

# Generate server certificate
openssl req -newkey rsa:4096 -nodes \
  -keyout server-key.pem -out server-req.pem \
  -subj "/CN=localhost"

openssl x509 -req -in server-req.pem -days 365 \
  -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
  -out server-cert.pem

# Clean up
rm server-req.pem
```

**⚠️ Important:** Use proper certificates from a Certificate Authority in production.

---

## Reflection Service

The reflection service allows tools like `grpcurl` to introspect available services.

```yaml
grpc:
  server:
    # Enable reflection (development only)
    reflection-service-enabled: true  # Default: false
```

**Enable in development, disable in production.**

**Why disable in production?**
- Security: Prevents service enumeration
- Performance: Small overhead
- Best practice: Only expose what's necessary

**Using reflection with grpcurl:**
```bash
# List services
grpcurl -plaintext localhost:9090 list

# Describe service
grpcurl -plaintext localhost:9090 describe example.order.v1.OrderService
```

---

## Performance Tuning

### Thread Pool Configuration

By default, gRPC uses the default executor (shared thread pool). You can customize it:

```java
@Configuration
public class GrpcServerConfig {

    @Bean
    public GrpcServerConfigurer grpcServerConfigurer() {
        return serverBuilder -> {
            // Custom executor with fixed thread pool
            ExecutorService executor = Executors.newFixedThreadPool(
                Runtime.getRuntime().availableProcessors() * 2
            );
            
            serverBuilder.executor(executor);
        };
    }
}
```

**Recommended thread pool sizes:**

| Workload Type | Thread Pool Size |
|---------------|------------------|
| CPU-bound | Number of cores |
| I/O-bound | 2-4x number of cores |
| Mixed | 2x number of cores |

### Flow Control Window Size

Controls the maximum amount of data that can be in-flight.

```java
@Configuration
public class GrpcServerConfig {

    @Bean
    public GrpcServerConfigurer grpcServerConfigurer() {
        return serverBuilder -> {
            serverBuilder
                .flowControlWindow(1024 * 1024)  // 1MB (default)
                .maxConcurrentCallsPerConnection(100);
        };
    }
}
```

---

## Advanced Configuration with GrpcServerConfigurer

For settings not exposed through `application.yml`, use `GrpcServerConfigurer`:

```java
package com.example.order.config;

import io.grpc.ServerBuilder;
import net.devh.boot.grpc.server.serverfactory.GrpcServerConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class GrpcServerConfig {

    @Bean
    public GrpcServerConfigurer grpcServerConfigurer() {
        return serverBuilder -> {
            if (serverBuilder instanceof io.grpc.netty.NettyServerBuilder) {
                io.grpc.netty.NettyServerBuilder nettyBuilder = 
                    (io.grpc.netty.NettyServerBuilder) serverBuilder;
                
                nettyBuilder
                    // Connection limits
                    .maxConcurrentCallsPerConnection(100)
                    .flowControlWindow(1024 * 1024)  // 1MB
                    
                    // Timeouts
                    .maxConnectionIdle(30, TimeUnit.MINUTES)
                    .maxConnectionAge(30, TimeUnit.MINUTES)
                    .maxConnectionAgeGrace(5, TimeUnit.MINUTES)
                    
                    // Keepalive
                    .keepAliveTime(2, TimeUnit.HOURS)
                    .keepAliveTimeout(20, TimeUnit.SECONDS)
                    .permitKeepAliveTime(5, TimeUnit.MINUTES)
                    .permitKeepAliveWithoutCalls(false);
            }
        };
    }
}
```

---

## Complete Configuration Example

### application.yml (Full)

```yaml
spring:
  application:
    name: order-service
  profiles:
    active: ${SPRING_PROFILE:dev}

---
# Development Profile
spring:
  config:
    activate:
      on-profile: dev

grpc:
  server:
    port: 9090
    address: 0.0.0.0
    reflection-service-enabled: true
    max-inbound-message-size: 4MB
    max-inbound-metadata-size: 8KB

logging:
  level:
    com.example.order: DEBUG
    net.devh.boot.grpc: DEBUG
    io.grpc: DEBUG

---
# Production Profile
spring:
  config:
    activate:
      on-profile: prod

grpc:
  server:
    # Network
    port: 50051
    address: 0.0.0.0
    
    # Message limits
    max-inbound-message-size: 4MB
    max-inbound-metadata-size: 8KB
    
    # Connection management
    max-connection-idle: 30m
    max-connection-age: 30m
    max-connection-age-grace: 5m
    
    # Keepalive (for AWS ALB)
    keep-alive-time: 30s
    keep-alive-timeout: 10s
    permit-keep-alive-time: 10s
    permit-keep-alive-without-calls: true
    
    # Security (Mutual TLS)
    security:
      enabled: true
      certificate-chain: file:/etc/grpc/certs/server-cert.pem
      private-key: file:/etc/grpc/certs/server-key.pem
      trust-cert-collection: file:/etc/grpc/certs/ca-cert.pem
      client-auth: REQUIRE
    
    # Disable reflection
    reflection-service-enabled: false

logging:
  level:
    com.example.order: INFO
    net.devh.boot.grpc: INFO
    io.grpc: WARN
```

---

## Configuration Properties Reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `grpc.server.port` | int | 9090 | gRPC server port |
| `grpc.server.address` | String | 0.0.0.0 | Bind address |
| `grpc.server.max-inbound-message-size` | DataSize | 4MB | Max message size |
| `grpc.server.max-inbound-metadata-size` | DataSize | 8KB | Max metadata size |
| `grpc.server.max-connection-idle` | Duration | ∞ | Idle connection timeout |
| `grpc.server.max-connection-age` | Duration | ∞ | Max connection age |
| `grpc.server.max-connection-age-grace` | Duration | ∞ | Grace period for age limit |
| `grpc.server.keep-alive-time` | Duration | 2h | Keepalive ping interval |
| `grpc.server.keep-alive-timeout` | Duration | 20s | Keepalive timeout |
| `grpc.server.permit-keep-alive-time` | Duration | 5m | Min keepalive interval |
| `grpc.server.permit-keep-alive-without-calls` | boolean | false | Allow keepalive when idle |
| `grpc.server.reflection-service-enabled` | boolean | false | Enable reflection |
| `grpc.server.security.enabled` | boolean | false | Enable TLS |
| `grpc.server.security.certificate-chain` | String | | Server certificate |
| `grpc.server.security.private-key` | String | | Server private key |
| `grpc.server.security.trust-cert-collection` | String | | CA certificate |
| `grpc.server.security.client-auth` | Enum | NONE | Client auth mode |

---

## Best Practices

### ✅ Do:
- Use TLS in production (at minimum, server-only TLS)
- Set message size limits to prevent resource exhaustion
- Configure keepalive for connections behind load balancers
- Use connection age limits for even load distribution
- Disable reflection in production
- Use profile-specific configurations (dev vs prod)
- Monitor connection metrics (see [Observability](observability/metrics.md))

### ❌ Don't:
- Don't use plaintext in production
- Don't set excessively large message limits (DOS risk)
- Don't keep reflection enabled in production
- Don't use self-signed certificates in production
- Don't ignore keepalive configuration behind proxies
- Don't use the same configuration for all environments

---

## Troubleshooting

### Server won't start

**Error:** `Address already in use`

**Solution:** Port 9090 is already in use. Change port or stop the conflicting process.
```yaml
grpc:
  server:
    port: 9091  # Use different port
```

### TLS handshake failures

**Error:** `UNAVAILABLE: io exception - SSLHandshakeException`

**Solution:** 
1. Verify certificate paths are correct
2. Ensure certificates are in PEM format
3. Check certificate validity: `openssl x509 -in server-cert.pem -text -noout`

### Connection drops behind load balancer

**Error:** `UNAVAILABLE: HTTP/2 error code: NO_ERROR`

**Solution:** Configure keepalive to match load balancer timeout.
```yaml
grpc:
  server:
    keep-alive-time: 30s  # Less than LB timeout
    permit-keep-alive-without-calls: true
```

---

## Related Documentation

- **[Getting Started](getting-started.md)** - Basic server setup
- **[Client Configuration](client-configuration.md)** - Configure gRPC clients
- **[Security Guide](security.md)** - Authentication and authorization
- **[Observability](observability/metrics.md)** - Monitoring and metrics

---

## External Resources

- [grpc-spring-boot-starter Server Configuration](https://yidongnan.github.io/grpc-spring-boot-starter/en/server/configuration.html)
- [gRPC Keepalive Guide](https://grpc.io/docs/guides/keepalive/)
- [gRPC Performance Best Practices](https://grpc.io/docs/guides/performance/)

---

**Navigation:** [← Getting Started](getting-started.md) | [Client Configuration →](client-configuration.md)
