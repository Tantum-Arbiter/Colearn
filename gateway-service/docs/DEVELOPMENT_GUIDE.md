# Development Guide

This guide covers how to run the Colearn gateway service locally, run tests, and connect to different environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Running Locally with Docker](#running-locally-with-docker)
- [Running the Mobile App](#running-the-mobile-app)
- [Connecting to GCP Production](#connecting-to-gcp-production)
- [Running Tests](#running-tests)
- [Monitoring & Debugging](#monitoring--debugging)

---

## Prerequisites

Before starting, ensure you have:

- **Java 21+** - For the gateway service
- **Node.js 20+** - For the mobile app and scripts
- **Docker & Docker Compose** - For containerized development
- **gcloud CLI** - For GCP authentication (optional, for production access)
- **Xcode** (macOS) - For iOS development

---

## Quick Start

### 1. Start the Local Development Stack

```bash
# Start Firestore emulator + Gateway service + Prometheus + Grafana
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Check gateway health
curl http://localhost:8080/private/healthcheck
```

### 2. Seed Test Data (Optional)

```bash
# Upload test stories to local Firestore emulator
cd scripts
FIRESTORE_EMULATOR_HOST=localhost:8082 \
FIREBASE_PROJECT_ID=grow-with-freya-dev \
UPLOAD_MODE=all \
node upload-stories-to-firestore.js
```

### 3. Start the Mobile App

```bash
cd grow-with-freya
npm install
npx expo start -c
```

---

## Running Locally with Docker

### Services Overview

| Service | Port | Description |
|---------|------|-------------|
| `gateway-service` | 8080 | Main API gateway |
| `firestore` | 8082 | Firestore emulator |
| `prometheus` | 9090 | Metrics collection |
| `grafana` | 3000 | Metrics dashboards |
| `alertmanager` | 9093 | Alert management |

### Start All Services

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f gateway-service

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
```

### Start Gateway Only (Local Development)

```bash
cd gateway-service

# Create .env file with local config
cp .env.example .env

# Run with Gradle
./gradlew bootRun

# Or with specific profiles
SPRING_PROFILES_ACTIVE=dev,test ./gradlew bootRun
```

### Using the Firestore Emulator

The Firestore emulator runs on port 8082 and persists data in a Docker volume.

```bash
# Check emulator is running
curl http://localhost:8082

# View emulator data (if UI enabled)
open http://localhost:4000
```

---

## Running the Mobile App

### Connect to Local Gateway

```bash
cd grow-with-freya

# Start with local gateway (default)
EXPO_PUBLIC_GATEWAY_URL=http://192.168.1.219:8080 npx expo start -c
```

> **Note**: Replace `192.168.1.219` with your machine's local IP address.
> Find your IP with `ifconfig | grep inet` (macOS) or `ip addr` (Linux).

### Connect to GCP Production

```bash
cd grow-with-freya

# Start with GCP production gateway
EXPO_PUBLIC_GATEWAY_URL=https://api.colearnwithfreya.co.uk npx expo start -c
```

### Development vs Production Builds

| Build Type | Command | Use Case |
|------------|---------|----------|
| **Expo Go** | `npx expo start` | Quick testing, limited features |
| **Dev Build** | `npx expo start --dev-client` | Full features, debugging |
| **Preview** | `eas build --profile preview` | TestFlight distribution |
| **Production** | `eas build --profile production` | App Store submission |

---

## Connecting to GCP Production

### Getting a Bearer Token for Postman/curl

To call the GCP production API directly (bypassing the mobile app):

```bash
# Get an identity token for Cloud Run
gcloud auth print-identity-token \
  --audiences=https://gateway-service-jludng4t5a-ew.a.run.app \
  --impersonate-service-account=svc-deploy-functional@apt-icon-472307-b7.iam.gserviceaccount.com
```

### Using the Token

```bash
# Example: Check gateway health
curl -H "Authorization: Bearer <token>" \
  https://api.colearnwithfreya.co.uk/private/healthcheck

# Example: Get stories (requires user auth)
curl -H "Authorization: Bearer <access_token>" \
  https://api.colearnwithfreya.co.uk/api/stories
```

### Viewing GCP Logs

```bash
# View Cloud Run logs
gcloud run logs read gateway-service --project apt-icon-472307-b7 --limit 100

# Stream logs in real-time
gcloud run logs tail gateway-service --project apt-icon-472307-b7
```

---

## Running Tests

### Unit Tests (Gateway Service)

```bash
cd gateway-service

# Run all unit tests
./gradlew test

# Run specific test class
./gradlew test --tests "com.app.service.StoryServiceTest"

# Run with coverage report
./gradlew test jacocoTestReport
# Report at: build/reports/jacoco/test/html/index.html
```

### Functional Tests (BDD/Cucumber)

Functional tests use WireMock to mock external services (Firebase, OAuth providers).

#### Run with Docker (Recommended)

```bash
# Run complete functional test suite
docker-compose --profile func-tests up --build --abort-on-container-exit

# View test reports
open func-tests/build/reports/tests/cucumber.html
```

#### Run Locally (Manual)

```bash
# Terminal 1: Start Firestore emulator + Gateway
docker-compose up -d firestore gateway-service

# Terminal 2: Start WireMock
cd wiremock-server && ./start-wiremock.sh

# Terminal 3: Run tests
cd func-tests && ./gradlew functionalTest
```

### Non-Functional Tests (NFT/Load Testing)

NFT uses Gatling for load testing. It runs against multiple gateway replicas.

#### Run with Docker

```bash
# Start NFT stack (2 gateway replicas + load generator)
docker-compose --profile nft up --build

# View Gatling reports
open nft/build/reports/gatling/*/index.html
```

#### Run Locally

```bash
cd nft

# Run load test against local gateway
GATEWAY_BASE_URL=http://localhost:8080 ./gradlew gatlingRun

# Run against GCP production (use with caution!)
GATEWAY_BASE_URL=https://api.colearnwithfreya.co.uk ./gradlew gatlingRun
```

### NFT Configuration

The NFT profile disables rate limiting for accurate load testing:

```yaml
# docker-compose.yml - nft profile
environment:
  SPRING_PROFILES_ACTIVE: dev,test,nft  # nft profile disables rate limiting
deploy:
  replicas: 2  # Run 2 gateway instances behind load balancer
```

### Test Reports Location

| Test Type | Report Path |
|-----------|-------------|
| Unit Tests | `gateway-service/build/reports/tests/test/index.html` |
| Functional Tests | `func-tests/build/reports/tests/cucumber.html` |
| NFT/Gatling | `nft/build/reports/gatling/*/index.html` |
| Coverage | `gateway-service/build/reports/jacoco/test/html/index.html` |

---

## Monitoring & Debugging

### Local Monitoring Stack

```bash
# Start with monitoring
docker-compose up -d prometheus grafana alertmanager

# Access dashboards
open http://localhost:3000  # Grafana (admin/admin)
open http://localhost:9090  # Prometheus
open http://localhost:9093  # Alertmanager
```

### Viewing Gateway Metrics

```bash
# Raw Prometheus metrics
curl http://localhost:8080/private/prometheus

# Key metrics to watch
# - app_authentication_total: Auth attempts
# - app_requests_total: API requests
# - app_request_duration_seconds: Response times
# - app_firestore_operations_total: Database operations
```

### Debugging the Mobile App

```bash
# View React Native logs (with Expo)
# Press 'j' in Metro bundler to open debugger

# Or use React Native Debugger
npx react-devtools
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Gateway won't start | Check Firestore emulator is healthy: `docker-compose ps` |
| Network request failed | Verify EXPO_PUBLIC_GATEWAY_URL is correct IP |
| Auth fails locally | Ensure WireMock is running for OAuth mocking |
| Stories not syncing | Check content_versions in Firestore |

---

## Environment Variables

### Gateway Service

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_PROFILES_ACTIVE` | `dev` | Active profiles (dev, test, nft) |
| `FIREBASE_EMULATOR_HOST` | - | Firestore emulator hostname |
| `FIREBASE_EMULATOR_PORT` | - | Firestore emulator port |
| `JWT_SECRET` | - | JWT signing secret |

### Mobile App

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_GATEWAY_URL` | `http://localhost:8080` | Gateway API URL |

---

## Next Steps

- [CMS & Story Management](./CMS_ADMIN_GUIDE.md) - Adding and managing stories
- [API Reference](../README.md) - Full API documentation
- [Prometheus Metrics](./PROMETHEUS_METRICS.md) - Metrics reference
