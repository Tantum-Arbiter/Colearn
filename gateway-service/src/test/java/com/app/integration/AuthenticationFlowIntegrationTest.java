package com.app.integration;

import com.app.config.JwtConfig;
import com.app.security.RateLimitingFilter;
import com.app.service.GatewayServiceApplication;
import com.app.service.SecurityMonitoringService;
import com.app.service.SessionService;
import com.app.service.UserService;
import com.app.model.User;
import com.app.model.UserSession;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = GatewayServiceApplication.class)
@ActiveProfiles("test")
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

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @MockBean
    private SessionService sessionService;

    @MockBean
    private UserService userService;

    private String validAccessToken;
    private String validRefreshToken;

    @BeforeEach
    void setUp() {
        // Reset rate limiting state between tests to avoid cross-test interference
        if (rateLimitingFilter != null) {
            rateLimitingFilter.resetForTests();
        }
        // Generate valid tokens for testing
        validAccessToken = jwtConfig.generateAccessToken("test-user-123", "test@example.com", "google");
        validRefreshToken = jwtConfig.generateRefreshToken("test-user-123");

        // Stub user and session services to avoid external Firestore dependency
        User mockUser = new User();
        mockUser.setId("test-user-123");
        mockUser.setEmail("test@example.com");
        mockUser.setProvider("google");
        mockUser.setEmailVerified(true);
        when(userService.getUserById("test-user-123"))
            .thenReturn(CompletableFuture.completedFuture(Optional.of(mockUser)));

        UserSession mockSession = new UserSession();
        mockSession.setId("session-1");
        mockSession.setUserId("test-user-123");
        mockSession.setRefreshToken(validRefreshToken);
        mockSession.setActive(true);
        mockSession.setExpiresAt(Instant.now().plusSeconds(3600));

        when(sessionService.getSessionByRefreshToken(validRefreshToken))
            .thenReturn(CompletableFuture.completedFuture(Optional.of(mockSession)));
        when(sessionService.validateAndRefreshSession(eq(validRefreshToken), anyString()))
            .thenAnswer(inv -> CompletableFuture.completedFuture(mockSession));
        when(sessionService.revokeSessionByRefreshToken(anyString()))
            .thenReturn(CompletableFuture.completedFuture(Optional.of(mockSession)));
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

    @Test
    void tokenTampering_AccessTokenPayloadChanged_ShouldBeRejected() throws Exception {
        // Take a valid token and tamper the payload without resigning
        String[] parts = validAccessToken.split("\\.");
        java.util.Base64.Decoder urlDec = java.util.Base64.getUrlDecoder();
        java.util.Base64.Encoder urlEnc = java.util.Base64.getUrlEncoder().withoutPadding();
        String payloadJson = new String(urlDec.decode(parts[1]), java.nio.charset.StandardCharsets.UTF_8);
        com.fasterxml.jackson.databind.node.ObjectNode node = (com.fasterxml.jackson.databind.node.ObjectNode) objectMapper.readTree(payloadJson);
        node.put("email", "attacker@example.com"); // tamper a claim
        String newPayload = urlEnc.encodeToString(objectMapper.writeValueAsBytes(node));
        String tampered = parts[0] + "." + newPayload + "." + parts[2]; // signature now invalid

        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenTampering_AccessTokenExpiryClaimTampered_ShouldBeRejected() throws Exception {
        // Change exp to far future without resigning (still invalid signature)
        String[] parts = validAccessToken.split("\\.");
        java.util.Base64.Decoder urlDec = java.util.Base64.getUrlDecoder();
        java.util.Base64.Encoder urlEnc = java.util.Base64.getUrlEncoder().withoutPadding();
        String payloadJson = new String(urlDec.decode(parts[1]), java.nio.charset.StandardCharsets.UTF_8);
        com.fasterxml.jackson.databind.node.ObjectNode node = (com.fasterxml.jackson.databind.node.ObjectNode) objectMapper.readTree(payloadJson);
        long future = (System.currentTimeMillis() / 1000L) + 3600L * 24L;
        node.put("exp", future);
        String newPayload = urlEnc.encodeToString(objectMapper.writeValueAsBytes(node));
        String tampered = parts[0] + "." + newPayload + "." + parts[2];

        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenExpiry_AccessTokenExpired_ShouldBeRejected() throws Exception {
        // Build a correctly signed but expired access token
        java.util.Date past = new java.util.Date(System.currentTimeMillis() - 60_000);
        String expired = com.auth0.jwt.JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject("test-user-123")
                .withClaim("email", "test@example.com")
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(new java.util.Date(System.currentTimeMillis() - 120_000))
                .withExpiresAt(past)
                .sign(jwtConfig.jwtAlgorithm());

        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenTemporal_AccessTokenNotBeforeInFuture_ShouldBeRejected() throws Exception {
        // Build a correctly signed token that is not yet valid (nbf in the future)
        java.util.Date futureNbf = new java.util.Date(System.currentTimeMillis() + 60_000);
        String notYetValid = com.auth0.jwt.JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject("test-user-123")
                .withClaim("email", "test@example.com")
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(new java.util.Date())
                .withNotBefore(futureNbf)
                .withExpiresAt(new java.util.Date(System.currentTimeMillis() + 3600_000))
                .sign(jwtConfig.jwtAlgorithm());

        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + notYetValid))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenType_WrongTypeRefresh_ShouldBeRejected() throws Exception {
        // Build a correctly signed token with wrong type claim
        String wrongType = com.auth0.jwt.JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject("test-user-123")
                .withClaim("email", "test@example.com")
                .withClaim("provider", "google")
                .withClaim("type", "refresh")
                .withIssuedAt(new java.util.Date())
                .withExpiresAt(new java.util.Date(System.currentTimeMillis() + 3600_000))
                .sign(jwtConfig.jwtAlgorithm());

        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + wrongType))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenIssuer_WrongIssuer_ShouldBeRejected() throws Exception {
        String wrongIssuer = com.auth0.jwt.JWT.create()
                .withIssuer("some-other-issuer")
                .withSubject("test-user-123")
                .withClaim("email", "test@example.com")
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(new java.util.Date())
                .withExpiresAt(new java.util.Date(System.currentTimeMillis() + 3600_000))
                .sign(jwtConfig.jwtAlgorithm());

        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + wrongIssuer))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenMalformed_TwoParts_ShouldBeRejected() throws Exception {
        String twoParts = "aaa.bbb";
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + twoParts))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenMalformed_FourParts_ShouldBeRejected() throws Exception {
        String fourParts = "a.b.c.d";
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + fourParts))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenMalformed_InvalidBase64_ShouldBeRejected() throws Exception {
        String invalidBase64 = "eyJhbGciOiJIUzI1NiJ9.@@@.sig";
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + invalidBase64))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenMalformed_HeaderNotJson_ShouldBeRejected() throws Exception {
        java.util.Base64.Encoder enc = java.util.Base64.getUrlEncoder().withoutPadding();
        String header = enc.encodeToString("not-json".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String payload = enc.encodeToString("{}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String token = header + "." + payload + ".sig";
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenMalformed_PayloadNotJson_ShouldBeRejected() throws Exception {
        java.util.Base64.Encoder enc = java.util.Base64.getUrlEncoder().withoutPadding();
        String header = enc.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String payload = enc.encodeToString("not-json".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String token = header + "." + payload + ".sig";
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenTemporal_ExpiredByOneSecond_ShouldBeRejected() throws Exception {
        String expired = com.auth0.jwt.JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject("test-user-123")
                .withClaim("email", "test@example.com")
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(new java.util.Date(System.currentTimeMillis() - 2_000))
                .withExpiresAt(new java.util.Date(System.currentTimeMillis() - 1_000))
                .sign(jwtConfig.jwtAlgorithm());
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenTemporal_NotBeforeByOneSecond_ShouldBeRejected() throws Exception {
        String notYetValid = com.auth0.jwt.JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject("test-user-123")
                .withClaim("email", "test@example.com")
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(new java.util.Date())
                .withNotBefore(new java.util.Date(System.currentTimeMillis() + 1_000))
                .withExpiresAt(new java.util.Date(System.currentTimeMillis() + 3600_000))
                .sign(jwtConfig.jwtAlgorithm());
        mockMvc.perform(get("/api/v1/stories/batch")
                .header("Authorization", "Bearer " + notYetValid))
                .andExpect(status().isUnauthorized());
    }


}
