# Spring Boot Configuration Guide

## Overview

This directory contains comprehensive documentation for configuring Spring Boot microservices. The configuration guidance is organized into focused areas covering all aspects of application setup, from basic principles to advanced observability patterns.

## Configuration Architecture

### Configuration Philosophy

Our configuration approach follows these core principles:

1. **Externalized Configuration**: All environment-specific values are externalized
2. **Type-Safe Properties**: Use `@ConfigurationProperties` for complex configuration
3. **Environment Profiles**: Separate configurations for different deployment environments
4. **Security-First**: Never store secrets in configuration files
5. **Validation**: Validate all configuration properties at startup
6. **Default Values**: Provide sensible defaults for all settings

### Configuration Layers

```
┌─────────────────────────────────────┐
│           Application Properties     │
│         (application.yml/properties) │
├─────────────────────────────────────┤
│        Profile-Specific Properties  │
│    (application-{profile}.yml/properties) │
├─────────────────────────────────────┤
│         Environment Variables       │
│            (OS/Container)           │
├─────────────────────────────────────┤
│         Command Line Arguments      │
│            (Runtime)               │
└─────────────────────────────────────┘
```

## Configuration Areas

### 1. [Configuration Principles](Configuration-Principles.md)

**Core configuration concepts and type-safe properties**

- Fundamental configuration principles
- `@ConfigurationProperties` patterns
- Configuration validation techniques
- Conditional configuration setup
- Configuration testing strategies

**Key Topics:**
- Externalized configuration patterns
- Type-safe property binding
- Validation annotations
- Feature flags and conditional beans
- Configuration testing best practices

### 2. [Environment Profiles](Environment-Profiles.md)

**Environment-specific configuration management**

- Profile configuration strategies
- Development, test, staging, and production setups
- Profile-specific bean configuration
- Profile activation methods
- Environment isolation patterns

**Key Topics:**
- Profile naming conventions
- Environment-specific property overrides
- Profile-based security configuration
- Testing with profiles
- Profile combination strategies

### 3. [Security Configuration](Security-Configuration.md)

**JWT, CORS, and security setup patterns**

- OAuth 2.1 resource server configuration
- JWT validation and custom converters
- CORS configuration for different environments
- Method-level security patterns
- Security testing configurations

**Key Topics:**
- Reactive and imperative security setup
- JWT decoder configuration
- CORS policy management
- Security expression evaluation
- Authentication and authorization patterns

### 4. [Database Configuration](Database-Configuration.md)

**JPA, R2DBC, and multiple datasource patterns**

- JPA and Hibernate configuration
- R2DBC reactive database setup
- Multiple datasource configuration
- Connection pool optimization
- Database migration strategies

**Key Topics:**
- Imperative vs reactive persistence
- Connection pool sizing and tuning
- Multi-datasource transaction management
- Database health monitoring
- Testing database configurations

### 5. [External Services](External-Services.md)

**WebClient and service integration patterns**

- WebClient configuration and customization
- Circuit breaker and retry patterns
- Service discovery integration
- Load balancing configuration
- External service monitoring

**Key Topics:**
- HTTP client configuration
- Resilience patterns (circuit breaker, retry, timeout)
- Service-to-service authentication
- Error handling and fallback strategies
- Integration testing with external services

### 6. [Observability Configuration](Observability-Configuration.md)

**Metrics, tracing, and monitoring setup**

- Micrometer metrics configuration
- Distributed tracing with OpenTelemetry
- Spring Boot Actuator setup
- Custom health indicators
- Structured logging configuration

**Key Topics:**
- Custom metrics and dashboards
- Trace sampling strategies
- Health check patterns
- Alerting and monitoring
- Log aggregation and analysis

## Configuration Patterns

### Standard Configuration Structure

```yaml
# application.yml - Base configuration template
spring:
  application:
    name: ${SERVICE_NAME:my-service}
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:development}

# Application-specific configuration
app:
  # Security configuration
  security:
    jwt:
      issuer-uri: ${JWT_ISSUER_URI}
    cors:
      allowed-origins: ${CORS_ALLOWED_ORIGINS}
  
  # Database configuration
  database:
    primary:
      url: ${DATABASE_URL}
      username: ${DATABASE_USERNAME}
      password: ${DATABASE_PASSWORD}
  
  # External service integration
  integration:
    payment-service:
      base-url: ${PAYMENT_SERVICE_URL}
      timeout: ${PAYMENT_SERVICE_TIMEOUT:PT30S}
  
  # Observability configuration
  observability:
    tracing:
      enabled: ${TRACING_ENABLED:true}
      sampling-rate: ${TRACING_SAMPLING_RATE:0.1}

# Management and monitoring
management:
  endpoints:
    web:
      exposure:
        include: ${ACTUATOR_ENDPOINTS:health,info,metrics}
```

### Configuration Properties Pattern

```java
@ConfigurationProperties(prefix = "app")
@Validated
public record ApplicationProperties(
    @Valid @NotNull Security security,
    @Valid @NotNull Database database,
    @Valid @NotNull Integration integration,
    @Valid @NotNull Observability observability
) {
    // Nested record definitions for each configuration area
}
```

## Environment-Specific Configurations

### Development Environment

- **Purpose**: Local development and debugging
- **Database**: H2 in-memory or local PostgreSQL
- **Security**: Relaxed CORS, detailed error messages
- **Logging**: DEBUG level, console output
- **Monitoring**: All actuator endpoints exposed

### Test Environment

- **Purpose**: Automated testing and CI/CD
- **Database**: H2 in-memory with test data
- **Security**: Mock authentication servers
- **Logging**: Focused on test-specific components
- **Monitoring**: Minimal actuator endpoints

### Staging Environment

- **Purpose**: Pre-production validation
- **Database**: Staging database with realistic data
- **Security**: Production-like but with relaxed monitoring
- **Logging**: INFO level with detailed monitoring
- **Monitoring**: Full observability with staging alerts

### Production Environment

- **Purpose**: Live production workloads
- **Database**: Production database with optimized pools
- **Security**: Strict CORS, minimal error exposure
- **Logging**: INFO/WARN levels, structured JSON
- **Monitoring**: Comprehensive metrics and alerting

## Configuration Best Practices

### 1. Security Best Practices

```yaml
# ✅ Good - Externalized secrets
app:
  database:
    password: ${DATABASE_PASSWORD}
  jwt:
    secret: ${JWT_SECRET}

# ❌ Bad - Hardcoded secrets
app:
  database:
    password: mypassword
  jwt:
    secret: hardcoded-secret
```

### 2. Environment Variable Patterns

```yaml
# ✅ Good - With defaults
server:
  port: ${SERVER_PORT:8080}
spring:
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:development}

# ❌ Bad - No defaults
server:
  port: ${SERVER_PORT}
spring:
  profiles:
    active: ${SPRING_PROFILES_ACTIVE}
```

### 3. Type-Safe Configuration

```java
// ✅ Good - Type-safe configuration
@ConfigurationProperties(prefix = "app.database")
@Validated
public record DatabaseProperties(
    @NotBlank String url,
    @Positive int maxPoolSize
) {}

// ❌ Bad - @Value everywhere
@Value("${app.database.url}")
private String databaseUrl;

@Value("${app.database.max-pool-size}")
private int maxPoolSize;
```

## Configuration Testing

### Property Testing Pattern

```java
@SpringBootTest
@TestPropertySource(properties = {
    "app.security.jwt.issuer-uri=http://test-issuer",
    "app.database.url=jdbc:h2:mem:testdb"
})
class ConfigurationTest {
    
    @Test
    void shouldBindConfigurationProperties(ApplicationProperties properties) {
        assertThat(properties.security().jwt().issuerUri())
            .isEqualTo("http://test-issuer");
    }
}
```

### Profile Testing Pattern

```java
@SpringBootTest
@ActiveProfiles("test")
class ProfileConfigurationTest {
    // Test with test profile configuration
}
```

## Common Configuration Anti-patterns

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Hardcoded values | No environment flexibility | Use externalized configuration |
| Secrets in properties | Security vulnerability | Use secret management systems |
| No validation | Runtime configuration errors | Validate at startup |
| Complex @Value expressions | Hard to maintain | Use @ConfigurationProperties |
| Profile-specific code logic | Tight coupling | Use conditional configuration |
| No default values | Deployment complexity | Provide sensible defaults |

## Configuration Migration Guide

### From Spring Boot 2.x to 3.x

1. **Property Updates**: Review deprecated properties
2. **Security Configuration**: Update to new security DSL
3. **Validation**: Migrate from javax to jakarta validation
4. **Actuator**: Review endpoint exposure changes

### Configuration Validation Checklist

- [ ] All secrets externalized to environment variables
- [ ] Default values provided for all properties
- [ ] Configuration properties validated with annotations
- [ ] Profile-specific configurations tested
- [ ] Security configurations reviewed for each environment
- [ ] Database connection pools properly sized
- [ ] External service timeouts and retries configured
- [ ] Observability properly configured for monitoring

## Related Spring Boot Documentation

- [Configuration Principles](Configuration-Principles.md) - Start here for core concepts
- [Spring Boot Configuration Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/application-properties.html)
- [Spring Security Configuration](../security/) - Detailed security patterns
- [Spring Boot Testing](../testing/Unit-Testing-Fundamentals.md) - Configuration testing patterns

## Integration Points

This configuration documentation integrates with other Spring Boot design areas:

- **[Controllers](../controllers/)**: Request/response configuration patterns
- **[Error Handling](../error-handling/)**: Error configuration and logging
- **[Security](../security/)**: Detailed security implementation patterns
- **[Testing](../testing/Unit-Testing-Fundamentals.md)**: Configuration testing strategies

The configuration patterns in this guide ensure that Spring Boot microservices are properly configured for all environments while maintaining security, performance, and maintainability standards.