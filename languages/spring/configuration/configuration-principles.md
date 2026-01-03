# Configuration Principles

> **📖 Reading Guide**
>
> **⏱️ Reading Time:** 7 minutes | **🟡 Level:** Intermediate
>
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Configuration, Properties, Validation
>
> **📊 Complexity:** 11.9 grade level • 30.5 Flesch score • fairly difficult

## Overview

Spring Boot applications need configuration to work properly. This guide shows the best ways to set up your application.

You'll learn how to:
- Store settings outside your code
- Keep passwords and secrets safe
- Check that settings are valid when the app starts

This applies to both traditional and reactive applications.

## Core Configuration Principles

1. **Store Outside Code**: Put settings in files, not in code
2. **Environment-Specific**: Use profiles for dev, test, prod
3. **Security-First**: Never hardcode passwords and secrets
4. **Type-Safe**: Use `@ConfigurationProperties` to catch errors
5. **Validate Early**: Check settings when app starts
6. **Default Values**: Provide fallback values

## Application Properties Structure

### Base Configuration

Group your settings together. Put related settings in the same section.

Your main configuration file is called `application.yml`. This is where you set default values.

You can override these values with environment variables or separate files for different environments.

Here's an example:

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

Use `@ConfigurationProperties` instead of scattered `@Value` annotations.

Why use it:
- All settings in one place
- Spring converts YAML to Java automatically
- Validation finds errors before startup

Instead of using `@Value` on individual fields, create a configuration class. This class holds all your settings for one section.

The class uses Java records to keep the code clean. Records automatically create getters and constructors.

Here's an example:

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

You must register your property classes with Spring. Do this in a configuration class.

Spring then automatically validates all the settings when the app starts. If any values are invalid, the app stops and shows an error.

Here's how to register them:

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
    // Spring loads all listed property classes
}
```

The `@EnableConfigurationProperties` annotation turns on your property classes.

Spring validates them when the app starts.

## Configuration Validation

### Validation Annotations

Add validation annotations to catch errors early.

Common annotations:
- `@NotBlank`: Can't be empty
- `@NotNull`: Required field
- `@Positive`: Number must be bigger than zero
- `@URL`: Must be valid

Example:

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

If a value breaks the rules, Spring stops.

It shows an error message.

## Conditional Configuration

### Feature-Based Configuration

Turn features on and off with settings.

Only create features when they're enabled.

Use `@ConditionalOnProperty` for this.

Example:

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

This annotation checks your settings.

It only creates the bean if the property is `true`.

## Configuration Testing

### Configuration Properties Testing

Test your settings to ensure they load correctly. Use test properties to verify values bind as expected.

Example test:

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

Use `@TestPropertySource` to set test values. This tests different configurations without changing your actual files.

## Configuration Best Practices

### Environment Variables vs Application Properties

Use the right storage for each setting:

| Setting Type | Where to Store | Example |
|----------|----------|---------|
| Changes per environment | Environment variables | `DATABASE_URL` |
| Application defaults | Application files | `spring.jpa.hibernate.ddl-auto` |
| Secrets and passwords | Secret manager | Vault, Kubernetes |
| Feature flags | Application files | `app.features.new-feature` |

## Common Anti-patterns to Avoid

Don't do these things:

| Mistake | Problem | Solution |
|---------|----------|----------|
| Hardcode settings | Can't change between environments | Use external files |
| Put passwords in files | Security risk | Use secret managers |
| Skip validation | App crashes with bad data | Validate at startup |
| Use scattered `@Value` | Hard to maintain | Use `@ConfigurationProperties` |
| Write environment-specific code | Hard to test | Use conditional beans |

## Related Documentation

- [Environment Profiles](environment-profiles.md) - Different settings for dev, test, and production
- [Security Configuration](security-configuration.md) - JWT and authentication
- [Database Configuration](database-configuration.md) - Database connection setup
- [External Services](external-services.md) - Calling other services
- [Observability Configuration](observability-configuration.md) - Monitoring and metrics

## Summary

Good configuration makes your application flexible and secure.

Key takeaways:
- Store settings outside your code
- Validate settings at startup
- Use type-safe classes, not scattered annotations
- This helps teams manage applications easily across environments