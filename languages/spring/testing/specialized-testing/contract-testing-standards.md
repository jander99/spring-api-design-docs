# Contract Testing Standards

## Overview

Contract tests check that services work together correctly. They verify services follow agreed rules. This document shows how to write and manage these tests.

## Core Principles

1. **Consumer-Driven Contracts**: Focus on consumer needs
2. **Provider Verification**: Test providers meet contracts
3. **Independent Evolution**: Let services evolve safely
4. **Version Management**: Track contracts with API versions

## Contract Testing Framework

- Use Spring Cloud Contract for testing
- Store contracts in provider folders
- Build fake clients from contracts
- Verify provider code matches the contract

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

- Generate fake providers from the contract
- Test client code against fake providers
- Check that error handling works correctly
- Ensure code works with older contract versions

## Provider-Side Testing

- Check that code matches the contract
- Use Spring Cloud Contract base classes
- Verify all contract promises are kept
- Test multiple contract versions

## Contract Versioning

### Version Management

- Add API version to filenames
- Support old contracts when possible
- Have a breaking change process
- Notify users of contract removal

### Contract Breaking Changes

- Warn teams before breaking a contract
- Support old and new versions temporarily
- Match contract and API versions
- Document dependencies

## Contract Testing in CI/CD

- Run consumer tests first
- Verify code matches contracts in CI
- Block bad deployments
- Catch issues before deployment

## Contract Registry

- Save contracts centrally
- Share test stubs with teams
- Track compatibility
- Document dependencies

## Common Contract Testing Patterns

### Basic REST API Contracts

- Define request and response structure
- Mark required and optional fields
- List data validation rules
- Document possible API errors

### Reactive Endpoints Contracts

- Define streaming behavior
- Specify backpressure handling
- Explain connection management
- Document error scenarios

### Messaging Contracts

- Define message structure
- Specify routing rules
- List required headers
- Document acknowledgment behavior

## Common Anti-patterns to Avoid

1. **Provider-driven contracts**: Write for consumer needs
2. **Over-specification**: Don't limit provider options
3. **Missing errors**: Document what fails
4. **Testing internals**: Test behavior, not implementation
5. **Stale contracts**: Keep contracts current

## Organizational Aspects

- Assign owners to contracts
- Create a breaking change process
- Review contracts in design
- Teach contracts-first approach

## Related Documentation

- [Client-Side Testing](../../../../guides/api-design/testing/client-side-testing.md) - Contract testing from consumer perspective
- [Schema Testing](../../../../guides/api-design/testing/schema-testing.md) - Schema validation and compatibility testing
- [External Service Testing](../integration-testing/external-service-testing.md) - Testing external service integrations