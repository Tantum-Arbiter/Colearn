package com.app.functest.stepdefs;

import com.github.tomakehurst.wiremock.client.WireMock;
import io.cucumber.java.Before;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.RestAssured;
import io.restassured.config.HttpClientConfig;
import io.restassured.response.Response;

import java.util.concurrent.TimeUnit;
import java.net.URI;

import static io.restassured.RestAssured.given;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Step definitions for gateway service functional tests
 */
public class GatewayStepDefs extends BaseStepDefs {

    @Before(order = 0)
    public void configureWireMockClient() {
        // Skip WireMock configuration when running against GCP (real services)
        if (isGcpMode()) {
            return;
        }

        String base = System.getenv("WIREMOCK_BASE_URL");
        if (base == null || base.isBlank()) {
            base = System.getProperty("WIREMOCK_BASE_URL");
        }
        if (base == null || base.isBlank()) {
            base = "http://wiremock:8080";
        }
        try {
            URI uri = URI.create(base);
            String host = uri.getHost();
            int port = (uri.getPort() != -1) ? uri.getPort() : ("https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80);
            WireMock.configureFor(host, port);
        } catch (Exception e) {
            WireMock.configureFor("wiremock", 8080);
        }
        // Clear any leftover dynamic stubs/request journal between scenarios
        try {
            WireMock.reset();
        } catch (Exception ignored) {
        }
    }

    @Before(order = 1)
    public void resetGatewayState() {
        currentAuthToken = null;
        lastResponse = null;

        String cfg = System.getenv("GATEWAY_BASE_URL");
        if (cfg == null || cfg.isBlank()) {
            cfg = System.getProperty("GATEWAY_BASE_URL");
        }
        if (cfg == null || cfg.isBlank()) {
            cfg = "http://gateway:8080";
        }
        RestAssured.baseURI = cfg;

        // Configure RestAssured with strict timeouts to prevent hanging (15s max)
        RestAssured.config = RestAssured.config()
            .httpClient(HttpClientConfig.httpClientConfig()
                .setParam("http.connection.timeout", 5000)
                .setParam("http.socket.timeout", 15000));

        // Skip reset in GCP mode - endpoint only exists in test profile
        if (isGcpMode()) {
            return;
        }

        // Reset gateway state (rate limiter, circuit breakers, Firestore test data)
        try {
            given()
                .baseUri(cfg)
                .contentType("application/json")
                .header("User-Agent", "GrowWithFreya-FuncTest/1.0.0")
                .when()
                .post("/private/reset")
                .then()
                .statusCode(200);
        } catch (Exception ignored) {
            // In non-test profile this endpoint may not exist; ignore
        }
    }

    private String gatewayBaseUrl;

    private static volatile boolean gatewayVerifiedHealthy = false;

    @Given("the gateway service is healthy")
    public void theGatewayServiceIsHealthy() {
        String cfg = System.getenv("GATEWAY_BASE_URL");
        if (cfg == null || cfg.isBlank()) {
            cfg = System.getProperty("GATEWAY_BASE_URL");
        }
        if (cfg == null || cfg.isBlank()) {
            cfg = "http://gateway:8080";
        }
        gatewayBaseUrl = cfg;
        RestAssured.baseURI = gatewayBaseUrl;

        // Only verify health once per test run - gateway won't go unhealthy mid-test
        if (gatewayVerifiedHealthy) {
            return;
        }

        // In GCP mode, use shorter timeout since gateway is already deployed
        int maxWaitSeconds = isGcpMode() ? 10 : 30;
        int pollIntervalMs = isGcpMode() ? 500 : 2000;

        await()
            .atMost(maxWaitSeconds, TimeUnit.SECONDS)
            .pollInterval(pollIntervalMs, TimeUnit.MILLISECONDS)
            .until(() -> {
                try {
                    return given()
                        .when()
                            .get("/auth/status")
                        .then()
                            .extract()
                            .statusCode() == 200;
                } catch (Exception e) {
                    return false;
                }
            });

        gatewayVerifiedHealthy = true;
    }

    @Given("Firebase is configured in WireMock")
    public void firebaseIsConfiguredInWireMock() {
        // Skip WireMock configuration when running against GCP (real services)
        if (isGcpMode()) {
            return;
        }

        // Setup Firebase Auth stubs
        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/v1/accounts:lookup"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                            "users": [
                                {
                                    "localId": "firebase-user-id",
                                    "email": "test@example.com",
                                    "emailVerified": true,
                                    "displayName": "Test User",
                                    "providerUserInfo": [
                                        {
                                            "providerId": "google.com",
                                            "federatedId": "123456789",
                                            "email": "test@example.com",
                                            "displayName": "Test User"
                                        }
                                    ],
                                    "photoUrl": "https://example.com/photo.jpg",
                                    "disabled": false,
                                    "lastLoginAt": "2023-01-01T00:00:00.000Z",
                                    "createdAt": "2023-01-01T00:00:00.000Z"
                                }
                            ]
                        }
                        """))
        );

        // Setup Firebase create user stub
        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/v1/accounts:signUp"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                            "localId": "new-firebase-user-id",
                            "email": "newuser@example.com",
                            "displayName": "New User",
                            "idToken": "firebase-id-token",
                            "refreshToken": "firebase-refresh-token",
                            "expiresIn": "3600"
                        }
                        """))
        );

        // Default User Management API stubs (proxied by TestProxyController under test profile)
        // GET /api/users/profile
        WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/api/users/profile"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                          "id": "user-123",
                          "email": "test.user@example.com",
                          "createdAt": "2024-01-01T00:00:00Z"
                        }
                        """))
        );

        // POST /api/users/profile (update)
        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/profile"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                          "displayName": "Updated Test User",
                          "preferences": {
                            "notifications": { "email": true, "push": false },
                            "privacy": { "shareData": false }
                          }
                        }
                        """))
        );

        // POST /api/users/children (create)
        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/children"))
                .willReturn(WireMock.aResponse()
                    .withStatus(201)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                          "id": "child-123",
                          "name": "Little Freya",
                          "avatar": "bear",
                          "preferences": { "favoriteStories": ["bedtime", "adventure"], "screenTimeLimit": 30 }
                        }
                        """))
        );

        // GET /api/users/children (list)
        WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/api/users/children"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                          "children": [
                            { "id": "child-123", "name": "Little Freya", "avatar": "bear" }
                          ]
                        }
                        """))
        );

        // POST /api/users/children/child-123 (update child)
        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/children/child-123"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                          "name": "Updated Child Name",
                          "preferences": { "favoriteStories": ["bedtime", "educational"], "screenTimeLimit": 45 }
                        }
                        """))
        );

        // POST /api/users/children/child-123/delete (delete child)
        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/children/child-123/delete"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "message": "Child profile deleted successfully" }
                        """))
        );

        // GET /api/users/preferences
        WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/api/users/preferences"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                          "notifications": { "email": true, "push": false },
                          "privacy": { "shareData": false },
                          "screenTime": { "dailyLimit": 45 }
                        }
                        """))
        );

        // POST /api/users/preferences (update)
        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/preferences"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                          "notifications": { "email": false, "push": true, "reminders": true },
                          "privacy": { "shareData": false, "analytics": true },
                          "screenTime": { "dailyLimit": 60, "bedtimeMode": true, "bedtimeStart": "19:00" },
                          "audio": { "backgroundMusic": true, "soundEffects": true, "volume": 0.7 }
                        }
                        """))
        );
    }

    @When("I make a GET request to {string}")
    public void iMakeAGetRequestTo(String endpoint) {
        if (currentAuthToken != null && endpoint.startsWith("/api/")) {
            lastResponse = applyAuthenticatedHeaders(given())
                .when()
                    .get(endpoint);
        } else {
            lastResponse = applyDefaultClientHeaders(given())
                .when()
                    .get(endpoint);
        }
    }

    @When("I make a POST request to {string}")
    public void iMakeAPostRequestTo(String endpoint) {
        // Use authentication if token is set (for /api/** endpoints)
        if (currentAuthToken != null && endpoint.startsWith("/api/")) {
            lastResponse = applyAuthenticatedHeaders(given())
                .header("Content-Type", "application/json")
                .when()
                    .post(endpoint);
        } else {
            lastResponse = applyDefaultClientHeaders(given())
                .header("Content-Type", "application/json")
                .when()
                    .post(endpoint);
        }
    }


    @When("I make a POST request to {string} with body:")
    public void iMakeAPostRequestToWithBody(String endpoint, String body) {
        // Use authentication if token is set (for /api/** endpoints)
        if (currentAuthToken != null && endpoint.startsWith("/api/")) {
            lastResponse = applyAuthenticatedHeaders(given())
                .header("Content-Type", "application/json")
                .body(body)
                .when()
                    .post(endpoint);
        } else {
            lastResponse = applyDefaultClientHeaders(given())
                .header("Content-Type", "application/json")
                .body(body)
                .when()
                    .post(endpoint);
        }
    }

    @When("I make an authenticated GET request to {string} with token {string}")
    public void iMakeAnAuthenticatedGetRequestToWithToken(String endpoint, String token) {
        lastResponse = given()
            .header("X-Client-Platform", "ios")
            .header("X-Client-Version", "1.0.0")
            .header("X-Device-ID", "device-123")
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .when()
                .get(endpoint);
    }

    @When("I make an authenticated POST request to {string} with token {string} and body:")
    public void iMakeAnAuthenticatedPostRequestToWithTokenAndBody(String endpoint, String token, String body) {
        lastResponse = given()
            .header("X-Client-Platform", "ios")
            .header("X-Client-Version", "1.0.0")
            .header("X-Device-ID", "device-123")
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .body(body)
            .when()
                .post(endpoint);
    }

    @Then("the response status code should be {int}")
    public void theResponseStatusCodeShouldBe(int expectedStatus) {
        assertNotNull(lastResponse, "No response received");
        int actualStatus = lastResponse.getStatusCode();
        String responseBody = lastResponse.getBody().asString();
        if (expectedStatus != actualStatus) {
            String truncatedBody = responseBody.length() > 500 ? responseBody.substring(0, 500) + "..." : responseBody;
            fail("Expected status " + expectedStatus + " but got " + actualStatus +
                ". Response body: " + truncatedBody);
        }
    }

    @Then("the response should contain JSON field {string}")
    public void theResponseShouldContainJsonField(String fieldPath) {
        assertNotNull(lastResponse, "No response received");
        lastResponse.then().body(fieldPath, notNullValue());
    }

    @Then("the response JSON field {string} should be {string}")
    public void theResponseJsonFieldShouldBe(String fieldPath, String expectedValue) {
        assertNotNull(lastResponse, "No response received");
        lastResponse.then().body(fieldPath, equalTo(expectedValue));
    }

    @Then("the response JSON field {string} should be {int}")
    public void theResponseJsonFieldShouldBeInt(String fieldPath, int expectedValue) {
        assertNotNull(lastResponse, "No response received");
        lastResponse.then().body(fieldPath, equalTo(expectedValue));
    }
    @Then("^the response JSON field \"([^\"]+)\" should be (-?\\d+\\.\\d+)$")
    public void theResponseJsonFieldShouldBeDouble(String fieldPath, double expectedValue) {
        assertNotNull(lastResponse, "No response received");
        // Robust numeric comparison: extract as string to avoid Float/BigDecimal type quirks
        String raw = lastResponse.jsonPath().getString(fieldPath);
        org.junit.jupiter.api.Assertions.assertNotNull(raw, "JSON path '" + fieldPath + "' not found");
        double actual;
        try {
            actual = Double.parseDouble(raw);
        } catch (NumberFormatException e) {
            throw new AssertionError("Expected a numeric value at '" + fieldPath + "' but got '" + raw + "'");
        }
        org.hamcrest.MatcherAssert.assertThat("JSON path " + fieldPath + " doesn't match.", actual, closeTo(expectedValue, 1e-6));
    }


    @Then("the response JSON field {string} should be boolean {string}")
    public void theResponseJsonFieldShouldBeBoolean(String fieldPath, String expectedValue) {
        assertNotNull(lastResponse, "No response received");

        // Parse the expected value as boolean
        boolean booleanValue = Boolean.parseBoolean(expectedValue);
        lastResponse.then().body(fieldPath, equalTo(booleanValue));
    }

    @Then("the response should contain {string} in the body")
    public void theResponseShouldContainInTheBody(String expectedContent) {
        assertNotNull(lastResponse, "No response received");
        String responseBody = lastResponse.getBody().asString();
        assertTrue(responseBody.contains(expectedContent),
            "Response body does not contain: " + expectedContent + "\nActual body: " + responseBody);
    }

    @Then("the response time should be less than {int} milliseconds")
    public void theResponseTimeShouldBeLessThanMilliseconds(int maxTime) {
        assertNotNull(lastResponse, "No response received");
        long responseTime = lastResponse.getTime();
        assertTrue(responseTime < maxTime,
            "Response time " + responseTime + "ms exceeds maximum " + maxTime + "ms");
    }

    @Then("WireMock should have received a request to {string}")
    public void wireMockShouldHaveReceivedARequestTo(String urlPattern) {
        WireMock.verify(1, WireMock.getRequestedFor(WireMock.urlMatching(urlPattern)));
    }

    @Then("WireMock should have received {int} requests to {string}")
    public void wireMockShouldHaveReceivedRequestsTo(int expectedCount, String urlPattern) {
        WireMock.verify(expectedCount, WireMock.getRequestedFor(WireMock.urlMatching(urlPattern)));
    }

    @Then("the response headers should contain {string}")
    public void theResponseHeadersShouldContain(String headerName) {
        assertNotNull(lastResponse, "No response received");
        assertNotNull(lastResponse.getHeader(headerName),
            "Response does not contain header: " + headerName);
    }

    @Then("the response header {string} should be {string}")
    public void theResponseHeaderShouldBe(String headerName, String expectedValue) {
        assertNotNull(lastResponse, "No response received");
        String actualValue = lastResponse.getHeader(headerName);
        assertEquals(expectedValue, actualValue,
            "Header " + headerName + " has unexpected value");
    }

    @Then("the response header {string} should contain {string}")
    public void theResponseHeaderShouldContain(String headerName, String expectedSubstring) {
        assertNotNull(lastResponse, "No response received");
        String actualValue = lastResponse.getHeader(headerName);
        assertNotNull(actualValue, "Header " + headerName + " is not present");
        assertTrue(actualValue.contains(expectedSubstring),
            "Header " + headerName + " does not contain: " + expectedSubstring);
    }

    @When("I make an OPTIONS request to {string} with headers:")
    public void iMakeAnOptionsRequestToWithHeaders(String endpoint, io.cucumber.datatable.DataTable dataTable) {
        // Don't apply default headers - use only the headers provided in the test
        // This allows tests to send specific CORS preflight headers without interference
        var requestSpec = given();
        for (var row : dataTable.asLists()) {
            if (row.size() >= 2) {
                requestSpec = requestSpec.header(row.get(0), row.get(1));
            }
        }
        lastResponse = requestSpec.when().options(endpoint);
    }

    @When("I make a GET request to {string} with headers:")
    public void iMakeAGetRequestToWithHeaders(String endpoint, io.cucumber.datatable.DataTable dataTable) {
        // Don't apply default headers - use only the headers provided in the test
        // This allows tests to send specific headers (like malicious User-Agent) without interference
        var requestSpec = given();
        for (var row : dataTable.asLists()) {
            if (row.size() >= 2) {
                requestSpec = requestSpec.header(row.get(0), row.get(1));
            }
        }
        lastResponse = requestSpec.when().get(endpoint);
    }

}
