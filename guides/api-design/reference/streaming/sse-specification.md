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

## Client Connection Protocol

### Initial Connection
Clients connect to SSE endpoints with proper headers:

```http
GET /v1/orders/events HTTP/1.1
Host: api.example.com
Accept: text/event-stream
Cache-Control: no-cache

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
```

### Handling Multiple Event Types
SSE streams can contain different event types. The `event:` field identifies each type:

```
id: 100
event: order-created
data: {"orderId":"order-789","total":99.99}

id: 101
event: inventory-updated
data: {"sku":"WIDGET-001","quantity":42}

id: 102
event: heartbeat
data: {"timestamp":"2024-07-15T14:30:00Z"}
```

### Reconnection with Last-Event-ID
When a connection drops, clients reconnect using the `Last-Event-ID` header to resume:

```http
GET /v1/orders/events HTTP/1.1
Host: api.example.com
Accept: text/event-stream
Cache-Control: no-cache
Last-Event-ID: 101

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

id: 102
event: heartbeat
data: {"timestamp":"2024-07-15T14:30:00Z"}

id: 103
event: order-shipped
data: {"orderId":"order-789","trackingNumber":"1Z999AA10123456784"}
```

### Server-Controlled Retry Interval
Servers can specify reconnection delay using the `retry:` field (in milliseconds):

```
retry: 5000
id: 1
event: connected
data: {"message":"Stream started","serverTime":"2024-07-15T14:30:00Z"}

id: 2
event: order-created
data: {"orderId":"order-456"}
```