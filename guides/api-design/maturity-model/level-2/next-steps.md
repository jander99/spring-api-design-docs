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

**Level 2 Response** (no links):
```http
GET /users/42 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 42,
  "name": "Jane Smith",
  "email": "jane@example.com"
}
```

**Level 3 Response** (with self link):
```http
GET /users/42 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 42,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "_links": {
    "self": { "href": "/users/42" }
  }
}
```

### Add Related Resource Links:

Include links to associated resources that clients commonly need:

```http
GET /orders/123 HTTP/1.1
Accept: application/hal+json

HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "pending",
  "total": 149.99,
  "_links": {
    "self": { "href": "/orders/123" },
    "customer": { "href": "/customers/456" },
    "items": { "href": "/orders/123/items" },
    "invoice": { "href": "/invoices/789" }
  }
}
```

### Add Available Actions:

Links change based on resource state. A pending order offers different actions than a confirmed order:

**Pending Order** (can cancel or update):
```http
GET /orders/123 HTTP/1.1
Accept: application/hal+json

HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "pending",
  "total": 149.99,
  "_links": {
    "self": { "href": "/orders/123" },
    "cancel": { "href": "/orders/123/cancel", "method": "POST" },
    "update": { "href": "/orders/123", "method": "PUT" }
  }
}
```

**Confirmed Order** (can ship):
```http
GET /orders/123 HTTP/1.1
Accept: application/hal+json

HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "confirmed",
  "total": 149.99,
  "_links": {
    "self": { "href": "/orders/123" },
    "ship": { "href": "/orders/123/ship", "method": "POST" }
  }
}
```

## Step 3: State-Based Navigation

### Order State Machine:

Each order state exposes different available actions through links:

**Draft Order** (can submit or update):
```http
GET /orders/123 HTTP/1.1
Accept: application/hal+json

HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "draft",
  "total": 0.00,
  "_links": {
    "self": { "href": "/orders/123" },
    "submit": { "href": "/orders/123/submit", "method": "POST" },
    "update": { "href": "/orders/123", "method": "PUT" }
  }
}
```

**Pending Order** (can cancel or pay):
```http
GET /orders/123 HTTP/1.1
Accept: application/hal+json

HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "pending",
  "total": 149.99,
  "_links": {
    "self": { "href": "/orders/123" },
    "cancel": { "href": "/orders/123/cancel", "method": "POST" },
    "payment": { "href": "/orders/123/payment", "method": "POST" }
  }
}
```

**Paid Order** (can ship or refund):
```http
GET /orders/123 HTTP/1.1
Accept: application/hal+json

HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "paid",
  "total": 149.99,
  "_links": {
    "self": { "href": "/orders/123" },
    "ship": { "href": "/orders/123/ship", "method": "POST" },
    "refund": { "href": "/orders/123/refund", "method": "POST" }
  }
}
```

**Shipped Order** (can track):
```http
GET /orders/123 HTTP/1.1
Accept: application/hal+json

HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "shipped",
  "total": 149.99,
  "_links": {
    "self": { "href": "/orders/123" },
    "track": { "href": "/shipments/ship-456" }
  }
}
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

## Client Behavior Example

### Level 2 Client (Hardcoded URLs):

The client must know all URLs in advance and construct them manually:

```http
GET /users/123 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 123,
  "name": "Jane Smith"
}
```

Client then constructs the next URL manually: `/users/123/orders`

```http
GET /users/123/orders HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

[
  { "id": 1, "total": 99.99 },
  { "id": 2, "total": 149.99 }
]
```

### Level 3 Client (Follows Links):

The client discovers URLs from the response and follows them:

```http
GET /users/123 HTTP/1.1
Accept: application/hal+json

HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "name": "Jane Smith",
  "_links": {
    "self": { "href": "/users/123" },
    "orders": { "href": "/users/123/orders" }
  }
}
```

Client extracts `_links.orders.href` and follows it:

```http
GET /users/123/orders HTTP/1.1
Accept: application/hal+json

HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "items": [
    { "id": 1, "total": 99.99 },
    { "id": 2, "total": 149.99 }
  ],
  "_links": {
    "self": { "href": "/users/123/orders" }
  }
}
```

The client never hardcodes URLs—it discovers them at runtime.

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
- **Standards**: Implements the hypermedia constraint

## Next Steps

If you implement HATEOAS, you'll have reached the highest level of the Richardson Maturity Model. Check the [Level 3 Guide](../level-3/) for best practices and examples!