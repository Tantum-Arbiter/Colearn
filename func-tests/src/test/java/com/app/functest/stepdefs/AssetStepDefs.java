package com.app.functest.stepdefs;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.restassured.response.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

/**
 * Step definitions for asset-related functional tests.
 *
 * Note: Old asset sync endpoints (GET /api/assets/url, POST /api/assets/sync)
 * have been removed. The app now uses batch endpoints:
 * - POST /api/assets/batch-urls (defined in BatchProcessingStepDefs)
 * - POST /api/stories/delta (defined in BatchProcessingStepDefs)
 */
public class AssetStepDefs extends BaseStepDefs {

    private static final Logger log = LoggerFactory.getLogger(AssetStepDefs.class);

    @Given("assets exist in the system")
    public void assetsExistInTheSystem() {
        // Force re-seed assets to ensure they exist
        Response resetResponse = given()
                .when()
                .post("/private/reset?force=true");

        if (resetResponse.getStatusCode() == 200) {
            log.info("Force reset completed - assets should be seeded");
        } else {
            log.warn("Force reset failed: {}", resetResponse.getBody().asString());
        }
    }

    @Then("the response field {string} should contain {string}")
    public void theResponseFieldShouldContain(String fieldName, String expectedContent) {
        String actualValue = lastResponse.jsonPath().getString(fieldName);
        assertThat(fieldName + " should contain " + expectedContent, actualValue, containsString(expectedContent));
    }

    @Then("if status is {int} then response should contain properly encoded URL")
    public void ifStatusIsThenResponseShouldContainProperlyEncodedURL(int successStatus) {
        if (lastResponse.getStatusCode() == successStatus) {
            String signedUrl = lastResponse.jsonPath().getString("signedUrl");
            assertThat("Signed URL should exist", signedUrl, notNullValue());
            // Properly encoded URLs should not have raw spaces or unencoded special chars
            assertThat("URL should not contain raw spaces", signedUrl, not(containsString(" ")));
            log.debug("Verified properly encoded URL: {}", signedUrl);
        }
    }
}

