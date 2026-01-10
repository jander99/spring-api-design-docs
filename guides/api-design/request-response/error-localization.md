# Error Localization

## Overview

Error localization makes API error messages understandable in the user’s preferred language.

This document defines how to localize RFC 9457 Problem Details responses using standard HTTP language negotiation. It also defines what must remain stable and machine-readable so clients can handle errors consistently across languages.

## Goals

- Return localized, human-readable error messages when a client sends `Accept-Language`.
- Preserve stable, non-localized identifiers for programmatic handling.
- Provide predictable fallback behavior when a requested language is not available.
- Avoid mixing languages in a single response.

## Non-Goals

- Translating business data (resource fields) returned in successful responses.
- Defining UI copy or client-side translation bundles.
- Returning different error schemas per language.

## Core Principles

### Localize human-facing fields

Localize text intended for humans:

- RFC 9457 `title`
- RFC 9457 `detail`
- Any human-facing extension fields such as per-field validation messages

### Keep machine-facing fields stable

Do not localize identifiers that clients use for branching logic, analytics, or automated handling:

- HTTP status code
- RFC 9457 `type` (a URI)
- RFC 9457 `instance` (a URI reference)
- Stable error `code` values
- Field locations such as JSON Pointer paths

Clients must never be forced to parse translated strings to decide what to do.

## Language Negotiation for Errors

### Accept-Language request header

Clients express language preferences using `Accept-Language`. The header can list multiple language tags and optional quality values.

```http
GET /v1/orders/invalid HTTP/1.1
Host: api.example.com
Accept: application/problem+json
Accept-Language: es-ES, es;q=0.9, en;q=0.5
```

Server behavior:

- Parse the language tags and quality values.
- Select the best supported language.
- Use a fallback chain when needed.

### Content-Language response header

When returning any localized response body, include `Content-Language` so clients know which language was used.

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json
Content-Language: es-ES
Vary: Accept-Language

{
  "type": "https://api.example.com/problems/not-found",
  "title": "No encontrado",
  "status": 404,
  "detail": "El pedido solicitado no existe.",
  "instance": "/v1/orders/invalid",
  "code": "resource.not_found",
  "params": {
    "resource": "order"
  }
}
```

### Caching and the Vary header

If responses can change based on `Accept-Language`, include `Vary: Accept-Language`. This prevents shared caches from serving an error in the wrong language.

### When Accept-Language is missing

If `Accept-Language` is not provided, return errors in your default language and include `Content-Language`.

### When the requested language is unsupported

Use a deterministic fallback strategy rather than failing requests solely due to language mismatch.

A common fallback chain:

1. Exact match (for example, `es-MX`)
2. Base language match (for example, `es`)
3. Default language (for example, `en`)

If the request asks for `es-MX` but you respond in `es`, set `Content-Language: es`.

## Localizing RFC 9457 Problem Details

RFC 9457 defines a standard JSON format for errors (`application/problem+json`). Localization should follow these rules.

### What to localize

- `title`: A short, human-readable summary.
- `detail`: A human-readable explanation for this specific occurrence.

### What not to localize

- `type`: A stable URI that identifies the problem type.
- `status`: The HTTP status code.
- `instance`: A URI reference for the occurrence.

### Stable code and parameters (recommended)

Add a stable `code` field and machine-readable `params` to support consistent client behavior and optional client-side localization.

- `code` is a stable key, not translated.
- `params` contains data needed to render a message template.

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The field must be at least 8 characters.",
  "instance": "/v1/users",
  "code": "validation.min_length",
  "params": {
    "field": "password",
    "min": 8
  }
}
```

## Machine-Readable vs Human-Readable Extensions

Many APIs include additional fields for validation and domain errors. The same localization rules apply.

### Validation errors with stable codes

- Keep `pointer` (or field path) machine-readable.
- Keep `code` machine-readable.
- Localize `message`.

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json
Content-Language: fr
Vary: Accept-Language

{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Erreur de validation",
  "status": 400,
  "detail": "La requête contient des champs invalides.",
  "instance": "/v1/users",
  "code": "validation.failed",
  "errors": [
    {
      "pointer": "#/email",
      "code": "validation.format.email",
      "message": "L’adresse e-mail n’est pas valide.",
      "params": {
        "field": "email"
      }
    },
    {
      "pointer": "#/password",
      "code": "validation.min_length",
      "message": "Le mot de passe doit contenir au moins 8 caractères.",
      "params": {
        "field": "password",
        "min": 8
      }
    }
  ]
}
```

## Error Message Catalogs

A message catalog is a mapping from stable error keys to localized message templates.

Catalogs can be owned by the server (server-side localization), the client (client-side localization), or both (hybrid).

### Catalog structure

Keep templates keyed by stable codes.

```yaml
locales:
  en:
    resource.not_found:
      title: "Not Found"
      detail: "The requested {resource} does not exist."
    validation.min_length:
      title: "Validation Error"
      message: "The {field} must be at least {min} characters."
  es:
    resource.not_found:
      title: "No encontrado"
      detail: "El {resource} solicitado no existe."
    validation.min_length:
      title: "Error de validación"
      message: "El {field} debe tener al menos {min} caracteres."
```

### Variable interpolation

Use placeholders in templates and fill them using machine-readable parameters.

- Template: `"The {field} must be at least {min} characters."`
- Parameters: `{ "field": "password", "min": 8 }`

### Pluralization and grammar

Some languages require plural forms and grammatical agreement. Prefer a message format that supports pluralization rules.

If your system supports plural forms, keep the input numeric values in `params` and let the template engine apply locale rules.

## Locale-Specific Formatting in Error Messages

Localized messages often include dates, times, numbers, and amounts. Formatting rules vary by locale.

### Dates and times

- Keep machine-readable timestamps in ISO 8601.
- If the error message mentions a date/time, format that date/time according to the chosen language.

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
Content-Language: de-DE
Vary: Accept-Language

{
  "type": "https://api.example.com/problems/token-expired",
  "title": "Sitzung abgelaufen",
  "status": 401,
  "detail": "Das Zugriffstoken ist abgelaufen.",
  "instance": "/v1/orders",
  "code": "auth.token_expired",
  "expires_at": "2024-01-15T10:30:00Z"
}
```

### Numbers and currencies

- Keep numeric values machine-readable.
- If a message includes a number, format it for the chosen language.

```json
{
  "type": "https://api.example.com/problems/amount-out-of-range",
  "title": "Validation Error",
  "status": 400,
  "detail": "The amount must be less than 1000.00.",
  "instance": "/v1/payments",
  "code": "validation.max",
  "params": {
    "field": "amount",
    "max": 1000.0,
    "currency": "EUR"
  }
}
```

## Fallback and Partial Localization

### Avoid mixed-language responses

Do not mix languages within a single response. If you fall back to the default language because translations are missing, set `Content-Language` to that fallback language.

### Missing translations for a specific code

If the overall language is supported but a specific message template is missing:

- Prefer falling back to the default language for the entire response.
- Alternatively, use a non-localized generic message, but keep the `code` and `params` so clients can render their own localized message.

## Error Code Keys

Stable error codes make localization manageable and support client-side behavior.

### Naming guidelines

- Use lowercase and dot-separated namespaces.
- Keep codes stable across versions.
- Do not encode translated text in the code.
- Prefer specificity without creating unnecessary variants.

Examples:

- `validation.required`
- `validation.format.email`
- `validation.min_length`
- `auth.token_expired`
- `auth.insufficient_scope`
- `resource.not_found`
- `resource.conflict`

### Benefits

- Clients can switch on codes without parsing messages.
- Clients can localize messages using their own catalogs.
- Logs and metrics can aggregate errors independent of language.

## Right-to-Left (RTL) Language Support

Right-to-left languages such as Arabic, Hebrew, and Farsi require special care in clients, especially when mixing left-to-right identifiers (like email addresses) into right-to-left sentences.

Server guidance:

- Return UTF-8 JSON.
- Set `Content-Language` correctly.
- Keep machine-readable fields separate from localized text.

Optional hint (only when helpful): include a text-direction field for user-facing text.

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json
Content-Language: ar
Vary: Accept-Language

{
  "type": "https://api.example.com/problems/not-found",
  "title": "غير موجود",
  "status": 404,
  "detail": "المورد المطلوب غير موجود.",
  "instance": "/v1/orders/invalid",
  "code": "resource.not_found",
  "text_direction": "rtl"
}
```

## Translation Management

Localization quality depends on a repeatable translation process.

### Recommended process

1. Define and version stable error codes.
2. Define source-language templates with placeholders.
3. Extract new and changed templates for translation.
4. Translate and review (including domain experts).
5. Validate completeness for each supported locale.
6. Release translations with a clear version and rollback plan.

### Versioning and compatibility

- Do not change the meaning of an existing code.
- When a message changes meaning, introduce a new code and deprecate the old one.
- Keep old codes supported for a deprecation period to avoid breaking clients.

## Operational Considerations

### Observability

- Log stable `code` values, not localized `detail` strings.
- Use stable codes for metrics and alerting.

### Security and privacy

- Do not include sensitive data in localized messages.
- Treat user-provided input as untrusted when included in messages.
- `Accept-Language` can contribute to user fingerprinting; clients should avoid sending overly specific language lists unless needed.

## Testing Checklist

- `Content-Language` is present when returning localized text.
- `Vary: Accept-Language` is present when language affects responses.
- Stable `code` values exist for top-level errors and per-item errors (when applicable).
- All supported locales have translations for all active codes.
- Fallback behavior is deterministic and does not mix languages.
- JSON remains valid UTF-8 for all locales.

## Standards and References

- RFC 9457: Problem Details for HTTP APIs
- RFC 9110: HTTP semantics and language negotiation
- RFC 5646: Language tags
- Unicode CLDR: Locale data
- ICU MessageFormat: Message formatting and pluralization
- FormatJS: ICU MessageFormat tooling (example)
- i18next: Translation framework (example)
