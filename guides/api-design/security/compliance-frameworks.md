# Compliance Frameworks

## Overview

Some APIs operate in regulated environments. If your API processes personal data, health data, or payment data, you may need to meet external compliance requirements.

This document describes common compliance frameworks and how they affect API design. It focuses on API-visible patterns: endpoints, request/response behavior, auditing, retention, and privacy controls.

> **Important**
> This guide is not legal advice. Use it to shape API contracts and operational controls, then validate with your compliance and legal teams.

## Scope and assumptions

- This guide uses generic HTTP and JSON examples only.
- Compliance requirements vary by organization, geography, and data flows.
- Many controls are shared across frameworks (access control, logging, encryption, change control).

## Common building blocks

These API design building blocks show up in most compliance programs:

- **Data classification**: Identify personal data, PHI, cardholder data, and other sensitive classes.
- **Least privilege**: Minimize access by default and grant only what is needed.
- **Auditability**: Provide evidence that access and changes are tracked.
- **Retention and deletion**: Control how long data exists and how it is removed.
- **Transparency**: Make it clear what data is collected and why.
- **Incident readiness**: Detect and respond to misuse or breaches.

---

## 1. GDPR patterns (EU/EEA privacy)

GDPR applies when you process personal data of people in the EU/EEA (and, in many cases, when offering goods/services to them or monitoring their behavior).

From an API design perspective, GDPR shows up as:

- Data subject rights (access, rectification, erasure, portability)
- Consent and lawful basis tracking
- Purpose limitation and data minimization
- Transparency and traceability

### Data subject rights

A practical way to support rights requests is to provide dedicated endpoints and workflows.

#### Right of access (data export / personal data view)

Provide an endpoint that returns the personal data you hold about a person in a clear, structured format.

```http
GET /v1/users/user-123/personal-data HTTP/1.1
Accept: application/json
Authorization: Bearer {access_token}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user_id": "user-123",
  "generated_at": "2026-01-10T12:00:00Z",
  "data": {
    "profile": {
      "name": "A. Example",
      "email": "a@example.com",
      "phone": "+1-555-0100"
    },
    "addresses": [
      {
        "type": "shipping",
        "line1": "123 Main St",
        "city": "Exampleville",
        "region": "CA",
        "postal_code": "94105",
        "country": "US"
      }
    ],
    "preferences": {
      "marketing": true,
      "analytics": false
    }
  }
}
```

Design notes:

- Return only data the requester is authorized to access.
- Keep the response schema stable so clients can store or re-use exports.
- Consider pagination if the dataset is large.

#### Right to rectification (correcting personal data)

Allow updates to personal data with clear validation and audit logging.

```http
PATCH /v1/users/user-123 HTTP/1.1
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "email": "new-email@example.com",
  "phone": "+1-555-0199"
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user_id": "user-123",
  "updated_at": "2026-01-10T12:01:00Z"
}
```

Design notes:

- Validate ownership and authorization before applying updates.
- Consider field-level permissions (for example, users can change contact data but not verified identity attributes).

#### Right to erasure (deletion)

Deletion is often a workflow rather than an immediate hard delete. Design the endpoint to communicate that clearly.

```http
DELETE /v1/users/user-123/personal-data HTTP/1.1
Authorization: Bearer {access_token}
Idempotency-Key: 2c3f2a1f-6a6f-4d0a-b7d1-5f1d0a2c2a00
```

```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "operation_id": "op_9f0d2b",
  "status": "pending",
  "requested_at": "2026-01-10T12:02:00Z"
}
```

Design notes:

- Use `202 Accepted` if deletion is asynchronous.
- Make deletion idempotent (for retries) using an idempotency key.
- Clearly define what “deleted” means (hard delete, anonymization, or logical delete) as an internal policy.

#### Right to data portability (portable export)

For portability, provide a machine-readable export format and consistent structure. If you support multiple formats, use content negotiation.

```http
GET /v1/users/user-123/export HTTP/1.1
Accept: application/json
Authorization: Bearer {access_token}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Disposition: attachment; filename="user-123-export.json"

{
  "user_id": "user-123",
  "export_version": "1.0",
  "generated_at": "2026-01-10T12:03:00Z",
  "items": [
    {
      "type": "profile",
      "value": {
        "name": "A. Example",
        "email": "a@example.com"
      }
    }
  ]
}
```

### Consent management

If you rely on consent (or need to record consent choices), treat consent as a first-class resource. Your API should support:

- Creating or updating consent choices
- Retrieving consent history (where required)
- Representing purpose-specific consent (marketing, analytics, third parties)

```http
POST /v1/users/user-123/consents HTTP/1.1
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "purposes": {
    "marketing": true,
    "analytics": false,
    "third_party_sharing": false
  },
  "source": "settings_page",
  "captured_at": "2026-01-10T12:04:00Z"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "consent_id": "consent_001",
  "user_id": "user-123",
  "effective_at": "2026-01-10T12:04:00Z",
  "purposes": {
    "marketing": true,
    "analytics": false,
    "third_party_sharing": false
  }
}
```

Design notes:

- Capture metadata needed for evidence (timestamp, source, actor).
- Keep consent separate from general “preferences” if it has compliance meaning.

---

## 2. HIPAA considerations (US health data)

HIPAA applies to covered entities and business associates handling protected health information (PHI). HIPAA requirements are largely operational, but they influence API design via:

- Strong access control
- Minimum necessary data exposure
- Audit controls (who accessed PHI, when, and what)
- Integrity and transmission security

### Protected Health Information (PHI)

Treat PHI as a separate data class and design your APIs to reduce exposure:

- Prefer narrower endpoints that return only needed fields.
- Avoid “dump” endpoints that expose an entire record by default.
- Use clear scopes/permissions for PHI access.

### Minimum necessary principle

Design patterns that support minimum necessary:

- Field-level inclusion controls (server-enforced)
- Separate endpoints for sensitive data
- Role- and purpose-based access decisions

Example: a standard patient summary endpoint that excludes highly sensitive fields.

```http
GET /v1/patients/pat-123/summary HTTP/1.1
Accept: application/json
Authorization: Bearer {access_token}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "patient_id": "pat-123",
  "updated_at": "2026-01-10T12:10:00Z",
  "summary": {
    "demographics": {
      "year_of_birth": 1988,
      "sex": "female"
    },
    "active_conditions": ["asthma"],
    "active_medications": ["albuterol"]
  }
}
```

### Audit logging for PHI access

HIPAA expects audit controls for systems handling PHI. APIs should emit auditable events for reads and writes of PHI.

A useful API-facing approach is to expose an audit log retrieval endpoint for authorized compliance users.

```http
GET /v1/audit-logs?resource_type=phi&action=read&from=2026-01-01T00:00:00Z HTTP/1.1
Accept: application/json
Authorization: Bearer {access_token}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "logs": [
    {
      "timestamp": "2026-01-10T12:11:00Z",
      "actor_id": "user-123",
      "action": "read",
      "resource_type": "phi",
      "resource_id": "pat-123",
      "endpoint": "/v1/patients/pat-123/summary",
      "ip_address": "203.0.113.10",
      "success": true
    }
  ]
}
```

### De-identification endpoints

If your platform supports de-identified datasets, treat de-identification as an explicit operation.

```http
POST /v1/patients/pat-123/de-identify HTTP/1.1
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "mode": "safe-harbor",
  "reason": "analytics"
}
```

```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "operation_id": "op_deid_001",
  "status": "pending"
}
```

Design notes:

- Treat de-identification as a controlled workflow.
- Audit both requests and data access outcomes.

---

## 3. PCI DSS patterns (payment APIs)

PCI DSS applies to systems that store, process, or transmit cardholder data. For APIs, PCI DSS typically drives:

- Data minimization and scope reduction
- Strong encryption in transit and at rest
- Tokenization and key management processes
- Strict logging and monitoring

### Cardholder data handling rules (API-level impacts)

Common constraints that affect API contracts:

- Do not store or return CVV after authorization.
- Avoid returning full PAN (card number). Return masked values instead.
- Use tokenization so most services never handle raw card data.

### Tokenization API

Tokenization reduces PCI scope by replacing sensitive card data with a token.

```http
POST /v1/payment-methods/tokenize HTTP/1.1
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "card_number": "4111111111111111",
  "expiry": "12/25",
  "cvv": "123",
  "cardholder_name": "A. Example"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "payment_method_token": "tok_abc123",
  "brand": "visa",
  "last_four": "1111",
  "expiry": "12/25"
}
```

Design notes:

- Never echo CVV back in responses.
- Consider returning only what the client needs to display a saved payment method.
- Prefer short-lived handling of raw card data and immediate tokenization.

### Scope reduction pattern

Design your APIs so that only a small, dedicated set of endpoints handle raw card data.

A common pattern is:

- Public-facing services use `payment_method_token`.
- Only the tokenization endpoint accepts `card_number` and `cvv`.

Example: charge using a token.

```http
POST /v1/charges HTTP/1.1
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "amount": 1999,
  "currency": "USD",
  "payment_method_token": "tok_abc123",
  "merchant_reference": "order-987"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "charge_id": "ch_001",
  "status": "authorized",
  "amount": 1999,
  "currency": "USD"
}
```

---

## 4. SOC 2 alignment (assurance for service organizations)

SOC 2 is an audit framework based on the Trust Services Criteria (TSC). It is not a technical spec, but it often shapes how teams design and operate APIs.

### Trust Services Criteria (TSC)

SOC 2 criteria cover:

- **Security**: Protection against unauthorized access.
- **Availability**: System is available for operation and use.
- **Processing integrity**: System processing is complete, valid, accurate, timely.
- **Confidentiality**: Information designated confidential is protected.
- **Privacy**: Personal information is collected, used, retained, disclosed, and disposed appropriately.

### API controls commonly requested in SOC 2 evidence

SOC 2 often expects that you can show evidence of controls. API-visible patterns that help:

- Authentication and authorization standards (consistent across all endpoints)
- Audit logging and monitoring (events for privileged actions and sensitive data access)
- Change management (versioning, deprecation policy, documented releases)
- Incident response support (traceability via request IDs and logs)

Example: include trace headers to improve audit and incident response.

```http
GET /v1/orders/order-123 HTTP/1.1
Authorization: Bearer {access_token}
X-Request-ID: req_8f6a2d
X-Correlation-ID: corr_2a1cbb
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Request-ID: req_8f6a2d
X-Correlation-ID: corr_2a1cbb

{
  "order_id": "order-123",
  "status": "shipped"
}
```

Design notes:

- Treat trace IDs as part of your operational contract.
- Ensure IDs appear in logs and audit trails.

---

## 5. Data residency

Some jurisdictions or customer contracts require data to be stored and processed in specific geographic regions.

From an API perspective, residency requirements affect:

- Which region processes a request
- Where data is stored
- How cross-border transfers are managed

### Region selection via headers

If your platform supports region routing, use explicit, documented headers. If you do not support region selection, do not accept these headers.

```http
POST /v1/documents HTTP/1.1
Content-Type: application/json
Authorization: Bearer {access_token}
X-Data-Region: eu-west-1
X-Data-Residency: EU

{
  "title": "Contract",
  "content": "..."
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "document_id": "doc-001",
  "data_region": "eu-west-1",
  "data_residency": "EU"
}
```

Design notes:

- Do not trust residency headers without authorization. A client should not be able to route data to an unauthorized region.
- Return the effective region in responses for transparency.

---

## 6. Audit logging

Audit logging is a core requirement across GDPR, HIPAA, PCI DSS, and SOC 2. APIs should support auditability for:

- Sensitive reads (especially personal data, PHI, secrets, payment events)
- Writes and deletions
- Privileged and administrative actions
- Authentication and authorization failures

### What to log

An audit event should answer:

- **Who**: actor identity (user ID, client ID), and authentication context
- **What**: action and resource
- **When**: timestamp in UTC
- **Where**: endpoint, system/service, and network metadata
- **Result**: success/failure and reason

### Audit log retrieval API

Expose audit logs only to authorized roles. Consider filtering and pagination.

```http
GET /v1/audit-logs?resource_type=user&action=read&from=2026-01-01T00:00:00Z&limit=50 HTTP/1.1
Accept: application/json
Authorization: Bearer {access_token}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "items": [
    {
      "timestamp": "2026-01-10T10:30:00Z",
      "actor_id": "user-123",
      "action": "read",
      "resource_type": "user",
      "resource_id": "user-456",
      "endpoint": "/v1/users/user-456",
      "ip_address": "192.0.2.44",
      "success": true
    }
  ],
  "next_cursor": "cursor_002"
}
```

Design notes:

- Treat audit logs as sensitive data.
- Make filters explicit so compliance and security teams can answer questions quickly.

---

## 7. Data retention

Retention policies define how long data is kept, when it is archived, and when it is deleted.

Retention requirements come from:

- Laws and regulations
- Contracts and customer requirements
- Security policies (minimize retention)
- Legal hold and investigations

### Retention policy API

If your product allows customers or admins to configure retention, expose retention policies as resources.

```http
POST /v1/retention-policies HTTP/1.1
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "resource_type": "logs",
  "retention_days": 90,
  "archive_after_days": 30,
  "delete_mode": "hard_delete"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "policy_id": "ret_001",
  "resource_type": "logs",
  "retention_days": 90,
  "archive_after_days": 30,
  "delete_mode": "hard_delete",
  "created_at": "2026-01-10T12:30:00Z"
}
```

### Legal hold support

If you must pause deletion for investigations, represent legal hold explicitly.

```http
POST /v1/legal-holds HTTP/1.1
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "scope": {
    "resource_type": "user",
    "resource_id": "user-123"
  },
  "reason": "litigation",
  "requested_by": "compliance-team"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "legal_hold_id": "lh_001",
  "status": "active"
}
```

Design notes:

- Make interactions between deletion and legal hold explicit.
- Avoid ambiguous “delete failed” behavior when a hold exists; return a clear, auditable response.

---

## 8. Privacy by design

Privacy by design is a principle that appears in GDPR and is commonly expected in SOC 2 privacy programs.

### API principles

- **Data minimization**: Collect and return only what is needed.
- **Purpose limitation**: Use data only for the purposes you state.
- **Consent-based access**: When consent is required, enforce it at read time and write time.
- **Transparency**: Make disclosures clear and provide user-visible data views.

### Practical API patterns

#### Separate sensitive resources

If an object contains both low- and high-sensitivity fields, separate them into different resources.

- `/v1/users/{id}` returns basic profile.
- `/v1/users/{id}/personal-data` returns sensitive personal data.

This reduces accidental exposure and makes access control easier to audit.

#### Default-safe responses

Avoid returning sensitive fields by default. If you support field selection, ensure it is server-enforced and permission-aware.

Example: request a user profile without personal data.

```http
GET /v1/users/user-123 HTTP/1.1
Accept: application/json
Authorization: Bearer {access_token}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user_id": "user-123",
  "display_name": "A. Example",
  "created_at": "2025-11-01T10:00:00Z"
}
```

---

## Example compliance checklist

Use this checklist as a quick review when designing or assessing an API in a regulated environment.

### GDPR

- [ ] Personal data access endpoint
- [ ] Data portability export endpoint
- [ ] Erasure workflow endpoint (idempotent)
- [ ] Consent management resource
- [ ] Audit logging for personal data access
- [ ] Retention and deletion policy defined

### HIPAA

- [ ] Minimum necessary responses for PHI
- [ ] Strong access control for PHI endpoints
- [ ] Audit logs for PHI reads and writes
- [ ] De-identification workflow (if supported)

### PCI DSS

- [ ] Tokenization endpoint for raw card data
- [ ] No CVV storage or response echo
- [ ] Tokens used for downstream operations
- [ ] Audit logging for payment operations

### SOC 2

- [ ] Consistent authentication and authorization across endpoints
- [ ] Traceability headers and request IDs
- [ ] Monitoring and incident response support
- [ ] Change control and versioning practices

---

## Industry references (non-exhaustive)

- GDPR (General Data Protection Regulation)
- HIPAA Security Rule
- PCI DSS Requirements
- SOC 2 Trust Services Criteria
