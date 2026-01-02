# Bulk Data Processing Stream Example

## Request
```http
POST /v1/orders/bulk-process HTTP/1.1
Content-Type: application/json
Accept: application/x-ndjson
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "operation": "status-update",
  "filters": {"status": "PENDING"},
  "updates": {"status": "PROCESSING"}
}
```

## Response
```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked

{"type":"metadata","operation":"status-update","totalRecords":500}
{"type":"success","recordId":"order-1","updatedFields":["status"],"timestamp":"2024-07-15T14:30:01Z"}
{"type":"success","recordId":"order-2","updatedFields":["status"],"timestamp":"2024-07-15T14:30:01Z"}
{"type":"error","recordId":"order-3","error":"INVALID_STATUS_TRANSITION","message":"Cannot transition from COMPLETED to PROCESSING"}
{"type":"summary","processed":500,"successful":499,"errors":1}
```

## Result Types
| Type | Description | When Used |
|------|-------------|-----------|
| `metadata` | Operation details | Stream start |
| `success` | Successful update | Each successful record |
| `error` | Failed update | Each failed record |
| `summary` | Final results | Stream end |

## Use Case
Bulk operations on large datasets with real-time feedback. This pattern is ideal when:
- Processing thousands of records
- Some operations may fail
- Client needs immediate feedback on progress
- Results need to be processed as they arrive

## Client Implementation Notes
1. Start processing results immediately
2. Handle both success and error cases
3. Track progress using metadata
4. Process summary for final reporting