# API Versioning Migration Examples

This document provides complete examples of how to migrate APIs from one version to another, showing before/after code and implementation strategies.

## Example 1: Adding a New Field (Non-breaking)

### Scenario
Adding a new `email` field to the customer response without breaking existing clients.

### Before (v1)
```json
{
  "id": "12345",
  "name": "John Doe",
  "phone": "+1-555-0123"
}
```

### After (v1 - same version)
```json
{
  "id": "12345",
  "name": "John Doe",
  "phone": "+1-555-0123",
  "email": "john.doe@example.com"
}
```

### Implementation Strategy
1. Add the new field to your response model
2. Ensure existing clients ignore unknown fields
3. Document the new field in OpenAPI specification
4. Update client libraries to support the new field

### OpenAPI Documentation
```yaml
components:
  schemas:
    Customer:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        phone:
          type: string
        email:
          type: string
          description: "Customer email address (added in v1.2)"
```

## Example 2: Replacing a Field (Breaking Change)

### Scenario
Replacing the `phone` field with a more structured `contactInfo` object.

### Before (v1)
```json
{
  "id": "12345",
  "name": "John Doe",
  "phone": "+1-555-0123"
}
```

### After (v2)
```json
{
  "id": "12345",
  "name": "John Doe",
  "contactInfo": {
    "phone": "+1-555-0123",
    "email": "john.doe@example.com",
    "preferredMethod": "email"
  }
}
```

### Implementation Strategy

#### Phase 1: Deploy v2 with v1 Support
```json
// v1 response (deprecated)
{
  "id": "12345",
  "name": "John Doe",
  "phone": "+1-555-0123"
}

// v2 response (new)
{
  "id": "12345",
  "name": "John Doe",
  "contactInfo": {
    "phone": "+1-555-0123",
    "email": "john.doe@example.com",
    "preferredMethod": "email"
  }
}
```

#### Phase 2: Add Deprecation Headers to v1
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/customers/12345>; rel="successor-version"
Warning: 299 - "This API version is deprecated and will be removed on 2025-12-31"
Content-Type: application/json

{
  "id": "12345",
  "name": "John Doe",
  "phone": "+1-555-0123"
}
```

#### Phase 3: Monitor and Support Migration
- Track v1 usage with metrics
- Provide migration documentation
- Offer support for client updates
- Send proactive notifications to API consumers

#### Phase 4: Sunset v1
```http
HTTP/1.1 410 Gone
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/version-deprecated",
  "title": "API Version Deprecated",
  "status": 410,
  "detail": "This API version has been removed. Please use v2.",
  "instance": "/v1/customers/12345",
  "successor_version": "/v2/customers/12345"
}
```

## Example 3: Changing Field Types (Breaking Change)

### Scenario
Changing `createdAt` from Unix timestamp to ISO 8601 format.

### Before (v1)
```json
{
  "id": "order-123",
  "amount": 99.99,
  "createdAt": 1640995200
}
```

### After (v2)
```json
{
  "id": "order-123",
  "amount": 99.99,
  "createdAt": "2022-01-01T00:00:00Z"
}
```

### Implementation Strategy

#### Dual-Field Support During Transition
```json
// v1 response (deprecated)
{
  "id": "order-123",
  "amount": 99.99,
  "createdAt": 1640995200
}

// v2 response (new)
{
  "id": "order-123",
  "amount": 99.99,
  "createdAt": "2022-01-01T00:00:00Z"
}
```

#### OpenAPI Documentation for v2
```yaml
components:
  schemas:
    Order:
      type: object
      properties:
        id:
          type: string
        amount:
          type: number
        createdAt:
          type: string
          format: date-time
          description: "Order creation timestamp in ISO 8601 format"
```

## Example 4: Adding Required Fields (Breaking Change)

### Scenario
Adding a required `category` field to product creation requests.

### Before (v1)
```json
POST /v1/products
{
  "name": "Wireless Headphones",
  "price": 199.99
}
```

### After (v2)
```json
POST /v2/products
{
  "name": "Wireless Headphones",
  "price": 199.99,
  "category": "electronics"
}
```

### Implementation Strategy

#### v1 - Provide Default Category
```json
// v1 continues to work by assigning default category
POST /v1/products
{
  "name": "Wireless Headphones",
  "price": 199.99
}

// Internal processing adds default:
{
  "name": "Wireless Headphones",
  "price": 199.99,
  "category": "uncategorized"
}
```

#### v2 - Require Category
```json
// v2 requires category
POST /v2/products
{
  "name": "Wireless Headphones",
  "price": 199.99,
  "category": "electronics"
}
```

#### Error Handling for Missing Required Fields
```json
POST /v2/products
{
  "name": "Wireless Headphones",
  "price": 199.99
}

// Response:
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Missing required field: category",
  "instance": "/v2/products",
  "invalid_params": [
    {
      "name": "category",
      "reason": "required field missing"
    }
  ]
}
```

## Example 5: URL Structure Changes (Breaking Change)

### Scenario
Changing from flat to nested resource structure for order items.

### Before (v1)
```
GET /v1/order-items?orderId=123
```

### After (v2)
```
GET /v2/orders/123/items
```

### Implementation Strategy

#### Support Both URL Patterns
```
// v1 (deprecated)
GET /v1/order-items?orderId=123

// v2 (new)
GET /v2/orders/123/items
```

#### Response Format Consistency
```json
// Both versions return the same structure
{
  "items": [
    {
      "id": "item-1",
      "productId": "prod-456",
      "quantity": 2,
      "price": 29.99
    }
  ]
}
```

## Example 6: Authentication Changes (Breaking Change)

### Scenario
Migrating from API key authentication to OAuth 2.0.

### Before (v1)
```http
GET /v1/customers/123
Authorization: Bearer api-key-12345
```

### After (v2)
```http
GET /v2/customers/123
Authorization: Bearer oauth-jwt-token
```

### Implementation Strategy

#### Support Both Authentication Methods
```
// v1 - API key authentication
GET /v1/customers/123
Authorization: Bearer api-key-12345

// v2 - OAuth 2.0 authentication
GET /v2/customers/123
Authorization: Bearer oauth-jwt-token
```

#### Error Responses for Authentication
```json
// v1 - Invalid API key
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-api-key",
  "title": "Invalid API Key",
  "status": 401,
  "detail": "The provided API key is invalid or expired"
}

// v2 - Invalid OAuth token
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/invalid-token",
  "title": "Invalid OAuth Token",
  "status": 401,
  "detail": "The provided OAuth token is invalid or expired"
}
```

## Migration Timeline Template

### Week 1-2: Preparation
- [ ] Design v2 API contract
- [ ] Update OpenAPI specification
- [ ] Implement v2 endpoints
- [ ] Create automated tests

### Week 3-4: Deployment
- [ ] Deploy v2 alongside v1
- [ ] Add deprecation headers to v1
- [ ] Update API documentation
- [ ] Notify existing clients

### Month 2-3: Migration Support
- [ ] Monitor v1 usage metrics
- [ ] Provide migration assistance
- [ ] Update client libraries
- [ ] Send migration reminders

### Month 4-6: Sunset Preparation
- [ ] Analyze remaining v1 traffic
- [ ] Contact high-usage clients
- [ ] Set firm sunset date
- [ ] Prepare 410 Gone responses

### Month 6+: Sunset
- [ ] Return 410 Gone for v1
- [ ] Remove v1 implementation
- [ ] Update monitoring dashboards
- [ ] Archive v1 documentation

## Best Practices Summary

1. **Plan migrations carefully** - Consider client impact before making breaking changes
2. **Provide clear timelines** - Give clients adequate time to migrate
3. **Monitor usage** - Track which clients are using deprecated versions
4. **Document everything** - Provide clear migration guides and examples
5. **Test thoroughly** - Ensure both versions work correctly during transition
6. **Communicate proactively** - Keep clients informed throughout the process
7. **Support clients** - Offer help with migration challenges
8. **Be consistent** - Use the same patterns for all version migrations