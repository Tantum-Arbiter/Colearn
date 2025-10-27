#  CI/CD Guide for Grow with Freya

## Overview

This guide covers the comprehensive CI/CD pipeline setup for the Grow with Freya React Native application, including automated testing, building, deployment, and monitoring.

##  Pipeline Architecture

### Workflows

1. **Main CI/CD Pipeline** (`grow-with-freya-ci-cd.yml`)
2. **Security Scanning** (`security-scan.yml`)
3. **EAS Deployment** (`deploy-eas.yml`)

### Triggers

- **Push to main/develop**: Full CI/CD pipeline
- **Pull Requests**: Testing and validation
- **Tags (v*)**: Production deployment
- **Manual**: EAS deployment workflow
- **Schedule**: Daily security scans

##  Setup Instructions

### 1. Repository Secrets

Configure these secrets in GitHub repository settings:

```
EXPO_TOKEN=your_expo_access_token
CODECOV_TOKEN=your_codecov_token (optional)
LHCI_GITHUB_APP_TOKEN=your_lighthouse_token (optional)
```

### 2. Repository Variables

Configure these variables in GitHub repository settings:

```
EAS_BUILDS_ENABLED=true (to enable EAS builds)
```

### 3. EAS Configuration

Run the setup script:
```bash
./scripts/setup-eas.sh
```

This will:
- Install EAS CLI
- Configure EAS project
- Set up build profiles
- Configure credentials

##  Build Profiles

### Development
- **Purpose**: Internal testing with development client
- **Distribution**: Internal
- **Bundle ID**: `com.growwithfreya.app.dev`
- **Features**: Debug mode, development tools

### Preview
- **Purpose**: Internal testing and QA
- **Distribution**: Internal
- **Bundle ID**: `com.growwithfreya.app.preview`
- **Features**: Staging environment, performance monitoring

### Production
- **Purpose**: App store submission
- **Distribution**: Store
- **Bundle ID**: `com.growwithfreya.app`
- **Features**: Optimized, analytics enabled

##  Deployment Process

### Automatic Deployment

1. **Development Builds**: Triggered on push to `develop` branch
2. **Preview Builds**: Triggered on push to `main` branch
3. **Production Builds**: Triggered on version tags (`v1.0.0`)

### Manual Deployment

Use the GitHub Actions workflow dispatch:

1. Go to Actions → Deploy to EAS
2. Click "Run workflow"
3. Select environment and platform
4. Run the workflow

### Command Line Deployment

```bash
# Deploy preview build for all platforms
./scripts/deploy.sh preview all

# Deploy production build for iOS only
./scripts/deploy.sh production ios

# Deploy development build for Android only
./scripts/deploy.sh development android
```

##  Testing Strategy

### Test Types

1. **Unit Tests**: Component and utility testing
2. **Integration Tests**: Feature workflow testing
3. **Performance Tests**: Render performance and memory usage
4. **E2E Tests**: Full application flow testing

### Test Commands

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run CI tests
npm run test:ci
```

### Coverage Requirements

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

##  Security & Quality

### Security Scanning

- **Dependency Audit**: Daily npm audit scans
- **License Compliance**: Automated license checking
- **Vulnerability Monitoring**: High/critical vulnerability blocking

### Code Quality

- **ESLint**: Comprehensive linting rules
- **TypeScript**: Strict type checking
- **Performance**: Lighthouse CI monitoring
- **Code Metrics**: Automated code analysis

### Quality Gates

- All tests must pass
- Coverage thresholds must be met
- No critical security vulnerabilities
- TypeScript compilation must succeed
- ESLint checks must pass

##  Monitoring & Reporting

### Artifacts

- **Test Results**: JUnit XML and HTML reports
- **Coverage Reports**: LCOV and HTML coverage
- **Security Scans**: Audit and license reports
- **Build Artifacts**: Web builds and native binaries
- **Performance Reports**: Lighthouse CI results

### Notifications

- **GitHub**: PR status checks and summaries
- **Codecov**: Coverage reporting and trends
- **EAS**: Build status and download links

##  Versioning Strategy

### Conventional Commits

Use conventional commit format for automatic versioning:

```
feat: add new story carousel component
fix: resolve animation performance issue
feat!: redesign navigation structure (BREAKING CHANGE)
```

### Version Bumping

- **Patch**: Bug fixes, performance improvements
- **Minor**: New features, enhancements
- **Major**: Breaking changes, major redesigns

### Release Process

1. Merge features to `develop`
2. Test in preview environment
3. Merge `develop` to `main`
4. Automatic version bump and tag creation
5. Production build triggered
6. Manual app store submission

##  Troubleshooting

### Common Issues

#### EAS Build Failures
- Check EXPO_TOKEN secret
- Verify EAS credentials
- Review build logs in EAS dashboard

#### Test Failures
- Run tests locally first
- Check coverage thresholds
- Review test environment setup

#### Security Scan Failures
- Update vulnerable dependencies
- Review license compliance
- Check audit reports

#### Deployment Issues
- Verify environment configuration
- Check build profile settings
- Review deployment logs

### Debug Commands

```bash
# Check EAS status
eas whoami
eas build:list

# Run local CI simulation
npm run ci:setup

# Check dependencies
npm audit
npm outdated

# Validate configuration
npx expo doctor
```

##  Additional Resources

- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Testing Framework](https://jestjs.io/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Conventional Commits](https://www.conventionalcommits.org/)

##  Contributing

1. Follow conventional commit format
2. Ensure all tests pass locally
3. Update documentation for new features
4. Review security and performance impact
5. Test deployment process in preview environment
