# Protocol Buffer Style Guide

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 4 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic protobuf knowledge  
> **🎯 Key Topics:** Naming Conventions, Style Rules
> 
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

## Overview

This style guide ensures consistent, readable protobuf schemas across teams. These conventions follow Google's official protobuf style guide.

**Goal:** Write schemas that are easy to read, maintain, and evolve.

## Naming Conventions

### Messages

**Rule:** Use `PascalCase` (TitleCase)

```protobuf
// Good
message Order
message ShippingAddress
message OrderItem

// Avoid
message order
message shipping_address
message orderItem
```

### Fields

**Rule:** Use `snake_case`

```protobuf
message Order {
  // Good
  string order_id = 1;
  string customer_id = 2;
  int32 item_count = 3;
  
  // Avoid
  string OrderId = 1;
  string customerId = 2;
  string ItemCount = 3;
}
```

### Repeated Fields

**Rule:** Use plural nouns

```protobuf
message Order {
  // Good
  repeated OrderItem items = 1;
  repeated string tags = 2;
  
  // Avoid
  repeated OrderItem item = 1;
  repeated string tag = 2;
}
```

### Enums

**Type:** Use `PascalCase`  
**Values:** Use `SCREAMING_SNAKE_CASE` with type prefix

```protobuf
// Good
enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
}

// Avoid
enum OrderStatus {
  UNSPECIFIED = 0;  // No prefix
  Pending = 1;      // Wrong case
  confirmed = 2;    // Wrong case
}
```

**Why prefix?**
- Prevents naming conflicts
- Makes generated code clearer
- Matches Google style guide

### Services

**Rule:** Use `PascalCase` with `Service` suffix

```protobuf
// Good
service OrderService
service PaymentService
service UserAuthService

// Avoid
service Orders
service order_service
service PaymentSvc
```

### RPC Methods

**Rule:** Use `PascalCase` with verb-noun pattern

```protobuf
service OrderService {
  // Good - Standard methods
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc UpdateOrder(UpdateOrderRequest) returns (Order);
  rpc DeleteOrder(DeleteOrderRequest) returns (google.protobuf.Empty);
  
  // Good - Custom methods
  rpc CancelOrder(CancelOrderRequest) returns (Order);
  rpc RefundOrder(RefundOrderRequest) returns (RefundResponse);
  
  // Avoid
  rpc get_order(...) returns (...);      // Wrong case
  rpc GetAnOrder(...) returns (...);     // Unnecessary article
  rpc OrderGet(...) returns (...);       // Noun before verb
}
```

### Packages

**Rule:** Use `lowercase.dot.separated` with version suffix

```protobuf
// Good
package orders.v1;
package payments.checkout.v1;
package auth.users.v2;

// Avoid
package Orders.v1;           // PascalCase
package orders_v1;           // Underscores
package v1.orders;           // Version first
package ordersV1;            // camelCase
```

**Pattern:** `{domain}.{service}.{version}`

## Field Numbering

### Range Guidelines

**1-15:** Most frequently accessed fields (1 byte encoding)
```protobuf
message Order {
  string id = 1;              // Primary key
  string customer_id = 2;      // Foreign key
  OrderStatus status = 3;      // Frequently queried
}
```

**16-2047:** Less common fields (2 bytes encoding)
```protobuf
message Order {
  // ... fields 1-15 above
  
  string internal_notes = 16;
  repeated string tags = 17;
  map<string, string> metadata = 18;
}
```

**19000-19999, 20000-29999:** Reserved ranges (do not use)

### Numbering Best Practices

```protobuf
message Product {
  // Good: Sequential, gaps for future fields
  string id = 1;
  string name = 2;
  string description = 3;
  // Reserved 4-5 for future expansion
  Money price = 6;
  
  // Avoid: Random numbers
  string id = 1;
  string name = 15;
  string description = 3;
}
```

**Tips:**
- Start at 1, increment sequentially
- Leave gaps for future fields
- Group related fields together

### Reserved Fields

**Always reserve deleted field numbers:**

```protobuf
message Order {
  reserved 4, 5, 6;                          // Reserved numbers
  reserved "old_field", "deprecated_field";  // Reserved names
  
  string id = 1;
  string customer_id = 2;
  OrderStatus status = 3;
  // Fields 4-6 were deleted, now reserved
  Money total = 7;
}
```

**Why reserve?**
- Prevents accidental reuse
- Protects against data corruption
- Documents API evolution

## File Organization

### File Structure

```protobuf
// 1. License header (if applicable)
// Copyright 2024 Example Corp
// Licensed under Apache 2.0

// 2. File overview comment
// Order service definitions for e-commerce platform

// 3. Syntax declaration
syntax = "proto3";

// 4. Package declaration
package orders.v1;

// 5. Imports (sorted alphabetically)
import "google/protobuf/empty.proto";
import "google/protobuf/timestamp.proto";
import "common/v1/money.proto";

// 6. File options
option java_multiple_files = true;
option java_package = "com.example.orders.v1";
option go_package = "example.com/orders/v1;ordersv1";

// 7. Service definitions
service OrderService {
  // ...
}

// 8. Message definitions
message Order {
  // ...
}

// 9. Enum definitions
enum OrderStatus {
  // ...
}
```

### Import Ordering

Group imports by source:
```protobuf
// 1. Well-known types
import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

// 2. Common types
import "common/v1/money.proto";
import "common/v1/address.proto";

// 3. Other services
import "users/v1/users.proto";
```

## Comments and Documentation

### Message Documentation

```protobuf
// Represents a customer order in the system.
//
// Orders are created when a customer completes checkout.
// They track items, payments, and shipping status.
message Order {
  // Unique order identifier.
  string id = 1;
  
  // Customer who placed this order.
  string customer_id = 2;
  
  // Current order status.
  // Transitions: PENDING → CONFIRMED → SHIPPED → DELIVERED
  OrderStatus status = 3;
}
```

### Service Documentation

```protobuf
// Order management service.
//
// Provides CRUD operations for orders plus custom workflows
// like cancellation and refunds.
service OrderService {
  // Retrieves a single order by ID.
  //
  // Returns NOT_FOUND if order doesn't exist.
  rpc GetOrder(GetOrderRequest) returns (Order);
  
  // Lists orders with pagination.
  //
  // Results are sorted by creation time (newest first).
  // Use page_token for subsequent pages.
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
}
```

### Enum Documentation

```protobuf
// Order lifecycle states.
enum OrderStatus {
  // Default value. Do not use explicitly.
  ORDER_STATUS_UNSPECIFIED = 0;
  
  // Order created, awaiting payment.
  ORDER_STATUS_PENDING = 1;
  
  // Payment confirmed, ready to ship.
  ORDER_STATUS_CONFIRMED = 2;
  
  // Order shipped to customer.
  ORDER_STATUS_SHIPPED = 3;
  
  // Order delivered and complete.
  ORDER_STATUS_DELIVERED = 4;
  
  // Order cancelled by customer or system.
  ORDER_STATUS_CANCELLED = 5;
}
```

## Protocol Buffer Editions

### Proto3 (Current Standard)

```protobuf
syntax = "proto3";

message Example {
  string name = 1;
  int32 age = 2;
  repeated string tags = 3;
}
```

**Use proto3 unless:**
- Maintaining legacy proto2 code
- Need required fields (use field validation instead)

### Editions (2023+)

Protobuf Editions provide fine-grained feature control:

```protobuf
edition = "2023";

message Example {
  string name = 1 [features.field_presence = EXPLICIT];
}
```

**When to use:**
- Need explicit field presence
- Migrating from proto2
- Advanced feature control

**Recommendation:** Stick with proto3 for most cases.

## Versioning

### Package Versions

```protobuf
// Version 1
package orders.v1;

// Version 2 (breaking changes)
package orders.v2;

// Beta version
package orders.v1beta1;

// Alpha version
package orders.v1alpha1;
```

**Rules:**
- Stable: `v1`, `v2`, `v3`
- Beta: `v1beta1`, `v1beta2` (pre-stable)
- Alpha: `v1alpha1`, `v1alpha2` (experimental)

### File Naming

Match package version:
```
protos/
└── orders/
    ├── v1/
    │   └── orders.proto
    └── v2/
        └── orders.proto
```

## Complete Example

```protobuf
// Copyright 2024 Example Corp
// Order service protobuf definitions

syntax = "proto3";

package orders.v1;

import "google/protobuf/empty.proto";
import "google/protobuf/timestamp.proto";
import "common/v1/money.proto";

option java_multiple_files = true;
option java_package = "com.example.orders.v1";

// Order management service.
service OrderService {
  // Get order by ID.
  rpc GetOrder(GetOrderRequest) returns (Order);
  
  // List orders with pagination.
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
}

// Customer order.
message Order {
  // Unique identifier.
  string id = 1;
  
  // Customer reference.
  string customer_id = 2;
  
  // Order status.
  OrderStatus status = 3;
  
  // Creation timestamp.
  google.protobuf.Timestamp created_at = 4;
}

// Order lifecycle states.
enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
}

message GetOrderRequest {
  string order_id = 1;
}

message ListOrdersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListOrdersResponse {
  repeated Order orders = 1;
  string next_page_token = 2;
}
```

## Quick Reference

| Element | Convention | Example |
|---------|-----------|---------|
| **Messages** | PascalCase | `OrderItem` |
| **Fields** | snake_case | `customer_id` |
| **Repeated** | Plural | `items` |
| **Enums** | PascalCase | `OrderStatus` |
| **Enum Values** | SCREAMING_SNAKE_CASE | `ORDER_STATUS_PENDING` |
| **Services** | PascalCase + Service | `OrderService` |
| **Methods** | PascalCase VerbNoun | `GetOrder` |
| **Packages** | lowercase.dot.version | `orders.v1` |

## Linting and Enforcement

**Tools:**
- [buf](https://buf.build/) - Modern protobuf linter
- [prototool](https://github.com/uber/prototool) - Uber's protobuf tooling
- [api-linter](https://github.com/googleapis/api-linter) - Google AIP compliance

**Example buf.yaml:**
```yaml
version: v1
lint:
  use:
    - DEFAULT
    - COMMENTS
  enum_zero_value_suffix: _UNSPECIFIED
```

## Related Topics

- [Schema Design](protobuf-schema-design.md) - Message and service patterns
- [Versioning](versioning.md) - Schema evolution
- [Examples](examples/) - Complete schemas

## Navigation

- [← Schema Design](protobuf-schema-design.md)
- [Error Handling →](error-handling.md)
- [Back to gRPC Overview](README.md)
