@cross-device-sync @gcp-dev @local @docker
Feature: Cross-Device Data Synchronization
  As a user with multiple devices
  I want my profile and settings to sync automatically
  So that I have a consistent experience across all my devices

  Background:
    Given the gateway service is running
    And test data is cleaned up for the current user
    And the Firestore emulator is available

  @authentication @user-profile
  Scenario: User logs in on Device A, updates profile, then logs in on Device B
    # Device A - Initial login
    Given I authenticate with Google using a valid ID token for device "device-a"
    And I store the access token as "device_a_access_token"
    And I store the refresh token as "device_a_refresh_token"

    # Device A - Create profile
    When I use the access token "device_a_access_token"
    And I create a user profile with:
      | nickname   | TestUser     |
      | avatarType | girl         |
      | avatarId   | girl-1       |
    Then the response status should be 201
    And the response should contain field "userId"
    And the response should contain field "nickname" with value "TestUser"

    # Device A - Update profile settings
    When I use the access token "device_a_access_token"
    And I update the user profile with:
      | nickname   | UpdatedUser  |
      | avatarType | boy          |
      | avatarId   | boy-2        |
    Then the response status should be 200
    And the response should contain field "nickname" with value "UpdatedUser"
    And the response should contain field "avatarType" with value "boy"

    # Device B - Login with same user
    When I authenticate with Google using the same ID token for device "device-b"
    Then the response status should be 200
    And I store the access token as "device_b_access_token"

    # Device B - Verify profile synced
    When I use the access token "device_b_access_token"
    And I get the user profile
    Then the response status should be 200
    And the response should contain field "nickname" with value "UpdatedUser"
    And the response should contain field "avatarType" with value "boy"
    And the response should contain field "avatarId" with value "boy-2"

  @authentication @token-refresh @user-profile
  Scenario: Token refresh returns updated profile data for automatic sync
    # Initial login
    Given I authenticate with Google using a valid ID token for device "device-a"
    And I store the access token as "access_token"
    And I store the refresh token as "refresh_token"

    # Create profile
    When I use the access token "access_token"
    And I create a user profile with:
      | nickname   | OriginalUser |
      | avatarType | girl         |
      | avatarId   | girl-1       |
    Then the response status should be 201

    # Update profile (simulating change from another device)
    When I use the access token "access_token"
    And I update the user profile with:
      | nickname   | SyncedUser   |
      | avatarType | boy          |
      | avatarId   | boy-3        |
    Then the response status should be 200

    # Refresh token - should include updated profile
    When I refresh the access token using "refresh_token"
    Then the response status should be 200
    And the response should contain field "success" with value "true"
    And the response should contain field "tokens"
    And the response should contain field "profile"
    And the response field "profile.nickname" should be "SyncedUser"
    And the response field "profile.avatarType" should be "boy"
    And the response field "profile.avatarId" should be "boy-3"

  @authentication @token-refresh @user-profile
  Scenario: Token refresh without profile returns null profile field
    # Login without creating profile
    Given I authenticate with Google using a valid ID token for device "device-a"
    And I store the refresh token as "refresh_token"

    # Refresh token - should have null profile
    When I refresh the access token using "refresh_token"
    Then the response status should be 200
    And the response should contain field "success" with value "true"
    And the response should contain field "tokens"
    And the response field "profile" should be null

  @authentication @user-profile @settings
  Scenario: User updates settings on Device A, token refresh on Device B returns updated settings
    # Device A - Login and create profile with settings
    Given I authenticate with Google using a valid ID token for device "device-a"
    And I store the access token as "device_a_access_token"
    And I store the refresh token as "device_a_refresh_token"

    When I use the access token "device_a_access_token"
    And I create a user profile with:
      | nickname                      | TestUser |
      | avatarType                    | girl     |
      | avatarId                      | girl-1   |
      | notifications.screenTimeEnabled | true   |
      | notifications.smartRemindersEnabled | false |
      | schedule.childAgeRange        | 2-6y     |
    Then the response status should be 201

    # Device B - Login with same user
    When I authenticate with Google using the same ID token for device "device-b"
    And I store the access token as "device_b_access_token"
    And I store the refresh token as "device_b_refresh_token"
    Then the response status should be 200

    # Device A - Update settings
    When I use the access token "device_a_access_token"
    And I update the user profile with:
      | nickname                      | TestUser |
      | avatarType                    | girl     |
      | avatarId                      | girl-1   |
      | notifications.screenTimeEnabled | false  |
      | notifications.smartRemindersEnabled | true |
      | schedule.childAgeRange        | 6+       |
    Then the response status should be 200

    # Device B - Refresh token and verify updated settings
    When I refresh the access token using "device_b_refresh_token"
    Then the response status should be 200
    And the response field "profile.notifications.screenTimeEnabled" should be "false"
    And the response field "profile.notifications.smartRemindersEnabled" should be "true"
    And the response field "profile.schedule.childAgeRange" should be "6+"

  @authentication @logout @user-profile
  Scenario: User logs out and logs back in, profile data persists
    # Initial login
    Given I authenticate with Google using a valid ID token for device "device-a"
    And I store the access token as "access_token"
    And I store the refresh token as "refresh_token"

    # Create profile
    When I use the access token "access_token"
    And I create a user profile with:
      | nickname   | PersistentUser |
      | avatarType | boy            |
      | avatarId   | boy-1          |
      | notifications.screenTimeEnabled | true |
      | schedule.childAgeRange | 2-6y |
    Then the response status should be 201

    # Logout
    When I revoke the refresh token "refresh_token"
    Then the response status should be 200
    And the response should contain field "success" with value "true"

    # Login again with same user
    When I authenticate with Google using the same ID token for device "device-a"
    And I store the access token as "new_access_token"
    Then the response status should be 200

    # Verify profile still exists
    When I use the access token "new_access_token"
    And I get the user profile
    Then the response status should be 200
    And the response should contain field "nickname" with value "PersistentUser"
    And the response should contain field "avatarType" with value "boy"
    And the response field "notifications.screenTimeEnabled" should be "true"
    And the response field "schedule.childAgeRange" should be "2-6y"

  @authentication @concurrent @user-profile
  Scenario: User logs in on multiple devices simultaneously
    # Device A - Login
    Given I authenticate with Google using a valid ID token for device "device-a"
    And I store the access token as "device_a_access_token"
    And I store the refresh token as "device_a_refresh_token"

    # Device B - Login with same user (concurrent session)
    When I authenticate with Google using the same ID token for device "device-b"
    And I store the access token as "device_b_access_token"
    And I store the refresh token as "device_b_refresh_token"
    Then the response status should be 200

    # Device C - Login with same user (another concurrent session)
    When I authenticate with Google using the same ID token for device "device-c"
    And I store the access token as "device_c_access_token"
    And I store the refresh token as "device_c_refresh_token"
    Then the response status should be 200

    # Device A - Create profile
    When I use the access token "device_a_access_token"
    And I create a user profile with:
      | nickname   | MultiDeviceUser |
      | avatarType | girl            |
      | avatarId   | girl-2          |
    Then the response status should be 201

    # Device B - Verify profile accessible
    When I use the access token "device_b_access_token"
    And I get the user profile
    Then the response status should be 200
    And the response should contain field "nickname" with value "MultiDeviceUser"

    # Device C - Verify profile accessible
    When I use the access token "device_c_access_token"
    And I get the user profile
    Then the response status should be 200
    And the response should contain field "nickname" with value "MultiDeviceUser"

    # Device B - Update profile
    When I use the access token "device_b_access_token"
    And I update the user profile with:
      | nickname   | UpdatedMultiUser |
      | avatarType | boy              |
      | avatarId   | boy-3            |
    Then the response status should be 200

    # Device A - Refresh and verify update
    When I refresh the access token using "device_a_refresh_token"
    Then the response status should be 200
    And the response field "profile.nickname" should be "UpdatedMultiUser"
    And the response field "profile.avatarType" should be "boy"

    # Device C - Refresh and verify update
    When I refresh the access token using "device_c_refresh_token"
    Then the response status should be 200
    And the response field "profile.nickname" should be "UpdatedMultiUser"
    And the response field "profile.avatarType" should be "boy"

  @authentication @user-profile @reminders
  Scenario: User creates reminders on Device A, then logs in on Device B and sees synced reminders
    # Device A - Login and create profile
    Given I authenticate with Google using a valid ID token for device "device-a"
    And I store the access token as "device_a_access_token"
    And I store the refresh token as "device_a_refresh_token"

    When I use the access token "device_a_access_token"
    And I create a user profile with:
      | nickname   | ReminderUser |
      | avatarType | girl         |
      | avatarId   | girl-1       |
    Then the response status should be 201

    # Device A - Add custom reminders to profile
    When I use the access token "device_a_access_token"
    And I update the user profile with custom reminders:
      | id                          | title                | message                    | dayOfWeek | time  | isActive |
      | reminder_1                  | Morning Story        | Time for a morning story   | 1         | 08:00 | true     |
      | reminder_2                  | Bedtime Routine      | Time to get ready for bed  | 1         | 19:30 | true     |
      | reminder_3                  | Emotion Check        | How are you feeling?       | 3         | 15:00 | false    |
    Then the response status should be 200

    # Device A - Verify reminders were saved
    When I use the access token "device_a_access_token"
    And I get the user profile
    Then the response status should be 200
    And the response field "schedule.customReminders" should be an array with 3 items
    And the custom reminder at index 0 should have field "title" with value "Morning Story"
    And the custom reminder at index 1 should have field "title" with value "Bedtime Routine"
    And the custom reminder at index 2 should have field "isActive" with value "false"

    # Device B - Login with same user
    When I authenticate with Google using the same ID token for device "device-b"
    And I store the access token as "device_b_access_token"
    Then the response status should be 200

    # Device B - Verify reminders synced
    When I use the access token "device_b_access_token"
    And I get the user profile
    Then the response status should be 200
    And the response field "schedule.customReminders" should be an array with 3 items
    And the custom reminder at index 0 should have field "title" with value "Morning Story"
    And the custom reminder at index 0 should have field "dayOfWeek" with value "1"
    And the custom reminder at index 0 should have field "time" with value "08:00"
    And the custom reminder at index 0 should have field "isActive" with value "true"
    And the custom reminder at index 1 should have field "title" with value "Bedtime Routine"
    And the custom reminder at index 2 should have field "title" with value "Emotion Check"
    And the custom reminder at index 2 should have field "isActive" with value "false"

  @authentication @user-profile @reminders
  Scenario: User updates reminders on Device A, Device B sees changes after token refresh
    # Device A - Login and create profile with reminders
    Given I authenticate with Google using a valid ID token for device "device-a"
    And I store the access token as "device_a_access_token"
    And I store the refresh token as "device_a_refresh_token"

    When I use the access token "device_a_access_token"
    And I create a user profile with:
      | nickname   | ReminderUser |
      | avatarType | girl         |
      | avatarId   | girl-1       |
    Then the response status should be 201

    When I use the access token "device_a_access_token"
    And I update the user profile with custom reminders:
      | id         | title         | message              | dayOfWeek | time  | isActive |
      | reminder_1 | Morning Story | Time for a story     | 1         | 08:00 | true     |
    Then the response status should be 200

    # Device B - Login with same user
    When I authenticate with Google using the same ID token for device "device-b"
    And I store the access token as "device_b_access_token"
    And I store the refresh token as "device_b_refresh_token"
    Then the response status should be 200

    # Device B - Verify initial reminder
    When I use the access token "device_b_access_token"
    And I get the user profile
    Then the response status should be 200
    And the response field "schedule.customReminders" should be an array with 1 items
    And the custom reminder at index 0 should have field "title" with value "Morning Story"

    # Device A - Update reminders (add new one and modify existing)
    When I use the access token "device_a_access_token"
    And I update the user profile with custom reminders:
      | id         | title              | message                  | dayOfWeek | time  | isActive |
      | reminder_1 | Morning Story Time | Updated story time       | 1         | 08:30 | true     |
      | reminder_2 | Afternoon Snack    | Time for a healthy snack | 1         | 15:00 | true     |
    Then the response status should be 200

    # Device B - Refresh token and verify updated reminders
    When I refresh the access token using "device_b_refresh_token"
    Then the response status should be 200
    And the response field "profile.schedule.customReminders" should be an array with 2 items
    And the custom reminder in profile at index 0 should have field "title" with value "Morning Story Time"
    And the custom reminder in profile at index 0 should have field "time" with value "08:30"
    And the custom reminder in profile at index 1 should have field "title" with value "Afternoon Snack"

  @authentication @user-profile @reminders @settings
  Scenario: Updating reminders preserves notification settings
    # Login and create profile with notification settings
    Given I authenticate with Google using a valid ID token for device "device-a"
    And I store the access token as "access_token"

    When I use the access token "access_token"
    And I create a user profile with:
      | nickname                            | TestUser |
      | avatarType                          | girl     |
      | avatarId                            | girl-1   |
      | notifications.screenTimeEnabled     | true     |
      | notifications.smartRemindersEnabled | true     |
      | schedule.childAgeRange              | 2-6y     |
    Then the response status should be 201

    # Verify initial settings
    When I use the access token "access_token"
    And I get the user profile
    Then the response status should be 200
    And the response field "notifications.screenTimeEnabled" should be "true"
    And the response field "notifications.smartRemindersEnabled" should be "true"
    And the response field "schedule.childAgeRange" should be "2-6y"

    # Update reminders
    When I use the access token "access_token"
    And I update the user profile with custom reminders:
      | id         | title         | message          | dayOfWeek | time  | isActive |
      | reminder_1 | Morning Story | Time for a story | 1         | 08:00 | true     |
    Then the response status should be 200

    # Verify reminders were added AND notification settings were preserved
    When I use the access token "access_token"
    And I get the user profile
    Then the response status should be 200
    And the response field "schedule.customReminders" should be an array with 1 items
    And the custom reminder at index 0 should have field "title" with value "Morning Story"
    And the response field "notifications.screenTimeEnabled" should be "true"
    And the response field "notifications.smartRemindersEnabled" should be "true"
    And the response field "schedule.childAgeRange" should be "2-6y"
