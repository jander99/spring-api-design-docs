# Resource Naming Deep-Dive

## Naming Philosophy

Resources represent domain entities. Names should be:
- **Noun-based**: What it is, not what it does
- **Domain-aligned**: Match business terminology
- **Consistent**: Same patterns across all endpoints
- **Discoverable**: Intuitive for API consumers

## Detailed Naming Rules

### 1. Use Plural Nouns for Collections

Collections always use plural nouns, even for single-item access:

```
GET /orders           # Collection
GET /orders/123       # Single item from collection
POST /orders          # Create in collection
```

**Rationale**: The endpoint `/orders` represents the orders collection. Accessing `/orders/123` retrieves item 123 from that collection. This is semantically consistent.

**Exception**: Singleton resources that exist once per parent:

```
GET /users/123/profile     # User has exactly one profile
PUT /users/123/preferences # User has exactly one preferences object
```

### 2. Kebab-Case for Multi-Word Resources

```
# Correct
/shipping-addresses
/order-items
/payment-methods

# Incorrect
/shippingAddresses    # camelCase - avoid
/shipping_addresses   # snake_case - avoid
/ShippingAddresses    # PascalCase - avoid
```

**Rationale**: URLs are case-insensitive in the spec but case-sensitive in practice on many servers. Kebab-case is readable and consistent.

### 3. Domain-Aligned Terminology

Match your domain language:

| Domain Term | URL Resource |
|-------------|--------------|
| Customer | `/customers` |
| Shopping Cart | `/carts` or `/shopping-carts` |
| Line Item | `/line-items` or `/items` |
| Invoice | `/invoices` |

Avoid technical jargon. Use business terms API consumers recognize.

### 4. Resource vs Action Naming

**Resources** (nouns):
```
/orders
/payments
/shipments
```

**Actions** (verbs as sub-resources, only when necessary):
```
POST /orders/123/cancel
POST /payments/456/refund
POST /shipments/789/track
```

Actions should be rare. Most operations map to HTTP verbs:
- Create → POST to collection
- Read → GET
- Update → PUT/PATCH
- Delete → DELETE

## Hierarchical Resource Design

### When to Nest

Nest when the child **cannot exist** without the parent:

```
/orders/{orderId}/items              # Items belong to specific order
/products/{productId}/reviews        # Reviews are for specific product
/documents/{docId}/comments          # Comments attached to document
```

### When NOT to Nest

Don't nest when resources are independently addressable:

```
# Avoid - employees exist independently of departments
/departments/{deptId}/employees/{empId}

# Prefer - filter by department
GET /employees?departmentId=123
GET /employees/456                   # Direct access
```

### Maximum Nesting Depth

Limit to 2 levels:

```
# Good
/orders/{orderId}/items

# Acceptable but pushing limits
/orders/{orderId}/items/{itemId}

# Too deep - avoid
/customers/{cId}/orders/{oId}/items/{iId}/details
```

**Solutions for deep hierarchies**:
1. Provide direct access: `/order-items/{itemId}`
2. Use query parameters: `/items?orderId=123`
3. Embed in response rather than separate endpoint

## Alternative Access Paths

Resources may have multiple valid paths:

```
# By relationship
GET /customers/123/orders          # Orders for customer 123

# Direct access
GET /orders?customerId=123         # Same data, different path
GET /orders/456                    # Specific order directly
```

Both patterns are valid. Choose based on:
- **Primary use case**: Which path will be used most?
- **Domain model**: Does the relationship imply ownership?
- **Caching**: Relationship paths may cache differently

## Identifier Guidelines

### Format

Use stable, opaque identifiers:

```
# Good - UUIDs
/orders/550e8400-e29b-41d4-a716-446655440000

# Good - Short IDs (if collision-resistant)
/orders/ord_1234abcd

# Acceptable - Integer IDs
/orders/12345

# Avoid - Natural keys that might change
/users/john.doe@email.com    # Email might change
/products/SKU-12345          # SKU might be reassigned
```

### Composite Identifiers

For resources identified by multiple values:

```
# Prefer - Single opaque ID
/order-items/item_789xyz

# Alternative - Composite path (when parent context needed)
/orders/123/items/456

# Avoid - Composite in single segment
/order-items/123-456         # Ambiguous delimiter
```

## Query Parameter Naming

### Filtering

```
# Simple equality
GET /orders?status=PENDING

# Multiple values (OR)
GET /orders?status=PENDING,PROCESSING

# Range filters
GET /orders?createdAfter=2024-01-01&createdBefore=2024-12-31

# Boolean filters
GET /products?inStock=true
```

### Sorting

```
# Single sort
GET /orders?sort=createdDate,desc

# Multiple sorts (priority order)
GET /orders?sort=status,asc&sort=createdDate,desc
```

### Field Selection (Sparse Fieldsets)

```
# Include only specific fields
GET /orders?fields=id,status,total

# Nested field selection
GET /orders?fields=id,customer.name,items.productId
```

## Common Mistakes

### Mistake 1: Verbs in Resource Names

```
# Wrong
/getAllOrders
/createNewOrder
/updateOrderStatus

# Right
GET /orders
POST /orders
PATCH /orders/{id}
```

### Mistake 2: Redundant Path Segments

```
# Wrong - redundant "id"
/orders/id/123

# Right
/orders/123
```

### Mistake 3: Inconsistent Pluralization

```
# Wrong - mixed
GET /order/123
GET /customers

# Right - consistent plural
GET /orders/123
GET /customers
```

### Mistake 4: File Extensions in URLs

```
# Wrong
/orders.json
/orders/123.xml

# Right - use Accept header
GET /orders/123
Accept: application/json
```

## Checklist

Before finalizing resource names:

- [ ] All resources use plural nouns
- [ ] Multi-word resources use kebab-case
- [ ] URLs are lowercase
- [ ] No verbs in resource paths
- [ ] Nesting limited to 2 levels
- [ ] Independent resources accessible directly
- [ ] Identifiers are stable and opaque
- [ ] Query parameters use consistent naming
- [ ] Names match domain terminology
