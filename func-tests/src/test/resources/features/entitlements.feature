@entitlements @local @docker @emulator-only
Feature: The gateway knows what a family has paid for
  As the business
  I want RevenueCat to tell the gateway about purchases
  So that paid stories can be checked on the server, not only in the app

  Background:
    Given the gateway service is running
    And I authenticate with Google using a valid ID token

  @smoke
  Scenario: A purchase RevenueCat reports is held against the account
    When RevenueCat reports an "INITIAL_PURCHASE" of "premium_access" for the signed-in account
    Then the response status should be 200
    And the response JSON field "outcome" should be "APPLIED"
    And the export shows the subscription "premium"

  Scenario: An expiry ends the subscription
    Given RevenueCat reports an "INITIAL_PURCHASE" of "basic_access" for the signed-in account
    When RevenueCat reports an "EXPIRATION" of "basic_access" for the signed-in account
    Then the export shows the subscription "free"

  @security
  Scenario: A webhook without RevenueCat's secret is refused
    When a webhook arrives with the secret "not-the-secret"
    Then the response status should be 401

  Scenario: A purchase for someone who is not an account changes nothing
    When RevenueCat reports an "INITIAL_PURCHASE" of "premium_access" for the account "no-such-user"
    Then the response status should be 200
    And the response JSON field "outcome" should be "NO_ACCOUNT"

  Scenario: The gateway counts the stories on the family's devices, and forgets one that is deleted
    Given the story "cms-test-1-snowman-squirrel" is in the catalogue
    When I send an authenticated GET request to "/api/stories/cms-test-1-snowman-squirrel/download"
    Then the response status should be 200
    And the export lists the downloaded story "cms-test-1-snowman-squirrel"
    When the app says "cms-test-1-snowman-squirrel" left the device
    Then the response status should be 204
    And the export does not list the downloaded story "cms-test-1-snowman-squirrel"
