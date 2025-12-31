# Real-Time Notifications with Server-Sent Events

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 10 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Architecture
> 
> **📊 Complexity:** 12.8 grade level • 2.2% technical density • difficult

This example shows how to build a real-time notification system using Server-Sent Events (SSE).
Clients receive instant updates for orders, messages, alerts, and system events.

**Related**: See [Streaming APIs](../../request-response/streaming-apis.md) for core concepts.

---

## Event Subscription Endpoint

### Basic Connection

```http
GET /v1/notifications/stream HTTP/1.1
Accept: text/event-stream
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Filtered Subscription

Subscribe only to specific event types or resources.

```http
GET /v1/notifications/stream?types=order,message&priority=high HTTP/1.1
Accept: text/event-stream
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `types` | string | Comma-separated event types to receive |
| `priority` | string | Filter by priority (`low`, `normal`, `high`, `urgent`) |
| `since` | datetime | Replay events after this timestamp |
| `resources` | string | Filter by resource IDs (orders, accounts, etc.) |

---

## Connection Response

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Stream-Id: notif-abc123

id: 1
event: connected
data: {"streamId":"notif-abc123","timestamp":"2024-07-15T14:00:00Z","filters":{"types":["order","message"]}}

id: 2
event: heartbeat
data: {"timestamp":"2024-07-15T14:00:30Z"}
```

---

## Event Types

The notification system supports multiple event categories.

### Order Update Events

```
id: 100
event: order.status_changed
data: {"notificationId":"notif-001","orderId":"order-789","previousStatus":"PENDING","newStatus":"PROCESSING","timestamp":"2024-07-15T14:30:00Z"}

id: 101
event: order.shipped
data: {"notificationId":"notif-002","orderId":"order-789","carrier":"UPS","trackingNumber":"1Z999AA10123456784","estimatedDelivery":"2024-07-18"}

id: 102
event: order.delivered
data: {"notificationId":"notif-003","orderId":"order-789","deliveredAt":"2024-07-17T15:30:00Z","signedBy":"John Smith"}
```

### Message Events

```
id: 200
event: message.received
data: {"notificationId":"notif-010","messageId":"msg-456","from":"support@example.com","subject":"Your ticket #1234","preview":"Thank you for contacting us...","unreadCount":3}

id: 201
event: message.mention
data: {"notificationId":"notif-011","messageId":"msg-457","from":"jane@team.com","channel":"#project-alpha","preview":"@you Can you review this?"}
```

### Alert Events

```
id: 300
event: alert.security
data: {"notificationId":"notif-020","alertType":"NEW_LOGIN","severity":"high","details":{"ip":"192.168.1.100","location":"New York, US","device":"Chrome on Windows"},"actionRequired":true}

id: 301
event: alert.payment
data: {"notificationId":"notif-021","alertType":"PAYMENT_FAILED","severity":"urgent","details":{"invoiceId":"inv-123","amount":299.99,"reason":"Card declined"},"actionUrl":"/billing/update-payment"}

id: 302
event: alert.system
data: {"notificationId":"notif-022","alertType":"MAINTENANCE_SCHEDULED","severity":"low","details":{"scheduledAt":"2024-07-20T02:00:00Z","duration":"PT2H","affectedServices":["api","dashboard"]}}
```

### Event Type Reference

| Event Type | Description | Priority |
|------------|-------------|----------|
| `order.status_changed` | Order status updated | normal |
| `order.shipped` | Order shipped with tracking | normal |
| `order.delivered` | Order delivered | normal |
| `message.received` | New message received | normal |
| `message.mention` | User mentioned in message | high |
| `alert.security` | Security-related alert | high |
| `alert.payment` | Payment issue | urgent |
| `alert.system` | System notification | low |

---

## Event ID for Resume

Each event has a unique ID that enables reconnection without data loss.

### Event ID Structure

```
id: 1720015800000-001
event: order.shipped
data: {"orderId":"order-789","trackingNumber":"1Z999AA10123456784"}
```

The ID format `{timestamp}-{sequence}` ensures:
- Chronological ordering
- Uniqueness across server restarts
- Easy debugging with timestamp visibility

### Storing the Last Event ID

```
FUNCTION onEventReceived(event):
    processEvent(event.data)
    lastEventId = event.id
    saveToStorage("lastEventId", lastEventId)
```

---

## Reconnection Handling

### Automatic Reconnection with Last-Event-ID

When the connection drops, include the last received event ID.

```http
GET /v1/notifications/stream HTTP/1.1
Accept: text/event-stream
Last-Event-ID: 1720015800000-001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Server Replay Response

The server replays missed events before resuming live streaming.

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

id: replay-start
event: system.replay
data: {"replayingFrom":"1720015800000-001","missedEvents":5}

id: 1720015800000-002
event: order.status_changed
data: {"orderId":"order-790","newStatus":"SHIPPED"}

id: 1720015800000-003
event: message.received
data: {"messageId":"msg-458","subject":"Order confirmation"}

id: 1720015800000-004
event: alert.payment
data: {"alertType":"PAYMENT_SUCCEEDED","invoiceId":"inv-124"}

id: 1720015800000-005
event: order.delivered
data: {"orderId":"order-788","deliveredAt":"2024-07-15T16:00:00Z"}

id: 1720015800000-006
event: message.received
data: {"messageId":"msg-459","subject":"Delivery confirmation"}

id: replay-end
event: system.replay_complete
data: {"replayedEvents":5,"resumingLive":true}

id: 1720015860000-001
event: heartbeat
data: {"timestamp":"2024-07-15T16:01:00Z"}
```

### Expired Event ID Handling

If the event ID is too old, the server indicates replay is unavailable.

```
id: error-001
event: system.error
data: {"code":"EVENT_ID_EXPIRED","message":"Requested event ID is no longer available","oldestAvailable":"1720012200000-001","recommendation":"Start fresh subscription"}

id: 1720015860000-001
event: connected
data: {"streamId":"notif-def456","replayUnavailable":true}
```

### Reconnection with Exponential Backoff

```
FUNCTION reconnectWithBackoff():
    retryCount = 0
    maxRetries = 10
    
    WHILE retryCount < maxRetries:
        TRY:
            connect()
            retryCount = 0
            RETURN
        CATCH error:
            retryCount = retryCount + 1
            waitTime = min(2^retryCount * 1000, 60000)
            log("Reconnecting in " + waitTime + "ms (attempt " + retryCount + ")")
            wait(waitTime)
    
    notifyUser("Connection failed. Please refresh the page.")
```

---

## Heartbeat and Keep-Alive

### Regular Heartbeat Events

The server sends heartbeats every 30 seconds to keep the connection alive.

```
id: heartbeat-100
event: heartbeat
data: {"timestamp":"2024-07-15T14:30:00Z","connectionAge":"PT30M","queuedEvents":0}

id: heartbeat-101
event: heartbeat
data: {"timestamp":"2024-07-15T14:30:30Z","connectionAge":"PT30M30S","queuedEvents":0}
```

### Client Heartbeat Monitoring

```
FUNCTION monitorConnection():
    lastHeartbeat = now()
    heartbeatTimeout = 60 seconds
    
    WHILE connected:
        IF (now() - lastHeartbeat) > heartbeatTimeout:
            log("Connection stale, reconnecting...")
            reconnect()
        
        wait(10 seconds)

FUNCTION onHeartbeat(event):
    lastHeartbeat = now()
    
    IF event.data.queuedEvents > 0:
        log("Server has " + event.data.queuedEvents + " queued events")
```

---

## Error Events

### Error Event Format

```
id: error-001
event: system.error
data: {"code":"RATE_LIMITED","message":"Too many concurrent connections","retryAfter":30,"recoverable":true}
```

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `RATE_LIMITED` | Too many connections | Wait and retry |
| `AUTH_EXPIRED` | Token expired | Refresh token, reconnect |
| `INVALID_FILTER` | Bad filter parameter | Fix parameters |
| `SUBSCRIPTION_LIMIT` | Max subscriptions reached | Close other streams |
| `SERVER_OVERLOAD` | Temporary capacity issue | Retry with backoff |

### Handling Non-Recoverable Errors

```
id: error-002
event: system.error
data: {"code":"AUTH_EXPIRED","message":"Your session has expired","recoverable":false,"action":"REAUTHENTICATE"}
```

```
FUNCTION onError(event):
    IF event.data.recoverable:
        IF event.data.retryAfter:
            wait(event.data.retryAfter * 1000)
        reconnect()
    ELSE:
        IF event.data.action == "REAUTHENTICATE":
            redirectToLogin()
        ELSE:
            showErrorMessage(event.data.message)
```

---

## Complete Client Implementation

### Pseudocode: Notification Stream Client

```
FUNCTION connectToNotifications(filters):
    lastEventId = loadFromStorage("lastEventId")
    retryCount = 0
    
    WHILE true:
        TRY:
            url = "/v1/notifications/stream"
            IF filters:
                url = url + "?" + buildQueryString(filters)
            
            headers = {
                "Accept": "text/event-stream",
                "Authorization": "Bearer " + getAccessToken()
            }
            
            IF lastEventId:
                headers["Last-Event-ID"] = lastEventId
            
            connection = openEventStream(url, headers)
            retryCount = 0
            startHeartbeatMonitor()
            
            FOR EACH event IN connection:
                handleEvent(event)
        
        CATCH error:
            stopHeartbeatMonitor()
            retryCount = retryCount + 1
            waitTime = min(2^retryCount * 1000, 60000)
            wait(waitTime)

FUNCTION handleEvent(event):
    // Store event ID for reconnection
    IF event.id AND NOT event.id.startsWith("heartbeat"):
        lastEventId = event.id
        saveToStorage("lastEventId", lastEventId)
    
    SWITCH event.type:
        CASE "connected":
            updateConnectionStatus("connected")
        
        CASE "heartbeat":
            resetHeartbeatTimer()
        
        CASE "system.replay":
            showReplayIndicator(event.data.missedEvents)
        
        CASE "system.replay_complete":
            hideReplayIndicator()
        
        CASE "system.error":
            handleError(event.data)
        
        // Order events
        CASE "order.status_changed":
        CASE "order.shipped":
        CASE "order.delivered":
            updateOrderUI(event.data)
            showNotification("Order Update", event.data)
        
        // Message events
        CASE "message.received":
        CASE "message.mention":
            updateMessageBadge(event.data.unreadCount)
            showNotification("New Message", event.data)
        
        // Alert events
        CASE "alert.security":
        CASE "alert.payment":
        CASE "alert.system":
            showAlert(event.data)
            IF event.data.actionRequired:
                highlightActionButton(event.data.actionUrl)
```

---

## Use Case

Real-time notification delivery for web and mobile applications.
This pattern is ideal when:

- Users need instant updates without polling
- Multiple notification types from a single connection
- Browser EventSource API provides built-in reconnection
- Events are relatively infrequent (seconds to minutes apart)
- Guaranteed delivery with replay capability is required

---

## Best Practices

1. **Store event IDs** - Save the last event ID after each non-heartbeat event
2. **Filter at subscription** - Request only the event types you need
3. **Monitor heartbeats** - Detect stale connections before timeout
4. **Handle replay gracefully** - Show users when catching up on missed events
5. **Implement exponential backoff** - Avoid overwhelming the server on reconnection
6. **Plan for token refresh** - Handle authentication expiration without data loss

---

## Related Documentation

- [Streaming APIs](../../request-response/streaming-apis.md) - Core streaming concepts
- [Real-Time Order Updates](real-time-order-updates.md) - Order-specific SSE example
- [SSE Specification](../../reference/streaming/sse-specification.md) - Complete SSE reference
