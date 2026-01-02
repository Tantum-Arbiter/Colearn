package com.app.functest.stepdefs;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.response.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

public class AssetStepDefs extends BaseStepDefs {

    private static final Logger log = LoggerFactory.getLogger(AssetStepDefs.class);

    private Map<String, Object> assetSyncRequest;
    private long requestStartTime;

    @Given("I have an asset sync request with no client checksums")
    public void iHaveAnAssetSyncRequestWithNoClientChecksums() {
        assetSyncRequest = new HashMap<>();
        assetSyncRequest.put("clientVersion", 0);
        assetSyncRequest.put("assetChecksums", new HashMap<String, String>());
        assetSyncRequest.put("lastSyncTimestamp", 0L);
    }

    @Given("I have an asset sync request with current server checksums")
    public void iHaveAnAssetSyncRequestWithCurrentServerChecksums() {
        Response versionResponse = applyAuthenticatedHeaders(given())
                .when()
                .get("/api/assets/version");

        Map<String, String> serverChecksums = new HashMap<>();
        Map<String, String> assetChecksums = versionResponse.jsonPath().getMap("assetChecksums");
        if (assetChecksums != null) {
            serverChecksums.putAll(assetChecksums);
        }

        assetSyncRequest = new HashMap<>();
        assetSyncRequest.put("clientVersion", versionResponse.jsonPath().getInt("version"));
        assetSyncRequest.put("assetChecksums", serverChecksums);
        String lastUpdatedStr = versionResponse.jsonPath().getString("lastUpdated");
        long lastSyncTimestamp = lastUpdatedStr != null ? Instant.parse(lastUpdatedStr).toEpochMilli() : 0L;
        assetSyncRequest.put("lastSyncTimestamp", lastSyncTimestamp);
    }

    @Given("I have an asset sync request with outdated checksums")
    public void iHaveAnAssetSyncRequestWithOutdatedChecksums() {
        Map<String, String> outdatedChecksums = new HashMap<>();
        outdatedChecksums.put("stories/test-story-1/cover.webp", "outdated-checksum");
        outdatedChecksums.put("stories/test-story-2/cover.webp", "outdated-checksum");

        assetSyncRequest = new HashMap<>();
        assetSyncRequest.put("clientVersion", 1);
        assetSyncRequest.put("assetChecksums", outdatedChecksums);
        assetSyncRequest.put("lastSyncTimestamp", System.currentTimeMillis() - 86400000L);
    }

    @Given("assets exist in the system")
    public void assetsExistInTheSystem() {
        // Assets are seeded via /private/reset endpoint
    }

    @Given("I have an asset sync request with {int} matching checksums")
    public void iHaveAnAssetSyncRequestWithMatchingChecksums(int count) {
        Response versionResponse = applyAuthenticatedHeaders(given())
                .when()
                .get("/api/assets/version");

        Map<String, String> serverChecksums = new HashMap<>();
        Map<String, String> assetChecksums = versionResponse.jsonPath().getMap("assetChecksums");
        if (assetChecksums != null) {
            int added = 0;
            for (Map.Entry<String, String> entry : assetChecksums.entrySet()) {
                if (added >= count) break;
                serverChecksums.put(entry.getKey(), entry.getValue());
                added++;
            }
        }

        assetSyncRequest = new HashMap<>();
        assetSyncRequest.put("clientVersion", versionResponse.jsonPath().getInt("version"));
        assetSyncRequest.put("assetChecksums", serverChecksums);
        String lastUpdatedStr = versionResponse.jsonPath().getString("lastUpdated");
        long lastSyncTimestamp = lastUpdatedStr != null ? Instant.parse(lastUpdatedStr).toEpochMilli() : 0L;
        assetSyncRequest.put("lastSyncTimestamp", lastSyncTimestamp);
    }

    @When("I make a POST request to {string} with the asset sync request")
    public void iMakeAPOSTRequestToWithTheAssetSyncRequest(String endpoint) {
        requestStartTime = System.currentTimeMillis();
        String requestBody = mapToJson(assetSyncRequest);

        lastResponse = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body(requestBody)
                .when()
                .post(endpoint);
    }

    @Then("each updated asset should have a signed URL")
    public void eachUpdatedAssetShouldHaveASignedURL() {
        List<Map<String, Object>> updatedAssets = lastResponse.jsonPath().getList("updatedAssets");
        for (int i = 0; i < updatedAssets.size(); i++) {
            String signedUrl = (String) updatedAssets.get(i).get("signedUrl");
            assertThat("Asset " + i + " should have signed URL", signedUrl, notNullValue());
            assertThat("Signed URL should not be empty", signedUrl, not(emptyString()));
        }
    }

    @Then("the signed URL should contain signature parameters")
    public void theSignedURLShouldContainSignatureParameters() {
        String signedUrl = lastResponse.jsonPath().getString("signedUrl");
        assertThat("Signed URL should exist", signedUrl, notNullValue());

        // In emulator mode, URLs are simple HTTP URLs without signature parameters
        // In production mode, V4 signatures contain X-Goog-Signature or similar params
        boolean hasSignature = signedUrl.contains("X-Goog-") ||
                               signedUrl.contains("Signature") ||
                               signedUrl.contains("signature");
        boolean isEmulatorUrl = signedUrl.startsWith("http://") &&
                                (signedUrl.contains("fake-gcs") ||
                                 signedUrl.contains("localhost") ||
                                 signedUrl.contains("gcs-emulator") ||
                                 signedUrl.matches("http://[^/]+:\\d+/.*"));

        assertThat("Signed URL should contain signature parameters or be an emulator URL",
                   hasSignature || isEmulatorUrl, is(true));
    }

    @Then("the signed URL should successfully download the asset")
    public void theSignedURLShouldSuccessfullyDownloadTheAsset() {
        String signedUrl = lastResponse.jsonPath().getString("signedUrl");
        assertThat("Signed URL should exist", signedUrl, notNullValue());

        log.info("Attempting to download asset from signed URL: {}", signedUrl);

        // Fetch the asset directly from the signed URL
        Response assetResponse = io.restassured.RestAssured.given()
                .relaxedHTTPSValidation()
                .when()
                .get(signedUrl);

        if (assetResponse.getStatusCode() != 200) {
            log.error("Asset download failed with status: {}. URL: {}. Response: {}",
                    assetResponse.getStatusCode(), signedUrl, assetResponse.getBody().asString());
        }

        assertThat("Asset download should succeed. URL: " + signedUrl + ". Response: " + assetResponse.getBody().asString(),
                assetResponse.getStatusCode(), is(200));
        assertThat("Asset should have content", assetResponse.getBody().asByteArray().length, greaterThan(0));
    }

    @Then("the response field {string} should contain {string}")
    public void theResponseFieldShouldContain(String fieldName, String expectedContent) {
        String actualValue = lastResponse.jsonPath().getString(fieldName);
        assertThat(fieldName + " should contain " + expectedContent, actualValue, containsString(expectedContent));
    }

    // Security tests for path validation and URL encoding

    @When("I make a GET request to asset URL with null byte in path")
    public void iMakeAGETRequestToAssetURLWithNullByteInPath() {
        requestStartTime = System.currentTimeMillis();
        // Path with null byte injection attempt
        String pathWithNullByte = "stories/test%00.webp";

        lastResponse = applyAuthenticatedHeaders(given())
                .when()
                .get("/api/assets/url?path=" + pathWithNullByte);
    }

    @When("I make a GET request to asset URL with unicode characters")
    public void iMakeAGETRequestToAssetURLWithUnicodeCharacters() {
        requestStartTime = System.currentTimeMillis();
        // Path with unicode characters (URL encoded)
        String pathWithUnicode = "stories/test%E2%9C%A8story/cover.webp"; // stories/test✨story/cover.webp

        lastResponse = applyAuthenticatedHeaders(given())
                .when()
                .get("/api/assets/url?path=" + pathWithUnicode);
    }

    // Note: "the response status code should be {int} or {int}" step
    // is defined in StoryCmsStepDefs.java to avoid duplication

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

    @Given("I have an asset sync request with {int} checksums")
    public void iHaveAnAssetSyncRequestWithChecksums(int count) {
        Map<String, String> checksums = new HashMap<>();
        for (int i = 0; i < count; i++) {
            checksums.put("stories/test-story-" + i + "/cover.webp", "checksum-" + i);
        }

        assetSyncRequest = new HashMap<>();
        assetSyncRequest.put("clientVersion", 1);
        assetSyncRequest.put("assetChecksums", checksums);
        assetSyncRequest.put("lastSyncTimestamp", System.currentTimeMillis());
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

