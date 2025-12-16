@story-cms @local @docker @emulator-only
Feature: Story CMS and Delta-Sync
  As a mobile app
  I want to sync story metadata from Firestore
  So that users can access the latest stories without app store updates

  Background:
    Given the gateway service is healthy
    And I have a valid authentication token

  @smoke
  Scenario: Get all available stories
    When I make a GET request to "/api/stories"
    Then the response status code should be 200
    And the response should be a JSON array
    And the response headers should contain "Content-Type"

  @smoke
  Scenario: Get content version
    When I make a GET request to "/api/stories/version"
    Then the response status code should be 200
    And the response should contain field "version"
    And the response should contain field "totalStories"
    And the response should contain field "lastUpdated"

  @delta-sync
  Scenario: Initial sync with no client data
    Given I have a sync request with no client checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response should contain field "serverVersion"
    And the response should contain field "stories"
    And the response should contain field "storyChecksums"
    And the response should contain field "totalStories"
    And the response field "updatedStories" should be greater than 0

  @delta-sync
  Scenario: Delta sync with matching checksums
    Given I have a sync request with current server checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should equal 0

  @delta-sync
  Scenario: Delta sync with outdated checksums
    Given I have a sync request with outdated checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should be greater than 0
    And the response should contain updated stories only

  @story-retrieval
  Scenario: Get story by ID
    Given a story exists with ID "test-story-1"
    When I make a GET request to "/api/stories/test-story-1"
    Then the response status code should be 200
    And the response should contain field "id"
    And the response should contain field "title"
    And the response should contain field "category"
    And the response should contain field "pages"

  @story-retrieval
  Scenario: Get non-existent story
    When I make a GET request to "/api/stories/non-existent-story"
    Then the response status code should be 404

  @story-retrieval
  Scenario: Get stories by category
    Given stories exist in category "bedtime"
    When I make a GET request to "/api/stories/category/bedtime"
    Then the response status code should be 200
    And the response should be a JSON array
    And all stories in response should have category "bedtime"

  @delta-sync @performance
  Scenario: Sync performance with dataset
    Given 3 stories exist in the system
    And I have a sync request with 0 matching checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response time should be less than 2000 milliseconds
    And the response field "updatedStories" should equal 3

  @delta-sync @cross-device
  Scenario: Multiple devices sync independently
    Given device "A" has synced all stories
    And device "B" has never synced
    When device "B" makes a sync request
    Then device "B" should receive all available stories
    And device "A" sync state should be unchanged

  @story-metadata
  Scenario: Story metadata includes all required fields
    When I make a GET request to "/api/stories"
    Then the response status code should be 200
    And each story should have field "id"
    And each story should have field "title"
    And each story should have field "category"
    And each story should have field "tag"
    And each story should have field "emoji"
    And each story should have field "isAvailable"
    And each story should have field "version"
    And each story should have field "checksum"
    And each story should have field "pages"

  @story-pages
  Scenario: Story pages include required fields
    Given a story exists with pages
    When I make a GET request to the story endpoint
    Then each page should have field "id"
    And each page should have field "pageNumber"
    And each page should have field "text"
    And pages should be ordered by pageNumber

  @error-handling
  Scenario: Sync with invalid request body
    When I make a POST request to "/api/stories/sync" with invalid JSON
    Then the response status code should be 400

  @error-handling
  Scenario: Sync with malformed checksums
    Given I have a sync request with malformed checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 400 or 200
    And if status is 200 then response should handle gracefully

  @error-handling
  Scenario: Get story with empty ID
    When I make a GET request to "/api/stories/"
    Then the response status code should be 404

  @error-handling
  Scenario: Get stories by invalid category
    When I make a GET request to "/api/stories/category/invalid-category-xyz"
    Then the response status code should be 200
    And the response should be a JSON array
    And the response should be empty

  @error-handling
  Scenario: Sync request missing required fields
    When I make a POST request to "/api/stories/sync" with body:
      """
      {}
      """
    Then the response status code should be 500
    And the response should have field "errorCode"
    And the response should have field "error"

  @error-handling
  Scenario: Sync request with null checksums
    When I make a POST request to "/api/stories/sync" with body:
      """
      {
        "clientVersion": 1,
        "storyChecksums": null,
        "lastSyncTimestamp": 0
      }
      """
    Then the response status code should be 500

  @error-handling
  Scenario: Get all stories with missing required headers
    When I make a GET request to "/api/stories" without client headers
    Then the response status code should be 400
    And the response should have field "errorCode" with value "GTW-101"
    And the response should have field "error" with value "Required field is missing"

  @error-handling
  Scenario: Sync stories with missing X-Client-Platform header
    Given I have a sync request with no client checksums
    When I make a POST request to "/api/stories/sync" without X-Client-Platform header
    Then the response status code should be 400
    And the response should have field "errorCode" with value "GTW-101"

  @error-handling
  Scenario: Get story by ID with invalid X-Client-Version format
    When I make a GET request to "/api/stories/test-story-1" with invalid X-Client-Version "v1.0"
    Then the response status code should be 400
    And the response should have field "errorCode" with value "GTW-109"
    And the response should have field "error" with value "Field validation failed"

