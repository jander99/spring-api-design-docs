# Real-Time Order Updates Example

> **Reading Guide**: ~8 min read | Grade 12 | Server-Sent Events for live updates

This example shows how to receive real-time order updates using Server-Sent Events (SSE).
The server pushes events to clients as changes occur.

---

## Basic Request

```http
GET /v1/orders/live?customerId=cust-123 HTTP/1.1
Accept: text/event-stream
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `customerId` | string | Filter events for specific customer |
| `orderId` | string | Filter events for specific order |
| `eventTypes` | string | Comma-separated event types to receive |
| `since` | datetime | Replay events after this timestamp |

---

## Response Stream

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Stream-Id: live-abc123

id: 1
event: connected
data: {"streamId":"live-abc123","timestamp":"2024-07-15T14:29:00Z"}

id: 2
event: order-created
data: {"orderId":"order-789","customerId":"cust-123","status":"CREATED","items":[]}

id: 3
event: order-item-added
data: {"orderId":"order-789","itemId":"item-456","quantity":2,"price":25.99}

id: 4
event: order-submitted
data: {"orderId":"order-789","status":"PENDING","submittedAt":"2024-07-15T14:30:00Z"}

id: 5
event: heartbeat
data: {"timestamp":"2024-07-15T14:31:00Z"}
```

---

## Event Types

| Event Type | Description | Data Format |
|------------|-------------|-------------|
| `connected` | Connection established | Stream ID and timestamp |
| `order-created` | New order created | Complete order object |
| `order-updated` | Order status changed | Updated fields only |
| `order-item-added` | Item added to order | Item details |
| `order-item-removed` | Item removed from order | Item ID |
| `order-submitted` | Order submitted for processing | Status and timestamp |
| `order-shipped` | Order shipped | Tracking information |
| `order-cancelled` | Order cancelled | Cancellation reason |
| `heartbeat` | Keep connection alive | Timestamp |
| `error` | Processing error | Error details |

---

## Multiple Event Type Handling

### Filtering Specific Events

Request only the events you need.

```http
GET /v1/orders/live?customerId=cust-123&eventTypes=order-created,order-shipped HTTP/1.1
Accept: text/event-stream
```

### Processing Different Event Types

```
id: 10
event: order-created
data: {"orderId":"order-100","customerId":"cust-123","status":"CREATED","total":0}

id: 11
event: order-item-added
data: {"orderId":"order-100","itemId":"item-1","name":"Widget","quantity":2,"price":25.99}

id: 12
event: order-item-added
data: {"orderId":"order-100","itemId":"item-2","name":"Gadget","quantity":1,"price":49.99}

id: 13
event: order-updated
data: {"orderId":"order-100","total":101.97,"itemCount":3}

id: 14
event: order-submitted
data: {"orderId":"order-100","status":"PENDING","submittedAt":"2024-07-15T14:35:00Z"}

id: 15
event: order-updated
data: {"orderId":"order-100","status":"PROCESSING","assignedTo":"warehouse-1"}

id: 16
event: order-shipped
data: {"orderId":"order-100","status":"SHIPPED","trackingNumber":"1Z999AA10123456784","carrier":"UPS"}
```

---

## Heartbeat and Keep-Alive Pattern

### Regular Heartbeat Events

The server sends heartbeat events to keep the connection alive.
Typical interval is 15-30 seconds.

```
id: 100
event: heartbeat
data: {"timestamp":"2024-07-15T14:45:00Z","connectionAge":"PT16M"}

id: 101
event: heartbeat
data: {"timestamp":"2024-07-15T14:45:30Z","connectionAge":"PT16M30S"}
```

### Monitoring Heartbeats

Clients should track heartbeat timing to detect stale connections.

```
FUNCTION monitorHeartbeat():
    lastHeartbeat = now()
    heartbeatTimeout = 60 seconds
    
    WHILE connected:
        IF (now() - lastHeartbeat) > heartbeatTimeout:
            reconnect()
        wait(5 seconds)

FUNCTION onHeartbeatReceived(event):
    lastHeartbeat = now()
    log("Connection healthy at " + event.timestamp)
```

---

## Reconnection with Last-Event-ID

### Automatic Reconnection

When a connection drops, the client sends the last received event ID.

```http
GET /v1/orders/live?customerId=cust-123 HTTP/1.1
Accept: text/event-stream
Last-Event-ID: 15
```

### Server Response After Reconnection

The server replays missed events and continues streaming.

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

id: 15
event: replay-start
data: {"missedEvents":3,"replayingFrom":"15"}

id: 16
event: order-shipped
data: {"orderId":"order-100","status":"SHIPPED","trackingNumber":"1Z999AA10123456784"}

id: 17
event: order-updated
data: {"orderId":"order-101","status":"PROCESSING"}

id: 18
event: order-created
data: {"orderId":"order-102","customerId":"cust-123","status":"CREATED"}

id: 19
event: replay-complete
data: {"replayedEvents":3,"resumingLiveStream":true}

id: 20
event: heartbeat
data: {"timestamp":"2024-07-15T15:00:00Z"}
```

### Handling Expired Event IDs

If the event ID is too old, the server indicates this.

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

id: 1000
event: replay-failed
data: {"reason":"EVENT_ID_EXPIRED","oldestAvailable":"500","requestedId":"15"}

id: 1001
event: connected
data: {"streamId":"live-def456","timestamp":"2024-07-15T15:00:00Z","replayUnavailable":true}
```

---

## Error Event Handling

### Error Event Format

```
id: 50
event: error
data: {"code":"SUBSCRIPTION_ERROR","message":"Filter criteria invalid","recoverable":true}
```

### Error Event Fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Machine-readable error code |
| `message` | string | Human-readable description |
| `recoverable` | boolean | Whether to retry connection |
| `retryAfter` | integer | Seconds to wait before retry |

### Common Error Events

```
id: 51
event: error
data: {"code":"RATE_LIMITED","message":"Too many connections","recoverable":true,"retryAfter":30}

id: 52
event: error
data: {"code":"AUTH_EXPIRED","message":"Authentication token expired","recoverable":false}

id: 53
event: error
data: {"code":"RESOURCE_NOT_FOUND","message":"Customer not found","recoverable":false}
```

---

## Connection Lifecycle

### Connection Established

```
id: 1
event: connected
data: {"streamId":"live-abc123","timestamp":"2024-07-15T14:00:00Z","filters":{"customerId":"cust-123"}}
```

### Normal Operation (Events + Heartbeats)

```
id: 2
event: order-created
data: {"orderId":"order-1","customerId":"cust-123"}

id: 3
event: heartbeat
data: {"timestamp":"2024-07-15T14:00:30Z"}

id: 4
event: order-updated
data: {"orderId":"order-1","status":"PROCESSING"}

id: 5
event: heartbeat
data: {"timestamp":"2024-07-15T14:01:00Z"}
```

### Graceful Disconnection

The server may terminate connections for maintenance.

```
id: 100
event: disconnecting
data: {"reason":"SERVER_MAINTENANCE","reconnectAfter":60,"message":"Scheduled maintenance"}
```

---

## Client Implementation Guidance

### Pseudocode: Full SSE Client

```
FUNCTION connectToOrderStream(customerId):
    lastEventId = loadFromStorage("lastEventId")
    retryCount = 0
    maxRetries = 10
    
    WHILE retryCount < maxRetries:
        TRY:
            connection = openEventStream(
                url: "/v1/orders/live?customerId=" + customerId,
                headers: {"Last-Event-ID": lastEventId}
            )
            
            retryCount = 0  // Reset on successful connection
            
            FOR EACH event IN connection:
                lastEventId = event.id
                saveToStorage("lastEventId", lastEventId)
                
                SWITCH event.type:
                    CASE "connected":
                        onConnected(event.data)
                    
                    CASE "order-created":
                        addOrderToUI(event.data)
                    
                    CASE "order-updated":
                        updateOrderInUI(event.data)
                    
                    CASE "order-shipped":
                        showShippingNotification(event.data)
                    
                    CASE "heartbeat":
                        resetHeartbeatTimer()
                    
                    CASE "error":
                        IF NOT event.data.recoverable:
                            THROW UnrecoverableError(event.data)
                        log("Recoverable error: " + event.data.message)
                    
                    CASE "disconnecting":
                        wait(event.data.reconnectAfter * 1000)
                        CONTINUE outer loop
        
        CATCH connectionError:
            retryCount = retryCount + 1
            waitTime = min(2^retryCount * 1000, 30000)
            log("Connection lost, retry " + retryCount + " in " + waitTime + "ms")
            wait(waitTime)
```

---

## Use Case

Real-time dashboard updates for order management.
This pattern is ideal when:

- Users need immediate updates without polling
- Browser-based clients need built-in EventSource support
- Long-running connections are acceptable
- Events are relatively infrequent (seconds to minutes apart)
- Automatic reconnection and replay are required

---

## Best Practices

1. **Store last event ID** - Save the ID after each event for reconnection
2. **Monitor heartbeats** - Detect stale connections before they timeout
3. **Handle all event types** - Process errors and system events, not just data
4. **Implement exponential backoff** - Increase wait time between retry attempts
5. **Request specific events** - Filter to only the events your client needs
6. **Plan for replay failures** - Handle cases where event history is unavailable