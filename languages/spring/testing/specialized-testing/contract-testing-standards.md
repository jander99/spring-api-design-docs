# Contract Testing Standards

## Overview

Contract tests verify that services interact correctly according to agreed-upon contracts. This document outlines our standards for contract testing in our microservices ecosystem.

## Core Principles

1. **Consumer-Driven Contracts**: Define contracts from the consumer perspective
2. **Provider Verification**: Verify provider implementation meets defined contracts
3. **Independent Evolution**: Allow services to evolve independently
4. **Version Management**: Track contract versions alongside API versions

## Contract Testing Framework

- Use Spring Cloud Contract for contract testing
- Store contracts in provider service repositories
- Generate client stubs from contracts
- Verify provider implementation against contracts

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

- Generate and use stubs from contract
- Test client code against contract stubs
- Verify error handling behaves correctly
- Ensure backward compatibility with older contracts

## Provider-Side Testing

- Verify implementation against contracts
- Extend contract test base classes
- Ensure all contract conditions are met
- Test contract compatibility across versions

## Contract Versioning

### Version Management

- Store contracts with API version prefix
- Maintain backward compatibility when possible
- Implement contract breaking change process
- Include deprecation notices in contracts

### Contract Breaking Changes

- Communicate breaking changes to consumer teams
- Allow for transition period with dual support
- Version contracts alongside API versions
- Track contract dependencies between services

## Contract Testing in CI/CD

- Run consumer contract tests before integration tests
- Verify provider implementations against contracts in CI
- Block deployments that break contract compatibility
- Use contract testing for pre-deployment verification

## Contract Registry

- Store published contracts in central registry
- Make contract stubs available to consumers
- Track contract versions and compatibility
- Document contract dependencies between services

## Common Contract Testing Patterns

### Basic REST API Contracts

- Define request/response structure
- Include required and optional fields
- Specify validation rules
- Define error responses

### Reactive Endpoints Contracts

- Define streaming endpoint behavior
- Specify backpressure handling
- Include connection management
- Define error scenarios

### Messaging Contracts

- Define message structure
- Specify routing information
- Include message headers
- Define acknowledgment behavior

## Common Anti-patterns to Avoid

1. **Provider-driven contracts**: Focus on consumer needs
2. **Excessive contract specificity**: Allow for implementation flexibility
3. **Missing error cases**: Include failure scenarios in contracts
4. **Testing implementation details**: Focus on interface behavior
5. **Stale contracts**: Keep contracts updated with API changes

## Organizational Aspects

- Define contract ownership and maintenance roles
- Establish process for contract breaking changes
- Implement contract review in API design process
- Train teams on contract-first development

## Related Documentation

- [Client-Side Testing](../../../../guides/api-design/testing/client-side-testing.md) - Contract testing from consumer perspective
- [Schema Testing](../../../../guides/api-design/testing/schema-testing.md) - Schema validation and compatibility testing
- [External Service Testing](../integration-testing/external-service-testing.md) - Testing external service integrations