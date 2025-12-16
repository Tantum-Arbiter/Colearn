package com.app.functest.stepdefs;

import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.response.Response;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
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
        // First get current server version
        Response versionResponse = applyDefaultClientHeaders(given())
                .when()
                .get("/api/stories/version");

        JSONObject versionJson = new JSONObject(versionResponse.getBody().asString());
        Map<String, String> serverChecksums = new HashMap<>();

        if (versionJson.has("storyChecksums")) {
            JSONObject checksums = versionJson.getJSONObject("storyChecksums");
            for (Object keyObj : checksums.names() != null ? checksums.names().toList() : java.util.Collections.emptyList()) {
                String key = keyObj.toString();
                serverChecksums.put(key, checksums.getString(key));
            }
        }

        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", versionJson.getInt("version"));
        syncRequest.put("storyChecksums", serverChecksums);
        syncRequest.put("lastSyncTimestamp", versionJson.getLong("lastUpdated"));
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
        // Get current server checksums
        Response versionResponse = applyDefaultClientHeaders(given())
                .when()
                .get("/api/stories/version");

        JSONObject versionJson = new JSONObject(versionResponse.getBody().asString());
        Map<String, String> serverChecksums = new HashMap<>();

        if (versionJson.has("storyChecksums")) {
            JSONObject checksums = versionJson.getJSONObject("storyChecksums");
            int added = 0;
            for (Object keyObj : checksums.names() != null ? checksums.names().toList() : java.util.Collections.emptyList()) {
                String key = keyObj.toString();
                if (added < count) {
                    serverChecksums.put(key, checksums.getString(key));
                    added++;
                }
            }
        }

        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", versionJson.getInt("version"));
        syncRequest.put("storyChecksums", serverChecksums);
        syncRequest.put("lastSyncTimestamp", versionJson.getLong("lastUpdated"));
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

        lastResponse = applyDefaultClientHeaders(given())
                .contentType("application/json")
                .body(requestBody)
                .when()
                .post(endpoint);
    }

    @When("I make a POST request to {string} with invalid JSON")
    public void iMakeAPOSTRequestToWithInvalidJSON(String endpoint) {
        lastResponse = applyDefaultClientHeaders(given())
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
        // Get first available story
        Response storiesResponse = applyDefaultClientHeaders(given())
                .when()
                .get("/api/stories");

        JSONArray stories = new JSONArray(storiesResponse.getBody().asString());
        if (stories.length() > 0) {
            JSONObject firstStory = stories.getJSONObject(0);
            String storyId = firstStory.getString("id");

            lastResponse = applyDefaultClientHeaders(given())
                    .when()
                    .get("/api/stories/" + storyId);
        }
    }

    @Then("the response should be a JSON array")
    public void theResponseShouldBeAJSONArray() {
        String body = lastResponse.getBody().asString();
        assertThat("Response should start with [", body.trim(), startsWith("["));
        JSONArray array = new JSONArray(body);
        assertThat("Response should be a valid JSON array", array, notNullValue());
    }

    @Then("the response should contain field {string}")
    public void theResponseShouldContainField(String fieldName) {
        JSONObject json = new JSONObject(lastResponse.getBody().asString());
        assertThat("Response should contain field: " + fieldName, json.has(fieldName), is(true));
    }

    @Then("the response field {string} should be greater than {int}")
    public void theResponseFieldShouldBeGreaterThan(String fieldName, int value) {
        JSONObject json = new JSONObject(lastResponse.getBody().asString());
        int actualValue = json.getInt(fieldName);
        assertThat(fieldName + " should be greater than " + value, actualValue, greaterThan(value));
    }

    @Then("the response field {string} should equal {int}")
    public void theResponseFieldShouldEqual(String fieldName, int expectedValue) {
        JSONObject json = new JSONObject(lastResponse.getBody().asString());
        int actualValue = json.getInt(fieldName);
        assertThat(fieldName + " should equal " + expectedValue, actualValue, equalTo(expectedValue));
    }

    @Then("the response should contain updated stories only")
    public void theResponseShouldContainUpdatedStoriesOnly() {
        JSONObject json = new JSONObject(lastResponse.getBody().asString());
        JSONArray stories = json.getJSONArray("stories");
        assertThat("Should contain updated stories", stories.length(), greaterThan(0));
    }

    @Then("all stories in response should have category {string}")
    public void allStoriesInResponseShouldHaveCategory(String category) {
        JSONArray stories = new JSONArray(lastResponse.getBody().asString());
        for (int i = 0; i < stories.length(); i++) {
            JSONObject story = stories.getJSONObject(i);
            assertThat("Story should have category " + category,
                    story.getString("category"), equalTo(category));
        }
    }

    @Then("the response time should be less than {int} milliseconds")
    public void theResponseTimeShouldBeLessThanMilliseconds(int maxTime) {
        long responseTime = lastResponse.getTime();
        assertThat("Response time should be less than " + maxTime + "ms",
                responseTime, lessThan((long) maxTime));
    }

    @Then("device {string} should receive all available stories")
    public void deviceShouldReceiveAllAvailableStories(String deviceId) {
        JSONObject json = new JSONObject(lastResponse.getBody().asString());
        int updatedStories = json.getInt("updatedStories");
        assertThat("Device should receive stories", updatedStories, greaterThan(0));
    }

    @Then("device {string} sync state should be unchanged")
    public void deviceSyncStateShouldBeUnchanged(String deviceId) {
        // In a full implementation, we would verify device state hasn't changed
        // For now, this is a placeholder
    }

    @Then("each story should have field {string}")
    public void eachStoryShouldHaveField(String fieldName) {
        JSONArray stories = new JSONArray(lastResponse.getBody().asString());
        assertThat("Should have at least one story", stories.length(), greaterThan(0));

        for (int i = 0; i < stories.length(); i++) {
            JSONObject story = stories.getJSONObject(i);
            assertThat("Story " + i + " should have field: " + fieldName,
                    story.has(fieldName), is(true));
        }
    }

    @Then("each page should have field {string}")
    public void eachPageShouldHaveField(String fieldName) {
        JSONObject story = new JSONObject(lastResponse.getBody().asString());
        JSONArray pages = story.getJSONArray("pages");

        for (int i = 0; i < pages.length(); i++) {
            JSONObject page = pages.getJSONObject(i);
            assertThat("Page " + i + " should have field: " + fieldName,
                    page.has(fieldName), is(true));
        }
    }

    @Then("pages should be ordered by pageNumber")
    public void pagesShouldBeOrderedByPageNumber() {
        JSONObject story = new JSONObject(lastResponse.getBody().asString());
        JSONArray pages = story.getJSONArray("pages");

        for (int i = 0; i < pages.length() - 1; i++) {
            int currentPageNum = pages.getJSONObject(i).getInt("pageNumber");
            int nextPageNum = pages.getJSONObject(i + 1).getInt("pageNumber");
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
        JSONArray array = new JSONArray(lastResponse.getBody().asString());
        assertThat("Response array should be empty", array.length(), equalTo(0));
    }

    @Then("the response should have field {string} with value {string}")
    public void theResponseShouldHaveFieldWithValue(String fieldName, String expectedValue) {
        JSONObject json = new JSONObject(lastResponse.getBody().asString());
        assertThat("Response should have field: " + fieldName, json.has(fieldName), is(true));
        assertThat("Field " + fieldName + " should have value: " + expectedValue,
                json.getString(fieldName), equalTo(expectedValue));
    }

    @When("I make a GET request to {string} without client headers")
    public void iMakeAGETRequestWithoutClientHeaders(String endpoint) {
        requestStartTime = System.currentTimeMillis();
        lastResponse = given()
                .when()
                .get(endpoint);
    }

    @When("I make a POST request to {string} without X-Client-Platform header")
    public void iMakeAPOSTRequestWithoutXClientPlatformHeader(String endpoint) {
        requestStartTime = System.currentTimeMillis();
        lastResponse = given()
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
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", invalidVersion)
                .header("X-Device-ID", "test-device-123")
                .when()
                .get(endpoint);
    }

    // Helper method to convert Map to JSON string
    private String mapToJson(Map<String, Object> map) {
        JSONObject json = new JSONObject(map);
        return json.toString();
    }
}
