# Spring Boot Configuration Best Practices

## Overview

Spring Boot configuration is fundamental to building flexible, maintainable applications. This document outlines our standards for configuring Spring Boot applications in both imperative and reactive microservices, focusing on externalized configuration, environment-specific settings, and production readiness.

## Configuration Principles

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

# Logging configuration
logging:
  level:
    com.example.orderservice: ${LOG_LEVEL:INFO}
    org.springframework.security: ${SECURITY_LOG_LEVEL:WARN}
    org.hibernate.SQL: ${SQL_LOG_LEVEL:WARN}
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} [%X{correlationId:-}] - %msg%n"
```

### Environment-Specific Configuration

#### Development Environment

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

logging:
  level:
    com.example.orderservice: DEBUG
    org.springframework.web: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE

app:
  security:
    jwt:
      issuer-uri: http://localhost:8080/auth/realms/dev
  integration:
    payment-service:
      base-url: http://localhost:8081
    customer-service:
      base-url: http://localhost:8082
```

#### Test Environment

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

logging:
  level:
    com.example.orderservice: DEBUG
    org.springframework.test: DEBUG
    
app:
  security:
    jwt:
      issuer-uri: http://mock-auth-server
```

#### Production Environment

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

logging:
  level:
    com.example.orderservice: INFO
    org.springframework: WARN
    org.hibernate: WARN

management:
  endpoint:
    health:
      show-details: never
      show-components: never
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus

app:
  security:
    cors:
      allowed-origins: https://api.example.com,https://www.example.com
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

## Security Configuration

### JWT Resource Server Configuration

```java
import org.springframework.boot.autoconfigure.security.oauth2.resource.OAuth2ResourceServerProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class SecurityConfig {

    private final ApplicationProperties.Security securityProperties;

    public SecurityConfig(ApplicationProperties applicationProperties) {
        this.securityProperties = applicationProperties.security();
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/actuator/health", "/actuator/info").permitAll()
                .pathMatchers("/v1/orders/**").hasAuthority("SCOPE_orders")
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtDecoder(jwtDecoder()))
            )
            .build();
    }

    @Bean
    public ReactiveJwtDecoder jwtDecoder() {
        return NimbusReactiveJwtDecoder
            .withIssuerLocation(securityProperties.jwt().issuerUri())
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(securityProperties.cors().allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

### Imperative Security Configuration

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class WebSecurityConfig {

    private final ApplicationProperties.Security securityProperties;

    public WebSecurityConfig(ApplicationProperties applicationProperties) {
        this.securityProperties = applicationProperties.security();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/v1/orders/**").hasAuthority("SCOPE_orders")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
            )
            .build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder
            .withIssuerLocation(securityProperties.jwt().issuerUri())
            .build();
    }
}
```

## Database Configuration

### Multiple DataSource Configuration

```java
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DatabaseConfig {

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
}
```

### R2DBC Configuration for Reactive Applications

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
@EnableR2dbcRepositories
public class R2dbcConfig extends AbstractR2dbcConfiguration {

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

## External Service Configuration

### WebClient Configuration

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;

@Configuration
public class WebClientConfig {

    private final ApplicationProperties.Integration integrationProperties;

    public WebClientConfig(ApplicationProperties applicationProperties) {
        this.integrationProperties = applicationProperties.integration();
    }

    @Bean
    public WebClient paymentServiceClient() {
        return createWebClient(
            integrationProperties.paymentService().baseUrl(),
            integrationProperties.paymentService().timeout()
        );
    }

    @Bean
    public WebClient customerServiceClient() {
        return createWebClient(
            integrationProperties.customerService().baseUrl(),
            integrationProperties.customerService().timeout()
        );
    }

    private WebClient createWebClient(String baseUrl, Duration timeout) {
        ConnectionProvider connectionProvider = ConnectionProvider.builder("custom")
            .maxConnections(50)
            .maxIdleTime(Duration.ofSeconds(20))
            .maxLifeTime(Duration.ofSeconds(60))
            .pendingAcquireTimeout(Duration.ofSeconds(60))
            .evictInBackground(Duration.ofSeconds(120))
            .build();

        HttpClient httpClient = HttpClient.create(connectionProvider)
            .responseTimeout(timeout);

        return WebClient.builder()
            .baseUrl(baseUrl)
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
    }
}
```

## Caching Configuration

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

@Configuration
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration configuration = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(configuration)
            .build();
    }
}
```

## Observability Configuration

### Micrometer and Tracing Configuration

```java
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.config.MeterFilter;
import org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ObservabilityConfig {

    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags(
            ApplicationProperties applicationProperties) {
        return registry -> {
            registry.config()
                .commonTags(
                    "application", applicationProperties.spring().application().name(),
                    "environment", getActiveProfile()
                )
                .meterFilter(MeterFilter.deny(id -> 
                    id.getName().startsWith("jvm.gc.pause")));
        };
    }

    private String getActiveProfile() {
        // Implementation to get active profile
        return "production";
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

### Configuration Validation

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

### Conditional Configuration

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

## Common Anti-patterns to Avoid

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Hardcoded values | No flexibility across environments | Use externalized configuration |
| Secrets in properties files | Security vulnerability | Use secret management systems |
| No validation | Runtime failures | Validate configuration at startup |
| Complex @Value expressions | Hard to maintain | Use @ConfigurationProperties |
| Profile-specific code | Coupling | Use conditional configuration |

These Spring Boot configuration best practices ensure that our microservices are flexible, secure, and maintainable across different environments while following infrastructure-as-code principles.