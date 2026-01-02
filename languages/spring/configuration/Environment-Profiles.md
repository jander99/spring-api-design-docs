# Environment Profiles

## Overview

Spring profiles provide a way to segregate parts of your application configuration and make it only available in certain environments. This document outlines the standard profile configurations for development, test, and production environments in Spring Boot microservices.

## Profile Configuration Strategy

### Base Configuration

The base `application.yml` contains common configuration with environment variable overrides:

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

- **In-memory H2 database** for fast startup and testing
- **Enhanced logging** with DEBUG and TRACE levels
- **H2 console** enabled for database inspection
- **All actuator endpoints** exposed for debugging
- **Relaxed security** for development convenience

## Test Environment

### Test Profile Configuration

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

- **Persistent H2 database** for test duration
- **Test data initialization** with SQL scripts
- **Mock service URLs** for integration testing
- **Focused logging** for test-specific components
- **Minimal actuator endpoints** for test performance

## Production Environment

### Production Profile Configuration

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

- **Optimized connection pooling** for high load
- **Conservative logging levels** for performance
- **Restricted actuator endpoints** for security
- **Database validation only** (no schema changes)
- **Strict CORS configuration** for security

## Staging Environment

### Staging Profile Configuration

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

### Environment Variable Activation

```bash
# Set active profile via environment variable
export SPRING_PROFILES_ACTIVE=production

# Multiple profiles
export SPRING_PROFILES_ACTIVE=production,redis,monitoring
```

### Command Line Activation

```bash
# Single profile
java -jar order-service.jar --spring.profiles.active=production

# Multiple profiles
java -jar order-service.jar --spring.profiles.active=production,redis
```

### Application Properties Activation

```yaml
# application.yml
spring:
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:development}
```

## Profile Best Practices

### 1. Profile Naming Conventions

- **Environment profiles**: `development`, `test`, `staging`, `production`
- **Feature profiles**: `redis`, `monitoring`, `async`, `security`
- **Infrastructure profiles**: `kubernetes`, `docker`, `local`

### 2. Profile Combination Strategies

```yaml
# Multiple profiles for feature combinations
spring:
  profiles:
    active: production,redis,monitoring
```

### 3. Profile-Specific Property Files

- `application.yml` - Base configuration
- `application-{profile}.yml` - Profile-specific overrides
- `application-{profile}.properties` - Alternative format

### 4. Avoiding Profile Proliferation

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

- [Configuration Principles](Configuration-Principles.md) - Core configuration concepts
- [Security Configuration](Security-Configuration.md) - Profile-specific security setup
- [Database Configuration](Database-Configuration.md) - Profile-specific database configuration
- [Observability Configuration](Observability-Configuration.md) - Profile-specific monitoring setup

This profile configuration strategy ensures consistent behavior across environments while allowing for environment-specific optimizations and features.