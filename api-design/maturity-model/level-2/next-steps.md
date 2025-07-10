# Moving from Level 2 to Level 3: Hypermedia Controls (HATEOAS)

## 🎯 Goal: Self-Describing API

Add hypermedia controls so clients can discover available actions and navigate your API without hardcoded knowledge.

## First: Do You Need Level 3?

### ✅ Good Reasons for Level 3:
- **Public API** with diverse clients
- **Long-lived API** (>5 years)
- **Complex workflows** with states
- **Multiple client types** (web, mobile, IoT)
- **Frequent API evolution**

### ❌ Valid Reasons to Stay at Level 2:
- **Internal microservices**
- **Performance critical** applications
- **Simple CRUD** operations
- **Single client** control
- **Rapid development** needs

## Understanding HATEOAS

### Current State (Level 2):
```json
{
  "id": 123,
  "status": "pending",
  "total": 99.99
}
```
Client must know: Can I cancel? Where to pay? What's next?

### Target State (Level 3):
```json
{
  "id": 123,
  "status": "pending",
  "total": 99.99,
  "_links": {
    "self": { "href": "/orders/123" },
    "cancel": { "href": "/orders/123/cancel", "method": "POST" },
    "payment": { "href": "/orders/123/payment", "method": "POST" },
    "items": { "href": "/orders/123/items" }
  }
}
```
API tells client what's possible!

## Step 1: Choose Your Hypermedia Format

### Popular Formats:

#### HAL (Hypertext Application Language)
```json
{
  "name": "Product",
  "_links": {
    "self": { "href": "/products/123" },
    "reviews": { "href": "/products/123/reviews" }
  }
}
```

#### JSON:API
```json
{
  "data": {
    "type": "products",
    "id": "123",
    "attributes": { "name": "Product" },
    "links": {
      "self": "/products/123"
    }
  }
}
```

#### Siren
```json
{
  "properties": { "name": "Product" },
  "links": [
    { "rel": ["self"], "href": "/products/123" }
  ],
  "actions": [
    {
      "name": "add-to-cart",
      "method": "POST",
      "href": "/cart/items"
    }
  ]
}
```

## Step 2: Add Links to Responses

### Start Simple - Add Self Links:
```javascript
// Level 2
app.get('/users/:id', (req, res) => {
  const user = getUser(req.params.id);
  res.json(user);
});

// Level 3
app.get('/users/:id', (req, res) => {
  const user = getUser(req.params.id);
  res.json({
    ...user,
    _links: {
      self: { href: `/users/${user.id}` }
    }
  });
});
```

### Add Related Resource Links:
```javascript
const orderResponse = {
  id: 123,
  status: order.status,
  _links: {
    self: { href: `/orders/${order.id}` },
    customer: { href: `/customers/${order.customerId}` },
    items: { href: `/orders/${order.id}/items` },
    invoice: order.invoiceId ? { href: `/invoices/${order.invoiceId}` } : null
  }
};
```

### Add Available Actions:
```javascript
const orderResponse = {
  id: 123,
  status: order.status,
  _links: {
    self: { href: `/orders/${order.id}` },
    // Include actions based on state
    ...(order.status === 'pending' && {
      cancel: { 
        href: `/orders/${order.id}/cancel`,
        method: 'POST'
      },
      update: {
        href: `/orders/${order.id}`,
        method: 'PUT'
      }
    }),
    ...(order.status === 'confirmed' && {
      ship: {
        href: `/orders/${order.id}/ship`,
        method: 'POST'
      }
    })
  }
};
```

## Step 3: State-Based Navigation

### Order State Machine:
```javascript
const getOrderLinks = (order) => {
  const links = {
    self: { href: `/orders/${order.id}` }
  };

  switch(order.status) {
    case 'draft':
      links.submit = { href: `/orders/${order.id}/submit`, method: 'POST' };
      links.update = { href: `/orders/${order.id}`, method: 'PUT' };
      break;
    
    case 'pending':
      links.cancel = { href: `/orders/${order.id}/cancel`, method: 'POST' };
      links.payment = { href: `/orders/${order.id}/payment`, method: 'POST' };
      break;
    
    case 'paid':
      links.ship = { href: `/orders/${order.id}/ship`, method: 'POST' };
      links.refund = { href: `/orders/${order.id}/refund`, method: 'POST' };
      break;
    
    case 'shipped':
      links.track = { href: `/shipments/${order.shipmentId}` };
      break;
  }

  return links;
};
```

## Step 4: Collection Navigation

### Paginated Collections:
```json
{
  "items": [...],
  "total": 100,
  "page": 2,
  "_links": {
    "self": { "href": "/products?page=2" },
    "first": { "href": "/products?page=1" },
    "prev": { "href": "/products?page=1" },
    "next": { "href": "/products?page=3" },
    "last": { "href": "/products?page=10" }
  }
}
```

## Step 5: Forms and Templates

### Include Action Templates:
```json
{
  "id": 123,
  "_links": {
    "self": { "href": "/users/123" },
    "update": {
      "href": "/users/123",
      "method": "PUT",
      "fields": [
        { "name": "email", "type": "email", "required": true },
        { "name": "name", "type": "text", "required": true }
      ]
    }
  }
}
```

## Implementation Strategy

### Phase 1: Add Basic Links (Week 1-2)
- [ ] Add self links to all resources
- [ ] Add collection navigation links
- [ ] Add related resource links
- [ ] Document link relations

### Phase 2: Add Actions (Week 3-4)
- [ ] Map state transitions to links
- [ ] Include available actions
- [ ] Add method information
- [ ] Test client navigation

### Phase 3: Full HATEOAS (Week 5-6)
- [ ] Add form templates
- [ ] Include field descriptions
- [ ] Implement OPTIONS support
- [ ] Create client libraries

## 🚫 Common Pitfalls

### ❌ Avoid:
- Inconsistent link formats
- Missing links for some states
- Hardcoding URLs in links
- Breaking existing clients
- Over-complicating responses

### ✅ Instead:
- Use standard formats (HAL, JSON:API)
- Generate links dynamically
- Version your link relations
- Maintain backward compatibility
- Start simple, evolve gradually

## 📊 Success Metrics

You've reached Level 3 when:
- [ ] All responses include links
- [ ] Links reflect resource state
- [ ] Clients can navigate without hardcoded URLs
- [ ] API is self-documenting
- [ ] New features don't break clients

## 🎉 Level 3 Benefits

1. **Evolution**: Add features without breaking clients
2. **Discovery**: Clients learn API capabilities
3. **Flexibility**: Change URLs without client updates
4. **Documentation**: API self-describes operations
5. **State Management**: Clear workflow navigation

## Client Implementation Example

### Level 2 Client (Hardcoded):
```javascript
// Client knows all URLs
const user = await fetch('/users/123');
const orders = await fetch('/users/123/orders');
```

### Level 3 Client (Dynamic):
```javascript
// Client follows links
const user = await fetch('/users/123');
const userLinks = user._links;
const orders = await fetch(userLinks.orders.href);
```

## Is It Worth It?

### The Trade-offs:
- **More Complex**: Responses are larger
- **Learning Curve**: Developers need training
- **Client Work**: Clients must handle links
- **Performance**: Slightly larger payloads

### The Benefits:
- **Flexibility**: Change without breaking
- **Discovery**: Self-documenting API
- **Longevity**: API can evolve
- **Standards**: True REST compliance

## Next Steps

If you implement HATEOAS, you'll have achieved true REST as defined by Roy Fielding. Check the [Level 3 Guide](../level-3/) for best practices and examples!