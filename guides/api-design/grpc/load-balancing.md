# gRPC Load Balancing

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic gRPC concepts, networking fundamentals  
> **🎯 Key Topics:** Client-Side Load Balancing, Service Discovery, Proxy Patterns
> 
> **📊 Complexity:** [Pending analysis] • [Pending]% technical density • [Pending]

## Overview

gRPC supports multiple load balancing strategies. This guide covers client-side load balancing, service discovery integration, and proxy-based patterns.

**Key Difference from REST:** gRPC uses long-lived HTTP/2 connections, making traditional L4 load balancing less effective.

## Load Balancing Strategies

### Client-Side (Recommended)

Client maintains connections to all backends and balances requests:

```
         ┌──────────┐
         │  Client  │
         └────┬─────┘
              │
     ┌────────┼────────┐
     │        │        │
┌────▼───┐ ┌─▼────┐ ┌─▼────┐
│Backend1│ │Backend2│ │Backend3│
└────────┘ └──────┘ └──────┘
```

**Benefits:**
- No single point of failure
- Lower latency (direct connections)
- Health-aware routing
- Better resource utilization

### Proxy-Based

Proxy handles load balancing:

```
         ┌──────────┐
         │  Client  │
         └────┬─────┘
              │
         ┌────▼─────┐
         │  Proxy   │
         └────┬─────┘
              │
     ┌────────┼────────┐
     │        │        │
┌────▼───┐ ┌─▼────┐ ┌─▼────┐
│Backend1│ │Backend2│ │Backend3│
└────────┘ └──────┘ └──────┘
```

**Benefits:**
- Centralized control
- Legacy client support
- Advanced routing (header-based, etc.)
- Metrics aggregation

## Client-Side Policies

### Round Robin

Distribute requests evenly across backends:

```yaml
load_balancing_policy: round_robin

# Behavior:
# Request 1 → Backend 1
# Request 2 → Backend 2
# Request 3 → Backend 3
# Request 4 → Backend 1 (cycle)
```

**Use when:**
- Backends have similar capacity
- Requests have similar cost
- Simple distribution needed

### Pick First

Connect to first available backend:

```yaml
load_balancing_policy: pick_first

# Behavior:
# Try Backend 1 → Success, use it
# All requests → Backend 1
# If Backend 1 fails → Try Backend 2
```

**Use when:**
- Failover, not load balancing
- Testing/development
- Cost optimization (minimal connections)

### Weighted Round Robin

Distribute based on backend capacity:

```yaml
load_balancing_policy: weighted_round_robin

backends:
  - address: backend1:9090
    weight: 3  # Gets 3x traffic
  
  - address: backend2:9090
    weight: 2  # Gets 2x traffic
  
  - address: backend3:9090
    weight: 1  # Gets 1x traffic

# Distribution: 3:2:1 ratio
```

**Use when:**
- Heterogeneous backend capacity
- Gradual rollout (canary deployment)
- Cost-based routing

## Service Discovery

### DNS-Based

```yaml
client:
  target: dns:///order-service.default.svc.cluster.local:9090
  
  # DNS returns multiple A records
  # Client creates connection pool
```

**Example DNS response:**
```
order-service.default.svc.cluster.local.
  → 10.1.1.5:9090
  → 10.1.1.6:9090
  → 10.1.1.7:9090
```

**Pros:**
- Standard protocol
- Works everywhere
- Simple setup

**Cons:**
- DNS TTL caching
- No metadata (weights, zones)
- Limited health checking

### Kubernetes

Native service discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  type: ClusterIP  # or LoadBalancer, NodePort
  selector:
    app: order-service
  ports:
  - port: 9090
    protocol: TCP

---
# Client connects to:
# dns:///order-service.default.svc.cluster.local:9090
```

**Built-in features:**
- Automatic endpoint updates
- Health-based routing
- Zone-aware routing

### xDS (Advanced)

Envoy's discovery protocol:

```yaml
client:
  target: xds:///order-service
  
  # xDS server provides:
  # - Backend addresses
  # - Load balancing policy
  # - Health status
  # - Traffic routing rules
  # - Dynamic updates
```

**Use for:**
- Service mesh (Istio, Linkerd)
- Advanced traffic management
- A/B testing, canary deployments

## Connection Management

### Connection Pooling

gRPC reuses HTTP/2 connections:

```yaml
connection_pool:
  # Min connections per backend
  min_connections: 1
  
  # Max connections per backend
  max_connections: 10
  
  # Max concurrent streams per connection
  max_concurrent_streams: 100
```

**Best practice:**
```yaml
# For most use cases:
connections_per_backend: 1-2
# HTTP/2 multiplexing handles concurrency
```

### Keepalive Settings

Maintain connection health:

```yaml
keepalive:
  time: 10s              # Send ping every 10s
  timeout: 5s            # Wait 5s for ping ack
  permit_without_calls: true  # Send pings even when idle
  
  # Server-side
  max_connection_idle: 30m
  max_connection_age: 1h
```

**Prevents:**
- Silent connection failures
- Idle connection closure
- Load balancer timeouts

## Proxy Patterns

### Envoy Proxy

Modern L7 proxy with native gRPC support:

```yaml
clusters:
- name: order_service
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  http2_protocol_options: {}  # Enable HTTP/2
  
  load_assignment:
    cluster_name: order_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend1
              port_value: 9090
      - endpoint:
          address:
            socket_address:
              address: backend2
              port_value: 9090
```

**Features:**
- Health checking
- Circuit breaking
- Retry policies
- Metrics and tracing

### nginx

HTTP/2 proxy for gRPC:

```nginx
upstream grpc_backend {
  server backend1:9090;
  server backend2:9090;
  server backend3:9090;
}

server {
  listen 443 ssl http2;
  
  location / {
    grpc_pass grpc://grpc_backend;
    
    # Timeouts
    grpc_read_timeout 10s;
    grpc_send_timeout 10s;
    
    # Headers
    grpc_set_header X-Real-IP $remote_addr;
  }
}
```

### Service Mesh (Istio)

Automatic sidecar proxy injection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    
    connectionPool:
      http:
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
```

## Traffic Routing

### Header-Based Routing

```yaml
# Route based on metadata
routing:
  - match:
      headers:
        - name: x-api-version
          exact: v2
    route:
      cluster: order_service_v2
  
  - match:  # Default
    route:
      cluster: order_service_v1
```

### Canary Deployment

```yaml
traffic_split:
  - destination: order_service_v1
    weight: 90  # 90% of traffic
  
  - destination: order_service_v2
    weight: 10  # 10% of traffic (canary)
```

### Geographic Routing

```yaml
# Route to nearest zone
locality_lb:
  enabled: true
  priority:
    - locality: us-west-1a  # Prefer same zone
      weight: 100
    - locality: us-west-1b  # Fallback to same region
      weight: 50
    - locality: us-east-1a  # Cross-region fallback
      weight: 10
```

## Best Practices

✅ **Do:**
- Use client-side load balancing when possible
- Configure keepalive
- Implement health checking
- Use service discovery
- Monitor connection metrics
- Set appropriate timeouts

❌ **Avoid:**
- L4 load balancing alone (sticky connections)
- Too many connections per backend
- Missing health checks
- Hardcoded backend addresses
- Infinite connection retries

## Common Issues

### Sticky Connections

**Problem:** One backend gets all traffic

**Cause:** L4 load balancer + long-lived HTTP/2 connections

**Solution:**
- Use client-side load balancing
- Or use L7 proxy (Envoy, nginx)

### Uneven Distribution

**Problem:** Backends receive different load

**Causes:**
- Different request costs
- Streaming connections
- Connection imbalance

**Solutions:**
- Use weighted round robin
- Monitor request latency
- Least-request load balancing

## Related Topics

- [Health Checking](health-checking.md) - Health-aware load balancing
- [Spring Client Configuration](../../../languages/spring/grpc/client-configuration.md) - Java configuration
- [Service Mesh](https://istio.io/latest/docs/ops/deployment/architecture/) - Istio architecture

## Navigation

- [← Health Checking](health-checking.md)
- [Back to gRPC Overview](README.md)
- [Spring Implementation →](../../../languages/spring/grpc/README.md)
