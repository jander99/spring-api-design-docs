# Level 3 Best Practices: Mastering HATEOAS

## Optimizing Your Hypermedia API

### 1. Link Design Principles

#### Use Standard Relations When Possible:
```json
{
  "_links": {
    "self": { "href": "/orders/123" },
    "next": { "href": "/orders?page=2" },
    "payment": { "href": "/orders/123/payment" }
  }
}
```

The `self` and `next` relations are IANA standard link relations. Use standard relations when they fit your use case. Reserve custom relations like `payment` for domain-specific actions.

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

#### Only Show Available Actions

The key principle of HATEOAS is that available links change based on resource state. Here are responses for the same order in different states:

**Draft Order Response:**
```http
GET /orders/123 HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "draft",
  "total": 150.00,
  "_links": {
    "self": { "href": "/orders/123" },
    "submit": { "href": "/orders/123/submit", "method": "POST" },
    "update": { "href": "/orders/123", "method": "PUT" },
    "delete": { "href": "/orders/123", "method": "DELETE" }
  }
}
```

**Pending Payment Order Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "pending_payment",
  "total": 150.00,
  "_links": {
    "self": { "href": "/orders/123" },
    "payment": { "href": "/orders/123/payment", "method": "POST" },
    "cancel": { "href": "/orders/123/cancel", "method": "POST" }
  }
}
```

**Shipped Order Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "shipped",
  "total": 150.00,
  "trackingNumber": "1Z999AA10123456784",
  "_links": {
    "self": { "href": "/orders/123" },
    "track": { "href": "/shipments/1Z999AA10123456784" }
  }
}
```

Note that shipped orders have no `delete` or `cancel` links. The absence of a link tells clients that action is not available.

### 3. Performance Optimization

#### Conditional Link Inclusion

Support a `verbose` parameter to control link detail level:

**Standard Request:**
```http
GET /orders/123 HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "pending_payment",
  "_links": {
    "self": { "href": "/orders/123" }
  }
}
```

**Verbose Request:**
```http
GET /orders/123?verbose=true HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "pending_payment",
  "_links": {
    "self": { "href": "/orders/123" },
    "payment": { 
      "href": "/orders/123/payment", 
      "method": "POST",
      "title": "Submit payment for this order",
      "accepts": "application/json"
    },
    "cancel": { 
      "href": "/orders/123/cancel", 
      "method": "POST",
      "title": "Cancel this order"
    },
    "customer": { "href": "/customers/456" },
    "items": { "href": "/orders/123/items" }
  }
}
```

#### Link Templates (URI Templates)

Use RFC 6570 URI Templates to reduce response size for collections:

```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "orders": [
    { "id": 123, "status": "pending" },
    { "id": 124, "status": "shipped" },
    { "id": 125, "status": "draft" }
  ],
  "_links": {
    "self": { "href": "/orders" },
    "order": { 
      "href": "/orders/{id}", 
      "templated": true 
    },
    "orderItems": { 
      "href": "/orders/{id}/items", 
      "templated": true 
    }
  }
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
    "reviews": [
      {
        "id": 1,
        "rating": 5,
        "_links": {
          "self": { "href": "/reviews/1" }
        }
      }
    ]
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
```http
POST /orders/123/payment HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "amount": 500.00,
  "paymentMethod": "account_balance"
}
```

```http
HTTP/1.1 402 Payment Required
Content-Type: application/problem+json

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
```http
GET / HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

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
OPTIONS /orders/123 HTTP/1.1
Host: api.example.com
```

```http
HTTP/1.1 200 OK
Allow: GET, PUT, DELETE
Link: </orders/123>; rel="self",
      </orders/123/items>; rel="items",
      </orders/123/cancel>; rel="cancel"
```

### 7. Client Interaction Patterns

#### Following Links Through a Workflow

A HATEOAS client follows links rather than constructing URLs. Here's a complete order workflow:

**Step 1: Discover the API**
```http
GET / HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "title": "Example API",
  "_links": {
    "orders": { "href": "/orders" }
  }
}
```

**Step 2: Follow the orders link**
```http
GET /orders HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "_embedded": {
    "orders": [
      {
        "id": 123,
        "status": "pending_payment",
        "_links": {
          "self": { "href": "/orders/123" }
        }
      }
    ]
  },
  "_links": {
    "self": { "href": "/orders" }
  }
}
```

**Step 3: Follow the self link to get order details**
```http
GET /orders/123 HTTP/1.1
Host: api.example.com
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "status": "pending_payment",
  "total": 150.00,
  "_links": {
    "self": { "href": "/orders/123" },
    "items": { "href": "/orders/123/items" },
    "payment": { "href": "/orders/123/payment", "method": "POST" }
  }
}
```

**Step 4: Follow the payment link to complete the order**
```http
POST /orders/123/payment HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "amount": 150.00,
  "paymentMethod": "credit_card"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/hal+json

{
  "id": 456,
  "orderId": 123,
  "amount": 150.00,
  "status": "completed",
  "_links": {
    "self": { "href": "/payments/456" },
    "order": { "href": "/orders/123" },
    "receipt": { "href": "/payments/456/receipt" }
  }
}
```

### 8. Testing HATEOAS APIs

Validate that links appear only when appropriate for the resource state.

#### Test: Draft Orders Have Submit Link

```http
GET /orders/789 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Expected Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 789,
  "status": "draft",
  "_links": {
    "self": { "href": "/orders/789" },
    "submit": { "href": "/orders/789/submit", "method": "POST" },
    "update": { "href": "/orders/789", "method": "PUT" },
    "delete": { "href": "/orders/789", "method": "DELETE" }
  }
}
```

**Validation:** Response must include `_links.submit` with `method: "POST"`.

#### Test: Shipped Orders Have No Cancel Link

```http
GET /orders/456 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Expected Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 456,
  "status": "shipped",
  "trackingNumber": "1Z999AA10123456784",
  "_links": {
    "self": { "href": "/orders/456" },
    "track": { "href": "/shipments/1Z999AA10123456784" }
  }
}
```

**Validation:** Response must NOT include `_links.cancel`. The cancel action is invalid for shipped orders.

### 9. Common Pitfalls to Avoid

#### Don't Include Invalid Links

**Incorrect - Cancel link on completed order:**
```json
{
  "status": "completed",
  "_links": {
    "cancel": { "href": "/orders/123/cancel" }
  }
}
```

**Correct - No cancel link on completed order:**
```json
{
  "status": "completed",
  "_links": {
    "self": { "href": "/orders/123" },
    "receipt": { "href": "/orders/123/receipt" }
  }
}
```

#### Use Relative URLs

Let infrastructure handle host resolution. This makes your API portable across environments.

**Incorrect - Hardcoded absolute URL:**
```json
{
  "_links": {
    "self": { "href": "https://api.example.com/orders/123" }
  }
}
```

**Correct - Relative URL:**
```json
{
  "_links": {
    "self": { "href": "/orders/123" }
  }
}
```

#### Include Links in Error Responses

**Incorrect - Error with no navigation:**
```json
{
  "error": "Not found"
}
```

**Correct - Error with helpful links:**
```json
{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "_links": {
    "search": { "href": "/search" },
    "home": { "href": "/" }
  }
}
```

### 10. Advanced Patterns

#### Async Operations:
```http
POST /large-reports HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "reportType": "annual_sales",
  "year": 2024
}
```

```http
HTTP/1.1 202 Accepted
Content-Type: application/hal+json

{
  "jobId": "abc123",
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

#### Conditional Fields Based on Permissions:

```http
HTTP/1.1 200 OK
Content-Type: application/hal+json

{
  "id": 123,
  "email": "user@example.com",
  "name": "Jane Smith",
  "_links": {
    "self": { "href": "/users/123" },
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
          "requiredPermission": "admin"
        }
      }
    }
  }
}
```

## Key Takeaways

1. **Links reflect state** - Only show valid actions
2. **Performance matters** - Optimize link generation
3. **Consistency is key** - Use same patterns everywhere
4. **Document relations** - Make links self-explanatory
5. **Test thoroughly** - Validate state transitions
6. **Handle errors gracefully** - Include navigation in errors
7. **Support discovery** - Make API explorable

Your Level 3 API is powerful - these practices ensure it's also practical!
