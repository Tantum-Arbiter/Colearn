package com.app.functest.stepdefs;

import io.cucumber.datatable.DataTable;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.response.Response;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Step definitions for cross-device synchronization functional tests
 */
public class CrossDeviceSyncStepDefs extends BaseStepDefs {

    // Store tokens and data for multiple devices
    private final Map<String, String> deviceTokens = new HashMap<>();
    private final Map<String, String> storedTokens = new HashMap<>();
    private String lastIdToken;
    private String lastUserId;

    @Given("I authenticate with Google using a valid ID token")
    public void iAuthenticateWithGoogleUsingValidIdToken() {
        iAuthenticateWithGoogleUsingValidIdTokenForDevice("device-default");
    }

    @Given("I authenticate with Google using a valid ID token for device {string}")
    public void iAuthenticateWithGoogleUsingValidIdTokenForDevice(String deviceId) {
        // Create a unique test user for this scenario
        String timestamp = String.valueOf(System.currentTimeMillis());
        String userId = "test-user-" + timestamp;
        String email = "test-" + timestamp + "@example.com";
        String providerId = "google-" + timestamp;

        // Store for later use
        this.lastUserId = userId;

        // Create user via test admin endpoint
        Response createUserResponse = applyDefaultClientHeaders(given())
            .header("Content-Type", "application/json")
            .body(String.format("""
                {
                  "userId": "%s",
                  "email": "%s",
                  "displayName": "Test User",
                  "provider": "google",
                  "providerId": "%s"
                }
                """, userId, email, providerId))
            .when()
            .post("/private/test/create-user");

        if (createUserResponse.getStatusCode() != 200) {
            throw new RuntimeException("Failed to create test user: " + createUserResponse.getBody().asString());
        }

        // Generate a mock ID token (in real tests, this would be a valid JWT)
        this.lastIdToken = "mock-id-token-" + timestamp;

        // Authenticate with Google
        lastResponse = applyDefaultClientHeaders(given())
            .header("Content-Type", "application/json")
            .body(String.format("""
                {
                  "idToken": "%s",
                  "deviceInfo": {
                    "deviceId": "%s",
                    "deviceType": "mobile",
                    "platform": "ios",
                    "appVersion": "1.0.0"
                  }
                }
                """, this.lastIdToken, deviceId))
            .when()
            .post("/auth/google");
    }

    @When("I authenticate with Google using the same ID token for device {string}")
    public void iAuthenticateWithGoogleUsingSameIdTokenForDevice(String deviceId) {
        // Use the same user but different device
        lastResponse = applyDefaultClientHeaders(given())
            .header("Content-Type", "application/json")
            .body(String.format("""
                {
                  "idToken": "%s",
                  "deviceInfo": {
                    "deviceId": "%s",
                    "deviceType": "mobile",
                    "platform": "ios",
                    "appVersion": "1.0.0"
                  }
                }
                """, this.lastIdToken, deviceId))
            .when()
            .post("/auth/google");
    }

    @When("I store the access token as {string}")
    public void iStoreTheAccessTokenAs(String tokenName) {
        assertNotNull(lastResponse, "No response received");
        String accessToken = lastResponse.jsonPath().getString("tokens.accessToken");
        assertNotNull(accessToken, "Access token is null");
        storedTokens.put(tokenName, accessToken);
    }

    @When("I store the refresh token as {string}")
    public void iStoreTheRefreshTokenAs(String tokenName) {
        assertNotNull(lastResponse, "No response received");
        String refreshToken = lastResponse.jsonPath().getString("tokens.refreshToken");
        assertNotNull(refreshToken, "Refresh token is null");
        storedTokens.put(tokenName, refreshToken);
    }

    @When("I use the access token {string}")
    public void iUseTheAccessToken(String tokenName) {
        String token = storedTokens.get(tokenName);
        assertNotNull(token, "Token '" + tokenName + "' not found");
        // This will be used in the next request
        deviceTokens.put("current", token);
    }

    @When("I create a user profile with:")
    public void iCreateAUserProfileWith(DataTable dataTable) {
        Map<String, String> data = dataTable.asMap(String.class, String.class);
        String body = buildProfileJson(data);
        
        String token = deviceTokens.get("current");
        assertNotNull(token, "No current access token set");
        
        lastResponse = applyDefaultClientHeaders(given())
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .body(body)
            .when()
            .post("/api/profile");
    }

    @When("I update the user profile with:")
    public void iUpdateTheUserProfileWith(DataTable dataTable) {
        Map<String, String> data = dataTable.asMap(String.class, String.class);
        String body = buildProfileJson(data);
        
        String token = deviceTokens.get("current");
        assertNotNull(token, "No current access token set");
        
        lastResponse = applyDefaultClientHeaders(given())
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .body(body)
            .when()
            .post("/api/profile");
    }

    @When("I get the user profile")
    public void iGetTheUserProfile() {
        String token = deviceTokens.get("current");
        assertNotNull(token, "No current access token set");

        lastResponse = applyDefaultClientHeaders(given())
            .header("Authorization", "Bearer " + token)
            .when()
            .get("/api/profile");
    }

    @When("I refresh the access token using {string}")
    public void iRefreshTheAccessTokenUsing(String tokenName) {
        String refreshToken = storedTokens.get(tokenName);
        assertNotNull(refreshToken, "Refresh token '" + tokenName + "' not found");

        lastResponse = applyDefaultClientHeaders(given())
            .header("Content-Type", "application/json")
            .body(String.format("""
                {
                  "refreshToken": "%s"
                }
                """, refreshToken))
            .when()
            .post("/auth/refresh");
    }

    @When("I revoke the refresh token {string}")
    public void iRevokeTheRefreshToken(String tokenName) {
        String refreshToken = storedTokens.get(tokenName);
        assertNotNull(refreshToken, "Refresh token '" + tokenName + "' not found");

        lastResponse = applyDefaultClientHeaders(given())
            .header("Content-Type", "application/json")
            .body(String.format("""
                {
                  "refreshToken": "%s"
                }
                """, refreshToken))
            .when()
            .post("/auth/revoke");
    }

    @Then("the response field {string} should be {string}")
    public void theResponseFieldShouldBe(String fieldPath, String expectedValue) {
        assertNotNull(lastResponse, "No response received");
        String actualValue = lastResponse.jsonPath().getString(fieldPath);

        // Handle boolean values
        if ("true".equalsIgnoreCase(expectedValue) || "false".equalsIgnoreCase(expectedValue)) {
            Boolean expected = Boolean.parseBoolean(expectedValue);
            Boolean actual = lastResponse.jsonPath().getBoolean(fieldPath);
            assertEquals(expected, actual, "Field '" + fieldPath + "' value mismatch");
        } else {
            assertEquals(expectedValue, actualValue, "Field '" + fieldPath + "' value mismatch");
        }
    }

    @Then("the response field {string} should be null")
    public void theResponseFieldShouldBeNull(String fieldPath) {
        assertNotNull(lastResponse, "No response received");
        Object value = lastResponse.jsonPath().get(fieldPath);
        assertNull(value, "Field '" + fieldPath + "' should be null but was: " + value);
    }

    @Then("the response should contain field {string}")
    public void theResponseShouldContainField(String fieldPath) {
        assertNotNull(lastResponse, "No response received");
        Object value = lastResponse.jsonPath().get(fieldPath);
        assertNotNull(value, "Field '" + fieldPath + "' should exist but was null");
    }

    @Then("the response should contain field {string} with value {string}")
    public void theResponseShouldContainFieldWithValue(String fieldPath, String expectedValue) {
        assertNotNull(lastResponse, "No response received");
        String actualValue = lastResponse.jsonPath().getString(fieldPath);

        // Handle boolean values
        if ("true".equalsIgnoreCase(expectedValue) || "false".equalsIgnoreCase(expectedValue)) {
            Boolean expected = Boolean.parseBoolean(expectedValue);
            Boolean actual = lastResponse.jsonPath().getBoolean(fieldPath);
            assertEquals(expected, actual, "Field '" + fieldPath + "' value mismatch");
        } else {
            assertEquals(expectedValue, actualValue, "Field '" + fieldPath + "' value mismatch");
        }
    }

    @Given("the Firestore emulator is available")
    public void theFirestoreEmulatorIsAvailable() {
        // This is a precondition check - in Docker Compose, Firestore is always available
        // In local dev, this would check if the emulator is running
        // For now, we assume it's available as part of the test infrastructure
    }

    // Helper method to build profile JSON from DataTable
    private String buildProfileJson(Map<String, String> data) {
        StringBuilder json = new StringBuilder("{");

        // Simple fields
        if (data.containsKey("nickname")) {
            json.append("\"nickname\":\"").append(data.get("nickname")).append("\",");
        }
        if (data.containsKey("avatarType")) {
            json.append("\"avatarType\":\"").append(data.get("avatarType")).append("\",");
        }
        if (data.containsKey("avatarId")) {
            json.append("\"avatarId\":\"").append(data.get("avatarId")).append("\",");
        }

        // Notifications object
        StringBuilder notifications = new StringBuilder();
        for (Map.Entry<String, String> entry : data.entrySet()) {
            if (entry.getKey().startsWith("notifications.")) {
                String key = entry.getKey().substring("notifications.".length());
                if (notifications.length() > 0) {
                    notifications.append(",");
                }
                // Handle boolean values
                if ("true".equalsIgnoreCase(entry.getValue()) || "false".equalsIgnoreCase(entry.getValue())) {
                    notifications.append("\"").append(key).append("\":").append(entry.getValue().toLowerCase());
                } else {
                    notifications.append("\"").append(key).append("\":\"").append(entry.getValue()).append("\"");
                }
            }
        }
        if (notifications.length() > 0) {
            json.append("\"notifications\":{").append(notifications).append("},");
        }

        // Schedule object
        StringBuilder schedule = new StringBuilder();
        for (Map.Entry<String, String> entry : data.entrySet()) {
            if (entry.getKey().startsWith("schedule.")) {
                String key = entry.getKey().substring("schedule.".length());
                if (schedule.length() > 0) {
                    schedule.append(",");
                }
                schedule.append("\"").append(key).append("\":\"").append(entry.getValue()).append("\"");
            }
        }
        if (schedule.length() > 0) {
            json.append("\"schedule\":{").append(schedule).append("},");
        }

        // Remove trailing comma
        if (json.charAt(json.length() - 1) == ',') {
            json.setLength(json.length() - 1);
        }

        json.append("}");
        return json.toString();
    }

    @When("I update the user profile with custom reminders:")
    public void iUpdateTheUserProfileWithCustomReminders(DataTable dataTable) {
        List<Map<String, String>> reminders = dataTable.asMaps(String.class, String.class);

        // First, get the current profile to preserve existing fields
        String token = deviceTokens.get("current");
        assertNotNull(token, "No current access token set");

        Response profileResponse = applyDefaultClientHeaders(given())
            .header("Authorization", "Bearer " + token)
            .when()
            .get("/api/profile");

        // Build reminders array
        StringBuilder remindersJson = new StringBuilder("[");
        for (int i = 0; i < reminders.size(); i++) {
            Map<String, String> reminder = reminders.get(i);
            if (i > 0) {
                remindersJson.append(",");
            }
            remindersJson.append("{");
            remindersJson.append("\"id\":\"").append(reminder.get("id")).append("\",");
            remindersJson.append("\"title\":\"").append(reminder.get("title")).append("\",");
            remindersJson.append("\"message\":\"").append(reminder.get("message")).append("\",");
            remindersJson.append("\"dayOfWeek\":").append(reminder.get("dayOfWeek")).append(",");
            remindersJson.append("\"time\":\"").append(reminder.get("time")).append("\",");
            remindersJson.append("\"isActive\":").append(reminder.get("isActive"));
            remindersJson.append("}");
        }
        remindersJson.append("]");

        // Build profile update with reminders
        String nickname = profileResponse.jsonPath().getString("nickname");
        String avatarType = profileResponse.jsonPath().getString("avatarType");
        String avatarId = profileResponse.jsonPath().getString("avatarId");

        // Get existing notifications to preserve them
        String notificationsJson = "{}";
        try {
            Object notifications = profileResponse.jsonPath().get("notifications");
            if (notifications != null) {
                notificationsJson = profileResponse.jsonPath().getJsonObject("notifications").toString();
            }
        } catch (Exception e) {
            // No notifications, use empty object
        }

        String body = String.format("""
            {
              "nickname": "%s",
              "avatarType": "%s",
              "avatarId": "%s",
              "notifications": %s,
              "schedule": {
                "customReminders": %s
              }
            }
            """, nickname, avatarType, avatarId, notificationsJson, remindersJson);

        lastResponse = applyDefaultClientHeaders(given())
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .body(body)
            .when()
            .post("/api/profile");
    }

    @Then("the response field {string} should be an array with {int} items")
    public void theResponseFieldShouldBeAnArrayWithItems(String fieldPath, int expectedSize) {
        assertNotNull(lastResponse, "No response received");
        List<?> array = lastResponse.jsonPath().getList(fieldPath);
        assertNotNull(array, "Field '" + fieldPath + "' should be an array but was null");
        assertEquals(expectedSize, array.size(), "Array size mismatch for field '" + fieldPath + "'");
    }

    @Then("the custom reminder at index {int} should have field {string} with value {string}")
    public void theCustomReminderAtIndexShouldHaveFieldWithValue(int index, String field, String expectedValue) {
        assertNotNull(lastResponse, "No response received");
        String fieldPath = "schedule.customReminders[" + index + "]." + field;

        // Handle boolean and numeric values
        if ("true".equalsIgnoreCase(expectedValue) || "false".equalsIgnoreCase(expectedValue)) {
            Boolean expected = Boolean.parseBoolean(expectedValue);
            Boolean actual = lastResponse.jsonPath().getBoolean(fieldPath);
            assertEquals(expected, actual, "Field '" + fieldPath + "' value mismatch");
        } else if (expectedValue.matches("\\d+")) {
            Integer expected = Integer.parseInt(expectedValue);
            Integer actual = lastResponse.jsonPath().getInt(fieldPath);
            assertEquals(expected, actual, "Field '" + fieldPath + "' value mismatch");
        } else {
            String actualValue = lastResponse.jsonPath().getString(fieldPath);
            assertEquals(expectedValue, actualValue, "Field '" + fieldPath + "' value mismatch");
        }
    }

    @Then("the custom reminder in profile at index {int} should have field {string} with value {string}")
    public void theCustomReminderInProfileAtIndexShouldHaveFieldWithValue(int index, String field, String expectedValue) {
        assertNotNull(lastResponse, "No response received");
        String fieldPath = "profile.schedule.customReminders[" + index + "]." + field;

        // Handle boolean and numeric values
        if ("true".equalsIgnoreCase(expectedValue) || "false".equalsIgnoreCase(expectedValue)) {
            Boolean expected = Boolean.parseBoolean(expectedValue);
            Boolean actual = lastResponse.jsonPath().getBoolean(fieldPath);
            assertEquals(expected, actual, "Field '" + fieldPath + "' value mismatch");
        } else if (expectedValue.matches("\\d+")) {
            Integer expected = Integer.parseInt(expectedValue);
            Integer actual = lastResponse.jsonPath().getInt(fieldPath);
            assertEquals(expected, actual, "Field '" + fieldPath + "' value mismatch");
        } else {
            String actualValue = lastResponse.jsonPath().getString(fieldPath);
            assertEquals(expectedValue, actualValue, "Field '" + fieldPath + "' value mismatch");
        }
    }
}

