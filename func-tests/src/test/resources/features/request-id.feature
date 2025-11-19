Feature: Request ID propagation
  As a client of the gateway
  I want each request to have a UUID request ID
  So that I can trace requests end-to-end across services

  Background:
    Given I have a valid authentication token

  Scenario: Gateway generates X-Request-Id when missing and propagates downstream
    Given WireMock returns 200 for GET "/api/users/profile"
    When I send a GET request to "/api/users/profile" with valid authentication
    Then the response status should be 200
    And the response header "X-Request-Id" should be a UUID
    And WireMock should have received a request to "/api/users/profile" with header "X-Request-Id" equal to the response header "X-Request-Id"

  Scenario: Gateway preserves client-supplied X-Request-Id and propagates downstream
    Given WireMock returns 200 for GET "/api/users/profile"
    When I send a GET request to "/api/users/profile" with headers:
      | Authorization | Bearer valid-user-test                  |
      | X-Request-Id | 123e4567-e89b-12d3-a456-426614174000    |
    Then the response status should be 200
    And the response header "X-Request-Id" should be a UUID
    And WireMock should have received a request to "/api/users/profile" with header "X-Request-Id" equal to "123e4567-e89b-12d3-a456-426614174000"

