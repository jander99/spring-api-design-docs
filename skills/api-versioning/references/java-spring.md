# Java/Spring API Versioning Implementation

> **Note**: Spring Boot does not have built-in versioning support. These patterns show common approaches.

## URL Path Versioning (Recommended)

### Separate Controllers per Version

```java
// V1 Controller
@RestController
@RequestMapping("/v1/orders")
public class OrderControllerV1 {
    
    @GetMapping("/{orderId}")
    public OrderResponseV1 getOrder(@PathVariable UUID orderId) {
        return orderService.getOrderV1(orderId);
    }
}

// V2 Controller
@RestController
@RequestMapping("/v2/orders")
public class OrderControllerV2 {
    
    @GetMapping("/{orderId}")
    public OrderResponseV2 getOrder(@PathVariable UUID orderId) {
        return orderService.getOrderV2(orderId);
    }
}
```

### Shared Service with Version-Specific Mappers

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderRepository repository;
    private final OrderMapperV1 mapperV1;
    private final OrderMapperV2 mapperV2;
    
    public OrderResponseV1 getOrderV1(UUID orderId) {
        Order order = repository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
        return mapperV1.toResponse(order);
    }
    
    public OrderResponseV2 getOrderV2(UUID orderId) {
        Order order = repository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
        return mapperV2.toResponse(order);
    }
}
```

## Deprecation Headers Filter

### Servlet Filter for Deprecation Headers

```java
@Component
public class DeprecationHeaderFilter implements Filter {
    
    private final VersionConfig versionConfig;
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                         FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String path = httpRequest.getRequestURI();
        
        // Check if path is deprecated
        DeprecationInfo deprecation = versionConfig.getDeprecationInfo(path);
        
        if (deprecation != null) {
            httpResponse.addHeader("Deprecation", "true");
            httpResponse.addHeader("Sunset", deprecation.getSunsetDate());
            httpResponse.addHeader("Link", 
                String.format("<%s>; rel=\"successor-version\"", 
                    deprecation.getSuccessorUrl()));
            httpResponse.addHeader("Warning", 
                String.format("299 - \"%s\"", deprecation.getMessage()));
        }
        
        chain.doFilter(request, response);
    }
}
```

### WebFlux Filter for Deprecation

```java
@Component
public class ReactiveDeprecationFilter implements WebFilter {
    
    private final VersionConfig versionConfig;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        
        DeprecationInfo deprecation = versionConfig.getDeprecationInfo(path);
        
        if (deprecation != null) {
            exchange.getResponse().getHeaders()
                .add("Deprecation", "true");
            exchange.getResponse().getHeaders()
                .add("Sunset", deprecation.getSunsetDate());
            exchange.getResponse().getHeaders()
                .add("Link", 
                    String.format("<%s>; rel=\"successor-version\"", 
                        deprecation.getSuccessorUrl()));
        }
        
        return chain.filter(exchange);
    }
}
```

## Deprecation Configuration

```java
@Configuration
@ConfigurationProperties(prefix = "api.deprecation")
@Data
public class VersionConfig {
    
    private Map<String, DeprecationInfo> deprecated = new HashMap<>();
    
    public DeprecationInfo getDeprecationInfo(String path) {
        return deprecated.entrySet().stream()
            .filter(entry -> path.startsWith(entry.getKey()))
            .map(Map.Entry::getValue)
            .findFirst()
            .orElse(null);
    }
}

@Data
public class DeprecationInfo {
    private String sunsetDate;
    private String successorUrl;
    private String message;
}
```

```yaml
# application.yml
api:
  deprecation:
    deprecated:
      /v1/orders:
        sunset-date: "Sat, 31 Dec 2025 23:59:59 GMT"
        successor-url: "/v2/orders"
        message: "Use v2 API. Removal date: 2025-12-31"
      /v1/customers:
        sunset-date: "Sat, 30 Jun 2025 23:59:59 GMT"
        successor-url: "/v2/customers"
        message: "Use v2 API. Removal date: 2025-06-30"
```

## Gone (410) Handler for Sunset Endpoints

```java
@Component
public class SunsetEndpointFilter implements Filter {
    
    private final VersionConfig versionConfig;
    private final ObjectMapper objectMapper;
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                         FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String path = httpRequest.getRequestURI();
        
        if (versionConfig.isSunset(path)) {
            httpResponse.setStatus(HttpStatus.GONE.value());
            httpResponse.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            
            ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.GONE);
            problem.setTitle("API Version Removed");
            problem.setDetail("This API version has been removed. Please use the successor version.");
            problem.setProperty("successor", versionConfig.getSuccessorUrl(path));
            problem.setProperty("documentation", versionConfig.getDocsUrl(path));
            
            httpResponse.getWriter().write(objectMapper.writeValueAsString(problem));
            return;
        }
        
        chain.doFilter(request, response);
    }
}
```

## Header-Based Versioning (Alternative)

### Custom Argument Resolver

```java
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface ApiVersion {
    int defaultVersion() default 1;
}

@Component
public class ApiVersionArgumentResolver implements HandlerMethodArgumentResolver {
    
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(ApiVersion.class);
    }
    
    @Override
    public Object resolveArgument(MethodParameter parameter, 
                                   ModelAndViewContainer mavContainer,
                                   NativeWebRequest webRequest, 
                                   WebDataBinderFactory binderFactory) {
        
        String versionHeader = webRequest.getHeader("API-Version");
        ApiVersion annotation = parameter.getParameterAnnotation(ApiVersion.class);
        
        if (versionHeader != null) {
            return Integer.parseInt(versionHeader);
        }
        return annotation.defaultVersion();
    }
}
```

### Usage in Controller

```java
@RestController
@RequestMapping("/orders")
public class OrderController {
    
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrder(
            @PathVariable UUID orderId,
            @ApiVersion int version) {
        
        return switch (version) {
            case 1 -> ResponseEntity.ok(orderService.getOrderV1(orderId));
            case 2 -> ResponseEntity.ok(orderService.getOrderV2(orderId));
            default -> ResponseEntity.badRequest()
                .body("Unsupported API version: " + version);
        };
    }
}
```

## Version Usage Metrics

```java
@Component
@RequiredArgsConstructor
public class VersionMetricsFilter implements Filter {
    
    private final MeterRegistry meterRegistry;
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                         FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String path = httpRequest.getRequestURI();
        
        // Extract version from path
        String version = extractVersion(path);  // e.g., "v1", "v2"
        
        meterRegistry.counter("api.requests",
            "version", version,
            "path", path,
            "method", httpRequest.getMethod()
        ).increment();
        
        chain.doFilter(request, response);
    }
    
    private String extractVersion(String path) {
        if (path.contains("/v1/")) return "v1";
        if (path.contains("/v2/")) return "v2";
        return "unknown";
    }
}
```

## Response DTOs per Version

```java
// V1 Response - legacy format
@Data
public class OrderResponseV1 {
    private String orderId;
    private String customerId;
    private String status;
    private String total;  // String in v1
    private String created_at;  // Snake case in v1
}

// V2 Response - improved format
@Data
public class OrderResponseV2 {
    private UUID id;
    private UUID customerId;
    private OrderStatus status;
    private BigDecimal total;  // Proper type in v2
    private Instant createdAt;  // Camel case in v2
    private List<OrderItemResponse> items;  // New field in v2
}
```

## Mappers for Version Conversion

```java
@Component
public class OrderMapperV1 {
    
    public OrderResponseV1 toResponse(Order order) {
        OrderResponseV1 response = new OrderResponseV1();
        response.setOrderId(order.getId().toString());
        response.setCustomerId(order.getCustomerId().toString());
        response.setStatus(order.getStatus().name());
        response.setTotal(order.getTotal().toString());
        response.setCreated_at(order.getCreatedAt().toString());
        return response;
    }
}

@Component
public class OrderMapperV2 {
    
    public OrderResponseV2 toResponse(Order order) {
        OrderResponseV2 response = new OrderResponseV2();
        response.setId(order.getId());
        response.setCustomerId(order.getCustomerId());
        response.setStatus(order.getStatus());
        response.setTotal(order.getTotal());
        response.setCreatedAt(order.getCreatedAt());
        response.setItems(mapItems(order.getItems()));
        return response;
    }
}
```

## Testing Version Endpoints

```java
@WebMvcTest({OrderControllerV1.class, OrderControllerV2.class})
class OrderVersioningTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void v1Endpoint_returnsV1Format() throws Exception {
        mockMvc.perform(get("/v1/orders/{id}", orderId))
            .andExpect(status().isOk())
            .andExpect(header().exists("Deprecation"))
            .andExpect(header().string("Deprecation", "true"))
            .andExpect(jsonPath("$.orderId").exists())
            .andExpect(jsonPath("$.created_at").exists());  // Snake case
    }
    
    @Test
    void v2Endpoint_returnsV2Format() throws Exception {
        mockMvc.perform(get("/v2/orders/{id}", orderId))
            .andExpect(status().isOk())
            .andExpect(header().doesNotExist("Deprecation"))
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.createdAt").exists());  // Camel case
    }
    
    @Test
    void sunsetEndpoint_returns410() throws Exception {
        mockMvc.perform(get("/v0/orders/{id}", orderId))  // Sunset version
            .andExpect(status().isGone())
            .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.successor").exists());
    }
}
```
