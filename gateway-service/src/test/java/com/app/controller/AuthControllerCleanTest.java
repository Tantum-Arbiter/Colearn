package com.app.controller;

import com.app.config.JwtConfig;
import com.app.service.SecurityMonitoringService;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.Claim;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Clean TDD-based tests for AuthController with proper separation of concerns.
 * Each test is completely isolated and follows TDD principles.
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerCleanTest {

    @Mock
    private JwtConfig jwtConfig;

    @Mock
    private SecurityMonitoringService securityMonitoringService;

    @Mock
    private DecodedJWT mockDecodedJWT;

    @InjectMocks
    private AuthController authController;

    private ObjectMapper objectMapper;
    private MockHttpServletRequest mockRequest;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockRequest = new MockHttpServletRequest();
        mockRequest.setRemoteAddr("127.0.0.1");
        mockRequest.addHeader("User-Agent", "GrowWithFreya-Test/1.0");
    }

    @Test
    void authenticateWithGoogle_WithValidToken_ShouldReturnSuccess() {
        // Given
        AuthController.GoogleAuthRequest request = createValidGoogleRequest();
        setupValidGoogleTokenMocks();

        // When
        ResponseEntity<?> response = authController.authenticateWithGoogle(request, mockRequest);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        // Verify security monitoring was called
        verify(securityMonitoringService).logSuccessfulAuthentication(
            anyString(), eq("google"), eq("127.0.0.1"), eq("GrowWithFreya-Test/1.0"));
    }

    @Test
    void authenticateWithGoogle_WithInvalidToken_ShouldReturnUnauthorized() {
        // Given
        AuthController.GoogleAuthRequest request = createValidGoogleRequest();
        when(jwtConfig.validateGoogleIdToken(anyString(), anyString()))
            .thenThrow(new JWTVerificationException("Invalid token"));

        // When
        ResponseEntity<?> response = authController.authenticateWithGoogle(request, mockRequest);

        // Then
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        
        // Verify failed authentication was logged
        verify(securityMonitoringService).logFailedAuthentication(
            eq("google"), eq("127.0.0.1"), eq("GrowWithFreya-Test/1.0"));
    }

    @Test
    void authenticateWithGoogle_WithMissingIdToken_ShouldReturnBadRequest() {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setClientId("google-client-id");
        // idToken is null

        // When
        ResponseEntity<?> response = authController.authenticateWithGoogle(request, mockRequest);

        // Then
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void authenticateWithGoogle_WithNullEmailClaim_ShouldReturnBadRequest() {
        // Given
        AuthController.GoogleAuthRequest request = createValidGoogleRequest();
        when(jwtConfig.validateGoogleIdToken(anyString(), anyString())).thenReturn(mockDecodedJWT);

        // Mock email claim to return null
        com.auth0.jwt.interfaces.Claim emailClaim = mock(com.auth0.jwt.interfaces.Claim.class);
        when(emailClaim.asString()).thenReturn(null);
        when(mockDecodedJWT.getClaim("email")).thenReturn(emailClaim);

        // When
        ResponseEntity<?> response = authController.authenticateWithGoogle(request, mockRequest);

        // Then
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void authenticateWithApple_WithValidToken_ShouldReturnSuccess() {
        // Given
        AuthController.AppleAuthRequest request = createValidAppleRequest();
        setupValidAppleTokenMocks();

        // When
        ResponseEntity<?> response = authController.authenticateWithApple(request, mockRequest);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        // Verify security monitoring was called
        verify(securityMonitoringService).logSuccessfulAuthentication(
            anyString(), eq("apple"), eq("127.0.0.1"), eq("GrowWithFreya-Test/1.0"));
    }

    @Test
    void authenticateWithApple_WithInvalidToken_ShouldReturnUnauthorized() {
        // Given
        AuthController.AppleAuthRequest request = createValidAppleRequest();
        when(jwtConfig.validateAppleIdToken(anyString(), anyString()))
            .thenThrow(new JWTVerificationException("Invalid token"));

        // When
        ResponseEntity<?> response = authController.authenticateWithApple(request, mockRequest);

        // Then
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        
        // Verify failed authentication was logged
        verify(securityMonitoringService).logFailedAuthentication(
            eq("apple"), eq("127.0.0.1"), eq("GrowWithFreya-Test/1.0"));
    }

    // Helper methods for creating test data
    private AuthController.GoogleAuthRequest createValidGoogleRequest() {
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setIdToken("valid.google.id.token");
        request.setClientId("google-client-id");
        return request;
    }

    private AuthController.AppleAuthRequest createValidAppleRequest() {
        AuthController.AppleAuthRequest request = new AuthController.AppleAuthRequest();
        request.setIdToken("valid.apple.id.token");
        request.setClientId("apple-client-id");
        
        AuthController.UserInfo userInfo = new AuthController.UserInfo();
        userInfo.setName("Apple User");
        request.setUserInfo(userInfo);
        
        return request;
    }

    private void setupValidGoogleTokenMocks() {
        when(jwtConfig.validateGoogleIdToken(anyString(), anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@gmail.com");
        when(mockDecodedJWT.getClaim("name")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("name").asString()).thenReturn("Test User");
        when(mockDecodedJWT.getClaim("picture")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("picture").asString()).thenReturn("https://example.com/avatar.jpg");
        when(mockDecodedJWT.getSubject()).thenReturn("google-user-123");

        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.token.here");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");
    }

    private void setupValidAppleTokenMocks() {
        when(jwtConfig.validateAppleIdToken(anyString(), anyString())).thenReturn(mockDecodedJWT);
        when(mockDecodedJWT.getClaim("email")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(mockDecodedJWT.getClaim("email").asString()).thenReturn("test@icloud.com");
        when(mockDecodedJWT.getSubject()).thenReturn("apple-user-123");

        when(jwtConfig.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.token.here");
        when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");
    }
}
