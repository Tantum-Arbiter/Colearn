@health @local @docker
Feature: Gateway Service private endpoints

  @smoke
  Scenario: Healthcheck returns status UP
    When I make a GET request to "/private/healthcheck"
    Then the response status code should be 200
    And the response should contain "UP" in the body

  Scenario: Info endpoint returns app info
    When I make a GET request to "/private/info"
    Then the response status code should be 200
    And the response should contain "Gateway Service" in the body

  Scenario: Prometheus endpoint exposes metrics
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "jvm_buffer_total_capacity_bytes" in the body
