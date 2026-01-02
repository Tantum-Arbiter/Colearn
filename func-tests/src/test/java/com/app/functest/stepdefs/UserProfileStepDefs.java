package com.app.functest.stepdefs;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.is;

public class UserProfileStepDefs extends BaseStepDefs {

    @Given("I have a valid access token")
    public void iHaveAValidAccessToken() {
        if (isGcpMode()) {
            // In GCP mode, get a real token via Firebase authentication
            String token = getGcpAuthToken();
            if (token == null || token.isBlank()) {
                throw new IllegalStateException("GCP mode requires Firebase authentication but no token was obtained");
            }
            currentAuthToken = token;
        } else {
            // In local/Docker mode, use a unique test token per scenario for test isolation
            // This ensures each scenario gets a fresh user without leftover profile data
            currentAuthToken = "gateway-access-token-" + System.currentTimeMillis() + "-" + System.nanoTime();
        }
    }

    @Given("a user profile exists")
    public void aUserProfileExists() {
        // Create a profile by making a POST request to the gateway
        applyAuthenticatedHeaders(given())
            .header("Content-Type", "application/json")
            .body("""
                {
                  "nickname": "Freya",
                  "avatarType": "girl",
                  "avatarId": "girl_1",
                  "notifications": {
                    "enabled": true,
                    "storyReminders": true,
                    "emotionCheckIns": true,
                    "bedtimeReminders": true,
                    "soundEnabled": true,
                    "vibrationEnabled": false
                  },
                  "schedule": {
                    "storyTime": {
                      "time": "19:00",
                      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
                    },
                    "bedtime": {
                      "time": "20:00",
                      "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
                    },
                    "emotionCheckIns": {
                      "morning": { "time": "08:00", "enabled": true },
                      "afternoon": { "time": "15:00", "enabled": true },
                      "evening": { "time": "19:00", "enabled": true }
                    }
                  }
                }
                """)
            .when()
            .post("/api/profile")
            .then()
            .statusCode(anyOf(is(200), is(201)));
    }

    @When("I send an authenticated GET request to {string}")
    public void iSendAnAuthenticatedGetRequestTo(String endpoint) {
        lastResponse = applyAuthenticatedHeaders(given())
            .when()
            .get(endpoint);

        System.out.println("GET " + endpoint + " -> Status: " + lastResponse.getStatusCode());
    }

    @When("I send an authenticated POST request to {string} with body:")
    public void iSendAnAuthenticatedPostRequestToWithBody(String endpoint, String body) {
        lastResponse = applyAuthenticatedHeaders(given())
            .header("Content-Type", "application/json")
            .body(body)
            .when()
            .post(endpoint);

        System.out.println("POST " + endpoint + " -> Status: " + lastResponse.getStatusCode());
    }

    @When("I send an unauthenticated GET request to {string}")
    public void iSendAnUnauthenticatedGetRequestTo(String endpoint) {
        lastResponse = applyDefaultClientHeaders(given())
            .when()
            .get(endpoint);
    }
}

