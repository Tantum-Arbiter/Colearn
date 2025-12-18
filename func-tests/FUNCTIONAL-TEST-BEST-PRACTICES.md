# Functional Test Best Practices - Analysis & Recommendations
---

## Key Principles from Reference Example

### 1. **Scenario Outlines for Parameterization**

**Reference Example:**
```gherkin
Scenario Outline: Validate the payload
  Given the Accept header is set to "<accept_header>"
  And the provider and territory is nowtv gb
  When a GET request is made to get graph endpoint
  Then a 200 OK response is returned
  And the response returns a nowtv gb service-key node model <version>
  And the response checksum header is <checksum>
  Examples:
    | accept_header                     | version | checksum                          |
    | application/vnd.nodemodel.v2+json | v2      | C8B1BDD6621245A2B37125DF648CAA1A  |
```

**Benefits:**
- Single scenario tests multiple variations (v2, v3, different headers)
- Easy to add new test cases by adding rows to Examples table
- Reduces duplication and maintenance burden
- Makes test coverage gaps obvious

**Current State:**
- Limited use of Scenario Outlines
- Many similar scenarios repeated with slight variations

**Recommendation:**
- Use Scenario Outlines for testing multiple OAuth providers (Google, Apple)
- Use Scenario Outlines for testing different error codes with similar flows
- Use Scenario Outlines for testing different Accept headers, Content-Types

---

### 2. **Ticket/Requirement Traceability**

**Benefits:**
- Links tests to requirements/user stories
- Makes it easy to find tests for a specific feature
- Helps with impact analysis when requirements change
- Provides audit trail for compliance

**Current State:**
- No ticket tags on scenarios
- No way to trace tests back to requirements

**Recommendation:**
- Add `@GWF-XXX` tags to all scenarios (if using JIRA/GitHub issues)
- Group related scenarios with feature tags like `@authentication`, `@token-refresh`
- Add `@security`, `@compliance` tags for audit purposes

---

### 3. **Precise HTTP Semantics**

**Reference Example:**
```gherkin
Scenario: don't return a graph payload if the etag matches
  Given the etag on the v2 request is the same as the server side etag
  When a GET request is made to get graph endpoint
  Then a 304 Not Modified response is returned
  And the response doesn't contain a body
```

**Benefits:**
- Tests HTTP caching behavior (304 Not Modified)
- Tests conditional requests (If-None-Match header)
- Tests proper use of ETags for cache validation
- Documents expected HTTP behavior

**Current State:**
- Good use of HTTP status codes (200, 401, 400, 502, 504)
- Could add more HTTP header validation
- Could test caching headers (Cache-Control, ETag)

**Recommendation:**
- Add tests for `Cache-Control` headers on public endpoints
- Add tests for `Content-Type` negotiation
- Add tests for `Accept-Encoding` (gzip compression)
- Test proper HTTP status codes (304, 412 Precondition Failed, 406 Not Acceptable)

---

### 4. **Clear Given-When-Then Structure**

**Reference Example:**
```gherkin
Given the Accept header is set to "application/vnd.nodemodel.v2+json"
And there are node models in the cache
And the etag on the v2 request is different from the server side etag
When a GET request is made to get graph endpoint
Then a 200 OK response is returned
And the response returns node models v2
And the response contains a new etag with provider, territory, graph type and version
```

**Benefits:**
- Each step has a single, clear responsibility
- Setup (Given) is separated from action (When) and validation (Then)
- Easy to understand what's being tested
- Steps read like system documentation

**Current State:**
- Good Given-When-Then structure overall
- Some steps hide complexity (e.g., "I authenticate with the OAuth token")
- Some steps combine multiple actions

**Recommendation:**
- Break down complex steps into atomic operations
- Make implicit actions explicit (e.g., "And the session is created in Firestore")
- Use consistent language across all feature files

---

### 5. **Response Validation - Headers and Body**

**Reference Example:**
```gherkin
Then a 200 OK response is returned
And the response returns a nowtv gb service-key node model v2
And the response checksum header is C8B1BDD6621245A2B37125DF648CAA1A
And the response body contains a service-key graph type with a provider territory of nowtv-gb
```

**Benefits:**
- Validates HTTP status code
- Validates response headers (checksum, etag)
- Validates response body structure
- Validates specific field values

**Current State:**
- Good validation of response status codes
- Good validation of error codes and error messages
- Limited validation of response headers
- Could add more structural validation

**Recommendation:**
- Add validation for `X-Request-ID` header (request tracing)
- Add validation for `Content-Type` header
- Add validation for timestamp formats (ISO-8601)
- Add validation for JWT token structure (header.payload.signature)

---

### 6. **Negative Test Cases**

**Reference Example:**
```gherkin
Scenario: error when If-None-Match header is set improperly
  Given the Accept header is set to "application/vnd.nodemodel.v2+json"
  And the If-None-Match header is set to "egypt is almost as cool as poland"
  When a GET request is made to get graph endpoint
  Then a 400 Bad Request response is returned
```

**Benefits:**
- Tests edge cases and error handling
- Documents what happens when clients send bad data
- Ensures proper error messages are returned
- Prevents regressions in error handling

**Current State:**
- Excellent coverage of negative cases in `authentication-unhappy-cases.feature`
- Good coverage of validation errors, timeouts, service unavailable
- Good use of WireMock to simulate downstream failures

**Recommendation:**
- Continue current approach - it's already excellent
- Consider adding more edge cases for concurrent requests
- Add tests for rate limiting edge cases

---

## Comparison Summary

| Aspect | Reference Example | Current Tests | Recommendation |
|--------|------------------|---------------|----------------|
| **Scenario Outlines** | Extensive use | Limited use | Add for OAuth providers, error codes |
| **Ticket Traceability** | @ GTW-XXX tags | No tags | Add @GWF-XXX tags |
| **HTTP Semantics** | 304, ETags, caching | Basic status codes | Add caching, content negotiation |
| **Step Clarity** | Atomic steps | Some complex steps | Break down complex steps |
| **Response Validation** | Headers + body | Mostly body | Add header validation |
| **Negative Cases** | Good coverage | Excellent coverage | Continue current approach |
| **Business Language** | Clear, readable | Good | Maintain consistency |

---

## Specific Recommendations for Grow with Freya

### 1. **Convert Similar Scenarios to Scenario Outlines**

**Current (Duplicated):**
```gherkin
Scenario: Successful Google OAuth authentication
  Given WireMock is configured for "Google" OAuth provider
  ...

Scenario: Successful Apple OAuth authentication
  Given WireMock is configured for "Apple" OAuth provider
  ...
```

**Recommended (Parameterized):**
```gherkin
Scenario Outline: Successful OAuth authentication
  Given WireMock is configured for "<provider>" OAuth provider
  And a valid "<provider>" OAuth token is available
  When I send a POST request to "/auth/<endpoint>" with the OAuth token
  Then a 200 OK response is returned
  And the response contains field "accessToken"
  Examples:
    | provider | endpoint |
    | Google   | google   |
    | Apple    | apple    |
```

### 2. **Add Ticket/Requirement Tags**

**Recommended:**
```gherkin
@GWF-123 @authentication @security
Scenario: Successful Google OAuth authentication
  ...

@GWF-124 @authentication @token-refresh
Scenario: Refresh token extends session
  ...

@GWF-125 @error-handling @validation
Scenario: Authentication with missing required fields
  ...
```

### 3. **Add HTTP Header Validation**

**Current:**
```gherkin
Then the response status should be 200
And the response should have field "accessToken"
```

**Recommended:**
```gherkin
Then a 200 OK response is returned
And the response header "Content-Type" is "application/json"
And the response header "X-Request-ID" matches UUID pattern
And the response contains field "accessToken" matching JWT pattern
And the response contains field "expiresIn" with integer value 3600
```

### 4. **Use Consistent Step Language**

**Current (Inconsistent):**
```gherkin
Then the response status should be 200
Then a 401 Unauthorized response is returned
Then the response status code should be 400
```

**Recommended (Consistent):**
```gherkin
Then a 200 OK response is returned
Then a 401 Unauthorized response is returned
Then a 400 Bad Request response is returned
```

### 5. **Document System Behavior with Descriptive Scenarios**

**Current:**
```gherkin
Scenario: Refresh token functionality
```

**Recommended:**
```gherkin
Scenario: Refresh token extends session and rotates tokens for security
  # This scenario documents that:
  # 1. Refresh tokens can be used to get new access tokens
  # 2. Both access and refresh tokens are rotated on each refresh
  # 3. Old refresh tokens are invalidated after use
  # 4. Sessions are extended by the refresh operation
```

---

## Implementation Plan

### Phase 1: Add Traceability (Low Effort, High Value)
- [ ] Add `@GWF-XXX` tags to all scenarios
- [ ] Add feature tags (`@authentication`, `@token-refresh`, `@user-profile`)
- [ ] Add category tags (`@security`, `@validation`, `@error-handling`)

### Phase 2: Improve Step Consistency (Medium Effort, High Value)
- [ ] Standardize response status assertions: "a XXX YYY response is returned"
- [ ] Standardize field assertions: "the response contains field X"
- [ ] Standardize header assertions: "the response header X is Y"

### Phase 3: Add Scenario Outlines (Medium Effort, Medium Value)
- [ ] Convert OAuth provider tests to Scenario Outlines
- [ ] Convert error code tests to Scenario Outlines
- [ ] Convert validation tests to Scenario Outlines

### Phase 4: Enhance Validation (High Effort, Medium Value)
- [ ] Add response header validation (Content-Type, X-Request-ID)
- [ ] Add pattern matching (JWT, UUID, ISO-8601 timestamps)
- [ ] Add structural validation (nested fields, arrays)

### Phase 5: Add HTTP Semantics (High Effort, Low Value)
- [ ] Add caching tests (ETag, Cache-Control, 304 Not Modified)
- [ ] Add content negotiation tests (Accept, Content-Type)
- [ ] Add compression tests (Accept-Encoding, gzip)

---

