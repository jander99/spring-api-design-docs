# Level 2: HTTP Verbs

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 4 minutes | **🟢 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic API knowledge, HTTP understanding  
> **🎯 Key Topics:** HTTP Methods, Status Codes, REST
> 
> **📊 Complexity:** 11.9 grade level • 2.3% technical density • fairly difficult

## 📍 You Are Here - Industry Standard!

Congratulations! Your API reached Level 2. This is the industry standard. Most successful REST APIs operate here.

## What This Means

### Level 2 API Features:
- **HTTP methods**: Uses GET, POST, PUT, DELETE correctly
- **Status codes**: Returns 200, 201, 404 based on results
- **Resource URLs**: Uses nouns with verbs
- **Stateless**: Each request is independent
- **Error responses**: Uses consistent formats

### Typical Level 2 Requests:
```
GET    /users/123         → Retrieve user
POST   /users             → Create user
PUT    /users/123         → Update user
DELETE /users/123         → Delete user
```

## 🎯 Current State Checklist

Your API now uses:

- [x] **GET** for safe reads
- [x] **POST** for creating resources
- [x] **PUT/PATCH** for updates
- [x] **DELETE** for removal
- [x] **Status codes** beyond 200
- [x] **Resource URLs** without verbs
- [x] **Stateless requests**
- [x] **Standard error formats**
- [x] **HTTP headers** correctly

## 💡 What You Achieved:
- ✅ Industry standard REST API
- ✅ Uses full HTTP protocol
- ✅ Cacheable GET requests
- ✅ Clear operations
- ✅ Works with tools
- ✅ Predictable behavior

## 🌟 Level 2 Best Practices

### Proper Method Usage:
```bash
# Safe & Idempotent
GET /products?category=electronics   # Read, cacheable

# Creates new resource
POST /products                       # Returns 201 + Location header
{
  "name": "New Product",
  "price": 99.99
}

# Idempotent update
PUT /products/123                    # Full replacement
{
  "name": "Updated Product",
  "price": 89.99
}

# Idempotent removal
DELETE /products/123                 # Returns 204 No Content
```

### Status Code Guide:
| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | GET or PUT works |
| 201 | Created | POST works |
| 204 | No Content | DELETE works |
| 400 | Bad Request | Bad input |
| 401 | Unauthorized | No auth |
| 403 | Forbidden | No access |
| 404 | Not Found | Resource gone |
| 409 | Conflict | Rule broken |
| 500 | Server Error | System fails |

## 📊 Your API Patterns

### Collection Operations:
```
GET    /orders              → List all orders (200)
POST   /orders              → Create order (201)
GET    /orders?status=pending → Filter orders (200)
```

### Single Resource:
```
GET    /orders/123          → Get one order (200 or 404)
PUT    /orders/123          → Update order (200 or 404)
DELETE /orders/123          → Cancel order (204 or 404)
```

### Nested Resources:
```
GET    /orders/123/items    → Get order items (200)
POST   /orders/123/items    → Add item (201)
DELETE /orders/123/items/1  → Remove item (204)
```

## 🎉 What Works Great

1. **Caching**: CDNs cache GET requests
2. **Security**: Set rules by method
3. **Monitoring**: Track each operation
4. **Documentation**: Tools read your API
5. **Testing**: Clear request patterns

## 🤔 Should You Go to Level 3?

### Consider Level 3 If You:
- Build a public API
- Need flexible clients
- Plan long-term changes
- Have complex workflows
- Support many client types

### Stay at Level 2 If You:
- Build internal services
- Use simple CRUD
- Need top performance
- Have a new REST team
- Need fast development

## 📈 Optional Enhancements at Level 2

### You Already Do:
- ✅ Use HTTP methods correctly
- ✅ Send correct status codes
- ✅ Design with resources

### Consider Adding:
- [ ] Content negotiation with Accept headers
- [ ] ETags for caching
- [ ] Rate limit headers
- [ ] CORS setup
- [ ] Standard pagination
- [ ] RFC 9457 errors

## 🚀 If You Want Level 3

Level 3 adds hypermedia controls. This is called HATEOAS. HATEOAS means "Hypermedia as the Engine of Application State." With HATEOAS:
- Responses include action links
- Clients discover available actions
- API documents itself
- You implement the hypermedia constraint of RESTful architecture

[→ **Explore Level 3 Benefits**](next-steps.md)

## 🏆 Your Current Status

```
Level 0 ████ Complete!
Level 1 ████ Complete!
Level 2 ████████████ You are here (Industry Standard!)
Level 3 ░░░░ Optional enhancement
```

Level 2 is widely adopted by production APIs and balances complexity with features well.

## 🔍 Validate Your Implementation

Use this checklist for full Level 2 compliance:

### HTTP Methods:
- [ ] GET reads data only
- [ ] POST creates resources
- [ ] PUT replaces whole resource
- [ ] PATCH updates parts (optional)
- [ ] DELETE removes resources

### Status Codes:
- [ ] Success codes match operations
- [ ] Client errors use 4xx
- [ ] Server errors use 5xx
- [ ] Errors never return 200

### Resources:
- [ ] URLs use nouns, not verbs
- [ ] Collections use plural names
- [ ] Nesting shows relationships
- [ ] Query strings filter results

## 🎯 You Made It!

Level 2 is a great place to be. Your API is:
- **Standard compliant**
- **Well understood**
- **Tool friendly**
- **Fast and efficient**
- **Enterprise ready**

You built a solid REST API. Stay here or explore Level 3!