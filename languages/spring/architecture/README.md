# Spring Boot Architecture Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 3 minutes | **🟢 Level:** Beginner-Friendly
> 
> **📋 Prerequisites:** Basic Java knowledge  
> **🎯 Key Topics:** Dependency Injection, Component Management, Architecture
> 
> **📊 Complexity:** 8.8 grade level • 0.5% technical density • fairly difficult

## Architecture Basics

Think of Spring architecture like building with Lego blocks. Each block does one job. You connect blocks to build something bigger. Spring helps you connect your code blocks together.

This connection system is called **dependency injection** (DI). Instead of each block finding its own pieces, Spring hands them what they need. This makes your code easier to test and change.

## Why Architecture Matters

Good architecture helps you:
- Build features faster
- Fix bugs easier
- Test code without breaking things
- Change one part without touching others

## What You'll Find Here

This guide covers Spring Boot architecture patterns. You'll learn how to organize code and connect components.

## Core Topics

### Main Guide

- **[Dependency Injection and Component Management](dependency-injection-and-component-management.md)**: Learn how Spring connects your code. This guide shows you how to use DI, scan components, and manage configs.

## Key Principles

### How to Organize Layers

Spring apps use layers like a building:

- **Domain Layer**: Your business rules live here. No outside code allowed.
- **Application Layer**: Runs your business logic. Calls domain code.
- **Infrastructure Layer**: Connects to databases and APIs. Handles technical stuff.
- **Interfaces Layer**: Takes requests from users. Sends responses back.

Each layer talks only to the one below it. This keeps code clean.

### Dependency Injection Tips

Spring gives your code what it needs. Follow these rules:

- **Required parts**: Use constructor injection. Spring passes them when creating your class.
- **Optional parts**: Use setter injection. Spring adds them later if available.
- **Never use field injection**: Always use constructors instead. Tests work better.
- **Keep boundaries clear**: Each component does one job.

### Managing Components

Spring uses labels to organize your code:

- `@Component`: General-purpose code blocks
- `@Service`: Business logic blocks
- `@Repository`: Database access blocks
- `@Controller`: Request handling blocks
- `@Configuration`: Setup and config blocks

Spring creates and manages these components for you.

## Quick Examples

### Constructor Injection

Spring passes what you need through the constructor:

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

### Configuration Setup

Store your settings in config classes:

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

### Environment-Based Setup

Create different configs for test and production:

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

- [Project Structure and Package Organization](../project-structure/package-organization.md)
- [Configuration Principles](../configuration/configuration-principles.md)
- [Security Configuration](../security/README.md)
- [Error Handling Standards](../error-handling/README.md)