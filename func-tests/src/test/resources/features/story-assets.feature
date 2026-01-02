@story-assets @gcp-dev @local @docker
Feature: Story Asset Delivery with Signed URLs
  As a mobile app
  I want to access story assets via signed URLs
  So that assets are securely delivered from cloud storage

  Background:
    Given the gateway service is healthy
    And I have a valid authentication token

  @smoke
  Scenario: Get asset version
    When I make a GET request to "/api/assets/version"
    Then the response status code should be 200
    And the response should contain field "version"
    And the response should contain field "totalAssets"
    And the response should contain field "lastUpdated"

  @smoke @emulator-only
  Scenario: Get signed URL for existing asset
    When I make a GET request to "/api/assets/url?path=stories/test-story-1/cover.webp"
    Then the response status code should be 200
    And the response should contain field "path"
    And the response should contain field "signedUrl"
    And the response field "signedUrl" should contain "test-story-1"

  @smoke @integration @emulator-only
  Scenario: Signed URL can be used to fetch asset
    When I make a GET request to "/api/assets/url?path=stories/test-story-1/cover.webp"
    Then the response status code should be 200
    And the signed URL should successfully download the asset

  @delta-sync @emulator-only
  Scenario: Initial asset sync with no client data
    Given I have an asset sync request with no client checksums
    When I make a POST request to "/api/assets/sync" with the asset sync request
    Then the response status code should be 200
    And the response should contain field "serverVersion"
    And the response should contain field "updatedAssets"
    And the response should contain field "assetChecksums"
    And the response should contain field "totalAssets"
    And the response field "updatedCount" should be greater than 0

  @delta-sync @emulator-only
  Scenario: Asset sync with matching checksums
    Given I have an asset sync request with current server checksums
    When I make a POST request to "/api/assets/sync" with the asset sync request
    Then the response status code should be 200
    And the response field "updatedCount" should equal 0

  @delta-sync @emulator-only
  Scenario: Asset sync with outdated checksums
    Given I have an asset sync request with outdated checksums
    When I make a POST request to "/api/assets/sync" with the asset sync request
    Then the response status code should be 200
    And the response field "updatedCount" should be greater than 0
    And each updated asset should have a signed URL

  @error-handling
  Scenario: Get signed URL with missing path parameter
    When I make a GET request to "/api/assets/url"
    Then the response status code should be 400

  @error-handling
  Scenario: Get signed URL with empty path parameter
    When I make a GET request to "/api/assets/url?path="
    Then the response status code should be 400

  @error-handling
  Scenario: Asset sync request missing required fields
    When I make a POST request to "/api/assets/sync" with body:
      """
      {}
      """
    Then the response status code should be 400
    And the response should have field "errorCode"

  @error-handling @emulator-only
  Scenario: Asset sync request with null checksums
    When I make a POST request to "/api/assets/sync" with body:
      """
      {
        "clientVersion": 1,
        "assetChecksums": null,
        "lastSyncTimestamp": 0
      }
      """
    Then the response status code should be 400

  @error-handling @emulator-only
  Scenario: Get asset version with missing required headers
    When I make a GET request to "/api/assets/version" without client headers
    Then the response status code should be 400
    And the response should have field "errorCode" with value "GTW-101"

  @signed-url @emulator-only
  Scenario: Signed URLs include required query parameters
    When I make a GET request to "/api/assets/url?path=stories/test-story-1/cover.webp"
    Then the response status code should be 200
    And the signed URL should contain signature parameters

  @asset-metadata @emulator-only
  Scenario: Asset version includes all required fields
    When I make a GET request to "/api/assets/version"
    Then the response status code should be 200
    And the response should contain field "id"
    And the response should contain field "version"
    And the response should contain field "lastUpdated"
    And the response should contain field "assetChecksums"
    And the response should contain field "totalAssets"

  @delta-sync @performance @emulator-only
  Scenario: Asset sync performance
    Given assets exist in the system
    And I have an asset sync request with 0 matching checksums
    When I make a POST request to "/api/assets/sync" with the asset sync request
    Then the response status code should be 200
    And the response time should be less than 3000 milliseconds

  # Security tests for path validation and URL encoding

  @security @path-validation
  Scenario: Path traversal attack is blocked
    When I make a GET request to "/api/assets/url?path=stories/../../../etc/passwd"
    Then the response status code should be 400
    And the response should have field "errorCode"

  @security @path-validation
  Scenario: Absolute path is blocked
    When I make a GET request to "/api/assets/url?path=/etc/passwd"
    Then the response status code should be 400
    And the response should have field "errorCode"

  @security @path-validation
  Scenario: Invalid prefix is blocked
    When I make a GET request to "/api/assets/url?path=invalid/test.webp"
    Then the response status code should be 400
    And the response should have field "errorCode"

  @security @path-validation
  Scenario: Null byte injection is blocked
    When I make a GET request to asset URL with null byte in path
    Then the response status code should be 400

  @security @url-encoding @emulator-only
  Scenario: URL encoding handles spaces in path
    When I make a GET request to "/api/assets/url?path=stories/test%20story/cover.webp"
    Then the response status code should be 200 or 400
    And if status is 200 then response should contain properly encoded URL

  @security @url-encoding @emulator-only
  Scenario: URL encoding handles special characters
    When I make a GET request to "/api/assets/url?path=stories/test+story/cover.webp"
    Then the response status code should be 200 or 400
    And if status is 200 then response should contain properly encoded URL

  @security @url-encoding @emulator-only
  Scenario: URL encoding handles unicode characters
    When I make a GET request to asset URL with unicode characters
    Then the response status code should be 200 or 400
    And if status is 200 then response should contain properly encoded URL

  @security @request-validation
  Scenario: Asset sync with excessive checksums is rejected
    Given I have an asset sync request with 10001 checksums
    When I make a POST request to "/api/assets/sync" with the asset sync request
    Then the response status code should be 400
    And the response should have field "errorCode"

  @security @path-validation
  Scenario Outline: Valid asset paths are accepted
    When I make a GET request to "/api/assets/url?path=<path>"
    Then the response status code should be 200 or 404

    Examples:
      | path                               |
      | stories/test-story-1/cover.webp    |
      | audio/story-1/narration.mp3        |
      | images/backgrounds/forest.webp     |
      | thumbnails/story-1.webp            |

  @security @path-validation
  Scenario Outline: Invalid asset path prefixes are rejected
    When I make a GET request to "/api/assets/url?path=<path>"
    Then the response status code should be 400

    Examples:
      | path                          |
      | config/secrets.json           |
      | private/user-data.json        |
      | ../parent/file.txt            |
      | /absolute/path/file.txt       |

