# Getting Started with Spring Boot gRPC

> **📖 Reading Guide**
> **⏱️ Reading Time:** 15 minutes | **🎯 Level:** Beginner
> **📋 Prerequisites:** Java 17+, Maven or Gradle, basic Spring Boot knowledge
> **🎯 Key Topics:** Project setup • Dependencies • First service • Testing with grpcurl
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

This guide walks you through creating your first gRPC service with Spring Boot from scratch.

---

## What You'll Build

A simple order service with two operations:
- **GetOrder** - Retrieve an order by ID
- **CreateOrder** - Create a new order

**Time to complete:** 20-30 minutes

---

## Prerequisites

Before you begin, ensure you have:

- **Java 17 or later** ([Download](https://adoptium.net/))
- **Maven 3.8+** or **Gradle 8.0+**
- **IDE** (IntelliJ IDEA, Eclipse, VS Code)
- **grpcurl** (optional, for testing) - [Installation](https://github.com/fullstorydev/grpcurl#installation)

**Verify installations:**
```bash
java -version   # Should show 17 or higher
mvn -version    # Or gradle -version
```

---

## Step 1: Create Spring Boot Project

### Option A: Using Spring Initializr (Recommended)

1. Go to [start.spring.io](https://start.spring.io/)
2. Configure project:
   - **Project:** Maven (or Gradle)
   - **Language:** Java
   - **Spring Boot:** 3.2.0 or later
   - **Group:** `com.example`
   - **Artifact:** `order-service`
   - **Package name:** `com.example.order`
   - **Packaging:** Jar
   - **Java:** 17 or later

3. Add dependencies:
   - Spring Boot DevTools (optional)

4. Click **Generate** and extract the ZIP file

### Option B: Using Maven Archetype

```bash
mvn archetype:generate \
  -DgroupId=com.example \
  -DartifactId=order-service \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DinteractiveMode=false

cd order-service
```

### Option C: Using Gradle Init

```bash
mkdir order-service && cd order-service
gradle init --type java-application \
  --dsl kotlin \
  --test-framework junit-jupiter \
  --package com.example.order \
  --project-name order-service
```

---

## Step 2: Add gRPC Dependencies

### Maven (pom.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>order-service</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <name>order-service</name>

    <properties>
        <java.version>17</java.version>
        <grpc.version>1.60.0</grpc.version>
        <protobuf.version>3.25.1</protobuf.version>
        <grpc-spring-boot-starter.version>3.1.0.RELEASE</grpc-spring-boot-starter.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starter -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>

        <!-- gRPC Server -->
        <dependency>
            <groupId>net.devh</groupId>
            <artifactId>grpc-server-spring-boot-starter</artifactId>
            <version>${grpc-spring-boot-starter.version}</version>
        </dependency>

        <!-- gRPC Client (for testing) -->
        <dependency>
            <groupId>net.devh</groupId>
            <artifactId>grpc-client-spring-boot-starter</artifactId>
            <version>${grpc-spring-boot-starter.version}</version>
            <scope>test</scope>
        </dependency>

        <!-- Protobuf -->
        <dependency>
            <groupId>com.google.protobuf</groupId>
            <artifactId>protobuf-java</artifactId>
            <version>${protobuf.version}</version>
        </dependency>

        <!-- Annotation processing for IDE support -->
        <dependency>
            <groupId>javax.annotation</groupId>
            <artifactId>javax.annotation-api</artifactId>
            <version>1.3.2</version>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <extensions>
            <!-- OS detection for protoc -->
            <extension>
                <groupId>kr.motd.maven</groupId>
                <artifactId>os-maven-plugin</artifactId>
                <version>1.7.1</version>
            </extension>
        </extensions>

        <plugins>
            <!-- Spring Boot Maven Plugin -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>

            <!-- Protobuf Maven Plugin -->
            <plugin>
                <groupId>org.xolstice.maven.plugins</groupId>
                <artifactId>protobuf-maven-plugin</artifactId>
                <version>0.6.1</version>
                <configuration>
                    <protocArtifact>
                        com.google.protobuf:protoc:${protobuf.version}:exe:${os.detected.classifier}
                    </protocArtifact>
                    <pluginId>grpc-java</pluginId>
                    <pluginArtifact>
                        io.grpc:protoc-gen-grpc-java:${grpc.version}:exe:${os.detected.classifier}
                    </pluginArtifact>
                </configuration>
                <executions>
                    <execution>
                        <goals>
                            <goal>compile</goal>
                            <goal>compile-custom</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

### Gradle (build.gradle.kts)

```kotlin
plugins {
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    id("com.google.protobuf") version "0.9.4"
    java
}

group = "com.example"
version = "1.0.0-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot
    implementation("org.springframework.boot:spring-boot-starter")
    
    // gRPC
    implementation("net.devh:grpc-server-spring-boot-starter:3.1.0.RELEASE")
    implementation("com.google.protobuf:protobuf-java:3.25.1")
    implementation("javax.annotation:javax.annotation-api:1.3.2")
    
    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("net.devh:grpc-client-spring-boot-starter:3.1.0.RELEASE")
}

protobuf {
    protoc {
        artifact = "com.google.protobuf:protoc:3.25.1"
    }
    plugins {
        create("grpc") {
            artifact = "io.grpc:protoc-gen-grpc-java:1.60.0"
        }
    }
    generateProtoTasks {
        all().forEach {
            it.plugins {
                create("grpc")
            }
        }
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

---

## Step 3: Define Protobuf Schema

Create the protobuf directory and schema file:

```bash
mkdir -p src/main/proto
```

**src/main/proto/order_service.proto:**
```protobuf
syntax = "proto3";

package example.order.v1;

option java_package = "com.example.order.grpc";
option java_multiple_files = true;
option java_outer_classname = "OrderServiceProto";

// Order service definition
service OrderService {
  // Get an order by ID
  rpc GetOrder(GetOrderRequest) returns (Order) {}
  
  // Create a new order
  rpc CreateOrder(CreateOrderRequest) returns (Order) {}
}

// Get order request
message GetOrderRequest {
  // Resource name in format: orders/{order_id}
  string name = 1;
}

// Create order request
message CreateOrderRequest {
  // Client-specified order ID (optional)
  string order_id = 1;
  
  // The order to create
  Order order = 2;
}

// Order resource
message Order {
  // Resource name (e.g., "orders/12345")
  string name = 1;
  
  // Customer ID
  string customer_id = 2;
  
  // Order status
  OrderStatus status = 3;
  
  // Total amount
  double total = 4;
  
  // ISO 8601 timestamp
  string create_time = 5;
}

// Order status enum
enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  PENDING = 1;
  PROCESSING = 2;
  SHIPPED = 3;
  DELIVERED = 4;
  CANCELLED = 5;
}
```

---

## Step 4: Generate Java Code

The protobuf plugin generates Java code from your `.proto` files.

### Maven:
```bash
mvn clean compile
```

### Gradle:
```bash
./gradlew clean build
```

**Generated files location:**
- **Maven:** `target/generated-sources/protobuf/`
- **Gradle:** `build/generated/source/proto/main/`

**Files generated:**
- `OrderServiceGrpc.java` - gRPC service stub and base classes
- `Order.java` - Order message class
- `GetOrderRequest.java` - Request message
- `CreateOrderRequest.java` - Request message
- `OrderStatus.java` - Enum

---

## Step 5: Implement the gRPC Service

Create the service implementation:

**src/main/java/com/example/order/grpc/OrderServiceImpl.java:**
```java
package com.example.order.grpc;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);
    
    // In-memory storage (for demo purposes)
    private final Map<String, Order> orders = new ConcurrentHashMap<>();

    @Override
    public void getOrder(GetOrderRequest request, 
                        StreamObserver<Order> responseObserver) {
        log.info("GetOrder called with name: {}", request.getName());
        
        try {
            // Validate request
            if (request.getName() == null || request.getName().isEmpty()) {
                responseObserver.onError(
                    Status.INVALID_ARGUMENT
                        .withDescription("Order name is required")
                        .asRuntimeException()
                );
                return;
            }
            
            // Extract order ID from name (format: orders/{id})
            String orderId = extractOrderId(request.getName());
            
            // Look up order
            Order order = orders.get(orderId);
            
            if (order == null) {
                responseObserver.onError(
                    Status.NOT_FOUND
                        .withDescription("Order not found: " + request.getName())
                        .asRuntimeException()
                );
                return;
            }
            
            // Return order
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error getting order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }

    @Override
    public void createOrder(CreateOrderRequest request,
                           StreamObserver<Order> responseObserver) {
        log.info("CreateOrder called");
        
        try {
            // Validate request
            if (request.getOrder() == null) {
                responseObserver.onError(
                    Status.INVALID_ARGUMENT
                        .withDescription("Order is required")
                        .asRuntimeException()
                );
                return;
            }
            
            if (request.getOrder().getCustomerId() == null || 
                request.getOrder().getCustomerId().isEmpty()) {
                responseObserver.onError(
                    Status.INVALID_ARGUMENT
                        .withDescription("Customer ID is required")
                        .asRuntimeException()
                );
                return;
            }
            
            // Generate order ID if not provided
            String orderId = request.getOrderId();
            if (orderId == null || orderId.isEmpty()) {
                orderId = UUID.randomUUID().toString();
            }
            
            // Check if order already exists
            if (orders.containsKey(orderId)) {
                responseObserver.onError(
                    Status.ALREADY_EXISTS
                        .withDescription("Order already exists: orders/" + orderId)
                        .asRuntimeException()
                );
                return;
            }
            
            // Build order with server-generated fields
            Order order = request.getOrder().toBuilder()
                .setName("orders/" + orderId)
                .setStatus(OrderStatus.PENDING)
                .setCreateTime(Instant.now().toString())
                .build();
            
            // Store order
            orders.put(orderId, order);
            
            log.info("Created order: {}", order.getName());
            
            // Return created order
            responseObserver.onNext(order);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error creating order", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException()
            );
        }
    }
    
    private String extractOrderId(String name) {
        // Extract ID from "orders/{id}" format
        if (name.startsWith("orders/")) {
            return name.substring(7);
        }
        return name;
    }
}
```

---

## Step 6: Configure Application

**src/main/resources/application.yml:**
```yaml
spring:
  application:
    name: order-service

grpc:
  server:
    port: 9090
    # Enable reflection for grpcurl
    reflection-service-enabled: true

logging:
  level:
    com.example.order: DEBUG
    net.devh.boot.grpc: INFO
```

---

## Step 7: Create Main Application Class

**src/main/java/com/example/order/OrderServiceApplication.java:**
```java
package com.example.order;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class OrderServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}
```

---

## Step 8: Run the Application

### Maven:
```bash
mvn spring-boot:run
```

### Gradle:
```bash
./gradlew bootRun
```

**Expected output:**
```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.0)

2024-01-15 10:30:00.123  INFO 12345 --- [main] c.e.o.OrderServiceApplication : Starting OrderServiceApplication
2024-01-15 10:30:01.234  INFO 12345 --- [main] n.d.b.g.s.s.GrpcServerLifecycle : gRPC Server started, listening on address: *, port: 9090
```

---

## Step 9: Test with grpcurl

### List Services
```bash
grpcurl -plaintext localhost:9090 list
```

**Output:**
```
example.order.v1.OrderService
grpc.health.v1.Health
grpc.reflection.v1alpha.ServerReflection
```

### Describe Service
```bash
grpcurl -plaintext localhost:9090 describe example.order.v1.OrderService
```

### Create an Order
```bash
grpcurl -plaintext -d '{
  "order_id": "12345",
  "order": {
    "customer_id": "C1",
    "total": 99.99
  }
}' localhost:9090 example.order.v1.OrderService/CreateOrder
```

**Response:**
```json
{
  "name": "orders/12345",
  "customerId": "C1",
  "status": "PENDING",
  "total": 99.99,
  "createTime": "2024-01-15T10:35:00.123Z"
}
```

### Get the Order
```bash
grpcurl -plaintext -d '{"name": "orders/12345"}' \
  localhost:9090 example.order.v1.OrderService/GetOrder
```

**Response:**
```json
{
  "name": "orders/12345",
  "customerId": "C1",
  "status": "PENDING",
  "total": 99.99,
  "createTime": "2024-01-15T10:35:00.123Z"
}
```

### Test Error Handling
```bash
# Missing order name
grpcurl -plaintext -d '{"name": ""}' \
  localhost:9090 example.order.v1.OrderService/GetOrder

# Non-existent order
grpcurl -plaintext -d '{"name": "orders/99999"}' \
  localhost:9090 example.order.v1.OrderService/GetOrder
```

---

## Step 10: Add a Simple Test

**src/test/java/com/example/order/grpc/OrderServiceImplTest.java:**
```java
package com.example.order.grpc;

import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.inprocess.InProcessChannelBuilder;
import io.grpc.inprocess.InProcessServerBuilder;
import io.grpc.testing.GrpcCleanupRule;
import org.junit.Rule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OrderServiceImplTest {

    @Rule
    public final GrpcCleanupRule grpcCleanup = new GrpcCleanupRule();

    private OrderServiceGrpc.OrderServiceBlockingStub stub;

    @BeforeEach
    void setUp() throws Exception {
        // Generate unique server name
        String serverName = InProcessServerBuilder.generateName();

        // Create in-process server
        grpcCleanup.register(
            InProcessServerBuilder.forName(serverName)
                .directExecutor()
                .addService(new OrderServiceImpl())
                .build()
                .start()
        );

        // Create in-process channel
        stub = OrderServiceGrpc.newBlockingStub(
            grpcCleanup.register(
                InProcessChannelBuilder.forName(serverName)
                    .directExecutor()
                    .build()
            )
        );
    }

    @Test
    void testCreateAndGetOrder() {
        // Create order
        CreateOrderRequest createRequest = CreateOrderRequest.newBuilder()
            .setOrderId("test-123")
            .setOrder(Order.newBuilder()
                .setCustomerId("C1")
                .setTotal(99.99)
                .build())
            .build();

        Order createdOrder = stub.createOrder(createRequest);

        assertNotNull(createdOrder);
        assertEquals("orders/test-123", createdOrder.getName());
        assertEquals("C1", createdOrder.getCustomerId());
        assertEquals(OrderStatus.PENDING, createdOrder.getStatus());
        assertEquals(99.99, createdOrder.getTotal());

        // Get order
        GetOrderRequest getRequest = GetOrderRequest.newBuilder()
            .setName("orders/test-123")
            .build();

        Order retrievedOrder = stub.getOrder(getRequest);

        assertEquals(createdOrder, retrievedOrder);
    }

    @Test
    void testGetNonExistentOrder() {
        GetOrderRequest request = GetOrderRequest.newBuilder()
            .setName("orders/nonexistent")
            .build();

        StatusRuntimeException exception = assertThrows(
            StatusRuntimeException.class,
            () -> stub.getOrder(request)
        );

        assertEquals(Status.Code.NOT_FOUND, exception.getStatus().getCode());
    }

    @Test
    void testCreateDuplicateOrder() {
        // Create first order
        CreateOrderRequest request = CreateOrderRequest.newBuilder()
            .setOrderId("duplicate-123")
            .setOrder(Order.newBuilder()
                .setCustomerId("C1")
                .setTotal(50.0)
                .build())
            .build();

        stub.createOrder(request);

        // Try to create duplicate
        StatusRuntimeException exception = assertThrows(
            StatusRuntimeException.class,
            () -> stub.createOrder(request)
        );

        assertEquals(Status.Code.ALREADY_EXISTS, exception.getStatus().getCode());
    }
}
```

**Run tests:**
```bash
mvn test          # Maven
./gradlew test    # Gradle
```

---

## Next Steps

Congratulations! You've built your first Spring Boot gRPC service. Now explore:

### Essential Topics
1. **[Server Configuration](server-configuration.md)** - Configure port, TLS, keepalive, and limits
2. **[Client Configuration](client-configuration.md)** - Call other gRPC services
3. **[Error Handling](error-handling.md)** - Proper exception mapping to status codes
4. **[Interceptors](interceptors.md)** - Add logging, authentication, and metrics

### Advanced Topics
5. **[Streaming Services](streaming-services.md)** - Server, client, and bidirectional streaming
6. **[Security](security.md)** - TLS, JWT authentication, authorization
7. **[Testing Strategies](testing/unit-testing.md)** - Unit, integration, and E2E testing
8. **[Observability](observability/metrics.md)** - Metrics, tracing, and health checks

---

## Troubleshooting

### Issue: Protobuf compilation fails

**Error:**
```
protoc-jar: protoc version: '3.25.1', detected platform: windows-x86_64
protoc-jar: embedded: bin/3.25.1/protoc-3.25.1-windows-x86_64.exe
protoc-jar: executing: [C:\Users\...\protoc-3.25.1-windows-x86_64.exe, --plugin=...
```

**Solution:**
Make sure `os-maven-plugin` extension is added (Maven) or protobuf plugin is properly configured (Gradle).

### Issue: Server doesn't start

**Error:**
```
Failed to start bean 'grpcServerLifecycle'
```

**Solution:**
1. Check if port 9090 is already in use: `netstat -an | grep 9090`
2. Change port in `application.yml`: `grpc.server.port: 9091`
3. Verify gRPC server dependency is included

### Issue: grpcurl says "unknown service"

**Error:**
```
Failed to list services: server does not support the reflection API
```

**Solution:**
Enable reflection in `application.yml`:
```yaml
grpc:
  server:
    reflection-service-enabled: true
```

### Issue: Generated classes not found

**Error:**
```
cannot find symbol: class OrderServiceGrpc
```

**Solution:**
1. Run code generation: `mvn compile` or `./gradlew build`
2. In IntelliJ: Right-click `target/generated-sources/protobuf` → Mark Directory as → Generated Sources Root
3. In Eclipse: Project → Properties → Java Build Path → Add generated sources folder

---

## Project Structure Summary

```
order-service/
├── pom.xml (or build.gradle.kts)
├── src/
│   ├── main/
│   │   ├── proto/
│   │   │   └── order_service.proto         # Protobuf schema
│   │   ├── java/com/example/order/
│   │   │   ├── OrderServiceApplication.java  # Main class
│   │   │   └── grpc/
│   │   │       └── OrderServiceImpl.java   # gRPC implementation
│   │   └── resources/
│   │       └── application.yml             # Configuration
│   └── test/
│       └── java/com/example/order/grpc/
│           └── OrderServiceImplTest.java   # Tests
└── target/ (or build/)
    └── generated-sources/protobuf/         # Generated Java files
```

---

## Related Documentation

- **[gRPC Design Guide](../../../guides/api-design/grpc/README.md)** - Core gRPC concepts
- **[Protobuf Schema Design](../../../guides/api-design/grpc/protobuf-schema-design.md)** - Schema best practices
- **[Server Configuration](server-configuration.md)** - Detailed server config
- **[Testing Guide](testing/unit-testing.md)** - Comprehensive testing strategies

---

**Navigation:** [← Back to Spring gRPC](README.md) | [Server Configuration →](server-configuration.md)
