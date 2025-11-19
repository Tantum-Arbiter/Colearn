Feature: Authentication
  As a user of the Grow with Freya application
  I want to authenticate using OAuth providers
  So that I can securely access the application

  Background:
    Given the gateway service is running
    And Firebase is configured in WireMock

  Scenario: Successful Google OAuth authentication
    Given WireMock is configured for "Google" OAuth provider
    And a valid "Google" OAuth token
    When I authenticate with the OAuth token
    And I call the "/api/auth/me" endpoint
    Then the response status should be 200
    And the response should have field "email"
    And the response should have field "name"
    And WireMock should have received 1 request(s) to "/oauth2/v2/userinfo"

  Scenario: Successful Apple OAuth authentication
    Given WireMock is configured for "Apple" OAuth provider
    And a valid "Apple" OAuth token
    When I authenticate with the OAuth token
    And I call the "/api/auth/me" endpoint
    Then the response status should be 200
    And the response should have field "email"
    And the response should have field "name"

  Scenario: Authentication with invalid token
    Given WireMock is configured for "Google" OAuth provider
    And an invalid OAuth token
    When I authenticate with the OAuth token
    And I call the "/api/auth/me" endpoint
    Then the response status should be 401
    And the response should contain "Unauthorized"

  Scenario: User registration with Google OAuth
    Given WireMock is configured for "Google" OAuth provider
    And a valid "Google" OAuth token
    When I authenticate with the OAuth token
    And I call the "/api/auth/register" endpoint with POST
    Then the response status should be 201
    And the response should have field "userId"
    And the response should have field "email"
    And the response should have field "createdAt"

  Scenario: User login creates session
    Given WireMock is configured for "Google" OAuth provider
    And a valid "Google" OAuth token
    When I authenticate with the OAuth token
    And I call the "/api/auth/login" endpoint with POST
    Then the response status should be 200
    And the response should have field "accessToken"
    And the response should have field "refreshToken"
    And the response should have field "expiresIn"

  Scenario: Access protected endpoint without authentication
    When I call the "/api/users/profile" endpoint
    Then the response status should be 401
    And the response should contain "Authentication required"

  Scenario: Refresh token functionality
    Given WireMock is configured for "Google" OAuth provider
    And a valid "Google" OAuth token
    When I authenticate with the OAuth token
    And I call the "/api/auth/login" endpoint with POST
    And I call the "/api/auth/refresh" endpoint with body:
      """
      {
        "refreshToken": "valid-refresh-token"
      }
      """
    Then the response status should be 200
    And the response should have field "accessToken"
    And the response should have field "expiresIn"

  Scenario: Logout invalidates session
    Given WireMock is configured for "Google" OAuth provider
    And a valid "Google" OAuth token
    When I authenticate with the OAuth token
    And I call the "/api/auth/login" endpoint with POST
    And I call the "/api/auth/logout" endpoint with POST
    Then the response status should be 200
    And the response should contain "Successfully logged out"
