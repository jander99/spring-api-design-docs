# gRPC Health Checking

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 4 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic gRPC concepts  
> **🎯 Key Topics:** Health Protocol, Service Monitoring, Kubernetes Integration
> 
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

## Overview

gRPC defines a standard health checking protocol for monitoring service availability. This guide shows how to implement and use health checks.

**Key Standard:** `grpc.health.v1.Health`

## Health Protocol

### Service Definition

```protobuf
syntax = "proto3";

package grpc.health.v1;

service Health {
  // Check service health
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  
  // Watch service health (streaming)
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}

message HealthCheckRequest {
  // Service name to check
  // Empty string checks overall server health
  string service = 1;
}

message HealthCheckResponse {
  enum ServingStatus {
    UNKNOWN = 0;
    SERVING = 1;
    NOT_SERVING = 2;
    SERVICE_UNKNOWN = 3;  // Service name not recognized
  }
  ServingStatus status = 1;
}
```

**See complete definition:** [Health Check Proto](examples/health-check.proto)

## Health Status Meanings

| Status | Meaning | When to Use |
|--------|---------|-------------|
| `SERVING` | Service is healthy and ready | Normal operation |
| `NOT_SERVING` | Service is unavailable | Startup, shutdown, overload |
| `UNKNOWN` | Health state unknown | Initialization, error state |
| `SERVICE_UNKNOWN` | Service name not recognized | Invalid service name |

## Check Method (Unary)

### Request Format

**Check overall server health:**
```yaml
service: ""  # Empty string
```

**Check specific service:**
```yaml
service: "orders.v1.OrderService"
```

### Response Examples

**Healthy service:**
```yaml
status: SERVING
```

**Unhealthy service:**
```yaml
status: NOT_SERVING
```

**Unknown service:**
```yaml
status: SERVICE_UNKNOWN
```

### Use Cases

**Load balancer health probe:**
```yaml
# Every 5 seconds
probe:
  type: grpc
  service: ""
  interval: 5s
  timeout: 2s
  unhealthy_threshold: 2
  healthy_threshold: 1
```

**Kubernetes liveness probe:**
```yaml
livenessProbe:
  grpc:
    port: 9090
    service: ""  # Overall health
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 2
  failureThreshold: 3
```

**Kubernetes readiness probe:**
```yaml
readinessProbe:
  grpc:
    port: 9090
    service: "orders.v1.OrderService"
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 2
  failureThreshold: 2
```

## Watch Method (Streaming)

### Streaming Updates

**Client subscribes to health changes:**
```
Client ──Watch("")──────────────> Server
Client <─SERVING──────────────── Server
       (time passes)
Client <─NOT_SERVING────────────── Server
       (recovery)
Client <─SERVING──────────────── Server
```

### Use Cases

**Proactive client-side load balancing:**
```yaml
# Client watches health
# Removes unhealthy servers immediately
# No delay waiting for next probe

client:
  health_watch:
    enabled: true
    services:
      - "orders.v1.OrderService"
      - "payments.v1.PaymentService"
```

**Dashboard monitoring:**
```yaml
# Real-time service status
monitor:
  watch_services:
    - ""  # Overall
    - "orders.v1.OrderService"
    - "inventory.v1.InventoryService"
  
  update_interval: realtime
  alert_on: NOT_SERVING
```

## Implementation Patterns

### Overall Server Health

**Check:**
- Server is running
- Critical resources available
- Not shutting down

**Example logic:**
```yaml
overall_health:
  checks:
    - server_started: true
    - not_shutting_down: true
  
  result:
    if all_checks_pass:
      status: SERVING
    else:
      status: NOT_SERVING
```

### Service-Specific Health

**Check:**
- Service registered
- Dependencies available
- No circuit breakers open

**Example logic:**
```yaml
service_health:
  service_name: "orders.v1.OrderService"
  
  checks:
    - database_connection: OK
    - cache_connection: OK
    - dependent_services:
        - inventory_service: SERVING
        - payment_service: SERVING
  
  result:
    if all_dependencies_healthy:
      status: SERVING
    else:
      status: NOT_SERVING
```

### Dependency Checks

**Shallow check (fast):**
```yaml
shallow:
  - database_pool_has_connections: true
  - cache_reachable: true
  - disk_space_available: true
```

**Deep check (slower, periodic):**
```yaml
deep:
  - database_query_test: SELECT 1
  - cache_read_write_test: true
  - external_api_ping: true
```

**Recommendation:** Use shallow for frequent checks, deep for periodic validation.

## Kubernetes Integration

### Pod Health Checks

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: order-service
spec:
  containers:
  - name: grpc-service
    image: order-service:1.0
    ports:
    - containerPort: 9090
      name: grpc
    
    # Liveness: Restart if fails
    livenessProbe:
      grpc:
        port: 9090
        service: ""
      initialDelaySeconds: 10
      periodSeconds: 10
      failureThreshold: 3
    
    # Readiness: Remove from service if fails
    readinessProbe:
      grpc:
        port: 9090
        service: "orders.v1.OrderService"
      initialDelaySeconds: 5
      periodSeconds: 5
      failureThreshold: 2
    
    # Startup: Allow slow startup
    startupProbe:
      grpc:
        port: 9090
        service: ""
      initialDelaySeconds: 0
      periodSeconds: 2
      failureThreshold: 30  # 60 seconds max startup
```

### Probe Differences

| Probe | Purpose | Failure Action |
|-------|---------|----------------|
| **Startup** | Wait for slow initialization | Delays other probes |
| **Liveness** | Detect deadlock/crash | Restart container |
| **Readiness** | Detect temporary unavailability | Remove from service |

**Typical flow:**
```
Container starts
  → Startup probe runs (allow 60s)
  → Success
  → Liveness + Readiness start
    → Both succeed
    → Pod receives traffic

If Readiness fails:
  → Remove from load balancer
  → Keep container running
  → Retry readiness probe

If Liveness fails:
  → Restart container
  → Start over
```

## Load Balancer Integration

### gRPC Load Balancer Health

**Envoy configuration:**
```yaml
clusters:
- name: order_service
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  
  # Health checking
  health_checks:
  - timeout: 2s
    interval: 5s
    unhealthy_threshold: 2
    healthy_threshold: 1
    
    # gRPC health check
    grpc_health_check:
      service_name: "orders.v1.OrderService"
      authority: "orders.example.com"
```

**nginx configuration:**
```nginx
upstream grpc_backend {
  server backend1:9090;
  server backend2:9090;
  
  # Health check
  check interval=5s rise=1 fall=2;
  check_grpc_health grpc.health.v1.Health;
}
```

## Health Check Patterns

### Startup Sequence

```
1. Server starts listening
   Status: NOT_SERVING

2. Load configuration
   Status: NOT_SERVING

3. Connect to database
   Status: NOT_SERVING

4. Warm up caches
   Status: NOT_SERVING

5. All systems ready
   Status: SERVING ✓
```

### Graceful Shutdown

```
1. Receive SIGTERM
   Status: SERVING → NOT_SERVING

2. Stop accepting new requests
   Health checks fail

3. Complete in-flight requests
   Allow up to 30s

4. Close connections
   Drain complete

5. Exit process
   Status: (process stopped)
```

**Kubernetes grace period:**
```yaml
terminationGracePeriodSeconds: 30

# Shutdown sequence:
# 1. Set health to NOT_SERVING
# 2. Kubernetes removes from service (based on readiness)
# 3. Wait for in-flight requests (up to 30s)
# 4. Kubernetes sends SIGKILL if not exited
```

## Monitoring and Alerting

### Metrics to Track

```yaml
metrics:
  - health_check_total{status="SERVING"}
  - health_check_total{status="NOT_SERVING"}
  - health_check_duration_seconds
  - dependency_health{dependency="database"}
  - dependency_health{dependency="cache"}
```

### Alert Rules

```yaml
alerts:
  - name: service_unhealthy
    expr: health_check_total{status="NOT_SERVING"} > 0
    duration: 1m
    severity: critical
  
  - name: health_check_slow
    expr: health_check_duration_seconds > 1.0
    duration: 5m
    severity: warning
  
  - name: dependency_unhealthy
    expr: dependency_health < 1
    duration: 30s
    severity: warning
```

## Best Practices

✅ **Do:**
- Implement standard health protocol
- Check critical dependencies
- Return quickly (< 1 second)
- Use separate liveness and readiness
- Set NOT_SERVING during shutdown
- Monitor health check metrics

❌ **Avoid:**
- Expensive checks (database scans)
- External API calls in health checks
- Returning SERVING during shutdown
- Ignoring health check failures
- Not implementing health checks

## Common Issues

### False Positives

**Problem:** Health check passes but service is broken

**Causes:**
- Shallow checks don't catch real issues
- Not checking critical dependencies
- Caching health status too long

**Solution:**
- Add dependency checks
- Include critical path validation
- Refresh health status frequently

### False Negatives

**Problem:** Health check fails but service is fine

**Causes:**
- Timeout too short
- Temporary network blip
- Dependency hiccup

**Solution:**
- Increase timeout
- Add retry logic
- Use unhealthy threshold > 1

## Related Topics

- [Spring Actuator Integration](../../../languages/spring/grpc/observability/health-checks.md) - Java implementation
- [Kubernetes Configuration](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Load Balancing](load-balancing.md) - Health-aware load balancing

## Navigation

- [← Security](security.md)
- [Load Balancing →](load-balancing.md)
- [Back to gRPC Overview](README.md)
