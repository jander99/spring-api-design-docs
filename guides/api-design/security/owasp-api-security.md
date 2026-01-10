# OWASP API Security Top 10

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 7 minutes | **🟢 Level:** Beginner
> 
> **📋 Prerequisites:** Security Standards, Basic HTTP knowledge
> **🎯 Key Topics:** OWASP API Top 10 (2023), Attack Patterns, Prevention Strategies
> 
> **📊 Complexity:** 10.4 grade level • 1.1% technical density • fairly difficult

## Overview

The OWASP API Security Top 10 provides a framework for understanding and mitigating the most critical security risks facing modern APIs. Unlike traditional web application security, API security focuses heavily on authorization, resource consumption, and the unique challenges of machine-to-machine communication.

This guide details the 2023 edition of the Top 10 risks and provides actionable patterns for defense.

---

## API1:2023 - Broken Object Level Authorization (BOLA)

### Description
Broken Object Level Authorization (BOLA) is the most common and impactful API vulnerability. It occurs when an API exposes an endpoint that handles object identifiers (like `/api/orders/123`), but fails to verify that the requesting user has permission to access that specific object.

### Attack Example
An attacker changes their own order ID to another user's ID in the URL.

```http
GET /api/users/123/orders HTTP/1.1
Authorization: Bearer {attacker_token}

# Attacker changes 123 to 456 to see another user's orders
GET /api/users/456/orders HTTP/1.1
Authorization: Bearer {attacker_token}
```

### Prevention Patterns
1. **Always Check Permissions**: Perform authorization checks for every single object access. Never assume that a valid token implies access to all data.
2. **Use Random Identifiers**: Use unpredictable object IDs, such as UUIDs (v4), instead of sequential integers.
3. **Avoid Client-Controlled Scope**: Don't rely on IDs provided by the client in the URL or body without verifying ownership against the authenticated session.
4. **Implement Centralized Authorization**: Use a consistent authorization service or middleware to enforce object-level checks.

**Why this protects you**: It ensures that even if an attacker guesses a valid ID, they cannot access the data without the correct permissions.

---

## API2:2023 - Broken Authentication

### Description
Broken Authentication occurs when authentication mechanisms are implemented incorrectly, allowing attackers to compromise tokens, exploit implementation flaws, or bypass authentication entirely.

### Common Vulnerabilities
- Weak password policies or lack of MFA.
- Missing rate limiting on login and password reset endpoints.
- Improper JWT validation (e.g., accepting `alg: none`).
- Insecure token storage (e.g., tokens in URLs).

### Prevention Patterns
1. **Follow Standards**: Use established protocols like OAuth 2.1 and OpenID Connect.
2. **Implement MFA**: Require multi-factor authentication for sensitive access.
3. **Strict JWT Validation**: Always verify signatures, expiration, and issuer. Use strong algorithms (RS256/ES256).
4. **Rate Limit Auth Endpoints**: Implement strict rate limits and account lockout policies for authentication-related paths.

**Why this protects you**: Robust authentication ensures that only legitimate users can enter your system, blocking credential stuffing and brute-force attacks.

---

## API3:2023 - Broken Object Property Level Authorization

### Description
This risk combines "Mass Assignment" and "Excessive Data Exposure." It happens when an API allows users to access or modify specific properties of an object that they should not have permission to touch.

### Attack Example
An attacker adds a `role` property to a profile update request to escalate their privileges.

```http
PATCH /api/users/me HTTP/1.1
Content-Type: application/json

{
  "name": "Attacker",
  "role": "admin"
}
```

### Prevention Patterns
1. **Use DTOs (Data Transfer Objects)**: Explicitly define which properties can be sent by the client and which can be returned by the server.
2. **Allowlist Writable Fields**: Never bind internal models directly to API inputs. Only map specifically allowed fields.
3. **Enforce Read-Only Fields**: Ensure sensitive fields (like `internal_id`, `balance`, or `role`) are ignored during updates.
4. **Avoid `SELECT *`**: Only fetch and return the properties required for the specific API response.

**Why this protects you**: It prevents attackers from "guessing" hidden fields or modifying sensitive metadata that drives application logic.

---

## API4:2023 - Unrestricted Resource Consumption

### Description
APIs that do not limit resource consumption are vulnerable to Denial of Service (DoS) attacks. This includes CPU, memory, bandwidth, and even financial costs (e.g., SMS/Email credits).

### Vulnerability Types
- Missing rate limiting or request throttling.
- Unbounded pagination (returning 1,000,000 records in one call).
- Large file uploads without size limits.
- Resource-intensive queries (regex, complex joins).

### Prevention Patterns
1. **Global and Per-User Rate Limiting**: Limit the number of requests per time window.
2. **Set Maximum Page Sizes**: Enforce strict limits on pagination (e.g., maximum 100 items).
3. **Limit Payloads**: Set maximum request body sizes and file upload limits.
4. **Set Timeouts**: Implement timeouts for database queries and external service calls.

**Why this protects you**: It ensures your API remains available to all users even if one user attempts to overwhelm the system.

---

## API5:2023 - Broken Function Level Authorization (BFLA)

### Description
BFLA occurs when an API fails to restrict access to administrative or sensitive functions based on user roles. While BOLA is about **data**, BFLA is about **actions**.

### Attack Example
A regular user accesses an endpoint intended for administrators.

```http
# Regular user tries to delete another user
DELETE /api/admin/users/123 HTTP/1.1
Authorization: Bearer {regular_user_token}
```

### Prevention Patterns
1. **Deny by Default**: Configure authorization so that access is denied unless explicitly allowed.
2. **Role-Based Access Control (RBAC)**: Assign permissions to roles and roles to users. Verify the role for every sensitive function.
3. **Separate Admin Endpoints**: If possible, host administrative APIs on a separate subdomain or internal network.
4. **Log Privilege Escalation**: Monitor for users attempting to access functions outside their role.

**Why this protects you**: It prevents non-privileged users from performing destructive or sensitive operations reserved for administrators.

---

## API6:2023 - Unrestricted Access to Sensitive Business Flows

### Description
This risk targets the business logic of the API rather than technical vulnerabilities. Attackers use automation to exploit legitimate business flows, such as ticket scalping, spamming, or account creation.

### Attack Example
A botnet quickly purchases all available stock of a limited-edition product before human users can.

### Prevention Patterns
1. **Human Detection**: Use CAPTCHAs or behavioral analysis for sensitive flows.
2. **Device Fingerprinting**: Identify and track the devices accessing your API.
3. **Advanced Rate Limiting**: Limit sensitive actions (like "Buy" or "Send SMS") more strictly than standard API calls.
4. **Sequence Validation**: Ensure requests follow a logical business sequence (e.g., you can't "Checkout" without "Add to Cart").

**Why this protects you**: It makes it economically and technically difficult for attackers to automate and abuse your business logic.

---

## API7:2023 - Server Side Request Forgery (SSRF)

### Description
SSRF occurs when an API fetches a remote resource without properly validating the user-supplied URL. This allows attackers to coerce the server into making requests to internal or unauthorized external destinations.

### Attack Example
An attacker uses a webhook feature to scan the internal network.

```http
POST /api/webhooks HTTP/1.1
{
  "target_url": "http://169.254.169.254/latest/meta-data/"
}
```

### Prevention Patterns
1. **Validate and Sanitize URLs**: Use strict allowlists for schemas (only `https`) and domains.
2. **Block Internal Networks**: Prevent requests to private IP ranges (RFC 1918) and loopback addresses.
3. **Use a Proxy/Egress Gateway**: Route all outgoing requests through a dedicated gateway that enforces security policies.
4. **Disable URL Redirects**: Do not follow HTTP redirects provided by the remote server automatically.

**Why this protects you**: It prevents your API from being used as a "stepping stone" to attack your internal infrastructure or cloud provider.

---

## API8:2023 - Security Misconfiguration

### Description
Security Misconfiguration covers a wide range of issues, from verbose error messages and default credentials to missing security headers and improper CORS configurations.

### Common Misconfigurations
- Exposing stack traces in error responses.
- Enabling unnecessary HTTP methods (e.g., `TRACE`, `CONNECT`).
- Using default passwords for administrative interfaces.
- Missing headers like `Content-Security-Policy`.

### Prevention Patterns
1. **Automate Hardening**: Use infrastructure-as-code (IaC) to ensure consistent, secure configurations.
2. **Generic Error Messages**: Return clean error responses without internal system details.
3. **Disable Unused Features**: Turn off any HTTP methods, headers, or features not required by your API.
4. **Security Header Implementation**: Always include standard security headers (HSTS, CSP, etc.).

**Why this protects you**: Hardened configurations reduce the "information leakage" that attackers use to plan more sophisticated attacks.

---

## API9:2023 - Improper Inventory Management

### Description
APIs change rapidly. Organizations often lose track of older versions, debug endpoints, or "Shadow APIs" (undocumented endpoints), leaving them exposed to attack.

### Vulnerabilities
- Unpatched deprecated versions (e.g., `/v1/` is still active but lacks `/v2/` security).
- Debug endpoints accidentally left in production.
- Lack of documentation for internal endpoints.

### Prevention Patterns
1. **Maintain an API Inventory**: Keep a "source of truth" for all active API versions and endpoints.
2. **Retire Old Versions**: Have a clear sunset policy for deprecated APIs.
3. **Remove Non-Production Code**: Use build-time flags to ensure debug/testing endpoints never reach production.
4. **Continuous Discovery**: Use scanning tools to find undocumented or forgotten endpoints.

**Why this protects you**: You cannot protect what you do not know exists. Inventory management closes the "blind spots" in your security posture.

---

## API10:2023 - Unsafe Consumption of APIs

### Description
Modern APIs often call other APIs (third-party services, partners). This risk occurs when an API trusts data from another API without proper validation, leading to injection attacks or data corruption.

### Vulnerabilities
- Blindly trusting third-party response data.
- Following redirects from partner APIs.
- Insecurely deserializing responses from external sources.

### Prevention Patterns
1. **Treat External Data as Untrusted**: Sanitize and validate every piece of data received from a third-party API, just as you would for user input.
2. **Set Egress Limits**: Implement timeouts and circuit breakers for all outbound calls.
3. **Validate Certificates**: Always use HTTPS and verify the TLS certificates of partner services.
4. **Avoid Dynamic Redirection**: Do not use data from an external API to construct redirection URLs.

**Why this protects you**: It prevents a compromise in a third-party service from "cascading" into your own system.

---

## Security Strategy Checklist

To maintain a secure API environment, implement these continuous practices:

- [ ] **Automated Scanning**: Use DAST and SAST tools specifically designed for APIs.
- [ ] **Design Reviews**: Include security as a first-class citizen during the design phase.
- [ ] **Penetration Testing**: Perform regular manual testing for complex authorization logic.
- [ ] **Runtime Protection**: Deploy Web Application Firewalls (WAF) or API Security Platforms.
- [ ] **Monitoring and Alerting**: Configure alerts for spikes in authorization failures or high resource usage.

## Summary

The OWASP API Security Top 10 is the standard for modern API defense. By implementing these prevention patterns, you move beyond basic authentication into a robust, defense-in-depth security posture.

1. **Authorization is Priority**: Most API vulnerabilities relate to broken authorization (BOLA, BOPLA, BFLA).
2. **Limit Everything**: Resources, rates, versions, and properties must all be strictly controlled.
3. **Zero Trust**: Trust neither the client nor the external APIs you consume.
