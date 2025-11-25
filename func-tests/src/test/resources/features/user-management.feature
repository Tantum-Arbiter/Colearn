@user-management @emulator-only @local @docker
Feature: User Management
  As a user of the Grow with Freya application
  I want to manage my user profile and children
  So that I can personalize the application experience

  Background:
    Given the gateway service is running
    And Firebase is configured in WireMock
    And WireMock is configured for "Google" OAuth provider

  @smoke
  Scenario: Get user profile with valid authentication
    Given a valid "Google" OAuth token
    When I make an authenticated GET request to "/api/users/profile" with token "valid-google-token"
    Then the response status code should be 200
    And the response should contain JSON field "id"
    And the response should contain JSON field "email"
    And the response should contain JSON field "createdAt"

  Scenario: Update user profile
    Given a valid "Google" OAuth token
    When I make an authenticated POST request to "/api/users/profile" with token "valid-google-token" and body:
      """
      {
        "displayName": "Updated Test User",
        "preferences": {
          "notifications": {
            "email": true,
            "push": false
          },
          "privacy": {
            "shareData": false
          }
        }
      }
      """
    Then the response status code should be 200
    And the response JSON field "displayName" should be "Updated Test User"
    And the response JSON field "preferences.notifications.email" should be boolean "true"
    And the response JSON field "preferences.notifications.push" should be boolean "false"

  Scenario: Add child profile
    Given a valid "Google" OAuth token
    When I make an authenticated POST request to "/api/users/children" with token "valid-google-token" and body:
      """
      {
        "name": "Little Freya",
        "avatar": "bear",
        "preferences": {
          "favoriteStories": ["bedtime", "adventure"],
          "screenTimeLimit": 30
        }
      }
      """
    Then the response status code should be 201
    And the response should contain JSON field "id"
    And the response JSON field "name" should be "Little Freya"
    And the response JSON field "avatar" should be "bear"
    And the response JSON field "preferences.screenTimeLimit" should be 30

  Scenario: Get children list
    Given a valid "Google" OAuth token
    When I make an authenticated GET request to "/api/users/children" with token "valid-google-token"
    Then the response status code should be 200
    And the response should contain JSON field "children"

  Scenario: Update child profile
    Given a valid "Google" OAuth token
    When I make an authenticated POST request to "/api/users/children/child-123" with token "valid-google-token" and body:
      """
      {
        "name": "Updated Child Name",
        "preferences": {
          "favoriteStories": ["bedtime", "educational"],
          "screenTimeLimit": 45
        }
      }
      """
    Then the response status code should be 200
    And the response JSON field "name" should be "Updated Child Name"
    And the response JSON field "preferences.screenTimeLimit" should be 45

  Scenario: Delete child profile
    Given a valid "Google" OAuth token
    When I make an authenticated POST request to "/api/users/children/child-123/delete" with token "valid-google-token" and body:
      """
      {}
      """
    Then the response status code should be 200
    And the response should contain "Child profile deleted successfully" in the body

  Scenario: Get user preferences
    Given a valid "Google" OAuth token
    When I make an authenticated GET request to "/api/users/preferences" with token "valid-google-token"
    Then the response status code should be 200
    And the response should contain JSON field "notifications"
    And the response should contain JSON field "privacy"
    And the response should contain JSON field "screenTime"

  Scenario: Update user preferences
    Given a valid "Google" OAuth token
    When I make an authenticated POST request to "/api/users/preferences" with token "valid-google-token" and body:
      """
      {
        "notifications": {
          "email": false,
          "push": true,
          "reminders": true
        },
        "privacy": {
          "shareData": false,
          "analytics": true
        },
        "screenTime": {
          "dailyLimit": 60,
          "bedtimeMode": true,
          "bedtimeStart": "19:00"
        },
        "audio": {
          "backgroundMusic": true,
          "soundEffects": true,
          "volume": 0.7
        }
      }
      """
    Then the response status code should be 200
    And the response JSON field "notifications.email" should be boolean "false"
    And the response JSON field "notifications.push" should be boolean "true"
    And the response JSON field "screenTime.dailyLimit" should be 60
    And the response JSON field "audio.volume" should be 0.7

  @security @error-handling
  Scenario: Access user data without authentication fails
    When I make a GET request to "/api/users/profile"
    Then the response status code should be 401
    And the response should contain "Authentication required" in the body

  @security @error-handling
  Scenario: Access another user's data fails
    Given a valid "Google" OAuth token
    When I make an authenticated GET request to "/api/users/other-user-id/profile" with token "valid-google-token"
    Then the response status code should be 403
    And the response should contain "Access denied" in the body
