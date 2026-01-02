# NDJSON Streaming Specification

## Format Requirements

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

## Error Handling

### Error Objects
Include error objects in NDJSON streams:

```json
{"type":"error","code":"PROCESSING_ERROR","message":"Failed to process record","recordId":"order-123"}
{"type":"data","id":"order-124","status":"COMPLETED"}
```

### Stream Termination
Handle graceful stream termination:

```json
{"type":"stream-end","reason":"completed","totalProcessed":1000,"errors":2}
```

## Headers

### Request Headers
```http
Accept: application/x-ndjson
Prefer: respond-async
X-Stream-Buffer-Size: 100
X-Stream-Rate-Limit: 10/second
```

### Response Headers
```http
Content-Type: application/x-ndjson
Transfer-Encoding: chunked
X-Stream-Rate: 10/second
X-Stream-Buffer-Size: 100
X-Stream-Total-Items: 10000
```

## Performance Guidelines

1. **Batch processing**: Process records in batches to reduce overhead
2. **Connection pooling**: Manage connection pools for database queries
3. **Memory management**: Implement proper memory management for large streams
4. **Compression**: Use GZIP compression for text-based streams