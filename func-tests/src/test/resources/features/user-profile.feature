@user-profile @local @docker @emulator-only
Feature: User Profile Management
  As a user of the Grow with Freya application
  I want to manage my profile settings
  So that I can customize my experience and sync settings across devices

  Background:
    Given the gateway service is running
    And test data is cleaned up for the current user
    And Firebase is configured in WireMock

  @smoke
  Scenario: Create a new user profile
    Given I have a valid access token
    When I send an authenticated POST request to "/api/profile" with body:
      """
      {
        "nickname": "Freya",
        "avatarType": "girl",
        "avatarId": "girl_1",
        "notifications": {
          "enabled": true,
          "storyReminders": true,
          "emotionCheckIns": true,
          "bedtimeReminders": true,
          "soundEnabled": true,
          "vibrationEnabled": false
        },
        "schedule": {
          "storyTime": {
            "time": "19:00",
            "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
          },
          "bedtime": {
            "time": "20:00",
            "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
          },
          "emotionCheckIns": {
            "morning": { "time": "08:00", "enabled": true },
            "afternoon": { "time": "15:00", "enabled": true },
            "evening": { "time": "19:00", "enabled": true }
          }
        }
      }
      """
    Then the response status should be 201
    And the response should have field "userId"
    And the response should have field "nickname" with value "Freya"
    And the response should have field "avatarType" with value "girl"
    And the response should have field "avatarId" with value "girl_1"
    And the response should have field "notifications.enabled" with value "true"
    And the response should have field "createdAt"
    And the response should have field "updatedAt"

  Scenario: Get existing user profile
    Given I have a valid access token
    And a user profile exists
    When I send an authenticated GET request to "/api/profile"
    Then the response status should be 200
    And the response should have field "userId"
    And the response should have field "nickname"
    And the response should have field "avatarType"
    And the response should have field "notifications"
    And the response should have field "schedule"

  Scenario: Update existing user profile
    Given I have a valid access token
    And a user profile exists
    When I send an authenticated POST request to "/api/profile" with body:
      """
      {
        "nickname": "FreyaUpdated",
        "avatarType": "boy",
        "avatarId": "boy_2",
        "notifications": {
          "enabled": false,
          "storyReminders": false,
          "emotionCheckIns": false,
          "bedtimeReminders": false,
          "soundEnabled": false,
          "vibrationEnabled": false
        }
      }
      """
    Then the response status should be 200
    And the response should have field "nickname" with value "FreyaUpdated"
    And the response should have field "avatarType" with value "boy"
    And the response should have field "avatarId" with value "boy_2"
    And the response should have field "notifications.enabled" with value "false"

  @error-handling @emulator-only
  Scenario: Get profile returns 404 when profile does not exist
    Given I have a valid access token
    When I send an authenticated GET request to "/api/profile"
    Then the response status should be 404
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-411"
    And the response should have field "error"
    And the response should have field "message"

  @validation @error-handling
  Scenario: Create profile with nickname exceeding 40 character limit
    Given I have a valid access token
    When I send an authenticated POST request to "/api/profile" with body:
      """
      {
        "nickname": "ThisNicknameIsWayTooLongForValidation",
        "avatarType": "girl",
        "avatarId": "girl_1"
      }
      """
    Then the response status should be 400
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-113"
    And the response should have field "error" with value "Invalid nickname - must be 1-20 characters"
    And the response should have field "message" with value "Nickname must be 1-20 characters"

  @validation @error-handling
  Scenario: Create profile with avatarType "invalid" (must be "boy" or "girl")
    Given I have a valid access token
    When I send an authenticated POST request to "/api/profile" with body:
      """
      {
        "nickname": "Freya",
        "avatarType": "invalid",
        "avatarId": "girl_1"
      }
      """
    Then the response status should be 400
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-114"
    And the response should have field "error" with value "Invalid avatar type - must be 'boy' or 'girl'"
    And the response should have field "message" with value "Avatar type must be 'boy' or 'girl'"

  @validation @error-handling
  Scenario: Create profile missing required avatarType and avatarId fields
    Given I have a valid access token
    When I send an authenticated POST request to "/api/profile" with body:
      """
      {
        "nickname": "Freya"
      }
      """
    Then the response status should be 400
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-114"
    And the response should have field "error" with value "Invalid avatar type - must be 'boy' or 'girl'"
    And the response should have field "message" with value "Avatar type is required"

  @security @error-handling
  Scenario: Unauthorized access without token
    When I send an unauthenticated GET request to "/api/profile"
    Then the response status should be 401
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-007"
    And the response should have field "error" with value "Unauthorized access to resource"
    And the response should have field "message"

