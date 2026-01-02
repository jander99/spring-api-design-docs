# Event-Driven Architecture

## Overview

Event-driven architecture enables building distributed systems that react to events as they happen. Events represent important business occurrences (like "order created" or "payment processed") that other parts of your system need to know about.

This guide covers architectural patterns for event-driven systems including Event Sourcing, CQRS, and Sagas. For HTTP-based event delivery mechanisms (webhooks, SSE, polling), see [HTTP Event Patterns](../api-design/advanced-patterns/Event-Driven-Architecture.md).

## What is Event-Driven Architecture?

Instead of services calling each other directly, they communicate by:
- Publishing events when something important happens
- Subscribing to events they care about
- Processing events asynchronously

This creates loosely-coupled systems that are easier to scale and maintain.

## Core Principles

### 1. Asynchronous Communication
Services communicate without waiting for responses:
- Publishers emit events without knowing who consumes them
- Consumers process events independently
- No direct dependencies between services

### 2. Eventual Consistency
Data becomes consistent over time:
- Changes propagate through events
- Different services may have different views temporarily
- System reaches consistent state eventually

### 3. Loose Coupling
Services remain independent:
- Publishers don't know about consumers
- Consumers can be added or removed without affecting publishers
- Services evolve independently

## Event Types

### Domain Events
Represent business occurrences within your domain:
```json
{
  "id": "evt-12345",
  "type": "order.created",
  "timestamp": "2024-07-15T14:32:22Z",
  "source": "order-service",
  "data": {
    "orderId": "order-789",
    "customerId": "cust-456",
    "total": 99.99
  }
}
```

### Integration Events
Enable communication between bounded contexts:
```json
{
  "id": "evt-67890",
  "type": "payment.completed",
  "timestamp": "2024-07-15T14:35:00Z",
  "source": "payment-service",
  "data": {
    "paymentId": "pay-123",
    "orderId": "order-789",
    "amount": 99.99,
    "method": "credit_card"
  }
}
```

### Command Events
Express intent to perform actions:
```json
{
  "id": "cmd-11111",
  "type": "order.ship",
  "timestamp": "2024-07-15T14:40:00Z",
  "source": "fulfillment-service",
  "data": {
    "orderId": "order-789",
    "warehouseId": "wh-east-1"
  }
}
```

## Essential Architectural Patterns

### 1. Event Sourcing

Store all changes as a sequence of events instead of current state.

#### How It Works
1. Every state change is captured as an event
2. Events are stored in an append-only log
3. Current state is derived by replaying events
4. Past states can be reconstructed at any point

#### Event Stream Example
```json
[
  {
    "id": "evt-001",
    "type": "order.created",
    "timestamp": "2024-07-15T14:30:00Z",
    "data": {
      "orderId": "order-789",
      "customerId": "cust-456",
      "items": [{"productId": "prod-123", "quantity": 2}],
      "total": 99.99
    }
  },
  {
    "id": "evt-002",
    "type": "order.payment_received",
    "timestamp": "2024-07-15T14:32:00Z",
    "data": {
      "orderId": "order-789",
      "paymentId": "pay-123",
      "amount": 99.99
    }
  },
  {
    "id": "evt-003",
    "type": "order.shipped",
    "timestamp": "2024-07-15T14:45:00Z",
    "data": {
      "orderId": "order-789",
      "trackingNumber": "TRK123",
      "carrier": "USPS"
    }
  }
]
```

#### Benefits
- **Complete Audit Trail**: Every change is recorded
- **Temporal Queries**: Query state at any point in time
- **Event Replay**: Rebuild state or create new projections
- **Debugging**: Understand exactly what happened and when

#### Considerations
- **Storage**: Event logs grow continuously
- **Complexity**: Requires event versioning and schema management
- **Snapshots**: May need periodic state snapshots for performance

### 2. CQRS (Command Query Responsibility Segregation)

Separate read and write operations into different models.

#### Architecture
```yaml
Write Side (Commands):
  - Accepts: CreateOrder, UpdateOrder, CancelOrder
  - Emits: order.created, order.updated, order.cancelled
  - Optimized for: Data validation, business rules, writes

Read Side (Queries):
  - Accepts: GetOrder, SearchOrders, ListOrders
  - Consumes: order.created, order.updated, order.cancelled
  - Optimized for: Query performance, denormalization, caching
```

#### Command Example
```json
{
  "command": "create_order",
  "commandId": "cmd-12345",
  "timestamp": "2024-07-15T14:30:00Z",
  "data": {
    "customerId": "cust-456",
    "items": [
      {"productId": "prod-123", "quantity": 2}
    ]
  }
}
```

Command processing emits event:
```json
{
  "id": "evt-67890",
  "type": "order.created",
  "timestamp": "2024-07-15T14:30:01Z",
  "data": {
    "orderId": "order-789",
    "customerId": "cust-456",
    "items": [{"productId": "prod-123", "quantity": 2}],
    "status": "pending",
    "total": 99.99
  }
}
```

#### Query Model Update
Read side consumes event and updates query model:
```json
{
  "orderId": "order-789",
  "customerId": "cust-456",
  "customerName": "John Smith",
  "itemCount": 1,
  "totalAmount": 99.99,
  "status": "pending",
  "createdAt": "2024-07-15T14:30:01Z",
  "estimatedDelivery": "2024-07-20T00:00:00Z"
}
```

#### Benefits
- **Independent Scaling**: Scale reads and writes separately
- **Optimized Models**: Tailor each model to its use case
- **Simplified Queries**: Denormalize for fast reads
- **Performance**: Cache and optimize queries independently

#### Considerations
- **Eventual Consistency**: Read model may lag behind write model
- **Complexity**: Managing two models increases system complexity
- **Synchronization**: Ensure read model stays synchronized with events

### 3. Saga Pattern

Manage long-running business processes across multiple services.

#### Choreography-Based Saga
Services react to events without central coordination.

**Example: Order fulfillment process**

Step 1 - Order Service:
```json
{
  "id": "evt-001",
  "type": "order.created",
  "timestamp": "2024-07-15T14:30:00Z",
  "data": {
    "orderId": "order-789",
    "customerId": "cust-456",
    "total": 99.99
  }
}
```

Step 2 - Payment Service reacts:
```json
{
  "id": "evt-002",
  "type": "payment.processed",
  "timestamp": "2024-07-15T14:32:00Z",
  "data": {
    "orderId": "order-789",
    "paymentId": "pay-123",
    "amount": 99.99,
    "status": "approved"
  }
}
```

Step 3 - Inventory Service reacts:
```json
{
  "id": "evt-003",
  "type": "inventory.reserved",
  "timestamp": "2024-07-15T14:33:00Z",
  "data": {
    "orderId": "order-789",
    "items": [{"productId": "prod-123", "quantity": 2}]
  }
}
```

Step 4 - Shipping Service reacts:
```json
{
  "id": "evt-004",
  "type": "order.shipped",
  "timestamp": "2024-07-15T14:45:00Z",
  "data": {
    "orderId": "order-789",
    "trackingNumber": "TRK123"
  }
}
```

#### Compensation Example
If payment fails, compensate previous steps:

Payment failure:
```json
{
  "id": "evt-005",
  "type": "payment.failed",
  "timestamp": "2024-07-15T14:32:30Z",
  "data": {
    "orderId": "order-789",
    "reason": "insufficient_funds"
  }
}
```

Order Service compensates:
```json
{
  "id": "evt-006",
  "type": "order.cancelled",
  "timestamp": "2024-07-15T14:32:31Z",
  "data": {
    "orderId": "order-789",
    "reason": "payment_failed"
  }
}
```

#### Orchestration-Based Saga
Central coordinator manages saga execution.

**Saga Definition**:
```yaml
saga: order_fulfillment
steps:
  - service: payment-service
    action: process_payment
    compensation: refund_payment
  
  - service: inventory-service
    action: reserve_inventory
    compensation: release_inventory
  
  - service: shipping-service
    action: ship_order
    compensation: cancel_shipment
```

**Orchestrator Commands**:
```json
{
  "sagaId": "saga-12345",
  "orderId": "order-789",
  "currentStep": 1,
  "command": {
    "service": "payment-service",
    "action": "process_payment",
    "data": {
      "orderId": "order-789",
      "amount": 99.99
    }
  }
}
```

#### Benefits
- **Consistency**: Maintain consistency across services
- **Failure Handling**: Built-in compensation for failures
- **Visibility**: Track progress of long-running processes

#### Considerations
- **Complexity**: Designing compensating transactions is difficult
- **Choreography vs Orchestration**: Choose coordination style carefully
- **Idempotency**: All steps and compensations must be idempotent

## Message Broker Patterns

### Event Bus
Central channel for publishing and consuming events.

**Publishing**:
```json
{
  "topic": "orders",
  "partition": 3,
  "event": {
    "id": "evt-12345",
    "type": "order.created",
    "timestamp": "2024-07-15T14:30:00Z",
    "data": {"orderId": "order-789"}
  }
}
```

**Consuming**:
```yaml
consumer_group: order-processors
topics: [orders]
offset_strategy: earliest
```

### Event Streams
Ordered sequence of events for stateful processing.

**Stream Processing**:
```yaml
input_stream: order-events
operations:
  - filter: type == "order.created"
  - map: extract customer_id and total
  - aggregate: group by customer_id, sum totals
output_stream: customer-order-totals
```

### Dead Letter Queues
Handle events that cannot be processed.

**Failed Event**:
```json
{
  "originalEvent": {
    "id": "evt-12345",
    "type": "order.created",
    "data": {"orderId": "order-789"}
  },
  "failureReason": "Invalid customer ID",
  "failureCount": 3,
  "failedAt": "2024-07-15T14:35:00Z",
  "nextRetry": "2024-07-15T15:00:00Z"
}
```

## Event-Driven Microservices

### Service Boundaries
Define clear boundaries using events:
- Services own their data
- Services publish events for state changes
- Services consume events from other bounded contexts

### Event Flow Example
```yaml
Order Service:
  Publishes: order.created, order.updated, order.cancelled
  Consumes: payment.completed, inventory.reserved

Payment Service:
  Publishes: payment.completed, payment.failed
  Consumes: order.created

Inventory Service:
  Publishes: inventory.reserved, inventory.released
  Consumes: order.created, order.cancelled

Notification Service:
  Publishes: notification.sent
  Consumes: order.created, order.shipped, payment.failed
```

## Implementation Steps

### Step 1: Design Your Events
1. Identify business events in your domain
2. Define event schema with required fields
3. Choose event naming conventions
4. Plan for schema evolution

### Step 2: Choose Event Infrastructure
Consider these factors:
- **Throughput**: Events per second
- **Latency**: Acceptable delay
- **Ordering**: Strict order requirements
- **Durability**: Event persistence needs
- **Scalability**: Growth expectations

Common technologies:
- Apache Kafka (high throughput, ordering, durability)
- RabbitMQ (flexible routing, reliable delivery)
- AWS EventBridge (managed, serverless)
- Google Cloud Pub/Sub (managed, scalable)

### Step 3: Implement Event Handlers
1. Create event publishers
2. Build event consumers
3. Add error handling and retries
4. Ensure idempotent processing

### Step 4: Add Monitoring
1. Track event processing metrics
2. Monitor event flow health
3. Set up alerting for failures
4. Log event processing for debugging

## Best Practices

### 1. Keep Events Simple
Include only necessary data:
```json
{
  "id": "evt-12345",
  "type": "order.created",
  "timestamp": "2024-07-15T14:30:00Z",
  "data": {
    "orderId": "order-789",
    "customerId": "cust-456"
  }
}
```

Avoid including large payloads or complex nested structures.

### 2. Make Processing Idempotent
Handle duplicate events gracefully:
- Track processed event IDs
- Use idempotency keys
- Design operations to be naturally idempotent

### 3. Plan for Failures
Implement comprehensive failure handling:
- Retry with exponential backoff
- Use dead letter queues
- Alert on repeated failures
- Design compensating transactions

### 4. Version Your Events
Support schema evolution:
```json
{
  "id": "evt-12345",
  "type": "order.created",
  "version": "2.0",
  "timestamp": "2024-07-15T14:30:00Z",
  "data": {
    "orderId": "order-789",
    "customerId": "cust-456",
    "total": 99.99
  }
}
```

Consumers handle multiple versions:
- Support old versions during transition
- Migrate consumers gradually
- Deprecate old versions with notice

### 5. Monitor Everything
Track critical metrics:
- Event publish rate
- Event processing latency
- Consumer lag
- Error rates
- Dead letter queue size

## Common Use Cases

- **Order Processing**: Complex workflows across multiple services
- **Data Synchronization**: Keep multiple systems consistent
- **Audit Logging**: Complete history of all system changes
- **Real-time Analytics**: Stream processing for business insights
- **Microservices Communication**: Decoupled service interactions

## Architectural Considerations

### When to Use Event-Driven Architecture
- Need loose coupling between services
- Require high scalability
- Have asynchronous workflows
- Need complete audit trails
- Building reactive systems

### When to Avoid
- Simple CRUD applications
- Require immediate consistency
- Team lacks distributed systems experience
- Infrastructure complexity is prohibitive

## Related Documentation

- [HTTP Event Patterns](../api-design/advanced-patterns/Event-Driven-Architecture.md): HTTP-based event delivery (webhooks, SSE)
- [HTTP Streaming Patterns](../api-design/advanced-patterns/HTTP-Streaming-Patterns.md): Streaming implementation patterns
- [Reactive Error Handling](../api-design/advanced-patterns/Reactive-Error-Handling.md): Error handling for reactive systems
