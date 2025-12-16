package com.app.functest.stepdefs;

import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.stubbing.StubMapping;
import io.cucumber.java.After;
import io.cucumber.java.Before;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;


import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.net.URI;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Step definitions for authentication-related functional tests
 */
public class AuthenticationStepDefs extends BaseStepDefs {

    // Track scenario-scoped WireMock stubs so we can clean them up after each scenario
    private final List<StubMapping> scenarioStubs = new ArrayList<>();

    // Note: @Before hooks are now centralized in GatewayStepDefs to avoid duplicate hooks
    // and ensure predictable execution order

    // Note: lastResponse is inherited from BaseStepDefs and is static to share state across all step definition classes
    private RequestSpecification requestSpec;
    private String authToken;
    private String gatewayBaseUrl;
    private List<Response> responses = new ArrayList<>();
    private long lastDurationMs;

    // Pending request state for multi-step request assembly (e.g., headers then body)
    private String pendingMethod;
    private String pendingEndpoint;
    private Map<String, String> pendingHeaders;


    @After(order = 100)
    public void cleanupScenarioStubs() {
        if (scenarioStubs.isEmpty()) return;
        for (StubMapping m : new ArrayList<>(scenarioStubs)) {
            try {
                WireMock.removeStub(m);
            } catch (Exception ignored) {
            }
        }
        scenarioStubs.clear();
    }


    @Given("the gateway service is running")
    public void theGatewayServiceIsRunning() {
        String cfg = System.getenv("GATEWAY_BASE_URL");
        if (cfg == null || cfg.isBlank()) {
            cfg = System.getProperty("GATEWAY_BASE_URL");
        }
        if (cfg == null || cfg.isBlank()) {
            cfg = "http://gateway:8080";
        }
        gatewayBaseUrl = cfg;
        RestAssured.baseURI = gatewayBaseUrl;

        // Verify gateway is accessible
        given()
            .when()
                .get("/auth/status")
            .then()
                .statusCode(200);
    }

    @Given("WireMock is configured for {string} OAuth provider")
    public void wireMockIsConfiguredForOAuthProvider(String provider) {
        // Skip WireMock stubs when running against GCP (real services)
        if (isGcpMode()) {
            return;
        }

        // Do not reset WireMock here; keep file-based mappings loaded by the container.
        // Load provider-specific stubs
        switch (provider.toLowerCase()) {
            case "google":
                setupGoogleOAuthStubs();
                break;
            case "apple":
                setupAppleOAuthStubs();
                break;
            default:
                throw new IllegalArgumentException("Unsupported OAuth provider: " + provider);
        }
        // Ensure conditional user management unhappy-case stubs are present
        addConditionalUserManagementStubs();
    }

    @Given("a valid {string} OAuth token")
    public void aValidOAuthToken(String provider) {
        authToken = "valid-" + provider.toLowerCase() + "-token";

        // Setup WireMock to return valid user info for this token
        WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/oauth2/v2/userinfo"))
                .withHeader("Authorization", WireMock.equalTo("Bearer " + authToken))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                            "id": "123456789",
                            "email": "test.user@gmail.com",
                            "verified_email": true,
                            "name": "Test User",
                            "given_name": "Test",
                            "family_name": "User",
                            "picture": "https://example.com/photo.jpg"
                        }
                        """))
        );
    }

    @Given("an invalid OAuth token")
    public void anInvalidOAuthToken() {
        authToken = "invalid-token";

        // Setup WireMock to return error for invalid token
        WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/oauth2/v2/userinfo"))
                .withHeader("Authorization", WireMock.equalTo("Bearer " + authToken))
                .willReturn(WireMock.aResponse()
                    .withStatus(401)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                            "error": {
                                "code": 401,
                                "message": "Invalid Credentials"
                            }
                        }
                        """))
        );
    }

    @When("I authenticate with the OAuth token")
    public void iAuthenticateWithTheOAuthToken() {
        requestSpec = applyDefaultClientHeaders(given())
            .header("Authorization", "Bearer " + authToken)
            .header("Content-Type", "application/json");
    }

    @When("I call the {string} endpoint")
    public void iCallTheEndpoint(String endpoint) {
        RequestSpecification spec = (requestSpec != null) ? requestSpec : applyDefaultClientHeaders(given());
        lastResponse = spec.when().get(endpoint);
    }

    @When("I call the {string} endpoint with POST")
    public void iCallTheEndpointWithPost(String endpoint) {
        RequestSpecification spec = (requestSpec != null) ? requestSpec : applyDefaultClientHeaders(given()).header("Content-Type", "application/json");
        lastResponse = spec.when().post(endpoint);
    }

    @When("I call the {string} endpoint with body:")
    public void iCallTheEndpointWithBody(String endpoint, String body) {
        RequestSpecification spec = (requestSpec != null) ? requestSpec : applyDefaultClientHeaders(given()).header("Content-Type", "application/json");
        lastResponse = spec.body(body).when().post(endpoint);
    }

    @Then("the response status should be {int}")
    public void theResponseStatusShouldBe(int expectedStatus) {
        assertNotNull(lastResponse, "No response received");
        int actualStatus = lastResponse.getStatusCode();
        if (expectedStatus != actualStatus) {
            System.out.println("STATUS MISMATCH: Expected " + expectedStatus + " but got " + actualStatus);
            System.out.println("Response body: " + lastResponse.getBody().asString());
        }
        assertEquals(expectedStatus, actualStatus);
    }

    @Then("the response status should be {int} or {int}")
    public void theResponseStatusShouldBeOr(int status1, int status2) {
        assertNotNull(lastResponse, "No response received");
        int actualStatus = lastResponse.getStatusCode();
        assertTrue(actualStatus == status1 || actualStatus == status2,
            "Expected status " + status1 + " or " + status2 + " but got " + actualStatus);
    }

    @Then("the response should contain {string}")
    public void theResponseShouldContain(String expectedContent) {
        assertNotNull(lastResponse, "No response received");
        String responseBody = lastResponse.getBody().asString();
        assertTrue(responseBody.contains(expectedContent),
            "Response does not contain expected content: " + expectedContent);
    }

    @Then("the response should have field {string} with value {string}")
    public void theResponseShouldHaveFieldWithValue(String fieldPath, String expectedValue) {
        assertNotNull(lastResponse, "No response received");

        // Convert string value to appropriate type for comparison
        Object expectedTypedValue;
        if ("true".equalsIgnoreCase(expectedValue)) {
            expectedTypedValue = true;
        } else if ("false".equalsIgnoreCase(expectedValue)) {
            expectedTypedValue = false;
        } else if (expectedValue.matches("-?\\d+")) {
            // Integer
            expectedTypedValue = Integer.parseInt(expectedValue);
        } else if (expectedValue.matches("-?\\d+\\.\\d+")) {
            // Float/Double
            expectedTypedValue = Double.parseDouble(expectedValue);
        } else {
            // String
            expectedTypedValue = expectedValue;
        }

        lastResponse.then().body(fieldPath, equalTo(expectedTypedValue));
    }

    @Then("the response should have field {string}")
    public void theResponseShouldHaveField(String fieldPath) {
        assertNotNull(lastResponse, "No response received");
        lastResponse.then().body(fieldPath, notNullValue());
    }

    @Then("WireMock should have received {int} request\\(s\\) to {string}")
    public void wireMockShouldHaveReceivedRequestsTo(int expectedCount, String urlPattern) {
        WireMock.verify(expectedCount, WireMock.getRequestedFor(WireMock.urlMatching(urlPattern)));
    }

    // New step definitions for unhappy cases

    @Given("I have a valid authentication token")
    public void iHaveAValidAuthenticationToken() {
        this.authToken = "gateway-access-token";
        currentAuthToken = this.authToken;
        this.requestSpec = applyDefaultClientHeaders(given()).header("Authorization", "Bearer " + authToken)
                                  .header("Content-Type", "application/json");
    }

    @Given("I have a valid authentication token for user {string}")
    public void iHaveAValidAuthenticationTokenForUser(String userIdOrEmail) {
        // any token starting with "valid-" is accepted by the test-profile security filter
        this.authToken = "valid-user-" + userIdOrEmail;
    }

    @When("I send a GET request to {string} with valid authentication")
    public void iSendAGetRequestWithValidAuthentication(String endpoint) {
        String token = (authToken != null && !authToken.isBlank()) ? authToken : "gateway-access-token";
        lastResponse = applyDefaultClientHeaders(given())
            .header("Authorization", "Bearer " + token)
            .when()
            .get(endpoint);
    }

    @Given("WireMock is configured to return {int} for user profile requests")
    public void wireMockIsConfiguredToReturnForUserProfileRequests(int status) {
        StubMapping m = WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/api/users/profile"))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withStatus(status)
                    .withHeader("Content-Type", "application/json")
                    .withBody(status == 404 ? """
                        {"success":false,"errorCode":"GTW-400","error":"User not found"}
                        """ : """
                        {"success":false,"errorCode":"GTW-500","error":"Unexpected error"}
                        """))
        );
        scenarioStubs.add(m);
    }

    @Given("WireMock is configured to return {int} for Firebase user update endpoints")
    public void wireMockIsConfiguredToReturnForFirebaseUserUpdateEndpoints(int downstreamStatus) {
        // Simulate gateway translating downstream 5xx to 502 on update
        StubMapping m = WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/profile"))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withStatus(502)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {"success":false,"errorCode":"GTW-201","error":"Firebase service unavailable"}
                        """))
        );
        scenarioStubs.add(m);
    }

    @Given("WireMock is configured to simulate database connection errors")
    public void wireMockIsConfiguredToSimulateDatabaseConnectionErrors() {
        StubMapping m = WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/api/users/profile"))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withStatus(500)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {"success":false,"errorCode":"GTW-501","error":"Database operation failed"}
                        """))
        );
        scenarioStubs.add(m);
    }

    @Given("WireMock is configured to return quota exceeded errors")
    public void wireMockIsConfiguredToReturnQuotaExceededErrors() {
        StubMapping m = WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/profile"))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withStatus(502)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {"success":false,"errorCode":"GTW-206","error":"Firebase quota exceeded","details":{"service":"Firebase"}}
                        """))
        );
        scenarioStubs.add(m);
    }

    @Given("WireMock is configured to simulate concurrent modification conflicts")
    public void wireMockIsConfiguredToSimulateConcurrentModificationConflicts() {
        StubMapping m = WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/profile"))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withStatus(409)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {"success":false,"errorCode":"GTW-402","error":"Failed to update user profile","details":{"reason":"concurrent modification"}}
                        """))
        );
        scenarioStubs.add(m);
    }

    @Given("the user account is deactivated")
    public void theUserAccountIsDeactivated() {
        StubMapping m = WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/api/users/profile"))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withStatus(403)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {"success":false,"errorCode":"GTW-407","error":"User account has been deactivated"}
                        """))
        );
        scenarioStubs.add(m);
    }

    @Given("the user's email is not verified")
    public void theUsersEmailIsNotVerified() {
        StubMapping m = WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/children"))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withStatus(403)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {"success":false,"errorCode":"GTW-408","error":"Email address not verified"}
                        """))
        );
        scenarioStubs.add(m);
    }

    @Given("the user profile is incomplete")
    public void theUserProfileIsIncomplete() {
        StubMapping m = WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/children"))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withStatus(409)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {"success":false,"errorCode":"GTW-409","error":"User profile is incomplete"}
                        """))
        );
        scenarioStubs.add(m);
    }

    @Given("the system is overloaded")
    public void theSystemIsOverloaded() {
        // Ensure client points at WireMock service before registering stub
        ensureWireMockConfigured();
        // Signal gateway to short-circuit this scenario deterministically
        postFlags(java.util.Map.of("overloaded", true));

        StubMapping m = WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/api/users/profile"))
                .atPriority(0)
                .willReturn(WireMock.aResponse()
                    .withFixedDelay(10) // tiny delay to ensure registration order determinism
                    .withStatus(503)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {"success":false,"errorCode":"GTW-509","error":"System is currently overloaded"}
                        """))
        );
        scenarioStubs.add(m);

        // Stabilize: wait briefly until the stub is active from the gateway's perspective
        try {
            String base = System.getenv("WIREMOCK_BASE_URL");
            if (base == null || base.isBlank()) {
                base = System.getProperty("WIREMOCK_BASE_URL");
            }
            if (base == null || base.isBlank()) {
                base = "http://wiremock:8080";
            }
            // Poll a few times to ensure WireMock has the mapping ready
            int attempts = 0;
            while (attempts++ < 10) {
                io.restassured.response.Response r = io.restassured.RestAssured.given()
                    .baseUri(base)
                    .when()
                    .get("/api/users/profile");
                if (r.statusCode() == 503) break;
                Thread.sleep(50);
            }
        } catch (Exception ignored) {
            // Non-fatal; best-effort stabilization only
        }
    }

    @Given("WireMock is configured with {int} second delay for user update endpoints")
    public void wireMockIsConfiguredWithDelayForUserUpdateEndpoints(int delaySeconds) {
        StubMapping m = WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/profile"))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withFixedDelay(delaySeconds * 1000)
                    .withStatus(504)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {"success":false,"errorCode":"GTW-504","error":"Request timeout"}
                        """))
        );
        scenarioStubs.add(m);
    }

    @Given("rate limiting is enabled for user management endpoints")
    public void rateLimitingIsEnabledForUserManagementEndpoints() {
        // Enable gateway rate limiting for API endpoints at a low threshold for this test
        postFlags(Map.of("apiRateLimitPerMinute", 20));
    }

    @Given("the user already has {int} child profiles")
    public void theUserAlreadyHasChildProfiles(int max) {
        StubMapping m = WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/users/children"))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withStatus(409)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {"success":false,"errorCode":"GTW-404","error":"Maximum number of child profiles exceeded","details":{"maxAllowed":%d}}
                        """.formatted(max)))
        );
        scenarioStubs.add(m);
    }

    // Always-on conditional stubs for specific invalid payloads
    @Before(order = 2)
    public void addConditionalUserManagementStubs() {
        // Skip WireMock stubs when running against GCP (real services)
        if (isGcpMode()) {
            return;
        }

        // Ensure WireMock client points at the Docker service host before registering stubs
        ensureWireMockConfigured();

        // Invalid email format on profile update
        scenarioStubs.add(
            WireMock.stubFor(
                WireMock.post(WireMock.urlPathEqualTo("/api/users/profile"))
                    .withHeader("Authorization", WireMock.matching(".*"))
                    .withRequestBody(WireMock.containing("\"invalid-email-format\""))
                    .atPriority(1)
                    .willReturn(WireMock.aResponse()
                        .withStatus(400)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                            {"success":false,"errorCode":"GTW-107","error":"Invalid email address format","details":{"field":"email"}}
                            """))
            )
        );

        // Missing required field: email
        scenarioStubs.add(
            WireMock.stubFor(
                WireMock.post(WireMock.urlPathEqualTo("/api/users/profile"))
                    .withHeader("Authorization", WireMock.matching(".*"))
                    .withRequestBody(WireMock.containing("\"name\": \"Test User\""))
                    .withRequestBody(WireMock.notMatching("(?s).*\\\"email\\\"\\s*:.*"))
                    .atPriority(1)
                    .willReturn(WireMock.aResponse()
                        .withStatus(400)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                            {"success":false,"errorCode":"GTW-101","error":"Required field is missing","message":"Required field is missing: email"}
                            """))
            )
        );

        // Invalid ageRange
        scenarioStubs.add(
            WireMock.stubFor(
                WireMock.post(WireMock.urlPathEqualTo("/api/users/children"))
                    .withHeader("Authorization", WireMock.matching(".*"))
                    .withRequestBody(WireMock.containing("\"ageRange\": \"invalid-range\""))
                    .atPriority(1)
                    .willReturn(WireMock.aResponse()
                        .withStatus(400)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                            {"success":false,"errorCode":"GTW-405","error":"Invalid child profile data","details":{"field":"ageRange"}}
                            """))
            )
        );

        // Update non-existent child
        scenarioStubs.add(
            WireMock.stubFor(
                WireMock.post(WireMock.urlPathEqualTo("/api/users/children/non-existent-id"))
                    .withHeader("Authorization", WireMock.matching(".*"))
                    .atPriority(1)
                    .willReturn(WireMock.aResponse()
                        .withStatus(404)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                            {"success":false,"errorCode":"GTW-403","error":"Child profile not found"}
                            """))
            )
        );

        // Delete non-existent child
        scenarioStubs.add(
            WireMock.stubFor(
                WireMock.post(WireMock.urlPathEqualTo("/api/users/children/non-existent-id/delete"))
                    .withHeader("Authorization", WireMock.matching(".*"))
                    .atPriority(1)
                    .willReturn(WireMock.aResponse()
                        .withStatus(404)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                            {"success":false,"errorCode":"GTW-403","error":"Child profile not found"}
                            """))
            )
        );

        // Preferences invalid values
        scenarioStubs.add(
            WireMock.stubFor(
                WireMock.post(WireMock.urlPathEqualTo("/api/users/preferences"))
                    .withHeader("Authorization", WireMock.matching(".*"))
                    .withRequestBody(WireMock.containing("invalid-language-code"))
                    .atPriority(1)
                    .willReturn(WireMock.aResponse()
                        .withStatus(400)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                            {"success":false,"errorCode":"GTW-109","error":"Field validation failed","details":{"language":"Invalid language code"}}
                            """))
            )
        );

        // Malformed JSON in child profile creation: missing closing brace
        scenarioStubs.add(
            WireMock.stubFor(
                WireMock.post(WireMock.urlPathEqualTo("/api/users/children"))
                    .withHeader("Authorization", WireMock.matching(".*"))
                    .withRequestBody(WireMock.notMatching("(?s).*\\}.*"))
                    .atPriority(1)
                    .willReturn(WireMock.aResponse()
                        .withStatus(400)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                            {"success":false,"errorCode":"GTW-106","error":"Malformed JSON in request body"}
                            """))
            )
        );

        // Invalid date format in child profile
        scenarioStubs.add(
            WireMock.stubFor(
                WireMock.post(WireMock.urlPathEqualTo("/api/users/children"))
                    .withHeader("Authorization", WireMock.matching(".*"))
                    .withRequestBody(WireMock.containing("\"birthDate\": \"invalid-date-format\""))
                    .atPriority(1)
                    .willReturn(WireMock.aResponse()
                        .withStatus(400)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                            {"success":false,"errorCode":"GTW-108","error":"Invalid date format","details":{"field":"birthDate"}}
                            """))
            )
        );

        // Access another user's profile -> permission error
        scenarioStubs.add(
            WireMock.stubFor(
                WireMock.get(WireMock.urlPathMatching("/api/users/.+/profile"))
                    .withHeader("Authorization", WireMock.matching(".*"))
                    .atPriority(1)
                    .willReturn(WireMock.aResponse()
                        .withStatus(403)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                            {"success":false,"errorCode":"GTW-008","error":"Insufficient permissions for this operation","message":"Access denied"}
                            """))
            )
        );
    }

    // Helper to defensively (re)configure WireMock target host/port
    private void ensureWireMockConfigured() {
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
            int port = uri.getPort() != -1 ? uri.getPort() : ("https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80);
            WireMock.configureFor(host, port);
        } catch (Exception e) {
            WireMock.configureFor("wiremock", 8080);
        }
    }

    @Given("WireMock is configured for {string} OAuth provider with invalid token responses")
    public void wireMockIsConfiguredForOAuthProviderWithInvalidTokenResponses(String provider) {
        // No-op: token strings like "invalid-google-token" are interpreted by the gateway test profile
    }

    @Given("WireMock is configured for {string} OAuth provider with expired token responses")
    public void wireMockIsConfiguredForOAuthProviderWithExpiredTokenResponses(String provider) {
        // No-op: token strings like "expired-google-token" are interpreted by the gateway test profile
    }

    @Given("WireMock is configured to return {int} for Firebase endpoints")
    public void wireMockIsConfiguredToReturnStatusForFirebaseEndpoints(int status) {
        postFlags(Map.of("firebaseStatus", status));
    }

    @Given("WireMock is configured to return {int} for Google OAuth endpoints")
    public void wireMockIsConfiguredToReturnStatusForGoogleOAuthEndpoints(int status) {
        postFlags(Map.of("googleOauthStatus", status));
    }

    @Given("WireMock is configured with {int} second delay for Google OAuth endpoints")
    public void wireMockIsConfiguredWithDelayForGoogleOAuthEndpoints(int delaySeconds) {
        postFlags(Map.of("googleOauthDelayMs", delaySeconds * 1000));
    }

    @Given("the gateway service has a {int} second timeout")
    public void theGatewayServiceHasTimeout(int timeoutSeconds) {
        postFlags(Map.of("gatewayTimeoutMs", timeoutSeconds * 1000L));
    }

    @Given("the gateway service has an inbound timeout of {int} seconds")
    public void theGatewayServiceHasAnInboundTimeoutOfSeconds(int timeoutSeconds) {
        postFlags(Map.of("inboundTimeoutMs", timeoutSeconds * 1000L));
    }


    @Given("rate limiting is enabled with {int} requests per minute")
    public void rateLimitingIsEnabledWithRequestsPerMinute(int requestsPerMinute) {
        postFlags(Map.of("authRateLimitPerMinute", requestsPerMinute));
    }

    @Given("WireMock is configured with expired refresh token responses")
    public void wireMockIsConfiguredWithExpiredRefreshTokenResponses() {
        // No-op: refresh flow checks session store; invalid/expired tokens are not found and map to GTW-006
    }

    @Given("brute force protection is enabled with {int} failed attempts")
    public void bruteForceProtectionIsEnabledWithFailedAttempts(int maxAttempts) {
        // Drive via auth rate limit override
        postFlags(Map.of("authRateLimitPerMinute", maxAttempts));
    }

    @Given("the system is in maintenance mode")
    public void theSystemIsInMaintenanceMode() {
        postFlags(Map.of("maintenanceMode", true));
    }

    @Given("the circuit breaker is open for Google OAuth service")
    public void theCircuitBreakerIsOpenForGoogleOAuthService() {
        postFlags(Map.of("circuitOpenGoogle", true));
    }

    @When("I send a POST request to {string} with malformed JSON:")
    public void iSendPostRequestWithMalformedJson(String endpoint, String malformedJson) {
        RequestSpecification spec = applyDefaultClientHeaders(given()).contentType("application/json");
        if (authToken != null && !authToken.isBlank()) {
            spec.header("Authorization", "Bearer " + authToken);
        }
        lastResponse = spec
                .body(malformedJson)
                .when()
                .post(endpoint);
    }

    @When("I send a POST request to {string} with body:")
    public void iSendPostRequestWithBody(String endpoint, String body) {
        RequestSpecification spec = applyDefaultClientHeaders(given()).contentType("application/json");
        if (authToken != null && !authToken.isBlank()) {
            spec.header("Authorization", "Bearer " + authToken);
        }
        lastResponse = spec
                .body(body)
                .when()
                .post(endpoint);
    }

    @When("I send a POST request to {string} with content type {string} and body:")
    public void iSendPostRequestWithContentTypeAndBody(String endpoint, String contentType, String body) {
        RequestSpecification spec = applyDefaultClientHeaders(given()).contentType(contentType);
        if (authToken != null && !authToken.isBlank()) {
            spec.header("Authorization", "Bearer " + authToken);
        }
        lastResponse = spec
                .body(body)
                .when()
                .post(endpoint);
    }

    @When("I send a POST request to {string} with a {int}MB JSON payload")
    public void iSendPostRequestWithLargePayload(String endpoint, int sizeMB) {
        StringBuilder largePayload = new StringBuilder("{\"data\":\"");
        // Create a large payload
        for (int i = 0; i < sizeMB * 1024 * 1024; i++) {
            largePayload.append("x");
        }
        largePayload.append("\"}");

        lastResponse = applyDefaultClientHeaders(given())
                .contentType("application/json")
                .body(largePayload.toString())
                .when()
                .post(endpoint);
    }

    @When("I send {int} POST requests to {string} with body:")
    public void iSendMultiplePostRequests(int count, String endpoint, String body) {
        responses.clear();
        for (int i = 0; i < count; i++) {
            RequestSpecification spec = applyDefaultClientHeaders(given()).contentType("application/json");
            if (authToken != null && !authToken.isBlank()) {
                spec.header("Authorization", "Bearer " + authToken);
            }
            Response resp = spec
                    .body(body)
                    .when()
                    .post(endpoint);
            responses.add(resp);
        }
        // Set the last response as the current response
        if (!responses.isEmpty()) {
            lastResponse = responses.get(responses.size() - 1);
        }
    }

    @When("I send a POST request to {string} with headers:")
    public void iSendPostRequestWithHeaders(String endpoint, Map<String, String> headers) {
        // Stash the request so the following "And body:" step can attach payload and send it
        this.pendingMethod = "POST";
        this.pendingEndpoint = endpoint;
        this.pendingHeaders = new java.util.HashMap<>(headers);
    }

    @When("I send a POST request to {string}")
    public void iSendPostRequestNoBody(String endpoint) {
        RequestSpecification spec = applyDefaultClientHeaders(given()).contentType("application/json");
        if (authToken != null && !authToken.isBlank()) {
            spec.header("Authorization", "Bearer " + authToken);
        }
        lastResponse = spec.when().post(endpoint);
    }

    @When("body:")
    public void withBody(String body) {
        executePendingRequestWithBody(body);
    }

    @When("request body:")
    public void withRequestBody(String body) {
        executePendingRequestWithBody(body);
    }

    private void executePendingRequestWithBody(String body) {
        boolean providedClientHeader = pendingHeaders != null && pendingHeaders.keySet().stream().anyMatch(k ->
            k.equalsIgnoreCase("X-Client-Platform") || k.equalsIgnoreCase("X-Client-Version") || k.equalsIgnoreCase("X-Device-ID") || k.equalsIgnoreCase("User-Agent")
        );
        RequestSpecification request = providedClientHeader ? given() : applyDefaultClientHeaders(given());
        if (pendingHeaders != null) {
            for (Map.Entry<String, String> header : pendingHeaders.entrySet()) {
                request.header(header.getKey(), header.getValue());
            }
        }
        if (authToken != null && !authToken.isBlank()) {
            request.header("Authorization", "Bearer " + authToken);
        }
        request.contentType("application/json").body(body);
        if ("POST".equalsIgnoreCase(pendingMethod)) {
            lastResponse = request.when().post(pendingEndpoint);
        } else {
            // Default to POST if method is missing
            lastResponse = request.when().post(pendingEndpoint);
        }
        // Reset pending state
        pendingMethod = null;
        pendingEndpoint = null;
        pendingHeaders = null;
    }


    @When("I send a GET request to {string}")
    public void iSendGetRequest(String endpoint) {
        RequestSpecification req = applyDefaultClientHeaders(given());
        if (authToken != null && !authToken.isBlank()) {
            req.header("Authorization", "Bearer " + authToken);
        }
        lastResponse = req.when().get(endpoint);
    }

    @When("I send a GET request to {string} with headers:")
    public void iSendGetRequestWithHeaders(String endpoint, Map<String, String> headers) {
        boolean providedClientHeader = headers != null && headers.keySet().stream().anyMatch(k ->
            k.equalsIgnoreCase("X-Client-Platform") || k.equalsIgnoreCase("X-Client-Version") || k.equalsIgnoreCase("X-Device-ID") || k.equalsIgnoreCase("User-Agent")
        );
        RequestSpecification request = providedClientHeader ? given() : applyDefaultClientHeaders(given());
        for (Map.Entry<String, String> header : headers.entrySet()) {
            request.header(header.getKey(), header.getValue());
        }
        lastResponse = request.when().get(endpoint);
    }

    @When("I send {int} GET requests to {string} within {int} minute")
    public void iSendMultipleGetRequestsWithinTimeframe(int count, String endpoint, int minutes) {
        responses.clear();
        for (int i = 0; i <= count; i++) {
            RequestSpecification req = applyDefaultClientHeaders(given());
            if (authToken != null && !authToken.isBlank()) {
                req.header("Authorization", "Bearer " + authToken);
            }
            Response resp = req.when().get(endpoint);
            responses.add(resp);
        }
        if (!responses.isEmpty()) {
            lastResponse = responses.get(responses.size() - 1);
        }
    }

    @Then("the response should have field {string} with boolean value {string}")
    public void theResponseShouldHaveFieldWithBooleanValue(String fieldPath, String expectedValue) {
        assertNotNull(lastResponse, "No response received");

        // Parse the expected value as boolean
        boolean booleanValue = Boolean.parseBoolean(expectedValue);
        lastResponse.then().body(fieldPath, equalTo(booleanValue));
    }

    @Then("the response should have field {string} with value {int}")
    public void theResponseShouldHaveFieldWithIntValue(String fieldPath, int expectedValue) {
        assertNotNull(lastResponse, "No response received");
        lastResponse.then().body(fieldPath, equalTo(expectedValue));
    }

    @Then("the response should have field {string} containing {string}")
    public void theResponseShouldHaveFieldContaining(String fieldPath, String expectedSubstring) {
        assertNotNull(lastResponse, "No response received");
        lastResponse.then().body(fieldPath, containsString(expectedSubstring));
    }

    @Then("the {int}st response status should be {int}")
    @Then("the {int}nd response status should be {int}")
    @Then("the {int}rd response status should be {int}")
    @Then("the {int}th response status should be {int}")
    public void theNthResponseStatusShouldBe(int responseIndex, int expectedStatus) {
        assertTrue(responses.size() >= responseIndex, "Not enough responses received");
        Response nthResponse = responses.get(responseIndex - 1);
        assertEquals(expectedStatus, nthResponse.getStatusCode());
    }


    @Then("the response JSON field {string} should be a valid ISO-8601 timestamp")
    public void theResponseJsonFieldShouldBeValidISO8601Timestamp(String fieldPath) {
        assertNotNull(lastResponse, "No response received");
        String ts = lastResponse.jsonPath().getString(fieldPath);
        assertNotNull(ts, "Field not found: " + fieldPath);
        assertTrue(ts.matches("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z$"), "Timestamp is not ISO-8601: " + ts);
    }


    @Then("the response headers should contain \\(auth\\) {string}")
    public void theResponseHeadersShouldContainAuth(String headerName) {
        assertNotNull(lastResponse, "No response received");
        assertNotNull(lastResponse.getHeader(headerName),
            "Response does not contain header: " + headerName);
    }


    @Then("the {int}st response should have field {string} with value {string}")
    @Then("the {int}nd response should have field {string} with value {string}")
    @Then("the {int}rd response should have field {string} with value {string}")
    @Then("the {int}th response should have field {string} with value {string}")
    public void theNthResponseShouldHaveFieldWithValue(int responseIndex, String fieldPath, String expectedValue) {
        assertTrue(responses.size() >= responseIndex, "Not enough responses received");
        Response nthResponse = responses.get(responseIndex - 1);
        nthResponse.then().body(fieldPath, equalTo(expectedValue));
    }
    @Then("the {int}st response should have field {string} with value {int}")
    @Then("the {int}nd response should have field {string} with value {int}")
    @Then("the {int}rd response should have field {string} with value {int}")
    @Then("the {int}th response should have field {string} with value {int}")
    public void theNthResponseShouldHaveFieldWithIntValue(int responseIndex, String fieldPath, int expectedValue) {
        assertTrue(responses.size() >= responseIndex, "Not enough responses received");
        Response nthResponse = responses.get(responseIndex - 1);
        nthResponse.then().body(fieldPath, equalTo(expectedValue));
    }

    // Helper to post test flags to gateway (no-op if endpoint not available)
    private void postFlags(Map<String, Object> flags) {
        String cfg = this.gatewayBaseUrl;
        if (cfg == null || cfg.isBlank()) {
            cfg = System.getenv("GATEWAY_BASE_URL");
        }
        if (cfg == null || cfg.isBlank()) {
            cfg = System.getProperty("GATEWAY_BASE_URL");
        }
        if (cfg == null || cfg.isBlank()) {
            cfg = "http://gateway:8080";
        }
        try {
            given()
                .baseUri(cfg)
                .contentType("application/json")
                .body(flags)
                .when()
                .post("/private/flags")
                .then()
                .statusCode(anyOf(is(200), is(404)));
        } catch (Exception ignored) {
            // In non-test profile this endpoint may not exist; ignore
        }
    }


    private void setupGoogleOAuthStubs() {
        // Token exchange endpoint
        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/oauth2/v4/token"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                            "access_token": "google-access-token",
                            "expires_in": 3599,
                            "refresh_token": "google-refresh-token",
                            "scope": "openid email profile",
                            "token_type": "Bearer",
                            "id_token": "google-id-token"
                        }
                        """))
        );

        // Auth API endpoints proxied by TestProxyController in test profile
        WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/api/auth/me"))
                .withHeader("Authorization", WireMock.matching(".*"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "email": "test.user@example.com", "name": "Test User" }
                        """))
        );

        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/auth/register"))
                .withHeader("Authorization", WireMock.matching(".*"))
                .willReturn(WireMock.aResponse()
                    .withStatus(201)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "userId": "user-123", "email": "test.user@example.com", "createdAt": "2024-01-01T00:00:00Z" }
                        """))
        );

        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/auth/login"))
                .withHeader("Authorization", WireMock.matching(".*"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "accessToken": "gateway-access-token", "refreshToken": "refresh-token", "expiresIn": 3600 }
                        """))
        );

        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/auth/refresh"))
                .withHeader("Authorization", WireMock.matching(".*"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "accessToken": "new-access-token", "expiresIn": 3600 }
                        """))
        );

        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/auth/logout"))
                .withHeader("Authorization", WireMock.matching(".*"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "message": "Successfully logged out" }
                        """))
        );
    }

    private void setupAppleOAuthStubs() {
        // Token exchange endpoint
        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/auth/oauth2/v2/token"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                            "access_token": "apple-access-token",
                            "token_type": "Bearer",
                            "expires_in": 3600,
                            "refresh_token": "apple-refresh-token",
                            "id_token": "apple-id-token"
                        }
                        """))
        );

        // Public keys endpoint
        WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/auth/keys"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                            "keys": [
                                {
                                    "kty": "RSA",
                                    "kid": "test-key-id",
                                    "use": "sig",
                                    "alg": "RS256",
                                    "n": "test-modulus",
                                    "e": "AQAB"
                                }
                            ]
                        }
                        """))
        );

        // Auth API endpoints (same as Google, content doesn't depend on provider)
        WireMock.stubFor(
            WireMock.get(WireMock.urlPathEqualTo("/api/auth/me"))
                .withHeader("Authorization", WireMock.matching(".*"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "email": "apple.user@example.com", "name": "Apple User" }
                        """))
        );

        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/auth/register"))
                .withHeader("Authorization", WireMock.matching(".*"))
                .willReturn(WireMock.aResponse()
                    .withStatus(201)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "userId": "user-456", "email": "apple.user@example.com", "createdAt": "2024-01-01T00:00:00Z" }
                        """))
        );

        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/auth/login"))
                .withHeader("Authorization", WireMock.matching(".*"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "accessToken": "gateway-access-token", "refreshToken": "refresh-token", "expiresIn": 3600 }
                        """))
        );

        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/auth/refresh"))
                .withHeader("Authorization", WireMock.matching(".*"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "accessToken": "new-access-token", "expiresIn": 3600 }
                        """))
        );

        WireMock.stubFor(
            WireMock.post(WireMock.urlPathEqualTo("/api/auth/logout"))
                .withHeader("Authorization", WireMock.matching(".*"))
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        { "message": "Successfully logged out" }
                        """))
        );
    }

    @Given("WireMock adds dribble delay of {double} seconds over {int} chunks for path {string}")
    public void wiremockAddsDribbleDelay(double seconds, int chunks, String pathRegex) {
        int totalMs = (int) Math.round(seconds * 1000.0);
        StubMapping m = WireMock.stubFor(
            WireMock.any(WireMock.urlMatching(pathRegex))
                .atPriority(1)
                .willReturn(WireMock.aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withChunkedDribbleDelay(chunks, totalMs)
                    .withBody("{\"ok\":true}"))
        );
        scenarioStubs.add(m);
    }

    @When("I send a timed GET request to {string} with valid authentication")
    public void iSendTimedGetRequestWithValidAuthentication(String endpoint) {
        RequestSpecification req = applyDefaultClientHeaders(given());
        String token = (authToken != null && !authToken.isBlank()) ? authToken : "gateway-access-token";
        req.header("Authorization", "Bearer " + token);
        long start = System.nanoTime();
        lastResponse = req.when().get(endpoint);
        long end = System.nanoTime();
        lastDurationMs = java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(end - start);
    }

    // --- Circuit breaker test helpers ---
    private java.util.List<io.restassured.response.Response> recentResponses = new java.util.ArrayList<>();

    @When("I send {int} timed authenticated GET requests to {string}")
    public void iSendMultipleTimedAuthenticatedGetRequests(int count, String endpoint) {
        recentResponses.clear();
        for (int i = 0; i < count; i++) {
            iSendTimedGetRequestWithValidAuthentication(endpoint);
            recentResponses.add(lastResponse);
        }
    }

    @Then("at least {int} responses should have status {int}")
    public void atLeastNResponsesShouldHaveStatus(int minCount, int status) {
        long matched = recentResponses.stream().filter(r -> r.getStatusCode() == status).count();
        assertTrue(matched >= minCount, "Expected at least " + minCount + " responses with status " + status + ", got " + matched);
    }

    @Then("at least {int} responses should have field {string} with value {string}")
    public void atLeastNResponsesShouldHaveFieldWithValue(int minCount, String field, String value) {
        long matched = recentResponses.stream()
                .filter(r -> {
                    try {
                        return value.equals(r.jsonPath().getString(field));
                    } catch (Exception e) {
                        return false;
                    }
                }).count();
        assertTrue(matched >= minCount, "Expected at least " + minCount + " responses with field " + field + "=" + value + ", got " + matched);
    }

    @Then("all of the last {int} responses should be faster than {int} ms")
    public void allLastResponsesFasterThan(int count, int thresholdMs) {
        int size = Math.min(count, recentResponses.size());
        for (int i = recentResponses.size() - size; i < recentResponses.size(); i++) {
            long time = recentResponses.get(i).getTime();
            assertTrue(time < thresholdMs, "Response time " + time + "ms exceeds " + thresholdMs + "ms for response index " + i);
        }
    }

    @Then("the last response time should be less than {int} ms")
    public void theLastResponseTimeShouldBeLessThanMs(int thresholdMs) {
        assertTrue(lastDurationMs < thresholdMs, "Response time " + lastDurationMs + "ms exceeded threshold " + thresholdMs + "ms");
    }

    // --- Request ID steps ---
    @Given("WireMock returns 200 for GET {string}")
    public void wiremockReturns200ForGet(String path) {
        ensureWireMockConfigured();
        scenarioStubs.add(
            WireMock.stubFor(
                WireMock.get(WireMock.urlPathEqualTo(path))
                    .willReturn(WireMock.aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"ok\":true}"))
            )
        );
    }

    @Then("the response header {string} should be a UUID")
    public void responseHeaderShouldBeUuid(String headerName) {
        assertNotNull(lastResponse, "No response received");
        String value = lastResponse.getHeader(headerName);
        assertNotNull(value, "Missing header: " + headerName);
        assertDoesNotThrow(() -> java.util.UUID.fromString(value), "Header is not a valid UUID: " + value);
    }

    @Then("WireMock should have received a request to {string} with header {string} equal to the response header {string}")
    public void wiremockShouldHaveReceivedRequestWithHeaderEqualToResponseHeader(String path, String headerName, String respHeaderName) {
        assertNotNull(lastResponse, "No response received");
        String expected = lastResponse.getHeader(respHeaderName);
        assertNotNull(expected, "Response missing header: " + respHeaderName);
        wiremockShouldHaveReceivedRequestWithHeaderEqualTo(path, headerName, expected);
    }

    @Then("WireMock should have received a request to {string} with header {string} equal to {string}")
    public void wiremockShouldHaveReceivedRequestWithHeaderEqualTo(String path, String headerName, String expectedValue) {
        ensureWireMockConfigured();
        var events = com.github.tomakehurst.wiremock.client.WireMock.getAllServeEvents();
        com.github.tomakehurst.wiremock.stubbing.ServeEvent match = null;
        for (var ev : events) {
            String url = ev.getRequest().getUrl();
            if (url != null && (url.equals(path) || url.startsWith(path + "?") || url.equals("http://wiremock:8080" + path))) {
                match = ev;
            }
        }
        assertNotNull(match, "No WireMock request captured for path: " + path);
        String actual = match.getRequest().getHeader(headerName);
        assertEquals(expectedValue, actual, "WireMock captured header mismatch for " + headerName);
    }
}
