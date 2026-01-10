# gRPC Streaming Patterns

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic gRPC and protobuf knowledge  
> **🎯 Key Topics:** Streaming, Real-time Communication, Bidirectional Data Flow
> 
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

## Overview

gRPC supports four communication patterns: unary (traditional request-response) and three streaming types. This guide shows when and how to use each pattern.

**Key Advantage:** Native HTTP/2 streaming with flow control and multiplexing.

## Four Communication Patterns

| Pattern | Request | Response | Use Cases |
|---------|---------|----------|-----------|
| **Unary** | Single | Single | Traditional RPC, CRUD operations |
| **Server Streaming** | Single | Stream | Large downloads, feeds, notifications |
| **Client Streaming** | Stream | Single | File uploads, batch processing, telemetry |
| **Bidirectional** | Stream | Stream | Chat, collaboration, real-time gaming |

## Unary RPC

### Pattern

Most common pattern, similar to REST:

```
Client ──Request──> Server
Client <─Response── Server
```

### Definition

```protobuf
service OrderService {
  // Single request → Single response
  rpc GetOrder(GetOrderRequest) returns (Order);
}

message GetOrderRequest {
  string order_id = 1;
}

message Order {
  string id = 1;
  string customer_id = 2;
  double total = 3;
}
```

### When to Use

- Traditional CRUD operations
- Simple queries
- Transactional operations
- When result fits in single message

### Example Scenarios

**Get single resource:**
```protobuf
rpc GetUser(GetUserRequest) returns (User);
```

**Create resource:**
```protobuf
rpc CreateOrder(CreateOrderRequest) returns (Order);
```

**Update resource:**
```protobuf
rpc UpdateProduct(UpdateProductRequest) returns (Product);
```

## Server Streaming

### Pattern

Client sends one request, server sends multiple responses:

```
Client ──Request──────────> Server
Client <─Response 1──────── Server
Client <─Response 2──────── Server
Client <─Response 3──────── Server
Client <─Complete─────────── Server
```

### Definition

```protobuf
service OrderService {
  // Single request → Multiple responses
  rpc StreamOrders(StreamOrdersRequest) returns (stream Order);
}

message StreamOrdersRequest {
  string customer_id = 1;
  int32 max_results = 2;
}
```

### When to Use

**Large datasets:**
- Paginated results as stream
- Database query results
- Log file streaming

**Real-time feeds:**
- Stock price updates
- Live notifications
- Sensor data streams

**File downloads:**
- Large file transfer
- Chunked data delivery
- Progressive loading

### Example Scenarios

**List resources with streaming:**
```protobuf
// Stream all customer orders
rpc StreamCustomerOrders(StreamOrdersRequest) returns (stream Order);

// Stream search results
rpc SearchProducts(SearchRequest) returns (stream Product);
```

**Real-time updates:**
```protobuf
// Price updates for subscribed products
rpc SubscribePrices(PriceSubscriptionRequest) returns (stream PriceUpdate);

message PriceUpdate {
  string product_id = 1;
  double new_price = 2;
  google.protobuf.Timestamp timestamp = 3;
}
```

**File download:**
```protobuf
rpc DownloadFile(DownloadRequest) returns (stream FileChunk);

message FileChunk {
  bytes data = 1;
  int64 offset = 2;
  int64 total_size = 3;
}
```

### Flow Control

Server respects client's ability to consume:

```
Server: Ready to send 1000 messages
Client: Can only buffer 100

Server sends 100 → waits for ack
Client processes → acks
Server sends next 100
```

**Built-in HTTP/2 flow control** prevents overwhelming clients.

## Client Streaming

### Pattern

Client sends multiple requests, server sends one response:

```
Client ──Request 1──────────> Server
Client ──Request 2──────────> Server
Client ──Request 3──────────> Server
Client ──Complete───────────> Server
Client <─Response──────────── Server
```

### Definition

```protobuf
service OrderService {
  // Multiple requests → Single response
  rpc BatchCreateOrders(stream CreateOrderRequest) returns (BatchCreateResponse);
}

message BatchCreateResponse {
  repeated string order_ids = 1;
  int32 success_count = 2;
  int32 failure_count = 3;
}
```

### When to Use

**File uploads:**
- Chunked upload
- Resume capability
- Progress tracking

**Batch operations:**
- Bulk insert
- Batch updates
- Mass data import

**Telemetry and logging:**
- Continuous metrics
- Log aggregation
- Event streaming

### Example Scenarios

**File upload:**
```protobuf
rpc UploadFile(stream FileChunk) returns (UploadResponse);

message UploadResponse {
  string file_id = 1;
  int64 total_bytes = 2;
  string checksum = 3;
}
```

**Batch insert:**
```protobuf
rpc BatchCreateProducts(stream Product) returns (BatchCreateResponse);

message BatchCreateResponse {
  int32 created_count = 1;
  repeated string created_ids = 2;
  repeated CreateError errors = 3;
}

message CreateError {
  int32 index = 1;  // Which product in stream failed
  string reason = 2;
}
```

**Telemetry collection:**
```protobuf
rpc ReportMetrics(stream Metric) returns (MetricsAck);

message Metric {
  string name = 1;
  double value = 2;
  google.protobuf.Timestamp timestamp = 3;
  map<string, string> labels = 4;
}

message MetricsAck {
  int32 received_count = 1;
}
```

## Bidirectional Streaming

### Pattern

Both client and server can send streams independently:

```
Client ──Request 1──────────> Server
Client <─Response 1─────────── Server
Client ──Request 2──────────> Server
Client ──Request 3──────────> Server
Client <─Response 2─────────── Server
Client <─Response 3─────────── Server
Client <─Response 4─────────── Server
```

**Key feature:** Fully independent streams (no forced ordering)

### Definition

```protobuf
service ChatService {
  // Both sides stream independently
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}

message ChatMessage {
  string user_id = 1;
  string text = 2;
  google.protobuf.Timestamp timestamp = 3;
}
```

### When to Use

**Interactive applications:**
- Chat applications
- Multiplayer games
- Collaborative editing

**Full-duplex protocols:**
- WebSocket replacement
- Peer-to-peer communication
- Live video/audio streaming

**Control and data channels:**
- Command and response streams
- Heartbeat with data
- Request pipelining

### Example Scenarios

**Chat application:**
```protobuf
rpc ChatRoom(stream ChatMessage) returns (stream ChatMessage);

// Client sends messages as typed
// Server broadcasts to all participants
// Both streams are independent
```

**Real-time collaboration:**
```protobuf
rpc EditDocument(stream Edit) returns (stream Edit);

message Edit {
  string user_id = 1;
  int64 position = 2;
  string operation = 3;  // insert, delete, replace
  string content = 4;
}
```

**Live telemetry with commands:**
```protobuf
rpc ManageDevice(stream DeviceCommand) returns (stream DeviceStatus);

message DeviceCommand {
  string command_type = 1;  // "start", "stop", "configure"
  map<string, string> parameters = 2;
}

message DeviceStatus {
  string state = 1;  // "running", "stopped", "error"
  map<string, double> metrics = 2;
}
```

## Error Handling in Streams

### Error Termination

Errors close the stream:

```
Server → Message 1 ✓
Server → Message 2 ✓
Server → ERROR: RESOURCE_EXHAUSTED
Stream terminates
Client receives all prior messages + error
```

### Handling Partial Results

**Server streaming:**
```protobuf
message StreamedResult {
  oneof result {
    Order order = 1;
    Error error = 2;  // Individual item error
  }
}

// Server can send errors without terminating stream
rpc StreamOrders(Request) returns (stream StreamedResult);
```

**Bidirectional streaming with ACKs:**
```protobuf
message ChatMessage {
  string id = 1;  // Unique message ID
  string text = 2;
}

message ChatAck {
  string message_id = 1;
  bool success = 2;
  string error_message = 3;
}

// Client sends messages, server acks each one
rpc Chat(stream ChatMessage) returns (stream ChatAck);
```

## Performance Considerations

### Backpressure

HTTP/2 flow control prevents sender from overwhelming receiver:

```yaml
scenario:
  server_can_send: 1000 messages/second
  client_can_process: 100 messages/second
  
outcome:
  server_automatically_slows_to: 100 messages/second
  mechanism: HTTP/2 window updates
  no_message_loss: true
```

### Message Batching

**Instead of:**
```protobuf
// Sending 10,000 individual messages
for (item : items) {
  stream.send(item);
}
```

**Consider:**
```protobuf
message ItemBatch {
  repeated Item items = 1;  // Batch of 100
}

// Sending 100 batches of 100 items
for (batch : batches) {
  stream.send(batch);
}
```

**Benefits:**
- Reduced overhead
- Better throughput
- Lower CPU usage

### Timeout Management

**Streaming deadlines:**
```yaml
# Set deadline for entire stream
stream_deadline: 300s  # 5 minutes max

# Or per-message timeout
message_timeout: 10s   # Each message must arrive within 10s
```

## Comparison Table

| Aspect | Unary | Server Stream | Client Stream | Bidirectional |
|--------|-------|---------------|---------------|---------------|
| **Complexity** | Simple | Medium | Medium | High |
| **Latency** | Single round-trip | First result fast | Single response | Variable |
| **Throughput** | Lower | High | High | Highest |
| **Use Case** | CRUD | Downloads, feeds | Uploads, batch | Chat, real-time |
| **Flow Control** | N/A | Server → Client | Client → Server | Both directions |
| **Error Handling** | Straightforward | Terminates stream | Partial results | Complex |
| **Testing** | Easy | Medium | Medium | Challenging |

## Best Practices

### Unary
✅ Use for traditional CRUD  
✅ Keep response size reasonable (< 1MB)  
✅ Set appropriate deadlines  

### Server Streaming
✅ Send results as soon as available (don't buffer)  
✅ Include progress indicators  
✅ Handle client disconnection gracefully  
❌ Don't stream unbounded data without pagination  

### Client Streaming
✅ Process items as they arrive  
✅ Provide progress updates  
✅ Handle partial failures  
❌ Don't hold all data in memory  

### Bidirectional
✅ Design for independent streams  
✅ Use sequence numbers for ordering  
✅ Implement heartbeat/keepalive  
✅ Plan for stream recovery  
❌ Don't assume message ordering across streams  

## Real-World Examples

### E-Commerce Order Processing

**Query orders (Server Streaming):**
```protobuf
// Stream customer's order history
rpc GetOrderHistory(CustomerRequest) returns (stream Order);
```

**Bulk order import (Client Streaming):**
```protobuf
// Upload CSV of orders
rpc ImportOrders(stream OrderRecord) returns (ImportSummary);
```

**Real-time order tracking (Bidirectional):**
```protobuf
// Subscribe to updates, send tracking commands
rpc TrackOrders(stream TrackingRequest) returns (stream OrderUpdate);
```

### Logging Service

**Stream logs (Server Streaming):**
```protobuf
rpc TailLogs(TailRequest) returns (stream LogEntry);
```

**Ingest logs (Client Streaming):**
```protobuf
rpc IngestLogs(stream LogEntry) returns (IngestSummary);
```

## Related Topics

- [Error Handling](error-handling.md) - Error handling in streams
- [Spring Streaming Services](../../../languages/spring/grpc/streaming-services.md) - Java implementation
- [Schema Design](protobuf-schema-design.md) - Message patterns

### HTTP Streaming Protocols

**[HTTP Streaming APIs](../../request-response/streaming-apis.md)** - For REST APIs, learn Server-Sent Events (SSE) and NDJSON streaming patterns when gRPC is not suitable for external-facing services.

## Navigation

- [← Error Handling](error-handling.md)
- [Versioning →](versioning.md)
- [Back to gRPC Overview](README.md)
