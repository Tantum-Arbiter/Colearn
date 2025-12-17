package com.app.functest.stepdefs;

import io.cucumber.java.en.Given;
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

    // Track if cleanup has been performed for this test run
    private static boolean cleanupPerformed = false;

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
     *
     * Note: With --ingress=internal-and-cloud-load-balancing, Cloud Run allows internal
     * traffic without IAM tokens. The func-tests run as a Cloud Run Job (internal).
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
     * Get Cloud Armor bypass secret for GCP functional tests.
     * This header allows tests running as Cloud Run Jobs to bypass the Cloudflare-only IP restriction.
     */
    protected static String getCloudArmorBypassSecret() {
        String secret = System.getenv("CLOUD_ARMOR_BYPASS_SECRET");
        if (secret == null || secret.isBlank()) {
            secret = System.getProperty("CLOUD_ARMOR_BYPASS_SECRET");
        }
        return secret;
    }

    /**
     * Apply default client headers to a request (no authentication).
     * In GCP mode, also adds Cloud Armor bypass header.
     */
    protected RequestSpecification applyDefaultClientHeaders(RequestSpecification req) {
        req = req
            .header("X-Client-Platform", "ios")
            .header("X-Client-Version", "1.0.0")
            .header("X-Device-ID", "device-123")
            .header("User-Agent", "GrowWithFreya/1.0.0 (iOS 17.0)");

        String bypassSecret = getCloudArmorBypassSecret();
        if (bypassSecret != null && !bypassSecret.isBlank()) {
            req = req.header("X-Test-Bypass", bypassSecret);
        }
        return req;
    }

    /**
     * Apply default client headers with authentication token.
     * Use this for protected /api/** endpoints.
     * In GCP mode: uses Firebase-authenticated gateway token
     * In local/Docker mode: uses test token or scenario-set token
     */
    protected RequestSpecification applyAuthenticatedHeaders(RequestSpecification req) {
        String appToken;
        if (isGcpMode()) {
            appToken = getGcpAuthToken();
            if (appToken == null) {
                logger.warn("No GCP auth token available - test will fail");
                appToken = DEFAULT_TEST_TOKEN;
            }
        } else {
            appToken = (currentAuthToken != null && !currentAuthToken.isBlank())
                ? currentAuthToken : DEFAULT_TEST_TOKEN;
        }
        return applyDefaultClientHeaders(req)
            .header("Authorization", "Bearer " + appToken);
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

    /**
     * Clean up test data for the authenticated user at the START of tests.
     * This ensures a clean state before running tests while leaving data
     * after tests for manual inspection.
     *
     * In GCP mode: Deletes the user's profile from real Firestore
     * In local mode: No cleanup needed (emulator resets between runs)
     */
    protected void cleanupTestDataForCurrentUser() {
        if (!isGcpMode()) {
            logger.debug("Skipping cleanup in local mode - emulator handles cleanup");
            return;
        }

        if (cleanupPerformed) {
            logger.debug("Cleanup already performed for this test run");
            return;
        }

        String token = getGcpAuthToken();
        if (token == null) {
            logger.warn("No auth token available for cleanup");
            return;
        }

        try {
            String baseUrl = getGatewayBaseUrl();
            logger.info("Cleaning up test data for authenticated user at {}", baseUrl);

            Response response = given()
                    .baseUri(baseUrl)
                    .header("Authorization", "Bearer " + token)
                    .header("X-Client-Platform", "ios")
                    .header("X-Client-Version", "1.0.0")
                    .header("X-Device-ID", "func-test-cleanup")
                    .header("User-Agent", "GrowWithFreya-FuncTest/1.0.0")
                    .delete("/api/profile");

            if (response.getStatusCode() == 200 || response.getStatusCode() == 204) {
                logger.info("Successfully cleaned up user profile");
            } else if (response.getStatusCode() == 404) {
                logger.info("No profile to clean up (404)");
            } else {
                logger.warn("Cleanup returned unexpected status: {} - {}",
                        response.getStatusCode(), response.getBody().asString());
            }

            cleanupPerformed = true;
        } catch (Exception e) {
            logger.error("Failed to clean up test data", e);
        }
    }

    /**
     * Reset cleanup state (for testing purposes)
     */
    protected static void resetCleanupState() {
        cleanupPerformed = false;
    }
}

