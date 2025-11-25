Feature: User Management Unhappy Cases
  As a system administrator
  I want to ensure the user management system handles error scenarios gracefully
  So that users receive appropriate error messages and data integrity is maintained

  Background:
    Given the gateway service is running
    And Firebase is configured in WireMock
    And WireMock is configured for "Google" OAuth provider
    And I have a valid authentication token

  Scenario: Get user profile returns 404 when user not found in Firebase
    Given WireMock is configured to return 404 for user profile requests
    When I send a GET request to "/api/users/profile" with valid authentication
    Then the response status should be 404
    And the response should have field "errorCode" with value "GTW-400"
    And the response should have field "error" with value "User not found"
    And the response should have field "success" with value "false"

  Scenario: Update user profile with email "invalid-email-format" and empty name
    When I send a POST request to "/api/users/profile" with body:
      """
      {
        "email": "invalid-email-format",
        "name": ""
      }
      """
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-107"
    And the response should have field "error" with value "Invalid email address format"
    And the response should have field "details.field" with value "email"

  Scenario: Update user profile missing required email field
    When I send a POST request to "/api/users/profile" with body:
      """
      {
        "name": "Test User"
      }
      """
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-101"
    And the response should have field "error" with value "Required field is missing"
    And the response should contain "email"

  Scenario: Update user profile when Firebase returns 503 service unavailable
    Given WireMock is configured to return 503 for Firebase user update endpoints
    When I send a POST request to "/api/users/profile" with body:
      """
      {
        "email": "test@example.com",
        "name": "Test User"
      }
      """
    Then the response status should be 502
    And the response should have field "errorCode" with value "GTW-201"
    And the response should have field "error" with value "Firebase service unavailable"

  Scenario: Create child profile with ageRange "invalid-range" (must be valid range)
    When I send a POST request to "/api/users/children" with body:
      """
      {
        "name": "Test Child",
        "ageRange": "invalid-range",
        "avatar": "bear"
      }
      """
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-405"
    And the response should have field "error" with value "Invalid child profile data"
    And the response should have field "details.field" with value "ageRange"

  Scenario: Create 6th child profile when user already has 5 (exceeds limit)
    Given the user already has 5 child profiles
    When I send a POST request to "/api/users/children" with body:
      """
      {
        "name": "Test Child",
        "ageRange": "2-3",
        "avatar": "bear"
      }
      """
    Then the response status should be 409
    And the response should have field "errorCode" with value "GTW-404"
    And the response should have field "error" with value "Maximum number of child profiles exceeded"
    And the response should have field "details.maxAllowed" with value 5

  Scenario: Update child profile with ID "non-existent-id" not found in database
    When I send a POST request to "/api/users/children/non-existent-id" with body:
      """
      {
        "name": "Updated Child",
        "avatar": "cat"
      }
      """
    Then the response status should be 404
    And the response should have field "errorCode" with value "GTW-403"
    And the response should have field "error" with value "Child profile not found"

  Scenario: Delete child profile with ID "non-existent-id" not found in database
    When I send a POST request to "/api/users/children/non-existent-id/delete"
    Then the response status should be 404
    And the response should have field "errorCode" with value "GTW-403"
    And the response should have field "error" with value "Child profile not found"

  Scenario: Access another user's profile
    Given I have a valid authentication token for user "user1@example.com"
    When I send a GET request to "/api/users/user2@example.com/profile"
    Then the response status should be 403
    And the response should have field "errorCode" with value "GTW-008"
    And the response should have field "error" with value "Insufficient permissions for this operation"

  Scenario: Update preferences with invalid values
    When I send a POST request to "/api/users/preferences" with body:
      """
      {
        "language": "invalid-language-code",
        "timezone": "invalid-timezone",
        "theme": "non-existent-theme"
      }
      """
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-109"
    And the response should have field "error" with value "Field validation failed"
    And the response should have field "details.language" containing "Invalid language code"

  Scenario: Database connection error during user operation
    Given WireMock is configured to simulate database connection errors
    When I send a GET request to "/api/users/profile"
    Then the response status should be 500
    And the response should have field "errorCode" with value "GTW-501"
    And the response should have field "error" with value "Database operation failed"

  Scenario: Firebase quota exceeded during user creation
    Given WireMock is configured to return quota exceeded errors
    When I send a POST request to "/api/users/profile" with body:
      """
      {
        "email": "newuser@example.com",
        "name": "New User"
      }
      """
    Then the response status should be 502
    And the response should have field "errorCode" with value "GTW-206"
    And the response should have field "error" with value "Firebase quota exceeded"
    And the response should have field "details.service" with value "Firebase"

  Scenario: Concurrent modification conflict
    Given WireMock is configured to simulate concurrent modification conflicts
    When I send a POST request to "/api/users/profile" with body:
      """
      {
        "email": "test@example.com",
        "name": "Updated Name",
        "version": 1
      }
      """
    Then the response status should be 409
    And the response should have field "errorCode" with value "GTW-402"
    And the response should have field "error" with value "Failed to update user profile"
    And the response should contain "concurrent modification"

  Scenario: Account deactivated access attempt
    Given the user account is deactivated
    When I send a GET request to "/api/users/profile" with valid authentication
    Then the response status should be 403
    And the response should have field "errorCode" with value "GTW-407"
    And the response should have field "error" with value "User account has been deactivated"

  Scenario: Email not verified access attempt
    Given the user's email is not verified
    When I send a POST request to "/api/users/children" with body:
      """
      {
        "name": "Test Child",
        "ageRange": "2-3",
        "avatar": "bear"
      }
      """
    Then the response status should be 403
    And the response should have field "errorCode" with value "GTW-408"
    And the response should have field "error" with value "Email address not verified"

  Scenario: Incomplete profile access attempt
    Given the user profile is incomplete
    When I send a POST request to "/api/users/children" with body:
      """
      {
        "name": "Test Child",
        "ageRange": "2-3",
        "avatar": "bear"
      }
      """
    Then the response status should be 409
    And the response should have field "errorCode" with value "GTW-409"
    And the response should have field "error" with value "User profile is incomplete"

  Scenario: System overloaded during user operation
    Given the system is overloaded
    When I send a GET request to "/api/users/profile"
    Then the response status should be 503
    And the response should have field "errorCode" with value "GTW-509"
    And the response should have field "error" with value "System is currently overloaded"

  Scenario: Invalid JSON in child profile creation
    When I send a POST request to "/api/users/children" with malformed JSON:
      """
      {
        "name": "Test Child",
        "ageRange": "2-3",
        "avatar": "bear"
      """
    Then the response status should be 400
    And the response should have field "errorCode" with value "GTW-106"
    And the response should have field "error" with value "Malformed JSON in request body"

  Scenario: Request timeout during profile update
    Given WireMock is configured with 10 second delay for user update endpoints
    And the gateway service has a 5 second timeout
    When I send a POST request to "/api/users/profile" with body:
      """
      {
        "email": "test@example.com",
        "name": "Test User"
      }
      """
    Then the response status should be 504
    And the response should have field "errorCode" with value "GTW-504"
    And the response should have field "error" with value "Request timeout"

  Scenario: User management rate limiting
    Given rate limiting is enabled for user management endpoints
    When I send 20 GET requests to "/api/users/profile" within 1 minute
    Then the 21st response status should be 429
    And the 21st response should have field "errorCode" with value "GTW-301"
    And the response should have field "error" with value "Too many requests from this client"
    And the response should have field "details.limitType" with value "API_RATE_LIMIT"
