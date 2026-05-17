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

  Scenario: Account deletion returns 404 when user not found
    Given a valid "Google" OAuth token
    And the account deletion service returns user not found
    When I make an authenticated DELETE request to "/api/account" with token "valid-google-token"
    Then the response status code should be 404
    And the response should contain JSON field "error"
    And the response JSON field "success" should be boolean "false"

  Scenario: Account deletion returns 409 when deletion already in progress
    Given a valid "Google" OAuth token
    And the account deletion service returns deletion already in progress
    When I make an authenticated DELETE request to "/api/account" with token "valid-google-token"
    Then the response status code should be 409
    And the response should contain JSON field "error"
    And the response JSON field "success" should be boolean "false"
    And the response JSON field "errorCode" should be "ACC-002"

  Scenario: Account deletion returns 500 on internal failure
    Given a valid "Google" OAuth token
    And the account deletion service returns an internal failure
    When I make an authenticated DELETE request to "/api/account" with token "valid-google-token"
    Then the response status code should be 500
    And the response should contain JSON field "error"
    And the response JSON field "success" should be boolean "false"
