# Contract Testing

> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** 5 minutes | **🟡 Level:** Intermediate
> 
> **📋 Prerequisites:** API design fundamentals, Schema validation knowledge  
> **🎯 Key Topics:** Consumer-driven contracts, Pact, Spring Cloud Contract, Integration testing
> 
> **📊 Complexity:** 10.3 grade level • 0.9% technical density • fairly difficult

## Overview

Contract testing verifies that an API provider and its consumers agree on the structure and behavior of their interactions. It acts as a formal agreement between teams. When one side changes the interface, contract tests fail immediately, preventing integration issues from reaching production.

In a microservices architecture, traditional end-to-end (E2E) testing becomes slow, brittle, and expensive. Contract testing provides a faster, more reliable alternative by testing the "contract" in isolation.

## Core Concepts

### What is a Contract?

A contract is a document that defines the expectations between a consumer and a provider. It includes:
- **Request Expectations**: Headers, paths, query parameters, and body structure.
- **Response Expectations**: Status codes, headers, and body schemas.
- **State Requirements**: The preconditions required for the interaction to succeed (e.g., "user exists").

### Shift-Left Testing

Contract testing promotes a "shift-left" approach where integration issues are caught during development or in the CI/CD pipeline, rather than during final integration or in staging environments.

### Provider vs. Consumer Perspective

| Perspective | Role | Responsibility |
| :--- | :--- | :--- |
| **Consumer** | The "Client" | Defines what it needs from the API to function. |
| **Provider** | The "Server" | Verifies it can fulfill all consumer requirements. |

---

## Consumer-Driven Contracts (CDC)

Consumer-Driven Contracts (CDC) flip the traditional API development model. Instead of the provider defining the API and the consumer trying to use it, the consumer defines their specific requirements first.

### The Pact Framework

Pact is the industry standard for consumer-driven contract testing. It focuses on testing the interaction between services.

**The Pact Workflow:**

1. **Consumer Test**: The consumer writes tests against a mock provider. Successful tests generate a **Pact file** (JSON).
2. **Publish**: The Pact file is uploaded to a **Pact Broker**.
3. **Provider Verification**: The provider retrieves the Pact file and replays the requests against its real implementation.
4. **Result**: If the provider's actual response matches the expectations in the Pact, the contract is verified.

### Example Pact Structure

A Pact file is a JSON document containing the agreed-upon interactions:

```json
{
  "consumer": { "name": "OrderUI" },
  "provider": { "name": "OrderService" },
  "interactions": [
    {
      "description": "a request for order 123",
      "providerState": "order 123 exists",
      "request": {
        "method": "GET",
        "path": "/orders/123",
        "headers": {
          "Accept": "application/json"
        }
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "id": "123",
          "status": "pending",
          "total": 99.99
        }
      }
    }
  ],
  "metadata": {
    "pactSpecification": {
      "version": "3.0.0"
    }
  }
}
```

---

## Provider-Driven Contracts

In provider-driven models, the provider defines the contract and makes it available to consumers. This is common when the provider is a public API or has many unknown consumers.

### Spring Cloud Contract

Spring Cloud Contract is a popular tool for provider-driven testing. It uses a Domain Specific Language (DSL) or YAML to define contracts.

**The Workflow:**

1. **Define Contract**: The provider team writes the contract in YAML or a specialized DSL.
2. **Generate Stubs**: The tool generates WireMock stubs and test classes automatically from the contract.
3. **Verification**: The provider's CI/CD pipeline runs the generated tests to ensure the implementation matches the contract.
4. **Consumer Usage**: Consumers use the generated stubs for their own integration tests.

### Example Contract (YAML)

```yaml
description: "Verify order retrieval for ID 123"
request:
  method: GET
  url: /orders/123
response:
  status: 200
  body:
    id: "123"
    status: "pending"
    total: 99.99
  headers:
    Content-Type: application/json
```

---

## Contract Versioning

Managing contracts over time requires a robust versioning strategy to ensure that new changes don't break existing consumers.

### Versioning Strategies

- **Tag-Based Versioning**: Tag contracts with environment names (e.g., `prod`, `staging`) or branch names (`main`, `feature-x`).
- **Semantic Versioning**: Use SemVer for both the API and the contract to track compatibility.
- **Consumer Versioning**: Track which version of a consumer is currently deployed to identify which contracts must still be honored.

### Breaking Change Detection

Contract testing is the most effective way to detect breaking changes.

- **Can-I-Deploy**: A tool (provided by Pact) that checks if a specific version of a consumer is compatible with the current version of the provider before deployment.
- **Pending Pacts**: Allows consumers to publish new requirements without breaking the provider's build until the provider team implements the changes.

---

## CI/CD Integration

Automation is essential for contract testing success. The process should be integrated into every stage of the pipeline.

### Pipeline Stages

1. **Consumer Pipeline**: 
   - Run tests and generate contracts.
   - Publish contracts to the Broker.
2. **Provider Pipeline**:
   - Retrieve contracts for this provider.
   - Verify implementation against contracts.
   - Publish verification results back to the Broker.
3. **Deployment Gate**:
   - Check "Can-I-Deploy" status.
   - Block deployment if contracts are not verified.

### The Pact Broker

A Pact Broker is a central repository for sharing and managing contracts. It provides:
- **Visibility**: A dashboard showing which services are compatible.
- **Dependency Graph**: Visualization of how services interact.
- **Webhooks**: Automatically trigger provider builds when a new contract is published.

---

## Mock Server Generation

Contracts can be used to generate realistic mock servers (stubs) for local development and testing.

### Benefits of Stub Generation

- **Isolation**: Consumers can develop against a stable mock without needing the provider service running.
- **Speed**: Mock responses are significantly faster than real network calls.
- **Reliability**: Stubs are guaranteed to match the contract, unlike manually maintained mocks.
- **Parallel Development**: Frontend and backend teams can work simultaneously once the contract is agreed upon.

### Tools for Generation

- **Pact Stub Server**: Launches an HTTP server that responds to requests based on a Pact file.
- **Spring Cloud Contract Stubs**: Packages contracts as WireMock stubs that can be downloaded and run as standalone JARs or Docker containers.
- **Prism**: A mock server that uses OpenAPI documents to provide contract-based mocking.

---

## Best Practices

### Contract Design

- **Focus on Behavior**: Test the interaction and business logic, not just the data types.
- **Minimal Contracts**: Consumers should only include fields they actually use. This prevents the provider from being "locked in" by fields no one cares about.
- **Use Matchers**: Instead of hardcoding values like `"id": "123"`, use regex or type matchers (e.g., `like("string")`) to make contracts more flexible.
- **No Business Logic in Contracts**: Contracts should define inputs and outputs, not perform complex calculations.

### Organization and Governance

- **One Contract per Pair**: Maintain a separate contract for every unique consumer-provider relationship.
- **Version with Code**: Keep contract definitions in the same repository as the code that implements them.
- **Automate Failures**: Ensure that a contract violation fails the build immediately.
- **Communicate**: Contract testing is as much about human communication as it is about technical tools.

---

## Test Patterns

### Consumer Expectations (Mocking)

When writing a consumer test, you define what the mock should return. This expectation becomes the contract.

```http
# Expected Interaction
GET /orders/123
Accept: application/json

# Mock Response
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "123",
  "status": "pending"
}
```

### Provider Verification

The provider verification process involves replaying the recorded interaction against the running service.

```bash
# Example verification command
pact-provider-verifier --provider-base-url=http://localhost:8080 --pact-url=./pacts/orderui-orderservice.json
```

The verifier performs the following:
1. Sets up the **Provider State** (e.g., ensures order 123 is in the database).
2. Sends the request from the contract.
3. Compares the actual response with the contract.
4. Reports "Verification Successful" if they match.

---
