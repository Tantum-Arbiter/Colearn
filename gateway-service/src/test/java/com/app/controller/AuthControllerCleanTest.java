package com.app.controller;

import com.app.config.JwtConfig;
import com.app.service.SecurityMonitoringService;
import com.app.service.ApplicationMetricsService;
import com.app.service.UserService;
import com.app.service.SessionService;
import com.app.model.User;
import com.app.model.UserSession;
import com.auth0.jwt.interfaces.DecodedJWT;
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

import java.time.Instant;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

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
    private ApplicationMetricsService applicationMetricsService;

    @Mock
    private UserService userService;

    @Mock
    private SessionService sessionService;

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

        // Use lenient mocking to avoid unnecessary stubbing exceptions
        lenient().doNothing().when(applicationMetricsService).recordAuthentication(anyString(), anyString(), anyString(), anyString(), anyBoolean(), anyLong());
    }

    @Test
    void authenticateWithGoogle_WithValidToken_ShouldReturnSuccess() {
        // Given
        AuthController.GoogleAuthRequest request = createValidGoogleRequest();
        setupValidGoogleTokenMocks();
        setupUserAndSessionMocks();

        // When
        ResponseEntity<?> response = authController.authenticateWithGoogle(request, mockRequest);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        // Verify security monitoring was called
        verify(securityMonitoringService).logSuccessfulAuthentication(
            anyString(), eq("google"));
    }

    @Test
    void authenticateWithGoogle_WithInvalidToken_ShouldReturnUnauthorized() {
        // Given
        AuthController.GoogleAuthRequest request = createValidGoogleRequest();
        when(jwtConfig.validateGoogleIdToken(anyString()))
            .thenThrow(new JWTVerificationException("Invalid token"));

        // When / Then
        com.app.exception.AuthenticationException ex = assertThrows(
                com.app.exception.AuthenticationException.class,
                () -> authController.authenticateWithGoogle(request, mockRequest)
        );
        assertEquals("GTW-003", ex.getErrorCode().getCode());

        // Verify failed authentication was logged
        verify(securityMonitoringService).logFailedAuthentication(
            eq("google"));
    }

    @Test
    void authenticateWithGoogle_WithMissingIdToken_ShouldReturnBadRequest() {
        // Given
        AuthController.GoogleAuthRequest request = new AuthController.GoogleAuthRequest();
        request.setClientId("google-client-id");
        // idToken is null

        // When / Then
        com.app.exception.ValidationException ex = assertThrows(
                com.app.exception.ValidationException.class,
                () -> authController.authenticateWithGoogle(request, mockRequest)
        );
        assertEquals("GTW-101", ex.getErrorCode().getCode());
    }

    @Test
    void authenticateWithApple_WithValidToken_ShouldReturnSuccess() {
        // Given
        AuthController.AppleAuthRequest request = createValidAppleRequest();
        setupValidAppleTokenMocks();
        setupUserAndSessionMocks();

        // When
        ResponseEntity<?> response = authController.authenticateWithApple(request, mockRequest);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        // Verify security monitoring was called
        verify(securityMonitoringService).logSuccessfulAuthentication(
            anyString(), eq("apple"));
    }

    @Test
    void authenticateWithApple_WithInvalidToken_ShouldReturnUnauthorized() {
        // Given
        AuthController.AppleAuthRequest request = createValidAppleRequest();
        when(jwtConfig.validateAppleIdToken(anyString()))
            .thenThrow(new JWTVerificationException("Invalid token"));

        // When / Then
        com.app.exception.AuthenticationException ex = assertThrows(
                com.app.exception.AuthenticationException.class,
                () -> authController.authenticateWithApple(request, mockRequest)
        );
        assertEquals("GTW-004", ex.getErrorCode().getCode());

        // Verify failed authentication was logged
        verify(securityMonitoringService).logFailedAuthentication(
            eq("apple"));
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
        return request;
    }

    private void setupUserAndSessionMocks() {
        // Create test user (PII-free)
        User testUser = new User();
        testUser.setId("test-user-id");
        testUser.setProvider("google");
        testUser.setProviderId("google-123");
        testUser.setCreatedAt(Instant.now());
        testUser.setUpdatedAt(Instant.now());
        testUser.setActive(true);
        testUser.setLastLoginAt(Instant.now());

        // Create test session
        UserSession testSession = new UserSession();
        testSession.setId("test-session-id");
        testSession.setUserId("test-user-id");
        testSession.setRefreshToken("refresh-token-123");
        testSession.setDeviceId("device-123");
        testSession.setDeviceType("mobile");
        testSession.setPlatform("ios");
        testSession.setAppVersion("1.0.0");
        testSession.setCreatedAt(Instant.now());
        testSession.setLastAccessedAt(Instant.now());
        testSession.setExpiresAt(Instant.now().plusSeconds(7 * 24 * 60 * 60));
        testSession.setActive(true);

        // Mock UserService (PII-free - 2 args)
        lenient().when(userService.getOrCreateUser(any(), any()))
            .thenReturn(CompletableFuture.completedFuture(testUser));

        // Mock SessionService with any arguments (including nulls)
        lenient().when(sessionService.createSession(any(), any(), any(), any(), any(), any()))
            .thenReturn(CompletableFuture.completedFuture(testSession));
    }

    private void setupValidGoogleTokenMocks() {
        lenient().when(jwtConfig.validateGoogleIdToken(anyString())).thenReturn(mockDecodedJWT);
        lenient().when(mockDecodedJWT.getSubject()).thenReturn("google-user-123");

        // Mock JWT generation (PII-free - 2 args)
        lenient().when(jwtConfig.generateAccessToken(anyString(), anyString())).thenReturn("access.token.here");
        lenient().when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");
    }

    private void setupValidAppleTokenMocks() {
        lenient().when(jwtConfig.validateAppleIdToken(anyString())).thenReturn(mockDecodedJWT);
        lenient().when(mockDecodedJWT.getSubject()).thenReturn("apple-user-123");

        // Mock JWT generation (PII-free - 2 args)
        lenient().when(jwtConfig.generateAccessToken(anyString(), anyString())).thenReturn("access.token.here");
        lenient().when(jwtConfig.generateRefreshToken(anyString())).thenReturn("refresh.token.here");
    }
}
