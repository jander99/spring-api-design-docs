# NDJSON Streaming Patterns

## NDJSON Format

Newline-Delimited JSON: one complete JSON object per line, no separating commas.

```
{"id":"order-1","status":"PROCESSING","total":99.95}
{"id":"order-2","status":"COMPLETED","total":149.50}
{"id":"order-3","status":"PENDING","total":75.00}
```

### Required Headers

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked
```

### Content-Type Options

| Content-Type | Status |
|--------------|--------|
| `application/x-ndjson` | Preferred |
| `application/ndjson` | Also valid |
| `application/json-lines` | Alternative |

## Structured Stream Pattern

Include metadata and markers in the stream:

```json
{"type":"metadata","totalRecords":1000,"startTime":"2024-07-15T14:30:00Z"}
{"type":"data","id":"order-1","status":"PROCESSING"}
{"type":"data","id":"order-2","status":"COMPLETED"}
{"type":"progress","processed":2,"total":1000,"percentage":0.2}
{"type":"data","id":"order-3","status":"PENDING"}
{"type":"error","code":"PROCESSING_ERROR","recordId":"order-4","message":"Invalid data"}
{"type":"data","id":"order-5","status":"SHIPPED"}
{"type":"stream-end","reason":"completed","processed":4,"errors":1}
```

## Record Types

| Type | Purpose | Required Fields |
|------|---------|-----------------|
| `metadata` | Stream metadata | `totalRecords`, `startTime` |
| `data` | Actual data record | Resource-specific fields |
| `progress` | Progress update | `processed`, `total`, `percentage` |
| `error` | Processing error | `code`, `message`, `recordId` |
| `stream-end` | Stream completion | `reason`, `processed`, `errors` |

## Metadata Record

Send at stream start:

```json
{"type":"metadata","totalRecords":1000,"streamId":"stream-12345","startTime":"2024-07-15T14:30:00Z","estimatedDuration":"PT5M"}
```

Fields:
- `totalRecords`: Known total (or estimate)
- `streamId`: Unique stream identifier
- `startTime`: ISO 8601 timestamp
- `estimatedDuration`: ISO 8601 duration

## Progress Records

Send periodically (every N records or every T seconds):

```json
{"type":"progress","processed":500,"total":1000,"percentage":50,"elapsed":"PT2M30S","eta":"PT2M30S"}
```

Fields:
- `processed`: Records processed so far
- `total`: Total records (if known)
- `percentage`: Completion percentage
- `elapsed`: Time elapsed (ISO 8601 duration)
- `eta`: Estimated time remaining

## Error Records

Include errors inline without stopping the stream:

```json
{"type":"error","code":"VALIDATION_ERROR","recordId":"order-123","message":"Invalid date format","field":"orderDate"}
```

Fields:
- `code`: Error code
- `message`: Human-readable message
- `recordId`: ID of failed record
- `field`: Specific field that failed (optional)

## Stream End Record

Always end streams with a summary:

```json
{"type":"stream-end","reason":"completed","processed":998,"errors":2,"duration":"PT5M23S"}
```

Reasons:
- `completed`: Normal completion
- `cancelled`: Client cancelled
- `error`: Fatal error
- `timeout`: Stream timed out
- `limit-reached`: Hit record limit

## Flow Control Headers

### Request Headers

```http
GET /orders/stream HTTP/1.1
Accept: application/x-ndjson
X-Stream-Buffer-Size: 100
X-Stream-Rate-Limit: 10/second
```

### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked
X-Stream-Rate: 10/second
X-Stream-Buffer-Size: 100
X-Stream-Total-Items: 10000
```

## Filtering and Pagination

### Query Parameters

```http
GET /orders/stream?status=PROCESSING&since=2024-01-01&limit=10000 HTTP/1.1
Accept: application/x-ndjson
```

| Parameter | Description |
|-----------|-------------|
| `status` | Filter by status |
| `since` | Records after date |
| `until` | Records before date |
| `limit` | Maximum records |
| `batchSize` | Records per batch |

## Error Handling

### Inline Errors (Continue Stream)

```json
{"type":"data","id":"order-1","status":"COMPLETED"}
{"type":"error","code":"PROCESSING_ERROR","recordId":"order-2","message":"Failed to process"}
{"type":"data","id":"order-3","status":"COMPLETED"}
```

### Fatal Error (End Stream)

```json
{"type":"data","id":"order-1","status":"COMPLETED"}
{"type":"error","code":"FATAL_ERROR","message":"Database connection lost","fatal":true}
{"type":"stream-end","reason":"error","processed":1,"errors":1}
```

### HTTP Error Before Stream Starts

If error occurs before streaming begins:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/unauthorized",
  "title": "Unauthorized",
  "status": 401
}
```

## Client Consumption

### JavaScript/Node.js

```javascript
async function consumeNdjsonStream(url) {
  const response = await fetch(url, {
    headers: { 'Accept': 'application/x-ndjson' }
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();  // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        const record = JSON.parse(line);
        handleRecord(record);
      }
    }
  }
}

function handleRecord(record) {
  switch (record.type) {
    case 'metadata':
      console.log(`Starting stream of ${record.totalRecords} records`);
      break;
    case 'data':
      processData(record);
      break;
    case 'progress':
      updateProgressBar(record.percentage);
      break;
    case 'error':
      logError(record);
      break;
    case 'stream-end':
      console.log(`Completed: ${record.processed} processed, ${record.errors} errors`);
      break;
  }
}
```

### Java/WebClient

```java
webClient.get()
    .uri("/orders/stream")
    .accept(MediaType.APPLICATION_NDJSON)
    .retrieve()
    .bodyToFlux(StreamRecord.class)
    .subscribe(record -> {
        switch (record.getType()) {
            case "metadata" -> handleMetadata(record);
            case "data" -> processData(record);
            case "error" -> logError(record);
            case "stream-end" -> handleComplete(record);
        }
    });
```

### cURL Testing

```bash
# Stream to file
curl -N -H "Accept: application/x-ndjson" \
  https://api.example.com/orders/stream > orders.ndjson

# Stream with progress
curl -N -H "Accept: application/x-ndjson" \
  https://api.example.com/orders/stream | \
  while read line; do echo "$line"; done
```

## NDJSON vs JSON Array

| Aspect | NDJSON | JSON Array |
|--------|--------|------------|
| Parsing | Line by line | Complete document |
| Memory | Constant | Grows with data |
| Start Processing | Immediate | After download |
| Error Recovery | Continue after errors | Fail on any error |
| Format | `{}\n{}\n{}` | `[{},{},{}]` |

## Best Practices

1. **Always include stream-end**: Clients need to know when stream completes
2. **Use structured records**: Include `type` field for parsing
3. **Send progress updates**: Every 100 records or 5 seconds
4. **Handle errors inline**: Don't abort stream for recoverable errors
5. **Include metadata**: Total count, stream ID, timestamps
6. **Respect client limits**: Honor `X-Stream-Buffer-Size` header
7. **Implement timeouts**: Don't let streams run indefinitely
8. **Log stream metrics**: Duration, throughput, error rate
