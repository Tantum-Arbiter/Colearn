package com.app.functest.stepdefs;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

public class TokenRefreshStepDefs extends BaseStepDefs {

    private String refreshToken;
    private String oldRefreshToken;
    private List<Response> concurrentResponses;

    @Given("I have a valid refresh token")
    public void iHaveAValidRefreshToken() {
        this.refreshToken = "gateway-refresh-token-abc123";
        this.oldRefreshToken = this.refreshToken;

        // Create a user and session in Firestore with this refresh token
        // Use the test admin endpoint to create the session
        String userId = "test-user-refresh-" + System.currentTimeMillis();
        String sessionId = "test-session-" + System.currentTimeMillis();

        // Create user via test admin endpoint
        Response createUserResponse = applyDefaultClientHeaders(given())
            .header("Content-Type", "application/json")
            .body(String.format("""
                {
                  "userId": "%s",
                  "email": "refresh-test@example.com",
                  "displayName": "Refresh Test User",
                  "provider": "google",
                  "providerId": "google-refresh-test-123"
                }
                """, userId))
            .when()
            .post("/private/test/create-user");

        if (createUserResponse.getStatusCode() != 200) {
            throw new RuntimeException("Failed to create test user: " + createUserResponse.getBody().asString());
        }

        // Create session via test admin endpoint
        Response createSessionResponse = applyDefaultClientHeaders(given())
            .header("Content-Type", "application/json")
            .body(String.format("""
                {
                  "sessionId": "%s",
                  "userId": "%s",
                  "refreshToken": "%s",
                  "deviceId": "device-123",
                  "deviceType": "mobile",
                  "platform": "ios",
                  "appVersion": "1.0.0"
                }
                """, sessionId, userId, this.refreshToken))
            .when()
            .post("/private/test/create-session");

        if (createSessionResponse.getStatusCode() != 200) {
            throw new RuntimeException("Failed to create test session: " + createSessionResponse.getBody().asString());
        }
    }

    @When("I send a POST request to {string} with raw body:")
    public void iSendAPostRequestWithRawBody(String endpoint, String rawBody) {
        lastResponse = applyDefaultClientHeaders(given())
            .header("Content-Type", "application/json")
            .body(rawBody)
            .when()
            .post(endpoint);
    }

    @When("I send a POST request to {string} without Content-Type header with body:")
    public void iSendAPostRequestWithoutContentTypeHeader(String endpoint, String body) {
        lastResponse = applyDefaultClientHeaders(given())
            .body(body)
            .when()
            .post(endpoint);
    }

    @When("I send {int} concurrent POST requests to {string} with body:")
    public void iSendConcurrentPostRequests(int count, String endpoint, String body) throws ExecutionException, InterruptedException {
        concurrentResponses = new ArrayList<>();
        List<CompletableFuture<Response>> futures = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            CompletableFuture<Response> future = CompletableFuture.supplyAsync(() ->
                applyDefaultClientHeaders(given())
                    .header("Content-Type", "application/json")
                    .body(body)
                    .when()
                    .post(endpoint)
            );
            futures.add(future);
        }

        // Wait for all requests to complete
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get();

        for (CompletableFuture<Response> future : futures) {
            concurrentResponses.add(future.get());
        }
    }

    @Then("the new refresh token should be different from the old one")
    public void theNewRefreshTokenShouldBeDifferent() {
        assertNotNull(lastResponse, "No response received");
        String newRefreshToken = lastResponse.jsonPath().getString("tokens.refreshToken");
        assertNotNull(newRefreshToken, "New refresh token is null");
        assertNotEquals(oldRefreshToken, newRefreshToken, "Refresh token should be rotated");
    }

    @Then("at least {int} request should return status {int}")
    public void atLeastOneRequestShouldReturnStatus(int minCount, int expectedStatus) {
        assertNotNull(concurrentResponses, "No concurrent responses received");
        long successCount = concurrentResponses.stream()
            .filter(r -> r.getStatusCode() == expectedStatus)
            .count();
        assertTrue(successCount >= minCount,
            String.format("Expected at least %d requests with status %d, but got %d",
                minCount, expectedStatus, successCount));
    }

    @Then("the successful response should have field {string}")
    public void theSuccessfulResponseShouldHaveField(String fieldPath) {
        assertNotNull(concurrentResponses, "No concurrent responses received");
        Response successResponse = concurrentResponses.stream()
            .filter(r -> r.getStatusCode() == 200)
            .findFirst()
            .orElseThrow(() -> new AssertionError("No successful response found"));

        Object value = successResponse.jsonPath().get(fieldPath);
        assertNotNull(value, "Field '" + fieldPath + "' is null in successful response");
    }

    @Then("the response field {string} should be a future timestamp")
    public void theResponseFieldShouldBeAFutureTimestamp(String fieldPath) {
        assertNotNull(lastResponse, "No response received");
        Long timestamp = lastResponse.jsonPath().getLong(fieldPath);
        assertNotNull(timestamp, "Timestamp field is null");

        long currentTime = System.currentTimeMillis();
        assertTrue(timestamp > currentTime,
            String.format("Timestamp %d should be in the future (current: %d)", timestamp, currentTime));
    }

    @Then("the token expiration should be approximately {int} seconds from now")
    public void theTokenExpirationShouldBeApproximately(int expectedSeconds) {
        assertNotNull(lastResponse, "No response received");
        Long expiresAt = lastResponse.jsonPath().getLong("tokens.expiresAt");
        assertNotNull(expiresAt, "expiresAt field is null");

        long currentTime = System.currentTimeMillis();
        long expectedExpiration = currentTime + (expectedSeconds * 1000L);
        long tolerance = 10000; // 10 seconds tolerance

        long difference = Math.abs(expiresAt - expectedExpiration);
        assertTrue(difference < tolerance,
            String.format("Token expiration %d is not within %d ms of expected %d (difference: %d)",
                expiresAt, tolerance, expectedExpiration, difference));
    }
}

