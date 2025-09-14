Feature: Gateway Service private endpoints

  Scenario: Healthcheck returns status UP
    When I GET "/private/healthcheck"
    Then the response status should be 200
    And the response JSON should contain value "UP"

  Scenario: Info endpoint returns app info
    When I GET "/private/info"
    Then the response status should be 200
    And the response JSON should contain value "Gateway Service"

  Scenario: Prometheus endpoint exposes metrics
    When I GET "/private/prometheus"
    Then the response status should be 200
    And the response body should contain "jvm_buffer_total_capacity_bytes"
