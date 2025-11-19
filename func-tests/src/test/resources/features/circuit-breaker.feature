Feature: Circuit breaker behavior
  As a gateway
  I want to open circuit breakers after repeated slow/time-out calls
  So that clients fail fast and upstreams are protected

  Scenario: Default circuit breaker opens after repeated timeouts
    Given I have a valid authentication token
    And WireMock adds dribble delay of 2.5 seconds over 10 chunks for path "/api/users/.*"
    When I send 8 timed authenticated GET requests to "/api/users/profile"
    Then at least 1 responses should have status 503
    And at least 1 responses should have field "errorCode" with value "GTW-209"
    And all of the last 2 responses should be faster than 300 ms

