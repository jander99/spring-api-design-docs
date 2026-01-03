# Authorization Patterns

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** Authentication, Architecture
> 
> **📊 Complexity:** 11.8 grade level • 1.9% technical density • fairly difficult

## Overview

This guide shows how to implement authorization in Spring Boot. We use binary permissions for fine-grained control. This applies to both imperative (blocking) and reactive (non-blocking) applications.

## Binary Resource-Based Authorization

Binary permissions give access based on specific resources and actions. Each permission grants or denies access to one resource. This is simpler than role-based access control (RBAC) and more precise.

### Define Permission Classes

Create a class with permission constants. Each permission has two parts: the resource and the action. For example: `order:view` means "view orders".

**Example: Order Service Permissions**

```java
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class OrderServicePermissions {
    // Format: resource:action
    public static final String VIEW_ORDERS = "order:view";
    public static final String CREATE_ORDERS = "order:create";
    public static final String UPDATE_ORDERS = "order:update";
    public static final String DELETE_ORDERS = "order:delete";
    public static final String CANCEL_ORDER = "order:cancel";
    public static final String REFUND_ORDER = "order:refund";
    public static final String VIEW_CUSTOMER_ORDERS = "customer-order:view";
}
```

## Method-Level Security

Use `@PreAuthorize` to check permissions on methods. This protects your methods automatically. Always add a second check for ownership to be extra safe.

### Traditional Services (Blocking)

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final SecurityService securityService;
    
    @PreAuthorize("hasAuthority('RESOURCE_order:view')")
    public OrderDto getOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));
        // Second check: Verify user owns this order
        securityService.checkOrderAccess(order);
        return orderMapper.toDto(order);
    }
    
    @PreAuthorize("hasAuthority('RESOURCE_order:create')")
    public OrderDto createOrder(OrderCreationDto creationDto) {
        // Implementation
    }
    
    @PreAuthorize("hasAuthority('RESOURCE_order:cancel')")
    public OrderDto cancelOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));
        securityService.checkOrderAccess(order);
        order.cancel();
        return orderRepository.save(order);
    }
}
```

### Non-Blocking Services (Reactive)

```java
@Service
@RequiredArgsConstructor
public class ReactiveOrderService {
    private final ReactiveOrderRepository orderRepository;
    private final ReactiveSecurityService securityService;
    
    @PreAuthorize("hasAuthority('RESOURCE_order:view')")
    public Mono<OrderDto> getOrder(UUID orderId) {
        return orderRepository.findById(orderId)
            .switchIfEmpty(Mono.error(new ResourceNotFoundException("Order", orderId)))
            .flatMap(order -> securityService.checkOrderAccess(order)
                .thenReturn(order))
            .map(orderMapper::toDto);
    }
    
    @PreAuthorize("hasAuthority('RESOURCE_order:cancel')")
    public Mono<OrderDto> cancelOrder(UUID orderId) {
        return orderRepository.findById(orderId)
            .switchIfEmpty(Mono.error(new ResourceNotFoundException("Order", orderId)))
            .flatMap(order -> securityService.checkOrderAccess(order)
                .thenReturn(order))
            .flatMap(order -> {
                order.cancel();
                return orderRepository.save(order);
            })
            .map(orderMapper::toDto);
    }
}
```

## Security Service Implementation

The security service checks if a user can access a specific resource. It gets the user from the current context and asks the access decision service if they have permission.

### Traditional Services (Blocking)

```java
@Service
@RequiredArgsConstructor
public class SecurityService {
    private final AccessDecisionService accessDecisionService;
    
    public void checkOrderAccess(Order order) {
        // Get the current logged-in user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw new AccessDeniedException("Not authenticated");
        }
        
        // Ask: Does this user have access to this order?
        String username = auth.getName();
        boolean hasAccess = accessDecisionService.hasOrderAccess(username, order.getId());
        
        if (!hasAccess) {
            throw new AccessDeniedException("No access to order: " + order.getId());
        }
    }
}
```

### Non-Blocking Services (Reactive)

```java
@Service
@RequiredArgsConstructor
public class ReactiveSecurityService {
    private final ReactiveAccessDecisionService accessDecisionService;
    
    public Mono<Void> checkOrderAccess(Order order) {
        return ReactiveSecurityContextHolder.getContext()
            .map(SecurityContext::getAuthentication)
            .switchIfEmpty(Mono.error(new AccessDeniedException("Not authenticated")))
            .flatMap(auth -> accessDecisionService.hasOrderAccess(auth.getName(), order.getId())
                .flatMap(hasAccess -> {
                    if (hasAccess) {
                        return Mono.empty();
                    }
                    String msg = "No access to order: " + order.getId();
                    return Mono.error(new AccessDeniedException(msg));
                })
            );
    }
}
```

## Access Decision Service

The access decision service makes the final call. It checks if the user has permission. Admins always get access. Regular users need explicit permission.

### Traditional Services (Blocking)

```java
@Service
@RequiredArgsConstructor
public class AccessDecisionService {
    private final AuthorizationRepository authorizationRepository;
    
    public boolean hasOrderAccess(String username, UUID orderId) {
        // Admins can access everything
        if (isAdmin(username)) {
            return true;
        }
        // Check if user owns this order
        return authorizationRepository.isUserAuthorizedForResource(
            username, "order", orderId.toString());
    }
    
    public boolean isAdmin(String username) {
        return authorizationRepository.hasGlobalPermission(username, "admin");
    }
}
```

### Non-Blocking Services (Reactive)

```java
@Service
@RequiredArgsConstructor
public class ReactiveAccessDecisionService {
    private final ReactiveAuthorizationRepository authorizationRepository;
    
    public Mono<Boolean> hasOrderAccess(String username, UUID orderId) {
        // Check admin status first
        return isAdmin(username)
            .flatMap(isAdmin -> {
                if (isAdmin) {
                    return Mono.just(true);
                }
                // Check if user owns this order
                return authorizationRepository.isUserAuthorizedForResource(
                    username, "order", orderId.toString());
            });
    }
    
    public Mono<Boolean> isAdmin(String username) {
        return authorizationRepository.hasGlobalPermission(username, "admin");
    }
}
```

## Defense in Depth

Use multiple security checks, not just one. Check permissions at entry. Check resource ownership in the method. Check the result before returning.

```java
@Service
public class SecureService {
    private final AuthorizationService authorizationService;
    private final ResourceRepository resourceRepository;
    
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostAuthorize("returnObject.owner == authentication.name")
    public Resource accessSecureResource(String resourceId) {
        // Check 1: Annotation blocks non-admins
        
        // Check 2: Method-level check
        authorizationService.checkAccess(resourceId);
        
        // Check 3: Load the resource
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException(resourceId));
        
        // Check 4: Domain-level check
        if (!resource.canBeAccessedBy(SecurityContextHolder.getContext().getAuthentication())) {
            throw new AccessDeniedException("Access denied: " + resourceId);
        }
        
        // Check 5: Return value checked by @PostAuthorize
        return resource;
    }
}
```

## Good Patterns vs Bad Patterns

### Patterns to Follow

| Pattern | What to Do |
|---------|-----------|
| Defense in Depth | Use multiple security checks, not just one |
| Fail Securely | Deny access if anything is unclear. Default to "no" |
| Least Privilege | Give only the access that is needed |
| Input Validation | Check all data from the user |
| Safe Errors | Don't show sensitive data in error messages |

### Anti-patterns to Avoid

| Bad Pattern | Why It's Wrong | Do This Instead |
|-------------|----------------|-----------------|
| Hide endpoints | Doesn't actually secure anything | Use real authentication |
| Hard-code secrets | Anyone can see passwords | Use external configuration |
| Skip defaults | Leaves security holes | Set up security explicitly |
| Only use annotations | One layer can be bypassed | Use multiple checks |
| Show all errors | Leaks sensitive information | Only show safe error text |

## Best Practices

### Name Permissions Clearly

- Use the format: `resource:action`
- Example: `order:view`, `order:create`, `order:delete`
- Keep names short and specific
- Group similar permissions together

### Implement Access Control Well

- Always check resource ownership as a second check
- Check both authentication (who you are) and authorization (what you can do)
- Use `@PreAuthorize` on all protected methods
- Log who accessed what for auditing

### Performance

- Cache permission checks when you can
- Optimize database queries for permission lookups
- For list operations, check permissions in bulk
- Use fast permission lookup mechanisms

## Related Documentation

- [OAuth2 Resource Server](oauth2-resource-server.md) — How to validate JWT tokens
- [Security Context Propagation](security-context-propagation.md) — Service-to-service security
- [Security Testing](security-testing.md) — How to test authorization