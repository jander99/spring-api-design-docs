# Internationalization (i18n) and Localization (L10n)

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 6 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Basic HTTP knowledge  
> **🎯 Key Topics:** API Design
> 
> **📊 Complexity:** 10.1 grade level • 0.4% technical density • fairly difficult

## Overview

Internationalization (i18n) is the process of designing an API so that it can be adapted to various languages and regions without engineering changes. Localization (L10n) is the subsequent process of adapting that API for a specific language or region by adding locale-specific components and translating text.

Global APIs must support internationalization to provide a consistent, user-friendly experience across different cultures and geographies.

## Language Negotiation

The primary mechanism for negotiating language in HTTP APIs is the `Accept-Language` header.

### Accept-Language Header

Clients use the `Accept-Language` header to indicate their preferred natural languages. The value is a comma-separated list of language tags, optionally with quality values.

```http
GET /v1/products/p-100 HTTP/1.1
Host: api.example.com
Accept-Language: en-US, en;q=0.9, es;q=0.8, fr;q=0.7
```

In this example:
1. **en-US**: US English is the most preferred (implicit `q=1.0`).
2. **en**: Any English is second choice (`q=0.9`).
3. **es**: Spanish is third choice (`q=0.8`).
4. **fr**: French is fourth choice (`q=0.7`).

### Quality Values (q=)

Quality values range from 0.0 to 1.0. If no `q` parameter is provided, it defaults to 1.0. Servers should parse these values to select the best supported locale.

### Fallback Strategy

If the server cannot satisfy any of the requested languages, it should:
1. Use the system's default locale (often `en-US`).
2. Indicate the chosen language in the `Content-Language` response header.

### Content-Language Header

The server must communicate the language of the response body using the `Content-Language` header.

```http
HTTP/1.1 200 OK
Content-Language: en-US
Content-Type: application/json

{
  "id": "p-100",
  "name": "Cloud Storage Pro",
  "description": "Enterprise-grade storage for your data."
}
```

## Locale-Specific Formatting

While APIs should exchange data in standardized formats, they must provide enough information for clients to format data correctly for the user's locale.

### Date and Time

**Rule: Always store and transmit dates in UTC using ISO 8601 format.**

```json
{
  "created_at": "2024-01-15T10:30:00Z"
}
```

Formatting dates for display is a client-side responsibility. However, APIs should support timezone-aware calculations by accepting timezone information when necessary.

### Number and Currency Formatting

APIs should transmit raw numeric values and standardized currency codes (ISO 4217).

```json
{
  "price": {
    "amount": 1234.56,
    "currency": "EUR"
  }
}
```

Avoid sending pre-formatted strings like `"1.234,56 €"` as the primary data, as this limits the client's ability to process the number or change formatting dynamically.

### Sorting and Collation

Sorting behavior varies significantly by language (e.g., how diacritics like `é` or `ñ` are treated). When an API provides sorting, it should respect the requested locale.

```http
GET /v1/users?sort=name&locale=de-DE HTTP/1.1
```

## Error Message Localization

Localized error messages are critical for developer and user experience.

### Localized Problem Details

Following RFC 9457, the `title` and `detail` fields should be localized based on the `Accept-Language` header.

**Request:**
```http
GET /v1/orders/invalid HTTP/1.1
Accept-Language: es
```

**Response:**
```http
HTTP/1.1 404 Not Found
Content-Language: es
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/not-found",
  "title": "No Encontrado",
  "status": 404,
  "detail": "El pedido solicitado no existe"
}
```

### Error Catalogs and Keys

For programmatic handling, always include a stable, non-localized `code` or `key`.

```json
{
  "code": "ORDER_NOT_FOUND",
  "message": "The requested order does not exist"
}
```

The client can then use the `code` to look up a localized message in its own local resource bundle if the server-provided message is insufficient.

## Timezone Handling

Timezones are distinct from locales. A user might prefer the Spanish language but be located in the `America/New_York` timezone.

### Best Practices

1.  **Storage**: Always store timestamps in UTC.
2.  **Transmission**: Use ISO 8601 with the `Z` suffix for UTC or a specific offset.
3.  **Context**: If an operation depends on the user's local time (e.g., "Get orders placed today"), require the client to provide their timezone.

### Timezone Headers

Custom headers can be used to pass timezone context for a session:

```http
X-Timezone: America/Los_Angeles
X-Timezone-Offset: -08:00
```

## Right-to-Left (RTL) Support

For languages like Arabic, Hebrew, and Farsi, the text direction is right-to-left.

### Text Direction Hints

While most modern clients handle RTL text automatically via Unicode bidirectional (BiDi) algorithms, APIs can provide directionality metadata for complex content.

```json
{
  "content": {
    "text": "مرحبا بك في نظامنا",
    "direction": "rtl",
    "language": "ar"
  }
}
```

## Content Localization Strategies

There are three main strategies for localizing API content:

### 1. Server-Side Localization

The server returns fully translated data. This is best for content-heavy applications where the client shouldn't manage translation bundles for dynamic data.

```http
GET /v1/articles/123?locale=fr HTTP/1.1
```

### 2. Client-Side Localization

The server returns keys, and the client performs the translation. This is efficient for static UI elements and error messages.

### 3. Hybrid Strategy

Localize system-generated content (errors, notifications) on the server, but provide raw data and keys for the client to handle specific UI formatting.

## Industry Standards and References

- **RFC 5646**: Tags for Identifying Languages
- **ISO 8601**: Data elements and interchange formats — Information interchange — Representation of dates and times
- **ISO 4217**: Codes for the representation of currencies
- **CLDR**: Unicode Common Locale Data Repository
- **ICU**: International Components for Unicode
- **W3C i18n**: World Wide Web Consortium Internationalization Activity

## Implementation Examples

### Localized Product Response

**Request:**
```http
GET /v1/products/laptop-123 HTTP/1.1
Accept-Language: de-DE, de;q=0.9, en;q=0.5
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Language: de-DE
Content-Type: application/json

{
  "id": "laptop-123",
  "name": "Laptop Computer",
  "price": {
    "amount": 999.99,
    "currency": "EUR",
    "formatted": "999,99 €"
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Localized Validation Error

**Request:**
```http
POST /v1/users HTTP/1.1
Accept-Language: de-DE
Content-Type: application/json

{
  "email": "invalid-email"
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Language: de-DE
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validierungsfehler",
  "status": 400,
  "detail": "Die Anfrage enthält ungültige Felder",
  "errors": [
    {
      "field": "email",
      "message": "Ungültige E-Mail-Adresse"
    }
  ]
}
```
