# Order Export Stream Example

> **Reading Guide**: ~8 min read | Grade 12 | Practical export streaming patterns

This example shows how to stream large order datasets using NDJSON format.
Each record arrives as a separate JSON line, enabling immediate processing.

---

## Basic Request

```http
GET /v1/orders/export?format=ndjson&since=2024-01-01 HTTP/1.1
Accept: application/x-ndjson
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | Output format (`ndjson` recommended) |
| `since` | date | Export orders created after this date |
| `until` | date | Export orders created before this date |
| `status` | string | Filter by order status |
| `limit` | integer | Maximum records to return |
| `cursor` | string | Resume from previous position |

---

## Response Stream

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked
X-Total-Records: 10000
X-Stream-Rate: 100/second
X-Stream-Id: export-abc123

{"type":"metadata","streamId":"export-abc123","query":{"since":"2024-01-01"},"totalRecords":10000}
{"type":"data","id":"order-1","customerId":"cust-123","total":99.95,"createdDate":"2024-01-15T10:30:00Z"}
{"type":"data","id":"order-2","customerId":"cust-456","total":149.50,"createdDate":"2024-01-16T14:22:00Z"}
{"type":"progress","processed":2,"remaining":9998,"cursor":"order-2"}
{"type":"data","id":"order-3","customerId":"cust-789","total":275.00,"createdDate":"2024-01-17T09:15:00Z"}
...
{"type":"progress","processed":10000,"remaining":0,"cursor":"order-10000"}
{"type":"complete","totalExported":10000,"duration":"PT2M30S"}
```

### Message Types

| Type | Purpose | Fields |
|------|---------|--------|
| `metadata` | Stream information | `streamId`, `query`, `totalRecords` |
| `data` | Order record | Full order object |
| `progress` | Status update | `processed`, `remaining`, `cursor` |
| `complete` | Stream finished | `totalExported`, `duration` |
| `error` | Stream error | `code`, `message`, `retryable` |

---

## Progress Tracking Pattern

The server emits progress messages at regular intervals (every 100 records or 5 seconds).

```
{"type":"progress","processed":100,"remaining":9900,"cursor":"order-100","percentComplete":1}
{"type":"progress","processed":500,"remaining":9500,"cursor":"order-500","percentComplete":5}
{"type":"progress","processed":1000,"remaining":9000,"cursor":"order-1000","percentComplete":10}
```

Use progress messages to:
- Display progress bars to users
- Save cursor positions for recovery
- Monitor export health

---

## Cursor-Based Continuation

When a stream is interrupted, resume from the last cursor position.

### Initial Request
```http
GET /v1/orders/export?format=ndjson&since=2024-01-01 HTTP/1.1
Accept: application/x-ndjson
```

### Stream Interrupted
```
{"type":"progress","processed":5000,"remaining":5000,"cursor":"order-5000"}
[CONNECTION LOST]
```

### Resume Request
```http
GET /v1/orders/export?format=ndjson&since=2024-01-01&cursor=order-5000 HTTP/1.1
Accept: application/x-ndjson
```

### Resumed Response
```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"type":"metadata","resumed":true,"cursor":"order-5000","remainingRecords":5000}
{"type":"data","id":"order-5001","customerId":"cust-111","total":50.00,"createdDate":"2024-03-01T08:00:00Z"}
```

---

## Error Handling

### Stream Error Response

When an error occurs mid-stream, the server sends an error message.

```
{"type":"data","id":"order-999","customerId":"cust-555","total":125.00}
{"type":"error","code":"EXPORT_TIMEOUT","message":"Export exceeded time limit","retryable":true,"cursor":"order-999"}
```

### Error Message Fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Machine-readable error code |
| `message` | string | Human-readable description |
| `retryable` | boolean | Whether client should retry |
| `cursor` | string | Last successful position |

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `EXPORT_TIMEOUT` | Operation timed out | Retry with cursor |
| `RATE_LIMITED` | Too many requests | Wait and retry |
| `INVALID_CURSOR` | Cursor expired or invalid | Start fresh export |
| `SERVER_ERROR` | Internal error | Retry with backoff |

---

## Client Implementation Guidance

### Pseudocode: Basic Stream Consumer

```
FUNCTION consumeOrderExport(sinceDate):
    cursor = null
    totalProcessed = 0
    
    WHILE true:
        response = httpGet("/v1/orders/export", {
            since: sinceDate,
            cursor: cursor
        })
        
        FOR EACH line IN response.stream:
            message = parseJson(line)
            
            SWITCH message.type:
                CASE "metadata":
                    log("Starting export of " + message.totalRecords + " records")
                
                CASE "data":
                    processOrder(message)
                    totalProcessed = totalProcessed + 1
                
                CASE "progress":
                    cursor = message.cursor
                    saveCursorToStorage(cursor)
                    updateProgressDisplay(message.percentComplete)
                
                CASE "complete":
                    log("Export complete: " + message.totalExported + " records")
                    RETURN totalProcessed
                
                CASE "error":
                    IF message.retryable:
                        cursor = message.cursor
                        wait(exponentialBackoff())
                        CONTINUE outer loop
                    ELSE:
                        THROW ExportError(message)
```

### Pseudocode: Reconnection Handler

```
FUNCTION streamWithReconnect(url, maxRetries):
    retries = 0
    cursor = loadCursorFromStorage()
    
    WHILE retries < maxRetries:
        TRY:
            consumeStream(url, cursor)
            RETURN success
        CATCH connectionError:
            retries = retries + 1
            waitTime = min(2^retries * 1000, 30000)
            wait(waitTime)
            cursor = loadCursorFromStorage()
    
    THROW MaxRetriesExceeded
```

---

## Use Case

Exporting large order datasets for reporting or analytics.
This pattern is ideal when:

- Processing thousands or millions of records
- Client needs incremental progress updates
- Memory efficiency is important
- Network interruptions are possible
- Data must be processed as it arrives

---

## Best Practices

1. **Always save cursor positions** - Store cursors during progress events
2. **Handle all message types** - Don't assume only data messages arrive
3. **Implement exponential backoff** - Avoid overwhelming the server on retries
4. **Set reasonable timeouts** - Long exports may take minutes
5. **Process data incrementally** - Don't buffer the entire response in memory