# Schema Conventions

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 9 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** Strong API background, experience with complex systems  
> **🎯 Key Topics:** Data, Documentation
> 
> **📊 Complexity:** 13.3 grade level • 0.8% technical density • fairly difficult

## Overview

This guide shows how to write consistent JSON schemas. It covers field names, dates, numbers, and booleans. Follow these rules to make your APIs easier to use.

## Field Naming Conventions

### Standard Naming Format

Use camelCase for all JSON property names:

```json
{
  "customerId": "cust-12345",
  "firstName": "John",
  "lastName": "Smith",
  "emailAddress": "john.smith@example.com",
  "phoneNumber": "+1-555-0100",
  "dateOfBirth": "1985-06-15"
}
```

**Why camelCase?**
- Works with JavaScript dot notation
- Matches Google's JSON style
- Follows JavaScript rules

### Naming Rules

Follow these rules for property names:

1. Start with a lowercase letter
2. Use letters and digits
3. Avoid JavaScript reserved keywords
4. Choose clear, meaningful names

**Good Examples:**

```json
{
  "orderTotal": 125.50,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Springfield",
    "zipCode": "12345"
  },
  "itemCount": 3,
  "isActive": true
}
```

**Bad Examples:**

```json
{
  "OrderTotal": 125.50,          // Don't start with capital
  "shipping_address": { },       // Don't use snake_case
  "class": "premium",            // Don't use reserved words
  "x": 3,                        // Use meaningful names
  "flg": true                    // Avoid abbreviations
}
```

### Singular vs Plural Names

Use singular names for single values and plural names for arrays:

```json
{
  "customer": {
    "name": "John Smith"
  },
  "items": [
    { "id": "item-1", "name": "Product A" },
    { "id": "item-2", "name": "Product B" }
  ],
  "totalItems": 2,
  "itemCount": 2
}
```

**Exception:** You can use plurals for counts:
- `totalItems` works (means "total of items")
- `itemCount` also works (singular "count")

### Map vs Object Properties

Regular objects have fixed property names. Maps have dynamic keys:

**Regular Object (Fixed Properties):**

```json
{
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "12345"
  }
}
```

**Map Structure (Dynamic Keys):**

```json
{
  "thumbnails": {
    "72": "https://example.com/thumb-72.jpg",
    "144": "https://example.com/thumb-144.jpg",
    "256": "https://example.com/thumb-256.jpg"
  },
  "translations": {
    "en": "Hello",
    "es": "Hola",
    "fr": "Bonjour"
  }
}
```

Map keys can use any characters. They don't need camelCase.

## Date and Time Formats

### ISO 8601 Standard

Always use ISO 8601 format for dates and times:

**Date-Time (with timezone):**

```json
{
  "createdAt": "2024-07-15T14:32:22Z",
  "updatedAt": "2024-07-15T14:32:22.123Z",
  "scheduledFor": "2024-07-16T09:00:00-05:00"
}
```

**Date Only:**

```json
{
  "birthDate": "1985-06-15",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

**Time Only:**

```json
{
  "businessHoursOpen": "09:00:00",
  "businessHoursClose": "17:30:00"
}
```

**Duration:**

```json
{
  "processingTime": "PT2H30M",
  "sessionTimeout": "PT15M",
  "contractLength": "P1Y6M"
}
```

### Format Rules

| Format | Pattern | Example | Use Case |
|--------|---------|---------|----------|
| Date-Time (UTC) | `YYYY-MM-DDTHH:mm:ss.sssZ` | `2024-07-15T14:32:22.123Z` | Timestamps, events |
| Date-Time (Offset) | `YYYY-MM-DDTHH:mm:ss±HH:mm` | `2024-07-15T14:32:22-05:00` | Scheduled events |
| Date | `YYYY-MM-DD` | `2024-07-15` | Birth dates, deadlines |
| Time | `HH:mm:ss` | `14:32:22` | Business hours, durations |
| Duration | ISO 8601 Duration | `P3Y6M4DT12H30M5S` | Time spans, periods |

**Why ISO 8601?**
- Works globally
- Clear and unambiguous
- Sortable as strings
- Supported everywhere

### Common Date/Time Mistakes

**Bad Examples:**

```json
{
  "createdDate": "07/15/2024",           // Ambiguous format
  "timestamp": 1721054542,               // Unix timestamp (use ISO 8601)
  "scheduledTime": "2pm EST",            // Non-standard format
  "birthDate": "June 15, 1985"           // Text format
}
```

**Good Examples:**

```json
{
  "createdDate": "2024-07-15T14:32:22Z",
  "timestamp": "2024-07-15T14:32:22Z",
  "scheduledTime": "2024-07-15T14:00:00-05:00",
  "birthDate": "1985-06-15"
}
```

## Null, Omission, and Empty Values

### Null vs Omission

Leave out optional fields rather than setting them to null:

**Preferred (Omit null values):**

```json
{
  "customerId": "cust-12345",
  "firstName": "John",
  "lastName": "Smith"
}
```

**Acceptable (Include null when semantically meaningful):**

```json
{
  "customerId": "cust-12345",
  "firstName": "John",
  "lastName": "Smith",
  "middleName": null,
  "nickname": null
}
```

**When to include null:**
- The field missing means something different than null
- The field is usually there but now empty
- Clients need to know the field was cleared

**Example with semantic difference:**

```json
{
  "balance": 0,           // Zero balance (keep this)
  "discount": null,       // No discount applied (meaningful null)
  "referralCode": null    // No referral (meaningful null)
}
```

### Empty Collections

Return empty arrays for empty collections, never null:

**Good:**

```json
{
  "items": [],
  "tags": [],
  "comments": []
}
```

**Bad:**

```json
{
  "items": null,
  "tags": null,
  "comments": null
}
```

### Empty Strings

Use empty strings for blank text fields when the field exists but has no value:

**Good:**

```json
{
  "firstName": "John",
  "middleName": "",
  "lastName": "Smith"
}
```

**Bad:**

```json
{
  "firstName": "John",
  "middleName": null,
  "lastName": "Smith"
}
```

**Exception:** If the field is optional and never set, leave it out.

## Boolean Representation

### Standard Format

Use JSON boolean values (`true` or `false`), not strings or numbers:

**Good:**

```json
{
  "isActive": true,
  "emailVerified": false,
  "isPremium": true,
  "hasDiscount": false
}
```

**Bad:**

```json
{
  "isActive": "true",      // String instead of boolean
  "emailVerified": 0,      // Number instead of boolean
  "isPremium": "yes",      // Text representation
  "hasDiscount": 1         // Number instead of boolean
}
```

### Boolean Naming

Prefix boolean fields with `is`, `has`, `can`, or similar verbs:

**Good:**

```json
{
  "isEnabled": true,
  "hasAccess": false,
  "canEdit": true,
  "wasProcessed": false,
  "shouldNotify": true
}
```

**Bad:**

```json
{
  "enabled": true,         // Missing verb prefix
  "access": false,         // Unclear meaning
  "editable": true,        // Use "canEdit" instead
  "processed": false       // Use "wasProcessed" instead
}
```

## Numeric Types

### Integer vs Decimal

Use appropriate numeric types based on the data:

**Integers (whole numbers):**

```json
{
  "quantity": 5,
  "pageNumber": 1,
  "itemCount": 42,
  "statusCode": 200
}
```

**Decimals (fractional values):**

```json
{
  "price": 19.99,
  "taxRate": 0.08,
  "distance": 12.5,
  "weight": 2.75
}
```

### Precision and Range

Specify precision for financial and scientific data:

**Financial Data:**

```json
{
  "price": 19.99,
  "tax": 1.60,
  "total": 21.59,
  "currency": "USD"
}
```

**Important:** Always include currency codes. Never assume a default currency.

**Scientific Data:**

```json
{
  "temperature": 98.6,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "elevation": 10.5,
  "unit": "meters"
}
```

### Large Numbers

Use strings for very large numbers to keep precision:

**Safe (within JavaScript safe integer range):**

```json
{
  "orderId": 1234567890,
  "userId": 9876543210
}
```

**Use strings for very large numbers:**

```json
{
  "bigIntValue": "9223372036854775807",
  "accountBalance": "1234567890.123456"
}
```

**JavaScript safe integer range:** ±9,007,199,254,740,991 (2^53 - 1)

## Enum Handling

### String-Based Enums

Always represent enum values as strings, not numbers:

**Good:**

```json
{
  "status": "PENDING",
  "priority": "HIGH",
  "color": "RED",
  "orderType": "EXPRESS"
}
```

**Bad:**

```json
{
  "status": 1,              // Numeric enum (avoid)
  "priority": 3,            // Numeric enum (avoid)
  "color": 0xFF0000,        // Numeric representation
  "orderType": 2            // Numeric enum (avoid)
}
```

**Why strings?**
- Values explain themselves
- Easier to debug
- Handles changes better
- No mapping tables needed

### Enum Naming

Use UPPER_SNAKE_CASE for enum values:

**Good:**

```json
{
  "status": "PENDING_APPROVAL",
  "paymentMethod": "CREDIT_CARD",
  "shippingSpeed": "TWO_DAY"
}
```

**Acceptable (simple enums):**

```json
{
  "status": "PENDING",
  "priority": "HIGH",
  "color": "BLUE"
}
```

### Enum Extension

Design enums to handle future additions gracefully:

**Version 1:**

```json
{
  "orderStatus": "PENDING",
  "validStatuses": ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"]
}
```

**Version 2 (added new status):**

```json
{
  "orderStatus": "IN_TRANSIT",
  "validStatuses": ["PENDING", "PROCESSING", "IN_TRANSIT", "SHIPPED", "DELIVERED"]
}
```

Handle unknown enum values well:
- Log unknown values
- Use a default behavior
- Never crash on unknowns

## Property Ordering

### Recommended Order

JSON properties have no required order. But consistent order helps readability:

**1. Identifiers first:**

```json
{
  "id": "order-12345",
  "customerId": "cust-67890",
  "type": "EXPRESS",
  "status": "PROCESSING"
}
```

**2. Core properties:**

```json
{
  "id": "order-12345",
  "status": "PROCESSING",
  "total": 125.50,
  "currency": "USD"
}
```

**3. Nested objects:**

```json
{
  "id": "order-12345",
  "status": "PROCESSING",
  "customer": {
    "id": "cust-67890",
    "name": "John Smith"
  },
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Springfield"
  }
}
```

**4. Collections last:**

```json
{
  "id": "order-12345",
  "status": "PROCESSING",
  "total": 125.50,
  "items": [
    { "id": "item-1", "name": "Product A" },
    { "id": "item-2", "name": "Product B" }
  ]
}
```

### Special Properties

**`kind` property (if present) should be first:**

```json
{
  "kind": "order",
  "id": "order-12345",
  "status": "PROCESSING"
}
```

**`items` property should be last in collections:**

```json
{
  "totalItems": 42,
  "pageSize": 10,
  "currentPage": 1,
  "items": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ]
}
```

## Complete Examples

### Customer Record

**Good schema conventions:**

```json
{
  "id": "cust-12345",
  "type": "PREMIUM",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "phoneNumber": "+1-555-0100",
  "dateOfBirth": "1990-03-15",
  "isActive": true,
  "emailVerified": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-07-15T14:32:22Z",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Portland",
    "state": "OR",
    "zipCode": "97201",
    "country": "US"
  },
  "preferences": {
    "newsletter": true,
    "notifications": false,
    "language": "en"
  },
  "orders": []
}
```

### Order Record

**Good schema conventions:**

```json
{
  "id": "order-98765",
  "orderNumber": "ORD-2024-98765",
  "status": "PROCESSING",
  "priority": "STANDARD",
  "customerId": "cust-12345",
  "orderDate": "2024-07-15T14:32:22Z",
  "shippedDate": null,
  "deliveryDate": null,
  "subtotal": 115.50,
  "tax": 10.00,
  "total": 125.50,
  "currency": "USD",
  "shippingAddress": {
    "street": "456 Oak Avenue",
    "city": "Portland",
    "state": "OR",
    "zipCode": "97201",
    "country": "US"
  },
  "items": [
    {
      "id": "item-1",
      "productId": "prod-111",
      "name": "Widget A",
      "quantity": 2,
      "unitPrice": 25.00,
      "total": 50.00
    },
    {
      "id": "item-2",
      "productId": "prod-222",
      "name": "Widget B",
      "quantity": 1,
      "unitPrice": 65.50,
      "total": 65.50
    }
  ]
}
```

### Event Record

**Good schema conventions:**

```json
{
  "id": "event-55555",
  "type": "WEBINAR",
  "title": "API Design Best Practices",
  "description": "Learn modern API design patterns",
  "status": "SCHEDULED",
  "startTime": "2024-08-01T14:00:00-05:00",
  "endTime": "2024-08-01T15:30:00-05:00",
  "duration": "PT1H30M",
  "timezone": "America/Chicago",
  "maxAttendees": 100,
  "currentAttendees": 42,
  "isPublic": true,
  "registrationRequired": true,
  "isFull": false,
  "createdAt": "2024-07-01T10:00:00Z",
  "updatedAt": "2024-07-15T14:32:22Z",
  "organizer": {
    "id": "user-999",
    "name": "API Team",
    "email": "api-team@example.com"
  },
  "location": {
    "type": "VIRTUAL",
    "platform": "Zoom",
    "url": "https://zoom.us/j/123456789"
  },
  "tags": ["api", "design", "webinar"],
  "attendees": []
}
```

## JSON Schema Validation

Document your schema conventions using JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "customerId": {
      "type": "string",
      "minLength": 1,
      "description": "Unique customer identifier"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "Customer email address"
    },
    "dateOfBirth": {
      "type": "string",
      "format": "date",
      "description": "Birth date in ISO 8601 format (YYYY-MM-DD)"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "Creation timestamp in ISO 8601 format"
    },
    "isActive": {
      "type": "boolean",
      "description": "Whether customer account is active"
    },
    "accountType": {
      "type": "string",
      "enum": ["BASIC", "PREMIUM", "ENTERPRISE"],
      "description": "Customer account tier"
    },
    "balance": {
      "type": "number",
      "minimum": 0,
      "description": "Account balance in USD"
    }
  },
  "required": ["customerId", "email", "isActive"]
}
```

## Implementation Guidelines

### API Documentation

Document these in your API docs:

1. **Naming** - Require camelCase
2. **Dates** - Require ISO 8601
3. **Nulls** - Say when to omit vs use null
4. **Enums** - List all valid values
5. **Precision** - Specify decimal places

### Validation

Validate these on the server:
- Field names
- Date formats
- Enum values
- Number ranges
- Required fields

Return RFC 7807 Problem Details for validation errors. See [Error Response Standards](Error-Response-Standards.md).

### Backward Compatibility

When changing schemas:
- **Add fields** as optional
- **Never remove** (deprecate instead)
- **Never change types** (make new fields)
- **Document deprecations** clearly
- **Version breaking changes** properly

## Common Schema Mistakes

### Inconsistent Naming

**Bad:**

```json
{
  "customer_id": "cust-123",
  "FirstName": "John",
  "last_name": "Smith",
  "EMail": "john@example.com"
}
```

**Good:**

```json
{
  "customerId": "cust-123",
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@example.com"
}
```

### Mixed Date Formats

**Bad:**

```json
{
  "createdDate": "07/15/2024",
  "updatedDate": "2024-07-15",
  "shippedDate": "July 15, 2024"
}
```

**Good:**

```json
{
  "createdDate": "2024-07-15T10:30:00Z",
  "updatedDate": "2024-07-15T14:32:22Z",
  "shippedDate": "2024-07-15T16:00:00Z"
}
```

### Inconsistent Null Handling

**Bad:**

```json
{
  "items": null,
  "tags": [],
  "categories": "none",
  "description": "N/A"
}
```

**Good:**

```json
{
  "items": [],
  "tags": [],
  "categories": []
}
```

### Numeric Enum Values

**Bad:**

```json
{
  "status": 1,
  "priority": 3,
  "type": 2
}
```

**Good:**

```json
{
  "status": "PENDING",
  "priority": "HIGH",
  "type": "EXPRESS"
}
```

## Appendix: Reserved JavaScript Keywords

Avoid these reserved words in property names:

```
abstract, boolean, break, byte, case, catch, char, class, const, continue,
debugger, default, delete, do, double, else, enum, export, extends, false,
final, finally, float, for, function, goto, if, implements, import, in,
instanceof, int, interface, let, long, native, new, null, package, private,
protected, public, return, short, static, super, switch, synchronized, this,
throw, throws, transient, true, try, typeof, var, volatile, void, while,
with, yield
```

## Related Documentation

- [Content Types and Structure](Content-Types-and-Structure.md) - Request/response payload patterns
- [Error Response Standards](Error-Response-Standards.md) - Error handling with RFC 7807
- [Pagination and Filtering](Pagination-and-Filtering.md) - Collection response patterns
- [OpenAPI Standards](../documentation/OpenAPI-Standards.md) - API documentation with schema definitions
