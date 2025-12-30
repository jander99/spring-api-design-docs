# Pagination: Java/Spring Implementation

## Spring Data Pageable

Spring provides built-in pagination support through `Pageable` and `Page`.

### Controller with Pagination

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final OrderMapper orderMapper;

    @GetMapping
    public ResponseEntity<PageResponse<OrderResponse>> getOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "createdDate,desc") String sort) {
        
        // Validate and cap size
        size = Math.min(size, 100);
        
        // Parse sort parameter
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        
        // Apply filters
        OrderFilter filter = OrderFilter.builder()
            .status(status != null ? OrderStatus.valueOf(status) : null)
            .build();
        
        Page<OrderDto> orderPage = orderService.findOrders(filter, pageable);
        
        return ResponseEntity.ok(orderMapper.toPageResponse(orderPage));
    }
    
    private Sort parseSort(String sortParam) {
        String[] parts = sortParam.split(",");
        String field = parts[0];
        Sort.Direction direction = parts.length > 1 && "asc".equalsIgnoreCase(parts[1])
            ? Sort.Direction.ASC
            : Sort.Direction.DESC;
        return Sort.by(direction, field);
    }
}
```

### Using @PageableDefault

Spring can bind `Pageable` directly:

```java
@GetMapping
public ResponseEntity<PageResponse<OrderResponse>> getOrders(
        @PageableDefault(size = 20, sort = "createdDate", direction = Sort.Direction.DESC)
        Pageable pageable,
        @RequestParam(required = false) String status) {
    
    // Validate max size
    if (pageable.getPageSize() > 100) {
        pageable = PageRequest.of(
            pageable.getPageNumber(),
            100,
            pageable.getSort()
        );
    }
    
    Page<OrderDto> orders = orderService.findOrders(status, pageable);
    return ResponseEntity.ok(orderMapper.toPageResponse(orders));
}
```

Configure sort parameter format in application.yaml:

```yaml
spring:
  data:
    web:
      pageable:
        default-page-size: 20
        max-page-size: 100
        one-indexed-parameters: false  # page starts at 0
        page-parameter: page
        size-parameter: size
      sort:
        sort-parameter: sort
```

## Page Response DTO

### Standard Page Response

```java
@Data
@Builder
public class PageResponse<T> {
    private List<T> data;
    private PaginationMeta meta;
    
    @Data
    @Builder
    public static class PaginationMeta {
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
        private boolean first;
        private boolean last;
        private boolean hasNext;
        private boolean hasPrevious;
    }
    
    public static <T, R> PageResponse<R> from(Page<T> page, Function<T, R> mapper) {
        List<R> data = page.getContent().stream()
            .map(mapper)
            .collect(Collectors.toList());
        
        return PageResponse.<R>builder()
            .data(data)
            .meta(PaginationMeta.builder()
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build())
            .build();
    }
}
```

### Mapper Usage

```java
@Component
public class OrderMapper {
    
    public PageResponse<OrderResponse> toPageResponse(Page<OrderDto> page) {
        return PageResponse.from(page, this::toResponse);
    }
    
    public OrderResponse toResponse(OrderDto dto) {
        return OrderResponse.builder()
            .id(dto.getId())
            .status(dto.getStatus().name())
            .total(dto.getTotal())
            .createdDate(dto.getCreatedDate())
            .build();
    }
}
```

## Repository Layer

### JPA Repository

```java
public interface OrderRepository extends JpaRepository<Order, UUID> {
    
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE " +
           "(:status IS NULL OR o.status = :status) AND " +
           "(:customerId IS NULL OR o.customerId = :customerId)")
    Page<Order> findWithFilters(
        @Param("status") OrderStatus status,
        @Param("customerId") UUID customerId,
        Pageable pageable
    );
}
```

### Specification Pattern (Dynamic Filters)

```java
public class OrderSpecifications {
    
    public static Specification<Order> hasStatus(OrderStatus status) {
        return (root, query, cb) -> 
            status == null ? null : cb.equal(root.get("status"), status);
    }
    
    public static Specification<Order> hasCustomerId(UUID customerId) {
        return (root, query, cb) ->
            customerId == null ? null : cb.equal(root.get("customerId"), customerId);
    }
    
    public static Specification<Order> createdAfter(LocalDateTime date) {
        return (root, query, cb) ->
            date == null ? null : cb.greaterThanOrEqualTo(root.get("createdDate"), date);
    }
    
    public static Specification<Order> createdBefore(LocalDateTime date) {
        return (root, query, cb) ->
            date == null ? null : cb.lessThan(root.get("createdDate"), date);
    }
}

// Repository
public interface OrderRepository extends JpaRepository<Order, UUID>, 
                                         JpaSpecificationExecutor<Order> {
}

// Service usage
@Service
public class OrderService {
    
    public Page<Order> findOrders(OrderFilter filter, Pageable pageable) {
        Specification<Order> spec = Specification
            .where(OrderSpecifications.hasStatus(filter.getStatus()))
            .and(OrderSpecifications.hasCustomerId(filter.getCustomerId()))
            .and(OrderSpecifications.createdAfter(filter.getCreatedAfter()))
            .and(OrderSpecifications.createdBefore(filter.getCreatedBefore()));
        
        return orderRepository.findAll(spec, pageable);
    }
}
```

## Cursor Pagination Implementation

### Cursor DTO

```java
@Data
@Builder
public class CursorPageResponse<T> {
    private List<T> data;
    private CursorMeta cursor;
    
    @Data
    @Builder
    public static class CursorMeta {
        private String current;
        private String next;
        private String previous;
        private boolean hasNext;
        private boolean hasPrevious;
    }
}
```

### Cursor Encoder

```java
@Component
public class CursorEncoder {
    
    private final ObjectMapper objectMapper;
    
    public CursorEncoder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }
    
    public String encode(Map<String, Object> cursorData) {
        try {
            String json = objectMapper.writeValueAsString(cursorData);
            return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(json.getBytes(StandardCharsets.UTF_8));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to encode cursor", e);
        }
    }
    
    public Map<String, Object> decode(String cursor) {
        if (cursor == null || cursor.isEmpty()) {
            return null;
        }
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(cursor);
            String json = new String(decoded, StandardCharsets.UTF_8);
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new InvalidCursorException("Invalid cursor format");
        }
    }
}
```

### Cursor Repository Query

```java
@Repository
public class OrderCursorRepository {
    
    @PersistenceContext
    private EntityManager em;
    
    private final CursorEncoder cursorEncoder;
    
    public CursorPageResponse<Order> findWithCursor(
            String cursor, int size, String direction) {
        
        Map<String, Object> cursorData = cursorEncoder.decode(cursor);
        
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Order> query = cb.createQuery(Order.class);
        Root<Order> root = query.from(Order.class);
        
        // Build cursor condition
        if (cursorData != null) {
            Predicate cursorPredicate = buildCursorPredicate(
                cb, root, cursorData, direction);
            query.where(cursorPredicate);
        }
        
        // Apply sort (reversed for 'prev' direction)
        if ("prev".equals(direction)) {
            query.orderBy(
                cb.asc(root.get("createdDate")),
                cb.desc(root.get("id"))
            );
        } else {
            query.orderBy(
                cb.desc(root.get("createdDate")),
                cb.asc(root.get("id"))
            );
        }
        
        // Fetch size + 1 to determine hasMore
        List<Order> results = em.createQuery(query)
            .setMaxResults(size + 1)
            .getResultList();
        
        boolean hasMore = results.size() > size;
        List<Order> data = hasMore 
            ? results.subList(0, size) 
            : results;
        
        // Reverse if going backward
        if ("prev".equals(direction)) {
            Collections.reverse(data);
        }
        
        return buildCursorResponse(data, direction, hasMore);
    }
    
    private Predicate buildCursorPredicate(
            CriteriaBuilder cb, Root<Order> root,
            Map<String, Object> cursorData, String direction) {
        
        OffsetDateTime createdDate = OffsetDateTime.parse(
            (String) cursorData.get("createdDate"));
        UUID id = UUID.fromString((String) cursorData.get("id"));
        
        if ("prev".equals(direction)) {
            // Going backward: createdDate > cursor OR (createdDate = cursor AND id < cursorId)
            return cb.or(
                cb.greaterThan(root.get("createdDate"), createdDate),
                cb.and(
                    cb.equal(root.get("createdDate"), createdDate),
                    cb.lessThan(root.get("id"), id)
                )
            );
        } else {
            // Going forward: createdDate < cursor OR (createdDate = cursor AND id > cursorId)
            return cb.or(
                cb.lessThan(root.get("createdDate"), createdDate),
                cb.and(
                    cb.equal(root.get("createdDate"), createdDate),
                    cb.greaterThan(root.get("id"), id)
                )
            );
        }
    }
}
```

## Filtering Implementation

### Filter DTO

```java
@Data
@Builder
public class OrderFilter {
    private OrderStatus status;
    private UUID customerId;
    private LocalDateTime createdAfter;
    private LocalDateTime createdBefore;
    private BigDecimal minTotal;
    private BigDecimal maxTotal;
    private String search;
}
```

### Controller with Filters

```java
@GetMapping
public ResponseEntity<PageResponse<OrderResponse>> getOrders(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) OrderStatus status,
        @RequestParam(required = false) UUID customerId,
        @RequestParam(required = false) 
            @DateTimeFormat(iso = ISO.DATE_TIME) LocalDateTime createdAfter,
        @RequestParam(required = false)
            @DateTimeFormat(iso = ISO.DATE_TIME) LocalDateTime createdBefore,
        @RequestParam(required = false) BigDecimal minTotal,
        @RequestParam(required = false) BigDecimal maxTotal,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "createdDate,desc") String sort) {
    
    OrderFilter filter = OrderFilter.builder()
        .status(status)
        .customerId(customerId)
        .createdAfter(createdAfter)
        .createdBefore(createdBefore)
        .minTotal(minTotal)
        .maxTotal(maxTotal)
        .search(search)
        .build();
    
    Pageable pageable = PageRequest.of(
        page, 
        Math.min(size, 100), 
        parseSort(sort)
    );
    
    Page<OrderDto> orders = orderService.findOrders(filter, pageable);
    return ResponseEntity.ok(orderMapper.toPageResponse(orders));
}
```

## Validation

### Custom Validator for Pagination

```java
@Component
public class PaginationValidator {
    
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> SORTABLE_FIELDS = Set.of(
        "id", "createdDate", "updatedDate", "status", "total"
    );
    
    public void validate(int page, int size, String sort) {
        List<String> errors = new ArrayList<>();
        
        if (page < 0) {
            errors.add("Page must be >= 0");
        }
        
        if (size < 1 || size > MAX_PAGE_SIZE) {
            errors.add("Size must be between 1 and " + MAX_PAGE_SIZE);
        }
        
        if (sort != null) {
            String field = sort.split(",")[0];
            if (!SORTABLE_FIELDS.contains(field)) {
                errors.add("Invalid sort field: " + field + 
                    ". Allowed: " + SORTABLE_FIELDS);
            }
        }
        
        if (!errors.isEmpty()) {
            throw new InvalidPaginationException(errors);
        }
    }
}
```

### Exception Handler

```java
@ControllerAdvice
public class PaginationExceptionHandler {
    
    @ExceptionHandler(InvalidPaginationException.class)
    public ResponseEntity<ProblemDetail> handleInvalidPagination(
            InvalidPaginationException ex) {
        
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI.create("https://example.com/problems/invalid-pagination"));
        problem.setTitle("Invalid Pagination Parameters");
        problem.setProperty("errors", ex.getErrors());
        
        return ResponseEntity.badRequest().body(problem);
    }
    
    @ExceptionHandler(InvalidCursorException.class)
    public ResponseEntity<ProblemDetail> handleInvalidCursor(
            InvalidCursorException ex) {
        
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI.create("https://example.com/problems/invalid-cursor"));
        problem.setTitle("Invalid Cursor");
        problem.setDetail(ex.getMessage());
        
        return ResponseEntity.badRequest().body(problem);
    }
}
```

## Testing

### Controller Test

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService;
    
    @Test
    void shouldReturnPaginatedOrders() throws Exception {
        // Given
        Page<OrderDto> page = new PageImpl<>(
            List.of(createOrder("1"), createOrder("2")),
            PageRequest.of(0, 20),
            2
        );
        when(orderService.findOrders(any(), any())).thenReturn(page);
        
        // When/Then
        mockMvc.perform(get("/v1/orders")
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(2)))
            .andExpect(jsonPath("$.meta.pagination.page").value(0))
            .andExpect(jsonPath("$.meta.pagination.totalElements").value(2));
    }
    
    @Test
    void shouldRejectInvalidPageSize() throws Exception {
        mockMvc.perform(get("/v1/orders")
                .param("size", "500"))
            .andExpect(status().isBadRequest());
    }
}
```
