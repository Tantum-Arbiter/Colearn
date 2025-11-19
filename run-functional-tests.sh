#!/bin/bash

# Functional Tests Runner Script
# This script provides various options for running functional tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
MODE="docker"
CLEANUP="true"
REPORTS="true"
VERBOSE="false"

# Function to print colored output
print_status() {
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

# Function to show usage
show_usage() {
    cat << EOF
Functional Tests Runner

Usage: $0 [OPTIONS]

OPTIONS:
    -m, --mode MODE         Run mode: docker, local, or ci (default: docker)
    -c, --no-cleanup        Skip cleanup after tests
    -r, --no-reports        Skip opening test reports
    -v, --verbose           Enable verbose output
    -h, --help              Show this help message

MODES:
    docker                  Run tests in Docker containers (recommended)
    local                   Run tests against locally running services
    ci                      Run tests in CI mode (no interactive features)

EXAMPLES:
    $0                      # Run tests in Docker with default settings
    $0 -m local             # Run tests against local services
    $0 -m docker -v         # Run Docker tests with verbose output
    $0 -m ci --no-reports   # Run in CI mode without opening reports

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -c|--no-cleanup)
            CLEANUP="false"
            shift
            ;;
        -r|--no-reports)
            REPORTS="false"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate mode
if [[ ! "$MODE" =~ ^(docker|local|ci)$ ]]; then
    print_error "Invalid mode: $MODE. Must be docker, local, or ci"
    exit 1
fi

print_status "Starting functional tests in $MODE mode..."

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    print_status "Checking $name at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_success "$name is running"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "$name is not responding after $max_attempts attempts"
            return 1
        fi
        
        print_status "Waiting for $name... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
}

# Function to run Docker tests
run_docker_tests() {
    print_status "Running functional tests with Docker Compose..."
    
    # Build and start services
    if [ "$VERBOSE" = "true" ]; then
        docker-compose -f docker-compose.functional-tests.yml up --build --abort-on-container-exit
    else
        docker-compose -f docker-compose.functional-tests.yml up --build --abort-on-container-exit > /dev/null 2>&1
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        print_success "Functional tests completed successfully"
    else
        print_error "Functional tests failed with exit code $exit_code"
    fi
    
    # Cleanup
    if [ "$CLEANUP" = "true" ]; then
        print_status "Cleaning up Docker containers..."
        docker-compose -f docker-compose.functional-tests.yml down -v
    fi
    
    return $exit_code
}

# Function to run local tests
run_local_tests() {
    print_status "Running functional tests against local services..."
    
    # Check if services are running
    check_service "http://localhost:8080/private/healthcheck" "Gateway Service" || exit 1
    check_service "http://localhost:9000/__admin/health" "WireMock Server" || exit 1
    
    # Run tests
    cd func-tests
    if [ "$VERBOSE" = "true" ]; then
        ./gradlew functionalTest --info
    else
        ./gradlew functionalTest
    fi
    
    local exit_code=$?
    cd ..
    
    if [ $exit_code -eq 0 ]; then
        print_success "Functional tests completed successfully"
    else
        print_error "Functional tests failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Function to run CI tests
run_ci_tests() {
    print_status "Running functional tests in CI mode..."
    
    # Set CI-specific environment variables
    export CI=true
    export SPRING_PROFILES_ACTIVE=test
    
    # Run Docker tests without interactive features
    docker-compose -f docker-compose.functional-tests.yml up --build --abort-on-container-exit --exit-code-from func-tests
    
    local exit_code=$?
    
    # Always cleanup in CI mode
    docker-compose -f docker-compose.functional-tests.yml down -v
    
    if [ $exit_code -eq 0 ]; then
        print_success "CI functional tests completed successfully"
    else
        print_error "CI functional tests failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Function to open test reports
open_reports() {
    if [ "$REPORTS" = "true" ] && [ "$MODE" != "ci" ]; then
        print_status "Opening test reports..."
        
        # Check if reports exist
        if [ -f "func-tests/build/reports/tests/cucumber.html" ]; then
            if command -v open > /dev/null 2>&1; then
                open "func-tests/build/reports/tests/cucumber.html"
            elif command -v xdg-open > /dev/null 2>&1; then
                xdg-open "func-tests/build/reports/tests/cucumber.html"
            else
                print_warning "Cannot open reports automatically. View them at: func-tests/build/reports/tests/cucumber.html"
            fi
        else
            print_warning "Test reports not found at expected location"
        fi
        
        # If Docker mode, also mention the reports server and WireMock admin
        if [ "$MODE" = "docker" ]; then
            print_status "WireMock admin interface: http://localhost:9000/__admin"
        fi
    fi
}

# Main execution
case $MODE in
    docker)
        run_docker_tests
        exit_code=$?
        ;;
    local)
        run_local_tests
        exit_code=$?
        ;;
    ci)
        run_ci_tests
        exit_code=$?
        ;;
esac

# Open reports if tests passed and not in CI mode
if [ $exit_code -eq 0 ]; then
    open_reports
fi

# Final status
if [ $exit_code -eq 0 ]; then
    print_success "All functional tests passed! 🎉"
else
    print_error "Some functional tests failed. Check the reports for details."
fi

exit $exit_code
