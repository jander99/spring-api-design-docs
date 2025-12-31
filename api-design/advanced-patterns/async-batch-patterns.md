# Async & Batch Processing Patterns

> **Reading Guide**
> 
> **Reading Time:** 13 minutes | **Level:** Advanced
> 
> **Prerequisites:** HTTP fundamentals, REST API basics, error handling patterns  
> **Key Topics:** Long-running operations, batch processing, webhooks, polling
> 
> **Note:** This document contains many HTTP examples. Skim the examples on first read.

## Overview

Many API operations take too long to complete in a single request-response cycle. Report generation, bulk data imports, and payment processing can take seconds or minutes. Async patterns let clients submit work and check back later. Batch patterns let clients send multiple items in one request.

This document covers patterns for handling these scenarios through standard HTTP mechanisms.

## Long-Running Operations

### The 202 Accepted Pattern

When an operation takes more than a few seconds, return `202 Accepted` immediately. Include a `Location` header pointing to a status endpoint.

**Submit a long-running request:**

```http
POST /v1/reports HTTP/1.1
Content-Type: application/json

{
  "type": "sales-summary",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-06-30"
  },
  "format": "pdf"
}
```

**Server accepts and returns operation reference:**

```http
HTTP/1.1 202 Accepted
Location: /v1/operations/op-7a8b9c
Content-Type: application/json

{
  "operationId": "op-7a8b9c",
  "status": "pending",
  "createdAt": "2024-07-15T14:30:00Z",
  "links": {
    "self": "/v1/operations/op-7a8b9c",
    "cancel": "/v1/operations/op-7a8b9c"
  }
}
```

### Operation Resource Design

Operations are first-class resources. Design them with a consistent structure.

**Operation resource fields:**

| Field | Type | Description |
|-------|------|-------------|
| `operationId` | string | Unique identifier for tracking |
| `status` | string | Current state of the operation |
| `createdAt` | datetime | When the operation was submitted |
| `startedAt` | datetime | When processing began (null if pending) |
| `completedAt` | datetime | When processing finished (null if running) |
| `progress` | object | Progress details if available |
| `result` | object | Final result when completed |
| `error` | object | Error details if failed |

### Operation States

Use clear, consistent states across all operations:

| State | Description | Next States |
|-------|-------------|-------------|
| `pending` | Queued, not yet started | `running`, `cancelled` |
| `running` | Currently processing | `completed`, `failed`, `cancelled` |
| `completed` | Finished successfully | (terminal) |
| `failed` | Finished with error | (terminal) |
| `cancelled` | Stopped by client request | (terminal) |

## Status Polling

### Status Endpoint Design

Provide a dedicated endpoint to check operation status:

**Poll for status:**

```http
GET /v1/operations/op-7a8b9c HTTP/1.1
Accept: application/json
```

**Operation still running:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Retry-After: 5

{
  "operationId": "op-7a8b9c",
  "status": "running",
  "createdAt": "2024-07-15T14:30:00Z",
  "startedAt": "2024-07-15T14:30:02Z",
  "progress": {
    "percentage": 45,
    "currentStep": "Processing records",
    "processedItems": 4500,
    "totalItems": 10000
  }
}
```

**Operation completed:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "operationId": "op-7a8b9c",
  "status": "completed",
  "createdAt": "2024-07-15T14:30:00Z",
  "startedAt": "2024-07-15T14:30:02Z",
  "completedAt": "2024-07-15T14:32:15Z",
  "result": {
    "reportId": "rpt-123456",
    "downloadUrl": "/v1/reports/rpt-123456/download",
    "expiresAt": "2024-07-22T14:32:15Z"
  }
}
```

### Polling Best Practices

**Use the Retry-After header** to guide polling intervals:

```http
HTTP/1.1 200 OK
Retry-After: 10
```

**Polling interval guidelines:**

| Operation Duration | Initial Interval | Maximum Interval |
|-------------------|------------------|------------------|
| < 1 minute | 2-5 seconds | 10 seconds |
| 1-10 minutes | 10-30 seconds | 60 seconds |
| > 10 minutes | 30-60 seconds | 5 minutes |

**Implement exponential backoff** when Retry-After is not provided. Start with short intervals and increase gradually.

## Webhooks

### Webhook Registration

Let clients register callbacks for operation completion:

**Register a webhook:**

```http
POST /v1/webhooks HTTP/1.1
Content-Type: application/json

{
  "url": "https://client.example.com/callbacks/orders",
  "events": ["operation.completed", "operation.failed"],
  "secret": "client-provided-secret-for-verification"
}
```

**Webhook created:**

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "webhookId": "wh-abc123",
  "url": "https://client.example.com/callbacks/orders",
  "events": ["operation.completed", "operation.failed"],
  "status": "active",
  "createdAt": "2024-07-15T10:00:00Z"
}
```

### Webhook Payload Format

Send consistent payloads when events occur:

```http
POST /callbacks/orders HTTP/1.1
Content-Type: application/json
X-Webhook-Id: wh-abc123
X-Webhook-Signature: sha256=a1b2c3d4e5f6...
X-Webhook-Timestamp: 2024-07-15T14:32:15Z
X-Request-Id: req-xyz789

{
  "event": "operation.completed",
  "timestamp": "2024-07-15T14:32:15Z",
  "data": {
    "operationId": "op-7a8b9c",
    "status": "completed",
    "result": {
      "reportId": "rpt-123456",
      "downloadUrl": "/v1/reports/rpt-123456/download"
    }
  }
}
```

### Signature Verification

Include signatures so clients can verify webhooks are authentic:

**Signature header format:**

```
X-Webhook-Signature: sha256=<hex-encoded-hmac>
```

**Signature computation:**

1. Concatenate timestamp and request body: `{timestamp}.{body}`
2. Compute HMAC-SHA256 using the shared secret
3. Hex-encode the result

### Retry Policies

Implement retries for failed webhook deliveries:

| Attempt | Delay | Total Elapsed |
|---------|-------|---------------|
| 1 | Immediate | 0 |
| 2 | 1 minute | 1 minute |
| 3 | 5 minutes | 6 minutes |
| 4 | 30 minutes | 36 minutes |
| 5 | 2 hours | 2.5 hours |
| 6 | 8 hours | 10.5 hours |

**Expected response codes:**

| Status Code | Interpretation |
|-------------|----------------|
| 2xx | Success, no retry needed |
| 4xx (except 429) | Client error, no retry |
| 429 | Rate limited, retry with backoff |
| 5xx | Server error, retry |
| Timeout | Network issue, retry |

## Polling vs Webhooks

### Decision Matrix

Choose based on your requirements:

| Factor | Polling | Webhooks |
|--------|---------|----------|
| **Simplicity** | Simpler to implement | More complex setup |
| **Real-time** | Delayed by interval | Near-instant notification |
| **Reliability** | Client controls retry | Server must handle delivery |
| **Firewall issues** | None | May be blocked |
| **Resource usage** | Higher (constant requests) | Lower (event-driven) |
| **Offline clients** | Works naturally | Needs retry/queue |

### When to Use Polling

- Operations complete within 1-2 minutes
- Clients are behind restrictive firewalls
- Simple integration is more important than speed
- Client cannot expose public endpoints

### When to Use Webhooks

- Real-time notification is important
- Operations may take a long time
- Client has reliable public endpoints
- Reducing API calls matters for scale

### Hybrid Approach

Support both patterns. Let clients poll as a fallback:

```json
{
  "operationId": "op-7a8b9c",
  "status": "pending",
  "links": {
    "self": "/v1/operations/op-7a8b9c",
    "cancel": "/v1/operations/op-7a8b9c"
  },
  "webhookRegistered": true,
  "webhookUrl": "https://client.example.com/callbacks"
}
```

## Batch Operations

### Batch Request Format

Process multiple items in one request:

```http
POST /v1/orders/batch HTTP/1.1
Content-Type: application/json

{
  "operations": [
    {
      "method": "POST",
      "path": "/orders",
      "body": {
        "customerId": "cust-001",
        "items": [{"productId": "prod-a", "quantity": 2}]
      }
    },
    {
      "method": "POST",
      "path": "/orders",
      "body": {
        "customerId": "cust-002",
        "items": [{"productId": "prod-b", "quantity": 1}]
      }
    }
  ]
}
```

### All-or-Nothing Processing

Use transactions when all items must succeed together:

```http
POST /v1/orders/batch HTTP/1.1
Content-Type: application/json

{
  "atomic": true,
  "operations": [...]
}
```

**All succeed:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "completed",
  "results": [
    {"index": 0, "status": 201, "data": {"orderId": "ord-001"}},
    {"index": 1, "status": 201, "data": {"orderId": "ord-002"}}
  ]
}
```

**One fails, all rolled back:**

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/batch-failed",
  "title": "Batch Operation Failed",
  "status": 422,
  "detail": "Operation at index 1 failed. All operations rolled back.",
  "failedIndex": 1,
  "failedError": {
    "code": "INSUFFICIENT_INVENTORY",
    "message": "Product prod-b has insufficient inventory"
  }
}
```

### Partial Success Processing

When independent items can succeed or fail separately:

```http
POST /v1/orders/batch HTTP/1.1
Content-Type: application/json

{
  "atomic": false,
  "operations": [...]
}
```

**Mixed results:**

```http
HTTP/1.1 207 Multi-Status
Content-Type: application/json

{
  "status": "partial",
  "summary": {
    "total": 3,
    "succeeded": 2,
    "failed": 1
  },
  "results": [
    {
      "index": 0,
      "status": 201,
      "data": {"orderId": "ord-001"}
    },
    {
      "index": 1,
      "status": 400,
      "error": {
        "type": "https://example.com/problems/validation-error",
        "title": "Validation Error",
        "detail": "Invalid customer ID format"
      }
    },
    {
      "index": 2,
      "status": 201,
      "data": {"orderId": "ord-003"}
    }
  ]
}
```

### Batch Size Limits

Document and enforce limits:

| Limit | Recommended Value | Purpose |
|-------|-------------------|---------|
| Max items per batch | 100-1000 | Prevent timeout |
| Max request size | 5-10 MB | Prevent memory issues |
| Max concurrent batches | 5-10 per client | Fair resource usage |

**Reject oversized batches:**

```http
HTTP/1.1 413 Payload Too Large
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/batch-too-large",
  "title": "Batch Too Large",
  "status": 413,
  "detail": "Batch contains 1500 operations. Maximum allowed is 1000.",
  "maxOperations": 1000,
  "receivedOperations": 1500
}
```

## Progress Tracking

### Progress Response Structure

Include progress details for long operations:

```json
{
  "operationId": "op-7a8b9c",
  "status": "running",
  "progress": {
    "percentage": 67,
    "currentStep": "Validating records",
    "stepsCompleted": 2,
    "totalSteps": 3,
    "processedItems": 6700,
    "totalItems": 10000,
    "estimatedTimeRemaining": "PT2M30S",
    "startedAt": "2024-07-15T14:30:00Z"
  }
}
```

### Progress Fields

| Field | Type | Description |
|-------|------|-------------|
| `percentage` | integer | Overall progress (0-100) |
| `currentStep` | string | Human-readable current phase |
| `stepsCompleted` | integer | Completed phases count |
| `totalSteps` | integer | Total phases |
| `processedItems` | integer | Items processed so far |
| `totalItems` | integer | Total items to process |
| `estimatedTimeRemaining` | duration | ISO 8601 duration estimate |

### Intermediate Results

For operations that produce partial results:

```json
{
  "operationId": "op-7a8b9c",
  "status": "running",
  "progress": {
    "percentage": 50
  },
  "intermediateResults": {
    "validRecords": 4500,
    "invalidRecords": 23,
    "partialDownloadUrl": "/v1/exports/op-7a8b9c/partial"
  }
}
```

## Cancellation

### Cancel an Operation

Use DELETE on the operation resource:

```http
DELETE /v1/operations/op-7a8b9c HTTP/1.1
```

**Cancellation accepted:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "operationId": "op-7a8b9c",
  "status": "cancelled",
  "cancelledAt": "2024-07-15T14:35:00Z",
  "message": "Operation cancelled by user request"
}
```

### Cancellation States

Not all operations can be cancelled at all times:

| Current State | Can Cancel? | Result |
|---------------|-------------|--------|
| `pending` | Yes | Immediate cancellation |
| `running` | Maybe | Depends on operation type |
| `completed` | No | 409 Conflict |
| `failed` | No | 409 Conflict |
| `cancelled` | No | 409 Conflict (already cancelled) |

**Cannot cancel completed operation:**

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/cannot-cancel",
  "title": "Cannot Cancel Operation",
  "status": 409,
  "detail": "Operation has already completed and cannot be cancelled",
  "operationId": "op-7a8b9c",
  "currentStatus": "completed"
}
```

### Graceful Cancellation

Some operations need time to stop cleanly:

```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "operationId": "op-7a8b9c",
  "status": "cancelling",
  "message": "Cancellation in progress. Check status for completion."
}
```

## Error Handling

### Async Operation Errors

When an operation fails, include full error details:

```http
GET /v1/operations/op-7a8b9c HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "operationId": "op-7a8b9c",
  "status": "failed",
  "createdAt": "2024-07-15T14:30:00Z",
  "startedAt": "2024-07-15T14:30:02Z",
  "completedAt": "2024-07-15T14:31:45Z",
  "error": {
    "type": "https://example.com/problems/processing-error",
    "title": "Report Generation Failed",
    "code": "REPORT_DATA_ERROR",
    "detail": "Unable to retrieve sales data for the specified date range",
    "retryable": true
  }
}
```

### Batch Partial Failure Details

Provide detailed error information for each failed item:

```json
{
  "status": "partial",
  "summary": {
    "total": 100,
    "succeeded": 97,
    "failed": 3
  },
  "results": [
    {"index": 0, "status": 201, "data": {"id": "item-001"}},
    {
      "index": 15,
      "status": 400,
      "error": {
        "type": "https://example.com/problems/validation-error",
        "title": "Validation Error",
        "field": "email",
        "detail": "Invalid email format"
      }
    },
    {"index": 16, "status": 201, "data": {"id": "item-017"}}
  ],
  "failedOperations": [
    {
      "index": 15,
      "originalRequest": {"email": "invalid-email", "name": "Test"},
      "error": {"field": "email", "detail": "Invalid email format"}
    }
  ]
}
```

### Error Recovery Options

Include recovery hints when possible:

```json
{
  "operationId": "op-7a8b9c",
  "status": "failed",
  "error": {
    "code": "RATE_LIMITED",
    "detail": "External service rate limit exceeded",
    "retryable": true,
    "retryAfter": "2024-07-15T14:45:00Z"
  },
  "recovery": {
    "canRetry": true,
    "retryUrl": "/v1/operations/op-7a8b9c/retry",
    "suggestion": "Wait 10 minutes and retry the operation"
  }
}
```

## Complete Flow Example

Here is a full async operation flow from submission to completion:

**Step 1: Submit operation**

```http
POST /v1/exports HTTP/1.1
Content-Type: application/json

{
  "type": "customer-data",
  "format": "csv",
  "filters": {"region": "north-america"}
}
```

```http
HTTP/1.1 202 Accepted
Location: /v1/operations/exp-999
Content-Type: application/json

{
  "operationId": "exp-999",
  "status": "pending",
  "createdAt": "2024-07-15T14:30:00Z"
}
```

**Step 2: Poll for status (running)**

```http
GET /v1/operations/exp-999 HTTP/1.1
```

```http
HTTP/1.1 200 OK
Retry-After: 5
Content-Type: application/json

{
  "operationId": "exp-999",
  "status": "running",
  "progress": {
    "percentage": 35,
    "processedItems": 35000,
    "totalItems": 100000
  }
}
```

**Step 3: Poll for status (completed)**

```http
GET /v1/operations/exp-999 HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "operationId": "exp-999",
  "status": "completed",
  "completedAt": "2024-07-15T14:35:22Z",
  "result": {
    "fileUrl": "/v1/exports/exp-999/download",
    "fileSize": 15728640,
    "recordCount": 100000,
    "expiresAt": "2024-07-22T14:35:22Z"
  }
}
```

**Step 4: Download result**

```http
GET /v1/exports/exp-999/download HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="customer-export-2024-07-15.csv"

id,name,email,region
cust-001,John Doe,john@example.com,north-america
...
```

## Related Documentation

- [HTTP Streaming Patterns](http-streaming-patterns.md) - Real-time streaming alternatives
- [Event-Driven Architecture](event-driven-architecture.md) - Event-based async patterns
- [Error Response Standards](../request-response/error-response-standards.md) - RFC 9457 error format
- [API Observability Standards](api-observability-standards.md) - Monitoring async operations
