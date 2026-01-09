# Richardson Maturity Model - API Assessment Guide

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 2 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** REST
> 
> **📊 Complexity:** 7.8 grade level • 1.2% technical density • easy

## 🗺️ Find Your API's Maturity Level

The Richardson Maturity Model (RMM) provides a way to grade your REST API's maturity. Use this guide to identify where your API currently stands and discover the path to improvement.

## Quick Assessment

### 🎯 **Start Here: Which Best Describes Your API?**

| If Your API... | You're at Level | Go to |
|----------------|-----------------|-------|
| Uses HTTP as a tunnel, single endpoint, operations in request body | **Level 0** | [Level 0 Guide](level-0/) |
| Has multiple URLs for different resources | **Level 1** | [Level 1 Guide](level-1/) |
| Uses HTTP verbs correctly (GET, POST, PUT, DELETE) | **Level 2** | [Level 2 Guide](level-2/) |
| Includes hypermedia links in responses | **Level 3** | [Level 3 Guide](level-3/) |

## Detailed Maturity Levels

### 📍 **Level 0: The Swamp of POX**
**You are here if:**
- Single URI endpoint (e.g., `/api`)
- All requests use POST
- Operations defined in request body
- HTTP is just transport

**Example:** `POST /api` with `{"operation": "getUser", "id": 123}`

[→ View Level 0 Details](level-0/)

### 📍 **Level 1: Resources**
**You are here if:**
- Multiple URIs for different resources
- Still mostly using POST
- Resources have identifiers
- Beginning of RESTful thinking

**Example:** `POST /users/123` to get user details

[→ View Level 1 Details](level-1/)

### 📍 **Level 2: HTTP Verbs**
**You are here if:**
- Proper HTTP methods (GET, POST, PUT, DELETE)
- Correct status codes (200, 201, 404, etc.)
- Resources manipulated with appropriate verbs
- Industry standard for most APIs

**Example:** `GET /users/123` returns user, `DELETE /users/123` removes user

[→ View Level 2 Details](level-2/)

### 📍 **Level 3: Hypermedia Controls (HATEOAS)**
**You are here if:**
- Responses include links to related resources
- Self-documenting API
- Clients can discover capabilities
- Implements the hypermedia constraint of RESTful architecture

**Example:** Response includes `"_links": {"self": "/users/123", "orders": "/users/123/orders"}`

[→ View Level 3 Details](level-3/)

## 🚀 Quick Start Assessment

Take our [5-minute assessment](assessment-guide.md) to determine your API's maturity level and get personalized recommendations.

## 📊 Maturity Benefits

| Level | Development Speed | Maintenance | Scalability | Industry Adoption |
|-------|------------------|-------------|-------------|-------------------|
| 0 | Fast initially | Very Hard | Poor | Legacy only |
| 1 | Moderate | Hard | Fair | Declining |
| 2 | Good | Easy | Good | **Standard** |
| 3 | Slower initially | Very Easy | Excellent | Growing |

## Navigation by Current Level

### If you're at Level 0:
1. [Understand your current state](level-0/)
2. [Learn what you need for Level 1](level-0/next-steps.md)
3. [Review our Resource Design guide](../foundations/resource-naming-and-url-structure.md)

### If you're at Level 1:
1. [Review your accomplishments](level-1/)
2. [Plan your path to Level 2](level-1/next-steps.md)
3. [Study HTTP methods](../request-response/)

### If you're at Level 2:
1. [Validate your implementation](level-2/)
2. [Explore Level 3 benefits](level-2/next-steps.md)
3. [Learn about HATEOAS](../advanced-patterns/)

### If you're at Level 3:
1. [Ensure full compliance](level-3/)
2. [Review best practices](level-3/best-practices.md)
3. Help others improve by sharing your experience

## 🎯 Most Common Pattern

Level 2 is widely adopted in production and provides excellent balance between complexity and functionality. Level 3 is ideal for public APIs and long-lived systems where discoverability is crucial.

## 📚 Understanding REST vs Richardson Maturity Model

The Richardson Maturity Model is a **pedagogical tool** for understanding API design progression. It is not the same as Roy Fielding's REST architectural style.

### Roy Fielding's REST Constraints

REST (Representational State Transfer) is defined by **six architectural constraints** in Roy Fielding's 2000 dissertation:

1. **Client-Server**: Separation of concerns between UI and data storage
2. **Stateless**: Each request contains all information needed; no session state on server
3. **Cacheable**: Responses must define themselves as cacheable or not
4. **Layered System**: Client cannot tell if connected directly to end server
5. **Uniform Interface**: Standardized way to interact with resources (includes 4 sub-constraints)
6. **Code-on-Demand** (optional): Servers can extend client functionality

### The Uniform Interface Constraint

The Uniform Interface consists of four sub-constraints:

1. **Resource Identification**: Resources identified by URIs
2. **Manipulation Through Representations**: Clients modify resources through representations
3. **Self-Descriptive Messages**: Each message includes enough information to process it
4. **Hypermedia as the Engine of Application State (HATEOAS)**: Clients navigate through hypermedia links

### RMM vs REST

The Richardson Maturity Model focuses primarily on:
- **Level 1**: Resource identification (RMM addresses 1 of 4 Uniform Interface sub-constraints)
- **Level 2**: HTTP verbs and status codes (helps with self-descriptive messages)
- **Level 3**: Hypermedia controls (addresses HATEOAS sub-constraint)

**Important**: An API at Level 3 is not automatically "RESTful" if it violates:
- Statelessness (e.g., server-side sessions)
- Cacheability (e.g., missing cache headers)
- Layered system principles

### Practical Implications

Most production APIs are "HTTP APIs" or "REST-like" rather than fully RESTful:
- They use HTTP conventions (RMM Level 2)
- They may violate some REST constraints (statelessness, caching)
- This is often acceptable for their use case

Use the RMM to improve HTTP API design. Use Fielding's constraints to understand full REST architecture.

### Further Reading

- [Roy Fielding's Dissertation](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) - Original REST definition (2000)
- [Martin Fowler's RMM Article](https://martinfowler.com/articles/richardsonMaturityModel.html) - Richardson Maturity Model explanation