#!/bin/bash
# Comprehensive automated testing script for API documentation

set -e

echo "Starting documentation validation tests..."

# Validate OpenAPI specification
echo "Validating OpenAPI specification..."
openapi-generator validate -i openapi.yaml

# Test all documented examples
echo "Testing documented examples..."
for example in examples/*.json; do
    echo "Testing example: $example"
    curl -X POST \
        -H "Content-Type: application/json" \
        -d @"$example" \
        "$API_BASE_URL/orders" \
        | jq . # Validate JSON response
done

# Verify response schemas using mock server
echo "Starting mock server for schema validation..."
prism mock openapi.yaml &
PRISM_PID=$!

# Wait for mock server to start
sleep 5

# Run Newman tests against mock server
echo "Running Newman collection tests..."
newman run postman-collection.json

# Clean up mock server
kill $PRISM_PID

echo "All tests completed successfully!"