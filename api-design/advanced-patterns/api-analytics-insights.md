# API Analytics & Insights

> **Reading Guide**
> 
> **Reading Time:** 16 minutes | **Level:** Advanced
> 
> **Prerequisites:** Strong API background, experience with complex systems  
> **Key Topics:** Usage analytics, performance metrics, business insights, privacy
> 
> **Complexity:** 14.2 grade level • 0.8% technical density • difficult

## Executive Summary

API analytics turns raw data into useful insights. Observability tells you *what* is happening. Analytics helps you understand *why* and *what to do next*.

**What this covers:**
- Metrics types for APIs (the four golden signals and more)
- Usage tracking and user behavior patterns
- Business metrics from API activity
- Version adoption and deprecation tracking
- Privacy-safe data collection

**Key takeaways:**
- Track four key metrics: availability, latency, throughput, and errors
- Use `X-Request-ID` headers for request tracking
- Anonymize user data while keeping useful insights
- Mix real-time and batch analytics for full visibility

**When to use this guide:** Use when building dashboards, planning usage billing, or measuring API success.

---

## Core Metrics Taxonomy

API metrics fall into four main groups. Each group serves different teams and needs.

### The Four Golden Signals

```
                    API METRICS TAXONOMY
    ┌──────────────────────────────────────────────┐
    │                                              │
    │   ┌─────────────┐      ┌─────────────┐      │
    │   │ AVAILABILITY│      │   LATENCY   │      │
    │   │             │      │             │      │
    │   │  Is it up?  │      │ How fast?   │      │
    │   │  99.9% SLA  │      │ P50/P95/P99 │      │
    │   └─────────────┘      └─────────────┘      │
    │                                              │
    │   ┌─────────────┐      ┌─────────────┐      │
    │   │ THROUGHPUT  │      │   ERRORS    │      │
    │   │             │      │             │      │
    │   │  How much?  │      │ What broke? │      │
    │   │  req/second │      │ 4xx vs 5xx  │      │
    │   └─────────────┘      └─────────────┘      │
    │                                              │
    └──────────────────────────────────────────────┘
```

### Metric Categories

| Category | What It Measures | Key Metrics | Stakeholders |
|----------|------------------|-------------|--------------|
| **Availability** | System uptime | Uptime %, error budget | Operations, SRE |
| **Latency** | Response speed | P50, P95, P99 times | Engineering, Product |
| **Throughput** | Request volume | Requests/sec, daily totals | Capacity planning |
| **Errors** | Failure rates | 4xx rate, 5xx rate | Engineering, Support |

### Extended Metrics Framework

Beyond the four signals, track these additional categories:

| Category | Metrics | Purpose |
|----------|---------|---------|
| **Business** | Orders created, revenue, conversions | Business value measurement |
| **User behavior** | Feature adoption, user journeys | Product decisions |
| **Client health** | SDK versions, client errors | Developer experience |
| **Resource usage** | CPU, memory, connections | Capacity planning |
| **Security** | Auth failures, rate limit hits | Threat detection |

---

## API Usage Analytics

Usage analytics answers key questions: Who uses your API? How do they use it? What features matter most?

### Core Usage Metrics

Track these metrics for every API:

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Total requests** | All API calls received | Count of all requests |
| **Unique consumers** | Distinct API keys/clients | Count of unique client IDs |
| **Endpoint popularity** | Requests per endpoint | Requests grouped by path |
| **Method distribution** | GET vs POST vs PUT etc. | Requests grouped by method |
| **Time-based patterns** | Usage by hour/day/week | Requests over time buckets |

### Usage Tracking Headers

Include these headers for analytics correlation:

#### Request Headers (Client → Server)

| Header | Purpose | Example |
|--------|---------|---------|
| `X-Request-ID` | Unique request identifier | `req-a1b2c3d4-5678-90ef` |
| `X-Client-ID` | Client application identifier | `mobile-app-ios-v2` |
| `X-Session-ID` | User session tracking | `sess-xyz789` |
| `User-Agent` | Client software identification | `MyApp/2.1.0 (iOS 17.0)` |

#### Response Headers (Server → Client)

| Header | Purpose | Example |
|--------|---------|---------|
| `X-Request-ID` | Echo back for correlation | `req-a1b2c3d4-5678-90ef` |
| `X-Response-Time` | Server processing time | `45` (milliseconds) |
| `X-RateLimit-Remaining` | Quota usage visibility | `892` |

### Request Example with Analytics Headers

```http
POST /v1/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJ...
X-Request-ID: req-a1b2c3d4-5678-90ef
X-Client-ID: mobile-app-ios-v2
X-Session-ID: sess-xyz789
Content-Type: application/json

{
  "items": [...],
  "shippingAddress": {...}
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Request-ID: req-a1b2c3d4-5678-90ef
X-Response-Time: 127
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 892

{
  "orderId": "ord-12345",
  "status": "confirmed"
}
```

### Usage Analytics Data Model

Structure your analytics data for flexible querying:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "requestId": "req-a1b2c3d4-5678-90ef",
  "endpoint": "/v1/orders",
  "method": "POST",
  "statusCode": 201,
  "responseTimeMs": 127,
  "client": {
    "id": "client-abc123",
    "type": "mobile",
    "version": "2.1.0"
  },
  "user": {
    "id": "user-xyz789-hash",
    "tier": "premium"
  },
  "geo": {
    "country": "US",
    "region": "west"
  },
  "api": {
    "version": "v1",
    "deprecated": false
  }
}
```

---

## Performance Metrics Collection

Performance metrics show how fast and reliable your API is. Collect them at many levels.

### Response Time Metrics

#### Percentile Targets

| Percentile | Meaning | Target | Alert Threshold |
|------------|---------|--------|-----------------|
| P50 | Median response | < 100ms | > 200ms |
| P95 | 95% of requests | < 300ms | > 500ms |
| P99 | 99% of requests | < 500ms | > 1000ms |
| P99.9 | 99.9% (tail) | < 1000ms | > 2000ms |

#### Response Time Breakdown

Track time spent in each processing phase:

```
Total Request Time: 145ms
┌────────────────────────────────────────────────────────────────┐
│ DNS  │ Connect │  TLS  │ Wait │     Server Processing    │Recv│
│ 5ms  │  10ms   │ 15ms  │ 2ms  │         108ms            │5ms │
└────────────────────────────────────────────────────────────────┘

Server Processing Breakdown: 108ms
┌────────────────────────────────────────────────────────────────┐
│  Auth  │  Validation │  Business Logic  │  Database  │ Serial │
│  8ms   │    5ms      │      35ms        │    52ms    │  8ms   │
└────────────────────────────────────────────────────────────────┘
```

### Server-Timing Header

Expose server-side timing for debugging:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Server-Timing: auth;dur=8.2, db;dur=52.4, cache;dur=0.5, total;dur=108

{
  "data": [...]
}
```

| Metric | Description | Example Value |
|--------|-------------|---------------|
| `auth` | Authentication time | `auth;dur=8.2` |
| `db` | Database query time | `db;dur=52.4` |
| `cache` | Cache lookup time | `cache;dur=0.5` |
| `external` | External API calls | `external;dur=120.0` |
| `total` | Total server time | `total;dur=108` |

### Throughput Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| **Requests per second** | Current request rate | req/s |
| **Peak throughput** | Maximum observed rate | req/s |
| **Daily request volume** | Total requests per day | count |
| **Concurrent requests** | Active requests at once | count |

### Error Rate Metrics

Track errors by type and severity:

| Error Category | Status Codes | Typical Target |
|----------------|--------------|----------------|
| **Client errors** | 400-499 | < 5% of requests |
| **Server errors** | 500-599 | < 0.1% of requests |
| **Timeouts** | 504, 408 | < 0.01% of requests |
| **Rate limits** | 429 | Monitor trend |

### Error Rate Calculation

```
Error Rate = (Error Responses / Total Responses) * 100

Example:
  Total requests: 10,000
  5xx responses: 8
  Error rate: 0.08%
```

---

## User Behavior Tracking

Learn how users interact with your API. Use this data for product choices and better developer experience.

### User Journey Tracking

Map common API usage patterns:

```
TYPICAL USER JOURNEY: E-Commerce Checkout

Step 1: Browse         Step 2: Cart         Step 3: Checkout
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ GET /products│──────▶│POST /cart   │──────▶│POST /orders │
│ GET /products│       │ GET /cart   │       │ GET /orders │
│    /{id}    │       │PUT /cart    │       │    /{id}    │
└─────────────┘       └─────────────┘       └─────────────┘
     │                      │                      │
     ▼                      ▼                      ▼
  Avg: 3.2 calls        Avg: 4.1 calls        Avg: 2.8 calls
  Conv: 65%             Conv: 45%             Conv: 78%
```

### Journey Analytics Metrics

| Metric | Description | Example |
|--------|-------------|---------|
| **Conversion rate** | Users completing journey | 35% browse-to-purchase |
| **Drop-off points** | Where users abandon | 55% drop at checkout |
| **Time to complete** | Duration of journey | Avg 4.5 minutes |
| **Steps per journey** | API calls per journey | Avg 10.2 requests |

### Feature Adoption Tracking

Track which API features users actually use:

| Feature | Adoption Rate | Trend | Notes |
|---------|---------------|-------|-------|
| Basic CRUD | 100% | Stable | Core functionality |
| Filtering | 78% | Growing | Add more filter options |
| Pagination | 92% | Stable | Essential feature |
| Bulk operations | 23% | Growing | Promote in docs |
| Webhooks | 15% | Stable | Niche use case |
| GraphQL endpoint | 8% | New | Monitor adoption |

### Session Analysis

Track user sessions for deeper insights:

```json
{
  "sessionId": "sess-abc123",
  "userId": "user-xyz-hash",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T10:15:32Z",
  "duration": 932,
  "requestCount": 47,
  "endpoints": [
    {"path": "/v1/products", "count": 12},
    {"path": "/v1/cart", "count": 8},
    {"path": "/v1/orders", "count": 3}
  ],
  "errors": 0,
  "outcome": "purchase_completed"
}
```

---

## Business Metrics from APIs

API analytics gives direct business value. Track metrics that matter to your stakeholders.

### Revenue Attribution

Connect API calls to business outcomes:

| Metric | Description | Example |
|--------|-------------|---------|
| **Revenue per API call** | Average value generated | $0.45/call |
| **Conversion value** | Revenue from conversions | $125 avg order |
| **API-driven revenue** | Total revenue via API | $2.1M monthly |
| **Revenue by client** | Value per integration | Client A: $450K/mo |

### Business Event Tracking

Track business events through API activity:

```json
{
  "event": "order_completed",
  "timestamp": "2024-01-15T10:30:45Z",
  "requestId": "req-abc123",
  "value": {
    "amount": 149.99,
    "currency": "USD"
  },
  "attribution": {
    "clientId": "partner-xyz",
    "channel": "mobile-app",
    "campaign": "winter-sale"
  }
}
```

### Key Business Metrics

| Metric | Calculation | Business Value |
|--------|-------------|----------------|
| **Order completion rate** | Completed / Started | Funnel efficiency |
| **Average order value** | Total revenue / Orders | Revenue optimization |
| **Customer lifetime value** | Revenue per user over time | Investment decisions |
| **API monetization** | Revenue / API calls | Platform value |
| **Partner performance** | Metrics per partner | Partnership ROI |

### Business Analytics Dashboard Elements

| Dashboard Section | Key Metrics | Refresh Rate |
|-------------------|-------------|--------------|
| Revenue overview | Daily/weekly/monthly revenue | Hourly |
| Conversion funnel | Step-by-step conversion rates | Real-time |
| Partner performance | Revenue and volume by partner | Daily |
| Product analytics | Popular items via API | Hourly |
| Growth trends | MoM and YoY comparisons | Daily |

---

## API Version Analytics

Track version adoption to manage your API lifecycle well.

### Version Adoption Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Active versions** | Versions receiving traffic | Minimize (ideally 2) |
| **Version distribution** | Traffic share by version | Latest > 80% |
| **Migration velocity** | Rate of adoption of new version | Increasing trend |
| **Deprecated usage** | Traffic to deprecated versions | Decreasing to zero |

### Version Tracking Response

Include version information in responses:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: 2
X-API-Deprecated: false
X-Latest-Version: 2

{
  "data": [...]
}
```

For deprecated versions:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: 1
X-API-Deprecated: true
Deprecation: true
Sunset: Sat, 30 Jun 2025 23:59:59 GMT
X-Latest-Version: 2

{
  "data": [...]
}
```

### Version Migration Tracking

```
VERSION ADOPTION OVER TIME

100% ┤
     │    v1 ████████████████████▓▓▓▓▓▓▓▓░░░░░░░
 75% ┤                                          
     │                                          
 50% ┤                     v2 ▓▓▓▓▓▓████████████
     │                                          
 25% ┤                                          
     │              v3 (beta) ░░░░░░░░░░░▓▓▓▓▓▓
  0% ┼─────────────────────────────────────────▶
     Jan    Feb    Mar    Apr    May    Jun
     
Legend: ████ Active  ▓▓▓▓ Transitioning  ░░░░ New/Low
```

### Version Analytics Data

```json
{
  "period": "2024-01",
  "versions": {
    "v1": {
      "requests": 125000,
      "percentage": 12.5,
      "uniqueClients": 45,
      "status": "deprecated",
      "trend": "declining"
    },
    "v2": {
      "requests": 850000,
      "percentage": 85.0,
      "uniqueClients": 312,
      "status": "current",
      "trend": "stable"
    },
    "v3": {
      "requests": 25000,
      "percentage": 2.5,
      "uniqueClients": 8,
      "status": "beta",
      "trend": "growing"
    }
  }
}
```

---

## Rate Limiting Analytics

Track quota usage to optimize limits and find problems early.

### Quota Usage Metrics

| Metric | Description | Alert Condition |
|--------|-------------|-----------------|
| **Quota utilization** | Used / Allowed | > 80% sustained |
| **Rate limit hits** | 429 responses | > 1% of requests |
| **Burst patterns** | Requests in short windows | Spikes > 3x normal |
| **Throttle duration** | Time clients are limited | Increasing trend |

### Rate Limit Response Format

> **See Also**: [Rate Limiting Standards](../security/rate-limiting-standards.md#rate-limited-response) for the complete 429 response format and header specifications.

### Rate Limit Analytics Data

```json
{
  "clientId": "client-abc123",
  "period": "2024-01-15T10:00:00Z",
  "limits": {
    "tier": "standard",
    "perMinute": 1000,
    "perDay": 100000
  },
  "usage": {
    "thisMinute": 1000,
    "today": 45678,
    "percentUsed": 45.7
  },
  "throttling": {
    "events": 3,
    "totalDuration": 135,
    "lastThrottled": "2024-01-15T09:45:23Z"
  }
}
```

### Quota Pattern Analysis

| Pattern | Indicator | Response |
|---------|-----------|----------|
| **Consistent high usage** | > 80% daily quota | Suggest tier upgrade |
| **Burst spikes** | Brief limit hits | Adjust burst allowance |
| **Gradual increase** | Usage trending up | Plan capacity |
| **Irregular patterns** | Unpredictable usage | Investigate automation |

---

## Error Pattern Analysis

Group and track errors to fix them faster.

### Error Categorization

| Category | Status Codes | Common Causes |
|----------|--------------|---------------|
| **Validation errors** | 400, 422 | Bad input, missing fields |
| **Authentication** | 401 | Expired tokens, wrong credentials |
| **Authorization** | 403 | Insufficient permissions |
| **Not found** | 404 | Invalid IDs, deleted resources |
| **Rate limits** | 429 | Quota exceeded |
| **Server errors** | 500, 502, 503 | Bugs, dependencies, capacity |

### Error Analytics Data Model

```json
{
  "timestamp": "2024-01-15T10:30:45Z",
  "requestId": "req-abc123",
  "error": {
    "status": 422,
    "type": "validation_error",
    "code": "INVALID_EMAIL",
    "message": "Email format is invalid",
    "field": "customer.email"
  },
  "context": {
    "endpoint": "/v1/customers",
    "method": "POST",
    "clientId": "client-xyz",
    "apiVersion": "v1"
  }
}
```

### Error Trending

Track error patterns over time:

```
ERROR RATE TREND (Last 7 Days)

2.0% ┤              *
     │             * *
1.5% ┤            *   *
     │     *     *     *
1.0% ┤    * *   *       *
     │   *   * *         * *
0.5% ┤  *     *           * *
     │ *                    *
0.0% ┼────────────────────────▶
     Mon  Tue  Wed  Thu  Fri  Sat  Sun
     
─── 4xx errors    ─ ─ 5xx errors
```

### Error Analysis Metrics

| Metric | Calculation | Threshold |
|--------|-------------|-----------|
| **Error rate** | Errors / Total * 100 | < 1% total |
| **Client error rate** | 4xx / Total * 100 | < 5% |
| **Server error rate** | 5xx / Total * 100 | < 0.1% |
| **Error velocity** | Change in error rate | Alert on rapid increase |
| **Mean time to recover** | Duration of elevated errors | < 15 minutes |

---

## Geographic Distribution Insights

Learn where your API traffic comes from.

### Geographic Metrics

| Metric | Description | Use Case |
|--------|-------------|----------|
| **Traffic by region** | Requests per geographic area | CDN optimization |
| **Latency by region** | Response times per location | Performance tuning |
| **Error rate by region** | Failures per location | Identify regional issues |
| **Growth by region** | Traffic trends per area | Expansion planning |

### Geographic Data Collection

Derive location from:
- Client IP address (anonymized for privacy)
- Explicit client-provided location headers
- CDN edge location

```json
{
  "period": "2024-01",
  "regions": {
    "north-america": {
      "requests": 4500000,
      "percentage": 45,
      "avgLatency": 85,
      "errorRate": 0.08
    },
    "europe": {
      "requests": 3200000,
      "percentage": 32,
      "avgLatency": 120,
      "errorRate": 0.12
    },
    "asia-pacific": {
      "requests": 1800000,
      "percentage": 18,
      "avgLatency": 180,
      "errorRate": 0.15
    },
    "other": {
      "requests": 500000,
      "percentage": 5,
      "avgLatency": 220,
      "errorRate": 0.18
    }
  }
}
```

### Regional Performance Analysis

```
LATENCY BY REGION (P95)

North America  ████████░░░░░░░░░░░░  85ms
Europe         ████████████░░░░░░░░  120ms
Asia-Pacific   ██████████████████░░  180ms
South America  ████████████████████  200ms
                                            
              0ms    100ms   200ms   300ms
              
Target: ████  Above Target: ░░░░
```

---

## Client & Consumer Analytics

Watch client health and SDK usage.

### Client Identification

Track these client attributes:

| Attribute | Header/Method | Purpose |
|-----------|---------------|---------|
| **Client ID** | `X-Client-ID` header | Identify application |
| **SDK version** | `User-Agent` header | Track SDK adoption |
| **Platform** | User-Agent parsing | Platform distribution |
| **Integration type** | API key metadata | Direct vs partner |

### User-Agent Analytics

Parse User-Agent headers for insights:

```
User-Agent: MyApp/2.1.0 (iOS 17.0; iPhone14,2)
            │     │      │    │     │
            │     │      │    │     └─ Device model
            │     │      │    └─ OS version
            │     │      └─ Platform
            │     └─ App version
            └─ Application name
```

### SDK Version Distribution

```json
{
  "sdk": "example-api-sdk",
  "period": "2024-01",
  "versions": {
    "3.0.0": {
      "clients": 145,
      "requests": 4500000,
      "percentage": 45,
      "status": "current"
    },
    "2.5.0": {
      "clients": 89,
      "requests": 3200000,
      "percentage": 32,
      "status": "supported"
    },
    "2.4.0": {
      "clients": 34,
      "requests": 1800000,
      "percentage": 18,
      "status": "deprecated"
    },
    "older": {
      "clients": 12,
      "requests": 500000,
      "percentage": 5,
      "status": "unsupported"
    }
  }
}
```

### Client Health Metrics

| Metric | Description | Action Threshold |
|--------|-------------|------------------|
| **SDK currency** | % on latest SDK | < 50% triggers outreach |
| **Client error rate** | Errors per client | > 5% investigate |
| **Integration quality** | Success rate | < 95% offer support |
| **Adoption velocity** | New SDK uptake | Track post-release |

---

## Deprecation Tracking Analytics

Watch deprecated endpoint usage to plan sunset dates.

### Deprecation Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Deprecated traffic** | Requests to deprecated endpoints | Declining to zero |
| **Affected clients** | Unique clients using deprecated | Identify for outreach |
| **Migration progress** | Clients moved to new endpoints | 100% before sunset |
| **Days until sunset** | Time remaining | Countdown visibility |

### Deprecation Dashboard Data

```json
{
  "deprecatedEndpoints": [
    {
      "endpoint": "/v1/orders",
      "deprecatedDate": "2024-07-01",
      "sunsetDate": "2025-01-01",
      "daysRemaining": 45,
      "currentUsage": {
        "dailyRequests": 12500,
        "uniqueClients": 23,
        "trendPercent": -15
      },
      "successor": "/v2/orders",
      "migrationProgress": {
        "migratedClients": 89,
        "totalClients": 112,
        "percentage": 79.5
      }
    }
  ]
}
```

### Deprecation Response Headers

Include analytics-friendly deprecation info:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: true
Sunset: Wed, 01 Jan 2025 00:00:00 GMT
Link: </v2/orders>; rel="successor-version"
X-Deprecation-Notice: "Migrate to /v2/orders by 2025-01-01"
X-Days-Until-Sunset: 45

{
  "data": [...]
}
```

---

## Dashboard & Reporting Patterns

Build dashboards that give useful insights.

### Dashboard Hierarchy

```
                    EXECUTIVE DASHBOARD
                 (Business metrics, SLAs)
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │OPERATIONS│   │ PRODUCT  │   │ BUSINESS │
     │          │   │          │   │          │
     │ Uptime   │   │ Adoption │   │ Revenue  │
     │ Latency  │   │ Features │   │ Partners │
     │ Errors   │   │ Journeys │   │ Growth   │
     └──────────┘   └──────────┘   └──────────┘
            │              │              │
            ▼              ▼              ▼
     ┌──────────────────────────────────────────┐
     │          DETAILED ANALYTICS              │
     │  (Drill-down views per metric/client)    │
     └──────────────────────────────────────────┘
```

### Dashboard Components by Audience

| Audience | Key Metrics | Refresh Rate | Time Range |
|----------|-------------|--------------|------------|
| **Executives** | SLA compliance, revenue, growth | Daily | Monthly/Quarterly |
| **Operations** | Uptime, errors, latency | Real-time | Hourly/Daily |
| **Product** | Adoption, features, journeys | Hourly | Weekly/Monthly |
| **Engineering** | Performance, errors, capacity | Real-time | Hourly/Daily |
| **Partners** | Their usage, quotas, errors | Hourly | Daily/Monthly |

### Key Dashboard Visualizations

| Visualization | Use Case | Data Type |
|---------------|----------|-----------|
| **Time series** | Trends over time | Metrics history |
| **Pie/donut** | Distribution (versions, regions) | Categorical data |
| **Heat maps** | Usage patterns by time | Time-bucketed data |
| **Gauges** | Current state vs target | Single metrics |
| **Tables** | Detailed breakdowns | Multi-dimensional data |
| **Funnels** | Conversion journeys | Sequential data |

### Alert Thresholds

| Metric | Warning | Critical | Notification |
|--------|---------|----------|--------------|
| **Availability** | < 99.9% | < 99.5% | Page on-call |
| **P95 latency** | > 300ms | > 500ms | Slack channel |
| **Error rate** | > 1% | > 5% | Page on-call |
| **Quota usage** | > 80% | > 95% | Email client |
| **Deprecated usage** | Any at 30 days | Any at 7 days | Direct outreach |

---

## Real-Time vs Batch Analytics

Pick the right approach for each use case.

### Comparison

| Aspect | Real-Time | Batch |
|--------|-----------|-------|
| **Latency** | Seconds | Hours |
| **Accuracy** | Approximate | Exact |
| **Cost** | Higher | Lower |
| **Complexity** | Higher | Lower |
| **Best for** | Alerts, dashboards | Reports, billing |

### Real-Time Analytics Use Cases

| Use Case | Why Real-Time | Example |
|----------|---------------|---------|
| **Alerting** | Immediate response needed | Error rate spike |
| **Rate limiting** | Must decide per-request | Quota enforcement |
| **Live dashboards** | Current state visibility | Operations monitoring |
| **Anomaly detection** | Early warning | Traffic pattern changes |

### Batch Analytics Use Cases

| Use Case | Why Batch | Example |
|----------|-----------|---------|
| **Usage billing** | Accuracy required | Monthly invoices |
| **Trend analysis** | Complete data needed | Quarterly reports |
| **Data warehousing** | Long-term storage | Historical analytics |
| **Complex queries** | Compute-intensive | User journey analysis |

### Hybrid Architecture

```
              REAL-TIME PIPELINE
                    │
    API Request ────┼───▶ Stream Processor ───▶ Live Dashboard
                    │            │
                    │            ▼
                    │     In-Memory Cache ───▶ Alerts
                    │
                    ▼
              Event Buffer
                    │
                    ▼
              BATCH PIPELINE
                    │
                    ▼
              Data Warehouse ───▶ Reports
                    │              Billing
                    ▼              Analytics
              Long-term Storage
```

---

## Privacy & Compliance

Gather analytics while respecting privacy rules and laws.

### Data Classification

| Data Type | Sensitivity | Handling |
|-----------|-------------|----------|
| **Request counts** | Low | Aggregate freely |
| **Client IDs** | Medium | Store hashed |
| **User IDs** | High | Anonymize or hash |
| **IP addresses** | High | Truncate or hash |
| **Request bodies** | Varies | Never store in analytics |
| **Auth tokens** | Critical | Never log |

### Anonymization Techniques

| Technique | Description | Use Case |
|-----------|-------------|----------|
| **Hashing** | One-way transformation | User ID tracking |
| **Truncation** | Remove identifying parts | IP addresses (last octet) |
| **Aggregation** | Combine into groups | Geographic data |
| **Tokenization** | Replace with random ID | Session tracking |
| **Differential privacy** | Add statistical noise | Sensitive counts |

### GDPR Compliance Checklist

For APIs serving EU users:

- [ ] Document what data is collected and why (lawful basis)
- [ ] Provide data access endpoint for users
- [ ] Implement data deletion on request
- [ ] Anonymize data where possible
- [ ] Set appropriate data retention periods
- [ ] Get consent for non-essential analytics
- [ ] Document data processing in privacy policy

### Data Retention Standards

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| **Real-time metrics** | 24-48 hours | Immediate monitoring |
| **Aggregated metrics** | 2-5 years | Trend analysis |
| **Individual request logs** | 30-90 days | Debugging |
| **Anonymized analytics** | Indefinite | Historical analysis |
| **Personal data** | Per consent/regulation | Compliance |

### Privacy-Preserving Analytics Example

Instead of storing:
```json
{
  "userId": "john.doe@example.com",
  "ipAddress": "192.168.1.100",
  "endpoint": "/v1/orders"
}
```

Store:
```json
{
  "userIdHash": "a1b2c3d4e5f6...",
  "ipPrefix": "192.168.x.x",
  "region": "north-america",
  "endpoint": "/v1/orders"
}
```

---

## Implementation Checklist

Use this checklist when adding API analytics.

### Phase 1: Foundation

- [ ] Define key metrics for your API program
- [ ] Implement `X-Request-ID` header generation and propagation
- [ ] Add basic request logging (endpoint, method, status, duration)
- [ ] Set up metrics collection pipeline (real-time and/or batch)
- [ ] Create initial dashboard with golden signals

### Phase 2: Usage Analytics

- [ ] Track unique clients and request volumes
- [ ] Implement User-Agent parsing for SDK tracking
- [ ] Add geographic distribution tracking (privacy-compliant)
- [ ] Monitor endpoint popularity and usage patterns
- [ ] Set up version adoption tracking

### Phase 3: Business Metrics

- [ ] Define business events to track (orders, conversions, etc.)
- [ ] Implement event correlation with requests
- [ ] Create business-focused dashboards
- [ ] Set up revenue attribution (if applicable)
- [ ] Track partner performance metrics

### Phase 4: Advanced Analytics

- [ ] Implement user journey tracking
- [ ] Add error pattern analysis and trending
- [ ] Set up deprecation monitoring
- [ ] Create client health scoring
- [ ] Build alerting for key thresholds

### Phase 5: Compliance & Optimization

- [ ] Review data collection for privacy compliance
- [ ] Implement data anonymization where needed
- [ ] Set up data retention policies
- [ ] Document analytics in privacy policy
- [ ] Optimize analytics pipeline performance

---

## Related Documentation

### Core Standards
- [API Observability Standards](api-observability-standards.md) - Health checks, metrics, tracing
- [Performance Standards](performance-standards.md) - Caching, latency, optimization

### Security & Rate Limiting
- [Rate Limiting Standards](../security/rate-limiting-standards.md) - Throttling and quota management
- [Security Standards](../security/security-standards.md) - Authentication and authorization

### Lifecycle Management
- [API Lifecycle Management](../foundations/api-lifecycle-management.md) - Deprecation and sunset
- [API Version Strategy](../foundations/api-version-strategy.md) - Versioning patterns

### Request/Response Patterns
- [Error Response Standards](../request-response/error-response-standards.md) - Error formats and handling
- [Pagination and Filtering](../request-response/pagination-and-filtering.md) - Collection analytics

---

## Summary

Good API analytics needs:

1. **Clear metrics**: Track the four golden signals plus business metrics
2. **Request tracking**: Use `X-Request-ID` and client IDs everywhere
3. **Version watching**: Monitor adoption and deprecation for lifecycle planning
4. **Privacy first**: Anonymize data and follow regulations
5. **Right tools**: Use real-time for alerts, batch for reports
6. **Useful dashboards**: Different views for different teams

These patterns work with any technology stack. Focus on the right data, efficient storage, and insights that drive action.
