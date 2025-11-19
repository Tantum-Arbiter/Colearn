Feature: Gateway timeouts and dribble delays
  Verify that gateway enforces 1s timeout for general APIs and 3s for CMS, and returns quickly when upstream dribbles responses.

  Background:
    Given the gateway service is running

  Scenario: General API call exceeds 1 second timeout (dribble)
    Given I have a valid authentication token
    And WireMock adds dribble delay of 1.1 seconds over 5 chunks for path "/api/users/.*"
    When I send a timed GET request to "/api/users/profile" with valid authentication
    Then the response status should be 504
    And the response should have field "errorCode" with value "GTW-204"
    And the last response time should be less than 2000 ms

  Scenario: CMS API call exceeds 3 seconds timeout (dribble)
    Given I have a valid authentication token
    And WireMock adds dribble delay of 3.1 seconds over 7 chunks for path "/api/v1/content/.*"
    When I send a timed GET request to "/api/v1/content/manifest" with valid authentication
    Then the response status should be 504
    And the response should have field "errorCode" with value "GTW-204"
    And the last response time should be less than 5000 ms



  Scenario: Inbound request exceeds gateway timeout
    Given I have a valid authentication token
    And the gateway service has an inbound timeout of 2 seconds
    When I send a timed GET request to "/private/sleepAsync?ms=3000" with valid authentication
    Then the response status should be 504
    And the response should have field "errorCode" with value "GTW-504"
    And the last response time should be less than 4000 ms
