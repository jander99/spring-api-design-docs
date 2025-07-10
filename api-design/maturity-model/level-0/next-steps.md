# Moving from Level 0 to Level 1: Your Action Plan

## 🎯 Goal: Introduce Resources

Transform your single-endpoint API into a resource-based API with multiple URLs.

## Step 1: Identify Your Resources

### Current State (Level 0):
```json
{
  "method": "getUser",
  "method": "createOrder",
  "method": "updateProduct"
}
```

### 🔍 Find Your Nouns:
Look at your method names. The nouns are your resources:
- getUser → **User** resource
- createOrder → **Order** resource
- updateProduct → **Product** resource

### Your Resources Checklist:
List all the "things" your API manages:
- [ ] Users
- [ ] Orders
- [ ] Products
- [ ] Customers
- [ ] Invoices
- [ ] (Add your resources here)

## Step 2: Create Resource URLs

### Transformation Formula:
```
Level 0: POST /api with {"method": "getUser", "id": 123}
Level 1: POST /users/123
```

### URL Patterns to Implement:
| Current (Level 0) | New (Level 1) | Purpose |
|-------------------|---------------|---------|
| `{"method": "getUser"}` | `/users/{id}` | Single user |
| `{"method": "listUsers"}` | `/users` | User collection |
| `{"method": "getUserOrders"}` | `/users/{id}/orders` | Related resources |

## Step 3: Gradual Migration Strategy

### Phase 1: Dual Support (Recommended)
```javascript
// Support both patterns initially
app.post('/api', oldHandler);     // Keep existing
app.post('/users', newHandler);   // Add new
app.post('/users/:id', newHandler); // Add new
```

### Phase 2: Route Forwarding
```javascript
// Forward old calls to new endpoints
app.post('/api', (req, res) => {
  if (req.body.method === 'getUser') {
    return res.redirect(307, `/users/${req.body.params.userId}`);
  }
  // ... other methods
});
```

### Phase 3: Deprecation
- Add deprecation headers
- Update documentation
- Notify clients
- Set sunset date

## Step 4: Implementation Checklist

### Week 1-2: Planning
- [ ] List all current operations
- [ ] Group operations by resource
- [ ] Design URL structure
- [ ] Create migration plan

### Week 3-4: Implementation
- [ ] Create new endpoints
- [ ] Keep request/response format (for now)
- [ ] Add routing logic
- [ ] Test thoroughly

### Week 5-6: Migration
- [ ] Update documentation
- [ ] Implement dual support
- [ ] Monitor usage
- [ ] Communicate changes

## 📝 Practical Examples

### Before (Level 0):
```bash
POST /api
{
  "method": "createOrder",
  "params": {
    "customerId": 123,
    "items": [...]
  }
}
```

### After (Level 1):
```bash
POST /orders
{
  "customerId": 123,
  "items": [...]
}
```

Note: We're still using POST for everything - that's OK! HTTP verbs come in Level 2.

## 🚫 Common Pitfalls to Avoid

### ❌ Don't Do This:
- Change everything at once
- Break existing clients
- Mix actions in URLs (`/getUserData`)
- Create deeply nested URLs (>/3 levels)

### ✅ Do This Instead:
- Migrate incrementally
- Support both patterns temporarily
- Use nouns in URLs (`/users`)
- Keep hierarchy simple

## 📊 Success Metrics

You've reached Level 1 when:
- [ ] Multiple endpoint URLs exist
- [ ] URLs represent resources
- [ ] Each resource has its own URL pattern
- [ ] Old endpoint can be deprecated
- [ ] Clients use new URLs

## 🎉 Quick Wins

Start with these easy transformations:

1. **User Operations:**
   - `/api` → `/users`
   - `/api` → `/users/{id}`

2. **Product Operations:**
   - `/api` → `/products`
   - `/api` → `/products/{id}`

3. **Order Operations:**
   - `/api` → `/orders`
   - `/api` → `/orders/{id}`

## 🔗 Related Resources

- [Resource Naming Guide](../../foundations/Resource-Naming-and-URL-Structure.md)
- [URL Design Patterns](../../request-response/)
- [Migration Strategies](../../examples/versioning/)

## Next: Level 1 Checklist

Once you've implemented resources, use the [Level 1 Checklist](../level-1/) to verify your implementation and plan your path to Level 2!