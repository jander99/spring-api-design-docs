# Authorization Patterns

## Overview

This document outlines the implementation of our custom binary resource-based authorization model in Spring Boot applications. It covers resource permission mapping, method-level security, and access decision services for both imperative and reactive implementations.

## Binary Resource-Based Authorization

Our authorization model is based on binary resource permissions rather than traditional role-based access control (RBAC). This provides fine-grained control over specific resources and actions.

### Resource Permission Mapping

Define resource permissions for our services:

```java
package com.example.common.security;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class OrderServicePermissions {
    
    // Create permissions with resource identifier and action
    public static final String VIEW_ORDERS = "order:view";
    public static final String CREATE_ORDERS = "order:create";
    public static final String UPDATE_ORDERS = "order:update";
    public static final String DELETE_ORDERS = "order:delete";
    
    // Fine-grained administrative permissions
    public static final String CANCEL_ORDER = "order:cancel";
    public static final String REFUND_ORDER = "order:refund";
    
    // Customer-specific permissions
    public static final String VIEW_CUSTOMER_ORDERS = "customer-order:view";
}
```

## Method-Level Security

Apply method-level security with our binary resource-based permissions:

### Imperative Services

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
        
        // Secondary check for resource ownership
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
        
        // Check ownership
        securityService.checkOrderAccess(order);
        
        order.cancel();
        Order savedOrder = orderRepository.save(order);
        return orderMapper.toDto(savedOrder);
    }
}
```

### Reactive Services

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
    
    @PreAuthorize("hasAuthority('RESOURCE_order:create')")
    public Mono<OrderDto> createOrder(OrderCreationDto creationDto) {
        // Implementation
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

Implement the security service to check resource access:

### Imperative Services

```java
@Service
@RequiredArgsConstructor
public class SecurityService {
    
    private final AccessDecisionService accessDecisionService;
    
    public void checkOrderAccess(Order order) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new AccessDeniedException("Not authenticated");
        }
        
        // Binary access check based on resource ID
        boolean hasAccess = accessDecisionService.hasOrderAccess(
            authentication.getName(), order.getId());
        
        if (!hasAccess) {
            throw new AccessDeniedException("No access to order: " + order.getId());
        }
    }
    
    public void checkCustomerAccess(UUID customerId) {
        // Similar implementation for customer resources
    }
}
```

### Reactive Services

```java
@Service
@RequiredArgsConstructor
public class ReactiveSecurityService {
    
    private final ReactiveAccessDecisionService accessDecisionService;
    
    public Mono<Void> checkOrderAccess(Order order) {
        return ReactiveSecurityContextHolder.getContext()
            .map(SecurityContext::getAuthentication)
            .switchIfEmpty(Mono.error(new AccessDeniedException("Not authenticated")))
            .flatMap(authentication -> 
                accessDecisionService.hasOrderAccess(authentication.getName(), order.getId())
                    .flatMap(hasAccess -> {
                        if (hasAccess) {
                            return Mono.empty();
                        } else {
                            return Mono.error(
                                new AccessDeniedException("No access to order: " + order.getId()));
                        }
                    })
            );
    }
    
    public Mono<Void> checkCustomerAccess(UUID customerId) {
        // Similar implementation for customer resources
    }
}
```

## Access Decision Service

Implement the access decision service to determine resource access rights:

```java
@Service
@RequiredArgsConstructor
public class AccessDecisionService {
    
    private final AuthorizationRepository authorizationRepository;
    
    /**
     * Determines if a user has access to a specific order
     */
    public boolean hasOrderAccess(String username, UUID orderId) {
        // Check if user is admin (has global access)
        if (isAdmin(username)) {
            return true;
        }
        
        // Check if user is the owner of the order
        return authorizationRepository.isUserAuthorizedForResource(
            username, "order", orderId.toString());
    }
    
    /**
     * Check if user has admin rights
     */
    public boolean isAdmin(String username) {
        return authorizationRepository.hasGlobalPermission(username, "admin");
    }
}

@Service
@RequiredArgsConstructor
public class ReactiveAccessDecisionService {
    
    private final ReactiveAuthorizationRepository authorizationRepository;
    
    /**
     * Determines if a user has access to a specific order
     */
    public Mono<Boolean> hasOrderAccess(String username, UUID orderId) {
        // Check if user is admin (has global access)
        return isAdmin(username)
            .flatMap(isAdmin -> {
                if (isAdmin) {
                    return Mono.just(true);
                }
                
                // Check if user is the owner of the order
                return authorizationRepository.isUserAuthorizedForResource(
                    username, "order", orderId.toString());
            });
    }
    
    /**
     * Check if user has admin rights
     */
    public Mono<Boolean> isAdmin(String username) {
        return authorizationRepository.hasGlobalPermission(username, "admin");
    }
}
```

## Defense in Depth for Methods

```java
@Service
public class SecureService {
    
    private final AuthorizationService authorizationService;
    
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostAuthorize("returnObject.owner == authentication.name")
    public Resource accessSecureResource(String resourceId) {
        // Method level authorization
        authorizationService.checkAccess(resourceId);
        
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException(resourceId));
            
        // Domain level security check
        if (!resource.canBeAccessedBy(SecurityContextHolder.getContext().getAuthentication())) {
            throw new AccessDeniedException("Access denied to resource: " + resourceId);
        }
        
        return resource;
    }
}
```

## Security Patterns and Anti-patterns

### Patterns to Follow

| Pattern | Example | Description |
|---------|---------|-------------|
| Defense in Depth | Multiple security layers | Use multiple security controls |
| Fail Securely | Deny by default | Default to secure state on failure |
| Least Privilege | Minimal permissions | Grant only necessary access |
| Input Validation | Validate all inputs | Validate at controller level |
| Proper Error Handling | No sensitive data in errors | Don't leak information in errors |

### Anti-patterns to Avoid

| Anti-pattern | Example | Preferred Approach |
|--------------|---------|-------------------|
| Security by Obscurity | Hiding endpoints | Use proper authentication |
| Hard-coded Secrets | Passwords in code | Use external configuration |
| Insecure Defaults | Not overriding defaults | Configure security explicitly |
| Security Annotations Only | No defense in depth | Multiple layers of security |
| Global Exception Handlers | Leaking errors | Sanitize error messages |

## Best Practices

### Permission Design

- Use descriptive permission names that clearly indicate the resource and action
- Follow a consistent naming convention (e.g., `resource:action`)
- Group related permissions by domain or service boundary
- Consider permission hierarchies for administrative access

### Access Control Implementation

- Always perform secondary checks for resource ownership
- Implement both authentication and authorization checks
- Use method-level security annotations consistently
- Log authorization decisions for audit purposes

### Performance Considerations

- Cache authorization decisions when appropriate
- Optimize database queries for access checks
- Consider bulk authorization checks for list operations
- Implement efficient permission lookup mechanisms

## Related Documentation

- [OAuth2 Resource Server](oauth2-resource-server.md) - JWT token validation and extraction
- [Security Context Propagation](security-context-propagation.md) - Service-to-service security
- [Security Testing](security-testing.md) - Testing authorization patterns