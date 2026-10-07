package com.app.functest.stepdefs;

import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class EntitlementStepDefs extends BaseStepDefs {

    @When("the app asks the gateway to refresh the subscription")
    public void theAppAsksTheGatewayToRefreshTheSubscription() {
        lastResponse = applyAuthenticatedHeaders(given()).when().post("/api/entitlements/refresh");
    }

    @When("the app asks the gateway to refresh the subscription with body:")
    public void theAppAsksTheGatewayToRefreshTheSubscriptionWithBody(String body) {
        lastResponse = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body(body)
                .when()
                .post("/api/entitlements/refresh");
    }

    @When("I send an unauthenticated POST request to {string}")
    public void iSendAnUnauthenticatedPostRequestTo(String endpoint) {
        lastResponse = applyDefaultClientHeaders(given()).contentType("application/json").when().post(endpoint);
    }

    @When("the app says {string} left the device")
    public void theAppSaysTheStoryLeftTheDevice(String storyId) {
        lastResponse = applyAuthenticatedHeaders(given()).when().delete("/api/stories/" + storyId + "/download");
    }

    @Then("the export shows the subscription {string}")
    public void theExportShowsTheSubscription(String tier) {
        String exported = applyAuthenticatedHeaders(given()).when().get("/api/account/export").jsonPath().getString("subscription.tier");
        assertEquals(tier, exported);
    }

    @Then("the export lists the downloaded story {string}")
    public void theExportListsTheDownloadedStory(String storyId) {
        assertTrue(downloadedStories().contains(storyId));
    }

    @Then("the export does not list the downloaded story {string}")
    public void theExportDoesNotListTheDownloadedStory(String storyId) {
        assertFalse(downloadedStories().contains(storyId));
    }

    private List<String> downloadedStories() {
        return applyAuthenticatedHeaders(given()).when().get("/api/account/export").jsonPath().getList("downloadedStories", String.class);
    }
}
