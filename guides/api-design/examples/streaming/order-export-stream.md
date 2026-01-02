# Order Export Stream Example

## Request
```http
GET /v1/orders/export?format=ndjson&since=2024-01-01 HTTP/1.1
Accept: application/x-ndjson
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Response
```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked
X-Total-Records: 10000
X-Stream-Rate: 100/second

{"type":"metadata","query":{"since":"2024-01-01"},"totalRecords":10000}
{"type":"data","id":"order-1","customerId":"cust-123","total":99.95,"createdDate":"2024-01-15T10:30:00Z"}
{"type":"data","id":"order-2","customerId":"cust-456","total":149.50,"createdDate":"2024-01-16T14:22:00Z"}
{"type":"progress","processed":2,"remaining":9998}
```

## Use Case
Exporting large order datasets for reporting or analytics. This pattern is ideal when:
- Processing thousands of records
- Client needs incremental progress updates
- Memory efficiency is important
- Network interruptions are possible

## Client Implementation Notes
1. Process each line as a separate JSON object
2. Handle metadata and progress messages
3. Implement reconnection logic for interrupted streams
4. Buffer data appropriately to avoid memory issues