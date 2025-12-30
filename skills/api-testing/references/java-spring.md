# Java/Spring API Testing Implementation

## Testing Tools

| Tool | Purpose | Use Case |
|------|---------|----------|
| `@WebMvcTest` | Controller slice test | Unit testing controllers |
| `MockMvc` | HTTP request simulation | Imperative controller tests |
| `WebTestClient` | Reactive HTTP testing | WebFlux controller tests |
| `@SpringBootTest` | Full context test | Integration tests |
| `TestRestTemplate` | HTTP client for tests | Integration tests |
| `Spring Cloud Contract` | Contract testing | Consumer-driven contracts |
| `Testcontainers` | Real databases | Database integration tests |

## Controller Unit Testing

### MockMvc for Imperative Controllers

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void shouldReturn201WhenOrderCreated() throws Exception {
        // Arrange
        CreateOrderRequest request = createValidRequest();
        OrderDto orderDto = createOrderDto();
        when(orderService.createOrder(any())).thenReturn(orderDto);
        
        // Act & Assert
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.id").value(orderDto.getId().toString()))
            .andExpect(jsonPath("$.status").value("CREATED"));
    }
    
    @Test
    void shouldReturn400WhenCustomerIdMissing() throws Exception {
        // Arrange
        CreateOrderRequest request = CreateOrderRequest.builder()
            .customerId(null)  // Missing required field
            .build();
        
        // Act & Assert
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").value("Bad Request"))
            .andExpect(jsonPath("$.violations[*].field").value(hasItem("customerId")));
    }
    
    @Test
    void shouldReturn404WhenOrderNotFound() throws Exception {
        // Arrange
        UUID orderId = UUID.randomUUID();
        when(orderService.getOrder(orderId))
            .thenThrow(new OrderNotFoundException(orderId));
        
        // Act & Assert
        mockMvc.perform(get("/v1/orders/{orderId}", orderId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").value("Not Found"));
    }
}
```

### WebTestClient for Reactive Controllers

```java
@WebFluxTest(ReactiveOrderController.class)
class ReactiveOrderControllerTest {

    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private ReactiveOrderService orderService;
    
    @Test
    void shouldReturn201WhenOrderCreated() {
        // Arrange
        CreateOrderRequest request = createValidRequest();
        OrderDto orderDto = createOrderDto();
        when(orderService.createOrder(any())).thenReturn(Mono.just(orderDto));
        
        // Act & Assert
        webTestClient.post()
            .uri("/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .exchange()
            .expectStatus().isCreated()
            .expectHeader().exists("Location")
            .expectBody()
            .jsonPath("$.id").isEqualTo(orderDto.getId().toString())
            .jsonPath("$.status").isEqualTo("CREATED");
    }
    
    @Test
    void shouldStreamOrdersAsNdjson() {
        // Arrange
        when(orderService.streamOrders())
            .thenReturn(Flux.just(order1, order2, order3));
        
        // Act & Assert
        webTestClient.get()
            .uri("/v1/orders/stream")
            .accept(MediaType.APPLICATION_NDJSON)
            .exchange()
            .expectStatus().isOk()
            .expectHeader().contentType(MediaType.APPLICATION_NDJSON)
            .expectBodyList(OrderResponse.class)
            .hasSize(3);
    }
}
```

## Integration Testing

### Full Application Context

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderApiIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @MockBean
    private PaymentService paymentService;  // Mock external service
    
    @Test
    void shouldCreateOrderEndToEnd() {
        // Arrange
        CreateOrderRequest request = createValidRequest();
        when(paymentService.process(any())).thenReturn(PaymentResult.success());
        
        // Act
        ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
            "/v1/orders", request, OrderResponse.class);
        
        // Assert Response
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getId()).isNotNull();
        assertThat(response.getHeaders().getLocation()).isNotNull();
        
        // Assert Database
        Order savedOrder = orderRepository.findById(response.getBody().getId())
            .orElseThrow();
        assertThat(savedOrder.getCustomerId()).isEqualTo(request.getCustomerId());
    }
    
    @Test
    void shouldReturnPaginatedOrders() {
        // Arrange
        UUID customerId = UUID.randomUUID();
        IntStream.range(0, 25).forEach(i -> 
            orderRepository.save(createOrder(customerId)));
        
        // Act
        ResponseEntity<PagedResponse<OrderResponse>> response = restTemplate.exchange(
            "/v1/orders?customerId={id}&page=0&size=10",
            HttpMethod.GET,
            null,
            new ParameterizedTypeReference<>() {},
            customerId);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getContent()).hasSize(10);
        assertThat(response.getBody().getTotalElements()).isEqualTo(25);
        assertThat(response.getBody().getTotalPages()).isEqualTo(3);
    }
}
```

### Security Testing

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderApiSecurityTest {

    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldReturn401WithoutToken() {
        ResponseEntity<ErrorResponse> response = restTemplate.getForEntity(
            "/v1/orders/123", ErrorResponse.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    
    @Test
    void shouldReturn403WithInsufficientPermissions() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(generateToken("user", List.of("ROLE_USER")));
        
        ResponseEntity<ErrorResponse> response = restTemplate.exchange(
            "/v1/admin/orders/123",
            HttpMethod.DELETE,
            new HttpEntity<>(headers),
            ErrorResponse.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
    
    @Test
    void shouldAllowAccessWithValidToken() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(generateToken("user", List.of("ROLE_USER")));
        
        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            "/v1/orders/123",
            HttpMethod.GET,
            new HttpEntity<>(headers),
            OrderResponse.class);
        
        assertThat(response.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.NOT_FOUND);
    }
}
```

## Contract Testing with Spring Cloud Contract

### Contract Definition

```yaml
# src/test/resources/contracts/v1/order/get_order.yml
description: "Should return order by ID"
name: "get_order_by_id"
request:
  method: GET
  url: /v1/orders/123
  headers:
    Accept: application/json
response:
  status: 200
  headers:
    Content-Type: application/json
  body:
    id: 123
    customerId: "customer-456"
    status: "PENDING"
    totalAmount: 99.95
  matchers:
    body:
      - path: $.id
        type: by_regex
        predefined: number
      - path: $.customerId
        type: by_regex
        regex: "customer-[0-9]+"
      - path: $.status
        type: by_regex
        regex: "PENDING|PROCESSING|COMPLETED|CANCELLED"
```

### Provider Base Test Class

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@DirtiesContext
public abstract class ContractVerifierBase {

    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService;
    
    @BeforeEach
    void setup() {
        RestAssuredMockMvc.mockMvc(mockMvc);
        
        // Setup mock responses for contracts
        when(orderService.getOrder(123L))
            .thenReturn(Order.builder()
                .id(123L)
                .customerId("customer-456")
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.valueOf(99.95))
                .build());
    }
}
```

### Maven Configuration

```xml
<plugin>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-contract-maven-plugin</artifactId>
    <version>${spring-cloud-contract.version}</version>
    <extensions>true</extensions>
    <configuration>
        <baseClassForTests>
            com.example.order.ContractVerifierBase
        </baseClassForTests>
        <contractsDirectory>
            ${project.basedir}/src/test/resources/contracts
        </contractsDirectory>
    </configuration>
</plugin>
```

### Consumer Stub Test

```java
@SpringBootTest
@AutoConfigureStubRunner(
    ids = "com.example:order-service:+:stubs:8080",
    stubsMode = StubRunnerProperties.StubsMode.LOCAL)
class OrderClientContractTest {

    @Autowired
    private OrderClient orderClient;
    
    @Test
    void shouldGetOrderFromStub() {
        // Act
        OrderResponse order = orderClient.getOrder(123L);
        
        // Assert
        assertThat(order.getId()).isEqualTo(123L);
        assertThat(order.getCustomerId()).startsWith("customer-");
        assertThat(order.getStatus()).isIn("PENDING", "PROCESSING", "COMPLETED");
    }
}
```

## Testing Error Responses

```java
@WebMvcTest(OrderController.class)
class OrderControllerErrorTest {

    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void shouldReturnRfc7807ForValidationError() throws Exception {
        CreateOrderRequest request = CreateOrderRequest.builder().build();
        
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").value("Bad Request"))
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.violations").isArray());
    }
    
    @Test
    void shouldReturnRfc7807ForNotFound() throws Exception {
        when(orderService.getOrder(any()))
            .thenThrow(new OrderNotFoundException(UUID.randomUUID()));
        
        mockMvc.perform(get("/v1/orders/{id}", UUID.randomUUID()))
            .andExpect(status().isNotFound())
            .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").value("Not Found"))
            .andExpect(jsonPath("$.status").value(404));
    }
    
    @Test
    void shouldReturnRfc7807ForBusinessError() throws Exception {
        when(orderService.createOrder(any()))
            .thenThrow(new InsufficientInventoryException("product-123"));
        
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createValidRequest())))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.status").value(422));
    }
}
```

## Testing Headers and CORS

```java
@WebMvcTest(OrderController.class)
class OrderControllerHeadersTest {

    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void shouldIncludeCorrelationIdInResponse() throws Exception {
        mockMvc.perform(get("/v1/orders/123")
                .header("X-Request-ID", "test-correlation-id"))
            .andExpect(header().string("X-Request-ID", "test-correlation-id"));
    }
    
    @Test
    void shouldHandleCorsPreflightRequest() throws Exception {
        mockMvc.perform(options("/v1/orders")
                .header("Origin", "https://example.com")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "Content-Type"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "https://example.com"))
            .andExpect(header().exists("Access-Control-Allow-Methods"));
    }
}
```

## Test Utilities

### Request/Response Builders

```java
public class OrderTestUtils {

    public static CreateOrderRequest validRequest() {
        return CreateOrderRequest.builder()
            .customerId(UUID.randomUUID())
            .items(List.of(OrderItemRequest.builder()
                .productId(UUID.randomUUID())
                .quantity(2)
                .build()))
            .build();
    }
    
    public static Order testOrder() {
        return Order.builder()
            .id(UUID.randomUUID())
            .customerId(UUID.randomUUID())
            .status(OrderStatus.CREATED)
            .totalAmount(BigDecimal.valueOf(99.95))
            .createdAt(Instant.now())
            .build();
    }
}
```

### Custom JSON Matchers

```java
public class JsonPathMatchers {

    public static ResultMatcher hasValidUuid(String path) {
        return jsonPath(path).value(
            matchesPattern("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"));
    }
    
    public static ResultMatcher hasIso8601Timestamp(String path) {
        return jsonPath(path).value(
            matchesPattern("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.*"));
    }
}
```

## Key Annotations Summary

| Annotation | Purpose |
|------------|---------|
| `@WebMvcTest` | Load only web layer for unit tests |
| `@WebFluxTest` | Load only WebFlux layer |
| `@SpringBootTest` | Load full application context |
| `@MockBean` | Replace bean with Mockito mock |
| `@Testcontainers` | Enable Docker containers |
| `@DynamicPropertySource` | Set test properties dynamically |
| `@AutoConfigureMockMvc` | Configure MockMvc automatically |
| `@AutoConfigureStubRunner` | Configure contract stubs |
