package com.app.functest.stepdefs;

import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

/**
 * Base class for step definitions providing common functionality
 *
 * Note: lastResponse is static to share state across all step definition classes
 * in the same scenario. This allows one step definition class to make a request
 * and another to validate the response.
 */
public abstract class BaseStepDefs {

    protected static Response lastResponse;

    // Default test token accepted by JwtAuthenticationFilter in test profile
    protected static final String DEFAULT_TEST_TOKEN = "gateway-access-token";

    // Current auth token for the scenario - set by authentication steps
    protected static String currentAuthToken = null;

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
     * Uses currentAuthToken if set by authentication steps, otherwise uses default.
     */
    protected RequestSpecification applyAuthenticatedHeaders(RequestSpecification req) {
        String token = (currentAuthToken != null && !currentAuthToken.isBlank())
            ? currentAuthToken : DEFAULT_TEST_TOKEN;
        return applyDefaultClientHeaders(req)
            .header("Authorization", "Bearer " + token);
    }

    /**
     * Get the current effective auth token.
     */
    protected String getEffectiveAuthToken() {
        return (currentAuthToken != null && !currentAuthToken.isBlank())
            ? currentAuthToken : DEFAULT_TEST_TOKEN;
    }
}

