# E-Commerce Order API Example

> **Reading Guide**: ~18 min read | Grade 13 | Complete order management API

This example shows a complete e-commerce order API. It demonstrates resource design, CRUD operations, pagination, error handling, and rate limiting in a realistic business context.

---

## Patterns Demonstrated

This example teaches these API design patterns:

| Pattern | Section | Documentation Reference |
|---------|---------|------------------------|
| Resource naming with plural nouns | Resource Design | [Resource Naming](../foundations/resource-naming-and-url-structure.md) |
| HTTP methods for CRUD operations | Order Operations | [HTTP Methods](../quick-reference/http-methods.md) |
| Offset-based pagination | List Orders | [Pagination](../request-response/pagination-and-filtering.md) |
| RFC 9457 error responses | Error Handling | [Error Standards](../request-response/error-response-standards.md) |
| Bearer token authentication | All Requests | [Security Standards](../security/security-standards.md) |
| Rate limiting headers | All Responses | [Rate Limiting](../security/rate-limiting-standards.md) |
| Parent-child resources | Order Items | [Resource Hierarchy](../foundations/resource-naming-and-url-structure.md#resource-hierarchy) |

---

## Business Context

Acme Electronics runs an online store. Customers browse products, add items to carts, and place orders. The Order API manages the order lifecycle from creation to fulfillment.

### Key Entities

- **Orders**: Purchase transactions with status tracking
- **Order Items**: Products within an order with quantities and prices
- **Customers**: Buyers who place orders (referenced by ID)
- **Products**: Items available for purchase (referenced by ID)

---

## Resource Design

### URL Structure

```
/v1/orders                              # Order collection
/v1/orders/{orderId}                    # Single order
/v1/orders/{orderId}/items              # Items within an order
/v1/orders/{orderId}/items/{itemId}     # Single item within an order
```

### Order Resource

```json
{
  "id": "ord-2024-00847",
  "customerId": "cust-5839",
  "status": "PROCESSING",
  "items": [
    {
      "id": "item-001",
      "productId": "prod-laptop-15",
      "productName": "ProBook Laptop 15-inch",
      "quantity": 1,
      "unitPrice": 1299.99,
      "totalPrice": 1299.99
    },
    {
      "id": "item-002",
      "productId": "prod-usbc-hub",
      "productName": "USB-C Hub 7-Port",
      "quantity": 2,
      "unitPrice": 49.99,
      "totalPrice": 99.98
    }
  ],
  "subtotal": 1399.97,
  "tax": 112.00,
  "shippingCost": 0.00,
  "total": 1511.97,
  "shippingAddress": {
    "street": "742 Evergreen Terrace",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62704",
    "country": "US"
  },
  "paymentMethod": "CREDIT_CARD",
  "paymentStatus": "CAPTURED",
  "createdAt": "2024-07-15T09:23:45Z",
  "updatedAt": "2024-07-15T10:15:22Z",
  "estimatedDelivery": "2024-07-19"
}
```

### Order Status Values

| Status | Description |
|--------|-------------|
| `CREATED` | Order placed, payment not yet processed |
| `PENDING_PAYMENT` | Awaiting payment confirmation |
| `PROCESSING` | Payment received, preparing for shipment |
| `SHIPPED` | Order dispatched to carrier |
| `DELIVERED` | Order delivered to customer |
| `CANCELLED` | Order cancelled before shipment |
| `REFUNDED` | Order refunded after delivery |

---

## Authentication

All requests require a Bearer token in the Authorization header.

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMzQ1Iiwic2NvcGUiOiJvcmRlcnM6cmVhZCBvcmRlcnM6d3JpdGUiLCJleHAiOjE3MjEwNTI4MDB9.signature
```

---

## Create Order

Creates a new order for a customer.

### Request

```http
POST /v1/orders HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Request-ID: req-a1b2c3d4-e5f6-7890

{
  "customerId": "cust-5839",
  "items": [
    {
      "productId": "prod-laptop-15",
      "quantity": 1
    },
    {
      "productId": "prod-usbc-hub",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "742 Evergreen Terrace",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62704",
    "country": "US"
  },
  "paymentMethod": "CREDIT_CARD"
}
```

### Response: Success (201 Created)

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /v1/orders/ord-2024-00847
X-Request-ID: req-a1b2c3d4-e5f6-7890
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 1721055600

{
  "id": "ord-2024-00847",
  "customerId": "cust-5839",
  "status": "CREATED",
  "items": [
    {
      "id": "item-001",
      "productId": "prod-laptop-15",
      "productName": "ProBook Laptop 15-inch",
      "quantity": 1,
      "unitPrice": 1299.99,
      "totalPrice": 1299.99
    },
    {
      "id": "item-002",
      "productId": "prod-usbc-hub",
      "productName": "USB-C Hub 7-Port",
      "quantity": 2,
      "unitPrice": 49.99,
      "totalPrice": 99.98
    }
  ],
  "subtotal": 1399.97,
  "tax": 112.00,
  "shippingCost": 0.00,
  "total": 1511.97,
  "shippingAddress": {
    "street": "742 Evergreen Terrace",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62704",
    "country": "US"
  },
  "paymentMethod": "CREDIT_CARD",
  "paymentStatus": "PENDING",
  "createdAt": "2024-07-15T09:23:45Z",
  "updatedAt": "2024-07-15T09:23:45Z",
  "estimatedDelivery": null
}
```

---

## Get Order

Retrieves a single order by ID.

### Request

```http
GET /v1/orders/ord-2024-00847 HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Cache-Control: private, max-age=60
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 997
X-RateLimit-Reset: 1721055600

{
  "id": "ord-2024-00847",
  "customerId": "cust-5839",
  "status": "PROCESSING",
  "items": [
    {
      "id": "item-001",
      "productId": "prod-laptop-15",
      "productName": "ProBook Laptop 15-inch",
      "quantity": 1,
      "unitPrice": 1299.99,
      "totalPrice": 1299.99
    },
    {
      "id": "item-002",
      "productId": "prod-usbc-hub",
      "productName": "USB-C Hub 7-Port",
      "quantity": 2,
      "unitPrice": 49.99,
      "totalPrice": 99.98
    }
  ],
  "subtotal": 1399.97,
  "tax": 112.00,
  "shippingCost": 0.00,
  "total": 1511.97,
  "shippingAddress": {
    "street": "742 Evergreen Terrace",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62704",
    "country": "US"
  },
  "paymentMethod": "CREDIT_CARD",
  "paymentStatus": "CAPTURED",
  "createdAt": "2024-07-15T09:23:45Z",
  "updatedAt": "2024-07-15T10:15:22Z",
  "estimatedDelivery": "2024-07-19"
}
```

---

## List Orders with Pagination

Retrieves a paginated list of orders with optional filtering.

### Request

```http
GET /v1/orders?page=0&size=20&status=PROCESSING&sort=createdAt,desc HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | integer | Page number (0-indexed) | `0` |
| `size` | integer | Items per page (max 100) | `20` |
| `status` | string | Filter by order status | `PROCESSING` |
| `customerId` | string | Filter by customer | `cust-5839` |
| `createdAfter` | datetime | Orders created after date | `2024-07-01T00:00:00Z` |
| `createdBefore` | datetime | Orders created before date | `2024-07-31T23:59:59Z` |
| `minTotal` | number | Minimum order total | `100.00` |
| `sort` | string | Sort field and direction | `createdAt,desc` |

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 996
X-RateLimit-Reset: 1721055600

{
  "data": [
    {
      "id": "ord-2024-00847",
      "customerId": "cust-5839",
      "status": "PROCESSING",
      "total": 1511.97,
      "itemCount": 2,
      "createdAt": "2024-07-15T09:23:45Z",
      "estimatedDelivery": "2024-07-19"
    },
    {
      "id": "ord-2024-00842",
      "customerId": "cust-2941",
      "status": "PROCESSING",
      "total": 299.99,
      "itemCount": 1,
      "createdAt": "2024-07-14T16:45:12Z",
      "estimatedDelivery": "2024-07-18"
    },
    {
      "id": "ord-2024-00838",
      "customerId": "cust-7722",
      "status": "PROCESSING",
      "total": 89.97,
      "itemCount": 3,
      "createdAt": "2024-07-14T11:20:33Z",
      "estimatedDelivery": "2024-07-18"
    }
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 47,
      "totalPages": 3
    },
    "filters": {
      "status": "PROCESSING"
    },
    "sort": [
      {"field": "createdAt", "direction": "DESC"}
    ]
  }
}
```

---

## Update Order

Updates an existing order. Only certain fields can be modified based on order status.

### Request: Update Shipping Address

```http
PATCH /v1/orders/ord-2024-00847 HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/merge-patch+json
If-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"

{
  "shippingAddress": {
    "street": "123 Oak Street",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62705",
    "country": "US"
  }
}
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "7c3d2b1a8f9e4d5c6b7a8e9f0d1c2b3a4e5f6789"
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1721055600

{
  "id": "ord-2024-00847",
  "customerId": "cust-5839",
  "status": "PROCESSING",
  "shippingAddress": {
    "street": "123 Oak Street",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62705",
    "country": "US"
  },
  "updatedAt": "2024-07-15T11:30:00Z"
}
```

---

## Cancel Order

Cancels an order that has not yet shipped.

### Request

```http
POST /v1/orders/ord-2024-00847/cancel HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "Customer changed mind",
  "refundMethod": "ORIGINAL_PAYMENT"
}
```

### Response: Success (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 994
X-RateLimit-Reset: 1721055600

{
  "id": "ord-2024-00847",
  "status": "CANCELLED",
  "cancellationReason": "Customer changed mind",
  "cancelledAt": "2024-07-15T12:00:00Z",
  "refund": {
    "status": "PROCESSING",
    "amount": 1511.97,
    "method": "ORIGINAL_PAYMENT",
    "estimatedCompletion": "2024-07-17"
  }
}
```

---

## Add Item to Order

Adds a new item to an existing order (only for orders in CREATED status).

### Request

```http
POST /v1/orders/ord-2024-00847/items HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "productId": "prod-mouse-wireless",
  "quantity": 1
}
```

### Response: Success (201 Created)

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /v1/orders/ord-2024-00847/items/item-003
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 993
X-RateLimit-Reset: 1721055600

{
  "id": "item-003",
  "productId": "prod-mouse-wireless",
  "productName": "Ergonomic Wireless Mouse",
  "quantity": 1,
  "unitPrice": 39.99,
  "totalPrice": 39.99,
  "addedAt": "2024-07-15T09:25:00Z"
}
```

---

## Remove Item from Order

Removes an item from an order (only for orders in CREATED status).

### Request

```http
DELETE /v1/orders/ord-2024-00847/items/item-002 HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response: Success (204 No Content)

```http
HTTP/1.1 204 No Content
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 992
X-RateLimit-Reset: 1721055600
```

---

## Error Responses

All errors follow the RFC 9457 Problem Details format.

### Validation Error (400 Bad Request)

**Scenario**: Creating an order with invalid data

```http
POST /v1/orders HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "customerId": "",
  "items": [],
  "shippingAddress": {
    "city": "Springfield"
  },
  "paymentMethod": "BITCOIN"
}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json
X-Request-ID: req-x1y2z3a4-b5c6-7890

{
  "type": "https://api.acme-electronics.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The order request contains validation errors",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "customerId",
      "code": "REQUIRED",
      "message": "Customer ID is required"
    },
    {
      "field": "items",
      "code": "MIN_SIZE",
      "message": "Order must contain at least one item"
    },
    {
      "field": "shippingAddress.street",
      "code": "REQUIRED",
      "message": "Street address is required"
    },
    {
      "field": "shippingAddress.zipCode",
      "code": "REQUIRED",
      "message": "ZIP code is required"
    },
    {
      "field": "paymentMethod",
      "code": "INVALID_VALUE",
      "message": "Payment method must be one of: CREDIT_CARD, DEBIT_CARD, PAYPAL, BANK_TRANSFER"
    }
  ],
  "requestId": "req-x1y2z3a4-b5c6-7890"
}
```

### Not Found Error (404 Not Found)

**Scenario**: Requesting an order that does not exist

```http
GET /v1/orders/ord-9999-99999 HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json
X-Request-ID: req-d4e5f6g7-h8i9-0123

{
  "type": "https://api.acme-electronics.com/problems/order-not-found",
  "title": "Order Not Found",
  "status": 404,
  "detail": "No order exists with ID 'ord-9999-99999'",
  "instance": "/v1/orders/ord-9999-99999",
  "requestId": "req-d4e5f6g7-h8i9-0123"
}
```

### Conflict Error (409 Conflict)

**Scenario**: Attempting to cancel an order that has already shipped

```http
POST /v1/orders/ord-2024-00830/cancel HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "Customer changed mind"
}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json
X-Request-ID: req-j1k2l3m4-n5o6-7890

{
  "type": "https://api.acme-electronics.com/problems/order-cannot-be-cancelled",
  "title": "Order Cannot Be Cancelled",
  "status": 409,
  "detail": "Orders that have been shipped cannot be cancelled. Please initiate a return instead.",
  "instance": "/v1/orders/ord-2024-00830/cancel",
  "orderId": "ord-2024-00830",
  "currentStatus": "SHIPPED",
  "shippedAt": "2024-07-14T08:30:00Z",
  "trackingNumber": "1Z999AA10123456784",
  "alternativeAction": {
    "action": "INITIATE_RETURN",
    "endpoint": "/v1/orders/ord-2024-00830/returns",
    "method": "POST"
  },
  "requestId": "req-j1k2l3m4-n5o6-7890"
}
```

### Precondition Failed (412 Precondition Failed)

**Scenario**: Updating an order with a stale ETag

```http
PATCH /v1/orders/ord-2024-00847 HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/merge-patch+json
If-Match: "outdated-etag-value"

{
  "shippingAddress": {
    "street": "456 New Street"
  }
}
```

```http
HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json
X-Request-ID: req-p1q2r3s4-t5u6-7890

{
  "type": "https://api.acme-electronics.com/problems/precondition-failed",
  "title": "Precondition Failed",
  "status": 412,
  "detail": "The order has been modified since you last retrieved it. Please fetch the current version and retry.",
  "instance": "/v1/orders/ord-2024-00847",
  "currentETag": "7c3d2b1a8f9e4d5c6b7a8e9f0d1c2b3a4e5f6789",
  "providedETag": "outdated-etag-value",
  "requestId": "req-p1q2r3s4-t5u6-7890"
}
```

### Rate Limit Exceeded (429 Too Many Requests)

**Scenario**: Client has exceeded the request rate limit

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 45
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1721055645

{
  "type": "https://api.acme-electronics.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded the maximum of 1000 requests per hour. Please wait before retrying.",
  "instance": "/v1/orders",
  "limit": 1000,
  "remaining": 0,
  "resetAt": "2024-07-15T14:00:45Z",
  "retryAfter": 45
}
```

### Authentication Error (401 Unauthorized)

**Scenario**: Request with expired or invalid token

```http
GET /v1/orders HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer expired-or-invalid-token
```

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: Bearer realm="api", error="invalid_token", error_description="Token has expired"

{
  "type": "https://api.acme-electronics.com/problems/authentication-required",
  "title": "Authentication Required",
  "status": 401,
  "detail": "The provided authentication token has expired. Please obtain a new token.",
  "instance": "/v1/orders"
}
```

### Authorization Error (403 Forbidden)

**Scenario**: Accessing another customer's order

```http
GET /v1/orders/ord-2024-00100 HTTP/1.1
Host: api.acme-electronics.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://api.acme-electronics.com/problems/access-denied",
  "title": "Access Denied",
  "status": 403,
  "detail": "You do not have permission to access this order",
  "instance": "/v1/orders/ord-2024-00100"
}
```

---

## Rate Limiting Headers

All responses include rate limiting information:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests per window | `1000` |
| `X-RateLimit-Remaining` | Requests remaining in window | `998` |
| `X-RateLimit-Reset` | Unix timestamp when window resets | `1721055600` |
| `Retry-After` | Seconds until retry (on 429 only) | `45` |

---

## Summary

This example demonstrated a complete e-commerce order API with:

- **Resource design**: Orders and items as parent-child resources
- **CRUD operations**: Create, read, update with proper HTTP methods
- **Pagination**: Offset-based with filtering and sorting
- **Error handling**: RFC 9457 Problem Details for all error types
- **Authentication**: Bearer tokens with proper 401/403 responses
- **Rate limiting**: Standard headers on all responses
- **Optimistic concurrency**: ETags for conflict detection

---

## Related Documentation

- [Resource Naming & URL Structure](../foundations/resource-naming-and-url-structure.md)
- [HTTP Methods Quick Reference](../quick-reference/http-methods.md)
- [Pagination and Filtering](../request-response/pagination-and-filtering.md)
- [Error Response Standards](../request-response/error-response-standards.md)
- [Security Standards](../security/security-standards.md)
- [Rate Limiting Standards](../security/rate-limiting-standards.md)
