# Live Dashboard with WebSocket

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 7 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 12.6 grade level • 1.6% technical density • difficult

This example shows how to build a live dashboard using WebSocket connections.
The pattern enables bi-directional messaging for real-time metrics, subscriptions, and interactive updates.

**Related**: See [Streaming APIs](../../request-response/streaming-apis.md) for core concepts.

---

## Connection Establishment

### WebSocket Handshake

```http
GET /v1/dashboard/ws HTTP/1.1
Host: api.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Successful Handshake Response

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

### Token via Query Parameter (Alternative)

Some clients cannot set headers on WebSocket connections.

```
wss://api.example.com/v1/dashboard/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Connection Initialization

After the WebSocket handshake, the server sends a welcome message.

### Server Welcome Message

```json
{
  "type": "connected",
  "connectionId": "ws-abc123",
  "timestamp": "2024-07-15T14:00:00Z",
  "serverVersion": "2.1.0",
  "capabilities": ["metrics", "alerts", "orders", "system"]
}
```

### Client Authentication (if not in handshake)

```json
{
  "type": "authenticate",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Authentication Response

```json
{
  "type": "authenticated",
  "userId": "user-123",
  "permissions": ["read:metrics", "read:orders", "read:alerts"],
  "expiresAt": "2024-07-15T15:00:00Z"
}
```

---

## Subscription to Metrics

### Subscribe to Specific Metrics

Client sends subscription request:

```json
{
  "type": "subscribe",
  "requestId": "req-001",
  "channels": [
    {"name": "metrics.orders", "interval": "5s"},
    {"name": "metrics.revenue", "interval": "30s"},
    {"name": "metrics.users_online", "interval": "10s"}
  ]
}
```

### Subscription Confirmation

```json
{
  "type": "subscribed",
  "requestId": "req-001",
  "channels": [
    {"name": "metrics.orders", "status": "active"},
    {"name": "metrics.revenue", "status": "active"},
    {"name": "metrics.users_online", "status": "active"}
  ],
  "activeSubscriptions": 3
}
```

### Metric Update Messages

```json
{
  "type": "metric",
  "channel": "metrics.orders",
  "timestamp": "2024-07-15T14:00:05Z",
  "data": {
    "ordersToday": 1247,
    "ordersLastHour": 89,
    "pendingOrders": 23,
    "trend": "+12%"
  }
}
```

```json
{
  "type": "metric",
  "channel": "metrics.revenue",
  "timestamp": "2024-07-15T14:00:30Z",
  "data": {
    "revenueToday": 45672.50,
    "revenueLastHour": 3421.75,
    "averageOrderValue": 36.62,
    "currency": "USD"
  }
}
```

```json
{
  "type": "metric",
  "channel": "metrics.users_online",
  "timestamp": "2024-07-15T14:00:10Z",
  "data": {
    "currentUsers": 342,
    "peakToday": 512,
    "averageSessionDuration": "PT8M30S"
  }
}
```

---

## Bi-Directional Messaging

WebSocket enables both client-to-server and server-to-client communication.

### Client Request: Get Specific Data

```json
{
  "type": "request",
  "requestId": "req-002",
  "action": "get_order_details",
  "params": {
    "orderId": "order-789"
  }
}
```

### Server Response

```json
{
  "type": "response",
  "requestId": "req-002",
  "status": "success",
  "data": {
    "orderId": "order-789",
    "status": "PROCESSING",
    "items": 3,
    "total": 149.99,
    "customerName": "John Smith"
  }
}
```

### Client Request: Perform Action

```json
{
  "type": "request",
  "requestId": "req-003",
  "action": "mark_order_priority",
  "params": {
    "orderId": "order-789",
    "priority": "high"
  }
}
```

### Server Response with Broadcast

```json
{
  "type": "response",
  "requestId": "req-003",
  "status": "success",
  "data": {
    "orderId": "order-789",
    "priority": "high",
    "updatedAt": "2024-07-15T14:05:00Z"
  }
}
```

Other connected clients receive the update:

```json
{
  "type": "event",
  "channel": "orders",
  "event": "order_updated",
  "data": {
    "orderId": "order-789",
    "changes": {"priority": "high"},
    "updatedBy": "user-123"
  }
}
```

---

## Heartbeat and Keep-Alive

### Server Ping Message

The server sends periodic pings to verify client connectivity.

```json
{
  "type": "ping",
  "timestamp": "2024-07-15T14:10:00Z",
  "serverLoad": "normal"
}
```

### Client Pong Response

The client must respond to pings within a timeout period (typically 30 seconds).

```json
{
  "type": "pong",
  "timestamp": "2024-07-15T14:10:00Z"
}
```

### Client-Initiated Ping

Clients can also send pings to check connection health.

```json
{
  "type": "ping",
  "requestId": "ping-001"
}
```

```json
{
  "type": "pong",
  "requestId": "ping-001",
  "latency": 45
}
```

### Heartbeat Configuration

```json
{
  "type": "configure",
  "requestId": "cfg-001",
  "settings": {
    "heartbeatInterval": 30000,
    "heartbeatTimeout": 60000
  }
}
```

---

## Unsubscribe and Channel Management

### Unsubscribe from Channels

```json
{
  "type": "unsubscribe",
  "requestId": "req-004",
  "channels": ["metrics.users_online"]
}
```

### Unsubscribe Confirmation

```json
{
  "type": "unsubscribed",
  "requestId": "req-004",
  "channels": ["metrics.users_online"],
  "activeSubscriptions": 2
}
```

### Pause and Resume Subscriptions

```json
{
  "type": "pause",
  "requestId": "req-005",
  "channels": ["metrics.orders"]
}
```

```json
{
  "type": "paused",
  "requestId": "req-005",
  "channels": ["metrics.orders"],
  "reason": "User paused updates"
}
```

```json
{
  "type": "resume",
  "requestId": "req-006",
  "channels": ["metrics.orders"]
}
```

---

## Error Handling

### Error Message Format

```json
{
  "type": "error",
  "requestId": "req-002",
  "code": "RESOURCE_NOT_FOUND",
  "message": "Order not found",
  "details": {
    "orderId": "order-999"
  }
}
```

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_MESSAGE` | Malformed JSON or missing fields | Fix message format |
| `UNAUTHORIZED` | Token expired or invalid | Reconnect with new token |
| `FORBIDDEN` | Insufficient permissions | Request appropriate access |
| `RESOURCE_NOT_FOUND` | Requested item doesn't exist | Verify resource ID |
| `RATE_LIMITED` | Too many requests | Slow down requests |
| `SUBSCRIPTION_LIMIT` | Max subscriptions reached | Unsubscribe from unused channels |
| `SERVER_ERROR` | Internal server error | Retry after delay |

### Authentication Expiry Warning

The server warns before token expiration.

```json
{
  "type": "auth_expiring",
  "expiresIn": 300,
  "message": "Token expires in 5 minutes"
}
```

### Client Token Refresh

```json
{
  "type": "refresh_token",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

```json
{
  "type": "token_refreshed",
  "expiresAt": "2024-07-15T16:00:00Z"
}
```

---

## Graceful Disconnection

### Client-Initiated Close

```json
{
  "type": "disconnect",
  "reason": "User logged out"
}
```

### Server Acknowledgment

```json
{
  "type": "disconnecting",
  "reason": "Client requested",
  "message": "Goodbye"
}
```

WebSocket close frame follows with code 1000 (normal closure).

### Server-Initiated Close

```json
{
  "type": "disconnecting",
  "reason": "SERVER_MAINTENANCE",
  "reconnectAfter": 120,
  "message": "Scheduled maintenance starting"
}
```

---

## Complete Client Implementation

### Pseudocode: Dashboard WebSocket Client

```
CLASS DashboardClient:
    connection = null
    subscriptions = []
    pendingRequests = {}
    requestCounter = 0
    reconnectAttempts = 0
    
    FUNCTION connect():
        url = "wss://api.example.com/v1/dashboard/ws"
        token = getAccessToken()
        
        connection = new WebSocket(url + "?token=" + token)
        
        connection.onopen = handleOpen
        connection.onmessage = handleMessage
        connection.onclose = handleClose
        connection.onerror = handleError
    
    FUNCTION handleOpen():
        reconnectAttempts = 0
        startHeartbeat()
        log("Connected to dashboard")
    
    FUNCTION handleMessage(event):
        message = parseJson(event.data)
        
        SWITCH message.type:
            CASE "connected":
                onConnected(message)
            
            CASE "authenticated":
                onAuthenticated(message)
            
            CASE "subscribed":
                onSubscribed(message)
            
            CASE "metric":
                updateDashboardWidget(message.channel, message.data)
            
            CASE "event":
                handleRealtimeEvent(message)
            
            CASE "response":
                resolveRequest(message.requestId, message)
            
            CASE "error":
                handleError(message)
            
            CASE "ping":
                send({"type": "pong", "timestamp": message.timestamp})
            
            CASE "pong":
                updateLatency(message.latency)
            
            CASE "auth_expiring":
                refreshToken()
            
            CASE "disconnecting":
                handleDisconnect(message)
    
    FUNCTION handleClose(event):
        stopHeartbeat()
        
        IF event.code != 1000:  // Not a normal close
            reconnect()
    
    FUNCTION reconnect():
        reconnectAttempts = reconnectAttempts + 1
        waitTime = min(2^reconnectAttempts * 1000, 60000)
        
        log("Reconnecting in " + waitTime + "ms")
        wait(waitTime)
        
        connect()
        
        // Resubscribe to previous channels
        FOR EACH channel IN subscriptions:
            subscribe(channel)
    
    FUNCTION subscribe(channels):
        requestId = generateRequestId()
        
        send({
            "type": "subscribe",
            "requestId": requestId,
            "channels": channels
        })
        
        RETURN waitForResponse(requestId)
    
    FUNCTION request(action, params):
        requestId = generateRequestId()
        
        send({
            "type": "request",
            "requestId": requestId,
            "action": action,
            "params": params
        })
        
        RETURN waitForResponse(requestId)
    
    FUNCTION send(message):
        IF connection.readyState == OPEN:
            connection.send(toJson(message))
        ELSE:
            queueMessage(message)
    
    FUNCTION startHeartbeat():
        heartbeatInterval = setInterval(30000, FUNCTION():
            send({"type": "ping", "requestId": generateRequestId()})
        )
    
    FUNCTION generateRequestId():
        requestCounter = requestCounter + 1
        RETURN "req-" + requestCounter
```

---

## Message Flow Diagram

```
Client                                   Server
  |                                        |
  |--- WebSocket Handshake --------------->|
  |<-- 101 Switching Protocols ------------|
  |                                        |
  |<-- connected (welcome) ----------------|
  |                                        |
  |--- subscribe (metrics.orders) -------->|
  |<-- subscribed (confirmation) ----------|
  |                                        |
  |<-- metric (orders data) ---------------|
  |<-- metric (orders data) ---------------|
  |                                        |
  |<-- ping -------------------------------|
  |--- pong ------------------------------>|
  |                                        |
  |--- request (get_order_details) ------->|
  |<-- response (order data) --------------|
  |                                        |
  |<-- event (order_updated) --------------|
  |                                        |
  |--- disconnect ------------------------>|
  |<-- disconnecting ---------------------|
  |--- WebSocket Close ------------------->|
```

---

## Use Case

Real-time dashboards requiring bi-directional communication.
This pattern is ideal when:

- Dashboard needs continuous metric updates
- Users interact with data (actions, queries)
- Multiple users view the same changing data
- Low latency updates are critical
- Both server and client initiate messages

---

## Best Practices

1. **Use request IDs** - Track all requests for proper response matching
2. **Implement heartbeat** - Detect stale connections before timeout
3. **Handle reconnection** - Restore subscriptions after reconnect
4. **Refresh tokens proactively** - Don't wait for expiration
5. **Buffer messages during reconnect** - Queue messages sent while disconnected
6. **Unsubscribe when not visible** - Pause updates for hidden dashboard tabs

---

## Related Documentation

- [Streaming APIs](../../request-response/streaming-apis.md) - Core streaming concepts
- [Real-Time Notifications](real-time-notifications.md) - SSE notification example
- [Flow Control](../../reference/streaming/flow-control.md) - Backpressure handling
