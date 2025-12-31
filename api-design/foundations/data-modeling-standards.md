# Data Modeling & Schema Design Standards

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 13 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Basic JSON knowledge, familiarity with OpenAPI  
> **🎯 Key Topics:** JSON Schema, field naming, data types, schema evolution
> 
> **📊 Complexity:** 15.5 grade level • 1.0% technical density • difficult

## Overview

Well-designed data models form the foundation of maintainable APIs. This document establishes standards for field naming, data types, JSON Schema patterns, and schema evolution strategies. These standards ensure consistency across all APIs and make integration easier for consumers.

Good schema design provides:
- **Predictability**: Consumers know what to expect from any endpoint
- **Discoverability**: Field names clearly communicate their purpose
- **Evolvability**: Schemas can grow without breaking existing clients
- **Validation**: Clear constraints catch errors early

---

## Field Naming Conventions

Consistent field naming makes APIs intuitive and reduces integration friction.

### Naming Style

Use **camelCase** for all JSON field names:

```json
{
  "orderId": "ord-12345",
  "customerId": "cust-67890",
  "orderTotal": 149.99,
  "createdAt": "2024-01-15T10:30:00Z",
  "shippingAddress": {
    "streetLine1": "123 Main Street",
    "postalCode": "12345"
  }
}
```

| Convention | Example | Use |
|------------|---------|-----|
| camelCase | `orderTotal` | All JSON fields |
| kebab-case | `order-total` | URL paths only |
| snake_case | `order_total` | Avoid in JSON |
| PascalCase | `OrderTotal` | Avoid in JSON |

### Naming Rules

| Rule | Good | Bad | Reason |
|------|------|-----|--------|
| Use nouns for data | `customer` | `getCustomer` | Fields hold data, not actions |
| Be specific | `orderCreatedAt` | `date` | Avoid ambiguous names |
| Use full words | `description` | `desc` | Clarity over brevity |
| Avoid redundancy | `customer.name` | `customer.customerName` | Context provides clarity |
| Consistent plurals | `items` (array) | `item` (array) | Arrays use plural names |
| Boolean prefixes | `isActive`, `hasItems` | `active`, `items` | Clarify boolean intent |

### Reserved Words to Avoid

Avoid these names that conflict with common programming constructs:

| Category | Reserved Words |
|----------|----------------|
| JavaScript | `class`, `function`, `return`, `delete`, `new`, `this` |
| JSON/Schema | `type`, `id`, `$ref`, `$schema`, `default` |
| SQL | `select`, `from`, `where`, `order`, `group`, `index` |
| Common conflicts | `data`, `error`, `meta`, `links`, `status` at root level |

**Exception**: Standard wrapper fields like `data`, `meta`, and `links` are acceptable at the response envelope level.

### Abbreviation Standards

| Abbreviation | Full Form | When to Use |
|--------------|-----------|-------------|
| `id` | identifier | Always acceptable |
| `url` | uniform resource locator | Always acceptable |
| `uuid` | universally unique identifier | Always acceptable |
| `qty` | quantity | Avoid - use `quantity` |
| `addr` | address | Avoid - use `address` |
| `desc` | description | Avoid - use `description` |

---

## Data Type Standards

Use consistent data types across all APIs to ensure predictable parsing and validation.

### String Types

| Purpose | Format | Example | Notes |
|---------|--------|---------|-------|
| UUID | UUID v4 | `"550e8400-e29b-41d4-a716-446655440000"` | Lowercase with hyphens |
| Date | ISO 8601 date | `"2024-01-15"` | Always YYYY-MM-DD |
| DateTime | ISO 8601 with timezone | `"2024-01-15T10:30:00Z"` | Always include timezone |
| Duration | ISO 8601 duration | `"P3D"` or `"PT2H30M"` | For time spans |
| Email | RFC 5322 | `"user@example.com"` | Validate format |
| URI | RFC 3986 | `"https://api.example.com/v1/orders"` | Full URI with scheme |
| Phone | E.164 | `"+14155551234"` | International format |
| Currency code | ISO 4217 | `"USD"`, `"EUR"` | 3-letter codes |
| Country code | ISO 3166-1 alpha-2 | `"US"`, `"GB"` | 2-letter codes |
| Language code | BCP 47 | `"en-US"`, `"fr-CA"` | Language with region |

### Date and Time Handling

Always use ISO 8601 format with explicit timezone:

```json
{
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:45:30.123Z",
  "scheduledDate": "2024-02-01",
  "expiresAt": "2024-12-31T23:59:59-05:00",
  "processingDuration": "PT2H30M"
}
```

| Rule | Format | Example |
|------|--------|---------|
| Always include timezone | ISO 8601 with `Z` or offset | `2024-01-15T10:30:00Z` |
| Use UTC for storage | Zulu time (`Z` suffix) | `2024-01-15T10:30:00Z` |
| Date only (no time) | YYYY-MM-DD | `2024-01-15` |
| Include milliseconds | Optional but consistent | `2024-01-15T10:30:00.123Z` |

### Numeric Types

| Type | JSON Type | Use Case | Example |
|------|-----------|----------|---------|
| Integer | `number` (integer) | Counts, IDs, quantities | `42` |
| Decimal | `string` | Money, precise calculations | `"149.99"` |
| Float | `number` | Measurements, percentages | `3.14159` |

**Important**: Use strings for monetary values to avoid floating-point precision issues:

```json
{
  "quantity": 5,
  "unitPrice": "29.99",
  "totalAmount": "149.95",
  "taxRate": 0.08,
  "weight": 2.5
}
```

### Boolean Conventions

Use clear boolean field names with appropriate prefixes:

```json
{
  "isActive": true,
  "isDeleted": false,
  "hasShipped": true,
  "canCancel": false,
  "requiresSignature": true
}
```

| Prefix | Use Case | Example |
|--------|----------|---------|
| `is` | State or status | `isActive`, `isVerified` |
| `has` | Possession or completion | `hasItems`, `hasShipped` |
| `can` | Permission or capability | `canEdit`, `canDelete` |
| `requires` | Necessity | `requiresApproval` |
| `allows` | Permission granted | `allowsNotifications` |

### Enum Values

Use SCREAMING_SNAKE_CASE for enum values:

```json
{
  "status": "PENDING_APPROVAL",
  "priority": "HIGH",
  "paymentMethod": "CREDIT_CARD"
}
```

Define enums in OpenAPI:

```yaml
OrderStatus:
  type: string
  enum:
    - DRAFT
    - PENDING_APPROVAL
    - APPROVED
    - PROCESSING
    - SHIPPED
    - DELIVERED
    - CANCELLED
  description: Current status of the order
```

---

## JSON Schema Patterns

Use JSON Schema to define clear, validatable data structures.

### Required vs Optional Fields

Clearly distinguish required fields from optional ones:

```yaml
Customer:
  type: object
  required:
    - customerId
    - email
    - createdAt
  properties:
    customerId:
      type: string
      format: uuid
      description: Unique customer identifier
    email:
      type: string
      format: email
      description: Customer email address
    phone:
      type: string
      description: Optional phone number
    createdAt:
      type: string
      format: date-time
      description: When the customer was created
```

**Guidelines**:
- Mark fields required only if the resource cannot exist without them
- New fields should almost always be optional (for backward compatibility)
- Document why a field is required when not obvious

### Nullable Field Handling

Use `nullable` to indicate fields that can have null values:

```yaml
Order:
  type: object
  properties:
    orderId:
      type: string
      description: Order identifier (never null)
    shippedAt:
      type: string
      format: date-time
      nullable: true
      description: When order shipped (null if not yet shipped)
    cancellationReason:
      type: string
      nullable: true
      description: Reason for cancellation (null if not cancelled)
```

| Approach | Use When |
|----------|----------|
| `nullable: true` | Field exists but may have no value |
| Omit field | Field is irrelevant in current state |
| Empty string | Never - use null instead |

### Default Values

Specify defaults for optional fields:

```yaml
PaginationRequest:
  type: object
  properties:
    page:
      type: integer
      minimum: 0
      default: 0
      description: Page number (0-indexed)
    size:
      type: integer
      minimum: 1
      maximum: 100
      default: 20
      description: Items per page
    sortDirection:
      type: string
      enum: [ASC, DESC]
      default: DESC
      description: Sort direction
```

### Validation Patterns

Use JSON Schema validation keywords for robust constraints:

```yaml
CreateOrderRequest:
  type: object
  required:
    - customerId
    - items
  properties:
    customerId:
      type: string
      format: uuid
      description: Customer placing the order
    
    email:
      type: string
      format: email
      maxLength: 254
      description: Contact email
    
    quantity:
      type: integer
      minimum: 1
      maximum: 1000
      description: Number of items
    
    couponCode:
      type: string
      pattern: "^[A-Z0-9]{6,12}$"
      description: Promotional code (6-12 alphanumeric characters)
    
    items:
      type: array
      minItems: 1
      maxItems: 100
      items:
        $ref: '#/components/schemas/OrderItem'
      description: Line items in the order
```

| Keyword | Type | Purpose |
|---------|------|---------|
| `minLength`, `maxLength` | string | Limit string length |
| `pattern` | string | Regex validation |
| `format` | string | Semantic format (email, uri, uuid) |
| `minimum`, `maximum` | number | Numeric bounds |
| `minItems`, `maxItems` | array | Array size limits |
| `uniqueItems` | array | No duplicate values |

---

## Common Schema Patterns

Reusable patterns for common API structures.

### Pagination Response

Standard wrapper for paginated collections:

```yaml
PaginatedResponse:
  type: object
  required:
    - data
    - meta
  properties:
    data:
      type: array
      items: {}
      description: Array of resources
    meta:
      type: object
      required:
        - pagination
      properties:
        pagination:
          $ref: '#/components/schemas/PaginationMeta'
    links:
      $ref: '#/components/schemas/PaginationLinks'

PaginationMeta:
  type: object
  required:
    - page
    - size
    - totalElements
    - totalPages
  properties:
    page:
      type: integer
      minimum: 0
      description: Current page number (0-indexed)
    size:
      type: integer
      minimum: 1
      description: Items per page
    totalElements:
      type: integer
      minimum: 0
      description: Total items across all pages
    totalPages:
      type: integer
      minimum: 0
      description: Total number of pages

PaginationLinks:
  type: object
  properties:
    self:
      type: string
      format: uri
      description: Current page URL
    first:
      type: string
      format: uri
      description: First page URL
    prev:
      type: string
      format: uri
      nullable: true
      description: Previous page URL (null if on first page)
    next:
      type: string
      format: uri
      nullable: true
      description: Next page URL (null if on last page)
    last:
      type: string
      format: uri
      description: Last page URL
```

Example response:

```json
{
  "data": [
    {"orderId": "ord-001", "status": "SHIPPED"},
    {"orderId": "ord-002", "status": "PROCESSING"}
  ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 54,
      "totalPages": 3
    }
  },
  "links": {
    "self": "/v1/orders?page=0&size=20",
    "first": "/v1/orders?page=0&size=20",
    "next": "/v1/orders?page=1&size=20",
    "last": "/v1/orders?page=2&size=20"
  }
}
```

### Error Response (RFC 9457)

Standard error response following Problem Details:

```yaml
ProblemDetails:
  type: object
  properties:
    type:
      type: string
      format: uri
      default: "about:blank"
      description: URI identifying the problem type
    title:
      type: string
      description: Short summary of the problem
    status:
      type: integer
      description: HTTP status code
    detail:
      type: string
      description: Explanation specific to this occurrence
    instance:
      type: string
      format: uri
      description: URI identifying this specific occurrence

ValidationError:
  allOf:
    - $ref: '#/components/schemas/ProblemDetails'
    - type: object
      properties:
        errors:
          type: array
          items:
            type: object
            required:
              - field
              - message
            properties:
              field:
                type: string
                description: Field that failed validation
              code:
                type: string
                description: Error code for programmatic handling
              message:
                type: string
                description: Human-readable error message
```

### Audit Fields

Standard fields for tracking resource changes:

```yaml
AuditFields:
  type: object
  properties:
    createdAt:
      type: string
      format: date-time
      readOnly: true
      description: When the resource was created
    createdBy:
      type: string
      readOnly: true
      description: User or system that created the resource
    updatedAt:
      type: string
      format: date-time
      readOnly: true
      description: When the resource was last modified
    updatedBy:
      type: string
      readOnly: true
      description: User or system that last modified the resource
    version:
      type: integer
      readOnly: true
      description: Optimistic locking version number
```

Use `allOf` to compose audit fields into resources:

```yaml
Order:
  allOf:
    - $ref: '#/components/schemas/AuditFields'
    - type: object
      required:
        - orderId
        - status
      properties:
        orderId:
          type: string
          format: uuid
        status:
          $ref: '#/components/schemas/OrderStatus'
```

### Soft Delete Pattern

Track deletion without removing data:

```yaml
SoftDeletable:
  type: object
  properties:
    isDeleted:
      type: boolean
      default: false
      readOnly: true
      description: Whether the resource has been soft deleted
    deletedAt:
      type: string
      format: date-time
      nullable: true
      readOnly: true
      description: When the resource was deleted (null if not deleted)
    deletedBy:
      type: string
      nullable: true
      readOnly: true
      description: Who deleted the resource (null if not deleted)
```

---

## Schema Evolution

Design schemas to evolve without breaking existing clients.

### Safe (Non-Breaking) Changes

These changes are safe to make within an existing API version:

| Change Type | Example | Why Safe |
|-------------|---------|----------|
| Add optional field | Add `nickname` to Customer | Clients ignore unknown fields |
| Add new endpoint | Add `GET /v1/reports` | Existing endpoints unchanged |
| Add enum value | Add `REFUNDED` to OrderStatus | Clients should handle unknown values |
| Relax validation | Increase max length from 50 to 100 | Previously valid data still valid |
| Add optional parameter | Add `?includeMetadata=true` | Defaults preserve old behavior |

### Breaking Changes (Require New Version)

These changes break existing clients and require a new API version:

| Change Type | Example | Why Breaking |
|-------------|---------|--------------|
| Remove field | Remove `legacyId` | Clients may depend on it |
| Rename field | Change `name` to `fullName` | Client code references old name |
| Change type | Change `quantity` from integer to string | Parsing fails |
| Add required field | Add required `taxId` | Old requests become invalid |
| Tighten validation | Reduce max length from 100 to 50 | Previously valid data rejected |
| Remove enum value | Remove `PENDING` status | Clients may use that value |

### Deprecation Pattern

Mark fields as deprecated before removal:

```yaml
Customer:
  type: object
  properties:
    customerId:
      type: string
      format: uuid
    
    # New preferred field
    fullName:
      type: string
      description: Customer's complete name
    
    # Deprecated field - will be removed in v3
    name:
      type: string
      deprecated: true
      description: |
        DEPRECATED: Use fullName instead. 
        Will be removed in API v3 (estimated Q4 2025).
```

**Deprecation timeline**:
1. Add new field alongside old field
2. Mark old field as `deprecated: true`
3. Document migration in changelog
4. Support both for at least one version cycle
5. Remove in next major version

### Additive Evolution Example

Evolving a schema safely over time:

**Version 1.0** - Initial release:
```yaml
Customer:
  type: object
  required: [customerId, email]
  properties:
    customerId:
      type: string
    email:
      type: string
```

**Version 1.1** - Add optional fields:
```yaml
Customer:
  type: object
  required: [customerId, email]
  properties:
    customerId:
      type: string
    email:
      type: string
    phone:           # New optional field
      type: string
    preferences:     # New optional object
      type: object
      properties:
        newsletter:
          type: boolean
          default: false
```

**Version 2.0** - Breaking changes (new major version):
```yaml
Customer:
  type: object
  required: [customerId, email, accountType]  # New required field
  properties:
    customerId:
      type: string
      format: uuid    # Stricter format
    email:
      type: string
    accountType:      # Required in v2
      type: string
      enum: [PERSONAL, BUSINESS]
    # name field removed
```

---

## OpenAPI Schema Best Practices

Structure OpenAPI schemas for maximum reusability and clarity.

### Component Reuse

Define schemas once and reference them:

```yaml
components:
  schemas:
    # Base schemas
    Money:
      type: object
      required: [amount, currency]
      properties:
        amount:
          type: string
          pattern: "^-?\\d+\\.\\d{2}$"
          description: Decimal amount as string
        currency:
          type: string
          pattern: "^[A-Z]{3}$"
          description: ISO 4217 currency code
    
    Address:
      type: object
      required: [streetLine1, city, country]
      properties:
        streetLine1:
          type: string
          maxLength: 100
        streetLine2:
          type: string
          maxLength: 100
        city:
          type: string
          maxLength: 50
        state:
          type: string
          maxLength: 50
        postalCode:
          type: string
          maxLength: 20
        country:
          type: string
          pattern: "^[A-Z]{2}$"
          description: ISO 3166-1 alpha-2 country code
    
    # Composed schemas
    Order:
      type: object
      properties:
        orderId:
          type: string
        total:
          $ref: '#/components/schemas/Money'
        shippingAddress:
          $ref: '#/components/schemas/Address'
        billingAddress:
          $ref: '#/components/schemas/Address'
```

### Using allOf for Composition

Combine schemas for inheritance-like patterns:

```yaml
# Base resource with common fields
BaseResource:
  type: object
  properties:
    id:
      type: string
      format: uuid
      readOnly: true
    createdAt:
      type: string
      format: date-time
      readOnly: true
    updatedAt:
      type: string
      format: date-time
      readOnly: true

# Specific resource extending base
Product:
  allOf:
    - $ref: '#/components/schemas/BaseResource'
    - type: object
      required:
        - name
        - price
      properties:
        name:
          type: string
        price:
          $ref: '#/components/schemas/Money'
        description:
          type: string
```

### Using oneOf for Variants

Model mutually exclusive options:

```yaml
PaymentMethod:
  oneOf:
    - $ref: '#/components/schemas/CreditCard'
    - $ref: '#/components/schemas/BankTransfer'
    - $ref: '#/components/schemas/DigitalWallet'
  discriminator:
    propertyName: paymentType
    mapping:
      CREDIT_CARD: '#/components/schemas/CreditCard'
      BANK_TRANSFER: '#/components/schemas/BankTransfer'
      DIGITAL_WALLET: '#/components/schemas/DigitalWallet'

CreditCard:
  type: object
  required: [paymentType, cardNumber, expiryMonth, expiryYear]
  properties:
    paymentType:
      type: string
      enum: [CREDIT_CARD]
    cardNumber:
      type: string
    expiryMonth:
      type: integer
      minimum: 1
      maximum: 12
    expiryYear:
      type: integer

BankTransfer:
  type: object
  required: [paymentType, accountNumber, routingNumber]
  properties:
    paymentType:
      type: string
      enum: [BANK_TRANSFER]
    accountNumber:
      type: string
    routingNumber:
      type: string
```

### Using anyOf for Flexible Input

Accept multiple valid formats:

```yaml
CustomerIdentifier:
  anyOf:
    - type: object
      required: [customerId]
      properties:
        customerId:
          type: string
          format: uuid
    - type: object
      required: [email]
      properties:
        email:
          type: string
          format: email
    - type: object
      required: [externalId]
      properties:
        externalId:
          type: string
```

---

## Documentation in Schemas

Good schema documentation makes APIs self-describing.

### Description Best Practices

Write clear, actionable descriptions:

```yaml
Order:
  type: object
  description: |
    Represents a customer purchase order.
    
    Orders progress through states: DRAFT -> SUBMITTED -> PROCESSING -> SHIPPED -> DELIVERED.
    Once SHIPPED, orders cannot be cancelled.
  properties:
    orderId:
      type: string
      format: uuid
      readOnly: true
      description: Unique order identifier. Generated by the system on creation.
    
    status:
      type: string
      enum: [DRAFT, SUBMITTED, PROCESSING, SHIPPED, DELIVERED, CANCELLED]
      description: |
        Current order status.
        - DRAFT: Order created but not yet submitted
        - SUBMITTED: Order submitted and awaiting processing
        - PROCESSING: Order is being prepared
        - SHIPPED: Order has been dispatched
        - DELIVERED: Order received by customer
        - CANCELLED: Order was cancelled
    
    total:
      $ref: '#/components/schemas/Money'
      description: Order total including tax and shipping. Read-only; calculated from line items.
```

### Example Values

Provide realistic examples:

```yaml
Customer:
  type: object
  properties:
    customerId:
      type: string
      format: uuid
      example: "550e8400-e29b-41d4-a716-446655440000"
    email:
      type: string
      format: email
      example: "jane.doe@example.com"
    phone:
      type: string
      example: "+14155551234"
    createdAt:
      type: string
      format: date-time
      example: "2024-01-15T10:30:00Z"
  example:
    customerId: "550e8400-e29b-41d4-a716-446655440000"
    email: "jane.doe@example.com"
    phone: "+14155551234"
    createdAt: "2024-01-15T10:30:00Z"
```

### Deprecation Markers

Clearly mark deprecated elements:

```yaml
LegacyOrder:
  type: object
  deprecated: true
  description: |
    DEPRECATED: Use Order schema instead.
    This schema will be removed in API v3.
  properties:
    order_id:          # Old snake_case naming
      type: string
      deprecated: true
      description: "DEPRECATED: Use orderId from Order schema"
```

---

## Schema Versioning Strategy

When and how to version your schemas.

### When to Version

| Scenario | Action |
|----------|--------|
| Add optional field | No version change needed |
| Add required field | New major API version |
| Change field type | New major API version |
| Remove field | New major API version |
| Rename field | New major API version |
| Add enum value | Consider client tolerance |
| Remove enum value | New major API version |

### Compatibility Matrix

| Client Version | Server v1 | Server v2 |
|----------------|-----------|-----------|
| v1 client | Full compatibility | May work with v2 if v2 is backward compatible |
| v2 client | May fail if using v2 features | Full compatibility |

### Version Coexistence

Support multiple schema versions during transition:

```yaml
# v1 schema (deprecated)
OrderV1:
  deprecated: true
  type: object
  properties:
    id:
      type: string
    customer_name:    # Old snake_case
      type: string
    total:
      type: number    # Floating point (problematic)

# v2 schema (current)
OrderV2:
  type: object
  properties:
    orderId:
      type: string
      format: uuid
    customerName:     # camelCase
      type: string
    total:
      $ref: '#/components/schemas/Money'  # Proper money type
```

---

## Quick Reference

### Field Naming Checklist

- [ ] Use camelCase for all JSON fields
- [ ] Use nouns, not verbs
- [ ] Use full words, not abbreviations
- [ ] Prefix booleans with `is`, `has`, `can`, etc.
- [ ] Use plural names for arrays
- [ ] Avoid reserved words

### Data Type Checklist

- [ ] Use ISO 8601 for all dates and times
- [ ] Use strings for monetary values
- [ ] Use UUID v4 for identifiers
- [ ] Use SCREAMING_SNAKE_CASE for enums
- [ ] Include timezone in all timestamps

### Schema Design Checklist

- [ ] Mark truly required fields as required
- [ ] Use `nullable: true` for fields that can be null
- [ ] Provide sensible defaults
- [ ] Add validation constraints
- [ ] Include descriptions and examples
- [ ] Use `$ref` for reusable components

---

## Related Documentation

- [Resource Naming and URL Structure](resource-naming-and-url-structure.md) - URL design patterns
- [API Version Strategy](api-version-strategy.md) - Versioning approaches
- [Error Response Standards](../request-response/error-response-standards.md) - RFC 9457 implementation
- [Pagination and Filtering](../request-response/pagination-and-filtering.md) - Collection response patterns
- [OpenAPI Standards](../documentation/openapi-standards.md) - Full OpenAPI documentation guide

---

## Navigation

- [Back to Foundations](README.md)
- [Back to API Design](../README.md)
