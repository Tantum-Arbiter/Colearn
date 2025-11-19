#!/bin/bash

# Test script for WireMock unhappy case mappings
# Tests error scenarios, delays, and fault injection

set -e

WIREMOCK_URL="http://localhost:8080"
GATEWAY_URL="http://localhost:8081"

echo "🧪 Testing WireMock Unhappy Case Mappings"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local url="$2"
    local expected_status="$3"
    local headers="$4"
    local body="$5"
    local method="${6:-GET}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing: $test_name... "
    
    if [ "$method" = "POST" ]; then
        if [ -n "$body" ]; then
            response=$(curl -s -w "%{http_code}" -X POST "$url" \
                -H "Content-Type: application/json" \
                ${headers:+-H "$headers"} \
                -d "$body" \
                -o /tmp/response_body.json)
        else
            response=$(curl -s -w "%{http_code}" -X POST "$url" \
                -H "Content-Type: application/json" \
                ${headers:+-H "$headers"} \
                -o /tmp/response_body.json)
        fi
    else
        response=$(curl -s -w "%{http_code}" "$url" \
            ${headers:+-H "$headers"} \
            -o /tmp/response_body.json)
    fi
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAIL${NC} (Expected: $expected_status, Got: $response)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [ -f /tmp/response_body.json ]; then
            echo "Response body:"
            cat /tmp/response_body.json | jq . 2>/dev/null || cat /tmp/response_body.json
        fi
    fi
}

# Function to test with delay measurement
run_delay_test() {
    local test_name="$1"
    local url="$2"
    local expected_min_delay="$3"
    local headers="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing: $test_name... "
    
    start_time=$(date +%s%N)
    response=$(curl -s -w "%{http_code}" "$url" \
        ${headers:+-H "$headers"} \
        -o /tmp/response_body.json)
    end_time=$(date +%s%N)
    
    duration_ms=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$duration_ms" -ge "$expected_min_delay" ]; then
        echo -e "${GREEN}PASS${NC} (Delay: ${duration_ms}ms)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAIL${NC} (Expected min delay: ${expected_min_delay}ms, Got: ${duration_ms}ms)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo ""
echo "🔥 Firebase Error Scenarios"
echo "----------------------------"

# Firebase service unavailable
run_test "Firebase Service Unavailable" \
    "$WIREMOCK_URL/v1/projects/colean-func/accounts:lookup" \
    "503" \
    "X-Test-Scenario: service-unavailable"

# Firebase timeout (should take at least 10 seconds)
run_delay_test "Firebase Timeout" \
    "$WIREMOCK_URL/v1/projects/colean-func/accounts:lookup" \
    "9000" \
    "X-Test-Scenario: timeout"

# Firebase internal error
run_test "Firebase Internal Error" \
    "$WIREMOCK_URL/v1/projects/colean-func/accounts:lookup" \
    "500" \
    "X-Test-Scenario: internal-error"

# Firebase quota exceeded
run_test "Firebase Quota Exceeded" \
    "$WIREMOCK_URL/v1/projects/colean-func/accounts:lookup" \
    "429" \
    "X-Test-Scenario: quota-exceeded"

# Firebase database error
run_test "Firebase Database Error" \
    "$WIREMOCK_URL/v1/projects/colean-func/accounts:lookup" \
    "500" \
    "X-Test-Scenario: database-error"

# Firebase maintenance mode
run_test "Firebase Maintenance Mode" \
    "$WIREMOCK_URL/v1/projects/colean-func/accounts:lookup" \
    "503" \
    "X-Test-Scenario: maintenance-mode"

echo ""
echo "🔍 Google OAuth Error Scenarios"
echo "--------------------------------"

# Google OAuth invalid token
run_test "Google OAuth Invalid Token" \
    "$WIREMOCK_URL/oauth2/v3/tokeninfo?id_token=invalid-token-123" \
    "400"

# Google OAuth expired token
run_test "Google OAuth Expired Token" \
    "$WIREMOCK_URL/oauth2/v3/tokeninfo?id_token=expired-token-123" \
    "400"

# Google OAuth service unavailable
run_test "Google OAuth Service Unavailable" \
    "$WIREMOCK_URL/oauth2/v3/tokeninfo?id_token=valid-token" \
    "503" \
    "X-Test-Scenario: service-unavailable"

# Google OAuth timeout
run_delay_test "Google OAuth Timeout" \
    "$WIREMOCK_URL/oauth2/v3/tokeninfo?id_token=valid-token" \
    "9000" \
    "X-Test-Scenario: timeout"

# Google OAuth rate limit
run_test "Google OAuth Rate Limit" \
    "$WIREMOCK_URL/oauth2/v3/tokeninfo?id_token=valid-token" \
    "429" \
    "X-Test-Scenario: rate-limit"

# Google OAuth internal error
run_test "Google OAuth Internal Error" \
    "$WIREMOCK_URL/oauth2/v3/tokeninfo?id_token=valid-token" \
    "500" \
    "X-Test-Scenario: internal-error"

# Google OAuth malformed response
run_test "Google OAuth Malformed Response" \
    "$WIREMOCK_URL/oauth2/v3/tokeninfo?id_token=valid-token" \
    "200" \
    "X-Test-Scenario: malformed-response"

# Google userinfo service error
run_test "Google Userinfo Service Error" \
    "$WIREMOCK_URL/oauth2/v2/userinfo" \
    "502" \
    "X-Test-Scenario: service-error"

# Google userinfo unauthorized
run_test "Google Userinfo Unauthorized" \
    "$WIREMOCK_URL/oauth2/v2/userinfo" \
    "401" \
    "Authorization: Bearer invalid-access-token"

echo ""
echo "⚡ Fault Injection Tests"
echo "------------------------"

# Firebase connection error (should fail to connect)
echo -n "Testing: Firebase Connection Error... "
if curl -s --max-time 5 "$WIREMOCK_URL/v1/projects/colean-func/accounts:lookup" \
    -H "X-Test-Scenario: connection-error" > /dev/null 2>&1; then
    echo -e "${RED}FAIL${NC} (Expected connection failure)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
else
    echo -e "${GREEN}PASS${NC} (Connection failed as expected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Google OAuth connection error
echo -n "Testing: Google OAuth Connection Error... "
if curl -s --max-time 5 "$WIREMOCK_URL/oauth2/v3/tokeninfo?id_token=valid-token" \
    -H "X-Test-Scenario: connection-error" > /dev/null 2>&1; then
    echo -e "${RED}FAIL${NC} (Expected connection failure)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
else
    echo -e "${GREEN}PASS${NC} (Connection failed as expected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
echo "🎲 Random Delay Tests"
echo "---------------------"

# Firebase random delay (should have some variability)
run_delay_test "Firebase Random Delay" \
    "$WIREMOCK_URL/v1/projects/colean-func/accounts:lookup" \
    "100" \
    "X-Test-Scenario: random-delay"

# Google OAuth random failures
run_test "Google OAuth Random Failures" \
    "$WIREMOCK_URL/oauth2/v3/tokeninfo?id_token=valid-token" \
    "200" \
    "X-Test-Scenario: random-failures"

echo ""
echo "🔄 Circuit Breaker Tests"
echo "------------------------"

# Google OAuth circuit breaker
run_test "Google OAuth Circuit Breaker" \
    "$WIREMOCK_URL/oauth2/v3/tokeninfo?id_token=valid-token" \
    "503" \
    "X-Test-Scenario: circuit-breaker"

echo ""
echo "📊 Test Results Summary"
echo "======================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Check the output above for details.${NC}"
    exit 1
fi
