@cms-content @story-sync
Feature: CMS Content Sync and Delta Sync Testing
  As a mobile app
  I want to sync story content from the CMS
  So that users receive the latest stories with proper delta-sync behavior

  Background:
    Given the gateway service is healthy
    And I have a valid authentication token

  # ============================================================================
  # LOCAL EMULATOR TESTS - 10 Books
  # ============================================================================

  @local @docker @emulator-only @smoke
  Scenario: Seed and retrieve 10 test stories from local CMS
    Given I seed 10 test stories to the local Firestore emulator
    When I make a GET request to "/api/stories"
    Then the response status code should be 200
    And the response should be a JSON array
    And the response should contain at least 10 stories
    And each story should have unique text content

  @local @docker @emulator-only
  Scenario: Verify test story content is correctly stored
    Given I seed test story "test-story-1" to the local Firestore emulator
    When I make a GET request to "/api/stories/test-story-1"
    Then the response status code should be 200
    And the response should contain field "id" with value "test-story-1"
    And the response should contain field "title"
    And the response field "pages" should have at least 5 items
    And page 1 text should contain "TEST STORY 1"

  @local @docker @emulator-only
  Scenario: Verify all 10 stories have unique identifying content
    Given I seed 10 test stories to the local Firestore emulator
    When I make a GET request to "/api/stories"
    Then the response status code should be 200
    And story "test-story-1" page 1 should contain "TEST STORY 1"
    And story "test-story-5" page 1 should contain "TEST STORY 5"
    And story "test-story-10" page 1 should contain "TEST STORY 10"

  # ============================================================================
  # DELTA SYNC TESTS - Local Emulator
  # ============================================================================

  @local @docker @emulator-only @delta-sync
  Scenario: Initial sync receives all seeded stories
    Given I seed 10 test stories to the local Firestore emulator
    And I have a sync request with no client checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should be at least 10
    And the response field "totalStories" should be at least 10

  @local @docker @emulator-only @delta-sync
  Scenario: Delta sync with matching checksums returns zero updates
    Given I seed 10 test stories to the local Firestore emulator
    And I have performed an initial sync
    And I have a sync request with current server checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should equal 0

  @local @docker @emulator-only @delta-sync
  Scenario: Delta sync detects single story update
    Given I seed 10 test stories to the local Firestore emulator
    And I have performed an initial sync
    And I update story "test-story-5" with new content version 2
    And I have a sync request with previous checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should equal 1
    And the response should contain updated story "test-story-5"

  @local @docker @emulator-only @delta-sync
  Scenario: Delta sync detects multiple story updates
    Given I seed 10 test stories to the local Firestore emulator
    And I have performed an initial sync
    And I update stories "test-story-1,test-story-3,test-story-7" with new content
    And I have a sync request with previous checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should equal 3

  @local @docker @emulator-only @delta-sync
  Scenario: Delta sync handles new story addition
    Given I seed 5 test stories to the local Firestore emulator
    And I have performed an initial sync
    And I seed additional story "test-story-new" to the emulator
    And I have a sync request with previous checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should be at least 1
    And the response should contain story "test-story-new"

  # ============================================================================
  # GCP INTEGRATION TESTS - 1 Book (Squirrel's Snowman)
  # ============================================================================

  @gcp-dev
  Scenario: Pull stories from GCP CMS after seeding test data
    Given the story "gcp-func-test-story" exists in GCP Firestore
    When I make a GET request to "/api/stories"
    Then the response status code should be 200
    And the response should be a JSON array
    And the response should contain at least 1 story

  @gcp-dev
  Scenario: Verify seeded test story exists and has required content
    Given the story "gcp-func-test-snowman" exists in GCP Firestore
    When I make a GET request to "/api/stories/gcp-func-test-snowman"
    Then the response status code should be 200
    And the response should contain field "id" with value "gcp-func-test-snowman"
    And the response should contain field "title"
    And the response field "pages" should have at least 10 items

  @gcp-dev @delta-sync
  Scenario: GCP delta sync returns content version
    Given the story "gcp-version-test" exists in GCP Firestore
    When I make a GET request to "/api/stories/version"
    Then the response status code should be 200
    And the response should contain field "version"
    And the response should contain field "totalStories"
    And the response field "totalStories" should be at least 1

  @gcp-dev @delta-sync
  Scenario: GCP initial sync retrieves seeded story
    Given the story "gcp-sync-test" exists in GCP Firestore
    And I have a sync request with no client checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response should contain field "serverVersion"
    And the response should contain field "stories"
    And the response field "stories" should not be empty

  @gcp-dev @delta-sync
  Scenario: GCP delta sync with current checksums returns no updates
    Given the story "gcp-checksum-test" exists in GCP Firestore
    And I have a sync request with current server checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should equal 0

  # ============================================================================
  # DELTA SYNC MODIFICATION TESTS - Prove delta sync detects changes
  # ============================================================================

  @gcp-dev @delta-sync @delta-modification
  Scenario: Delta sync detects tag change in story
    Given the story "gcp-delta-tag-test" exists in GCP Firestore
    And I have performed an initial sync
    And I have a sync request with previous checksums
    When I modify story "gcp-delta-tag-test" by changing the tag to "🚀 Modified Tag"
    And I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should be at least 1
    And the response should contain story "gcp-delta-tag-test"

  @gcp-dev @delta-sync @delta-modification
  Scenario: Delta sync detects added page in story
    Given the story "gcp-delta-page-test" exists in GCP Firestore
    And I have performed an initial sync
    And I have a sync request with previous checksums
    When I modify story "gcp-delta-page-test" by adding a new page
    And I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should be at least 1
    And the response should contain story "gcp-delta-page-test"

  @gcp-dev @delta-sync @delta-modification
  Scenario: Delta sync detects page text change
    Given the story "gcp-delta-text-test" exists in GCP Firestore
    And I have performed an initial sync
    And I have a sync request with previous checksums
    When I modify story "gcp-delta-text-test" page 1 text to "MODIFIED TEXT - Delta sync should detect this change!"
    And I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response field "updatedStories" should be at least 1
    And the response should contain story "gcp-delta-text-test"

  # ============================================================================
  # PERFORMANCE AND RELIABILITY TESTS
  # ============================================================================

  @local @docker @emulator-only @performance
  Scenario: Sync performance with 10 stories completes within timeout
    Given I seed 10 test stories to the local Firestore emulator
    And I have a sync request with no client checksums
    When I make a POST request to "/api/stories/sync" with the sync request
    Then the response status code should be 200
    And the response time should be less than 3000 milliseconds

  @local @docker @emulator-only @reliability
  Scenario: Multiple consecutive syncs maintain consistency
    Given I seed 10 test stories to the local Firestore emulator
    When I perform 3 consecutive sync requests
    Then all sync responses should have consistent story counts
    And all sync responses should have matching checksums

  # ============================================================================
  # CONTENT VALIDATION TESTS
  # ============================================================================

  @local @docker @emulator-only @content-validation
  Scenario: Story pages contain required fields
    Given I seed test story "test-story-1" to the local Firestore emulator
    When I make a GET request to "/api/stories/test-story-1"
    Then the response status code should be 200
    And each page should have field "id"
    And each page should have field "pageNumber"
    And each page should have field "text"
    And each page should have field "backgroundImage"

  @local @docker @emulator-only @content-validation
  Scenario: Story metadata contains all required fields
    Given I seed test story "test-story-1" to the local Firestore emulator
    When I make a GET request to "/api/stories/test-story-1"
    Then the response status code should be 200
    And the response should contain field "id"
    And the response should contain field "title"
    And the response should contain field "category"
    And the response should contain field "isAvailable"
    And the response should contain field "pages"
    And the response should contain field "version"
    And the response should contain field "checksum"

  # ============================================================================
  # CMS BOOK PERSISTENCE TESTS - Creates books that persist after tests
  # ============================================================================

  @gcp-dev @cms-persistence @smoke
  Scenario: Create and persist CMS test books for manual testing
    Given I create CMS test book "cms-test-1-squirrel-snowman" with title "CMS test 1 - squirrel snowman"
    And I create CMS test book "cms-test-2-squirrel-snowman" with title "CMS test 2 - squirrel snowman"
    And I create CMS test book "cms-test-3-squirrel-snowman" with title "CMS test 3 - squirrel snowman"
    When I make a GET request to "/api/stories/cms-test-1-squirrel-snowman"
    Then the response status code should be 200
    And the response should contain field "id" with value "cms-test-1-squirrel-snowman"
    And the response should contain field "title" with value "CMS test 1 - squirrel snowman"
    And the response field "pages" should have at least 10 items
    When I make a GET request to "/api/stories/cms-test-2-squirrel-snowman"
    Then the response status code should be 200
    And the response should contain field "id" with value "cms-test-2-squirrel-snowman"
    When I make a GET request to "/api/stories/cms-test-3-squirrel-snowman"
    Then the response status code should be 200
    And the response should contain field "id" with value "cms-test-3-squirrel-snowman"

