# gRPC Standard Methods Reference

> **📖 Reading Guide**
> **⏱️ Reading Time:** 10 minutes | **🎯 Level:** Intermediate
> **📋 Prerequisites:** Understanding of gRPC service design and protobuf
> **🎯 Key Topics:** Standard methods • Google AIPs • Resource-oriented design • CRUD operations
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

This document describes the standard gRPC methods based on Google's API Improvement Proposals (AIPs 130-136). These methods provide consistent patterns for CRUD operations across gRPC services.

---

## Overview

Standard methods are conventional RPC methods for common operations on resources. They provide:

- **Consistency** - Same method names and signatures across all services
- **Predictability** - Developers know what to expect
- **Tooling support** - Standard methods enable better code generation
- **Resource-oriented design** - Maps cleanly to REST principles

These patterns come from Google's internal API standards and are used in Google Cloud APIs.

---

## The Five Standard Methods

| Method | AIP | HTTP Mapping | Purpose | Idempotent |
|--------|-----|--------------|---------|------------|
| **Get** | AIP-131 | GET | Retrieve a single resource | Yes |
| **List** | AIP-132 | GET | Retrieve multiple resources | Yes |
| **Create** | AIP-133 | POST | Create a new resource | No* |
| **Update** | AIP-134 | PATCH/PUT | Modify an existing resource | Yes (PUT) |
| **Delete** | AIP-135 | DELETE | Remove a resource | Yes |

*Create can be idempotent with client-specified IDs and idempotency tokens.

---

## Get Method (AIP-131)

### Purpose
Retrieve a single resource by its name or identifier.

### Signature Pattern
```protobuf
rpc Get<ResourceName>(Get<ResourceName>Request) returns (<ResourceName>) {}
```

### Request Message
```protobuf
message GetOrderRequest {
  // Resource name in format: orders/{order_id}
  // Field name must be 'name' for consistency
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "orders.example.com/Order"
    }
  ];

  // Optional: specify which fields to return
  // Uses field mask syntax: "id,customer.name,items"
  google.protobuf.FieldMask read_mask = 2;
}
```

### Response
Returns the resource directly (not wrapped in a response message).

```protobuf
// Returns: Order message directly
message Order {
  string name = 1;  // orders/12345
  string customer_id = 2;
  OrderStatus status = 3;
  // ... other fields
}
```

### Behavior Requirements

1. **Resource name format** - Must use `name` field with format `{resource_type}/{id}`
2. **Not found** - Return `NOT_FOUND` if resource doesn't exist
3. **Field mask support** - Support `read_mask` for partial responses
4. **Idempotent** - Safe to call multiple times
5. **No side effects** - Must not modify state

### HTTP Mapping
```
GET /v1/orders/12345
```

### Error Codes
- `NOT_FOUND` (5) - Resource doesn't exist
- `PERMISSION_DENIED` (7) - Caller lacks read permission
- `UNAUTHENTICATED` (16) - Missing credentials

### Example
```protobuf
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order) {
    option (google.api.http) = {
      get: "/v1/{name=orders/*}"
    };
  }
}
```

---

## List Method (AIP-132)

### Purpose
Retrieve multiple resources, with pagination support.

### Signature Pattern
```protobuf
rpc List<ResourceName>s(List<ResourceName>sRequest) 
    returns (List<ResourceName>sResponse) {}
```

### Request Message
```protobuf
message ListOrdersRequest {
  // Parent resource (if listing sub-resources)
  // Format: customers/{customer_id}
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "orders.example.com/Order"
    }
  ];

  // Maximum number of items to return
  // Default: 50, Maximum: 1000
  int32 page_size = 2;

  // Token from previous List response
  // Empty for first page
  string page_token = 3;

  // Filter expression (AIP-160)
  // Example: "status = PENDING AND total > 100"
  string filter = 4;

  // Sort order (AIP-132)
  // Example: "create_time desc,total asc"
  string order_by = 5;

  // Optional: specify which fields to return
  google.protobuf.FieldMask read_mask = 6;
}
```

### Response Message
```protobuf
message ListOrdersResponse {
  // The list of resources
  repeated Order orders = 1;

  // Token for next page
  // Empty if this is the last page
  string next_page_token = 2;

  // Optional: total count (expensive to compute)
  // Only include if explicitly requested
  int32 total_size = 3;
}
```

### Behavior Requirements

1. **Pagination** - Must support `page_size` and `page_token`
2. **Default page size** - Use 50 if not specified
3. **Maximum page size** - Enforce 1000 item limit
4. **Stable ordering** - Results must be consistently ordered
5. **Empty results** - Return empty list, not `NOT_FOUND`
6. **Filter support** - Implement filtering with AIP-160 syntax
7. **Idempotent** - Safe to call multiple times

### Pagination Pattern
```
Request 1: page_size=10, page_token=""
Response 1: [items 1-10], next_page_token="abc"

Request 2: page_size=10, page_token="abc"
Response 2: [items 11-20], next_page_token="def"

Request 3: page_size=10, page_token="def"
Response 3: [items 21-25], next_page_token=""  # Last page
```

### HTTP Mapping
```
GET /v1/orders?page_size=50&page_token=abc&filter=status=PENDING
```

### Error Codes
- `INVALID_ARGUMENT` (3) - Invalid filter or order_by syntax
- `PERMISSION_DENIED` (7) - Caller lacks list permission
- `UNAUTHENTICATED` (16) - Missing credentials

### Example
```protobuf
service OrderService {
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse) {
    option (google.api.http) = {
      get: "/v1/{parent=customers/*}/orders"
    };
  }
}
```

---

## Create Method (AIP-133)

### Purpose
Create a new resource.

### Signature Pattern
```protobuf
rpc Create<ResourceName>(Create<ResourceName>Request) 
    returns (<ResourceName>) {}
```

### Request Message
```protobuf
message CreateOrderRequest {
  // Parent resource (if creating sub-resource)
  // Format: customers/{customer_id}
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "orders.example.com/Order"
    }
  ];

  // Client-specified ID (optional but recommended)
  // If empty, server generates an ID
  string order_id = 2;

  // The resource to create
  // Must not include 'name' field (set by server)
  Order order = 3 [(google.api.field_behavior) = REQUIRED];

  // Optional: idempotency token
  // Prevents duplicate creates from retries
  string request_id = 4;
}
```

### Response
Returns the created resource with server-generated fields populated.

```protobuf
// Returns: Order with name, create_time, etc. populated
```

### Behavior Requirements

1. **Generate server fields** - Set `name`, `create_time`, `uid`
2. **Validate input** - Return `INVALID_ARGUMENT` for invalid data
3. **Check existence** - Return `ALREADY_EXISTS` if resource exists
4. **Support client IDs** - Allow client to specify resource ID
5. **Idempotency tokens** - Honor `request_id` to prevent duplicates
6. **Ignore unknown fields** - Don't fail on extra fields

### Idempotency Pattern
```protobuf
// Request 1: with request_id
CreateOrderRequest {
  parent: "customers/C1"
  order_id: "O1"
  order: { customer_id: "C1", ... }
  request_id: "unique-token-123"
}
// Response: Order { name: "customers/C1/orders/O1", ... }

// Request 2: retry with same request_id
CreateOrderRequest {
  parent: "customers/C1"
  order_id: "O1"
  order: { customer_id: "C1", ... }
  request_id: "unique-token-123"  // Same token
}
// Response: Same order (idempotent, no duplicate created)
```

### HTTP Mapping
```
POST /v1/customers/C1/orders
Body: { order_id: "O1", order: {...}, request_id: "..." }
```

### Error Codes
- `INVALID_ARGUMENT` (3) - Invalid resource data
- `ALREADY_EXISTS` (6) - Resource with ID already exists
- `PERMISSION_DENIED` (7) - Caller lacks create permission
- `FAILED_PRECONDITION` (9) - Parent resource doesn't exist

### Example
```protobuf
service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (Order) {
    option (google.api.http) = {
      post: "/v1/{parent=customers/*}/orders"
      body: "order"
    };
  }
}
```

---

## Update Method (AIP-134)

### Purpose
Modify an existing resource.

### Signature Pattern
```protobuf
rpc Update<ResourceName>(Update<ResourceName>Request) 
    returns (<ResourceName>) {}
```

### Request Message
```protobuf
message UpdateOrderRequest {
  // The resource to update
  // Must include 'name' field
  Order order = 1 [(google.api.field_behavior) = REQUIRED];

  // Fields to update (required for partial updates)
  // If empty, updates all fields (full replacement)
  google.protobuf.FieldMask update_mask = 2;

  // Optional: allow missing (creates if not exists)
  bool allow_missing = 3;

  // Optional: validate only (don't apply changes)
  bool validate_only = 4;
}
```

### Response
Returns the updated resource with all fields populated.

### Behavior Requirements

1. **Require resource name** - `order.name` must be present
2. **Support field masks** - Only update specified fields
3. **Validate input** - Return `INVALID_ARGUMENT` for invalid data
4. **Check existence** - Return `NOT_FOUND` if resource doesn't exist
5. **Support allow_missing** - Create resource if missing and allowed
6. **Idempotent** - Multiple identical updates have same effect
7. **Return full resource** - Include all fields in response

### Field Mask Pattern

**Partial update** (only update status and total):
```protobuf
UpdateOrderRequest {
  order: {
    name: "orders/12345"
    status: SHIPPED
    total: 99.99
  }
  update_mask: {
    paths: ["status", "total"]
  }
}
```

**Full replacement** (update all fields):
```protobuf
UpdateOrderRequest {
  order: {
    name: "orders/12345"
    status: SHIPPED
    total: 99.99
    customer_id: "C1"
    // ... all fields
  }
  update_mask: {}  # Empty = full replacement
}
```

### HTTP Mapping
```
PATCH /v1/orders/12345
Body: { order: {...}, update_mask: "status,total" }
```

or

```
PUT /v1/orders/12345
Body: { order: {...} }  # Full replacement
```

### Error Codes
- `INVALID_ARGUMENT` (3) - Invalid field values or field mask
- `NOT_FOUND` (5) - Resource doesn't exist
- `PERMISSION_DENIED` (7) - Caller lacks update permission
- `FAILED_PRECONDITION` (9) - Resource in invalid state for update

### Example
```protobuf
service OrderService {
  rpc UpdateOrder(UpdateOrderRequest) returns (Order) {
    option (google.api.http) = {
      patch: "/v1/{order.name=orders/*}"
      body: "order"
    };
  }
}
```

---

## Delete Method (AIP-135)

### Purpose
Remove a resource.

### Signature Pattern
```protobuf
rpc Delete<ResourceName>(Delete<ResourceName>Request) 
    returns (google.protobuf.Empty) {}
```

### Request Message
```protobuf
message DeleteOrderRequest {
  // Resource name to delete
  // Format: orders/{order_id}
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "orders.example.com/Order"
    }
  ];

  // Optional: idempotency token
  string request_id = 2;

  // Optional: validate only (don't actually delete)
  bool validate_only = 3;

  // Optional: ETag for optimistic concurrency
  string etag = 4;

  // Optional: force delete (ignore dependencies)
  bool force = 5;
}
```

### Response
Returns `google.protobuf.Empty` on success.

For soft deletes or async deletion, return the resource with deletion metadata:
```protobuf
// Alternative: return Order with deleted=true
Order {
  name: "orders/12345"
  deleted: true
  delete_time: "2024-01-15T10:30:00Z"
}
```

### Behavior Requirements

1. **Idempotent** - Succeed even if resource already deleted
2. **Check existence** - Succeed with empty response if not found
3. **Support force** - Handle cascading deletes with `force` flag
4. **Support etag** - Prevent concurrent modification with optimistic locking
5. **Validate dependencies** - Return `FAILED_PRECONDITION` if dependencies exist
6. **Audit trail** - Log deletions for compliance

### Delete Strategies

**Hard delete** (immediate removal):
```protobuf
rpc DeleteOrder(DeleteOrderRequest) returns (google.protobuf.Empty) {}
```

**Soft delete** (mark as deleted):
```protobuf
rpc DeleteOrder(DeleteOrderRequest) returns (Order) {
  // Returns: Order { deleted: true, delete_time: ... }
}
```

**Async delete** (long-running operation):
```protobuf
rpc DeleteOrder(DeleteOrderRequest) returns (google.longrunning.Operation) {
  // Returns: Operation { done: false, name: "operations/123" }
}
```

### HTTP Mapping
```
DELETE /v1/orders/12345
```

### Error Codes
- `NOT_FOUND` (5) - Resource doesn't exist (optional, can succeed)
- `PERMISSION_DENIED` (7) - Caller lacks delete permission
- `FAILED_PRECONDITION` (9) - Has dependencies (without force=true)

### Example
```protobuf
service OrderService {
  rpc DeleteOrder(DeleteOrderRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/v1/{name=orders/*}"
    };
  }
}
```

---

## Custom Methods (AIP-136)

When standard methods don't fit, use custom methods.

### Naming Pattern
- Use verb-first naming: `CancelOrder`, `ShipOrder`, `RefundOrder`
- Use imperative mood (command form)
- Avoid generic names: `ProcessOrder` (unclear)

### Signature Pattern
```protobuf
rpc <CustomVerb><ResourceName>(
    <CustomVerb><ResourceName>Request
) returns (<CustomVerb><ResourceName>Response) {}
```

### Example: Cancel Order
```protobuf
message CancelOrderRequest {
  // Resource to operate on
  string name = 1 [(google.api.field_behavior) = REQUIRED];

  // Custom method parameters
  string cancellation_reason = 2;
  bool refund = 3;
}

message CancelOrderResponse {
  // The updated order
  Order order = 1;

  // Operation-specific fields
  string refund_id = 2;
  google.protobuf.Timestamp cancelled_at = 3;
}

service OrderService {
  rpc CancelOrder(CancelOrderRequest) returns (CancelOrderResponse) {
    option (google.api.http) = {
      post: "/v1/{name=orders/*}:cancel"
      body: "*"
    };
  }
}
```

### HTTP Mapping
Custom methods use POST with `:verb` suffix:
```
POST /v1/orders/12345:cancel
Body: { cancellation_reason: "Customer request", refund: true }
```

### Common Custom Methods

| Method | Purpose | HTTP |
|--------|---------|------|
| `CancelOrder` | Cancel pending order | POST `:cancel` |
| `ShipOrder` | Mark as shipped | POST `:ship` |
| `BatchGet` | Get multiple by IDs | GET `:batchGet` |
| `SearchOrders` | Complex search | GET `:search` |
| `ImportOrders` | Bulk import | POST `:import` |
| `ExportOrders` | Bulk export | POST `:export` |

---

## Resource Naming Conventions

### Resource Name Format
```
{collection}/{id}[/{collection}/{id}]*
```

Examples:
- `orders/12345`
- `customers/C1/orders/O1`
- `projects/P1/datasets/D1/tables/T1`

### Field Naming
- **Resource identifier**: Always use `name` field
- **Parent resource**: Always use `parent` field
- **Resource object**: Use resource type name (e.g., `order`, not `resource`)

### Collection Names
- Use plural form: `orders`, not `order`
- Use American English: `colors`, not `colours`
- Use lowercase: `orders`, not `Orders`

---

## Complete Service Example

```protobuf
syntax = "proto3";

package example.orders.v1;

import "google/api/annotations.proto";
import "google/api/field_behavior.proto";
import "google/api/resource.proto";
import "google/protobuf/empty.proto";
import "google/protobuf/field_mask.proto";
import "google/protobuf/timestamp.proto";

service OrderService {
  // Standard methods (AIP-131 to AIP-135)
  rpc GetOrder(GetOrderRequest) returns (Order) {
    option (google.api.http) = {
      get: "/v1/{name=orders/*}"
    };
  }

  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse) {
    option (google.api.http) = {
      get: "/v1/orders"
    };
  }

  rpc CreateOrder(CreateOrderRequest) returns (Order) {
    option (google.api.http) = {
      post: "/v1/orders"
      body: "order"
    };
  }

  rpc UpdateOrder(UpdateOrderRequest) returns (Order) {
    option (google.api.http) = {
      patch: "/v1/{order.name=orders/*}"
      body: "order"
    };
  }

  rpc DeleteOrder(DeleteOrderRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/v1/{name=orders/*}"
    };
  }

  // Custom methods (AIP-136)
  rpc CancelOrder(CancelOrderRequest) returns (Order) {
    option (google.api.http) = {
      post: "/v1/{name=orders/*}:cancel"
      body: "*"
    };
  }

  rpc ShipOrder(ShipOrderRequest) returns (Order) {
    option (google.api.http) = {
      post: "/v1/{name=orders/*}:ship"
      body: "*"
    };
  }
}

// Resource definition
message Order {
  option (google.api.resource) = {
    type: "orders.example.com/Order"
    pattern: "orders/{order}"
  };

  string name = 1;
  string customer_id = 2;
  OrderStatus status = 3;
  double total = 4;
  google.protobuf.Timestamp create_time = 5;
  google.protobuf.Timestamp update_time = 6;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  PENDING = 1;
  PROCESSING = 2;
  SHIPPED = 3;
  DELIVERED = 4;
  CANCELLED = 5;
}

// Request/Response messages for standard methods
message GetOrderRequest {
  string name = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.FieldMask read_mask = 2;
}

message ListOrdersRequest {
  int32 page_size = 1;
  string page_token = 2;
  string filter = 3;
  string order_by = 4;
}

message ListOrdersResponse {
  repeated Order orders = 1;
  string next_page_token = 2;
}

message CreateOrderRequest {
  string order_id = 1;
  Order order = 2 [(google.api.field_behavior) = REQUIRED];
  string request_id = 3;
}

message UpdateOrderRequest {
  Order order = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.FieldMask update_mask = 2;
}

message DeleteOrderRequest {
  string name = 1 [(google.api.field_behavior) = REQUIRED];
  string request_id = 2;
}

// Custom method messages
message CancelOrderRequest {
  string name = 1 [(google.api.field_behavior) = REQUIRED];
  string reason = 2;
}

message ShipOrderRequest {
  string name = 1 [(google.api.field_behavior) = REQUIRED];
  string tracking_number = 2;
}
```

---

## Best Practices Summary

### Do:
- ✅ Use standard method names consistently (Get, List, Create, Update, Delete)
- ✅ Follow field naming conventions (`name`, `parent`, resource type)
- ✅ Support pagination for List methods
- ✅ Implement field masks for partial reads/updates
- ✅ Use custom methods for operations that don't fit standard patterns
- ✅ Make operations idempotent where possible

### Don't:
- ❌ Invent new names for standard operations (`Fetch`, `Retrieve`, `Find`)
- ❌ Mix REST and RPC styles in the same service
- ❌ Return NOT_FOUND for empty List results (return empty list)
- ❌ Use generic custom method names (`ProcessOrder`, `HandleOrder`)
- ❌ Ignore Google AIPs if building public APIs

---

## Related Documentation

- **[Protobuf Schema Design](../protobuf-schema-design.md)** - Message and service design patterns
- **[Error Handling](../error-handling.md)** - Status codes and error responses
- **[Versioning](../versioning.md)** - Evolving service definitions
- **[Security](../security.md)** - Authentication and authorization

---

## External Resources

- [AIP-131: Get](https://google.aip.dev/131) - Standard Get method
- [AIP-132: List](https://google.aip.dev/132) - Standard List method with pagination
- [AIP-133: Create](https://google.aip.dev/133) - Standard Create method
- [AIP-134: Update](https://google.aip.dev/134) - Standard Update method with field masks
- [AIP-135: Delete](https://google.aip.dev/135) - Standard Delete method
- [AIP-136: Custom methods](https://google.aip.dev/136) - When and how to use custom methods

---

**Navigation:** [← Back to gRPC Guide](../README.md) | [Protobuf Schema Design →](../protobuf-schema-design.md)
