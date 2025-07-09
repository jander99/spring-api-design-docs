# Streaming APIs

## What is Streaming?

Streaming APIs send data in real-time or in chunks instead of all at once. This is useful when you have large amounts of data or need to send updates as they happen.

## When to Use Streaming

**Use streaming when:**
- Exporting thousands of records
- Sending real-time updates (like order status changes)
- Processing large batches of data
- Users need immediate feedback on long operations

**Use regular pagination when:**
- Users are browsing search results
- Data sets are small and predictable
- Users need to jump to specific pages
- Results can be cached effectively

## Main Streaming Patterns

### 1. NDJSON - For Large Data Exports

Use `application/x-ndjson` for bulk data streaming. Each line contains one JSON object:

```http
GET /v1/orders/stream HTTP/1.1
Accept: application/x-ndjson

HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"id":"order-1","status":"PROCESSING","total":99.95}
{"id":"order-2","status":"COMPLETED","total":149.50}
{"type":"stream-end","totalProcessed":2}
```

### 2. Server-Sent Events (SSE) - For Real-Time Updates

Use `text/event-stream` for real-time events with built-in browser support:

```http
GET /v1/orders/events HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream

id: 1
event: order-created
data: {"orderId":"order-123","status":"CREATED"}

id: 2
event: order-updated
data: {"orderId":"order-123","status":"PROCESSING"}
```

### 3. Chunked JSON - For Traditional JSON Arrays

Use `application/json` with chunked transfer encoding for large JSON arrays:

```http
GET /v1/orders/export HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json
Transfer-Encoding: chunked

[
{"id":"order-1","status":"PROCESSING"},
{"id":"order-2","status":"COMPLETED"}
]
```

## Basic Implementation Steps

1. **Choose the right pattern** based on your use case
2. **Set proper headers** (Content-Type, Transfer-Encoding, etc.)
3. **Handle errors gracefully** by including error objects in the stream
4. **Implement authentication** with Bearer tokens
5. **Add heartbeat messages** to keep connections alive
6. **Test with load and network interruptions**

## Essential Response Format

### NDJSON Structure
```json
{"type":"metadata","totalRecords":1000}
{"type":"data","id":"item-1","value":"data"}
{"type":"error","code":"PROCESSING_ERROR","recordId":"item-2"}
{"type":"stream-end","reason":"completed","processed":999,"errors":1}
```

### SSE Structure
```
id: 1
event: data-event
data: {"id":"item-1","value":"data"}

id: 2
event: error
data: {"type":"processing-error","message":"Failed to process item"}
```

## Quick Reference

| Pattern | Content Type | Best For | Browser Support |
|---------|-------------|----------|----------------|
| NDJSON | `application/x-ndjson` | Bulk data exports | Manual parsing |
| SSE | `text/event-stream` | Real-time updates | Built-in EventSource |
| Chunked JSON | `application/json` | Large JSON arrays | Standard JSON parsing |

## Learn More

### Complete Examples
- [Order Export Stream](../examples/streaming/order-export-stream.md) - Bulk data export with progress tracking
- [Real-Time Order Updates](../examples/streaming/real-time-order-updates.md) - Live dashboard updates
- [Bulk Data Processing](../examples/streaming/bulk-data-processing.md) - Batch operations with feedback

### Detailed Specifications
- [NDJSON Specification](../reference/streaming/ndjson-specification.md) - Complete NDJSON format guide
- [SSE Specification](../reference/streaming/sse-specification.md) - Server-Sent Events details
- [Flow Control](../reference/streaming/flow-control.md) - Backpressure and performance tuning

### Troubleshooting
- [Common Issues](../troubleshooting/streaming/common-issues.md) - Solutions for typical problems
- [Testing Strategies](../troubleshooting/streaming/testing-strategies.md) - How to test streaming APIs

## Related Documentation

- [Content Types and Structure](Content-Types-and-Structure.md) - Basic request/response patterns
- [Error Response Standards](Error-Response-Standards.md) - Error handling patterns
- [Pagination and Filtering](Pagination-and-Filtering.md) - Alternative patterns for large datasets