# Bulk Data Processing Stream Example

> **Reading Guide**: ~8 min read | Grade 12 | Bulk operations with streamed results

This example shows how to perform bulk operations with real-time streamed feedback.
The server processes records and streams results as they complete.

---

## Basic Request

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

### Request Body Fields

| Field | Type | Description |
|-------|------|-------------|
| `operation` | string | Operation type (`status-update`, `archive`, `delete`) |
| `filters` | object | Criteria to select records |
| `updates` | object | Fields to update (for update operations) |
| `options` | object | Processing options (batch size, continue on error) |

---

## Response Stream

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked
X-Operation-Id: bulk-op-xyz789

{"type":"metadata","operationId":"bulk-op-xyz789","operation":"status-update","totalRecords":500}
{"type":"success","recordId":"order-1","updatedFields":["status"],"timestamp":"2024-07-15T14:30:01Z"}
{"type":"success","recordId":"order-2","updatedFields":["status"],"timestamp":"2024-07-15T14:30:01Z"}
{"type":"error","recordId":"order-3","error":"INVALID_STATUS_TRANSITION","message":"Cannot transition from COMPLETED to PROCESSING"}
{"type":"progress","processed":100,"successful":99,"errors":1,"cursor":"order-100"}
{"type":"success","recordId":"order-4","updatedFields":["status"],"timestamp":"2024-07-15T14:30:02Z"}
...
{"type":"summary","processed":500,"successful":499,"errors":1,"duration":"PT45S"}
```

### Result Types

| Type | Description | When Used |
|------|-------------|-----------|
| `metadata` | Operation details | Stream start |
| `success` | Successful update | Each successful record |
| `error` | Failed update | Each failed record |
| `progress` | Batch checkpoint | Every N records |
| `summary` | Final results | Stream end |

---

## Multi-Status Response Examples

### Mixed Success and Failure

Real bulk operations often have mixed results.
This example shows a typical mixed-result stream.

```
{"type":"metadata","operationId":"bulk-123","operation":"archive","totalRecords":5}
{"type":"success","recordId":"order-1","action":"archived"}
{"type":"success","recordId":"order-2","action":"archived"}
{"type":"error","recordId":"order-3","error":"ALREADY_ARCHIVED","message":"Order is already archived"}
{"type":"error","recordId":"order-4","error":"LOCKED_RECORD","message":"Order is locked by another process"}
{"type":"success","recordId":"order-5","action":"archived"}
{"type":"summary","processed":5,"successful":3,"errors":2,"errorBreakdown":{"ALREADY_ARCHIVED":1,"LOCKED_RECORD":1}}
```

### Error Breakdown in Summary

The summary message includes an error breakdown for analysis.

```json
{
  "type": "summary",
  "processed": 1000,
  "successful": 950,
  "errors": 50,
  "errorBreakdown": {
    "INVALID_STATUS_TRANSITION": 25,
    "RECORD_NOT_FOUND": 15,
    "VALIDATION_ERROR": 10
  },
  "duration": "PT2M15S"
}
```

---

## Error Handling for Partial Failures

### Continue on Error Mode

Request the server to continue processing even when errors occur.

```http
POST /v1/orders/bulk-process HTTP/1.1
Content-Type: application/json
Accept: application/x-ndjson

{
  "operation": "status-update",
  "filters": {"status": "PENDING"},
  "updates": {"status": "PROCESSING"},
  "options": {
    "continueOnError": true,
    "maxErrors": 100
  }
}
```

### Stop on Error Mode

Request the server to stop at the first error.

```http
POST /v1/orders/bulk-process HTTP/1.1
Content-Type: application/json
Accept: application/x-ndjson

{
  "operation": "delete",
  "filters": {"status": "CANCELLED"},
  "options": {
    "continueOnError": false
  }
}
```

Response when stopped on error:

```
{"type":"metadata","operationId":"bulk-456","operation":"delete","totalRecords":100}
{"type":"success","recordId":"order-1","action":"deleted"}
{"type":"success","recordId":"order-2","action":"deleted"}
{"type":"error","recordId":"order-3","error":"FOREIGN_KEY_VIOLATION","message":"Order has related invoices"}
{"type":"summary","processed":3,"successful":2,"errors":1,"stoppedEarly":true,"cursor":"order-2"}
```

---

## Reconnection with Cursor Resume

### Save Progress During Processing

Progress messages include a cursor for resumption.

```
{"type":"progress","processed":500,"successful":495,"errors":5,"cursor":"checkpoint-500"}
[CONNECTION LOST]
```

### Resume Request

```http
POST /v1/orders/bulk-process HTTP/1.1
Content-Type: application/json
Accept: application/x-ndjson

{
  "operation": "status-update",
  "filters": {"status": "PENDING"},
  "updates": {"status": "PROCESSING"},
  "resumeFrom": "checkpoint-500"
}
```

### Resumed Response

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"type":"metadata","operationId":"bulk-789","resumed":true,"cursor":"checkpoint-500","remainingRecords":500}
{"type":"success","recordId":"order-501","updatedFields":["status"]}
{"type":"success","recordId":"order-502","updatedFields":["status"]}
```

---

## Retry Patterns for Failed Items

### Collect Failures for Retry

```
FUNCTION processBulkWithRetry(request):
    failedRecords = []
    
    FOR EACH message IN streamBulkProcess(request):
        IF message.type == "error" AND message.retryable:
            failedRecords.add(message.recordId)
    
    IF failedRecords.length > 0:
        retryRequest = {
            operation: request.operation,
            recordIds: failedRecords,
            updates: request.updates
        }
        streamBulkProcess(retryRequest)
```

### Retry with Exponential Backoff

```
FUNCTION retryFailedWithBackoff(failedIds, maxAttempts):
    FOR attempt FROM 1 TO maxAttempts:
        waitTime = min(2^attempt * 1000, 60000)
        wait(waitTime)
        
        result = retryRecords(failedIds)
        failedIds = result.stillFailed
        
        IF failedIds.length == 0:
            RETURN success
    
    RETURN partialFailure(failedIds)
```

---

## Progress and Completion Tracking

### Progress Message Details

```json
{
  "type": "progress",
  "processed": 250,
  "successful": 245,
  "errors": 5,
  "cursor": "checkpoint-250",
  "percentComplete": 50,
  "estimatedTimeRemaining": "PT30S",
  "processingRate": 100
}
```

### Tracking Fields

| Field | Description |
|-------|-------------|
| `processed` | Total records processed so far |
| `successful` | Count of successful operations |
| `errors` | Count of failed operations |
| `cursor` | Checkpoint for resumption |
| `percentComplete` | Progress percentage |
| `estimatedTimeRemaining` | ISO 8601 duration estimate |
| `processingRate` | Records per second |

---

## Client Implementation Guidance

### Pseudocode: Bulk Processor with Error Collection

```
FUNCTION processBulkOperation(request):
    successCount = 0
    errorList = []
    cursor = null
    
    response = httpPost("/v1/orders/bulk-process", request)
    
    FOR EACH line IN response.stream:
        message = parseJson(line)
        
        SWITCH message.type:
            CASE "metadata":
                log("Processing " + message.totalRecords + " records")
            
            CASE "success":
                successCount = successCount + 1
                onRecordSuccess(message)
            
            CASE "error":
                errorList.add(message)
                onRecordError(message)
            
            CASE "progress":
                cursor = message.cursor
                saveCursor(cursor)
                updateProgressBar(message.percentComplete)
            
            CASE "summary":
                RETURN {
                    total: message.processed,
                    successful: message.successful,
                    errors: errorList,
                    summary: message
                }
```

---

## Use Case

Bulk operations on large datasets with real-time feedback.
This pattern is ideal when:

- Processing thousands of records in a single operation
- Some operations may fail and need individual handling
- Client needs immediate feedback on each record
- Results must be processed as they arrive
- Long-running operations need progress visibility

---

## Best Practices

1. **Enable continue-on-error** - Don't stop entire operations for single failures
2. **Save progress checkpoints** - Store cursor from progress messages
3. **Collect errors for retry** - Build a list of retryable failures
4. **Show real-time feedback** - Update UI as results stream in
5. **Set reasonable batch sizes** - Balance memory usage with throughput
6. **Handle partial success** - Plan for mixed success/failure outcomes