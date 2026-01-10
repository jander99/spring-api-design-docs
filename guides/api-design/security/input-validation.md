# Input Validation Standards

> **📖 Reading Guide**
>
> **⏱️ Reading Time:** 5 minutes | **🟢 Level:** Beginner
>
> **📋 Prerequisites:** Basic JSON and HTTP knowledge  
> **🎯 Key Topics:** API Security, JSON Schema, Injection Prevention
>
> **📊 Complexity:** 9.3 grade level • 1.2% technical density • fairly difficult

## Overview

Input validation is the process of ensuring that data entering your API is safe, correctly formatted, and within expected bounds. It is your first line of defense against most API security threats.

Every byte that enters your system from a client must be treated as untrusted. This document provides standards for validating request bodies, parameters, and headers to protect your services from exploitation.

## Why Input Validation is Critical

According to the **OWASP API Security Top 10**, improper input validation is a primary factor in several major risks, including:

*   **API8:2023 Security Misconfiguration**: Allowing malformed or overly large payloads.
*   **Injection Attacks**: SQL, NoSQL, and Command injection via unvalidated strings.
*   **Data Corruption**: Incorrect types or formats leading to inconsistent state.
*   **Denial of Service (DoS)**: Processing massive payloads or deeply nested objects that exhaust server resources.

## Core Principles

Apply these four principles to every endpoint:

1.  **Validate Early**: Perform validation at the edge (API Gateway) or immediately upon receiving the request.
2.  **Strict Allow-listing**: Only accept what you explicitly define. Reject everything else.
3.  **Fail Fast**: Return a `400 Bad Request` immediately when invalid data is detected. Do not continue processing.
4.  **No Type Coercion**: Enforce strict JSON types. Do not automatically convert strings like `"123"` into numbers.

---

## 1. Request Body Validation

Use **JSON Schema** (Draft 2020-12 or later) to define the structure and constraints of your request bodies.

### Schema Definition Best Practices
A secure schema should always include:
*   `type`: Explicitly define the expected JSON type.
*   `required`: List all mandatory fields.
*   `additionalProperties: false`: Reject requests that contain unknown fields.
*   `maxLength` / `minLength`: Constrain every string.
*   `maximum` / `minimum`: Constrain every number.

### Example Secure Schema
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["email", "username", "priority"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 254
    },
    "username": {
      "type": "string",
      "minLength": 3,
      "maxLength": 30,
      "pattern": "^[a-z0-9_-]+$"
    },
    "priority": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    }
  },
  "additionalProperties": false
}
```

### Advanced Schema Patterns
Use schema composition to handle complex validation logic:

*   **`oneOf`**: Ensures the input matches exactly one sub-schema (e.g., choice between credit card or PayPal).
*   **`allOf`**: Combines multiple constraints (e.g., must be a valid User *and* an Admin).
*   **`if-then-else`**: Handles conditional validation (e.g., *if* country is 'US', *then* ZIP code is required).

---

## 2. Size and Complexity Limits

Attackers can crash an API by sending "toxic" payloads. You must enforce limits on payload size and structural complexity.

| Constraint | Standard Limit | Protection Provided |
| :--- | :--- | :--- |
| **Max Payload Size** | 1 MB (default) | Prevents memory exhaustion and large-scale DoS. |
| **Max String Length** | 2048 characters | Stops buffer overflow and heavy regex processing. |
| **Max Array Items** | 100 items | Prevents CPU-intensive loops. |
| **Max Object Depth** | 5-10 levels | Stops stack overflow from recursive parsing. |
| **Max Properties** | 50 properties | Limits object parsing overhead. |

> **Note**: For file uploads, use multipart/form-data and enforce limits at the gateway level before the request reaches your application.

---

## 3. Type Coercion and Strictness

Lenient parsing is a security risk. It creates "hidden" logic where the server guesses the client's intent.

### Standard Policy: Strict Types Only
Your API must reject type mismatches instead of attempting to "fix" them:

*   ❌ **Lenient**: Accepting `"100"` when a number is expected.
*   ✅ **Strict**: Rejecting `"100"` with a validation error; requiring `100`.
*   ❌ **Lenient**: Parsing `"true"`, `"1"`, or `"yes"` as booleans.
*   ✅ **Strict**: Only accepting JSON booleans `true` and `false`.

**Why strictness matters**: Type confusion can lead to business logic bypasses, especially in weakly-typed languages where `0 == false` or `"" == 0`.

---

## 4. Sanitization Patterns

Validation tells you if data is *valid*; sanitization ensures it is *clean*.

1.  **Unicode Normalization**: Convert input to a standard form (NFC) to prevent "homograph" attacks (e.g., using a Cyrillic 'a' instead of a Latin 'a').
2.  **Control Character Removal**: Strip non-printable ASCII characters (0-31 and 127) to prevent terminal or log corruption.
3.  **Whitespace Management**: Trim leading and trailing whitespace. Internal whitespace should be normalized to single spaces if used for indexing.
4.  **Path Normalization**: Before using a string as a file path, resolve all `..`, `.` and symlinks to prevent directory traversal.

---

## 5. Injection Prevention

Input validation is a secondary defense against injection. While **parameterization** (for SQL) and **escaping** (for HTML) are primary defenses, validation prevents the malicious payload from ever reaching those layers.

### SQL and NoSQL Injection
Validate that identifiers (IDs) match expected formats (e.g., UUID or integer) and that search terms do not contain common injection characters like `;`, `--`, or `$`.

### Command Injection
If an input is used in a system command:
*   Use an allow-list of characters (e.g., `^[a-zA-Z0-9._-]+$`).
*   Never pass raw strings to a shell. Use argument arrays instead.

### XML External Entity (XXE)
When accepting XML (which is discouraged in favor of JSON), disable DTD and external entity processing in your parser.

### Log Injection
Sanitize inputs before logging them. Attackers use newlines (`\n`) to forge log entries or control characters to manipulate log viewing tools.

---

## 6. Parameter Validation

### Path Parameters
Path parameters are part of the resource identity. They must be extremely strict.
*   **Format**: Use UUIDs or auto-incrementing integers.
*   **Sanitization**: Percent-decode parameters and reject those containing slashes (`/`) or null bytes (`%00`).

### Query Parameters
Query parameters are often used for filtering and pagination.
*   **Types**: Enforce integer types for `limit` and `offset`.
*   **Ranges**: Set a maximum for `limit` (e.g., 100) to prevent deep-paging DoS.
*   **Enums**: For fields like `sort` or `status`, validate against a hard-coded list of allowed values.

---

## 7. Validation Error Reporting

Follow **RFC 9457** (Problem Details for HTTP APIs) to report validation errors. This allows clients to programmatically handle errors.

### Example Validation Error Response
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request body contains 2 invalid fields.",
  "instance": "/v1/users",
  "errors": [
    {
      "pointer": "#/email",
      "reason": "format",
      "message": "Must be a valid email address."
    },
    {
      "pointer": "#/priority",
      "reason": "maximum",
      "message": "Value must be less than or equal to 5."
    }
  ]
}
```

---

## Summary Checklist

- [ ] Every input field is governed by a JSON Schema with `additionalProperties: false`.
- [ ] Maximum lengths and sizes are enforced for all strings, arrays, and payloads.
- [ ] Strict type checking is enabled; no automatic type coercion.
- [ ] Path and query parameters are validated against strict regex or enums.
- [ ] Inputs used in queries or commands are sanitized and normalized.
- [ ] Validation errors are returned using structured `application/problem+json` format.
