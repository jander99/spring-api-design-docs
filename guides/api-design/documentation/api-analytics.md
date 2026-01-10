# API Analytics

> **📖 Reading Guide**
>
> **⏱️ Reading Time:** _TBD (run analyzer)_ | **🟡 Level:** Intermediate
>
> **📋 Prerequisites:** Basic HTTP fundamentals, familiarity with API consumers
> **🎯 Key Topics:** Analytics, Adoption, SLIs/SLOs, Governance
>
> **📊 Complexity:** _TBD (run analyzer)_

## Overview

API analytics answers product and program questions that observability does not:

- Who uses the API, and how often?
- Which endpoints drive value?
- Where do developers drop off during onboarding?
- How healthy is the API experience over time?

This document defines **what to measure** and **how to represent results** using standard HTTP, JSON, and YAML examples. It does not assume any specific analytics vendor.

## Principles

### Separate analytics from observability

- **Observability** focuses on system behavior: latency, errors, traffic, saturation.
- **API analytics** focuses on consumer behavior and outcomes: adoption, retention, funnel conversion, and (optionally) business value.

Analytics should be built on the same reliable signals as observability, but it uses different groupings and reporting.

### Define measurement boundaries

Be explicit about what counts as “usage” and “a consumer”. Common pitfalls:

- Counting retries as independent calls
- Mixing human-driven and automated traffic
- Treating shared credentials as a single consumer

Define these terms in your program:

- **Consumer**: a client application, team, tenant, or integration identity
- **Call**: a successfully received request (even if it returns an error)
- **Success**: a response outcome that represents successful business intent

### Use consistent identifiers

You need stable identifiers to group and trend data:

- `consumer_id`: stable ID for the calling app/integration
- `api_key_id` or `client_id`: credential identifier (may rotate)
- `tenant_id` (if multi-tenant)
- `region` or `country` (coarse, privacy-aware)
- `endpoint_template`: a normalized route template (not the raw URL)

**Avoid high-cardinality fields** (like full URLs with IDs) in analytics groupings.

## 1) Usage Analytics

Usage analytics describes how the API is used over time and across endpoints.

### Metrics to track

Track usage at multiple levels:

- Total API calls
- Unique consumers
- Calls per endpoint (by normalized template)
- Calls per consumer
- Calls over time (daily/hourly)
- Geographic distribution (coarse)

Also consider:

- Percent of traffic using deprecated endpoints
- Percent of traffic by API version
- Distribution of HTTP methods

### Example: usage report endpoint

Expose analytics in an internal reporting API, or publish it via dashboards. If you expose an API, design it like a reporting resource.

```http
GET /v1/analytics/usage?period=30d&group_by=endpoint HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer <token>
```

Example response:

```json
{
  "period": "2026-01-01/2026-01-31",
  "total_calls": 1250000,
  "unique_consumers": 450,
  "group_by": "endpoint",
  "results": [
    {
      "endpoint_template": "/orders",
      "calls": 500000,
      "percentage": 40.0
    },
    {
      "endpoint_template": "/products",
      "calls": 375000,
      "percentage": 30.0
    }
  ]
}
```

### Query model guidance

For analytics queries, support:

- `period`: a fixed range (`YYYY-MM-DD/YYYY-MM-DD`) or a relative window (`7d`, `30d`)
- `group_by`: one dimension at a time (start simple)
- `filters`: optional constraints (endpoint, consumer, version)

Example query with filters:

```http
GET /v1/analytics/usage?period=7d&group_by=consumer&endpoint=/orders HTTP/1.1
Host: api.example.com
Accept: application/json
```

## 2) Adoption Metrics

Adoption metrics describe whether developers and integrators successfully start and continue using the API.

### Key adoption metrics

- **Time to first call**: elapsed time from account creation to first API call
- **Activation rate**: percent of new consumers who make a first successful call
- **Retention**: percent of consumers who continue usage over time
- **Churn**: percent of consumers who stop using the API
- **Growth rate**: net change in active consumers over time

### Define lifecycle events

Use a small set of consistent lifecycle events. Example event types:

- `registered`
- `credential_issued`
- `first_call`
- `first_success`
- `integration_complete`
- `active_week`

These events can be computed from logs and platform events. The analytics model is what matters.

### Example: adoption summary

```http
GET /v1/analytics/adoption?period=90d HTTP/1.1
Host: api.example.com
Accept: application/json
```

```json
{
  "period": "2025-11-01/2026-01-31",
  "new_consumers": 220,
  "activation_rate": 0.63,
  "median_time_to_first_call_seconds": 1800,
  "median_time_to_first_success_seconds": 2400,
  "retention": {
    "d7": 0.58,
    "d30": 0.41
  },
  "churn_rate": 0.07
}
```

## 3) Developer Journey Tracking

Developer journey tracking explains how consumers move from discovery to production use. It helps you identify friction.

### Funnel analysis

A funnel models a sequence of steps and measures conversion and time between steps.

Common funnel:

1. Registration
2. Credential issued
3. First API call
4. First successful call
5. Production traffic threshold reached

**Drop-off points** and **time between stages** usually reveal documentation gaps, confusing auth flows, or poor error messages.

### Cohort analysis

Cohorts group consumers by start date (or another shared attribute) and track behavior over time.

Cohort examples:

- By signup week
- By partner program
- By region
- By integration type

### Example: funnel report

```http
GET /v1/analytics/funnels/onboarding?period=30d HTTP/1.1
Host: api.example.com
Accept: application/json
```

```json
{
  "period": "2026-01-01/2026-01-31",
  "funnel": "onboarding",
  "steps": [
    {
      "name": "registered",
      "count": 1200
    },
    {
      "name": "credential_issued",
      "count": 980
    },
    {
      "name": "first_call",
      "count": 740,
      "median_time_from_previous_seconds": 900
    },
    {
      "name": "first_success",
      "count": 620,
      "median_time_from_previous_seconds": 300
    },
    {
      "name": "production_threshold",
      "count": 310,
      "median_time_from_previous_seconds": 86400
    }
  ]
}
```

### Privacy and consent

Developer journey data can become sensitive. Follow these rules:

- Collect the minimum data needed
- Avoid storing raw personal data in analytics events
- Prefer stable, non-person identifiers (`consumer_id` instead of email)
- Apply retention limits to event histories

## 4) API Health Scores

A health score aggregates multiple indicators into a simple number that can be tracked and compared.

### Health indicators

Combine a small set of inputs:

- Availability (uptime %)
- Latency (p50, p95, p99)
- Error rate
- Throughput
- Documentation coverage (optional)

Health scores are most useful when:

- The calculation is stable
- Inputs are well-defined
- The score is used for trend detection, not blame

### Example health score formula

Use a weighted score with explicit weights.

```text
health_score = (
  availability_score * 0.30 +
  latency_score       * 0.25 +
  error_rate_score    * 0.25 +
  documentation_score * 0.20
)
```

### Normalizing component scores

Each component score should be normalized to `0..100` using your SLO thresholds.

Example (illustrative):

- `availability_score = 100` if uptime ≥ 99.9%, then reduce based on gap
- `latency_score = 100` if p95 ≤ target, then reduce based on overage
- `error_rate_score = 100` if error rate ≤ target

Avoid making the score too complex. Keep it explainable.

## 5) Performance Analytics

Performance analytics focuses on latency distribution and change over time.

### Performance metrics

- Response time distribution (p50/p90/p95/p99)
- Slowest endpoints (by normalized route)
- Trend detection (week-over-week)
- Degradation detection (compared to a baseline)

### SLA / SLO compliance reporting

Track compliance against targets.

Example response structure:

```json
{
  "period": "2026-01-01/2026-01-31",
  "slo": {
    "name": "p95_latency",
    "target_ms": 250,
    "evaluation": "endpoint"
  },
  "violations": [
    {
      "endpoint_template": "/orders",
      "p95_ms": 410,
      "violation_minutes": 320
    }
  ]
}
```

## 6) Error Analytics

Error analytics helps you identify failure hotspots and prioritize fixes.

### Error tracking dimensions

Track errors grouped by:

- Endpoint
- Consumer
- Status code
- Error type (from your RFC 9457 `type` URI)
- Deployment version (if available)

### Common error views

- Error rate by endpoint
- Error rate by consumer
- Distribution of error types
- Error trend over time
- Top 10 errors

### Example: top errors

```http
GET /v1/analytics/errors?period=7d&group_by=type&limit=10 HTTP/1.1
Host: api.example.com
Accept: application/json
```

```json
{
  "period": "2026-01-25/2026-01-31",
  "group_by": "type",
  "results": [
    {
      "problem_type": "https://api.example.com/problems/validation-error",
      "count": 18240,
      "status_codes": {
        "400": 18240
      }
    },
    {
      "problem_type": "https://api.example.com/problems/rate-limit-exceeded",
      "count": 2400,
      "status_codes": {
        "429": 2400
      }
    }
  ]
}
```

### Mean time to resolution (MTTR)

If you track incident and support signals, measure:

- Time from first error spike to detection
- Time from detection to mitigation
- Time from mitigation to full resolution

Keep this as a program metric. Do not tie it to individual consumers.

## 7) Consumer Insights

Consumer insights answer: “Who are our consumers and how healthy are their integrations?”

### Consumer segmentation

Segment consumers by stable attributes:

- Usage volume (low/medium/high)
- Use case (if known)
- Integration pattern (interactive UI, batch, streaming)
- Geography (coarse)

### Consumer health

Create a consumer health view with simple indicators:

- Active vs inactive
- Usage trend (increasing/stable/decreasing)
- Error rate trend
- Support interaction count (if tracked)

Example consumer health response:

```json
{
  "period": "2026-01-01/2026-01-31",
  "consumer": {
    "consumer_id": "cns-123",
    "status": "active",
    "usage_trend": "increasing",
    "error_rate": 0.004,
    "top_endpoints": ["/orders", "/products"]
  }
}
```

## 8) Business Metrics (Optional)

Not all APIs are monetized. Business analytics should match your API program goals.

### Revenue metrics (for monetized APIs)

- Revenue per consumer
- Revenue per API call
- Plan/tier distribution
- Upgrade/downgrade rates

### ROI metrics

Track the cost and value of the API program:

- Development cost
- Operational cost
- Support cost
- Revenue generated (if applicable)
- Value delivered (time saved, risk reduced, process automation)

Example monetization summary:

```json
{
  "period": "2026-01-01/2026-01-31",
  "revenue_total": 125000.00,
  "active_paying_consumers": 38,
  "revenue_per_consumer_avg": 3289.47,
  "tier_distribution": {
    "free": 220,
    "standard": 30,
    "enterprise": 8
  }
}
```

## Designing Analytics APIs (If You Expose Them)

If you expose analytics as an API, treat it as a reporting surface:

- Prefer `GET` for read-only reports
- Use stable schemas and explicit grouping semantics
- Document privacy constraints and access controls
- Avoid exposing raw logs or high-cardinality data

### Response conventions

A consistent response structure improves usability:

- `period`: evaluation window
- `group_by`: dimension name
- `results`: array of grouped rows
- `paging`: only if you truly need it

Example envelope:

```json
{
  "period": "2026-01-01/2026-01-31",
  "group_by": "endpoint",
  "filters": {
    "api_version": "v1"
  },
  "results": [],
  "generated_at": "2026-02-01T00:00:00Z"
}
```

## Example dashboard structure

A common approach is to organize dashboards by audience.

### Executive dashboard

- Total API calls (trend)
- Active consumers (trend)
- Adoption funnel conversion
- Health score (trend)
- Business value (if applicable)

### Operations dashboard

- Calls per second
- Latency percentiles
- Error rates by endpoint
- Top consumers by traffic
- SLO violations

### Developer experience dashboard

- New signups (trend)
- Time to first call
- Funnel drop-off points
- Top documentation/search queries (if tracked)
- Top integration errors
