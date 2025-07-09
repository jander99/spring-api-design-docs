# Server-Sent Events (SSE) Specification

## Format Requirements

### Basic SSE Format
Server-Sent Events provide real-time updates with built-in browser support:

```http
GET /v1/orders/events HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

id: 1
event: order-created
data: {"orderId":"order-123","customerId":"cust-456","status":"CREATED"}

id: 2
event: order-updated
data: {"orderId":"order-123","status":"PROCESSING"}

id: 3
event: order-completed
data: {"orderId":"order-123","status":"COMPLETED","completedAt":"2024-07-15T14:30:00Z"}
```

### SSE Standards

1. **Event IDs**: Include unique sequential IDs for event replay
2. **Event types**: Use descriptive event type names
3. **Heartbeat**: Send periodic heartbeat events to maintain connections
4. **Reconnection**: Support client reconnection with Last-Event-ID header

## Event Types

### Standard Event Types
| Event Type | Description | Data Format |
|------------|-------------|-------------|
| `order-created` | New order created | Complete order object |
| `order-updated` | Order status changed | Updated fields only |
| `order-cancelled` | Order cancelled | Order ID and cancellation reason |
| `heartbeat` | Keep connection alive | Timestamp |
| `error` | Processing error | Error details |

### Error Events
Send error events in SSE streams:

```
id: 10
event: error
data: {"type":"https://example.com/problems/stream-error","title":"Stream Processing Error","status":500}

id: 11
event: stream-end
data: {"reason":"error","timestamp":"2024-07-15T14:30:00Z"}
```

## Headers

### Request Headers
```http
Accept: text/event-stream
Cache-Control: no-cache
Last-Event-ID: 1234
```

### Response Headers
```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Cache-Control
```

## Authentication

### Bearer Token Authentication
```http
GET /v1/orders/stream HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: text/event-stream
```

### Token Refresh in Long-Running Streams
For long-running streams with token expiration:

1. **Token refresh events**: Send token refresh notifications
2. **Graceful reconnection**: Support seamless reconnection with new tokens
3. **Partial stream resumption**: Allow clients to resume from last processed record

```
event: token-refresh-required
data: {"expiresIn":300,"refreshUrl":"/v1/auth/refresh"}
```

## Client Implementation

### Browser EventSource
```javascript
const eventSource = new EventSource('/v1/orders/events');

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

eventSource.addEventListener('order-created', function(event) {
  const order = JSON.parse(event.data);
  console.log('New order:', order);
});
```

### Reconnection Logic
```javascript
eventSource.addEventListener('error', function(event) {
  if (eventSource.readyState === EventSource.CLOSED) {
    // Reconnect with last event ID
    setTimeout(() => {
      const lastEventId = localStorage.getItem('lastEventId');
      const newEventSource = new EventSource(`/v1/orders/events?lastEventId=${lastEventId}`);
    }, 5000);
  }
});
```