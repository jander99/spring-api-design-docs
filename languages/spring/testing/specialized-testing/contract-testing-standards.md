# Contract Testing Standards

## Overview

Contract tests check that services work together correctly. They verify services follow agreed rules. This document shows how to write and manage these tests.

## Core Principles

1. **Consumer-Driven Contracts**: Write contracts based on what consumers need
2. **Provider Verification**: Test that providers keep their contracts
3. **Independent Evolution**: Let services change without breaking each other
4. **Version Management**: Track contract changes with API versions

## Contract Testing Framework

- Use Spring Cloud Contract to test
- Store contracts with the provider code
- Create fake clients from contracts
- Check that provider code matches contracts

## Structure and Organization

### Contract Files Location

```
src/test/resources/contracts/
├── v1/                      # API version
│   ├── customer/            # Resource/domain
│   │   ├── get_customer.yml # Individual contract
│   │   └── create_customer.yml
│   └── order/
│       ├── get_order.yml
│       └── create_order.yml
└── v2/
    └── ...
```

### Contract Naming Conventions

| Contract Type | Contract File Name |
|---------------|-------------------|
| GET Request | `get_{resource}.yml` |
| POST Request | `create_{resource}.yml` |
| PUT Request | `update_{resource}.yml` |
| DELETE Request | `delete_{resource}.yml` |

## Contract Definition

### Contract Format

```yaml
# src/test/resources/contracts/v1/order/get_order.yml
description: "should return order by id"
request:
  method: GET
  url: /v1/orders/1
  headers:
    Accept: application/json
response:
  status: 200
  headers:
    Content-Type: application/json
  body:
    id: 1
    customerId: "customer-123"
    status: "PENDING"
    items:
      - productId: "product-123"
        quantity: 2
      - productId: "product-456"
        quantity: 1
  matchers:
    body:
      - path: $.id
        type: by_regex
        predefined: number
      - path: $.customerId
        type: by_regex
        regex: "[a-z]+-[0-9]+"
```

## Consumer-Side Testing

- Create fake providers from contracts
- Test your client code against the fake providers
- Verify error handling works as expected
- Make sure your code works with old contract versions

## Provider-Side Testing

- Check that your code matches the contract
- Use Spring Cloud Contract base classes to test
- Make sure you keep all contract promises
- Test all contract versions you support

## Contract Versioning

### Version Management

- Add API version to contract filenames
- Keep old contracts working when you can
- Create a process for breaking changes
- Tell users before you remove contracts

### Contract Breaking Changes

- Warn teams before you break a contract
- Support both old and new versions for a time
- Keep contract versions in sync with API versions
- Write down which contracts depend on each other

## Contract Testing in CI/CD

- Run consumer tests first
- Verify your code matches contracts in your CI pipeline
- Stop bad deployments
- Find issues before you deploy

## Contract Registry

- Store contracts in one central place
- Share test stubs with your teams
- Track which versions work together
- Write down what each contract needs

## Common Contract Testing Patterns

### Basic REST API Contracts

- Show what requests and responses look like
- Say which fields are required and which are optional
- List the rules for validating data
- List the errors the API can return

### Reactive Endpoints Contracts

- Show how streams behave
- Say how backpressure is handled
- Explain how to manage connections
- List the error cases that can happen

### Messaging Contracts

- Show what messages look like
- Say how messages are routed
- List the headers that are required
- Explain how acknowledgments work

## Common Anti-patterns to Avoid

1. **Provider-driven contracts**: Write contracts for what consumers need, not what providers prefer
2. **Over-specification**: Don't add rules that limit how providers can work
3. **Missing errors**: Write down what errors can happen
4. **Testing internals**: Test what the code does, not how it does it
5. **Stale contracts**: Keep contracts up to date with your code

## Organizational Aspects

- Assign an owner to each contract
- Create a process for breaking changes
- Review contracts during design
- Train teams on contracts-first thinking

## Related Documentation

- [Client-Side Testing](../../../../guides/api-design/testing/client-side-testing.md) - Contract testing from consumer perspective
- [Schema Testing](../../../../guides/api-design/testing/schema-testing.md) - Schema validation and compatibility testing
- [External Service Testing](../integration-testing/external-service-testing.md) - Testing external service integrations