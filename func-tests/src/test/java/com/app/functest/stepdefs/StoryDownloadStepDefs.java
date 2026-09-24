package com.app.functest.stepdefs;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.cucumber.java.en.Given;
import io.restassured.response.Response;

import java.io.InputStream;

import static io.restassured.RestAssured.given;
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
}
