# API Deprecation Policies Reference

This document shows how to deprecate APIs properly. It covers timelines, HTTP headers, and implementation.

## Deprecation Timeline Policies

### Support Times

#### Minimum Support Duration
- **Public APIs**: 12 months after deprecation notice
- **Partner APIs**: 6 months after deprecation notice  
- **Internal APIs**: 3 months after deprecation notice

#### Extended Support
- **High-traffic endpoints**: 18-24 months for endpoints with over 10,000 daily requests
- **Critical integrations**: Negotiate with important customers case by case
- **Security vulnerabilities**: Deprecate immediately, remove in 30 days for critical issues

### Support Based on Usage

#### Traffic Levels
- **Low traffic** (<100 requests/day): Standard minimum support
- **Medium traffic** (100-1000 requests/day): Extended support consideration
- **High traffic** (>1000 requests/day): Mandatory extended support

#### What to Monitor
- Count daily requests to each deprecated endpoint
- Track which clients use deprecated endpoints
- Measure error rates and response times for deprecated endpoints

## HTTP Deprecation Headers

### RFC 8594 Compliance

#### Deprecation Header
```http
Deprecation: true
```
- **Required**: Add to all deprecated endpoint responses
- **Format**: Boolean value (true/false)
- **Purpose**: Shows machines the endpoint is deprecated

#### Sunset Header
```http
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
```
- **Required**: Must specify exact sunset date/time
- **Format**: HTTP date format
- **Purpose**: Shows when the endpoint will be removed

#### Link Header for Successor
```http
Link: </v2/customers>; rel="successor-version"
```
- **Recommended**: Should point to replacement endpoint
- **Format**: URI reference with rel="successor-version"
- **Purpose**: Guides clients to the new version

#### Warning Header
```http
Warning: 299 - "This API version is deprecated and will be removed on 2025-12-31"
```
- **Optional**: Human-readable deprecation message
- **Format**: Warning code 299 with descriptive text
- **Purpose**: Provides context for developers

### Complete Header Example
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/customers>; rel="successor-version"
Warning: 299 - "This API version is deprecated and will be removed on 2025-12-31"
X-API-Version: 1.0
X-Supported-Versions: 1.0, 2.0
Content-Type: application/json

{
  "data": "...",
  "deprecation_notice": {
    "message": "This endpoint is deprecated",
    "sunset_date": "2025-12-31",
    "migration_guide": "https://docs.example.com/migrate-v1-to-v2"
  }
}
```

## Strangulation Pattern Implementation

### Phase 1: Dual Support Phase

#### Deployment Strategy
1. **Deploy new version** (v2) alongside existing version (v1)
2. **Add deprecation headers** to v1 responses
3. **Update documentation** to mark v1 as deprecated
4. **Configure monitoring** for both versions
5. **Test both versions** to ensure compatibility

#### Load Balancing Considerations
- Route traffic based on version header or URI path
- Maintain separate health checks for each version
- Consider capacity planning for running both versions

### Phase 2: Client Migration Phase

#### Communication Strategy
1. **Email notifications** to registered API consumers
2. **Dashboard announcements** in developer portal
3. **Slack/Teams notifications** for internal teams
4. **Blog posts** for public API changes
5. **Support ticket updates** for active issues

#### Migration Support
- Provide detailed migration guides with code examples
- Offer office hours or support sessions for complex migrations
- Create automated migration tools where possible
- Maintain FAQ document for common migration questions

#### Progress Tracking
- Weekly reports on v1 usage decline
- Client-specific migration status dashboards
- Automated alerts for clients approaching sunset date
- Success metrics for migration completion

### Phase 3: Sunsetting Phase

#### Graceful Degradation
1. **Warning period**: 30 days before sunset with increased warning frequency
2. **Soft sunset**: Return 410 Gone for new clients, maintain service for existing clients
3. **Hard sunset**: Return 410 Gone for all requests
4. **Removal**: Remove v1 implementation after monitoring period

#### 410 Gone Response Format
```http
HTTP/1.1 410 Gone
Content-Type: application/problem+json
Cache-Control: no-cache

{
  "type": "https://example.com/problems/version-deprecated",
  "title": "API Version Deprecated",
  "status": 410,
  "detail": "This API version has been removed. Please use v2.",
  "instance": "/v1/customers/123",
  "deprecated_on": "2025-01-01T00:00:00Z",
  "sunset_on": "2025-12-31T23:59:59Z",
  "successor_version": {
    "url": "/v2/customers/123",
    "documentation": "https://docs.example.com/api/v2"
  }
}
```

## Field-Level Deprecation

### OpenAPI Specification
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
        oldField:
          type: string
          deprecated: true
          description: "Deprecated - use newField instead. Will be removed in v2."
        newField:
          type: string
          description: "Replacement for oldField"
```

### Response Field Deprecation
```json
{
  "id": "12345",
  "name": "John Doe",
  "oldField": "legacy_value",
  "newField": "new_value",
  "_deprecated_fields": ["oldField"],
  "_field_deprecation_info": {
    "oldField": {
      "deprecated_on": "2024-01-01",
      "removal_date": "2024-12-31",
      "replacement": "newField"
    }
  }
}
```

### Response Shaping Support
```http
GET /v1/customers/123?exclude_deprecated=true
```
```json
{
  "id": "12345",
  "name": "John Doe",
  "newField": "new_value"
}
```

## Backward Compatibility Rules

### Breaking Changes (Require New Version)

#### Request Changes
- Removing request parameters
- Changing parameter types
- Making optional parameters required
- Changing parameter validation rules
- Modifying authentication requirements

#### Response Changes
- Removing response fields
- Changing field types
- Changing field semantics
- Modifying error response formats
- Changing HTTP status codes

#### Behavior Changes
- Modifying side effects
- Changing idempotency behavior
- Altering rate limiting rules
- Changing caching behavior

### Non-Breaking Changes (Same Version)

#### Additions
- New optional request parameters
- New response fields
- New HTTP methods on existing resources
- New query parameters with default values
- New error codes for new scenarios

#### Enhancements
- Improved validation messages
- Better error descriptions
- Performance optimizations
- Security improvements (non-breaking)

## Version-Specific Error Handling

### Error Code Versioning
```json
{
  "error": {
    "code": "V1_VALIDATION_ERROR",
    "message": "Request validation failed",
    "version": "1.0",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### RFC 7807 Problem Details
```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/v1/customers",
  "api_version": "1.0",
  "invalid_params": [
    {
      "name": "email",
      "reason": "invalid format"
    }
  ]
}
```

## Content Negotiation for Minor Versions

### Accept Header Versioning
```http
GET /api/customers HTTP/1.1
Accept: application/vnd.api+json;version=1.2
Host: api.example.com
```

### Response Header Versioning
```http
HTTP/1.1 200 OK
API-Version: 1.2
API-Supported-Versions: 1.0, 1.1, 1.2, 2.0
Content-Type: application/vnd.api+json;version=1.2
```

## Monitoring and Metrics

### Key Metrics to Track

#### Usage Metrics
- Request count per API version
- Unique client count per version
- Geographic distribution of version usage
- Request success rate by version

#### Performance Metrics
- Response time by version
- Error rate by version
- Throughput by version
- Resource utilization by version

#### Migration Metrics
- Client migration completion rate
- Time to migrate per client
- Support ticket volume related to deprecation
- Documentation usage patterns

### Alerting Thresholds
- **High usage alert**: >1000 requests/day to deprecated endpoint 30 days before sunset
- **Client alert**: Individual client making >100 requests/day to deprecated endpoint
- **Error rate alert**: >5% error rate on deprecated endpoints
- **Sunset reminder**: Automated alerts at 90, 60, 30, and 7 days before sunset

## Documentation Requirements

### API Documentation Updates
- Mark deprecated endpoints with clear indicators
- Provide migration timeline in endpoint documentation
- Include code examples for both old and new versions
- Maintain change log with deprecation announcements

### Migration Documentation
- Step-by-step migration guides
- Code comparison examples (before/after)
- Testing recommendations
- Rollback procedures

### Communication Templates
- Email notification templates for different phases
- Developer portal announcement templates
- Support ticket response templates
- Blog post templates for public API changes

## Legal and Compliance Considerations

### Terms of Service Updates
- Update API terms to reflect deprecation policies
- Define support obligations for deprecated versions
- Specify client responsibilities during migration
- Include liability limitations for deprecated endpoints

### SLA Adjustments
- Reduced SLA commitments for deprecated endpoints
- Performance guarantees during migration periods
- Support level agreements for deprecated versions
- Incident response procedures for deprecated endpoints

### Data Retention
- Specify data retention policies for deprecated endpoints
- Define data migration procedures
- Document data export capabilities
- Maintain audit logs for compliance

This comprehensive deprecation policy ensures consistent, predictable API evolution while maintaining positive relationships with API consumers and meeting legal obligations.