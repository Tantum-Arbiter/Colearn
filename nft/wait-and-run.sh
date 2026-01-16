#!/bin/bash
# Wait for gateway healthcheck before running NFT tests

set -e

GATEWAY_URL="${GATEWAY_BASE_URL:-http://gateway-service:8080}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "=========================================="
echo "NFT Test Runner"
echo "=========================================="
echo "Gateway URL: $GATEWAY_URL"
echo ""

# Wait for gateway healthcheck (same as docker-compose uses)
echo "Waiting for gateway healthcheck..."
retries=0
until curl -sf "$GATEWAY_URL/private/healthcheck" > /dev/null 2>&1; do
    retries=$((retries + 1))
    if [ $retries -ge $MAX_RETRIES ]; then
        echo "ERROR: Gateway not healthy after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "  Attempt $retries/$MAX_RETRIES - waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done
echo "✓ Gateway is healthy"

echo ""
echo "=========================================="
echo "Starting NFT tests"
echo "=========================================="
echo ""

# Run the Gatling tests
exec ./gradlew gatlingRun --no-daemon

