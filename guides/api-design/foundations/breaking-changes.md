# Breaking Change Taxonomy

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 4 minutes | **🔴 Level:** Advanced
> 
> **📋 Prerequisites:** API design foundations, Versioning strategy
> **🎯 Key Topics:** Backward compatibility, breaking changes, migration
> 
> **📊 Complexity:** 10.6 grade level • 1.3% technical density • fairly difficult

## Why Understanding Breaking Changes is Critical

A breaking change is any modification to an API that forces consumers to update their implementation to maintain existing functionality. Identifying these changes accurately is the foundation of API stability. Failing to manage breaking changes leads to:

- **Production Outages**: Client applications fail when expected contracts are violated.
- **Erosion of Trust**: Developers lose confidence in an API that breaks without warning.
- **Migration Friction**: Unclear migration paths prevent users from adopting new versions.
- **Version Inflation**: Over-identifying "breaking" changes leads to unnecessary major version bumps.

## The Taxonomy of API Changes

Changes are categorized by their impact on backward compatibility. Use this taxonomy to determine if a change requires a major version bump or can be released as a minor/patch update.

### 1. Definitely Breaking Changes (Major Version Required)

These changes violate the existing contract and will cause failures for most clients.

#### Endpoint and URL Changes
- **Removing an endpoint**: Deleting a resource or URL path.
- **Changing an endpoint path**: Renaming `/customers` to `/clients`.
- **Changing HTTP methods**: Switching an action from `POST` to `PUT`.
- **Modifying Auth requirements**: Adding new scopes or changing authentication schemes.

#### Request Contract Changes
- **Removing a parameter**: Deleting a query, header, or body field.
- **Making optional parameters required**: Forcing clients to send data they previously omitted.
- **Changing data types**: Changing a `price` field from `string` to `number`.
- **Renaming parameters**: Changing `customerId` to `id`.
- **Stricter validation**: Reducing `maxLength`, narrowing a regex, or decreasing allowed value ranges.
- **Reducing Enum values**: Removing an option from an existing list of allowed values.

#### Response Contract Changes
- **Removing a field**: Deleting a field that clients depend on.
- **Changing field types**: Changing an `id` from `integer` to `UUID` string.
- **Renaming response fields**: Changing `created_at` to `timestamp`.
- **Changing response structure**: Moving a field from the root into a nested object.
- **Modifying Error codes**: Changing the semantic meaning of error identifiers or status codes.

#### Behavioral Changes
- **Changing defaults**: Modifying a default value that results in different side effects.
- **Sorting and Pagination**: Changing the default sort order or switching pagination models (e.g., Offset to Cursor).
- **Reduced Rate Limits**: Significantly lowering limits in a way that breaks existing usage patterns.

### 2. Possibly Breaking Changes (Depends on Context)

These changes may break clients depending on the robustness of their implementation.

| Change | Impact | Mitigation |
| :--- | :--- | :--- |
| **New Required Field** | Breaks clients not sending it. | Server must provide a default value for old clients. |
| **New Enum Values** | Breaks exhaustive switch statements. | Clients must implement a default/catch-all case. |
| **Reordering Fields** | Breaks positional parsing. | Clients must use key-based access (Standard JSON). |
| **Precision Changes** | Breaks sensitive calculations. | Notify consumers of increased numeric precision. |
| **Performance Shifts** | Breaks aggressive client timeouts. | Maintain SLAs or provide transition periods. |

### 3. Non-Breaking Changes (Safe)

These changes are backward compatible and can be released in minor versions.

- **Adding optional request parameters**: New query strings or optional body fields.
- **Adding new response fields**: Robust clients ignore fields they don't recognize.
- **Adding new endpoints**: Introducing entirely new resources.
- **Adding new HTTP methods**: Adding `PATCH` support to a resource that only had `GET`.
- **Relaxing validation**: Increasing `maxLength` or allowing more characters in a regex.
- **Adding Link relations**: Adding new HATEOAS links to a response.

## Backward Compatibility Principles

### Postel's Law (The Robustness Principle)
> "Be conservative in what you send, be liberal in what you accept."

#### Server-Side Implementation
- **Ignore Unknown Fields**: The server should ignore any request fields it does not recognize rather than throwing a `400 Bad Request`.
- **Provide Default Values**: When adding new fields, ensure the server can operate with a default value if the client doesn't provide one.
- **Dual Support**: During transitions, accept both old and new field names or formats simultaneously.
- **Respect Sunsets**: Never remove functionality until the announced sunset period has fully elapsed.

#### Client-Side Best Practices
- **Defensive Parsing**: Use libraries that ignore unknown fields in the JSON response.
- **Key-Based Access**: Never assume the order of fields in a JSON object.
- **Enum Safety**: Always include a default case when processing enums to handle future additions.
- **Resilient Timeouts**: Configure timeouts based on documented SLAs, with a small buffer for variance.

## Detection and Automation

Manual code review is insufficient for catching subtle breaking changes. Automated detection must be part of the CI/CD pipeline.

### OpenAPI Diffing
Use tools to compare the proposed `openapi.yaml` against the current production version:
- **oasdiff**: High-performance breaking change detection for OpenAPI 3.
- **openapi-diff**: Comprehensive structural comparison tool.
- **Optic**: Governance-focused tool that tracks contract changes.

### Automated Checks
1.  **PR Blocking**: Fail any Pull Request that introduces a breaking change without a major version bump.
2.  **Contract Testing**: Use tools like Pact to verify that changes don't violate consumer expectations.
3.  **Schema Validation**: Ensure all responses strictly adhere to the documented schema.

## Migration Patterns: Expand and Contract

To evolve an API without breaking it, follow the **Expand and Contract** pattern:

1.  **Expand**: Add the new functionality (new field, endpoint, or type).
2.  **Dual Support**: Maintain the old functionality while encouraging the new one.
3.  **Deprecate**: Mark the old functionality as deprecated using HTTP headers.
4.  **Contract**: Remove the old functionality only after clients have migrated and the sunset date is reached.

## Example: Changing a Field Type

**Scenario**: Changing a `price` field from a `string` to a structured `object`.

**❌ WRONG (Breaking)**
```json
// Original
"price": "99.99"

// New Version (Breaks clients expecting a string)
"price": {
  "amount": 99.99,
  "currency": "USD"
}
```

**✅ RIGHT (Evolutionary)**
```json
{
  "price": "99.99", // Deprecated, kept for backward compatibility
  "priceDetails": { // New field
    "amount": 99.99,
    "currency": "USD"
  }
}
```

## Communication Requirements

Documentation alone is not enough for breaking changes. You must provide:

- **Migration Guides**: Step-by-step instructions with side-by-side code examples.
- **Standard Headers**: Use `Deprecation: true` and `Sunset: <date>` headers.
- **Proactive Alerts**: Direct communication to high-volume consumers via email or developer portals.

## Industry Standards

- **Google AIP-180**: Guidelines for backward compatibility in APIs.
- **Microsoft Breaking Change Rules**: Detailed classification of breaking vs. non-breaking changes.
- **RFC 8594**: The Sunset HTTP Header Field.
- **Semantic Versioning (SemVer)**: The standard for version number communication.
