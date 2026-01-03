# Environment Profiles

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 10 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Security
> 
> **📊 Complexity:** 10.4 grade level • 1.0% technical density • fairly difficult

## Overview

Spring profiles separate configuration by environment. Each environment gets its own settings.

You might have three environments:
- Development: Your local machine
- Test: Automated testing
- Production: Live system

Each environment needs different settings. Profiles make this easy.

This guide shows you how to set up profiles. You will learn to create settings for each environment.

## Profile Configuration Strategy

### Base Configuration

Start with a base file called `application.yml`. This file holds settings used in all environments.

You can override any setting with environment variables. This gives you flexibility in different deployment scenarios.

The example below shows a typical base configuration:

```yaml
# application.yml
spring:
  application:
    name: order-service
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:development}
  
  # Database configuration
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/orderdb}
    username: ${DATABASE_USERNAME:orderuser}
    password: ${DATABASE_PASSWORD:password}
    hikari:
      minimum-idle: 5
      maximum-pool-size: 20
      idle-timeout: 300000
      connection-timeout: 20000
      
  # JPA configuration
  jpa:
    hibernate:
      ddl-auto: ${JPA_DDL_AUTO:validate}
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
        jdbc:
          time_zone: UTC

# Actuator configuration
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when_authorized
  metrics:
    export:
      prometheus:
        enabled: true
```

## Development Environment

### Development Profile Configuration

The development profile helps you build and test on your local machine.

It uses an in-memory database. This makes startup fast. It also resets data between runs.

Logging is very detailed. You can see DEBUG and TRACE messages. This helps you find problems quickly.

```yaml
# application-development.yml
spring:
  datasource:
    url: jdbc:h2:mem:devdb
    username: sa
    password: 
    driver-class-name: org.h2.Driver
  
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
  
  h2:
    console:
      enabled: true

# Enhanced logging for development
logging:
  level:
    com.example.orderservice: DEBUG
    org.springframework.web: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE

# Development-specific application configuration
app:
  security:
    jwt:
      issuer-uri: http://localhost:8080/auth/realms/dev
  integration:
    payment-service:
      base-url: http://localhost:8081
    customer-service:
      base-url: http://localhost:8082

# Development actuator exposure
management:
  endpoints:
    web:
      exposure:
        include: "*"
  endpoint:
    health:
      show-details: always
```

### Development Features

This profile includes these helpful features:

- **In-memory H2 database**: The database starts fast. It resets data between runs. This gives you a clean state each time.
- **Enhanced logging**: You see DEBUG and TRACE messages. These show you exactly what the code is doing.
- **H2 console**: You can view database contents. This helps you verify data while coding.
- **All actuator endpoints**: All monitoring tools are available. Use them to inspect your running application.
- **Relaxed security**: Security is minimal. This makes local testing easier.

## Test Environment

### Test Profile Configuration

The test profile runs your automated tests.

It keeps data during each test run. This helps tests that depend on earlier data.

Mock services replace real external systems. This makes tests faster and more reliable.

```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    username: sa
    password: 
    driver-class-name: org.h2.Driver
  
  jpa:
    hibernate:
      ddl-auto: create-drop
    defer-datasource-initialization: true
  
  sql:
    init:
      mode: always
      data-locations: classpath:test-data.sql

# Test-specific logging
logging:
  level:
    com.example.orderservice: DEBUG
    org.springframework.test: DEBUG
    
# Test application configuration
app:
  security:
    jwt:
      issuer-uri: http://mock-auth-server
  integration:
    payment-service:
      base-url: http://mock-payment-service
    customer-service:
      base-url: http://mock-customer-service

# Minimal actuator exposure for tests
management:
  endpoints:
    web:
      exposure:
        include: health,info
```

### Test Features

This profile includes these testing features:

- **Persistent H2 database**: Data stays alive during test runs. Tests can depend on earlier data.
- **Test data initialization**: SQL scripts load automatically. This sets up test data for you.
- **Mock service URLs**: These point to fake services. Your tests run without real external systems.
- **Focused logging**: You see only test messages. This reduces noise in test output.
- **Minimal actuator endpoints**: Only health and info are exposed. This keeps tests fast.

## Production Environment

### Production Profile Configuration

The production profile runs your live system.

It focuses on security and performance. Logging is minimal to save resources.

Connection pools are larger. This handles more users at once.

Only essential monitoring endpoints are exposed. This reduces security risks.

```yaml
# application-production.yml
spring:
  datasource:
    hikari:
      minimum-idle: 10
      maximum-pool-size: 50
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
      
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false

# Production logging
logging:
  level:
    com.example.orderservice: INFO
    org.springframework: WARN
    org.hibernate: WARN

# Production actuator configuration
management:
  endpoint:
    health:
      show-details: never
      show-components: never
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus

# Production security configuration
app:
  security:
    cors:
      allowed-origins: https://api.example.com,https://www.example.com
```

### Production Features

This profile includes these production features:

- **Optimized connection pooling**: The pool size is larger. This handles more users at once.
- **Conservative logging levels**: Less logging improves speed. Only important messages are logged.
- **Restricted actuator endpoints**: Only essential endpoints are exposed. This improves security.
- **Database validation only**: The schema never changes. This prevents accidental data loss.
- **Strict CORS configuration**: Only specific domains are allowed. This blocks unauthorized access.

## Staging Environment

### Staging Profile Configuration

The staging profile sits between development and production.

It uses production-like settings. But logging is more detailed. This helps you find issues before they reach production.

Connection pools are smaller than production. This saves resources while still testing real scenarios.

```yaml
# application-staging.yml
spring:
  datasource:
    hikari:
      minimum-idle: 5
      maximum-pool-size: 30
      connection-timeout: 25000
      idle-timeout: 500000
      
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false

# Staging logging (more verbose than production)
logging:
  level:
    com.example.orderservice: DEBUG
    org.springframework.security: INFO

# Staging actuator configuration
management:
  endpoint:
    health:
      show-details: when_authorized
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus

# Staging-specific configuration
app:
  security:
    cors:
      allowed-origins: https://staging-api.example.com
```

## Profile-Specific Bean Configuration

### Conditional Beans Based on Profiles

Beans are objects that Spring manages. You can create beans that load only in certain profiles.

Use the `@Profile` annotation to mark beans. Spring loads them only when that profile is active.

This example shows different data sources. Each environment gets its own database connection.

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class ProfileSpecificConfig {

    @Bean
    @Profile("development")
    public DataSource developmentDataSource() {
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .addScript("classpath:dev-schema.sql")
            .addScript("classpath:dev-data.sql")
            .build();
    }

    @Bean
    @Profile("test")
    public DataSource testDataSource() {
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .addScript("classpath:test-schema.sql")
            .build();
    }

    @Bean
    @Profile("production")
    public DataSource productionDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DATABASE_URL"));
        config.setUsername(System.getenv("DATABASE_USERNAME"));
        config.setPassword(System.getenv("DATABASE_PASSWORD"));
        config.setMaximumPoolSize(50);
        return new HikariDataSource(config);
    }
}
```

## Cache Configuration by Profile

### Profile-Specific Cache Configuration

Caching stores data in memory for fast access.

Development and test use simple caching. Data stays in your application memory.

Production uses Redis. This is a separate caching server. Multiple application instances can share the same cache.

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class CacheProfileConfig {

    @Bean
    @Profile({"development", "test"})
    public CacheManager simpleCacheManager() {
        return new ConcurrentMapCacheManager("orders", "customers");
    }

    @Bean
    @Profile("production")
    public CacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration configuration = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(configuration)
            .build();
    }
}
```

## Security Configuration by Profile

### Development Security (Relaxed)

Security settings vary by environment.

In development, security is disabled. This makes testing easier. All requests pass through without checks.

Never use this configuration in production. It would expose your system to attacks.

```java
@Configuration
@EnableWebSecurity
@Profile("development")
public class DevelopmentSecurityConfig {

    @Bean
    public SecurityFilterChain developmentSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/**").permitAll()
            )
            .build();
    }
}
```

### Production Security (Strict)

Production requires authentication. Users must prove their identity before accessing data.

Only the health endpoint is public. This lets monitoring systems check if the service is running.

All other endpoints require a valid token. This protects your data from unauthorized access.

```java
@Configuration
@EnableWebSecurity
@Profile("production")
public class ProductionSecurityConfig {

    @Bean
    public SecurityFilterChain productionSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .build();
    }
}
```

## Testing with Profiles

### Profile-Specific Test Configuration

You can activate profiles in your test classes.

Use the `@ActiveProfiles` annotation. Put it above your test class. Spring loads that profile when running the test.

You can activate multiple profiles at once. Just list them in the annotation.

```java
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class OrderServiceIntegrationTest {
    // Test implementation uses test profile configuration
}

@SpringBootTest
@ActiveProfiles({"test", "redis"})
class OrderServiceCacheTest {
    // Test with test profile plus redis profile
}
```

## Profile Activation Strategies

You have three ways to activate profiles. Choose the one that fits your deployment process.

### Environment Variable Activation

Set an environment variable called `SPRING_PROFILES_ACTIVE`.

This works well in containers and cloud platforms. Each environment sets its own variable.

```bash
# Set active profile via environment variable
export SPRING_PROFILES_ACTIVE=production

# Multiple profiles
export SPRING_PROFILES_ACTIVE=production,redis,monitoring
```

### Command Line Activation

Pass profiles as arguments when you start your application.

Use the `--spring.profiles.active` flag. This is useful for manual testing or scripts.

```bash
# Single profile
java -jar order-service.jar --spring.profiles.active=production

# Multiple profiles
java -jar order-service.jar --spring.profiles.active=production,redis
```

### Application Properties Activation

Set a default profile in your `application.yml` file.

Use a fallback value. If no environment variable exists, Spring uses the default. This prevents errors when the variable is missing.

```yaml
# application.yml
spring:
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:development}
```

## Profile Best Practices

### 1. Profile Naming Conventions

Use descriptive names that match their purpose:

- **Environment profiles**: `development`, `test`, `staging`, `production`
- **Feature profiles**: `redis`, `monitoring`, `async`, `security`
- **Infrastructure profiles**: `kubernetes`, `docker`, `local`

### 2. Profile Combination Strategies

You can activate multiple profiles at once:

```yaml
# Multiple profiles for feature combinations
spring:
  profiles:
    active: production,redis,monitoring
```

### 3. Profile-Specific Property Files

Organize configuration files by profile:

- `application.yml` - Common settings for all environments
- `application-{profile}.yml` - Settings that override the base
- `application-{profile}.properties` - Same but in properties format

### 4. Avoiding Profile Proliferation

Too many profiles create complexity. Use conditional properties for simple features:

```java
// Use conditional properties instead of profiles for simple toggles
@ConditionalOnProperty(name = "app.feature.enabled", havingValue = "true")
public class FeatureConfiguration {
    // Feature-specific beans
}
```

## Common Profile Anti-patterns

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Too many profiles | Management complexity | Use conditional properties |
| Environment-specific code | Hard coupling | Use externalized configuration |
| Profile-specific security | Security inconsistency | Use environment variables |
| Hardcoded profile checks | Brittle code | Use `@ConditionalOnProfile` |

## Related Documentation

- [Configuration Principles](configuration-principles.md) - Core configuration concepts
- [Security Configuration](security-configuration.md) - Security setup for each profile
- [Database Configuration](database-configuration.md) - Database settings by profile
- [Observability Configuration](observability-configuration.md) - Monitoring setup by profile

This approach keeps behavior consistent across environments. Each profile optimizes settings for its specific use case.