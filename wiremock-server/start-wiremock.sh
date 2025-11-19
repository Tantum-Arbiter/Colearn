#!/bin/bash

# WireMock Server Startup Script
# Simple script to run WireMock locally without Docker

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
WIREMOCK_PORT=${WIREMOCK_PORT:-8080}
WIREMOCK_VERSION=${WIREMOCK_VERSION:-3.3.1}
WIREMOCK_JAR="wiremock-standalone-${WIREMOCK_VERSION}.jar"
WIREMOCK_URL="https://repo1.maven.org/maven2/com/github/tomakehurst/wiremock-standalone/${WIREMOCK_VERSION}/${WIREMOCK_JAR}"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Download WireMock if not present
if [ ! -f "$WIREMOCK_JAR" ]; then
    print_info "Downloading WireMock ${WIREMOCK_VERSION}..."
    curl -L -o "$WIREMOCK_JAR" "$WIREMOCK_URL"
    print_success "WireMock downloaded successfully"
fi

# Create directories if they don't exist
mkdir -p mappings __files

print_info "Starting WireMock server on port ${WIREMOCK_PORT}..."
print_info "Mappings directory: $(pwd)/mappings"
print_info "Static files directory: $(pwd)/__files"
print_info "Admin interface: http://localhost:${WIREMOCK_PORT}/__admin"

# Start WireMock
java -jar "$WIREMOCK_JAR" \
    --port "$WIREMOCK_PORT" \
    --root-dir "$(pwd)" \
    --global-response-templating \
    --verbose \
    --enable-browser-proxying
