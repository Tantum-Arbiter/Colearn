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
AUTH_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/auth/google" \
    -H "Content-Type: application/json" \
    -H "User-Agent: GrowWithFreya-NFT/1.0 (Gatling Load Test)" \
    -H "X-Device-ID: nft-load-test-device" \
    -H "X-Client-Platform: ios" \
    -H "X-Client-Version: 1.0.0" \
    -d '{"idToken": "mock-id-token-nft-load-test"}' 2>&1)

echo "Auth response: $AUTH_RESPONSE"

if echo "$AUTH_RESPONSE" | grep -q '"accessToken"'; then
    # Extract accessToken using sed (more portable than jq)
    BEARER_TOKEN=$(echo "$AUTH_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
    if [ -n "$BEARER_TOKEN" ]; then
        export BEARER_TOKEN
        echo "✓ Auth token obtained (${#BEARER_TOKEN} chars)"
    else
        echo "⚠ Could not parse token from response"
    fi
else
    echo "⚠ Auth request failed or returned error"
    echo "Response: $AUTH_RESPONSE"
fi

echo ""
echo "=========================================="
echo "Starting NFT tests"
echo "=========================================="
echo ""

# Run the PublicApiPeakLoad simulation (not all simulations)
SIMULATION="${NFT_SIMULATION:-simulation.PublicApiPeakLoad}"
echo "Running simulation: $SIMULATION"

if [ -n "$BEARER_TOKEN" ]; then
    echo "Passing token to Gatling via system property"
    exec ./gradlew gatlingRun-"$SIMULATION" -DBEARER_TOKEN="$BEARER_TOKEN" --no-daemon
else
    echo "WARNING: No BEARER_TOKEN - authenticated endpoints will fail"
    exec ./gradlew gatlingRun-"$SIMULATION" --no-daemon
fi

