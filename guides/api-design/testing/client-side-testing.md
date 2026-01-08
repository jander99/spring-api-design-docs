# Client-Side Testing

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 20 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** HTTP fundamentals, Client resilience patterns  
> **🎯 Key Topics:** Testing resilience, Mock servers, Contract testing, Chaos engineering
> 
> **📊 Complexity:** Grade 13 • Advanced technical density • Fairly difficult

## Overview

Client-side testing verifies HTTP client behavior under various conditions. These tests ensure your client handles failures, retries, timeouts, and network issues correctly.

Robust client testing validates:
- Retry logic executes properly with correct backoff
- Circuit breakers transition between states accurately
- Timeouts fire at expected intervals
- Error handling provides clear feedback
- Network failures trigger appropriate recovery

This guide focuses on testing HTTP client implementations. It covers patterns and strategies that work regardless of programming language or framework.

## Why Client-Side Testing Matters

### The Testing Gap

Many teams test their APIs thoroughly but neglect client testing:

| Server-Side Testing | Client-Side Testing |
|---------------------|---------------------|
| ✅ Unit tests | ❌ Often missing |
| ✅ Integration tests | ❌ Manual only |
| ✅ Load tests | ❌ No resilience tests |
| ✅ Contract tests (provider) | ❌ No contract tests (consumer) |

### Client Failures Cause Production Issues

Without proper testing, clients fail in production:

**Retry Loops**:
```
Client retries immediately without backoff
→ Overwhelms recovering service
→ Prevents service recovery
→ Cascading failure
```

**Hanging Requests**:
```
No timeout configured
→ Request hangs indefinitely
→ Thread pool exhausts
→ Application becomes unresponsive
```

**Circuit Breaker Misconfiguration**:
```
Threshold set too low
→ Circuit opens prematurely
→ Service appears down
→ False alarms and manual intervention
```

### Benefits of Client Testing

Proper client testing provides:

1. **Confidence in Resilience**: Know your client handles failures
2. **Fast Feedback**: Catch issues before production
3. **Regression Prevention**: Ensure fixes stay fixed
4. **Documentation**: Tests show expected behavior
5. **Refactoring Safety**: Change implementation confidently

## Testing Retry Patterns

### Test Cases for Retry Logic

Test all retry scenarios:

| Test Case | Verifies | Expected Behavior |
|-----------|----------|-------------------|
| Single retry success | Retry after transient failure | Request succeeds on retry |
| Multiple retries | Retry exhaustion | Fails after max attempts |
| Exponential backoff | Wait time increases | Each wait doubles previous |
| Jitter application | Randomization prevents thundering herd | Wait times vary |
| Retry-After header | Server guidance respected | Client waits specified time |
| Non-retriable errors | 4xx errors not retried | Fails immediately |
| Idempotency keys | Duplicate prevention | Same key = same result |

### Example: Testing Exponential Backoff

Mock server returns errors, verify wait times:

```http
# Mock server configuration
Scenario: Retry with backoff

Request 1:
GET /api/data HTTP/1.1
Response:
HTTP/1.1 503 Service Unavailable

Request 2 (verify ~1 second delay):
GET /api/data HTTP/1.1
Response:
HTTP/1.1 503 Service Unavailable

Request 3 (verify ~2 second delay):
GET /api/data HTTP/1.1
Response:
HTTP/1.1 503 Service Unavailable

Request 4 (verify ~4 second delay):
GET /api/data HTTP/1.1
Response:
HTTP/1.1 200 OK
Content-Type: application/json

{"status": "success"}
```

**Verification Points**:
1. Request count equals expected attempts (4)
2. Delays match exponential pattern (1s, 2s, 4s)
3. Final request succeeds
4. Total time matches expected duration

### Example: Testing Retry-After Header

Verify client respects server guidance:

```http
# Mock server returns Retry-After
Request 1:
GET /api/resource HTTP/1.1

Response:
HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Retry after 30 seconds"
}

# Client should wait exactly 30 seconds
# Verify next request occurs at t+30s (not earlier)

Request 2 (at t+30s):
GET /api/resource HTTP/1.1

Response:
HTTP/1.1 200 OK
Content-Type: application/json

{"status": "success"}
```

**Verification Points**:
1. No retry before 30 seconds
2. Retry occurs at approximately 30 seconds
3. No exponential backoff applied (header takes precedence)

### Example: Testing Idempotency

Verify idempotency key prevents duplicates:

```http
# First request
POST /api/orders HTTP/1.1
Content-Type: application/json
Idempotency-Key: test-order-123

{
  "productId": "prod-456",
  "quantity": 1
}

Response:
HTTP/1.1 201 Created
Location: /api/orders/order-789

{
  "orderId": "order-789",
  "status": "created"
}

# Retry with same key (simulating network failure)
POST /api/orders HTTP/1.1
Content-Type: application/json
Idempotency-Key: test-order-123

{
  "productId": "prod-456",
  "quantity": 1
}

Response:
HTTP/1.1 200 OK

{
  "orderId": "order-789",
  "status": "created"
}
```

**Verification Points**:
1. First request creates order (201 Created)
2. Second request returns existing order (200 OK)
3. Same order ID returned both times
4. No duplicate order created

### Example: Testing Non-Retriable Errors

Verify 4xx errors fail immediately:

```http
# Mock server returns 404
Request 1:
GET /api/products/invalid-id HTTP/1.1

Response:
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404
}

# Client should NOT retry
# Verify only one request made
```

**Verification Points**:
1. Only one request sent
2. No retry attempts
3. Error returned to caller immediately
4. No delay before returning error

### Mock Server Setup for Retry Testing

Configure mock server to control responses:

**WireMock Example Pattern**:
```json
{
  "scenarioName": "Retry Test",
  "requiredScenarioState": "Started",
  "request": {
    "method": "GET",
    "url": "/api/data"
  },
  "response": {
    "status": 503,
    "body": "{\"error\": \"Service unavailable\"}"
  },
  "newScenarioState": "First Retry"
}
```

**State Transitions**:
```
State 1 (Started) → 503 Service Unavailable
State 2 (First Retry) → 503 Service Unavailable  
State 3 (Second Retry) → 200 OK
```

## Testing Circuit Breaker Patterns

### Test Cases for Circuit Breakers

Test all circuit breaker states and transitions:

| Test Case | Verifies | Expected Behavior |
|-----------|----------|-------------------|
| Closed → Open | Failure threshold | Opens after N failures |
| Open → Half-Open | Timeout expiry | Tests service after wait |
| Half-Open → Closed | Recovery detection | Closes after success |
| Half-Open → Open | Continued failure | Reopens if test fails |
| Error counting | Failure types | Only counts relevant errors |
| Volume threshold | Minimum requests | Requires minimum traffic |
| Success threshold | Recovery confirmation | Multiple successes needed |

### Example: Testing State Transitions

Verify circuit opens after threshold:

```http
# Configure circuit breaker:
# - Failure threshold: 5
# - Timeout: 30 seconds
# - Success threshold: 2

# Requests 1-5: Cause failures
GET /api/payments HTTP/1.1
→ HTTP/1.1 500 Internal Server Error

GET /api/payments HTTP/1.1
→ HTTP/1.1 500 Internal Server Error

GET /api/payments HTTP/1.1
→ HTTP/1.1 500 Internal Server Error

GET /api/payments HTTP/1.1
→ HTTP/1.1 500 Internal Server Error

GET /api/payments HTTP/1.1
→ HTTP/1.1 500 Internal Server Error

# Circuit should now be OPEN

# Request 6: Circuit prevents call
GET /api/payments HTTP/1.1
→ Circuit Breaker OPEN Error
→ No network request sent
```

**Verification Points**:
1. Exactly 5 requests sent to server
2. Request 6 fails immediately (no network call)
3. Circuit state is OPEN
4. Error indicates circuit breaker cause

### Example: Testing Half-Open State

Verify circuit tests service recovery:

```http
# Circuit is OPEN
# Wait 30 seconds (timeout duration)

# Circuit transitions to HALF_OPEN
# Next request tests service

Request (HALF_OPEN state):
GET /api/payments HTTP/1.1

Response:
HTTP/1.1 200 OK
Content-Type: application/json

{"status": "success"}

# Circuit remains HALF_OPEN
# Need success threshold (2) before CLOSED

Request (still HALF_OPEN):
GET /api/payments HTTP/1.1

Response:
HTTP/1.1 200 OK

# Circuit transitions to CLOSED
# All subsequent requests allowed
```

**Verification Points**:
1. No requests during OPEN period
2. First request after timeout reaches server
3. Success threshold required before CLOSED
4. All requests allowed once CLOSED

### Example: Testing Half-Open Failure

Verify circuit reopens on test failure:

```http
# Circuit is HALF_OPEN after timeout

Request (HALF_OPEN state):
GET /api/payments HTTP/1.1

Response:
HTTP/1.1 503 Service Unavailable

# Circuit transitions back to OPEN
# Reset timeout period

# Next request fails immediately
GET /api/payments HTTP/1.1
→ Circuit Breaker OPEN Error
→ No network request sent

# Wait another 30 seconds before retry
```

**Verification Points**:
1. Test request sent to server
2. Failure reopens circuit
3. Subsequent requests blocked
4. New timeout period starts

### Mock Server Scenarios for Circuit Breakers

Configure repeating failure patterns:

**Pattern: Consecutive Failures**:
```
Request 1-5: Return 500 errors
Request 6+: Return success (circuit should be open)
```

**Pattern: Intermittent Failures**:
```
Request 1: Success
Request 2: Failure
Request 3: Success
Request 4: Failure
...
(Verify circuit doesn't open until threshold reached)
```

**Pattern: Recovery**:
```
Request 1-5: Failures (circuit opens)
Wait timeout period
Request 6: Success (half-open test)
Request 7: Success (circuit closes)
Request 8: Success (normal operation)
```

### Measuring Circuit Breaker Metrics

Track and verify circuit breaker behavior:

```json
{
  "circuitBreaker": "payment-service",
  "metrics": {
    "state": "OPEN",
    "failureCount": 8,
    "successCount": 0,
    "rejectedCount": 15,
    "lastFailureTime": "2024-07-15T14:30:00Z",
    "nextAttemptTime": "2024-07-15T14:30:30Z"
  }
}
```

**Key Metrics**:
- Current state (CLOSED, OPEN, HALF_OPEN)
- Failure count in current window
- Success count in current window
- Rejected requests (blocked by open circuit)
- Last state transition time

## Testing Timeout Handling

### Test Cases for Timeouts

Test all timeout scenarios:

| Test Case | Verifies | Expected Behavior |
|-----------|----------|-------------------|
| Connection timeout | TCP handshake | Fails after connection timeout |
| Read timeout | Response delay | Fails after socket timeout |
| Request timeout | Total duration | Fails after request timeout |
| Timeout hierarchy | Shortest fires | First timeout wins |
| Timeout + retry | Combined behavior | Retries after timeout |
| Partial response | Mid-stream timeout | Handles incomplete data |

### Example: Testing Connection Timeout

Verify timeout during connection:

```http
# Configure connection timeout: 5 seconds
# Mock server delays accepting connection

Request:
GET /api/data HTTP/1.1

# Server delays TCP handshake > 5 seconds

Error after 5 seconds:
Connection timeout after 5000ms
```

**Verification Points**:
1. Request fails after 5 seconds (not before/after)
2. Error indicates connection timeout (not read timeout)
3. No partial response received
4. Connection attempt abandoned

### Example: Testing Read Timeout

Verify timeout during response:

```http
# Configure read timeout: 30 seconds
# Mock server delays response

Request:
GET /api/large-report HTTP/1.1

# Connection establishes quickly
# Server starts sending response
# Server pauses mid-response > 30 seconds

Response started:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "report": {
    "data": [
      # Server stops here for > 30 seconds
      
Error after 30 seconds:
Read timeout after 30000ms
```

**Verification Points**:
1. Connection succeeds
2. Response headers received
3. Timeout during body transfer
4. Partial data discarded
5. Error indicates read timeout

### Example: Testing Request Timeout

Verify total request duration limit:

```http
# Configure request timeout: 60 seconds
# Configure socket timeout: 30 seconds

Request:
GET /api/slow-operation HTTP/1.1

# Timeline:
# t=0s:  Connection starts
# t=2s:  Connection established
# t=5s:  Request sent
# t=10s: Response headers received
# t=40s: Still receiving data (within socket timeout)
# t=60s: Request timeout fires

Error at 60 seconds:
Request timeout after 60000ms
```

**Verification Points**:
1. Socket timeout not reached (data flowing)
2. Request timeout fires at 60 seconds
3. Request aborted despite active transfer
4. Error indicates request timeout

### Mock Server Delay Patterns

Configure delays to trigger timeouts:

**Connection Delay**:
```json
{
  "request": {
    "method": "GET",
    "url": "/api/data"
  },
  "response": {
    "fixedDelayMilliseconds": 10000,
    "delayDistribution": {
      "type": "uniform",
      "lower": 8000,
      "upper": 12000
    }
  }
}
```

**Response Delay**:
```json
{
  "request": {
    "method": "GET",
    "url": "/api/slow"
  },
  "response": {
    "status": 200,
    "body": "...",
    "chunkedDribbleDelay": {
      "numberOfChunks": 10,
      "totalDuration": 45000
    }
  }
}
```

**Progressive Delay**:
```
Byte 0-1000:    Immediate
Byte 1001-2000: 100ms delay
Byte 2001-3000: 200ms delay
Byte 3001+:     30 second pause (trigger timeout)
```

### Timeout and Retry Interaction

Test combined timeout and retry behavior:

```http
# Configuration:
# - Socket timeout: 10 seconds
# - Max retries: 3
# - Exponential backoff

Request 1:
GET /api/data HTTP/1.1
→ Read timeout after 10 seconds

Wait ~1 second (backoff)

Request 2:
GET /api/data HTTP/1.1
→ Read timeout after 10 seconds

Wait ~2 seconds (backoff)

Request 3:
GET /api/data HTTP/1.1
→ Read timeout after 10 seconds

# Max retries reached
Final error: Failed after 3 retry attempts
Total duration: ~10s + 1s + 10s + 2s + 10s = ~33 seconds
```

**Verification Points**:
1. Each request times out at 10 seconds
2. Backoff delays between retries
3. Total retries equals max attempts
4. Total duration matches expected timeline

## Mock Server Patterns

### Mock Server Tools

Common mock server tools for testing:

| Tool | Best For | Key Features |
|------|----------|--------------|
| WireMock | Java/JVM clients | Stateful scenarios, fault injection |
| MockServer | Any language | Expectations, verification |
| Prism | OpenAPI specs | Contract-based mocking |
| JSON Server | Simple REST APIs | Quick setup, file-based |
| Mockoon | Local development | GUI configuration |

### Mock Server Capabilities

Mock servers support various testing scenarios:

**Response Stubbing**:
```json
{
  "request": {
    "method": "GET",
    "url": "/api/products/123"
  },
  "response": {
    "status": 200,
    "body": {
      "id": "123",
      "name": "Test Product"
    }
  }
}
```

**Stateful Scenarios**:
```json
{
  "scenarioName": "Product Purchase",
  "states": [
    {
      "name": "In Stock",
      "request": {"method": "POST", "url": "/api/purchase"},
      "response": {"status": 200},
      "nextState": "Out of Stock"
    },
    {
      "name": "Out of Stock",
      "request": {"method": "POST", "url": "/api/purchase"},
      "response": {"status": 409, "body": {"error": "Out of stock"}}
    }
  ]
}
```

**Request Verification**:
```json
{
  "verify": {
    "method": "POST",
    "url": "/api/orders",
    "headers": {
      "Content-Type": "application/json",
      "Idempotency-Key": {"matches": "^order-.+$"}
    },
    "bodyPatterns": [
      {"matchesJsonPath": "$.productId"},
      {"matchesJsonPath": "$.quantity"}
    ]
  },
  "times": {"exactly": 1}
}
```

### Fault Injection with Mock Servers

Simulate various failure conditions:

**Network Errors**:
```json
{
  "request": {
    "method": "GET",
    "url": "/api/unreliable"
  },
  "response": {
    "fault": "CONNECTION_RESET_BY_PEER"
  }
}
```

**Timeout Simulation**:
```json
{
  "request": {
    "method": "GET",
    "url": "/api/slow"
  },
  "response": {
    "fixedDelayMilliseconds": 35000,
    "status": 200
  }
}
```

**Malformed Responses**:
```json
{
  "request": {
    "method": "GET",
    "url": "/api/broken"
  },
  "response": {
    "status": 200,
    "body": "{invalid json",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
```

### Probabilistic Responses

Simulate real-world unreliability:

```json
{
  "request": {
    "method": "GET",
    "url": "/api/flaky"
  },
  "responses": [
    {
      "weight": 70,
      "response": {
        "status": 200,
        "body": {"status": "success"}
      }
    },
    {
      "weight": 20,
      "response": {
        "status": 503,
        "body": {"error": "Service unavailable"}
      }
    },
    {
      "weight": 10,
      "response": {
        "fault": "CONNECTION_RESET_BY_PEER"
      }
    }
  ]
}
```

**Behavior**:
- 70% success rate
- 20% service unavailable
- 10% connection reset

Tests verify client handles all scenarios gracefully.

## Contract Testing from Client Perspective

### Consumer-Driven Contracts

Consumer (client) defines expected API behavior:

**Define Consumer Expectations**:
```json
{
  "consumer": "order-service",
  "provider": "product-service",
  "interactions": [
    {
      "description": "Get product by ID",
      "request": {
        "method": "GET",
        "path": "/api/products/123"
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "id": "123",
          "name": "Widget",
          "price": 29.99,
          "inStock": true
        }
      }
    }
  ]
}
```

### Contract Testing Workflow

1. **Consumer Side** (Client Testing):
   ```
   Write consumer test
   → Generate contract file
   → Publish to contract broker
   → Test against mock provider
   ```

2. **Provider Side** (Server Validation):
   ```
   Retrieve contract from broker
   → Replay requests against real API
   → Verify responses match contract
   → Publish verification results
   ```

3. **Integration Check**:
   ```
   Can deploy consumer?
   → Check provider verified contract
   → Deploy if compatible
   → Block if incompatible
   ```

### Consumer Test Example

Test client against contract expectations:

```http
# Consumer expectation
POST /api/orders HTTP/1.1
Content-Type: application/json

{
  "productId": "prod-123",
  "quantity": 2
}

# Expected response
HTTP/1.1 201 Created
Location: /api/orders/order-456
Content-Type: application/json

{
  "orderId": "order-456",
  "status": "PENDING",
  "total": 59.98
}
```

**Test Verification**:
1. Client sends request with expected structure
2. Mock provider returns contract response
3. Client processes response correctly
4. All required fields present and correct types
5. Client logic handles response appropriately

### Contract Evolution

Handle API changes without breaking consumers:

**Adding Optional Field** (Safe):
```json
{
  "response": {
    "status": 200,
    "body": {
      "id": "123",
      "name": "Widget",
      "price": 29.99,
      "inStock": true,
      "newField": "optional value"
    }
  }
}
```

Consumer ignores unknown fields (no contract update needed).

**Removing Required Field** (Breaking):
```json
{
  "response": {
    "status": 200,
    "body": {
      "id": "123",
      "name": "Widget",
      "price": 29.99
      // "inStock" removed - BREAKING CHANGE
    }
  }
}
```

Requires contract update, consumer changes, and coordinated deployment.

**Changing Field Type** (Breaking):
```json
{
  "response": {
    "body": {
      "price": "29.99"  // Changed from number to string - BREAKING
    }
  }
}
```

Contract tests fail, preventing incompatible deployment.

## Chaos Engineering Patterns

### Chaos Engineering for Clients

Test client resilience by injecting failures:

| Chaos Type | Purpose | Client Impact |
|------------|---------|---------------|
| Network latency | Slow connections | Tests timeouts |
| Packet loss | Unreliable network | Tests retries |
| Connection drops | Mid-request failures | Tests recovery |
| Service degradation | Partial failures | Tests fallbacks |
| DNS failures | Name resolution issues | Tests error handling |

### Latency Injection

Introduce network delays:

```http
# Normal request: 50ms response time
GET /api/data HTTP/1.1
→ Response in 50ms

# With latency injection: +5000ms
GET /api/data HTTP/1.1
→ Response in 5050ms

# Client timeout (5s) fires
→ Timeout error
```

**Test Scenarios**:
- Small delays (100-500ms): Verify client patience
- Medium delays (1-5s): Test timeout configuration
- Large delays (10s+): Ensure timeout fires
- Variable delays: Test timeout consistency

### Packet Loss Simulation

Drop random packets:

```
Configuration: 30% packet loss

Request 1: Success (packets delivered)
Request 2: Retry (packets dropped)
Request 3: Success (retry succeeds)
Request 4: Failure (max retries exceeded)
Request 5: Success
```

**Verification**:
1. Client detects packet loss (timeout or reset)
2. Retry logic activates
3. Requests eventually succeed or fail gracefully
4. No hanging requests

### Connection Reset Simulation

Simulate sudden disconnects:

```http
Request:
GET /api/stream HTTP/1.1

Response starts:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {"id": 1},
    {"id": 2},
    # Connection reset here

Error:
Connection reset by peer
```

**Client Should**:
1. Detect connection reset
2. Clean up resources (close streams)
3. Retry if operation is idempotent
4. Return clear error if not retriable

### Service Degradation

Simulate partial service failure:

```http
# 80% of requests succeed
# 20% of requests return 503

Configuration:
Success rate: 80%
Error rate: 20%

Results over 100 requests:
→ 80 successful responses
→ 20 service unavailable errors
```

**Verify Client**:
1. Handles mix of success and failure
2. Retries failures appropriately
3. Circuit breaker responds to error rate
4. Metrics track success/failure rates

### Chaos Testing Tools

Tools for chaos engineering:

**Toxiproxy**:
- Network proxy for fault injection
- Supports latency, packet loss, bandwidth limits
- Works with any protocol

**Chaos Monkey**:
- Randomly terminates services
- Tests client failure handling
- Verifies system recovery

**Gremlin**:
- Comprehensive chaos platform
- Network, state, and resource attacks
- Fine-grained control

**Pattern (Tool-Agnostic)**:
```
1. Define normal baseline metrics
2. Inject controlled chaos
3. Measure client behavior
4. Verify resilience patterns work
5. Document findings
6. Improve weak areas
```

## Network Failure Simulation

### Types of Network Failures

Simulate real network conditions:

| Failure Type | Simulation | Client Test |
|--------------|------------|-------------|
| DNS failure | Return NXDOMAIN | Error handling |
| Connection refused | Port closed | Retry logic |
| Connection timeout | Drop SYN packets | Connection timeout |
| TLS handshake failure | Invalid certificate | TLS error handling |
| HTTP errors | Return 5xx codes | Error recovery |
| Slow network | Rate limiting | Streaming, timeouts |

### DNS Failure Testing

Simulate DNS resolution failures:

```http
Request:
GET http://api.invalid-domain.example/data HTTP/1.1

Error:
DNS resolution failed: NXDOMAIN

Client should:
→ Detect DNS failure
→ Return clear error message
→ Not retry (DNS failures typically not transient)
→ Log failure with context
```

### Connection Refused Testing

Simulate service unavailability:

```http
Request:
GET http://localhost:9999/api/data HTTP/1.1

Error:
Connection refused (port not listening)

Client should:
→ Detect connection refused
→ Retry with backoff (service might restart)
→ Open circuit breaker after threshold
→ Provide clear error context
```

### Partial Response Testing

Simulate incomplete data transfer:

```http
Request:
GET /api/large-dataset HTTP/1.1

Response starts:
HTTP/1.1 200 OK
Content-Length: 10000
Content-Type: application/json

{"data":[{"id":1},{"id":2},{"id":3}
# Connection closes at 500 bytes (of 10000)

Error:
Unexpected end of stream

Client should:
→ Detect incomplete response
→ Compare Content-Length to bytes received
→ Treat as error (not success)
→ Retry if operation idempotent
→ Clear partially received data
```

### Network Partition Testing

Simulate network split:

```
Normal state:
Client → Network → Server
(All requests succeed)

Partitioned state:
Client → X (network partition) X → Server
(All requests fail)

Reconnected state:
Client → Network → Server
(Requests succeed again)
```

**Test Scenarios**:
1. Circuit breaker opens during partition
2. Failed requests don't corrupt state
3. Circuit recovers after reconnection
4. No duplicate requests after recovery

## Test Data Management

### Test Data Strategies

Organize test data effectively:

**Inline Data**:
```json
{
  "test": "Successful product fetch",
  "request": {
    "method": "GET",
    "path": "/api/products/123"
  },
  "response": {
    "status": 200,
    "body": {
      "id": "123",
      "name": "Widget",
      "price": 29.99
    }
  }
}
```

**External Files**:
```
tests/
  fixtures/
    product-success-response.json
    product-not-found-response.json
    order-created-response.json
```

**Builders/Factories**:
```
ProductBuilder()
  .withId("123")
  .withName("Widget")
  .withPrice(29.99)
  .build()
```

### Response Templates

Reusable response patterns:

**Success Template**:
```json
{
  "status": 200,
  "headers": {
    "Content-Type": "application/json",
    "Cache-Control": "max-age=300"
  },
  "body": {
    "id": "{{resourceId}}",
    "type": "{{resourceType}}",
    "status": "success"
  }
}
```

**Error Template**:
```json
{
  "status": "{{errorCode}}",
  "body": {
    "type": "https://api.example.com/errors/{{errorType}}",
    "title": "{{errorTitle}}",
    "status": "{{errorCode}}",
    "detail": "{{errorDetail}}"
  }
}
```

### Scenario-Based Test Data

Organize by testing scenario:

**Happy Path Scenarios**:
```
Scenario: Complete order flow
1. GET /products/123 → 200 OK
2. POST /cart/items → 201 Created
3. POST /orders → 201 Created
4. GET /orders/456 → 200 OK (completed)
```

**Error Scenarios**:
```
Scenario: Product out of stock
1. GET /products/123 → 200 OK (stock: 0)
2. POST /orders → 409 Conflict (out of stock)
```

**Resilience Scenarios**:
```
Scenario: Service recovery
1. GET /products/123 → 503 (service down)
2. Retry after backoff → 503
3. Retry after backoff → 200 OK (recovered)
```

### Dynamic Test Data

Generate data for specific scenarios:

**Random Data**:
```json
{
  "productId": "{{randomUUID}}",
  "timestamp": "{{now}}",
  "price": "{{randomDecimal min=10 max=100}}",
  "quantity": "{{randomInt min=1 max=10}}"
}
```

**Contextual Data**:
```json
{
  "orderId": "order-{{testName}}-{{index}}",
  "requestId": "req-{{timestamp}}-{{randomString}}",
  "correlationId": "{{parentRequestId}}"
}
```

## Best Practices Summary

### Retry Testing

1. **Verify exponential backoff** with timing assertions
2. **Test Retry-After header** compliance
3. **Confirm max retry limits** prevent infinite loops
4. **Validate idempotency key** usage for POST/PATCH
5. **Check non-retriable errors** fail immediately

### Circuit Breaker Testing

1. **Test all state transitions** (CLOSED → OPEN → HALF_OPEN)
2. **Verify failure thresholds** trigger correctly
3. **Confirm success thresholds** before closing
4. **Test timeout periods** between attempts
5. **Validate error type filtering** (4xx vs 5xx)

### Timeout Testing

1. **Test all timeout types** (connection, read, request)
2. **Verify timeout hierarchy** (shortest wins)
3. **Test timeout + retry** interaction
4. **Confirm cleanup** on timeout (no resource leaks)
5. **Validate error messages** identify timeout type

### Mock Server Testing

1. **Use stateful scenarios** for complex flows
2. **Inject faults** to test resilience
3. **Verify request details** (headers, body, timing)
4. **Simulate delays** to test timeouts
5. **Test edge cases** (malformed responses, partial data)

### Contract Testing

1. **Define clear contracts** with required fields
2. **Test contract evolution** (additions, breaking changes)
3. **Verify on both sides** (consumer and provider)
4. **Version contracts** for compatibility tracking
5. **Automate validation** in CI/CD pipeline

### Chaos Engineering

1. **Start with small blast radius** (single service)
2. **Measure baseline metrics** before chaos
3. **Inject one failure type** at a time
4. **Document resilience gaps** discovered
5. **Improve and retest** weak areas

### Network Simulation

1. **Test DNS failures** for error handling
2. **Simulate connection issues** for retry logic
3. **Inject latency** to verify timeouts
4. **Test partial responses** for data validation
5. **Verify cleanup** on network failures

## Testing Checklist

Use this checklist for comprehensive client testing:

### Retry Logic
- [ ] Exponential backoff timing correct
- [ ] Jitter applied to prevent thundering herd
- [ ] Retry-After header respected
- [ ] Max retry limit enforced
- [ ] Idempotency keys used for POST/PATCH
- [ ] Non-retriable errors (4xx) fail immediately
- [ ] Retriable errors (5xx, timeouts) trigger retry

### Circuit Breaker
- [ ] Opens after failure threshold
- [ ] Transitions to half-open after timeout
- [ ] Closes after success threshold
- [ ] Reopens on half-open failure
- [ ] Per-service isolation works
- [ ] Metrics tracked correctly
- [ ] Clear error messages when open

### Timeouts
- [ ] Connection timeout fires correctly
- [ ] Read/socket timeout fires correctly
- [ ] Request timeout fires correctly
- [ ] Timeout hierarchy works (shortest wins)
- [ ] Resources cleaned up on timeout
- [ ] Timeout errors are clear and actionable

### Error Handling
- [ ] Network errors handled gracefully
- [ ] HTTP errors processed correctly
- [ ] Malformed responses detected
- [ ] Partial responses rejected
- [ ] Clear error messages provided
- [ ] Errors logged with context

### Resilience
- [ ] Service degradation handled
- [ ] Network partitions don't corrupt state
- [ ] Recovery after failures works
- [ ] Fallbacks activate when configured
- [ ] No resource leaks under failure

## Related Documentation

### HTTP Client Standards
- **[HTTP Client Best Practices](../advanced-patterns/http-client-best-practices.md)** - Implementation patterns for resilient clients
- **[Idempotency and Safety](../foundations/idempotency-and-safety.md)** - Safe retry operations

### Testing Standards
- **[Documentation Testing](../documentation/documentation-testing.md)** - API documentation validation

### Error Handling
- **[Error Response Standards](../request-response/error-response-standards.md)** - Error formats and RFC 9457
- **[Reactive Error Handling](../advanced-patterns/reactive-error-handling.md)** - Async error patterns

---

[← Back to Testing](./README.md) | [View All API Design Guides](../README.md)
