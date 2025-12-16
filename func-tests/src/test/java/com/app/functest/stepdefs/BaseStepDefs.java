package com.app.functest.stepdefs;

import io.restassured.RestAssured;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import static io.restassured.RestAssured.given;

/**
 * Base class for step definitions providing common functionality
 *
 * Note: lastResponse is static to share state across all step definition classes
 * in the same scenario. This allows one step definition class to make a request
 * and another to validate the response.
 */
public abstract class BaseStepDefs {

    private static final Logger logger = LoggerFactory.getLogger(BaseStepDefs.class);

    protected static Response lastResponse;

    // Default test token accepted by JwtAuthenticationFilter in test profile
    protected static final String DEFAULT_TEST_TOKEN = "gateway-access-token";

    // Current auth token for the scenario - set by authentication steps
    protected static String currentAuthToken = null;

    // GCP Firebase token - obtained once per test run by calling /auth/firebase
    private static String gcpFirebaseToken = null;
    private static boolean gcpTokenFetched = false;

    /**
     * Check if running in GCP mode (no WireMock available).
     * Set TEST_ENV=gcp to run tests against real GCP services.
     */
    protected static boolean isGcpMode() {
        String testEnv = System.getenv("TEST_ENV");
        if (testEnv == null || testEnv.isBlank()) {
            testEnv = System.getProperty("TEST_ENV");
        }
        return "gcp".equalsIgnoreCase(testEnv);
    }

    /**
     * Get the gateway base URL from environment.
     */
    protected static String getGatewayBaseUrl() {
        String cfg = System.getenv("GATEWAY_BASE_URL");
        if (cfg == null || cfg.isBlank()) {
            cfg = System.getProperty("GATEWAY_BASE_URL");
        }
        if (cfg == null || cfg.isBlank()) {
            cfg = "http://gateway:8080";
        }
        return cfg;
    }

    /**
     * In GCP mode, authenticate using Firebase and get a real gateway token.
     * The Firebase ID token is passed via GCP_FIREBASE_ID_TOKEN environment variable.
     * This is called once per test run and the token is cached.
     */
    protected static String getGcpAuthToken() {
        if (!gcpTokenFetched) {
            gcpTokenFetched = true;
            String firebaseIdToken = System.getenv("GCP_FIREBASE_ID_TOKEN");
            if (firebaseIdToken == null || firebaseIdToken.isBlank()) {
                firebaseIdToken = System.getProperty("GCP_FIREBASE_ID_TOKEN");
            }
            if (firebaseIdToken == null || firebaseIdToken.isBlank()) {
                logger.warn("GCP_FIREBASE_ID_TOKEN not set - tests requiring auth may fail");
                return null;
            }

            try {
                String baseUrl = getGatewayBaseUrl();
                logger.info("Authenticating with Firebase at {}/auth/firebase", baseUrl);

                Response response = given()
                        .baseUri(baseUrl)
                        .contentType("application/json")
                        .header("User-Agent", "GrowWithFreya-FuncTest/1.0.0")
                        .header("X-Device-ID", "func-test-device")
                        .body("{\"idToken\": \"" + firebaseIdToken + "\"}")
                        .post("/auth/firebase");

                if (response.getStatusCode() == 200) {
                    gcpFirebaseToken = response.jsonPath().getString("tokens.accessToken");
                    logger.info("Firebase authentication successful - got gateway access token");
                } else {
                    logger.error("Firebase authentication failed: {} - {}",
                            response.getStatusCode(), response.getBody().asString());
                }
            } catch (Exception e) {
                logger.error("Failed to authenticate with Firebase", e);
            }
        }
        return gcpFirebaseToken;
    }

    /**
     * Apply default client headers to a request (no authentication)
     */
    protected RequestSpecification applyDefaultClientHeaders(RequestSpecification req) {
        return req
            .header("X-Client-Platform", "ios")
            .header("X-Client-Version", "1.0.0")
            .header("X-Device-ID", "device-123")
            .header("User-Agent", "GrowWithFreya/1.0.0 (iOS 17.0)");
    }

    /**
     * Apply default client headers with authentication token.
     * Use this for protected /api/** endpoints.
     * In GCP mode, uses Firebase-obtained token.
     * In local/Docker mode, uses currentAuthToken or DEFAULT_TEST_TOKEN.
     */
    protected RequestSpecification applyAuthenticatedHeaders(RequestSpecification req) {
        String token;
        if (isGcpMode()) {
            token = getGcpAuthToken();
            if (token == null) {
                // Fallback - test will likely fail but with clear error
                logger.warn("No GCP auth token available - using default test token (will fail in GCP)");
                token = DEFAULT_TEST_TOKEN;
            }
        } else {
            token = (currentAuthToken != null && !currentAuthToken.isBlank())
                ? currentAuthToken : DEFAULT_TEST_TOKEN;
        }
        return applyDefaultClientHeaders(req)
            .header("Authorization", "Bearer " + token);
    }

    /**
     * Get the current effective auth token.
     */
    protected String getEffectiveAuthToken() {
        if (isGcpMode()) {
            String token = getGcpAuthToken();
            return (token != null) ? token : DEFAULT_TEST_TOKEN;
        }
        return (currentAuthToken != null && !currentAuthToken.isBlank())
            ? currentAuthToken : DEFAULT_TEST_TOKEN;
    }

    /**
     * Reset GCP token state (for testing purposes)
     */
    protected static void resetGcpTokenState() {
        gcpFirebaseToken = null;
        gcpTokenFetched = false;
    }
}

