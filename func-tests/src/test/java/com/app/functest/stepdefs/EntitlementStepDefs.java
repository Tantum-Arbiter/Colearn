package com.app.functest.stepdefs;

import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class EntitlementStepDefs extends BaseStepDefs {

    private static final String WEBHOOK_SECRET = System.getenv().getOrDefault("REVENUECAT_WEBHOOK_SECRET", "func-test-webhook-secret");

    private static long eventClock = System.currentTimeMillis();

    private String signedInAccountId() {
        String id = applyAuthenticatedHeaders(given()).when().get("/api/account/export").jsonPath().getString("account.id");
        assertTrue(id != null && !id.isBlank(), "no signed-in account");
        return id;
    }

    private void sendWebhook(String secret, String type, String entitlement, String account) {
        long at = ++eventClock;
        String body = """
                {"api_version":"1.0","event":{"type":"%s","app_user_id":"%s","entitlement_ids":["%s"],
                "expiration_at_ms":%d,"event_timestamp_ms":%d,"environment":"SANDBOX"}}
                """.formatted(type, account, entitlement, at + 30L * 24 * 3600 * 1000, at);
        lastResponse = given()
                .header("Authorization", "Bearer " + secret)
                .contentType("application/json")
                .body(body)
                .when()
                .post("/webhooks/revenuecat");
    }

    @When("RevenueCat reports an {string} of {string} for the signed-in account")
    public void revenueCatReportsForTheSignedInAccount(String type, String entitlement) {
        sendWebhook(WEBHOOK_SECRET, type, entitlement, signedInAccountId());
    }

    @When("RevenueCat reports an {string} of {string} for the account {string}")
    public void revenueCatReportsForTheAccount(String type, String entitlement, String account) {
        sendWebhook(WEBHOOK_SECRET, type, entitlement, account);
    }

    @When("a webhook arrives with the secret {string}")
    public void aWebhookArrivesWithTheSecret(String secret) {
        sendWebhook(secret, "INITIAL_PURCHASE", "premium_access", "anyone");
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
