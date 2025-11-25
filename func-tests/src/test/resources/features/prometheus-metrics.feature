@metrics @prometheus @local @docker @gcp-dev
Feature: Prometheus Metrics for Token and Profile Operations

  Background:
    Given the gateway service is running
    And the Firestore emulator is available

  @token-metrics
  Scenario: Token refresh increments Prometheus metrics
    Given I authenticate with Google using a valid ID token
    And I store the access token as "device_a_access_token"
    And I store the refresh token as "device_a_refresh_token"
    When I refresh the access token using "device_a_refresh_token"
    Then the response status should be 200
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "app_tokens_refresh_total" in the body
    And the response should contain "app_tokens_refresh_time" in the body

  @token-metrics
  Scenario: Token revocation increments Prometheus metrics
    Given I authenticate with Google using a valid ID token
    And I store the refresh token as "device_a_refresh_token"
    When I revoke the refresh token "device_a_refresh_token"
    Then the response status should be 200
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "app_tokens_revocation_total" in the body

  @profile-metrics
  Scenario: Profile creation increments Prometheus metrics
    Given I authenticate with Google using a valid ID token
    And I store the access token as "device_a_access_token"
    When I use the access token "device_a_access_token"
    And I create a user profile with:
      | nickname   | MetricsTestUser |
      | avatarType | boy             |
      | avatarId   | boy_1           |
    Then the response status should be 201
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "app_user_profiles_total" in the body
    And the response should contain 'operation="created"' in the body
    And the response should contain "app_user_profiles_time" in the body

  @profile-metrics
  Scenario: Profile update increments Prometheus metrics
    Given I authenticate with Google using a valid ID token
    And I store the access token as "device_a_access_token"
    When I use the access token "device_a_access_token"
    And I create a user profile with:
      | nickname   | OriginalUser |
      | avatarType | boy          |
      | avatarId   | boy_1        |
    Then the response status should be 201
    When I use the access token "device_a_access_token"
    And I update the user profile with:
      | nickname   | UpdatedUser |
      | avatarType | girl        |
      | avatarId   | girl_1      |
    Then the response status should be 200
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "app_user_profiles_total" in the body
    And the response should contain 'operation="updated"' in the body
    And the response should contain "app_user_profiles_time" in the body

  @profile-metrics
  Scenario: Profile retrieval increments Prometheus metrics
    Given I authenticate with Google using a valid ID token
    And I store the access token as "device_a_access_token"
    When I use the access token "device_a_access_token"
    And I create a user profile with:
      | nickname   | RetrievalTestUser |
      | avatarType | boy               |
      | avatarId   | boy_1             |
    Then the response status should be 201
    When I use the access token "device_a_access_token"
    And I get the user profile
    Then the response status should be 200
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "app_user_profiles_total" in the body
    And the response should contain 'operation="retrieved"' in the body
    And the response should contain "app_user_profiles_time" in the body

  @authentication-metrics
  Scenario: Authentication increments Prometheus metrics
    Given I authenticate with Google using a valid ID token
    Then the response status should be 200
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "app_authentication_total" in the body
    And the response should contain "app_authentication_time" in the body

  @metrics-tags
  Scenario: Token refresh metrics include correct tags
    Given I authenticate with Google using a valid ID token
    And I store the refresh token as "device_a_refresh_token"
    When I refresh the access token using "device_a_refresh_token"
    Then the response status should be 200
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain 'app_tokens_refresh_total{' in the body
    And the response should contain 'provider="google"' in the body
    And the response should contain 'result="success"' in the body

  @metrics-tags
  Scenario: Profile creation metrics include correct tags
    Given I authenticate with Google using a valid ID token
    And I store the access token as "device_a_access_token"
    When I use the access token "device_a_access_token"
    And I create a user profile with:
      | nickname   | TagTestUser |
      | avatarType | boy         |
      | avatarId   | boy_1       |
    Then the response status should be 201
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain 'app_user_profiles_total{' in the body
    And the response should contain 'operation="created"' in the body
    And the response should contain 'result="success"' in the body

  @metrics-comprehensive
  Scenario: Complete user journey increments all relevant metrics
    # Sign in
    Given I authenticate with Google using a valid ID token
    And I store the access token as "device_a_access_token"
    And I store the refresh token as "device_a_refresh_token"
    Then the response status should be 200

    # Create profile
    When I use the access token "device_a_access_token"
    And I create a user profile with:
      | nickname   | JourneyUser |
      | avatarType | boy         |
      | avatarId   | boy_1       |
    Then the response status should be 201
    
    # Refresh token
    When I refresh the access token using "device_a_refresh_token"
    Then the response status should be 200
    And I store the access token as "device_a_new_access_token"
    And I store the refresh token as "device_a_new_refresh_token"
    
    # Get profile
    When I use the access token "device_a_new_access_token"
    And I get the user profile
    Then the response status should be 200
    
    # Sign out
    When I revoke the refresh token "device_a_new_refresh_token"
    Then the response status should be 200
    
    # Verify all metrics are present
    When I make a GET request to "/private/prometheus"
    Then the response status code should be 200
    And the response should contain "app_authentication_total" in the body
    And the response should contain "app_user_profiles_total" in the body
    And the response should contain 'operation="created"' in the body
    And the response should contain 'operation="retrieved"' in the body
    And the response should contain "app_tokens_refresh_total" in the body
    And the response should contain "app_tokens_revocation_total" in the body

