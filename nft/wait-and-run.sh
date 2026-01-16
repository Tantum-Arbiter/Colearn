#!/bin/bash
# Wait for services to be fully ready before running NFT tests

set -e

GATEWAY_URL="${GATEWAY_BASE_URL:-http://gateway-service:8080}"
MAX_RETRIES=30
RETRY_INTERVAL=5

echo "=========================================="
echo "NFT Test Runner - Waiting for Services"
echo "=========================================="
echo "Gateway URL: $GATEWAY_URL"
echo "Max retries: $MAX_RETRIES"
echo "Retry interval: ${RETRY_INTERVAL}s"
echo ""

# Function to check if a URL is responding
check_endpoint() {
    local url=$1
    local name=$2
    curl -sf "$url" > /dev/null 2>&1
    return $?
}

# Wait for gateway root endpoint
echo "Waiting for gateway service to be ready..."
retries=0
until check_endpoint "$GATEWAY_URL/" "root"; do
    retries=$((retries + 1))
    if [ $retries -ge $MAX_RETRIES ]; then
        echo "ERROR: Gateway service not ready after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "  Attempt $retries/$MAX_RETRIES - Gateway not ready, waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done
echo "✓ Gateway root endpoint is responding"

# Wait for auth status endpoint
echo "Checking auth service..."
retries=0
until check_endpoint "$GATEWAY_URL/auth/status" "auth"; do
    retries=$((retries + 1))
    if [ $retries -ge $MAX_RETRIES ]; then
        echo "WARNING: Auth status endpoint not ready, continuing anyway..."
        break
    fi
    echo "  Attempt $retries/$MAX_RETRIES - Auth service not ready, waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done
echo "✓ Auth service is responding"

# Wait for stories endpoint
echo "Checking stories API..."
retries=0
until check_endpoint "$GATEWAY_URL/api/stories" "stories"; do
    retries=$((retries + 1))
    if [ $retries -ge $MAX_RETRIES ]; then
        echo "WARNING: Stories endpoint not ready, continuing anyway..."
        break
    fi
    echo "  Attempt $retries/$MAX_RETRIES - Stories API not ready, waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done
echo "✓ Stories API is responding"

# Additional warm-up delay to ensure services are fully stable
echo ""
echo "Services are responding. Waiting 10s for warm-up..."
sleep 10

echo ""
echo "=========================================="
echo "All services ready - Starting NFT tests"
echo "=========================================="
echo ""

# Run the Gatling tests
exec ./gradlew gatlingRun --no-daemon

