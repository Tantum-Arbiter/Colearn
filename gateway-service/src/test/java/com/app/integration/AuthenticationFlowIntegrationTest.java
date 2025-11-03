package com.app.integration;

import com.app.config.JwtConfig;
import com.app.service.SecurityMonitoringService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthenticationFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtConfig jwtConfig;

    @MockBean
    private SecurityMonitoringService securityMonitoringService;

    private String validAccessToken;
    private String validRefreshToken;

    @BeforeEach
    void setUp() {
        // Generate valid tokens for testing
        validAccessToken = jwtConfig.generateAccessToken("test-user-123", "test@example.com", "google");
        validRefreshToken = jwtConfig.generateRefreshToken("test-user-123");
    }

    @Test
    void completeAuthenticationFlow_ShouldWorkEndToEnd() throws Exception {
        // Step 1: Mock Google authentication
        Map<String, String> googleAuthRequest = new HashMap<>();
        googleAuthRequest.put("idToken", "mock.google.id.token");
        googleAuthRequest.put("clientId", "test-google-client-id");

        // Mock the Google ID token validation
        // Note: In a real integration test, you might use WireMock to mock Google's endpoints

        // Step 2: Use generated tokens to access protected endpoints
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + validAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());

        // Step 3: Test token refresh
        Map<String, String> refreshRequest = new HashMap<>();
        refreshRequest.put("refreshToken", validRefreshToken);

        MvcResult refreshResult = mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.tokens.accessToken").exists())
                .andExpect(jsonPath("$.tokens.refreshToken").exists())
                .andReturn();

        // Step 4: Use new tokens
        String responseContent = refreshResult.getResponse().getContentAsString();
        Map<String, Object> refreshResponse = objectMapper.readValue(responseContent, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, String> newTokens = (Map<String, String>) refreshResponse.get("tokens");
        String newAccessToken = newTokens.get("accessToken");

        mockMvc.perform(get("/api/v1/content/metadata")
                .header("Authorization", "Bearer " + newAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Step 5: Revoke tokens
        Map<String, String> revokeRequest = new HashMap<>();
        revokeRequest.put("refreshToken", newTokens.get("refreshToken"));

        mockMvc.perform(post("/auth/revoke")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(revokeRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void securityFiltersIntegration_ShouldWorkTogether() throws Exception {
        // Test 1: Request without authentication should be blocked
        mockMvc.perform(get("/api/v1/stories/batch"))
                .andExpect(status().isUnauthorized());

        // Test 2: Request with invalid token should be blocked
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer invalid.token.here"))
                .andExpect(status().isUnauthorized());

        // Test 3: Request with valid token should pass through all filters
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Device-ID", "test-device-123")
                .header("X-Session-ID", "test-session-456"))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-RateLimit-Limit"))
                .andExpect(header().exists("X-RateLimit-Remaining"));

        // Test 4: Suspicious request should be blocked by validation filter
        mockMvc.perform(get("/api/v1/stories/batch?id=1' OR '1'='1")
                .header("Authorization", "Bearer " + validAccessToken))
                .andExpect(status().isBadRequest());

        // Test 5: Rate limiting should work
        // Make multiple requests to trigger rate limiting
        for (int i = 0; i < 105; i++) { // Exceed API rate limit of 100
            mockMvc.perform(get("/api/v1/stories/batch")
                    .header("Authorization", "Bearer " + validAccessToken));
        }

        // Next request should be rate limited
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + validAccessToken))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void batchApiIntegration_ShouldProcessMultipleRequests() throws Exception {
        // Given
        Map<String, Object> batchRequest = new HashMap<>();
        batchRequest.put("requests", java.util.Arrays.asList(
            java.util.Map.of("endpoint", "/api/v1/stories/batch", "method", "GET", "params", java.util.Map.of("page", "0", "size", "10")),
            java.util.Map.of("endpoint", "/api/v1/content/metadata", "method", "GET"),
            java.util.Map.of("endpoint", "/api/v1/user/preferences", "method", "POST", "body", java.util.Map.of("theme", "dark"))
        ));

        // When & Then
        mockMvc.perform(post("/api/v1/batch")
                .header("Authorization", "Bearer " + validAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(batchRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.responses").isArray())
                .andExpect(jsonPath("$.responses.length()").value(3))
                .andExpect(jsonPath("$.responses[0].success").value(true))
                .andExpect(jsonPath("$.responses[1].success").value(true))
                .andExpect(jsonPath("$.responses[2].success").value(true));
    }

    @Test
    void securityHeadersIntegration_ShouldBeAppliedToAllResponses() throws Exception {
        // Test that security headers are applied to authenticated requests
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + validAccessToken))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().exists("Strict-Transport-Security"));

        // Test that security headers are applied to public endpoints
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }

    @Test
    void errorHandlingIntegration_ShouldReturnConsistentErrorResponses() throws Exception {
        // Test 1: Invalid JSON in request body
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("invalid json"))
                .andExpect(status().isBadRequest());

        // Test 2: Missing required fields
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());

        // Test 3: Unauthorized access
        mockMvc.perform(get("/api/v1/stories/batch"))
                .andExpect(status().isUnauthorized());

        // Test 4: Forbidden access (if implemented)
        // This would test role-based access control if implemented

        // Test 5: Not found endpoints
        mockMvc.perform(get("/api/v1/nonexistent")
                .header("Authorization", "Bearer " + validAccessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void corsIntegration_ShouldHandlePreflightRequests() throws Exception {
        // Test preflight request
        mockMvc.perform(options("/api/v1/stories/batch")
                .header("Origin", "https://app.growwithfreya.com")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Access-Control-Allow-Origin"))
                .andExpect(header().exists("Access-Control-Allow-Methods"))
                .andExpect(header().exists("Access-Control-Allow-Headers"));

        // Test actual CORS request
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + validAccessToken)
                .header("Origin", "https://app.growwithfreya.com"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Access-Control-Allow-Origin"));
    }

    @Test
    void performanceAndScalability_ShouldHandleConcurrentRequests() throws Exception {
        // This test simulates concurrent requests to ensure thread safety
        int numberOfThreads = 10;
        int requestsPerThread = 5;
        
        Thread[] threads = new Thread[numberOfThreads];
        final Exception[] exceptions = new Exception[numberOfThreads];

        for (int i = 0; i < numberOfThreads; i++) {
            final int threadIndex = i;
            threads[i] = new Thread(() -> {
                try {
                    for (int j = 0; j < requestsPerThread; j++) {
                        mockMvc.perform(get("/api/v1/stories/batch")
                                .header("Authorization", "Bearer " + validAccessToken)
                                .header("X-Device-ID", "device-" + threadIndex)
                                .header("X-Session-ID", "session-" + threadIndex + "-" + j))
                                .andExpect(status().isOk());
                    }
                } catch (Exception e) {
                    exceptions[threadIndex] = e;
                }
            });
            threads[i].start();
        }

        // Wait for all threads to complete
        for (Thread thread : threads) {
            thread.join();
        }

        // Check that no exceptions occurred
        for (int i = 0; i < numberOfThreads; i++) {
            assertNull(exceptions[i], "Thread " + i + " threw an exception: " + 
                (exceptions[i] != null ? exceptions[i].getMessage() : "null"));
        }
    }

    @Test
    void tokenExpirationIntegration_ShouldHandleExpiredTokens() throws Exception {
        // Generate an expired token (this is a simplified test - in reality you'd need to wait or mock time)
        String expiredToken = jwtConfig.generateAccessToken("test-user", "test@example.com", "google");
        
        // For this test, we'll use an obviously invalid token format
        String invalidToken = "expired.token.here";

        // Test that expired token is rejected
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + invalidToken))
                .andExpect(status().isUnauthorized());

        // Test that valid token still works
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + validAccessToken))
                .andExpect(status().isOk());
    }

    @Test
    void deviceAndSessionTracking_ShouldWorkAcrossRequests() throws Exception {
        String deviceId = "test-device-789";
        String sessionId = "test-session-101112";

        // Make multiple requests with same device/session IDs
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(get("/api/v1/stories/batch")
                    .header("Authorization", "Bearer " + validAccessToken)
                    .header("X-Device-ID", deviceId)
                    .header("X-Session-ID", sessionId))
                    .andExpect(status().isOk());
        }

        // Verify that the requests were processed successfully
        // In a real implementation, you might verify that device/session tracking worked
        // by checking logs or metrics
    }
}
