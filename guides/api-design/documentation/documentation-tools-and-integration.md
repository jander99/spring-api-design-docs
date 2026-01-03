# Documentation Tools and Integration

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** Documentation tools, hosting, automation
> 
> **📊 Complexity:** 7.8 grade level • 0.8% technical density • fairly easy

## Why Use Documentation Tools?

Good API documentation needs more than a text file. You need tools that:

- Let developers try your API in a browser
- Update automatically when your code changes
- Show examples in multiple languages
- Work across different API versions

This guide shows you how to set up and use these tools.

## Quick Start: Serve Your Documentation

Pick one tool and get started in 5 minutes:

**Option 1: Swagger UI (Most Popular)**
```yaml
# Add this to your OpenAPI file
servers:
  - url: https://api.example.com/v1
    description: Production API

# Swagger UI reads this and creates interactive docs
# Host at: /docs
```

**Option 2: ReDoc (Clean and Simple)**
```yaml
# Same OpenAPI file works with ReDoc
# Just point ReDoc at your openapi.yaml file
# Host at: /docs/reference
```

**Option 3: Stoplight (Full Platform)**
```yaml
# Use their hosted platform
# Upload your OpenAPI file
# Get docs, mocking, and testing
```

Start with Swagger UI. You can add more tools later.

## Documentation Tool Types

### Interactive Tools
These tools let developers test your API right in the browser.

- **Swagger UI**: Try API calls with a built-in form
- **Stoplight**: Test and mock APIs before building them
- **Postman**: Save requests and share with your team

### Reference Tools
These tools show clean API documentation.

- **ReDoc**: Beautiful, mobile-friendly reference docs
- **Slate**: GitHub-style documentation
- **GitBook**: Wiki-style docs with search

### Platform Tools
These tools combine many features in one place.

- **Stoplight**: Design, docs, and mocking
- **ReadMe**: Docs with usage analytics
- **SwaggerHub**: Team collaboration and versioning

### API Catalogs
These tools help teams find and use internal APIs.

- **Backstage**: Internal developer portal
- **Kong**: API gateway with built-in docs
- **Apigee**: Enterprise API management

## How to Create Your OpenAPI File

You have three options. Pick the one that fits your workflow.

### Option 1: Design-First (Recommended)
Write your OpenAPI file before you write code.

1. Create your `openapi.yaml` file
2. Use tools to generate code from it
3. Build your API to match the spec
4. Tools validate your code matches the spec

**Best for:** New APIs, APIs with external consumers

### Option 2: Code-First
Write code first. Generate OpenAPI from your code.

1. Write your API code with annotations
2. Tools read your annotations
3. Tools generate the OpenAPI file
4. Check that the file is complete

**Best for:** Internal APIs, quick prototypes

### Option 3: Hybrid
Maintain an OpenAPI file and validate it against code.

1. Keep your OpenAPI file updated
2. Run validation in your build pipeline
3. Fail the build if code and spec don't match
4. Update whichever is out of sync

**Best for:** Large teams, complex APIs

## Hosting Your Documentation

### Public Documentation
Anyone can view your docs. No login required.

```yaml
# Serve at a public URL
servers:
  - url: https://api.example.com/v1
    description: Production API
  - url: https://staging.example.com/v1
    description: Staging (for testing)

info:
  title: Example API
  version: "1.0.0"
  x-documentation:
    interactive: /docs          # Swagger UI here
    reference: /docs/reference  # ReDoc here
```

### Private Documentation
Require a login to view docs.

- Partner APIs: Only partners see the docs
- Internal APIs: Only employees see the docs
- Customer APIs: Each customer sees their own docs

### Where to Host

**Static Sites (Easiest)**
- Build HTML files from your OpenAPI file
- Upload to a CDN or web server
- Tools: Swagger UI, ReDoc

**Documentation Platforms (Better)**
- Upload your OpenAPI file
- Platform handles hosting and search
- Tools: ReadMe, Stoplight, SwaggerHub

**API Gateways (Best for Large Teams)**
- Gateway serves docs with your API
- Adds rate limiting and analytics
- Tools: Kong, Apigee, AWS API Gateway

## Automate with CI/CD

Set up your build pipeline to update docs automatically.

### Basic Pipeline
```yaml
# Example CI/CD steps
steps:
  - name: Validate OpenAPI
    run: openapi-validator openapi.yaml
  
  - name: Generate Docs
    run: swagger-ui-build openapi.yaml
  
  - name: Deploy Docs
    run: upload-to-cdn docs/
```

### What to Validate
Run these checks on every commit:

1. **OpenAPI Format**: Is the YAML valid?
2. **Examples**: Do request/response examples work?
3. **Links**: Do external links still work?
4. **Completeness**: Does every endpoint have a description?

### Automatic Deployment
When validation passes:

1. Build static HTML from your OpenAPI file
2. Upload to your hosting platform
3. Clear the CDN cache
4. Docs update in seconds

## API Catalogs for Teams

Large organizations have many APIs. Catalogs help developers find them.

### Add Your API to a Catalog
```yaml
# Add catalog info to your OpenAPI file
info:
  title: Orders API
  version: "1.0.0"
  x-catalog:
    domain: orders              # Business domain
    team: order-management      # Owning team
    lifecycle: production       # Status
    tags:
      - e-commerce
      - core-business
```

### Catalog Features

**Discovery**
- Developers search for "orders" and find your API
- Catalog shows all APIs in the company
- Filter by team, domain, or status

**Version Tracking**
- Catalog tracks v1, v2, v3 of your API
- Shows which versions are deprecated
- Links to migration guides

**Analytics**
- See which endpoints get the most traffic
- See which docs get the most views
- Find APIs that need better documentation

## Serve Documentation Endpoints

Your API should serve its own documentation.

### Standard Endpoints
```http
# Get the OpenAPI file
GET /openapi.yaml HTTP/1.1
Host: api.example.com
Accept: application/yaml

# View interactive docs
GET /docs HTTP/1.1
Host: api.example.com
Accept: text/html

# View a specific version
GET /docs/v1 HTTP/1.1
Host: api.example.com
Accept: text/html
```

### Support Multiple Formats
Let clients choose JSON or YAML.

```http
# Client asks for JSON
GET /openapi HTTP/1.1
Host: api.example.com
Accept: application/json

# Client asks for YAML
GET /openapi HTTP/1.1
Host: api.example.com
Accept: application/yaml
```

### Use Caching
Documentation doesn't change often. Cache it.

```http
HTTP/1.1 200 OK
Content-Type: application/yaml
Cache-Control: public, max-age=3600  # Cache for 1 hour
ETag: "abc123"
Last-Modified: Mon, 01 Jan 2024 00:00:00 GMT
```

## Make Your Documentation Better

### Help Developers Learn
Good documentation includes:

- **Code Examples**: Show examples in multiple languages
- **Try It Out**: Let developers test in the browser
- **Search**: Help developers find the right endpoint
- **Mobile Support**: Make docs work on phones

### Add Code Samples
```yaml
# Use x-codeSamples to show multiple languages
paths:
  /orders:
    get:
      x-codeSamples:
        - lang: curl
          source: |
            curl https://api.example.com/orders
        - lang: javascript
          source: |
            fetch('https://api.example.com/orders')
        - lang: python
          source: |
            requests.get('https://api.example.com/orders')
```

### Check Quality Automatically
Run these checks in your pipeline:

- **Validate OpenAPI**: Is the file valid?
- **Test Examples**: Do the examples work?
- **Check Links**: Do external links work?
- **Check Accessibility**: Can screen readers use your docs?

## Best Practices

Follow these rules:

1. **One Source of Truth**: OpenAPI is the source. Everything else generates from it.
2. **Automate Everything**: Generate and deploy docs automatically.
3. **Version Your Docs**: Keep docs for v1, v2, v3, etc.
4. **Use Caching**: Documentation is static. Cache it for 1 hour.
5. **Track Usage**: See which endpoints developers use most.
6. **Get Feedback**: Let developers suggest improvements.

## Getting Started

Start simple:

1. Create an OpenAPI file for your API
2. Serve it with Swagger UI at `/docs`
3. Add it to your CI/CD pipeline
4. Add code examples over time
5. Consider a platform when you have 10+ APIs

You can add more tools as your API program grows.