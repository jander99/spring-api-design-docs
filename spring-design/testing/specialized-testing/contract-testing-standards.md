# Contract Testing Standards

> **Reading Guide**
> 
> **Reading Time:** 12 minutes | **Level:** Intermediate
> 
> **Prerequisites:** Spring Boot testing basics, understanding of microservices  
> **Key Topics:** Spring Cloud Contract, consumer-driven contracts, API verification

## Overview

Contract tests verify that services interact correctly according to agreed-upon contracts. In microservices, contracts define the expected behavior between service boundaries. This document covers contract testing standards using Spring Cloud Contract.

## Why Contract Testing?

### The Problem

In microservices, integration testing is challenging:
- Services evolve independently
- Full integration tests are slow and fragile
- API changes can break consumers unexpectedly
- Testing against live services is unreliable

### The Solution

Contract testing solves these problems by:
- Defining expected behavior in contracts
- Testing providers and consumers independently
- Catching breaking changes before deployment
- Enabling parallel development of services

## Core Principles

### Consumer-Driven Contracts

Contracts should reflect what consumers actually need, not what providers want to offer.

```
Consumer Team                    Provider Team
     │                               │
     │  1. Define contract needs     │
     ├──────────────────────────────►│
     │                               │
     │  2. Contract agreed upon      │
     │◄──────────────────────────────┤
     │                               │
     │  3. Both teams test           │
     │     against contract          │
     ▼                               ▼
```

### Key Principles

1. **Consumer-Driven**: Define contracts from the consumer perspective
2. **Provider Verification**: Verify provider meets defined contracts
3. **Independent Evolution**: Allow services to evolve independently
4. **Version Management**: Track contract versions alongside API versions

## Spring Cloud Contract Setup

### Dependencies

```xml
<!-- Provider side -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-contract-verifier</artifactId>
    <scope>test</scope>
</dependency>

<!-- Consumer side -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-contract-stub-runner</artifactId>
    <scope>test</scope>
</dependency>
```

### Build Plugin Configuration

```xml
<plugin>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-contract-maven-plugin</artifactId>
    <version>${spring-cloud-contract.version}</version>
    <extensions>true</extensions>
    <configuration>
        <testFramework>JUNIT5</testFramework>
        <baseClassForTests>
            com.example.contracts.BaseContractTest
        </baseClassForTests>
    </configuration>
</plugin>
```

## Contract File Structure

### Directory Organization

```
src/test/resources/contracts/
├── v1/                          # API version
│   ├── orders/                  # Resource/domain
│   │   ├── shouldGetOrder.yml
│   │   ├── shouldCreateOrder.yml
│   │   └── shouldReturnNotFound.yml
│   └── customers/
│       ├── shouldGetCustomer.yml
│       └── shouldCreateCustomer.yml
└── v2/
    └── orders/
        └── shouldGetOrderV2.yml
```

### Naming Conventions

| Action | File Name Pattern | Example |
|--------|-------------------|---------|
| GET single | `shouldGet{Resource}.yml` | `shouldGetOrder.yml` |
| GET list | `shouldList{Resources}.yml` | `shouldListOrders.yml` |
| POST | `shouldCreate{Resource}.yml` | `shouldCreateOrder.yml` |
| PUT | `shouldUpdate{Resource}.yml` | `shouldUpdateOrder.yml` |
| DELETE | `shouldDelete{Resource}.yml` | `shouldDeleteOrder.yml` |
| Error case | `shouldReturn{Error}.yml` | `shouldReturnNotFound.yml` |

## Writing Contracts

### Basic GET Contract

```yaml
# contracts/v1/orders/shouldGetOrder.yml
description: Should return an order by ID
name: shouldGetOrderById
request:
  method: GET
  url: /v1/orders/ord-12345
  headers:
    Accept: application/json
    Authorization: Bearer valid-token
response:
  status: 200
  headers:
    Content-Type: application/json
  body:
    id: "ord-12345"
    customerId: "cust-67890"
    status: "PROCESSING"
    total: 149.99
    items:
      - productId: "prod-111"
        quantity: 2
        price: 74.99
  matchers:
    body:
      - path: $.id
        type: by_regex
        value: "ord-[a-z0-9]+"
      - path: $.total
        type: by_regex
        predefined: number
```

### POST Contract with Request Body

```yaml
# contracts/v1/orders/shouldCreateOrder.yml
description: Should create a new order
name: shouldCreateOrder
request:
  method: POST
  url: /v1/orders
  headers:
    Content-Type: application/json
    Accept: application/json
    Authorization: Bearer valid-token
  body:
    customerId: "cust-67890"
    items:
      - productId: "prod-111"
        quantity: 2
  matchers:
    body:
      - path: $.customerId
        type: by_regex
        value: "cust-[a-z0-9]+"
response:
  status: 201
  headers:
    Content-Type: application/json
    Location: /v1/orders/ord-new123
  body:
    id: "ord-new123"
    customerId: "cust-67890"
    status: "PENDING"
```

### Error Response Contract

```yaml
# contracts/v1/orders/shouldReturnNotFound.yml
description: Should return 404 when order not found
name: shouldReturnNotFoundForMissingOrder
request:
  method: GET
  url: /v1/orders/ord-nonexistent
  headers:
    Accept: application/json
    Authorization: Bearer valid-token
response:
  status: 404
  headers:
    Content-Type: application/problem+json
  body:
    type: "https://api.example.com/problems/not-found"
    title: "Order Not Found"
    status: 404
    detail: "Order with ID ord-nonexistent was not found"
    instance: "/v1/orders/ord-nonexistent"
```

### Validation Error Contract

```yaml
# contracts/v1/orders/shouldReturnValidationError.yml
description: Should return validation error for invalid request
name: shouldReturnValidationError
request:
  method: POST
  url: /v1/orders
  headers:
    Content-Type: application/json
    Accept: application/json
    Authorization: Bearer valid-token
  body:
    customerId: ""
    items: []
response:
  status: 400
  headers:
    Content-Type: application/problem+json
  body:
    type: "https://api.example.com/problems/validation-error"
    title: "Validation Error"
    status: 400
    errors:
      - field: "customerId"
        code: "REQUIRED"
        message: "Customer ID is required"
      - field: "items"
        code: "NOT_EMPTY"
        message: "Order must have at least one item"
```

## Provider-Side Testing

### Base Test Class

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@AutoConfigureRestDocs
public abstract class BaseContractTest {

    @Autowired
    protected MockMvc mockMvc;

    @MockBean
    protected OrderRepository orderRepository;

    @MockBean
    protected OrderService orderService;

    @BeforeEach
    void setup() {
        RestAssuredMockMvc.mockMvc(mockMvc);
        setupTestData();
    }

    protected void setupTestData() {
        // Setup common test data for all contracts
        Order testOrder = Order.builder()
            .id("ord-12345")
            .customerId("cust-67890")
            .status(OrderStatus.PROCESSING)
            .total(new BigDecimal("149.99"))
            .items(List.of(
                OrderItem.builder()
                    .productId("prod-111")
                    .quantity(2)
                    .price(new BigDecimal("74.99"))
                    .build()
            ))
            .build();

        when(orderService.findById("ord-12345"))
            .thenReturn(Optional.of(testOrder));
            
        when(orderService.findById("ord-nonexistent"))
            .thenReturn(Optional.empty());
    }
}
```

### Resource-Specific Base Class

```java
public abstract class OrderContractBase extends BaseContractTest {

    @BeforeEach
    void setupOrderContracts() {
        // Setup for order-specific contracts
        when(orderService.create(any(CreateOrderRequest.class)))
            .thenAnswer(invocation -> {
                CreateOrderRequest request = invocation.getArgument(0);
                return Order.builder()
                    .id("ord-new123")
                    .customerId(request.getCustomerId())
                    .status(OrderStatus.PENDING)
                    .build();
            });
    }
}
```

### Generated Test Verification

Spring Cloud Contract generates tests like:

```java
// Auto-generated - do not modify
public class OrderTest extends OrderContractBase {

    @Test
    public void validate_shouldGetOrderById() throws Exception {
        // given:
        MockMvcRequestSpecification request = given()
            .header("Accept", "application/json")
            .header("Authorization", "Bearer valid-token");

        // when:
        ResponseOptions response = given().spec(request)
            .get("/v1/orders/ord-12345");

        // then:
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.header("Content-Type"))
            .contains("application/json");
        
        DocumentContext parsedJson = JsonPath.parse(response.getBody().asString());
        assertThatJson(parsedJson).field("['id']").matches("ord-[a-z0-9]+");
        assertThatJson(parsedJson).field("['status']").isEqualTo("PROCESSING");
    }
}
```

## Consumer-Side Testing

### Using Stub Runner

```java
@SpringBootTest
@AutoConfigureStubRunner(
    ids = "com.example:order-service:+:stubs:8080",
    stubsMode = StubRunnerProperties.StubsMode.LOCAL
)
class OrderClientTest {

    @Autowired
    private OrderClient orderClient;

    @Test
    void shouldGetOrder() {
        // Given the stub is running with the contract
        
        // When
        Order order = orderClient.getOrder("ord-12345");
        
        // Then
        assertThat(order).isNotNull();
        assertThat(order.getId()).isEqualTo("ord-12345");
        assertThat(order.getStatus()).isEqualTo("PROCESSING");
    }

    @Test
    void shouldHandleNotFound() {
        // Given the stub is running with the not found contract
        
        // When/Then
        assertThatThrownBy(() -> orderClient.getOrder("ord-nonexistent"))
            .isInstanceOf(OrderNotFoundException.class);
    }
}
```

### Stub Mode Options

```java
// From local Maven repository
@AutoConfigureStubRunner(
    ids = "com.example:order-service:+:stubs",
    stubsMode = StubRunnerProperties.StubsMode.LOCAL
)

// From remote artifact repository
@AutoConfigureStubRunner(
    ids = "com.example:order-service:1.0.0:stubs",
    stubsMode = StubRunnerProperties.StubsMode.REMOTE,
    repositoryRoot = "https://repo.example.com/maven"
)

// From classpath (for testing)
@AutoConfigureStubRunner(
    ids = "com.example:order-service",
    stubsMode = StubRunnerProperties.StubsMode.CLASSPATH
)
```

## Contract Versioning

### Version in Path Structure

```
contracts/
├── v1/
│   └── orders/
│       └── shouldGetOrder.yml    # Current version
└── v2/
    └── orders/
        └── shouldGetOrderV2.yml  # New version with changes
```

### Handling Breaking Changes

```yaml
# contracts/v2/orders/shouldGetOrderV2.yml
description: Should return order with new fields (v2)
name: shouldGetOrderV2
request:
  method: GET
  url: /v2/orders/ord-12345
  headers:
    Accept: application/json
response:
  status: 200
  body:
    id: "ord-12345"
    # New field in v2
    orderNumber: "ORD-2024-001234"
    customerId: "cust-67890"
    status: "PROCESSING"
    # Changed structure in v2
    pricing:
      subtotal: 149.99
      tax: 12.00
      total: 161.99
```

### Deprecation Contract

```yaml
# contracts/v1/orders/shouldGetOrderDeprecated.yml
description: V1 GET order (deprecated - use v2)
name: shouldGetOrderDeprecated
request:
  method: GET
  url: /v1/orders/ord-12345
response:
  status: 200
  headers:
    Deprecation: "true"
    Sunset: "2025-06-01"
    Link: "</v2/orders/ord-12345>; rel=\"successor-version\""
  body:
    id: "ord-12345"
    customerId: "cust-67890"
```

## CI/CD Integration

### Pipeline Configuration

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  provider-verification:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Run contract verification
        run: ./mvnw verify -Pcontract-tests
      
      - name: Publish stubs
        if: github.ref == 'refs/heads/main'
        run: ./mvnw deploy -DskipTests

  consumer-tests:
    runs-on: ubuntu-latest
    needs: provider-verification
    steps:
      - uses: actions/checkout@v4
      
      - name: Run consumer contract tests
        run: ./mvnw test -Pconsumer-contract-tests
```

### Maven Profile

```xml
<profile>
    <id>contract-tests</id>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-contract-maven-plugin</artifactId>
                <configuration>
                    <testFramework>JUNIT5</testFramework>
                    <baseClassForTests>
                        com.example.contracts.BaseContractTest
                    </baseClassForTests>
                </configuration>
            </plugin>
        </plugins>
    </build>
</profile>
```

## Common Anti-Patterns

### 1. Provider-Driven Contracts

**Wrong**: Provider defines what they want to offer
```yaml
# Provider just exports everything
response:
  body:
    internalId: 12345
    legacyCode: "ABC"
    debugInfo: "..."
```

**Right**: Consumer defines what they need
```yaml
# Consumer specifies only needed fields
response:
  body:
    id: "ord-12345"
    status: "PROCESSING"
```

### 2. Over-Specified Contracts

**Wrong**: Testing exact implementation details
```yaml
matchers:
  body:
    - path: $.createdAt
      type: by_equality
      value: "2024-01-15T10:30:00.000Z"  # Too specific
```

**Right**: Testing behavior patterns
```yaml
matchers:
  body:
    - path: $.createdAt
      type: by_regex
      predefined: iso_datetime  # Flexible
```

### 3. Missing Error Cases

**Wrong**: Only testing happy paths

**Right**: Include error scenarios
```yaml
# Also include:
# - shouldReturnNotFound.yml
# - shouldReturnValidationError.yml
# - shouldReturnUnauthorized.yml
```

## Best Practices Summary

1. **Start with consumer needs** - Let consumers define contract requirements
2. **Include error cases** - Test 4xx and 5xx responses
3. **Use matchers wisely** - Be specific enough but not too rigid
4. **Version contracts** - Track alongside API versions
5. **Automate in CI/CD** - Block breaking changes before deployment
6. **Keep contracts focused** - One scenario per contract file
7. **Document contracts** - Add descriptions explaining the scenario

## Related Documentation

- [API Integration Testing](../integration-testing/api-integration-testing.md)
- [Error Response Standards](../../../api-design/request-response/error-response-standards.md)
- [API Version Strategy](../../../api-design/foundations/api-version-strategy.md)
