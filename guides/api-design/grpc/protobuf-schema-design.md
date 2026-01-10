# Protocol Buffer Schema Design

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic gRPC concepts  
> **🎯 Key Topics:** Protocol Buffers, Schema Design, Service Definition
> 
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

## Overview

Protocol Buffers define your gRPC API contract. This guide teaches you how to design schemas that are maintainable, evolvable, and follow industry best practices.

**Key Principle:** Design messages and services that can evolve over time without breaking existing clients.

## Basic Structure

### Minimal Schema

```protobuf
syntax = "proto3";

package myservice.v1;

service MyService {
  rpc DoSomething(Request) returns (Response);
}

message Request {
  string input = 1;
}

message Response {
  string output = 1;
}
```

**Required elements:**
1. `syntax = "proto3"` - Always use proto3
2. `package` - Namespaces your definitions
3. `service` - Defines RPC methods
4. `message` - Defines data structures

## Package Organization

### Package Naming

Follow this pattern: `{domain}.{service}.{version}`

```protobuf
// Good
package orders.v1;
package payments.checkout.v1;
package auth.tokens.v2;

// Avoid
package v1.orders;        // Version first
package Orders;           // PascalCase
package orders_service;   // Underscores
```

**Benefits:**
- Clear ownership (domain)
- Logical grouping (service)
- Evolution support (version)

### File Organization

**Recommended structure:**
```
protos/
├── orders/
│   └── v1/
│       ├── orders.proto        # Service definitions
│       ├── messages.proto      # Shared messages
│       └── types.proto         # Common types
├── payments/
│   └── v1/
│       └── payments.proto
└── common/
    └── v1/
        ├── money.proto         # Money type
        └── timestamp.proto     # Time types
```

## Message Design

### Basic Messages

```protobuf
message Order {
  // Scalar types
  string id = 1;                    // Unique identifier
  string customer_id = 2;           // Foreign key reference
  int32 item_count = 3;             // Integer
  double total_amount = 4;          // Decimal
  bool is_paid = 5;                 // Boolean
  
  // Enums
  OrderStatus status = 6;
  
  // Nested messages
  ShippingAddress shipping = 7;
  
  // Repeated fields (arrays)
  repeated OrderItem items = 8;
  
  // Timestamps
  google.protobuf.Timestamp created_at = 9;
  google.protobuf.Timestamp updated_at = 10;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;  // Always have zero value
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
  ORDER_STATUS_DELIVERED = 4;
  ORDER_STATUS_CANCELLED = 5;
}

message ShippingAddress {
  string street = 1;
  string city = 2;
  string state = 3;
  string postal_code = 4;
  string country = 5;
}

message OrderItem {
  string product_id = 1;
  int32 quantity = 2;
  Money unit_price = 3;
}
```

### Field Numbers

**Rules:**
- Use 1-15 for frequently used fields (1 byte encoding)
- Use 16-2047 for less common fields (2 bytes)
- Never reuse deleted field numbers
- Reserve deleted numbers to prevent reuse

```protobuf
message Product {
  // Frequently used fields (1-15)
  string id = 1;
  string name = 2;
  Money price = 3;
  
  // Less common fields (16+)
  string long_description = 16;
  repeated string tags = 17;
  
  // Reserved fields (deleted but preserved)
  reserved 4, 5, 6;
  reserved "old_field_name", "deprecated_field";
}
```

### Common Types

Use well-known types for common patterns:

```protobuf
import "google/protobuf/timestamp.proto";
import "google/protobuf/duration.proto";
import "google/protobuf/empty.proto";

message Example {
  // Timestamps (RFC 3339)
  google.protobuf.Timestamp created_at = 1;
  
  // Durations
  google.protobuf.Duration ttl = 2;
  
  // Optional empty response
  // rpc Delete(DeleteRequest) returns (google.protobuf.Empty);
}
```

### Money Type

**Always use a dedicated money type:**

```protobuf
message Money {
  // ISO 4217 currency code (USD, EUR, JPY)
  string currency_code = 1;
  
  // Whole units (dollars, euros)
  int64 units = 2;
  
  // Fractional units (cents, nano units)
  // Range: 0 to 999,999,999
  int32 nanos = 3;
}

// Example: $99.99 USD
// Money { currency_code: "USD", units: 99, nanos: 990000000 }
```

**Why not double?**
- Floating-point precision errors
- Currency calculations must be exact
- Different currencies have different decimal places

## Service Design

### Standard Methods (Google AIP)

Follow Google's standard methods for consistency:

```protobuf
service OrderService {
  // Get a single resource
  rpc GetOrder(GetOrderRequest) returns (Order);
  
  // List multiple resources with pagination
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
  
  // Create a new resource
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  
  // Update an existing resource
  rpc UpdateOrder(UpdateOrderRequest) returns (Order);
  
  // Delete a resource
  rpc DeleteOrder(DeleteOrderRequest) returns (google.protobuf.Empty);
}
```

### Request/Response Naming

**Pattern:** `{MethodName}Request` and `{MethodName}Response`

```protobuf
message GetOrderRequest {
  string order_id = 1;
}

// Response can be the resource itself for Get
rpc GetOrder(GetOrderRequest) returns (Order);

// Or a wrapper for List
message ListOrdersResponse {
  repeated Order orders = 1;
  string next_page_token = 2;
  int32 total_count = 3;
}
```

**Why dedicated request/response messages?**
- Future expansion without breaking changes
- Can add optional parameters later
- Clear API contract

### Custom Methods

When standard methods don't fit, use custom methods:

**Pattern:** `VerbNoun`

```protobuf
service OrderService {
  // Custom method: verb + noun
  rpc CancelOrder(CancelOrderRequest) returns (Order);
  rpc RefundOrder(RefundOrderRequest) returns (RefundOrderResponse);
  rpc ArchiveOrder(ArchiveOrderRequest) returns (google.protobuf.Empty);
  
  // Multi-resource operations
  rpc BatchCreateOrders(BatchCreateOrdersRequest) returns (BatchCreateOrdersResponse);
}

message CancelOrderRequest {
  string order_id = 1;
  string reason = 2;
}
```

**Avoid:**
- Generic names like `process`, `handle`, `execute`
- CRUD verbs for custom methods (use standard methods instead)

## Pagination

### Cursor-Based (Recommended)

```protobuf
message ListOrdersRequest {
  // Maximum items to return
  int32 page_size = 1;
  
  // Token from previous response
  string page_token = 2;
  
  // Optional filters
  string customer_id = 3;
  OrderStatus status = 4;
}

message ListOrdersResponse {
  repeated Order orders = 1;
  
  // Token for next page (empty if no more results)
  string next_page_token = 2;
  
  // Optional total count
  int32 total_count = 3;
}
```

**Benefits:**
- Handles concurrent modifications
- Works with any data store
- Consistent page sizes

### Offset-Based (Simpler)

```protobuf
message ListOrdersRequest {
  int32 limit = 1;   // Max results
  int32 offset = 2;  // Skip count
}

message ListOrdersResponse {
  repeated Order orders = 1;
  int32 total_count = 2;
}
```

**Drawbacks:**
- Duplicates/missing items if data changes
- Inefficient for large offsets
- Database performance issues

## Resource Names

Use hierarchical resource names:

**Pattern:** `{collection}/{id}/{subcollection}/{id}`

```protobuf
message GetOrderRequest {
  // Resource name: "customers/123/orders/456"
  string name = 1;
}

message Order {
  // Full resource name
  string name = 1;  // "customers/123/orders/456"
  
  // Other fields
  string display_id = 2;  // "456" for UI
  string customer_id = 3;  // "123" for queries
}
```

**Benefits:**
- Self-describing
- Supports nested resources
- Works with HTTP transcoding

## Field Presence and Optionality

### Proto3 Optional Fields

```protobuf
message UpdateOrderRequest {
  string order_id = 1;
  
  // Optional field: can distinguish between unset and default value
  optional string notes = 2;
  
  // Optional vs required update
  optional Money new_total = 3;
}
```

**Use optional when:**
- Need to distinguish between "not set" and "default value"
- Partial updates
- Fields that can be explicitly cleared

### Oneof (Exclusive Choice)

```protobuf
message PaymentMethod {
  oneof method {
    CreditCard credit_card = 1;
    BankAccount bank_account = 2;
    DigitalWallet wallet = 3;
  }
}

message CreditCard {
  string number = 1;
  string cvv = 2;
}
```

**Use oneof for:**
- Mutually exclusive fields
- Polymorphic types
- Different processing paths

## Complete Example

See [Order Service Example](examples/order-service.proto) for a complete, production-ready schema.

**Includes:**
- Standard methods (Get, List, Create, Update, Delete)
- Custom methods (Cancel, Refund)
- Pagination
- Money types
- Timestamps
- Nested messages
- Enums with clear naming

## Best Practices Summary

✅ **Do:**
- Use proto3 syntax
- Version packages (v1, v2)
- Create dedicated request/response messages
- Use 1-15 for frequent fields
- Reserve deleted field numbers
- Use standard method names
- Include timestamps on resources
- Use Money type for currency

❌ **Avoid:**
- Reusing field numbers
- Generic method names
- double for money
- Missing version in package
- Sharing request/response messages across methods
- Enums without UNSPECIFIED value

## Related Topics

- [Style Guide](protobuf-style-guide.md) - Naming conventions
- [Versioning](versioning.md) - Schema evolution
- [Standard Methods Reference](reference/standard-methods.md) - AIP-130 to AIP-136
- [Example Schemas](examples/) - Complete examples

## Navigation

- [← Back to gRPC Overview](README.md)
- [Style Guide →](protobuf-style-guide.md)
- [gRPC vs REST ←](grpc-vs-rest.md)
