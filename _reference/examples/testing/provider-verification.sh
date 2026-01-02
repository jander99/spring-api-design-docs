#!/bin/bash
# Provider verification script for contract testing

set -e

echo "Starting provider verification..."

# Start the API service
echo "Starting API service..."
./start-api-service.sh &
API_PID=$!

# Wait for service to be ready
echo "Waiting for API service to be ready..."
wait-for-it localhost:8080 --timeout=30

# Run contract verification
echo "Running contract verification..."
pact-verifier \
  --provider-base-url=http://localhost:8080 \
  --pact-broker-url=https://pact-broker.example.com \
  --provider-version=$BUILD_NUMBER \
  --publish-verification-results

# Cleanup
echo "Cleaning up..."
kill $API_PID

echo "Provider verification completed successfully!"