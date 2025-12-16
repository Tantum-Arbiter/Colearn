@cors @security @local @docker
Feature: CORS Configuration
  As a gateway service
  I want to enforce environment-specific CORS policies
  So that only authorized origins can access the API

  Background:
    Given the gateway service is healthy

  @smoke
  Scenario: CORS headers are present on successful requests
    When I make a GET request to "/auth/status" with headers:
      | Origin | https://app.growwithfreya.com |
    Then the response status code should be 200
    And the response headers should contain "Access-Control-Allow-Origin"
    And the response headers should contain "Access-Control-Allow-Methods"
    And the response headers should contain "Access-Control-Allow-Headers"
    And the response headers should contain "Access-Control-Allow-Credentials"

  @smoke
  Scenario: CORS preflight request is handled correctly
    When I make an OPTIONS request to "/api/auth/me" with headers:
      | Origin                         | https://app.growwithfreya.com |
      | Access-Control-Request-Method  | GET                           |
      | Access-Control-Request-Headers | Authorization,Content-Type    |
    Then the response status code should be 200
    And the response headers should contain "Access-Control-Allow-Origin"
    And the response headers should contain "Access-Control-Allow-Methods"
    And the response headers should contain "Access-Control-Allow-Headers"
    And the response headers should contain "Access-Control-Max-Age"

  @security
  Scenario: CORS headers are present on authentication errors
    When I make a GET request to "/api/auth/me" with headers:
      | Origin            | https://app.growwithfreya.com |
      | Authorization     | Bearer invalid-token          |
      | X-Client-Platform | ios                           |
      | X-Client-Version  | 1.0.0                         |
      | X-Device-ID       | test-device-123               |
    Then the response status code should be 401
    And the response headers should contain "Access-Control-Allow-Origin"

  @security
  Scenario: CORS headers are present on validation errors
    When I make a GET request to "/auth/status" with headers:
      | Origin     | https://app.growwithfreya.com |
      | User-Agent | <script>alert(1)</script>     |
    Then the response status code should be 400
    And the response headers should contain "Access-Control-Allow-Origin"

  @security
  Scenario: CORS headers are present on 404 errors
    When I make a GET request to "/nonexistent-endpoint-xyz" with headers:
      | Origin | https://app.growwithfreya.com |
    Then the response status code should be 403
    And the response headers should contain "Access-Control-Allow-Origin"

  Scenario: CORS allows configured HTTP methods
    When I make an OPTIONS request to "/api/users/profile" with headers:
      | Origin                         | https://app.growwithfreya.com |
      | Access-Control-Request-Method  | POST                          |
      | Access-Control-Request-Headers | Authorization,Content-Type    |
    Then the response status code should be 200
    And the response header "Access-Control-Allow-Methods" should contain "POST"
    And the response header "Access-Control-Allow-Methods" should contain "GET"
    And the response header "Access-Control-Allow-Methods" should contain "PUT"
    And the response header "Access-Control-Allow-Methods" should contain "DELETE"

  Scenario: CORS allows configured headers
    When I make an OPTIONS request to "/api/users/profile" with headers:
      | Origin                         | https://app.growwithfreya.com                                                   |
      | Access-Control-Request-Method  | GET                                                                             |
      | Access-Control-Request-Headers | Authorization,Content-Type,X-Device-ID,X-Client-Platform,X-Client-Version      |
    Then the response status code should be 200
    And the response header "Access-Control-Allow-Headers" should contain "Authorization"
    And the response header "Access-Control-Allow-Headers" should contain "Content-Type"
    And the response header "Access-Control-Allow-Headers" should contain "X-Device-ID"
    And the response header "Access-Control-Allow-Headers" should contain "X-Client-Platform"
    And the response header "Access-Control-Allow-Headers" should contain "X-Client-Version"

  Scenario: CORS credentials flag is set correctly
    When I make an OPTIONS request to "/api/auth/me" with headers:
      | Origin                         | https://app.growwithfreya.com |
      | Access-Control-Request-Method  | GET                           |
      | Access-Control-Request-Headers | Authorization                 |
    Then the response status code should be 200
    And the response header "Access-Control-Allow-Credentials" should be "true"

  Scenario: CORS max age is set for preflight caching
    When I make an OPTIONS request to "/api/auth/me" with headers:
      | Origin                         | https://app.growwithfreya.com |
      | Access-Control-Request-Method  | GET                           |
      | Access-Control-Request-Headers | Authorization                 |
    Then the response status code should be 200
    And the response headers should contain "Access-Control-Max-Age"

  @security
  Scenario: CORS works with authenticated requests
    Given I have a valid authentication token
    When I send a GET request to "/api/auth/me" with headers:
      | Authorization | Bearer valid-user-test        |
      | Origin        | https://app.growwithfreya.com |
    Then the response status should be 200
    And the response headers should contain "Access-Control-Allow-Origin"
    And the response headers should contain "Access-Control-Allow-Credentials"

  @security
  Scenario: CORS works with POST requests
    Given I have a valid authentication token
    When I send a POST request to "/api/profile" with headers:
      | Authorization | Bearer valid-user-test        |
      | Origin        | https://app.growwithfreya.com |
      | Content-Type  | application/json              |
    And request body:
      """
      {
        "nickname": "TestUser",
        "avatarType": "boy",
        "avatarId": "boy_1"
      }
      """
    Then the response status should be 200 or 201
    And the response headers should contain "Access-Control-Allow-Origin"

  @security
  Scenario: Multiple CORS requests maintain consistent headers
    When I make a GET request to "/auth/status" with headers:
      | Origin | https://app.growwithfreya.com |
    Then the response status code should be 200
    And the response headers should contain "Access-Control-Allow-Origin"
    When I make a GET request to "/auth/status" with headers:
      | Origin | https://www.growwithfreya.com |
    Then the response status code should be 200
    And the response headers should contain "Access-Control-Allow-Origin"

