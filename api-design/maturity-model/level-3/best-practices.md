# Level 3 Best Practices: Mastering HATEOAS

## 🎯 Optimizing Your Hypermedia API

### 1. Link Design Principles

#### Use Standard Relations When Possible:
```json
{
  "_links": {
    "self": { "href": "/orders/123" },           // IANA standard
    "next": { "href": "/orders?page=2" },        // IANA standard
    "payment": { "href": "/orders/123/payment" } // Domain-specific
  }
}
```

#### Document Custom Relations:
```json
{
  "_links": {
    "approve": {
      "href": "/orders/123/approve",
      "method": "POST",
      "title": "Approve this order for processing",
      "description": "Moves order from pending_approval to approved state"
    }
  }
}
```

### 2. State-Driven Links

#### Only Show Available Actions:
```javascript
function getOrderLinks(order) {
  const links = {
    self: { href: `/orders/${order.id}` }
  };

  // State-specific links
  if (order.status === 'draft') {
    links.submit = { href: `/orders/${order.id}/submit`, method: 'POST' };
    links.update = { href: `/orders/${order.id}`, method: 'PUT' };
    links.delete = { href: `/orders/${order.id}`, method: 'DELETE' };
  } else if (order.status === 'pending_payment') {
    links.payment = { href: `/orders/${order.id}/payment`, method: 'POST' };
    links.cancel = { href: `/orders/${order.id}/cancel`, method: 'POST' };
  }
  // No delete link for non-draft orders!

  return links;
}
```

### 3. Performance Optimization

#### Conditional Link Inclusion:
```javascript
// Include detailed links only when requested
app.get('/orders/:id', (req, res) => {
  const verbose = req.query.verbose === 'true';
  const order = getOrder(req.params.id);
  
  const response = {
    ...order,
    _links: {
      self: { href: `/orders/${order.id}` },
      ...(verbose && getDetailedLinks(order))
    }
  };
  
  res.json(response);
});
```

#### Link Caching Strategy:
```javascript
// Cache link templates, not generated links
const LINK_TEMPLATES = {
  order: {
    self: '/orders/{id}',
    items: '/orders/{id}/items',
    customer: '/customers/{customerId}'
  }
};

function generateLinks(order) {
  return {
    self: { href: LINK_TEMPLATES.order.self.replace('{id}', order.id) },
    customer: { href: LINK_TEMPLATES.order.customer.replace('{customerId}', order.customerId) }
  };
}
```

### 4. Hypermedia Formats

#### HAL (Recommended for Simplicity):
```json
{
  "id": 123,
  "name": "Product",
  "_links": {
    "self": { "href": "/products/123" }
  },
  "_embedded": {
    "reviews": [...]
  }
}
```

#### Siren (For Rich Actions):
```json
{
  "properties": { "id": 123 },
  "actions": [{
    "name": "add-to-cart",
    "method": "POST",
    "href": "/cart/items",
    "fields": [
      { "name": "productId", "type": "hidden", "value": 123 },
      { "name": "quantity", "type": "number", "min": 1 }
    ]
  }]
}
```

### 5. Error Responses with Links

#### Even Errors Should Navigate:
```json
{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 402,
  "detail": "Account balance too low for this transaction",
  "_links": {
    "account": { "href": "/accounts/789" },
    "deposit": { 
      "href": "/accounts/789/deposit",
      "method": "POST",
      "title": "Add funds to your account"
    },
    "help": { "href": "/help/payments/insufficient-funds" }
  }
}
```

### 6. Discovery and Documentation

#### Root Discovery Endpoint:
```json
// GET /
{
  "version": "1.0",
  "title": "Example API",
  "_links": {
    "self": { "href": "/" },
    "users": { "href": "/users" },
    "products": { "href": "/products" },
    "orders": { "href": "/orders" },
    "documentation": { "href": "/docs" },
    "health": { "href": "/health" }
  }
}
```

#### OPTIONS for Resource Discovery:
```http
OPTIONS /orders/123
Allow: GET, PUT, DELETE
Link: </orders/123>; rel="self",
      </orders/123/items>; rel="items",
      </orders/123/cancel>; rel="cancel"
```

### 7. Client Implementation Patterns

#### Generic Link Following:
```javascript
class HATEOASClient {
  async followLink(resource, relation) {
    const link = resource._links?.[relation];
    if (!link) {
      throw new Error(`No ${relation} link found`);
    }
    
    const method = link.method || 'GET';
    return await fetch(link.href, { method });
  }
}

// Usage
const order = await client.get('/orders/123');
const items = await client.followLink(order, 'items');
```

#### Progressive Enhancement:
```javascript
// Work with or without links
async function getOrderItems(order) {
  // Prefer links if available
  if (order._links?.items) {
    return await fetch(order._links.items.href);
  }
  // Fall back to constructed URL
  return await fetch(`/orders/${order.id}/items`);
}
```

### 8. Testing HATEOAS APIs

#### Link Validation Tests:
```javascript
describe('Order API Links', () => {
  test('draft orders have submit link', async () => {
    const order = await createDraftOrder();
    expect(order._links.submit).toBeDefined();
    expect(order._links.submit.method).toBe('POST');
  });

  test('shipped orders have no cancel link', async () => {
    const order = await getShippedOrder();
    expect(order._links.cancel).toBeUndefined();
  });
});
```

### 9. Common Pitfalls to Avoid

#### ❌ Don't Include Invalid Links:
```json
// Bad: Cancel link on completed order
{
  "status": "completed",
  "_links": {
    "cancel": { "href": "/orders/123/cancel" } // Invalid action!
  }
}
```

#### ❌ Don't Hardcode Absolute URLs:
```javascript
// Bad
links.self = { href: "https://api.example.com/orders/123" };

// Good
links.self = { href: `/orders/123` }; // Let infrastructure handle host
```

#### ❌ Don't Forget Error Links:
```json
// Bad: Error with no navigation
{
  "error": "Not found"
}

// Good: Error with helpful links
{
  "error": "Not found",
  "_links": {
    "search": { "href": "/search" },
    "home": { "href": "/" }
  }
}
```

### 10. Advanced Patterns

#### Async Operations:
```json
// POST /large-reports returns:
{
  "status": "processing",
  "estimatedCompletion": "2024-01-10T15:00:00Z",
  "_links": {
    "self": { "href": "/jobs/abc123" },
    "cancel": { "href": "/jobs/abc123", "method": "DELETE" },
    "status": { 
      "href": "/jobs/abc123/status",
      "title": "Check processing status"
    }
  }
}
```

#### Conditional Fields:
```json
{
  "id": 123,
  "_links": {
    "update": {
      "href": "/users/123",
      "method": "PATCH",
      "accepts": "application/merge-patch+json",
      "fields": {
        "email": { "type": "email", "required": true },
        "name": { "type": "string", "maxLength": 100 },
        "role": { 
          "type": "enum",
          "values": ["user", "admin"],
          "if": { "userRole": "admin" }
        }
      }
    }
  }
}
```

## 🎯 Key Takeaways

1. **Links reflect state** - Only show valid actions
2. **Performance matters** - Optimize link generation
3. **Consistency is key** - Use same patterns everywhere
4. **Document relations** - Make links self-explanatory
5. **Test thoroughly** - Validate state transitions
6. **Handle errors gracefully** - Include navigation in errors
7. **Support discovery** - Make API explorable

Your Level 3 API is powerful - these practices ensure it's also practical!