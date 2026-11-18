@account-deletion @emulator-only @local @docker
Feature: Account Deletion
  As a user of the Grow with Freya application
  I want to permanently delete my account and all associated data
  So that I can exercise my right to data removal

  Background:
    Given the gateway service is running
    And Firebase is configured in WireMock
    And WireMock is configured for "Google" OAuth provider

  # --- Happy Path ---

  @smoke
  Scenario: Successfully delete account with valid authentication
    Given a valid "Google" OAuth token
    When I make an authenticated DELETE request to "/api/account" with token "valid-google-token"
    Then the response status code should be 200
    And the response should contain JSON field "status"
    And the response JSON field "status" should be "deleted"
    And the response should contain JSON field "message"

  # --- Unhappy Paths ---

  Scenario: Reject unauthenticated account deletion request
    When I make a DELETE request to "/api/account"
    Then the response status code should be 401
    And the response should contain JSON field "error"

  Scenario: Account deletion returns 404 for a signed-in user with no account record
    When I make an authenticated DELETE request to "/api/account" with token "valid-never-signed-up"
    Then the response status code should be 404
    And the response JSON field "errorCode" should be "GTW-400"
    And the response JSON field "success" should be boolean "false"
