# Spring Boot Configuration Guide

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🟢 Level:** Beginner-Friendly
> 
> **📋 Prerequisites:** Basic Spring Boot knowledge  
> **🎯 Key Topics:** Configuration, Profiles, Security, Settings
> 
> **📊 Complexity:** 10.2 grade level • 1.7% technical density • fairly difficult

## What is Configuration?

Configuration tells your app how to run. It sets up databases, security, and services. Each environment needs different settings. Spring Boot helps you manage settings safely.

This guide shows you how to configure apps. You'll learn to set up dev, test, and production.

## Why Configure Your App?

Configuration keeps your app flexible and secure. You can:

- Run the same code in different environments
- Change settings without changing code
- Keep secrets safe outside your files
- Test settings before going live
- Control app behavior easily

### Core Principles

1. **Keep Settings Outside Code**: Store values as variables
2. **Use Type-Safe Properties**: Spring checks settings at startup
3. **Use Profiles**: Create separate settings for dev, test, and prod
4. **Keep Secrets Safe**: Never put passwords in files
5. **Validate Everything**: Check all settings at startup
6. **Provide Defaults**: Give good fallback values

### How Spring Loads Settings

Spring Boot loads settings in order. Later ones win:

1. **Base files**: `application.yml` or `application.properties`
2. **Profile files**: `application-dev.yml` or `application-prod.yml`
3. **Environment variables**: Set by your OS or container
4. **Command line**: Arguments when you start the app

Later settings win. You keep defaults in files. You override them when needed.

## What You'll Find Here

### 1. [Configuration Principles](configuration-principles.md)

**Learn the basics of settings**

This guide covers:
- How to store settings safely
- Using `@ConfigurationProperties` for type safety
- Checking settings at startup
- Turning features on and off
- Testing your config

Start here if you're new to Spring Boot.

### 2. [Environment Profiles](environment-profiles.md)

**Set up different environments**

Profiles let you use different settings for dev, test, and production.

This guide covers:
- Creating profile files
- Activating profiles
- Using different beans per environment
- Testing with profiles
- Combining multiple profiles

### 3. [Security Configuration](security-configuration.md)

**Protect your app with Spring Security**

Learn to set up authentication and access control.

This guide covers:
- OAuth 2.1 setup
- JWT token validation
- CORS settings for browsers
- Method-level security
- Testing security configs

### 4. [Database Configuration](database-configuration.md)

**Connect to databases safely**

Set up database connections and connection pools.

This guide covers:
- JPA and Hibernate setup
- R2DBC for reactive apps
- Using multiple databases
- Connection pool tuning
- Database health checks

### 5. [External Services](external-services.md)

**Call other services safely**

Configure HTTP clients to talk to other services.

This guide covers:
- WebClient setup
- Retry and circuit breaker patterns
- Service discovery
- Load balancing
- Monitoring external calls

### 6. [Observability Configuration](observability-configuration.md)

**Monitor your app in production**

Set up metrics, tracing, and health checks.

This guide covers:
- Micrometer metrics
- Distributed tracing
- Spring Boot Actuator
- Custom health checks
- Structured logging

## Common Configuration Patterns

### Basic Configuration File

Here's a typical `application.yml` file:

```yaml
# application.yml - Basic setup
spring:
  application:
    name: ${SERVICE_NAME:my-service}
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:development}

# Your app settings
app:
  security:
    jwt:
      issuer-uri: ${JWT_ISSUER_URI}
    cors:
      allowed-origins: ${CORS_ALLOWED_ORIGINS}
  
  database:
    primary:
      url: ${DATABASE_URL}
      username: ${DATABASE_USERNAME}
      password: ${DATABASE_PASSWORD}
  
  integration:
    payment-service:
      base-url: ${PAYMENT_SERVICE_URL}
      timeout: ${PAYMENT_SERVICE_TIMEOUT:PT30S}
  
  observability:
    tracing:
      enabled: ${TRACING_ENABLED:true}
      sampling-rate: ${TRACING_SAMPLING_RATE:0.1}

# Health checks and metrics
management:
  endpoints:
    web:
      exposure:
        include: ${ACTUATOR_ENDPOINTS:health,info,metrics}
```

See the `${VARIABLE:default}` pattern? Spring loads from environment variables. If missing, it uses the default.

### Type-Safe Configuration Class

Create a Java class to hold your settings:

```java
@ConfigurationProperties(prefix = "app")
@Validated
public record ApplicationProperties(
    @Valid @NotNull Security security,
    @Valid @NotNull Database database,
    @Valid @NotNull Integration integration,
    @Valid @NotNull Observability observability
) {
    // Spring fills these from application.yml
}
```

Spring checks these at startup. This catches errors early.

## Settings for Different Environments

### Development (Local Work)

- Use H2 database or local PostgreSQL
- Allow all CORS requests
- Show detailed errors
- Log everything to console
- Expose all health endpoints

### Test (Automated Tests)

- Use H2 in-memory database
- Use mock auth servers
- Focus logs on what you're testing
- Expose minimal health endpoints

### Staging (Pre-Production)

- Use staging database with real-like data
- Use production-like security
- Log at INFO level
- Set up full monitoring
- Test your alerts

### Production (Live Site)

- Use production database
- Restrict CORS strictly
- Hide error details
- Log in structured JSON format
- Monitor everything with alerts

## Best Practices

### Keep Secrets Safe

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

### Always Provide Defaults

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

### Use Type-Safe Properties

```java
// ✅ Good - Spring validates these
@ConfigurationProperties(prefix = "app.database")
@Validated
public record DatabaseProperties(
    @NotBlank String url,
    @Positive int maxPoolSize
) {}

// ❌ Avoid - Hard to maintain
@Value("${app.database.url}")
private String databaseUrl;

@Value("${app.database.max-pool-size}")
private int maxPoolSize;
```

Use `@ConfigurationProperties` instead of many `@Value` annotations. Spring checks settings at startup.

## Testing Your Configuration

### Test Property Binding

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

This checks that Spring loads settings right.

### Test with Profiles

```java
@SpringBootTest
@ActiveProfiles("test")
class ProfileConfigurationTest {
    // Uses test profile settings
}
```

This loads your test profile configuration.

## Common Mistakes to Avoid

| Mistake | Why It's Bad | What to Do Instead |
|---------|--------------|---------------------|
| Hardcoded values | Can't change per environment | Use environment variables |
| Secrets in files | Security risk | Use secret management |
| No validation | Errors at runtime | Validate at startup |
| Many @Value annotations | Hard to maintain | Use @ConfigurationProperties |
| If statements for profiles | Tight coupling | Use conditional beans |
| No default values | Harder to deploy | Always provide defaults |

## Upgrading to Spring Boot 3.x

If you upgrade from Spring Boot 2.x:

1. Check for old properties
2. Update security config to new DSL
3. Change `javax.validation` to `jakarta.validation`
4. Review actuator endpoint changes

### Configuration Checklist

Before you deploy, check:

- [ ] All secrets use environment variables
- [ ] All properties have defaults
- [ ] Settings checked with annotations
- [ ] All profiles tested
- [ ] Security reviewed per environment
- [ ] Database pools sized right
- [ ] Timeouts and retries set
- [ ] Monitoring set up

## Where to Go Next

Start with these guides:

- [Configuration Principles](configuration-principles.md) - Core concepts
- [Environment Profiles](environment-profiles.md) - Set up dev, test, prod
- [Security Configuration](security-configuration.md) - Protect your app
- [Database Configuration](database-configuration.md) - Connect to databases

## Related Topics

Configuration connects to other Spring Boot areas:

- **[Controllers](../controllers/)**: Handle web requests
- **[Error Handling](../error-handling/)**: Configure error responses
- **[Security](../security/)**: Detailed security patterns
- **[Testing](../testing/unit-testing/unit-testing-fundamentals.md)**: Test strategies

These patterns help you build secure, flexible Spring Boot apps.