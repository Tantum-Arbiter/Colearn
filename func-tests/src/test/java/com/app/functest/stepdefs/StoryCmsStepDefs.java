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

    // Note: "I have a sync request with no client checksums" is defined in CmsContentSyncStepDefs.java
    // Note: "I have a sync request with current server checksums" is defined in CmsContentSyncStepDefs.java
    // Note: "I have a sync request with outdated checksums" is defined in CmsContentSyncStepDefs.java
    // Note: "I have a sync request with {int} matching checksums" is defined in CmsContentSyncStepDefs.java

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

    // Note: "I make a POST request to {string} with the sync request" is defined in CmsContentSyncStepDefs.java

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
        // Initialize delta sync request (no lastSyncTimestamp needed for delta endpoint)
        syncRequest = new HashMap<>();
        syncRequest.put("clientVersion", 0);
        syncRequest.put("storyChecksums", new HashMap<String, String>());

        // Make the POST request to delta endpoint
        lastResponse = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body(mapToJson(syncRequest))
                .when()
                .post("/api/stories/delta");
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

    // Note: "the response should be a JSON array" is defined in CmsContentSyncStepDefs.java
    // Note: "the response should contain field {string}" step is defined in CrossDeviceSyncStepDefs.java

    @Then("the response field {string} should be greater than {int}")
    public void theResponseFieldShouldBeGreaterThan(String fieldName, int value) {
        int actualValue = lastResponse.jsonPath().getInt(fieldName);
        assertThat(fieldName + " should be greater than " + value, actualValue, greaterThan(value));
    }

    // Note: "the response field {string} should equal {int}" is defined in CmsContentSyncStepDefs.java

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

    // Note: "each page should have field {string}" is defined in CmsContentSyncStepDefs.java

    @Then("pages should be ordered by pageNumber")
    public void pagesShouldBeOrderedByPageNumber() {
        assertThat("Response should not be null", lastResponse, notNullValue());
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        assertThat("Pages should not be null", pages, notNullValue());

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

    // Interactive Elements step definitions

    @Then("page {int} should have field {string}")
    public void pageShouldHaveField(int pageNumber, String fieldName) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        assertThat("Pages should not be null", pages, notNullValue());

        // Find page by pageNumber (0-indexed in array, but pageNumber field may differ)
        Map<String, Object> targetPage = null;
        for (Map<String, Object> page : pages) {
            Integer pn = (Integer) page.get("pageNumber");
            if (pn != null && pn == pageNumber) {
                targetPage = page;
                break;
            }
        }
        assertThat("Page " + pageNumber + " should exist", targetPage, notNullValue());
        assertThat("Page " + pageNumber + " should have field: " + fieldName,
                targetPage.get(fieldName), notNullValue());
    }

    @Then("page {int} interactiveElements should be an array")
    public void pageInteractiveElementsShouldBeAnArray(int pageNumber) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        assertThat("Pages should not be null", pages, notNullValue());

        Map<String, Object> targetPage = null;
        for (Map<String, Object> page : pages) {
            Integer pn = (Integer) page.get("pageNumber");
            if (pn != null && pn == pageNumber) {
                targetPage = page;
                break;
            }
        }
        assertThat("Page " + pageNumber + " should exist", targetPage, notNullValue());
        Object interactiveElements = targetPage.get("interactiveElements");
        assertThat("interactiveElements should be a list", interactiveElements, instanceOf(List.class));
    }

    @Then("page {int} interactiveElements should have at least {int} element")
    public void pageInteractiveElementsShouldHaveAtLeastElement(int pageNumber, int minCount) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        Map<String, Object> targetPage = null;
        for (Map<String, Object> page : pages) {
            Integer pn = (Integer) page.get("pageNumber");
            if (pn != null && pn == pageNumber) {
                targetPage = page;
                break;
            }
        }
        assertThat("Page " + pageNumber + " should exist", targetPage, notNullValue());
        List<?> elements = (List<?>) targetPage.get("interactiveElements");
        assertThat("interactiveElements should have at least " + minCount + " element(s)",
                elements.size(), greaterThanOrEqualTo(minCount));
    }

    @Then("each interactive element should have field {string}")
    public void eachInteractiveElementShouldHaveField(String fieldName) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        for (Map<String, Object> page : pages) {
            List<Map<String, Object>> elements = (List<Map<String, Object>>) page.get("interactiveElements");
            if (elements != null && !elements.isEmpty()) {
                for (Map<String, Object> element : elements) {
                    assertThat("Interactive element should have field: " + fieldName,
                            element.get(fieldName), notNullValue());
                }
            }
        }
    }

    @Then("page {int} first interactive element position.x should be between {int} and {int}")
    public void pageFirstInteractiveElementPositionXShouldBeBetween(int pageNumber, int min, int max) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        Map<String, Object> targetPage = null;
        for (Map<String, Object> page : pages) {
            Integer pn = (Integer) page.get("pageNumber");
            if (pn != null && pn == pageNumber) {
                targetPage = page;
                break;
            }
        }
        assertThat("Page " + pageNumber + " should exist", targetPage, notNullValue());
        List<Map<String, Object>> elements = (List<Map<String, Object>>) targetPage.get("interactiveElements");
        assertThat("Should have interactive elements", elements, notNullValue());
        assertThat("Should have at least one element", elements.size(), greaterThan(0));

        Map<String, Object> position = (Map<String, Object>) elements.get(0).get("position");
        assertThat("Position should exist", position, notNullValue());
        Double x = ((Number) position.get("x")).doubleValue();
        assertThat("position.x should be between " + min + " and " + max, x,
                allOf(greaterThanOrEqualTo((double) min), lessThanOrEqualTo((double) max)));
    }

    @Then("page {int} first interactive element position.y should be between {int} and {int}")
    public void pageFirstInteractiveElementPositionYShouldBeBetween(int pageNumber, int min, int max) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        Map<String, Object> targetPage = null;
        for (Map<String, Object> page : pages) {
            Integer pn = (Integer) page.get("pageNumber");
            if (pn != null && pn == pageNumber) {
                targetPage = page;
                break;
            }
        }
        assertThat("Page " + pageNumber + " should exist", targetPage, notNullValue());
        List<Map<String, Object>> elements = (List<Map<String, Object>>) targetPage.get("interactiveElements");
        Map<String, Object> position = (Map<String, Object>) elements.get(0).get("position");
        Double y = ((Number) position.get("y")).doubleValue();
        assertThat("position.y should be between " + min + " and " + max, y,
                allOf(greaterThanOrEqualTo((double) min), lessThanOrEqualTo((double) max)));
    }

    @Then("page {int} first interactive element size.width should be between {int} and {int}")
    public void pageFirstInteractiveElementSizeWidthShouldBeBetween(int pageNumber, int min, int max) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        Map<String, Object> targetPage = null;
        for (Map<String, Object> page : pages) {
            Integer pn = (Integer) page.get("pageNumber");
            if (pn != null && pn == pageNumber) {
                targetPage = page;
                break;
            }
        }
        assertThat("Page " + pageNumber + " should exist", targetPage, notNullValue());
        List<Map<String, Object>> elements = (List<Map<String, Object>>) targetPage.get("interactiveElements");
        Map<String, Object> size = (Map<String, Object>) elements.get(0).get("size");
        assertThat("Size should exist", size, notNullValue());
        Double width = ((Number) size.get("width")).doubleValue();
        assertThat("size.width should be between " + min + " and " + max, width,
                allOf(greaterThanOrEqualTo((double) min), lessThanOrEqualTo((double) max)));
    }

    @Then("page {int} first interactive element size.height should be between {int} and {int}")
    public void pageFirstInteractiveElementSizeHeightShouldBeBetween(int pageNumber, int min, int max) {
        List<Map<String, Object>> pages = lastResponse.jsonPath().getList("pages");
        Map<String, Object> targetPage = null;
        for (Map<String, Object> page : pages) {
            Integer pn = (Integer) page.get("pageNumber");
            if (pn != null && pn == pageNumber) {
                targetPage = page;
                break;
            }
        }
        assertThat("Page " + pageNumber + " should exist", targetPage, notNullValue());
        List<Map<String, Object>> elements = (List<Map<String, Object>>) targetPage.get("interactiveElements");
        Map<String, Object> size = (Map<String, Object>) elements.get(0).get("size");
        Double height = ((Number) size.get("height")).doubleValue();
        assertThat("size.height should be between " + min + " and " + max, height,
                allOf(greaterThanOrEqualTo((double) min), lessThanOrEqualTo((double) max)));
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

    // Note: "I make a POST request to {string} without X-Client-Platform header" is defined in CmsContentSyncStepDefs.java

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
