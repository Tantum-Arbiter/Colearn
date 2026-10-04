@analytics @local @docker @gcp-dev
Feature: Anonymous analytics from the app
  As the app
  I send batches of anonymous events with no device identifier
  So that the family's usage is counted without being tracked

  Background:
    Given the gateway service is running

  @smoke
  Scenario: The app's batch is accepted without any device headers
    When the app sends an analytics batch:
      """
      {"sessionId":"s-1","platform":"ios","appVersion":"1.4.0","locale":"en",
       "events":[{"event":"story_opened","properties":{"storyId":"snowy-day"}}]}
      """
    Then the response status should be 200
    And the response JSON field "status" should be "accepted"

  @validation
  Scenario Outline: Real event names that contain script-like words are accepted
    When the app sends an analytics batch with the event "<event>"
    Then the response status should be 200

    Examples:
      | event                         |
      | subscription_overlay_shown    |
      | subscription_purchase_started |
      | description_viewed            |

  @validation
  Scenario: A batch at the limit of 500 events is accepted
    When the app sends an analytics batch of 500 events
    Then the response status should be 200

  @validation @error-handling
  Scenario: A batch of 501 events is refused
    When the app sends an analytics batch of 501 events
    Then the response status should be 400

  @validation @error-handling
  Scenario Outline: An invalid batch is refused
    When the app sends an analytics batch:
      """
      <body>
      """
    Then the response status should be 400

    Examples:
      | body                                                          |
      | {"sessionId":"s-1","platform":"ios","events":[]}              |
      | {"platform":"ios","events":[{"event":"story_opened"}]}        |
      | {"sessionId":"s-1","platform":"ios","events":[{"event":" "}]} |
      | {"sessionId":"s-1","platform":"ios","events":[                |

  @security @error-handling
  Scenario: A batch without a token is refused
    When the app sends an analytics batch without a token:
      """
      {"sessionId":"s-1","platform":"ios","events":[{"event":"story_opened"}]}
      """
    Then the response status should be 401
