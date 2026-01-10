# Spring Boot gRPC Health Checks

> **📖 Reading Guide**
> **⏱️ Reading Time:** 6 minutes | **🎯 Level:** Beginner
> **📋 Prerequisites:** [Getting Started](../getting-started.md), Spring Actuator
> **🎯 Key Topics:** Health protocol • Actuator integration • Kubernetes probes
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

Implement gRPC health checking with Spring Boot Actuator integration.

---

## Dependencies

```xml
<dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-services</artifactId>
    <version>1.60.0</version>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

---

## Configuration

**Enable health service:**

```java
@Configuration
public class HealthConfig {

    @Bean
    @GrpcService
    HealthStatusManager healthStatusManager() {
        HealthStatusManager manager = new HealthStatusManager();
        manager.setStatus("", ServingStatus.SERVING);
        return manager;
    }
}
```

**application.yml:**
```yaml
grpc:
  server:
    health-service-enabled: true

management:
  endpoint:
    health:
      show-details: always
  health:
    grpc:
      enabled: true
```

---

## Testing Health Endpoint

```bash
grpcurl -plaintext localhost:9090 grpc.health.v1.Health/Check
grpcurl -plaintext -d '{"service":""}' localhost:9090 grpc.health.v1.Health/Check
```

---

**Navigation:** [← Tracing](tracing.md) | [Back to gRPC Guide](../README.md)
