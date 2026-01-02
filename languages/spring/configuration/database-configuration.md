# Database Configuration

## Overview

This document outlines database configuration patterns for Spring Boot microservices, covering JPA, R2DBC, multiple datasources, and connection pooling strategies for both imperative and reactive applications.

## Database Configuration Properties

### Database Properties Structure

```yaml
# application.yml
spring:
  # Primary datasource configuration
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/orderdb}
    username: ${DATABASE_USERNAME:orderuser}
    password: ${DATABASE_PASSWORD:password}
    driver-class-name: org.postgresql.Driver
    hikari:
      minimum-idle: 5
      maximum-pool-size: 20
      idle-timeout: 300000
      connection-timeout: 20000
      max-lifetime: 1800000
      
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
          batch_size: 25
        order_inserts: true
        order_updates: true

  # R2DBC configuration (for reactive applications)
  r2dbc:
    url: ${R2DBC_URL:r2dbc:postgresql://localhost:5432/orderdb}
    username: ${DATABASE_USERNAME:orderuser}
    password: ${DATABASE_PASSWORD:password}
    pool:
      initial-size: 5
      max-size: 20
      max-idle-time: 30m
      validation-query: SELECT 1
```

### Database Properties Class

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Duration;

@ConfigurationProperties(prefix = "app.database")
@Validated
public record DatabaseProperties(
    @Valid @NotNull Primary primary,
    @Valid Secondary secondary
) {
    
    public record Primary(
        @NotBlank String url,
        @NotBlank String username,
        @NotBlank String password,
        @Valid @NotNull ConnectionPool connectionPool
    ) {}
    
    public record Secondary(
        @NotBlank String url,
        @NotBlank String username,
        @NotBlank String password,
        boolean enabled
    ) {}
    
    public record ConnectionPool(
        @Positive int minimumIdle,
        @Positive int maximumPoolSize,
        @NotNull Duration idleTimeout,
        @NotNull Duration connectionTimeout,
        @NotNull Duration maxLifetime
    ) {}
}
```

## JPA Configuration (Imperative)

### Primary JPA Configuration

```java
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableJpaRepositories(
    basePackages = "com.example.orderservice.infrastructure.persistence.jpa",
    entityManagerFactoryRef = "primaryEntityManagerFactory",
    transactionManagerRef = "primaryTransactionManager"
)
@EntityScan("com.example.orderservice.domain.model")
@EnableTransactionManagement
public class JpaConfig {
    // Configuration handled by Spring Boot auto-configuration
}
```

### Custom JPA Configuration

```java
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

import jakarta.persistence.EntityManagerFactory;
import javax.sql.DataSource;

@Configuration
@EnableJpaRepositories(
    basePackages = "com.example.orderservice.infrastructure.persistence.jpa",
    entityManagerFactoryRef = "primaryEntityManagerFactory",
    transactionManagerRef = "primaryTransactionManager"
)
public class PrimaryJpaConfig {

    @Bean
    @Primary
    public LocalContainerEntityManagerFactoryBean primaryEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("primaryDataSource") DataSource dataSource) {
        return builder
            .dataSource(dataSource)
            .packages("com.example.orderservice.domain.model")
            .persistenceUnit("primary")
            .properties(jpaProperties())
            .build();
    }

    @Bean
    @Primary
    public PlatformTransactionManager primaryTransactionManager(
            @Qualifier("primaryEntityManagerFactory") EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }

    private Map<String, Object> jpaProperties() {
        Map<String, Object> properties = new HashMap<>();
        properties.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        properties.put("hibernate.hbm2ddl.auto", "validate");
        properties.put("hibernate.show_sql", false);
        properties.put("hibernate.format_sql", true);
        properties.put("hibernate.jdbc.time_zone", "UTC");
        properties.put("hibernate.jdbc.batch_size", 25);
        properties.put("hibernate.order_inserts", true);
        properties.put("hibernate.order_updates", true);
        return properties;
    }
}
```

## R2DBC Configuration (Reactive)

### Basic R2DBC Configuration

```java
import io.r2dbc.spi.ConnectionFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.r2dbc.config.AbstractR2dbcConfiguration;
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories;
import org.springframework.r2dbc.connection.R2dbcTransactionManager;
import org.springframework.transaction.ReactiveTransactionManager;

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
@EnableR2dbcRepositories(basePackages = "com.example.orderservice.infrastructure.persistence.r2dbc")
public class R2dbcConfig extends AbstractR2dbcConfiguration {

    private final ConnectionFactory connectionFactory;

    public R2dbcConfig(ConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    @Override
    public ConnectionFactory connectionFactory() {
        return connectionFactory;
    }

    @Bean
    public ReactiveTransactionManager transactionManager(ConnectionFactory connectionFactory) {
        return new R2dbcTransactionManager(connectionFactory);
    }
}
```

### Custom R2DBC Connection Factory

```java
import io.r2dbc.pool.ConnectionPool;
import io.r2dbc.pool.ConnectionPoolConfiguration;
import io.r2dbc.postgresql.PostgresqlConnectionConfiguration;
import io.r2dbc.postgresql.PostgresqlConnectionFactory;
import io.r2dbc.spi.ConnectionFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class R2dbcConnectionConfig {

    private final DatabaseProperties databaseProperties;

    public R2dbcConnectionConfig(DatabaseProperties databaseProperties) {
        this.databaseProperties = databaseProperties;
    }

    @Bean
    public ConnectionFactory connectionFactory() {
        PostgresqlConnectionConfiguration configuration = PostgresqlConnectionConfiguration.builder()
            .host("localhost")
            .port(5432)
            .database("orderdb")
            .username(databaseProperties.primary().username())
            .password(databaseProperties.primary().password())
            .build();

        ConnectionFactory connectionFactory = new PostgresqlConnectionFactory(configuration);

        ConnectionPoolConfiguration poolConfiguration = ConnectionPoolConfiguration.builder(connectionFactory)
            .initialSize(databaseProperties.primary().connectionPool().minimumIdle())
            .maxSize(databaseProperties.primary().connectionPool().maximumPoolSize())
            .maxIdleTime(databaseProperties.primary().connectionPool().idleTimeout())
            .maxAcquireTime(databaseProperties.primary().connectionPool().connectionTimeout())
            .maxLifeTime(databaseProperties.primary().connectionPool().maxLifetime())
            .validationQuery("SELECT 1")
            .build();

        return new ConnectionPool(poolConfiguration);
    }
}
```

## Multiple DataSource Configuration

### Multiple DataSource Setup

```java
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class MultipleDataSourceConfig {

    @Bean
    @Primary
    @ConfigurationProperties(prefix = "spring.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @ConditionalOnProperty(name = "spring.datasource.secondary.enabled", havingValue = "true")
    @ConfigurationProperties(prefix = "spring.datasource.secondary")
    public DataSource secondaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @ConditionalOnProperty(name = "spring.datasource.readonly.enabled", havingValue = "true")
    @ConfigurationProperties(prefix = "spring.datasource.readonly")
    public DataSource readOnlyDataSource() {
        return DataSourceBuilder.create().build();
    }
}
```

### Multiple DataSource Properties

```yaml
# application.yml
spring:
  datasource:
    primary:
      url: ${PRIMARY_DATABASE_URL:jdbc:postgresql://localhost:5432/orderdb}
      username: ${PRIMARY_DATABASE_USERNAME:orderuser}
      password: ${PRIMARY_DATABASE_PASSWORD:password}
      driver-class-name: org.postgresql.Driver
      hikari:
        minimum-idle: 5
        maximum-pool-size: 20
        
    secondary:
      enabled: ${SECONDARY_DATABASE_ENABLED:false}
      url: ${SECONDARY_DATABASE_URL:jdbc:postgresql://localhost:5432/auditdb}
      username: ${SECONDARY_DATABASE_USERNAME:audituser}
      password: ${SECONDARY_DATABASE_PASSWORD:password}
      driver-class-name: org.postgresql.Driver
      hikari:
        minimum-idle: 2
        maximum-pool-size: 10
        
    readonly:
      enabled: ${READONLY_DATABASE_ENABLED:false}
      url: ${READONLY_DATABASE_URL:jdbc:postgresql://readonly:5432/orderdb}
      username: ${READONLY_DATABASE_USERNAME:readonly}
      password: ${READONLY_DATABASE_PASSWORD:password}
      driver-class-name: org.postgresql.Driver
      hikari:
        minimum-idle: 2
        maximum-pool-size: 15
        read-only: true
```

### JPA Configuration for Multiple DataSources

```java
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

import jakarta.persistence.EntityManagerFactory;
import javax.sql.DataSource;

@Configuration
@EnableJpaRepositories(
    basePackages = "com.example.orderservice.infrastructure.persistence.audit",
    entityManagerFactoryRef = "secondaryEntityManagerFactory",
    transactionManagerRef = "secondaryTransactionManager"
)
public class SecondaryJpaConfig {

    @Bean
    public LocalContainerEntityManagerFactoryBean secondaryEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("secondaryDataSource") DataSource dataSource) {
        return builder
            .dataSource(dataSource)
            .packages("com.example.orderservice.domain.audit")
            .persistenceUnit("secondary")
            .build();
    }

    @Bean
    public PlatformTransactionManager secondaryTransactionManager(
            @Qualifier("secondaryEntityManagerFactory") EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }
}
```

## Connection Pool Configuration

### HikariCP Configuration (JPA)

```yaml
# application.yml
spring:
  datasource:
    hikari:
      # Connection pool sizing
      minimum-idle: ${DB_MIN_IDLE:5}
      maximum-pool-size: ${DB_MAX_POOL_SIZE:20}
      
      # Connection timeouts
      connection-timeout: ${DB_CONNECTION_TIMEOUT:20000}
      idle-timeout: ${DB_IDLE_TIMEOUT:300000}
      max-lifetime: ${DB_MAX_LIFETIME:1800000}
      
      # Validation
      validation-timeout: ${DB_VALIDATION_TIMEOUT:5000}
      
      # Pool behavior
      auto-commit: true
      leak-detection-threshold: ${DB_LEAK_DETECTION:60000}
      
      # Connection properties
      data-source-properties:
        cachePrepStmts: true
        prepStmtCacheSize: 250
        prepStmtCacheSqlLimit: 2048
        useServerPrepStmts: true
        rewriteBatchedStatements: true
```

### R2DBC Connection Pool Configuration

```yaml
# application.yml
spring:
  r2dbc:
    pool:
      # Pool sizing
      initial-size: ${R2DBC_INITIAL_SIZE:5}
      max-size: ${R2DBC_MAX_SIZE:20}
      
      # Connection timeouts
      max-acquire-time: ${R2DBC_MAX_ACQUIRE_TIME:PT30S}
      max-idle-time: ${R2DBC_MAX_IDLE_TIME:PT30M}
      max-life-time: ${R2DBC_MAX_LIFE_TIME:PT60M}
      
      # Validation
      validation-query: ${R2DBC_VALIDATION_QUERY:SELECT 1}
      validation-depth: ${R2DBC_VALIDATION_DEPTH:LOCAL}
```

## Database Migration Configuration

### Flyway Configuration

```yaml
# application.yml
spring:
  flyway:
    enabled: ${FLYWAY_ENABLED:true}
    locations: ${FLYWAY_LOCATIONS:classpath:db/migration}
    baseline-on-migrate: ${FLYWAY_BASELINE_ON_MIGRATE:false}
    validate-on-migrate: ${FLYWAY_VALIDATE_ON_MIGRATE:true}
    out-of-order: ${FLYWAY_OUT_OF_ORDER:false}
    placeholders:
      schema: ${DATABASE_SCHEMA:orderservice}
```

### Liquibase Configuration

```yaml
# application.yml
spring:
  liquibase:
    enabled: ${LIQUIBASE_ENABLED:false}
    change-log: ${LIQUIBASE_CHANGELOG:classpath:db/changelog/db.changelog-master.xml}
    contexts: ${LIQUIBASE_CONTEXTS:development}
    default-schema: ${DATABASE_SCHEMA:orderservice}
```

## Caching Configuration

### JPA Second-Level Cache

```yaml
# application.yml
spring:
  jpa:
    properties:
      hibernate:
        cache:
          use_second_level_cache: true
          use_query_cache: true
          region:
            factory_class: org.hibernate.cache.jcache.JCacheRegionFactory
        javax:
          cache:
            provider: org.ehcache.jsr107.EhcacheCachingProvider
            uri: classpath:ehcache.xml
```

### Redis Cache Configuration

```java
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.Map;

@Configuration
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
public class RedisCacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        Map<String, RedisCacheConfiguration> cacheConfigurations = Map.of(
            "orders", defaultConfig.entryTtl(Duration.ofMinutes(60)),
            "customers", defaultConfig.entryTtl(Duration.ofMinutes(120)),
            "products", defaultConfig.entryTtl(Duration.ofHours(6))
        );

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigurations)
            .build();
    }
}
```

## Database Configuration Testing

### Test Database Configuration

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
  
  flyway:
    enabled: false
    
  h2:
    console:
      enabled: true
```

### Integration Test Configuration

```java
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@DataJpaTest
@ActiveProfiles("test")
@Testcontainers
class OrderRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void shouldSaveAndRetrieveOrder() {
        // Test implementation
    }
}
```

## Database Configuration by Environment

### Development Configuration

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
```

### Production Configuration

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
      leak-detection-threshold: 60000
      
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    
  flyway:
    enabled: true
    validate-on-migrate: true
```

## Database Best Practices

### 1. Connection Pool Sizing

- **Development**: Small pools (5-10 connections)
- **Production**: Sized based on load (20-50 connections)
- **Monitor**: Pool utilization and wait times

### 2. Transaction Management

- Use `@Transactional` appropriately
- Keep transactions short-lived
- Use read-only transactions for queries

### 3. Performance Optimization

- Enable connection pooling
- Use prepared statement caching
- Configure batch processing
- Implement proper indexing

### 4. Security

- Use environment variables for credentials
- Implement connection encryption
- Use read-only users for read operations
- Never store passwords in configuration files

## Common Database Anti-patterns

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Large connection pools | Resource waste | Size based on actual load |
| No connection validation | Connection failures | Enable validation queries |
| Single datasource for all | No separation of concerns | Use multiple datasources |
| No migration strategy | Schema inconsistency | Use Flyway or Liquibase |
| Hardcoded credentials | Security vulnerability | Use environment variables |

## Related Documentation

- [Configuration Principles](configuration-principles.md) - Core configuration concepts
- [Environment Profiles](environment-profiles.md) - Profile-specific database configuration
- [External Services](external-services.md) - Database integration patterns
- [Observability Configuration](observability-configuration.md) - Database monitoring

This database configuration ensures robust, scalable, and maintainable data persistence for Spring Boot microservices across different environments.