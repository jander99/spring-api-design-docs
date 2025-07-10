# Real-Time Order Updates Example

## Request
```http
GET /v1/orders/live?customerId=cust-123 HTTP/1.1
Accept: text/event-stream
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Response
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

id: 1
event: order-created
data: {"orderId":"order-789","customerId":"cust-123","status":"CREATED","items":[]}

id: 2
event: order-item-added
data: {"orderId":"order-789","itemId":"item-456","quantity":2,"price":25.99}

id: 3
event: order-submitted
data: {"orderId":"order-789","status":"PENDING","submittedAt":"2024-07-15T14:30:00Z"}

id: 4
event: heartbeat
data: {"timestamp":"2024-07-15T14:31:00Z"}
```

## Event Types
| Event Type | Description | Data Format |
|------------|-------------|-------------|
| `order-created` | New order created | Complete order object |
| `order-updated` | Order status changed | Updated fields only |
| `order-cancelled` | Order cancelled | Order ID and cancellation reason |
| `heartbeat` | Keep connection alive | Timestamp |
| `error` | Processing error | Error details |

## Use Case
Real-time dashboard updates for order management. This pattern is ideal when:
- Users need immediate updates
- Browser-based clients (built-in EventSource support)
- Long-running connections are acceptable
- Events are relatively infrequent

## Client Implementation Notes
1. Use browser EventSource API or equivalent
2. Handle event IDs for reconnection
3. Implement heartbeat monitoring
4. Process different event types appropriately