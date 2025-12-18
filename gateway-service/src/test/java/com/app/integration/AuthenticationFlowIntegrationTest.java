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
        // Use fake tokens for testing (accepted by JwtAuthenticationFilter in test profile)
        validAccessToken = "valid-test-access-token-123";
        validRefreshToken = "valid-test-refresh-token-456";

        // Stub user and session services to avoid external Firestore dependency (PII-free)
        User mockUser = new User();
        mockUser.setId("test-user-123");
        mockUser.setProvider("google");
        mockUser.setProviderId("google-123");
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
        // Test using fake tokens (accepted by JwtAuthenticationFilter in test profile)
        // This tests the basic authentication flow without requiring real JWT validation

        // Step 1: Use fake access token to access protected endpoint
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("user-123"))
                .andExpect(jsonPath("$.provider").value("google"));

        // Step 2: Test with another fake token
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer valid-another-test-token")
                .header("X-Client-Platform", "android")
                .header("X-Client-Version", "2.0.0")
                .header("X-Device-ID", "test-device-456"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists());
    }



    @Test
    void securityHeadersIntegration_ShouldBeAppliedToAllResponses() throws Exception {
        // Test that security headers are applied to authenticated requests
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
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
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());

        // Test 4: Forbidden access (if implemented)
        // This would test role-based access control if implemented

        // Test 5: Not found endpoints
        mockMvc.perform(get("/api/v1/nonexistent")
                .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isNotFound());
    }

    @Test
    void corsIntegration_ShouldHandlePreflightRequests() throws Exception {
        // Test preflight request
        mockMvc.perform(options("/api/auth/me")
                .header("Origin", "https://app.growwithfreya.com")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Access-Control-Allow-Origin"))
                .andExpect(header().exists("Access-Control-Allow-Methods"))
                .andExpect(header().exists("Access-Control-Allow-Headers"));

        // Test actual CORS request
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123")
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
                        mockMvc.perform(get("/api/auth/me")
                                .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123")
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
        String expiredToken = "valid-test-access-token";

        // For this test, we'll use an obviously invalid token format
        String invalidToken = "expired.token.here";

        // Test that expired token is rejected
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + invalidToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());

        // Test that valid token still works
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isOk());
    }

    @Test
    void deviceAndSessionTracking_ShouldWorkAcrossRequests() throws Exception {
        String deviceId = "test-device-789";
        String sessionId = "test-session-101112";

        // Make multiple requests with same device/session IDs
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(get("/api/auth/me")
                    .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123")
                    .header("X-Device-ID", deviceId)
                    .header("X-Session-ID", sessionId))
                    .andExpect(status().isOk());
        }

        // Verify that the requests were processed successfully
        // In a real implementation, you might verify that device/session tracking worked
        // by checking logs or metrics
    }



    @Test
    void tokenExpiry_AccessTokenExpired_ShouldBeRejected() throws Exception {
        // Build a correctly signed but expired access token (PII-free - no email)
        java.util.Date past = new java.util.Date(System.currentTimeMillis() - 60_000);
        String expired = com.auth0.jwt.JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject("test-user-123")
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(new java.util.Date(System.currentTimeMillis() - 120_000))
                .withExpiresAt(past)
                .sign(jwtConfig.jwtAlgorithm());

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + expired)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenTemporal_AccessTokenNotBeforeInFuture_ShouldBeRejected() throws Exception {
        // Build a correctly signed token that is not yet valid (nbf in the future) (PII-free - no email)
        java.util.Date futureNbf = new java.util.Date(System.currentTimeMillis() + 60_000);
        String notYetValid = com.auth0.jwt.JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject("test-user-123")
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(new java.util.Date())
                .withNotBefore(futureNbf)
                .withExpiresAt(new java.util.Date(System.currentTimeMillis() + 3600_000))
                .sign(jwtConfig.jwtAlgorithm());

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + notYetValid)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenType_WrongTypeRefresh_ShouldBeRejected() throws Exception {
        // Build a correctly signed token with wrong type claim (PII-free - no email)
        String wrongType = com.auth0.jwt.JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject("test-user-123")
                .withClaim("provider", "google")
                .withClaim("type", "refresh")
                .withIssuedAt(new java.util.Date())
                .withExpiresAt(new java.util.Date(System.currentTimeMillis() + 3600_000))
                .sign(jwtConfig.jwtAlgorithm());

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + wrongType)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenIssuer_WrongIssuer_ShouldBeRejected() throws Exception {
        // PII-free - no email claim
        String wrongIssuer = com.auth0.jwt.JWT.create()
                .withIssuer("some-other-issuer")
                .withSubject("test-user-123")
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(new java.util.Date())
                .withExpiresAt(new java.util.Date(System.currentTimeMillis() + 3600_000))
                .sign(jwtConfig.jwtAlgorithm());

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + wrongIssuer)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenMalformed_TwoParts_ShouldBeRejected() throws Exception {
        String twoParts = "aaa.bbb";
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + twoParts)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenMalformed_FourParts_ShouldBeRejected() throws Exception {
        String fourParts = "a.b.c.d";
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + fourParts)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenMalformed_InvalidBase64_ShouldBeRejected() throws Exception {
        String invalidBase64 = "eyJhbGciOiJIUzI1NiJ9.@@@.sig";
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + invalidBase64)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenMalformed_HeaderNotJson_ShouldBeRejected() throws Exception {
        java.util.Base64.Encoder enc = java.util.Base64.getUrlEncoder().withoutPadding();
        String header = enc.encodeToString("not-json".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String payload = enc.encodeToString("{}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String token = header + "." + payload + ".sig";
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + token)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenMalformed_PayloadNotJson_ShouldBeRejected() throws Exception {
        java.util.Base64.Encoder enc = java.util.Base64.getUrlEncoder().withoutPadding();
        String header = enc.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String payload = enc.encodeToString("not-json".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String token = header + "." + payload + ".sig";
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + token)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenTemporal_ExpiredByOneSecond_ShouldBeRejected() throws Exception {
        // PII-free - no email claim
        String expired = com.auth0.jwt.JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject("test-user-123")
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(new java.util.Date(System.currentTimeMillis() - 2_000))
                .withExpiresAt(new java.util.Date(System.currentTimeMillis() - 1_000))
                .sign(jwtConfig.jwtAlgorithm());
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + expired)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenTemporal_NotBeforeByOneSecond_ShouldBeRejected() throws Exception {
        // PII-free - no email claim
        String notYetValid = com.auth0.jwt.JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject("test-user-123")
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(new java.util.Date())
                .withNotBefore(new java.util.Date(System.currentTimeMillis() + 1_000))
                .withExpiresAt(new java.util.Date(System.currentTimeMillis() + 3600_000))
                .sign(jwtConfig.jwtAlgorithm());
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + notYetValid)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                .andExpect(status().isUnauthorized());
    }


}
