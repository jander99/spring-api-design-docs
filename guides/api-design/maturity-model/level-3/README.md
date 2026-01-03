# Level 3: Hypermedia Controls (HATEOAS)

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 4 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, basic API experience  
> **🎯 Key Topics:** REST
> 
> **📊 Complexity:** 9.4 grade level • 1.3% technical density • fairly easy

## 📍 You Are Here - True REST!

Congratulations! You have reached Level 3. This is the highest level of the Richardson Maturity Model. You have implemented true REST as Roy Fielding envisioned it.

## What This Means

### Why Hypermedia?

Your API now tells clients what they can do next. Clients no longer hardcode URLs. They follow links that your API provides. This makes your API flexible and easy to change.

Think of it like a website. You click links to navigate. You don't type URLs manually. Level 3 APIs work the same way for programs.

### Level 3 APIs Include:
- **Links in every response** that show what actions are available
- **Self-descriptive messages** that explain themselves
- **Dynamic navigation** where clients follow links
- **Discoverable actions** without hardcoded URLs
- **State-based links** that change based on what the resource can do

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
- ✅ You can change your API without breaking clients
- ✅ Responses explain themselves
- ✅ Clients are flexible and simple
- ✅ Clients navigate based on state
- ✅ Clients don't depend on hardcoded URLs

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
Link relations tell clients what each link means:
- **Standard relations**: self, next, prev, first, last
- **Custom relations**: payment, cancel, approve
- **Documentation**: Each link explains its purpose

### URI Templates:
You can provide search templates for clients to fill in:
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
You can include related resources to save requests:
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

1. **Easy Evolution**: Add or remove features. Clients don't break.
2. **Simple Clients**: Clients follow links. They don't build URLs.
3. **Runtime Discovery**: Clients learn what they can do when they run.
4. **Self-Documenting**: Responses explain themselves.
5. **Guided Workflows**: Your server leads clients through steps.
6. **Loose Coupling**: Clients don't need to know your URLs.

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

**Less than 5% of APIs reach this level!** You have reached the top of REST maturity.

## 🚀 Maintaining Excellence

### Best Practices:
1. **Consistent Links**: Use the same format everywhere
2. **Clear Relations**: Make link relations easy to understand
3. **State-Based Links**: Links should match the current state
4. **Error Links**: Include links even in error responses
5. **Performance**: Cache links when you can

### Common Patterns:
- **Workflow Navigation**: Guide clients through multi-step tasks
- **Discovery Endpoints**: Your root endpoint shows all features
- **Dynamic Forms**: Include rules for validation
- **Batch Operations**: Provide links to bulk endpoints
- **Async Operations**: Link to status and results

## 🌈 What's Next?

You have reached the top! Now focus on:
- [Best Practices](best-practices.md) - Make your Level 3 API even better
- [Hypermedia Controls](../../advanced-patterns/hypermedia-controls.md) - Learn advanced HATEOAS patterns
- Share what you know with teams at lower levels!

## 📚 Real-World Examples

### GitHub API (Level 3):
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

Your API is now in elite company!