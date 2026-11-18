@entitlements @local @docker @emulator-only
Feature: The gateway knows what a family has paid for
  As the business
  I want the gateway to check subscriptions with RevenueCat itself
  So that paid stories are protected on the server, not only in the app

  Background:
    Given the gateway service is running
    And I authenticate with Google using a valid ID token

  @smoke
  Scenario: After a purchase the app asks for a refresh, and the gateway checks with RevenueCat
    When the app asks the gateway to refresh the subscription
    Then the response status should be 200
    And the response JSON field "tier" should be "premium"
    And the response JSON field "source" should be "revenuecat"
    And the export shows the subscription "premium"

  Scenario: A second refresh straight after the first does not ask RevenueCat again
    Given the app asks the gateway to refresh the subscription
    When the app asks the gateway to refresh the subscription
    Then the response status should be 200
    And the response JSON field "source" should be "cache"

  @security
  Scenario: The app cannot tell the gateway which plan it is on
    When the app asks the gateway to refresh the subscription with body:
      """
      {"tier":"free","expiresAt":"2000-01-01T00:00:00Z"}
      """
    Then the response status should be 200
    And the response JSON field "tier" should be "premium"

  @security
  Scenario: A refresh without signing in is refused
    When I send an unauthenticated POST request to "/api/entitlements/refresh"
    Then the response status should be 401

  Scenario: The gateway counts the stories on the family's devices, and forgets one that is deleted
    Given the story "cms-test-1-snowman-squirrel" is in the catalogue
    When I send an authenticated GET request to "/api/stories/cms-test-1-snowman-squirrel/download"
    Then the response status should be 200
    And the export lists the downloaded story "cms-test-1-snowman-squirrel"
    When the app says "cms-test-1-snowman-squirrel" left the device
    Then the response status should be 204
    And the export does not list the downloaded story "cms-test-1-snowman-squirrel"
