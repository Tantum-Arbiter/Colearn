@health @local @docker @gcp-dev
Feature: Gateway Service Health
  As a system administrator
  I want to monitor the health of the gateway service
  So that I can ensure the system is running properly

  @smoke
  Scenario: Health check endpoint returns healthy status
    Given the gateway service is healthy
    When I make a GET request to "/private/healthcheck"
    Then the response status code should be 200
    And the response JSON field "status" should be "UP"
    And the response time should be less than 1000 milliseconds

  @performance
  Scenario: Metrics endpoint is accessible
    Given the gateway service is healthy
    When I make a GET request to "/private/metrics"
    Then the response status code should be 200
    And the response should contain "jvm.buffer.memory.used" in the body
    And the response time should be less than 2000 milliseconds

  Scenario: Info endpoint provides application information
    Given the gateway service is healthy
    When I make a GET request to "/private/info"
    Then the response status code should be 200
    And the response time should be less than 1000 milliseconds

  Scenario: Prometheus metrics endpoint
    Given the gateway service is healthy
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response headers should contain "Content-Type"
    And the response header "Content-Type" should be "text/plain;version=0.0.4;charset=utf-8"
    And the response time should be less than 2000 milliseconds

  Scenario: Service responds to root endpoint
    Given the gateway service is healthy
    When I make a GET request to "/"
    Then the response status code should be 200
    And the response time should be less than 1000 milliseconds

  @error-handling
  Scenario: Service handles 404 gracefully
    Given the gateway service is healthy
    When I make a GET request to "/non-existent-endpoint"
    Then the response status code should be 404
    And the response time should be less than 1000 milliseconds

  Scenario: CORS headers are present
    Given the gateway service is healthy
    When I make a GET request to "/private/healthcheck"
    Then the response status code should be 200
    And the response headers should contain "Access-Control-Allow-Origin"


  @security
  Scenario: Security headers are present on 401 errors
    Given the gateway service is healthy
    When I make a GET request to "/api/protected/resource"
    Then the response status code should be 401
    And the response headers should contain "X-Frame-Options"
    And the response headers should contain "X-Content-Type-Options"
    And the response headers should contain "Content-Security-Policy"
    And the response headers should contain "Strict-Transport-Security"
    And the response headers should contain "Access-Control-Allow-Origin"
    And the response headers should contain "Access-Control-Allow-Methods"
    And the response headers should contain "Access-Control-Allow-Headers"

