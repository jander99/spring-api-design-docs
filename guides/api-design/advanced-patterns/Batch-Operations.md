# Batch Operations

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 15 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Bulk operations, partial success, transaction boundaries
> 
> **📊 Complexity:** 11.7 grade level • 1.5% technical density • fairly difficult

## Overview

Batch operations let clients create, update, or delete many resources in one HTTP request. This pattern cuts network overhead. It can boost performance for bulk operations. But batch operations add complexity. You must handle transaction boundaries. You must manage partial success. You must report errors clearly.

This guide shows HTTP patterns for batch operations in REST APIs. It uses only HTTP and JSON examples.

## Core Concepts

### What is a Batch Operation?

A batch operation processes many resource changes in one request. Common use cases include:

- Importing datasets with many records
- Updating multiple resources with the same change
- Deleting resources that match certain criteria
- Synchronizing data between systems

### Transaction Models

APIs can support two transaction models for batch operations:

**Atomic Operations** (all-or-nothing):
- All operations succeed or all fail
- Simpler to reason about
- Safer for critical data
- May reject entire batch if one item fails

**Partial Success Operations** (best-effort):
- Some operations can succeed while others fail
- More resilient to individual failures
- Requires detailed error reporting
- Better for large batches with independent items

## HTTP Patterns for Batch Operations

### URL Structure

Batch endpoints use custom method naming with a `:batch` prefix:

```
POST /v1/publishers/{publisher}/books:batchCreate
POST /v1/publishers/{publisher}/books:batchUpdate
POST /v1/publishers/{publisher}/books:batchDelete
```

Pattern rules:
- HTTP method is always `POST` (even for batch delete)
- URL ends with `:batch{Operation}` suffix
- URL represents the collection being modified
- Parent resource appears in the path when required

### Request Format

Batch requests contain an array of operations. Each operation performs one action:

```http
POST /v1/publishers/pub-123/books:batchCreate HTTP/1.1
Content-Type: application/json

{
  "requests": [
    {
      "title": "REST API Design",
      "isbn": "978-1234567890",
      "price": 29.99
    },
    {
      "title": "HTTP Performance",
      "isbn": "978-0987654321",
      "price": 34.99
    }
  ]
}
```

Request structure guidelines:
- Use `requests` array for the operations
- Each item matches the standard single operation format
- Maximum batch size should be documented
- Parent resource can be specified at batch level

### Response Format

Response structure depends on the transaction model.

#### Atomic Success Response

All operations succeeded:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "books": [
    {
      "id": "book-456",
      "title": "REST API Design",
      "isbn": "978-1234567890",
      "price": 29.99,
      "createdAt": "2024-07-15T14:30:00Z"
    },
    {
      "id": "book-457",
      "title": "HTTP Performance",
      "isbn": "978-0987654321",
      "price": 34.99,
      "createdAt": "2024-07-15T14:30:00Z"
    }
  ]
}
```

#### Atomic Failure Response

In atomic mode, if any operation fails, the whole batch fails:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/batch-validation-failed",
  "title": "Batch operation validation failed",
  "status": 400,
  "detail": "Request at index 1 failed validation",
  "instance": "/v1/publishers/pub-123/books:batchCreate",
  "errors": [
    {
      "index": 1,
      "type": "https://api.example.com/errors/duplicate-isbn",
      "title": "Duplicate ISBN",
      "detail": "ISBN 978-0987654321 already exists",
      "field": "isbn"
    }
  ]
}
```

## Partial Success Handling

### When to Use Partial Success

Use partial success when:
- Operations are independent
- Batch has many items
- Some failures should not stop others
- Client can handle individual failures

Use atomic operations when:
- Operations must succeed together
- Data consistency matters most
- Batch is small
- All-or-nothing is clearer

### Partial Success Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "books": [
    {
      "id": "book-456",
      "title": "REST API Design",
      "isbn": "978-1234567890",
      "price": 29.99,
      "createdAt": "2024-07-15T14:30:00Z"
    }
  ],
  "errors": [
    {
      "index": 1,
      "type": "https://api.example.com/errors/duplicate-isbn",
      "title": "Duplicate ISBN",
      "status": 409,
      "detail": "ISBN 978-0987654321 already exists",
      "field": "isbn"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  }
}
```

Key elements:
- HTTP status is `200 OK` even with some failures
- Successful resources appear in the main array
- Failed operations go in `errors` array
- Each error includes the request index
- Summary shows counts for tracking

### Complete Failure in Partial Success Mode

When all operations fail:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "books": [],
  "errors": [
    {
      "index": 0,
      "type": "https://api.example.com/errors/invalid-isbn",
      "title": "Invalid ISBN format",
      "status": 400,
      "detail": "ISBN must follow ISBN-13 format"
    },
    {
      "index": 1,
      "type": "https://api.example.com/errors/duplicate-isbn",
      "title": "Duplicate ISBN",
      "status": 409,
      "detail": "ISBN 978-0987654321 already exists"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 0,
    "failed": 2
  }
}
```

## Batch Create Operations

### Request Example

```http
POST /v1/orders:batchCreate HTTP/1.1
Content-Type: application/json

{
  "parent": "customers/cust-789",
  "requests": [
    {
      "items": [{"sku": "WIDGET-A", "quantity": 10}],
      "shippingAddress": {
        "street": "123 Main St",
        "city": "Portland",
        "state": "OR",
        "zipCode": "97201"
      }
    },
    {
      "items": [{"sku": "WIDGET-B", "quantity": 5}],
      "shippingAddress": {
        "street": "456 Oak Ave",
        "city": "Seattle",
        "state": "WA",
        "zipCode": "98101"
      }
    }
  ]
}
```

### Success Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
Location: /v1/customers/cust-789/orders

{
  "orders": [
    {
      "id": "order-1001",
      "status": "PENDING",
      "total": 299.90,
      "createdAt": "2024-07-15T14:30:00Z",
      "links": {
        "self": "/v1/orders/order-1001"
      }
    },
    {
      "id": "order-1002",
      "status": "PENDING",
      "total": 149.95,
      "createdAt": "2024-07-15T14:30:00Z",
      "links": {
        "self": "/v1/orders/order-1002"
      }
    }
  ]
}
```

## Batch Update Operations

### Request Example

```http
POST /v1/products:batchUpdate HTTP/1.1
Content-Type: application/json

{
  "requests": [
    {
      "product": {
        "id": "prod-100",
        "price": 19.99,
        "inStock": true
      },
      "updateMask": "price,inStock"
    },
    {
      "product": {
        "id": "prod-101",
        "price": 24.99,
        "inStock": false
      },
      "updateMask": "price,inStock"
    }
  ]
}
```

Field mask details:
- `updateMask` says which fields to change
- Can apply to whole batch if same for all items
- Stops accidental overwrites of other fields

### Partial Success Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "products": [
    {
      "id": "prod-100",
      "name": "Widget A",
      "price": 19.99,
      "inStock": true,
      "updatedAt": "2024-07-15T14:30:00Z"
    }
  ],
  "errors": [
    {
      "index": 1,
      "type": "https://api.example.com/errors/resource-not-found",
      "title": "Product not found",
      "status": 404,
      "detail": "Product prod-101 does not exist"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  }
}
```

## Batch Delete Operations

### Request with Resource Names

```http
POST /v1/publishers/pub-123/books:batchDelete HTTP/1.1
Content-Type: application/json

{
  "names": [
    "publishers/pub-123/books/book-456",
    "publishers/pub-123/books/book-457",
    "publishers/pub-123/books/book-458"
  ]
}
```

### Success Response (Hard Delete)

```http
HTTP/1.1 204 No Content
```

For atomic hard deletes, an empty response works fine on success.

### Partial Success Response (Soft Delete)

When resources are soft-deleted (marked as deleted but not removed):

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "books": [
    {
      "id": "book-456",
      "title": "REST API Design",
      "deletedAt": "2024-07-15T14:30:00Z",
      "state": "DELETED"
    },
    {
      "id": "book-457",
      "title": "HTTP Performance",
      "deletedAt": "2024-07-15T14:30:00Z",
      "state": "DELETED"
    }
  ],
  "errors": [
    {
      "index": 2,
      "type": "https://api.example.com/errors/resource-not-found",
      "title": "Book not found",
      "status": 404,
      "detail": "Book book-458 does not exist"
    }
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

## Error Aggregation Strategies

### Index-Based Error Mapping

Map errors to request array indices:

```json
{
  "errors": [
    {
      "index": 0,
      "type": "https://api.example.com/errors/validation-failed",
      "title": "Validation failed",
      "status": 400,
      "detail": "Field 'email' is required"
    },
    {
      "index": 2,
      "type": "https://api.example.com/errors/duplicate-resource",
      "title": "Duplicate resource",
      "status": 409,
      "detail": "Email alice@example.com already exists"
    }
  ]
}
```

Benefits:
- Clear link from error to request item
- Client sees exactly which items failed
- Easy to build and understand

### Error Grouping by Type

Group similar errors together:

```json
{
  "errors": [
    {
      "type": "https://api.example.com/errors/validation-failed",
      "title": "Validation errors",
      "status": 400,
      "indices": [0, 3, 5],
      "details": [
        "Request 0: Field 'email' is required",
        "Request 3: Field 'phone' format invalid",
        "Request 5: Field 'name' exceeds maximum length"
      ]
    },
    {
      "type": "https://api.example.com/errors/duplicate-resource",
      "title": "Duplicate resources",
      "status": 409,
      "indices": [2, 7],
      "details": [
        "Request 2: Email already exists",
        "Request 7: Username already taken"
      ]
    }
  ]
}
```

Benefits:
- Easier to see patterns in failures
- Smaller response for common errors
- Shows system-wide issues

## Transaction Boundaries in REST

### Request-Level Transactions

Each batch request is one HTTP transaction:

```
Client Request → Server Processing → Single Response
```

Atomicity applies to the whole batch. It does not apply to single items. This is true unless using atomic mode.

### Database Transaction Patterns

**Single Transaction (Atomic)**:
```
BEGIN TRANSACTION
  INSERT book 1
  INSERT book 2
  INSERT book 3
COMMIT
```

All operations succeed or all are rolled back.

**Individual Transactions (Partial Success)**:
```
BEGIN TRANSACTION
  INSERT book 1
COMMIT

BEGIN TRANSACTION
  INSERT book 2
ROLLBACK (on error)

BEGIN TRANSACTION
  INSERT book 3
COMMIT
```

Each operation succeeds or fails independently.

### Long-Running Batch Operations

For operations that take too long for HTTP timeouts:

```http
POST /v1/products:batchUpdate HTTP/1.1
Content-Type: application/json

{
  "requests": [/* 1000 items */]
}

HTTP/1.1 202 Accepted
Content-Type: application/json
Location: /v1/operations/op-789

{
  "operationId": "op-789",
  "status": "PROCESSING",
  "links": {
    "self": "/v1/operations/op-789",
    "cancel": "/v1/operations/op-789:cancel"
  }
}
```

Status checking:

```http
GET /v1/operations/op-789 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "operationId": "op-789",
  "status": "COMPLETED",
  "progress": {
    "total": 1000,
    "successful": 997,
    "failed": 3,
    "percentComplete": 100
  },
  "result": {
    "products": [/* successful items */],
    "errors": [/* failed items with indices */]
  },
  "completedAt": "2024-07-15T14:35:00Z"
}
```

## Idempotency in Batch Operations

### Client-Provided Request IDs

```http
POST /v1/orders:batchCreate HTTP/1.1
Content-Type: application/json

{
  "requests": [
    {
      "requestId": "req-client-001",
      "items": [{"sku": "WIDGET-A", "quantity": 10}]
    },
    {
      "requestId": "req-client-002",
      "items": [{"sku": "WIDGET-B", "quantity": 5}]
    }
  ]
}
```

The `requestId` enables:
- Safe retry of the whole batch
- Removing duplicate requests
- Same results on repeated calls

### Idempotency Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "orders": [
    {
      "id": "order-1001",
      "requestId": "req-client-001",
      "status": "CREATED"
    },
    {
      "id": "order-1002",
      "requestId": "req-client-002",
      "status": "ALREADY_EXISTS"
    }
  ]
}
```

## Validation Strategies

### Fail-Fast Validation

Validate entire batch before processing:

```http
POST /v1/users:batchCreate HTTP/1.1
Content-Type: application/json
Prefer: validate-only

{
  "requests": [/* items */]
}

HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/batch-validation-failed",
  "title": "Batch validation failed",
  "status": 400,
  "errors": [
    {"index": 0, "field": "email", "message": "Invalid format"},
    {"index": 3, "field": "age", "message": "Must be positive"}
  ]
}
```

### Dry-Run Mode

Test batch without making changes:

```http
POST /v1/products:batchUpdate HTTP/1.1
Content-Type: application/json

{
  "dryRun": true,
  "requests": [/* items */]
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "validationResults": [
    {"index": 0, "valid": true},
    {"index": 1, "valid": false, "errors": ["Price exceeds limit"]}
  ],
  "summary": {
    "total": 2,
    "valid": 1,
    "invalid": 1
  }
}
```

## Rate Limiting and Quotas

### Batch Size Limits

Document maximum items per batch:

```http
POST /v1/books:batchCreate HTTP/1.1
Content-Type: application/json

{
  "requests": [/* 1001 items - exceeds limit */]
}

HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/batch-size-exceeded",
  "title": "Batch size exceeded",
  "status": 400,
  "detail": "Maximum batch size is 1000 items, received 1001",
  "maxBatchSize": 1000
}
```

### Rate Limit Headers

Apply rate limits to batch operations:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1626361200

{
  "books": [/* results */]
}
```

Note: A single batch request counts as one request, not one per item.

## Best Practices

### Design Guidelines

1. **Pick the Right Model**: Use atomic for critical ops. Use partial success for resilience.
2. **Document Limits**: State max batch sizes clearly.
3. **Map Errors Clearly**: Use indices to show which request failed.
4. **Support Idempotency**: Let clients send request IDs for safe retries.
5. **Show Progress**: Give progress updates for long operations.

### Request Design

1. **Keep Batches Small**: Use 100-1000 items per batch.
2. **Set Parent Once**: Cut redundancy by setting parent at batch level.
3. **Use Field Masks**: For updates, let clients say which fields to change.
4. **Validate Early**: Find errors before starting work.

### Response Design

1. **Stay Consistent**: Match single operation format.
2. **Add Summary**: Help clients track success rates.
3. **Keep Order**: Return results in same order as requests.
4. **Link Resources**: Add self links for new or changed resources.

### Error Handling

1. **Use RFC 7807**: Follow problem details standard.
2. **Map to Index**: Show which request failed.
3. **Give Details**: Help clients fix problems.
4. **Classify Errors**: Split validation, conflict, and system errors.

## Common Patterns

### Bulk Import

```http
POST /v1/products:batchCreate HTTP/1.1
Content-Type: application/json

{
  "requests": [/* 500 products */],
  "options": {
    "skipDuplicates": true,
    "validateOnly": false
  }
}
```

### Bulk Status Update

```http
POST /v1/orders:batchUpdate HTTP/1.1
Content-Type: application/json

{
  "requests": [
    {
      "order": {"id": "order-1", "status": "SHIPPED"},
      "updateMask": "status"
    },
    {
      "order": {"id": "order-2", "status": "SHIPPED"},
      "updateMask": "status"
    }
  ]
}
```

### Bulk Archive

```http
POST /v1/documents:batchDelete HTTP/1.1
Content-Type: application/json

{
  "names": [
    "documents/doc-1",
    "documents/doc-2",
    "documents/doc-3"
  ],
  "softDelete": true
}
```

## Related Documentation

- [Error Response Standards](../request-response/Error-Response-Standards.md): Error format specifications
- [Async Operations](./Async-Operations.md): Comprehensive async operation patterns for long-running batch jobs
- [HTTP Streaming Patterns](HTTP-Streaming-Patterns.md): Alternative bulk processing approaches

## Implementation Notes

- **Framework Agnostic**: These patterns work with any REST framework
- **HTTP Standards**: Follow HTTP/1.1 specifications for all operations
- **Content Negotiation**: Support `application/json` for requests and responses
- **Security**: Apply same authentication and authorization as single operations
