> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Microservices architecture, HTTP/REST basics  
> **🎯 Key Topics:** Routing, Auth Offload, Resilience, Transformation
> 
> **📊 Complexity:** 9.9 grade level • 1.5% technical density • fairly difficult

## Overview

An API Gateway acts as a single entry point for all clients. It sits between your clients and your backend services. In a microservices architecture, it handles "cross-cutting concerns" that would otherwise be duplicated in every service.

Instead of clients talking to dozens of small services, they talk to one gateway. The gateway then routes, secures, and transforms those requests.

## Gateway vs. Direct Access

Choosing between a gateway and direct service access depends on your architecture's scale and requirements.

### Use an API Gateway When:
- **Multiple Backend Services**: You have a microservices architecture.
- **Cross-Cutting Concerns**: You want to centralize authentication, rate limiting, and logging.
- **API Composition**: You need to aggregate data from multiple services into one response.
- **Protocol Translation**: You need to convert between protocols (e.g., REST to gRPC).
- **Public-Facing APIs**: You need to shield internal services from the public internet.

### Use Direct Access When:
- **Single Service**: You are building a monolith or a single specialized service.
- **Internal Service-to-Service**: Latency is the absolute priority for internal communication.
- **Simple Architecture**: A gateway adds unnecessary complexity and cost.

## Authentication Offload

Authentication offload (or Edge Auth) moves identity validation to the gateway. This removes complex security logic from your backend services.

### The Pattern
1. Client sends a request with a token (JWT, OAuth2) to the Gateway.
2. Gateway validates the token (signature, expiration, scope).
3. Gateway extracts user identity and roles.
4. Gateway forwards the request to the backend with identity headers.

### Identity Headers
Backends should trust headers injected by the gateway, provided they are in a secure internal network.

```http
X-User-ID: user-123
X-User-Email: user@example.com
X-User-Roles: admin, user
X-Tenant-ID: tenant-456
```

**Benefits**:
- **Simpler Backends**: Services only check for presence of trusted headers.
- **Consistent Security**: One place to update auth logic.
- **Reduced Latency**: Invalid tokens are rejected early at the edge.

## Request Transformation

Gateways can modify incoming requests before they reach your services. This helps with compatibility and provides context.

### Common Use Cases
- **Header Injection**: Adding correlation IDs or tenant context.
- **Sanitization**: Removing sensitive client headers before forwarding.
- **Legacy Support**: Transforming old request formats to match new service APIs.
- **Protocol Translation**: Translating a RESTful JSON request to a gRPC call.

### Example Transformation
A client sends a simple request. The gateway adds a correlation ID and tenant context.

```http
# Incoming from Client
GET /api/v1/orders HTTP/1.1
Authorization: Bearer <token>

# Forwarded to Backend
GET /internal/orders HTTP/1.1
X-User-ID: user-123
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
X-Tenant-ID: acme-corp
```

## Response Transformation

Gateways can also shape the response before it returns to the client.

### Key Patterns
- **Response Filtering**: Removing internal-only fields (e.g., database IDs, stack traces).
- **Error Standardization**: Transforming various backend error formats into a consistent standard like RFC 9457.
- **Envelope Wrapping**: Adding a consistent metadata wrapper around response bodies.
- **Response Aggregation**: Combining results from two different services into one JSON object.

### Example: Error Standardization
The backend service might throw a raw exception. The gateway catches it and returns a clean, standard error.

```json
# Backend Response (500)
{ "error": "NullPointerException at OrderService.java:42" }

# Gateway Response to Client (500)
{
  "type": "https://api.example.com/probs/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred. Please use correlation ID 550e8400 to track this issue."
}
```

## Routing Patterns

Routing is the core function of an API Gateway. It determines which backend service should handle a specific request.

### 1. Path-Based Routing
The most common pattern. The URL path determines the destination.
- `/api/v1/orders/*` → `order-service`
- `/api/v1/products/*` → `product-service`

### 2. Header-Based Routing
Routes traffic based on specific headers, useful for versioning or multi-tenancy.
- `X-API-Version: 2` → `service-v2`
- `Accept: application/vnd.api.v2+json` → `service-v2`

### 3. Canary Routing
Splits traffic between different versions of a service.
- **90% traffic** → `stable-version`
- **10% traffic** → `canary-version`

This allows for safe testing of new features in production with limited impact.

## Circuit Breaker Integration

Gateways provide a first line of defense against cascading failures. If a backend service is struggling, the gateway can "trip" the circuit to protect the system.

### How it Works
1. **Failure Threshold**: If a service fails 5 times in 10 seconds, the gateway stops sending traffic to it.
2. **Fast Failure**: The gateway immediately returns a `503 Service Unavailable` or a cached fallback response.
3. **Recovery Timeout**: After a timeout (e.g., 30 seconds), the gateway allows a few "test" requests through (Half-Open state).
4. **Resilience**: This prevents a slow service from consuming all gateway resources (threads/memory).

## Load Balancing and Health Checks

The gateway acts as a load balancer, distributing traffic across multiple instances of your services.

### Load Balancing Strategies
- **Round Robin**: Distributes requests sequentially.
- **Least Connections**: Sends requests to the instance with the fewest active jobs.
- **Weighted Routing**: Directs more traffic to larger or more powerful instances.
- **IP Hash**: Ensures a specific user always hits the same backend instance (Session Affinity).

### Health Checks
- **Active Health Checks**: Gateway periodically pings a `/health` endpoint on each service instance.
- **Passive Health Checks**: Gateway monitors live traffic for failures and removes instances that return consistent errors.

## Centralized Rate Limiting and Caching

Implementing these patterns at the gateway provides consistency across your entire API surface.

### Gateway-Level Rate Limiting
- **Global Policy**: Enforce a "1000 requests per minute" limit across all services.
- **Identity-Based**: Limit users based on their authenticated ID rather than just IP address.
- **Distributed Coordination**: Gateways often use a shared store like Redis to track limits across multiple gateway instances.

### Gateway-Level Caching
- **Shared Cache**: Store responses that are common to many users (e.g., product lists).
- **Reduced Backend Load**: Completely prevents the request from reaching your internal network if a fresh cache exists.
- **Configuration**: Managed via standard `Cache-Control` headers or gateway-specific rules.

## Popular Gateway Options

### Cloud-Native (Managed)
- **AWS API Gateway**: Deep integration with Lambda and AWS ecosystem.
- **Azure API Management**: Strong enterprise and governance features.
- **Google Cloud Apigee**: Advanced analytics and monetization capabilities.

### Self-Hosted (Open Source / Enterprise)
- **Kong**: High-performance, based on Nginx, highly extensible with plugins.
- **Envoy Proxy**: Modern, cloud-native proxy often used as a sidecar or standalone gateway.
- **Nginx / OpenResty**: The industry standard for high-volume proxying.
- **Spring Cloud Gateway**: Built on Spring WebFlux, ideal for Java/Spring environments.
- **Traefik**: Modern HTTP reverse proxy designed for containers and orchestrators.

## Example Flow: Order Retrieval

1. **Client**: Sends `GET /api/v1/orders/123` with a JWT.
2. **Gateway**:
   - Validates JWT signature.
   - Checks Rate Limit (Remaining: 45/100).
   - Injects `X-User-ID: alice`.
   - Injects `X-Correlation-ID: uuid-999`.
   - Routes to `order-service` cluster.
3. **Order Service**: Processes request using `alice` ID, returns JSON.
4. **Gateway**: 
   - Receives response.
   - Filters out internal `db_shard_id` field.
   - Returns clean JSON to Client.

## Resources

- **Industry References**:
  - Kong Gateway Documentation
  - AWS API Gateway Design Patterns
  - Envoy Proxy Architecture
  - Microsoft Azure API Management Patterns
