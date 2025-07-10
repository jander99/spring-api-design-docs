#!/bin/bash
# Schema evolution testing script

set -e

echo "Running schema evolution tests..."

# Test backward compatibility
echo "Testing backward compatibility..."
openapi-diff v1.0.0/openapi.yaml v1.1.0/openapi.yaml \
  --fail-on-incompatible

# Test forward compatibility
echo "Testing forward compatibility..."
openapi-diff v1.1.0/openapi.yaml v1.0.0/openapi.yaml \
  --check-new-features

# Validate schema migrations
echo "Validating schema migrations..."
schema-migration-validator \
  --from v1.0.0/openapi.yaml \
  --to v1.1.0/openapi.yaml \
  --migration-rules migration-rules.yaml

echo "Schema evolution tests completed successfully!"