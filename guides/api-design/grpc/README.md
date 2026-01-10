# gRPC for Microservices

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 4 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic HTTP knowledge, distributed systems concepts  
> **🎯 Key Topics:** gRPC, Protocol Buffers, Microservices Communication
> 
> **📊 Complexity:** 10.0 grade level • 1.9% technical density • fairly difficult

## What is gRPC?

gRPC is a high-performance RPC (Remote Procedure Call) framework. It uses Protocol Buffers for data serialization and HTTP/2 for transport. Teams use gRPC for internal microservices communication.

**Key Features:**
- **Fast**: 5-10x faster serialization than JSON
- **Compact**: 30-50% smaller payloads than JSON
- **Streaming**: Native support for real-time data
- **Type-Safe**: Strong typing via Protocol Buffers
- **Cross-Platform**: Generate code for 11+ languages

## When to Use gRPC vs REST

gRPC complements REST. Many teams use both.

| Use Case | Best Choice |
|----------|-------------|
| Public-facing APIs | REST |
| Internal microservices | gRPC |
| Mobile apps (bandwidth-sensitive) | gRPC |
| Browser clients | REST (or gRPC-Web) |
| Real-time streaming | gRPC |
| Simple CRUD operations | REST |
| High-performance requirements | gRPC |

**See full comparison:** [gRPC vs REST Decision Framework](grpc-vs-rest.md)

## Architecture Overview

```
┌─────────────┐                          ┌─────────────┐
│   Client    │                          │   Server    │
│             │                          │             │
│  Generated  │      HTTP/2 Stream       │  Service    │
│   Stub      │◄────────────────────────►│  Impl       │
│             │    Protocol Buffers      │             │
└─────────────┘                          └─────────────┘
       │                                        │
       │                                        │
       └──────────┬─────────────────────────────┘
                  │
           .proto schema
         (contract-first)
```

**gRPC follows a contract-first approach:**
1. Define services and messages in `.proto` files
2. Generate client/server code for your language
3. Implement server logic
4. Call services from clients

## Quick Example

### Service Definition (.proto)

```protobuf
syntax = "proto3";

package orders.v1;

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc ListOrders(ListOrdersRequest) returns (stream Order);
}

message Order {
  string id = 1;
  string customer_id = 2;
  repeated OrderItem items = 3;
  double total = 4;
}

message GetOrderRequest {
  string order_id = 1;
}
```

### gRPC Request (Conceptual)

```http
POST /orders.v1.OrderService/GetOrder HTTP/2
Host: api.example.com
Content-Type: application/grpc+proto
TE: trailers

[Binary Protocol Buffer Data]
```

**See complete example:** [Order Service Proto](examples/order-service.proto)

## Core Concepts

### Protocol Buffers
Language-neutral data format for defining messages and services.

**Learn more:**
- [Schema Design Guide](protobuf-schema-design.md)
- [Naming Style Guide](protobuf-style-guide.md)

### Streaming Patterns
gRPC supports four communication patterns:

| Pattern | Request | Response | Use Case |
|---------|---------|----------|----------|
| Unary | Single | Single | Traditional RPC (like REST) |
| Server Streaming | Single | Stream | Download large datasets, feeds |
| Client Streaming | Stream | Single | Upload data, batch processing |
| Bidirectional | Stream | Stream | Chat, real-time collaboration |

**Learn more:** [Streaming Patterns](streaming-patterns.md)

### Error Handling
gRPC uses 16 canonical status codes with rich error details.

| Code | HTTP Equivalent | When to Use |
|------|-----------------|-------------|
| OK (0) | 200 | Success |
| INVALID_ARGUMENT (3) | 400 | Bad input |
| NOT_FOUND (5) | 404 | Resource missing |
| PERMISSION_DENIED (7) | 403 | No access |
| INTERNAL (13) | 500 | Server error |
| UNAVAILABLE (14) | 503 | Service down |

**Learn more:** [Error Handling](error-handling.md) | [Full Status Code Reference](reference/status-codes.md)

## Production Essentials

### Health Checking
Standard protocol for service health status.

**Protocol:** `grpc.health.v1.Health`

**Learn more:** [Health Checking](health-checking.md)

### Load Balancing
Client-side load balancing with service discovery.

**Supported:**
- Round-robin
- Weighted round-robin
- DNS-based discovery
- Service mesh integration (Istio, Envoy)

**Learn more:** [Load Balancing](load-balancing.md)

### Security
TLS/mTLS required for production.

**Features:**
- Transport encryption (TLS)
- Mutual authentication (mTLS)
- JWT/OAuth 2.0 integration
- Rate limiting

**Learn more:** [Security](security.md)

### Observability
Built-in support for metrics and tracing.

**Integration:**
- OpenTelemetry metrics
- Distributed tracing
- Structured logging
- Health checks

**Learn more:** [Spring Observability](../../../languages/spring/grpc/observability/)

## Learn by Topic

### Fundamentals
- **[gRPC vs REST](grpc-vs-rest.md)** - Decision framework
- **[Protocol Buffer Schema Design](protobuf-schema-design.md)** - Message and service patterns
- **[Style Guide](protobuf-style-guide.md)** - Naming conventions

### Patterns
- **[Error Handling](error-handling.md)** - Status codes and rich errors
- **[Streaming Patterns](streaming-patterns.md)** - Unary, server, client, bidirectional
- **[Versioning](versioning.md)** - Schema evolution strategy

### Operations
- **[Security](security.md)** - TLS, authentication, authorization
- **[Health Checking](health-checking.md)** - Standard health protocol
- **[Load Balancing](load-balancing.md)** - Client-side load balancing

### Resources
- **[Examples](examples/)** - Complete protobuf schemas
- **[Reference](reference/)** - Status codes, standard methods
- **[Troubleshooting](troubleshooting/)** - Common production issues

## Theory to Implementation

Ready to implement gRPC in Spring Boot?

| Theory (This Guide) | Spring Implementation |
|---------------------|----------------------|
| [Schema Design](protobuf-schema-design.md) | [Getting Started](../../../languages/spring/grpc/getting-started.md) |
| [Error Handling](error-handling.md) | [Spring Error Handling](../../../languages/spring/grpc/error-handling.md) |
| [Streaming](streaming-patterns.md) | [Streaming Services](../../../languages/spring/grpc/streaming-services.md) |
| [Security](security.md) | [Spring Security Integration](../../../languages/spring/grpc/security.md) |
| [Health Checking](health-checking.md) | [Actuator Health](../../../languages/spring/grpc/observability/health-checks.md) |

**Start here:** [Spring Boot gRPC Guide](../../../languages/spring/grpc/README.md)

## Industry Adoption

**Usage (Postman 2024 Survey):**
- 29% of developers use gRPC
- 86% use REST
- Many use both (REST for public, gRPC internal)

**Companies using gRPC:**
- Google (internally for all services)
- Netflix (microservices communication)
- Square (payment processing)
- Dropbox (sync engine)
- Cisco (network management)

## Standards and References

### Official Standards
- [gRPC Documentation](https://grpc.io/docs/) - Official gRPC guide
- [Protocol Buffers](https://protobuf.dev/) - Language guide
- [Google API Design Guide](https://cloud.google.com/apis/design) - Design patterns
- [Google AIPs](https://google.aip.dev/) - API Improvement Proposals

### Health and Discovery
- [Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md)
- [Service Config](https://github.com/grpc/grpc/blob/master/doc/service_config.md)

### Implementation
- [gRPC Java](https://github.com/grpc/grpc-java)
- [Spring Boot Integration](https://github.com/grpc-ecosystem/grpc-spring)

## Related Documentation

**[gRPC Comprehensive Guide](../foundations/grpc-guidelines.md)** - In-depth technical guide covering advanced patterns, transcoding to REST, authentication mechanisms, and production deployment strategies (10-minute read, advanced level)

## Navigation

- [← Back to API Design](../README.md)
- [gRPC vs REST →](grpc-vs-rest.md)
- [Spring Implementation →](../../../languages/spring/grpc/README.md)
