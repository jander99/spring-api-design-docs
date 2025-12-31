# API Version Migration Examples

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 12 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge, HTTP fundamentals  
> **🎯 Key Topics:** Versioning, deprecation, migration, backward compatibility
> 
> **📊 Complexity:** 11.4 grade level • 0.8% technical density • fairly difficult

This guide shows complete version migration examples. You'll learn how to evolve APIs from v1 to v2, run versions in parallel, use deprecation headers, and handle client migrations safely.

---

## Patterns Demonstrated

| Pattern | Section | Documentation Reference |
|---------|---------|------------------------|
| URI path versioning | All Examples | [API Version Strategy](../../foundations/api-version-strategy.md) |
| Deprecation headers | Deprecation Headers in Action | [Deprecation Policies](../../reference/versioning/deprecation-policies.md) |
| Breaking vs non-breaking changes | Change Classification | [Version Strategy](../../foundations/api-version-strategy.md#when-to-create-a-new-version) |
| Parallel version deployment | Running Versions in Parallel | [Gateway Considerations](../../foundations/api-version-strategy.md#api-gateway-considerations) |

---

## Breaking vs Non-Breaking Changes

Before migrating, understand which changes require a new version.

### Non-Breaking Changes (Same Version)

These changes work within the current version. Existing clients continue working.

#### Adding Optional Response Fields

```http
GET /v1/customers/cust-123 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Original v1 response:**
```json
{
  "id": "cust-123",
  "name": "Alice Johnson",
  "email": "alice@example.com"
}
```

**Enhanced v1 response (no version change needed):**
```json
{
  "id": "cust-123",
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "loyaltyTier": "gold",
  "memberSince": "2021-03-15"
}
```

Clients that ignore unknown fields continue working. New clients can use the added fields.

#### Adding New Endpoints

```http
GET /v1/customers/cust-123/preferences HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

```json
{
  "customerId": "cust-123",
  "emailNotifications": true,
  "smsNotifications": false,
  "language": "en-US",
  "timezone": "America/New_York"
}
```

New endpoints don't affect existing clients who don't call them.

#### Adding Optional Request Parameters

```http
GET /v1/orders?status=SHIPPED&includeItems=true HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

The new `includeItems` parameter is optional with a default value. Existing requests work unchanged.

---

### Breaking Changes (New Version Required)

These changes require a new major version. They would break existing clients.

#### Removing or Renaming Fields

**v1 Response:**
```json
{
  "id": "order-789",
  "customerName": "Bob Smith",
  "totalAmount": 299.99
}
```

**v2 Response (field renamed):**
```json
{
  "id": "order-789",
  "customer": {
    "id": "cust-456",
    "displayName": "Bob Smith"
  },
  "pricing": {
    "subtotal": 279.99,
    "tax": 20.00,
    "total": 299.99
  }
}
```

The `customerName` and `totalAmount` fields no longer exist. Clients expecting them would fail.

#### Changing Field Types

**v1 Response:**
```json
{
  "id": "event-001",
  "timestamp": 1704067200
}
```

**v2 Response:**
```json
{
  "id": "event-001",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

The `timestamp` changed from integer (Unix epoch) to string (ISO 8601). Client parsing would break.

#### Adding Required Request Fields

**v1 Request:**
```http
POST /v1/products HTTP/1.1
Content-Type: application/json

{
  "name": "Wireless Mouse",
  "price": 29.99
}
```

**v2 Request:**
```http
POST /v2/products HTTP/1.1
Content-Type: application/json

{
  "name": "Wireless Mouse",
  "price": 29.99,
  "categoryId": "cat-electronics",
  "sku": "WM-2024-001"
}
```

v2 requires `categoryId` and `sku`. Existing v1 requests would fail validation.

---

## Complete Migration Example: Customer API v1 to v2

This example shows a full migration lifecycle for a customer management API.

### The Problem

The v1 Customer API has design issues:
- Phone stored as single string (can't handle multiple numbers)
- Address stored flat (inconsistent with other APIs)
- No support for contact preferences

### v1 API (Current)

```http
GET /v1/customers/cust-5839 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: 1

{
  "id": "cust-5839",
  "name": "Maria Garcia",
  "email": "maria.garcia@example.com",
  "phone": "+1-555-0147",
  "street": "456 Oak Avenue",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "createdAt": 1609459200
}
```

### v2 API (New)

```http
GET /v2/customers/cust-5839 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: 2

{
  "id": "cust-5839",
  "profile": {
    "displayName": "Maria Garcia",
    "email": "maria.garcia@example.com"
  },
  "contactInfo": {
    "phones": [
      {
        "type": "mobile",
        "number": "+1-555-0147",
        "primary": true
      },
      {
        "type": "work",
        "number": "+1-555-0199",
        "primary": false
      }
    ],
    "preferredMethod": "email"
  },
  "address": {
    "street": "456 Oak Avenue",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "country": "US"
  },
  "metadata": {
    "createdAt": "2021-01-01T00:00:00Z",
    "updatedAt": "2024-07-15T14:30:00Z",
    "version": 3
  }
}
```

### Key Changes Summary

| v1 Field | v2 Field | Change Type |
|----------|----------|-------------|
| `name` | `profile.displayName` | Restructured |
| `email` | `profile.email` | Restructured |
| `phone` | `contactInfo.phones[]` | Changed to array |
| `street`, `city`, etc. | `address` object | Grouped |
| `zipCode` | `address.postalCode` | Renamed |
| `createdAt` (integer) | `metadata.createdAt` (ISO 8601) | Type changed |
| — | `contactInfo.preferredMethod` | Added |
| — | `address.country` | Added |

---

## Running Versions in Parallel

During migration, both versions run simultaneously. This section shows the operational setup.

### Gateway Routing Configuration

Route requests to the correct backend based on version:

```yaml
# API Gateway configuration
routes:
  - name: customers-v1
    match:
      prefix: /v1/customers
    route:
      cluster: customers-service-v1
      timeout: 30s
    
  - name: customers-v2
    match:
      prefix: /v2/customers
    route:
      cluster: customers-service-v2
      timeout: 30s

clusters:
  - name: customers-service-v1
    endpoints:
      - address: customers-v1.internal
        port: 8080
    health_check:
      path: /health
      interval: 10s
      
  - name: customers-service-v2
    endpoints:
      - address: customers-v2.internal
        port: 8080
    health_check:
      path: /health
      interval: 10s
```

### Version Discovery Endpoint

Clients can discover available versions:

```http
GET / HTTP/1.1
Host: api.example.com
```

```json
{
  "apiName": "Customer API",
  "versions": [
    {
      "version": "v1",
      "status": "deprecated",
      "deprecatedOn": "2024-07-01",
      "sunsetDate": "2025-01-31",
      "documentation": "https://docs.example.com/api/v1",
      "baseUrl": "https://api.example.com/v1"
    },
    {
      "version": "v2",
      "status": "current",
      "releasedOn": "2024-07-01",
      "documentation": "https://docs.example.com/api/v2",
      "baseUrl": "https://api.example.com/v2"
    }
  ],
  "recommended": "v2"
}
```

### Monitoring Both Versions

Track usage metrics for migration planning:

| Metric | v1 Value | v2 Value |
|--------|----------|----------|
| Daily requests | 45,000 | 82,000 |
| Unique clients | 23 | 41 |
| Error rate | 0.3% | 0.1% |
| p99 latency | 245ms | 180ms |

---

## Deprecation Headers in Action

When v2 launches, v1 responses include deprecation headers. These headers inform clients about the migration timeline.

### Initial Deprecation Notice

```http
GET /v1/customers/cust-5839 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: 1
Deprecation: true
Sunset: Fri, 31 Jan 2025 23:59:59 GMT
Link: </v2/customers/cust-5839>; rel="successor-version"
Warning: 299 - "API v1 is deprecated. Migrate to v2 by 2025-01-31. See https://docs.example.com/migrate"

{
  "id": "cust-5839",
  "name": "Maria Garcia",
  "email": "maria.garcia@example.com",
  "phone": "+1-555-0147",
  "street": "456 Oak Avenue",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "createdAt": 1609459200
}
```

### Header Explanation

| Header | Purpose | Client Action |
|--------|---------|---------------|
| `Deprecation: true` | Machine-readable deprecation flag | Log warning, trigger alerts |
| `Sunset: <date>` | When the API will stop working | Schedule migration before date |
| `Link: <url>; rel="successor-version"` | Where to find the replacement | Use this URL for v2 |
| `Warning: 299 - "<message>"` | Human-readable message | Display to developers |

### Approaching Sunset (30 Days Before)

As the sunset date approaches, increase warning urgency:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: 1
Deprecation: true
Sunset: Fri, 31 Jan 2025 23:59:59 GMT
Link: </v2/customers/cust-5839>; rel="successor-version"
Warning: 299 - "URGENT: API v1 sunset in 30 days. Migrate immediately."
X-Deprecation-Days-Remaining: 30

{
  "id": "cust-5839",
  ...
}
```

### After Sunset (410 Gone)

Once sunset passes, return 410 Gone:

```http
GET /v1/customers/cust-5839 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

```http
HTTP/1.1 410 Gone
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/version-sunset",
  "title": "API Version No Longer Available",
  "status": 410,
  "detail": "API v1 was sunset on 2025-01-31. Use v2 instead.",
  "instance": "/v1/customers/cust-5839",
  "sunsetDate": "2025-01-31T23:59:59Z",
  "successor": {
    "version": "v2",
    "url": "/v2/customers/cust-5839",
    "documentation": "https://docs.example.com/api/v2"
  },
  "migrationGuide": "https://docs.example.com/migrate-v1-to-v2"
}
```

---

## Client Migration Scenarios

Different clients have different migration needs. Here are common scenarios.

### Scenario 1: Simple Client Update

A mobile app that only reads customer data.

**Before (v1 client):**
```
REQUEST:
  GET /v1/customers/cust-5839
  
RESPONSE HANDLING:
  customer.name → Display in header
  customer.email → Show in profile
  customer.phone → Format and display
```

**After (v2 client):**
```
REQUEST:
  GET /v2/customers/cust-5839
  
RESPONSE HANDLING:
  customer.profile.displayName → Display in header
  customer.profile.email → Show in profile
  customer.contactInfo.phones[0].number → Format and display
```

**Migration effort:** Low. Update field paths in client code.

### Scenario 2: Integration Service

A billing system that creates and updates customers.

**v1 Create Request:**
```http
POST /v1/customers HTTP/1.1
Content-Type: application/json

{
  "name": "New Customer",
  "email": "new@example.com",
  "phone": "+1-555-0100",
  "street": "123 Main St",
  "city": "Seattle",
  "state": "WA",
  "zipCode": "98101"
}
```

**v2 Create Request:**
```http
POST /v2/customers HTTP/1.1
Content-Type: application/json

{
  "profile": {
    "displayName": "New Customer",
    "email": "new@example.com"
  },
  "contactInfo": {
    "phones": [
      {
        "type": "mobile",
        "number": "+1-555-0100",
        "primary": true
      }
    ],
    "preferredMethod": "email"
  },
  "address": {
    "street": "123 Main St",
    "city": "Seattle",
    "state": "WA",
    "postalCode": "98101",
    "country": "US"
  }
}
```

**Migration effort:** Medium. Restructure request building and response parsing.

### Scenario 3: Batch Processing System

A data warehouse that syncs all customers nightly.

**v1 List and Pagination:**
```http
GET /v1/customers?limit=100&offset=0 HTTP/1.1
```

```json
{
  "customers": [...],
  "total": 5420,
  "limit": 100,
  "offset": 0
}
```

**v2 Cursor Pagination:**
```http
GET /v2/customers?limit=100 HTTP/1.1
```

```json
{
  "data": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6ImN1c3QtMTAwIn0=",
    "totalCount": 5420
  }
}
```

**Migration effort:** High. Pagination logic must change from offset to cursor-based.

---

## Migration Timeline Example

A realistic 6-month migration timeline for the Customer API.

### Month 1: Preparation

| Week | Activity |
|------|----------|
| 1 | Design v2 API contract, get stakeholder review |
| 2 | Create OpenAPI specification for v2 |
| 3 | Build v2 implementation, internal testing |
| 4 | Deploy v2 to staging, integration testing |

### Month 2: Launch

| Week | Activity |
|------|----------|
| 1 | Deploy v2 to production alongside v1 |
| 2 | Add deprecation headers to v1 responses |
| 3 | Publish migration guide and documentation |
| 4 | Notify all registered API consumers |

**Email notification sent to clients:**
```
Subject: Customer API v2 Now Available - v1 Deprecation Notice

The Customer API v2 is now available with improved structure 
and new features.

Key dates:
- v2 available now: https://api.example.com/v2
- v1 deprecated: July 1, 2024
- v1 sunset: January 31, 2025

Please migrate to v2 before the sunset date.
Migration guide: https://docs.example.com/migrate-v1-to-v2
```

### Months 3-4: Active Migration

| Week | Activity |
|------|----------|
| Ongoing | Monitor v1 usage decline |
| Ongoing | Provide migration support via help desk |
| Bi-weekly | Send migration progress reports |
| As needed | Help high-volume clients with migration |

**Weekly dashboard metrics tracked:**
- v1 request volume (target: declining)
- v2 request volume (target: increasing)
- Clients still using v1 (target: approaching zero)
- Migration support tickets (target: decreasing)

### Month 5: Pre-Sunset

| Week | Activity |
|------|----------|
| 1 | Identify remaining v1 clients |
| 2 | Direct outreach to unmigrated clients |
| 3 | Final migration assistance |
| 4 | Add 30-day warning headers |

### Month 6: Sunset

| Week | Activity |
|------|----------|
| 1 | Final reminders to remaining clients |
| 2 | Return 410 Gone for v1 requests |
| 3 | Monitor for issues, provide support |
| 4 | Decommission v1 infrastructure |

---

## Migration Checklist

Use this checklist when planning a version migration.

### Before Launching v2

- [ ] v2 API contract documented in OpenAPI
- [ ] All breaking changes identified and documented
- [ ] v2 implementation complete and tested
- [ ] v2 deployed and accessible alongside v1
- [ ] Migration guide created with before/after examples
- [ ] Client notification template prepared

### At v1 Deprecation

- [ ] Deprecation headers added to all v1 responses
- [ ] Sunset date set (minimum 6 months for public APIs)
- [ ] Documentation updated to mark v1 as deprecated
- [ ] All registered clients notified
- [ ] Monitoring dashboards track v1 vs v2 usage

### During Migration Period

- [ ] Weekly usage reports generated
- [ ] High-volume clients offered migration support
- [ ] FAQ updated with common migration questions
- [ ] Support team trained on migration issues

### At Sunset

- [ ] Final notification sent 30 days before sunset
- [ ] 410 Gone responses configured for v1
- [ ] Support ready for post-sunset questions
- [ ] v1 infrastructure scheduled for decommission

---

## Best Practices

1. **Minimize breaking changes** — Batch multiple breaking changes into one major version
2. **Provide long notice periods** — 6 months minimum for public APIs, 12 months for high-traffic endpoints
3. **Make migration easy** — Provide clear examples, SDKs updates, and migration tools
4. **Monitor relentlessly** — Track migration progress and reach out to stragglers
5. **Keep v1 stable** — Don't add features to deprecated versions, only security fixes
6. **Document everything** — Clear docs reduce support burden significantly
7. **Test both paths** — Ensure v1 and v2 work correctly throughout the migration

---

## Related Documentation

- **Version Strategy**: [API Version Strategy](../../foundations/api-version-strategy.md) — When and how to version
- **Deprecation Reference**: [Deprecation Policies](../../reference/versioning/deprecation-policies.md) — Complete header specifications
- **Troubleshooting**: [Common Problems](../../troubleshooting/versioning/common-problems.md) — Migration issues and solutions
