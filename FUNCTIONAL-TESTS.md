# Functional Tests

Comprehensive end-to-end functional tests for the Colearn gateway service using Cucumber BDD framework and pure WireMock server for external service mocking.

## Overview

The functional test suite provides:

- **BDD Testing** - Human-readable test scenarios using Cucumber
- **Pure WireMock Server** - No Java code, just JSON configuration files
- **External Service Mocking** - Firebase, Google OAuth, Apple OAuth providers
- **End-to-End Coverage** - Complete user workflows from authentication to data access
- **Docker Integration** - Containerized test execution with standalone WireMock
- **Comprehensive Reporting** - HTML, JSON, and JUnit reports

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Functional    │    │   Gateway       │    │   Pure WireMock │
│   Tests         │───▶│   Service       │───▶│   Server        │
│   (Cucumber)    │    │   (Under Test)  │    │   (JSON Config) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

- Java 21+
- Docker and Docker Compose
- Gradle 8.14+

### Running Tests Locally

```bash
# Start WireMock server
cd wiremock-server
./start-wiremock.sh

# In another terminal, start gateway service
cd gateway-service
./gradlew bootRun

# In another terminal, run functional tests
cd func-tests
./gradlew functionalTest
```

### Running with Docker Compose

```bash
# Run complete test suite (exits with the tests' status code)
docker-compose -f docker-compose.functional-tests.yml up --build --abort-on-container-exit --exit-code-from func-tests

# Test reports are written locally to:
# func-tests/build/reports/tests/cucumber.html
# func-tests/build/reports/tests/cucumber.json
# func-tests/build/reports/tests/cucumber-junit.xml
```

### Running Individual Test Suites

```bash
# Run only authentication tests
./gradlew cucumberTest -Dcucumber.filter.tags="@authentication"

# Run only health check tests
./gradlew cucumberTest -Dcucumber.filter.tags="@health"

# Run all tests except ignored ones
./gradlew cucumberTest -Dcucumber.filter.tags="not @ignore"
```

## Test Structure

### Feature Files

Located in `func-tests/src/test/resources/features/`:

- **authentication.feature** - OAuth authentication flows
- **gateway-health.feature** - Service health and monitoring
- **user-management.feature** - User profile and children management

### Step Definitions

Located in `func-tests/src/test/java/com/app/functest/stepdefs/`:

- **AuthenticationStepDefs.java** - Authentication-related steps
- **GatewayStepDefs.java** - General gateway service steps
- **TestConfiguration.java** - Test setup and WireMock configuration

### Test Configuration

- **application-test.yml** - Test-specific configuration
- **TestConfiguration.java** - Spring Boot test configuration
- **CucumberTestRunner.java** - Cucumber test runner

## Test Scenarios

### Authentication Tests

```gherkin
Scenario: Successful Google OAuth authentication
  Given WireMock is configured for "Google" OAuth provider
  And a valid "Google" OAuth token
  When I authenticate with the OAuth token
  And I call the "/api/auth/me" endpoint
  Then the response status should be 200
  And the response should have field "email"
```

### Health Check Tests

```gherkin
Scenario: Health check endpoint returns healthy status
  Given the gateway service is healthy
  When I make a GET request to "/private/healthcheck"
  Then the response status code should be 200
  And the response JSON field "status" should be "UP"
```

### User Management Tests

```gherkin
Scenario: Add child profile
  Given a valid "Google" OAuth token
  When I make an authenticated POST request to "/api/users/children" with token "valid-google-token" and body:
    """
    {
      "name": "Little Freya",
      "birthDate": "2020-05-15",
      "avatar": "bear"
    }
    """
  Then the response status code should be 201
  And the response should contain JSON field "id"
```

## WireMock Integration

### Service Mocking

The tests use WireMock to mock external services:

- **Firebase Authentication** - Token verification, user creation
- **Google OAuth** - Token exchange, user info retrieval
- **Apple OAuth** - Token exchange, public key retrieval

### Dynamic Stubs

Tests can create dynamic stubs at runtime:

```java
@Given("a valid {string} OAuth token")
public void aValidOAuthToken(String provider) {
    wireMockServer.stubFor(
        WireMock.get(WireMock.urlPathEqualTo("/oauth2/v2/userinfo"))
            .withHeader("Authorization", WireMock.equalTo("Bearer " + token))
            .willReturn(WireMock.aResponse()
                .withStatus(200)
                .withJsonBody(userInfo))
    );
}
```

### Request Verification

Tests can verify external service calls:

```java
@Then("WireMock should have received {int} request(s) to {string}")
public void wireMockShouldHaveReceivedRequestsTo(int count, String urlPattern) {
    wireMockServer.verify(count, WireMock.getRequestedFor(WireMock.urlMatching(urlPattern)));
}
```

## Configuration

### Test Properties

```yaml
test:
  gateway:
    base-url: http://localhost:8080
  wiremock:
    port: 9000
    base-url: http://localhost:9000
  timeouts:
    default: 30000
    long: 60000
    short: 5000
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_BASE_URL` | http://localhost:8080 | Gateway service URL |
| `WIREMOCK_BASE_URL` | http://localhost:9000 | WireMock server URL |
| `SPRING_PROFILES_ACTIVE` | test | Active Spring profile |

## Reports

### HTML Reports

Generated at `func-tests/build/reports/tests/cucumber.html`:

- Feature-by-feature breakdown
- Step execution details
- Screenshots (if configured)
- Execution timeline

### JSON Reports

Generated at `func-tests/build/reports/tests/cucumber.json`:

- Machine-readable test results
- Integration with CI/CD pipelines
- Custom reporting tools

### JUnit Reports

Generated at `func-tests/build/reports/tests/cucumber-junit.xml`:

- Standard JUnit XML format
- CI/CD integration
- Test result aggregation

## CI/CD Integration

### GitHub Actions

```yaml
name: Functional Tests
on: [push, pull_request]

jobs:
  functional-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '21'
      - name: Run functional tests
        run: docker-compose -f docker-compose.functional-tests.yml up --build --abort-on-container-exit
      - name: Upload test reports
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: func-tests/build/reports/
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Functional Tests') {
            steps {
                sh 'docker-compose -f docker-compose.functional-tests.yml up --build --abort-on-container-exit'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'func-tests/build/reports/tests',
                        reportFiles: 'cucumber.html',
                        reportName: 'Functional Test Report'
                    ])
                }
            }
        }
    }
}
```

## Debugging

### Local Debugging

1. **Start services individually**:
   ```bash
   # Terminal 1: WireMock
   cd wiremock-server && ./gradlew bootRun
   
   # Terminal 2: Gateway
   cd gateway-service && ./gradlew bootRun
   
   # Terminal 3: Tests with debug
   cd func-tests && ./gradlew functionalTest --debug-jvm
   ```

2. **Check service health**:
   ```bash
   curl http://localhost:8080/private/healthcheck  # Gateway
   curl http://localhost:9000/__admin/mappings # WireMock
   ```

3. **View WireMock requests**:
   ```bash
   curl http://localhost:9000/__admin/requests
   ```

### Docker Debugging

```bash
# View logs
docker-compose -f docker-compose.functional-tests.yml logs -f

# Debug specific service
docker-compose -f docker-compose.functional-tests.yml exec gateway bash
docker-compose -f docker-compose.functional-tests.yml exec wiremock bash

# Check network connectivity
docker-compose -f docker-compose.functional-tests.yml exec func-tests curl http://gateway:8080/private/healthcheck
```

## Best Practices

### Writing Tests

1. **Use descriptive scenario names**
2. **Keep steps atomic and reusable**
3. **Use Background for common setup**
4. **Tag scenarios for selective execution**
5. **Verify both positive and negative cases**

### Step Definitions

1. **Keep step methods focused**
2. **Use dependency injection for shared state**
3. **Clean up resources in hooks**
4. **Use meaningful assertions**
5. **Handle async operations properly**

### WireMock Usage

1. **Reset state between tests**
2. **Use specific URL patterns**
3. **Verify external calls**
4. **Use response templates for dynamic data**
5. **Keep stub mappings organized**

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 8080 and 9000 are available
2. **Service startup timing**: Increase health check timeouts
3. **Network connectivity**: Check Docker network configuration
4. **Test data isolation**: Reset WireMock between tests

### Performance Issues

1. **Slow test execution**: Reduce timeout values
2. **Resource usage**: Limit parallel test execution
3. **Docker build time**: Use multi-stage builds and layer caching

### Test Failures

1. **Check service logs**: `docker-compose logs`
2. **Verify WireMock stubs**: Check `/__admin/mappings`
3. **Network issues**: Test connectivity between containers
4. **Authentication problems**: Verify OAuth token handling

## Contributing

1. **Add new feature files** for new functionality
2. **Create reusable step definitions**
3. **Update WireMock stubs** for new external services
4. **Document new test scenarios**
5. **Follow existing patterns and conventions**

## Future Enhancements

- [ ] Visual regression testing
- [ ] Performance testing integration
- [ ] Database state verification
- [ ] Mobile app testing support
- [ ] Load testing scenarios
