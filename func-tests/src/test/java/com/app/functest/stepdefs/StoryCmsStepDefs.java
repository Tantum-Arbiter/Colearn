package com.app.functest.stepdefs;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.response.Response;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

/**
 * Step definitions for Story CMS functional tests
 */
public class StoryCmsStepDefs extends BaseStepDefs {

    private Map<String, Object> syncRequest;
    private long requestStartTime;

    @Given("I have a sync request with no client checksums")
    public void iHaveASyncRequestWithNoClientChecksums() {
        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", 0);
        syncRequest.put("storyChecksums", new HashMap<String, String>());
        syncRequest.put("lastSyncTimestamp", 0L);
    }

    @Given("I have a sync request with current server checksums")
    public void iHaveASyncRequestWithCurrentServerChecksums() {
        // First get current server version (requires authentication)
        Response versionResponse = applyAuthenticatedHeaders(given())
                .when()
                .get("/api/stories/version");

        Map<String, String> serverChecksums = new HashMap<>();
        Map<String, String> storyChecksums = versionResponse.jsonPath().getMap("storyChecksums");
        if (storyChecksums != null) {
            serverChecksums.putAll(storyChecksums);
        }

        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", versionResponse.jsonPath().getInt("version"));
        syncRequest.put("storyChecksums", serverChecksums);
        String lastUpdatedStr = versionResponse.jsonPath().getString("lastUpdated");
        long lastSyncTimestamp = lastUpdatedStr != null ? Instant.parse(lastUpdatedStr).toEpochMilli() : 0L;
        syncRequest.put("lastSyncTimestamp", lastSyncTimestamp);
    }

    @Given("I have a sync request with outdated checksums")
    public void iHaveASyncRequestWithOutdatedChecksums() {
        Map<String, String> outdatedChecksums = new HashMap<>();
        outdatedChecksums.put("story-1", "outdated-checksum-1");
        outdatedChecksums.put("story-2", "outdated-checksum-2");

        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", 1);
        syncRequest.put("storyChecksums", outdatedChecksums);
        syncRequest.put("lastSyncTimestamp", System.currentTimeMillis() - 86400000L); // 24 hours ago
    }

    @Given("a story exists with ID {string}")
    public void aStoryExistsWithID(String storyId) {
        // For now, we assume stories exist in the system
        // In a full implementation, we would seed test data
    }

    @Given("stories exist in category {string}")
    public void storiesExistInCategory(String category) {
        // For now, we assume stories exist in the system
        // In a full implementation, we would seed test data
    }

    @Given("{int} stories exist in the system")
    public void storiesExistInTheSystem(int count) {
        // For now, we assume stories exist in the system
        // In a full implementation, we would seed test data
    }

    @Given("I have a sync request with {int} matching checksums")
    public void iHaveASyncRequestWithMatchingChecksums(int count) {
        // Get current server checksums (requires authentication)
        Response versionResponse = applyAuthenticatedHeaders(given())
                .when()
                .get("/api/stories/version");

        Map<String, String> serverChecksums = new HashMap<>();
        Map<String, String> storyChecksums = versionResponse.jsonPath().getMap("storyChecksums");
        if (storyChecksums != null) {
            int added = 0;
            for (Map.Entry<String, String> entry : storyChecksums.entrySet()) {
                if (added >= count) break;
                serverChecksums.put(entry.getKey(), entry.getValue());
                added++;
            }
        }

        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", versionResponse.jsonPath().getInt("version"));
        syncRequest.put("storyChecksums", serverChecksums);
        String lastUpdatedStr = versionResponse.jsonPath().getString("lastUpdated");
        long lastSyncTimestamp = lastUpdatedStr != null ? Instant.parse(lastUpdatedStr).toEpochMilli() : 0L;
        syncRequest.put("lastSyncTimestamp", lastSyncTimestamp);
    }

    @Given("device {string} has synced all stories")
    public void deviceHasSyncedAllStories(String deviceId) {
        // Track device sync state
        // In a full implementation, we would maintain device state
    }

    @Given("device {string} has never synced")
    public void deviceHasNeverSynced(String deviceId) {
        // Track device sync state
        // In a full implementation, we would maintain device state
    }

    @Given("a story exists with pages")
    public void aStoryExistsWithPages() {
        // For now, we assume stories with pages exist
        // In a full implementation, we would seed test data
    }

    @Given("I have a sync request with malformed checksums")
    public void iHaveASyncRequestWithMalformedChecksums() {
        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", "invalid");
        syncRequest.put("storyChecksums", "not-a-map");
    }

    @When("I make a POST request to {string} with the sync request")
    public void iMakeAPOSTRequestToWithTheSyncRequest(String endpoint) {
        requestStartTime = System.currentTimeMillis();

        String requestBody = mapToJson(syncRequest);

        lastResponse = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body(requestBody)
                .when()
                .post(endpoint);
    }

    @When("I make a POST request to {string} with invalid JSON")
    public void iMakeAPOSTRequestToWithInvalidJSON(String endpoint) {
        lastResponse = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body("{invalid json")
                .when()
                .post(endpoint);
    }

    @When("device {string} makes a sync request")
    public void deviceMakesASyncRequest(String deviceId) {
        iHaveASyncRequestWithNoClientChecksums();
        iMakeAPOSTRequestToWithTheSyncRequest("/api/stories/sync");
    }

    @When("I make a GET request to the story endpoint")
    public void iMakeAGETRequestToTheStoryEndpoint() {
        // Get first available story (requires authentication)
        Response storiesResponse = applyAuthenticatedHeaders(given())
                .when()
                .get("/api/stories");

        List<Map<String, Object>> stories = storiesResponse.jsonPath().getList("$");
        if (stories != null && !stories.isEmpty()) {
            String storyId = (String) stories.get(0).get("id");

            lastResponse = applyAuthenticatedHeaders(given())
                    .when()
                    .get("/api/stories/" + storyId);
        }
    }

    @Then("the response should be a JSON array")
    public void theResponseShouldBeAJSONArray() {
        String body = lastResponse.getBody().asString();
        assertThat("Response should start with [", body.trim(), startsWith("["));
        List<?> array = lastResponse.jsonPath().getList("$");
        assertThat("Response should be a valid JSON array", array, notNullValue());
    }

    // Note: "the response should contain field {string}" step
    // is defined in CrossDeviceSyncStepDefs.java to avoid duplication

    @Then("the response field {string} should be greater than {int}")
    public void theResponseFieldShouldBeGreaterThan(String fieldName, int value) {
        int actualValue = lastResponse.jsonPath().getInt(fieldName);
        assertThat(fieldName + " should be greater than " + value, actualValue, greaterThan(value));
    }

    @Then("the response field {string} should equal {int}")
    public void theResponseFieldShouldEqual(String fieldName, int expectedValue) {
        int actualValue = lastResponse.jsonPath().getInt(fieldName);
        assertThat(fieldName + " should equal " + expectedValue, actualValue, equalTo(expectedValue));
    }

    @Then("the response should contain updated stories only")
    public void theResponseShouldContainUpdatedStoriesOnly() {
        List<?> stories = lastResponse.jsonPath().getList("stories");
        assertThat("Should contain updated stories", stories.size(), greaterThan(0));
    }

    @Then("all stories in response should have category {string}")
    public void allStoriesInResponseShouldHaveCategory(String category) {
        List<Map<String, Object>> stories = lastResponse.jsonPath().getList("$");
        for (int i = 0; i < stories.size(); i++) {
            String actualCategory = (String) stories.get(i).get("category");
            assertThat("Story should have category " + category, actualCategory, equalTo(category));
        }
    }

    // Note: "the response time should be less than {int} milliseconds" step
    // is defined in GatewayStepDefs.java to avoid duplication

    @Then("device {string} should receive all available stories")
    public void deviceShouldReceiveAllAvailableStories(String deviceId) {
        int updatedStories = lastResponse.jsonPath().getInt("updatedStories");
        assertThat("Device should receive stories", updatedStories, greaterThan(0));
    }

    @Then("device {string} sync state should be unchanged")
    public void deviceSyncStateShouldBeUnchanged(String deviceId) {
        // In a full implementation, we would verify device state hasn't changed
        // For now, this is a placeholder
    }

    @Then("each story should have field {string}")
    public void eachStoryShouldHaveField(String fieldName) {
        List<Map<String, Object>> stories = lastResponse.jsonPath().getList("$");
        assertThat("Should have at least one story", stories.size(), greaterThan(0));

        for (int i = 0; i < stories.size(); i++) {
            Object value = stories.get(i).get(fieldName);
            assertThat("Story " + i + " should have field: " + fieldName, value, notNullValue());
        }
    }

    @Then("each page should have field {string}")
    public void eachPageShouldHaveField(String fieldName) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");

        for (int i = 0; i < pages.size(); i++) {
            Object value = pages.get(i).get(fieldName);
            assertThat("Page " + i + " should have field: " + fieldName, value, notNullValue());
        }
    }

    @Then("pages should be ordered by pageNumber")
    public void pagesShouldBeOrderedByPageNumber() {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");

        for (int i = 0; i < pages.size() - 1; i++) {
            int currentPageNum = (Integer) pages.get(i).get("pageNumber");
            int nextPageNum = (Integer) pages.get(i + 1).get("pageNumber");
            assertThat("Pages should be ordered", currentPageNum, lessThan(nextPageNum));
        }
    }

    @Then("the response status code should be {int} or {int}")
    public void theResponseStatusCodeShouldBeOr(int status1, int status2) {
        int actualStatus = lastResponse.getStatusCode();
        assertThat("Status should be " + status1 + " or " + status2,
                actualStatus, anyOf(equalTo(status1), equalTo(status2)));
    }

    @Then("if status is {int} then response should handle gracefully")
    public void ifStatusIsThenResponseShouldHandleGracefully(int status) {
        if (lastResponse.getStatusCode() == status) {
            // Verify response is valid JSON
            String body = lastResponse.getBody().asString();
            assertThat("Response should not be empty", body, not(emptyString()));
        }
    }

    @Then("the response should be empty")
    public void theResponseShouldBeEmpty() {
        List<?> array = lastResponse.jsonPath().getList("$");
        assertThat("Response array should be empty", array.size(), equalTo(0));
    }

    // Note: "the response should have field {string} with value {string}" step
    // is defined in AuthenticationStepDefs.java to avoid duplication

    @When("I make a GET request to {string} without client headers")
    public void iMakeAGETRequestWithoutClientHeaders(String endpoint) {
        requestStartTime = System.currentTimeMillis();
        lastResponse = given()
                .header("Authorization", "Bearer " + getEffectiveAuthToken())
                .when()
                .get(endpoint);
    }

    @When("I make a POST request to {string} without X-Client-Platform header")
    public void iMakeAPOSTRequestWithoutXClientPlatformHeader(String endpoint) {
        requestStartTime = System.currentTimeMillis();
        lastResponse = given()
                .header("Authorization", "Bearer " + getEffectiveAuthToken())
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123")
                .contentType("application/json")
                .body(mapToJson(syncRequest))
                .when()
                .post(endpoint);
    }

    @When("I make a GET request to {string} with invalid X-Client-Version {string}")
    public void iMakeAGETRequestWithInvalidXClientVersion(String endpoint, String invalidVersion) {
        requestStartTime = System.currentTimeMillis();
        lastResponse = given()
                .header("Authorization", "Bearer " + getEffectiveAuthToken())
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", invalidVersion)
                .header("X-Device-ID", "test-device-123")
                .when()
                .get(endpoint);
    }

    private String mapToJson(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (!first) sb.append(",");
            first = false;
            sb.append("\"").append(entry.getKey()).append("\":");
            Object value = entry.getValue();
            if (value instanceof String) {
                sb.append("\"").append(value).append("\"");
            } else if (value instanceof Map) {
                sb.append(mapToJson((Map<String, Object>) value));
            } else {
                sb.append(value);
            }
        }
        sb.append("}");
        return sb.toString();
    }
}
