@authentication @error-handling @local @docker @emulator-only
Feature: Authentication Unhappy Cases
  As a system administrator
  I want to ensure the authentication system handles error scenarios gracefully
  So that users receive appropriate error messages and the system remains secure

  Background:
    Given the gateway service is running
    And Firebase is configured in WireMock

  @validation
  Scenario: Authentication with malformed JSON (missing closing brace)
    Given WireMock is configured for "Google" OAuth provider
    When I send a POST request to "/auth/google" with malformed JSON:
      """
      {"idToken": "valid-google-token", "clientId": "test-client-id"
      """
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-106"
    And the response should have field "error" with value "Malformed JSON in request body"
    And the response should have field "success" with value "false"

  @validation
  Scenario: Google authentication missing required idToken field
    Given WireMock is configured for "Google" OAuth provider
    When I send a POST request to "/auth/google" with body:
      """
      {
        "clientId": "test-client-id"
      }
      """
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-101"
    And the response should have field "error" with value "Required field is missing"
    And the response should contain "idToken"

  @validation
  Scenario: Google authentication with empty string idToken
    Given WireMock is configured for "Google" OAuth provider
    When I send a POST request to "/auth/google" with body:
      """
      {
        "idToken": "",
        "clientId": "test-client-id"
      }
      """
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-101"
    And the response should have field "message" containing "ID token is required"

  @emulator-only
  Scenario: Google authentication with idToken "invalid-google-token" rejected by provider
    Given WireMock is configured for "Google" OAuth provider with invalid token responses
    When I send a POST request to "/auth/google" with body:
      """
      {
        "idToken": "invalid-google-token",
        "clientId": "test-client-id"
      }
      """
    Then the response status should be 401
    And the response should have field "errorCode" with value "GTW-003"
    And the response should have field "error" with value "Invalid Google ID token"
    And the response should have field "success" with value "false"

  @emulator-only
  Scenario: Google authentication with idToken "expired-google-token" rejected by provider
    Given WireMock is configured for "Google" OAuth provider with expired token responses
    When I send a POST request to "/auth/google" with body:
      """
      {
        "idToken": "expired-google-token",
        "clientId": "test-client-id"
      }
      """
    Then the response status should be 401
    And the response should have field "errorCode" with value "GTW-005"
    And the response should have field "error" with value "Token has expired"

  @emulator-only
  Scenario: Authentication with Google OAuth service unavailable
    Given WireMock is configured to return 503 for Google OAuth endpoints
    When I send a POST request to "/auth/google" with body:
      """
      {
        "idToken": "valid-google-token",
        "clientId": "test-client-id"
      }
      """
    Then the response status should be 502
    And the response should have field "errorCode" with value "GTW-202"
    And the response should have field "error" with value "Google OAuth service unavailable"
    And the response should have field "details.service" with value "Google OAuth"

  @performance @emulator-only
  Scenario: Authentication with Google OAuth service timeout
    Given WireMock is configured with 10 second delay for Google OAuth endpoints
    And the gateway service has a 5 second timeout
    When I send a POST request to "/auth/google" with body:
      """
      {
        "idToken": "valid-google-token",
        "clientId": "test-client-id"
      }
      """
    Then the response status should be 504
    And the response should have field "errorCode" with value "GTW-204"
    And the response should have field "error" with value "Downstream service timeout"
    And the response should have field "details.service" with value "Google OAuth"

  Scenario: Authentication with Firebase service error
    Given WireMock is configured to return 500 for Firebase endpoints
    When I send a POST request to "/auth/google" with body:
      """
      {
        "idToken": "valid-google-token",
        "clientId": "test-client-id"
      }
      """
    Then the response status should be 502
    And the response should have field "errorCode" with value "GTW-201"
    And the response should have field "error" with value "Firebase service unavailable"

  Scenario: Authentication rate limiting
    Given WireMock is configured for "Google" OAuth provider
    And rate limiting is enabled with 5 requests per minute
    When I send 6 POST requests to "/auth/google" with body:
      """
      {
        "idToken": "valid-google-token",
        "clientId": "test-client-id"
      }
      """
    Then the 6th response status should be 429
    And the 6th response should have field "errorCode" with value "GTW-300"
    And the 6th response should have field "error" with value "Rate limit exceeded"
    And the 6th response should have field "details.limitType" with value "AUTH_RATE_LIMIT"
    And the 6th response should have field "details.maxAllowed" with value 5

  Scenario: Token refresh with refreshToken "invalid-refresh-token" not found in session store
    When I send a POST request to "/auth/refresh" with body:
      """
      {
        "refreshToken": "invalid-refresh-token"
      }
      """
    Then the response status should be 401
    And the response should have field "errorCode" with value "GTW-006"
    And the response should have field "error" with value "Invalid or expired refresh token"

  Scenario: Token refresh with refreshToken "expired-refresh-token" past expiration time
    Given WireMock is configured with expired refresh token responses
    When I send a POST request to "/auth/refresh" with body:
      """
      {
        "refreshToken": "expired-refresh-token"
      }
      """
    Then the response status should be 401
    And the response should have field "errorCode" with value "GTW-006"
    And the response should have field "error" with value "Invalid or expired refresh token"

  Scenario: Access protected endpoint /api/users/profile without Authorization header
    When I send a GET request to "/api/users/profile"
    Then the response status should be 401
    And the response should have field "errorCode" with value "GTW-007"
    And the response should have field "error" with value "Unauthorized access to resource"
    And the response should have field "success" with value "false"
    And the response should have field "path"
    And the response JSON field "timestamp" should be a valid ISO-8601 timestamp
    And the response should have field "requestId"

  Scenario: Access protected endpoint with Authorization header "InvalidFormat" (missing Bearer prefix)
    When I send a GET request to "/api/users/profile" with headers:
      | Authorization | InvalidFormat |
    Then the response status should be 401
    And the response should have field "errorCode" with value "GTW-002"
    And the response should have field "error" with value "Invalid or expired token"

  Scenario: Access protected endpoint with Authorization "Bearer expired-access-token"
    When I send a GET request to "/api/users/profile" with headers:
      | Authorization | Bearer expired-access-token |
    Then the response status should be 401
    And the response should have field "errorCode" with value "GTW-005"
    And the response should have field "error" with value "Token has expired"

  Scenario: Request with Content-Type "text/plain" instead of "application/json"
    Given WireMock is configured for "Google" OAuth provider
    When I send a POST request to "/auth/google" with content type "text/plain" and body:
      """
      idToken=valid-google-token&clientId=test-client-id
      """
    Then the response status should be 415
    And the response should have field "errorCode" with value "GTW-105"
    And the response should have field "error" with value "Unsupported media type"

    And the response should have field "path"
    And the response JSON field "timestamp" should be a valid ISO-8601 timestamp
    And the response should have field "requestId"
    And the response headers should contain (auth) "X-Frame-Options"
    And the response headers should contain (auth) "X-Content-Type-Options"
    And the response headers should contain (auth) "Content-Security-Policy"
    And the response headers should contain (auth) "Strict-Transport-Security"
    And the response headers should contain (auth) "Access-Control-Allow-Origin"
    And the response headers should contain (auth) "Access-Control-Allow-Methods"
    And the response headers should contain (auth) "Access-Control-Allow-Headers"


  Scenario: Request with 10MB JSON payload exceeding 1MB limit
    Given WireMock is configured for "Google" OAuth provider
    When I send a POST request to "/auth/google" with a 10MB JSON payload
    Then the response status should be 413
    And the response should have field "errorCode" with value "GTW-104"
    And the response should have field "error" with value "Request payload too large"

  Scenario: Brute force protection after 6 failed authentication attempts with invalid token
    Given WireMock is configured for "Google" OAuth provider with invalid token responses
    And brute force protection is enabled with 5 failed attempts
    When I send 6 POST requests to "/auth/google" with body:
      """
      {
        "idToken": "invalid-google-token",
        "clientId": "test-client-id"
      }
      """
    Then the 6th response status should be 403
    And the 6th response should have field "errorCode" with value "GTW-304"
    And the response should have field "error" with value "Brute force attack detected"
    And the response should have field "details.limitType" with value "BRUTE_FORCE_PROTECTION"

  Scenario: System maintenance mode
    Given the system is in maintenance mode
    When I send a POST request to "/auth/google" with body:
      """
      {
        "idToken": "valid-google-token",
        "clientId": "test-client-id"
      }
      """
    Then the response status should be 503
    And the response should have field "errorCode" with value "GTW-506"
    And the response should have field "error" with value "System is in maintenance mode"

  Scenario: Circuit breaker open for downstream service
    Given the circuit breaker is open for Google OAuth service
    When I send a POST request to "/auth/google" with body:
      """
      {
        "idToken": "valid-google-token",
        "clientId": "test-client-id"
      }
      """
    Then the response status should be 502
    And the response should have field "errorCode" with value "GTW-209"
    And the response should have field "error" with value "Circuit breaker is open for downstream service"
    And the response should have field "details.service" with value "Google OAuth"

  # Mandatory client headers enforcement
  Scenario: Request to /api/auth/me missing required X-Client-Platform header
    When I send a GET request to "/api/auth/me" with headers:
      | Authorization     | Bearer gateway-access-token |
      | X-Client-Version  | 1.0.0                       |
      | X-Device-ID       | device-xyz                  |
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-101"
    And the response should have field "error" with value "Required field is missing"
    And the response JSON field "timestamp" should be a valid ISO-8601 timestamp

  Scenario: Request to /api/auth/me missing required X-Client-Version header
    When I send a GET request to "/api/auth/me" with headers:
      | Authorization        | Bearer gateway-access-token |
      | X-Client-Platform    | ios                         |
      | X-Device-ID          | device-xyz                  |
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-101"
    And the response should have field "error" with value "Required field is missing"
    And the response JSON field "timestamp" should be a valid ISO-8601 timestamp

  Scenario: Request to /api/auth/me missing required X-Device-ID header
    When I send a GET request to "/api/auth/me" with headers:
      | Authorization        | Bearer gateway-access-token |
      | X-Client-Platform    | ios                         |
      | X-Client-Version     | 1.0.0                       |
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-101"
    And the response should have field "error" with value "Required field is missing"
    And the response JSON field "timestamp" should be a valid ISO-8601 timestamp

  Scenario: Request with X-Client-Platform "windows" (must be "ios" or "android")
    When I send a GET request to "/api/auth/me" with headers:
      | Authorization        | Bearer gateway-access-token |
      | X-Client-Platform    | windows                     |
      | X-Client-Version     | 1.0.0                       |
      | X-Device-ID          | device-xyz                  |
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-109"
    And the response should have field "error" with value "Field validation failed"
    And the response should have field "details.invalidHeaders.X-Client-Platform"
    And the response JSON field "timestamp" should be a valid ISO-8601 timestamp

  Scenario: Request with X-Client-Version "v1.0" (must match semver pattern)
    When I send a GET request to "/api/auth/me" with headers:
      | Authorization        | Bearer gateway-access-token |
      | X-Client-Platform    | ios                         |
      | X-Client-Version     | v1.0                        |
      | X-Device-ID          | device-xyz                  |
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-109"
    And the response should have field "error" with value "Field validation failed"
    And the response should have field "details.invalidHeaders.X-Client-Version"
    And the response JSON field "timestamp" should be a valid ISO-8601 timestamp

  Scenario: Request with Accept header "application/xml" (only application/json supported)
    Given WireMock is configured for "Google" OAuth provider
    When I send a POST request to "/auth/google" with headers:
      | Accept | application/xml |
    And body:
      """
      {
        "idToken": "valid-google-token",
        "clientId": "test-client-id"
      }
      """
    Then the response status should be 406
    And the response should have field "errorCode" with value "GTW-112"
    And the response should have field "error" with value "Unsupported Accept header"
    And the response should have field "details.acceptHeader" with value "application/xml"
    And the response JSON field "timestamp" should be a valid ISO-8601 timestamp

