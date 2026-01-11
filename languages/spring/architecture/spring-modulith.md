# Spring Modulith - Building Modular Monoliths

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 25 minutes | **🟡 Level:** College Freshman  
> **📋 Prerequisites:** Spring Boot basics, DDD familiarity  
> **🎯 Key Topics:** Modular architecture, event-driven design, module boundaries  
> **📊 Complexity:** Grade 13 level • 1.2% technical density • fairly difficult

## What is Spring Modulith?

Spring Modulith helps you build **modular monoliths** - single deployable applications with clear internal module boundaries. Think of it as a way to get the architectural benefits of microservices without the operational complexity of distributed systems.

**Key Benefits:**
- **Enforced Boundaries**: Modules cannot accidentally depend on internal implementation details of other modules
- **Domain Separation**: Each module represents a bounded context following Domain-Driven Design principles
- **Easier Testing**: Test individual modules in isolation without starting the entire application
- **Documentation**: Auto-generate diagrams showing module structure and dependencies
- **Evolution Path**: Modules can later become microservices if needed

**When to Use:**
- New applications where microservices seem premature
- Teams wanting microservices benefits without distributed system complexity
- Projects following Domain-Driven Design with clear bounded contexts
- Applications needing verifiable architectural boundaries
- Monoliths that need better internal structure

**When NOT to Use:**
- Services that must scale independently with different resource requirements
- Teams already successfully running microservices
- Applications with hard requirements for independent deployment
- Systems needing different technology stacks per module

## Dependencies

### Maven

Add the Spring Modulith BOM to manage versions:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.modulith</groupId>
            <artifactId>spring-modulith-bom</artifactId>
            <version>1.2.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

Add core and test dependencies:

```xml
<dependencies>
    <!-- Core Spring Modulith support -->
    <dependency>
        <groupId>org.springframework.modulith</groupId>
        <artifactId>spring-modulith-starter-core</artifactId>
    </dependency>
    
    <!-- Testing support -->
    <dependency>
        <groupId>org.springframework.modulith</groupId>
        <artifactId>spring-modulith-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- Optional: Event persistence with JPA -->
    <dependency>
        <groupId>org.springframework.modulith</groupId>
        <artifactId>spring-modulith-starter-jpa</artifactId>
    </dependency>
</dependencies>
```

### Gradle (Kotlin DSL)

```kotlin
dependencies {
    implementation(platform("org.springframework.modulith:spring-modulith-bom:1.2.0"))
    implementation("org.springframework.modulith:spring-modulith-starter-core")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
    
    // Optional: Event persistence
    implementation("org.springframework.modulith:spring-modulith-starter-jpa")
}
```

### Gradle (Groovy)

```groovy
dependencies {
    implementation platform('org.springframework.modulith:spring-modulith-bom:1.2.0')
    implementation 'org.springframework.modulith:spring-modulith-starter-core'
    testImplementation 'org.springframework.modulith:spring-modulith-starter-test'
    
    // Optional: Event persistence
    implementation 'org.springframework.modulith:spring-modulith-starter-jpa'
}
```

## Module Structure

### Package Organization

Spring Modulith detects modules automatically based on package structure. Each top-level package under your main application package becomes a module.

```
src/main/java/com/example/shop/
├── ShopApplication.java           # Main application class
├── order/                          # Order module (package = module)
│   ├── Order.java                 # Aggregate root
│   ├── OrderService.java          # Public API service
│   ├── OrderRepository.java       # Repository interface
│   ├── OrderController.java       # REST endpoints
│   └── internal/                  # Hidden from other modules
│       ├── OrderProcessor.java    # Internal implementation
│       └── OrderValidator.java    # Internal validation
├── inventory/                      # Inventory module
│   ├── Inventory.java             # Aggregate root
│   ├── InventoryService.java      # Public API
│   ├── InventoryRepository.java   # Repository
│   └── internal/
│       └── StockCalculator.java   # Internal logic
├── customer/                       # Customer module
│   ├── Customer.java
│   ├── CustomerService.java
│   ├── CustomerRepository.java
│   └── package-info.java          # Module metadata (optional)
└── shared/                         # Shared utilities (not a module)
    └── Money.java                 # Shared value object
```

### Module Detection Rules

1. **Top-level packages** under the main application package become modules automatically
2. **Subpackages** belong to their parent module
3. **`internal` package** and its subpackages are hidden from other modules
4. **Everything else** is part of the module's public API

### Example Structure

For application `com.example.shop`:

| Package | Module | Visibility |
|---------|--------|------------|
| `com.example.shop.order` | `order` | Public API |
| `com.example.shop.order.internal` | `order` | Private (hidden) |
| `com.example.shop.inventory` | `inventory` | Public API |
| `com.example.shop.inventory.internal` | `inventory` | Private (hidden) |
| `com.example.shop.shared` | (not a module) | Shared across all |

### Module Naming Conventions

- **Module package names**: Use lowercase, singular nouns (`order`, `inventory`, `customer`)
- **Internal package**: Always name it `internal` for automatic hiding
- **Shared code**: Place in a package that is NOT a top-level module (e.g., `shared`, `common`)

## Defining Module APIs

### Public API Pattern

By default, everything in a module's package is public API except the `internal` package. Other modules can access any class in your module's root package.

**Example - Public API Service:**

```java
// order/OrderManagement.java - Public API
package com.example.shop.order;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrderManagement {
    
    private final OrderRepository orderRepository;      // Internal repository
    private final OrderProcessor orderProcessor;        // Internal processor
    
    // Public API method - other modules can call this
    public Order createOrder(CreateOrderRequest request) {
        return orderProcessor.process(request);
    }
    
    // Public API method - other modules can call this
    public Optional<Order> findOrder(OrderId id) {
        return orderRepository.findById(id);
    }
}
```

### Internal Implementation

```java
// order/internal/OrderProcessor.java - Hidden from other modules
package com.example.shop.order.internal;

import org.springframework.stereotype.Component;

@Component
class OrderProcessor {
    
    // This class is NOT accessible to other modules
    Order process(CreateOrderRequest request) {
        // Complex processing logic hidden from other modules
        var order = new Order(request.customerId(), request.items());
        order.validate();
        return order;
    }
}
```

### Module Metadata with @ApplicationModule

Use `@ApplicationModule` in `package-info.java` to define module metadata and dependencies:

```java
// order/package-info.java
@org.springframework.modulith.ApplicationModule(
    displayName = "Order Management",
    allowedDependencies = {"customer", "inventory"}
)
package com.example.shop.order;
```

**Attributes:**
- `displayName`: Human-readable module name for documentation
- `allowedDependencies`: Whitelist of modules this module can depend on
- `type`: Module type for organizational purposes (`OPEN`, `CLOSED`)

### Enforcing Dependency Rules

When you specify `allowedDependencies`, Spring Modulith verifies at startup that your module only depends on listed modules:

```java
// order/package-info.java
@ApplicationModule(
    allowedDependencies = {"customer"}  // Order can only depend on Customer
)
package com.example.shop.order;
```

If `OrderService` tries to use `InventoryService`, verification will fail:

```
Module 'order' depends on module 'inventory', but only dependencies to [customer] are allowed.
```

## Named Interfaces

Named interfaces let you expose specific packages within a module while keeping others private. This gives you fine-grained control over your module's API surface.

### Defining Named Interfaces

```java
// order/api/package-info.java
@org.springframework.modulith.NamedInterface("api")
package com.example.shop.order.api;
```

```java
// order/spi/package-info.java
@org.springframework.modulith.NamedInterface("spi")
package com.example.shop.order.spi;
```

### Module Structure with Named Interfaces

```
order/
├── api/                        # Public API (named interface)
│   ├── package-info.java      # @NamedInterface("api")
│   └── OrderManagement.java   # Public service
├── spi/                        # Service Provider Interface (named interface)
│   ├── package-info.java      # @NamedInterface("spi")
│   └── OrderEventPublisher.java
├── internal/                   # Private implementation
│   ├── OrderProcessor.java
│   └── OrderValidator.java
├── Order.java                  # Domain model (private by default)
└── package-info.java          # Module metadata
```

### Restricting Dependencies to Named Interfaces

Use the `::` syntax to depend only on specific named interfaces:

```java
// customer/package-info.java
@ApplicationModule(
    allowedDependencies = {
        "order::api",      // Only access order's API interface
        "inventory::api"   // Only access inventory's API interface
    }
)
package com.example.shop.customer;
```

Now `CustomerService` can access `order.api.OrderManagement` but NOT `order.Order` or anything in `order.internal`.

### Example - Clean API Boundaries

```java
// order/api/OrderManagement.java - Public API
package com.example.shop.order.api;

@Service
public class OrderManagement {
    public Order createOrder(CreateOrderRequest request) { /* ... */ }
    public Optional<Order> findOrder(OrderId id) { /* ... */ }
}
```

```java
// order/Order.java - Private domain model
package com.example.shop.order;

// This class is NOT accessible to modules depending on "order::api"
class Order {
    private OrderId id;
    private CustomerId customerId;
    // ...
}
```

```java
// customer/CustomerService.java - Using the API
package com.example.shop.customer;

import com.example.shop.order.api.OrderManagement;  // ✓ Allowed
// import com.example.shop.order.Order;              // ✗ Compile error

@Service
@RequiredArgsConstructor
public class CustomerService {
    
    private final OrderManagement orderManagement;  // ✓ Can use API
    
    public void viewCustomerOrders(CustomerId id) {
        orderManagement.findOrder(id);  // ✓ Works
    }
}
```

## Event-Driven Communication

Modules communicate through Spring's application events. This decouples modules and makes dependencies explicit and testable.

### Publishing Events

Use `ApplicationEventPublisher` to publish domain events from within transactions:

```java
// order/OrderService.java
package com.example.shop.order;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher events;
    
    @Transactional
    public Order completeOrder(OrderId orderId) {
        var order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
        
        order.markComplete();
        orderRepository.save(order);
        
        // Publish domain event
        events.publishEvent(new OrderCompleted(
            order.getId(), 
            order.getCustomerId(), 
            order.getTotal()
        ));
        
        return order;
    }
}
```

### Event Records

Use Java records for immutable event payloads:

```java
// order/OrderCompleted.java - Domain event
package com.example.shop.order;

import java.time.Instant;

public record OrderCompleted(
    OrderId orderId,
    CustomerId customerId,
    Money total,
    Instant completedAt
) {
    public OrderCompleted(OrderId orderId, CustomerId customerId, Money total) {
        this(orderId, customerId, total, Instant.now());
    }
}
```

### Listening to Events with @ApplicationModuleListener

Other modules listen to events using `@ApplicationModuleListener`:

```java
// inventory/InventoryEventListener.java
package com.example.shop.inventory;

import com.example.shop.order.OrderCompleted;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryEventListener {
    
    private final InventoryService inventoryService;
    
    @ApplicationModuleListener
    void on(OrderCompleted event) {
        log.info("Order {} completed, updating inventory", event.orderId());
        
        inventoryService.reserveStock(event.orderId());
    }
}
```

### Transaction Boundaries

`@ApplicationModuleListener` provides transactional guarantees:

- **Async execution**: Runs in a separate thread from the original transaction
- **New transaction**: Uses `Propagation.REQUIRES_NEW` for isolated transactions
- **After commit**: Event listener runs AFTER the publishing transaction commits
- **Guaranteed delivery**: Event Publication Registry ensures events are delivered even if listener fails

**Default behavior:**

```java
@ApplicationModuleListener  // Equivalent to:
// @Async
// @Transactional(propagation = Propagation.REQUIRES_NEW)
// @TransactionalEventListener
void on(OrderCompleted event) { /* ... */ }
```

### Event Publication Registry

Spring Modulith tracks published events to guarantee delivery. If a listener fails, the event is marked for retry.

**Key features:**
- Events persisted in database (JPA, JDBC, or MongoDB)
- Failed listeners automatically retried on application restart
- Completed events can be cleaned up after retention period
- Transaction safety guarantees

**Configuration:**

```yaml
spring:
  modulith:
    events:
      publication-registry:
        enabled: true
      retention-policy: P30D  # Keep completed events for 30 days
      republish-outstanding-events-on-restart: true
```

## Module Verification Tests

Spring Modulith helps you verify that modules follow architectural rules.

### Basic Verification

Create a test that verifies your module structure:

```java
// src/test/java/com/example/shop/ModularityTests.java
package com.example.shop;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

class ModularityTests {
    
    ApplicationModules modules = ApplicationModules.of(ShopApplication.class);
    
    @Test
    void verifyModuleStructure() {
        modules.verify();
    }
}
```

### What Gets Verified

The `verify()` method checks:

1. **No circular dependencies**: Modules must form a directed acyclic graph
2. **API access only**: Modules cannot access other modules' `internal` packages
3. **Allowed dependencies**: If `@ApplicationModule(allowedDependencies=...)` is specified, only those dependencies are permitted
4. **Named interface restrictions**: Modules depending on `module::interface` can only access that interface

### Violation Example

If `InventoryService` tries to use `order.internal.OrderProcessor`:

```
Module 'inventory' depends on non-exposed type com.example.shop.order.internal.OrderProcessor within module 'order'!
```

### Custom Verification Rules

Add additional architectural rules using ArchUnit integration:

```java
import org.springframework.modulith.core.VerificationOptions;
import org.springframework.modulith.core.jmolecules.JMoleculesArchitectureRules;
import static org.springframework.modulith.core.VerificationDepth.STRICT;

@Test
void verifyHexagonalArchitecture() {
    var hexagonalRules = JMoleculesArchitectureRules.ensureHexagonal(STRICT);
    var options = VerificationOptions.defaults()
        .withAdditionalVerifications(hexagonalRules);
    
    modules.verify(options);
}
```

### Handling Violations

Detect violations without throwing exceptions:

```java
@Test
void detectViolationsWithoutFailing() {
    var violations = modules.detectViolations();
    
    // Filter out known violations
    violations.filter(v -> !v.hasMessageContaining("LegacyCode"))
              .throwIfPresent();
}
```

## Integration Testing

Spring Modulith provides `@ApplicationModuleTest` for integration testing individual modules in isolation.

### Basic Module Test

```java
// order/OrderIntegrationTests.java
package com.example.shop.order;

import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.junit.jupiter.api.Test;

@ApplicationModuleTest
class OrderIntegrationTests {
    
    @Autowired
    OrderManagement orderManagement;
    
    @Test
    void createsOrder() {
        var request = new CreateOrderRequest(
            CustomerId.of("customer-1"),
            List.of(new OrderItem(ProductId.of("product-1"), 2))
        );
        
        var order = orderManagement.createOrder(request);
        
        assertThat(order).isNotNull();
        assertThat(order.getCustomerId()).isEqualTo(request.customerId());
    }
}
```

### Bootstrap Modes

Control which modules get loaded for testing:

```java
import org.springframework.modulith.test.ApplicationModuleTest.BootstrapMode;

@ApplicationModuleTest(mode = BootstrapMode.STANDALONE)  // Default: current module only
class OrderIntegrationTests { /* ... */ }

@ApplicationModuleTest(mode = BootstrapMode.DIRECT_DEPENDENCIES)  // Current + direct deps
class OrderIntegrationTests { /* ... */ }

@ApplicationModuleTest(mode = BootstrapMode.ALL_DEPENDENCIES)  // Current + all transitive deps
class OrderIntegrationTests { /* ... */ }
```

**Recommendation**: Use `STANDALONE` to keep tests fast and isolated. Mock dependencies instead of loading them.

### Testing Published Events

Inject `PublishedEvents` to verify events were published:

```java
import org.springframework.modulith.test.PublishedEvents;

@ApplicationModuleTest
class OrderIntegrationTests {
    
    @Autowired
    OrderManagement orderManagement;
    
    @Test
    void publishesOrderCompletedEvent(PublishedEvents events) {
        var orderId = OrderId.of("order-1");
        
        orderManagement.completeOrder(orderId);
        
        var matchingEvents = events.ofType(OrderCompleted.class)
            .matchingMapped(OrderCompleted::orderId, orderId);
        
        assertThat(matchingEvents).hasSize(1);
    }
}
```

### Scenario API for Async Tests

Test asynchronous event handling with the `Scenario` API:

```java
import org.springframework.modulith.test.Scenario;

@ApplicationModuleTest
class OrderIntegrationTests {
    
    @Autowired
    OrderManagement orderManagement;
    
    @Test
    void completesOrderAndTriggersInventoryUpdate(Scenario scenario) {
        var orderId = OrderId.of("order-1");
        
        scenario.stimulate(() -> orderManagement.completeOrder(orderId))
                .andWaitForEventOfType(OrderCompleted.class)
                .matchingMappedValue(OrderCompleted::orderId, orderId)
                .toArrive();
    }
}
```

### Mocking Cross-Module Dependencies

Use `@MockitoBean` to mock dependencies on other modules:

```java
import org.springframework.boot.test.mock.mockito.MockitoBean;
import static org.mockito.Mockito.*;

@ApplicationModuleTest
class OrderIntegrationTests {
    
    @Autowired
    OrderManagement orderManagement;
    
    @MockitoBean
    InventoryService inventoryService;  // From inventory module
    
    @Test
    void reservesInventoryWhenCreatingOrder() {
        var request = new CreateOrderRequest(/* ... */);
        
        when(inventoryService.checkAvailability(any())).thenReturn(true);
        
        orderManagement.createOrder(request);
        
        verify(inventoryService).reserveStock(any());
    }
}
```

## Async Event Processing

### Event Externalization

Publish domain events to external message brokers (Kafka, RabbitMQ, SQS, SNS) for consumption by other systems:

```java
// order/OrderCompleted.java - Mark event for externalization
package com.example.shop.order;

import org.springframework.modulith.events.Externalized;

@Externalized("shop.orders.completed")  // Routing target (Kafka topic, AMQP exchange, etc.)
public record OrderCompleted(
    OrderId orderId,
    CustomerId customerId,
    Money total
) {}
```

### Kafka Externalization

Add Kafka support:

```xml
<dependency>
    <groupId>org.springframework.modulith</groupId>
    <artifactId>spring-modulith-events-kafka</artifactId>
</dependency>
```

Configure routing:

```java
import org.springframework.modulith.events.config.EventExternalizationConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EventExternalizationConfig {
    
    @Bean
    EventExternalizationConfiguration eventExternalizationConfiguration() {
        return EventExternalizationConfiguration.externalizing()
            .select(EventExternalizationConfiguration.annotatedAsExternalized())
            .route(
                OrderCompleted.class,
                event -> RoutingTarget.forTarget("shop.orders.completed")
                                      .andKey(event.orderId().toString())
            )
            .build();
    }
}
```

### AMQP Externalization

For RabbitMQ:

```xml
<dependency>
    <groupId>org.springframework.modulith</groupId>
    <artifactId>spring-modulith-events-amqp</artifactId>
</dependency>
```

```java
@Bean
EventExternalizationConfiguration amqpExternalization() {
    return EventExternalizationConfiguration.externalizing()
        .select(EventExternalizationConfiguration.annotatedAsExternalized())
        .route(
            OrderCompleted.class,
            event -> RoutingTarget.forTarget("shop.orders")  // AMQP routing key
        )
        .build();
}
```

### Supported Brokers

| Broker | Artifact | Routing |
|--------|----------|---------|
| Kafka | `spring-modulith-events-kafka` | Topic + message key |
| RabbitMQ | `spring-modulith-events-amqp` | Exchange + routing key |
| AWS SQS | `spring-modulith-events-aws-sqs` | Queue name |
| AWS SNS | `spring-modulith-events-aws-sns` | Topic ARN |
| JMS | `spring-modulith-events-jms` | Destination |

### Custom Async Event Listener

For internal async processing without externalization:

```java
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
class NotificationService {
    
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener
    void sendNotification(OrderCompleted event) {
        // Send email or push notification
        emailService.sendOrderConfirmation(event.customerId(), event.orderId());
    }
}
```

## Generated Documentation

Spring Modulith auto-generates documentation for your module structure.

### Basic Documentation Generation

```java
import org.springframework.modulith.docs.Documenter;

@Test
void generateDocumentation() {
    new Documenter(modules).writeDocumentation();
}
```

This creates:
- **PlantUML diagrams**: Component diagrams showing module dependencies
- **Module canvases**: Detailed documentation for each module
- **Aggregating document**: Single AsciiDoc file including all documentation

### Output Location

Generated files go to:
- **Maven**: `target/spring-modulith-docs/`
- **Gradle**: `build/spring-modulith-docs/`

### Generated Files

| File | Description |
|------|-------------|
| `components.puml` | Overall module structure diagram (C4 style) |
| `module-{name}.puml` | Individual module diagram with dependencies |
| `module-{name}.adoc` | Module canvas with components, events, properties |
| `all-docs.adoc` | Aggregated documentation |

### C4 Component Diagrams

Spring Modulith generates C4-style PlantUML diagrams by default:

```java
import org.springframework.modulith.docs.Documenter.DiagramOptions;

@Test
void generateC4Diagrams() {
    new Documenter(modules)
        .writeModulesAsPlantUml(DiagramOptions.defaults());
}
```

### Customizing Diagrams

```java
import org.springframework.modulith.docs.Documenter.DiagramOptions;
import org.springframework.modulith.docs.Documenter.DiagramStyle;

@Test
void customizeDiagrams() {
    var options = DiagramOptions.defaults()
        .withStyle(DiagramStyle.UML)  // Switch to traditional UML
        .withColorSelector(module -> 
            module.getName().equals("order") ? "#FF6B6B" : "#4ECDC4"
        )
        .withComponentFilter(component -> 
            !component.getName().contains("test")
        );
    
    new Documenter(modules)
        .writeModulesAsPlantUml(options);
}
```

### Module Canvas

Each module canvas includes:

- **Description**: Module overview from package-info.java Javadoc
- **Base package**: Package name with Javadoc link
- **Spring components**: Services, repositories, controllers
- **Bean references**: Dependencies on other modules
- **Aggregates**: Domain aggregate roots
- **Published events**: Events this module publishes
- **Events listened to**: Events this module listens to
- **Configuration properties**: `@ConfigurationProperties` beans

### Custom Groupings

Organize components in canvas by architectural patterns:

```java
import org.springframework.modulith.docs.Documenter.CanvasOptions;
import org.springframework.modulith.docs.Grouping;

@Test
void generateCanvasWithGroupings() {
    var options = CanvasOptions.defaults()
        .groupingBy(
            Grouping.of("REST Controllers", "Web entry points", 
                component -> component.getName().endsWith("Controller")),
            Grouping.of("Domain Services", "Business logic",
                component -> component.getName().endsWith("Service"))
        );
    
    new Documenter(modules)
        .writeModuleCanvases(options);
}
```

## Migration Path to Microservices

Spring Modulith modules can evolve into microservices when needed. The clear boundaries make this transition straightforward.

### When to Extract a Module

Consider extracting a module to a microservice when:

1. **Independent scaling**: Module needs different scaling characteristics
2. **Team autonomy**: Separate teams need independent deployment cycles
3. **Technology diversity**: Module benefits from different tech stack
4. **Data isolation**: Module requires its own database for compliance or performance
5. **Deployment frequency**: Module changes much more frequently than others

### Migration Steps

#### 1. Verify Module Boundaries

Before extraction, ensure the module has clean boundaries:

```java
@Test
void moduleHasNoDependencies() {
    var module = modules.getModuleByName("order").orElseThrow();
    assertThat(module.getDependencies(modules)).isEmpty();
}
```

#### 2. Extract Module to Separate Project

Create a new Spring Boot project with just the module package:

```
order-service/
├── src/main/java/com/example/order/
│   ├── OrderServiceApplication.java  # New main class
│   ├── Order.java
│   ├── OrderService.java
│   ├── OrderRepository.java
│   └── api/
│       └── OrderController.java      # New REST controller
└── src/main/resources/
    └── application.yml
```

#### 3. Replace Direct Calls with HTTP

**Before (in monolith):**

```java
@Service
@RequiredArgsConstructor
public class CustomerService {
    
    private final OrderManagement orderManagement;  // Direct injection
    
    public List<Order> getCustomerOrders(CustomerId customerId) {
        return orderManagement.findByCustomer(customerId);
    }
}
```

**After (calling microservice):**

```java
@Service
@RequiredArgsConstructor
public class CustomerService {
    
    private final OrderServiceClient orderClient;  // HTTP client
    
    public List<OrderDTO> getCustomerOrders(CustomerId customerId) {
        return orderClient.findByCustomer(customerId.toString());
    }
}
```

**HTTP Client:**

```java
import org.springframework.web.client.RestClient;
import org.springframework.stereotype.Component;

@Component
public class OrderServiceClient {
    
    private final RestClient restClient;
    
    public OrderServiceClient(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("http://order-service").build();
    }
    
    public List<OrderDTO> findByCustomer(String customerId) {
        return restClient.get()
            .uri("/api/orders?customerId={customerId}", customerId)
            .retrieve()
            .body(new ParameterizedTypeReference<List<OrderDTO>>() {});
    }
}
```

#### 4. Replace Events with Messages

**Before (in monolith):**

```java
@Component
class InventoryEventListener {
    
    @ApplicationModuleListener
    void on(OrderCompleted event) {
        inventoryService.reserveStock(event.orderId());
    }
}
```

**After (with Kafka):**

```java
@Component
class InventoryKafkaListener {
    
    @KafkaListener(topics = "shop.orders.completed")
    void onOrderCompleted(OrderCompletedMessage message) {
        inventoryService.reserveStock(OrderId.of(message.orderId()));
    }
}
```

**Publishing side:**

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final KafkaTemplate<String, OrderCompletedMessage> kafka;
    
    @Transactional
    public Order completeOrder(OrderId orderId) {
        var order = orderRepository.findById(orderId).orElseThrow();
        order.markComplete();
        orderRepository.save(order);
        
        // Publish to Kafka instead of ApplicationEventPublisher
        kafka.send("shop.orders.completed", new OrderCompletedMessage(
            orderId.toString(),
            order.getCustomerId().toString(),
            order.getTotal().toString()
        ));
        
        return order;
    }
}
```

#### 5. Separate Databases

Each microservice gets its own database:

**Order Service:**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/order_db
    username: order_user
    password: ${ORDER_DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
```

**Inventory Service:**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/inventory_db
    username: inventory_user
    password: ${INVENTORY_DB_PASSWORD}
```

### Gradual Migration Pattern

Don't extract all modules at once. Follow this pattern:

1. **Start with leaf modules**: Extract modules with no dependencies first
2. **One at a time**: Extract one module, validate production behavior
3. **Keep events**: Continue using event-driven communication
4. **Shared libraries**: Extract common code to shared libraries
5. **API gateway**: Add gateway when you have 3+ services

### Strangler Fig Pattern

Keep both monolith and microservice running during transition:

```java
@Service
public class CustomerService {
    
    private final OrderManagement localOrders;      // Old: in monolith
    private final OrderServiceClient remoteOrders;  // New: microservice
    
    @Value("${feature.use-order-service:false}")
    private boolean useOrderService;
    
    public List<Order> getCustomerOrders(CustomerId customerId) {
        if (useOrderService) {
            return remoteOrders.findByCustomer(customerId.toString());
        } else {
            return localOrders.findByCustomer(customerId);
        }
    }
}
```

Enable the feature flag gradually:

```yaml
# Start: 0% of traffic to new service
feature:
  use-order-service: false

# After validation: 10% of traffic
feature:
  use-order-service: ${RANDOM_PERCENTAGE_10}

# After confidence: 100% of traffic
feature:
  use-order-service: true
```

## Configuration

### Application Properties

Configure Spring Modulith behavior in `application.yml`:

```yaml
spring:
  modulith:
    # Module detection strategy
    detection:
      strategy: direct-sub-packages  # or: explicitly-annotated
    
    # Event publication and handling
    events:
      # Enable event publication registry
      publication-registry:
        enabled: true
      
      # Republish incomplete events on startup
      republish-outstanding-events-on-restart: true
      
      # Clean up completed events after 30 days
      retention-policy: P30D
      
      # Event externalization (if using Kafka, AMQP, etc.)
      externalization:
        enabled: true
    
    # Runtime verification
    runtime:
      verification:
        enabled: true  # Verify module structure at startup
```

### Detection Strategies

#### Direct Sub-Packages (Default)

Every top-level package under the main application package becomes a module:

```yaml
spring:
  modulith:
    detection:
      strategy: direct-sub-packages
```

```
com.example.shop/
├── order/          # Module: order
├── inventory/      # Module: inventory
└── customer/       # Module: customer
```

#### Explicitly Annotated

Only packages with `@ApplicationModule` are considered modules:

```yaml
spring:
  modulith:
    detection:
      strategy: explicitly-annotated
```

```java
// Only this package becomes a module
@ApplicationModule
package com.example.shop.order;
```

### Event Publication Registry

Choose persistence mechanism for event registry:

#### JPA (Relational Database)

```xml
<dependency>
    <groupId>org.springframework.modulith</groupId>
    <artifactId>spring-modulith-starter-jpa</artifactId>
</dependency>
```

```yaml
spring:
  modulith:
    events:
      publication-registry:
        enabled: true
```

#### JDBC (Relational Database without JPA)

```xml
<dependency>
    <groupId>org.springframework.modulith</groupId>
    <artifactId>spring-modulith-starter-jdbc</artifactId>
</dependency>
```

#### MongoDB

```xml
<dependency>
    <groupId>org.springframework.modulith</groupId>
    <artifactId>spring-modulith-starter-mongodb</artifactId>
</dependency>
```

**Note**: Requires MongoDB replica set for transaction support.

### Event Retention

Control how long completed events are kept:

```yaml
spring:
  modulith:
    events:
      # ISO-8601 duration format
      retention-policy: P30D   # 30 days
      # retention-policy: P7D   # 7 days
      # retention-policy: PT1H  # 1 hour
      # retention-policy: P0D   # Delete immediately
```

### Runtime Verification

Fail application startup if module boundaries are violated:

```yaml
spring:
  modulith:
    runtime:
      verification:
        enabled: true
```

When enabled, Spring Modulith runs `ApplicationModules.verify()` at startup. If violations are found, application fails to start with detailed error message.

### Development vs Production

Use different settings per environment:

```yaml
# application-dev.yml
spring:
  modulith:
    runtime:
      verification:
        enabled: true  # Strict verification in dev
    events:
      retention-policy: PT1H  # Clean up events quickly in dev
```

```yaml
# application-prod.yml
spring:
  modulith:
    runtime:
      verification:
        enabled: false  # Don't block startup in prod (use tests instead)
    events:
      retention-policy: P30D  # Keep events longer in prod for debugging
```

## Best Practices

### Module Design

1. **Keep modules focused**: Each module should represent a single bounded context
2. **Minimize dependencies**: Modules with no dependencies are easiest to test and extract
3. **Hide implementation**: Use `internal` packages aggressively
4. **Explicit APIs**: Create dedicated API classes instead of exposing domain models
5. **Event-driven**: Prefer events over direct dependencies for loose coupling

### Testing Strategy

1. **Verify early**: Run `ApplicationModules.verify()` in CI pipeline
2. **Test in isolation**: Use `@ApplicationModuleTest` with `STANDALONE` mode
3. **Mock dependencies**: Use `@MockitoBean` instead of loading other modules
4. **Test events**: Verify event publication and handling with `PublishedEvents` and `Scenario`
5. **Generate docs**: Include documentation generation in CI to catch structural changes

### Event Design

1. **Immutable events**: Use Java records for event payloads
2. **Semantic naming**: Name events in past tense (`OrderCompleted`, not `CompleteOrder`)
3. **Sufficient context**: Include all information listeners need (avoid N+1 queries)
4. **Versioning**: Plan for event schema evolution from the start
5. **Idempotency**: Listeners should handle duplicate events gracefully

### Migration Strategy

1. **Document first**: Generate module diagrams before starting migration
2. **Extract leaves**: Start with modules that have no dependencies
3. **One at a time**: Don't extract multiple modules simultaneously
4. **Feature flags**: Use strangler fig pattern with gradual rollout
5. **Keep events**: Maintain event-driven communication across service boundaries

## Common Pitfalls

### 1. Exposing Internal Types

**Problem:**

```java
// order/Order.java - Internal domain model
package com.example.shop.order;

public class Order { /* ... */ }

// order/OrderService.java - Public API exposing internal type
public class OrderService {
    public Order findOrder(OrderId id) { /* ... */ }  // ✗ Exposes Order
}
```

**Solution:**

```java
// order/api/OrderDTO.java - Public DTO
public record OrderDTO(String id, String status, BigDecimal total) {}

// order/OrderService.java - API using DTO
public class OrderService {
    public OrderDTO findOrder(OrderId id) {  // ✓ Uses DTO
        var order = orderRepository.findById(id).orElseThrow();
        return new OrderDTO(order.getId().toString(), order.getStatus(), order.getTotal());
    }
}
```

### 2. Circular Dependencies

**Problem:**

```
order → inventory → order  (circular dependency!)
```

**Solution:** Use events to break the cycle:

```java
// Order module publishes event
events.publishEvent(new OrderCompleted(orderId));

// Inventory module listens to event (no direct dependency)
@ApplicationModuleListener
void on(OrderCompleted event) { /* ... */ }
```

### 3. Forgetting Event Persistence

**Problem:** Events lost when listeners fail or application restarts.

**Solution:** Enable event publication registry:

```xml
<dependency>
    <groupId>org.springframework.modulith</groupId>
    <artifactId>spring-modulith-starter-jpa</artifactId>
</dependency>
```

```yaml
spring:
  modulith:
    events:
      publication-registry:
        enabled: true
```

### 4. Too Many Dependencies

**Problem:** Module depends on too many other modules (high coupling).

**Solution:** Refactor to use events or extract shared functionality:

```java
// Before: order depends on inventory, shipping, payment
@ApplicationModule(
    allowedDependencies = {"inventory", "shipping", "payment", "customer"}
)

// After: order only depends on customer, rest via events
@ApplicationModule(
    allowedDependencies = {"customer"}
)
```

### 5. Not Testing Module Boundaries

**Problem:** Module violations discovered in production.

**Solution:** Verify in CI pipeline:

```java
@Test
void verifyModuleStructure() {
    ApplicationModules.of(Application.class).verify();
}
```

## Related Documentation

- [Dependency Injection and Component Management](dependency-injection-and-component-management.md)
- [Project Structure and Package Organization](../project-structure/package-organization.md)
- [Event-Driven Architecture](../../../guides/architecture/Event-Driven-Architecture.md)
- [Testing Standards](../testing/README.md)

## External Resources

- [Spring Modulith Official Documentation](https://docs.spring.io/spring-modulith/reference/)
- [Spring Modulith GitHub Repository](https://github.com/spring-projects/spring-modulith)
- [Spring Modulith Example Projects](https://github.com/spring-projects/spring-modulith/tree/main/spring-modulith-examples)
- [Domain-Driven Design with Spring Modulith](https://spring.io/blog/2022/10/21/introducing-spring-modulith)

## Navigation

- [← Back to Architecture](README.md)
- [Dependency Injection →](dependency-injection-and-component-management.md)
- [Project Structure →](../project-structure/README.md)
- [Testing →](../testing/README.md)
