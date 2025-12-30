# Richardson Maturity Model

The Richardson Maturity Model (RMM) provides a framework for assessing REST API maturity. Created by Leonard Richardson, it describes four levels of REST compliance.

## Quick Assessment

Answer these questions to find your level:

| Question | Level 0 | Level 1 | Level 2 | Level 3 |
|----------|---------|---------|---------|---------|
| How many endpoints? | One | Multiple | Multiple | Multiple |
| HTTP methods used? | POST only | Mostly POST | All appropriate | All + discovery |
| How specify operation? | In body | In URL | HTTP method | Method + links |
| Response includes? | Just data | Data | Data + status | Data + hypermedia |

## Level 0: The Swamp of POX

**Plain Old XML/JSON over HTTP** - HTTP used only as transport.

### Characteristics
- Single endpoint for all operations
- All requests use POST
- Operation name in request body
- Custom status codes or always 200

### Example

```http
POST /api HTTP/1.1
Content-Type: application/json

{
  "operation": "getOrder",
  "orderId": "123"
}

HTTP/1.1 200 OK
{
  "success": true,
  "data": {
    "id": "123",
    "status": "PENDING"
  }
}
```

```http
POST /api HTTP/1.1
Content-Type: application/json

{
  "operation": "createOrder",
  "customerId": "456",
  "items": [...]
}
```

### Problems
- No caching (all POST requests)
- No standard error handling
- Clients need detailed documentation
- Tight coupling between client and server

### Migration Path to Level 1
1. Identify distinct resources (orders, customers, products)
2. Create separate endpoints for each resource
3. Move operation from body to URL path
4. Keep POST for now - fix methods in Level 2

---

## Level 1: Resources

Individual URIs for different resources, but HTTP used improperly.

### Characteristics
- Multiple endpoints for different entities
- Resources have identifiers in URLs
- Still mostly using POST
- Beginning to think in nouns

### Example

```http
POST /orders/123 HTTP/1.1
Content-Type: application/json

{
  "action": "get"
}

HTTP/1.1 200 OK
{
  "id": "123",
  "status": "PENDING"
}
```

```http
POST /orders HTTP/1.1
Content-Type: application/json

{
  "action": "create",
  "customerId": "456",
  "items": [...]
}
```

### Improvements over Level 0
- Resources are identifiable
- Some URL structure
- Easier to understand API scope

### Remaining Problems
- Still can't cache (POST everywhere)
- Action in body is redundant with HTTP methods
- Status codes not used properly

### Migration Path to Level 2
1. Map actions to HTTP methods:
   - `{"action": "get"}` → GET
   - `{"action": "create"}` → POST
   - `{"action": "update"}` → PUT/PATCH
   - `{"action": "delete"}` → DELETE
2. Remove action from request body
3. Add proper status codes

---

## Level 2: HTTP Verbs

Proper use of HTTP methods and status codes. **This is the industry standard.**

### Characteristics
- GET for reads, POST for creates
- PUT/PATCH for updates, DELETE for removal
- Proper status codes (200, 201, 404, etc.)
- Stateless requests
- Cacheable GET responses

### Example

```http
GET /orders/123 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=60

{
  "id": "123",
  "status": "PENDING",
  "customerId": "456"
}
```

```http
POST /orders HTTP/1.1
Content-Type: application/json

{
  "customerId": "456",
  "items": [...]
}

HTTP/1.1 201 Created
Location: /orders/789
Content-Type: application/json

{
  "id": "789",
  "status": "PENDING"
}
```

```http
DELETE /orders/123 HTTP/1.1

HTTP/1.1 204 No Content
```

### Benefits
- HTTP caching works for GET
- Standard tooling understands API
- Consistent, predictable behavior
- Method-based authorization possible
- Clear operation semantics

### Status Code Usage

| Scenario | Status Code |
|----------|-------------|
| GET success | 200 OK |
| POST create | 201 Created |
| PUT/PATCH update | 200 OK |
| DELETE success | 204 No Content |
| Invalid request | 400 Bad Request |
| Not authenticated | 401 Unauthorized |
| Not authorized | 403 Forbidden |
| Not found | 404 Not Found |
| Conflict | 409 Conflict |
| Server error | 500 Internal Server Error |

### When Level 2 Is Sufficient
- Internal microservices
- Simple CRUD applications
- Performance-critical APIs
- Teams new to REST
- Rapid development needed

---

## Level 3: Hypermedia Controls (HATEOAS)

**Hypermedia as the Engine of Application State** - True REST as defined by Roy Fielding.

### Characteristics
- Responses include links to related resources
- Links indicate available actions
- Clients discover API capabilities
- Self-documenting responses
- API evolution without breaking clients

### Example

```http
GET /orders/123 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "123",
  "status": "PENDING",
  "customerId": "456",
  "total": 99.99,
  "_links": {
    "self": {"href": "/orders/123"},
    "customer": {"href": "/customers/456"},
    "items": {"href": "/orders/123/items"},
    "cancel": {"href": "/orders/123/cancel", "method": "POST"},
    "payment": {"href": "/orders/123/payment", "method": "POST"}
  }
}
```

After payment:
```json
{
  "id": "123",
  "status": "PAID",
  "_links": {
    "self": {"href": "/orders/123"},
    "ship": {"href": "/orders/123/ship", "method": "POST"},
    "refund": {"href": "/orders/123/refund", "method": "POST"}
  }
}
```

Note: `cancel` link is gone (can't cancel paid order), `ship` link appears.

### Hypermedia Formats

**HAL (Hypertext Application Language)**:
```json
{
  "id": "123",
  "_links": {
    "self": {"href": "/orders/123"},
    "items": {"href": "/orders/123/items"}
  },
  "_embedded": {
    "customer": {"id": "456", "name": "John"}
  }
}
```

**JSON:API**:
```json
{
  "data": {
    "type": "orders",
    "id": "123",
    "attributes": {"status": "PENDING"},
    "links": {"self": "/orders/123"},
    "relationships": {
      "customer": {"links": {"related": "/customers/456"}}
    }
  }
}
```

### Benefits
- **API Evolution**: Change URLs without breaking clients
- **Discovery**: Clients learn capabilities at runtime
- **State Machines**: Valid transitions are explicit
- **Documentation**: API self-describes

### Trade-offs
- Larger response payloads
- More complex client implementation
- Steeper learning curve
- Slower initial development

### When to Use Level 3
- Public APIs with diverse clients
- Long-lived APIs (5+ years)
- Complex state machines
- Multiple client types (web, mobile, IoT)
- Frequent API evolution expected

---

## Level Comparison

| Aspect | Level 0 | Level 1 | Level 2 | Level 3 |
|--------|---------|---------|---------|---------|
| Caching | None | None | Yes (GET) | Yes (GET) |
| Discoverability | None | Low | Medium | High |
| Coupling | Tight | Medium | Low | Very Low |
| Complexity | Low | Low | Medium | High |
| Industry Use | Legacy | Declining | **Standard** | Growing |
| Tooling | Poor | Poor | Excellent | Good |

## Recommendation

**Target Level 2** for most APIs. It provides:
- Industry-standard compliance
- Full HTTP caching
- Standard tooling support
- Reasonable complexity

**Consider Level 3** if:
- Building a public API platform
- Need maximum flexibility for evolution
- Have complex workflow state machines
- Multiple unknown client types

**Never stay at Level 0 or 1** for new development.

## Assessment Checklist

### Level 2 Compliance
- [ ] GET never modifies state
- [ ] POST used for creation only
- [ ] PUT replaces entire resource
- [ ] PATCH updates partial resource
- [ ] DELETE removes resource
- [ ] 201 returned for successful POST
- [ ] 204 returned for successful DELETE
- [ ] 4xx codes for client errors
- [ ] 5xx codes for server errors
- [ ] URLs are nouns, not verbs
- [ ] Collections use plural nouns

### Level 3 Additions
- [ ] All responses include `self` link
- [ ] Related resources are linked
- [ ] Available actions included as links
- [ ] Links change based on state
- [ ] Clients navigate via links, not hardcoded URLs
