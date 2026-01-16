#!/bin/bash
# Wait for gateway healthcheck and get test token before running NFT tests

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

# Get auth token using mock Google OAuth (accepted in dev/test mode)
echo ""
echo "Authenticating with mock Google OAuth..."
AUTH_RESPONSE=$(curl -sf -X POST "$GATEWAY_URL/auth/google" \
    -H "Content-Type: application/json" \
    -H "User-Agent: GrowWithFreya-NFT/1.0 (Gatling Load Test)" \
    -H "X-Device-ID: nft-load-test-device" \
    -H "X-Client-Platform: ios" \
    -H "X-Client-Version: 1.0.0" \
    -d '{"idToken": "mock-id-token-nft-load-test"}' 2>/dev/null || echo "")

if [ -n "$AUTH_RESPONSE" ]; then
    # Extract accessToken from JSON response
    BEARER_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$BEARER_TOKEN" ]; then
        export BEARER_TOKEN
        echo "✓ Auth token obtained"
    else
        echo "⚠ Could not parse token from response, authenticated tests may fail"
        echo "Response: $AUTH_RESPONSE"
    fi
else
    echo "⚠ Could not authenticate, authenticated tests may fail"
fi

echo ""
echo "=========================================="
echo "Starting NFT tests"
echo "=========================================="
echo ""

# Run the Gatling tests
exec ./gradlew gatlingRun --no-daemon

