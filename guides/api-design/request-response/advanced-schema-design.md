# Advanced Schema Design

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 14 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Documentation
> 
> **📊 Complexity:** 14.0 grade level • 0.7% technical density • difficult

## Overview

This guide shows advanced schema design patterns for APIs. It covers JSON Schema composition, OpenAPI schema changes, and versioning. Use these patterns to build flexible API schemas that are easy to maintain.

**Prerequisites**: Read [Schema Conventions](schema-conventions.md) first for basic patterns.

## JSON Schema Composition Patterns

### Using allOf for Schema Composition

The `allOf` keyword combines multiple schemas. Data must match all schemas in the array:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.example.com/schemas/customer",
  "allOf": [
    {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Customer identifier"
        },
        "name": {
          "type": "string",
          "description": "Customer full name"
        }
      },
      "required": ["id", "name"]
    },
    {
      "type": "object",
      "properties": {
        "email": {
          "type": "string",
          "format": "email",
          "description": "Customer email address"
        },
        "isActive": {
          "type": "boolean",
          "description": "Account active status"
        }
      },
      "required": ["email"]
    }
  ]
}
```

**Valid instance:**

```json
{
  "id": "cust-12345",
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "isActive": true
}
```

**Use allOf when:**
- Extending base schemas
- Combining validation rules
- Building layered schemas

### Using anyOf for Flexible Rules

The `anyOf` keyword accepts data that matches at least one schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [
    {
      "type": "object",
      "properties": {
        "phoneNumber": {
          "type": "string",
          "pattern": "^\\+[1-9]\\d{1,14}$"
        }
      },
      "required": ["phoneNumber"]
    },
    {
      "type": "object",
      "properties": {
        "email": {
          "type": "string",
          "format": "email"
        }
      },
      "required": ["email"]
    }
  ]
}
```

**Valid instances:**

```json
{
  "phoneNumber": "+1-555-0100"
}
```

```json
{
  "email": "contact@example.com"
}
```

```json
{
  "phoneNumber": "+1-555-0100",
  "email": "contact@example.com"
}
```

**Use anyOf when:**
- Multiple valid formats exist
- Accepting different structures
- Building flexible rules

### Using oneOf for Exclusive Choice

The `oneOf` keyword requires data to match exactly one schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "creditCard": {
          "type": "object",
          "properties": {
            "number": {"type": "string"},
            "cvv": {"type": "string"}
          },
          "required": ["number", "cvv"]
        }
      },
      "required": ["creditCard"]
    },
    {
      "type": "object",
      "properties": {
        "bankAccount": {
          "type": "object",
          "properties": {
            "accountNumber": {"type": "string"},
            "routingNumber": {"type": "string"}
          },
          "required": ["accountNumber", "routingNumber"]
        }
      },
      "required": ["bankAccount"]
    }
  ]
}
```

**Valid instance:**

```json
{
  "creditCard": {
    "number": "4111111111111111",
    "cvv": "123"
  }
}
```

**Invalid instance (matches both schemas):**

```json
{
  "creditCard": {
    "number": "4111111111111111",
    "cvv": "123"
  },
  "bankAccount": {
    "accountNumber": "123456789",
    "routingNumber": "987654321"
  }
}
```

**Use oneOf when:**
- Validating mutually exclusive options
- Enforcing single payment method
- Requiring exact match

**Performance note**: `oneOf` checks all schemas. Use `anyOf` when multiple matches are acceptable.

### Using not for Exclusion

The `not` keyword rejects data matching the schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "username": {
      "type": "string",
      "not": {
        "pattern": "^admin.*"
      }
    }
  }
}
```

**Valid instance:**

```json
{
  "username": "john.smith"
}
```

**Invalid instance:**

```json
{
  "username": "admin123"
}
```

### Combining Operators

You can combine operators for complex rules:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "restaurantType": {
      "enum": ["FAST_FOOD", "SIT_DOWN"]
    },
    "total": {
      "type": "number",
      "minimum": 0
    },
    "tip": {
      "type": "number",
      "minimum": 0
    }
  },
  "required": ["restaurantType", "total"],
  "anyOf": [
    {
      "not": {
        "properties": {
          "restaurantType": {
            "const": "SIT_DOWN"
          }
        },
        "required": ["restaurantType"]
      }
    },
    {
      "required": ["tip"]
    }
  ]
}
```

This schema requires a tip for sit-down restaurants.

## Reusable Schema Definitions

### Internal Schema References

Use `$defs` for schema reuse within a document:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.example.com/schemas/order",
  "type": "object",
  "properties": {
    "customer": {
      "$ref": "#/$defs/customer"
    },
    "shippingAddress": {
      "$ref": "#/$defs/address"
    },
    "billingAddress": {
      "$ref": "#/$defs/address"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/orderItem"
      }
    }
  },
  "$defs": {
    "customer": {
      "type": "object",
      "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"}
      },
      "required": ["id", "name"]
    },
    "address": {
      "type": "object",
      "properties": {
        "street": {"type": "string"},
        "city": {"type": "string"},
        "state": {"type": "string"},
        "zipCode": {"type": "string"}
      },
      "required": ["street", "city", "state", "zipCode"]
    },
    "orderItem": {
      "type": "object",
      "properties": {
        "productId": {"type": "string"},
        "quantity": {
          "type": "integer",
          "minimum": 1
        },
        "price": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": ["productId", "quantity", "price"]
    }
  }
}
```

**Benefits:**
- Reduces duplicate code
- Easier to maintain
- Consistent rules

### External Schema References

Reference schemas from other files:

**address-schema.json:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.example.com/schemas/address",
  "type": "object",
  "properties": {
    "street": {"type": "string"},
    "city": {"type": "string"},
    "state": {"type": "string"},
    "zipCode": {"type": "string"}
  },
  "required": ["street", "city", "state", "zipCode"]
}
```

**customer-schema.json:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.example.com/schemas/customer",
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "name": {"type": "string"},
    "address": {
      "$ref": "https://api.example.com/schemas/address"
    }
  },
  "required": ["id", "name"]
}
```

**Benefits:**
- Shared schemas across APIs
- Centralized schema management
- Domain-driven design support

**Considerations:**
- Version external schemas carefully
- Document schema links
- Handle network errors well

## OpenAPI Schema Patterns

### Component Schema Organization

Organize schemas in OpenAPI components:

```yaml
openapi: 3.1.0
info:
  title: Order API
  version: 1.0.0

components:
  schemas:
    # Base schemas
    Entity:
      type: object
      properties:
        id:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
      required:
        - id

    # Domain schemas
    Customer:
      allOf:
        - $ref: '#/components/schemas/Entity'
        - type: object
          properties:
            name:
              type: string
            email:
              type: string
              format: email
          required:
            - name
            - email

    Order:
      allOf:
        - $ref: '#/components/schemas/Entity'
        - type: object
          properties:
            customerId:
              type: string
            status:
              $ref: '#/components/schemas/OrderStatus'
            items:
              type: array
              items:
                $ref: '#/components/schemas/OrderItem'
          required:
            - customerId
            - status

    # Enum schemas
    OrderStatus:
      type: string
      enum:
        - PENDING
        - PROCESSING
        - SHIPPED
        - DELIVERED
        - CANCELLED

    # Nested schemas
    OrderItem:
      type: object
      properties:
        productId:
          type: string
        quantity:
          type: integer
          minimum: 1
        price:
          type: number
          minimum: 0
      required:
        - productId
        - quantity
        - price
```

**How to organize:**
- Group related schemas
- Use `allOf` to build from base schemas
- Define base schemas first
- Reference shared types

### Polymorphic Schemas

Define schemas with multiple possible types:

```yaml
components:
  schemas:
    Pet:
      type: object
      properties:
        name:
          type: string
        petType:
          type: string
      required:
        - name
        - petType
      discriminator:
        propertyName: petType
        mapping:
          cat: '#/components/schemas/Cat'
          dog: '#/components/schemas/Dog'
      oneOf:
        - $ref: '#/components/schemas/Cat'
        - $ref: '#/components/schemas/Dog'

    Cat:
      type: object
      properties:
        petType:
          type: string
          const: cat
        huntingSkill:
          type: string
          enum:
            - CLUELESS
            - LAZY
            - ADVENTUROUS
            - AGGRESSIVE
      required:
        - petType
        - huntingSkill

    Dog:
      type: object
      properties:
        petType:
          type: string
          const: dog
        packSize:
          type: integer
          minimum: 0
          default: 0
      required:
        - petType
        - packSize
```

**Valid instances:**

```json
{
  "name": "Fluffy",
  "petType": "cat",
  "huntingSkill": "LAZY"
}
```

```json
{
  "name": "Buddy",
  "petType": "dog",
  "packSize": 5
}
```

**Use discriminator when:**
- Building type families
- Supporting multiple data formats
- Using inheritance patterns

## Schema Evolution Strategies

### Adding Optional Fields

Safe change that maintains backward compatibility:

**Version 1:**

```yaml
components:
  schemas:
    CustomerV1:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
          format: email
      required:
        - id
        - name
        - email
```

**Version 1.1 (backward compatible):**

```yaml
components:
  schemas:
    CustomerV1:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
          format: email
        phoneNumber:
          type: string
          description: "Added in v1.1"
        preferredLanguage:
          type: string
          enum: [en, es, fr]
          default: en
          description: "Added in v1.1"
      required:
        - id
        - name
        - email
```

**Why this works:**
- Old clients ignore new fields
- New clients can use new features
- No breaking changes

### Deprecating Fields

Mark fields for future removal:

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
        email:
          type: string
          format: email
        legacyCustomerId:
          type: string
          deprecated: true
          description: "Deprecated. Use 'id' instead. Will be removed in v3.0.0"
      required:
        - id
        - name
        - email
```

**Deprecation timeline:**
1. Mark field as deprecated
2. Add sunset date in description
3. Support for 6-12 months
4. Remove in next major version

### Handling Required Field Changes

Never add required fields to existing schemas:

**Bad approach (breaking change):**

```yaml
# Version 1
Customer:
  properties:
    id: {type: string}
    name: {type: string}
  required: [id, name]

# Version 2 - BREAKS OLD CLIENTS
Customer:
  properties:
    id: {type: string}
    name: {type: string}
    email: {type: string}  # New field
  required: [id, name, email]  # BREAKING!
```

**Good approach (use versioning):**

```yaml
# Version 1
CustomerV1:
  properties:
    id: {type: string}
    name: {type: string}
  required: [id, name]

# Version 2 (separate schema)
CustomerV2:
  properties:
    id: {type: string}
    name: {type: string}
    email: {type: string}
  required: [id, name, email]
```

### Type Changes

Changing field types is always breaking:

**Bad approach:**

```yaml
# Version 1
Order:
  properties:
    total:
      type: number  # Original type

# Version 2 - BREAKS CLIENTS
Order:
  properties:
    total:
      type: string  # Changed type - BREAKING!
```

**Good approach:**

```yaml
# Version 1
Order:
  properties:
    total:
      type: number
      description: "Deprecated. Use 'totalAmount' instead"
    totalAmount:
      type: string
      description: "Currency-aware amount (e.g., '19.99 USD')"
```

Or create a new version:

```yaml
paths:
  /v1/orders:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderV1'

  /v2/orders:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderV2'
```

## Schema Versioning Patterns

### Inline Schema Versioning

Embed version in schema definition:

```yaml
components:
  schemas:
    CustomerV1:
      type: object
      properties:
        schemaVersion:
          type: string
          const: "1.0"
        id:
          type: string
        name:
          type: string

    CustomerV2:
      type: object
      properties:
        schemaVersion:
          type: string
          const: "2.0"
        id:
          type: string
        fullName:
          type: string
        email:
          type: string
          format: email
```

**Benefits:**
- Clear version tracking
- Self-documenting payloads
- Easy migration detection

**Drawbacks:**
- Extra field in every payload
- Clients must handle multiple versions

### URL-Based Schema Versioning

Include version in schema URI:

```yaml
components:
  schemas:
    Customer:
      $schema: https://api.example.com/schemas/customer/v1
      type: object
      properties:
        id: {type: string}
        name: {type: string}
```

**Benefits:**
- Version tied to schema location
- Enables schema registry
- Supports external tooling

### Header-Based Schema Versioning

Use custom headers for version negotiation:

```http
GET /customers/cust-123 HTTP/1.1
Host: api.example.com
Accept: application/json
Schema-Version: 2.0
```

```yaml
paths:
  /customers/{customerId}:
    get:
      parameters:
        - name: Schema-Version
          in: header
          schema:
            type: string
            enum: ["1.0", "2.0"]
            default: "2.0"
      responses:
        '200':
          description: Customer data
          headers:
            Schema-Version:
              schema:
                type: string
              description: Schema version used in response
```

## Backward Compatibility Patterns

### Additive Changes Only

Safe schema change rules:

**✅ Safe changes:**
- Add optional fields
- Add new enum values with defaults
- Relax rules (remove `required`, increase `maxLength`)
- Add new endpoints

**❌ Breaking changes:**
- Remove fields
- Add required fields
- Change field types
- Remove enum values
- Tighten rules (add `required`, decrease `maxLength`)

### Default Values

Provide defaults for new fields:

```yaml
components:
  schemas:
    Order:
      type: object
      properties:
        id:
          type: string
        status:
          type: string
          enum:
            - PENDING
            - PROCESSING
            - SHIPPED
            - DELIVERED
          default: PENDING
        priority:
          type: string
          enum:
            - LOW
            - NORMAL
            - HIGH
          default: NORMAL
          description: "Added in v1.2"
```

Old clients receive sensible defaults for new fields.

### Unknown Field Handling

Document how clients should handle unknown fields:

```yaml
components:
  schemas:
    Customer:
      type: object
      properties:
        id: {type: string}
        name: {type: string}
        # Future fields may be added here
      required: [id, name]
      # Note: additionalProperties is true by default in OpenAPI
      additionalProperties: true
```

**How clients should handle this:**
- Accept unknown fields without error
- Keep unknown fields when updating
- Log unknown fields for debugging
- Never fail on unknown fields

### Extension Fields

Reserve namespace for extensions:

```json
{
  "id": "cust-12345",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "x-internal-score": 95,
  "x-segment": "premium",
  "x-experimental-feature": {
    "enabled": true
  }
}
```

```yaml
components:
  schemas:
    Customer:
      type: object
      properties:
        id: {type: string}
        name: {type: string}
        email: {type: string}
      required: [id, name, email]
      patternProperties:
        "^x-":
          description: Extension fields for internal use
```

**Extension field rules:**
- Prefix with `x-`
- Optional in all cases
- Never required by clients
- Can change without notice

## Schema Validation Best Practices

### Complete Validation

Define all validation rules:

```yaml
components:
  schemas:
    Product:
      type: object
      properties:
        sku:
          type: string
          pattern: "^[A-Z]{3}-\\d{4}$"
          description: "Product SKU format: AAA-0000"
          example: "WID-1234"
        name:
          type: string
          minLength: 1
          maxLength: 200
        description:
          type: string
          maxLength: 2000
        price:
          type: number
          minimum: 0
          exclusiveMinimum: true
          multipleOf: 0.01
          description: "Price must be positive and have max 2 decimal places"
        inventory:
          type: integer
          minimum: 0
          description: "Available quantity"
        tags:
          type: array
          items:
            type: string
            maxLength: 50
          minItems: 1
          maxItems: 10
          uniqueItems: true
        category:
          type: string
          enum:
            - ELECTRONICS
            - CLOTHING
            - FOOD
            - BOOKS
      required:
        - sku
        - name
        - price
        - inventory
        - category
```

### Format Validation

Use standard formats:

```yaml
components:
  schemas:
    Contact:
      type: object
      properties:
        email:
          type: string
          format: email
        website:
          type: string
          format: uri
        phoneNumber:
          type: string
          format: regex
          pattern: "^\\+[1-9]\\d{1,14}$"
        birthDate:
          type: string
          format: date
        createdAt:
          type: string
          format: date-time
        profileImage:
          type: string
          format: uuid
```

**Standard formats:**
- `date`: YYYY-MM-DD
- `date-time`: ISO 8601 timestamp
- `email`: Email address
- `uri`: Absolute URI
- `uuid`: UUID format
- `regex`: Custom pattern

### Error Messages

Provide clear validation errors:

```yaml
components:
  schemas:
    ValidationError:
      type: object
      properties:
        type:
          type: string
          format: uri
          example: "https://api.example.com/problems/validation-error"
        title:
          type: string
          example: "Validation Error"
        status:
          type: integer
          example: 400
        detail:
          type: string
          example: "Request contains invalid fields"
        instance:
          type: string
          example: "/v1/products"
        errors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
                example: "price"
              code:
                type: string
                example: "INVALID_FORMAT"
              message:
                type: string
                example: "Price must be a positive number"
              rejectedValue:
                example: -10.50
```

See [Error Response Standards](error-response-standards.md) for complete error handling patterns.

## Schema Design Anti-Patterns

### Over-Specification

**Bad:**

```yaml
# Too rigid
Customer:
  type: object
  properties:
    name:
      type: string
      minLength: 2
      maxLength: 50
      pattern: "^[A-Z][a-z]+ [A-Z][a-z]+$"
  required: [name]
  additionalProperties: false
```

**Good:**

```yaml
# Flexible but safe
Customer:
  type: object
  properties:
    name:
      type: string
      minLength: 1
      maxLength: 200
  required: [name]
```

### Schema Duplication

**Bad:**

```yaml
components:
  schemas:
    CreateCustomerRequest:
      type: object
      properties:
        name: {type: string}
        email: {type: string}

    UpdateCustomerRequest:
      type: object
      properties:
        name: {type: string}
        email: {type: string}

    CustomerResponse:
      type: object
      properties:
        id: {type: string}
        name: {type: string}
        email: {type: string}
```

**Good:**

```yaml
components:
  schemas:
    CustomerBase:
      type: object
      properties:
        name: {type: string}
        email: {type: string}

    CreateCustomerRequest:
      allOf:
        - $ref: '#/components/schemas/CustomerBase'

    UpdateCustomerRequest:
      allOf:
        - $ref: '#/components/schemas/CustomerBase'

    CustomerResponse:
      allOf:
        - type: object
          properties:
            id: {type: string}
        - $ref: '#/components/schemas/CustomerBase'
```

### Inconsistent Naming

**Bad:**

```yaml
components:
  schemas:
    customer_data:
      properties:
        CustomerID: {type: string}
        first_name: {type: string}
        LastName: {type: string}
```

**Good:**

```yaml
components:
  schemas:
    Customer:
      properties:
        customerId: {type: string}
        firstName: {type: string}
        lastName: {type: string}
```

See [Schema Conventions](schema-conventions.md) for naming standards.

## Best Practices Summary

### Schema Design

1. **Use composition** - Build complex schemas from simple parts
2. **Define reusable parts** - Avoid duplication with `$defs` and `$ref`
3. **Validate completely** - Include all rules and formats
4. **Document well** - Add descriptions and examples
5. **Version carefully** - Plan for changes from the start

### Change Strategy

1. **Add only** - Add optional fields, never remove
2. **Deprecate first** - Give clients time to migrate
3. **Version breaking changes** - Create new schema versions
4. **Provide defaults** - New fields get default values
5. **Use extensions** - Use `x-` prefix for experimental features

### Backward Compatibility

1. **Accept unknown fields** - Use `additionalProperties: true`
2. **Provide defaults** - New fields get good defaults
3. **Document migration** - Clear upgrade paths
4. **Test compatibility** - Check old clients still work
5. **Monitor usage** - Track deprecated field use

### Validation Rules

1. **Fail fast** - Validate early in request flow
2. **Clear messages** - Return helpful error details
3. **Consistent format** - Use RFC 9457 Problem Details
4. **Standard formats** - Use JSON Schema formats
5. **Security** - Validate inputs well

## Complete Example

Here is a complete schema showing advanced patterns:

```yaml
openapi: 3.1.0
info:
  title: Advanced Schema Example
  version: 2.0.0

components:
  schemas:
    # Base entity with common fields
    Entity:
      type: object
      properties:
        id:
          type: string
          format: uuid
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        version:
          type: integer
          description: Optimistic locking version
      required:
        - id
        - createdAt

    # Reusable address schema
    Address:
      type: object
      properties:
        street:
          type: string
          maxLength: 200
        city:
          type: string
          maxLength: 100
        state:
          type: string
          pattern: "^[A-Z]{2}$"
        zipCode:
          type: string
          pattern: "^\\d{5}(-\\d{4})?$"
        country:
          type: string
          pattern: "^[A-Z]{2}$"
          default: "US"
      required:
        - street
        - city
        - state
        - zipCode

    # Customer using composition
    Customer:
      allOf:
        - $ref: '#/components/schemas/Entity'
        - type: object
          properties:
            name:
              type: string
              minLength: 1
              maxLength: 200
            email:
              type: string
              format: email
            phoneNumber:
              type: string
              pattern: "^\\+[1-9]\\d{1,14}$"
            type:
              type: string
              enum:
                - INDIVIDUAL
                - BUSINESS
            status:
              type: string
              enum:
                - ACTIVE
                - INACTIVE
                - SUSPENDED
              default: ACTIVE
            addresses:
              type: array
              items:
                $ref: '#/components/schemas/Address'
              minItems: 1
              maxItems: 5
            preferences:
              type: object
              properties:
                newsletter:
                  type: boolean
                  default: false
                language:
                  type: string
                  enum: [en, es, fr]
                  default: en
          required:
            - name
            - email
            - type

    # Payment method using polymorphism
    PaymentMethod:
      type: object
      properties:
        type:
          type: string
      required:
        - type
      discriminator:
        propertyName: type
        mapping:
          credit_card: '#/components/schemas/CreditCard'
          bank_account: '#/components/schemas/BankAccount'
      oneOf:
        - $ref: '#/components/schemas/CreditCard'
        - $ref: '#/components/schemas/BankAccount'

    CreditCard:
      type: object
      properties:
        type:
          type: string
          const: credit_card
        cardNumber:
          type: string
          pattern: "^\\d{13,19}$"
        expiryDate:
          type: string
          pattern: "^(0[1-9]|1[0-2])\\/\\d{2}$"
        cardholderName:
          type: string
      required:
        - type
        - cardNumber
        - expiryDate
        - cardholderName

    BankAccount:
      type: object
      properties:
        type:
          type: string
          const: bank_account
        accountNumber:
          type: string
        routingNumber:
          type: string
        accountHolderName:
          type: string
      required:
        - type
        - accountNumber
        - routingNumber
        - accountHolderName

    # Order with all patterns
    Order:
      allOf:
        - $ref: '#/components/schemas/Entity'
        - type: object
          properties:
            orderNumber:
              type: string
              pattern: "^ORD-\\d{8}$"
              example: "ORD-20240001"
            customerId:
              type: string
              format: uuid
            status:
              type: string
              enum:
                - PENDING
                - PROCESSING
                - SHIPPED
                - DELIVERED
                - CANCELLED
            items:
              type: array
              items:
                $ref: '#/components/schemas/OrderItem'
              minItems: 1
            shippingAddress:
              $ref: '#/components/schemas/Address'
            paymentMethod:
              $ref: '#/components/schemas/PaymentMethod'
            subtotal:
              type: number
              minimum: 0
              multipleOf: 0.01
            tax:
              type: number
              minimum: 0
              multipleOf: 0.01
            total:
              type: number
              minimum: 0
              multipleOf: 0.01
          required:
            - orderNumber
            - customerId
            - status
            - items
            - shippingAddress
            - paymentMethod
            - subtotal
            - tax
            - total

    OrderItem:
      type: object
      properties:
        productId:
          type: string
          format: uuid
        quantity:
          type: integer
          minimum: 1
          maximum: 999
        unitPrice:
          type: number
          minimum: 0
          exclusiveMinimum: true
          multipleOf: 0.01
        total:
          type: number
          minimum: 0
          multipleOf: 0.01
      required:
        - productId
        - quantity
        - unitPrice
        - total
```

## Related Documentation

- [Schema Conventions](schema-conventions.md) - Basic schema patterns and naming
- [API Version Strategy](../foundations/api-version-strategy.md) - API versioning approaches
- [OpenAPI Standards](../documentation/openapi-standards.md) - OpenAPI documentation standards
- [Error Response Standards](error-response-standards.md) - Error handling patterns
- [Content Types and Structure](content-types-and-structure.md) - Request/response formats
- [Schema Testing](../testing/schema-testing.md) - Schema validation and compatibility testing

### Spring Implementation
- [Schema Validation](../../../languages/spring/validation/schema-validation.md) - Jakarta Validation and JSON Schema in Spring Boot
