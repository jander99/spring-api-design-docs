# Event-Driven Architecture Examples

> **Reading Guide**
> - **Reading Time**: 5 minutes
> - **For**: Developers implementing event-driven APIs
> - **Prerequisites**: Strong API background, experience with complex systems
> - **Reading Level**: Grade 31.1 (Flesch: -26.2) - Code-heavy reference

## Event Processing Example

### Publishing Events
```http
POST /events HTTP/1.1
Content-Type: application/json

{
  "type": "order.created",
  "data": {
    "orderId": "order-123",
    "customerId": "cust-456",
    "total": 99.95
  }
}

HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "eventId": "evt-789",
  "status": "PUBLISHED",
  "subscribers": ["inventory-service", "notification-service", "analytics-service"]
}
```

### Event Webhook Processing
```http
POST /webhooks/order-events HTTP/1.1
Content-Type: application/json

{
  "event": "order.created",
  "data": {
    "orderId": "order-123",
    "customerId": "cust-456",
    "status": "CREATED"
  }
}
```

## Event Sourcing Example

### Storing Events
```http
POST /events/order-123 HTTP/1.1
Content-Type: application/json

{
  "type": "order.item.added",
  "data": {
    "itemId": "item-456",
    "quantity": 2,
    "price": 29.99
  }
}
```

### Retrieving Event Stream
```http
GET /events/order-123 HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"id": "evt-1", "type": "order.created", "data": {...}}
{"id": "evt-2", "type": "order.item.added", "data": {...}}
{"id": "evt-3", "type": "order.item.removed", "data": {...}}
```

### Replaying Events
```http
GET /events/order-123/replay HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"event": "order.created", "data": {"orderId": "order-123"}}
{"event": "order.item.added", "data": {"itemId": "item-456"}}
{"event": "order.shipped", "data": {"trackingNumber": "123456"}}
```

## CQRS Example

### Command Side (Write Operations)
```http
POST /commands/create-order HTTP/1.1
Content-Type: application/json

{
  "customerId": "cust-123",
  "items": [{"itemId": "item-456", "quantity": 2}]
}
```

### Query Side (Read Operations)
```http
GET /queries/order-summary/order-123 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{
  "orderId": "order-123",
  "status": "PROCESSING",
  "itemCount": 2,
  "total": 59.98
}
```

## Saga Pattern Example

### Starting a Saga
```http
POST /sagas/order-processing HTTP/1.1
Content-Type: application/json

{
  "orderId": "order-123",
  "steps": [
    {"service": "inventory", "action": "reserve"},
    {"service": "payment", "action": "charge"},
    {"service": "shipping", "action": "schedule"}
  ]
}

HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "sagaId": "saga-456",
  "status": "STARTED",
  "currentStep": 1
}
```

## Event Streaming Example

### Real-Time Event Stream
```http
GET /events/stream HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 1
event: order.created
data: {"orderId": "order-123", "status": "CREATED"}

id: 2
event: order.updated
data: {"orderId": "order-123", "status": "PROCESSING"}
```

### Filtered Event Stream
```http
GET /events/stream?types=order.created,order.shipped HTTP/1.1
Accept: text/event-stream

GET /events/stream?customer=cust-123&region=us-east HTTP/1.1
Accept: text/event-stream
```

## Event Testing Examples

### Testing Event Publishing
```http
POST /events HTTP/1.1
Content-Type: application/json

{
  "type": "test.event",
  "data": {"testId": "test-123"}
}

GET /events/test-123/delivery-status HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "eventId": "evt-456",
  "delivered": true,
  "subscribers": ["test-service"],
  "deliveryTime": "2024-07-15T14:32:25Z"
}
```

### Testing Event Processing
```http
POST /events HTTP/1.1
Content-Type: application/json

{
  "type": "order.created",
  "data": {"orderId": "test-order-123"}
}

GET /orders/test-order-123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "test-order-123",
  "status": "PROCESSING",
  "processedAt": "2024-07-15T14:32:25Z"
}
```