@request-id @local @docker
Feature: Request ID propagation
  As a client of the gateway
  I want each request to have a UUID request ID
  So that I can trace requests for debugging and observability

  @smoke
  Scenario: Gateway generates X-Request-Id when not provided
    When I send a GET request to "/private/healthcheck"
    Then the response status should be 200
    And the response header "X-Request-Id" should be a UUID

  Scenario: Gateway preserves client-supplied X-Request-Id
    When I send a GET request to "/private/healthcheck" with header "X-Request-Id" value "123e4567-e89b-12d3-a456-426614174000"
    Then the response status should be 200
    And the response header "X-Request-Id" should be "123e4567-e89b-12d3-a456-426614174000"

