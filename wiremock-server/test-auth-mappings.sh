#!/bin/bash

# Comprehensive Test Script for Authentication WireMock Mappings
# Tests all authentication-related endpoints for the functional test suite

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WIREMOCK_URL=${WIREMOCK_URL:-http://localhost:8080}
TIMEOUT=30
PASSED=0
FAILED=0

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED++))
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED++))
}

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local path=$2
    local expected_status=$3
    local description=$4
    local headers=$5
    local body=$6
    
    print_info "Testing: $description"
    
    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/wiremock_response"
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$body" ]; then
        curl_cmd="$curl_cmd -d '$body'"
    fi
    
    curl_cmd="$curl_cmd -X $method $WIREMOCK_URL$path"
    
    local status_code
    status_code=$(eval $curl_cmd)
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "✓ $description (HTTP $status_code)"
    else
        print_error "✗ $description - Expected HTTP $expected_status, got $status_code"
        if [ -f /tmp/wiremock_response ]; then
            echo "Response body:"
            cat /tmp/wiremock_response
            echo
        fi
    fi
}

echo "🧪 Testing Authentication WireMock Mappings"
echo "============================================="

# Wait for WireMock to be ready
print_info "Waiting for WireMock server at $WIREMOCK_URL..."
for i in $(seq 1 $TIMEOUT); do
    if curl -s -f "$WIREMOCK_URL/__admin/health" > /dev/null 2>&1; then
        print_success "WireMock server is ready"
        break
    fi
    
    if [ $i -eq $TIMEOUT ]; then
        print_error "WireMock server not ready after ${TIMEOUT} seconds"
        exit 1
    fi
    
    sleep 1
done

echo -e "\n${BLUE}=== Firebase Authentication Endpoints ===${NC}"

# Firebase Google token verification
test_endpoint "GET" "/v1/projects/colean-func/accounts:lookup" "200" \
    "Firebase Google token verification" \
    "-H 'Authorization: Bearer valid-google-token' -H 'Content-Type: application/json'"

# Firebase Apple token verification
test_endpoint "GET" "/v1/projects/colean-func/accounts:lookup" "200" \
    "Firebase Apple token verification" \
    "-H 'Authorization: Bearer valid-apple-token' -H 'Content-Type: application/json'"

# Firebase invalid token
test_endpoint "GET" "/v1/projects/colean-func/accounts:lookup" "401" \
    "Firebase invalid token handling" \
    "-H 'Authorization: Bearer invalid-token' -H 'Content-Type: application/json'"

# Firebase user creation
test_endpoint "POST" "/v1/projects/colean-func/accounts:signUp" "200" \
    "Firebase user creation" \
    "-H 'Content-Type: application/json'" \
    '{"email":"test@example.com","displayName":"Test User"}'

# Firebase JWKS keys
test_endpoint "GET" "/v1/projects/colean-func/publicKeys" "200" \
    "Firebase JWKS public keys"

echo -e "\n${BLUE}=== Google OAuth Endpoints ===${NC}"

# Google userinfo with valid token
test_endpoint "GET" "/oauth2/v2/userinfo" "200" \
    "Google userinfo with valid token" \
    "-H 'Authorization: Bearer valid-google-token'"

# Google userinfo with invalid token
test_endpoint "GET" "/oauth2/v2/userinfo" "401" \
    "Google userinfo with invalid token" \
    "-H 'Authorization: Bearer invalid-token'"

# Google token info
test_endpoint "GET" "/oauth2/v1/tokeninfo?id_token=valid-google-token" "200" \
    "Google token info"

# Google token exchange
test_endpoint "POST" "/oauth2/v4/token" "200" \
    "Google token exchange" \
    "-H 'Content-Type: application/x-www-form-urlencoded'" \
    "grant_type=authorization_code&code=test-code"

echo -e "\n${BLUE}=== Apple OAuth Endpoints ===${NC}"

# Apple public keys
test_endpoint "GET" "/auth/keys" "200" \
    "Apple OAuth public keys"

# Apple userinfo with valid token
test_endpoint "POST" "/auth/userinfo" "200" \
    "Apple userinfo with valid token" \
    "-H 'Authorization: Bearer valid-apple-token'"

# Apple userinfo with invalid token
test_endpoint "POST" "/auth/userinfo" "401" \
    "Apple userinfo with invalid token" \
    "-H 'Authorization: Bearer invalid-token'"

# Apple token exchange
test_endpoint "POST" "/auth/oauth2/v2/token" "200" \
    "Apple token exchange" \
    "-H 'Content-Type: application/x-www-form-urlencoded'" \
    "grant_type=authorization_code&code=test-code"

echo -e "\n${BLUE}=== Gateway Authentication Endpoints ===${NC}"

# Gateway Google OAuth
test_endpoint "POST" "/auth/google" "200" \
    "Gateway Google OAuth authentication" \
    "-H 'Content-Type: application/json'" \
    '{"idToken":"valid-google-token"}'

# Gateway Apple OAuth
test_endpoint "POST" "/auth/apple" "200" \
    "Gateway Apple OAuth authentication" \
    "-H 'Content-Type: application/json'" \
    '{"idToken":"valid-apple-token"}'

# Gateway invalid Google OAuth
test_endpoint "POST" "/auth/google" "401" \
    "Gateway Google OAuth with invalid token" \
    "-H 'Content-Type: application/json'" \
    '{"idToken":"invalid-token"}'

# Gateway token refresh
test_endpoint "POST" "/auth/refresh" "200" \
    "Gateway token refresh" \
    "-H 'Content-Type: application/json'" \
    '{"refreshToken":"gateway-refresh-token-abc123"}'

# Gateway token revocation
test_endpoint "POST" "/auth/revoke" "200" \
    "Gateway token revocation" \
    "-H 'Content-Type: application/json'" \
    '{"refreshToken":"gateway-refresh-token-abc123"}'

echo -e "\n${BLUE}=== User Management Endpoints ===${NC}"

# Get user profile
test_endpoint "GET" "/api/users/profile" "200" \
    "Get user profile" \
    "-H 'Authorization: Bearer valid-google-token'"

# Update user profile
test_endpoint "POST" "/api/users/profile" "200" \
    "Update user profile" \
    "-H 'Authorization: Bearer valid-google-token' -H 'Content-Type: application/json'" \
    '{"displayName":"Updated User"}'

# Get children list
test_endpoint "GET" "/api/users/children" "200" \
    "Get children list" \
    "-H 'Authorization: Bearer valid-google-token'"

# Create child profile
test_endpoint "POST" "/api/users/children" "201" \
    "Create child profile" \
    "-H 'Authorization: Bearer valid-google-token' -H 'Content-Type: application/json'" \
    '{"name":"Test Child","avatar":"bear","birthDate":"2020-05-15"}'

# Unauthorized access
test_endpoint "GET" "/api/users/profile" "401" \
    "Unauthorized access to user profile"

echo -e "\n${BLUE}=== Test Summary ===${NC}"
echo "================================================="
echo -e "Total tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All authentication mappings are working correctly!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please check the WireMock configuration.${NC}"
    exit 1
fi
