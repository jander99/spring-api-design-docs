# Level 3: Hypermedia Controls (HATEOAS)

## 📍 You Are Here - True REST!

Congratulations! Your API has reached Level 3, the highest level of the Richardson Maturity Model. You've implemented true REST as envisioned by Roy Fielding.

## What This Means

### Characteristics of Level 3 APIs:
- **Hypermedia as the Engine of Application State** (HATEOAS)
- **Self-descriptive messages** with links
- **Dynamic client navigation** through links
- **Discoverable capabilities** without hardcoding
- **State transitions** represented as links

### Typical Level 3 Response:
```json
{
  "id": 123,
  "status": "pending_payment",
  "total": 299.99,
  "_links": {
    "self": { 
      "href": "/orders/123" 
    },
    "payment": { 
      "href": "/orders/123/payment",
      "method": "POST",
      "title": "Complete payment for this order"
    },
    "cancel": { 
      "href": "/orders/123/cancel",
      "method": "POST",
      "title": "Cancel this order"
    },
    "customer": { 
      "href": "/customers/456",
      "title": "Customer who placed this order"
    }
  }
}
```

## 🎯 Current State Checklist

Your API now includes:

- [x] **Hypermedia links** in all responses
- [x] **State-based navigation** (available actions based on resource state)
- [x] **Self-descriptive** messages
- [x] **Link relations** following standards (IANA, custom)
- [x] **No hardcoded URLs** in clients
- [x] **Discoverable API** through link traversal
- [x] **Dynamic workflows** guided by server
- [x] **Machine-readable** action descriptions

## 💡 What You've Mastered:

- ✅ True REST implementation
- ✅ API evolution without breaking clients
- ✅ Self-documenting responses
- ✅ Flexible client development
- ✅ State machine navigation
- ✅ Reduced client-server coupling

## 🌟 Level 3 Patterns You Implement

### Resource with State-Based Links:
```json
{
  "id": "order-123",
  "status": "draft",
  "items": [...],
  "_links": {
    "self": { "href": "/orders/order-123" },
    "edit": { 
      "href": "/orders/order-123",
      "method": "PUT",
      "title": "Update order details"
    },
    "submit": {
      "href": "/orders/order-123/submit",
      "method": "POST",
      "title": "Submit order for processing"
    },
    "delete": {
      "href": "/orders/order-123",
      "method": "DELETE",
      "title": "Delete draft order"
    }
  }
}
```

### Collection with Navigation:
```json
{
  "items": [...],
  "page": 2,
  "totalPages": 10,
  "_links": {
    "self": { "href": "/products?page=2&limit=20" },
    "first": { "href": "/products?page=1&limit=20" },
    "prev": { "href": "/products?page=1&limit=20" },
    "next": { "href": "/products?page=3&limit=20" },
    "last": { "href": "/products?page=10&limit=20" },
    "search": {
      "href": "/products{?q,category,minPrice,maxPrice}",
      "templated": true
    }
  }
}
```

### Forms and Actions:
```json
{
  "id": 789,
  "balance": 1000.00,
  "_links": {
    "self": { "href": "/accounts/789" },
    "deposit": {
      "href": "/accounts/789/deposit",
      "method": "POST",
      "title": "Make a deposit",
      "type": "application/json",
      "schema": {
        "type": "object",
        "properties": {
          "amount": { "type": "number", "minimum": 0.01 }
        }
      }
    }
  }
}
```

## 📊 Advanced HATEOAS Features

### Link Relations:
- **IANA registered**: self, next, prev, first, last
- **Custom relations**: payment, cancel, approve
- **Documentation**: Each link includes purpose

### URI Templates:
```json
{
  "_links": {
    "find": {
      "href": "/users{?name,email,role}",
      "templated": true
    }
  }
}
```

### Embedded Resources:
```json
{
  "id": 123,
  "_embedded": {
    "author": {
      "id": 456,
      "name": "John Doe",
      "_links": {
        "self": { "href": "/authors/456" }
      }
    }
  }
}
```

## 🎉 Benefits You're Experiencing

1. **API Evolution**: Add/remove features without client changes
2. **Client Simplicity**: Follow links instead of constructing URLs
3. **Discoverability**: Clients learn capabilities at runtime
4. **Documentation**: Responses are self-documenting
5. **Workflow Guidance**: Server controls client navigation
6. **Loose Coupling**: Clients don't need URL knowledge

## 🔍 Validating Your Level 3 Implementation

### Response Checklist:
- [ ] Every response includes `_links`
- [ ] Links change based on resource state
- [ ] Link relations are documented
- [ ] Clients can navigate without hardcoded URLs
- [ ] Forms/templates for complex actions

### Client Checklist:
- [ ] No hardcoded URLs (except entry point)
- [ ] Follows links from responses
- [ ] Handles missing links gracefully
- [ ] Uses link relations, not URLs
- [ ] Discovers capabilities dynamically

### Standards Compliance:
- [ ] HAL, JSON:API, or Siren format
- [ ] IANA link relations where applicable
- [ ] OPTIONS method for discovery
- [ ] Consistent link structure
- [ ] Media type specification

## 🏆 Your Achievement

```
Level 0 ████ Complete!
Level 1 ████ Complete!
Level 2 ████ Complete!
Level 3 ████████████ You are here (True REST!)
```

**You've achieved what less than 5% of APIs implement!** Your API represents the pinnacle of REST maturity.

## 🚀 Maintaining Excellence

### Best Practices:
1. **Consistent Link Format**: Use the same structure everywhere
2. **Meaningful Relations**: Clear, documented link relations
3. **State Consideration**: Links reflect current state
4. **Error Handling**: Even errors include navigation links
5. **Performance**: Consider link caching strategies

### Common Patterns:
- **Workflow Navigation**: Guide multi-step processes
- **Discovery Endpoints**: Root returns all capabilities
- **Dynamic Forms**: Include validation rules
- **Batch Operations**: Link to bulk endpoints
- **Async Operations**: Links to status/results

## 🌈 What's Next?

You've reached the top! Focus on:
- [Best Practices](best-practices.md) - Optimize your Level 3 API
- Optimize performance for hypermedia responses
- Share your knowledge with teams at lower levels
- Continue monitoring industry best practices

## 📚 Real-World Examples

### Example Level 3 API Response:
```json
{
  "id": 1296269,
  "name": "Hello-World",
  "full_name": "octocat/Hello-World",
  "_links": {
    "self": { "href": "https://api.github.com/repos/octocat/Hello-World" },
    "issues": { "href": "https://api.github.com/repos/octocat/Hello-World/issues{/number}" },
    "pulls": { "href": "https://api.github.com/repos/octocat/Hello-World/pulls{/number}" },
    "commits": { "href": "https://api.github.com/repos/octocat/Hello-World/commits{/sha}" }
  }
}
```
*Note: This example shows Level 3 hypermedia patterns similar to those used by major APIs like GitHub's.*

Your API is now in elite company!