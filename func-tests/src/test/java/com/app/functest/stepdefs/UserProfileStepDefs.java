package com.app.functest.stepdefs;

import com.github.tomakehurst.wiremock.client.WireMock;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.*;

public class UserProfileStepDefs extends BaseStepDefs {

    private String accessToken;

    @Given("I have a valid access token")
    public void iHaveAValidAccessToken() {
        this.accessToken = "valid-access-token-abc123";
    }

    @Given("a user profile exists")
    public void aUserProfileExists() {
        // Create a profile in Firestore emulator by making a POST request to the gateway
        // Accept both 201 (created) and 200 (already exists/updated) since Firestore clearing might have race conditions
        applyDefaultClientHeaders(given())
            .header("Authorization", "Bearer " + accessToken)
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
        lastResponse = applyDefaultClientHeaders(given())
            .header("Authorization", "Bearer " + accessToken)
            .when()
            .get(endpoint);

        // Debug logging
        System.out.println("GET " + endpoint + " -> Status: " + lastResponse.getStatusCode());
    }

    @When("I send an authenticated POST request to {string} with body:")
    public void iSendAnAuthenticatedPostRequestToWithBody(String endpoint, String body) {
        lastResponse = applyDefaultClientHeaders(given())
            .header("Authorization", "Bearer " + accessToken)
            .header("Content-Type", "application/json")
            .body(body)
            .when()
            .post(endpoint);

        // Debug logging
        System.out.println("POST " + endpoint + " -> Status: " + lastResponse.getStatusCode());
    }

    @When("I send an unauthenticated GET request to {string}")
    public void iSendAnUnauthenticatedGetRequestTo(String endpoint) {
        lastResponse = applyDefaultClientHeaders(given())
            .when()
            .get(endpoint);
    }
}

