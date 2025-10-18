# Grow with Freya - Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- For iOS development: Xcode (macOS only)
- For Android development: Android Studio

### Installation
```bash
cd grow-with-freya
npm install
```

### Development Commands

#### Basic Development
```bash
# Start development server
npm start

# Start with cache cleared
npm run start:clear

# Platform-specific development
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

#### Testing & Quality
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:onboarding

# TypeScript type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

#### Building
```bash
# Build for web
npm run build:web

# Build for all platforms
npm run build:all

# Check project health
npm run doctor

# Generate native code
npm run prebuild
npm run prebuild:clean
```

## 📱 Local Testing Strategies

### 1. Development Server Testing
The fastest way to test your app during development:

```bash
# Start the development server
npm start

# Then scan QR code with:
# - Expo Go app (iOS/Android)
# - Camera app (iOS)
# - Or press 'w' for web
```

**Pros**: Instant reload, debugging tools, works on physical devices
**Cons**: Limited to Expo Go capabilities, some native features unavailable

### 2. Web Testing
Test your app in the browser for rapid iteration:

```bash
npm run web
```

**Pros**: Fastest development cycle, browser dev tools, easy sharing
**Cons**: Not all React Native features work on web

### 3. Simulator/Emulator Testing
Test on iOS Simulator or Android Emulator:

```bash
# iOS (macOS only)
npm run ios

# Android
npm run android
```

**Pros**: More realistic testing environment, access to device features
**Cons**: Slower than web, requires simulator setup

### 4. Physical Device Testing
Test on real devices using Expo Go or development builds:

#### Using Expo Go (Easiest)
1. Install Expo Go from App Store/Play Store
2. Run `npm start`
3. Scan QR code with Expo Go

#### Using Development Builds (More Features)
```bash
# Build development version
npm run eas:build:dev

# Install on device when build completes
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
The CI/CD pipeline runs automatically on:
- Push to `main`, `develop`, or `Grow-with-Freya-app` branches
- Pull requests to `main` or `develop`

### Pipeline Stages

1. **🧪 Test & Lint**
   - Runs all Jest tests
   - ESLint code quality checks
   - Uploads coverage to Codecov

2. **🔧 TypeScript Check**
   - Validates TypeScript types
   - Ensures no type errors

3. **📱 Expo Development Build**
   - Exports web version
   - Creates downloadable artifacts

4. **🔒 Security Audit**
   - npm audit for vulnerabilities
   - Dependency version checks

### Local CI Simulation
Run the same checks locally before pushing:

```bash
# Run full CI pipeline locally
npm run ci:setup

# Or step by step:
npm run type-check
npm run test:ci
npm run lint
npm run build:web
```

## 📦 Build Artifacts

### Web Builds
Web builds are automatically created and available as GitHub Actions artifacts:
- Download from Actions tab in GitHub
- 7-day retention period
- Ready for deployment to any static hosting

### Native Builds (EAS)
When ready for native testing:

```bash
# Preview builds (internal distribution)
npm run eas:build:preview

# Development builds (with debugging)
npm run eas:build:dev

# Production builds (app stores)
npm run eas:build:prod
```

## 🧪 Testing Best Practices

### Unit Testing
- All components should have basic render tests
- Test user interactions and state changes
- Mock external dependencies
- Aim for >80% code coverage

### Integration Testing
- Test complete user flows
- Test navigation between screens
- Test data persistence (AsyncStorage)

### Manual Testing Checklist
- [ ] App loads without crashes
- [ ] Onboarding flow works correctly
- [ ] Navigation functions properly
- [ ] Responsive design on different screen sizes
- [ ] Performance is acceptable
- [ ] Offline functionality (if applicable)

## 🔧 Troubleshooting

### Common Issues

#### Metro bundler issues
```bash
npm run start:clear
# or
npx expo start --clear
```

#### Native code issues
```bash
npm run prebuild:clean
```

#### Dependency issues
```bash
rm -rf node_modules package-lock.json
npm install
```

#### iOS build issues
```bash
cd ios && pod install && cd ..
```

### Development Reset
If you encounter persistent issues:
```bash
npm run dev:reset
```

## 📊 Monitoring & Analytics

### Test Coverage
- View coverage reports in `coverage/` directory
- Coverage uploaded to Codecov on CI
- Aim to maintain >80% coverage

### Performance Monitoring
- Use React DevTools for performance profiling
- Monitor bundle size with `npx expo export --analyze`
- Test on lower-end devices

### Error Tracking
Consider integrating error tracking services:
- Sentry for crash reporting
- Flipper for debugging
- React Native Debugger

## 🚀 Deployment Preparation

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] TypeScript checks pass
- [ ] No ESLint errors
- [ ] App tested on multiple devices/simulators
- [ ] Performance is acceptable
- [ ] App icons and splash screens configured
- [ ] App store metadata prepared

### Next Steps for Store Deployment
1. Set up EAS Build profiles for production
2. Configure app signing certificates
3. Set up app store connect/play console
4. Configure automated deployment with EAS Submit
5. Set up crash reporting and analytics

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Testing React Native Apps](https://reactnative.dev/docs/testing-overview)
