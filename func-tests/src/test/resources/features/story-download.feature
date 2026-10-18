@story-download @local @docker @emulator-only
Feature: Downloading a story for offline reading
  As a family
  I download a story to the device
  So that we can read it without a connection

  Background:
    Given the gateway service is running

  @smoke
  Scenario: A story in the catalogue downloads with its pages
    Given the story "cms-test-1-snowman-squirrel" is in the catalogue
    When I send an authenticated GET request to "/api/stories/cms-test-1-snowman-squirrel/download"
    Then the response status should be 200
    And the response JSON field "id" should be "cms-test-1-snowman-squirrel"
    And page 1 should have field "localizedText"

  @error-handling
  Scenario: A story that does not exist is not found
    When I send an authenticated GET request to "/api/stories/no-such-story/download"
    Then the response status should be 404

  @error-handling
  Scenario: A withdrawn story cannot be downloaded
    Given the story "cms-test-2-snowman-squirrel" is in the catalogue but withdrawn
    When I send an authenticated GET request to "/api/stories/cms-test-2-snowman-squirrel/download"
    Then the response status should be 403

  @security @error-handling
  Scenario: A download without a token is refused
    When I send an unauthenticated GET request to "/api/stories/cms-test-1-snowman-squirrel/download"
    Then the response status should be 401

  @security @validation
  Scenario: A traversal in the story id is refused
    When I send an authenticated GET request to "/api/stories/..%2f..%2fetc%2fpasswd/download"
    Then the response status should be 400
