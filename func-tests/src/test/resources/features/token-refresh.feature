@token-refresh @emulator-only @local @docker @security
Feature: Token Refresh
  As a user of the Grow with Freya application
  I want to refresh my access token using a refresh token
  So that I can maintain my session without re-authenticating

  Background:
    Given the gateway service is running
    And Firebase is configured in WireMock

  @smoke
  Scenario: Successfully refresh access token with valid refresh token
    Given I have a valid refresh token
    When I send a POST request to "/auth/refresh" with body:
      """
      {
        "refreshToken": "gateway-refresh-token-abc123"
      }
      """
    Then the response status should be 200
    And the response should have field "success" with value "true"
    And the response should have field "tokens.accessToken"
    And the response should have field "tokens.refreshToken"
    And the response should have field "tokens.expiresAt"
    And the response should have field "message" with value "Token refresh successful"

  @error-handling
  Scenario: Refresh token with refreshToken "invalid-refresh-token" not in session store
    When I send a POST request to "/auth/refresh" with body:
      """
      {
        "refreshToken": "invalid-refresh-token"
      }
      """
    Then the response status should be 401
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-006"
    And the response should have field "error" with value "Invalid or expired refresh token"

  @validation @error-handling
  Scenario: Refresh token request missing required refreshToken field
    When I send a POST request to "/auth/refresh" with body:
      """
      {
      }
      """
    Then the response status should be 400
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-101"
    And the response should have field "error" with value "Required field is missing"

  @validation @error-handling
  Scenario: Refresh token request with refreshToken set to null
    When I send a POST request to "/auth/refresh" with body:
      """
      {
        "refreshToken": null
      }
      """
    Then the response status should be 400
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-101"
    And the response should have field "error" with value "Required field is missing"

  @validation @error-handling
  Scenario: Refresh token request with refreshToken set to empty string
    When I send a POST request to "/auth/refresh" with body:
      """
      {
        "refreshToken": ""
      }
      """
    Then the response status should be 400
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-101"
    And the response should have field "error" with value "Required field is missing"

  @validation @error-handling
  Scenario: Refresh token request with malformed JSON (invalid syntax)
    When I send a POST request to "/auth/refresh" with raw body:
      """
      {invalid json}
      """
    Then the response status should be 400
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-106"
    And the response should have field "error" with value "Malformed JSON in request body"

  Scenario: Refresh token updates session in database
    Given I have a valid refresh token
    When I send a POST request to "/auth/refresh" with body:
      """
      {
        "refreshToken": "gateway-refresh-token-abc123"
      }
      """
    Then the response status should be 200
    And the response should have field "tokens.refreshToken"
    And the new refresh token should be different from the old one

  @error-handling
  Scenario: Refresh token with expired refresh token
    When I send a POST request to "/auth/refresh" with body:
      """
      {
        "refreshToken": "expired-refresh-token"
      }
      """
    Then the response status should be 401
    And the response should have field "errorCode" with value "GTW-006"
    And the response should have field "error" with value "Invalid or expired refresh token"

  @concurrency
  Scenario: Multiple concurrent refresh requests with same token
    Given I have a valid refresh token
    When I send 3 concurrent POST requests to "/auth/refresh" with body:
      """
      {
        "refreshToken": "gateway-refresh-token-abc123"
      }
      """
    Then at least 1 request should return status 200
    And the successful response should have field "tokens.accessToken"

  Scenario: Refresh token after token revocation
    Given I have a valid refresh token
    When I send a POST request to "/auth/revoke" with body:
      """
      {
        "refreshToken": "gateway-refresh-token-abc123"
      }
      """
    Then the response status should be 200
    When I send a POST request to "/auth/refresh" with body:
      """
      {
        "refreshToken": "gateway-refresh-token-abc123"
      }
      """
    Then the response status should be 401
    And the response should have field "errorCode" with value "GTW-006"
    And the response should have field "error" with value "Invalid or expired refresh token"

  Scenario: Refresh token response includes correct token expiration
    Given I have a valid refresh token
    When I send a POST request to "/auth/refresh" with body:
      """
      {
        "refreshToken": "gateway-refresh-token-abc123"
      }
      """
    Then the response status should be 200
    And the response field "tokens.expiresAt" should be a future timestamp
    And the token expiration should be approximately 3600 seconds from now

  @validation @error-handling
  Scenario: Refresh token with valid token but missing Content-Type header
    Given I have a valid refresh token
    When I send a POST request to "/auth/refresh" without Content-Type header with body:
      """
      {
        "refreshToken": "gateway-refresh-token-abc123"
      }
      """
    Then the response status should be 415

