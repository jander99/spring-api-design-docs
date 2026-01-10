# Hypermedia Formats

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** API Design
> 
> **📊 Complexity:** 14.3 grade level • 0.4% technical density • fairly difficult

## Overview

Hypermedia is a way for an API to include navigation and available next steps in the response itself. A client does not have to hard-code URL paths or workflows. It can follow links and action descriptions that the server provides.

This document compares common JSON hypermedia formats and helps you choose one:

- HAL (Hypertext Application Language)
- JSON:API
- Siren
- Collection+JSON
- JSON-LD (as a semantic JSON format, sometimes used with hypermedia patterns)

The focus here is on the wire format. Examples use only HTTP and JSON.

## Why This Topic Matters

Teams often adopt “hypermedia” without agreeing on a format. That creates problems:

- Clients need custom parsing for each service
- Links and actions become inconsistent
- Tooling and documentation do not line up
- Migration becomes harder than it needs to be

A format decision is a contract decision. Pick one format per API, or define clear rules for when each format is used.

## Quick Comparison

Use this section to get oriented. Later sections show the full structures.

| Format | Primary goal | Link style | Action/form support | Typical media type |
|--------|--------------|------------|---------------------|--------------------|
| HAL | Simple links + optional embedding | `_links` (rel → link) | Not standardized | `application/hal+json` |
| JSON:API | Consistent resource documents + relationships | `links` objects | Not standardized (focus is data) | `application/vnd.api+json` |
| Siren | Rich entities + actions for workflows | `links` array + rels | Yes (`actions`) | `application/vnd.siren+json` |
| Collection+JSON | Collection navigation + write/query templates | `links` arrays | Yes (`template`, `queries`) | `application/vnd.collection+json` |
| JSON-LD | Semantic meaning and graph data | Uses IRIs and vocabularies | Not inherent; often combined with other patterns | `application/ld+json` |

## Shared Concepts (Across Formats)

Even though formats differ, most hypermedia APIs need the same core ideas.

### Link relations

A link relation is the meaning of a link, not the URL.

- `self` means “this resource”
- `next` means “the next page”
- `related` means “a related resource”

Prefer standard relations when they fit. When you need domain relations, keep them stable and document them.

### Resource state and allowed transitions

Hypermedia works best when the set of allowed operations depends on state.

Example: an order might allow `cancel` when it is `pending`, but not when it is `shipped`. The response should reflect that.

### Content negotiation

If you use a hypermedia format, prefer a dedicated media type. This reduces ambiguity.

Example patterns:

```http
GET /orders/123 HTTP/1.1
Host: api.example.com
Accept: application/hal+json
```

```http
HTTP/1.1 200 OK
Content-Type: application/hal+json
```

## HAL (Hypertext Application Language)

HAL is a simple JSON format for links and optional embedding. It is a good fit when you mainly need navigation and relationship discovery.

### Media type

- Common: `application/hal+json`

### Core structure

- `_links` holds link relations
- `_embedded` can inline related resources
- Domain data lives alongside `_links` and `_embedded`

### Example: order resource

```json
{
  "_links": {
    "self": { "href": "/orders/123" },
    "customer": { "href": "/customers/456" },
    "items": { "href": "/orders/123/items" },
    "cancel": { "href": "/orders/123/cancel" }
  },
  "id": "123",
  "status": "pending",
  "total": 99.99,
  "currency": "USD"
}
```

Notes:

- HAL link values can be a single object or an array.
- A link may include optional fields like `title` or `type`.

### Example: embedding a related resource

```json
{
  "_links": {
    "self": { "href": "/orders/123" },
    "customer": { "href": "/customers/456" }
  },
  "id": "123",
  "status": "pending",
  "total": 99.99,
  "_embedded": {
    "customer": {
      "_links": { "self": { "href": "/customers/456" } },
      "id": "456",
      "name": "John Doe"
    }
  }
}
```

### Strengths

- Easy to read and implement
- Widely used and supported by many client/server tools
- Clear separation between data and link controls

### Limitations

- No standard way to describe write actions (forms, required fields)
- Metadata and constraints are format-specific conventions
- Embedding can become large without clear rules

### Guidance

HAL works well when:

- Your clients mainly need navigation and discovery
- Workflows are simple, or actions are handled outside the format
- You want a low-friction adoption path from plain JSON

## JSON:API

JSON:API is a comprehensive specification for consistent resource documents, relationships, and compound documents. It is often chosen for client-driven data fetching patterns.

### Media type

- Required: `application/vnd.api+json`

### Core structure

- Top-level document contains `data` (single resource or array)
- Each resource object has:
  - `type` and `id`
  - `attributes` for resource fields
  - `relationships` for links to related resources
  - Optional `links` and `meta`

### Example: single resource

```json
{
  "data": {
    "type": "orders",
    "id": "123",
    "attributes": {
      "status": "pending",
      "total": 99.99,
      "currency": "USD"
    },
    "relationships": {
      "customer": {
        "data": { "type": "customers", "id": "456" },
        "links": {
          "self": "/orders/123/relationships/customer",
          "related": "/orders/123/customer"
        }
      }
    },
    "links": {
      "self": "/orders/123"
    }
  }
}
```

Notes:

- Relationship objects have a clear pattern for navigating and managing relationships.
- This format strongly shapes your resource model and naming.

### Example: compound document with included resources

```json
{
  "data": {
    "type": "orders",
    "id": "123",
    "attributes": {
      "status": "pending",
      "total": 99.99,
      "currency": "USD"
    },
    "relationships": {
      "customer": {
        "data": { "type": "customers", "id": "456" }
      }
    },
    "links": { "self": "/orders/123" }
  },
  "included": [
    {
      "type": "customers",
      "id": "456",
      "attributes": {
        "name": "John Doe"
      },
      "links": { "self": "/customers/456" }
    }
  ]
}
```

### Strengths

- Detailed and consistent specification
- Strong patterns for relationships and compound documents
- Encourages uniform payload shapes across resources

### Limitations

- Verbose and opinionated
- Learning curve for teams and clients
- Hypermedia is present, but the spec is not centered on describing actions

### Guidance

JSON:API works well when:

- You have many relationships and need consistent representation
- Clients benefit from compound documents and standardized patterns
- You want a strict payload contract that reduces per-endpoint variation

## Siren

Siren focuses on representing entities and the actions that can be taken on them. It is a strong choice for APIs with workflows and state machines.

### Media type

- Common: `application/vnd.siren+json`

### Core structure

- `class`: one or more semantic classifications
- `properties`: domain state
- `entities`: related sub-entities and embedded links
- `actions`: operations the client can perform
- `links`: navigational links

### Example: order with an action

```json
{
  "class": ["order"],
  "properties": {
    "id": "123",
    "status": "pending",
    "total": 99.99,
    "currency": "USD"
  },
  "entities": [
    {
      "class": ["customer"],
      "rel": ["customer"],
      "href": "/customers/456"
    }
  ],
  "actions": [
    {
      "name": "cancel-order",
      "title": "Cancel order",
      "method": "POST",
      "href": "/orders/123/cancel",
      "type": "application/json",
      "fields": [
        {
          "name": "reason",
          "type": "text",
          "title": "Cancellation reason",
          "required": false
        }
      ]
    }
  ],
  "links": [
    { "rel": ["self"], "href": "/orders/123" },
    { "rel": ["items"], "href": "/orders/123/items" }
  ]
}
```

Notes:

- Siren actions describe how to call the API and what inputs it accepts.
- Actions can appear or disappear based on the current state.

### Strengths

- First-class support for actions and forms
- Good fit for UI clients that need to render workflows
- Clear separation between properties, related entities, and operations

### Limitations

- Less widely adopted than HAL or JSON:API
- Tooling may be limited compared to more common formats
- Requires more careful governance to stay consistent

### Guidance

Siren works well when:

- Your API is workflow-heavy
- Allowed operations change based on state and permissions
- You want the response to describe how to perform writes

## Collection+JSON

Collection+JSON is oriented around collections. It standardizes how to list items, provide navigation, and publish templates for creating or querying resources.

### Media type

- Common: `application/vnd.collection+json`

### Core structure

A collection document includes:

- `collection.href`: the collection URL
- `items`: members of the collection
- `links`: collection-level links
- `template`: a write template for creating items
- `queries`: query templates
- `error`: a structured error object (format-specific)

### Example: collection listing

```json
{
  "collection": {
    "version": "1.0",
    "href": "/orders",
    "links": [
      { "rel": "profile", "href": "/profiles/order" }
    ],
    "items": [
      {
        "href": "/orders/123",
        "data": [
          { "name": "status", "value": "pending" },
          { "name": "total", "value": 99.99 },
          { "name": "currency", "value": "USD" }
        ],
        "links": [
          { "rel": "customer", "href": "/customers/456" }
        ]
      }
    ]
  }
}
```

### Example: write template

```json
{
  "collection": {
    "href": "/orders",
    "template": {
      "data": [
        { "name": "customerId", "prompt": "Customer ID" },
        { "name": "items", "prompt": "Items" },
        { "name": "currency", "prompt": "Currency" }
      ]
    }
  }
}
```

### Example: query template

```json
{
  "collection": {
    "href": "/orders",
    "queries": [
      {
        "rel": "search",
        "href": "/orders",
        "prompt": "Search orders",
        "data": [
          { "name": "status", "value": "" },
          { "name": "customerId", "value": "" }
        ]
      }
    ]
  }
}
```

### Strengths

- Strong patterns for collection navigation
- Built-in templates for writes and queries
- Works well for APIs that behave like catalogs and lists

### Limitations

- Verbose for simple resources
- Less common than HAL and JSON:API
- Format-specific error handling can conflict with broader error standards

### Guidance

Collection+JSON works well when:

- The collection view is central to the API
- You want first-class write and query templates
- Client developers benefit from predictable collection patterns

## JSON-LD

JSON-LD adds semantic meaning to JSON by using linked data concepts. It is most useful when you need a shared vocabulary across systems, or when you want graph-style data.

JSON-LD is not a “hypermedia format” in the same way as HAL, Siren, or Collection+JSON. It is a way to express meaning and relationships that can support hypermedia patterns.

### Media type

- `application/ld+json`

### Example: order with a vocabulary

```json
{
  "@context": "https://schema.org",
  "@type": "Order",
  "@id": "https://api.example.com/orders/123",
  "orderStatus": "pending",
  "priceCurrency": "USD",
  "totalPrice": 99.99,
  "customer": {
    "@type": "Person",
    "@id": "https://api.example.com/customers/456",
    "name": "John Doe"
  }
}
```

### Strengths

- Strong semantic interoperability through shared vocabularies
- Works well for graph data and knowledge systems
- Can support machine reasoning and search across domains

### Limitations

- Added complexity for many API teams
- Requires vocabulary governance and discipline
- Does not standardize actions or forms by itself

### Guidance

JSON-LD works well when:

- Your domain benefits from shared vocabularies and semantic meaning
- You need graph-like representations across systems
- You want linked data compatibility

## Format Selection Guide

Choose based on the main problem you are solving.

### If you mainly need links

Pick HAL when:

- You want a simple structure for links
- Most operations are basic CRUD
- You do not need a standard way to express write forms

### If you need strict, consistent resource documents

Pick JSON:API when:

- You have many relationships
- You want consistent payload shapes and strong conventions
- You want to support compound documents and relationship patterns

### If you need action-heavy workflows

Pick Siren when:

- The API exposes state-dependent operations
- Clients benefit from action and form descriptions
- You want a clear model for “what can I do next?”

### If your API is collection-centric

Pick Collection+JSON when:

- Collections and queries are the core experience
- You want built-in templates for creating and searching
- Client teams benefit from a predictable collection document

### If semantics are the main need

Pick JSON-LD when:

- You need shared meaning across organizations or systems
- You have a defined vocabulary strategy
- You are building graph-like data or knowledge features

### A practical rule

If you are choosing a single general-purpose format:

- Start with HAL for link-centric APIs
- Consider Siren when you want actions without inventing your own conventions
- Choose JSON:API when you want a full specification for resource documents and relationships

## Migration Patterns

This section describes a safe path from plain JSON to a hypermedia format.

### Step 1: Add stable `self` links

Start by adding a self link for each resource. Clients can still use existing fields. New clients can start following links.

Example (HAL):

```json
{
  "_links": {
    "self": { "href": "/orders/123" }
  },
  "id": "123",
  "status": "pending"
}
```

### Step 2: Add links for important relationships

Add links for common navigation paths such as `customer`, `items`, and collection traversal.

Keep relation names consistent across your API.

### Step 3: Add state-dependent actions

If the format supports actions (for example Siren), expose them only when allowed.

If the format does not standardize actions (for example HAL), define a consistent convention and keep it stable.

### Step 4: Decide on embedding rules

Embedding reduces round trips, but increases payload size.

Define rules such as:

- Which relations can be embedded
- How to request embedding (if supported)
- Maximum depth of embedding

### Step 5: Add versioning and negotiation rules

If you introduce new media types, document how clients request them.

Common patterns:

- One media type per format
- One default media type with a controlled migration window

## Industry References

These are the primary specifications for the formats covered in this guide:

- HAL: https://stateless.group/hal_specification.html
- JSON:API: https://jsonapi.org/format/
- Siren: https://github.com/kevinswiber/siren
- Collection+JSON: http://amundsen.com/media-types/collection/
- JSON-LD: https://www.w3.org/TR/json-ld/
