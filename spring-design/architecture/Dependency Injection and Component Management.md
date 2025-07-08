# Dependency Injection and Component Management

## Overview

Effective dependency injection (DI) and component management are critical for building maintainable, testable Spring Boot applications. This document outlines our standards for defining, organizing, and injecting components throughout microservices, with a focus on Domain-Driven Design principles.

## Dependency Injection Principles

1. **Constructor Injection**: Prefer constructor injection over field or setter injection
2. **Single Responsibility**: Components should have a single, well-defined responsibility
3. **Interface-Based Design**: Depend on abstractions rather than concrete implementations
4. **Explicit Dependencies**: Make dependencies explicit through constructors
5. **Final Fields**: Use final fields for required dependencies

## Component Stereotypes

Use Spring's stereotype annotations to clearly indicate a component's role:

| Annotation | Purpose | Layer |
|------------|---------|-------|
| `@Component` | Generic Spring-managed component | Any layer |
| `@Service` | Business service or domain service | Domain or Application layer |
| `@Repository` | Data access object | Infrastructure layer |
| `@Controller` / `@RestController` | Web controller | Interface layer |
| `@Configuration` | Configuration class | Config layer |

## Component Naming Conventions

Follow these naming conventions for components:

| Component Type | Naming Pattern | Example |
|----------------|----------------|---------|
| Service | `{Domain}Service` | `OrderService` |
| Domain Service | `{Role}Service` | `InventoryService` |
| Repository | `{Domain}Repository` | `OrderRepository` |
| Repository Implementation | `{Domain}RepositoryImpl` | `OrderRepositoryImpl` |
| Controller | `{Domain}Controller` | `OrderController` |
| Configuration | `{Feature}Config` | `DatabaseConfig` |

## Constructor Injection

### Preferred Approach

Use constructor injection with `final` fields:

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final EventPublisher eventPublisher;

    public OrderService(
            OrderRepository orderRepository,
            PaymentService paymentService,
            EventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
        this.eventPublisher = eventPublisher;
    }
    
    // Service methods
}
```

With Lombok, simplify using `@RequiredArgsConstructor`:

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final EventPublisher eventPublisher;
    
    // Service methods
}
```

### Anti-patterns to Avoid

Avoid field injection:

```java
// AVOID THIS
@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private PaymentService paymentService;
    
    // Service methods
}
```

Avoid setter injection except for optional dependencies:

```java
// Avoid setter injection for required dependencies
@Service
public class OrderService {
    private OrderRepository orderRepository;
    
    @Autowired
    public void setOrderRepository(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
    
    // Service methods
}
```

## Configuration Classes

### Configuration Organization

Organize `@Configuration` classes by functional area:

```java
@Configuration
@EnableCaching
public class CacheConfig {
    // Cache-related beans
}

@Configuration
@EnableAsync
public class AsyncConfig {
    // Async-related beans
}
```

### Bean Definition Methods

Define beans with explicit method names that describe their purpose:

```java
@Configuration
public class WebClientConfig {
    
    @Bean
    public WebClient orderServiceClient(WebClient.Builder builder) {
        return builder
            .baseUrl("https://order-service.example.com")
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }
    
    @Bean
    public WebClient customerServiceClient(WebClient.Builder builder) {
        return builder
            .baseUrl("https://customer-service.example.com")
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }
}
```

### Configuration Properties Injection

Inject configuration properties into beans:

```java
@Configuration
public class ServiceConfig {
    
    @Bean
    public PaymentGateway paymentGateway(PaymentProperties properties) {
        return new PaymentGatewayImpl(
            properties.getApiKey(),
            properties.getEndpoint(),
            properties.getTimeout()
        );
    }
}
```

## Conditional Beans

Use Spring's conditional annotations for flexible configurations:

```java
@Configuration
public class PaymentGatewayConfig {
    
    @Bean
    @ConditionalOnProperty(name = "payment.gateway", havingValue = "stripe")
    public PaymentGateway stripePaymentGateway(StripeProperties properties) {
        return new StripePaymentGateway(properties);
    }
    
    @Bean
    @ConditionalOnProperty(name = "payment.gateway", havingValue = "paypal")
    public PaymentGateway paypalPaymentGateway(PayPalProperties properties) {
        return new PayPalPaymentGateway(properties);
    }
    
    @Bean
    @ConditionalOnMissingBean
    public PaymentGateway mockPaymentGateway() {
        return new MockPaymentGateway();
    }
}
```

## Dependency Resolution and Bean Qualifiers

### Multiple Implementations

When multiple beans of the same type exist, qualify them:

```java
@Service
@Qualifier("jpaOrderRepository")
public class JpaOrderRepositoryImpl implements OrderRepository {
    // Implementation
}

@Service
@Qualifier("reactiveOrderRepository")
public class ReactiveOrderRepositoryImpl implements OrderRepository {
    // Implementation
}
```

And inject using the qualifier:

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderService(@Qualifier("jpaOrderRepository") OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
    
    // Service methods
}
```

### Primary Beans

Alternatively, mark one implementation as primary:

```java
@Service
@Primary
public class JpaOrderRepositoryImpl implements OrderRepository {
    // Implementation
}

@Service
public class ReactiveOrderRepositoryImpl implements OrderRepository {
    // Implementation
}
```

## Component Lifecycle Management

### Initialization and Destruction

Implement lifecycle methods when needed:

```java
@Service
public class MessagingService implements InitializingBean, DisposableBean {
    
    @Override
    public void afterPropertiesSet() throws Exception {
        // Initialize resources
        connectToMessageBroker();
        setupChannels();
    }
    
    @Override
    public void destroy() throws Exception {
        // Clean up resources
        closeChannels();
        disconnectFromMessageBroker();
    }
    
    private void connectToMessageBroker() {
        // Implementation
    }
    
    private void setupChannels() {
        // Implementation
    }
    
    private void closeChannels() {
        // Implementation
    }
    
    private void disconnectFromMessageBroker() {
        // Implementation
    }
}

// Alternatively, use annotations:
@Service
public class MessageProcessor {
    
    @PostConstruct
    public void initialize() {
        // Initialize resources
    }
    
    @PreDestroy
    public void cleanup() {
        // Clean up resources
    }
}

### Component Scopes

By default, Spring beans are singletons. Specify a different scope when needed:

```java
@Service
@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
public class OrderProcessor {
    // This bean will be instantiated whenever it's injected
}

@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class RequestContext {
    // This bean will be scoped to the HTTP request
    // Using proxy mode to handle injection into singletons
}
```

## Domain Events with Spring

### Event Publication

Publish domain events using Spring's `ApplicationEventPublisher`:

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public Order createOrder(Order order) {
        Order savedOrder = orderRepository.save(order);
        
        // Publish domain event
        eventPublisher.publishEvent(new OrderCreatedEvent(savedOrder));
        
        return savedOrder;
    }
}
```

### Event Listeners

Handle domain events with `@EventListener`:

```java
@Service
@RequiredArgsConstructor
public class InventoryService {
    private final InventoryRepository inventoryRepository;
    
    @EventListener
    @Transactional
    public void handleOrderCreated(OrderCreatedEvent event) {
        Order order = event.getOrder();
        
        // Update inventory
        for (OrderItem item : order.getItems()) {
            inventoryRepository.decreaseStock(
                item.getProductId(), 
                item.getQuantity()
            );
        }
    }
}
```

## Reactive Dependency Injection

For reactive applications, inject reactive components:

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderService {
    private final ReactiveOrderRepository orderRepository;
    private final ReactivePaymentService paymentService;
    
    public Mono<Order> createOrder(Order order) {
        return orderRepository.save(order)
            .flatMap(savedOrder -> 
                paymentService.processPayment(savedOrder)
                    .thenReturn(savedOrder)
            );
    }
}
```

## Testing Components

### Unit Testing

Test components with explicit dependency mocking:

```java
@ExtendWith(MockitoExtension.class)
public class OrderServiceTest {
    
    @Mock
    private OrderRepository orderRepository;
    
    @Mock
    private PaymentService paymentService;
    
    @Mock
    private ApplicationEventPublisher eventPublisher;
    
    @InjectMocks
    private OrderService orderService;
    
    @Test
    void shouldCreateOrder() {
        // Given
        Order order = new Order(/* ... */);
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        
        // When
        Order result = orderService.createOrder(order);
        
        // Then
        assertThat(result).isEqualTo(order);
        verify(eventPublisher).publishEvent(any(OrderCreatedEvent.class));
    }
}
```

### Integration Testing

Test component integration with `@SpringBootTest`:

```java
@SpringBootTest
public class OrderServiceIntegrationTest {
    
    @Autowired
    private OrderService orderService;
    
    @MockBean
    private PaymentService paymentService;
    
    @Test
    void shouldCreateAndPersistOrder() {
        // Test with real repositories but mocked external services
    }
}
```

## Common Patterns and Anti-patterns

### Patterns to Follow

| Pattern | Example | Description |
|---------|---------|-------------|
| Constructor injection | `private final Dependency dep;` | Makes dependencies explicit |
| Interface-based design | `interface Service {}` | Allows for flexible implementations |
| Single responsibility | One focused service | Services should do one thing well |
| Domain event publication | `eventPublisher.publishEvent()` | Decouples components |

### Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Field injection | `@Autowired private Service service;` | Use constructor injection |
| Service locator | `ApplicationContext.getBean()` | Inject dependencies explicitly |
| Static utilities | `StaticUtils.doSomething()` | Use injectable services |
| Circular dependencies | A depends on B depends on A | Redesign component responsibilities |

## Examples

### Domain Service

```java
@Service
@RequiredArgsConstructor
public class OrderDomainService {
    private final InventoryService inventoryService;
    private final PricingService pricingService;
    
    public Order validateAndEnrichOrder(Order order) {
        // Validate inventory
        inventoryService.validateInventory(order.getItems());
        
        // Calculate prices
        BigDecimal totalPrice = pricingService.calculateTotalPrice(order.getItems());
        order.setTotalPrice(totalPrice);
        
        return order;
    }
}
```

### Application Service

```java
@Service
@RequiredArgsConstructor
public class OrderApplicationService {
    private final OrderRepository orderRepository;
    private final OrderDomainService orderDomainService;
    private final ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public Order createOrder(OrderCreationRequest request) {
        // Map request to domain object
        Order order = mapToDomainOrder(request);
        
        // Validate and enrich
        order = orderDomainService.validateAndEnrichOrder(order);
        
        // Persist
        Order savedOrder = orderRepository.save(order);
        
        // Publish event
        eventPublisher.publishEvent(new OrderCreatedEvent(savedOrder));
        
        return savedOrder;
    }
    
    private Order mapToDomainOrder(OrderCreationRequest request) {
        // Mapping implementation
        return new Order(/* ... */);
    }
}
```

### Reactive Service

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderService {
    private final ReactiveOrderRepository orderRepository;
    private final ReactiveInventoryService inventoryService;
    
    public Mono<Order> createOrder(Order order) {
        return validateInventory(order)
            .then(orderRepository.save(order))
            .doOnSuccess(savedOrder -> 
                publishOrderCreatedEvent(savedOrder).subscribe()
            );
    }
    
    private Mono<Void> validateInventory(Order order) {
        return Flux.fromIterable(order.getItems())
            .flatMap(item -> 
                inventoryService.checkAvailability(item.getProductId(), item.getQuantity())
            )
            .then();
    }
    
    private Mono<Void> publishOrderCreatedEvent(Order order) {
        // Event publication implementation
        return Mono.empty();
    }
}
```

These dependency injection and component management practices ensure that our microservices remain modular, testable, and follow Domain-Driven Design principles.