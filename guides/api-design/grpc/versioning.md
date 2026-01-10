# gRPC Versioning and Schema Evolution

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Protobuf schema design basics  
> **🎯 Key Topics:** Versioning, Schema Evolution, Backwards Compatibility
> 
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

## Overview

Protocol Buffers enable schema evolution through careful design. This guide shows how to version APIs and evolve schemas without breaking existing clients.

**Key Principle:** Design for change from day one. Use package versioning and reserved fields.

## Package Versioning

### Version Suffixes

```protobuf
// Version 1 (stable)
package orders.v1;

// Version 2 (breaking changes)
package orders.v2;

// Beta version (pre-stable)
package orders.v1beta1;
package orders.v1beta2;

// Alpha version (experimental)
package orders.v1alpha1;
package orders.v1alpha2;
```

**Stability levels:**
- **v1, v2, v3:** Stable, production-ready
- **v1beta1:** Pre-release, mostly stable
- **v1alpha1:** Experimental, may change frequently

### When to Create New Version

**Create new major version when:**
- Removing fields
- Changing field types
- Changing field numbers
- Removing or renaming services
- Removing or renaming methods
- Changing message semantics

**Example - Breaking change:**
```protobuf
// v1 - Original
package orders.v1;
message Order {
  string id = 1;
  double total = 2;  // Single currency
}

// v2 - Breaking change (field type changed)
package orders.v2;
message Order {
  string id = 1;
  Money total = 2;  // Now structured type
}
```

## Schema Evolution

### Safe Changes (Backwards Compatible)

These changes don't break existing clients:

#### Adding New Fields

```protobuf
// Version 1.0
message Order {
  string id = 1;
  string customer_id = 2;
  double total = 3;
}

// Version 1.1 (compatible)
message Order {
  string id = 1;
  string customer_id = 2;
  double total = 3;
  string notes = 4;              // NEW: Optional field
  google.protobuf.Timestamp created_at = 5;  // NEW: Timestamp
}
```

**Old clients:**
- Ignore new fields
- Still work correctly

**New clients:**
- Read new fields from new servers
- Work with old servers (fields unset)

#### Adding New Messages

```protobuf
// Version 1.1
message Order {
  // ... existing fields
}

// NEW message type
message OrderHistory {
  string order_id = 1;
  repeated OrderEvent events = 2;
}
```

**Impact:** None on existing code

#### Adding New Services

```protobuf
// Version 1.1
service OrderService {
  // Existing methods
}

// NEW service
service OrderReportService {
  rpc GenerateReport(ReportRequest) returns (Report);
}
```

**Impact:** None on existing clients

#### Adding New RPC Methods

```protobuf
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  
  // NEW method in v1.1
  rpc CancelOrder(CancelOrderRequest) returns (Order);
}
```

**Impact:** Old clients don't call new methods

#### Adding Enum Values

```protobuf
enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  
  // NEW values in v1.1
  ORDER_STATUS_SHIPPED = 3;
  ORDER_STATUS_DELIVERED = 4;
}
```

**Old clients:** Treat unknown enum as UNSPECIFIED (or default)

### Breaking Changes

These require a new major version:

#### Removing Fields

```protobuf
// v1
message Order {
  string id = 1;
  string legacy_field = 2;  // To be removed
  double total = 3;
}

// v2 (breaking)
message Order {
  string id = 1;
  reserved 2;  // Reserved instead of removed
  reserved "legacy_field";
  double total = 3;
}
```

**Why breaking:** Old clients still send field, expect it in response

#### Changing Field Types

```protobuf
// v1
message Order {
  string id = 1;
  int32 quantity = 2;
}

// v2 (breaking)
message Order {
  string id = 1;
  int64 quantity = 2;  // Type changed
}
```

**Why breaking:** Incompatible wire format

#### Changing Field Numbers

```protobuf
// v1
message Order {
  string id = 1;
  string customer_id = 2;
}

// v2 (breaking - DON'T DO THIS)
message Order {
  string id = 1;
  string customer_id = 3;  // Number changed!
}
```

**Why breaking:** Field numbers are part of wire format  
**Never do this:** Field numbers are permanent

#### Removing Enum Values

```protobuf
// v1
enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_LEGACY = 2;  // To be removed
}

// v2 (breaking)
enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  reserved 2;  // Reserved instead
  reserved "ORDER_STATUS_LEGACY";
}
```

**Why breaking:** Old clients may send removed value

## Reserved Fields

### Why Reserve?

Prevents accidental reuse of deleted field numbers:

```protobuf
message Order {
  string id = 1;
  string customer_id = 2;
  // Field 3 was "legacy_data", deleted in v1.2
  reserved 3;
  reserved "legacy_data";
  
  Money total = 4;
}
```

**Without reservation:**
- New developer might reuse field 3
- Old data with field 3 causes corruption
- Silent data loss

### Reservation Syntax

```protobuf
message Example {
  // Reserve single numbers
  reserved 2, 3, 9, 11;
  
  // Reserve ranges
  reserved 15 to 20;
  reserved 30 to max;  // 30 to highest possible
  
  // Reserve field names
  reserved "old_field", "deprecated_field";
  
  // Active fields
  string current_field = 1;
}
```

## Migration Strategies

### Dual-Version Support

Run both versions simultaneously during migration:

```
┌─────────────┐
│   Client    │
│   (v1)      │
└──────┬──────┘
       │
       ├─────► v1 API ────┐
       │                   │
       │                   ▼
       │              ┌─────────┐
       │              │ Backend │
       │              │ (Common)│
       │              └─────────┘
       │                   ▲
       │                   │
       └─────► v2 API ────┘
                ▲
                │
       ┌────────┴─────┐
       │   Client     │
       │   (v2)       │
       └──────────────┘
```

**Process:**
1. Deploy v2 API alongside v1
2. Migrate clients incrementally
3. Monitor v1 usage
4. Deprecate v1 when usage drops
5. Remove v1 after sunset period

### Field Deprecation

Mark fields as deprecated but keep them:

```protobuf
message Order {
  string id = 1;
  
  // Deprecated but not removed
  string old_format_date = 2 [deprecated = true];
  
  // New field
  google.protobuf.Timestamp created_at = 3;
}
```

**Benefits:**
- Old clients keep working
- New clients get compiler warnings
- Documented migration path

### Gradual Field Migration

**Step 1:** Add new field
```protobuf
message Order {
  string status_string = 1;  // Old
  OrderStatus status_enum = 2;  // New
}
```

**Step 2:** Populate both (server-side)
```
Server writes both:
- status_string = "CONFIRMED"
- status_enum = ORDER_STATUS_CONFIRMED
```

**Step 3:** Migrate clients to new field  
**Step 4:** Server stops writing old field  
**Step 5:** Deprecate old field  
**Step 6:** Remove old field in next major version

## Version Discovery

### Service Version in Name

```protobuf
// v1
service OrderServiceV1 {
  rpc GetOrder(GetOrderRequest) returns (Order);
}

// v2
service OrderServiceV2 {
  rpc GetOrder(GetOrderRequest) returns (Order);
}
```

**URL paths:**
- `/orders.v1.OrderServiceV1/GetOrder`
- `/orders.v2.OrderServiceV2/GetOrder`

### Metadata-Based Versioning

```protobuf
// Single service, version in package
package orders.v1;
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
}

package orders.v2;
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
}
```

## Deprecation Process

### Timeline

```
T+0:   Release v2, announce v1 deprecation
T+3mo: Add deprecation warnings to v1
T+6mo: v1 enters sunset period
T+9mo: v1 disabled for new clients
T+12mo: v1 removed completely
```

### Deprecation Annotations

```protobuf
// Deprecated service
service OrderServiceV1 {
  option deprecated = true;
  
  // Deprecated method
  rpc OldMethod(Request) returns (Response) {
    option deprecated = true;
  };
}

// Deprecated field
message Order {
  string old_field = 2 [deprecated = true];
}
```

### Sunset Headers

Include deprecation info in responses:

```http
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Deprecation: @1735689599
Link: <https://docs.example.com/migration-v2>; rel="alternate"
```

## Best Practices

### Design for Evolution

✅ **Do:**
- Always use package versions (v1, v2)
- Reserve deleted field numbers
- Add fields, don't change existing ones
- Use optional for fields that may be added/removed
- Document field meanings clearly
- Plan deprecation timelines

❌ **Avoid:**
- Reusing field numbers
- Changing field types
- Removing fields without major version
- Generic field names (may conflict later)
- Tight coupling between versions

### Testing Compatibility

**Test matrix:**
```
┌────────┬────────┬────────┐
│        │ v1 Srv │ v2 Srv │
├────────┼────────┼────────┤
│ v1 Clt │   ✓    │   ✓    │
├────────┼────────┼────────┤
│ v2 Clt │   ✓    │   ✓    │
└────────┴────────┴────────┘
```

**Test all four combinations:**
1. Old client + Old server
2. Old client + New server
3. New client + Old server
4. New client + New server

## Real-World Example

### Version 1 (Initial)

```protobuf
syntax = "proto3";
package orders.v1;

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc CreateOrder(CreateOrderRequest) returns (Order);
}

message Order {
  string id = 1;
  string customer_id = 2;
  double total = 3;
  string status = 4;
}
```

### Version 1.1 (Compatible Evolution)

```protobuf
syntax = "proto3";
package orders.v1;

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc CancelOrder(CancelOrderRequest) returns (Order);  // NEW
}

message Order {
  string id = 1;
  string customer_id = 2;
  double total = 3;
  string status = 4;
  google.protobuf.Timestamp created_at = 5;  // NEW
  repeated OrderItem items = 6;  // NEW
}

message OrderItem {  // NEW
  string product_id = 1;
  int32 quantity = 2;
}
```

### Version 2 (Breaking Changes)

```protobuf
syntax = "proto3";
package orders.v2;

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc CancelOrder(CancelOrderRequest) returns (Order);
}

message Order {
  string id = 1;
  string customer_id = 2;
  Money total = 3;  // CHANGED: double → Money
  OrderStatus status = 4;  // CHANGED: string → enum
  google.protobuf.Timestamp created_at = 5;
  repeated OrderItem items = 6;
}

enum OrderStatus {  // NEW
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
}

message Money {  // NEW
  string currency_code = 1;
  int64 units = 2;
  int32 nanos = 3;
}
```

## Related Topics

- [Schema Design](protobuf-schema-design.md) - Message design patterns
- [Style Guide](protobuf-style-guide.md) - Field naming and numbering
- [Spring Implementation](../../../languages/spring/grpc/) - Version management in Spring

## Navigation

- [← Streaming Patterns](streaming-patterns.md)
- [Security →](security.md)
- [Back to gRPC Overview](README.md)
