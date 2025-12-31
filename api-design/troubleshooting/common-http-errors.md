# Common HTTP Error Troubleshooting

> **Reading Level:** Grade 11 | **Audience:** Developers debugging API errors

This guide helps you fix common HTTP errors when calling APIs.

---

## Client Errors (4xx)

These errors mean something is wrong with the request. You can fix them by changing your request.

---

### 400 Bad Request

The server cannot process the request due to malformed syntax or invalid data.

**Symptoms:**
- API returns status code 400
- Error message mentions "invalid," "malformed," or "bad request"
- Request never reaches the business logic

**Common Causes:**

1. **Invalid JSON syntax**
   ```json
   // Wrong - trailing comma
   {"name": "John", "age": 30,}
   
   // Correct
   {"name": "John", "age": 30}
   ```

2. **Missing required fields**
   ```json
   // Wrong - missing required 'email' field
   {"name": "John"}
   
   // Correct
   {"name": "John", "email": "john@example.com"}
   ```

3. **Wrong data types**
   ```json
   // Wrong - age should be number, not string
   {"age": "thirty"}
   
   // Correct
   {"age": 30}
   ```

4. **Invalid field values**
   ```json
   // Wrong - invalid email format
   {"email": "not-an-email"}
   
   // Correct
   {"email": "user@example.com"}
   ```

5. **Wrong Content-Type header**
   ```http
   # Wrong - sending JSON but claiming form data
   Content-Type: application/x-www-form-urlencoded
   
   # Correct
   Content-Type: application/json
   ```

**Solutions:**

1. **Validate JSON syntax**
   ```bash
   # Use jq to check JSON validity
   echo '{"name": "test"}' | jq .
   ```

2. **Check API documentation for required fields**
   - Review the OpenAPI spec
   - Check field types and formats
   - Note any field constraints (min/max, patterns)

3. **Match Content-Type to body format**
   ```bash
   curl -X POST "https://api.example.com/users" \
     -H "Content-Type: application/json" \
     -d '{"name": "John", "email": "john@example.com"}'
   ```

4. **Read the error response details**
   ```json
   {
     "type": "https://api.example.com/errors/validation",
     "title": "Validation Error",
     "status": 400,
     "errors": [
       {
         "field": "email",
         "message": "must be a valid email address"
       }
     ]
   }
   ```

**Prevention:**
- Validate requests before sending
- Use API client libraries with built-in validation
- Test with sample requests from documentation
- Implement request validation in your client code

---

### 401 Unauthorized

The request lacks valid authentication credentials.

**Symptoms:**
- API returns status code 401
- Error message mentions "unauthorized," "invalid token," or "authentication required"
- Worked before but suddenly stopped

**Common Causes:**

1. **Missing Authorization header**
   ```http
   # Wrong - no auth header
   GET /api/users HTTP/1.1
   
   # Correct
   GET /api/users HTTP/1.1
   Authorization: Bearer eyJhbGc...
   ```

2. **Expired token**
   ```json
   {
     "error": "token_expired",
     "message": "Access token has expired"
   }
   ```

3. **Malformed token**
   ```http
   # Wrong - missing "Bearer" prefix
   Authorization: eyJhbGc...
   
   # Correct
   Authorization: Bearer eyJhbGc...
   ```

4. **Wrong token type**
   - Using refresh token instead of access token
   - Using API key where OAuth token is required

5. **Invalid credentials**
   - Wrong username/password
   - Revoked API key
   - Deactivated account

**Solutions:**

1. **Check token presence and format**
   ```bash
   curl -v -X GET "https://api.example.com/users" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

2. **Refresh expired tokens**
   ```bash
   curl -X POST "https://api.example.com/oauth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=refresh_token&refresh_token=YOUR_REFRESH_TOKEN"
   ```

3. **Verify token hasn't been revoked**
   - Check if user logged out elsewhere
   - Check if API key was regenerated
   - Check if account is still active

4. **Decode JWT to check expiration**
   ```bash
   # Decode JWT payload (middle part)
   echo "eyJhbGc..." | cut -d. -f2 | base64 -d
   ```

**Prevention:**
- Implement automatic token refresh before expiration
- Store tokens securely (never in URLs or logs)
- Handle 401 by triggering re-authentication flow
- Monitor token expiration time in responses

---

### 403 Forbidden

The server understood the request but refuses to authorize it.

**Symptoms:**
- API returns status code 403
- Authentication succeeded but action is denied
- Error mentions "forbidden," "access denied," or "insufficient permissions"

**Common Causes:**

1. **Missing permissions/scopes**
   ```json
   {
     "error": "insufficient_scope",
     "message": "Token requires 'users:write' scope"
   }
   ```

2. **Resource doesn't belong to user**
   ```http
   # User 123 trying to access User 456's data
   GET /api/users/456/private-data
   # Returns 403 - not your resource
   ```

3. **IP address not allowed**
   - Request from blocked IP
   - Request from wrong region
   - VPN or proxy blocking

4. **Account restrictions**
   - Free tier trying to access paid features
   - Account suspended or limited
   - Trial expired

5. **CORS policy blocking request**
   - Browser blocking cross-origin request
   - Missing or wrong CORS headers

**Solutions:**

1. **Check required permissions**
   ```bash
   # Request token with correct scopes
   curl -X POST "https://api.example.com/oauth/token" \
     -d "scope=users:read users:write"
   ```

2. **Verify resource ownership**
   - Confirm you're accessing your own resources
   - Check if resource was shared with you
   - Verify organization membership

3. **Check account status**
   - Log into dashboard to check account
   - Verify subscription is active
   - Check for any account notifications

4. **For CORS issues (browser):**
   ```
   Check browser console for CORS errors:
   "Access to fetch at '...' has been blocked by CORS policy"
   
   Solution: Contact API provider or use server-side requests
   ```

**Prevention:**
- Request only the permissions you need
- Document required permissions for each feature
- Implement graceful degradation for missing permissions
- Check permissions before showing features to users

---

### 404 Not Found

The requested resource does not exist.

**Symptoms:**
- API returns status code 404
- Error mentions "not found" or "resource does not exist"
- URL looks correct but returns error

**Common Causes:**

1. **Typo in URL**
   ```http
   # Wrong - typo in endpoint
   GET /api/usres/123
   
   # Correct
   GET /api/users/123
   ```

2. **Resource was deleted**
   ```http
   # Resource existed but was deleted
   GET /api/orders/old-order-id
   # Returns 404
   ```

3. **Wrong resource ID**
   ```http
   # ID doesn't exist
   GET /api/users/99999999
   # Returns 404
   ```

4. **Wrong API version**
   ```http
   # Wrong - endpoint doesn't exist in v1
   GET /api/v1/new-feature
   
   # Correct - use v2
   GET /api/v2/new-feature
   ```

5. **Wrong base URL**
   ```http
   # Wrong - using production URL in development
   GET https://api.example.com/users
   
   # Correct - use sandbox
   GET https://sandbox.api.example.com/users
   ```

6. **Missing path parameters**
   ```http
   # Wrong - missing user ID
   GET /api/users//orders
   
   # Correct
   GET /api/users/123/orders
   ```

**Solutions:**

1. **Verify URL character by character**
   ```bash
   # Check exact URL
   curl -v "https://api.example.com/api/users/123"
   ```

2. **Check API documentation for correct endpoints**
   - Verify endpoint path
   - Check if endpoint requires specific version
   - Confirm base URL for your environment

3. **Verify resource exists**
   ```bash
   # List resources to find valid IDs
   curl "https://api.example.com/api/users"
   ```

4. **Check if resource was recently deleted**
   - Review recent changes in your application
   - Check audit logs if available

**Prevention:**
- Use constants or enums for endpoint URLs
- Validate IDs before making requests
- Handle 404 gracefully in your code
- Implement proper error messages for users

---

### 429 Too Many Requests

The user has sent too many requests in a given time period.

**Symptoms:**
- API returns status code 429
- Error mentions "rate limit exceeded" or "too many requests"
- Requests succeed at first, then fail
- `Retry-After` header in response

**Common Causes:**

1. **Exceeded rate limit**
   ```http
   HTTP/1.1 429 Too Many Requests
   X-RateLimit-Limit: 100
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1640000000
   Retry-After: 60
   ```

2. **Missing request batching**
   - Making 100 individual requests instead of 1 batch request
   - Polling too frequently

3. **No caching implementation**
   - Requesting same data repeatedly
   - Not caching responses

4. **Concurrent requests from same account**
   - Multiple services using same API key
   - Background jobs overlapping

5. **Infinite loop or bug in code**
   - Retry logic without backoff
   - Loop making unintended requests

**Solutions:**

1. **Check rate limit headers**
   ```bash
   curl -v "https://api.example.com/users" 2>&1 | grep -i rate
   # X-RateLimit-Limit: 100
   # X-RateLimit-Remaining: 0
   # X-RateLimit-Reset: 1640000000
   ```

2. **Respect Retry-After header**
   ```
   Retry-After: 60   # Wait 60 seconds
   Retry-After: Wed, 21 Oct 2025 07:28:00 GMT  # Wait until this time
   ```

3. **Implement exponential backoff**
   
   > **See**: [HTTP Client Best Practices - Exponential Backoff](../request-response/http-client-best-practices.md#exponential-backoff) for complete implementation details including jitter.

4. **Use batch endpoints**
   ```http
   # Instead of 100 individual requests:
   GET /api/users/1
   GET /api/users/2
   ...
   
   # Use one batch request:
   POST /api/users/batch
   {"ids": [1, 2, 3, ...]}
   ```

5. **Implement caching**
   ```http
   # Cache responses using Cache-Control headers
   Cache-Control: max-age=3600
   ETag: "abc123"
   ```

**Prevention:**
- Monitor your rate limit usage
- Implement request queuing
- Cache responses appropriately
- Use webhooks instead of polling when available
- Consider upgrading your plan for higher limits

---

## Server Errors (5xx)

These errors indicate problems on the server side. You typically cannot fix them directly, but you can handle them gracefully.

---

### 500 Internal Server Error

The server encountered an unexpected condition.

**Symptoms:**
- API returns status code 500
- Error message is vague or generic
- Same request sometimes works, sometimes fails
- Error details may be hidden for security

**Common Causes:**

1. **Bug in API server code**
   - Unhandled exception
   - Null pointer error
   - Logic error

2. **Database connection issues**
   - Database server overloaded
   - Connection pool exhausted
   - Query timeout

3. **External service failure**
   - Third-party API down
   - Payment processor error
   - Email service failure

4. **Configuration error**
   - Missing environment variable
   - Wrong credentials
   - Invalid configuration

**Solutions:**

1. **Retry the request**
   ```
   Wait and retry - many 500 errors are temporary
   Use exponential backoff between retries
   ```

2. **Check API status page**
   - Look for known outages
   - Check for maintenance windows

3. **Simplify your request**
   - Try with minimal parameters
   - Test with smaller payload
   - Remove optional fields

4. **Contact API support**
   - Provide request ID from response
   - Include timestamp
   - Share sanitized request details

**Prevention:**
- Implement retry logic with backoff
- Add circuit breaker pattern
- Have fallback behavior ready
- Monitor for error spikes

---

### 502 Bad Gateway

The server received an invalid response from an upstream server.

**Symptoms:**
- API returns status code 502
- Error often from load balancer or proxy
- Indicates backend server problem

**Common Causes:**

1. **Backend server crashed or unresponsive**
2. **Load balancer can't reach backend**
3. **Backend server timeout**
4. **Network issues between servers**

**Solutions:**

1. **Wait and retry**
   - Usually a temporary issue
   - Backend may be restarting

2. **Check if entire service is down**
   - Try different endpoints
   - Check status page

3. **Reduce request complexity**
   - Smaller payloads
   - Simpler queries

**Prevention:**
- Implement retry logic
- Use multiple regions if available
- Monitor for patterns

---

### 503 Service Unavailable

The server is temporarily unable to handle requests.

**Symptoms:**
- API returns status code 503
- Often includes `Retry-After` header
- May mention "maintenance" or "overloaded"

**Common Causes:**

1. **Planned maintenance**
   ```http
   HTTP/1.1 503 Service Unavailable
   Retry-After: 3600
   ```

2. **Server overloaded**
   - Too many requests
   - Resource exhaustion

3. **Deployment in progress**
   - New version being deployed
   - Rolling update happening

4. **Auto-scaling not fast enough**
   - Traffic spike
   - Servers starting up

**Solutions:**

1. **Check Retry-After header**
   ```http
   Retry-After: 120  # Wait 2 minutes
   ```

2. **Check status page for maintenance**
   - Look for scheduled maintenance
   - Check announcement channels

3. **Implement graceful degradation**
   - Show cached data
   - Queue requests for later
   - Show friendly error message

**Prevention:**
- Subscribe to status updates
- Implement circuit breaker pattern
- Cache responses for fallback
- Plan for API unavailability

---

## Quick Diagnosis Table

| Error | First Thing to Check | Quick Fix |
|-------|---------------------|-----------|
| 400 | Request body JSON syntax | Validate JSON, check required fields |
| 401 | Authorization header | Refresh token, check format |
| 403 | Account permissions | Request correct scopes |
| 404 | URL spelling | Verify endpoint path |
| 429 | Rate limit headers | Wait for Retry-After period |
| 500 | API status page | Retry with backoff |
| 502 | API status page | Wait and retry |
| 503 | Retry-After header | Wait specified time |

---

## Related Resources

- [Error Response Standards](../request-response/error-response-standards.md)
- [Status Codes Reference](../quick-reference/status-codes.md)
- [Rate Limiting Standards](../security/rate-limiting-standards.md)
- [Performance Issues](performance-issues.md)
