#!/bin/bash

# Test script for WireMock server
# Validates that all mappings are working correctly

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

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to wait for WireMock to be ready
wait_for_wiremock() {
    print_info "Waiting for WireMock server at $WIREMOCK_URL..."
    
    for i in $(seq 1 $TIMEOUT); do
        if curl -s -f "$WIREMOCK_URL/__admin/health" > /dev/null 2>&1; then
            print_success "WireMock server is ready"
            return 0
        fi
        
        if [ $i -eq $TIMEOUT ]; then
            print_error "WireMock server not ready after ${TIMEOUT} seconds"
            return 1
        fi
        
        sleep 1
    done
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
        return 0
    else
        print_error "✗ $description (Expected HTTP $expected_status, got $status_code)"
        if [ -f /tmp/wiremock_response ]; then
            echo "Response body:"
            cat /tmp/wiremock_response
            echo
        fi
        return 1
    fi
}

# Function to run all tests
run_tests() {
    local failed=0
    
    print_info "Running WireMock tests..."
    echo
    
    # Test WireMock admin endpoints
    test_endpoint "GET" "/__admin/health" "200" "WireMock health check" || ((failed++))
    test_endpoint "GET" "/__admin/mappings" "200" "List mappings" || ((failed++))
    
    # Test Firebase Auth endpoints
    test_endpoint "POST" "/v1/accounts:lookup" "200" "Firebase token verification" \
        "-H 'Content-Type: application/json'" \
        '{"idToken": "test-token"}' || ((failed++))
    
    test_endpoint "POST" "/v1/accounts:signUp" "200" "Firebase user creation" \
        "-H 'Content-Type: application/json'" \
        '{"email": "test@example.com", "displayName": "Test User"}' || ((failed++))
    
    # Test Google OAuth endpoints
    test_endpoint "POST" "/oauth2/v4/token" "200" "Google OAuth token exchange" \
        "-H 'Content-Type: application/x-www-form-urlencoded'" \
        'grant_type=authorization_code&code=test-code' || ((failed++))
    
    test_endpoint "GET" "/oauth2/v2/userinfo" "200" "Google OAuth user info" \
        "-H 'Authorization: Bearer test-token'" || ((failed++))
    
    # Test Apple OAuth endpoints
    test_endpoint "POST" "/auth/oauth2/v2/token" "200" "Apple OAuth token exchange" \
        "-H 'Content-Type: application/x-www-form-urlencoded'" \
        'grant_type=authorization_code&code=test-code' || ((failed++))
    
    test_endpoint "GET" "/auth/keys" "200" "Apple OAuth public keys" || ((failed++))
    
    # Test error cases
    test_endpoint "POST" "/v1/accounts:lookup" "400" "Firebase invalid token" \
        "-H 'Content-Type: application/json'" \
        '{"idToken": "invalid-token"}' || ((failed++))
    
    test_endpoint "POST" "/oauth2/v4/token" "400" "Google OAuth invalid code" \
        "-H 'Content-Type: application/x-www-form-urlencoded'" \
        'grant_type=authorization_code&code=invalid-code' || ((failed++))
    
    echo
    if [ $failed -eq 0 ]; then
        print_success "All tests passed! 🎉"
        return 0
    else
        print_error "$failed test(s) failed"
        return 1
    fi
}

# Function to show mapping statistics
show_stats() {
    print_info "WireMock Statistics:"
    
    local mappings_count
    mappings_count=$(curl -s "$WIREMOCK_URL/__admin/mappings" | jq '.mappings | length' 2>/dev/null || echo "N/A")
    echo "  Mappings loaded: $mappings_count"
    
    local requests_count
    requests_count=$(curl -s "$WIREMOCK_URL/__admin/requests" | jq '.requests | length' 2>/dev/null || echo "N/A")
    echo "  Requests recorded: $requests_count"
    
    echo "  Admin interface: $WIREMOCK_URL/__admin"
    echo
}

# Main execution
main() {
    echo "WireMock Server Test Suite"
    echo "=========================="
    echo
    
    # Wait for WireMock to be ready
    if ! wait_for_wiremock; then
        exit 1
    fi
    
    echo
    
    # Show statistics
    show_stats
    
    # Run tests
    if run_tests; then
        echo
        print_success "WireMock server is working correctly!"
        exit 0
    else
        echo
        print_error "Some tests failed. Check the WireMock logs for details."
        exit 1
    fi
}

# Cleanup function
cleanup() {
    rm -f /tmp/wiremock_response
}

# Set up cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"
