package com.app.security;

import com.app.config.JwtConfig;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.exceptions.TokenExpiredException;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Comprehensive unit tests for JWT token tampering detection and validation
 */
@ExtendWith(MockitoExtension.class)
class TokenTamperingTest {

    @Mock
    private JwtConfig jwtConfig;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @Mock
    private DecodedJWT decodedJWT;

    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() {
        jwtAuthenticationFilter = new JwtAuthenticationFilter(jwtConfig);
        SecurityContextHolder.clearContext();
    }

    @Test
    void tokenTampering_WithModifiedSignature_ShouldRejectToken() throws Exception {
        // Given - A token with tampered signature
        String tamperedToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9." +
                "eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicHJvdmlkZXIiOiJnb29nbGUifQ." +
                "TAMPERED_SIGNATURE_INVALID";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + tamperedToken);
        when(jwtConfig.validateAccessToken(tamperedToken))
                .thenThrow(new JWTVerificationException("Invalid signature"));

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should not set authentication and continue filter chain
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
        verify(jwtConfig).validateAccessToken(tamperedToken);
    }

    @Test
    void tokenTampering_WithModifiedPayload_ShouldRejectToken() throws Exception {
        // Given - A token with tampered payload (modified user ID)
        String originalPayload = "{\"sub\":\"user123\",\"email\":\"test@example.com\",\"provider\":\"google\"}";
        String tamperedPayload = "{\"sub\":\"admin\",\"email\":\"test@example.com\",\"provider\":\"google\"}";
        
        String tamperedToken = createTamperedToken(tamperedPayload);

        when(request.getHeader("Authorization")).thenReturn("Bearer " + tamperedToken);
        when(jwtConfig.validateAccessToken(tamperedToken))
                .thenThrow(new JWTVerificationException("Invalid signature"));

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should reject the token
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void tokenTampering_WithModifiedHeader_ShouldRejectToken() throws Exception {
        // Given - A token with tampered header (changed algorithm)
        String tamperedHeader = "{\"alg\":\"none\",\"typ\":\"JWT\"}";
        String validPayload = "{\"sub\":\"user123\",\"email\":\"test@example.com\",\"provider\":\"google\"}";
        
        String tamperedToken = createTamperedTokenWithHeader(tamperedHeader, validPayload);

        when(request.getHeader("Authorization")).thenReturn("Bearer " + tamperedToken);
        when(jwtConfig.validateAccessToken(tamperedToken))
                .thenThrow(new JWTVerificationException("Invalid token format"));

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should reject the token
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void tokenTampering_WithExpiredToken_ShouldRejectToken() throws Exception {
        // Given - An expired token
        String expiredToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9." +
                "eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicHJvdmlkZXIiOiJnb29nbGUiLCJleHAiOjE2MzAwMDAwMDB9." +
                "VALID_SIGNATURE_BUT_EXPIRED";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + expiredToken);
        when(jwtConfig.validateAccessToken(expiredToken))
                .thenThrow(new TokenExpiredException("Token has expired", null));

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should reject the expired token
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void tokenTampering_WithMalformedToken_ShouldRejectToken() throws Exception {
        // Given - A malformed token (not proper JWT format)
        String malformedToken = "not.a.valid.jwt.token.format";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + malformedToken);
        when(jwtConfig.validateAccessToken(malformedToken))
                .thenThrow(new JWTVerificationException("Invalid token format"));

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should reject the malformed token
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void tokenTampering_WithNullClaims_ShouldRejectToken() throws Exception {
        // Given - A token that validates but has null claims
        String tokenWithNullClaims = "valid.jwt.token";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + tokenWithNullClaims);
        when(jwtConfig.validateAccessToken(tokenWithNullClaims)).thenReturn(decodedJWT);
        when(decodedJWT.getSubject()).thenReturn(null); // Null subject
        when(decodedJWT.getClaim("email")).thenReturn(null);

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should not set authentication due to null claims
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void tokenTampering_WithEmptyClaims_ShouldRejectToken() throws Exception {
        // Given - A token with empty claims (PII-free - no email)
        String tokenWithEmptyClaims = "valid.jwt.token";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + tokenWithEmptyClaims);
        when(jwtConfig.validateAccessToken(tokenWithEmptyClaims)).thenReturn(decodedJWT);
        when(decodedJWT.getSubject()).thenReturn(""); // Empty subject

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should not set authentication due to empty claims
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void tokenTampering_WithInvalidAlgorithm_ShouldRejectToken() throws Exception {
        // Given - A token claiming to use 'none' algorithm (security vulnerability)
        String noneAlgorithmToken = createTokenWithNoneAlgorithm();

        when(request.getHeader("Authorization")).thenReturn("Bearer " + noneAlgorithmToken);
        when(jwtConfig.validateAccessToken(noneAlgorithmToken))
                .thenThrow(new JWTVerificationException("Algorithm 'none' not allowed"));

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should reject the token with 'none' algorithm
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void tokenTampering_WithReplayAttack_ShouldHandleGracefully() throws Exception {
        // Given - Same valid token used multiple times (replay attack simulation) (PII-free - no email)
        String replayToken = "valid.jwt.token";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + replayToken);
        when(jwtConfig.validateAccessToken(replayToken)).thenReturn(decodedJWT);
        when(decodedJWT.getSubject()).thenReturn("user123");
        when(decodedJWT.getClaim("provider")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(decodedJWT.getClaim("provider").asString()).thenReturn("google");

        // When - Process the same token multiple times
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);
        SecurityContextHolder.clearContext(); // Clear for second attempt
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should handle replay gracefully (token validation called twice)
        verify(jwtConfig, times(2)).validateAccessToken(replayToken);
        verify(filterChain, times(2)).doFilter(request, response);
    }

    @Test
    void tokenTampering_WithSQLInjectionInClaims_ShouldHandleSafely() throws Exception {
        // Given - A token with SQL injection attempt in claims (PII-free - no email)
        String sqlInjectionToken = "valid.jwt.token";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + sqlInjectionToken);
        when(jwtConfig.validateAccessToken(sqlInjectionToken)).thenReturn(decodedJWT);
        when(decodedJWT.getSubject()).thenReturn("'; DROP TABLE users; --");
        when(decodedJWT.getClaim("provider")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(decodedJWT.getClaim("provider").asString()).thenReturn("google");

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should handle malicious claims safely (authentication should still be set if token is valid)
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("'; DROP TABLE users; --", SecurityContextHolder.getContext().getAuthentication().getName());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void tokenTampering_WithXSSInClaims_ShouldHandleSafely() throws Exception {
        // Given - A token with XSS attempt in provider claim (PII-free - no email)
        String xssToken = "valid.jwt.token";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + xssToken);
        when(jwtConfig.validateAccessToken(xssToken)).thenReturn(decodedJWT);
        when(decodedJWT.getSubject()).thenReturn("user123");
        when(decodedJWT.getClaim("provider")).thenReturn(mock(com.auth0.jwt.interfaces.Claim.class));
        when(decodedJWT.getClaim("provider").asString()).thenReturn("<script>alert('xss')</script>");

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then - Should handle XSS claims safely
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    // Helper methods for creating tampered tokens
    private String createTamperedToken(String payload) {
        String header = "{\"alg\":\"RS256\",\"typ\":\"JWT\"}";
        String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(header.getBytes());
        String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes());
        return encodedHeader + "." + encodedPayload + ".TAMPERED_SIGNATURE";
    }

    private String createTamperedTokenWithHeader(String header, String payload) {
        String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(header.getBytes());
        String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes());
        return encodedHeader + "." + encodedPayload + ".TAMPERED_SIGNATURE";
    }

    private String createTokenWithNoneAlgorithm() {
        String header = "{\"alg\":\"none\",\"typ\":\"JWT\"}";
        String payload = "{\"sub\":\"user123\",\"email\":\"test@example.com\",\"provider\":\"google\"}";
        String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(header.getBytes());
        String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes());
        return encodedHeader + "." + encodedPayload + ".";
    }
}
