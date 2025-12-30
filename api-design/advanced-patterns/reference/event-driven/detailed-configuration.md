# Event-Driven Architecture Configuration Reference

> **Reading Guide**
> - **Reading Time**: 5 minutes
> - **For**: Developers configuring event-driven systems
> - **Prerequisites**: Basic REST API knowledge
> - **Reading Level**: Grade 14.8 (Flesch: 8) - Technical reference

## Event Structure Standards

### Complete Event Schema
```json
{
  "id": "evt-12345",
  "type": "order.created",
  "timestamp": "2024-07-15T14:32:22Z",
  "source": "order-service",
  "data": {
    "orderId": "order-6789",
    "customerId": "cust-1234",
    "total": 99.95
  },
  "metadata": {
    "correlationId": "corr-12345",
    "causationId": "evt-12344",
    "version": "1.0",
    "tenantId": "tenant-123"
  }
}
```

### Event Metadata Fields
1. **Correlation ID**: Links related events across services
2. **Causation ID**: References the event that caused this event
3. **Timestamp**: When the event occurred (ISO 8601 format)
4. **Version**: Event schema version for evolution
5. **Source**: Service or component that produced the event
6. **Tenant ID**: Multi-tenant system identifier

## Event Routing Patterns

### Publish-Subscribe Pattern
Events distributed to all interested subscribers:

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

### Work Queue Pattern
Tasks distributed to available workers:

```http
POST /tasks HTTP/1.1
Content-Type: application/json

{
  "type": "process.order",
  "data": {
    "orderId": "order-123",
    "priority": "high"
  }
}

HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "taskId": "task-456",
  "status": "QUEUED",
  "estimatedProcessingTime": "30s"
}
```

### Routing Keys Pattern
Events routed based on specific attributes:

```http
POST /events HTTP/1.1
Content-Type: application/json

{
  "type": "order.status.changed",
  "routingKey": "order.region.us-east.status.shipped",
  "data": {
    "orderId": "order-123",
    "status": "SHIPPED",
    "region": "us-east"
  }
}

HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "eventId": "evt-789",
  "routedTo": ["us-east-fulfillment", "us-east-analytics"]
}
```

## Webhook Configuration

### Webhook Registration
```http
POST /webhooks HTTP/1.1
Content-Type: application/json

{
  "url": "https://external-service.com/webhook",
  "events": ["order.created", "order.shipped"],
  "secret": "webhook-secret-123",
  "retryPolicy": {
    "maxAttempts": 3,
    "backoffMs": 1000,
    "timeoutMs": 30000
  }
}

HTTP/1.1 201 Created
Content-Type: application/json

{
  "webhookId": "webhook-789",
  "status": "ACTIVE",
  "createdAt": "2024-07-15T14:32:22Z"
}
```

### Webhook Delivery
```http
POST /webhook HTTP/1.1
Content-Type: application/json
X-Event-Type: order.created
X-Event-ID: evt-123
X-Signature: sha256=...

{
  "event": {
    "id": "evt-123",
    "type": "order.created",
    "timestamp": "2024-07-15T14:32:22Z",
    "data": {
      "orderId": "order-456",
      "customerId": "cust-789"
    }
  }
}
```

## Caching Patterns

### Cache-Aside Pattern
```http
# Check cache first
GET /cache/order-123 HTTP/1.1

# If cache miss, fetch from source
GET /orders/order-123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
X-Cache-Status: MISS

{
  "id": "order-123",
  "status": "PROCESSING",
  "total": 99.99
}

# Update cache
PUT /cache/order-123 HTTP/1.1
Content-Type: application/json

{
  "id": "order-123",
  "status": "PROCESSING",
  "total": 99.99
}
```

### Write-Through Pattern
```http
POST /orders HTTP/1.1
Content-Type: application/json

{
  "customerId": "cust-123",
  "items": [{"itemId": "item-456", "quantity": 2}]
}

HTTP/1.1 201 Created
Content-Type: application/json
X-Cache-Status: UPDATED

{
  "id": "order-789",
  "status": "CREATED",
  "total": 59.98
}
```

## Cache Invalidation Strategies

### Time-Based Invalidation
```http
PUT /cache/order-123 HTTP/1.1
Content-Type: application/json
Cache-Control: max-age=3600

{
  "id": "order-123",
  "status": "PROCESSING",
  "total": 99.99
}
```

### Event-Based Invalidation
```http
POST /events HTTP/1.1
Content-Type: application/json

{
  "type": "order.updated",
  "data": {
    "orderId": "order-123",
    "status": "SHIPPED"
  },
  "cacheInvalidation": {
    "keys": ["order-123", "customer-orders-cust-456"]
  }
}
```

### Manual Invalidation
```http
DELETE /cache/order-123 HTTP/1.1

HTTP/1.1 204 No Content
X-Cache-Status: CLEARED
```

## Event Type Categories

### 1. Domain Events
Represent business-significant occurrences:
- `order.created`
- `payment.processed`
- `inventory.updated`

### 2. Integration Events
Support integration between services:
- `customer.profile.updated`
- `catalog.item.added`
- `shipping.status.changed`

### 3. Command Events
Represent instructions to perform actions:
- `process.payment`
- `update.inventory`
- `send.notification`

## Implementation Guidelines

### Event Schema Evolution
- Include version field in all events
- Maintain backward compatibility
- Use semantic versioning for schema changes
- Document breaking changes

### Idempotency
- Ensure event processing is idempotent
- Use unique event IDs for deduplication
- Implement at-least-once delivery semantics
- Handle duplicate events gracefully

### Event Ordering
- Consider event ordering requirements
- Use partition keys for ordered processing
- Implement sequence numbers when needed
- Handle out-of-order events appropriately