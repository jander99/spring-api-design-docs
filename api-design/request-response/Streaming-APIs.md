# Streaming APIs

## Overview

This document defines the standards for streaming API responses, including real-time data streaming, large dataset processing, and reactive patterns. Streaming APIs enable efficient handling of large data volumes and real-time communication.

## Streaming Response Formats

For streaming endpoints, choose the appropriate content type based on your use case:

### Content Type Selection

| Content Type | Use Case | Benefits | Considerations |
|--------------|----------|----------|----------------|
| `application/x-ndjson` | Bulk data streaming | Simple JSON objects | Newline-delimited format |
| `text/event-stream` | Real-time events | Built-in browser support | Server-Sent Events protocol |
| `application/json` | Chunked responses | Standard JSON parsing | Requires chunked transfer encoding |

## NDJSON Streaming

### Basic NDJSON Format

Newline-Delimited JSON (NDJSON) streams individual JSON objects separated by newlines:

```http
GET /v1/orders/stream HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked

{"id":"order-1","status":"PROCESSING","total":99.95}
{"id":"order-2","status":"COMPLETED","total":149.50}
{"id":"order-3","status":"PENDING","total":75.25}
```

### NDJSON Standards

1. **One JSON object per line**: Each line must contain a complete, valid JSON object
2. **No trailing commas**: Each object is self-contained
3. **Consistent structure**: All objects should follow the same schema
4. **Error objects**: Include error objects in the stream when processing fails

### NDJSON with Metadata

Include metadata objects in the stream:

```json
{"type":"metadata","totalRecords":1000,"streamId":"stream-12345"}
{"type":"data","id":"order-1","status":"PROCESSING","total":99.95}
{"type":"data","id":"order-2","status":"COMPLETED","total":149.50}
{"type":"metadata","processed":2,"remaining":998}
```

## Server-Sent Events (SSE)

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

### SSE Event Types

Define clear event types for different scenarios:

| Event Type | Description | Data Format |
|------------|-------------|-------------|
| `order-created` | New order created | Complete order object |
| `order-updated` | Order status changed | Updated fields only |
| `order-cancelled` | Order cancelled | Order ID and cancellation reason |
| `heartbeat` | Keep connection alive | Timestamp |
| `error` | Processing error | Error details |

### SSE Standards

1. **Event IDs**: Include unique sequential IDs for event replay
2. **Event types**: Use descriptive event type names
3. **Heartbeat**: Send periodic heartbeat events to maintain connections
4. **Reconnection**: Support client reconnection with Last-Event-ID header

## Chunked JSON Streaming

### Basic Chunked Format

For streaming large JSON arrays:

```http
GET /v1/orders/export HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json
Transfer-Encoding: chunked

[
{"id":"order-1","status":"PROCESSING"},
{"id":"order-2","status":"COMPLETED"},
{"id":"order-3","status":"PENDING"}
]
```

### Chunked Streaming with Wrapper

Use a consistent wrapper format:

```json
{
  "meta": {
    "streamId": "stream-12345",
    "timestamp": "2024-07-15T14:30:00Z"
  },
  "data": [
    {"id":"order-1","status":"PROCESSING"},
    {"id":"order-2","status":"COMPLETED"}
  ]
}
```

## Flow Control and Backpressure

### Client Capabilities

Document how clients can signal flow control capabilities:

```http
GET /v1/orders/stream HTTP/1.1
Accept: application/x-ndjson
Prefer: respond-async
X-Stream-Buffer-Size: 100
X-Stream-Rate-Limit: 10/second
```

### Server Response Headers

Include flow control information in response headers:

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
X-Stream-Rate: 10/second
X-Stream-Buffer-Size: 100
X-Stream-Total-Items: 10000
```

### Backpressure Handling

When clients can't keep up with the stream:

1. **Buffer limits**: Define maximum buffer sizes
2. **Rate limiting**: Implement configurable rate limits
3. **Client feedback**: Allow clients to signal processing delays
4. **Circuit breakers**: Implement circuit breakers for failing clients

## Error Handling in Streams

### NDJSON Error Objects

Include error objects in NDJSON streams:

```json
{"type":"error","code":"PROCESSING_ERROR","message":"Failed to process record","recordId":"order-123"}
{"type":"data","id":"order-124","status":"COMPLETED"}
```

### SSE Error Events

Send error events in SSE streams:

```
id: 10
event: error
data: {"type":"https://example.com/problems/stream-error","title":"Stream Processing Error","status":500}

id: 11
event: stream-end
data: {"reason":"error","timestamp":"2024-07-15T14:30:00Z"}
```

### Stream Termination

Handle graceful stream termination:

```json
{"type":"stream-end","reason":"completed","totalProcessed":1000,"errors":2}
```

## Authentication and Authorization

### Bearer Token Authentication

```http
GET /v1/orders/stream HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/x-ndjson
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

## Streaming API Examples

### Order Export Stream

**GET /v1/orders/export?format=ndjson&since=2024-01-01**

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
X-Total-Records: 10000
X-Stream-Rate: 100/second

{"type":"metadata","query":{"since":"2024-01-01"},"totalRecords":10000}
{"type":"data","id":"order-1","customerId":"cust-123","total":99.95,"createdDate":"2024-01-15T10:30:00Z"}
{"type":"data","id":"order-2","customerId":"cust-456","total":149.50,"createdDate":"2024-01-16T14:22:00Z"}
{"type":"progress","processed":2,"remaining":9998}
```

### Real-Time Order Updates

**GET /v1/orders/live?customerId=cust-123**

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 1
event: order-created
data: {"orderId":"order-789","customerId":"cust-123","status":"CREATED","items":[]}

id: 2
event: order-item-added
data: {"orderId":"order-789","itemId":"item-456","quantity":2,"price":25.99}

id: 3
event: order-submitted
data: {"orderId":"order-789","status":"PENDING","submittedAt":"2024-07-15T14:30:00Z"}
```

### Bulk Data Processing Stream

**POST /v1/orders/bulk-process**

Request:
```json
{
  "operation": "status-update",
  "filters": {"status": "PENDING"},
  "updates": {"status": "PROCESSING"}
}
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"type":"metadata","operation":"status-update","totalRecords":500}
{"type":"success","recordId":"order-1","updatedFields":["status"],"timestamp":"2024-07-15T14:30:01Z"}
{"type":"success","recordId":"order-2","updatedFields":["status"],"timestamp":"2024-07-15T14:30:01Z"}
{"type":"error","recordId":"order-3","error":"INVALID_STATUS_TRANSITION","message":"Cannot transition from COMPLETED to PROCESSING"}
{"type":"summary","processed":500,"successful":499,"errors":1}
```

## Performance Considerations

### Streaming Optimization

1. **Batch processing**: Process records in batches to reduce overhead
2. **Connection pooling**: Manage connection pools for database queries
3. **Memory management**: Implement proper memory management for large streams
4. **Compression**: Use GZIP compression for text-based streams

### Monitoring and Metrics

Track streaming API performance:

- **Stream duration**: How long streams remain active
- **Throughput**: Records per second
- **Error rates**: Percentage of failed records
- **Client disconnections**: Frequency of client drops
- **Buffer utilization**: Memory and queue usage

## Implementation Guidelines

### Framework Support

Different frameworks provide varying levels of streaming support:

- **Express.js**: Use Response.write() for manual streaming
- **FastAPI**: StreamingResponse with generators
- **Django**: StreamingHttpResponse for chunked responses
- **Spring Boot**: See spring-design documentation for WebFlux reactive streams

### Client Considerations

Provide guidance for client implementations:

1. **Connection handling**: Implement proper connection management
2. **Error recovery**: Handle network interruptions gracefully
3. **Buffer management**: Implement client-side buffering
4. **Processing queues**: Use queues for processing streamed data

### Testing Streaming APIs

1. **Load testing**: Test with high-volume streams
2. **Network simulation**: Test with network delays and interruptions
3. **Client behavior**: Test various client consumption patterns
4. **Resource monitoring**: Monitor server resources during streaming

## Related Documentation

- [Content Types and Structure](Content-Types-and-Structure.md) - Basic request/response patterns
- [Error Response Standards](Error-Response-Standards.md) - Error handling patterns
- [Pagination and Filtering](Pagination-and-Filtering.md) - Alternative patterns for large datasets

## Use Cases

### When to Use Streaming APIs

- **Large datasets**: Exporting thousands of records
- **Real-time updates**: Live order status updates
- **Bulk operations**: Processing large batches of data
- **Event sourcing**: Streaming event logs
- **Data synchronization**: Syncing data between systems

### When to Use Traditional Pagination

- **Interactive browsing**: User-facing search results
- **Small datasets**: Collections with predictable sizes
- **Random access**: Users need to jump to specific pages
- **Caching**: Results can be effectively cached