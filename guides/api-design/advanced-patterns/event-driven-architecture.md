# Event-Driven Architecture: HTTP Patterns

## Overview

Event-driven architecture using HTTP enables systems to react to events through standard web protocols. This guide covers HTTP-based mechanisms for delivering event notifications, including webhooks, Server-Sent Events, and polling patterns.

For broader architectural patterns beyond HTTP (Event Sourcing, CQRS, Sagas), see [Event-Driven Architecture Guide](../../architecture/event-driven-architecture.md).

## What Are HTTP Event Patterns?

HTTP event patterns provide ways to notify systems about important occurrences using standard HTTP protocols:
- **Webhooks**: HTTP callbacks that deliver events to registered endpoints
- **Server-Sent Events (SSE)**: One-way streaming of events from server to client
- **Polling**: Clients periodically check for new events
- **HTTP POST Notifications**: Simple event delivery via HTTP requests

These patterns work with any HTTP client or server, requiring no specialized messaging infrastructure.

## Key Concepts

### Event Structure
All events follow a standard format:
```json
{
  "id": "evt-12345",
  "type": "order.created",
  "timestamp": "2024-07-15T14:32:22Z",
  "source": "order-service",
  "data": {
    "orderId": "order-789",
    "customerId": "cust-456",
    "total": 99.99
  }
}
```

### Event Types
1. **Domain Events**: Business occurrences (order.created, payment.processed)
2. **Integration Events**: Service-to-service communication
3. **Notification Events**: User or system alerts

## HTTP Event Delivery Patterns

### 1. Webhooks (HTTP Callbacks)

Webhooks deliver events by making HTTP POST requests to registered callback URLs.

#### Webhook Registration
```http
POST /api/v1/webhooks HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "url": "https://client.example.com/webhook",
  "events": ["order.created", "order.shipped"],
  "secret": "whsec_abc123"
}
```

Response:
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "wh-12345",
  "url": "https://client.example.com/webhook",
  "events": ["order.created", "order.shipped"],
  "status": "active",
  "createdAt": "2024-07-15T14:30:00Z"
}
```

#### Event Delivery
```http
POST /webhook HTTP/1.1
Host: client.example.com
Content-Type: application/json
X-Webhook-Signature: sha256=abc123...
X-Webhook-Id: wh-12345
X-Event-Type: order.created

{
  "id": "evt-67890",
  "type": "order.created",
  "timestamp": "2024-07-15T14:32:22Z",
  "source": "order-service",
  "data": {
    "orderId": "order-789",
    "customerId": "cust-456",
    "total": 99.99,
    "items": [
      {"productId": "prod-123", "quantity": 2}
    ]
  }
}
```

Expected response:
```http
HTTP/1.1 200 OK
```

#### Webhook Security

**Signature Verification**: Verify webhook authenticity using HMAC signatures.

Request includes signature header:
```http
X-Webhook-Signature: sha256=abc123def456...
```

Verification process:
1. Extract signature from header
2. Compute HMAC-SHA256 of request body using shared secret
3. Compare computed signature with received signature
4. Accept only if signatures match

**Retry Logic**: Handle delivery failures with exponential backoff.

Retry schedule:
- Attempt 1: Immediate
- Attempt 2: 5 seconds later
- Attempt 3: 25 seconds later
- Attempt 4: 2 minutes later
- Attempt 5: 10 minutes later

After 5 failed attempts, mark webhook as failed and notify administrator.

### 2. Server-Sent Events (SSE)

SSE provides one-way real-time event streaming from server to client over HTTP.

#### Opening SSE Connection
```http
GET /api/v1/events HTTP/1.1
Host: api.example.com
Accept: text/event-stream
Authorization: Bearer eyJhbGc...
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

: Connected to event stream

data: {"type": "connection.established", "timestamp": "2024-07-15T14:30:00Z"}

```

#### Streaming Events
```http
event: order.created
id: evt-12345
data: {"orderId": "order-789", "total": 99.99}

event: order.created
id: evt-12346
data: {"orderId": "order-790", "total": 149.99}

event: order.shipped
id: evt-12347
data: {"orderId": "order-789", "trackingNumber": "TRK123"}

```

#### Event Filtering
Filter events by type:
```http
GET /api/v1/events?types=order.created,order.shipped HTTP/1.1
Host: api.example.com
Accept: text/event-stream
```

Filter by resource:
```http
GET /api/v1/orders/order-789/events HTTP/1.1
Host: api.example.com
Accept: text/event-stream
```

#### Reconnection Support
SSE supports automatic reconnection using last event ID:
```http
GET /api/v1/events HTTP/1.1
Host: api.example.com
Accept: text/event-stream
Last-Event-ID: evt-12345
```

Server resumes from last received event.

### 3. Polling Patterns

Clients periodically request new events from the server.

#### Basic Polling
```http
GET /api/v1/events?since=2024-07-15T14:30:00Z HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGc...
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "events": [
    {
      "id": "evt-12345",
      "type": "order.created",
      "timestamp": "2024-07-15T14:32:22Z",
      "data": {"orderId": "order-789"}
    },
    {
      "id": "evt-12346",
      "type": "order.shipped",
      "timestamp": "2024-07-15T14:35:10Z",
      "data": {"orderId": "order-789"}
    }
  ],
  "hasMore": false,
  "nextPoll": "2024-07-15T14:36:00Z"
}
```

#### Long Polling
Server holds request until events are available or timeout occurs:
```http
GET /api/v1/events/long-poll?timeout=30 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGc...
```

Response (when events available):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "events": [
    {
      "id": "evt-12347",
      "type": "order.created",
      "timestamp": "2024-07-15T14:32:45Z",
      "data": {"orderId": "order-790"}
    }
  ]
}
```

Response (on timeout):
```http
HTTP/1.1 204 No Content
```

### 4. Event Notification via HTTP POST

Simple one-way notifications without registration.

#### Notification Request
```http
POST /api/v1/notifications HTTP/1.1
Host: external-service.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGc...

{
  "type": "order.created",
  "timestamp": "2024-07-15T14:32:22Z",
  "data": {
    "orderId": "order-789",
    "status": "pending"
  }
}
```

Response:
```http
HTTP/1.1 202 Accepted
```

## Event Schema Standards

### CloudEvents Format
Standardized event format for interoperability:
```json
{
  "specversion": "1.0",
  "type": "com.example.order.created",
  "source": "https://api.example.com/orders",
  "id": "evt-12345",
  "time": "2024-07-15T14:32:22Z",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "order-789",
    "total": 99.99
  }
}
```

### Schema Versioning
Include version in event type:
```json
{
  "id": "evt-12345",
  "type": "order.created.v2",
  "schemaVersion": "2.0",
  "timestamp": "2024-07-15T14:32:22Z",
  "data": {
    "orderId": "order-789",
    "customerId": "cust-456",
    "total": 99.99
  }
}
```

## Implementation Best Practices

### 1. Idempotency
Ensure event processing handles duplicates gracefully:
```json
{
  "id": "evt-12345",
  "idempotencyKey": "order-789-created",
  "type": "order.created",
  "timestamp": "2024-07-15T14:32:22Z",
  "data": {"orderId": "order-789"}
}
```

Consumers track processed idempotency keys to prevent duplicate processing.

### 2. Error Handling
Provide clear error responses for webhook failures:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "invalid_signature",
    "message": "Webhook signature verification failed",
    "timestamp": "2024-07-15T14:32:22Z"
  }
}
```

### 3. Rate Limiting
Protect event endpoints with rate limits:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Maximum 100 requests per minute exceeded",
    "retryAfter": 60
  }
}
```

### 4. Event Filtering
Allow consumers to subscribe to specific event types:
```http
POST /api/v1/webhooks HTTP/1.1
Content-Type: application/json

{
  "url": "https://client.example.com/webhook",
  "events": ["order.created", "order.shipped"],
  "filter": {
    "customerId": "cust-456"
  }
}
```

### 5. Monitoring and Health
Provide webhook health endpoints:
```http
GET /api/v1/webhooks/wh-12345/health HTTP/1.1
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "wh-12345",
  "status": "healthy",
  "successRate": 99.8,
  "lastSuccess": "2024-07-15T14:35:00Z",
  "lastFailure": "2024-07-14T08:22:00Z",
  "failureCount": 2,
  "totalDeliveries": 1000
}
```

## Common Use Cases

- **Order Processing**: Notify external systems when orders are created or updated
- **User Notifications**: Send real-time updates to client applications
- **Payment Processing**: Alert systems when payment status changes
- **Inventory Updates**: Broadcast stock level changes to subscribed services
- **Audit Logging**: Stream audit events to logging systems

## Pattern Selection Guide

| Pattern | Use When | Avoid When |
|---------|----------|------------|
| Webhooks | Need reliable delivery to external systems | Recipient systems are unreliable |
| SSE | Real-time updates to browsers/clients | Need bidirectional communication |
| Polling | Simple integration, low event volume | Need real-time delivery |
| Long Polling | Real-time updates, firewall restrictions | High event volume |

## Resources

### Complete Examples
- [Event Processing Examples](./examples/event-driven/complete-examples.md)
- Full HTTP examples for all patterns
- Testing and debugging examples

### Detailed Configuration
- [Configuration Reference](./reference/event-driven/detailed-configuration.md)
- Event schema specifications
- Routing and caching patterns
- Webhook configuration

### Troubleshooting
- [Common Issues](./troubleshooting/event-driven/common-issues.md)
- Performance problems and solutions
- Debugging techniques
- Monitoring and alerting

## Related Documentation

- [HTTP Streaming Patterns](./http-streaming-patterns.md): HTTP streaming implementation patterns
- [Event-Driven Architecture Guide](../../architecture/event-driven-architecture.md): Architectural patterns (Event Sourcing, CQRS, Sagas)
- [Reactive Error Handling](./reactive-error-handling.md): Error handling patterns for reactive systems
