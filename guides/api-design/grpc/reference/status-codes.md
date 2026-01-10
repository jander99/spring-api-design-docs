# gRPC Status Codes Reference

> **📖 Reading Guide**
> **⏱️ Reading Time:** 8 minutes | **🎯 Level:** Intermediate
> **📋 Prerequisites:** Basic understanding of gRPC and error handling
> **🎯 Key Topics:** Status codes • Error semantics • HTTP mapping • Retry guidance
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

This document provides a comprehensive reference for all 16 canonical gRPC status codes defined in the gRPC specification.

---

## Overview

gRPC uses a standardized set of 16 status codes for all RPC failures. These codes are:

- **Language-agnostic** - Same codes across all gRPC implementations
- **Wire-protocol standard** - Defined in the gRPC specification
- **Semantically rich** - Each code has specific meaning and retry guidance
- **HTTP-compatible** - Map cleanly to HTTP status codes for REST gateways

Every failed gRPC call MUST return exactly one of these status codes.

---

## Complete Status Code Table

| Code | Name | Numeric Value | HTTP Equivalent | Retry? | When to Use |
|------|------|---------------|-----------------|--------|-------------|
| 0 | OK | 0 | 200 OK | N/A | Successful operation (not an error) |
| 1 | CANCELLED | 1 | 499 Client Closed Request | Maybe | Client cancelled the request |
| 2 | UNKNOWN | 2 | 500 Internal Server Error | Maybe | Unknown error (use sparingly) |
| 3 | INVALID_ARGUMENT | 3 | 400 Bad Request | No | Client sent invalid data |
| 4 | DEADLINE_EXCEEDED | 4 | 504 Gateway Timeout | Maybe | Operation timeout |
| 5 | NOT_FOUND | 5 | 404 Not Found | No | Resource doesn't exist |
| 6 | ALREADY_EXISTS | 6 | 409 Conflict | No | Resource already exists |
| 7 | PERMISSION_DENIED | 7 | 403 Forbidden | No | No permission for operation |
| 8 | RESOURCE_EXHAUSTED | 8 | 429 Too Many Requests | Yes | Rate limit or quota exceeded |
| 9 | FAILED_PRECONDITION | 9 | 400 Bad Request | No | System not in required state |
| 10 | ABORTED | 10 | 409 Conflict | Yes | Concurrency conflict (retry with backoff) |
| 11 | OUT_OF_RANGE | 11 | 400 Bad Request | No | Operation out of valid range |
| 12 | UNIMPLEMENTED | 12 | 501 Not Implemented | No | Method not implemented |
| 13 | INTERNAL | 13 | 500 Internal Server Error | Maybe | Server error (hide details from client) |
| 14 | UNAVAILABLE | 14 | 503 Service Unavailable | Yes | Service temporarily unavailable |
| 15 | DATA_LOSS | 15 | 500 Internal Server Error | No | Unrecoverable data corruption |
| 16 | UNAUTHENTICATED | 16 | 401 Unauthorized | No | Missing or invalid credentials |

---

## Detailed Status Code Descriptions

### 0: OK
**Numeric Value:** 0  
**HTTP Equivalent:** 200 OK  
**Retry:** N/A (not an error)

**Meaning:**  
Operation completed successfully. This is the only non-error status code.

**When to use:**
- Every successful RPC call
- Even if the response is empty

**Example:**
```yaml
status:
  code: 0
  message: ""
  details: []
```

---

### 1: CANCELLED
**Numeric Value:** 1  
**HTTP Equivalent:** 499 Client Closed Request  
**Retry:** Maybe (application-specific)

**Meaning:**  
The client cancelled the operation before it completed.

**When to use:**
- Client called `cancel()` on the RPC
- Client deadline exceeded (client-side timeout)
- User cancelled a long-running operation

**Retry guidance:**
- Usually don't retry (user explicitly cancelled)
- May retry if cancellation was due to client timeout and operation is idempotent

**Example:**
```yaml
status:
  code: 1
  message: "Client cancelled the request"
```

---

### 2: UNKNOWN
**Numeric Value:** 2  
**HTTP Equivalent:** 500 Internal Server Error  
**Retry:** Maybe (use exponential backoff)

**Meaning:**  
An unknown error occurred. This status should be used sparingly.

**When to use:**
- Truly unexpected errors with no better classification
- Errors from legacy systems that don't map to specific codes
- As a fallback when no other code fits

**Best practice:**
- Prefer specific status codes (INTERNAL, UNAVAILABLE, etc.)
- Use UNKNOWN only when you genuinely don't know the error type
- Log detailed error information server-side

**Example:**
```yaml
status:
  code: 2
  message: "An unexpected error occurred"
  details:
    - "@type": "type.googleapis.com/google.rpc.DebugInfo"
      stack_entries: []
      detail: "Contact support if this persists"
```

---

### 3: INVALID_ARGUMENT
**Numeric Value:** 3  
**HTTP Equivalent:** 400 Bad Request  
**Retry:** No (client error)

**Meaning:**  
The client provided invalid arguments. This is a client-side error.

**When to use:**
- Missing required fields
- Invalid field values (negative quantity, invalid email format)
- Invalid enum values
- Violates business rules (order quantity exceeds stock)

**Not for:**
- Precondition failures (use FAILED_PRECONDITION)
- Range errors (use OUT_OF_RANGE)

**Example:**
```yaml
status:
  code: 3
  message: "Invalid email format"
  details:
    - "@type": "type.googleapis.com/google.rpc.BadRequest"
      field_violations:
        - field: "email"
          description: "Must be a valid email address"
```

---

### 4: DEADLINE_EXCEEDED
**Numeric Value:** 4  
**HTTP Equivalent:** 504 Gateway Timeout  
**Retry:** Maybe (with longer deadline)

**Meaning:**  
The operation did not complete within the deadline.

**When to use:**
- Server-side timeout (operation took too long)
- Exceeded the deadline specified by the client

**Retry guidance:**
- Retry with longer deadline if operation is critical
- Consider if operation is idempotent before retrying
- Use exponential backoff

**Example:**
```yaml
status:
  code: 4
  message: "Operation exceeded 30s deadline"
  details:
    - "@type": "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "TIMEOUT"
      domain: "inventory.example.com"
```

---

### 5: NOT_FOUND
**Numeric Value:** 5  
**HTTP Equivalent:** 404 Not Found  
**Retry:** No

**Meaning:**  
The requested resource does not exist.

**When to use:**
- Entity not found by ID
- Parent resource doesn't exist
- Endpoint exists, but resource doesn't

**Not for:**
- Entire RPC method doesn't exist (use UNIMPLEMENTED)
- Collection is empty (return empty list, not NOT_FOUND)

**Example:**
```yaml
status:
  code: 5
  message: "Order not found"
  details:
    - "@type": "type.googleapis.com/google.rpc.ResourceInfo"
      resource_type: "Order"
      resource_name: "orders/12345"
      owner: ""
      description: "The requested order does not exist"
```

---

### 6: ALREADY_EXISTS
**Numeric Value:** 6  
**HTTP Equivalent:** 409 Conflict  
**Retry:** No

**Meaning:**  
The resource the client tried to create already exists.

**When to use:**
- Creating a resource with an ID that already exists
- Duplicate entries violate uniqueness constraints
- Idempotency check detects duplicate creation

**Example:**
```yaml
status:
  code: 6
  message: "Order already exists"
  details:
    - "@type": "type.googleapis.com/google.rpc.ResourceInfo"
      resource_type: "Order"
      resource_name: "orders/12345"
      description: "An order with this ID already exists"
```

---

### 7: PERMISSION_DENIED
**Numeric Value:** 7  
**HTTP Equivalent:** 403 Forbidden  
**Retry:** No

**Meaning:**  
The caller does not have permission to execute the operation.

**When to use:**
- User is authenticated but lacks required permissions
- Authorization check failed
- Resource owner restrictions

**Not for:**
- Missing authentication (use UNAUTHENTICATED)

**Example:**
```yaml
status:
  code: 7
  message: "Insufficient permissions to delete order"
  details:
    - "@type": "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "PERMISSION_DENIED"
      domain: "orders.example.com"
      metadata:
        required_permission: "orders.delete"
        user_role: "viewer"
```

---

### 8: RESOURCE_EXHAUSTED
**Numeric Value:** 8  
**HTTP Equivalent:** 429 Too Many Requests  
**Retry:** Yes (with exponential backoff and rate limiting)

**Meaning:**  
A resource has been exhausted (rate limit, quota, disk space).

**When to use:**
- Rate limit exceeded (requests per second)
- Quota exceeded (daily API limit)
- Out of disk space, memory, or other resources

**Retry guidance:**
- Always retry with exponential backoff
- Respect `Retry-After` header if provided
- Implement client-side rate limiting

**Example:**
```yaml
status:
  code: 8
  message: "Rate limit exceeded"
  details:
    - "@type": "type.googleapis.com/google.rpc.QuotaFailure"
      violations:
        - subject: "user:12345"
          description: "Exceeded 100 requests per minute limit"
    - "@type": "type.googleapis.com/google.rpc.RetryInfo"
      retry_delay:
        seconds: 60
```

---

### 9: FAILED_PRECONDITION
**Numeric Value:** 9  
**HTTP Equivalent:** 400 Bad Request  
**Retry:** No (without fixing precondition)

**Meaning:**  
The system is not in a state required for the operation.

**When to use:**
- Deleting a non-empty directory
- Cancelling an already-shipped order
- Operating on a resource in wrong state (DELETE on DELETED)

**Not for:**
- Invalid arguments (use INVALID_ARGUMENT)
- Concurrency conflicts (use ABORTED)

**Example:**
```yaml
status:
  code: 9
  message: "Cannot cancel order in SHIPPED state"
  details:
    - "@type": "type.googleapis.com/google.rpc.PreconditionFailure"
      violations:
        - type: "STATE"
          subject: "orders/12345"
          description: "Order must be in PENDING or PROCESSING state to cancel"
```

---

### 10: ABORTED
**Numeric Value:** 10  
**HTTP Equivalent:** 409 Conflict  
**Retry:** Yes (with exponential backoff)

**Meaning:**  
Concurrency conflict (optimistic locking failure, transaction aborted).

**When to use:**
- Optimistic locking version mismatch
- Transaction conflict (read-modify-write race)
- Compare-and-swap failed

**Retry guidance:**
- Safe to retry (operation is typically idempotent)
- Use exponential backoff to reduce contention
- Client should re-read current state before retry

**Example:**
```yaml
status:
  code: 10
  message: "Optimistic lock failure"
  details:
    - "@type": "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "VERSION_MISMATCH"
      domain: "orders.example.com"
      metadata:
        expected_version: "42"
        actual_version: "43"
```

---

### 11: OUT_OF_RANGE
**Numeric Value:** 11  
**HTTP Equivalent:** 400 Bad Request  
**Retry:** No

**Meaning:**  
Operation attempted past the valid range.

**When to use:**
- Reading past end of file
- Page number exceeds total pages
- Index out of bounds

**Not for:**
- Invalid arguments (use INVALID_ARGUMENT)
- If you can't decide between INVALID_ARGUMENT and OUT_OF_RANGE, use INVALID_ARGUMENT

**Example:**
```yaml
status:
  code: 11
  message: "Page number out of range"
  details:
    - "@type": "type.googleapis.com/google.rpc.BadRequest"
      field_violations:
        - field: "page_token"
          description: "Requested page 50, but only 20 pages exist"
```

---

### 12: UNIMPLEMENTED
**Numeric Value:** 12  
**HTTP Equivalent:** 501 Not Implemented  
**Retry:** No

**Meaning:**  
The operation is not implemented or supported.

**When to use:**
- RPC method not implemented yet
- Feature intentionally not supported
- Method deprecated and removed

**Not for:**
- Resource doesn't exist (use NOT_FOUND)
- Method exists but disabled (use UNAVAILABLE or FAILED_PRECONDITION)

**Example:**
```yaml
status:
  code: 12
  message: "BatchDeleteOrders not implemented"
  details:
    - "@type": "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "METHOD_NOT_IMPLEMENTED"
      domain: "orders.example.com"
      metadata:
        method: "BatchDeleteOrders"
```

---

### 13: INTERNAL
**Numeric Value:** 13  
**HTTP Equivalent:** 500 Internal Server Error  
**Retry:** Maybe (use exponential backoff)

**Meaning:**  
Internal server error. Implementation-specific details should be hidden from clients.

**When to use:**
- Unexpected server-side failures
- Database connection errors
- Unhandled exceptions
- Infrastructure failures

**Best practice:**
- Log detailed errors server-side
- Return generic message to client
- Use DebugInfo only in development environments

**Example:**
```yaml
status:
  code: 13
  message: "Internal server error"
  details:
    - "@type": "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "INTERNAL_ERROR"
      domain: "orders.example.com"
```

---

### 14: UNAVAILABLE
**Numeric Value:** 14  
**HTTP Equivalent:** 503 Service Unavailable  
**Retry:** Yes (always retry with backoff)

**Meaning:**  
The service is temporarily unavailable.

**When to use:**
- Service is down for maintenance
- Overloaded and shedding load
- Dependency service unavailable
- Network partition

**Retry guidance:**
- Always safe to retry
- Use exponential backoff
- Respect `Retry-After` if provided

**Example:**
```yaml
status:
  code: 14
  message: "Service temporarily unavailable"
  details:
    - "@type": "type.googleapis.com/google.rpc.RetryInfo"
      retry_delay:
        seconds: 30
    - "@type": "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "SERVICE_UNAVAILABLE"
      domain: "orders.example.com"
```

---

### 15: DATA_LOSS
**Numeric Value:** 15  
**HTTP Equivalent:** 500 Internal Server Error  
**Retry:** No (permanent data loss)

**Meaning:**  
Unrecoverable data loss or corruption.

**When to use:**
- Data corruption detected
- Permanent data loss confirmed
- Checksum validation failed

**Best practice:**
- Use extremely rarely
- Trigger alerts immediately
- Never retry (data is gone)

**Example:**
```yaml
status:
  code: 15
  message: "Data corruption detected"
  details:
    - "@type": "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "DATA_CORRUPTION"
      domain: "orders.example.com"
      metadata:
        resource: "orders/12345"
```

---

### 16: UNAUTHENTICATED
**Numeric Value:** 16  
**HTTP Equivalent:** 401 Unauthorized  
**Retry:** No (without authentication)

**Meaning:**  
The request does not have valid authentication credentials.

**When to use:**
- Missing authentication token
- Invalid or expired token
- Signature validation failed

**Not for:**
- Valid credentials but insufficient permissions (use PERMISSION_DENIED)

**Example:**
```yaml
status:
  code: 16
  message: "Invalid authentication credentials"
  details:
    - "@type": "type.googleapis.com/google.rpc.ErrorInfo"
      reason: "INVALID_TOKEN"
      domain: "orders.example.com"
      metadata:
        token_type: "JWT"
        error: "Token expired"
```

---

## Status Code Selection Decision Tree

Use this decision tree to select the correct status code:

```
Is the operation successful?
├─ YES → OK (0)
└─ NO  → Is this a client error?
          ├─ YES → Is authentication missing/invalid?
          │        ├─ YES → UNAUTHENTICATED (16)
          │        └─ NO  → Does the client have permission?
          │                 ├─ NO  → PERMISSION_DENIED (7)
          │                 └─ YES → Are the arguments invalid?
          │                          ├─ YES → INVALID_ARGUMENT (3)
          │                          └─ NO  → Does the resource exist?
          │                                   ├─ NO  → NOT_FOUND (5)
          │                                   └─ YES → Is the system in the right state?
          │                                            ├─ NO  → FAILED_PRECONDITION (9)
          │                                            └─ YES → (continue to server errors)
          └─ NO  → Is this a server error?
                   ├─ YES → Is the service available?
                   │        ├─ NO  → UNAVAILABLE (14)
                   │        └─ YES → Is this a timeout?
                   │                 ├─ YES → DEADLINE_EXCEEDED (4)
                   │                 └─ NO  → Is this a concurrency conflict?
                   │                          ├─ YES → ABORTED (10)
                   │                          └─ NO  → Is this a resource limit?
                   │                                   ├─ YES → RESOURCE_EXHAUSTED (8)
                   │                                   └─ NO  → INTERNAL (13)
```

---

## Common Mistakes

### Using UNKNOWN Instead of Specific Codes
**Wrong:**
```yaml
code: 2  # UNKNOWN
message: "Database connection failed"
```

**Right:**
```yaml
code: 13  # INTERNAL
message: "Internal server error"
```

### Using NOT_FOUND for Unimplemented Methods
**Wrong:**
```yaml
code: 5  # NOT_FOUND
message: "Method DeleteAllOrders not found"
```

**Right:**
```yaml
code: 12  # UNIMPLEMENTED
message: "Method DeleteAllOrders not implemented"
```

### Using INTERNAL for Client Errors
**Wrong:**
```yaml
code: 13  # INTERNAL
message: "Email field is required"
```

**Right:**
```yaml
code: 3  # INVALID_ARGUMENT
message: "Email field is required"
```

### Confusing PERMISSION_DENIED and UNAUTHENTICATED
**Wrong:**
```yaml
code: 7  # PERMISSION_DENIED
message: "Missing authentication token"
```

**Right:**
```yaml
code: 16  # UNAUTHENTICATED
message: "Missing authentication token"
```

---

## Retry Strategy by Status Code

| Status Code | Retry Safe? | Strategy | Backoff |
|-------------|-------------|----------|---------|
| CANCELLED | Maybe | Application-specific | Exponential |
| UNKNOWN | Maybe | Use caution | Exponential |
| INVALID_ARGUMENT | No | Fix client error | N/A |
| DEADLINE_EXCEEDED | Maybe | Increase deadline | Exponential |
| NOT_FOUND | No | Resource doesn't exist | N/A |
| ALREADY_EXISTS | No | Use existing resource | N/A |
| PERMISSION_DENIED | No | Fix permissions | N/A |
| RESOURCE_EXHAUSTED | Yes | Wait and retry | Exponential + jitter |
| FAILED_PRECONDITION | No | Fix precondition first | N/A |
| ABORTED | Yes | Safe to retry | Exponential |
| OUT_OF_RANGE | No | Fix range error | N/A |
| UNIMPLEMENTED | No | Feature not available | N/A |
| INTERNAL | Maybe | Transient failure possible | Exponential |
| UNAVAILABLE | Yes | Always retry | Exponential |
| DATA_LOSS | No | Permanent failure | N/A |
| UNAUTHENTICATED | No | Fix credentials | N/A |

---

## Related Documentation

- **[Error Handling Guide](../error-handling.md)** - Comprehensive error handling patterns
- **[Protobuf Schema Design](../protobuf-schema-design.md)** - Designing error messages
- **[Security Guide](../security.md)** - Authentication and authorization
- **[Streaming Patterns](../streaming-patterns.md)** - Error handling in streams

---

**Navigation:** [← Back to gRPC Guide](../README.md) | [Error Handling →](../error-handling.md)
