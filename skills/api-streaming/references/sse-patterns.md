# Server-Sent Events (SSE) Patterns

## SSE Protocol Basics

SSE provides a one-way channel from server to client over HTTP with automatic reconnection.

### Required Headers

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Event Format

```
id: unique-event-id
event: event-type
data: {"json":"payload"}
retry: 5000

```

Each event ends with double newline (`\n\n`).

## Event Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Recommended | Unique ID for reconnection |
| `event` | Recommended | Event type (defaults to "message") |
| `data` | Required | Payload (can span multiple lines) |
| `retry` | Optional | Client reconnection delay (ms) |

## Multi-Line Data

For data spanning multiple lines, use multiple `data:` fields:

```
id: 1
event: order-details
data: {"orderId":"order-123",
data:  "customer":"John Doe",
data:  "total":99.95}

```

Or use escaped JSON:

```
id: 1
event: order-details
data: {"orderId":"order-123","customer":"John Doe","total":99.95}

```

## Standard Event Types

### Resource Events

| Event Type | Description |
|------------|-------------|
| `{resource}-created` | New resource created |
| `{resource}-updated` | Resource modified |
| `{resource}-deleted` | Resource removed |

### System Events

| Event Type | Description |
|------------|-------------|
| `heartbeat` | Keep connection alive |
| `error` | Stream error occurred |
| `stream-end` | Stream completed |
| `token-refresh-required` | Auth token expiring |

## Heartbeat Implementation

### Comment-Style Heartbeat

```
: heartbeat timestamp=2024-07-15T14:30:00Z

```

Lines starting with `:` are comments - ignored by EventSource but keep connection alive.

### Event-Style Heartbeat

```
id: 100
event: heartbeat
data: {"timestamp":"2024-07-15T14:30:00Z"}

```

Send heartbeats every 15-30 seconds.

## Reconnection Pattern

### Client Reconnects With Last-Event-ID

```http
GET /orders/events HTTP/1.1
Accept: text/event-stream
Last-Event-ID: 42
```

### Server Resumes From ID

Server must:
1. Parse `Last-Event-ID` header
2. Query events after that ID
3. Stream missed events first
4. Then continue with live events

```java
// Server-side handling
@GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<Event>> stream(
        @RequestHeader(value = "Last-Event-ID", required = false) String lastId) {
    Long startFrom = lastId != null ? Long.parseLong(lastId) + 1 : 0L;
    return eventService.streamFrom(startFrom);
}
```

## Error Handling

### Error Event

```
id: 50
event: error
data: {"type":"https://example.com/problems/stream-error","title":"Processing Error","status":500,"detail":"Database connection lost"}

```

### Stream End After Error

```
id: 50
event: error
data: {"type":"stream-error","message":"Database connection lost"}

id: 51
event: stream-end
data: {"reason":"error","processedCount":49}

```

### Retry Control

```
id: 50
event: error
data: {"type":"temporary-error","retryable":true}
retry: 10000

```

## Authentication

### Bearer Token

```http
GET /orders/events HTTP/1.1
Authorization: Bearer {token}
Accept: text/event-stream
```

### Token Expiration During Stream

**Option 1: Close and require reconnection**

```
event: error
data: {"type":"token-expired","message":"Please reconnect with new token"}

```

**Option 2: Token refresh notification**

```
event: token-refresh-required
data: {"expiresIn":300,"refreshUrl":"/auth/refresh"}

```

## Browser Client (EventSource)

### Basic Usage

```javascript
const eventSource = new EventSource('/orders/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

eventSource.addEventListener('order-created', (event) => {
  const order = JSON.parse(event.data);
  console.log('New order:', order);
});

eventSource.onerror = (event) => {
  if (eventSource.readyState === EventSource.CLOSED) {
    console.log('Connection closed');
  }
};
```

### With Authentication (Polyfill Required)

Native EventSource doesn't support custom headers. Use a polyfill:

```javascript
import { EventSourcePolyfill } from 'event-source-polyfill';

const eventSource = new EventSourcePolyfill('/orders/events', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Manual Reconnection

```javascript
let lastEventId = null;

function connect() {
  const url = lastEventId 
    ? `/orders/events?lastEventId=${lastEventId}`
    : '/orders/events';
    
  const eventSource = new EventSource(url);
  
  eventSource.onmessage = (event) => {
    lastEventId = event.lastEventId;
    handleEvent(JSON.parse(event.data));
  };
  
  eventSource.onerror = () => {
    eventSource.close();
    setTimeout(connect, 5000);  // Reconnect after 5s
  };
}
```

## Connection Management

### Connection Limits

- Limit concurrent SSE connections per client
- Return 429 if limit exceeded

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/too-many-connections",
  "title": "Connection Limit Exceeded",
  "detail": "Maximum 5 concurrent SSE connections allowed"
}
```

### Graceful Shutdown

```
event: stream-end
data: {"reason":"server-shutdown","message":"Server is shutting down, please reconnect in 30 seconds"}

```

### Client Disconnect Detection

Server should detect when client disconnects and clean up resources:

```java
return eventFlux
    .doOnCancel(() -> cleanupResources(userId))
    .doFinally(signal -> log.info("Stream ended: {}", signal));
```

## Performance Considerations

### Batch Events

Instead of sending individual events, batch when possible:

```
id: 100
event: orders-batch
data: {"orders":[{"id":"1"},{"id":"2"},{"id":"3"}],"count":3}

```

### Filtering Server-Side

Let clients subscribe to specific events:

```http
GET /orders/events?status=PROCESSING HTTP/1.1
Accept: text/event-stream
```

### Connection Pooling

For high-traffic scenarios:
- Use HTTP/2 for connection multiplexing
- Implement server-side connection pooling
- Consider message broker for fan-out

## SSE vs WebSocket

| Aspect | SSE | WebSocket |
|--------|-----|-----------|
| Direction | Server → Client | Bidirectional |
| Protocol | HTTP | WS/WSS |
| Reconnection | Automatic | Manual |
| Browser Support | Native EventSource | Native WebSocket |
| Use Case | Real-time updates | Chat, gaming |
| Complexity | Simple | More complex |

Choose SSE for:
- Server push notifications
- Live dashboards
- Progress updates
- Simple real-time features

Choose WebSocket for:
- Bidirectional communication
- Low-latency requirements
- High-frequency messaging
