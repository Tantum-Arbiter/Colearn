Feature: Simple Gateway Health Check
  As a system administrator
  I want to verify the gateway service is accessible
  So that I can ensure basic connectivity works

  Scenario: Gateway root endpoint is accessible
    When I GET "/"
    Then the response status should be 200
    And the response body should contain "gateway"

  Scenario: Gateway health check endpoint is accessible
    When I GET "/private/healthcheck"
    Then the response status should be 200
