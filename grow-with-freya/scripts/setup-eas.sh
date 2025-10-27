#!/bin/bash

# EAS Setup Script for Grow with Freya
# This script helps set up EAS builds and credentials

set -e

echo "Setting up EAS for Grow with Freya..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "Installing EAS CLI..."
    npm install -g eas-cli
fi

# Check if user is logged in to Expo
echo "Checking Expo authentication..."
if ! eas whoami &> /dev/null; then
    echo "Please log in to your Expo account:"
    eas login
fi

# Initialize EAS project if not already done
if [ ! -f "eas.json" ]; then
    echo "Initializing EAS project..."
    eas build:configure
fi

echo "EAS project configuration:"
echo "- Development builds: Internal distribution with development client"
echo "- Preview builds: Internal distribution for testing"
echo "- Production builds: Ready for app store submission"

echo ""
echo "Next steps:"
echo "1. Set up your GitHub secrets:"
echo " - EXPO_TOKEN: Your Expo access token"
echo " - Add any additional environment variables needed"
echo ""
echo "2. Configure your app identifiers in app.json:"
echo " - iOS: com.growwithfreya.app"
echo " - Android: com.growwithfreya.app"
echo ""
echo "3. Set up signing credentials:"
echo " - iOS: eas credentials:configure -p ios"
echo " - Android: eas credentials:configure -p android"
echo ""
echo "4. Test your first build:"
echo " - Development: npm run eas:build:dev"
echo " - Preview: npm run eas:build:preview"
echo ""

# Check if credentials are configured
echo "Checking credentials configuration..."
echo "iOS credentials:"
eas credentials:list -p ios || echo "No iOS credentials configured yet"
echo ""
echo "Android credentials:"
eas credentials:list -p android || echo "No Android credentials configured yet"
echo ""

echo "EAS setup complete!"
echo "See DEVELOPMENT.md for detailed build and deployment instructions"
