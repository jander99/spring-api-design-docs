# Streaming Documentation Patterns

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** Architecture, Documentation
> 
> **📊 Complexity:** 8.3 grade level • 1.2% technical density • fairly easy

## What is Streaming Documentation?

Streaming APIs send continuous data to clients. They differ from regular APIs. Regular APIs send one response and close. Streaming APIs keep connections open. They send many events over time.

Examples include:
- **Server-Sent Events (SSE)**: Server pushes updates to browser
- **WebSockets**: Two-way communication between client and server
- **NDJSON Streams**: Newline-delimited JSON for bulk data

Streaming APIs need special documentation. You must explain connection management, error handling, and flow control.

## Why Document Streaming Differently?

Streaming APIs are harder to use than regular APIs. Developers need to know:

1. How to connect and stay connected
2. What happens when connections break
3. How to handle data flowing too fast
4. How errors appear in streams
5. When streams end

Without good documentation, developers struggle. They build clients that fail in production.

## Simple Streaming Example

Here's a basic SSE endpoint that sends order updates:

```yaml
paths:
  /orders/stream:
    get:
      summary: Stream orders in real-time
      description: Sends new orders as they are created. Uses Server-Sent Events.
      responses:
        '200':
          description: Stream of order events
          content:
            text/event-stream:
              example: |
                data: {"id":"ord-123","status":"CREATED"}
                
                data: {"id":"ord-124","status":"PROCESSING"}
```

This shows the basics. Now let's add important details.

## Core Documentation Requirements

Every streaming API needs these four elements:

1. **Content type**: What format does the stream use?
2. **Flow control**: What happens when data flows too fast?
3. **Connection rules**: How long do connections stay open?
4. **Error format**: How do errors appear in the stream?

Let's explore each element with examples.

## Server-Sent Events (SSE)

SSE lets servers push updates to browsers. The browser receives events as they happen. This works great for notifications, live feeds, and status updates.

### Basic SSE Documentation

```yaml
paths:
  /orders/stream:
    get:
      summary: Stream orders in real-time
      description: >
        Stream sends orders as they are created or updated.
        Uses Server-Sent Events format.
        
        Connection stays open until client disconnects.
        Server sends heartbeat every 30 seconds.
        Client should reconnect if connection drops.
      parameters:
        - name: Last-Event-ID
          in: header
          description: Resume stream from this event ID after reconnection
          schema:
            type: string
            example: "1234"
      responses:
        '200':
          description: Stream started successfully
          headers:
            Cache-Control:
              description: Stream is not cached
              schema:
                type: string
                example: "no-cache"
          content:
            text/event-stream:
              schema:
                type: string
                description: Server-Sent Events format
              examples:
                order-events:
                  summary: Order event stream
                  value: |
                    id: 1
                    event: order-created
                    data: {"id":"ord-123","status":"CREATED"}
                    
                    id: 2
                    event: order-updated
                    data: {"id":"ord-123","status":"PROCESSING"}
```

## Newline-Delimited JSON Streams

NDJSON sends one JSON object per line. Each line is a complete JSON object. This format works well for bulk data exports and log streams.

### Basic NDJSON Documentation

```yaml
paths:
  /orders/stream:
    get:
      responses:
        '200':
          content:
            application/x-ndjson:
              schema:
                type: string
                description: Newline-delimited JSON format
              examples:
                order-stream:
                  summary: NDJSON order stream
                  value: |
                    {"id":"ord-123","status":"CREATED"}
                    {"id":"ord-124","status":"PROCESSING"}
                    {"id":"ord-125","status":"COMPLETED"}
```

## WebSocket Documentation

WebSockets allow two-way communication. The client can send messages to the server. The server can push messages to the client. This works great for chat, gaming, and collaborative tools.

OpenAPI has limited WebSocket support. Use custom extensions to document WebSocket endpoints.

### WebSocket Connection Example

```yaml
paths:
  /ws/orders:
    get:
      summary: WebSocket connection for order updates
      description: >
        Opens a WebSocket connection for two-way communication.
        Client can subscribe to order events.
        Server pushes order updates in real-time.
      x-websocket: true
      x-websocket-protocol: "orders-v1"
      parameters:
        - name: Upgrade
          in: header
          required: true
          schema:
            type: string
            enum: ["websocket"]
        - name: Connection
          in: header
          required: true
          schema:
            type: string
            enum: ["Upgrade"]
      responses:
        '101':
          description: Connection upgraded to WebSocket
          headers:
            Upgrade:
              schema:
                type: string
                example: "websocket"
            Connection:
              schema:
                type: string
                example: "Upgrade"
```

### WebSocket Message Formats

WebSockets send and receive messages. Each message has a type and payload. Document the message structure using schemas:

```yaml
components:
  schemas:
    WebSocketMessage:
      type: object
      properties:
        type:
          type: string
          enum: [subscribe, unsubscribe, event, error, ping, pong]
        payload:
          oneOf:
            - $ref: '#/components/schemas/SubscriptionMessage'
            - $ref: '#/components/schemas/EventMessage'
            - $ref: '#/components/schemas/ErrorMessage'
      required: [type]
    
    SubscriptionMessage:
      type: object
      properties:
        eventType:
          type: string
          enum: [order-created, order-updated, order-completed]
        filters:
          type: object
          properties:
            customerId:
              type: string
            status:
              type: string
      
    EventMessage:
      type: object
      properties:
        eventId:
          type: string
        eventType:
          type: string
        timestamp:
          type: string
          format: date-time
        data:
          $ref: '#/components/schemas/Order'
```

## Flow Control Documentation

Flow control manages data speed. It prevents servers from overwhelming clients. When data flows too fast, the client cannot keep up. This is called backpressure.

### HTTP Streaming Flow Control

HTTP streaming uses TCP flow control. Document how your API handles backpressure:

```yaml
paths:
  /orders/stream:
    get:
      description: >
        **Flow Control**: Uses HTTP/1.1 flow control.
        
        - **TCP Backpressure**: If client is slow, TCP buffers fill.
          Server automatically slows down.
        - **Buffer Size**: Server keeps 1MB buffer per connection.
          Old events drop if buffer fills.
        - **Client Tips**: 
          - Process events right away
          - Use exponential backoff to reconnect
          - Send Last-Event-ID to resume stream
      parameters:
        - name: buffer-size
          in: query
          description: Client buffer size hint (bytes)
          schema:
            type: integer
            default: 1048576
            minimum: 1024
            maximum: 10485760
```

### Reactive Streams

Reactive streams use demand signaling. The client tells the server how much data it can handle. The server sends only that much data.

Document reactive stream behavior clearly:

```yaml
paths:
  /orders/reactive-stream:
    get:
      summary: Reactive stream of orders
      description: >
        **Reactive Streams**: Follows Reactive Streams spec.
        
        - **Backpressure**: Buffers up to 1000 elements
        - **Demand Signal**: Client uses `X-Request-Count` header
        - **Errors**: Errors end the stream. Client must reconnect.
        - **Completion**: Stream ends when no more data exists
      parameters:
        - name: X-Request-Count
          in: header
          description: How many elements to send (1-1000)
          schema:
            type: integer
            default: 100
            minimum: 1
            maximum: 1000
```

## Connection Management

Streaming connections stay open for a long time. They need special care. Document the full connection lifecycle so developers know what to expect.

### Connection Lifecycle Example

```yaml
paths:
  /events/stream:
    get:
      description: >
        **Connection Lifecycle**:
        
        1. **Open**: HTTP connection upgrades to stream
        2. **Auth**: Server checks bearer token at start
        3. **Heartbeat**: Server pings every 30 seconds
        4. **Close**: Server sends closing event before shutdown
        5. **Reconnect**: Client waits and reconnects
        
        **Connection Limits**:
        - Max 10 connections per client
        - Timeout after 5 minutes idle
        - Max duration is 24 hours
      responses:
        '200':
          headers:
            X-Connection-ID:
              description: Connection ID for debugging
              schema:
                type: string
                example: "conn-abc123"
            X-Heartbeat-Interval:
              description: Heartbeat every N seconds
              schema:
                type: integer
                example: 30
```

### Error Handling

Errors in streams work differently than regular APIs. The connection stays open. Errors appear as events in the stream. Some errors are recoverable. Others require reconnection.

Document your error format clearly:

```yaml
components:
  examples:
    StreamingError:
      summary: Error in Server-Sent Events stream
      value: |
        event: error
        data: {
          "type": "https://example.com/problems/stream-error",
          "title": "Stream Processing Error",
          "status": 500,
          "detail": "Unable to process order update",
          "instance": "/orders/stream",
          "timestamp": "2023-12-01T10:30:00Z",
          "recoverable": true
        }
    
    WebSocketError:
      summary: Error in WebSocket connection
      value: {
        "type": "error",
        "payload": {
          "code": "PROCESSING_ERROR",
          "message": "Unable to process subscription request",
          "recoverable": false,
          "reconnectAfter": 30000
        }
      }
```

## Performance Documentation

Streaming APIs have different performance profiles than regular APIs. They consume more memory and network resources. Document your performance limits so developers can plan capacity.

### Performance Metrics Example

```yaml
paths:
  /metrics/stream:
    get:
      description: >
        **Performance**:
        
        - **Throughput**: 1000 events per second per connection
        - **Latency**: Less than 100ms delivery time
        - **Memory**: 2MB per connection
        - **CPU**: 0.1% per 100 connections
        
        **Scaling**:
        - Max 10,000 connections per server
        - Use load balancer for more connections
        - Events route by customer ID
```

### Load Balancing

Streaming APIs need sticky sessions. The client must stay connected to the same server. Otherwise, events arrive out of order or duplicate.

Document your load balancing setup:

```yaml
servers:
  - url: https://stream-api.example.com
    description: Load-balanced streaming cluster
    x-streaming-config:
      sticky-sessions: true
      session-affinity: client-id
      failover-strategy: graceful-reconnect
      cluster-size: 5
      load-balancing: round-robin
```

## Client Guidance

Help developers build good streaming clients. Provide code examples and best practices. Show how to handle reconnection, errors, and flow control.

### Connection Best Practices

```yaml
info:
  x-client-guidance:
    connection-management: >
      **Client Best Practices**:
      
      1. **Reconnection**: Use exponential backoff
         - Start with 1 second delay
         - Max delay is 60 seconds
         - Add random jitter (±25%)
      
      2. **Event Processing**: Handle events async
         - Use separate thread for events
         - Queue events for high throughput
         - Handle duplicate events
      
      3. **Error Recovery**: Build robust error handling
         - Check if error is recoverable
         - Log all connection events
         - Use circuit breaker for failures
    
    code-examples:
      javascript: |
        // Connect to stream
        const eventSource = new EventSource('/orders/stream', {
          withCredentials: true
        });
        
        // Handle incoming events
        eventSource.onmessage = function(event) {
          const order = JSON.parse(event.data);
          processOrder(order);
        };
        
        // Handle errors and reconnect
        eventSource.onerror = function(event) {
          console.error('Stream error:', event);
          setTimeout(reconnect, calculateBackoff());
        };
```

## Summary

Good streaming documentation helps developers build reliable clients. Include these key elements:

1. **Clear examples** that show basic usage first
2. **Flow control** details so clients handle backpressure
3. **Connection lifecycle** with reconnection guidance
4. **Error formats** with recovery instructions
5. **Performance limits** for capacity planning
6. **Client code examples** in popular languages

Follow these patterns. Your streaming API will be easier to integrate and more reliable in production.