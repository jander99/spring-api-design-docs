# API Design Review Checklist

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟢 Level:** Accessible
> 
> **📋 Prerequisites:** API design foundations, HTTP basics  
> **🎯 Key Topics:** Resource Design, Security, Breaking Changes, Performance
> 
> **📊 Complexity:** 10.8 grade level • 1.7% technical density • fairly difficult
>
> **Note:** Actionable checklists for production-ready APIs. Focus on consistency and safety.

## Quick Reference

**What is an API Design Review?** A structured process to ensure APIs are consistent, secure, and maintainable before release.

**Key Goals:**
- Prevent breaking changes from reaching production
- Ensure security best practices are followed
- Maintain consistent resource naming and URL structure
- Verify documentation completeness
- Confirm operational readiness

**When to Review:**
1. **Self-Review**: During development
2. **Peer Review**: Before merging code
3. **Security/Architecture Review**: For new APIs or major changes
4. **Pre-Production Review**: Before final deployment

---

## 1. Pre-Release Checklist

Use this checklist to ensure the fundamental design of your API follows industry standards and organizational patterns.

### Resource Design
- [ ] **Nouns, not verbs**: Resources are represented as nouns (e.g., `/orders`) rather than verbs (e.g., `/getOrders`).
- [ ] **Plural names**: Collection resources use plural nouns (e.g., `/customers`, `/products`).
- [ ] **URL Hierarchy**: Paths follow a logical hierarchy (e.g., `/customers/{id}/orders`).
- [ ] **Kebab-case**: URL paths use kebab-case for multi-word segments (e.g., `/shipping-addresses`).
- [ ] **URL-safe IDs**: Resource identifiers are URL-safe and do not contain sensitive information.
- [ ] **No file extensions**: URLs do not include file extensions like `.json` or `.xml`.

### HTTP Methods and Semantics
- [ ] **Correct Verb Usage**:
    - **GET**: Retrieval only, no side effects.
    - **POST**: Creating new resources or non-idempotent actions.
    - **PUT**: Full replacement of a resource (idempotent).
    - **PATCH**: Partial updates to a resource.
    - **DELETE**: Removal of a resource (idempotent).
- [ ] **Idempotency**: GET, PUT, and DELETE endpoints are idempotent.
- [ ] **Safety**: GET, HEAD, and OPTIONS endpoints are safe (no state changes).
- [ ] **Status Codes**: Returns appropriate 2xx, 4xx, and 5xx status codes for all scenarios.

### Request and Response
- [ ] **JSON by default**: Request and response bodies use JSON unless another format is specifically required.
- [ ] **Schema validation**: Request bodies are validated against a defined schema.
- [ ] **ISO 8601**: All date and time fields use the ISO 8601 format (e.g., `2024-07-15T14:32:00Z`).
- [ ] **Enums**: All enum values are documented and validated.
- [ ] **Nullability**: Optional or nullable fields are explicitly marked and handled correctly.
- [ ] **Pagination**: All collection endpoints implement a standard pagination pattern (page-based or cursor-based).
- [ ] **Filtering/Sorting**: Standard parameters are used for filtering and sorting collections.

### Error Handling
- [ ] **RFC 9457**: Error responses follow the Problem Details for HTTP APIs (RFC 9457) format.
- [ ] **Actionable messages**: Error messages provide clear guidance for the client to fix the issue.
- [ ] **No sensitive data**: Error responses do not leak stack traces, database details, or internal server info.
- [ ] **Validation errors**: Field-level validation errors include the specific field path and reason.
- [ ] **Consistent codes**: Standard error types are used across the entire API.

---

## 2. Security Review Criteria

Security must be built into the API design, not added as an afterthought.

### Authentication and Authorization
- [ ] **Authentication required**: All endpoints require authentication unless explicitly documented as public.
- [ ] **OAuth 2.1 / JWT**: Authentication uses modern standards like OAuth 2.1 or JWT.
- [ ] **Token Validation**: Servers validate token expiration, issuer, audience, and signature.
- [ ] **Resource-level Auth (BOLA)**: Authorization checks if the authenticated user has permission for the specific resource ID requested.
- [ ] **Function-level Auth**: Users can only access the methods (GET, POST, etc.) they are permitted to use.
- [ ] **No secrets in URLs**: Sensitive data like tokens or API keys are never passed in query parameters or URL paths.

### Input Protection
- [ ] **Strict Validation**: All input fields (body, query, headers) are validated for type, length, and format.
- [ ] **Size Limits**: Request body size limits are enforced to prevent Denial of Service (DoS) attacks.
- [ ] **Sanitization**: All inputs are sanitized to prevent SQL injection, XSS, and path traversal.
- [ ] **Content-Type check**: The server validates the `Content-Type` header and rejects unsupported types.

### Secure Communication
- [ ] **HTTPS only**: All traffic is encrypted using TLS 1.2 or higher.
- [ ] **Security Headers**: Essential headers are set (e.g., `Strict-Transport-Security`, `X-Content-Type-Options`).
- [ ] **CORS Policy**: Cross-Origin Resource Sharing (CORS) is restricted to trusted origins only.
- [ ] **Rate Limiting**: Rate limits are implemented to protect against brute force and abuse.

---

## 3. Breaking Change Assessment

Identify if your changes will force clients to update their code. If any "Definitely Breaking" boxes are checked, a major version bump is likely required.

### Definitely Breaking (Major Version Bump)
- [ ] Removing or renaming an endpoint
- [ ] Removing or renaming a response field
- [ ] Changing a field's data type
- [ ] Making an optional request parameter required
- [ ] Changing authentication or authorization requirements
- [ ] Changing the semantic meaning of an existing field
- [ ] Removing supported HTTP methods from a resource

### Possibly Breaking (Review Carefully)
- [ ] Adding new required parameters to a request
- [ ] Changing default values for parameters
- [ ] Making validation rules more restrictive
- [ ] Changing the default sort order or pagination behavior
- [ ] Adding new values to an enum (if clients use strict switches)

### Non-Breaking (Safe to Release)
- [ ] Adding a new endpoint
- [ ] Adding a new optional request parameter
- [ ] Adding a new field to a response body
- [ ] Relaxing validation rules to accept more values
- [ ] Adding support for new HTTP methods to an existing resource

---

## 4. Documentation Completeness

Documentation is the UI of your API. It must be accurate and comprehensive.

- [ ] **OpenAPI Specification**: A valid OpenAPI 3.0+ specification is provided.
- [ ] **Descriptions**: Every endpoint, parameter, and field has a clear, human-readable description.
- [ ] **Examples**: Complete, runnable request and response examples are provided for every endpoint.
- [ ] **Authentication Guide**: Clear instructions on how to authenticate and obtain tokens.
- [ ] **Status Codes**: All possible status codes (including errors) are documented for each endpoint.
- [ ] **Changelog**: A summary of changes is included for the current release.
- [ ] **Contact Info**: Technical support or ownership information is provided.

---

## 5. Performance and Operations

Ensure the API can handle production loads and provides visibility into its health.

### Performance Baseline
- [ ] **Response Targets**: P95 and P99 latency targets are defined and met in testing.
- [ ] **Load Testing**: The API has been tested at expected production volumes.
- [ ] **Efficient Queries**: Database queries are optimized, and N+1 query patterns are eliminated.
- [ ] **Caching**: A caching strategy (ETags, `Cache-Control`) is defined where appropriate.
- [ ] **Payload Size**: Large responses are minimized, and compression (gzip/brotli) is supported.

### Operational Readiness
- [ ] **Health Checks**: A `/health` or `/status` endpoint is available for monitoring.
- [ ] **Structured Logging**: Logs use a structured format (e.g., JSON) and include correlation IDs.
- [ ] **Metrics**: Essential metrics (request rate, error rate, latency) are exposed.
- [ ] **Rate Limits**: Rate limit headers (e.g., `X-RateLimit-Remaining`) are returned to clients.
- [ ] **Rollback Plan**: A clear process for reverting changes in case of failure is documented.
- [ ] **Runbooks**: Documentation exists for responding to common alerts or failures.

---

## The Review Process

Follow these steps for every API change.

### Step 1: Self-Review
The developer who designed or implemented the change completes this checklist. This catches obvious issues early.

### Step 2: Peer Design Review
Another engineer reviews the OpenAPI specification and design rationale. Focus on consistency with existing patterns and consumer needs.

### Step 3: Security and Architecture Review
For significant changes or new APIs, a specialized review is required to ensure alignment with security standards and organizational architecture.

### Step 4: Documentation Audit
Verify that the documentation matches the actual implementation. Test the examples to ensure they work as described.

### Step 5: Post-Release Verification
After deployment, monitor production metrics to ensure performance and error rates meet the defined targets.

---

## Industry References

- **Google Cloud API Design Guide**: Best practices for resource-oriented APIs.
- **Microsoft REST API Guidelines**: Comprehensive standards for large-scale API ecosystems.
- **Zalando RESTful API Guidelines**: Modern standards for microservice communication.
- **PayPal API Standards**: Detailed checklists for consistency and security.
- **Stripe API Design**: A gold standard for developer experience and documentation.
