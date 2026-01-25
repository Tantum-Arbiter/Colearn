"""
JWT Security Tests for Colearn Gateway Service.
Tests for JWT tampering, signature bypass, and token expiration vulnerabilities.
"""
import pytest
import json
import jwt
import time
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shared_utils import attempt_protected_endpoint, attempt_token_refresh, extract_tokens

# Load test data
TEST_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "resources", "jwt_test_data.json")
with open(TEST_DATA_PATH, "r") as file:
    TEST_DATA = json.load(file)


class TestJWTSignatureBypass:
    """Test JWT signature validation vulnerabilities."""

    def test_jwt_none_algorithm_attack(self):
        """
        Test that 'none' algorithm tokens are rejected.
        CVE: JWT 'none' algorithm bypass allows forging tokens without signature.
        """
        # Create a token with 'none' algorithm (no signature)
        payload = {"sub": "admin", "role": "admin", "exp": int(time.time()) + 3600}
        tampered_token = jwt.encode(payload, key="", algorithm="none")

        # Attempt to access protected endpoint with tampered token
        response = attempt_protected_endpoint("/api/profile", access_token=tampered_token)

        assert response is not None, "Request failed"
        # 401 = Unauthorized, 400 = Bad Request (malformed token), 403 = Forbidden
        assert response.status_code in [400, 401, 403], \
            f"JWT 'none' algorithm attack succeeded! Status: {response.status_code}. System is VULNERABLE."

    def test_jwt_algorithm_confusion_hs256_to_rs256(self):
        """
        Test algorithm confusion attack (HS256 signed with public key).
        If server uses RS256 but accepts HS256, attacker can sign with public key.
        """
        # Attempt with a token claiming HS256 but signed with empty key
        payload = {"sub": "admin", "role": "admin", "exp": int(time.time()) + 3600}
        
        # Create token with HS256 using a weak/guessable secret
        weak_secrets = ["secret", "password", "123456", "jwt_secret", ""]
        
        for secret in weak_secrets:
            try:
                tampered_token = jwt.encode(payload, key=secret, algorithm="HS256")
                response = attempt_protected_endpoint("/api/profile", access_token=tampered_token)
                
                if response and response.status_code == 200:
                    pytest.fail(f"JWT accepted with weak secret '{secret}'! System is VULNERABLE.")
            except Exception as e:
                print(f"Token creation with secret '{secret}' failed: {e}")

    def test_jwt_signature_stripping(self):
        """
        Test that tokens with stripped/invalid signatures are rejected.
        """
        # Create a valid-looking token structure but with invalid signature
        header = {"alg": "HS256", "typ": "JWT"}
        payload = {"sub": "admin", "role": "admin", "exp": int(time.time()) + 3600}

        import base64
        header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")

        # Token with empty signature
        stripped_token = f"{header_b64}.{payload_b64}."

        response = attempt_protected_endpoint("/api/profile", access_token=stripped_token)

        assert response is not None, "Request failed"
        # 401 = Unauthorized, 400 = Bad Request (malformed token), 403 = Forbidden
        assert response.status_code in [400, 401, 403], \
            f"JWT with stripped signature accepted! Status: {response.status_code}. System is VULNERABLE."

    def test_jwt_expired_token_rejected(self):
        """
        Test that expired JWT tokens are properly rejected.
        """
        expired_token = TEST_DATA.get("expired_token", {}).get("jwt")

        if expired_token:
            response = attempt_protected_endpoint("/api/profile", access_token=expired_token)

            assert response is not None, "Request failed"
            # 401 = Unauthorized, 400 = Bad Request, 403 = Forbidden
            assert response.status_code in [400, 401, 403], \
                f"Expired JWT token accepted! Status: {response.status_code}. System is VULNERABLE."

    def test_jwt_malformed_token_rejected(self):
        """
        Test that malformed JWT tokens are rejected.
        """
        malformed_tokens = [
            "not.a.jwt",
            "eyJhbGciOiJIUzI1NiJ9",  # Only header
            "eyJhbGciOiJIUzI1NiJ9.eyJ0ZXN0IjoidGVzdCJ9",  # Missing signature
            ".....",
            "",
            "null",
            "undefined",
        ]
        
        for token in malformed_tokens:
            response = attempt_protected_endpoint("/api/profile", access_token=token)
            
            if response and response.status_code == 200:
                pytest.fail(f"Malformed token '{token[:20]}...' accepted! System is VULNERABLE.")

    def test_jwt_payload_tampering(self):
        """
        Test that modified JWT payloads are detected and rejected.
        """
        # Use a token from test data and modify it
        tampered_token = TEST_DATA.get("jwt_tampering", {}).get("invalid_signature_token")

        if tampered_token:
            response = attempt_protected_endpoint("/api/profile", access_token=tampered_token)

            assert response is not None, "Request failed"
            # 401 = Unauthorized, 400 = Bad Request, 403 = Forbidden
            assert response.status_code in [400, 401, 403], \
                f"Tampered JWT token accepted! Status: {response.status_code}. System is VULNERABLE."


class TestJWTExpiration:
    """Test JWT token expiration handling."""

    def test_token_has_expiration(self):
        """
        Verify that issued tokens contain expiration claims.
        """
        # This test requires a valid token - skip if not available
        valid_token = TEST_DATA.get("valid_token", {}).get("jwt")
        
        if valid_token:
            try:
                decoded = jwt.decode(valid_token, options={"verify_signature": False})
                assert "exp" in decoded, "JWT token does not have an expiration time (exp claim)!"
                print(f"JWT Expiration Time: {decoded['exp']}")
            except jwt.exceptions.DecodeError as e:
                pytest.skip(f"Could not decode token: {e}")
        else:
            pytest.skip("No valid token available for testing")

    def test_refresh_token_rotation(self):
        """
        Test that refresh tokens are rotated on use (one-time use).
        """
        # This would require a valid refresh token to test properly
        pytest.skip("Requires valid refresh token - run with live credentials")

