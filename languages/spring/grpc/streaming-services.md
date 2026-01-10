# Spring Boot gRPC Streaming Services

> **📖 Reading Guide**
> **⏱️ Reading Time:** 12 minutes | **🎯 Level:** Intermediate to Advanced
> **📋 Prerequisites:** [Unary Services](unary-services.md), basic understanding of streaming
> **🎯 Key Topics:** Server streaming • Client streaming • Bidirectional streaming • Flow control
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

gRPC supports three streaming patterns: server streaming, client streaming, and bidirectional streaming.

---

## Overview

**Streaming patterns:**

| Pattern | Request | Response | Use Case |
|---------|---------|----------|----------|
| Server Streaming | Single | Multiple | Large downloads, feeds, real-time updates |
| Client Streaming | Multiple | Single | File uploads, batch processing, metrics |
| Bidirectional | Multiple | Multiple | Chat, collaboration, real-time gaming |

**See theory:** [Streaming Patterns Guide](../../../guides/api-design/grpc/streaming-patterns.md)

---

## Server Streaming

### Pattern

Client sends one request, server sends stream of responses.

```
Client ──Request──────────> Server
Client <─Response 1──────── Server
Client <─Response 2──────── Server
Client <─Response 3──────── Server
Client <─Complete─────────── Server
```

### Protobuf Definition

```protobuf
syntax = "proto3";

package example.order.v1;

option java_package = "com.example.order.grpc";
option java_multiple_files = true;

service OrderService {
  // Server streaming: one request, multiple responses
  rpc StreamOrders(StreamOrdersRequest) returns (stream Order) {}
}

message StreamOrdersRequest {
  string customer_id = 1;
  int32 max_results = 2;
}

message Order {
  string id = 1;
  string customer_id = 2;
  double total = 3;
  OrderStatus status = 4;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  PENDING = 1;
  PROCESSING = 2;
  SHIPPED = 3;
}
```

### Spring Implementation

```java
package com.example.order.grpc;

import com.example.order.service.OrderService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);
    
    private final OrderService orderService;

    @Autowired
    public OrderServiceImpl(OrderService orderService) {
        this.orderService = orderService;
    }

    @Override
    public void streamOrders(StreamOrdersRequest request,
                            StreamObserver<Order> responseObserver) {
        try {
            log.debug("StreamOrders called for customer: {}", request.getCustomerId());
            
            // Fetch orders from repository/service
            List<Order> orders = orderService.findOrdersByCustomer(
                request.getCustomerId(), 
                request.getMaxResults()
            );
            
            // Stream each order to client
            for (Order order : orders) {
                // Check if client has cancelled
                if (responseObserver instanceof ServerCallStreamObserver) {
                    ServerCallStreamObserver<Order> serverObserver = 
                        (ServerCallStreamObserver<Order>) responseObserver;
                    if (serverObserver.isCancelled()) {
                        log.info("Client cancelled stream");
                        return;
                    }
                }
                
                // Send order
                responseObserver.onNext(order);
                log.debug("Sent order: {}", order.getId());
            }
            
            // Complete stream
            responseObserver.onCompleted();
            log.debug("Stream completed, sent {} orders", orders.size());
            
        } catch (Exception e) {
            log.error("Error streaming orders", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Error streaming orders")
                    .asRuntimeException()
            );
        }
    }
}
```

### Streaming from Database (Reactive)

For large datasets, stream directly from database without loading all into memory:

```java
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    private final ReactiveOrderRepository repository;

    @Override
    public void streamOrders(StreamOrdersRequest request,
                            StreamObserver<Order> responseObserver) {
        
        repository.findByCustomerId(request.getCustomerId())
            .doOnNext(order -> {
                responseObserver.onNext(toProto(order));
            })
            .doOnError(throwable -> {
                log.error("Error streaming from database", throwable);
                responseObserver.onError(
                    Status.INTERNAL
                        .withDescription("Database error")
                        .asRuntimeException()
                );
            })
            .doFinally(signalType -> {
                if (signalType == SignalType.ON_COMPLETE) {
                    responseObserver.onCompleted();
                }
            })
            .subscribe();
    }
    
    private Order toProto(OrderEntity entity) {
        return Order.newBuilder()
            .setId(entity.getId())
            .setCustomerId(entity.getCustomerId())
            .setTotal(entity.getTotal())
            .build();
    }
}
```

### Backpressure Handling

Control flow when server produces faster than client consumes:

```java
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    @Override
    public void streamOrders(StreamOrdersRequest request,
                            StreamObserver<Order> responseObserver) {
        
        ServerCallStreamObserver<Order> serverObserver = 
            (ServerCallStreamObserver<Order>) responseObserver;
        
        // Track if client is ready
        AtomicBoolean ready = new AtomicBoolean(true);
        
        serverObserver.setOnReadyHandler(() -> {
            ready.set(true);
            log.debug("Client ready to receive");
        });
        
        serverObserver.setOnCancelHandler(() -> {
            log.info("Client cancelled stream");
        });
        
        try {
            for (Order order : getOrders(request)) {
                // Wait if client not ready (backpressure)
                while (!serverObserver.isReady()) {
                    Thread.sleep(10);
                }
                
                serverObserver.onNext(order);
            }
            
            serverObserver.onCompleted();
            
        } catch (Exception e) {
            serverObserver.onError(Status.INTERNAL.asRuntimeException());
        }
    }
}
```

---

## Client Streaming

### Pattern

Client sends stream of requests, server sends one response.

```
Client ──Request 1──────────> Server
Client ──Request 2──────────> Server
Client ──Request 3──────────> Server
Client ──Complete───────────> Server
Client <─Response──────────── Server
```

### Protobuf Definition

```protobuf
service OrderService {
  // Client streaming: multiple requests, one response
  rpc BatchCreateOrders(stream CreateOrderRequest) returns (BatchCreateResponse) {}
}

message CreateOrderRequest {
  Order order = 1;
}

message BatchCreateResponse {
  int32 success_count = 1;
  int32 failure_count = 2;
  repeated string created_order_ids = 3;
  repeated CreateError errors = 4;
}

message CreateError {
  int32 index = 1;
  string reason = 2;
}
```

### Spring Implementation

```java
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    private final OrderService orderService;

    @Override
    public StreamObserver<CreateOrderRequest> batchCreateOrders(
            StreamObserver<BatchCreateResponse> responseObserver) {
        
        return new StreamObserver<CreateOrderRequest>() {
            
            private List<String> createdIds = new ArrayList<>();
            private List<CreateError> errors = new ArrayList<>();
            private int index = 0;

            @Override
            public void onNext(CreateOrderRequest request) {
                try {
                    log.debug("Received order #{}", index);
                    
                    // Validate and create order
                    Order order = orderService.createOrder(request.getOrder());
                    createdIds.add(order.getId());
                    
                } catch (Exception e) {
                    log.warn("Failed to create order #{}: {}", index, e.getMessage());
                    errors.add(CreateError.newBuilder()
                        .setIndex(index)
                        .setReason(e.getMessage())
                        .build());
                }
                
                index++;
            }

            @Override
            public void onError(Throwable t) {
                log.error("Client stream error", t);
                // Client had error, don't send response
            }

            @Override
            public void onCompleted() {
                log.info("Client finished sending. Created: {}, Errors: {}", 
                    createdIds.size(), errors.size());
                
                // Send final response
                BatchCreateResponse response = BatchCreateResponse.newBuilder()
                    .setSuccessCount(createdIds.size())
                    .setFailureCount(errors.size())
                    .addAllCreatedOrderIds(createdIds)
                    .addAllErrors(errors)
                    .build();
                
                responseObserver.onNext(response);
                responseObserver.onCompleted();
            }
        };
    }
}
```

### File Upload Example

```protobuf
service FileService {
  rpc UploadFile(stream FileChunk) returns (UploadResponse) {}
}

message FileChunk {
  bytes data = 1;
  int64 offset = 2;
}

message UploadResponse {
  string file_id = 1;
  int64 total_bytes = 2;
  string checksum = 3;
}
```

```java
@GrpcService
public class FileServiceImpl extends FileServiceGrpc.FileServiceImplBase {

    @Override
    public StreamObserver<FileChunk> uploadFile(
            StreamObserver<UploadResponse> responseObserver) {
        
        return new StreamObserver<FileChunk>() {
            
            private ByteArrayOutputStream fileData = new ByteArrayOutputStream();
            private long totalBytes = 0;

            @Override
            public void onNext(FileChunk chunk) {
                try {
                    fileData.write(chunk.getData().toByteArray());
                    totalBytes += chunk.getData().size();
                    log.debug("Received chunk: {} bytes at offset {}", 
                        chunk.getData().size(), chunk.getOffset());
                        
                } catch (IOException e) {
                    responseObserver.onError(
                        Status.INTERNAL
                            .withDescription("Failed to write chunk")
                            .asRuntimeException()
                    );
                }
            }

            @Override
            public void onError(Throwable t) {
                log.error("Upload stream error", t);
                fileData.reset();
            }

            @Override
            public void onCompleted() {
                try {
                    byte[] data = fileData.toByteArray();
                    String fileId = saveFile(data);
                    String checksum = calculateChecksum(data);
                    
                    UploadResponse response = UploadResponse.newBuilder()
                        .setFileId(fileId)
                        .setTotalBytes(totalBytes)
                        .setChecksum(checksum)
                        .build();
                    
                    responseObserver.onNext(response);
                    responseObserver.onCompleted();
                    
                    log.info("File uploaded: {} ({} bytes)", fileId, totalBytes);
                    
                } catch (Exception e) {
                    responseObserver.onError(
                        Status.INTERNAL
                            .withDescription("Failed to save file")
                            .asRuntimeException()
                    );
                } finally {
                    fileData.reset();
                }
            }
        };
    }
}
```

---

## Bidirectional Streaming

### Pattern

Both client and server send independent streams.

```
Client ──Request 1──────────> Server
Client <─Response 1─────────── Server
Client ──Request 2──────────> Server
Client ──Request 3──────────> Server
Client <─Response 2─────────── Server
```

### Protobuf Definition

```protobuf
service ChatService {
  // Bidirectional streaming
  rpc Chat(stream ChatMessage) returns (stream ChatMessage) {}
}

message ChatMessage {
  string user_id = 1;
  string room_id = 2;
  string text = 3;
  google.protobuf.Timestamp timestamp = 4;
}
```

### Spring Implementation

```java
@GrpcService
public class ChatServiceImpl extends ChatServiceGrpc.ChatServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(ChatServiceImpl.class);
    
    // Room management (in-memory for example)
    private final Map<String, Set<StreamObserver<ChatMessage>>> chatRooms = 
        new ConcurrentHashMap<>();

    @Override
    public StreamObserver<ChatMessage> chat(
            StreamObserver<ChatMessage> responseObserver) {
        
        return new StreamObserver<ChatMessage>() {
            
            private String currentRoom;

            @Override
            public void onNext(ChatMessage message) {
                log.debug("Received message from {} in room {}", 
                    message.getUserId(), message.getRoomId());
                
                // Join room if needed
                if (currentRoom == null || !currentRoom.equals(message.getRoomId())) {
                    leaveRoom(currentRoom, responseObserver);
                    joinRoom(message.getRoomId(), responseObserver);
                    currentRoom = message.getRoomId();
                }
                
                // Broadcast to all participants
                broadcastToRoom(message.getRoomId(), message);
            }

            @Override
            public void onError(Throwable t) {
                log.error("Chat stream error", t);
                leaveRoom(currentRoom, responseObserver);
            }

            @Override
            public void onCompleted() {
                log.info("User left chat");
                leaveRoom(currentRoom, responseObserver);
                responseObserver.onCompleted();
            }
        };
    }
    
    private void joinRoom(String roomId, StreamObserver<ChatMessage> observer) {
        chatRooms.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet())
            .add(observer);
        log.info("User joined room: {}", roomId);
    }
    
    private void leaveRoom(String roomId, StreamObserver<ChatMessage> observer) {
        if (roomId != null) {
            Set<StreamObserver<ChatMessage>> room = chatRooms.get(roomId);
            if (room != null) {
                room.remove(observer);
                log.info("User left room: {}", roomId);
            }
        }
    }
    
    private void broadcastToRoom(String roomId, ChatMessage message) {
        Set<StreamObserver<ChatMessage>> participants = chatRooms.get(roomId);
        if (participants != null) {
            for (StreamObserver<ChatMessage> participant : participants) {
                try {
                    participant.onNext(message);
                } catch (Exception e) {
                    log.error("Failed to send message to participant", e);
                }
            }
        }
    }
}
```

### Real-Time Collaboration Example

```protobuf
service CollaborationService {
  rpc EditDocument(stream Edit) returns (stream Edit) {}
}

message Edit {
  string user_id = 1;
  string document_id = 2;
  int64 position = 3;
  string operation = 4;  // "insert", "delete", "replace"
  string content = 5;
  int64 version = 6;
}
```

```java
@GrpcService
public class CollaborationServiceImpl extends CollaborationServiceGrpc.CollaborationServiceImplBase {

    private final Map<String, DocumentSession> sessions = new ConcurrentHashMap<>();

    @Override
    public StreamObserver<Edit> editDocument(StreamObserver<Edit> responseObserver) {
        
        return new StreamObserver<Edit>() {
            
            private String documentId;
            private DocumentSession session;

            @Override
            public void onNext(Edit edit) {
                // Join session on first edit
                if (session == null) {
                    documentId = edit.getDocumentId();
                    session = sessions.computeIfAbsent(
                        documentId, 
                        id -> new DocumentSession()
                    );
                    session.addParticipant(edit.getUserId(), responseObserver);
                }
                
                // Apply edit with conflict resolution
                Edit resolvedEdit = session.applyEdit(edit);
                
                // Broadcast to all participants except sender
                session.broadcastEdit(resolvedEdit, edit.getUserId());
            }

            @Override
            public void onError(Throwable t) {
                log.error("Edit stream error", t);
                if (session != null) {
                    session.removeParticipant(responseObserver);
                }
            }

            @Override
            public void onCompleted() {
                if (session != null) {
                    session.removeParticipant(responseObserver);
                }
                responseObserver.onCompleted();
            }
        };
    }
    
    private static class DocumentSession {
        private final Map<String, StreamObserver<Edit>> participants = 
            new ConcurrentHashMap<>();
        private final AtomicLong version = new AtomicLong(0);
        
        void addParticipant(String userId, StreamObserver<Edit> observer) {
            participants.put(userId, observer);
        }
        
        void removeParticipant(StreamObserver<Edit> observer) {
            participants.values().remove(observer);
        }
        
        Edit applyEdit(Edit edit) {
            // Apply operational transformation for conflict resolution
            long newVersion = version.incrementAndGet();
            return edit.toBuilder()
                .setVersion(newVersion)
                .build();
        }
        
        void broadcastEdit(Edit edit, String senderId) {
            participants.forEach((userId, observer) -> {
                if (!userId.equals(senderId)) {
                    try {
                        observer.onNext(edit);
                    } catch (Exception e) {
                        log.error("Failed to broadcast edit", e);
                    }
                }
            });
        }
    }
}
```

---

## Error Handling in Streams

### Terminating Errors

Errors close the stream for all patterns:

```java
@Override
public void streamOrders(StreamOrdersRequest request,
                        StreamObserver<Order> responseObserver) {
    try {
        for (Order order : getOrders(request)) {
            if (order == null) {
                // Error terminates stream
                responseObserver.onError(
                    Status.INTERNAL
                        .withDescription("Null order encountered")
                        .asRuntimeException()
                );
                return;  // Stream terminated
            }
            
            responseObserver.onNext(order);
        }
        
        responseObserver.onCompleted();
        
    } catch (Exception e) {
        responseObserver.onError(
            Status.INTERNAL
                .withDescription("Internal server error")
                .asRuntimeException()
        );
    }
}
```

### Non-Terminating Errors

Send errors as data without closing stream:

```protobuf
message StreamedResult {
  oneof result {
    Order order = 1;
    Error error = 2;
  }
}

message Error {
  string message = 1;
  string code = 2;
}

service OrderService {
  rpc StreamOrders(Request) returns (stream StreamedResult);
}
```

```java
@Override
public void streamOrders(StreamOrdersRequest request,
                        StreamObserver<StreamedResult> responseObserver) {
    try {
        for (OrderEntity entity : getOrderEntities(request)) {
            try {
                Order order = toProto(entity);
                responseObserver.onNext(
                    StreamedResult.newBuilder()
                        .setOrder(order)
                        .build()
                );
                
            } catch (Exception e) {
                // Send error but continue stream
                responseObserver.onNext(
                    StreamedResult.newBuilder()
                        .setError(Error.newBuilder()
                            .setMessage(e.getMessage())
                            .setCode("CONVERSION_ERROR")
                            .build())
                        .build()
                );
            }
        }
        
        responseObserver.onCompleted();
        
    } catch (Exception e) {
        // Fatal error terminates stream
        responseObserver.onError(Status.INTERNAL.asRuntimeException());
    }
}
```

---

## Testing Streaming Services

### Server Streaming Test

```java
class OrderServiceStreamingTest {

    @Test
    void testStreamOrders() {
        // Capture responses
        List<Order> received = new ArrayList<>();
        CountDownLatch completed = new CountDownLatch(1);
        
        StreamObserver<Order> responseObserver = new StreamObserver<>() {
            @Override
            public void onNext(Order order) {
                received.add(order);
            }

            @Override
            public void onError(Throwable t) {
                fail("Stream should not error");
            }

            @Override
            public void onCompleted() {
                completed.countDown();
            }
        };
        
        // Call service
        service.streamOrders(
            StreamOrdersRequest.newBuilder()
                .setCustomerId("C1")
                .build(),
            responseObserver
        );
        
        // Wait for completion
        assertTrue(completed.await(5, TimeUnit.SECONDS));
        assertEquals(3, received.size());
    }
}
```

### Client Streaming Test

```java
@Test
void testBatchCreateOrders() throws Exception {
    CountDownLatch completed = new CountDownLatch(1);
    AtomicReference<BatchCreateResponse> response = new AtomicReference<>();
    
    StreamObserver<BatchCreateResponse> responseObserver = new StreamObserver<>() {
        @Override
        public void onNext(BatchCreateResponse value) {
            response.set(value);
        }

        @Override
        public void onError(Throwable t) {
            fail("Should not error");
        }

        @Override
        public void onCompleted() {
            completed.countDown();
        }
    };
    
    // Get request observer
    StreamObserver<CreateOrderRequest> requestObserver = 
        service.batchCreateOrders(responseObserver);
    
    // Send requests
    requestObserver.onNext(createRequest("Order1"));
    requestObserver.onNext(createRequest("Order2"));
    requestObserver.onNext(createRequest("Order3"));
    requestObserver.onCompleted();
    
    // Wait and verify
    assertTrue(completed.await(5, TimeUnit.SECONDS));
    assertEquals(3, response.get().getSuccessCount());
}
```

---

## Best Practices

### ✅ Do:
- Process stream items as they arrive (don't buffer all)
- Handle client cancellation gracefully
- Implement backpressure when needed
- Use reactive streams for database queries
- Add timeout for long-running streams
- Clean up resources in `onError` and `onCompleted`
- Test with large streams to verify memory usage

### ❌ Don't:
- Don't load entire dataset into memory before streaming
- Don't forget to call `onCompleted()` or `onError()`
- Don't assume message ordering in bidirectional streams
- Don't ignore `ServerCallStreamObserver.isReady()`
- Don't block gRPC threads with long operations
- Don't share `StreamObserver` instances across threads
- Don't forget thread safety for shared state (chat rooms, etc.)

---

## Related Documentation

### Language-Agnostic Theory
- **[Streaming Patterns](../../../guides/api-design/grpc/streaming-patterns.md)** - Conceptual streaming guide
- **[Error Handling](../../../guides/api-design/grpc/error-handling.md)** - Error handling strategies

### Other Spring Documentation
- **[Unary Services](unary-services.md)** - Simple request-response patterns
- **[Error Handling](error-handling.md)** - Exception handling in Spring
- **[Testing](testing/integration-testing.md)** - Integration testing strategies

---

**Navigation:** [← Unary Services](unary-services.md) | [Error Handling →](error-handling.md)
