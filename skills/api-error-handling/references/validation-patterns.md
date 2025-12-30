# Validation Error Patterns

This reference covers patterns for reporting validation errors in API responses, including field-level errors, nested objects, arrays, and cross-field validation.

## Error Array Structure

### Basic Field Error

```json
{
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email address"
    }
  ]
}
```

### With Rejected Value

Include the invalid value when helpful for debugging:

```json
{
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email address",
      "rejectedValue": "not-an-email"
    }
  ]
}
```

**Security note:** Never include rejected values for sensitive fields (passwords, tokens, SSN).

## Field Path Notation

### Nested Objects

Use dot notation for nested fields:

```json
// Request body
{
  "customer": {
    "address": {
      "zipCode": "invalid"
    }
  }
}

// Error response
{
  "errors": [
    {
      "field": "customer.address.zipCode",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid 5-digit zip code"
    }
  ]
}
```

### Array Elements

Use bracket notation with zero-based index:

```json
// Request body
{
  "items": [
    {"productId": "abc", "quantity": 5},
    {"productId": "def", "quantity": -1}
  ]
}

// Error response
{
  "errors": [
    {
      "field": "items[1].quantity",
      "code": "MIN_VALUE",
      "message": "Must be at least 1"
    }
  ]
}
```

### Array-Level Validation

For constraints on the array itself:

```json
{
  "errors": [
    {
      "field": "items",
      "code": "NOT_EMPTY",
      "message": "At least one item is required"
    },
    {
      "field": "items",
      "code": "MAX_SIZE",
      "message": "Cannot exceed 50 items"
    }
  ]
}
```

## Error Code Conventions

### Standard Validation Codes

| Code | Description | Example Field Types |
|------|-------------|---------------------|
| `REQUIRED` | Field is required but missing/null | Any |
| `NOT_EMPTY` | String/array cannot be empty | String, Array |
| `NOT_BLANK` | String cannot be blank (whitespace only) | String |
| `MIN_VALUE` | Below minimum numeric value | Number |
| `MAX_VALUE` | Above maximum numeric value | Number |
| `MIN_LENGTH` | Below minimum string length | String |
| `MAX_LENGTH` | Above maximum string length | String |
| `MIN_SIZE` | Below minimum collection size | Array |
| `MAX_SIZE` | Above maximum collection size | Array |
| `INVALID_FORMAT` | Doesn't match expected format | Email, Phone, etc. |
| `PATTERN_MISMATCH` | Doesn't match regex pattern | Any |
| `INVALID_VALUE` | Value not in allowed set | Enum fields |
| `FUTURE_DATE` | Date must be in future | Date |
| `PAST_DATE` | Date must be in past | Date |

### Domain-Specific Codes

Prefix with domain for business rules:

| Code | Description |
|------|-------------|
| `ORD_DUPLICATE_ITEM` | Same product added twice |
| `PAY_CARD_EXPIRED` | Payment card has expired |
| `CUST_EMAIL_EXISTS` | Email already registered |
| `INV_INSUFFICIENT_STOCK` | Not enough inventory |

## Common Validation Scenarios

### Required Fields

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "Required fields are missing",
  "errors": [
    {"field": "customerId", "code": "REQUIRED", "message": "Customer ID is required"},
    {"field": "shippingAddress", "code": "REQUIRED", "message": "Shipping address is required"}
  ]
}
```

### Format Validation

```json
{
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email address",
      "rejectedValue": "john@"
    },
    {
      "field": "phone",
      "code": "PATTERN_MISMATCH",
      "message": "Must be a valid phone number (e.g., +1-555-555-5555)",
      "rejectedValue": "555-1234"
    }
  ]
}
```

### Range Validation

```json
{
  "errors": [
    {
      "field": "quantity",
      "code": "MIN_VALUE",
      "message": "Must be at least 1",
      "rejectedValue": 0,
      "constraint": {"min": 1}
    },
    {
      "field": "discount",
      "code": "MAX_VALUE",
      "message": "Cannot exceed 50%",
      "rejectedValue": 75,
      "constraint": {"max": 50}
    }
  ]
}
```

### Enum Validation

```json
{
  "errors": [
    {
      "field": "paymentMethod",
      "code": "INVALID_VALUE",
      "message": "Must be one of: CREDIT_CARD, DEBIT_CARD, PAYPAL, BANK_TRANSFER",
      "rejectedValue": "BITCOIN",
      "allowedValues": ["CREDIT_CARD", "DEBIT_CARD", "PAYPAL", "BANK_TRANSFER"]
    }
  ]
}
```

### Date Validation

```json
{
  "errors": [
    {
      "field": "deliveryDate",
      "code": "FUTURE_DATE",
      "message": "Delivery date must be in the future",
      "rejectedValue": "2024-01-01"
    },
    {
      "field": "birthDate",
      "code": "PAST_DATE",
      "message": "Birth date must be in the past",
      "rejectedValue": "2030-01-01"
    }
  ]
}
```

## Cross-Field Validation

### Date Range Validation

```json
// Request
{
  "startDate": "2024-03-01",
  "endDate": "2024-02-01"
}

// Error
{
  "errors": [
    {
      "field": "endDate",
      "code": "DATE_RANGE",
      "message": "End date must be after start date",
      "relatedFields": ["startDate", "endDate"]
    }
  ]
}
```

### Conditional Required Fields

```json
// Request: Chose credit card but didn't provide card details
{
  "paymentMethod": "CREDIT_CARD",
  "cardNumber": null
}

// Error
{
  "errors": [
    {
      "field": "cardNumber",
      "code": "CONDITIONALLY_REQUIRED",
      "message": "Card number is required when payment method is CREDIT_CARD",
      "condition": "paymentMethod=CREDIT_CARD"
    }
  ]
}
```

### Mutual Exclusion

```json
// Request: Provided both when only one allowed
{
  "email": "john@example.com",
  "phone": "+1-555-555-5555"
}

// Error (if only one contact method allowed)
{
  "errors": [
    {
      "field": "email",
      "code": "MUTUAL_EXCLUSION",
      "message": "Provide either email or phone, not both",
      "relatedFields": ["email", "phone"]
    }
  ]
}
```

## Business Rule Validation

### Inventory Check

```json
{
  "type": "https://api.example.com/problems/insufficient-inventory",
  "title": "Insufficient Inventory",
  "status": 400,
  "detail": "One or more items have insufficient stock",
  "errors": [
    {
      "field": "items[0].quantity",
      "code": "INV_INSUFFICIENT_STOCK",
      "message": "Only 5 units available",
      "requestedQuantity": 10,
      "availableQuantity": 5,
      "productId": "prod-123"
    }
  ]
}
```

### Duplicate Detection

```json
{
  "type": "https://api.example.com/problems/duplicate-entry",
  "title": "Duplicate Entry",
  "status": 409,
  "detail": "A resource with this identifier already exists",
  "errors": [
    {
      "field": "email",
      "code": "CUST_EMAIL_EXISTS",
      "message": "A user with this email already exists"
    }
  ]
}
```

## Error Message Guidelines

### Good Messages

- Specific and actionable
- Tell user what to do, not just what's wrong
- Include constraints when helpful

```json
{"message": "Must be between 1 and 100 characters"}
{"message": "Must be a valid email address (e.g., user@example.com)"}
{"message": "Must be one of: PENDING, APPROVED, REJECTED"}
```

### Bad Messages

- Too vague
- Technical jargon
- No guidance

```json
{"message": "Invalid value"}
{"message": "Constraint violation"}
{"message": "Failed regex validation"}
```

## Aggregating Multiple Errors

Always return ALL validation errors in a single response, not just the first:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "3 validation errors occurred",
  "errors": [
    {"field": "email", "code": "REQUIRED", "message": "Email is required"},
    {"field": "password", "code": "MIN_LENGTH", "message": "Must be at least 8 characters"},
    {"field": "password", "code": "PATTERN_MISMATCH", "message": "Must contain at least one number"}
  ]
}
```

**Why aggregate?**
- Better UX: User can fix all issues at once
- Fewer round-trips
- More professional API

## Client-Side Handling

Design errors for easy client consumption:

```javascript
// Client can map errors to form fields
const errorsByField = response.errors.reduce((acc, error) => {
  acc[error.field] = acc[error.field] || [];
  acc[error.field].push(error.message);
  return acc;
}, {});

// Result: { email: ["Email is required"], password: ["Must be at least 8 characters", "Must contain a number"] }
```

Use the `code` field for programmatic handling:

```javascript
if (error.code === "CUST_EMAIL_EXISTS") {
  showLoginOption(); // Offer to log in instead
}
```
