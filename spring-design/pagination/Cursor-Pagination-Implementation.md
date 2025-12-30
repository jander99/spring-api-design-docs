# Cursor Pagination Implementation in Spring Boot

This document provides Java/Spring Boot implementation patterns for cursor-based pagination.

## Overview

Cursor-based pagination provides consistent, performant navigation through large datasets. This guide covers Spring Boot implementations for both imperative (Spring MVC) and reactive (WebFlux) approaches.

## Basic Cursor Implementation

### Cursor Data Transfer Object

```java
public record CursorInfo(
    String current,
    String next,
    String previous,
    boolean hasNext,
    boolean hasPrevious
) {
    public static CursorInfo empty() {
        return new CursorInfo(null, null, null, false, false);
    }
}

public record CursorPageResponse<T>(
    List<T> data,
    CursorMeta meta
) {}

public record CursorMeta(CursorInfo cursor) {}
```

### Cursor Encoder/Decoder

```java
@Component
public class CursorCodec {
    
    private final ObjectMapper objectMapper;
    
    public CursorCodec(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }
    
    public String encode(Map<String, Object> cursorData) {
        try {
            String json = objectMapper.writeValueAsString(cursorData);
            return Base64.getUrlEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
        } catch (JsonProcessingException e) {
            throw new CursorEncodingException("Failed to encode cursor", e);
        }
    }
    
    public Map<String, Object> decode(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(cursor);
            String json = new String(decoded, StandardCharsets.UTF_8);
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new InvalidCursorException("Invalid cursor format", e);
        }
    }
}
```

### Custom Exceptions

```java
public class InvalidCursorException extends RuntimeException {
    public InvalidCursorException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class CursorEncodingException extends RuntimeException {
    public CursorEncodingException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

## Spring Data JPA Implementation

### Repository with Cursor Support

```java
public interface OrderRepository extends JpaRepository<Order, String> {
    
    // Forward pagination
    @Query("""
        SELECT o FROM Order o 
        WHERE o.createdDate < :createdDate 
           OR (o.createdDate = :createdDate AND o.id > :id)
        ORDER BY o.createdDate DESC, o.id ASC
        """)
    List<Order> findNextPage(
        @Param("createdDate") Instant createdDate,
        @Param("id") String id,
        Pageable pageable
    );
    
    // Backward pagination
    @Query("""
        SELECT o FROM Order o 
        WHERE o.createdDate > :createdDate 
           OR (o.createdDate = :createdDate AND o.id < :id)
        ORDER BY o.createdDate ASC, o.id DESC
        """)
    List<Order> findPreviousPage(
        @Param("createdDate") Instant createdDate,
        @Param("id") String id,
        Pageable pageable
    );
    
    // First page (no cursor)
    @Query("SELECT o FROM Order o ORDER BY o.createdDate DESC, o.id ASC")
    List<Order> findFirstPage(Pageable pageable);
}
```

### Pagination Service

```java
@Service
public class OrderPaginationService {
    
    private final OrderRepository orderRepository;
    private final CursorCodec cursorCodec;
    
    public OrderPaginationService(OrderRepository orderRepository, CursorCodec cursorCodec) {
        this.orderRepository = orderRepository;
        this.cursorCodec = cursorCodec;
    }
    
    public CursorPageResponse<Order> getOrders(String cursor, int size, String direction) {
        int fetchSize = size + 1; // Fetch one extra to detect hasMore
        Pageable pageable = PageRequest.of(0, fetchSize);
        
        List<Order> orders;
        
        if (cursor == null) {
            orders = orderRepository.findFirstPage(pageable);
        } else {
            Map<String, Object> cursorData = cursorCodec.decode(cursor);
            Instant createdDate = Instant.parse((String) cursorData.get("createdDate"));
            String id = (String) cursorData.get("id");
            
            if ("prev".equals(direction)) {
                orders = orderRepository.findPreviousPage(createdDate, id, pageable);
                Collections.reverse(orders); // Restore natural order
            } else {
                orders = orderRepository.findNextPage(createdDate, id, pageable);
            }
        }
        
        boolean hasMore = orders.size() > size;
        List<Order> pageData = hasMore ? orders.subList(0, size) : orders;
        
        CursorInfo cursorInfo = buildCursorInfo(pageData, direction, hasMore, cursor != null);
        
        return new CursorPageResponse<>(pageData, new CursorMeta(cursorInfo));
    }
    
    private CursorInfo buildCursorInfo(List<Order> data, String direction, boolean hasMore, boolean hadCursor) {
        if (data.isEmpty()) {
            return CursorInfo.empty();
        }
        
        Order first = data.get(0);
        Order last = data.get(data.size() - 1);
        
        String currentCursor = createCursor(last);
        String nextCursor = hasMore && !"prev".equals(direction) ? createCursor(last) : null;
        String prevCursor = (hasMore && "prev".equals(direction)) || hadCursor ? createCursor(first) : null;
        
        return new CursorInfo(
            currentCursor,
            nextCursor,
            prevCursor,
            hasMore && !"prev".equals(direction),
            hadCursor || (hasMore && "prev".equals(direction))
        );
    }
    
    private String createCursor(Order order) {
        return cursorCodec.encode(Map.of(
            "id", order.getId(),
            "createdDate", order.getCreatedDate().toString()
        ));
    }
}
```

### Controller

```java
@RestController
@RequestMapping("/v1/orders")
public class OrderController {
    
    private final OrderPaginationService paginationService;
    
    public OrderController(OrderPaginationService paginationService) {
        this.paginationService = paginationService;
    }
    
    @GetMapping
    public ResponseEntity<CursorPageResponse<Order>> getOrders(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") @Max(100) int size,
            @RequestParam(defaultValue = "next") String direction) {
        
        CursorPageResponse<Order> response = paginationService.getOrders(cursor, size, direction);
        return ResponseEntity.ok(response);
    }
}
```

## Spring WebFlux Implementation

### Reactive Repository

```java
public interface ReactiveOrderRepository extends ReactiveCrudRepository<Order, String> {
    
    @Query("""
        SELECT * FROM orders 
        WHERE created_date < :createdDate 
           OR (created_date = :createdDate AND id > :id)
        ORDER BY created_date DESC, id ASC
        LIMIT :limit
        """)
    Flux<Order> findNextPage(Instant createdDate, String id, int limit);
    
    @Query("SELECT * FROM orders ORDER BY created_date DESC, id ASC LIMIT :limit")
    Flux<Order> findFirstPage(int limit);
}
```

### Reactive Pagination Service

```java
@Service
public class ReactiveOrderPaginationService {
    
    private final ReactiveOrderRepository orderRepository;
    private final CursorCodec cursorCodec;
    
    public ReactiveOrderPaginationService(ReactiveOrderRepository orderRepository, CursorCodec cursorCodec) {
        this.orderRepository = orderRepository;
        this.cursorCodec = cursorCodec;
    }
    
    public Mono<CursorPageResponse<Order>> getOrders(String cursor, int size) {
        int fetchSize = size + 1;
        
        Flux<Order> ordersFlux;
        
        if (cursor == null) {
            ordersFlux = orderRepository.findFirstPage(fetchSize);
        } else {
            Map<String, Object> cursorData = cursorCodec.decode(cursor);
            Instant createdDate = Instant.parse((String) cursorData.get("createdDate"));
            String id = (String) cursorData.get("id");
            ordersFlux = orderRepository.findNextPage(createdDate, id, fetchSize);
        }
        
        return ordersFlux
            .collectList()
            .map(orders -> {
                boolean hasMore = orders.size() > size;
                List<Order> pageData = hasMore ? orders.subList(0, size) : orders;
                CursorInfo cursorInfo = buildCursorInfo(pageData, hasMore);
                return new CursorPageResponse<>(pageData, new CursorMeta(cursorInfo));
            });
    }
    
    private CursorInfo buildCursorInfo(List<Order> data, boolean hasMore) {
        if (data.isEmpty()) {
            return CursorInfo.empty();
        }
        
        Order last = data.get(data.size() - 1);
        String nextCursor = hasMore ? createCursor(last) : null;
        
        return new CursorInfo(
            createCursor(last),
            nextCursor,
            null,
            hasMore,
            false
        );
    }
    
    private String createCursor(Order order) {
        return cursorCodec.encode(Map.of(
            "id", order.getId(),
            "createdDate", order.getCreatedDate().toString()
        ));
    }
}
```

### Reactive Controller

```java
@RestController
@RequestMapping("/v1/orders")
public class ReactiveOrderController {
    
    private final ReactiveOrderPaginationService paginationService;
    
    public ReactiveOrderController(ReactiveOrderPaginationService paginationService) {
        this.paginationService = paginationService;
    }
    
    @GetMapping
    public Mono<CursorPageResponse<Order>> getOrders(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        
        return paginationService.getOrders(cursor, Math.min(size, 100));
    }
}
```

## Encrypted Cursor Implementation

For security-sensitive applications, encrypt cursor data:

```java
@Component
public class EncryptedCursorCodec {
    
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    
    private final SecretKey secretKey;
    private final ObjectMapper objectMapper;
    
    public EncryptedCursorCodec(
            @Value("${cursor.encryption.key}") String base64Key,
            ObjectMapper objectMapper) {
        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
        this.objectMapper = objectMapper;
    }
    
    public String encode(Map<String, Object> cursorData) {
        try {
            // Add expiration timestamp
            Map<String, Object> dataWithExpiry = new HashMap<>(cursorData);
            dataWithExpiry.put("exp", Instant.now().plus(Duration.ofHours(1)).toEpochMilli());
            
            String json = objectMapper.writeValueAsString(dataWithExpiry);
            byte[] plaintext = json.getBytes(StandardCharsets.UTF_8);
            
            // Generate random IV
            byte[] iv = new byte[GCM_IV_LENGTH];
            SecureRandom.getInstanceStrong().nextBytes(iv);
            
            // Encrypt
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec);
            byte[] ciphertext = cipher.doFinal(plaintext);
            
            // Combine IV and ciphertext
            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);
            
            return Base64.getUrlEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new CursorEncodingException("Failed to encrypt cursor", e);
        }
    }
    
    public Map<String, Object> decode(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        
        try {
            byte[] combined = Base64.getUrlDecoder().decode(cursor);
            
            // Extract IV and ciphertext
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] ciphertext = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, iv.length);
            System.arraycopy(combined, iv.length, ciphertext, 0, ciphertext.length);
            
            // Decrypt
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);
            byte[] plaintext = cipher.doFinal(ciphertext);
            
            String json = new String(plaintext, StandardCharsets.UTF_8);
            Map<String, Object> data = objectMapper.readValue(json, new TypeReference<>() {});
            
            // Check expiration
            Long exp = (Long) data.get("exp");
            if (exp != null && Instant.ofEpochMilli(exp).isBefore(Instant.now())) {
                throw new InvalidCursorException("Cursor has expired", null);
            }
            
            return data;
        } catch (InvalidCursorException e) {
            throw e;
        } catch (Exception e) {
            throw new InvalidCursorException("Invalid cursor", e);
        }
    }
}
```

## Error Handling

### Exception Handler

```java
@RestControllerAdvice
public class CursorPaginationExceptionHandler {
    
    @ExceptionHandler(InvalidCursorException.class)
    public ResponseEntity<ProblemDetail> handleInvalidCursor(InvalidCursorException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI.create("https://api.example.com/problems/invalid-cursor"));
        problem.setTitle("Invalid Cursor");
        problem.setDetail(ex.getMessage());
        return ResponseEntity.badRequest().body(problem);
    }
}
```

## Testing

### Unit Tests

```java
@ExtendWith(MockitoExtension.class)
class OrderPaginationServiceTest {
    
    @Mock
    private OrderRepository orderRepository;
    
    @Mock
    private CursorCodec cursorCodec;
    
    @InjectMocks
    private OrderPaginationService service;
    
    @Test
    void shouldReturnFirstPageWithoutCursor() {
        // Given
        List<Order> orders = List.of(
            new Order("order-1", Instant.now()),
            new Order("order-2", Instant.now().minusSeconds(60))
        );
        when(orderRepository.findFirstPage(any())).thenReturn(orders);
        when(cursorCodec.encode(any())).thenReturn("encoded-cursor");
        
        // When
        CursorPageResponse<Order> result = service.getOrders(null, 20, "next");
        
        // Then
        assertThat(result.data()).hasSize(2);
        assertThat(result.meta().cursor().hasNext()).isFalse();
    }
    
    @Test
    void shouldDetectHasNextWhenMoreItemsExist() {
        // Given
        List<Order> orders = List.of(
            new Order("order-1", Instant.now()),
            new Order("order-2", Instant.now().minusSeconds(60)),
            new Order("order-3", Instant.now().minusSeconds(120)) // Extra item
        );
        when(orderRepository.findFirstPage(any())).thenReturn(orders);
        when(cursorCodec.encode(any())).thenReturn("encoded-cursor");
        
        // When
        CursorPageResponse<Order> result = service.getOrders(null, 2, "next");
        
        // Then
        assertThat(result.data()).hasSize(2);
        assertThat(result.meta().cursor().hasNext()).isTrue();
        assertThat(result.meta().cursor().next()).isNotNull();
    }
}
```

### Integration Tests

```java
@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @BeforeEach
    void setup() {
        orderRepository.deleteAll();
        // Insert test data
        for (int i = 0; i < 25; i++) {
            orderRepository.save(new Order(
                "order-" + i,
                Instant.now().minusSeconds(i * 60)
            ));
        }
    }
    
    @Test
    void shouldReturnFirstPage() throws Exception {
        mockMvc.perform(get("/v1/orders")
                .param("size", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data.length()").value(10))
            .andExpect(jsonPath("$.meta.cursor.hasNext").value(true))
            .andExpect(jsonPath("$.meta.cursor.next").isNotEmpty());
    }
    
    @Test
    void shouldNavigateToNextPage() throws Exception {
        // Get first page
        String firstPageResponse = mockMvc.perform(get("/v1/orders")
                .param("size", "10"))
            .andReturn()
            .getResponse()
            .getContentAsString();
        
        String nextCursor = JsonPath.read(firstPageResponse, "$.meta.cursor.next");
        
        // Get second page
        mockMvc.perform(get("/v1/orders")
                .param("cursor", nextCursor)
                .param("size", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data.length()").value(10))
            .andExpect(jsonPath("$.meta.cursor.hasNext").value(true));
    }
    
    @Test
    void shouldReturnBadRequestForInvalidCursor() throws Exception {
        mockMvc.perform(get("/v1/orders")
                .param("cursor", "invalid-cursor"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").value("https://api.example.com/problems/invalid-cursor"));
    }
}
```

## Performance Optimization

### Database Indexes

Ensure proper indexes exist for cursor queries:

```sql
-- PostgreSQL
CREATE INDEX idx_orders_cursor ON orders (created_date DESC, id ASC);

-- MySQL
CREATE INDEX idx_orders_cursor ON orders (created_date DESC, id ASC);
```

### JPA Query Hints

```java
@QueryHints(@QueryHint(name = "org.hibernate.fetchSize", value = "50"))
@Query("SELECT o FROM Order o ORDER BY o.createdDate DESC, o.id ASC")
List<Order> findFirstPage(Pageable pageable);
```

## Related Documentation

- [Cursor Pagination Concepts](../../api-design/request-response/reference/pagination/cursor-pagination.md) - Language-agnostic cursor pagination guide
- [Pagination and Filtering](../../api-design/request-response/Pagination-and-Filtering.md) - General pagination standards
