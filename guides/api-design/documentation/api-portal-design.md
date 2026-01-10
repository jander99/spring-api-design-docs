# API Portal Design

## Overview

A developer portal is the primary user interface for your API program. It is where developers discover APIs, understand how they work, get credentials, test requests, and find support.

This document defines production-ready design patterns for an API portal and API catalog. It is vendor-neutral and uses only generic HTTP/JSON/YAML examples.

## Goals

A good portal should:

- Reduce time-to-first-successful-call.
- Make APIs easy to discover and compare.
- Make onboarding self-service and safe.
- Make documentation trustworthy and current.
- Provide clear support paths and feedback loops.

## Core Principles

### Design for Tasks, Not Pages

Developers come to a portal to complete tasks. Organize content around common outcomes:

- Make the first request
- Authenticate
- Handle errors
- Use pagination and webhooks
- Move from sandbox to production

### Search-First Information Architecture

Assume most users will use search as the main navigation method. Browsing should still work, but it should not be the only path.

### Treat Each API as a Product

Each API should have a clear owner, lifecycle status, quality signals, and support commitments.

### Make Environments Explicit

Developers must always know which environment they are using. The portal should clearly separate:

- Sandbox vs production base URLs
- Sandbox vs production credentials
- Feature differences between environments

### Build Trust Through Consistency

Consistency reduces mistakes. Use consistent naming, layouts, and response patterns across all API pages.

## Portal UX Patterns

### Key Pages

#### Landing Page

Purpose: communicate value and route developers to the right starting point.

Recommended content:

- A short description of what the API program offers
- Primary calls to action (for example: “Get Started”, “Browse APIs”, “Sign In”)
- A minimal “first call” example (optional)
- Status and support entry points (optional)

#### API Catalog

Purpose: help developers find the right API quickly.

Recommended features:

- Search bar at the top
- Faceted filtering (category, tags, status, version)
- Clear listing cards (name, short description, status, owner)
- Sorting (relevance, popularity, recently updated)

#### API Detail Page

Purpose: provide a complete understanding of one API and how to use it.

Recommended content order:

1. Summary and use cases
2. Quick start (first working request)
3. Authentication requirements
4. Base URLs and environments
5. Reference documentation (endpoints, schemas, errors)
6. Limits and operational guidance (rate limits, idempotency)
7. Changelog and version information
8. Support and escalation path

#### Getting Started

Purpose: get a developer to a successful request fast.

Recommended structure:

- Prerequisites
- Get credentials
- Choose environment (sandbox first)
- Copy-paste request + expected response
- Next steps

#### Authentication Guide

Purpose: teach authentication once, then reference it consistently.

Recommended content:

- Supported auth methods and which to prefer for onboarding
- How to obtain credentials
- How to send credentials (headers)
- How to rotate credentials
- Common failures (401/403) and how to troubleshoot

#### Interactive API Console

Purpose: reduce setup friction by letting developers send real requests from the portal.

Recommended content:

- Environment selection (sandbox/production)
- Credential input with clear security messaging
- Request builder and response viewer
- Copy/export of the raw HTTP request

#### SDK Downloads (If Offered)

Purpose: reduce integration work for common languages.

Recommended content:

- Supported languages and versions
- Installation instructions (high-level)
- SDK version compatibility with API versions
- Changelog and release cadence

#### Support and Community

Purpose: provide fast help paths and reduce repeated questions.

Recommended content:

- How to get help (ticket, chat, forum)
- What information support needs (request ID, timestamp, endpoint)
- Status and incident communications

### Navigation Patterns

#### Search-First Design

- Place search prominently on the catalog and keep it available throughout the portal.
- Make search results actionable (go to API detail, open docs section).

#### Category Browsing

- Provide a small number of categories.
- Keep categories stable over time.
- Support multi-category placement only if necessary.

#### Recently Viewed

- Show recently viewed APIs for signed-in users.
- Use this as a shortcut to return to in-progress tasks.

#### Favorites and Bookmarks

- Allow users to bookmark APIs and documentation sections.
- Use bookmarks to power quick navigation and notifications.

## API Catalog Structure

### What the Catalog Should Represent

The catalog is a structured inventory of APIs. It should support both portal UX and governance needs.

A catalog entry should answer:

- What does this API do?
- Who owns it?
- What is its lifecycle status?
- Which versions exist and which are recommended?
- Where is the contract (OpenAPI) and documentation?
- What support and reliability commitments exist?

### Recommended Catalog Metadata

Use a consistent metadata model. This example is illustrative and can be extended.

```json
{
  "id": "orders-api",
  "name": "Orders API",
  "description": "HTTP API for order management",
  "version": "2.1.0",
  "status": "stable",
  "category": "Commerce",
  "tags": ["orders", "commerce"],
  "owner": "commerce-team",
  "documentation_url": "/docs/orders-api",
  "openapi_url": "/specs/orders-api.yaml",
  "support_url": "/support/orders-api",
  "sla": {
    "availability": "99.9%",
    "latency_p99": "200ms"
  }
}
```

Field guidance:

- `id`: stable identifier used in URLs.
- `status`: use a small set of lifecycle values (for example: `experimental`, `beta`, `stable`, `deprecated`).
- `owner`: a real escalation target, not a generic label.
- `openapi_url`: the source of truth for the API contract.
- `sla`: only publish commitments you can measure and meet.

### Taxonomy: Categories and Tags

Use both categories and tags:

- Categories: broad groups for browsing (few, stable).
- Tags: flexible keywords for search and filtering.

Avoid having too many categories. Prefer tags for detailed discovery.

### Lifecycle and Quality Signals

The catalog should display signals that reduce integration risk:

- Lifecycle status (stable/deprecated)
- Current recommended version
- Deprecation dates (if applicable)
- Change cadence (for example: “updated weekly”)

## Search and Discovery

### Search Features

A portal search experience should support:

- Full-text search across API names and descriptions
- Filtering by category
- Filtering by version
- Tag-based discovery
- Related API suggestions (by shared tags, category, or use cases)

### Search Result Quality

Search should favor:

- Clear matches in name and description
- APIs that are stable and recommended
- Recently updated documentation (if you track it)

### Example: Portal Search API

If the portal provides a search endpoint (for example, for a UI or CLI), keep it stable and predictable.

```http
GET /portal/search?q=orders&category=commerce HTTP/1.1
Host: developer.example.com
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "results": [
    {
      "name": "Orders API",
      "description": "Create and manage customer orders",
      "category": "Commerce",
      "version": "v2",
      "tags": ["orders", "commerce", "crud"]
    }
  ]
}
```

## API Marketplace Patterns (Optional)

Some portals act as marketplaces for internal or external consumers. If you offer plans, billing, or subscriptions, design for clarity and safety.

### Marketplace Features

Common features:

- API listings and comparisons
- Plans and usage limits
- Usage statistics and dashboards
- Reviews and ratings (moderated)
- Partner integrations

### Subscription Flow

A typical self-service flow:

1. Browse APIs
2. Review documentation and requirements
3. Select a plan (if applicable)
4. Create or select an application
5. Receive credentials
6. Make a test call in sandbox
7. Request or enable production access

### Example: Subscription Request

```http
POST /portal/subscriptions HTTP/1.1
Host: developer.example.com
Content-Type: application/json
Accept: application/json
```

```json
{
  "apiId": "orders-api",
  "plan": "standard",
  "applicationId": "app_123",
  "environment": "sandbox"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
```

```json
{
  "subscriptionId": "sub_456",
  "status": "active",
  "apiId": "orders-api",
  "plan": "standard"
}
```

## Self-Service Onboarding

A portal should make onboarding possible without human intervention for common cases.

### Recommended Onboarding Flow

1. Sign up / sign in
2. Create an application
3. Get credentials
4. Test in sandbox
5. Enable production access

### Self-Service Features

Common capabilities:

- API key generation and rotation
- OAuth application registration (if applicable)
- Webhook configuration
- Usage dashboards
- Billing management (if applicable)

### Example: Create an Application

```http
POST /portal/apps HTTP/1.1
Host: developer.example.com
Content-Type: application/json
Accept: application/json
```

```json
{
  "name": "order-sync",
  "redirectUris": ["https://client.example.com/oauth/callback"],
  "scopes": ["read:orders", "write:orders"]
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
```

```json
{
  "id": "app_123",
  "name": "order-sync",
  "credentials": {
    "clientId": "client_abc",
    "clientSecret": "secret_redacted"
  }
}
```

Security notes:

- Treat secrets as sensitive data. Avoid displaying them more than once.
- Provide clear rotation and revoke actions.
- Separate sandbox and production credentials.

### Example: Configure a Webhook

```http
POST /portal/webhooks HTTP/1.1
Host: developer.example.com
Content-Type: application/json
Accept: application/json
```

```json
{
  "apiId": "orders-api",
  "url": "https://client.example.com/webhooks/orders",
  "events": ["orders.created", "orders.updated"],
  "secret": "shared_secret_redacted"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
```

```json
{
  "id": "wh_789",
  "status": "active"
}
```

## Interactive Documentation

Interactive documentation reduces onboarding time, but it must be designed carefully.

### Recommended Features

- “Try it out” request execution
- Pre-filled example values that work in sandbox
- Clear display of request method, path, headers, and body
- Clear display of response status, headers, and body
- Export/copy of the raw HTTP request
- Environment switching

### Safety and Security Requirements

- Do not log credentials.
- Redact sensitive headers in UI and logs.
- Make it obvious when a request can mutate state.
- Provide safe defaults and warning prompts for destructive actions.

## Version Management

A portal must help developers choose the correct API version and understand what changes.

### Version Display

Recommended UI rules:

- Highlight the current recommended version.
- Mark deprecated versions clearly.
- Show deprecation timelines.
- Show a concise changelog summary.

### Version Selection

If the portal supports selecting a version, keep the mechanism consistent across APIs.

Example:

```http
GET /portal/apis/orders-api?version=v2 HTTP/1.1
Host: developer.example.com
Accept: application/json
```

## Analytics and Feedback

Portals improve over time when they capture usage and friction signals.

### Portal Analytics

Track signals that map to adoption and usability:

- Page views by section
- Search queries and “no results” rates
- API popularity (views, subscriptions)
- Drop-off points in onboarding
- Time to first successful call

### Example: Analytics Event Shape

```json
{
  "event": "portal.search",
  "timestamp": "2026-01-09T12:00:00Z",
  "actor": {
    "type": "developer",
    "id": "dev_123"
  },
  "properties": {
    "query": "orders",
    "filters": {
      "category": "commerce"
    },
    "resultCount": 12
  }
}
```

### Feedback Collection

Collect feedback where developers experience friction:

- Documentation ratings per page
- Issue reporting for incorrect docs
- Feature requests
- Community discussion areas

Keep feedback lightweight. Ask for context that helps triage:

- What were you trying to do?
- What did you expect?
- What happened instead?

## Catalog APIs (If Exposed)

Some organizations expose the catalog itself as an API. If you do, keep it stable and document it like any other API.

Common endpoints:

```http
GET /portal/apis HTTP/1.1
Host: developer.example.com
Accept: application/json
```

```http
GET /portal/apis/{api-id} HTTP/1.1
Host: developer.example.com
Accept: application/json
```

```http
GET /portal/apis/{api-id}/versions HTTP/1.1
Host: developer.example.com
Accept: application/json
```

```http
GET /portal/apis/{api-id}/openapi HTTP/1.1
Host: developer.example.com
Accept: application/yaml
```

Design notes:

- Keep identifiers stable.
- Return consistent metadata across endpoints.
- Support filtering and pagination for large catalogs.

## Example Portal Structure

A portal often needs clean, predictable URLs.

```text
/portal
├── /                       # Landing page
├── /apis                   # API catalog
├── /apis/{id}              # API detail
├── /apis/{id}/docs         # Reference documentation
├── /apis/{id}/console      # Interactive console
├── /getting-started        # Onboarding
├── /sdks                   # SDK downloads
├── /dashboard              # Developer dashboard
├── /settings               # Account settings
└── /support                # Help and support
```

## Final Reading Level Metrics

This section is filled in after running the repository reading level analyzer.
