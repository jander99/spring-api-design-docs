# Asynchronous Operations

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** HTTP fundamentals, REST API experience  
> **🎯 Key Topics:** Architecture, Patterns
> 
> **📊 Complexity:** Grade 14 • Intermediate technical density • difficult

## Overview

Asynchronous operations handle tasks that take too long to complete in a single HTTP request. Instead of making clients wait, you accept the request immediately and process it in the background. This pattern is essential for long-running tasks like report generation, batch processing, or complex calculations.

## When to Use Async Operations

Use asynchronous patterns when operations:

- Take longer than 30 seconds to complete
- Process large datasets or files
- Call multiple slow external services
- Perform complex calculations
- Generate reports or exports
- Run batch operations

For quick operations (under 1-2 seconds), use standard synchronous HTTP requests.

## Core Pattern: 202 Accepted

The 202 Accepted status code signals that the server accepted the request but hasn't finished processing it yet. This is the foundation of async HTTP operations.

### Basic 202 Pattern

```http
POST /reports/sales HTTP/1.1
Content-Type: application/json

{
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "format": "PDF"
}

HTTP/1.1 202 Accepted
Location: /operations/op-abc123
Content-Type: application/json

{
  "operationId": "op-abc123",
  "status": "PROCESSING",
  "createdAt": "2024-07-15T14:30:00Z",
  "statusUrl": "/operations/op-abc123"
}
```

### 202 Response Structure

Every 202 response should include:

| Field | Required | Purpose |
|-------|----------|---------|
| `operationId` | Yes | Unique identifier for tracking |
| `status` | Yes | Current processing state |
| `statusUrl` | Yes | Endpoint for checking progress |
| `createdAt` | Yes | When operation started |
| `estimatedCompletion` | No | Expected completion time |
| `links` | No | Related endpoints (HATEOAS) |

## Operation Status States

Define clear states for operation lifecycle:

| State | Meaning | Next States |
|-------|---------|-------------|
| `PENDING` | Queued, not started yet | `PROCESSING`, `CANCELLED` |
| `PROCESSING` | Currently running | `COMPLETED`, `FAILED`, `CANCELLED` |
| `COMPLETED` | Finished successfully | None (terminal) |
| `FAILED` | Encountered an error | None (terminal) |
| `CANCELLED` | User cancelled operation | None (terminal) |

### State Transition Example

```json
{
  "operationId": "op-abc123",
  "status": "PROCESSING",
  "progress": {
    "current": 45,
    "total": 100,
    "percentage": 45
  },
  "startedAt": "2024-07-15T14:30:00Z",
  "estimatedCompletion": "2024-07-15T14:35:00Z"
}
```

## Polling Pattern

Clients check operation status by polling the status endpoint at regular intervals.

### Status Endpoint Design

```http
GET /operations/op-abc123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
Retry-After: 30

{
  "operationId": "op-abc123",
  "status": "PROCESSING",
  "progress": {
    "current": 45,
    "total": 100,
    "percentage": 45
  },
  "startedAt": "2024-07-15T14:30:00Z",
  "estimatedCompletion": "2024-07-15T14:35:00Z",
  "links": {
    "self": "/operations/op-abc123",
    "cancel": "/operations/op-abc123/cancel"
  }
}
```

### Polling Best Practices

1. **Use Retry-After Header**: Tell clients when to poll again
2. **Implement Exponential Backoff**: Start with short intervals, increase gradually
3. **Set Maximum Poll Frequency**: Prevent excessive requests
4. **Return Progress Information**: Help clients show progress bars

### Polling Frequency Guidelines

```http
HTTP/1.1 200 OK
Retry-After: 30

{
  "status": "PROCESSING",
  "progress": 45,
  "pollInterval": {
    "recommended": 30,
    "minimum": 10
  }
}
```

## Completion Handling

### Successful Completion

```http
GET /operations/op-abc123 HTTP/1.1

HTTP/1.1 303 See Other
Location: /reports/rpt-xyz789
Content-Type: application/json

{
  "operationId": "op-abc123",
  "status": "COMPLETED",
  "completedAt": "2024-07-15T14:34:22Z",
  "result": {
    "reportId": "rpt-xyz789",
    "url": "/reports/rpt-xyz789",
    "format": "PDF",
    "size": 2457600
  }
}
```

### Failed Operation

```http
GET /operations/op-abc123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "operationId": "op-abc123",
  "status": "FAILED",
  "failedAt": "2024-07-15T14:32:15Z",
  "error": {
    "type": "https://api.example.com/problems/data-processing-error",
    "title": "Data Processing Error",
    "status": 500,
    "detail": "Unable to generate report due to database timeout",
    "instance": "/operations/op-abc123"
  }
}
```

## Webhook Callbacks

Instead of polling, clients can provide a webhook URL for completion notification.

### Webhook Registration

```http
POST /reports/sales HTTP/1.1
Content-Type: application/json

{
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "format": "PDF",
  "webhook": {
    "url": "https://client.example.com/webhooks/reports",
    "events": ["COMPLETED", "FAILED"],
    "secret": "webhook-secret-key"
  }
}

HTTP/1.1 202 Accepted
Location: /operations/op-abc123
Content-Type: application/json

{
  "operationId": "op-abc123",
  "status": "PROCESSING",
  "webhook": {
    "registered": true,
    "events": ["COMPLETED", "FAILED"]
  }
}
```

### Webhook Delivery

```http
POST /webhooks/reports HTTP/1.1
Host: client.example.com
Content-Type: application/json
X-Webhook-Signature: sha256=abc123...
X-Webhook-Event: COMPLETED
X-Operation-Id: op-abc123

{
  "event": "COMPLETED",
  "operationId": "op-abc123",
  "timestamp": "2024-07-15T14:34:22Z",
  "result": {
    "reportId": "rpt-xyz789",
    "url": "https://api.example.com/reports/rpt-xyz789",
    "format": "PDF"
  }
}
```

### Webhook Security

1. **Use HTTPS Only**: Never send webhooks over HTTP
2. **Include Signature**: Sign webhook payload with shared secret
3. **Verify Signatures**: Client must verify webhook authenticity
4. **Include Event Type**: Use headers to identify event type
5. **Implement Retries**: Retry failed deliveries with exponential backoff

### Webhook Signature Example

```http
X-Webhook-Signature: sha256=5d41402abc4b2a76b9719d911017c592
```

Signature calculation:
```
HMAC-SHA256(webhook_secret, request_body)
```

## WebSocket Status Updates

For real-time status updates, use WebSocket connections.

### WebSocket Connection

```
ws://api.example.com/operations/op-abc123/status

// Client connects to WebSocket

// Server sends status updates
{
  "event": "STATUS_UPDATE",
  "operationId": "op-abc123",
  "status": "PROCESSING",
  "progress": 25,
  "timestamp": "2024-07-15T14:31:00Z"
}

{
  "event": "STATUS_UPDATE",
  "operationId": "op-abc123",
  "status": "PROCESSING",
  "progress": 50,
  "timestamp": "2024-07-15T14:32:00Z"
}

{
  "event": "COMPLETED",
  "operationId": "op-abc123",
  "status": "COMPLETED",
  "result": {
    "reportId": "rpt-xyz789",
    "url": "/reports/rpt-xyz789"
  },
  "timestamp": "2024-07-15T14:34:22Z"
}
```

### WebSocket Message Format

```json
{
  "event": "STATUS_UPDATE|COMPLETED|FAILED",
  "operationId": "op-abc123",
  "timestamp": "2024-07-15T14:32:00Z",
  "status": "PROCESSING",
  "progress": 50,
  "data": {}
}
```

## Server-Sent Events (SSE)

SSE provides one-way server-to-client streaming for status updates.

### SSE Status Stream

```http
GET /operations/op-abc123/stream HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 1
event: status-update
data: {"operationId":"op-abc123","status":"PROCESSING","progress":25}

id: 2
event: status-update
data: {"operationId":"op-abc123","status":"PROCESSING","progress":50}

id: 3
event: status-update
data: {"operationId":"op-abc123","status":"PROCESSING","progress":75}

id: 4
event: completed
data: {"operationId":"op-abc123","status":"COMPLETED","result":{"reportId":"rpt-xyz789"}}
```

### SSE Event Types

| Event Type | Purpose |
|------------|---------|
| `status-update` | Progress updates |
| `completed` | Successful completion |
| `failed` | Operation failure |
| `cancelled` | User cancellation |

## Operation Cancellation

Allow clients to cancel long-running operations.

### Cancel Request

```http
POST /operations/op-abc123/cancel HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "operationId": "op-abc123",
  "status": "CANCELLED",
  "cancelledAt": "2024-07-15T14:33:00Z",
  "reason": "User requested cancellation"
}
```

### Handling Cancellation

1. **Immediate Response**: Acknowledge cancellation request quickly
2. **Cleanup**: Release resources and stop processing
3. **Status Update**: Update operation status to CANCELLED
4. **Idempotency**: Multiple cancel requests should be safe
5. **Partial Results**: Consider saving partial progress

## Operation Lifecycle Management

### Operation Expiration

```http
GET /operations/op-abc123 HTTP/1.1

HTTP/1.1 410 Gone
Content-Type: application/json

{
  "type": "https://api.example.com/problems/operation-expired",
  "title": "Operation Expired",
  "status": 410,
  "detail": "Operation results are only available for 24 hours",
  "instance": "/operations/op-abc123",
  "expiredAt": "2024-07-16T14:30:00Z"
}
```

### Lifecycle Policies

1. **Result Retention**: Define how long results are kept
2. **Automatic Cleanup**: Remove old operations automatically
3. **Client Communication**: Inform clients about retention policies
4. **Status Transitions**: Document allowed state changes

## Job Status Endpoints

Design dedicated endpoints for job status tracking.

### Job Status Response

```http
GET /jobs/job-456 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "jobId": "job-456",
  "type": "REPORT_GENERATION",
  "status": "PROCESSING",
  "progress": {
    "current": 450,
    "total": 1000,
    "percentage": 45,
    "message": "Processing orders"
  },
  "timestamps": {
    "submitted": "2024-07-15T14:30:00Z",
    "started": "2024-07-15T14:30:15Z",
    "estimatedCompletion": "2024-07-15T14:35:00Z"
  },
  "links": {
    "self": "/jobs/job-456",
    "cancel": "/jobs/job-456/cancel",
    "logs": "/jobs/job-456/logs"
  }
}
```

### Job History

```http
GET /jobs?status=COMPLETED&limit=10 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "jobId": "job-456",
      "type": "REPORT_GENERATION",
      "status": "COMPLETED",
      "completedAt": "2024-07-15T14:34:22Z",
      "duration": 242
    }
  ],
  "pagination": {
    "page": 0,
    "size": 10,
    "totalElements": 100
  }
}
```

## Progress Tracking

### Detailed Progress Information

```json
{
  "operationId": "op-abc123",
  "status": "PROCESSING",
  "progress": {
    "current": 450,
    "total": 1000,
    "percentage": 45,
    "phase": "DATA_PROCESSING",
    "message": "Processing customer records",
    "phases": [
      {
        "name": "VALIDATION",
        "status": "COMPLETED",
        "duration": 30
      },
      {
        "name": "DATA_PROCESSING",
        "status": "IN_PROGRESS",
        "percentage": 45
      },
      {
        "name": "REPORT_GENERATION",
        "status": "PENDING"
      }
    ]
  }
}
```

### Progress Granularity

Choose appropriate progress detail level:

1. **Simple**: Just percentage (0-100)
2. **Detailed**: Current/total items processed
3. **Multi-phase**: Track progress through stages
4. **Time-based**: Estimated completion time

## Error Handling

### Partial Failure

```http
GET /operations/op-abc123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "operationId": "op-abc123",
  "status": "COMPLETED_WITH_ERRORS",
  "completedAt": "2024-07-15T14:34:22Z",
  "result": {
    "reportId": "rpt-xyz789",
    "url": "/reports/rpt-xyz789",
    "warnings": [
      {
        "code": "MISSING_DATA",
        "message": "Some customer records were missing email addresses",
        "affectedRecords": 15
      }
    ]
  }
}
```

### Retry Policies

```http
GET /operations/op-abc123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "operationId": "op-abc123",
  "status": "FAILED",
  "failedAt": "2024-07-15T14:32:15Z",
  "error": {
    "type": "https://api.example.com/problems/temporary-failure",
    "title": "Temporary Failure",
    "detail": "External service temporarily unavailable",
    "retryable": true,
    "retryAfter": 300
  },
  "links": {
    "retry": "/operations/op-abc123/retry"
  }
}
```

## Testing Async Operations

### Testing Checklist

1. **Accept Request**: Verify 202 response with operation ID
2. **Poll Status**: Check status endpoint returns current state
3. **Track Progress**: Verify progress updates work correctly
4. **Handle Completion**: Test successful completion flow
5. **Handle Failure**: Test error scenarios
6. **Test Cancellation**: Verify cancel functionality
7. **Check Expiration**: Test operation cleanup
8. **Verify Webhooks**: Test webhook delivery and retries

### Test Example

```http
# Step 1: Submit operation
POST /reports/sales HTTP/1.1
Content-Type: application/json

{"dateRange": {"start": "2024-01-01", "end": "2024-12-31"}}

# Verify: 202 Accepted with operationId

# Step 2: Poll status
GET /operations/op-abc123 HTTP/1.1

# Verify: Returns PROCESSING status

# Step 3: Wait for completion
GET /operations/op-abc123 HTTP/1.1

# Verify: Returns COMPLETED status with result
```

## Best Practices

### Response Design

1. **Consistent Structure**: Use same format for all async operations
2. **Include Links**: Provide HATEOAS links for next actions
3. **Clear States**: Use well-defined status values
4. **Progress Info**: Include meaningful progress data
5. **Timestamps**: Always include creation and update times

### Client Experience

1. **Fast Acceptance**: Return 202 quickly (under 1 second)
2. **Realistic Estimates**: Provide accurate completion times
3. **Progress Updates**: Update progress regularly
4. **Clear Errors**: Return helpful error messages
5. **Cancellation**: Allow users to cancel operations

### Server Implementation

1. **Idempotent Operations**: Support retry safely
2. **Resource Cleanup**: Remove old operations automatically
3. **Rate Limiting**: Prevent operation flooding
4. **Monitoring**: Track operation success rates
5. **Logging**: Log operation lifecycle events

## Common Patterns

### Pattern Comparison

| Pattern | Best For | Pros | Cons |
|---------|----------|------|------|
| Polling | Simple operations | Easy to implement | Increased load |
| Webhooks | Critical updates | Real-time notification | Requires endpoint |
| WebSocket | Frequent updates | True real-time | Complex setup |
| SSE | Server updates | Simpler than WebSocket | One-way only |

### Pattern Selection Guide

- **Use Polling**: Default for most async operations
- **Add Webhooks**: When clients need immediate notification
- **Use WebSocket**: For frequent status updates (every few seconds)
- **Use SSE**: For server-initiated updates without client commands

## Related Documentation

- [HTTP Streaming Patterns](./http-streaming-patterns.md): WebSocket and SSE implementation details
- [Event-Driven Architecture](./event-driven-architecture.md): Event patterns for async systems
- [API Observability Standards](./api-observability-standards.md): Monitoring async operations
- [Error Response Standards](../request-response/error-response-standards.md): Error handling for async failures

## Implementation Notes

- **HTTP Standards**: Follow RFC 7231 for 202 Accepted usage
- **Protocol Selection**: Choose appropriate protocol based on update frequency
- **Security**: Implement authentication for all async endpoints
- **Scalability**: Design for horizontal scaling of background jobs
- **Monitoring**: Track operation queues, processing times, and failure rates

These patterns provide a complete foundation for building reliable asynchronous APIs that handle long-running operations gracefully across different technology stacks.
