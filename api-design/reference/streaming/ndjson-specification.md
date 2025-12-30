# NDJSON Streaming Specification

> **Reading Guide**: Grade Level 13 | 6 min read | Technical specification for NDJSON streaming format

## Overview

Newline-Delimited JSON (NDJSON) is a format for streaming JSON data. Each line contains one complete JSON object. This format works well for large datasets because clients can process records as they arrive.

## Format Requirements

### Basic NDJSON Format

NDJSON streams individual JSON objects separated by newlines:

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

### Character Encoding

All NDJSON streams MUST use UTF-8 encoding:

```http
Content-Type: application/x-ndjson; charset=utf-8
```

**Encoding requirements:**
- All text MUST be valid UTF-8
- No Byte Order Mark (BOM) at stream start
- Escape non-ASCII characters in JSON strings using `\uXXXX` notation when needed
- Line separators MUST be `\n` (U+000A), not `\r\n`

### Line Length Guidelines

**Maximum line length: 1 MB (1,048,576 bytes)**

Rationale for the limit:
- Prevents memory issues on clients with limited resources
- Allows reasonable buffer allocation
- Accommodates most real-world JSON objects

For records that may exceed this limit:
```json
{"type":"large-record","dataUrl":"/v1/orders/order-123/full","summary":{"id":"order-123","itemCount":5000}}
```

### NDJSON Standards

1. **One JSON object per line**: Each line must contain a complete, valid JSON object
2. **No trailing commas**: Each object is self-contained
3. **Consistent structure**: All objects should follow the same schema
4. **Error objects**: Include error objects in the stream when processing fails
5. **No empty lines**: Every line must contain valid JSON
6. **No Content-Length header**: Use `Transfer-Encoding: chunked` instead

## JSON Schema Definition

### Base Record Schema

```yaml
# components/schemas/NdjsonRecord.yaml
NdjsonRecord:
  type: object
  required:
    - type
  properties:
    type:
      type: string
      enum: [metadata, data, error, heartbeat, stream-end]
      description: Record type identifier
  discriminator:
    propertyName: type
    mapping:
      metadata: '#/components/schemas/MetadataRecord'
      data: '#/components/schemas/DataRecord'
      error: '#/components/schemas/ErrorRecord'
      heartbeat: '#/components/schemas/HeartbeatRecord'
      stream-end: '#/components/schemas/StreamEndRecord'
```

### Record Type Schemas

```yaml
MetadataRecord:
  allOf:
    - $ref: '#/components/schemas/NdjsonRecord'
    - type: object
      properties:
        streamId:
          type: string
          format: uuid
        totalRecords:
          type: integer
          minimum: 0
        startedAt:
          type: string
          format: date-time
        estimatedDuration:
          type: string
          description: ISO 8601 duration (e.g., PT5M)

DataRecord:
  allOf:
    - $ref: '#/components/schemas/NdjsonRecord'
    - type: object
      required:
        - data
      properties:
        sequence:
          type: integer
          minimum: 1
        data:
          type: object
          description: The actual record payload

ErrorRecord:
  allOf:
    - $ref: '#/components/schemas/NdjsonRecord'
    - type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
        message:
          type: string
        recordId:
          type: string
        recoverable:
          type: boolean
          default: true
        details:
          type: object

HeartbeatRecord:
  allOf:
    - $ref: '#/components/schemas/NdjsonRecord'
    - type: object
      properties:
        timestamp:
          type: string
          format: date-time
        processed:
          type: integer

StreamEndRecord:
  allOf:
    - $ref: '#/components/schemas/NdjsonRecord'
    - type: object
      required:
        - reason
      properties:
        reason:
          type: string
          enum: [completed, cancelled, error, timeout]
        totalProcessed:
          type: integer
        totalErrors:
          type: integer
        duration:
          type: string
```

## Record Type Examples

### Metadata Record

Sent at stream start and periodically during streaming:

```json
{"type":"metadata","streamId":"550e8400-e29b-41d4-a716-446655440000","totalRecords":10000,"startedAt":"2024-01-15T10:30:00Z","estimatedDuration":"PT5M"}
```

### Data Record

The primary record type containing actual data:

```json
{"type":"data","sequence":1,"data":{"id":"order-1","customerId":"cust-123","status":"PROCESSING","total":99.95,"createdAt":"2024-01-15T09:00:00Z"}}
{"type":"data","sequence":2,"data":{"id":"order-2","customerId":"cust-456","status":"COMPLETED","total":149.50,"createdAt":"2024-01-15T09:15:00Z"}}
```

### Error Record

Reports processing errors without terminating the stream:

```json
{"type":"error","code":"RECORD_PARSE_ERROR","message":"Failed to serialize order data","recordId":"order-789","recoverable":true,"details":{"field":"items","reason":"circular reference detected"}}
```

**Error codes:**
| Code | Description | Recoverable |
|------|-------------|-------------|
| `RECORD_PARSE_ERROR` | Failed to serialize record | Yes |
| `RECORD_NOT_FOUND` | Referenced record missing | Yes |
| `PERMISSION_DENIED` | No access to record | Yes |
| `PROCESSING_TIMEOUT` | Record processing timed out | Yes |
| `STREAM_ERROR` | Unrecoverable stream error | No |

### Heartbeat Record

Keeps connection alive during slow processing:

```json
{"type":"heartbeat","timestamp":"2024-01-15T10:35:00Z","processed":5000}
```

Send heartbeats every 15-30 seconds during periods without data records.

### Stream End Record

Signals stream completion:

```json
{"type":"stream-end","reason":"completed","totalProcessed":10000,"totalErrors":3,"duration":"PT4M32S"}
```

## Complete Stream Example

```
{"type":"metadata","streamId":"550e8400-e29b-41d4-a716-446655440000","totalRecords":5,"startedAt":"2024-01-15T10:30:00Z"}
{"type":"data","sequence":1,"data":{"id":"order-1","status":"COMPLETED","total":99.95}}
{"type":"data","sequence":2,"data":{"id":"order-2","status":"COMPLETED","total":149.50}}
{"type":"error","code":"PERMISSION_DENIED","message":"No access to order","recordId":"order-3","recoverable":true}
{"type":"data","sequence":4,"data":{"id":"order-4","status":"PENDING","total":75.25}}
{"type":"data","sequence":5,"data":{"id":"order-5","status":"PROCESSING","total":200.00}}
{"type":"stream-end","reason":"completed","totalProcessed":4,"totalErrors":1,"duration":"PT2S"}
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
Content-Type: application/x-ndjson; charset=utf-8
Transfer-Encoding: chunked
X-Stream-Rate: 10/second
X-Stream-Buffer-Size: 100
X-Stream-Total-Items: 10000
Cache-Control: no-cache, no-store
Connection: keep-alive
```

**Important**: Never send `Content-Length` header with NDJSON streams. The total size is unknown at stream start. Always use `Transfer-Encoding: chunked`.

## MIME Type Registration

Use `application/x-ndjson` as the content type:

```yaml
# OpenAPI specification
paths:
  /v1/orders/stream:
    get:
      responses:
        '200':
          description: Stream of orders
          content:
            application/x-ndjson:
              schema:
                $ref: '#/components/schemas/NdjsonRecord'
```

Alternative MIME types (less common):
- `application/jsonl` - JSON Lines format
- `text/plain` - Fallback for legacy clients

## Performance Guidelines

1. **Batch processing**: Process records in batches to reduce overhead
2. **Connection pooling**: Manage connection pools for database queries
3. **Memory management**: Implement proper memory management for large streams
4. **Compression**: Use GZIP compression for text-based streams
5. **Buffer sizing**: Match buffer size to expected record size

### Compression

```http
GET /v1/orders/stream HTTP/1.1
Accept: application/x-ndjson
Accept-Encoding: gzip

HTTP/1.1 200 OK
Content-Type: application/x-ndjson; charset=utf-8
Content-Encoding: gzip
Transfer-Encoding: chunked
```

## Related Resources

- **[Flow Control](./flow-control.md)** - Backpressure and rate limiting
- **[Streaming APIs](../../request-response/streaming-apis.md)** - Overview of streaming patterns
- **[Common Issues](../../troubleshooting/streaming/common-issues.md)** - Troubleshooting guide
