# Dependency Injection and Component Management

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟡 Level:** College Freshman  
> **📋 Prerequisites:** Spring Boot basics, DDD familiarity  
> **🎯 Key Topics:** Component management, testing  
> **📊 Complexity:** 12.9 grade level • 0.8% technical density • difficult

## Overview

Dependency injection (DI) lets Spring manage your components. It makes code testable and maintainable. This guide covers:

- How to define components
- How to inject dependencies  
- How to organize services and repositories
- Using Domain-Driven Design patterns

## Dependency Injection Principles

1. **Constructor Injection**: Use constructors, not field injection or setter injection
2. **Single Responsibility**: Each component should do one thing well
3. **Interface-Based Design**: Depend on interfaces, not concrete classes
4. **Explicit Dependencies**: Make dependencies visible in constructors
5. **Final Fields**: Mark required dependencies as final

## Component Stereotypes

Use Spring's stereotype annotations to clearly indicate a component's role:

| Annotation | Purpose | Layer |
|------------|---------|-------|
| `@Component` | Basic Spring component | Any layer |
| `@Service` | Business or domain logic | Domain layer |
| `@Repository` | Database access | Infrastructure layer |
| `@RestController` | Web endpoints | Interface layer |
| `@Configuration` | Bean definitions | Config layer |

## Component Naming Conventions

Use clear, predictable names:

| Type | Pattern | Example |
|------|---------|---------|
| Service | `{Domain}Service` | `OrderService` |
| Repository | `{Domain}Repository` | `OrderRepository` |
| Controller | `{Domain}Controller` | `OrderController` |
| Configuration | `{Feature}Config` | `DatabaseConfig` |

## Constructor Injection

Always use constructor injection. Never use field injection.

Use `@RequiredArgsConstructor` to generate constructors:

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
}
```

Lombok generates a constructor for final fields. This makes dependencies clear.

### Why Constructor Injection?

- You can see all dependencies in one place
- Easy to test - just pass mock objects
- Can't create service without dependencies
- Fields are immutable

### What to Avoid

Never use field injection. This hides dependencies.

```java
// AVOID THIS
@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;
}
```

Avoid setter injection too. Use constructor injection instead.

## Configuration Classes

Create a separate configuration class for each feature:

```java
@Configuration
@EnableCaching
public class CacheConfig {
    // Beans for caching
}
```

Use `@Bean` methods to define beans:

```java
@Bean
public WebClient orderServiceClient(WebClient.Builder builder) {
    return builder
        .baseUrl("https://order-service.example.com")
        .build();
}
```

Pass configuration properties as method parameters:

```java
@Bean
public PaymentGateway paymentGateway(PaymentProperties properties) {
    return new PaymentGatewayImpl(properties.getApiKey());
}
```

## Conditional Beans

Load beans based on configuration using conditional annotations.

`@ConditionalOnProperty` - Load if property exists:

```java
@Bean
@ConditionalOnProperty(name = "payment.gateway", havingValue = "stripe")
public PaymentGateway paymentGateway(StripeProperties props) {
    return new StripePaymentGateway(props);
}
```

`@ConditionalOnMissingBean` - Load if no other bean exists of same type.

`@ConditionalOnClass` - Load if a class is on the classpath.

## Bean Qualifiers

When multiple beans implement the same interface, Spring needs to choose one.

Use `@Qualifier` to specify which bean to inject:

```java
@Service
@Qualifier("jpaRepository")
public class JpaOrderRepositoryImpl implements OrderRepository {
}

@Service
public class OrderService {
    public OrderService(@Qualifier("jpaRepository") OrderRepository repo) {
        this.orderRepository = repo;
    }
}
```

Or use `@Primary` to mark the default:

```java
@Service
@Primary
public class JpaOrderRepositoryImpl implements OrderRepository {
}
```

Spring injects the `@Primary` bean when no qualifier is given.

## Component Lifecycle

Initialize resources when Spring creates a bean:

```java
@Service
public class MessageProcessor {
    @PostConstruct
    public void initialize() {
        connectToMessageBroker();
        setupChannels();
    }
    
    @PreDestroy
    public void cleanup() {
        closeChannels();
    }
}
```

- `@PostConstruct` runs after Spring creates the bean
- `@PreDestroy` runs before Spring destroys the bean

Use these to connect to external systems or start processes.

## Component Scopes

By default, Spring creates one bean (singleton). Change this with `@Scope`:

```java
@Service
@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
public class OrderProcessor {
}
```

- `SCOPE_SINGLETON`: One instance (default)
- `SCOPE_PROTOTYPE`: New instance each time
- `SCOPE_REQUEST`: One per HTTP request

## Domain Events

Publish events to decouple services.

Publish an event after saving:

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public Order createOrder(Order order) {
        Order savedOrder = orderRepository.save(order);
        eventPublisher.publishEvent(new OrderCreatedEvent(savedOrder));
        return savedOrder;
    }
}
```

Listen to events with `@EventListener`:

```java
@Service
public class InventoryService {
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        Order order = event.getOrder();
        // Update inventory
    }
}
```

Services respond to events without knowing about each other.

## Reactive Dependency Injection

In reactive applications, inject reactive components:

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderService {
    private final ReactiveOrderRepository orderRepository;
    private final ReactivePaymentService paymentService;
    
    public Mono<Order> createOrder(Order order) {
        return orderRepository.save(order)
            .flatMap(savedOrder -> paymentService.processPayment(savedOrder));
    }
}
```

Inject reactive repositories, not blocking ones. Return `Mono` or `Flux`.

## Testing Components

### Unit Testing

Test in isolation by mocking dependencies:

```java
@ExtendWith(MockitoExtension.class)
public class OrderServiceTest {
    @Mock
    private OrderRepository orderRepository;
    
    @InjectMocks
    private OrderService orderService;
    
    @Test
    void shouldCreateOrder() {
        when(orderRepository.save(any())).thenReturn(order);
        Order result = orderService.createOrder(order);
        assertThat(result).isEqualTo(order);
    }
}
```

### Integration Testing

Test components together with a real database:

```java
@SpringBootTest
public class OrderServiceIntegrationTest {
    @Autowired
    private OrderService orderService;
    
    @MockBean
    private PaymentService paymentService;
}
```

Use real repositories. Mock only external services like payment processing.

## Common Patterns and Anti-patterns

### Patterns to Follow

| Pattern | Benefit |
|---------|---------|
| Constructor injection | Clear dependencies |
| Interface-based design | Easy to swap implementations |
| Single responsibility | Easier to test |
| Domain events | Loose coupling |

### Anti-patterns

| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Field injection | Hidden dependencies | Use constructors |
| Service locator | Can't see what's needed | Inject explicitly |
| Static utilities | Can't mock | Use injectable services |
| Circular dependencies | Hard to understand | Redesign |

## Example: Structuring Services

A domain service validates orders:

```java
@Service
@RequiredArgsConstructor
public class OrderDomainService {
    private final InventoryService inventoryService;
    
    public Order validate(Order order) {
        inventoryService.validateInventory(order.getItems());
        return order;
    }
}
```

An application service uses the domain service:

```java
@Service
@RequiredArgsConstructor
public class OrderApplicationService {
    private final OrderRepository orderRepository;
    private final OrderDomainService orderDomainService;
    
    @Transactional
    public Order createOrder(Order order) {
        order = orderDomainService.validate(order);
        return orderRepository.save(order);
    }
}
```

Domain services contain business logic. Application services orchestrate.

Good dependency injection practices make microservices modular, testable, and maintainable.