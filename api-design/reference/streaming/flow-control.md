# Flow Control and Backpressure

> **Reading Guide**: Grade Level 13 | 7 min read | Technical reference for streaming flow control patterns

## Overview

Flow control prevents fast producers from overwhelming slow consumers. Without flow control, servers can exhaust memory buffering data that clients cannot process quickly enough. This document covers strategies for managing data flow in streaming APIs.

## Client Capabilities

### Signaling Flow Control

Document how clients can signal flow control capabilities:

```http
GET /v1/orders/stream HTTP/1.1
Accept: application/x-ndjson
Prefer: respond-async
X-Stream-Buffer-Size: 100
X-Stream-Rate-Limit: 10/second
```

### Server Response Headers

Include flow control information in response headers:

```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
X-Stream-Rate: 10/second
X-Stream-Buffer-Size: 100
X-Stream-Total-Items: 10000
```

## Backpressure Strategies

Backpressure signals from consumer to producer that processing cannot keep up. Choose a strategy based on your requirements.

### Strategy 1: Buffer and Drop

Buffer incoming data up to a limit, then drop oldest records.

```
┌─────────────────────────────────────────────────────────────┐
│                    Buffer and Drop Strategy                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Producer ──▶ [Buffer: 100 records max] ──▶ Consumer        │
│                     │                                        │
│                     ▼                                        │
│              When full: Drop oldest                          │
│                                                              │
│  Use when: Data freshness matters more than completeness    │
│  Example: Real-time dashboards, monitoring feeds            │
└─────────────────────────────────────────────────────────────┘
```

**Configuration:**
```http
X-Stream-Buffer-Strategy: drop-oldest
X-Stream-Buffer-Size: 100
```

### Strategy 2: Buffer and Block

Buffer incoming data, block producer when buffer is full.

```
┌─────────────────────────────────────────────────────────────┐
│                   Buffer and Block Strategy                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Producer ──▶ [Buffer: 100 records max] ──▶ Consumer        │
│      │              │                                        │
│      │              ▼                                        │
│      ◀── WAIT ── When full: Block producer                  │
│                                                              │
│  Use when: All data must be delivered                       │
│  Example: Data exports, audit logs                          │
└─────────────────────────────────────────────────────────────┘
```

**Configuration:**
```http
X-Stream-Buffer-Strategy: block
X-Stream-Buffer-Size: 100
X-Stream-Block-Timeout: 30s
```

### Strategy 3: Rate Limiting

Control producer speed to match consumer capacity.

```
┌─────────────────────────────────────────────────────────────┐
│                   Rate Limiting Strategy                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Producer ──[Rate: 10/sec]──▶ Consumer                      │
│                                                              │
│  Server enforces maximum records per time window            │
│                                                              │
│  Use when: Predictable throughput needed                    │
│  Example: Webhook delivery, API integrations                │
└─────────────────────────────────────────────────────────────┘
```

**Configuration:**
```http
X-Stream-Rate-Limit: 10/second
```

### Strategy 4: Adaptive Rate

Automatically adjust rate based on consumer feedback.

```
┌─────────────────────────────────────────────────────────────┐
│                   Adaptive Rate Strategy                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Producer ◀──────── Feedback ────────▶ Consumer             │
│     │                                      │                 │
│     ▼                                      │                 │
│  Adjust rate based on:                     │                 │
│  - Consumer ACK latency                    │                 │
│  - Buffer utilization                      │                 │
│  - Error rates                             │                 │
│                                                              │
│  Use when: Consumer capacity varies                         │
│  Example: Mobile clients, variable networks                 │
└─────────────────────────────────────────────────────────────┘
```

## Flow Control Sequence

### Normal Operation

```
┌──────────┐                              ┌──────────┐
│  Server  │                              │  Client  │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  HTTP 200 + Headers                     │
     │  X-Stream-Rate: 10/sec                  │
     │────────────────────────────────────────▶│
     │                                         │
     │  Data Record 1                          │
     │────────────────────────────────────────▶│
     │                                         │ Process
     │  Data Record 2                          │
     │────────────────────────────────────────▶│
     │                                         │ Process
     │  Data Record 3                          │
     │────────────────────────────────────────▶│
     │                                         │ Process
     │        ... continues ...                │
     │                                         │
     │  Stream End Record                      │
     │────────────────────────────────────────▶│
     │                                         │
     │                        Connection Close │
     │◀────────────────────────────────────────│
     │                                         │
```

### Backpressure Scenario

```
┌──────────┐                              ┌──────────┐
│  Server  │                              │  Client  │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  HTTP 200 + Headers                     │
     │────────────────────────────────────────▶│
     │                                         │
     │  Data Records (fast)                    │
     │────────────────────────────────────────▶│
     │                                         │ Buffer fills
     │                                         │
     │                TCP Window = 0           │
     │◀────────────────────────────────────────│ Client stops reading
     │                                         │
     │  [Server pauses - TCP backpressure]     │
     │                                         │
     │                                         │ Process buffered
     │                TCP Window > 0           │
     │◀────────────────────────────────────────│ Client resumes
     │                                         │
     │  Data Records (resume)                  │
     │────────────────────────────────────────▶│
     │                                         │
```

### Rate Limit Exceeded

```
┌──────────┐                              ┌──────────┐
│  Server  │                              │  Client  │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  Rapid requests exceed limit            │
     │◀────────────────────────────────────────│
     │                                         │
     │  HTTP 429 Too Many Requests             │
     │  Retry-After: 5                         │
     │────────────────────────────────────────▶│
     │                                         │
     │           [Client waits 5 seconds]      │
     │                                         │
     │  Retry request                          │
     │◀────────────────────────────────────────│
     │                                         │
     │  HTTP 200 + Stream begins               │
     │────────────────────────────────────────▶│
     │                                         │
```

## Rate Limiting Implementation

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 5

{
  "type": "https://api.example.com/problems/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Stream rate limit of 10/second exceeded",
  "retryAfter": 5
}
```

## Memory Management

### Buffer Sizing Guidelines

| Client Type | Recommended Buffer | Rationale |
|-------------|-------------------|-----------|
| Mobile app | 10-50 records | Limited memory |
| Web browser | 50-100 records | Moderate memory |
| Backend service | 100-1000 records | Ample memory |
| Batch processor | 1000+ records | High throughput needed |

### Memory Calculation

```
Memory per stream = Buffer size × Average record size × Safety factor

Example:
  Buffer: 100 records
  Average record: 1 KB
  Safety factor: 1.5 (for JSON parsing overhead)
  
  Memory = 100 × 1 KB × 1.5 = 150 KB per stream
```

### Preventing Memory Exhaustion

1. **Set maximum concurrent streams per client**
2. **Implement global stream limits**
3. **Monitor buffer utilization**
4. **Enforce record size limits**

```http
X-Max-Concurrent-Streams: 5
X-Max-Record-Size: 1048576
```

## Circuit Breaker Integration

Circuit breakers prevent cascading failures when downstream systems fail.

### Circuit Breaker States

```
┌─────────────────────────────────────────────────────────────┐
│                    Circuit Breaker States                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌────────┐     Failures > threshold    ┌────────┐        │
│    │ CLOSED │ ─────────────────────────▶  │  OPEN  │        │
│    │        │                             │        │        │
│    │ Normal │                             │ Reject │        │
│    │ flow   │                             │  all   │        │
│    └────────┘                             └────────┘        │
│        ▲                                      │              │
│        │                                      │              │
│        │     Success          Timeout         │              │
│        │        │                 │           │              │
│        │        │    ┌────────────┘           │              │
│        │        │    │                        │              │
│        │        │    ▼                        ▼              │
│        │    ┌─────────────┐◀──────────────────┘              │
│        │    │ HALF-OPEN   │    After cooldown                │
│        │    │             │                                  │
│        │    │ Test with   │                                  │
│        └────│ limited     │                                  │
│    Success  │ requests    │                                  │
│             └─────────────┘                                  │
│                   │                                          │
│                   │ Failure                                  │
│                   └────────────────▶ Back to OPEN            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Circuit Breaker Response

When circuit is open:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/problem+json
Retry-After: 30

{
  "type": "https://api.example.com/problems/circuit-open",
  "title": "Service Temporarily Unavailable",
  "status": 503,
  "detail": "Streaming service circuit breaker is open due to downstream failures",
  "retryAfter": 30,
  "circuitState": "open"
}
```

### Circuit Breaker Configuration

```yaml
circuit-breaker:
  failure-threshold: 5          # Failures before opening
  success-threshold: 3          # Successes to close
  timeout: 30s                  # Time in open state
  half-open-requests: 3         # Test requests when half-open
```

## Monitoring and Metrics

### Key Metrics to Track
- **Stream duration**: How long streams remain active
- **Throughput**: Records per second
- **Error rates**: Percentage of failed records
- **Client disconnections**: Frequency of client drops
- **Buffer utilization**: Memory and queue usage

### Health Checks
```http
GET /v1/health/streaming HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "activeStreams": 45,
  "averageThroughput": "150/second",
  "bufferUtilization": "23%",
  "errorRate": "0.1%",
  "circuitBreaker": {
    "state": "closed",
    "failureCount": 0
  }
}
```

## Connection Management

### Timeout Configuration

| Timeout Type | Recommended Value | Purpose |
|--------------|-------------------|---------|
| Connection | 30 seconds | Initial connection setup |
| Idle | 60 seconds | No data transmitted |
| Request | 5 minutes | Total stream duration |
| Heartbeat | 15 seconds | Keep-alive interval |

### Resource Cleanup

1. **Connection pooling**: Manage database connections efficiently
2. **Timeout handling**: Implement appropriate timeouts
3. **Resource cleanup**: Clean up resources on client disconnect
4. **Graceful shutdown**: Handle server shutdown gracefully

```http
# Client signals graceful disconnect
X-Stream-Action: cancel
X-Stream-Reason: client-shutdown
```

## Related Resources

- **[NDJSON Specification](./ndjson-specification.md)** - Format requirements
- **[Streaming APIs](../../request-response/streaming-apis.md)** - Overview of streaming patterns
- **[Common Issues](../../troubleshooting/streaming/common-issues.md)** - Troubleshooting guide
