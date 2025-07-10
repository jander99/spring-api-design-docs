# Level 2: HTTP Verbs

## 📍 You Are Here - Industry Standard!

Congratulations! Your API has reached Level 2 of the Richardson Maturity Model. This is where most successful REST APIs operate.

## What This Means

### Characteristics of Level 2 APIs:
- **Proper HTTP methods** (GET, POST, PUT, DELETE)
- **Correct status codes** (200, 201, 404, etc.)
- **Resource-based URLs** with appropriate verbs
- **Stateless interactions**
- **Standard error responses**

### Typical Level 2 Requests:
```
GET    /users/123         → Retrieve user
POST   /users             → Create user
PUT    /users/123         → Update user
DELETE /users/123         → Delete user
```

## 🎯 Current State Checklist

Your API now properly uses:

- [x] **GET** for safe, idempotent reads
- [x] **POST** for creating new resources
- [x] **PUT/PATCH** for updates
- [x] **DELETE** for removal
- [x] **Meaningful status codes** (not just 200)
- [x] **Resource URLs** without actions
- [x] **Stateless requests** (no sessions)
- [x] **Standard error formats**
- [x] **HTTP headers** appropriately

## 💡 What You've Achieved:
- ✅ Industry-standard REST API
- ✅ Full HTTP protocol utilization
- ✅ Cacheable GET requests
- ✅ Clear operation semantics
- ✅ Standard tooling compatibility
- ✅ Predictable behavior

## 🌟 Level 2 Best Practices You Follow:

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

### Status Code Mastery:
| Code | Meaning | When You Use It |
|------|---------|-----------------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 202 | Accepted | Async operation started |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing auth |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource missing |
| 409 | Conflict | Business rule violation |
| 500 | Server Error | System failure |

## 📊 Your API Patterns

### Collection Operations:
```
GET    /orders              → List orders (200)
POST   /orders              → Create order (201)
GET    /orders?status=pending → Filtered list (200)
```

### Individual Resource:
```
GET    /orders/123          → Get specific order (200/404)
PUT    /orders/123          → Update order (200/404)
DELETE /orders/123          → Cancel order (204/404)
```

### Nested Resources:
```
GET    /orders/123/items    → Order items (200)
POST   /orders/123/items    → Add item (201)
DELETE /orders/123/items/1  → Remove item (204)
```

## 🎉 What's Working Great

1. **Caching**: CDNs and browsers cache GET requests
2. **Security**: Method-based authorization rules
3. **Monitoring**: Clear metrics per operation type
4. **Documentation**: Standard tools understand your API
5. **Testing**: Predictable request/response patterns

## 🤔 Should You Go to Level 3?

### Consider Level 3 If:
- Building a public API
- Need client flexibility
- Long-term API evolution
- Complex state transitions
- Multiple client types

### Stay at Level 2 If:
- Internal microservices
- Simple CRUD operations
- Performance is critical
- Team REST experience limited
- Rapid development needed

## 📈 Optional Enhancements at Level 2

### Already Doing:
- ✅ Proper HTTP methods
- ✅ Correct status codes
- ✅ Resource-based design

### Consider Adding:
- [ ] Content negotiation (Accept headers)
- [ ] ETags for caching
- [ ] Rate limiting headers
- [ ] CORS properly configured
- [ ] Pagination standards
- [ ] Consistent error format (RFC 7807)

## 🚀 If You Want Level 3

Level 3 adds hypermedia controls (HATEOAS). This means:
- Responses include links
- Clients discover capabilities
- API self-documenting
- True REST as defined by Fielding

[→ **Explore Level 3 Benefits**](next-steps.md)

## 🏆 Your Current Status

```
Level 0 ████ Complete!
Level 1 ████ Complete!
Level 2 ████████████ You are here (Industry Standard!)
Level 3 ░░░░ Optional enhancement
```

**You've achieved what 80% of successful APIs use!** Level 2 provides excellent balance between complexity and functionality.

## 🔍 Validate Your Implementation

Use our checklist to ensure full Level 2 compliance:

### HTTP Methods:
- [ ] GET never modifies data
- [ ] POST creates new resources
- [ ] PUT replaces entire resource
- [ ] PATCH updates partially (optional)
- [ ] DELETE removes resources

### Status Codes:
- [ ] Success codes vary by operation
- [ ] Client errors use 4xx codes
- [ ] Server errors use 5xx codes
- [ ] Never return 200 for errors

### Resources:
- [ ] URLs are nouns, not verbs
- [ ] Collections are plural
- [ ] Nesting represents relationships
- [ ] Query parameters for filtering

## 🎯 You've Made It!

Level 2 is a fantastic place to be. Your API is:
- **Standard compliant**
- **Well understood**
- **Tool friendly**
- **Performance optimized**
- **Enterprise ready**

Whether you stay here or explore Level 3, you've built a solid REST API!