# Search and Discovery Patterns

Search lets clients discover resources when they do not know an ID or exact filter values. This document defines consistent HTTP patterns for full-text search, faceting, autocomplete, ranking, highlighting, pagination, and analytics.

## Why This Topic is Important

Pagination and filtering help clients narrow a list when they already know what to ask for (status, date range, category). Search supports a different need: discovery.

Without clear search patterns, APIs often end up with:

- Inconsistent query parameters across endpoints
- Unstable pagination (duplicates or missing items)
- Hard-to-debug relevance behavior
- Slow or expensive queries that are hard to control
- Poor user experience (no suggestions, no facets, no highlights)

## Overview

Search APIs usually combine three concepts:

1. **Query**: full-text intent (scored), often user-entered.
2. **Filters**: structured constraints (not scored), often UI selections.
3. **Presentation options**: facets, sorting, highlighting, pagination.

A consistent design separates these concepts so clients can reason about behavior and troubleshoot quickly.

## Full-Text Search Endpoint Design

### Option A: Resource-specific search (most common)

Use a search endpoint scoped to a single resource type.

```http
GET /v1/products/search?q=laptop HTTP/1.1
Accept: application/json
```

This pattern works well when:

- Clients search within one domain object (products, orders, tickets)
- You want resource-specific facets and ranking rules

### Option B: Dedicated global search endpoint

Use a single endpoint that searches across many resource types.

```http
GET /v1/search?q=laptop&types=products,categories HTTP/1.1
Accept: application/json
```

This pattern works well when:

- Your UI has a global search box
- You want one query to return mixed results

### Option C: Search on collections (when it is simple)

For small query sets, search can be a query on the collection endpoint.

```http
GET /v1/products?q=laptop HTTP/1.1
Accept: application/json
```

If your API already uses many query parameters on the collection, a separate `/search` path often stays clearer.

### GET vs POST for search

Use `GET` for simple queries that fit well in a URL. `GET` is easy to cache, bookmark, and log. It is also a better fit for CDNs and shared caches.

Use `POST` when the query is complex or too large for a URL.

```http
POST /v1/products/search HTTP/1.1
Content-Type: application/json
Accept: application/json

{
  "query": {
    "text": "laptop",
    "operator": "AND"
  },
  "filters": {
    "brand": ["Dell", "HP"],
    "price": {"gte": 500, "lt": 1000}
  },
  "facets": ["brand", "price_range"],
  "page": {"size": 20}
}
```

Notes:

- Search is still read-only, even when using `POST`.
- If you use `POST`, define caching expectations explicitly (often `Cache-Control: no-store`).
- Avoid request bodies on `GET`. Many intermediaries ignore or drop them.

## Query Syntax Options

Search boxes range from simple keywords to advanced, power-user syntax. A common strategy is to support two levels:

- **Simple query**: forgiving, minimal operators, good defaults
- **Advanced query**: explicit operators and field targeting

### Simple query (recommended default)

Use a single `q` parameter as the default interface.

```http
GET /v1/products/search?q=laptop%20computer HTTP/1.1
Accept: application/json
```

Recommended defaults:

- Treat whitespace as `AND` by default (more precise results)
- Support quoted phrases: `q="gaming laptop"`
- Support a simple NOT form: `q=laptop -gaming`

If you support operators, document how you parse ambiguous input. For example, decide whether `q=foo bar` means `foo AND bar` or `foo OR bar`.

### Advanced query syntax (power users)

If you support a richer syntax, define it carefully and validate it strictly.

Examples of common capabilities:

- Boolean operators: `AND`, `OR`, `NOT`
- Grouping: parentheses
- Phrases: quotes
- Ranges: numeric or date ranges
- Escaping: a rule for special characters

Example:

```http
GET /v1/products/search?q=laptop%20AND%20(dell%20OR%20hp)%20NOT%20gaming HTTP/1.1
Accept: application/json
```

Guidelines:

- Prefer a forgiving parser for user-typed input (ignore invalid parts or return a helpful error)
- If you offer a strict mode, make it explicit (for example, `mode=strict`)

### Field-specific search

Field targeting can be offered in either a query string syntax or a structured request.

Query string example:

```http
GET /v1/products/search?q=title:laptop%20AND%20brand:dell HTTP/1.1
Accept: application/json
```

Structured example (recommended for complex logic):

```http
POST /v1/products/search HTTP/1.1
Content-Type: application/json
Accept: application/json

{
  "query": {
    "must": [
      {"match": {"field": "title", "text": "laptop"}},
      {"term": {"field": "brand", "value": "dell"}}
    ],
    "must_not": [
      {"match": {"field": "tags", "text": "gaming"}}
    ]
  }
}
```

If you allow field targeting, also define:

- Which fields are searchable
- Which fields are exact-match only
- How unknown fields are handled

## Search Filters vs Query

Treat full-text query and filters as different inputs.

- **Query (`q`)**: scored text matching, affects relevance
- **Filters (`filter[...]` or `filters`)**: exact constraints, does not affect relevance

This separation matches common search engine behavior and makes results easier to explain.

Example combining both:

```http
GET /v1/products/search?q=laptop&filter[brand]=dell&filter[in_stock]=true HTTP/1.1
Accept: application/json
```

Recommended behavior:

- Filters should narrow the candidate set before scoring
- Filters should be validated strictly (unknown fields, invalid values)
- Filters should be echoed back in response metadata to aid debugging

## Faceted Search

Facets help users refine results by showing category counts (brand, price range, status). They are essential for drill-down navigation.

### Facet request

A simple approach is a comma-separated `facets` parameter.

```http
GET /v1/products/search?q=laptop&facets=brand,category,price_range HTTP/1.1
Accept: application/json
```

Common optional controls:

- `facet_limit`: max number of facet buckets per facet
- `facet_min_count`: hide buckets with low counts
- `facet_sort`: sort by `count` or `value`

### Facet response

Return facets alongside results. Include `selected` when the client has applied a facet filter.

```json
{
  "data": [
    {
      "id": "prod-123",
      "title": "Dell XPS 15 Laptop",
      "price": 1299.99,
      "_score": 0.95
    }
  ],
  "facets": {
    "brand": [
      {"value": "Dell", "count": 45, "selected": true},
      {"value": "HP", "count": 32, "selected": false},
      {"value": "Lenovo", "count": 28, "selected": false}
    ],
    "category": [
      {"value": "Laptops", "count": 85, "selected": false},
      {"value": "Accessories", "count": 20, "selected": false}
    ],
    "price_range": [
      {"value": "0-500", "count": 25, "selected": false},
      {"value": "500-1000", "count": 45, "selected": true},
      {"value": "1000+", "count": 35, "selected": false}
    ]
  },
  "meta": {
    "query": "laptop",
    "took_ms": 23,
    "total": 156
  }
}
```

Facet types you may need:

- **Terms facets**: counts per field value (brand)
- **Range facets**: counts per numeric/date range (price, created_at)
- **Hierarchical facets**: parent/child buckets (category → subcategory)

Guidelines:

- Define whether facet counts reflect the current filters (usually yes)
- Define whether a facet counts itself as a filter when computing counts (common behavior is “self-excluding” for better UX)
- Apply authorization and visibility rules before computing facets

## Autocomplete and Typeahead

Autocomplete reduces zero-result queries and helps users discover valid terms.

### Endpoint design

Keep autocomplete separate from full search because it has different performance requirements.

```http
GET /v1/search/suggest?q=lap&limit=5 HTTP/1.1
Accept: application/json
```

You can also scope suggestions:

```http
GET /v1/products/suggest?q=lap&limit=5 HTTP/1.1
Accept: application/json
```

### Response

```json
{
  "suggestions": [
    {"text": "laptop", "score": 0.95},
    {"text": "laptop bag", "score": 0.82},
    {"text": "laptop stand", "score": 0.78}
  ],
  "meta": {
    "took_ms": 4
  }
}
```

### Performance considerations

Autocomplete endpoints should be fast and predictable.

Common practices:

- Require a minimum input length (often 2–3 characters)
- Use tight limits (`limit` defaults low, maximum enforced)
- Prefer prefix matching; avoid expensive wildcard searches
- Cache popular suggestions (short TTL)
- Rate limit aggressively to protect the system

A typical target is sub-100ms response time under expected load.

## Result Ranking

Ranking decides which results appear first. Ranking behavior should be consistent and explainable.

### Relevance scoring

Many systems use scoring models such as TF-IDF or BM25. Your API does not need to expose the scoring algorithm, but it should define how scoring interacts with filters and sorting.

Recommended behaviors:

- Treat filters as constraints, not scoring inputs
- Use a stable tie-breaker so results are deterministic (for example, by ID)
- Provide enough metadata for debugging in non-production environments

### Boosting fields

Boosting lets some fields matter more than others (title > description).

Query-string example:

```http
GET /v1/products/search?q=laptop&boost=title:2.0,description:1.0 HTTP/1.1
Accept: application/json
```

If you support boosting:

- Restrict which fields can be boosted
- Enforce safe ranges for boost values
- Treat boosting as an advanced feature

### Sort options

Sorting is not the same as relevance. Sorting overrides ranking (or changes the ranking rule).

```http
GET /v1/products/search?q=laptop&sort=relevance HTTP/1.1
Accept: application/json
```

```http
GET /v1/products/search?q=laptop&sort=price:asc HTTP/1.1
Accept: application/json
```

```http
GET /v1/products/search?q=laptop&sort=created_at:desc HTTP/1.1
Accept: application/json
```

Guidelines:

- Keep the allowed sort fields limited and documented
- When sorting by non-relevance fields, define how ties are broken

## Highlighting

Highlighting shows where the query matched. It improves usability but adds cost.

### Request

```http
GET /v1/products/search?q=laptop&highlight=true&highlight_fields=title,description HTTP/1.1
Accept: application/json
```

### Response

```json
{
  "data": [
    {
      "id": "prod-123",
      "title": "Dell Laptop XPS 15",
      "description": "Powerful laptop for professionals",
      "_highlights": {
        "title": ["Dell <em>Laptop</em> XPS 15"],
        "description": ["Powerful <em>laptop</em> for professionals"]
      }
    }
  ],
  "meta": {
    "query": "laptop",
    "took_ms": 23
  }
}
```

Guidelines:

- Highlighting output should be safe to render (escape content or document safe tags)
- Allow clients to choose which fields to highlight
- Enforce limits (snippet count, snippet size)

## Pagination for Search

Search pagination has extra risks because results can change while the client paginates.

### Cursor-based pagination (recommended)

Cursor pagination keeps page boundaries stable and performs well at scale.

```http
GET /v1/products/search?q=laptop&page[size]=20 HTTP/1.1
Accept: application/json
```

```http
GET /v1/products/search?q=laptop&page[size]=20&page[cursor]=eyJpZCI6InByb2QtMTIzIn0= HTTP/1.1
Accept: application/json
```

Example response:

```json
{
  "data": [
    {"id": "prod-123", "title": "Dell XPS 15 Laptop", "_score": 0.95}
  ],
  "meta": {
    "query": "laptop",
    "total": 156,
    "took_ms": 23
  },
  "pagination": {
    "cursor": "eyJpZCI6InByb2QtMTIzIn0=",
    "has_more": true
  }
}
```

Guidelines:

- Treat cursor tokens as opaque
- Bind the cursor to the query and sort order
- Include a stable tie-breaker in the cursor

### Offset-based pagination

Offset pagination is simple but can be unstable on changing data and may not scale well.

```http
GET /v1/products/search?q=laptop&page[offset]=0&page[limit]=20 HTTP/1.1
Accept: application/json
```

Guidelines:

- Enforce a maximum offset or maximum “reachable” results
- Document that results may shift between pages if the index changes

## Multi-Resource Search Responses

If you return mixed resource types, ensure each result is self-describing.

```http
GET /v1/search?q=laptop&types=products,categories&limit=5 HTTP/1.1
Accept: application/json
```

```json
{
  "data": [
    {
      "type": "product",
      "id": "prod-123",
      "title": "Dell XPS 15 Laptop",
      "_score": 0.95
    },
    {
      "type": "category",
      "id": "cat-9",
      "title": "Laptops",
      "_score": 0.72
    }
  ],
  "meta": {
    "query": "laptop",
    "types": ["products", "categories"],
    "took_ms": 18
  }
}
```

Guidelines:

- Use a consistent type discriminator (`type`)
- Avoid returning different shapes per type unless documented
- Consider separate per-type facets when the UI needs them

## Search Analytics

Analytics help you improve relevance and user experience.

### What to track

Track enough information to answer:

- Which queries are common?
- Which queries return zero results?
- Which results do users click?
- Which filters do users apply?
- How long do search and suggest requests take?

### Event shape (example)

A simple event payload can capture search behavior.

```json
{
  "event_type": "search",
  "timestamp": "2026-01-10T12:00:00Z",
  "request_id": "req-9d2f",
  "query": "laptop",
  "filters": {
    "brand": ["Dell"],
    "in_stock": true
  },
  "total": 156,
  "page_size": 20,
  "latency_ms": 23,
  "zero_results": false
}
```

If you also track clicks, store the clicked result ID and position.

Guidelines:

- Avoid logging sensitive user input without a privacy review
- Consider sampling for high-volume endpoints
- Keep analytics separate from the core search response

### Improving search using analytics

Common improvements driven by analytics:

- Add synonyms for frequent variants
- Improve ranking for high-click results
- Add or refine autocomplete suggestions
- Detect and address zero-result queries

## Error Handling and Safety

Search APIs need strict validation and clear error responses.

### Invalid query syntax

Return `400 Bad Request` when the query cannot be parsed or validated.

```http
GET /v1/products/search?q=title:(laptop%20AND HTTP/1.1
Accept: application/json
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/invalid-search-query",
  "title": "Invalid search query",
  "status": 400,
  "detail": "The search query could not be parsed.",
  "invalid_params": [
    {
      "name": "q",
      "reason": "Unbalanced parentheses near 'title:(laptop AND'"
    }
  ]
}
```

### Unsupported search fields or options

If a client requests unsupported fields (for example, `highlight_fields=secret_notes`), return `400 Bad Request` and describe the allowed values.

### Timeouts and protection limits

Search queries can be expensive.

Common safeguards:

- Enforce maximum page sizes and facet limits
- Reject or constrain extremely broad queries
- Use request timeouts and return `503 Service Unavailable` if the search backend is unavailable
- Rate limit high-frequency endpoints (especially suggest) and return `429 Too Many Requests`

## Example HTTP Interactions

### Basic search

```http
GET /v1/products/search?q=laptop&page[size]=20 HTTP/1.1
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "prod-123",
      "title": "Dell XPS 15 Laptop",
      "price": 1299.99,
      "_score": 0.95
    }
  ],
  "meta": {
    "query": "laptop",
    "total": 156,
    "took_ms": 23
  },
  "pagination": {
    "cursor": "eyJpZCI6InByb2QtMTIzIn0=",
    "has_more": true
  }
}
```

### Faceted search with a selected facet

```http
GET /v1/products/search?q=laptop&facets=brand,price_range&filter[price_range]=500-1000 HTTP/1.1
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {"id": "prod-555", "title": "Laptop Model A", "_score": 0.88}
  ],
  "facets": {
    "brand": [
      {"value": "Dell", "count": 12, "selected": false},
      {"value": "HP", "count": 8, "selected": false}
    ],
    "price_range": [
      {"value": "0-500", "count": 0, "selected": false},
      {"value": "500-1000", "count": 20, "selected": true},
      {"value": "1000+", "count": 0, "selected": false}
    ]
  },
  "meta": {
    "query": "laptop",
    "total": 20,
    "took_ms": 19,
    "filters_applied": ["price_range:500-1000"]
  }
}
```
