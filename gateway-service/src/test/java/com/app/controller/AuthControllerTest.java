package com.app.controller;

import com.app.config.JwtConfig;
import com.app.service.GatewayServiceApplication;
import com.app.service.SecurityMonitoringService;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@ContextConfiguration(classes = GatewayServiceApplication.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtConfig jwtConfig;

    @MockBean
    private SecurityMonitoringService securityMonitoringService;

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
        request.setClientId("google-client-id");

        when(jwtConfig.validateGoogleIdToken(anyString(), anyString())).thenReturn(mockDecodedJWT);
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
            anyString(), eq("google"), eq("127.0.0.1"), eq("GrowWithFreya-Test/1.0"));
    }

    @Test
    void authenticateWithGoogle_WithInvalidIdToken_ShouldReturnErrorResponse() throws Exception {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("invalid.google.id.token");
        request.setClientId("google-client-id");

        when(jwtConfig.validateGoogleIdToken(anyString(), anyString()))
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
            eq("google"), eq("127.0.0.1"), eq("GrowWithFreya-Test/1.0"));
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

        when(jwtConfig.validateAppleIdToken(anyString(), anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@icloud.com");
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn("Apple User");
        when(mockDecodedJWT.getSubject()).thenReturn("apple-user-123");

        // Mock JWT validation instead of generateUserId (method doesn't exist)
        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.token.here");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");

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
            anyString(), eq("apple"), eq("127.0.0.1"), eq("GrowWithFreya-Test/1.0"));
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

        // When & Then
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.tokens.accessToken").value("new.access.token"))
                .andExpect(jsonPath("$.tokens.refreshToken").value("new.refresh.token"));

        verify(securityMonitoringService).logTokenRefresh(eq("user-123"), anyString());
    }

    @Test
    void refreshToken_WithInvalidRefreshToken_ShouldReturnErrorResponse() throws Exception {
        // Given
        AuthController.TokenRefreshRequest request = new AuthController.TokenRefreshRequest();
        request.setRefreshToken("invalid.refresh.token");

        when(jwtConfig.validateAccessToken(anyString()))
            .thenThrow(new RuntimeException("Invalid refresh token"));

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

        when(jwtConfig.validateAccessToken(anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getSubject()).thenReturn("user-123");

        // When & Then
        mockMvc.perform(post("/auth/revoke")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "GrowWithFreya-Test/1.0")
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Token revoked successfully"));

        verify(securityMonitoringService).logTokenRevocation(eq("user-123"), anyString(), eq("user_requested"));
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
    void authenticateWithGoogle_WithMissingClientId_ShouldReturnBadRequest() throws Exception {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("valid.google.id.token");
        // Missing clientId

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
        request.setClientId("google-client-id");

        when(jwtConfig.validateGoogleIdToken(anyString(), anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn(null);
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn(null);
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
}
