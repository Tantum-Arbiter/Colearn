@gcp-dev @gcp-firestore @gcp-func-only
Feature: GCP Firestore Integration
  As a developer
  I want to verify the gateway integrates correctly with GCP Firestore
  So that I can ensure data persistence works in the cloud environment

  Background:
    Given the gateway service is running

  @smoke
  Scenario: Firebase authentication creates user in Firestore
    Given I have a valid Firebase ID token
    When I authenticate with Firebase
    Then the response status should be 200
    And the response should have field "tokens.accessToken"
    And the response should have field "tokens.refreshToken"
    And the response should have field "user.id"

  @smoke
  Scenario: Create and retrieve user profile in Firestore
    Given I have a valid access token
    When I send an authenticated POST request to "/api/profile" with body:
      """
      {
        "nickname": "GcpTestUser",
        "avatarType": "girl",
        "avatarId": "girl_1",
        "notifications": {
          "enabled": true,
          "storyReminders": true,
          "emotionCheckIns": true,
          "bedtimeReminders": true,
          "soundEnabled": true,
          "vibrationEnabled": false
        }
      }
      """
    Then the response status should be 200 or 201
    And the response should have field "userId"
    And the response should have field "nickname" with value "GcpTestUser"
    And the response should have field "avatarType" with value "girl"
    And the response should have field "createdAt"
    When I send an authenticated GET request to "/api/profile"
    Then the response status should be 200
    And the response should have field "nickname" with value "GcpTestUser"

  Scenario: Update user profile persists to Firestore
    Given I have a valid access token
    And a user profile exists
    When I send an authenticated POST request to "/api/profile" with body:
      """
      {
        "nickname": "UpdatedGcpUser",
        "avatarType": "boy",
        "avatarId": "boy_2"
      }
      """
    Then the response status should be 200
    And the response should have field "nickname" with value "UpdatedGcpUser"
    And the response should have field "avatarType" with value "boy"
    When I send an authenticated GET request to "/api/profile"
    Then the response status should be 200
    And the response should have field "nickname" with value "UpdatedGcpUser"

  @security
  Scenario: Protected endpoints require authentication
    When I send an unauthenticated GET request to "/api/profile"
    Then the response status should be 401
    And the response should have field "success" with value "false"
    And the response should have field "errorCode" with value "GTW-007"

