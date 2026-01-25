"""
Shared utilities for Colearn security tests.
Adapted for testing the gateway-service backend API.
"""
import requests
import datetime
import json
import os

# Colearn Gateway Service endpoints
BASE_URL = os.getenv("GATEWAY_BASE_URL", "http://localhost:8080")
AUTH_STATUS_URL = f"{BASE_URL}/auth/status"
AUTH_GOOGLE_URL = f"{BASE_URL}/auth/google"
AUTH_APPLE_URL = f"{BASE_URL}/auth/apple"
AUTH_REFRESH_URL = f"{BASE_URL}/auth/refresh"
AUTH_REVOKE_URL = f"{BASE_URL}/auth/revoke"
PROFILE_URL = f"{BASE_URL}/api/profile"
STORIES_URL = f"{BASE_URL}/api/stories"

# Required client headers for Colearn Gateway Service
DEFAULT_CLIENT_HEADERS = {
    "X-Client-Platform": "ios",
    "X-Client-Version": "1.0.0",
    "X-Device-ID": "test-device-id-12345",
    "Content-Type": "application/json",
}


def get_headers(custom_headers=None):
    """Merge default client headers with custom headers."""
    headers = DEFAULT_CLIENT_HEADERS.copy()
    if custom_headers:
        headers.update(custom_headers)
    return headers


def attempt_auth_status(headers=None):
    """Check auth status endpoint."""
    try:
        merged_headers = get_headers(headers)
        response = requests.get(AUTH_STATUS_URL, headers=merged_headers, timeout=10)
        log_request_response("GET", AUTH_STATUS_URL, None, response)
        return response
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Unable to connect to {AUTH_STATUS_URL}. Exception: {e}")
        return None


def attempt_google_auth(id_token, headers=None):
    """Attempt Google OAuth authentication."""
    try:
        payload = {"idToken": id_token}
        merged_headers = get_headers(headers)
        response = requests.post(AUTH_GOOGLE_URL, json=payload, headers=merged_headers, timeout=10)
        log_request_response("POST", AUTH_GOOGLE_URL, payload, response)
        return response
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Unable to connect to {AUTH_GOOGLE_URL}. Exception: {e}")
        return None


def attempt_apple_auth(id_token, headers=None):
    """Attempt Apple OAuth authentication."""
    try:
        payload = {"idToken": id_token}
        merged_headers = get_headers(headers)
        response = requests.post(AUTH_APPLE_URL, json=payload, headers=merged_headers, timeout=10)
        log_request_response("POST", AUTH_APPLE_URL, payload, response)
        return response
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Unable to connect to {AUTH_APPLE_URL}. Exception: {e}")
        return None


def attempt_token_refresh(refresh_token, headers=None):
    """Attempt to refresh access token."""
    try:
        payload = {"refreshToken": refresh_token}
        merged_headers = get_headers(headers)
        response = requests.post(AUTH_REFRESH_URL, json=payload, headers=merged_headers, timeout=10)
        log_request_response("POST", AUTH_REFRESH_URL, payload, response)
        return response
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Unable to connect to {AUTH_REFRESH_URL}. Exception: {e}")
        return None


def attempt_protected_endpoint(endpoint, access_token=None, headers=None):
    """Attempt to access a protected API endpoint."""
    url = f"{BASE_URL}{endpoint}"
    merged_headers = get_headers(headers)
    if access_token:
        merged_headers["Authorization"] = f"Bearer {access_token}"

    try:
        response = requests.get(url, headers=merged_headers, timeout=10)
        log_request_response("GET", url, None, response)
        return response
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Unable to connect to {url}. Exception: {e}")
        return None


def extract_tokens(response):
    """Extract access and refresh tokens from auth response."""
    try:
        data = response.json()
        access_token = data.get("accessToken")
        refresh_token = data.get("refreshToken")
        if access_token:
            print(f"\nExtracted Access Token: {access_token[:50]}...")
        if refresh_token:
            print(f"Extracted Refresh Token: {refresh_token[:50]}...")
        return access_token, refresh_token
    except Exception as e:
        print(f"Error extracting tokens: {e}")
        return None, None


def log_request_response(method, url, payload, response):
    """Log HTTP request and response details."""
    print("\n========================================")
    print(f"TEST: {method} {url}")
    print(f"Timestamp: {datetime.datetime.now().isoformat()}")
    
    print("\n--- HTTP Request ---")
    print(f"{method} {url}")
    print("Headers: {'Content-Type': 'application/json'}")
    if payload:
        # Mask sensitive data
        safe_payload = {k: "***" if "token" in k.lower() else v for k, v in payload.items()}
        print(f"Payload: {json.dumps(safe_payload, indent=4)}")

    print("\n--- HTTP Response ---")
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    try:
        print(f"Response Body: {response.text[:500]}...")
    except:
        print(f"Response Body: {response.text}")

    print("========================================\n")

