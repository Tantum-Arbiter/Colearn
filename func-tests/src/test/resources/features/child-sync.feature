@child-sync @local @docker @emulator-only
Feature: A family's child document follows them to a new phone
  As a family
  I want my child's progress, favourites and settings kept with my account
  So that a reinstall or a new phone picks up where we left off

  Background:
    Given the gateway service is running
    And I authenticate with Google using a valid ID token

  @smoke
  Scenario: The first save creates the child and a later read returns it
    When the app saves the child "main" with body:
      """
      {"nickname":"Freya","avatarType":"girl","avatarId":"owl","ageBucket":"2-4","language":"pl",
       "favorites":{"stories":["snowy-day"],"activities":[],"songs":[]},
       "storyProgress":{"snowy-day":{"pageIndex":3,"totalPages":12,"finishedCount":1}},
       "finishedStoryIds":["snowy-day"],"challengeCounts":{"music":2},"achievements":["first-story"],
       "settings":{"screenTimeEnabled":true,"smartRemindersEnabled":false,
         "customReminders":[{"id":"r1","title":"Bath; then story","message":"Teeth & pyjamas <3","dayOfWeek":1,"time":"19:00","isActive":true}]},
       "version":0}
      """
    Then the response status should be 200
    And the response JSON field "version" should be 1
    And the response carries no server write time
    When I send an authenticated GET request to "/api/children/main"
    Then the response status should be 200
    And the response JSON field "nickname" should be "Freya"
    And the response JSON field "settings.customReminders[0].title" should be "Bath; then story"
    And the response JSON field "storyProgress.snowy-day.finishedCount" should be 1

  Scenario: A write based on an old version is refused with the current document
    When the app saves the child "main" with body:
      """
      {"nickname":"Freya","version":0}
      """
    Then the response status should be 200
    When the app saves the child "main" with body:
      """
      {"nickname":"From the other phone","version":0}
      """
    Then the conflict carries the current child at version 1

  @validation
  Scenario Outline: An invalid child is refused
    When the app saves the child "main" with body:
      """
      <body>
      """
    Then the response status should be 400

    Examples:
      | body                                                     |
      | {"nickname":"aaaaaaaaaaaaaaaaaaaaa","version":0}         |
      | {"nickname":"Freya","ageBucket":"7-9","version":0}       |
      | {"nickname":"Freya","challengeCounts":{"piano":1},"version":0} |
      | {"nickname":"Freya"}                                     |

  @error-handling
  Scenario: A child that does not exist is not found
    When I send an authenticated GET request to "/api/children/nobody"
    Then the response status should be 404

  @security
  Scenario: The child document needs a token
    When I send an unauthenticated GET request to "/api/children"
    Then the response status should be 401

  Scenario: Consent is recorded and the export holds everything
    When the app saves the child "main" with body:
      """
      {"nickname":"Freya","version":0}
      """
    And the app records consent with body:
      """
      {"policyVersion":"1.0","scope":"core","acceptedAt":"2026-09-01T10:00:00Z","appVersion":"1.4.0"}
      """
    Then the response status should be 201
    When I send an authenticated GET request to "/api/account/export"
    Then the response status should be 200
    And the export holds 1 child and 1 consent record

  @validation
  Scenario: A consent dated in the future is refused
    When the app records consent with body:
      """
      {"policyVersion":"1.0","scope":"core","acceptedAt":"2099-01-01T00:00:00Z"}
      """
    Then the response status should be 400
