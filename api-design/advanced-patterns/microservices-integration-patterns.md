# Microservices Integration Patterns

> **Reading Guide**
>
> **Reading Time:** 19 minutes | **Level:** Advanced
>
> **Prerequisites:** HTTP basics, REST API basics  
> **Key Topics:** Service discovery, circuit breakers, API gateways, distributed transactions
>
> **Complexity:** Grade 14 | 2.1% technical density | difficult
>
> **Note:** HTTP/JSON examples only. All patterns work with any language.

## Executive Summary

**What this covers:** Patterns for connecting microservices. Includes service discovery, circuit breakers, API gateways, and distributed transactions.

**Key takeaways:**
- Circuit breakers prevent cascade failures
- Correlation IDs track requests across services
- Use sync for queries, async for commands
- API gateways help but can become bottlenecks

**When to use:** When designing how services communicate and handle failures.

---

## Decision Framework

Use this flowchart to choose the right integration pattern:

```
                    ┌─────────────────────────────────┐
                    │ What type of communication      │
                    │ does your service need?         │
                    └───────────────┬─────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │ Request/Response│   │ Fire-and-Forget │   │ Event-Driven    │
    │ (Synchronous)   │   │ (Async Command) │   │ (Pub/Sub)       │
    └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
             │                     │                     │
             ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │ Use for:        │   │ Use for:        │   │ Use for:        │
    │ - Queries       │   │ - Commands that │   │ - Loose coupling│
    │ - Immediate     │   │   don't need    │   │ - Multiple      │
    │   response      │   │   immediate     │   │   consumers     │
    │ - Simple reads  │   │   response      │   │ - Event sourcing│
    └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
             │                     │                     │
             ▼                     ▼                     ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    Add Resilience Layer                      │
    │  Circuit breaker + Retry + Timeout + Fallback               │
    └─────────────────────────────────────────────────────────────┘
```

### Quick Reference: Pattern Selection

| Scenario | Primary Pattern | Fallback Strategy |
|----------|-----------------|-------------------|
| Get user profile | Sync HTTP with cache | Return cached data |
| Process payment | Async with webhook | Retry with idempotency |
| Send notification | Fire-and-forget | Queue and retry |
| Update inventory | Event-driven | Compensating transaction |
| Health check | Sync HTTP | Circuit breaker |

---

## Service Discovery Patterns

### What is Service Discovery?

Services need to find each other. Hard-coded IP addresses break when services scale. Service discovery fixes this problem.

### Client-Side Discovery

The client asks a registry for available instances. Then it picks one:

```
┌──────────┐                     ┌──────────────┐
│  Client  │                     │   Service    │
│ Service  │                     │   Registry   │
└────┬─────┘                     └──────┬───────┘
     │                                  │
     │  1. GET /services/order-service  │
     │─────────────────────────────────▶│
     │                                  │
     │  2. Available instances          │
     │  [10.0.1.5:8080, 10.0.1.6:8080] │
     │◀─────────────────────────────────│
     │                                  │
     │  3. Client selects instance      │
     │     and makes request            │
     │                                  │
     │         ┌──────────────┐         │
     │         │ Order Service│         │
     │         │  10.0.1.5    │         │
     │─────────▶└──────────────┘        │
     │                                  │
```

**HTTP Example - Query Registry:**

```http
GET /v1/services/order-service HTTP/1.1
Host: registry.internal
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=30

{
  "serviceName": "order-service",
  "instances": [
    {
      "id": "order-service-1",
      "host": "10.0.1.5",
      "port": 8080,
      "healthy": true,
      "metadata": {
        "version": "2.1.0",
        "zone": "us-east-1a"
      }
    },
    {
      "id": "order-service-2",
      "host": "10.0.1.6",
      "port": 8080,
      "healthy": true,
      "metadata": {
        "version": "2.1.0",
        "zone": "us-east-1b"
      }
    }
  ]
}
```

### Server-Side Discovery

A load balancer finds instances for you:

```
┌──────────┐        ┌────────────┐        ┌──────────────┐
│  Client  │        │    Load    │        │   Service    │
│ Service  │        │  Balancer  │        │   Registry   │
└────┬─────┘        └─────┬──────┘        └──────┬───────┘
     │                    │                      │
     │ 1. Request to      │                      │
     │    order-service   │                      │
     │───────────────────▶│                      │
     │                    │                      │
     │                    │ 2. Lookup instances  │
     │                    │─────────────────────▶│
     │                    │                      │
     │                    │ 3. Available list    │
     │                    │◀─────────────────────│
     │                    │                      │
     │                    │ 4. Route to instance │
     │                    │───────▶┌─────────────┤
     │                    │        │Order Service│
     │                    │◀───────└─────────────┤
     │ 5. Response        │                      │
     │◀───────────────────│                      │
```

### When to Use Each Pattern

| Pattern | Best For | Trade-offs |
|---------|----------|------------|
| Client-side | More control, zone-aware routing | Client complexity |
| Server-side | Simpler clients, centralized control | Single point of failure |
| DNS-based | Simple setups, standard tooling | Limited load balancing |

### Anti-patterns to Avoid

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Hard-coded IPs | Breaks when services move | Use service discovery |
| No health checks | Routes to dead instances | Implement health checks |
| Ignoring cache TTL | Stale service lists | Respect cache headers |
| Single registry | Single point of failure | Use clustered registry |

---

## Circuit Breaker Pattern

### Purpose

Circuit breakers stop cascade failures. When a service fails, stop sending it requests. This gives it time to recover.

### Circuit States

```
                     Success threshold met
                    ┌──────────────────────┐
                    │                      │
                    ▼                      │
     ┌─────────┐ Failures exceed   ┌──────────────┐
     │ CLOSED  │ ──────────────────►   OPEN       │
     │ (Normal)│    threshold      │ (Blocking)   │
     └─────────┘                   └──────────────┘
          ▲                               │
          │                               │ Timeout expires
          │                               ▼
          │                        ┌──────────────┐
          └────────────────────────│  HALF-OPEN   │
               Success             │  (Testing)   │
                                   └──────────────┘
```

| State | Behavior | HTTP Response |
|-------|----------|---------------|
| Closed | Requests pass through | Normal responses |
| Open | Requests fail immediately | 503 with Retry-After |
| Half-Open | Limited test requests | Mixed responses |

### HTTP Responses by Circuit State

**Closed** returns normal responses. **Open** returns 503:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/problem+json
Retry-After: 30

{
  "type": "https://api.example.com/problems/circuit-open",
  "title": "Service Temporarily Unavailable",
  "status": 503,
  "detail": "Circuit breaker is open. Retry in 30 seconds.",
  "retryAfter": 30
}
```

### Configuration Guidelines

| Parameter | Recommended Value | Purpose |
|-----------|-------------------|---------|
| Failure threshold | 5 consecutive failures | Opens circuit |
| Failure rate | 50% in 10-second window | Opens circuit |
| Open duration | 30 seconds | Time before testing |
| Half-open requests | 3 requests | Tests for recovery |
| Success threshold | 3 consecutive successes | Closes circuit |

### Status Codes That Trip Circuit Breakers

| Status Code | Count as Failure? | Reason |
|-------------|-------------------|--------|
| 5xx | Yes | Server errors indicate problems |
| 429 | Yes | Service is overloaded |
| Timeout | Yes | Service unresponsive |
| 4xx | Usually No | Client errors, not service issues |
| 2xx | No | Successful responses |

### Fallback Responses

When open, return cached or partial data:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Fallback-Response: true
X-Data-Freshness: stale

{
  "orderId": "123",
  "status": "unknown",
  "meta": {
    "fallback": true,
    "reason": "Order service unavailable",
    "cachedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

## Service Mesh Considerations

### What is a Service Mesh?

A service mesh handles traffic between services. It uses sidecar proxies to manage security and monitoring. You don't change your app code.

### Sidecar Proxy Pattern

```
┌─────────────────────────────────────────────────────────┐
│                        Pod                              │
│  ┌─────────────────┐         ┌─────────────────────┐   │
│  │   Application   │         │    Sidecar Proxy    │   │
│  │   Container     │◀───────▶│    (Envoy/Istio)    │   │
│  │                 │ localhost│                     │   │
│  └─────────────────┘         └──────────┬──────────┘   │
│                                         │               │
└─────────────────────────────────────────┼───────────────┘
                                          │
                                          │ mTLS
                                          ▼
┌─────────────────────────────────────────────────────────┐
│                        Pod                              │
│  ┌─────────────────────┐     ┌─────────────────────┐   │
│  │    Sidecar Proxy    │     │    Application      │   │
│  │    (Envoy/Istio)    │◀───▶│    Container        │   │
│  └─────────────────────┘     └─────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Headers Added by Service Mesh

Meshes add headers for tracing and routing:

```http
GET /v1/orders HTTP/1.1
Host: order-service
X-Request-ID: a3f2e1d4-5678-90ab-cdef-123456789abc
X-B3-TraceId: 80f198ee56343ba864fe8b2a57d3eff7
X-B3-SpanId: e457b5a2e4d86bd1
X-B3-ParentSpanId: 05e3ac9a4f6e3b90
X-B3-Sampled: 1
X-Envoy-Expected-Rq-Timeout-Ms: 5000
```

| Header | Purpose |
|--------|---------|
| X-Request-ID | Unique request identifier |
| X-B3-TraceId | Distributed trace ID |
| X-B3-SpanId | Current span ID |
| X-B3-ParentSpanId | Parent span ID |
| X-B3-Sampled | Sampling decision |
| X-Envoy-Expected-Rq-Timeout-Ms | Timeout for this request |

### Traffic Management Headers

```http
# Route to canary with X-Canary header
GET /v1/orders HTTP/1.1
Host: order-service
X-Canary: true

# Configure retries with Envoy headers
GET /v1/orders HTTP/1.1
Host: order-service
X-Envoy-Retry-On: 5xx,reset,connect-failure
X-Envoy-Max-Retries: 3
```

### When to Use a Service Mesh

| Use Service Mesh | Don't Use Service Mesh |
|------------------|------------------------|
| Many services (>10) | Few services (<5) |
| Need mTLS everywhere | Simple security needs |
| Complex traffic rules | Basic load balancing |
| Polyglot environment | Single language stack |
| Need fine-grained observability | Basic logging sufficient |

### Anti-patterns

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Mesh for everything | Adds latency and complexity | Use only where needed |
| Ignoring mesh headers | Breaks tracing | Propagate all trace headers |
| No resource limits | Proxy memory issues | Set CPU/memory limits |

---

## API Gateway Patterns

### Gateway Responsibilities

Gateways handle shared concerns in one place:

```
                    ┌──────────────────────────────────┐
                    │          API Gateway             │
                    │                                  │
  ┌─────────┐      │  ┌─────────┐  ┌─────────────┐   │
  │ Client  │──────▶│  │ Auth    │  │ Rate        │   │
  │         │      │  │         │  │ Limiting    │   │
  └─────────┘      │  └────┬────┘  └──────┬──────┘   │
                    │       │             │          │
                    │  ┌────▼─────────────▼────┐     │
                    │  │      Routing          │     │
                    │  └──────────┬────────────┘     │
                    │             │                  │
                    └─────────────┼──────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
  │   Order     │         │   User      │         │  Inventory  │
  │   Service   │         │   Service   │         │   Service   │
  └─────────────┘         └─────────────┘         └─────────────┘
```

### Routing Patterns

```http
# Path-based: /api/orders goes to order-service
GET /api/orders/123 HTTP/1.1
Host: api.example.com

# Header-based: X-API-Version routes to specific version
GET /api/orders/123 HTTP/1.1
Host: api.example.com
X-API-Version: 2
```

### Response Aggregation

Join data from many services into one response:

**Client Request:**

```http
GET /api/orders/123/details HTTP/1.1
Host: api.example.com
```

**Gateway Makes Internal Calls:**

```
Gateway → order-service: GET /orders/123
Gateway → user-service: GET /users/456
Gateway → inventory-service: GET /products/789
```

**Aggregated Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "order": {
    "id": "123",
    "status": "processing",
    "total": 99.99
  },
  "customer": {
    "id": "456",
    "name": "Jane Smith"
  },
  "product": {
    "id": "789",
    "name": "Widget Pro",
    "inStock": true
  }
}
```

### Rate Limiting at Gateway

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705320000

{
  "type": "https://api.example.com/problems/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded 1000 requests per hour"
}
```

### Gateway Anti-patterns

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Too much logic | Gateway becomes bottleneck | Keep logic in services |
| No caching | Unnecessary backend calls | Cache appropriate responses |
| Single gateway | Single point of failure | Deploy redundant gateways |
| Sync aggregation | Slow when one service is slow | Use timeouts, parallel calls |

---

## Distributed Transaction Patterns

### The Problem

You can't use database transactions across services. If step two fails, how do you undo step one?

### Saga Pattern

Sagas split work into steps. Each step has an undo action:

```
┌────────────────────────────────────────────────────────────────┐
│                        Saga: Create Order                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Step 1              Step 2              Step 3                │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐           │
│  │ Create  │────────▶│ Reserve │────────▶│ Process │           │
│  │ Order   │         │ Stock   │         │ Payment │           │
│  └────┬────┘         └────┬────┘         └────┬────┘           │
│       │                   │                   │                 │
│       │ Compensate        │ Compensate        │ Compensate      │
│       ▼                   ▼                   ▼                 │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐           │
│  │ Cancel  │◀────────│ Release │◀────────│ Refund  │           │
│  │ Order   │         │ Stock   │         │ Payment │           │
│  └─────────┘         └─────────┘         └─────────┘           │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Saga Orchestration

One service runs the saga steps:

**Start Saga:**

```http
POST /v1/sagas/create-order HTTP/1.1
Content-Type: application/json

{
  "orderId": "ord-123",
  "customerId": "cust-456",
  "items": [
    {"productId": "prod-789", "quantity": 2}
  ],
  "paymentMethod": "card-xyz"
}
```

```http
HTTP/1.1 202 Accepted
Location: /v1/sagas/create-order/saga-abc123
Content-Type: application/json

{
  "sagaId": "saga-abc123",
  "status": "running",
  "currentStep": "create-order"
}
```

**Check Saga Status:**

```http
GET /v1/sagas/create-order/saga-abc123 HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "sagaId": "saga-abc123",
  "status": "completed",
  "steps": [
    {
      "name": "create-order",
      "status": "completed",
      "completedAt": "2024-01-15T10:00:01Z"
    },
    {
      "name": "reserve-stock",
      "status": "completed",
      "completedAt": "2024-01-15T10:00:02Z"
    },
    {
      "name": "process-payment",
      "status": "completed",
      "completedAt": "2024-01-15T10:00:05Z"
    }
  ],
  "result": {
    "orderId": "ord-123",
    "confirmationNumber": "CONF-987654"
  }
}
```

### Compensation on Failure

When a step fails, undo the prior steps:

```http
GET /v1/sagas/create-order/saga-def456 HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "sagaId": "saga-def456",
  "status": "compensated",
  "steps": [
    {
      "name": "create-order",
      "status": "compensated",
      "compensation": "cancel-order"
    },
    {
      "name": "reserve-stock",
      "status": "compensated",
      "compensation": "release-stock"
    },
    {
      "name": "process-payment",
      "status": "failed",
      "error": {
        "code": "INSUFFICIENT_FUNDS",
        "message": "Payment declined"
      }
    }
  ],
  "error": {
    "failedStep": "process-payment",
    "reason": "Payment declined due to insufficient funds"
  }
}
```

### Eventual Consistency

Services may show different data briefly. This is normal:

```http
GET /v1/orders/ord-123 HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Consistency-Status: eventual

{
  "orderId": "ord-123",
  "status": "pending-confirmation",
  "meta": {
    "consistencyStatus": "eventual",
    "lastUpdated": "2024-01-15T10:00:01Z",
    "expectedConsistentBy": "2024-01-15T10:00:30Z"
  }
}
```

### Distributed Transaction Anti-patterns

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Two-phase commit | Blocks resources, doesn't scale | Use saga pattern |
| No compensation | Can't undo partial work | Design compensating actions |
| Ignoring idempotency | Retries create duplicates | Use idempotency keys |
| Sync sagas only | Long waits, timeouts | Use async with callbacks |

---

## Service Communication Patterns

### Synchronous vs Asynchronous

**Sync:** Call and wait for response. Simple but blocks.

**Async:** Publish event to queue. Don't wait. Other services consume when ready.

### When to Use Each

| Use Synchronous | Use Asynchronous |
|-----------------|------------------|
| Queries that need immediate data | Commands that can be queued |
| User-facing reads | Background processing |
| Simple request/response | Multiple consumers |
| Tight SLA requirements | Loose coupling needed |

### Request/Response Pattern

Standard HTTP call and response. Good for queries needing fast answers.

### Event Pattern

Publish events instead of direct calls. Other services subscribe to events they care about. See [Event-Driven Architecture](event-driven-architecture.md) for details.

---

## Inter-Service Authentication

### Service-to-Service Tokens

Services prove identity with tokens:

```http
GET /internal/v1/users/123 HTTP/1.1
Host: user-service.internal
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
X-Service-Name: order-service
X-Request-ID: req-abc123
```

**Service Token Claims:**

```json
{
  "iss": "https://auth.internal",
  "sub": "service:order-service",
  "aud": ["user-service", "inventory-service"],
  "iat": 1705312800,
  "exp": 1705316400,
  "scope": "read:users read:orders write:orders"
}
```

### mTLS Considerations

With mutual TLS, both sides show certificates:

```
┌──────────────┐                         ┌──────────────┐
│ Order Service│                         │ User Service │
│  (Client)    │                         │  (Server)    │
└──────┬───────┘                         └──────┬───────┘
       │                                        │
       │ 1. TLS ClientHello                     │
       │───────────────────────────────────────▶│
       │                                        │
       │ 2. TLS ServerHello + Server Cert       │
       │◀───────────────────────────────────────│
       │                                        │
       │ 3. Client Cert + Verify Server Cert    │
       │───────────────────────────────────────▶│
       │                                        │
       │ 4. Verify Client Cert + Encrypted      │
       │◀───────────────────────────────────────│
       │                                        │
       │ 5. Encrypted HTTP Request              │
       │═══════════════════════════════════════▶│
       │                                        │
```

**Headers After mTLS Termination:**

```http
GET /internal/v1/users/123 HTTP/1.1
Host: user-service.internal
X-Client-Cert-CN: order-service
X-Client-Cert-Fingerprint: sha256:abc123...
X-Request-ID: req-def456
```

### Authentication Anti-patterns

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| Shared secrets | Single point of failure | Use PKI or OAuth |
| Long-lived tokens | Risk if compromised | Short-lived with refresh |
| No service identity | Can't audit service calls | Require service tokens |
| Token in URL | Logged in access logs | Use Authorization header |

---

## Load Balancing Strategies

### Client-Side vs Server-Side

**Client-side:** Client queries registry, picks an instance, calls it directly.

**Server-side:** Client calls load balancer. It picks an instance.

```http
# Server-side: client calls gateway, gets routed
GET /v1/orders/123 HTTP/1.1
Host: order-service.internal

HTTP/1.1 200 OK
X-Served-By: order-service-2
X-Backend-Latency: 45ms
```

### Sticky Sessions

Send one client to the same server each time:

```http
# First request
GET /v1/cart HTTP/1.1
Host: api.example.com
Cookie: session=abc123

# Response sets affinity
HTTP/1.1 200 OK
Set-Cookie: X-Server-Affinity=server-2; Path=/

# Subsequent requests include affinity
GET /v1/cart HTTP/1.1
Host: api.example.com
Cookie: session=abc123; X-Server-Affinity=server-2
```

### Load Balancing Comparison

| Strategy | Best For | Drawback |
|----------|----------|----------|
| Round-robin | Equal instances | Ignores load |
| Weighted | Mixed capacity | Manual configuration |
| Least connections | Variable request duration | Tracking overhead |
| Consistent hashing | Caching, affinity | Uneven distribution |

---

## Health Check Aggregation

### Component Health Checks

Each service has a health endpoint:

```http
GET /health HTTP/1.1
Host: order-service.internal
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "UP",
  "components": {
    "database": {"status": "UP"},
    "cache": {"status": "UP"},
    "inventory-service": {"status": "UP"}
  }
}
```

### Aggregated Health Endpoint

One endpoint shows all service health:

```http
GET /health/system HTTP/1.1
Host: api.example.com
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "DEGRADED",
  "timestamp": "2024-01-15T10:00:00Z",
  "services": {
    "order-service": {
      "status": "UP",
      "instances": {"healthy": 3, "total": 3}
    },
    "user-service": {
      "status": "UP",
      "instances": {"healthy": 2, "total": 2}
    },
    "payment-service": {
      "status": "DEGRADED",
      "instances": {"healthy": 1, "total": 2},
      "message": "One instance unhealthy"
    }
  }
}
```

### Health Check Best Practices

| Practice | Reason |
|----------|--------|
| Fast checks (< 1s) | Don't block health probes |
| Check dependencies | Detect cascade failures |
| Use appropriate status | UP, DOWN, DEGRADED |
| Include details | Help with debugging |
| Separate liveness/readiness | Different purposes |

---

## Timeout and Retry Policies

### Timeout Configuration

```
┌──────────────────────────────────────────────────────────┐
│                    Request Timeline                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ├─── Connection ───┼──── Read Timeout ────┤             │
│  │    Timeout       │                      │             │
│  │    (5s)          │        (30s)         │             │
│  │                  │                      │             │
│  ├──────────────────┴──────────────────────┤             │
│  │           Total Request Timeout          │             │
│  │                  (60s)                   │             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Timeout Headers

```http
# Client indicates timeout preference
GET /v1/orders HTTP/1.1
Host: api.example.com
X-Request-Timeout: 5000

# Server responds with processing time
HTTP/1.1 200 OK
X-Response-Time: 245
X-Backend-Duration: 180
```

### Retry Policy Guidelines

> **See Also**: [Retryable Status Codes](../quick-reference/status-codes.md#retryable-status-codes) for the complete reference table and [HTTP Client Best Practices](../request-response/http-client-best-practices.md#when-to-retry) for detailed retry strategies.

**Quick rule**: Retry 5xx errors and 429 with backoff. Never retry 4xx errors (except 408).

### Retry Response Headers

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/problem+json
Retry-After: 30

{
  "type": "https://api.example.com/problems/service-unavailable",
  "title": "Service Temporarily Unavailable",
  "status": 503,
  "detail": "Please retry after 30 seconds",
  "retryAfter": 30
}
```

---

## Correlation ID Propagation

### Why Correlation IDs Matter

Track one user request across many services:

```
Request Flow with Correlation ID
────────────────────────────────────────

Client ─────▶ Gateway ─────▶ Order ─────▶ Inventory ─────▶ Payment
                │              │              │              │
                │              │              │              │
     X-Request-ID: abc123      │              │              │
     X-Correlation-ID: xyz789  │              │              │
                               │              │              │
                     Same headers propagated across all services
```

### Required Headers

```http
# Gateway adds correlation ID, passes to all services
POST /v1/orders HTTP/1.1
Host: order-service.internal
X-Request-ID: order-svc-789
X-Correlation-ID: gw-abc-456
X-Trace-ID: 80f198ee56343ba864fe8b2a57d3eff7
```

### Header Definitions

| Header | Purpose | Generated By |
|--------|---------|--------------|
| X-Request-ID | Unique per request | Each service |
| X-Correlation-ID | Unique per user action | Gateway |
| X-Trace-ID | Distributed trace ID | Tracing system |
| X-Parent-Request-ID | Caller's request ID | Calling service |

### Logging with Correlation IDs

```json
{
  "timestamp": "2024-01-15T10:00:00.123Z",
  "service": "order-service",
  "level": "INFO",
  "message": "Order created successfully",
  "requestId": "order-svc-789",
  "correlationId": "gw-abc-456",
  "traceId": "80f198ee56343ba864fe8b2a57d3eff7",
  "orderId": "ord-123"
}
```

---

## Contract Testing Considerations

### Why Contract Testing?

Services must agree on message format. Contract tests check this.

### Consumer-Driven Contracts

Consumers say what format they need:

```json
{
  "consumer": "order-service",
  "provider": "user-service",
  "interactions": [
    {
      "description": "Get user by ID",
      "request": {
        "method": "GET",
        "path": "/v1/users/123"
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "id": "123",
          "name": "string",
          "email": "string"
        }
      }
    }
  ]
}
```

### Provider Verification

Provider runs tests to prove it matches what consumers expect.

### Contract Testing Best Practices

| Practice | Reason |
|----------|--------|
| Test at build time | Catch breaks before deploy |
| Version contracts | Track changes over time |
| Test both sides | Consumer expectations + provider capabilities |
| Include error cases | Test failure scenarios |

---

## Implementation Checklist

Use this list when setting up service integration:

### Phase 1: Service Discovery

- [ ] Choose discovery pattern (client-side or server-side)
- [ ] Set up service registry with health checks
- [ ] Configure service registration on startup
- [ ] Implement graceful deregistration on shutdown
- [ ] Add registry caching with appropriate TTL

### Phase 2: Resilience

- [ ] Implement circuit breakers for all external calls
- [ ] Configure failure thresholds (5 failures, 50% rate)
- [ ] Set appropriate timeouts (connection: 5s, read: 30s)
- [ ] Add retry logic with exponential backoff
- [ ] Design fallback responses for critical paths

### Phase 3: Communication

- [ ] Define sync vs async boundaries
- [ ] Implement correlation ID propagation
- [ ] Add X-Request-ID to all responses
- [ ] Set up event publishing for async patterns
- [ ] Configure message queues if needed

### Phase 4: Security

- [ ] Implement service-to-service authentication
- [ ] Configure mTLS or service tokens
- [ ] Set short token lifetimes (15-60 minutes)
- [ ] Add service identity headers
- [ ] Audit inter-service calls

### Phase 5: Observability

- [ ] Aggregate health checks at gateway
- [ ] Propagate trace headers (W3C format)
- [ ] Log correlation IDs in all services
- [ ] Set up distributed tracing
- [ ] Configure alerting for circuit breaker opens

### Phase 6: Gateway

- [ ] Configure path-based routing
- [ ] Implement rate limiting
- [ ] Add authentication at edge
- [ ] Set up response caching where appropriate
- [ ] Enable request/response logging

### Phase 7: Verification

- [ ] Create consumer-driven contracts
- [ ] Run provider verification tests
- [ ] Test circuit breaker behavior
- [ ] Verify correlation ID propagation end-to-end
- [ ] Load test with realistic traffic patterns

---

## Related Documentation

### Core Patterns
- [HTTP Client Best Practices](../request-response/http-client-best-practices.md) - Retry, timeout, and circuit breaker patterns
- [API Observability Standards](api-observability-standards.md) - Health checks, metrics, and tracing
- [Async & Batch Processing](async-batch-patterns.md) - Long-running operations and webhooks

### Architecture
- [Event-Driven Architecture](event-driven-architecture.md) - Event patterns and messaging
- [Multi-Tenancy Patterns](multi-tenancy-patterns.md) - Tenant isolation in microservices
- [Performance Standards](performance-standards.md) - Caching and optimization

### Security
- [Security Standards](../security/security-standards.md) - Authentication and authorization
- [Rate Limiting Standards](../security/rate-limiting-standards.md) - Throttling and protection

### Foundations
- [API Lifecycle Management](../foundations/api-lifecycle-management.md) - Versioning and deprecation
- [Error Response Standards](../request-response/error-response-standards.md) - RFC 9457 error format
