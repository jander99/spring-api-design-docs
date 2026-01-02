# Level 1: Resources

## 📍 You Are Here

Your API has reached Level 1 of the Richardson Maturity Model. You're thinking in resources!

## What This Means

### Characteristics of Level 1 APIs:
- **Multiple URLs** for different resources
- **Resource-based thinking** (nouns, not verbs)
- **Unique identifiers** for resources
- **Still using limited HTTP methods** (usually just POST)

### Typical Level 1 Request:
```
POST /users/123
Content-Type: application/json

{
  "action": "update",
  "data": {
    "email": "newemail@example.com"
  }
}
```

## 🎯 Current State Checklist

Your API now has:

- [x] **Multiple endpoints** for different resources
- [x] **Resource identifiers in URLs** (`/users/123`)
- [x] **Hierarchical URLs** (`/users/123/orders`)
- [x] **Collection endpoints** (`/users`)
- [x] **Individual resource endpoints** (`/users/123`)
- [ ] Still mostly using **POST** for all operations
- [ ] May still have **actions in request body**
- [ ] Not fully utilizing **HTTP status codes**

## 💡 What You've Accomplished:
- ✅ Moved from procedures to resources
- ✅ Better URL organization
- ✅ Improved API discoverability
- ✅ Easier to understand and document
- ✅ Standard routing patterns

## ⚠️ Current Limitations:
- ❌ Not leveraging HTTP methods
- ❌ Missing standard status codes
- ❌ No HTTP caching benefits
- ❌ Confusing operation semantics
- ❌ Non-standard error handling

## 🔍 Examples at Your Current Level

### Getting a User (Level 1):
```
POST /users/123
{
  "action": "get"
}
```

### Creating a User (Level 1):
```
POST /users
{
  "action": "create",
  "data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Updating a User (Level 1):
```
POST /users/123
{
  "action": "update",
  "data": {
    "email": "newemail@example.com"
  }
}
```

### Deleting a User (Level 1):
```
POST /users/123
{
  "action": "delete"
}
```

## 📊 Common Patterns at Level 1

### Resource Collections:
- `/users` - All users
- `/products` - All products
- `/orders` - All orders

### Individual Resources:
- `/users/123` - Specific user
- `/products/456` - Specific product
- `/orders/789` - Specific order

### Nested Resources:
- `/users/123/orders` - User's orders
- `/orders/789/items` - Order's items
- `/products/456/reviews` - Product's reviews

## 🎉 What's Working Well

1. **Clear Resource Boundaries**: Each resource type has its own URL space
2. **Predictable Patterns**: Developers can guess URLs
3. **Better Organization**: Easier to manage and scale
4. **Tool Support**: Routers and frameworks understand your patterns

## 🚧 What Could Be Better

1. **HTTP Method Confusion**: Using POST for everything
2. **Non-standard Operations**: Actions still in request body
3. **Status Code Misuse**: Not leveraging HTTP's built-in semantics
4. **Caching Impossible**: POST requests aren't cacheable
5. **Unclear Semantics**: What does POST to `/users/123` do?

## 📈 Why Move to Level 2?

### Immediate Benefits:
- Standard HTTP caching
- Clear operation semantics
- Better tool support
- Proper error handling

### Long-term Benefits:
- Industry standard compliance
- Easier onboarding
- Better performance
- Improved security

## 🚀 Ready to Level Up?

Level 2 is the industry standard - and you're almost there! Next steps:
1. [Understanding HTTP Verbs](next-steps.md)
2. [Mapping Operations to Methods](next-steps.md#operation-mapping)
3. [Implementing Status Codes](next-steps.md#status-codes)

[→ **View Your Path to Level 2**](next-steps.md)

## 🏆 Your Progress So Far

```
Level 0 ████ Complete!
Level 1 ████████████ You are here
Level 2 ░░░░░░░░ Next target
Level 3 ░░░░ Future goal
```

You've made significant progress! Level 2 is within reach and will bring your API to industry standards.