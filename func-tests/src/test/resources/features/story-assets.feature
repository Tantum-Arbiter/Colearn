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

  @error-handling @emulator-only
  Scenario: Get asset version with missing required headers
    When I make a GET request to "/api/assets/version" without client headers
    Then the response status code should be 400
    And the response should have field "errorCode" with value "GTW-101"

  @asset-metadata @emulator-only
  Scenario: Asset version includes all required fields
    When I make a GET request to "/api/assets/version"
    Then the response status code should be 200
    And the response should contain field "id"
    And the response should contain field "version"
    And the response should contain field "lastUpdated"
    And the response should contain field "assetChecksums"
    And the response should contain field "totalAssets"

  # ============================================================================
  # BATCH PROCESSING TESTS - POST /api/assets/batch-urls
  # These tests validate the batch URL generation endpoint that reduces API
  # calls by generating signed URLs for multiple assets in a single request.
  # This is the primary endpoint for asset URL generation.
  # ============================================================================

  @batch-processing @batch-urls @smoke
  Scenario: Batch URL generation for multiple assets
    Given I have a batch URL request with 3 asset paths
    When I make a POST request to "/api/assets/batch-urls" with the batch URL request
    Then the response status code should be 200
    And the batch URL response should contain field "urls"
    And the batch URL response should contain field "failed"
    And the batch URL response should contain 0 or more URLs

  @batch-processing @batch-urls
  Scenario: Batch URL response includes path and signedUrl for each entry
    Given I have a batch URL request with valid asset paths
    When I make a POST request to "/api/assets/batch-urls" with the batch URL request
    Then the response status code should be 200
    And each batch URL entry should have path and signedUrl

  @batch-processing @batch-urls
  Scenario: Batch URL request with max allowed paths succeeds
    Given I have a batch URL request with 50 asset paths
    When I make a POST request to "/api/assets/batch-urls" with the batch URL request
    Then the response status code should be 200
    And the batch URL response should contain field "urls"

  @batch-processing @error-handling
  Scenario: Batch URL request with empty paths returns error
    Given I have a batch URL request with empty paths
    When I make a POST request to "/api/assets/batch-urls" with the batch URL request
    Then the response status code should be 400
    And the response should have field "errorCode"

  @batch-processing @error-handling
  Scenario: Batch URL request exceeding max paths returns error
    Given I have a batch URL request with 101 paths exceeding limit
    When I make a POST request to "/api/assets/batch-urls" with the batch URL request
    Then the response status code should be 400
    And the response should have field "errorCode"

  @batch-processing @security
  Scenario: Batch URL request with invalid paths rejects malicious paths
    Given I have a batch URL request with invalid paths
    When I make a POST request to "/api/assets/batch-urls" with the batch URL request
    Then the response status code should be 400 or 200
    And if status is 200 then failed list should contain rejected paths

