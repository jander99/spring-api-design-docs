# Multi-Tenancy Patterns

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 7 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API and Security knowledge  
> **🎯 Key Topics:** Tenant isolation, data segregation, tenant identification
> 
> **📊 Complexity:** 10.5 grade level • 1.0% technical density • fairly difficult

## Overview

Multi-tenancy allows a single instance of an application to serve multiple customers (tenants). It is a core requirement for Software-as-a-Service (SaaS) and enterprise platforms. This guide covers how to design APIs that safely isolate data and resources across different tenants.

## Why Multi-Tenancy is Critical

In a SaaS environment, failing to isolate tenants is a catastrophic security risk.

**Security Risk Example**: A user from Tenant A discovers they can access sensitive reports from Tenant B by simply changing an ID in the URL. This is called Broken Object Level Authorization (BOLA). It can lead to massive data breaches and legal consequences.

**Core Benefits**:
- **Scalability**: Shared infrastructure reduces operational overhead.
- **Efficiency**: Higher resource utilization across many customers.
- **Maintenance**: Update one application instance to benefit all tenants.
- **Compliance**: Meets enterprise requirements for data isolation and GDPR.

## Tenant Isolation Strategies

Isolation prevents one tenant from accessing or affecting another tenant's data and performance.

### 1. Database-Level Isolation

You must choose an isolation level based on your security, cost, and complexity requirements.

| Strategy | Isolation | Cost | Complexity | Use Case |
|----------|-----------|------|------------|----------|
| **Database-per-tenant** | Highest | High | High | Highly regulated industries (Banking, Health) |
| **Schema-per-tenant** | Medium | Medium | Medium | Enterprise SaaS with strong isolation needs |
| **Shared-database (Table-level)** | Lowest | Low | Low | High-volume, low-margin B2C or B2B SaaS |

- **Database-per-tenant**: Each tenant has their own physical database. This provides the strongest isolation and makes data deletion simple.
- **Schema-per-tenant**: Tenants share a database but have separate logical schemas. This balances isolation and resource sharing.
- **Shared-database**: All tenants share the same tables. Every row includes a `tenant_id` column. This is the most cost-effective but requires the most care in your application code.

### 2. Application-Level Isolation

The application layer must enforce isolation regardless of the database strategy.

- **Tenant Context Propagation**: Pass the identified tenant ID through every layer of your service (Controllers -> Services -> Repositories).
- **Automatic Query Filtering**: Use frameworks that automatically append `WHERE tenant_id = ?` to every database query.
- **Per-Tenant Caching**: Never share cache keys across tenants. Prefix every cache key with the tenant ID (e.g., `tenant-123:user-456`).
- **Connection Management**: If using separate databases or schemas, switch the database connection dynamically based on the current tenant context.

### 3. Infrastructure-Level Isolation

Protect performance by isolating compute resources.

- **Namespaces**: In Kubernetes, use separate namespaces for different tiers of tenants.
- **Resource Quotas**: Prevent a "noisy neighbor" (one high-usage tenant) from consuming all CPU or memory and slowing down other tenants.
- **Separate Deployments**: For ultra-premium tenants, consider deploying a completely separate instance of your API on dedicated infrastructure.

## Tenant Identification Patterns

Your API must know which tenant is making a request. Choose a pattern that fits your architectural style.

### JWT Claim-Based (Best Practice)

Include the `tenant_id` inside the cryptographically signed JWT. This is the most secure method because the client cannot tamper with the ID.

```json
// JWT Payload
{
  "sub": "user-123",
  "tenant_id": "acme-corp",
  "roles": ["admin"],
  "exp": 1735689600
}
```

**Why it works**: Your API validates the JWT signature. Once validated, you can trust the `tenant_id` claim completely.

### Header-Based Identification

The client sends a custom header with each request. This is common when one user belongs to multiple tenants (e.g., a consultant switching between clients).

```http
GET /v1/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJ...
X-Tenant-ID: acme-corp
```

### Subdomain-Based Identification

Assign each tenant a unique subdomain. This is excellent for branding and cookie isolation.

```http
GET /v1/orders HTTP/1.1
Host: acme.api.example.com
Authorization: Bearer eyJ...
```

### Path-Based Identification

Include the tenant ID directly in the URL path. This makes the multi-tenancy explicit in the API contract.

```http
GET /v1/tenants/acme-corp/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJ...
```

**Warning**: Avoid path-based identification if you want to keep the tenant ID hidden from the URL for aesthetic or security reasons.

## Data Segregation and Security

### Preventing Cross-Tenant Access (BOLA)

Never trust the `tenant_id` provided in a request header or URL without validating it against the authenticated user's session.

**The Validation Rule**:
1. Identify the user via their JWT/Token.
2. Identify the requested tenant via path/header/claim.
3. **Verify** that the user actually belongs to that tenant.
4. If they do not, return `403 Forbidden` (or `404 Not Found` to hide the existence of the resource).

### Row-Level Security (RLS)

If using databases like PostgreSQL, use Row-Level Security. This moves the isolation logic into the database itself, acting as a final safety net if your application code misses a filter.

### Data Lifecycle Management

Multi-tenancy complicates data management over time.

- **Encryption**: Use different encryption keys for each tenant's sensitive data.
- **Backup Isolation**: Ensure backups can be restored for a single tenant without overwriting others.
- **Tenant Offboarding**: When a tenant leaves, you must be able to delete all their data across all tables to comply with GDPR "Right to Erasure."

## Tenant-Specific Rate Limiting

Standard rate limiting applies to everyone equally. In multi-tenant systems, you must prevent one tenant from exhausting your API capacity.

**Fair Use Scopes**:
- **Per Tenant overall**: Limit the total load a single company can place on your system.
- **Per User within Tenant**: Ensure one aggressive user in "Company A" doesn't block their own colleagues.
- **Tiered Limits**: Give "Premium" tenants higher limits than "Free" tenants.

```http
HTTP/1.1 200 OK
RateLimit: limit=5000, remaining=4999, reset=3600
RateLimit-Policy: 5000;w=3600;tenant="acme-corp"
```

## Tenant Configuration and Settings

Tenants often need different configurations for the same API.

### Settings API

Provide an endpoint where tenant administrators can manage their specific configurations.

```http
GET /v1/tenants/current/settings HTTP/1.1
Authorization: Bearer eyJ...

{
  "tenant_id": "acme-corp",
  "name": "Acme Corporation",
  "settings": {
    "rate_limit": 10000,
    "allowed_ips": ["1.2.3.4", "5.6.7.8"],
    "features": ["advanced_analytics", "bulk_export"],
    "data_retention_days": 365
  }
}
```

### Feature Flags

Use feature flags to enable or disable specific API endpoints or fields based on the tenant's subscription level. This allows you to run one codebase while serving different functional tiers.

## Tenant Lifecycle Management

### Onboarding

Design a programmatic way to provision new tenants.

1. **Request**: `POST /v1/tenants` with name and plan.
2. **Action**: Create database/schema, provision storage, set default rate limits.
3. **Response**: Return the new tenant ID and setup URL.

### Offboarding and GDPR

When a tenant closes their account, your API should support a graceful exit.

- **Data Export**: Provide a way for tenants to download all their data before it is deleted.
- **Hard Deletion**: Implement a background job that securely wipes all rows associated with the `tenant_id`.
- **Audit Logging**: Preserve security logs for legal reasons, even after the operational data is gone.

## Example HTTP Interactions

### Scenario 1: Accessing Data with JWT Claim

```http
GET /v1/invoices HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

HTTP/1.1 200 OK
Content-Type: application/json
X-Tenant-ID: acme-corp

[
  { "id": "inv_1", "amount": 100.00, "status": "paid" },
  { "id": "inv_2", "amount": 250.00, "status": "pending" }
]
```

### Scenario 2: Attempting Cross-Tenant Access (BOLA Attack)

```http
# User belongs to 'acme-corp', but tries to access 'globex' path
GET /v1/tenants/globex/orders/ord_999 HTTP/1.1
Authorization: Bearer eyJ... (acme-corp token)

HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/access-denied",
  "title": "Forbidden",
  "status": 403,
  "detail": "You do not have permission to access resources in tenant 'globex'."
}
```

## Industry References

- **Microsoft Azure**: [Multi-tenant architecture patterns](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)
- **AWS SaaS Factory**: [SaaS Tenant Isolation Strategies](https://d1.awsstatic.com/whitepapers/saas-tenant-isolation-strategies.pdf)
- **Salesforce**: [Multi-tenant architecture design](https://developer.salesforce.com/docs/atlas.en-us.multi_tenant_architecture.meta/multi_tenant_architecture/multi_tenant_architecture_introduction.htm)
- **PostgreSQL**: [Row Level Security Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

[← Back to Advanced Patterns](./README.md) | [View All API Design Guides](../README.md)
