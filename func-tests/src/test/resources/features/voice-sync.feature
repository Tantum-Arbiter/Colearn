@voice-sync @local @docker @emulator-only
Feature: Recordings kept online only where the family has a bucket for them
  As the business
  I want voice sync to stay switched off until its private bucket exists
  So that no recording is ever sent anywhere it was not meant to go

  Background:
    Given the gateway service is running
    And I authenticate with Google using a valid ID token

  Scenario: Voice sync answers that it is unavailable while no bucket is configured
    When I send an authenticated GET request to "/api/voice-overs"
    Then the response status should be 503

  @security
  Scenario: Voice sync needs a signed-in grown-up
    When I send an unauthenticated GET request to "/api/voice-overs"
    Then the response status should be 401
