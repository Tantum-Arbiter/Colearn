package com.app.functest.stepdefs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.response.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.time.Instant;
import java.util.*;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

/**
 * Step definitions for CMS Content Sync functional tests.
 * Supports both local Firestore emulator and GCP integration testing.
 */
public class CmsContentSyncStepDefs extends BaseStepDefs {

    private static final Logger logger = LoggerFactory.getLogger(CmsContentSyncStepDefs.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    // State for sync testing
    private Map<String, Object> syncRequest;
    private Map<String, String> previousChecksums = new HashMap<>();
    private int previousVersion = 0;
    private List<Response> consecutiveSyncResponses = new ArrayList<>();
    private long requestStartTime;

    /**
     * Load test story data from resources
     */
    private JsonNode loadTestStory(String storyId) throws Exception {
        String resourcePath = "/test-data/cms-stories/" + storyId + ".json";
        try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
            if (is == null) {
                throw new RuntimeException("Test story not found: " + resourcePath);
            }
            return objectMapper.readTree(is);
        }
    }

    /**
     * Seed a story to Firestore via the gateway's private seeding endpoint
     */
    private void seedStoryToFirestore(JsonNode story) {
        String storyJson = story.toString();
        logger.info("Seeding story: {}", story.get("id").asText());

        Response response = given()
                .contentType("application/json")
                .body(storyJson)
                .when()
                .post("/private/seed/story");

        if (response.getStatusCode() != 200 && response.getStatusCode() != 201) {
            logger.warn("Failed to seed story: {} - {}", response.getStatusCode(), response.getBody().asString());
        }
    }

    @Given("I seed {int} test stories to the local Firestore emulator")
    public void iSeedTestStoriesToTheLocalFirestoreEmulator(int count) throws Exception {
        logger.info("Seeding {} test stories to Firestore emulator", count);
        for (int i = 1; i <= count; i++) {
            JsonNode story = loadTestStory("test-story-" + i);
            seedStoryToFirestore(story);
        }
    }

    @Given("I seed test story {string} to the local Firestore emulator")
    public void iSeedTestStoryToTheLocalFirestoreEmulator(String storyId) throws Exception {
        logger.info("Seeding test story {} to Firestore emulator", storyId);
        JsonNode story = loadTestStory(storyId);
        seedStoryToFirestore(story);
    }

    @Given("I seed additional story {string} to the emulator")
    public void iSeedAdditionalStoryToTheEmulator(String storyId) throws Exception {
        // Create a new story with the given ID
        String newStory = String.format("""
            {
                "id": "%s",
                "title": "New Story - %s",
                "category": "adventure",
                "tag": "🏷️ New",
                "emoji": "✨",
                "coverImage": "assets/stories/squirrels-snowman/cover/thumbnail.webp",
                "isAvailable": true,
                "ageRange": "2-5",
                "duration": 5,
                "description": "A newly added story for testing.",
                "isPremium": false,
                "author": "Test Author",
                "tags": ["test", "new"],
                "version": 1,
                "checksum": "new-story-checksum-v1",
                "pages": [
                    {"id": "%s-page-1", "pageNumber": 1, "type": "story", "text": "NEW STORY - Page 1"}
                ]
            }
            """, storyId, storyId, storyId);

        Response response = given()
                .contentType("application/json")
                .body(newStory)
                .when()
                .post("/private/seed/story");

        assertThat("Story seeding should succeed", response.getStatusCode(), anyOf(equalTo(200), equalTo(201)));
    }

    @Given("I have performed an initial sync")
    public void iHavePerformedAnInitialSync() {
        // Perform initial sync and store checksums
        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", 0);
        syncRequest.put("storyChecksums", new HashMap<String, String>());
        syncRequest.put("lastSyncTimestamp", 0L);

        Response response = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body(mapToJson(syncRequest))
                .when()
                .post("/api/stories/sync");

        assertThat("Initial sync should succeed", response.getStatusCode(), equalTo(200));

        // Store checksums for later comparison
        previousVersion = response.jsonPath().getInt("serverVersion");
        Map<String, String> checksums = response.jsonPath().getMap("storyChecksums");
        if (checksums != null) {
            previousChecksums.putAll(checksums);
        }
        logger.info("Initial sync complete. Version: {}, Stories: {}", previousVersion, previousChecksums.size());
    }

    @Given("I have a sync request with previous checksums")
    public void iHaveASyncRequestWithPreviousChecksums() {
        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", previousVersion);
        syncRequest.put("storyChecksums", previousChecksums);
        syncRequest.put("lastSyncTimestamp", System.currentTimeMillis() - 60000); // 1 minute ago
    }

    @Given("I update story {string} with new content version {int}")
    public void iUpdateStoryWithNewContentVersion(String storyId, int newVersion) throws Exception {
        JsonNode originalStory = loadTestStory(storyId);
        // Create updated version
        Map<String, Object> updatedStory = objectMapper.convertValue(originalStory, Map.class);
        updatedStory.put("version", newVersion);
        updatedStory.put("checksum", "updated-checksum-" + storyId + "-v" + newVersion);
        updatedStory.put("title", updatedStory.get("title") + " (Updated v" + newVersion + ")");

        Response response = given()
                .contentType("application/json")
                .body(objectMapper.writeValueAsString(updatedStory))
                .when()
                .post("/private/seed/story");

        assertThat("Story update should succeed", response.getStatusCode(), anyOf(equalTo(200), equalTo(201)));
        logger.info("Updated story {} to version {}", storyId, newVersion);
    }

    @Given("I update stories {string} with new content")
    public void iUpdateStoriesWithNewContent(String storyIds) throws Exception {
        String[] ids = storyIds.split(",");
        for (String storyId : ids) {
            iUpdateStoryWithNewContentVersion(storyId.trim(), 2);
        }
    }

    @Given("the story {string} exists in GCP Firestore")
    public void theStoryExistsInGCPFirestore(String storyId) {
        // For GCP tests, we assume the story exists
        // The actual verification happens in the When/Then steps
        logger.info("Assuming story {} exists in GCP Firestore", storyId);
    }

    @When("I perform {int} consecutive sync requests")
    public void iPerformConsecutiveSyncRequests(int count) {
        consecutiveSyncResponses.clear();

        for (int i = 0; i < count; i++) {
            Map<String, Object> request = new HashMap<>();
            request.put("clientVersion", 0);
            request.put("storyChecksums", new HashMap<String, String>());
            request.put("lastSyncTimestamp", 0L);

            Response response = applyAuthenticatedHeaders(given())
                    .contentType("application/json")
                    .body(mapToJson(request))
                    .when()
                    .post("/api/stories/sync");

            consecutiveSyncResponses.add(response);
            logger.info("Sync request {} completed with status {}", i + 1, response.getStatusCode());
        }
    }

    @Then("the response should contain at least {int} stories")
    public void theResponseShouldContainAtLeastStories(int minCount) {
        List<?> stories = lastResponse.jsonPath().getList("$");
        assertThat("Should have at least " + minCount + " stories", stories.size(), greaterThanOrEqualTo(minCount));
    }

    @Then("the response should contain at least {int} story")
    public void theResponseShouldContainAtLeastStory(int minCount) {
        List<?> stories = lastResponse.jsonPath().getList("$");
        assertThat("Should have at least " + minCount + " story", stories.size(), greaterThanOrEqualTo(minCount));
    }

    @Then("each story should have unique text content")
    public void eachStoryShouldHaveUniqueTextContent() {
        List<Map<String, Object>> stories = lastResponse.jsonPath().getList("$");
        Set<String> seenTexts = new HashSet<>();

        for (Map<String, Object> story : stories) {
            String storyId = (String) story.get("id");
            List<Map<String, Object>> pages = (List<Map<String, Object>>) story.get("pages");
            if (pages != null && !pages.isEmpty()) {
                String pageText = (String) pages.get(0).get("text");
                if (pageText != null && pageText.contains("TEST STORY")) {
                    assertThat("Story " + storyId + " should have unique text", seenTexts.contains(pageText), is(false));
                    seenTexts.add(pageText);
                }
            }
        }
    }

    @Then("the response field {string} should have at least {int} items")
    public void theResponseFieldShouldHaveAtLeastItems(String fieldName, int minCount) {
        List<?> items = lastResponse.jsonPath().getList(fieldName);
        assertThat(fieldName + " should have at least " + minCount + " items", items.size(), greaterThanOrEqualTo(minCount));
    }

    @Then("page {int} text should contain {string}")
    public void pageTextShouldContain(int pageNum, String expectedText) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        assertThat("Pages should exist", pages, notNullValue());
        assertThat("Should have enough pages", pages.size(), greaterThan(pageNum));

        String pageText = (String) pages.get(pageNum).get("text");
        assertThat("Page " + pageNum + " text should contain " + expectedText, pageText, containsString(expectedText));
    }

    @Then("story {string} page {int} should contain {string}")
    public void storyPageShouldContain(String storyId, int pageNum, String expectedText) {
        List<Map<String, Object>> stories = lastResponse.jsonPath().getList("$");
        Map<String, Object> targetStory = null;

        for (Map<String, Object> story : stories) {
            if (storyId.equals(story.get("id"))) {
                targetStory = story;
                break;
            }
        }

        assertThat("Story " + storyId + " should exist", targetStory, notNullValue());
        List<Map<String, Object>> pages = (List<Map<String, Object>>) targetStory.get("pages");
        assertThat("Story should have pages", pages, notNullValue());
        assertThat("Story should have enough pages", pages.size(), greaterThan(pageNum));

        String pageText = (String) pages.get(pageNum).get("text");
        assertThat("Page text should contain expected content", pageText, containsString(expectedText));
    }

    @Then("the response field {string} should be at least {int}")
    public void theResponseFieldShouldBeAtLeast(String fieldName, int minValue) {
        int actualValue = lastResponse.jsonPath().getInt(fieldName);
        assertThat(fieldName + " should be at least " + minValue, actualValue, greaterThanOrEqualTo(minValue));
    }

    @Then("the response should contain updated story {string}")
    public void theResponseShouldContainUpdatedStory(String storyId) {
        List<Map<String, Object>> stories = lastResponse.jsonPath().getList("stories");
        boolean found = false;
        for (Map<String, Object> story : stories) {
            if (storyId.equals(story.get("id"))) {
                found = true;
                break;
            }
        }
        assertThat("Response should contain story " + storyId, found, is(true));
    }

    @Then("the response should contain story {string}")
    public void theResponseShouldContainStory(String storyId) {
        theResponseShouldContainUpdatedStory(storyId);
    }

    @Then("all sync responses should have consistent story counts")
    public void allSyncResponsesShouldHaveConsistentStoryCounts() {
        assertThat("Should have sync responses", consecutiveSyncResponses.size(), greaterThan(0));

        int expectedCount = consecutiveSyncResponses.get(0).jsonPath().getInt("totalStories");
        for (int i = 1; i < consecutiveSyncResponses.size(); i++) {
            int actualCount = consecutiveSyncResponses.get(i).jsonPath().getInt("totalStories");
            assertThat("Sync " + (i + 1) + " should have same story count", actualCount, equalTo(expectedCount));
        }
    }

    @Then("all sync responses should have matching checksums")
    public void allSyncResponsesShouldHaveMatchingChecksums() {
        assertThat("Should have sync responses", consecutiveSyncResponses.size(), greaterThan(0));

        Map<String, String> expectedChecksums = consecutiveSyncResponses.get(0).jsonPath().getMap("storyChecksums");
        for (int i = 1; i < consecutiveSyncResponses.size(); i++) {
            Map<String, String> actualChecksums = consecutiveSyncResponses.get(i).jsonPath().getMap("storyChecksums");
            assertThat("Sync " + (i + 1) + " should have matching checksums", actualChecksums, equalTo(expectedChecksums));
        }
    }

    @Then("the response field {string} should not be empty")
    public void theResponseFieldShouldNotBeEmpty(String fieldName) {
        List<?> items = lastResponse.jsonPath().getList(fieldName);
        assertThat(fieldName + " should not be empty", items.size(), greaterThan(0));
    }

    // Note: "the response should contain field {string} with value {string}" is defined in CrossDeviceSyncStepDefs.java
    // Note: "the response should contain field {string}" is defined in CrossDeviceSyncStepDefs.java

    @Then("the response field {string} should equal {int}")
    public void theResponseFieldShouldEqual(String fieldName, int expectedValue) {
        int actualValue = lastResponse.jsonPath().getInt(fieldName);
        assertThat(fieldName + " should equal " + expectedValue, actualValue, equalTo(expectedValue));
    }

    @Then("the response should be a JSON array")
    public void theResponseShouldBeAJsonArray() {
        List<?> array = lastResponse.jsonPath().getList("$");
        assertThat("Response should be a JSON array", array, notNullValue());
    }

    @Then("each page should have field {string}")
    public void eachPageShouldHaveField(String fieldName) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        assertThat("Pages should exist", pages, notNullValue());
        for (int i = 0; i < pages.size(); i++) {
            assertThat("Page " + i + " should have field " + fieldName, pages.get(i).get(fieldName), notNullValue());
        }
    }

    @Given("I have a sync request with no client checksums")
    public void iHaveASyncRequestWithNoClientChecksums() {
        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", 0);
        syncRequest.put("storyChecksums", new HashMap<String, String>());
        syncRequest.put("lastSyncTimestamp", 0L);
    }

    @Given("I have a sync request with current server checksums")
    public void iHaveASyncRequestWithCurrentServerChecksums() {
        // First, get current server state
        Response versionResponse = applyAuthenticatedHeaders(given())
                .when()
                .get("/api/stories/version");

        if (versionResponse.getStatusCode() == 200) {
            int serverVersion = versionResponse.jsonPath().getInt("version");
            Map<String, String> checksums = versionResponse.jsonPath().getMap("storyChecksums");

            syncRequest = new HashMap<>();
            syncRequest.put("clientVersion", serverVersion);
            syncRequest.put("storyChecksums", checksums != null ? checksums : new HashMap<>());
            syncRequest.put("lastSyncTimestamp", System.currentTimeMillis());
        } else {
            // Fallback: use empty checksums
            syncRequest = new HashMap<>();
            syncRequest.put("clientVersion", 0);
            syncRequest.put("storyChecksums", new HashMap<String, String>());
            syncRequest.put("lastSyncTimestamp", 0L);
        }
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

    @When("I make a POST request to {string} with the sync request")
    public void iMakeAPostRequestToWithTheSyncRequest(String endpoint) {
        requestStartTime = System.currentTimeMillis();
        lastResponse = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body(mapToJson(syncRequest))
                .when()
                .post(endpoint);
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

    // Note: "the response time should be less than {int} milliseconds" is defined in GatewayStepDefs.java

    private String mapToJson(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert map to JSON", e);
        }
    }
}

