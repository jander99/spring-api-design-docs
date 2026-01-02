# Hypermedia Controls

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 8 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** REST, Data, Architecture
> 
> **📊 Complexity:** 11.0 grade level • 0.9% technical density • fairly difficult

## Overview

Hypermedia controls let APIs tell clients what actions they can take next. Instead of clients hard-coding URLs and workflows, the server includes links and forms in responses that guide clients through available operations.

This represents Richardson Maturity Model Level 3, also known as HATEOAS (Hypermedia as the Engine of Application State). The server response contains both data and navigation controls, making APIs self-documenting and discoverable.

## What Are Hypermedia Controls?

Hypermedia controls are structured elements in API responses that describe:

1. **Links**: Available related resources and navigation paths
2. **Affordances**: Actions clients can perform (create, update, delete)
3. **Templates**: Forms showing required data for write operations
4. **Relations**: Semantic meaning of each link using standard relation types

Instead of documenting all possible URLs separately, clients discover them through the API responses themselves. The server guides the client through valid state transitions.

## Core Concepts

### Links

Links connect resources. Each link has three essential parts:

- **Target URI**: Where the link points
- **Relation Type**: What the link means (semantics)
- **Optional Metadata**: Title, media type, or other hints

### Link Relations

Link relations describe the meaning of a link. They answer "what does this link do?" Standard relation types come from the IANA registry and include:

- `self`: The current resource
- `next`/`prev`: Pagination controls
- `edit`: Where to update this resource
- `collection`: The parent collection
- `item`: Individual members of a collection

Custom relations can extend the vocabulary for domain-specific needs.

### Affordances

Affordances show what operations are possible. A link with `rel="edit"` affords updating. A template affords creating new resources. Clients examine affordances to build user interfaces dynamically.

## Hypermedia Formats

Three major formats standardize how to express hypermedia controls in JSON.

### HAL (Hypertext Application Language)

HAL uses reserved properties `_links` and `_embedded` to separate hypermedia controls from domain data.

#### Basic HAL Structure

```json
{
  "_links": {
    "self": { 
      "href": "/orders/123" 
    }
  },
  "total": 30.00,
  "currency": "USD",
  "status": "shipped"
}
```

The `_links` object contains all link relations. Each relation maps to a link object with an `href` property.

#### Multiple Links with Same Relation

When a relation can have multiple links, use an array:

```json
{
  "_links": {
    "self": { "href": "/articles/1" },
    "author": [
      { "href": "/people/2", "title": "Primary Author" },
      { "href": "/people/5", "title": "Contributing Author" }
    ]
  }
}
```

#### Embedded Resources

HAL can embed related resources to reduce round trips:

```json
{
  "_links": {
    "self": { "href": "/orders/123" }
  },
  "total": 30.00,
  "currency": "USD",
  "_embedded": {
    "customer": {
      "_links": {
        "self": { "href": "/customers/456" }
      },
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
}
```

The embedded customer resource includes its own links. Clients can use the embedded data or follow links for full details.

#### CURIEs for Documentation

CURIEs (Compact URIs) make link documentation discoverable:

```json
{
  "_links": {
    "curies": [{
      "name": "doc",
      "href": "https://api.example.com/docs/rels/{rel}",
      "templated": true
    }],
    "self": { "href": "/orders" },
    "doc:search": {
      "href": "/orders{?id,status}",
      "templated": true
    }
  }
}
```

The `doc:search` relation expands to `https://api.example.com/docs/rels/search`, where documentation lives.

#### Collection Example

```json
{
  "_links": {
    "self": { "href": "/orders" },
    "next": { "href": "/orders?page=2" },
    "find": {
      "href": "/orders{?id}",
      "templated": true
    }
  },
  "totalOrders": 150,
  "currentlyProcessing": 14,
  "_embedded": {
    "orders": [
      {
        "_links": {
          "self": { "href": "/orders/123" },
          "customer": { "href": "/customers/456" }
        },
        "total": 30.00,
        "status": "shipped"
      },
      {
        "_links": {
          "self": { "href": "/orders/124" },
          "customer": { "href": "/customers/789" }
        },
        "total": 20.00,
        "status": "processing"
      }
    ]
  }
}
```

### JSON:API

JSON:API provides conventions for client-server communication. Links appear at multiple levels in strict locations.

#### Resource Object with Links

```json
{
  "data": {
    "type": "articles",
    "id": "1",
    "attributes": {
      "title": "Understanding Hypermedia"
    },
    "relationships": {
      "author": {
        "links": {
          "self": "/articles/1/relationships/author",
          "related": "/articles/1/author"
        },
        "data": { "type": "people", "id": "9" }
      }
    },
    "links": {
      "self": "/articles/1"
    }
  }
}
```

Three link locations exist:

1. **Top-level links**: Document-wide navigation
2. **Resource links**: Resource-specific operations
3. **Relationship links**: Relationship management

#### Link Objects with Metadata

JSON:API supports rich link objects:

```json
{
  "links": {
    "related": {
      "href": "/articles/1/comments",
      "title": "Comments",
      "meta": {
        "count": 10
      }
    }
  }
}
```

#### Collection with Pagination

```json
{
  "links": {
    "self": "/articles?page=2",
    "first": "/articles?page=1",
    "prev": "/articles?page=1",
    "next": "/articles?page=3",
    "last": "/articles?page=10"
  },
  "data": [
    {
      "type": "articles",
      "id": "1",
      "attributes": {
        "title": "First Article"
      },
      "links": {
        "self": "/articles/1"
      }
    }
  ]
}
```

Standard pagination relations (`first`, `prev`, `next`, `last`) let clients navigate without knowing the URL structure.

#### Included Resources

JSON:API can include related resources:

```json
{
  "data": {
    "type": "articles",
    "id": "1",
    "attributes": {
      "title": "Understanding Hypermedia"
    },
    "relationships": {
      "author": {
        "data": { "type": "people", "id": "9" }
      },
      "comments": {
        "data": [
          { "type": "comments", "id": "5" },
          { "type": "comments", "id": "12" }
        ]
      }
    }
  },
  "included": [
    {
      "type": "people",
      "id": "9",
      "attributes": {
        "name": "Dan Gebhardt"
      }
    },
    {
      "type": "comments",
      "id": "5",
      "attributes": {
        "body": "Great article!"
      }
    },
    {
      "type": "comments",
      "id": "12",
      "attributes": {
        "body": "Very helpful"
      }
    }
  ]
}
```

The `included` array contains full representations of related resources referenced in relationships.

### Collection+JSON

Collection+JSON focuses on collection management with read/write templates.

#### Basic Collection

```json
{
  "collection": {
    "version": "1.0",
    "href": "/tasks",
    "items": [
      {
        "href": "/tasks/1",
        "data": [
          { "name": "title", "value": "Complete API design" },
          { "name": "status", "value": "in-progress" }
        ],
        "links": [
          { 
            "rel": "edit", 
            "href": "/tasks/1",
            "prompt": "Edit this task"
          }
        ]
      }
    ]
  }
}
```

Each item has a `data` array with name-value pairs and a `links` array for actions.

#### Write Template

Collection+JSON includes templates showing how to create resources:

```json
{
  "collection": {
    "href": "/tasks",
    "template": {
      "data": [
        { 
          "name": "title", 
          "value": "",
          "prompt": "Task title"
        },
        { 
          "name": "status", 
          "value": "",
          "prompt": "Current status"
        },
        { 
          "name": "dueDate", 
          "value": "",
          "prompt": "Due date (YYYY-MM-DD)"
        }
      ]
    }
  }
}
```

Clients use the template structure to build valid POST requests. The `prompt` guides users.

#### Query Templates

Queries work like GET forms:

```json
{
  "collection": {
    "href": "/tasks",
    "queries": [
      {
        "rel": "search",
        "href": "/tasks",
        "prompt": "Search tasks",
        "data": [
          { "name": "status", "value": "" },
          { "name": "assignee", "value": "" }
        ]
      }
    ]
  }
}
```

The client appends query parameters: `/tasks?status=completed&assignee=alice`

#### Error Reporting

Collection+JSON has structured error objects:

```json
{
  "collection": {
    "version": "1.0",
    "href": "/tasks",
    "error": {
      "title": "Validation Error",
      "code": "invalid_status",
      "message": "Status must be one of: pending, in-progress, completed"
    }
  }
}
```

## Link Relation Types

Link relations provide semantics. Standard relations ensure consistent meaning across APIs.

### Common IANA Relations

From the IANA registry:

- **self**: Current resource identity
- **collection**: Parent collection containing this resource
- **item**: Member of a collection
- **edit**: Where to modify this resource
- **create-form**: Where to get a creation form
- **next/prev**: Sequential navigation
- **first/last**: Boundary navigation
- **related**: Associated resource
- **alternate**: Different representation of same resource
- **describedby**: Documentation or schema
- **search**: Search interface

### Domain-Specific Relations

Custom relations extend the vocabulary:

```json
{
  "_links": {
    "self": { "href": "/orders/123" },
    "acme:cancel": { 
      "href": "/orders/123/cancel",
      "title": "Cancel this order"
    },
    "acme:refund": { 
      "href": "/orders/123/refund",
      "title": "Request refund"
    }
  }
}
```

Prefix custom relations with a namespace (`acme:`). Document them at a stable URI.

## When to Use Hypermedia

### Good Use Cases

Hypermedia works well when:

1. **Client diversity**: Multiple client types (web, mobile, partners)
2. **Evolving workflows**: Business processes change frequently
3. **Public APIs**: External developers need discoverability
4. **Long-lived clients**: Clients should work without updates
5. **Complex navigation**: Many possible paths through resources
6. **Dynamic permissions**: Available actions depend on user role or resource state

### Example: Order Lifecycle

Different order states afford different actions:

```json
{
  "_links": {
    "self": { "href": "/orders/123" }
  },
  "status": "pending",
  "total": 50.00
}
```

When pending, only cancellation is available. After payment:

```json
{
  "_links": {
    "self": { "href": "/orders/123" },
    "ship": { "href": "/orders/123/ship" },
    "cancel": { "href": "/orders/123/cancel" }
  },
  "status": "paid",
  "total": 50.00
}
```

Now shipping is possible. After shipping:

```json
{
  "_links": {
    "self": { "href": "/orders/123" },
    "track": { "href": "/shipments/456" },
    "return": { "href": "/orders/123/return" }
  },
  "status": "shipped",
  "total": 50.00
}
```

The client follows available links instead of hard-coding state machines.

## When Hypermedia Is Overkill

### Limited Value Scenarios

Hypermedia adds complexity without benefit when:

1. **Single client**: One client owned by the API team
2. **Stable workflows**: Business processes rarely change
3. **Simple CRUD**: Basic create-read-update-delete operations
4. **High performance needs**: Extra links increase payload size
5. **Tight coupling acceptable**: Client and server deploy together
6. **Machine-to-machine**: Both sides under same control

### Simpler Alternatives

For basic APIs, simple JSON works fine:

```json
{
  "id": "123",
  "title": "Task title",
  "status": "completed",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

Document the URL structure in OpenAPI. Clients hard-code the patterns.

### Hybrid Approach

Include only essential links:

```json
{
  "id": "123",
  "title": "Task title",
  "status": "completed",
  "links": {
    "self": "/tasks/123"
  }
}
```

This provides resource identity without full hypermedia overhead.

## Implementation Guidance

### Start Small

Begin with `self` links only:

```json
{
  "id": "123",
  "name": "Example",
  "links": {
    "self": "/resources/123"
  }
}
```

Add more links as needs emerge.

### Use Standard Relations

Stick to IANA relations when possible. Clients understand them already. Only create custom relations for domain-specific actions.

### Document Relations

Even with standard relations, provide documentation:

```json
{
  "_links": {
    "curies": [{
      "name": "help",
      "href": "https://api.example.com/docs/rels/{rel}",
      "templated": true
    }],
    "help:workflow": {
      "href": "https://api.example.com/docs/workflows/order"
    }
  }
}
```

### Version Carefully

Hypermedia enables evolution, but changes still need care:

1. **Adding links**: Safe, old clients ignore them
2. **Removing links**: Breaking change
3. **Changing link semantics**: Breaking change
4. **Adding link metadata**: Safe

### Test Client Discovery

Verify clients can:

1. Find required links by relation type
2. Handle missing optional links
3. Ignore unknown relation types
4. Follow link templates correctly

## Practical Example: Blog API

### List Posts

```json
{
  "_links": {
    "self": { "href": "/posts?page=1" },
    "next": { "href": "/posts?page=2" },
    "search": { 
      "href": "/posts{?tag,author}",
      "templated": true
    }
  },
  "_embedded": {
    "posts": [
      {
        "_links": {
          "self": { "href": "/posts/1" },
          "author": { "href": "/users/10" },
          "comments": { "href": "/posts/1/comments" },
          "edit": { "href": "/posts/1" }
        },
        "title": "Getting Started with Hypermedia",
        "published": "2024-01-15T10:00:00Z",
        "summary": "Learn the basics..."
      }
    ]
  }
}
```

### Single Post

```json
{
  "_links": {
    "self": { "href": "/posts/1" },
    "author": { "href": "/users/10" },
    "comments": { "href": "/posts/1/comments" },
    "edit": { "href": "/posts/1" },
    "delete": { "href": "/posts/1" },
    "publish": { "href": "/posts/1/publish" }
  },
  "title": "Getting Started with Hypermedia",
  "content": "Full content here...",
  "status": "draft",
  "published": null,
  "tags": ["api", "hypermedia", "rest"]
}
```

The `publish` link only appears for draft posts. After publishing, it disappears and `unpublish` might appear instead.

### Comments Collection

```json
{
  "_links": {
    "self": { "href": "/posts/1/comments" },
    "post": { "href": "/posts/1" },
    "create": { "href": "/posts/1/comments" }
  },
  "_embedded": {
    "comments": [
      {
        "_links": {
          "self": { "href": "/comments/5" },
          "author": { "href": "/users/20" },
          "edit": { "href": "/comments/5" },
          "delete": { "href": "/comments/5" }
        },
        "body": "Great article!",
        "created": "2024-01-16T14:30:00Z"
      }
    ]
  }
}
```

## Key Takeaways

1. **Hypermedia adds navigation**: Links guide clients through available operations
2. **Link relations provide meaning**: Standard relations ensure consistent semantics
3. **Templates enable writes**: Servers tell clients what data to send
4. **Three major formats**: HAL, JSON:API, and Collection+JSON each have strengths
5. **Not always worth it**: Simple APIs with tight coupling don't need hypermedia
6. **Start incrementally**: Add links gradually as complexity grows
7. **Use standards**: IANA relations and established formats reduce client work
8. **Document everything**: Even discoverable APIs need human documentation

## Resources

### Specifications

- [HAL Specification](https://stateless.group/hal_specification.html)
- [JSON:API Specification](https://jsonapi.org/)
- [Collection+JSON Specification](http://amundsen.com/media-types/collection/)
- [IANA Link Relations Registry](https://www.iana.org/assignments/link-relations/)

### Complete Examples

- [Event-Driven Examples](./examples/event-driven/complete-examples.md)
- [Streaming Examples](../examples/streaming/)

### Reference Documentation

- [Event-Driven Configuration](./reference/event-driven/detailed-configuration.md)

### Troubleshooting

- [Event-Driven Issues](./troubleshooting/event-driven/common-issues.md)
