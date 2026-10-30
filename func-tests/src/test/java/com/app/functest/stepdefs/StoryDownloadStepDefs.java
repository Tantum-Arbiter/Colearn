package com.app.functest.stepdefs;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.restassured.response.Response;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class StoryDownloadStepDefs extends BaseStepDefs {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Given("the story {string} is in the catalogue but withdrawn")
    public void theStoryIsInTheCatalogueButWithdrawn(String storyId) throws Exception {
        ObjectNode story = loadStory(storyId);
        story.put("isAvailable", false);
        seed(story);
    }

    @Given("the story {string} is in the catalogue")
    public void theStoryIsInTheCatalogue(String storyId) throws Exception {
        seed(loadStory(storyId));
    }

    private ObjectNode loadStory(String storyId) throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/test-data/cms-stories/" + storyId + ".json")) {
            if (is == null) {
                throw new IllegalStateException("No test story " + storyId);
            }
            return (ObjectNode) objectMapper.readTree(is);
        }
    }

    private void seed(ObjectNode story) {
        Response response = given()
                .contentType("application/json")
                .body(story.toString())
                .when()
                .post("/private/seed/story");
        assertTrue(response.getStatusCode() == 200 || response.getStatusCode() == 201,
                "Seeding failed: " + response.getStatusCode() + " " + response.getBody().asString());
    }

    @Then("the delta response story {string} page {int} reads {string} in {string} for age {string}")
    public void theDeltaResponseStoryPageReads(String storyId, int pageNumber, String expected, String language, String ageGroup) {
        List<Map<String, Object>> stories = lastResponse.jsonPath().getList("stories");
        Map<String, Object> story = stories.stream()
                .filter(s -> storyId.equals(s.get("id")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Delta did not include " + storyId));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> pages = (List<Map<String, Object>>) story.get("pages");
        Map<String, Object> page = pages.stream()
                .filter(p -> ((Number) p.get("pageNumber")).intValue() == pageNumber)
                .findFirst()
                .orElseThrow(() -> new AssertionError("No page " + pageNumber));
        @SuppressWarnings("unchecked")
        Map<String, Map<String, String>> text = (Map<String, Map<String, String>>) page.get("localizedText");
        assertNotNull(text, "page " + pageNumber + " has no localizedText");
        assertNotNull(text.get(ageGroup), "page " + pageNumber + " has no " + ageGroup + " text");
        assertEquals(expected, text.get(ageGroup).get(language));
    }
}
