# Event-Driven Architecture

## Overview

This document outlines event-driven architecture patterns for building reactive APIs, focusing on event types, routing strategies, and caching mechanisms. These patterns support building scalable, loosely-coupled systems that can handle asynchronous processing and real-time event distribution.

## Event-Driven Patterns

### Event Types

Define standard event categories:

1. **Domain Events**: Represent business-significant occurrences
2. **Integration Events**: Support integration between services
3. **Command Events**: Represent instructions to perform actions

### Event Structure

Standardize event data format:

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
    "causationId": "evt-12344"
  }
}
```

### Event Metadata

Include essential metadata with every event:

1. **Correlation ID**: Links related events across services
2. **Causation ID**: References the event that caused this event
3. **Timestamp**: When the event occurred
4. **Version**: Event schema version for evolution
5. **Source**: Service or component that produced the event

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

## Event Processing Patterns

### Event Sourcing

Store events as the source of truth:

```http
# Store event
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

# Retrieve event stream
GET /events/order-123 HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"id": "evt-1", "type": "order.created", "data": {...}}
{"id": "evt-2", "type": "order.item.added", "data": {...}}
{"id": "evt-3", "type": "order.item.removed", "data": {...}}
```

### CQRS (Command Query Responsibility Segregation)

Separate read and write models:

```http
# Command side - write operations
POST /commands/create-order HTTP/1.1
Content-Type: application/json

{
  "customerId": "cust-123",
  "items": [{"itemId": "item-456", "quantity": 2}]
}

# Query side - read operations
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

### Saga Pattern

Manage distributed transactions:

```http
# Start saga
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

## Event Webhooks

### Webhook Registration

Allow services to register for event notifications:

```http
POST /webhooks HTTP/1.1
Content-Type: application/json

{
  "url": "https://external-service.com/webhook",
  "events": ["order.created", "order.shipped"],
  "secret": "webhook-secret-123"
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

Deliver events to registered webhooks:

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

## Caching in Reactive Systems

### Reactive Caching Patterns

1. **Cache Then Fetch**: Return cached data immediately, then update
2. **Fetch on Cache Miss**: Check cache first, fetch only if needed
3. **Background Refresh**: Update cache in background before expiration

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
# Write to cache and source simultaneously
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

### Cache Invalidation

#### Time-Based Invalidation

```http
# Set cache with TTL
PUT /cache/order-123 HTTP/1.1
Content-Type: application/json
Cache-Control: max-age=3600

{
  "id": "order-123",
  "status": "PROCESSING",
  "total": 99.99
}
```

#### Event-Based Invalidation

```http
# Invalidate cache on event
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

#### Manual Invalidation

```http
# Explicit cache clear
DELETE /cache/order-123 HTTP/1.1

HTTP/1.1 204 No Content
X-Cache-Status: CLEARED
```

## Event Streaming

### Real-Time Event Processing

```http
# Subscribe to event stream
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

### Event Filtering

```http
# Filter events by type
GET /events/stream?types=order.created,order.shipped HTTP/1.1
Accept: text/event-stream

# Filter events by criteria
GET /events/stream?customer=cust-123&region=us-east HTTP/1.1
Accept: text/event-stream
```

## Event Testing

### Event Publishing Tests

```http
# Test event publishing
POST /events HTTP/1.1
Content-Type: application/json

{
  "type": "test.event",
  "data": {"testId": "test-123"}
}

# Verify event delivery
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

### Event Processing Tests

```http
# Test event processing
POST /events HTTP/1.1
Content-Type: application/json

{
  "type": "order.created",
  "data": {"orderId": "test-order-123"}
}

# Verify processing results
GET /orders/test-order-123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "test-order-123",
  "status": "PROCESSING",
  "processedAt": "2024-07-15T14:32:25Z"
}
```

## Examples

### Event-Driven Processing Example

```http
// Event notification via webhook
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

### Event Sourcing Example

```http
# Replay events to rebuild state
GET /events/order-123/replay HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"event": "order.created", "data": {"orderId": "order-123"}}
{"event": "order.item.added", "data": {"itemId": "item-456"}}
{"event": "order.shipped", "data": {"trackingNumber": "123456"}}
```

## Related Documentation

- [HTTP Streaming Patterns](./HTTP-Streaming-Patterns.md): HTTP streaming implementation patterns
- [Reactive Error Handling](./Reactive-Error-Handling.md): Error handling patterns for reactive systems

## Implementation Notes

When implementing event-driven architecture:

- **Framework-specific examples**: For Spring WebFlux implementations, see the spring-design standards documentation
- **Event schema evolution**: Design events with schema versioning in mind
- **Idempotency**: Ensure event processing is idempotent to handle duplicates
- **Ordering**: Consider event ordering requirements and implement accordingly

These patterns provide a foundation for building event-driven systems that are scalable, resilient, and can handle complex distributed processing scenarios across different technology stacks.