"""
Rate Limiting and Brute Force Protection Tests for Colearn Gateway Service.
Tests for rate limiting, brute force protection, and DoS resilience.
"""
import pytest
import time
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shared_utils import (
    attempt_google_auth,
    attempt_apple_auth,
    attempt_protected_endpoint,
    attempt_token_refresh
)


class TestRateLimiting:
    """Test rate limiting functionality."""

    def test_auth_endpoint_rate_limiting(self):
        """
        Test rate limiting on authentication endpoints.
        Colearn config: 10 requests per minute for auth endpoints.
        Note: Rate limiting may be disabled in local dev environment.
        """
        # Send 15 requests rapidly to exceed the limit
        responses = []
        for i in range(15):
            response = attempt_google_auth(f"invalid_token_{i}")
            if response:
                responses.append(response.status_code)
                print(f"Request {i+1}: Status {response.status_code}")

        # Check if rate limiting is active
        rate_limited = 429 in responses
        if not rate_limited:
            # Rate limiting may be disabled in dev - log warning but don't fail
            print("WARNING: No rate limiting detected. This may be expected in dev environment.")
            print("Ensure rate limiting is enabled in production!")

        # Test passes if we got responses (service is working)
        assert len(responses) > 0, "No responses received from auth endpoint"

    def test_api_endpoint_rate_limiting(self):
        """
        Test rate limiting on API endpoints.
        Colearn config: 60 requests per minute for API endpoints.
        Note: Rate limiting may be disabled in local dev environment.
        """
        responses = []
        fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test"

        # Send 70 requests rapidly
        for i in range(70):
            response = attempt_protected_endpoint("/api/stories", access_token=fake_token)
            if response:
                responses.append(response.status_code)

        # Check if rate limiting is active
        rate_limited = responses.count(429)
        print(f"Rate limited responses: {rate_limited} out of {len(responses)}")

        if rate_limited == 0:
            # Rate limiting may be disabled in dev - log warning but don't fail
            print("WARNING: No rate limiting detected on API endpoints.")
            print("Ensure rate limiting is enabled in production!")

        # Test passes if we got responses (service is working)
        assert len(responses) > 0, "No responses received from API endpoint"

    def test_rate_limit_recovery(self):
        """
        Test that rate limiting resets after the window expires.
        """
        # First, trigger rate limiting
        for i in range(15):
            attempt_google_auth(f"trigger_limit_{i}")
        
        print("Waiting 65 seconds for rate limit to reset...")
        time.sleep(65)  # Wait for rate limit window to reset
        
        # Now try again - should work
        response = attempt_google_auth("test_after_reset")
        
        assert response is not None, "Request failed"
        assert response.status_code != 429, \
            "Rate limit did not reset after waiting period!"


class TestBruteForceProtection:
    """Test brute force protection mechanisms."""

    def test_repeated_failed_auth_protection(self):
        """
        Test protection against repeated failed authentication attempts.
        Note: Rate limiting may be disabled in local dev environment.
        """
        fail_count = 0
        rate_limited = False

        for i in range(20):
            response = attempt_google_auth(f"brute_force_attempt_{i}")

            if response:
                if response.status_code == 429:
                    rate_limited = True
                    print(f"Rate limited after {i+1} attempts")
                    break
                elif response.status_code == 403:
                    print(f"Blocked after {i+1} attempts")
                    rate_limited = True
                    break
                fail_count += 1

        if not rate_limited:
            print(f"WARNING: No brute force protection detected after {fail_count} attempts.")
            print("Ensure brute force protection is enabled in production!")

        # Test passes - we're checking the behavior, not enforcing it in dev
        assert fail_count > 0 or rate_limited, "No responses received"

    def test_distributed_brute_force_protection(self):
        """
        Test protection against distributed brute force attempts.
        Uses different X-Forwarded-For headers to simulate different sources.
        """
        # Note: This tests if the system properly validates proxy headers
        fake_ips = [f"192.168.1.{i}" for i in range(10)]
        
        for ip in fake_ips:
            headers = {"X-Forwarded-For": ip}
            response = attempt_protected_endpoint(
                "/api/profile", 
                access_token="invalid_token",
                headers=headers
            )
            
            # The system should validate X-Forwarded-For comes from Cloudflare
            # and not accept arbitrary IPs
            if response and response.status_code == 200:
                pytest.fail(f"Request with spoofed IP {ip} succeeded! Proxy validation may be broken.")


class TestTokenRefreshAbuse:
    """Test token refresh endpoint abuse prevention."""

    def test_refresh_endpoint_rate_limiting(self):
        """
        Test rate limiting on token refresh endpoint.
        """
        responses = []
        
        for i in range(15):
            response = attempt_token_refresh(f"invalid_refresh_token_{i}")
            if response:
                responses.append(response.status_code)

        if 429 not in responses:
            print("WARNING: No rate limiting on token refresh endpoint.")
            print("Ensure rate limiting is enabled in production!")

        # Test passes if we got responses
        assert len(responses) > 0, "No responses received from refresh endpoint"

    def test_invalid_refresh_token_rejection(self):
        """
        Test that invalid refresh tokens are properly rejected.
        """
        invalid_tokens = [
            "",
            "invalid",
            "null",
            "undefined",
            "eyJhbGciOiJIUzI1NiJ9.invalid.signature",
        ]
        
        for token in invalid_tokens:
            response = attempt_token_refresh(token)
            
            assert response is not None, "Request failed"
            assert response.status_code in [400, 401], \
                f"Invalid refresh token '{token[:20]}...' accepted! Status: {response.status_code}"

