#  Troubleshooting Guide

## CI/CD Pipeline Issues

### GitHub Actions Failures

#### Test Failures
**Symptoms**: Tests fail in CI but pass locally
**Solutions**:
```bash
# Run the exact CI command locally
npm run test:ci

# Check for environment differences
npm run ci:setup

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Build Failures
**Symptoms**: Build fails during CI
**Solutions**:
```bash
# Check TypeScript compilation
npm run type-check

# Verify Expo configuration
npx expo doctor

# Test web build locally
npm run build:web
```

#### Coverage Threshold Failures
**Symptoms**: Coverage below required thresholds
**Solutions**:
```bash
# Generate coverage repor
npm run test:coverage

# Check specific file coverage
npm test -- --coverage --collectCoverageFrom="path/to/file.ts"

# Update coverage thresholds in jest.config.js if needed
```

### EAS Build Issues

#### Authentication Errors
**Symptoms**: "Not logged in" or "Invalid token" errors
**Solutions**:
```bash
# Check current login status
eas whoami

# Login with token
eas login

# Verify EXPO_TOKEN secret in GitHub
```

#### Build Configuration Errors
**Symptoms**: Build fails with configuration errors
**Solutions**:
```bash
# Validate EAS configuration
eas build:configure

# Check build profiles
cat eas.json

# Verify app.json configuration
npx expo config --type public
```

#### Credential Issues
**Symptoms**: Signing or provisioning errors
**Solutions**:
```bash
# Configure iOS credentials
eas credentials:configure -p ios

# Configure Android credentials
eas credentials:configure -p android

# List existing credentials
eas credentials:lis
```

### Security Scan Failures

#### High Vulnerability Coun
**Symptoms**: Security scan fails due to vulnerabilities
**Solutions**:
```bash
# Check specific vulnerabilities
npm audi

# Fix automatically fixable issues
npm audit fix

# Update specific packages
npm update package-name

# Check for alternative packages
npm ls package-name
```

#### License Compliance Issues
**Symptoms**: Problematic licenses detected
**Solutions**:
```bash
# Check all licenses
npx license-checker

# Find specific license
npx license-checker --packages package-name

# Review and replace problematic packages
```

## Development Issues

### Environment Setup

#### Node.js Version Issues
**Symptoms**: Build or test failures due to Node version
**Solutions**:
```bash
# Check current version
node --version

# Use Node Version Manager
nvm install 20
nvm use 20

# Verify npm version
npm --version
```

#### Expo CLI Issues
**Symptoms**: Expo commands fail or behave unexpectedly
**Solutions**:
```bash
# Update Expo CLI
npm install -g @expo/cli@lates

# Clear Expo cache
npx expo install --fix

# Reset Expo configuration
npx expo doctor
```

### Testing Issues

#### Mock Issues
**Symptoms**: Tests fail due to missing or incorrect mocks
**Solutions**:
```bash
# Check mock files exis
ls __mocks__/

# Verify mock implementations
cat __mocks__/expo-haptics.js

# Update Jest configuration
cat jest.config.js
```

#### Animation Test Failures
**Symptoms**: Animation tests are flaky or fail
**Solutions**:
```bash
# Run animation tests specifically
npm run test:onboarding

# Use single worker for animation tests
npm test -- --maxWorkers=1

# Check animation test configuration
cat jest.entrance-animation.config.js
```

### Performance Issues

#### Slow Build Times
**Symptoms**: Builds take too long
**Solutions**:
```bash
# Clear Metro cache
npx expo start --clear

# Clear npm cache
npm cache clean --force

# Use faster build profile
eas build --profile developmen
```

#### Memory Issues
**Symptoms**: Out of memory errors during build
**Solutions**:
```bash
# Increase Node memory limi
export NODE_OPTIONS="--max-old-space-size=4096"

# Use single worker for tests
npm test -- --maxWorkers=1

# Check for memory leaks in tests
npm run test:performance
```

## Deployment Issues

### EAS Deploymen

#### Build Queue Issues
**Symptoms**: Builds stuck in queue
**Solutions**:
- Check EAS status page
- Use different resource class
- Try building one platform at a time

#### Distribution Issues
**Symptoms**: Can't install or access builds
**Solutions**:
```bash
# Check build status
eas build:lis

# Verify distribution settings
cat eas.json

# Check device registration (iOS)
eas device:lis
```

### App Store Issues

#### Submission Failures
**Symptoms**: App store submission rejected
**Solutions**:
```bash
# Check submission status
eas submit:lis

# Verify app store configuration
cat eas.json

# Review app store guidelines
```

## Monitoring and Debugging

### Log Analysis

#### GitHub Actions Logs
1. Go to Actions tab in GitHub
2. Click on failed workflow
3. Expand failed step
4. Check error messages and stack traces

#### EAS Build Logs
1. Go to EAS dashboard
2. Click on failed build
3. Review build logs
4. Check for specific error messages

### Performance Monitoring

#### Lighthouse CI Issues
**Symptoms**: Performance tests fail
**Solutions**:
```bash
# Run Lighthouse locally
npm install -g @lhci/cli
lhci autorun

# Check Lighthouse configuration
cat lighthouserc.js

# Verify web build
npm run build:web
npx serve -s dis
```

### Common Error Messages

#### "Module not found"
**Solution**: Check import paths and ensure dependencies are installed

#### "Cannot resolve module"
**Solution**: Clear Metro cache and restart development server

#### "Build failed with exit code 1"
**Solution**: Check specific error messages in build logs

#### "Tests failed"
**Solution**: Run tests locally and fix failing test cases

## Getting Help

### Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Documentation](https://jestjs.io/)

### Support Channels
- GitHub Issues for project-specific problems
- Expo Discord for EAS and Expo-related issues
- Stack Overflow for general React Native questions

### Debug Information to Collec
When reporting issues, include:
- Error messages and stack traces
- Environment information (Node, npm, Expo versions)
- Steps to reproduce
- Configuration files (package.json, eas.json, etc.)
- Build/test logs
