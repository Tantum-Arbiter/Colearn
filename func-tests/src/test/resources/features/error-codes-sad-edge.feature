Feature: Error codes for sad and edge cases
  As a developer
  I want deterministic error codes for sad and edge cases
  So that clients and operators can handle and diagnose issues consistently

  Background:
    Given the gateway service is healthy

  # Validate mapping for a representative set of sad/edge codes across categories
  Scenario Outline: Return correct HTTP status and errorCode for sad/edge code
    When I make a POST request to "/private/error?code=<code>"
    Then the response status code should be <status>
    And the response JSON field "errorCode" should be "<code>"

    Examples:
      | code     | status |
      | GTW-011  | 401    |
      | GTW-012  | 401    |
      | GTW-013  | 401    |
      | GTW-014  | 401    |
      | GTW-015  | 401    |
      | GTW-016  | 401    |
      | GTW-110  | 400    |
      | GTW-111  | 400    |
      | GTW-112  | 400    |
      | GTW-210  | 502    |
      | GTW-211  | 502    |
      | GTW-212  | 502    |
      | GTW-213  | 502    |
      | GTW-214  | 502    |
      | GTW-311  | 403    |
      | GTW-410  | 409    |
      | GTW-512  | 500    |
      | GTW-513  | 500    |
      | GTW-515  | 500    |

