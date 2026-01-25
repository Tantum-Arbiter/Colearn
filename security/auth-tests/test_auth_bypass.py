"""
Authentication Bypass Tests for Colearn Gateway Service.
Tests for injection attacks, unauthorized access, and authentication bypass vulnerabilities.
"""
import pytest
import json
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shared_utils import (
    attempt_google_auth,
    attempt_apple_auth,
    attempt_protected_endpoint,
    attempt_auth_status
)

# Load test data
TEST_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "resources", "credentials_test_data.json")
with open(TEST_DATA_PATH, "r") as file:
    TEST_DATA = json.load(file)


class TestInjectionAttacks:
    """Test for various injection attack vectors."""

    @pytest.mark.parametrize("payload", TEST_DATA["sql_injections"])
    def test_sql_injection_google_auth(self, payload):
        """
        Test SQL injection attempts via Google OAuth endpoint.
        The idToken field should be properly sanitized.
        """
        response = attempt_google_auth(payload["token"])
        
        assert response is not None, "Request failed"
        # Should get 401 (invalid token) not 500 (SQL error) or 200 (bypass)
        assert response.status_code in [400, 401, 403], \
            f"SQL Injection may have succeeded! Status: {response.status_code}"

    @pytest.mark.parametrize("payload", TEST_DATA["sql_injections"])
    def test_sql_injection_apple_auth(self, payload):
        """
        Test SQL injection attempts via Apple OAuth endpoint.
        """
        response = attempt_apple_auth(payload["token"])
        
        assert response is not None, "Request failed"
        assert response.status_code in [400, 401, 403], \
            f"SQL Injection may have succeeded! Status: {response.status_code}"

    @pytest.mark.parametrize("payload", TEST_DATA["xss_payloads"])
    def test_xss_in_auth_headers(self, payload):
        """
        Test XSS payloads in authorization headers.
        """
        headers = {"Authorization": f"Bearer {payload}"}
        response = attempt_protected_endpoint("/api/profile", headers=headers)
        
        assert response is not None, "Request failed"
        # Should not reflect XSS payload in response
        if response.text:
            assert payload not in response.text, \
                f"XSS payload reflected in response! System is VULNERABLE."


class TestUnauthorizedAccess:
    """Test unauthorized access attempts."""

    def test_access_without_token(self):
        """
        Test accessing protected endpoints without any authentication.
        """
        protected_endpoints = [
            "/api/profile",
            "/api/stories",
            "/api/user/preferences",
        ]
        
        for endpoint in protected_endpoints:
            response = attempt_protected_endpoint(endpoint, access_token=None)
            
            assert response is not None, f"Request to {endpoint} failed"
            assert response.status_code == 401, \
                f"Endpoint {endpoint} accessible without auth! Status: {response.status_code}"

    def test_access_with_empty_token(self):
        """
        Test accessing protected endpoints with empty bearer token.
        """
        response = attempt_protected_endpoint("/api/profile", access_token="")
        
        assert response is not None, "Request failed"
        assert response.status_code == 401, \
            f"Empty token accepted! Status: {response.status_code}"

    def test_access_with_null_token(self):
        """
        Test accessing protected endpoints with 'null' or 'undefined' as token.
        """
        null_tokens = ["null", "undefined", "None", "nil"]
        
        for token in null_tokens:
            response = attempt_protected_endpoint("/api/profile", access_token=token)
            
            if response and response.status_code == 200:
                pytest.fail(f"Token '{token}' accepted! System is VULNERABLE.")


class TestOAuthBypass:
    """Test OAuth authentication bypass attempts."""

    def test_empty_id_token_google(self):
        """
        Test Google OAuth with empty id token.
        """
        response = attempt_google_auth("")
        
        assert response is not None, "Request failed"
        assert response.status_code in [400, 401], \
            f"Empty id token accepted! Status: {response.status_code}"

    def test_empty_id_token_apple(self):
        """
        Test Apple OAuth with empty id token.
        """
        response = attempt_apple_auth("")
        
        assert response is not None, "Request failed"
        assert response.status_code in [400, 401], \
            f"Empty id token accepted! Status: {response.status_code}"

    def test_malformed_id_token(self):
        """
        Test OAuth with malformed id tokens.
        """
        malformed_tokens = [
            "not.a.valid.token",
            "eyJhbGciOiJSUzI1NiJ9",  # Incomplete
            "<script>alert(1)</script>",
            "' OR '1'='1",
            "${7*7}",  # SSTI attempt
        ]
        
        for token in malformed_tokens:
            google_response = attempt_google_auth(token)
            apple_response = attempt_apple_auth(token)
            
            if google_response and google_response.status_code == 200:
                pytest.fail(f"Malformed token accepted by Google auth: {token[:20]}...")
            if apple_response and apple_response.status_code == 200:
                pytest.fail(f"Malformed token accepted by Apple auth: {token[:20]}...")

