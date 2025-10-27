#!/bin/bash

# Deployment Script for Grow with Freya
# Usage: ./scripts/deploy.sh [environment] [platform]
# Example: ./scripts/deploy.sh preview android

set -e

ENVIRONMENT=${1:-preview}
PLATFORM=${2:-all}

echo " Starting deployment for environment: $ENVIRONMENT, platform: $PLATFORM"

# Validate environment
case $ENVIRONMENT in
  development|preview|production)
    echo " Valid environment: $ENVIRONMENT"
    ;;
  *)
    echo " Invalid environment. Use: development, preview, or production"
    exit 1
    ;;
esac

# Validate platform
case $PLATFORM in
  ios|android|all)
    echo " Valid platform: $PLATFORM"
    ;;
  *)
    echo " Invalid platform. Use: ios, android, or all"
    exit 1
    ;;
esac

# Pre-deployment checks
echo " Running pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo " package.json not found. Please run from the grow-with-freya directory."
    exit 1
fi

# Check if EAS is configured
if [ ! -f "eas.json" ]; then
    echo " eas.json not found. Please run setup-eas.sh first."
    exit 1
fi

# Check if user is logged in to Expo
if ! eas whoami &> /dev/null; then
    echo " Not logged in to Expo. Please run: eas login"
    exit 1
fi

# Run tests
echo " Running tests..."
npm run test:ci

# Run type checking
echo " Running type check..."
npm run type-check

# Run linting
echo " Running linter..."
npm run lint

echo " All pre-deployment checks passed!"

# Build function
build_platform() {
    local platform=$1
    echo " Building $platform for $ENVIRONMENT..."
    
    case $ENVIRONMENT in
        development)
            eas build --platform $platform --profile development --non-interactive
            ;;
        preview)
            eas build --platform $platform --profile preview --non-interactive
            ;;
        production)
            eas build --platform $platform --profile production --non-interactive
            ;;
    esac
}

# Execute builds
if [ "$PLATFORM" = "all" ]; then
    build_platform "ios"
    build_platform "android"
else
    build_platform "$PLATFORM"
fi

echo " Deployment completed successfully!"
echo " Check your builds at: https://expo.dev/accounts/[your-account]/projects/grow-with-freya/builds"

# Optional: Submit to app stores (only for production)
if [ "$ENVIRONMENT" = "production" ]; then
    echo ""
    echo " Production build completed. To submit to app stores:"
    echo "- iOS: eas submit --platform ios"
    echo "- Android: eas submit --platform android"
    echo ""
    echo "  Make sure you have configured your app store credentials first!"
fi
