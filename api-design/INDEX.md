# API Design Topic Index

> Quick reference index for finding specific topics across all documentation.

---

## A

- **Accept Header** - [Content Types](request-response/content-types-and-structure.md), [Headers Reference](quick-reference/headers.md), [Versioning](foundations/api-version-strategy.md)
- **Access Control** - [Security Standards](security/security-standards.md), [Authorization](security/security-standards.md#authorization)
- **Access Token** - [Security Standards](security/security-standards.md#token-types)
- **Adaptive Rate Limiting** - [Rate Limiting](security/rate-limiting-standards.md#adaptive-rate-limiting)
- **Alert Severity** - [Observability](advanced-patterns/api-observability-standards.md#alerting-standards)
- **All-or-Nothing Processing** - [Batch Patterns](advanced-patterns/async-batch-patterns.md#all-or-nothing-processing)
- **API Analytics** - [Analytics & Insights](advanced-patterns/api-analytics-insights.md), [Metrics Taxonomy](advanced-patterns/api-analytics-insights.md#core-metrics-taxonomy)
- **API Catalog** - [Governance](documentation/api-governance.md#api-catalog-and-registry)
- **API Gateway** - [Versioning](foundations/api-version-strategy.md#api-gateway-considerations), [Microservices](advanced-patterns/microservices-integration-patterns.md#api-gateway-patterns)
- **API Lifecycle** - [Lifecycle Management](foundations/api-lifecycle-management.md), [Governance](documentation/api-governance.md#api-lifecycle-status)
- **Async Operations** - [Async Patterns](advanced-patterns/async-batch-patterns.md), [202 Accepted](advanced-patterns/async-batch-patterns.md#the-202-accepted-pattern)
- **Audit Logging** - [Observability](advanced-patterns/api-observability-standards.md#audit-logging-requirements), [Multi-Tenancy](advanced-patterns/multi-tenancy-patterns.md#audit-logging)
- **Authentication** - [Security Standards](security/security-standards.md#authentication), [Headers](quick-reference/headers.md#authentication)
- **Authorization Header** - [Headers Reference](quick-reference/headers.md#authorization-header-formats), [Security](security/security-standards.md)

## B

- **Backpressure** - [Reactive Error Handling](advanced-patterns/reactive-error-handling.md#backpressure-handling), [HTTP Streaming](advanced-patterns/http-streaming-patterns.md#flow-control-and-backpressure)
- **Backward Compatibility** - [Versioning](foundations/api-version-strategy.md#backward-compatibility-rules), [Data Modeling](foundations/data-modeling-standards.md#schema-evolution)
- **Batch Operations** - [Async Patterns](advanced-patterns/async-batch-patterns.md#batch-operations), [URL Structure](foundations/resource-naming-and-url-structure.md#bulk-operations)
- **Bearer Token** - [Security Standards](security/security-standards.md#authentication-headers), [Headers](quick-reference/headers.md#authentication)
- **Boolean Conventions** - [Data Modeling](foundations/data-modeling-standards.md#boolean-conventions)
- **Breaking Changes** - [Versioning](foundations/api-version-strategy.md#when-to-create-a-new-version), [Lifecycle](foundations/api-lifecycle-management.md#breaking-change-process), [Governance](documentation/api-governance.md#types-of-changes)
- **Brotli Compression** - [Performance](advanced-patterns/performance-standards.md#compression)
- **Brute Force Protection** - [Rate Limiting](security/rate-limiting-standards.md#brute-force-protection)

## C

- **Cache-Control** - [Performance](advanced-patterns/performance-standards.md#cache-control-header), [Headers](quick-reference/headers.md#caching)
- **Caching** - [Performance Standards](advanced-patterns/performance-standards.md#http-caching), [Headers](quick-reference/headers.md#caching)
- **camelCase** - [Data Modeling](foundations/data-modeling-standards.md#naming-style)
- **Cancellation** - [Async Patterns](advanced-patterns/async-batch-patterns.md#cancellation)
- **CDN Integration** - [Performance](advanced-patterns/performance-standards.md#cdn-integration)
- **Change Management** - [Governance](documentation/api-governance.md#change-management)
- **Chunked Transfer** - [Streaming APIs](request-response/streaming-apis.md#3-chunked-json---for-traditional-json-arrays)
- **CI/CD Integration** - [CI/CD Integration](documentation/ci-cd-integration.md), [Quality Gates](documentation/ci-cd-integration.md#quality-gates-summary)
- **Circuit Breaker** - [HTTP Client](request-response/http-client-best-practices.md#circuit-breaker-pattern), [Reactive Errors](advanced-patterns/reactive-error-handling.md#circuit-breaker-pattern), [Microservices](advanced-patterns/microservices-integration-patterns.md#circuit-breaker-pattern)
- **Code Generation** - [Development Tooling](documentation/development-tooling.md#code-generation-from-openapi)
- **Contract Testing** - [CI/CD](documentation/ci-cd-integration.md#contract-testing), [Microservices](advanced-patterns/microservices-integration-patterns.md#contract-testing-considerations)
- **Client Errors (4xx)** - [Status Codes](quick-reference/status-codes.md#client-error-codes-4xx), [Error Standards](request-response/error-response-standards.md)
- **Compliance** - [Governance](documentation/api-governance.md#compliance-requirements)
- **Compression** - [Performance](advanced-patterns/performance-standards.md#compression)
- **Conditional Requests** - [Performance](advanced-patterns/performance-standards.md#conditional-requests), [Headers](quick-reference/headers.md#caching)
- **Connection Management** - [HTTP Client](request-response/http-client-best-practices.md#connection-management)
- **Connection Pooling** - [HTTP Client](request-response/http-client-best-practices.md#connection-pooling-concepts)
- **Content Negotiation** - [Content Types](request-response/content-types-and-structure.md), [Headers](quick-reference/headers.md#content-negotiation)
- **Content-Type** - [Content Types](request-response/content-types-and-structure.md#standard-content-type), [Headers](quick-reference/headers.md#content-type-values)
- **Correlation Headers** - [Observability](advanced-patterns/api-observability-standards.md#correlation-headers)
- **CORS** - [Security Standards](security/security-standards.md#cors-configuration), [Headers](quick-reference/headers.md#cors-headers)
- **CQRS** - [Event-Driven](advanced-patterns/event-driven-architecture.md#2-cqrs-command-query-responsibility-segregation)
- **Cursor Pagination** - [Pagination](request-response/pagination-and-filtering.md), [Reference](request-response/reference/pagination/cursor-pagination.md)

## D

- **Data Modeling** - [Data Modeling Standards](foundations/data-modeling-standards.md)
- **Data Privacy** - [Governance](documentation/api-governance.md#data-privacy-considerations)
- **Data Types** - [Data Modeling](foundations/data-modeling-standards.md#data-type-standards)
- **Date Format (ISO 8601)** - [Data Modeling](foundations/data-modeling-standards.md#date-and-time-handling)
- **DDoS Protection** - [Rate Limiting](security/rate-limiting-standards.md#ddos-protection-patterns)
- **Decision Trees** - [Error Status](request-response/error-response-standards.md#status-code-decision-tree), [Pagination](request-response/pagination-and-filtering.md#pagination-strategy-decision-tree), [Versioning](foundations/api-version-strategy.md#version-strategy-decision-tree)
- **DELETE Method** - [HTTP Methods](quick-reference/http-methods.md), [URL Structure](foundations/resource-naming-and-url-structure.md#http-verbs-usage)
- **Deprecation** - [Lifecycle](foundations/api-lifecycle-management.md#deprecation-process), [Versioning](foundations/api-version-strategy.md#deprecation-policy), [OpenAPI](documentation/openapi-standards.md#deprecation-documentation)
- **Deprecation Headers** - [Lifecycle](foundations/api-lifecycle-management.md#http-deprecation-headers)
- **Design Review** - [Governance](documentation/api-governance.md#api-design-review-process)
- **Development Tooling** - [Development Tooling](documentation/development-tooling.md), [Tool Selection](documentation/development-tooling.md#tool-selection-decision-framework)
- **Distributed Tracing** - [Observability](advanced-patterns/api-observability-standards.md#opentelemetry-integration)
- **Distributed Transactions** - [Microservices](advanced-patterns/microservices-integration-patterns.md#distributed-transaction-patterns)
- **Documentation Standards** - [OpenAPI](documentation/openapi-standards.md), [Governance](documentation/api-governance.md#documentation-standards)
- **DPoP (Token Binding)** - [Advanced Security](security/advanced-security-patterns.md#token-security-patterns)
- **Domain Events** - [Event-Driven](advanced-patterns/event-driven-architecture.md#event-types)

## E

- **Envelope Pattern** - [Content Types](request-response/content-types-and-structure.md#choosing-a-response-pattern)
- **Enum Values** - [Data Modeling](foundations/data-modeling-standards.md#enum-values)
- **Error Categories** - [Reactive Errors](advanced-patterns/reactive-error-handling.md#error-categories)
- **Error Codes** - [Error Standards](request-response/error-response-standards.md#common-error-code-patterns)
- **Error Logging** - [Error Standards](request-response/error-response-standards.md#error-logging)
- **Error Recovery** - [HTTP Client](request-response/http-client-best-practices.md#error-recovery-strategies), [Reactive](advanced-patterns/reactive-error-handling.md#recovery-strategies)
- **Error Response** - [Error Standards](request-response/error-response-standards.md), [Status Codes](quick-reference/status-codes.md)
- **ETag** - [Performance](advanced-patterns/performance-standards.md#etag-validation), [Headers](quick-reference/headers.md#caching)
- **Event-Driven Architecture** - [Event-Driven](advanced-patterns/event-driven-architecture.md)
- **Event Sourcing** - [Event-Driven](advanced-patterns/event-driven-architecture.md#1-event-sourcing)
- **Event Structure** - [Event-Driven](advanced-patterns/event-driven-architecture.md#event-structure)
- **Exception Process** - [Governance](documentation/api-governance.md#exception-process)
- **Exponential Backoff** - [HTTP Client](request-response/http-client-best-practices.md#exponential-backoff)

## F

- **Fallback Strategies** - [HTTP Client](request-response/http-client-best-practices.md#fallback-strategies), [Reactive](advanced-patterns/reactive-error-handling.md#fallback-implementation)
- **Field Naming** - [Data Modeling](foundations/data-modeling-standards.md#field-naming-conventions)
- **Filtering** - [Pagination & Filtering](request-response/pagination-and-filtering.md#basic-filtering)
- **Flow Control** - [HTTP Streaming](advanced-patterns/http-streaming-patterns.md#flow-control-and-backpressure), [Reference](reference/streaming/flow-control.md)
- **Forbidden (403)** - [Status Codes](quick-reference/status-codes.md#401-vs-403), [Security](security/security-standards.md)

## G

- **GET Method** - [HTTP Methods](quick-reference/http-methods.md), [URL Structure](foundations/resource-naming-and-url-structure.md#http-verbs-usage)
- **Golden Signals** - [Observability](advanced-patterns/api-observability-standards.md#golden-signals)
- **Governance** - [API Governance](documentation/api-governance.md)
- **Graceful Degradation** - [HTTP Client](request-response/http-client-best-practices.md#graceful-degradation-response)
- **gzip Compression** - [Performance](advanced-patterns/performance-standards.md#compression)

## H

- **HAL/HATEOAS Pattern** - [Content Types](request-response/content-types-and-structure.md#choosing-a-response-pattern)
- **HATEOAS** - [Maturity Model Level 3](maturity-model/level-3/README.md), [Content Types](request-response/content-types-and-structure.md#hateoas-links-optional)
- **Headers** - [Headers Reference](quick-reference/headers.md)
- **Health Checks** - [Observability](advanced-patterns/api-observability-standards.md#health-checks)
- **Heartbeat Events** - [HTTP Streaming](advanced-patterns/http-streaming-patterns.md#sse-connection-management)
- **HTTP/2** - [Performance](advanced-patterns/performance-standards.md#http2-and-http3-considerations)
- **HTTP/3** - [Performance](advanced-patterns/performance-standards.md#http3-advantages)
- **HTTP Client Best Practices** - [HTTP Client](request-response/http-client-best-practices.md)
- **HTTP Methods** - [Methods Reference](quick-reference/http-methods.md), [URL Structure](foundations/resource-naming-and-url-structure.md#http-verbs-usage)
- **HTTP Status Codes** - [Status Codes](quick-reference/status-codes.md), [Error Standards](request-response/error-response-standards.md)
- **HTTP Streaming** - [Streaming Patterns](advanced-patterns/http-streaming-patterns.md), [Streaming APIs](request-response/streaming-apis.md)
- **Hypermedia** - [Maturity Model Level 3](maturity-model/level-3/README.md), [Content Types](request-response/content-types-and-structure.md#hateoas-links-optional)

## I

- **ID Token** - [Security](security/security-standards.md#token-types)
- **Idempotency** - [HTTP Methods](quick-reference/http-methods.md#idempotency-explained), [HTTP Client](request-response/http-client-best-practices.md#idempotency-matters)
- **Idempotency Keys** - [HTTP Client](request-response/http-client-best-practices.md#idempotency-matters)
- **If-Modified-Since** - [Performance](advanced-patterns/performance-standards.md#last-modified-validation), [Headers](quick-reference/headers.md)
- **If-None-Match** - [Performance](advanced-patterns/performance-standards.md#etag-validation), [Headers](quick-reference/headers.md)
- **Internationalization** - [Error Standards](request-response/error-response-standards.md#internationalization)
- **ISO 8601** - [Data Modeling](foundations/data-modeling-standards.md#date-and-time-handling)

## J

- **Jitter** - [HTTP Client](request-response/http-client-best-practices.md#adding-jitter)
- **JSON Merge Patch** - [URL Structure](foundations/resource-naming-and-url-structure.md#patch-method-formats)
- **JSON Patch** - [URL Structure](foundations/resource-naming-and-url-structure.md#patch-method-formats)
- **JSON Schema** - [Data Modeling](foundations/data-modeling-standards.md#json-schema-patterns)
- **JWT** - [Security Standards](security/security-standards.md#token-validation), [Multi-Tenancy](advanced-patterns/multi-tenancy-patterns.md#strategy-4-jwt-claim)

## K

- **kebab-case** - [URL Structure](foundations/resource-naming-and-url-structure.md#resource-naming-conventions)
- **Keep-Alive** - [HTTP Client](request-response/http-client-best-practices.md#keep-alive-connections)
- **Keyset Pagination** - [Pagination](request-response/pagination-and-filtering.md#pagination-strategy-decision-tree)
- **Kubernetes Health Probes** - [Observability](advanced-patterns/api-observability-standards.md#kubernetes-health-probes)

## L

- **Last-Modified** - [Performance](advanced-patterns/performance-standards.md#last-modified-validation), [Headers](quick-reference/headers.md)
- **Latency SLOs** - [Observability](advanced-patterns/api-observability-standards.md#response-time-slos)
- **Leaky Bucket** - [Rate Limiting](security/rate-limiting-standards.md#leaky-bucket)
- **Lifecycle Management** - [API Lifecycle](foundations/api-lifecycle-management.md)
- **Lifecycle Stages** - [Lifecycle](foundations/api-lifecycle-management.md#api-lifecycle-stages)
- **Link Header** - [Headers](quick-reference/headers.md#pagination), [Deprecation](foundations/api-lifecycle-management.md#http-deprecation-headers)
- **Liveness Probe** - [Observability](advanced-patterns/api-observability-standards.md#kubernetes-health-probes)
- **Log Levels** - [Observability](advanced-patterns/api-observability-standards.md#log-level-guidelines)
- **Long-Running Operations** - [Async Patterns](advanced-patterns/async-batch-patterns.md#long-running-operations)

## M

- **Maturity Model** - [Maturity Model](maturity-model/README.md), [Assessment Guide](maturity-model/assessment-guide.md)
- **Merge Patch** - [URL Structure](foundations/resource-naming-and-url-structure.md#patch-method-formats)
- **Metrics** - [Observability](advanced-patterns/api-observability-standards.md#metrics-endpoints), [Analytics](advanced-patterns/api-analytics-insights.md#core-metrics-taxonomy)
- **Microservices** - [Integration Patterns](advanced-patterns/microservices-integration-patterns.md)
- **Mocking Tools** - [Development Tooling](documentation/development-tooling.md#api-mocking-tools-and-patterns)
- **mTLS** - [Advanced Security](security/advanced-security-patterns.md#mutual-tls-mtls-for-api-authentication), [Microservices](advanced-patterns/microservices-integration-patterns.md#inter-service-authentication)
- **Metrics Naming** - [Observability](advanced-patterns/api-observability-standards.md#metric-naming-conventions)
- **Migration Guide** - [Lifecycle](foundations/api-lifecycle-management.md#migration-strategies)
- **Monetary Values** - [Data Modeling](foundations/data-modeling-standards.md#numeric-types)
- **Monitoring** - [Observability](advanced-patterns/api-observability-standards.md), [Performance](advanced-patterns/performance-standards.md#performance-monitoring)
- **Multi-Tenancy** - [Multi-Tenancy Patterns](advanced-patterns/multi-tenancy-patterns.md)
- **Multi-Status (207)** - [Batch Patterns](advanced-patterns/async-batch-patterns.md#partial-success-processing)

## N

- **NDJSON** - [Streaming APIs](request-response/streaming-apis.md#1-ndjson---for-large-data-exports), [Reference](reference/streaming/ndjson-specification.md)
- **Nested Resources** - [URL Structure](foundations/resource-naming-and-url-structure.md#parent-child-relationships-and-domain-boundaries)
- **Non-Breaking Changes** - [Versioning](foundations/api-version-strategy.md#when-to-create-a-new-version), [Data Modeling](foundations/data-modeling-standards.md#safe-non-breaking-changes)
- **Not Found (404)** - [Status Codes](quick-reference/status-codes.md), [Error Standards](request-response/error-response-standards.md)
- **Nullable Fields** - [Data Modeling](foundations/data-modeling-standards.md#nullable-field-handling)

## O

- **OAuth 2.1** - [Security Standards](security/security-standards.md#oauth-21oidc-implementation)
- **Observability** - [Observability Standards](advanced-patterns/api-observability-standards.md)
- **Offset Pagination** - [Pagination](request-response/pagination-and-filtering.md), [Performance](advanced-patterns/performance-standards.md#offset-vs-cursor-performance)
- **OIDC** - [Security Standards](security/security-standards.md#oauth-21oidc-implementation)
- **OpenAPI** - [OpenAPI Standards](documentation/openapi-standards.md)
- **OpenTelemetry** - [Observability](advanced-patterns/api-observability-standards.md#opentelemetry-integration)
- **Operation States** - [Async Patterns](advanced-patterns/async-batch-patterns.md#operation-states)

## P

- **Page Size** - [Pagination](request-response/pagination-and-filtering.md#query-parameters), [Performance](advanced-patterns/performance-standards.md#page-size-recommendations)
- **Pagination** - [Pagination & Filtering](request-response/pagination-and-filtering.md), [Examples](request-response/examples/pagination/complete-examples.md)
- **Pagination Headers** - [Headers](quick-reference/headers.md#pagination)
- **Pagination Metadata** - [Content Types](request-response/content-types-and-structure.md#collection-response-structure), [Data Modeling](foundations/data-modeling-standards.md#pagination-response)
- **Partial Success** - [Batch Patterns](advanced-patterns/async-batch-patterns.md#partial-success-processing)
- **PATCH Method** - [HTTP Methods](quick-reference/http-methods.md), [URL Structure](foundations/resource-naming-and-url-structure.md#patch-method-formats)
- **Payload Optimization** - [Performance](advanced-patterns/performance-standards.md#payload-optimization)
- **Performance** - [Performance Standards](advanced-patterns/performance-standards.md)
- **Polling** - [Async Patterns](advanced-patterns/async-batch-patterns.md#status-polling)
- **POST Method** - [HTTP Methods](quick-reference/http-methods.md), [URL Structure](foundations/resource-naming-and-url-structure.md#http-verbs-usage)
- **Problem Details (RFC 9457)** - [Error Standards](request-response/error-response-standards.md#rfc-9457-problem-details-standard), [Data Modeling](foundations/data-modeling-standards.md#error-response-rfc-9457)
- **Progress Tracking** - [Async Patterns](advanced-patterns/async-batch-patterns.md#progress-tracking)
- **Prometheus Metrics** - [Observability](advanced-patterns/api-observability-standards.md#prometheus-metrics-endpoint)
- **Protocol Recommendations** - [Performance](advanced-patterns/performance-standards.md#protocol-recommendations)
- **Public Paths** - [Security](security/security-standards.md#public-paths)
- **PUT Method** - [HTTP Methods](quick-reference/http-methods.md), [URL Structure](foundations/resource-naming-and-url-structure.md#http-verbs-usage)

## Q

- **Quality Gates** - [Governance](documentation/api-governance.md#quality-gates)
- **Query Parameters** - [URL Structure](foundations/resource-naming-and-url-structure.md#query-parameter-standards), [Filtering](request-response/pagination-and-filtering.md#common-filter-patterns)
- **Quota Management** - [Rate Limiting](security/rate-limiting-standards.md#quota-management)

## R

- **Rate Limit Headers** - [Rate Limiting](security/rate-limiting-standards.md#rate-limit-headers), [Headers](quick-reference/headers.md#rate-limiting)
- **Rate Limiting** - [Rate Limiting Standards](security/rate-limiting-standards.md), [Multi-Tenancy](advanced-patterns/multi-tenancy-patterns.md#rate-limiting-per-tenant)
- **Rate Limiting Strategies** - [Rate Limiting](security/rate-limiting-standards.md#rate-limiting-strategies)
- **Reactive Error Handling** - [Reactive Errors](advanced-patterns/reactive-error-handling.md)
- **Readiness Probe** - [Observability](advanced-patterns/api-observability-standards.md#kubernetes-health-probes)
- **Recovery Strategies** - [Reactive Errors](advanced-patterns/reactive-error-handling.md#recovery-strategies)
- **RED Method** - [Observability](advanced-patterns/api-observability-standards.md#red-method-metrics)
- **Redirection (3xx)** - [Status Codes](quick-reference/status-codes.md#redirection-codes-3xx)
- **Refresh Token** - [Security](security/security-standards.md#token-types)
- **Request Body** - [Content Types](request-response/content-types-and-structure.md#request-payload-structure)
- **Request Correlation** - [Observability](advanced-patterns/api-observability-standards.md#request-correlation-standards)
- **Request Hedging** - [HTTP Client](request-response/http-client-best-practices.md#request-hedging)
- **Request Size Limits** - [Rate Limiting](security/rate-limiting-standards.md#request-size-limits)
- **Required Fields** - [Data Modeling](foundations/data-modeling-standards.md#required-vs-optional-fields)
- **Resource Naming** - [URL Structure](foundations/resource-naming-and-url-structure.md#resource-naming-conventions)
- **Response Time Standards** - [Performance](advanced-patterns/performance-standards.md#response-time-standards)
- **Response Time SLAs** - [Performance](advanced-patterns/performance-standards.md#response-time-slas-by-endpoint-type)
- **REST Principles** - [URL Structure](foundations/resource-naming-and-url-structure.md#core-principles)
- **Retry-After Header** - [HTTP Client](request-response/http-client-best-practices.md#respecting-retry-after), [Rate Limiting](security/rate-limiting-standards.md#rate-limit-headers)
- **Retry Patterns** - [HTTP Client](request-response/http-client-best-practices.md#retry-patterns)
- **RFC 9457** - [Error Standards](request-response/error-response-standards.md#rfc-9457-problem-details-standard)
- **Richardson Maturity Model** - [Maturity Model](maturity-model/README.md)
- **Rollback Planning** - [Lifecycle](foundations/api-lifecycle-management.md#rollback-planning)

## S

- **Safe Methods** - [HTTP Methods](quick-reference/http-methods.md#idempotency-explained)
- **Saga Pattern** - [Event-Driven](advanced-patterns/event-driven-architecture.md#3-saga-pattern), [Microservices](advanced-patterns/microservices-integration-patterns.md#distributed-transaction-patterns)
- **Security Automation** - [Advanced Security](security/advanced-security-patterns.md#security-automation)
- **Security Event Logging** - [Advanced Security](security/advanced-security-patterns.md#security-event-logging-standards)
- **Service Discovery** - [Microservices](advanced-patterns/microservices-integration-patterns.md#service-discovery-patterns)
- **Service Mesh** - [Microservices](advanced-patterns/microservices-integration-patterns.md#service-mesh-considerations)
- **Sampling Strategies** - [Observability](advanced-patterns/api-observability-standards.md#trace-sampling-strategies)
- **Schema Evolution** - [Data Modeling](foundations/data-modeling-standards.md#schema-evolution)
- **Security Headers** - [Security](security/security-standards.md#security-headers), [Headers](quick-reference/headers.md#security)
- **Security Standards** - [Security Standards](security/security-standards.md)
- **Semantic Versioning** - [Versioning](foundations/api-version-strategy.md#semantic-versioning-for-apis)
- **Server Error (5xx)** - [Status Codes](quick-reference/status-codes.md#server-error-codes-5xx)
- **Server-Sent Events (SSE)** - [Streaming APIs](request-response/streaming-apis.md#2-server-sent-events-sse---for-real-time-updates), [HTTP Streaming](advanced-patterns/http-streaming-patterns.md#server-sent-events-sse), [Reference](reference/streaming/sse-specification.md)
- **Server-Timing Header** - [Performance](advanced-patterns/performance-standards.md#server-timing-header)
- **Service Level Objectives (SLOs)** - [Observability](advanced-patterns/api-observability-standards.md#service-level-objectives-slos)
- **Sliding Window** - [Rate Limiting](security/rate-limiting-standards.md#sliding-window)
- **SLI/SLO Calculation** - [Observability](advanced-patterns/api-observability-standards.md#sli-calculation-examples)
- **Soft Delete** - [Data Modeling](foundations/data-modeling-standards.md#soft-delete-pattern)
- **Sorting** - [Pagination](request-response/pagination-and-filtering.md#sorting-parameters)
- **Sparse Fieldsets** - [Performance](advanced-patterns/performance-standards.md#sparse-fieldsets)
- **Status Codes** - [Status Codes Reference](quick-reference/status-codes.md), [Error Standards](request-response/error-response-standards.md#http-status-codes)
- **Streaming APIs** - [Streaming APIs](request-response/streaming-apis.md), [HTTP Streaming](advanced-patterns/http-streaming-patterns.md)
- **Streaming Authentication** - [Security](security/security-standards.md#security-considerations-for-streaming-apis)
- **Streaming Error Handling** - [Reactive Errors](advanced-patterns/reactive-error-handling.md#error-handling-in-streaming)
- **Structured Logging** - [Observability](advanced-patterns/api-observability-standards.md#structured-logging-standards)
- **Subdomain Tenancy** - [Multi-Tenancy](advanced-patterns/multi-tenancy-patterns.md#strategy-2-subdomain)
- **Sunset Header** - [Lifecycle](foundations/api-lifecycle-management.md#http-deprecation-headers), [Deprecation](foundations/api-version-strategy.md#deprecation-policy)
- **Sunset Procedures** - [Lifecycle](foundations/api-lifecycle-management.md#sunset-procedures)

## T

- **Tenant Identification** - [Multi-Tenancy](advanced-patterns/multi-tenancy-patterns.md#tenant-identification-strategies)
- **Tenant Isolation** - [Multi-Tenancy](advanced-patterns/multi-tenancy-patterns.md#data-isolation)
- **Threat Modeling** - [Advanced Security](security/advanced-security-patterns.md#api-threat-modeling-with-stride)
- **Throttling** - [Rate Limiting](security/rate-limiting-standards.md)
- **Timeout Standards** - [HTTP Client](request-response/http-client-best-practices.md#timeout-standards)
- **Token Bucket** - [Rate Limiting](security/rate-limiting-standards.md#token-bucket)
- **Token Refresh** - [Security](security/security-standards.md#token-refresh)
- **Token Types** - [Security](security/security-standards.md#token-types)
- **Token Validation** - [Security](security/security-standards.md#token-validation)
- **Too Many Requests (429)** - [Status Codes](quick-reference/status-codes.md), [Rate Limiting](security/rate-limiting-standards.md)
- **Tracing** - [Observability](advanced-patterns/api-observability-standards.md#opentelemetry-integration)

## U

- **Unauthorized (401)** - [Status Codes](quick-reference/status-codes.md#401-vs-403), [Error Standards](request-response/error-response-standards.md#authentication-error-example)
- **Unprocessable Entity (422)** - [Status Codes](quick-reference/status-codes.md), [Error Standards](request-response/error-response-standards.md#validation-error-example)
- **URI Path Versioning** - [Versioning](foundations/api-version-strategy.md#uri-path-versioning-recommended)
- **URL Structure** - [Resource Naming](foundations/resource-naming-and-url-structure.md)
- **USE Method** - [Observability](advanced-patterns/api-observability-standards.md#use-method-metrics)
- **Usage Analytics** - [Analytics](advanced-patterns/api-analytics-insights.md#api-usage-analytics)
- **User Behavior Tracking** - [Analytics](advanced-patterns/api-analytics-insights.md#user-behavior-tracking)
- **UUID** - [Data Modeling](foundations/data-modeling-standards.md#string-types)

## V

- **Validation** - [Content Types](request-response/content-types-and-structure.md#validation-rules), [Data Modeling](foundations/data-modeling-standards.md#validation-patterns)
- **Validation Errors** - [Error Standards](request-response/error-response-standards.md#validation-error-example)
- **Vary Header** - [Performance](advanced-patterns/performance-standards.md#vary-header-usage), [Headers](quick-reference/headers.md)
- **Version Discovery** - [Versioning](foundations/api-version-strategy.md#version-discovery)
- **Version Headers** - [Headers](quick-reference/headers.md#common-custom-headers)
- **Version Negotiation** - [Versioning](foundations/api-version-strategy.md#version-negotiation-alternatives)
- **Versioning** - [API Version Strategy](foundations/api-version-strategy.md), [Lifecycle](foundations/api-lifecycle-management.md#versioning-in-context)

## W

- **W3C Trace Context** - [Observability](advanced-patterns/api-observability-standards.md#w3c-trace-context-headers)
- **Webhooks** - [Async Patterns](advanced-patterns/async-batch-patterns.md#webhooks)
- **Webhook Retry** - [Async Patterns](advanced-patterns/async-batch-patterns.md#retry-policies)
- **Webhook Signature** - [Async Patterns](advanced-patterns/async-batch-patterns.md#signature-verification)
- **WebSocket** - [HTTP Streaming](advanced-patterns/http-streaming-patterns.md#websocket-integration), [Streaming APIs](request-response/streaming-apis.md)

## X

- **X-Correlation-ID** - [Observability](advanced-patterns/api-observability-standards.md#correlation-headers), [Headers](quick-reference/headers.md)
- **X-RateLimit Headers** - [Rate Limiting](security/rate-limiting-standards.md#standard-headers), [Headers](quick-reference/headers.md#rate-limiting)
- **X-Request-ID** - [Observability](advanced-patterns/api-observability-standards.md#required-headers), [Headers](quick-reference/headers.md)
- **X-Tenant-ID** - [Multi-Tenancy](advanced-patterns/multi-tenancy-patterns.md#strategy-3-request-header)

## Z

- **Zero-Trust Architecture** - [Advanced Security](security/advanced-security-patterns.md#zero-trust-architecture-principles)

---

## Document Quick Reference

| Document | Primary Topics |
|----------|----------------|
| [api-version-strategy.md](foundations/api-version-strategy.md) | Versioning, deprecation, breaking changes |
| [api-lifecycle-management.md](foundations/api-lifecycle-management.md) | Lifecycle stages, sunset, migration |
| [resource-naming-and-url-structure.md](foundations/resource-naming-and-url-structure.md) | URLs, HTTP methods, REST design |
| [data-modeling-standards.md](foundations/data-modeling-standards.md) | JSON schema, field naming, types |
| [content-types-and-structure.md](request-response/content-types-and-structure.md) | Request/response format, envelopes |
| [error-response-standards.md](request-response/error-response-standards.md) | RFC 9457, status codes, validation |
| [pagination-and-filtering.md](request-response/pagination-and-filtering.md) | Pagination, filtering, sorting |
| [streaming-apis.md](request-response/streaming-apis.md) | NDJSON, SSE, chunked responses |
| [http-client-best-practices.md](request-response/http-client-best-practices.md) | Retries, timeouts, circuit breakers |
| [security-standards.md](security/security-standards.md) | OAuth, authentication, CORS |
| [rate-limiting-standards.md](security/rate-limiting-standards.md) | Rate limits, throttling, DDoS |
| [async-batch-patterns.md](advanced-patterns/async-batch-patterns.md) | Long-running ops, webhooks, batch |
| [event-driven-architecture.md](advanced-patterns/event-driven-architecture.md) | Events, CQRS, sagas |
| [http-streaming-patterns.md](advanced-patterns/http-streaming-patterns.md) | SSE, WebSocket, flow control |
| [multi-tenancy-patterns.md](advanced-patterns/multi-tenancy-patterns.md) | Tenant isolation, routing |
| [performance-standards.md](advanced-patterns/performance-standards.md) | Caching, compression, HTTP/2 |
| [api-observability-standards.md](advanced-patterns/api-observability-standards.md) | Health checks, metrics, tracing |
| [reactive-error-handling.md](advanced-patterns/reactive-error-handling.md) | Backpressure, recovery patterns |
| [openapi-standards.md](documentation/openapi-standards.md) | OpenAPI 3.1, documentation |
| [api-governance.md](documentation/api-governance.md) | Reviews, quality gates, compliance |
| [ci-cd-integration.md](documentation/ci-cd-integration.md) | Pipelines, testing, deployment |
| [development-tooling.md](documentation/development-tooling.md) | Tools, linting, code generation |
| [advanced-security-patterns.md](security/advanced-security-patterns.md) | Zero-trust, mTLS, threat modeling |
| [microservices-integration-patterns.md](advanced-patterns/microservices-integration-patterns.md) | Service mesh, circuit breakers, sagas |
| [api-analytics-insights.md](advanced-patterns/api-analytics-insights.md) | Usage metrics, dashboards, privacy |
| [maturity-model/](maturity-model/README.md) | Richardson levels, assessment |
| [quick-reference/](quick-reference/README.md) | HTTP methods, status codes, headers |
