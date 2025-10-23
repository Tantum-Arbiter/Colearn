# 🚀 CI/CD Pipeline for Grow with Freya

## Overview

This repository contains a comprehensive CI/CD pipeline for the Grow with Freya React Native application, featuring automated testing, building, deployment, and monitoring.

## ✨ Features

### 🔄 Automated Workflows
- **Continuous Integration**: Automated testing, linting, and type checking
- **Semantic Versioning**: Automatic version bumping based on conventional commits
- **Security Scanning**: Daily vulnerability and license compliance checks
- **Performance Monitoring**: Lighthouse CI for web performance tracking
- **EAS Deployment**: Automated native app builds and distribution

### 🧪 Comprehensive Testing
- **Unit Tests**: Component and utility testing with Jest
- **Integration Tests**: Feature workflow validation
- **Performance Tests**: Render performance and memory usage monitoring
- **Coverage Reporting**: Automated coverage tracking with thresholds

### 🔒 Security & Quality
- **Dependency Auditing**: Automated vulnerability scanning
- **License Compliance**: License compatibility checking
- **Code Quality**: ESLint with comprehensive rules
- **Type Safety**: Strict TypeScript configuration

### 📱 Multi-Platform Builds
- **Development**: Internal testing with development client
- **Preview**: Staging environment for QA
- **Production**: App store ready builds

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Expo CLI
- EAS CLI
- GitHub repository with Actions enabled

### Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd colearn/grow-with-freya
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up EAS**
   ```bash
   ./scripts/setup-eas.sh
   ```

4. **Configure GitHub Secrets**
   - `EXPO_TOKEN`: Your Expo access token
   - `CODECOV_TOKEN`: Codecov token (optional)
   - `LHCI_GITHUB_APP_TOKEN`: Lighthouse CI token (optional)

5. **Configure GitHub Variables**
   - `EAS_BUILDS_ENABLED`: Set to `true` to enable EAS builds

## 📋 Workflows

### Main CI/CD Pipeline
**File**: `.github/workflows/grow-with-freya-ci-cd.yml`
**Triggers**: Push to main/develop, Pull requests
**Features**:
- Test execution and coverage reporting
- TypeScript type checking
- Security auditing
- Semantic versioning
- Web build generation
- EAS native builds (when enabled)
- Performance testing

### Security Scanning
**File**: `.github/workflows/security-scan.yml`
**Triggers**: Push, Pull requests, Daily schedule
**Features**:
- Dependency vulnerability scanning
- License compliance checking
- Code quality analysis
- Security reporting

### EAS Deployment
**File**: `.github/workflows/deploy-eas.yml`
**Triggers**: Manual dispatch, Version tags
**Features**:
- Multi-platform builds (iOS/Android)
- Environment-specific deployments
- Build status reporting

## 🏗️ Build Profiles

| Profile | Purpose | Distribution | Bundle ID |
|---------|---------|--------------|-----------|
| Development | Internal testing | Internal | `com.growwithfreya.app.dev` |
| Preview | QA and staging | Internal | `com.growwithfreya.app.preview` |
| Production | App store | Store | `com.growwithfreya.app` |

## 📊 Quality Gates

### Test Coverage
- **Minimum**: 80% for branches, functions, lines, statements
- **Reporting**: Codecov integration with PR comments
- **Enforcement**: CI fails if thresholds not met

### Security Requirements
- **No critical vulnerabilities** allowed
- **Maximum 5 high vulnerabilities** permitted
- **License compliance** enforced
- **Daily security scans** for monitoring

### Code Quality
- **ESLint**: Comprehensive linting rules
- **TypeScript**: Strict type checking required
- **Performance**: Lighthouse CI monitoring
- **Conventional Commits**: Required for versioning

## 🚀 Deployment Process

### Automatic Deployment
1. **Development**: Push to `develop` branch
2. **Preview**: Push to `main` branch
3. **Production**: Create version tag (`v1.0.0`)

### Manual Deployment
1. Go to GitHub Actions → Deploy to EAS
2. Select environment and platform
3. Run workflow

### Command Line
```bash
# Deploy preview build
./scripts/deploy.sh preview all

# Deploy production iOS build
./scripts/deploy.sh production ios
```

## 📚 Documentation

- **[Development Guide](grow-with-freya/DEVELOPMENT.md)**: Complete development setup and workflows
- **[CI/CD Guide](grow-with-freya/CI-CD-GUIDE.md)**: Detailed CI/CD pipeline documentation
- **[Troubleshooting](grow-with-freya/TROUBLESHOOTING.md)**: Common issues and solutions

## 🔧 Scripts

| Script | Purpose |
|--------|---------|
| `setup-eas.sh` | Initial EAS configuration |
| `deploy.sh` | Manual deployment script |
| `update-app-version.js` | Sync package.json and app.json versions |

## 📈 Monitoring

### Artifacts
- Test results and coverage reports
- Security scan results
- Build artifacts (web and native)
- Performance reports

### Notifications
- GitHub PR status checks
- Build status summaries
- Security alerts

## 🤝 Contributing

1. **Follow Conventional Commits**:
   ```
   feat: add new feature
   fix: resolve bug
   feat!: breaking change
   ```

2. **Ensure Quality**:
   - All tests pass
   - Coverage thresholds met
   - No security vulnerabilities
   - TypeScript compilation succeeds

3. **Test Locally**:
   ```bash
   npm run ci:setup
   npm run test:all
   npm run build:web
   ```

## 🆘 Support

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Documentation**: Check the guides in the `grow-with-freya` directory
- **Troubleshooting**: See `TROUBLESHOOTING.md` for common solutions

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for the Grow with Freya project**
