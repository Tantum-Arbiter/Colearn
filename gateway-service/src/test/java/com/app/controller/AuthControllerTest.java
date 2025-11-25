package com.app.controller;

import com.app.config.JwtConfig;
import com.app.model.User;
import com.app.model.UserSession;
import com.app.service.ApplicationMetricsService;
import com.app.service.SecurityMonitoringService;
import com.app.service.SessionService;
import com.app.service.UserService;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.app.service.GatewayServiceApplication;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = GatewayServiceApplication.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtConfig jwtConfig;

    @MockBean
    private SecurityMonitoringService securityMonitoringService;

    @MockBean
    private ApplicationMetricsService applicationMetricsService;

    @MockBean
    private UserService userService;

    @MockBean
    private SessionService sessionService;

    @Autowired
    private ObjectMapper objectMapper;

    private DecodedJWT mockDecodedJWT;

    @BeforeEach
    void setUp() {
        // Create fresh mocks for each test to ensure complete isolation
        mockDecodedJWT = mock(DecodedJWT.class);

        // Reset all mocks to ensure test isolation
        reset(jwtConfig, securityMonitoringService);

        // Clear any interactions from previous tests
        clearInvocations(jwtConfig, securityMonitoringService);

        // Ensure no stubbing remains from previous tests
        verifyNoMoreInteractions(jwtConfig, securityMonitoringService);
    }

    @Test
    void authenticateWithGoogle_WithValidIdToken_ShouldReturnSuccessResponse() throws Exception {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("valid.google.id.token");

        when(jwtConfig.validateGoogleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@gmail.com");
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn("Test User");
        when(mockDecodedJWT.getClaim("picture")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("picture").asString()).thenReturn("https://example.com/avatar.jpg");
        when(mockDecodedJWT.getSubject()).thenReturn("google-user-123");

        // Mock JWT validation instead of generateUserId (method doesn't exist)
        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.token.here");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");

        // Mock user and session creation for successful Google auth
        User user = new User();
        user.setId("google-user-123");
        user.setEmail("test@gmail.com");
        user.setName("Test User");
        user.setProvider("google");
        user.setProviderId("google-user-123");
        when(userService.getOrCreateUser(anyString(), anyString(), eq("google"), anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(user));
        when(sessionService.createSession(anyString(), anyString(), any(), any(), any(), any()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(
                        new UserSession("session-1", user.getId(), "refresh.token.here", "device-123")));

        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.user.email").value("test@gmail.com"))
                .andExpect(jsonPath("$.user.name").value("Test User"))
                .andExpect(jsonPath("$.user.provider").value("google"))
                .andExpect(jsonPath("$.tokens.accessToken").value("access.token.here"))
                .andExpect(jsonPath("$.tokens.refreshToken").value("refresh.token.here"));

        verify(securityMonitoringService).logSuccessfulAuthentication(
            anyString(), eq("google"));
    }

    @Test
    void authenticateWithGoogle_WithInvalidIdToken_ShouldReturnErrorResponse() throws Exception {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("invalid.google.id.token");

        when(jwtConfig.validateGoogleIdToken(anyString()))
            .thenThrow(new JWTVerificationException("Invalid token"));

        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());

        verify(securityMonitoringService).logFailedAuthentication(
            eq("google"));
    }

    @Test
    void authenticateWithApple_WithValidIdToken_ShouldReturnSuccessResponse() throws Exception {
        // Given
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("valid.apple.id.token");
        request.setClientId("apple-client-id");

        // Set user info with name
        AuthController.UserInfo userInfo = new AuthController.UserInfo();
        userInfo.setName("Apple User");
        userInfo.setEmail("test@icloud.com");
        request.setUserInfo(userInfo);

        when(jwtConfig.validateAppleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@icloud.com");
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn("Apple User");
        when(mockDecodedJWT.getSubject()).thenReturn("apple-user-123");

        // Mock JWT validation instead of generateUserId (method doesn't exist)
        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.token.here");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");

        // Mock user and session creation for successful Apple auth
        User appleUser = new User();
        appleUser.setId("apple-user-123");
        appleUser.setEmail("test@icloud.com");
        appleUser.setName("Apple User");
        appleUser.setProvider("apple");
        appleUser.setProviderId("apple-user-123");
        when(userService.getOrCreateUser(anyString(), anyString(), eq("apple"), anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(appleUser));
        when(sessionService.createSession(anyString(), anyString(), any(), any(), any(), any()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(
                        new UserSession("session-2", appleUser.getId(), "refresh.token.here", "device-456")));

        // When & Then
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.user.email").value("test@icloud.com"))
                .andExpect(jsonPath("$.user.name").value("Apple User"))
                .andExpect(jsonPath("$.user.provider").value("apple"))
                .andExpect(jsonPath("$.tokens.accessToken").value("access.token.here"))
                .andExpect(jsonPath("$.tokens.refreshToken").value("refresh.token.here"));

        verify(securityMonitoringService).logSuccessfulAuthentication(
            anyString(), eq("apple"));
    }

    @Test
    void refreshToken_WithValidRefreshToken_ShouldReturnNewTokens() throws Exception {
        // Given
        AuthController.TokenRefreshRequest request = new AuthController.TokenRefreshRequest();
        request.setRefreshToken("valid.refresh.token");

        // Use validateAccessToken instead of validateRefreshToken (method doesn't exist)
        when(jwtConfig.validateAccessToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getSubject()).thenReturn("user-123");
        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("new.access.token");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("new.refresh.token");

        // Mock session and user for refresh flow
        UserSession session = new UserSession();
        session.setId("session-123");
        session.setUserId("user-123");
        session.setRefreshToken("valid.refresh.token");
        session.setExpiresAt(java.time.Instant.now().plusSeconds(3600));
        when(sessionService.getSessionByRefreshToken(anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(java.util.Optional.of(session)));
        User refreshUser = new User();
        refreshUser.setId("user-123");
        refreshUser.setEmail("user@example.com");
        refreshUser.setProvider("google");
        when(userService.getUserById(eq("user-123")))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(java.util.Optional.of(refreshUser)));
        when(sessionService.validateAndRefreshSession(anyString(), anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(session));

        // When & Then
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.tokens.accessToken").value("new.access.token"))
                .andExpect(jsonPath("$.tokens.refreshToken").value("new.refresh.token"));

    }

    @Test
    void refreshToken_WithInvalidRefreshToken_ShouldReturnErrorResponse() throws Exception {
        // Given
        AuthController.TokenRefreshRequest request = new AuthController.TokenRefreshRequest();
        request.setRefreshToken("invalid.refresh.token");

        when(jwtConfig.validateAccessToken(anyString()))
            .thenThrow(new RuntimeException("Invalid refresh token"));

        // Returning empty session should produce 401 from controller
        when(sessionService.getSessionByRefreshToken(anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(java.util.Optional.empty()));

        // When & Then
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void revokeToken_WithValidRefreshToken_ShouldReturnSuccessResponse() throws Exception {
        // Given
        AuthController.TokenRevokeRequest request = new AuthController.TokenRevokeRequest();
        request.setRefreshToken("valid.refresh.token");

        // Mock successful revocation
        UserSession revoked = new UserSession();
        revoked.setUserId("user-123");
        when(sessionService.revokeSessionByRefreshToken(anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(java.util.Optional.of(revoked)));

        // When & Then
        mockMvc.perform(post("/auth/revoke")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Tokens revoked successfully"));
    }

    @Test
    void authenticateWithGoogle_WithMissingIdToken_ShouldReturnBadRequest() throws Exception {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setClientId("google-client-id");
        // Missing idToken

        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void authenticateWithGoogle_WithoutClientId_ShouldStillSucceed() throws Exception {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("valid.google.id.token");
        // clientId is optional and ignored by backend

        when(jwtConfig.validateGoogleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@gmail.com");
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn("Test User");
        when(mockDecodedJWT.getSubject()).thenReturn("google-user-123");
        when(mockDecodedJWT.getClaim("picture")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("picture").asString()).thenReturn("https://example.com/avatar.jpg");


        User user = new User();
        user.setId("google-user-123");
        user.setEmail("test@gmail.com");
        user.setName("Test User");
        user.setProvider("google");
        user.setProviderId("google-user-123");
        when(userService.getOrCreateUser(anyString(), anyString(), eq("google"), anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(user));
        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.token.here");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");
        when(sessionService.createSession(anyString(), anyString(), any(), any(), any(), any()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(
                        new UserSession("session-1", user.getId(), "refresh.token.here", "device-123")));

        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.user.email").value("test@gmail.com"));
    }

    @Test
    void authenticateWithApple_WithMissingIdToken_ShouldReturnBadRequest() throws Exception {
        // Given
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setClientId("apple-client-id");
        // Missing idToken

        // When & Then
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void refreshToken_WithMissingRefreshToken_ShouldReturnBadRequest() throws Exception {
        // Given
        AuthController.TokenRefreshRequest request = new AuthController.TokenRefreshRequest();
        // Missing refreshToken

        // When & Then
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void revokeToken_WithMissingRefreshToken_ShouldReturnBadRequest() throws Exception {
        // Given
        AuthController.TokenRevokeRequest request = new AuthController.TokenRevokeRequest();
        // Missing refreshToken

        // When & Then
        mockMvc.perform(post("/auth/revoke")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void authenticateWithGoogle_WithEmptyRequestBody_ShouldReturnBadRequest() throws Exception {
        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void authenticateWithGoogle_WithInvalidJson_ShouldReturnBadRequest() throws Exception {
        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content("invalid json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void authenticateWithGoogle_WithNullClaims_ShouldHandleGracefully() throws Exception {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("valid.google.id.token");

        when(jwtConfig.validateGoogleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn(null);
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn(null);
        when(mockDecodedJWT.getClaim("picture")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("picture").asString()).thenReturn(null);
        when(mockDecodedJWT.getSubject()).thenReturn("google-user-123");

        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }
    @Test
    void authenticateWithGoogle_WithValidRawNonce_ShouldSucceed() throws Exception {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("valid.google.id.token");
        request.setNonce("raw-nonce-123");

        when(jwtConfig.validateGoogleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@gmail.com");
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn("Test User");
        when(mockDecodedJWT.getClaim("picture")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("picture").asString()).thenReturn("https://example.com/avatar.jpg");
        when(mockDecodedJWT.getClaim("nonce")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("nonce").asString()).thenReturn("raw-nonce-123");
        when(mockDecodedJWT.getSubject()).thenReturn("google-user-123");

        User user = new User();
        user.setId("google-user-123");
        user.setEmail("test@gmail.com");
        user.setName("Test User");
        user.setProvider("google");
        user.setProviderId("google-user-123");
        when(userService.getOrCreateUser(anyString(), anyString(), eq("google"), anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(user));
        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.token.here");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");
        when(sessionService.createSession(anyString(), anyString(), any(), any(), any(), any()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(
                        new UserSession("session-1", user.getId(), "refresh.token.here", "device-123")));

        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void authenticateWithGoogle_WithValidHashedNonce_ShouldSucceed() throws Exception {
        // Given
        String rawNonce = "xyz-987";
        java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
        byte[] hashed = md.digest(rawNonce.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String hashedB64u = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);

        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("valid.google.id.token");
        request.setNonce(rawNonce);

        when(jwtConfig.validateGoogleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@gmail.com");
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn("Test User");
        when(mockDecodedJWT.getClaim("picture")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("picture").asString()).thenReturn("https://example.com/avatar.jpg");
        when(mockDecodedJWT.getClaim("nonce")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("nonce").asString()).thenReturn(hashedB64u);
        when(mockDecodedJWT.getSubject()).thenReturn("google-user-123");

        User user = new User();
        user.setId("google-user-123");
        user.setEmail("test@gmail.com");
        user.setName("Test User");
        user.setProvider("google");
        user.setProviderId("google-user-123");
        when(userService.getOrCreateUser(anyString(), anyString(), eq("google"), anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(user));
        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.token.here");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");
        when(sessionService.createSession(anyString(), anyString(), any(), any(), any(), any()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(
                        new UserSession("session-1", user.getId(), "refresh.token.here", "device-123")));

        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void authenticateWithGoogle_WithNonceProvidedButMissingInToken_ShouldReturnUnauthorized() throws Exception {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("valid.google.id.token");
        request.setNonce("present-but-token-missing");

        when(jwtConfig.validateGoogleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@gmail.com");
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn("Test User");
        when(mockDecodedJWT.getClaim("picture")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("picture").asString()).thenReturn("https://example.com/avatar.jpg");
        when(mockDecodedJWT.getClaim("nonce")).thenReturn(null);
        when(mockDecodedJWT.getSubject()).thenReturn("google-user-123");

        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid or expired token"));
    }

    @Test
    void authenticateWithGoogle_WithNonceMismatch_ShouldReturnUnauthorized() throws Exception {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("valid.google.id.token");
        request.setNonce("nonce-a");

        when(jwtConfig.validateGoogleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@gmail.com");
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn("Test User");
        when(mockDecodedJWT.getClaim("picture")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("picture").asString()).thenReturn("https://example.com/avatar.jpg");
        when(mockDecodedJWT.getClaim("nonce")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("nonce").asString()).thenReturn("different-nonce");
        when(mockDecodedJWT.getSubject()).thenReturn("google-user-123");

        // When & Then
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid or expired token"));
    }

    @Test
    void authenticateWithApple_WithValidRawNonce_ShouldSucceed() throws Exception {
        // Given
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("valid.apple.id.token");
        request.setNonce("apple-nonce-1");

        when(jwtConfig.validateAppleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@icloud.com");
        when(mockDecodedJWT.getClaim("nonce")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("nonce").asString()).thenReturn("apple-nonce-1");
        when(mockDecodedJWT.getSubject()).thenReturn("apple-user-123");

        User user = new User();
        user.setId("apple-user-123");
        user.setEmail("test@icloud.com");
        user.setName("Apple User");
        user.setProvider("apple");
        user.setProviderId("apple-user-123");
        when(userService.getOrCreateUser(anyString(), anyString(), eq("apple"), anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(user));
        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.token.here");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");
        when(sessionService.createSession(anyString(), anyString(), any(), any(), any(), any()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(
                        new UserSession("session-2", user.getId(), "refresh.token.here", "device-456")));

        // When & Then
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void authenticateWithApple_WithNonceMismatch_ShouldReturnUnauthorized() throws Exception {
        // Given
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("valid.apple.id.token");
        request.setNonce("n1");

        when(jwtConfig.validateAppleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@icloud.com");
        when(mockDecodedJWT.getClaim("nonce")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("nonce").asString()).thenReturn("n2");
        when(mockDecodedJWT.getSubject()).thenReturn("apple-user-123");

        // When & Then
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid or expired token"));
    }



    @Test
    void authenticateWithApple_WithValidHashedNonce_ShouldSucceed() throws Exception {
        // Given
        String rawNonce = "apple-hash-raw";
        java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
        byte[] hashed = md.digest(rawNonce.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String hashedB64u = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);

        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("valid.apple.id.token");
        request.setNonce(rawNonce);

        when(jwtConfig.validateAppleIdToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@icloud.com");
        when(mockDecodedJWT.getClaim("nonce")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("nonce").asString()).thenReturn(hashedB64u);
        when(mockDecodedJWT.getSubject()).thenReturn("apple-user-123");

        User user = new User();
        user.setId("apple-user-123");
        user.setEmail("test@icloud.com");
        user.setName("Apple User");
        user.setProvider("apple");
        user.setProviderId("apple-user-123");
        when(userService.getOrCreateUser(anyString(), anyString(), eq("apple"), anyString()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(user));
        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.token.here");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");
        when(sessionService.createSession(anyString(), anyString(), any(), any(), any(), any()))
                .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(
                        new UserSession("session-3", user.getId(), "refresh.token.here", "device-789")));

        // When & Then
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }


    @Test
    void authenticateWithGoogle_TamperedSignature_ShouldReturnUnauthorized() throws Exception {
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("tampered.google.id.token");
        when(jwtConfig.validateGoogleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("Signature verification failed"));
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Google ID token"));
    }

    @Test
    void authenticateWithGoogle_ExpiredIdToken_ShouldReturnUnauthorized() throws Exception {
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("expired.google.id.token");
        when(jwtConfig.validateGoogleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("The Token has expired"));
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Token has expired"));
    }

    @Test
    void authenticateWithGoogle_AudienceMismatch_ShouldReturnUnauthorized() throws Exception {
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("aud.mismatch.google.id.token");
        when(jwtConfig.validateGoogleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("The Claim 'aud' value doesn't match the required audience"));
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Google ID token"));
    }

    @Test
    void authenticateWithApple_TamperedSignature_ShouldReturnUnauthorized() throws Exception {
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("tampered.apple.id.token");
        when(jwtConfig.validateAppleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("Signature verification failed"));
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Apple ID token"));
    }

    @Test
    void authenticateWithApple_ExpiredIdToken_ShouldReturnUnauthorized() throws Exception {
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("expired.apple.id.token");
        when(jwtConfig.validateAppleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("The Token has expired"));
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Token has expired"));
    }

    @Test
    void authenticateWithApple_AudienceMismatch_ShouldReturnUnauthorized() throws Exception {
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("aud.mismatch.apple.id.token");
        when(jwtConfig.validateAppleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("The Claim 'aud' value doesn't match the required audience"));
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Apple ID token"));
    }

    @Test
    void authenticateWithGoogle_KidNotFound_ShouldReturnUnauthorized() throws Exception {
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("kidnotfound.google.id.token");
        when(jwtConfig.validateGoogleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("Public key not found for key ID: test"));
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Google ID token"));
    }

    @Test
    void authenticateWithApple_KidNotFound_ShouldReturnUnauthorized() throws Exception {
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("kidnotfound.apple.id.token");
        when(jwtConfig.validateAppleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("Public key not found for key ID: test"));
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Apple ID token"));
    }

    // Edge-case: malformed JSON and wrong data types
    @Test
    void authenticateWithGoogle_WithIdTokenAsObject_ShouldReturnMalformedJson() throws Exception {
        String body = "{\"idToken\": {\"foo\": \"bar\"}}";
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("GTW-106"));
    }

    @Test
    void authenticateWithGoogle_WithIdTokenAsArray_ShouldReturnMalformedJson() throws Exception {
        String body = "{\"idToken\": [1,2,3]}";
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("GTW-106"));
    }

    @Test
    void authenticateWithApple_WithIdTokenAsArray_ShouldReturnMalformedJson() throws Exception {
        String body = "{\"idToken\": [1,2]}";
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("GTW-106"));
    }

    @Test
    void authenticateWithGoogle_WithTextPlain_ShouldReturnUnsupportedMediaType() throws Exception {
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.TEXT_PLAIN)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content("{\"idToken\": \"abc\"}"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.errorCode").value("GTW-105"));
    }

    @Test
    void refreshToken_WithRefreshTokenAsObject_ShouldReturnMalformedJson() throws Exception {
        String body = "{\"refreshToken\": {\"x\": \"y\"}}";
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("GTW-106"));
    }

    @Test
    void revokeToken_WithRefreshTokenAsArray_ShouldReturnMalformedJson() throws Exception {
        String body = "{\"refreshToken\": [\"a\", \"b\"]}";
        mockMvc.perform(post("/auth/revoke")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("GTW-106"));
    }

    @Test
    void refreshToken_WithInvalidJsonSyntax_ShouldReturnMalformedJson() throws Exception {
        String body = "{\"refreshToken\": \"x"; // missing closing quote/brace
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("GTW-106"));
    }

    @Test
    void revokeToken_WithInvalidJsonSyntax_ShouldReturnMalformedJson() throws Exception {
        String body = "{\"refreshToken\": 123"; // missing closing brace
        mockMvc.perform(post("/auth/revoke")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("GTW-106"));
    }


    // JWKS unhappy-path: algorithm mismatch and unusable key scenarios
    @Test
    void authenticateWithGoogle_AlgMismatch_ShouldReturnUnauthorized() throws Exception {
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("alg.mismatch.google.id.token");
        when(jwtConfig.validateGoogleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("Algorithm mismatch"));
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Google ID token"));
    }

    @Test
    void authenticateWithGoogle_UnusableKey_ShouldReturnUnauthorized() throws Exception {
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("unusable.key.google.id.token");
        when(jwtConfig.validateGoogleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("Unusable public key"));
        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Google ID token"));
    }

    @Test
    void authenticateWithApple_AlgMismatch_ShouldReturnUnauthorized() throws Exception {
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("alg.mismatch.apple.id.token");
        when(jwtConfig.validateAppleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("Algorithm mismatch"));
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Apple ID token"));
    }

    @Test
    void authenticateWithApple_UnusableKey_ShouldReturnUnauthorized() throws Exception {
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("unusable.key.apple.id.token");
        when(jwtConfig.validateAppleIdToken(anyString()))
                .thenThrow(new JWTVerificationException("Unusable public key"));
        mockMvc.perform(post("/auth/apple")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Apple ID token"));
    }

}
