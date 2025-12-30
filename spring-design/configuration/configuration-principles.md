# Configuration Principles

## Overview

Spring Boot configuration is fundamental to building flexible, maintainable applications. This document outlines the core principles for configuring Spring Boot applications in both imperative and reactive microservices, focusing on externalized configuration, type-safe properties, and validation.

## Core Configuration Principles

1. **Externalized Configuration**: Store configuration outside of code
2. **Environment-Specific**: Use profiles for different environments
3. **Security-First**: Never store secrets in plain text
4. **Type-Safe**: Use `@ConfigurationProperties` for complex configuration
5. **Validation**: Validate configuration properties at startup
6. **Default Values**: Provide sensible defaults for all configuration

## Application Properties Structure

### Base Configuration

Organize configuration in a hierarchical structure:

```yaml
# application.yml
spring:
  application:
    name: order-service
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:development}

# Application-specific configuration
app:
  security:
    jwt:
      issuer-uri: ${JWT_ISSUER_URI:http://localhost:8080/auth/realms/microservices}
    cors:
      allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000}
  
  integration:
    payment-service:
      base-url: ${PAYMENT_SERVICE_URL:http://localhost:8081}
      timeout: ${PAYMENT_SERVICE_TIMEOUT:PT30S}
      retry-attempts: ${PAYMENT_SERVICE_RETRY:3}
    
    customer-service:
      base-url: ${CUSTOMER_SERVICE_URL:http://localhost:8082}
      timeout: ${CUSTOMER_SERVICE_TIMEOUT:PT10S}

# Logging configuration
logging:
  level:
    com.example.orderservice: ${LOG_LEVEL:INFO}
    org.springframework.security: ${SECURITY_LOG_LEVEL:WARN}
    org.hibernate.SQL: ${SQL_LOG_LEVEL:WARN}
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} [%X{correlationId:-}] - %msg%n"
```

## Configuration Properties Classes

### Type-Safe Configuration Properties

Use `@ConfigurationProperties` for complex configuration:

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "app")
@Validated
public record ApplicationProperties(
    @Valid @NotNull Security security,
    @Valid @NotNull Integration integration
) {
    
    public record Security(
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull Cors cors
    ) {
        
        public record Jwt(
            @NotBlank String issuerUri
        ) {}
        
        public record Cors(
            @NotNull List<String> allowedOrigins
        ) {}
    }
    
    public record Integration(
        @Valid @NotNull PaymentService paymentService,
        @Valid @NotNull CustomerService customerService
    ) {
        
        public record PaymentService(
            @NotBlank String baseUrl,
            @NotNull Duration timeout,
            @Positive int retryAttempts
        ) {}
        
        public record CustomerService(
            @NotBlank String baseUrl,
            @NotNull Duration timeout
        ) {}
    }
}
```

### Enabling Configuration Properties

Enable configuration properties in a configuration class:

```java
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
    ApplicationProperties.class,
    DatabaseProperties.class,
    SecurityProperties.class
})
public class PropertiesConfiguration {
    // Configuration class to enable properties
}
```

## Configuration Validation

### Validation Annotations

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.URL;

@ConfigurationProperties(prefix = "app.external-service")
@Validated
public record ExternalServiceProperties(
    @NotBlank @URL String baseUrl,
    @NotNull @Positive Duration timeout,
    @NotNull @Positive Integer maxRetries,
    @NotBlank String apiKey
) {}
```

## Conditional Configuration

### Feature-Based Configuration

```java
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ConditionalConfig {

    @Bean
    @ConditionalOnProperty(name = "app.features.async-processing", havingValue = "true")
    public AsyncTaskExecutor asyncTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }

    @Bean
    @ConditionalOnProperty(name = "app.caching.enabled", havingValue = "true", matchIfMissing = true)
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("orders", "customers");
    }
}
```

## Configuration Testing

### Configuration Properties Testing

```java
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = ApplicationPropertiesTest.TestConfig.class)
@TestPropertySource(properties = {
    "app.security.jwt.issuer-uri=http://test-issuer",
    "app.integration.payment-service.base-url=http://payment-test",
    "app.integration.payment-service.timeout=PT5S",
    "app.integration.payment-service.retry-attempts=2"
})
class ApplicationPropertiesTest {

    @EnableConfigurationProperties(ApplicationProperties.class)
    static class TestConfig {}

    @Test
    void shouldBindConfigurationProperties(ApplicationProperties properties) {
        assertThat(properties.security().jwt().issuerUri())
            .isEqualTo("http://test-issuer");
        
        assertThat(properties.integration().paymentService().baseUrl())
            .isEqualTo("http://payment-test");
        
        assertThat(properties.integration().paymentService().retryAttempts())
            .isEqualTo(2);
    }
}
```

## Configuration Best Practices

### Environment Variables vs Application Properties

| Use Case | Approach | Example |
|----------|----------|---------|
| Environment-specific values | Environment variables | `DATABASE_URL` |
| Default application behavior | Application properties | `spring.jpa.hibernate.ddl-auto` |
| Secrets | External secret management | Vault, Kubernetes secrets |
| Feature flags | Application properties with env override | `app.features.new-feature=${NEW_FEATURE:false}` |

## Common Anti-patterns to Avoid

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Hardcoded values | No flexibility across environments | Use externalized configuration |
| Secrets in properties files | Security vulnerability | Use secret management systems |
| No validation | Runtime failures | Validate configuration at startup |
| Complex @Value expressions | Hard to maintain | Use @ConfigurationProperties |
| Profile-specific code | Coupling | Use conditional configuration |

## Related Documentation

- [Environment Profiles](environment-profiles.md) - Environment-specific configuration patterns
- [Security Configuration](security-configuration.md) - JWT and security setup
- [Database Configuration](database-configuration.md) - Database and persistence configuration
- [External Services](external-services.md) - WebClient and service integration
- [Observability Configuration](observability-configuration.md) - Metrics and monitoring setup

These configuration principles ensure that Spring Boot microservices are flexible, secure, and maintainable across different environments while following infrastructure-as-code principles.