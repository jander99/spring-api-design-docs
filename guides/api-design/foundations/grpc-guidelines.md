# gRPC Guidelines

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 10 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Authentication, Architecture, Data
> 
> **📊 Complexity:** 15.8 grade level • 1.5% technical density • difficult

## Overview

gRPC is a high-performance RPC framework built on HTTP/2 and Protocol Buffers. It is designed for efficient service-to-service communication, especially in microservices architectures.

This guide covers when to use gRPC, how to design `.proto` files, and how gRPC compares to REST. All examples use Protocol Buffers v3 and avoid language-specific code.

## When to Use gRPC

gRPC is not a replacement for HTTP/JSON REST APIs. It is a complementary technology best suited for specific use cases.

### Use gRPC When

Choose gRPC when you need:

- **High-performance service-to-service communication** under your operational control
- **Low latency and high throughput** for internal microservices
- **Bi-directional streaming** (client and server both stream messages)
- **Strong typing with code generation** across multiple programming languages
- **Efficient binary serialization** (Protocol Buffers) to reduce payload sizes
- **HTTP/2 multiplexing** to reduce connection overhead

### Use REST When

Stick with REST HTTP/JSON APIs when you need:

- **Public-facing APIs** consumed by browsers, mobile apps, or third-party developers
- **HTTP caching** through CDNs, proxies, and browser caches
- **Simple request/response** without streaming
- **Broad client compatibility** (any HTTP client, easy debugging with curl)
- **Mature ecosystem** (OpenAPI, API gateways, extensive tooling)
- **Human-readable debugging** (JSON is easier to inspect than binary)

### When Both Work

For internal APIs between microservices, either can work. Consider:

- **Team familiarity**: REST is more widely understood
- **Operational complexity**: gRPC requires HTTP/2 support and load balancer configuration
- **Performance requirements**: gRPC is faster for high-volume internal calls
- **Contract evolution**: Both support versioning, but Protocol Buffers has explicit backward compatibility rules

## Protocol Buffers Basics

Protocol Buffers (protobuf) is the interface definition language for gRPC. A `.proto` file defines services, methods, and message types.

### Syntax and Packages

Use `proto3` syntax and organize definitions into packages.

```protobuf
syntax = "proto3";

package order.v1;

option java_package = "com.example.order.v1";
option go_package = "example.com/order/v1;orderv1";
```

**Guidelines:**
- Always use `syntax = "proto3"`
- Use reverse-domain notation for packages (`company.service.version`)
- Include versioning in the package name (`v1`, `v2`)
- Set language-specific options for code generation

### Service Definitions

A service defines RPC methods. Each method has a request message and a response message.

```protobuf
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc UpdateOrder(UpdateOrderRequest) returns (Order);
  rpc DeleteOrder(DeleteOrderRequest) returns (google.protobuf.Empty);
}
```

**Method naming conventions:**
- Use `Get` for single resource retrieval
- Use `List` for collection retrieval
- Use `Create`, `Update`, `Delete` for mutations
- Use `Stream` prefix for streaming operations

### Message Definitions

Messages define the structure of requests and responses.

```protobuf
message Order {
  string id = 1;
  string customer_id = 2;
  repeated OrderItem items = 3;
  OrderStatus status = 4;
  google.protobuf.Timestamp created_at = 5;
  google.protobuf.Timestamp updated_at = 6;
}

message OrderItem {
  string product_id = 1;
  int32 quantity = 2;
  double price = 3;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
  ORDER_STATUS_DELIVERED = 4;
  ORDER_STATUS_CANCELLED = 5;
}
```

**Field numbering rules:**
- Numbers 1-15 use 1 byte for encoding (use for frequently set fields)
- Numbers 16-2047 use 2 bytes
- Never reuse field numbers (breaks backward compatibility)
- Reserve deleted field numbers to prevent accidental reuse

```protobuf
message Order {
  reserved 7, 9 to 11;
  reserved "old_field_name";
  
  string id = 1;
  // ... other fields
}
```

### Request and Response Messages

Create dedicated request and response messages for each RPC method, even if they only wrap a single field. This allows evolution without breaking changes.

**Bad (not evolvable):**
```protobuf
service OrderService {
  rpc GetOrder(string) returns (Order);  // Don't use primitive types directly
}
```

**Good (evolvable):**
```protobuf
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
}

message GetOrderRequest {
  string order_id = 1;
}
```

### Pagination Patterns

For list operations, use cursor-based pagination.

```protobuf
message ListOrdersRequest {
  int32 page_size = 1;
  string page_token = 2;
  string filter = 3;
}

message ListOrdersResponse {
  repeated Order orders = 1;
  string next_page_token = 2;
  int32 total_size = 3;
}
```

**Guidelines:**
- Use `page_size` for client-requested page size
- Use `page_token` as an opaque cursor
- Return `next_page_token` (empty when no more pages)
- Optionally return `total_size` for UI pagination

## Streaming Patterns

gRPC supports four communication patterns.

### Unary RPC (Request-Response)

Standard request/response like REST.

```protobuf
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
}
```

**When to use:**
- Simple CRUD operations
- Single request, single response
- Most common pattern

### Server Streaming

Client sends one request, server streams multiple responses.

```protobuf
service OrderService {
  rpc StreamOrderUpdates(StreamOrdersRequest) returns (stream OrderUpdate);
}

message StreamOrdersRequest {
  repeated string order_ids = 1;
}

message OrderUpdate {
  string order_id = 1;
  OrderStatus status = 2;
  google.protobuf.Timestamp timestamp = 3;
}
```

**When to use:**
- Real-time updates (order status, stock prices)
- Large result sets that should be delivered incrementally
- Long-polling replacements

### Client Streaming

Client streams multiple requests, server sends one response.

```protobuf
service FileService {
  rpc UploadFile(stream FileChunk) returns (UploadResponse);
}

message FileChunk {
  bytes content = 1;
  int64 offset = 2;
}

message UploadResponse {
  string file_id = 1;
  int64 size = 2;
}
```

**When to use:**
- File uploads
- Bulk data ingestion
- Aggregating multiple client events

### Bidirectional Streaming

Both client and server stream messages independently.

```protobuf
service ChatService {
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}

message ChatMessage {
  string user_id = 1;
  string content = 2;
  google.protobuf.Timestamp timestamp = 3;
}
```

**When to use:**
- Real-time chat
- Multiplayer game state
- Collaborative editing

## Error Handling

gRPC uses status codes and optional error details.

### Status Codes

gRPC defines standard status codes:

| Code | Name | When to Use |
|------|------|-------------|
| `0` | `OK` | Success |
| `1` | `CANCELLED` | Client cancelled request |
| `3` | `INVALID_ARGUMENT` | Client provided invalid data |
| `5` | `NOT_FOUND` | Resource not found |
| `6` | `ALREADY_EXISTS` | Resource already exists (duplicate create) |
| `7` | `PERMISSION_DENIED` | Client lacks permission |
| `16` | `UNAUTHENTICATED` | Missing or invalid authentication |
| `13` | `INTERNAL` | Server error (use sparingly) |
| `14` | `UNAVAILABLE` | Service temporarily unavailable |
| `4` | `DEADLINE_EXCEEDED` | Request timeout |

**Map gRPC codes to HTTP equivalents:**
- `INVALID_ARGUMENT` → `400 Bad Request`
- `UNAUTHENTICATED` → `401 Unauthorized`
- `PERMISSION_DENIED` → `403 Forbidden`
- `NOT_FOUND` → `404 Not Found`
- `ALREADY_EXISTS` → `409 Conflict`
- `UNAVAILABLE` → `503 Service Unavailable`

### Rich Error Details

Use `google.rpc.Status` for structured error details.

```protobuf
import "google/rpc/status.proto";
import "google/rpc/error_details.proto";

// In your service implementation, attach error details:
// status.details can include:
// - BadRequest (field violations)
// - PreconditionFailure
// - QuotaFailure
// - RetryInfo
```

**Example error structure (conceptual):**
```json
{
  "code": 3,
  "message": "Invalid order request",
  "details": [
    {
      "@type": "type.googleapis.com/google.rpc.BadRequest",
      "fieldViolations": [
        {
          "field": "customer_id",
          "description": "customer_id is required"
        }
      ]
    }
  ]
}
```

## Transcoding gRPC to REST

gRPC Gateway allows you to expose gRPC services as REST APIs using HTTP annotations.

### HTTP Annotations

Add HTTP mappings directly in your `.proto` file:

```protobuf
import "google/api/annotations.proto";

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order) {
    option (google.api.http) = {
      get: "/v1/orders/{order_id}"
    };
  }
  
  rpc CreateOrder(CreateOrderRequest) returns (Order) {
    option (google.api.http) = {
      post: "/v1/orders"
      body: "*"
    };
  }
  
  rpc UpdateOrder(UpdateOrderRequest) returns (Order) {
    option (google.api.http) = {
      patch: "/v1/orders/{order.id}"
      body: "order"
    };
  }
  
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse) {
    option (google.api.http) = {
      get: "/v1/orders"
    };
  }
}
```

**When to use transcoding:**
- Serve both gRPC and REST clients from one service definition
- Support legacy HTTP clients while migrating to gRPC
- Provide REST endpoints for external partners while using gRPC internally

**Limitations:**
- Not all gRPC features map cleanly to REST (especially streaming)
- REST endpoints inherit gRPC performance characteristics (may be slower than native REST)

## Authentication and Authorization

gRPC supports multiple authentication mechanisms.

### Metadata (Headers)

Pass authentication tokens in gRPC metadata (equivalent to HTTP headers).

**Metadata conceptual example:**
```
authorization: Bearer <token>
x-api-key: <api-key>
x-request-id: <trace-id>
```

### TLS/mTLS

Use TLS for encryption and optionally mutual TLS for client authentication.

**When to use:**
- **TLS**: Always (encrypt traffic in production)
- **mTLS**: Service-to-service authentication in zero-trust environments

### Token-Based Auth

Common patterns:
- **JWT tokens** in metadata (same as REST `Authorization: Bearer` header)
- **API keys** in metadata
- **OAuth 2.0** flows for external clients (if using gRPC-web or transcoding)

## Versioning Strategy

Version your APIs explicitly in the package name.

### Package-Based Versioning

```protobuf
syntax = "proto3";

package order.v1;

service OrderService {
  // v1 methods
}
```

When breaking changes are needed:

```protobuf
syntax = "proto3";

package order.v2;

service OrderService {
  // v2 methods with breaking changes
}
```

**Guidelines:**
- Increment version only for breaking changes
- Run multiple versions side-by-side during migration
- Deprecate old versions with clear migration timelines

### Field Evolution

Protocol Buffers supports backward and forward compatible changes:

**Safe changes:**
- Add new fields (clients ignore unknown fields)
- Add new enum values (with `UNSPECIFIED` as default)
- Add new RPC methods

**Breaking changes:**
- Remove or rename fields
- Change field types
- Change field numbers
- Remove enum values

## Performance Considerations

### Connection Pooling

gRPC uses HTTP/2, which supports multiplexing multiple requests over a single connection.

**Benefits:**
- Reduced connection overhead
- Lower latency for subsequent requests
- Efficient resource usage

**Guidance:**
- Reuse gRPC channels/connections across requests
- Configure connection pools appropriately for load

### Payload Size

Protocol Buffers are binary and more compact than JSON.

**Size comparison (typical):**
- JSON: 100-300 bytes (human-readable)
- Protobuf: 30-100 bytes (binary)

**When size matters:**
- High-volume internal APIs
- Mobile clients on metered networks
- IoT devices with bandwidth constraints

### Streaming vs Batching

For large data sets, choose between:
- **Streaming**: Real-time delivery as data becomes available
- **Batching**: Collect and send in chunks

**Use streaming when:**
- Data is produced over time (logs, events)
- Client needs partial results quickly
- Total size is unknown upfront

**Use batching when:**
- Data is available all at once
- Client prefers complete result sets
- Simpler error handling is preferred

## Observability

### Request IDs and Tracing

Pass correlation IDs in metadata for distributed tracing.

**Metadata example:**
```
x-request-id: req-123456
x-trace-id: trace-abc-def
x-span-id: span-123
```

**Standards:**
- Use W3C Trace Context for interoperability
- Propagate trace context through gRPC metadata
- Integrate with observability platforms (OpenTelemetry)

### Health Checking

gRPC has a standard health check protocol.

```protobuf
service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}

message HealthCheckRequest {
  string service = 1;
}

message HealthCheckResponse {
  enum ServingStatus {
    UNKNOWN = 0;
    SERVING = 1;
    NOT_SERVING = 2;
    SERVICE_UNKNOWN = 3;
  }
  ServingStatus status = 1;
}
```

**Use health checks for:**
- Load balancer health probes
- Kubernetes liveness and readiness probes
- Circuit breaker decisions

## Common Patterns

### Idempotency

For write operations, support idempotency keys.

```protobuf
message CreateOrderRequest {
  Order order = 1;
  string idempotency_key = 2;
}
```

### Soft Deletes

Use a `deleted` field instead of hard deletes.

```protobuf
message Order {
  string id = 1;
  bool deleted = 2;
  google.protobuf.Timestamp deleted_at = 3;
}
```

### Timestamps

Always use `google.protobuf.Timestamp` for time values (not strings or integers).

```protobuf
import "google/protobuf/timestamp.proto";

message Order {
  string id = 1;
  google.protobuf.Timestamp created_at = 2;
  google.protobuf.Timestamp updated_at = 3;
}
```

## Comparison: gRPC vs REST

| Aspect | gRPC | REST |
|--------|------|------|
| **Protocol** | HTTP/2 binary | HTTP/1.1 or HTTP/2 text |
| **Format** | Protocol Buffers (binary) | JSON (human-readable) |
| **Streaming** | Bidirectional, built-in | Server-Sent Events, WebSocket (add-ons) |
| **Performance** | High (binary, multiplexing) | Moderate (JSON, single request per connection) |
| **Browser Support** | Requires gRPC-web | Native |
| **Tooling** | Growing (code generation) | Mature (OpenAPI, Postman, curl) |
| **Debugging** | Requires special tools | Easy with curl and browsers |
| **Caching** | Limited | Native HTTP caching |
| **Learning Curve** | Steeper | Gentler |
| **Best For** | Internal microservices | Public APIs, browser clients |

## When to Mix Both

Many organizations use both:

- **gRPC** for internal service-to-service communication
- **REST** for public-facing APIs and browser clients
- **gRPC Gateway** to expose gRPC services as REST for specific use cases

This hybrid approach leverages the strengths of each protocol.

## Summary

gRPC is a powerful choice for high-performance internal APIs with strong typing and streaming requirements. It is not a replacement for REST but a complementary technology.

**Use gRPC when:**
- Performance and low latency matter
- You control both client and server
- Streaming is a core requirement
- Strong typing across languages is valuable

**Use REST when:**
- You need broad client compatibility
- HTTP caching is important
- Human-readable debugging is valuable
- You're building public APIs

For most organizations, the answer is both: gRPC internally, REST externally.

## Related Documentation

**[gRPC Quick Start Guide](../grpc/README.md)** - Beginner-friendly introduction to gRPC with quick examples and topic-based learning paths (3-minute read per topic, practical implementation focus)
