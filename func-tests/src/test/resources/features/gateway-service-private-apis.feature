@health @local @docker @gcp-dev
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

  @metrics
  Scenario: Prometheus endpoint exposes custom application metrics
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "app_startup_time_milliseconds" in the body
    And the response should contain "app_connections_active" in the body
    And the response should contain "app_sessions_active" in the body

  @metrics
  Scenario: Prometheus endpoint exposes HTTP server request metrics
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "http_server_requests_seconds" in the body
    And the response should contain "http_server_requests_active_seconds" in the body

  @metrics
  Scenario: Prometheus endpoint exposes application startup metrics
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "application_ready_time_seconds" in the body
    And the response should contain "application_started_time_seconds" in the body
