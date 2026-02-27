package com.app.functest.stepdefs;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.response.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

/**
 * Step definitions for batch processing endpoints:
 * - POST /api/stories/delta - Delta sync with checksums
 * - POST /api/assets/batch-urls - Batch signed URL generation
 *
 * These endpoints reduce API calls by 95%+ during sync operations.
 */
public class BatchProcessingStepDefs extends BaseStepDefs {

    private static final Logger log = LoggerFactory.getLogger(BatchProcessingStepDefs.class);

    private Map<String, Object> deltaSyncRequest;
    private Map<String, Object> batchUrlsRequest;
    private long requestStartTime;

    // ============================================
    // Delta Sync Steps (POST /api/stories/delta)
    // ============================================

    @Given("I have a delta sync request with no client checksums")
    public void iHaveADeltaSyncRequestWithNoClientChecksums() {
        deltaSyncRequest = new HashMap<>();
        deltaSyncRequest.put("clientVersion", 0);
        deltaSyncRequest.put("storyChecksums", new HashMap<String, String>());
    }

    @Given("I have a delta sync request with client version {int}")
    public void iHaveADeltaSyncRequestWithClientVersion(int version) {
        deltaSyncRequest = new HashMap<>();
        deltaSyncRequest.put("clientVersion", version);
        deltaSyncRequest.put("storyChecksums", new HashMap<String, String>());
    }

    @Given("I have a delta sync request with current server checksums")
    public void iHaveADeltaSyncRequestWithCurrentServerChecksums() {
        // First get current content version
        Response versionResponse = applyAuthenticatedHeaders(given())
                .when()
                .get("/api/stories/version");

        int serverVersion = versionResponse.jsonPath().getInt("version");
        Map<String, String> serverChecksums = versionResponse.jsonPath().getMap("storyChecksums");

        deltaSyncRequest = new HashMap<>();
        deltaSyncRequest.put("clientVersion", serverVersion);
        deltaSyncRequest.put("storyChecksums", serverChecksums != null ? serverChecksums : new HashMap<>());

        log.info("Created delta sync request with server version {} and {} checksums",
                serverVersion, serverChecksums != null ? serverChecksums.size() : 0);
    }

    @Given("I have a delta sync request with outdated checksums")
    public void iHaveADeltaSyncRequestWithOutdatedChecksums() {
        Map<String, String> outdatedChecksums = new HashMap<>();
        outdatedChecksums.put("test-story-1", "outdated-checksum-abc");
        outdatedChecksums.put("test-story-2", "outdated-checksum-def");

        deltaSyncRequest = new HashMap<>();
        deltaSyncRequest.put("clientVersion", 1);
        deltaSyncRequest.put("storyChecksums", outdatedChecksums);
    }

    @Given("I have a delta sync request with {int} story checksums")
    public void iHaveADeltaSyncRequestWithStoryChecksums(int count) {
        Map<String, String> checksums = new HashMap<>();
        for (int i = 0; i < count; i++) {
            checksums.put("test-story-" + i, "checksum-" + i);
        }

        deltaSyncRequest = new HashMap<>();
        deltaSyncRequest.put("clientVersion", 1);
        deltaSyncRequest.put("storyChecksums", checksums);
    }

    @When("I make a POST request to {string} with the delta sync request")
    public void iMakeAPOSTRequestToWithTheDeltaSyncRequest(String endpoint) {
        requestStartTime = System.currentTimeMillis();
        String requestBody = mapToJson(deltaSyncRequest);

        log.info("Sending delta sync request to {}: {}", endpoint, requestBody);

        lastResponse = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body(requestBody)
                .when()
                .post(endpoint);

        log.info("Delta sync response: {} - {}", lastResponse.getStatusCode(),
                lastResponse.getBody().asString().substring(0, Math.min(500, lastResponse.getBody().asString().length())));
    }

    @Then("the delta response should contain field {string}")
    public void theDeltaResponseShouldContainField(String fieldName) {
        Object value = lastResponse.jsonPath().get(fieldName);
        assertThat("Response should contain field: " + fieldName, value, notNullValue());
    }

    @Then("the delta response field {string} should be an array")
    public void theDeltaResponseFieldShouldBeAnArray(String fieldName) {
        List<?> value = lastResponse.jsonPath().getList(fieldName);
        assertThat("Field " + fieldName + " should be an array", value, notNullValue());
    }

    @Then("the delta response should have {int} or more updated stories")
    public void theDeltaResponseShouldHaveOrMoreUpdatedStories(int minCount) {
        List<?> stories = lastResponse.jsonPath().getList("stories");
        assertThat("Should have at least " + minCount + " updated stories",
                stories.size(), greaterThanOrEqualTo(minCount));
    }

    @Then("the delta response should have {int} updated stories")
    public void theDeltaResponseShouldHaveUpdatedStories(int count) {
        List<?> stories = lastResponse.jsonPath().getList("stories");
        assertThat("Should have exactly " + count + " updated stories",
                stories.size(), equalTo(count));
    }

    @Then("the delta response updatedCount should equal {int}")
    public void theDeltaResponseUpdatedCountShouldEqual(int count) {
        int updatedCount = lastResponse.jsonPath().getInt("updatedCount");
        assertThat("updatedCount should equal " + count, updatedCount, equalTo(count));
    }

    @Then("the delta response should include story checksums")
    public void theDeltaResponseShouldIncludeStoryChecksums() {
        Map<String, String> checksums = lastResponse.jsonPath().getMap("storyChecksums");
        assertThat("Response should include storyChecksums", checksums, notNullValue());
    }

    // ============================================
    // Batch URLs Steps (POST /api/assets/batch-urls)
    // ============================================

    @Given("I have a batch URL request with {int} asset paths")
    public void iHaveABatchURLRequestWithAssetPaths(int count) {
        List<String> paths = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            paths.add("stories/test-story-" + i + "/cover.webp");
        }

        batchUrlsRequest = new HashMap<>();
        batchUrlsRequest.put("paths", paths);
    }

    @Given("I have a batch URL request with valid asset paths")
    public void iHaveABatchURLRequestWithValidAssetPaths() {
        List<String> paths = new ArrayList<>();
        paths.add("stories/test-story-1/cover.webp");
        paths.add("stories/test-story-1/page1.webp");
        paths.add("stories/test-story-2/cover.webp");

        batchUrlsRequest = new HashMap<>();
        batchUrlsRequest.put("paths", paths);
    }

    @Given("I have a batch URL request with empty paths")
    public void iHaveABatchURLRequestWithEmptyPaths() {
        batchUrlsRequest = new HashMap<>();
        batchUrlsRequest.put("paths", new ArrayList<>());
    }

    @Given("I have a batch URL request with {int} paths exceeding limit")
    public void iHaveABatchURLRequestWithPathsExceedingLimit(int count) {
        List<String> paths = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            paths.add("stories/test-story-" + i + "/cover.webp");
        }

        batchUrlsRequest = new HashMap<>();
        batchUrlsRequest.put("paths", paths);
    }

    @Given("I have a batch URL request with invalid paths")
    public void iHaveABatchURLRequestWithInvalidPaths() {
        List<String> paths = new ArrayList<>();
        paths.add("../etc/passwd");
        paths.add("/absolute/path/file.txt");
        paths.add("invalid/prefix/file.webp");

        batchUrlsRequest = new HashMap<>();
        batchUrlsRequest.put("paths", paths);
    }

    @When("I make a POST request to {string} with the batch URL request")
    public void iMakeAPOSTRequestToWithTheBatchURLRequest(String endpoint) {
        requestStartTime = System.currentTimeMillis();
        String requestBody = mapToJson(batchUrlsRequest);

        log.info("Sending batch URL request to {}: {}", endpoint, requestBody);

        lastResponse = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body(requestBody)
                .when()
                .post(endpoint);

        log.info("Batch URL response: {} - {}",
                lastResponse.getStatusCode(),
                lastResponse.getBody().asString().substring(0, Math.min(500, lastResponse.getBody().asString().length())));
    }

    @Then("the batch URL response should contain {int} or more URLs")
    public void theBatchURLResponseShouldContainOrMoreURLs(int minCount) {
        List<?> urls = lastResponse.jsonPath().getList("urls");
        assertThat("Should have at least " + minCount + " URLs",
                urls.size(), greaterThanOrEqualTo(minCount));
    }

    @Then("the batch URL response should contain field {string}")
    public void theBatchURLResponseShouldContainField(String fieldName) {
        Object value = lastResponse.jsonPath().get(fieldName);
        assertThat("Response should contain field: " + fieldName, value, notNullValue());
    }

    @Then("each batch URL entry should have path and signedUrl")
    public void eachBatchURLEntryShouldHavePathAndSignedUrl() {
        List<Map<String, Object>> urls = lastResponse.jsonPath().getList("urls");
        for (int i = 0; i < urls.size(); i++) {
            Map<String, Object> entry = urls.get(i);
            assertThat("URL entry " + i + " should have path", entry.get("path"), notNullValue());
            assertThat("URL entry " + i + " should have signedUrl", entry.get("signedUrl"), notNullValue());
        }
    }

    @Then("the batch URL response failed list should be empty")
    public void theBatchURLResponseFailedListShouldBeEmpty() {
        List<?> failed = lastResponse.jsonPath().getList("failed");
        assertThat("Failed list should be empty or null", failed == null || failed.isEmpty(), is(true));
    }

    @Then("if status is {int} then failed list should contain rejected paths")
    public void ifStatusIsThenFailedListShouldContainRejectedPaths(int successStatus) {
        if (lastResponse.getStatusCode() == successStatus) {
            List<?> failed = lastResponse.jsonPath().getList("failed");
            assertThat("Failed list should contain rejected paths when status is " + successStatus,
                    failed != null && !failed.isEmpty(), is(true));
            log.info("Rejected paths in failed list: {}", failed);
        }
    }

    // ============================================
    // Helper Methods
    // ============================================

    @SuppressWarnings("unchecked")
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
            } else if (value instanceof List) {
                sb.append(listToJson((List<?>) value));
            } else {
                sb.append(value);
            }
        }
        sb.append("}");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String listToJson(List<?> list) {
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        for (Object item : list) {
            if (!first) sb.append(",");
            first = false;
            if (item instanceof String) {
                sb.append("\"").append(item).append("\"");
            } else if (item instanceof Map) {
                sb.append(mapToJson((Map<String, Object>) item));
            } else {
                sb.append(item);
            }
        }
        sb.append("]");
        return sb.toString();
    }
}

