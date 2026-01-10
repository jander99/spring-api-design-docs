# gRPC Error Handling

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 7 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic gRPC concepts  
> **🎯 Key Topics:** Status Codes, Error Details, Retry Patterns
> 
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

## Overview

gRPC uses 16 canonical status codes for error reporting. This guide shows you how to choose the right code, add rich error details, and handle errors properly.

**Key Principle:** Use specific status codes with detailed error information to help clients handle failures correctly.

## Canonical Status Codes

### Complete Reference

| Code | Number | HTTP Equivalent | When to Use |
|------|--------|-----------------|-------------|
| `OK` | 0 | 200 | Success |
| `CANCELLED` | 1 | 499 | Client cancelled request |
| `UNKNOWN` | 2 | 500 | Unknown error (avoid if possible) |
| `INVALID_ARGUMENT` | 3 | 400 | Invalid client input |
| `DEADLINE_EXCEEDED` | 4 | 504 | Request timeout |
| `NOT_FOUND` | 5 | 404 | Resource not found |
| `ALREADY_EXISTS` | 6 | 409 | Resource already exists |
| `PERMISSION_DENIED` | 7 | 403 | No permission for operation |
| `RESOURCE_EXHAUSTED` | 8 | 429 | Rate limit or quota exceeded |
| `FAILED_PRECONDITION` | 9 | 400 | System state prevents operation |
| `ABORTED` | 10 | 409 | Concurrency conflict |
| `OUT_OF_RANGE` | 11 | 400 | Index/offset out of range |
| `UNIMPLEMENTED` | 12 | 501 | Method not implemented |
| `INTERNAL` | 13 | 500 | Server error |
| `UNAVAILABLE` | 14 | 503 | Service unavailable |
| `DATA_LOSS` | 15 | 500 | Data corruption detected |
| `UNAUTHENTICATED` | 16 | 401 | Missing or invalid authentication |

**See full details:** [Status Code Reference](reference/status-codes.md)

### Status Code Categories

**Client Errors (client should not retry):**
- `INVALID_ARGUMENT` (3) - Bad input
- `NOT_FOUND` (5) - Missing resource
- `ALREADY_EXISTS` (6) - Duplicate create
- `PERMISSION_DENIED` (7) - No access
- `FAILED_PRECONDITION` (9) - Wrong state
- `OUT_OF_RANGE` (11) - Invalid range
- `UNIMPLEMENTED` (12) - Not supported
- `UNAUTHENTICATED` (16) - Auth required

**Server Errors (client may retry):**
- `DEADLINE_EXCEEDED` (4) - Timeout
- `RESOURCE_EXHAUSTED` (8) - Rate limited
- `ABORTED` (10) - Concurrency conflict
- `INTERNAL` (13) - Server error
- `UNAVAILABLE` (14) - Service down
- `DATA_LOSS` (15) - Corruption

**Infrastructure:**
- `CANCELLED` (1) - Client cancelled
- `UNKNOWN` (2) - Unknown (avoid)

## Common Error Scenarios

### Resource Not Found

```yaml
# Conceptual error response
status:
  code: NOT_FOUND
  message: "Order not found"
  details:
    - type: "type.googleapis.com/google.rpc.ResourceInfo"
      resourceType: "Order"
      resourceName: "orders/12345"
      description: "Order with ID 12345 does not exist"
```

### Invalid Input

```yaml
status:
  code: INVALID_ARGUMENT
  message: "Invalid order data"
  details:
    - type: "type.googleapis.com/google.rpc.BadRequest"
      fieldViolations:
        - field: "items"
          description: "At least one item required"
        - field: "customer_id"
          description: "Customer ID must be non-empty"
        - field: "items[0].quantity"
          description: "Quantity must be positive"
```

### Permission Denied

```yaml
status:
  code: PERMISSION_DENIED
  message: "Insufficient permissions"
  details:
    - type: "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "INSUFFICIENT_PERMISSIONS"
      domain: "orders.example.com"
      metadata:
        requiredPermission: "orders.update"
        userRole: "viewer"
```

### Resource Exhausted (Rate Limit)

```yaml
status:
  code: RESOURCE_EXHAUSTED
  message: "Rate limit exceeded"
  details:
    - type: "type.googleapis.com/google.rpc.QuotaFailure"
      violations:
        - subject: "user:12345"
          description: "Exceeded 100 requests per minute limit"
    - type: "type.googleapis.com/google.rpc.RetryInfo"
      retryDelay: "60s"
```

### State Conflict

```yaml
status:
  code: FAILED_PRECONDITION
  message: "Cannot delete active order"
  details:
    - type: "type.googleapis.com/google.rpc.PreconditionFailure"
      violations:
        - type: "ORDER_STATE"
          subject: "orders/12345"
          description: "Order must be cancelled before deletion"
        - type: "HAS_PENDING_PAYMENT"
          subject: "payments/67890"
          description: "Order has pending payment transaction"
```

### Service Unavailable

```yaml
status:
  code: UNAVAILABLE
  message: "Payment service temporarily unavailable"
  details:
    - type: "type.googleapis.com/google.rpc.RetryInfo"
      retryDelay: "10s"
    - type: "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "SERVICE_UNAVAILABLE"
      domain: "payments.example.com"
```

## Rich Error Details

### Standard Error Detail Types

**google.rpc.BadRequest**
- Field-level validation errors
- Use for INVALID_ARGUMENT

**google.rpc.PreconditionFailure**
- State check failures
- Use for FAILED_PRECONDITION

**google.rpc.QuotaFailure**
- Rate limits, quotas exceeded
- Use for RESOURCE_EXHAUSTED

**google.rpc.ErrorInfo**
- Machine-readable error classification
- Includes reason, domain, metadata

**google.rpc.RetryInfo**
- Retry guidance with backoff delay
- Use with retriable errors

**google.rpc.ResourceInfo**
- Resource identification
- Use for NOT_FOUND, ALREADY_EXISTS

**google.rpc.Help**
- Links to documentation or support
- Use for complex errors

**google.rpc.LocalizedMessage**
- User-facing translated messages
- Use for end-user errors

### Error Details Example

**Complete error response:**
```yaml
status:
  code: INVALID_ARGUMENT
  message: "Order creation failed: validation errors"
  details:
    - type: "type.googleapis.com/google.rpc.BadRequest"
      fieldViolations:
        - field: "items"
          description: "Must contain at least one item"
        - field: "shipping_address.postal_code"
          description: "Invalid postal code format"
    
    - type: "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "VALIDATION_FAILED"
      domain: "orders.example.com"
      metadata:
        documentationUrl: "https://docs.example.com/api/orders/validation"
        supportId: "err-20240109-abc123"
    
    - type: "type.googleapis.com/google.rpc.Help"
      links:
        - description: "Order validation rules"
          url: "https://docs.example.com/api/orders/validation"
        - description: "Contact support"
          url: "https://support.example.com/new?ref=err-20240109-abc123"
```

**See examples:** [Error Response Examples](examples/error-responses.yaml)

## Decision Tree

Use this to choose the right status code:

```
Is operation successful?
├─ YES → OK (0)
└─ NO → Continue...

Is error client's fault?
├─ YES
│  ├─ Bad input format/values? → INVALID_ARGUMENT (3)
│  ├─ Resource not found? → NOT_FOUND (5)
│  ├─ Resource already exists? → ALREADY_EXISTS (6)
│  ├─ No permission? → PERMISSION_DENIED (7)
│  ├─ Not authenticated? → UNAUTHENTICATED (16)
│  ├─ Wrong state for operation? → FAILED_PRECONDITION (9)
│  ├─ Index out of range? → OUT_OF_RANGE (11)
│  └─ Method not supported? → UNIMPLEMENTED (12)
│
└─ NO (server fault)
   ├─ Service overloaded/rate limited? → RESOURCE_EXHAUSTED (8)
   ├─ Request timeout? → DEADLINE_EXCEEDED (4)
   ├─ Service temporarily down? → UNAVAILABLE (14)
   ├─ Concurrency conflict? → ABORTED (10)
   ├─ Data corruption? → DATA_LOSS (15)
   ├─ Client cancelled? → CANCELLED (1)
   └─ Unknown/unexpected? → INTERNAL (13)
```

## Retry Patterns

### Exponential Backoff with Jitter

**Algorithm:**
```
Initial backoff: 1 second
Maximum backoff: 60 seconds
Multiplier: 2
Jitter: ±20%

Attempt 1: Wait 1s  × (0.8 to 1.2) = 0.8-1.2s
Attempt 2: Wait 2s  × (0.8 to 1.2) = 1.6-2.4s
Attempt 3: Wait 4s  × (0.8 to 1.2) = 3.2-4.8s
Attempt 4: Wait 8s  × (0.8 to 1.2) = 6.4-9.6s
Attempt 5: Wait 16s × (0.8 to 1.2) = 12.8-19.2s
...
Max:       Wait 60s × (0.8 to 1.2) = 48-72s
```

**Retry decision:**
```yaml
retry_policy:
  retriable_codes:
    - UNAVAILABLE      # Service down
    - DEADLINE_EXCEEDED # Timeout
    - ABORTED          # Concurrency
    - RESOURCE_EXHAUSTED # Rate limit (with backoff)
  
  non_retriable_codes:
    - INVALID_ARGUMENT
    - NOT_FOUND
    - ALREADY_EXISTS
    - PERMISSION_DENIED
    - FAILED_PRECONDITION
    - UNAUTHENTICATED
    - UNIMPLEMENTED
    - INTERNAL  # Don't retry unknown server errors
    - DATA_LOSS
```

### RetryInfo Guidance

When server indicates retry timing:

```yaml
# Server response
status:
  code: UNAVAILABLE
  details:
    - type: "type.googleapis.com/google.rpc.RetryInfo"
      retryDelay: "30s"

# Client behavior
# Wait exactly 30 seconds before retry
# OR use as minimum in exponential backoff
```

## Error Handling in Streams

### Server Streaming

```protobuf
// Server sends multiple responses then completes or errors
rpc StreamOrders(StreamOrdersRequest) returns (stream Order);
```

**Error behavior:**
- Error closes the stream
- Client receives all prior messages
- Error sent as final message

**Example flow:**
```
Server → Order 1 ✓
Server → Order 2 ✓
Server → Order 3 ✓
Server → ERROR: RESOURCE_EXHAUSTED
Stream closed
```

### Client Streaming

```protobuf
// Client sends multiple requests, server responds once
rpc BatchCreate(stream CreateOrderRequest) returns (BatchCreateResponse);
```

**Error behavior:**
- Error during streaming closes connection
- Server may have processed some requests
- Client should handle partial success

### Bidirectional Streaming

```protobuf
// Both sides stream
rpc Chat(stream ChatMessage) returns (stream ChatMessage);
```

**Error behavior:**
- Either side can error and close stream
- Partial messages may be lost
- Application needs recovery logic

**Best practice:** Use sequence numbers for recovery

## Timeout Configuration

### Client Deadlines

**Conceptual deadline setting:**
```yaml
# Client configuration
request:
  method: "OrderService.GetOrder"
  deadline: 5s  # Absolute deadline for entire operation
  
  # gRPC automatically propagates deadline through call chain
```

**Deadline propagation:**
```
Client (5s deadline)
  → API Gateway (inherits 5s, may reduce to 4s for downstream)
    → Order Service (inherits 4s)
      → Database query (inherits remaining time)
```

### Per-Method Timeouts

```yaml
# Service configuration
service_config:
  methodConfig:
    - name:
        - service: "orders.v1.OrderService"
          method: "GetOrder"
      timeout: "2s"
    
    - name:
        - service: "orders.v1.OrderService"
          method: "ListOrders"
      timeout: "10s"
    
    - name:
        - service: "orders.v1.OrderService"
          method: "CreateOrder"
      timeout: "30s"
```

## Best Practices Summary

✅ **Do:**
- Use specific status codes (not always UNKNOWN or INTERNAL)
- Include rich error details (field violations, resource info)
- Provide retry guidance (RetryInfo)
- Set appropriate deadlines
- Use exponential backoff with jitter
- Log error details server-side
- Include correlation IDs for debugging

❌ **Avoid:**
- Generic "An error occurred" messages
- Exposing internal details (stack traces, SQL) in production
- Using UNKNOWN for known errors
- Retrying non-retriable codes
- Missing error details
- Inconsistent status code usage across team

## Related Topics

- [Status Code Reference](reference/status-codes.md) - All 16 codes detailed
- [Streaming Patterns](streaming-patterns.md) - Error handling in streams
- [Spring Error Handling](../../../languages/spring/grpc/error-handling.md) - Java implementation
- [Error Examples](examples/error-responses.yaml) - Complete YAML examples

## Navigation

- [← Style Guide](protobuf-style-guide.md)
- [Streaming Patterns →](streaming-patterns.md)
- [Back to gRPC Overview](README.md)
