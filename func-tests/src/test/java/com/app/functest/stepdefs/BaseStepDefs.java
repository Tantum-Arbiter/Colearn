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

    /**
     * Apply default client headers to a request
     */
    protected RequestSpecification applyDefaultClientHeaders(RequestSpecification req) {
        return req
            .header("X-Client-Platform", "ios")
            .header("X-Client-Version", "1.0.0")
            .header("X-Device-ID", "device-123")
            .header("User-Agent", "GrowWithFreya/1.0.0 (iOS 17.0)");
    }
}

