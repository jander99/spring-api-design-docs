# Schema Testing

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 20 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** Basic REST API knowledge  
> **🎯 Key Topics:** Testing, Quality Assurance, Schema Validation
> 
> **📊 Complexity:** 12.6 grade level • 0.4% technical density • fairly difficult
> 
> **📝 Note:** This guide contains extensive code examples (67 code blocks). Schema testing requires precision.

## Overview

Schema testing verifies your API contracts work correctly. It checks data structures. It catches breaking changes. It maintains compatibility with old clients. Good schema testing stops bugs before production.

This guide covers testing for JSON Schema and OpenAPI specs. All examples use JSON, YAML, and HTTP formats. These work with any technology.

**Prerequisites**: Read [Schema Conventions](../request-response/schema-conventions.md) and [Advanced Schema Design](../request-response/advanced-schema-design.md) first.

## Why Test Schemas?

Without schema testing, these problems slip into production:

**What Breaks Without Testing:**

```json
// API expects a number
{"total": 99.99}

// Client sends a string - Runtime error!
{"total": "99.99"}
```

This crashes when your code tries to calculate totals. The error only appears in production when a client sends bad data.

**Another Example:**

```json
// Version 1: All clients use this
{"customerId": "123", "total": 50.00}

// Version 2: Added required field - Breaks all clients!
{"customerId": "123", "total": 50.00, "currency": "USD"}
```

Old clients can't send the new `currency` field. Every request fails with validation errors.

**Schema Testing Catches These Issues:**

- Invalid data types before deployment
- Breaking changes that affect old clients
- Missing required fields
- Pattern mismatches in IDs or codes
- Constraint violations

**Benefits:**

1. **Prevents Runtime Errors**: Finds bad data before production
2. **Protects Clients**: Detects changes that break old versions
3. **Saves Debug Time**: Clear errors instead of silent failures
4. **Enables Safe Changes**: Confident refactoring with automated checks

## Schema Validation Testing

Schema validation tests check if data matches the rules. Test both valid and invalid examples. This gives complete coverage.

**What This Catches**: Wrong data types, missing fields, invalid patterns

### Testing Valid Examples

Valid examples should pass validation. Start simple, then add complexity:

**Schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "orderId": {
      "type": "string",
      "pattern": "^ORD-[0-9]{6}$"
    },
    "customerId": {
      "type": "string"
    },
    "total": {
      "type": "number",
      "minimum": 0,
      "multipleOf": 0.01
    },
    "status": {
      "type": "string",
      "enum": ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"]
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "productId": {"type": "string"},
          "quantity": {"type": "integer", "minimum": 1}
        },
        "required": ["productId", "quantity"]
      },
      "minItems": 1
    }
  },
  "required": ["orderId", "customerId", "total", "status", "items"]
}
```

**Valid Example 1 - Minimal Valid Data:**

```json
{
  "orderId": "ORD-123456",
  "customerId": "cust-789",
  "total": 99.99,
  "status": "PENDING",
  "items": [
    {
      "productId": "prod-001",
      "quantity": 2
    }
  ]
}
```

**Valid Example 2 - Multiple Items:**

```json
{
  "orderId": "ORD-654321",
  "customerId": "cust-456",
  "total": 249.98,
  "status": "SHIPPED",
  "items": [
    {
      "productId": "prod-001",
      "quantity": 2
    },
    {
      "productId": "prod-002",
      "quantity": 1
    }
  ]
}
```

**Valid Example 3 - Edge Case Values:**

```json
{
  "orderId": "ORD-000001",
  "customerId": "cust-1",
  "total": 0.01,
  "status": "DELIVERED",
  "items": [
    {
      "productId": "prod-999",
      "quantity": 1
    }
  ]
}
```

### Testing Invalid Examples

Invalid examples should fail validation. Error messages should be clear. Test each type of validation error.

**What This Catches**: Data that looks valid but violates rules

**Invalid Example 1 - Missing Required Field:**

```json
{
  "orderId": "ORD-123456",
  "customerId": "cust-789",
  "total": 99.99,
  "status": "PENDING"
  // Missing required "items" field
}
```

**Expected Error:**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "items",
      "message": "Required property 'items' is missing"
    }
  ]
}
```

**Invalid Example 2 - Invalid Type:**

```json
{
  "orderId": "ORD-123456",
  "customerId": "cust-789",
  "total": "99.99",  // String instead of number
  "status": "PENDING",
  "items": [
    {
      "productId": "prod-001",
      "quantity": 2
    }
  ]
}
```

**Expected Error:**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "total",
      "message": "Expected type 'number' but got 'string'"
    }
  ]
}
```

**Invalid Example 3 - Pattern Mismatch:**

```json
{
  "orderId": "ORDER-123",  // Doesn't match pattern
  "customerId": "cust-789",
  "total": 99.99,
  "status": "PENDING",
  "items": [
    {
      "productId": "prod-001",
      "quantity": 2
    }
  ]
}
```

**Expected Error:**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "orderId",
      "message": "Value does not match pattern '^ORD-[0-9]{6}$'"
    }
  ]
}
```

**Invalid Example 4 - Constraint Violation:**

```json
{
  "orderId": "ORD-123456",
  "customerId": "cust-789",
  "total": -10.00,  // Negative number violates minimum constraint
  "status": "PENDING",
  "items": [
    {
      "productId": "prod-001",
      "quantity": 0  // Zero violates minimum constraint
    }
  ]
}
```

**Expected Error:**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "total",
      "message": "Value -10.00 is less than minimum 0"
    },
    {
      "field": "items[0].quantity",
      "message": "Value 0 is less than minimum 1"
    }
  ]
}
```

**Invalid Example 5 - Invalid Enum Value:**

```json
{
  "orderId": "ORD-123456",
  "customerId": "cust-789",
  "total": 99.99,
  "status": "COMPLETED",  // Not in enum list
  "items": [
    {
      "productId": "prod-001",
      "quantity": 2
    }
  ]
}
```

**Expected Error:**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "status",
      "message": "Value 'COMPLETED' is not in enum [PENDING, PROCESSING, SHIPPED, DELIVERED]"
    }
  ]
}
```

### Test Case Organization

Organize tests into clear categories. This makes them easy to maintain.

**Happy Path Tests**
- Minimal valid data (required fields only)
- Complete valid data (all fields)
- Edge cases (boundary values)
- Large data sets (many items)

**Error Path Tests**
- Missing required fields
- Wrong data types
- Rule violations
- Pattern errors
- Invalid enum values
- Boundary errors

**Comprehensive Test Suite Structure:**

```yaml
test_suite:
  schema: order-schema.json
  
  valid_cases:
    - name: minimal_valid_order
      description: Order with minimum required fields
      data: {...}
      
    - name: complete_valid_order
      description: Order with all optional fields
      data: {...}
      
    - name: edge_case_minimum_values
      description: Order with minimum allowed values
      data: {...}
      
  invalid_cases:
    - name: missing_required_field
      description: Order missing required items field
      data: {...}
      expected_error: "Required property 'items' is missing"
      
    - name: invalid_type_total
      description: Order with string total instead of number
      data: {...}
      expected_error: "Expected type 'number' but got 'string'"
      
    - name: negative_total
      description: Order with negative total
      data: {...}
      expected_error: "Value -10.00 is less than minimum 0"
```

## Backward Compatibility Testing

These tests ensure schema changes don't break old clients. Old data must still work with new schemas.

**What This Catches**: Changes that silently break production clients

### Safe Changes

Safe changes keep old clients working. Add optional fields only:

**Version 1 Schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "name": {"type": "string"},
    "email": {"type": "string", "format": "email"}
  },
  "required": ["id", "name", "email"]
}
```

**Version 2 Schema (Safe Changes):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "name": {"type": "string"},
    "email": {"type": "string", "format": "email"},
    "phoneNumber": {
      "type": "string",
      "description": "Optional phone number added in v2"
    },
    "preferredLanguage": {
      "type": "string",
      "enum": ["en", "es", "fr"],
      "default": "en",
      "description": "Optional language preference added in v2"
    }
  },
  "required": ["id", "name", "email"]
}
```

**Test Case - Old Data Validates Against New Schema:**

```json
{
  "id": "cust-123",
  "name": "John Doe",
  "email": "john@example.com"
}
```

This data validates against both schemas. Old clients keep working.

**Test Case - New Data Validates:**

```json
{
  "id": "cust-456",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phoneNumber": "+1-555-0100",
  "preferredLanguage": "es"
}
```

This data validates against Version 2. New clients use new features.

### Breaking Changes

Breaking changes stop old clients from working. Avoid these:

**Version 1 Schema:**

```json
{
  "type": "object",
  "properties": {
    "customerId": {"type": "string"},
    "total": {"type": "number"}
  },
  "required": ["customerId", "total"]
}
```

**Version 2 Schema (Breaking Change - Added Required Field):**

```json
{
  "type": "object",
  "properties": {
    "customerId": {"type": "string"},
    "total": {"type": "number"},
    "currency": {"type": "string"}  // New required field
  },
  "required": ["customerId", "total", "currency"]  // BREAKING!
}
```

**Test Case - Old Data Fails Against New Schema:**

```json
{
  "customerId": "cust-123",
  "total": 99.99
}
```

This data validates against Version 1. It fails against Version 2. The `currency` field is now required.

**Expected Error:**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "currency",
      "message": "Required property 'currency' is missing"
    }
  ],
  "breakingChange": true
}
```

### Types of Breaking Changes

**Adding Required Fields:**
```yaml
# BREAKING - Old clients miss the new field
required: [id, name]  # v1
required: [id, name, email]  # v2 - BREAKS old clients
```

**Removing Fields:**
```yaml
# BREAKING - Clients using field will break
properties:
  id: {type: string}
  name: {type: string}
  legacy: {type: string}  # v1
# v2 removes "legacy" - BREAKS clients
```

**Changing Field Types:**
```yaml
# BREAKING - Type changes break parsing
total:
  type: number  # v1
total:
  type: string  # v2 - BREAKS clients expecting number
```

**Removing Enum Values:**
```yaml
# BREAKING - Data with removed value fails
status:
  enum: [ACTIVE, INACTIVE, SUSPENDED]  # v1
status:
  enum: [ACTIVE, INACTIVE]  # v2 - BREAKS existing data
```

**Tightening Constraints:**
```yaml
# BREAKING - Valid data may now fail
maxLength: 100  # v1
maxLength: 50   # v2 - BREAKS data length 51-100

minimum: 0      # v1
minimum: 1      # v2 - BREAKS data with value 0
```

### Compatibility Test Matrix

Test schema changes in a systematic way. Cover all scenarios:

```yaml
compatibility_tests:
  - name: old_data_new_schema
    description: Old valid data validates against new schema
    old_schema: customer-v1.json
    new_schema: customer-v2.json
    test_data: customer-v1-valid.json
    expected: PASS
    
  - name: new_data_old_schema
    description: New data works with old schema (optional fields)
    old_schema: customer-v1.json
    new_schema: customer-v2.json
    test_data: customer-v2-valid.json
    expected: PASS  # If only optional fields added
    
  - name: detect_breaking_changes
    description: Detect incompatible schema changes
    old_schema: customer-v1.json
    new_schema: customer-v2-breaking.json
    expected: BREAKING_CHANGE_DETECTED
```

## Schema Evolution Testing

These tests verify how schemas change over time. Test migration paths and deprecation strategies.

**What This Catches**: Evolution patterns that seem safe but cause issues

### Adding Optional Fields

Adding optional fields is safe. Old data continues to validate.

**Initial Schema:**

```json
{
  "type": "object",
  "properties": {
    "productId": {"type": "string"},
    "name": {"type": "string"},
    "price": {"type": "number", "minimum": 0}
  },
  "required": ["productId", "name", "price"]
}
```

**Evolved Schema - Optional Field Added:**

```json
{
  "type": "object",
  "properties": {
    "productId": {"type": "string"},
    "name": {"type": "string"},
    "price": {"type": "number", "minimum": 0},
    "description": {
      "type": "string",
      "maxLength": 500,
      "description": "Added in v1.1 - Optional product description"
    },
    "inventory": {
      "type": "integer",
      "minimum": 0,
      "default": 0,
      "description": "Added in v1.1 - Available quantity"
    }
  },
  "required": ["productId", "name", "price"]
}
```

**Test Cases:**

```yaml
evolution_tests:
  - name: old_data_still_valid
    description: Data without new fields validates
    schema: product-v1.1.json
    data:
      productId: "prod-001"
      name: "Widget"
      price: 29.99
    expected: PASS
    
  - name: new_data_with_optional_fields
    description: Data with new fields validates
    schema: product-v1.1.json
    data:
      productId: "prod-002"
      name: "Gadget"
      price: 49.99
      description: "A useful gadget"
      inventory: 100
    expected: PASS
    
  - name: default_values_applied
    description: Default values work for missing fields
    schema: product-v1.1.json
    data:
      productId: "prod-003"
      name: "Tool"
      price: 19.99
    validation_result:
      inventory: 0  # Default applied
```

### Deprecating Fields

Mark fields as deprecated before removing them. Give clients time to migrate.

**Schema with Deprecated Field:**

```json
{
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "name": {"type": "string"},
    "email": {"type": "string", "format": "email"},
    "legacyId": {
      "type": "string",
      "deprecated": true,
      "description": "Deprecated: Use 'id' instead. Will be removed in v3.0.0 (January 2025)"
    }
  },
  "required": ["id", "name", "email"]
}
```

**Test Cases:**

```yaml
deprecation_tests:
  - name: new_clients_without_deprecated
    description: New clients don't use deprecated field
    schema: customer-v2.json
    data:
      id: "cust-123"
      name: "John Doe"
      email: "john@example.com"
    expected: PASS
    
  - name: old_clients_with_deprecated
    description: Old clients can still use deprecated field
    schema: customer-v2.json
    data:
      id: "cust-123"
      legacyId: "legacy-123"
      name: "John Doe"
      email: "john@example.com"
    expected: PASS
    warnings:
      - field: legacyId
        message: "Field is deprecated and will be removed in v3.0.0"
```

### Migration Path Testing

Test how to migrate from old schemas to new ones. Verify data transforms correctly:

**Version 1 Schema:**

```json
{
  "type": "object",
  "properties": {
    "customerId": {"type": "string"},
    "fullName": {"type": "string"}
  },
  "required": ["customerId", "fullName"]
}
```

**Version 2 Schema:**

```json
{
  "type": "object",
  "properties": {
    "customerId": {"type": "string"},
    "firstName": {"type": "string"},
    "lastName": {"type": "string"},
    "fullName": {
      "type": "string",
      "deprecated": true,
      "description": "Deprecated: Use firstName and lastName"
    }
  },
  "required": ["customerId", "firstName", "lastName"]
}
```

**Migration Test:**

```yaml
migration_test:
  - name: v1_to_v2_migration
    description: Test migration from v1 to v2
    source_schema: customer-v1.json
    target_schema: customer-v2.json
    
    source_data:
      customerId: "cust-123"
      fullName: "John Doe"
      
    migration_function: split_full_name
    
    expected_data:
      customerId: "cust-123"
      firstName: "John"
      lastName: "Doe"
      fullName: "John Doe"  # Keep for backward compat
      
    validates_against: customer-v2.json
```

## Breaking Change Detection

Automated tools find breaking changes between versions. Add detection to your CI/CD pipeline. Catch problems before deployment.

**What This Catches**: Subtle changes that break old clients

### Breaking Change Rules

Define clear rules for what counts as breaking. Use these in automation.

**Field-Level Breaking Changes:**

```yaml
breaking_changes:
  - rule: required_field_added
    description: Adding a new required field
    example:
      before: {required: [id, name]}
      after: {required: [id, name, email]}
    severity: MAJOR
    
  - rule: field_removed
    description: Removing any field
    example:
      before: {properties: {id, name, email}}
      after: {properties: {id, name}}
    severity: MAJOR
    
  - rule: type_changed
    description: Changing field data type
    example:
      before: {total: {type: number}}
      after: {total: {type: string}}
    severity: MAJOR
    
  - rule: enum_value_removed
    description: Removing enum value
    example:
      before: {enum: [ACTIVE, INACTIVE, SUSPENDED]}
      after: {enum: [ACTIVE, INACTIVE]}
    severity: MAJOR
```

**Constraint Breaking Changes:**

```yaml
constraint_changes:
  - rule: constraint_tightened
    description: Making validation more restrictive
    examples:
      - before: {maxLength: 100}
        after: {maxLength: 50}
      - before: {minimum: 0}
        after: {minimum: 1}
      - before: {pattern: "^[A-Z]+$"}
        after: {pattern: "^[A-Z]{3}$"}
    severity: MAJOR
    
  - rule: format_added
    description: Adding format constraint to existing field
    example:
      before: {email: {type: string}}
      after: {email: {type: string, format: email}}
    severity: MINOR  # May catch existing invalid data
```

### Detection Test Suite

**Test Schema Comparison:**

```yaml
breaking_change_detection:
  - name: detect_added_required_field
    old_schema:
      type: object
      properties:
        id: {type: string}
        name: {type: string}
      required: [id, name]
    new_schema:
      type: object
      properties:
        id: {type: string}
        name: {type: string}
        email: {type: string}
      required: [id, name, email]
    expected_result:
      breaking: true
      changes:
        - type: required_field_added
          field: email
          severity: MAJOR
          
  - name: detect_type_change
    old_schema:
      type: object
      properties:
        total: {type: number}
    new_schema:
      type: object
      properties:
        total: {type: string}
    expected_result:
      breaking: true
      changes:
        - type: type_changed
          field: total
          from: number
          to: string
          severity: MAJOR
          
  - name: safe_optional_field_added
    old_schema:
      type: object
      properties:
        id: {type: string}
      required: [id]
    new_schema:
      type: object
      properties:
        id: {type: string}
        notes: {type: string}
      required: [id]
    expected_result:
      breaking: false
      changes:
        - type: optional_field_added
          field: notes
          severity: MINOR
```

### Change Impact Analysis

Group changes by their impact level. Know what requires a new version:

```yaml
change_categories:
  major_breaking:
    - Added required field
    - Removed field
    - Changed type
    - Removed enum value
    - Made constraints stricter
    action: Need new major version
    
  minor_breaking:
    - Added format rule
    - Added pattern to field
    action: Consider new minor version
    
  non_breaking:
    - Added optional field
    - Added enum value
    - Relaxed constraints
    - Deprecated field
    action: Safe to deploy
```

## Contract Testing with Schemas

Contract testing verifies APIs match their definitions. The provider and consumer must agree on the contract.

**What This Catches**: APIs that drift from their documented behavior

### Provider Contract Testing

Provider tests check that the API produces valid responses. Responses must match the schema:

**OpenAPI Schema Definition:**

```yaml
paths:
  /orders/{orderId}:
    get:
      responses:
        '200':
          description: Order details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
                
components:
  schemas:
    Order:
      type: object
      properties:
        orderId: {type: string}
        customerId: {type: string}
        total: {type: number, minimum: 0}
        status:
          type: string
          enum: [PENDING, PROCESSING, SHIPPED, DELIVERED]
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
      required: [orderId, customerId, total, status, items]
```

**Provider Contract Test:**

```yaml
provider_tests:
  - name: get_order_response_matches_schema
    description: GET /orders/{orderId} returns valid Order schema
    
    request:
      method: GET
      path: /orders/ORD-123456
      headers:
        Authorization: Bearer {token}
        
    expected_response:
      status: 200
      headers:
        Content-Type: application/json
      schema_validation:
        schema: '#/components/schemas/Order'
        strict: true  # No additional properties
        
    test_data:
      orderId: "ORD-123456"
      
    assertions:
      - response_validates_against_schema
      - all_required_fields_present
      - no_extra_fields_in_strict_mode
      - field_types_match_schema
      - constraints_satisfied
```

### Consumer Contract Testing

Consumer tests check that clients handle provider responses correctly. Clients must work with real API data:

**Consumer Contract:**

```yaml
consumer_contract:
  consumer: OrderManagementUI
  provider: OrderServiceAPI
  
  interactions:
    - description: Retrieve order by ID
      request:
        method: GET
        path: /orders/ORD-123456
        headers:
          Authorization: Bearer token123
          
      response:
        status: 200
        headers:
          Content-Type: application/json
        body:
          orderId: "ORD-123456"
          customerId: "cust-789"
          total: 99.99
          status: "SHIPPED"
          items:
            - productId: "prod-001"
              quantity: 2
              price: 49.99
              
      schema_validation:
        validates_against: order-schema.json
        required_fields: [orderId, customerId, total, status]
```

**Test Execution:**

```yaml
contract_test_execution:
  - phase: consumer_verification
    description: Verify consumer can process provider response
    steps:
      - Load consumer contract
      - Generate response from contract
      - Validate response against schema
      - Feed response to consumer code
      - Assert consumer processes correctly
      
  - phase: provider_verification
    description: Verify provider produces contract-compliant responses
    steps:
      - Load consumer contract
      - Send request to provider
      - Capture actual response
      - Validate response against schema
      - Compare with contract expectations
```

### Schema-Driven Contract Tests

Use schemas as contracts between teams. This creates a shared agreement:

```yaml
schema_contract:
  name: Order Retrieval Contract
  provider: OrderService
  consumer: WebApp
  
  endpoint: GET /orders/{orderId}
  
  request_schema:
    type: object
    properties:
      orderId:
        type: string
        pattern: "^ORD-[0-9]{6}$"
    required: [orderId]
    
  response_schema:
    $ref: '#/components/schemas/Order'
    
  test_cases:
    - name: successful_retrieval
      request:
        orderId: "ORD-123456"
      expected_status: 200
      response_schema_validation: MUST_PASS
      
    - name: order_not_found
      request:
        orderId: "ORD-999999"
      expected_status: 404
      response_schema:
        $ref: '#/components/schemas/ProblemDetails'
```

## Schema Coverage Analysis

Coverage analysis ensures you test all schema paths. It finds untested scenarios. Good coverage prevents bugs.

**What This Catches**: Complex scenarios you forgot to test

### Schema Path Coverage

Test every possible path through your schema. Don't miss edge cases:

**Schema with Multiple Paths:**

```json
{
  "type": "object",
  "properties": {
    "paymentMethod": {
      "type": "string",
      "enum": ["CREDIT_CARD", "BANK_ACCOUNT", "PAYPAL"]
    },
    "creditCard": {
      "type": "object",
      "properties": {
        "cardNumber": {"type": "string"},
        "cvv": {"type": "string"}
      }
    },
    "bankAccount": {
      "type": "object",
      "properties": {
        "accountNumber": {"type": "string"},
        "routingNumber": {"type": "string"}
      }
    },
    "paypalEmail": {
      "type": "string",
      "format": "email"
    }
  },
  "required": ["paymentMethod"],
  "oneOf": [
    {
      "properties": {"paymentMethod": {"const": "CREDIT_CARD"}},
      "required": ["creditCard"]
    },
    {
      "properties": {"paymentMethod": {"const": "BANK_ACCOUNT"}},
      "required": ["bankAccount"]
    },
    {
      "properties": {"paymentMethod": {"const": "PAYPAL"}},
      "required": ["paypalEmail"]
    }
  ]
}
```

**Coverage Test Plan:**

```yaml
coverage_tests:
  # Test each enum value
  - path: paymentMethod = CREDIT_CARD
    test: valid_credit_card_payment
    data:
      paymentMethod: "CREDIT_CARD"
      creditCard:
        cardNumber: "4111111111111111"
        cvv: "123"
        
  - path: paymentMethod = BANK_ACCOUNT
    test: valid_bank_account_payment
    data:
      paymentMethod: "BANK_ACCOUNT"
      bankAccount:
        accountNumber: "123456789"
        routingNumber: "987654321"
        
  - path: paymentMethod = PAYPAL
    test: valid_paypal_payment
    data:
      paymentMethod: "PAYPAL"
      paypalEmail: "user@example.com"
      
  # Test invalid combinations
  - path: paymentMethod = CREDIT_CARD without creditCard
    test: invalid_missing_credit_card
    expected: VALIDATION_ERROR
    
  - path: paymentMethod = BANK_ACCOUNT without bankAccount
    test: invalid_missing_bank_account
    expected: VALIDATION_ERROR
```

### Conditional Schema Coverage

Test schemas with conditional rules. Verify each condition separately:

**Schema with Conditionals:**

```json
{
  "type": "object",
  "properties": {
    "orderType": {
      "type": "string",
      "enum": ["STANDARD", "EXPRESS"]
    },
    "expressDeliveryDate": {
      "type": "string",
      "format": "date"
    },
    "standardDeliveryWindow": {
      "type": "string",
      "enum": ["3-5_DAYS", "5-7_DAYS"]
    }
  },
  "required": ["orderType"],
  "if": {
    "properties": {
      "orderType": {"const": "EXPRESS"}
    }
  },
  "then": {
    "required": ["expressDeliveryDate"]
  },
  "else": {
    "required": ["standardDeliveryWindow"]
  }
}
```

**Conditional Coverage Tests:**

```yaml
conditional_tests:
  - name: express_order_with_date
    description: EXPRESS order requires delivery date
    data:
      orderType: "EXPRESS"
      expressDeliveryDate: "2024-12-25"
    expected: PASS
    
  - name: express_order_without_date
    description: EXPRESS order missing delivery date
    data:
      orderType: "EXPRESS"
    expected: FAIL
    error: "expressDeliveryDate is required for EXPRESS orders"
    
  - name: standard_order_with_window
    description: STANDARD order requires delivery window
    data:
      orderType: "STANDARD"
      standardDeliveryWindow: "3-5_DAYS"
    expected: PASS
    
  - name: standard_order_without_window
    description: STANDARD order missing delivery window
    data:
      orderType: "STANDARD"
    expected: FAIL
    error: "standardDeliveryWindow is required for STANDARD orders"
```

### Coverage Metrics

Track coverage with numbers. Know what you haven't tested:

```yaml
coverage_metrics:
  total_schema_paths: 25
  tested_paths: 23
  untested_paths: 2
  coverage_percentage: 92%
  
  untested_paths:
    - payment.paymentMethod = CRYPTOCURRENCY
    - shipping.addressType = MILITARY
    
  conditional_branches:
    total: 8
    tested: 7
    coverage: 87.5%
    
  enum_values:
    total: 45
    tested: 43
    coverage: 95.6%
```

## Testing Schema Examples

OpenAPI specs include examples. Validate these examples. They must match their schemas. Wrong examples confuse developers.

**What This Catches**: Documentation examples that don't actually work

### Validating Request Examples

Check that request examples work. Developers copy these examples:

**OpenAPI Request Example:**

```yaml
paths:
  /orders:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
            examples:
              standard_order:
                summary: Standard order creation
                value:
                  customerId: "cust-123"
                  items:
                    - productId: "prod-001"
                      quantity: 2
                  shippingAddress:
                    street: "123 Main St"
                    city: "Springfield"
                    zipCode: "12345"
```

**Example Validation Test:**

```yaml
example_validation:
  - name: validate_standard_order_example
    openapi_file: order-api.yaml
    path: /orders
    method: POST
    example_name: standard_order
    
    test:
      - Load schema from OpenAPI spec
      - Extract example data
      - Validate example against schema
      
    expected: PASS
    
    assertions:
      - example_matches_schema
      - all_required_fields_present
      - field_types_correct
      - constraints_satisfied
```

### Validating Response Examples

Check that response examples are realistic. They should show real API behavior:

**OpenAPI Response Example:**

```yaml
paths:
  /orders/{orderId}:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
              examples:
                shipped_order:
                  summary: Order that has been shipped
                  value:
                    orderId: "ORD-123456"
                    customerId: "cust-789"
                    total: 99.99
                    status: "SHIPPED"
                    items:
                      - productId: "prod-001"
                        quantity: 2
                        price: 49.99
                    trackingNumber: "1Z999AA10123456784"
```

**Example Validation Test:**

```yaml
response_example_validation:
  - name: validate_shipped_order_example
    openapi_file: order-api.yaml
    path: /orders/{orderId}
    method: GET
    response_code: 200
    example_name: shipped_order
    
    validation:
      schema_match: REQUIRED
      realistic_data: RECOMMENDED
      
    assertions:
      - example_validates_against_schema
      - optional_fields_demonstrated
      - realistic_values_used
```

### Example Completeness Testing

Provide examples for common scenarios. Cover the happy path and errors:

```yaml
example_coverage:
  endpoint: POST /orders
  
  required_examples:
    - minimal_valid_request
    - complete_request_all_fields
    - edge_case_minimum_values
    
  recommended_examples:
    - multiple_items
    - international_shipping
    - express_delivery
    
  error_examples:
    - validation_error_400
    - unauthorized_401
    - not_found_404
    
  current_examples:
    - standard_order
    - minimal_order
    
  missing_examples:
    - complete_request_all_fields
    - validation_error_400
    - unauthorized_401
```

## Automated Testing in CI/CD

Add schema testing to your CI/CD pipeline. Catch issues before deployment. Automation runs tests every time.

**What This Catches**: Schema problems before they reach production

### CI/CD Pipeline Integration

Build a pipeline that validates schemas automatically:

**Basic Pipeline:**

```yaml
schema_testing_pipeline:
  stages:
    - validate_schemas
    - test_examples
    - check_compatibility
    - detect_breaking_changes
    - publish_results
    
  jobs:
    validate_schemas:
      script:
        - Validate all JSON Schema files
        - Validate OpenAPI specifications
        - Check schema syntax and references
      on_failure: FAIL_BUILD
      
    test_examples:
      script:
        - Extract examples from OpenAPI specs
        - Validate examples against schemas
        - Test request/response examples
      on_failure: FAIL_BUILD
      
    check_compatibility:
      script:
        - Compare against previous version
        - Validate old data against new schemas
        - Test backward compatibility
      on_failure: WARN
      
    detect_breaking_changes:
      script:
        - Compare schema versions
        - Identify breaking changes
        - Generate change report
      on_failure: WARN_ON_BREAKING
      
    publish_results:
      script:
        - Generate test report
        - Update documentation
        - Publish metrics
```

### Pre-Commit Hooks

Validate schemas before code commits. Catch errors locally first:

```yaml
pre_commit_hooks:
  - name: validate-json-schema
    description: Validate JSON Schema syntax
    files: "*.schema.json"
    commands:
      - check-jsonschema --check-metaschema
      
  - name: validate-openapi
    description: Validate OpenAPI specifications
    files: "openapi.yaml"
    commands:
      - openapi-validator --errors-only
      
  - name: test-schema-examples
    description: Validate examples against schemas
    files: "*.schema.json|openapi.yaml"
    commands:
      - validate-examples --strict
```

### Pull Request Checks

**Automated PR Validation:**

```yaml
pull_request_checks:
  - check: schema_validation
    description: All schemas are valid
    required: true
    
  - check: example_validation
    description: All examples match schemas
    required: true
    
  - check: backward_compatibility
    description: No breaking changes detected
    required: false
    warn_on_failure: true
    
  - check: coverage_threshold
    description: Schema test coverage >= 80%
    required: true
    threshold: 80
    
  - check: documentation_updated
    description: Schema changes documented
    required: true
    when: schemas_modified
```

### Continuous Monitoring

Track schema quality metrics over time. Watch for trends:

```yaml
continuous_monitoring:
  metrics:
    - schema_validation_pass_rate
    - example_validation_pass_rate
    - backward_compatibility_score
    - test_coverage_percentage
    - breaking_changes_per_month
    
  dashboards:
    - schema_health_overview
    - compatibility_trends
    - coverage_trends
    
  alerts:
    - trigger: schema_validation_failure
      severity: HIGH
      action: Block deployment
      
    - trigger: backward_compatibility_break
      severity: MEDIUM
      action: Require approval
      
    - trigger: coverage_below_threshold
      severity: LOW
      action: Create ticket
```

## Tools and Techniques

Good tools make schema testing easier. Pick tools that work with any language.

### Schema Validation Tools

Choose validators that match your needs. Many options exist:

**JSON Schema Validators:**

- **AJV (Any JSON Validator)**: Fast JSON Schema validator
  - Works with JSON Schema Draft 2020-12
  - Clear error messages
  - Custom keywords and formats

- **JSON Schema Validators**: Available in many languages
  - Python: `jsonschema`
  - Java: `json-schema-validator`
  - Go: `gojsonschema`
  - Ruby: `json-schema`

**OpenAPI Validators:**

- **Spectral**: OpenAPI linting and validation
  - Uses rules to check specs
  - Custom rulesets
  - Works in CI/CD

- **OpenAPI Generator**: Validates OpenAPI specs
  - Checks references
  - Tests examples
  - Creates documentation

- **Swagger Parser**: Validates OpenAPI documents
  - Resolves references
  - Checks structure
  - Finds errors

### Breaking Change Detection Tools

These tools compare schema versions automatically:

**Schema Comparison:**

- **openapi-diff**: Finds breaking changes in OpenAPI
  - Compares two OpenAPI specs
  - Finds breaking changes
  - Creates change reports

- **json-schema-diff-validator**: Compares JSON Schemas
  - Finds schema changes
  - Rates change severity
  - Reports problems

**Example Integration:**

```yaml
breaking_change_detection:
  tool: openapi-diff
  compare:
    old: api-v1.0.0.yaml
    new: api-v1.1.0.yaml
  output: changes-report.md
  fail_on: breaking-changes
```

### Contract Testing Tools

Contract testing tools verify provider and consumer agreement:

**Pact**: Consumer-driven contract testing
- Contracts use JSON format
- Provider verification
- Consumer testing
- Works with any language

**Spring Cloud Contract**: Schema-based contracts
- YAML or JSON contracts
- Works with any HTTP client
- Creates tests from contracts

**Example Integration:**

```yaml
contract_test:
  tool: pact
  consumer: WebApp
  provider: OrderService
  
  contract_file: order-service-contract.json
  
  verification:
    - Check provider against contract
    - Run consumer tests with mock
    - Compare actual vs expected
```

### Automation Tools

**CI/CD Integration:**

```yaml
automation:
  pre_commit:
    - tool: pre-commit
      hooks:
        - check-jsonschema
        - validate-openapi
        
  ci_pipeline:
    - tool: GitHub Actions
      workflows:
        - schema-validation.yml
        - compatibility-check.yml
        
  monitoring:
    - tool: Prometheus
      metrics:
        - schema_validation_results
        - compatibility_scores
```

## Best Practices Summary

### Schema Testing Strategy

1. **Test Both Valid and Invalid Examples**
   - Cover happy paths
   - Test error conditions
   - Validate edge cases
   - Check boundary values

2. **Maintain Backward Compatibility**
   - Test old data against new schemas
   - Only add optional fields
   - Deprecate before removing
   - Version breaking changes

3. **Automate Validation**
   - Integrate into CI/CD
   - Use pre-commit hooks
   - Run on every PR
   - Monitor continuously

4. **Test Schema Evolution**
   - Validate migration paths
   - Test deprecated fields
   - Verify default values
   - Check conditional logic

5. **Detect Breaking Changes Early**
   - Compare schema versions
   - Classify change severity
   - Block breaking changes
   - Require approvals

### Quality Gates

**Pre-Deployment Checks:**

```yaml
quality_gates:
  - All schemas validate successfully
  - All examples match schemas
  - No breaking changes detected
  - Test coverage >= 80%
  - Documentation updated
```

**Continuous Validation:**

```yaml
continuous_validation:
  - Run tests on every commit
  - Validate in pull requests
  - Monitor in production
  - Track metrics over time
```

### Testing Checklist

For each schema change:

- [ ] Schema validates successfully
- [ ] All examples validate against schema
- [ ] Old data validates against new schema
- [ ] Breaking changes detected and documented
- [ ] Migration path tested
- [ ] Contract tests updated
- [ ] Coverage metrics meet threshold
- [ ] Documentation updated
- [ ] CI/CD pipeline passes

## Related Documentation

- [Schema Conventions](../request-response/schema-conventions.md) - Basic schema design principles
- [Advanced Schema Design](../request-response/advanced-schema-design.md) - Schema composition and versioning
- [OpenAPI Standards](../documentation/openapi-standards.md) - OpenAPI specification requirements
- [Documentation Testing](../documentation/documentation-testing.md) - Overall documentation testing strategy
- [API Version Strategy](../foundations/api-version-strategy.md) - API versioning approaches
- [Error Response Standards](../request-response/error-response-standards.md) - Error handling patterns
