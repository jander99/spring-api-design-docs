# Database Configuration

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 16 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 11.0 grade level • 1.9% technical density • fairly difficult

## Overview

This guide shows you how to set up databases in Spring Boot.

You will learn these topics:
- **JPA** - Traditional blocking database access
- **R2DBC** - Non-blocking reactive database access
- **Multiple datasources** - Using several databases at once
- **Connection pooling** - Managing database connections well

We cover both blocking and non-blocking applications.

## Database Properties

### Basic Property Structure

Define database settings in your `application.yml` file.

The example below shows a typical setup. It includes connection details, pool settings, and JPA options.

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

### Type-Safe Property Class

Create a Java class to hold your database settings. 

This gives you type safety. It validates settings at startup.

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

## JPA Setup for Blocking Apps

JPA works with traditional blocking database calls.

### Basic JPA Setup

This enables JPA repositories. Spring Boot handles most setup for you.

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

### Custom JPA Setup

Sometimes you need more control. This example shows custom JPA setup.

Set specific Hibernate properties. Configure the entity manager factory yourself.

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

## R2DBC Setup for Reactive Apps

R2DBC provides non-blocking database access. Use it with WebFlux.

### Basic R2DBC Setup

This configuration sets up R2DBC. It enables reactive repositories.

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

Configure R2DBC connections manually. This gives you control over pool settings.

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

## Multiple DataSource Setup

Some apps need multiple databases. Spring supports this with custom setups.

### Defining Multiple DataSources

This code creates three data sources:
- **Primary** - Main database
- **Secondary** - Optional second database
- **Read-only** - Optional replica for reads

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

Define each datasource in your YAML file.

Each has its own connection details. Each can have different pool settings.

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

### JPA Setup for Multiple DataSources

Each datasource needs its own JPA configuration.

This example shows a secondary database setup. It uses different entity packages.

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

## Connection Pool Setup

Connection pools reuse database connections. This boosts performance.

### HikariCP Setup for JPA

HikariCP is the default connection pool in Spring Boot. It performs well.

These settings control pool behavior:
- **minimum-idle** - Minimum connections kept open
- **maximum-pool-size** - Maximum connections allowed
- **connection-timeout** - Wait time for a connection
- **idle-timeout** - Time idle connections stay open
- **max-lifetime** - Maximum connection lifetime

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

### R2DBC Pool Setup

R2DBC uses connection pooling too. Settings are similar to HikariCP.

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

## Database Migration Setup

Database migrations track schema changes over time.

### Flyway Setup

Flyway manages database migrations with SQL files.

Put migration files in `src/main/resources/db/migration`. Use version numbers like `V1__create_tables.sql`.

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

### Liquibase Setup

Liquibase is an alternative to Flyway. It uses XML, YAML, or JSON for migrations.

```yaml
# application.yml
spring:
  liquibase:
    enabled: ${LIQUIBASE_ENABLED:false}
    change-log: ${LIQUIBASE_CHANGELOG:classpath:db/changelog/db.changelog-master.xml}
    contexts: ${LIQUIBASE_CONTEXTS:development}
    default-schema: ${DATABASE_SCHEMA:orderservice}
```

## Caching Setup

Caching reduces database load by storing frequently accessed data.

### JPA Second-Level Cache

Hibernate has a second-level cache. This caches entities across sessions.

This example uses EHCache as the cache provider.

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

### Redis Cache Setup

Redis provides distributed caching. Use it with multiple app instances.

This code configures Redis caching. It sets different TTLs for each cache region.

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

## Testing Database Setup

Use different database configurations for testing.

### Test Database Setup

Use in-memory databases for tests. H2 is a good choice.

This setup uses H2 for tests. It creates a fresh schema for each test run.

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

### Integration Test Setup

Use Testcontainers for integration tests. It runs real databases in Docker.

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

## Environment-Specific Setup

Different environments need different database settings.

### Development Setup

Development uses simple databases. H2 works well for local dev.

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

### Production Setup

Production needs larger pools and stricter checks.

These settings optimize for production:

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

## Best Practices

Follow these tips for database setup:

### 1. Connection Pool Sizing

Size your pools based on actual load.

- **Development**: Use small pools (5-10 connections)
- **Production**: Size based on load (20-50 connections)
- **Monitor**: Track pool utilization and wait times

### 2. Transaction Management

Use transactions appropriately.

- Use `@Transactional` for operations that modify data
- Keep transactions short to avoid locks
- Use read-only transactions for queries

### 3. Performance Tips

Optimize database access.

- Enable connection pooling
- Use prepared statement caching
- Configure batch processing
- Implement proper indexing

### 4. Security Rules

Protect database credentials.

- Use environment variables for credentials
- Enable connection encryption
- Use read-only users for read operations
- Never store passwords in configuration files

## Common Mistakes

Avoid these database setup problems:

| Mistake | Problem | Solution |
|---------|---------|----------|
| Large connection pools | Wastes resources | Size based on actual load |
| No connection validation | Silent connection failures | Enable validation queries |
| Single datasource for all | No separation of concerns | Use multiple datasources |
| No migration strategy | Schema inconsistency | Use Flyway or Liquibase |
| Hardcoded credentials | Security vulnerability | Use environment variables |

## Related Documentation

- [Configuration Principles](configuration-principles.md) - Core configuration concepts
- [Environment Profiles](environment-profiles.md) - Profile-specific database configuration
- [External Services](external-services.md) - Database integration patterns
- [Observability Configuration](observability-configuration.md) - Database monitoring

These patterns ensure robust data persistence for Spring Boot microservices.
