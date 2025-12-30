# Authorization Patterns

## Authorization Models

### Scope-Based (API-Level)

Scopes define what API operations are permitted.

```
Token scopes: ["orders:read", "orders:write"]

GET /orders/123     → Check for "orders:read"    → Allowed
POST /orders        → Check for "orders:write"   → Allowed
DELETE /orders/123  → Check for "orders:delete"  → Denied (403)
```

**Best for**: API-level permissions, third-party apps, OAuth clients

### Role-Based (RBAC)

Roles define user categories with associated permissions.

```
Roles: ["admin", "user", "viewer"]

admin  → All operations
user   → Create, read, update own resources
viewer → Read only
```

**Best for**: Simple permission models, internal applications

### Resource-Based

Check ownership or explicit access grants per resource.

```
GET /orders/123
1. Verify token is valid
2. Verify user has orders:read scope
3. Query: Is user owner of order 123?
4. If yes → Allow. If no → 403 Forbidden
```

**Best for**: Multi-tenant systems, user-owned resources

### Attribute-Based (ABAC)

Decisions based on attributes of user, resource, and environment.

```
Allow if:
  user.department == resource.department AND
  user.clearance >= resource.classification AND
  environment.time within business_hours
```

**Best for**: Complex policies, regulatory compliance

## Permission Design

### Resource-Action Pattern

```
{resource}:{action}

order:read
order:create
order:update
order:delete
order:cancel    # Domain-specific action
order:refund    # Domain-specific action
```

### Permission Constants

```java
public final class Permissions {
    // Order permissions
    public static final String ORDER_READ = "order:read";
    public static final String ORDER_CREATE = "order:create";
    public static final String ORDER_UPDATE = "order:update";
    public static final String ORDER_DELETE = "order:delete";
    public static final String ORDER_CANCEL = "order:cancel";
    
    // Customer permissions
    public static final String CUSTOMER_READ = "customer:read";
    public static final String CUSTOMER_WRITE = "customer:write";
    
    // Admin permissions
    public static final String ADMIN_FULL = "admin:full";
}
```

### Permission Hierarchy

```
admin:full
├── order:*
│   ├── order:read
│   ├── order:create
│   ├── order:update
│   ├── order:delete
│   ├── order:cancel
│   └── order:refund
└── customer:*
    ├── customer:read
    └── customer:write
```

## Defense in Depth

Apply security at multiple layers:

```
┌──────────────────────────────────────────┐
│ 1. Gateway/Load Balancer                 │
│    - Rate limiting                       │
│    - Basic validation                    │
├──────────────────────────────────────────┤
│ 2. Controller                            │
│    - Token validation                    │
│    - Scope checking                      │
├──────────────────────────────────────────┤
│ 3. Service Layer                         │
│    - Resource ownership                  │
│    - Business rule validation            │
├──────────────────────────────────────────┤
│ 4. Repository/Database                   │
│    - Row-level security (if supported)   │
│    - Audit logging                       │
└──────────────────────────────────────────┘
```

## Resource Ownership Check

### Service Layer Pattern

```java
@Service
public class OrderService {
    
    public OrderDto getOrder(UUID orderId, String userId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));
        
        // Check ownership
        if (!order.getOwnerId().equals(userId) && !isAdmin(userId)) {
            throw new AccessDeniedException("Not authorized to access this order");
        }
        
        return orderMapper.toDto(order);
    }
}
```

### Query-Level Security

Filter at query time to prevent data leakage:

```java
@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    
    // Only returns orders the user owns
    @Query("SELECT o FROM Order o WHERE o.ownerId = :userId")
    Page<Order> findByOwnerId(@Param("userId") String userId, Pageable pageable);
    
    // Admin can see all
    @Query("SELECT o FROM Order o")
    Page<Order> findAll(Pageable pageable);
}

@Service
public class OrderService {
    
    public Page<OrderDto> getOrders(String userId, boolean isAdmin, Pageable pageable) {
        Page<Order> orders = isAdmin
            ? orderRepository.findAll(pageable)
            : orderRepository.findByOwnerId(userId, pageable);
        
        return orders.map(orderMapper::toDto);
    }
}
```

## Access Decision Patterns

### Binary Access Check

Simple yes/no decision:

```java
public interface AccessDecisionService {
    boolean canAccess(String userId, String resourceType, String resourceId);
}

@Service
public class AccessDecisionServiceImpl implements AccessDecisionService {
    
    @Override
    public boolean canAccess(String userId, String resourceType, String resourceId) {
        // Check if user is admin
        if (isAdmin(userId)) return true;
        
        // Check direct ownership
        return authRepository.isOwner(userId, resourceType, resourceId);
    }
}
```

### Policy-Based Decision

Complex rules engine:

```java
public interface PolicyEngine {
    AuthorizationDecision evaluate(AuthorizationContext context);
}

@Data
public class AuthorizationContext {
    private String userId;
    private Set<String> userRoles;
    private String resourceType;
    private String resourceId;
    private String action;
    private Map<String, Object> environment;
}

@Data
public class AuthorizationDecision {
    private boolean permitted;
    private String reason;
    private List<String> obligations; // Additional actions required
}
```

## Tenant Isolation

### Multi-Tenancy Authorization

```java
@Service
public class TenantAwareOrderService {
    
    @Autowired
    private TenantContextHolder tenantContext;
    
    public OrderDto getOrder(UUID orderId) {
        String currentTenant = tenantContext.getCurrentTenantId();
        
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));
        
        // Tenant isolation check
        if (!order.getTenantId().equals(currentTenant)) {
            throw new AccessDeniedException("Order belongs to different tenant");
        }
        
        return orderMapper.toDto(order);
    }
}
```

### Tenant Filter (JPA)

```java
@Entity
@Table(name = "orders")
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = "string"))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Order {
    
    @Column(name = "tenant_id", nullable = false)
    private String tenantId;
    
    // Other fields...
}
```

## Error Responses

### 401 vs 403

```
401 Unauthorized: "Who are you?"
- No token provided
- Invalid token
- Expired token

403 Forbidden: "I know who you are, but you can't do this"
- Valid token, wrong scope
- Valid token, not resource owner
- Valid token, action not permitted
```

### Secure Error Messages

```java
// Bad - reveals too much
throw new AccessDeniedException("User 123 is not owner of order 456");

// Good - no information leakage
throw new AccessDeniedException("Access denied");

// Log details internally
log.warn("Access denied: user={} attempted to access order={}", userId, orderId);
```

### Consistent Error Format

```json
{
  "type": "https://example.com/problems/access-denied",
  "title": "Access Denied",
  "status": 403,
  "detail": "You do not have permission to access this resource",
  "instance": "/orders/123"
}
```

## Caching Authorization Decisions

```java
@Service
public class CachedAccessDecisionService {
    
    @Cacheable(value = "accessDecisions", 
               key = "#userId + ':' + #resourceType + ':' + #resourceId",
               unless = "#result == false")
    public boolean canAccess(String userId, String resourceType, String resourceId) {
        // Expensive access check
        return performAccessCheck(userId, resourceType, resourceId);
    }
    
    @CacheEvict(value = "accessDecisions", 
                key = "#userId + ':' + #resourceType + ':' + #resourceId")
    public void updateAccess(String userId, String resourceType, String resourceId) {
        // Called when permissions change
    }
}
```

**Cache TTL**: Keep short (5-15 minutes) to balance performance vs permission freshness.

## Audit Trail

Log authorization decisions:

```json
{
  "timestamp": "2024-07-15T14:32:22Z",
  "event_type": "authorization_decision",
  "user_id": "user-123",
  "resource_type": "order",
  "resource_id": "order-456",
  "action": "read",
  "decision": "PERMIT",
  "reason": "user is owner",
  "request_id": "req-789"
}
```

```json
{
  "timestamp": "2024-07-15T14:32:22Z",
  "event_type": "authorization_decision",
  "user_id": "user-123",
  "resource_type": "order",
  "resource_id": "order-789",
  "action": "delete",
  "decision": "DENY",
  "reason": "missing scope: orders:delete",
  "request_id": "req-790"
}
```
