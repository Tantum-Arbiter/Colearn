# 🚀 EAS Workflow Setup Guide

## Overview

This guide will help you complete the setup of your EAS (Expo Application Services) workflow for automated mobile app builds and deployments.

## Current Status

✅ **EAS Configuration**: `eas.json` configured with 3 build profiles  
✅ **App Configuration**: Bundle identifiers properly set  
✅ **CI/CD Integration**: EAS build jobs configured  
✅ **Workflow Files**: Both main pipeline and manual deploy workflows ready  
🔧 **Workflow Syntax**: Fixed typos in deploy-eas.yml  

## Required Setup Steps

### 1. Configure GitHub Secrets

You need to add the following secret to your GitHub repository:

**Go to**: GitHub Repository → Settings → Secrets and variables → Actions → New repository secret

**Required Secret:**
- **Name**: `EXPO_TOKEN`
- **Value**: Your Expo access token

**How to get your EXPO_TOKEN:**
```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to your Expo account
eas login

# Generate an access token
eas whoami
# This will show your account info and you can generate a token at:
# https://expo.dev/accounts/[your-account]/settings/access-tokens
```

### 2. Configure GitHub Variables

**Go to**: GitHub Repository → Settings → Secrets and variables → Actions → Variables tab → New repository variable

**Required Variable:**
- **Name**: `EAS_BUILDS_ENABLED`
- **Value**: `true`

This enables EAS builds in your main CI/CD pipeline.

### 3. Set Up EAS Credentials

Run the setup script to configure your EAS project and credentials:

```bash
cd grow-with-freya
./scripts/setup-eas.sh
```

This script will:
- Install EAS CLI
- Configure your EAS project
- Set up build profiles
- Help configure signing credentials

### 4. Configure Signing Credentials

For iOS and Android builds, you need signing credentials:

**iOS Credentials:**
```bash
cd grow-with-freya
eas credentials:configure -p ios
```

**Android Credentials:**
```bash
cd grow-with-freya
eas credentials:configure -p android
```

Follow the prompts to either:
- Generate new credentials automatically
- Upload existing certificates/keystores

## Build Profiles

Your app has 3 build profiles configured:

| Profile | Purpose | Distribution | Bundle ID |
|---------|---------|--------------|-----------|
| **development** | Internal testing with dev client | Internal | `com.growwithfreya.app.dev` |
| **preview** | QA and staging | Internal | `com.growwithfreya.app.preview` |
| **production** | App store submission | Store | `com.growwithfreya.app` |

## How to Use EAS Workflows

### Automatic Builds (Main Pipeline)

When you push to `main` branch with `EAS_BUILDS_ENABLED=true`:
- Builds both iOS and Android
- Uses `preview` profile
- Runs after all tests pass

### Manual Builds (Deploy Workflow)

**Go to**: GitHub Repository → Actions → Deploy to EAS → Run workflow

**Options:**
- **Environment**: development, preview, or production
- **Platform**: ios, android, or all
- **Skip tests**: Option to skip tests (not recommended for production)

### Local Testing

Test your EAS configuration locally:

```bash
cd grow-with-freya

# Test development build
npm run eas:build:dev

# Test preview build  
npm run eas:build:preview

# Test production build
npm run eas:build:prod
```

## Monitoring Builds

### EAS Dashboard
Monitor your builds at: https://expo.dev/accounts/[your-account]/projects/grow-with-freya/builds

### GitHub Actions
- Main pipeline builds: Actions → Grow with Freya - CI/CD Pipeline
- Manual builds: Actions → Deploy to EAS

## Next Steps After Setup

1. **Test the workflow**: Push a commit to main to trigger automatic builds
2. **Manual deployment**: Try a manual deployment using the Deploy to EAS workflow
3. **App store submission**: Use production builds for app store submission

## Troubleshooting

### Common Issues

**"Not logged in" errors:**
- Verify `EXPO_TOKEN` secret is set correctly
- Token should be from: https://expo.dev/accounts/[your-account]/settings/access-tokens

**Build configuration errors:**
```bash
# Validate EAS configuration
eas build:configure

# Check app configuration
npx expo config --type public
```

**Credential issues:**
```bash
# List current credentials
eas credentials:list -p ios
eas credentials:list -p android

# Reconfigure if needed
eas credentials:configure -p ios
eas credentials:configure -p android
```

## Support

- **EAS Documentation**: https://docs.expo.dev/build/introduction/
- **Troubleshooting Guide**: See `TROUBLESHOOTING.md` in the project
- **EAS CLI Help**: `eas --help`

---

Once you complete these setup steps, your EAS workflow will be fully operational! 🎉
