#!/bin/bash

# Grow with Freya - Local Testing Script
# This script runs the same checks as CI/CD pipeline locally

set -e  # Exit on any error

echo " Starting Grow with Freya Local Testing Pipeline..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the grow-with-freya directory."
    exit 1
fi

# Step 1: Install dependencies
print_status " Installing dependencies..."
if npm ci; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 2: TypeScript type checking
print_status " Running TypeScript type check..."
if npm run type-check; then
    print_success "TypeScript check passed"
else
    print_error "TypeScript check failed"
    exit 1
fi

# Step 3: Linting
print_status " Running ESLint..."
if npm run lint; then
    print_success "Linting passed"
else
    print_warning "Linting completed with warnings (continuing...)"
fi

# Step 4: Run tests with coverage
print_status " Running tests with coverage..."
if npm run test:ci; then
    print_success "All tests passed"
else
    print_error "Tests failed"
    exit 1
fi

# Step 5: Security audit
print_status " Running security audit..."
if npm audit --audit-level=moderate; then
    print_success "Security audit passed"
else
    print_warning "Security audit found issues (continuing...)"
fi

# Step 6: Build for web
print_status " Building for web..."
if npm run build:web; then
    print_success "Web build completed successfully"
else
    print_error "Web build failed"
    exit 1
fi

# Step 7: Check project health
print_status " Running Expo doctor..."
if npm run doctor; then
    print_success "Expo doctor check passed"
else
    print_warning "Expo doctor found issues (continuing...)"
fi

echo ""
echo "=================================================="
print_success " All local tests completed successfully!"
echo ""
echo " Summary:"
echo "   Dependencies installed"
echo "   TypeScript check passed"
echo "   Linting completed"
echo "   Tests passed with coverage"
echo "   Security audit completed"
echo "   Web build successful"
echo "   Project health check completed"
echo ""
echo " Your app is ready for deployment!"
echo ""
echo " Next steps:"
echo "  • Test on physical device: npm start (scan QR code)"
echo "  • Test on simulator: npm run ios / npm run android"
echo "  • View coverage report: open coverage/lcov-report/index.html"
echo "  • Deploy web build: serve dist/ directory"
echo ""
