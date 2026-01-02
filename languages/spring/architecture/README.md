# Spring Boot Architecture Standards

## Overview

This directory contains architectural guidelines and patterns for building Spring Boot applications with a focus on dependency injection, component management, and hexagonal architecture principles.

## Directory Contents

### Core Architecture Documentation

- **[Dependency Injection and Component Management](Dependency%20Injection%20and%20Component%20Management.md)**: Comprehensive guide to Spring's dependency injection patterns, component scanning, configuration management, and best practices for managing application dependencies and lifecycle.

## Key Architecture Principles

### Hexagonal Architecture (Ports and Adapters)
- **Domain Layer**: Core business logic independent of external concerns
- **Application Layer**: Orchestrates domain operations and use cases
- **Infrastructure Layer**: Technical implementations and external integrations
- **Interfaces Layer**: API controllers and external communication

### Dependency Injection Best Practices
- Constructor injection for required dependencies
- Setter injection for optional dependencies
- Field injection avoided in favor of constructor injection
- Clear component boundaries and responsibilities

### Component Management
- Proper use of Spring stereotypes (`@Component`, `@Service`, `@Repository`, `@Controller`)
- Configuration management with `@Configuration` classes
- Bean lifecycle management and scoping
- Conditional bean creation and profile-specific configurations

## Quick Reference

### Constructor Injection Pattern
```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    
    public OrderService(OrderRepository orderRepository, PaymentService paymentService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
    }
}
```

### Configuration Management
```java
@Configuration
@ConfigurationProperties(prefix = "app.payment")
public class PaymentConfig {
    private String apiUrl;
    private int timeoutSeconds;
    private boolean retryEnabled;
    
    // getters and setters
}
```

### Conditional Bean Creation
```java
@Configuration
public class DatabaseConfig {
    
    @Bean
    @Profile("production")
    public DataSource productionDataSource() {
        return new HikariDataSource(productionConfig);
    }
    
    @Bean
    @Profile("test")
    public DataSource testDataSource() {
        return new H2DataSource(testConfig);
    }
}
```

## Navigation

- [← Back to Spring Design](../README.md)
- [Configuration Standards](../configuration/README.md)
- [Project Structure](../project-structure/README.md)
- [Testing Standards](../testing/README.md)

## Related Documentation

- [Project Structure and Package Organization](../project-structure/Package-Organization.md)
- [Configuration Principles](../configuration/Configuration-Principles.md)
- [Security Configuration](../security/README.md)
- [Error Handling Standards](../error-handling/README.md)