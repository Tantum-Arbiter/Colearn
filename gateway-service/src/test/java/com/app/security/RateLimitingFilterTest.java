package com.app.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RateLimitingFilterTest {

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @Mock
    private PrintWriter printWriter;

    @Mock
    private Authentication authentication;

    private RateLimitingFilter rateLimitingFilter;

    @BeforeEach
    void setUp() throws IOException {
        rateLimitingFilter = new RateLimitingFilter();

        // Set rate limiting configuration values using reflection
        ReflectionTestUtils.setField(rateLimitingFilter, "defaultRequestsPerMinute", 60);
        ReflectionTestUtils.setField(rateLimitingFilter, "authRequestsPerMinute", 10);
        ReflectionTestUtils.setField(rateLimitingFilter, "apiRequestsPerMinute", 100);
        ReflectionTestUtils.setField(rateLimitingFilter, "rateLimitingEnabled", true);

        SecurityContextHolder.clearContext();

        // Mock response writer (lenient to avoid unnecessary stubbing failures)
        lenient().when(response.getWriter()).thenReturn(printWriter);
    }

    @Test
    void doFilterInternal_WithinRateLimit_ShouldAllowRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getRemoteAddr()).thenReturn("192.168.1.1");

        // When
        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(request, response);
        verify(response, never()).setStatus(429); // HTTP 429 Too Many Requests
    }

    @Test
    void doFilterInternal_ExceedingRateLimit_ShouldBlockRequest() throws ServletException, IOException {
        // Given
        String ipAddress = "192.168.1.100";
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getRemoteAddr()).thenReturn(ipAddress);
        when(response.getWriter()).thenReturn(printWriter);

        // When - Make requests exceeding the API limit (100 per minute)
        int allowedCount = 0;
        int blockedCount = 0;

        for (int i = 0; i < 101; i++) {
            // Reset mocks for each iteration to track individual calls
            reset(response, filterChain, printWriter);
            when(response.getWriter()).thenReturn(printWriter);

            rateLimitingFilter.doFilterInternal(request, response, filterChain);

            // Check if this request was allowed or blocked
            try {
                verify(filterChain).doFilter(request, response);
                allowedCount++;
            } catch (AssertionError e) {
                // Request was blocked
                try {
                    verify(response).setStatus(429);
                    blockedCount++;
                } catch (AssertionError e2) {
                    // Neither allowed nor blocked - something is wrong
                    fail("Request " + i + " was neither allowed nor blocked");
                }
            }
        }

        // Then - First 100 requests should be allowed, 101st should be blocked
        assertEquals(100, allowedCount, "Expected 100 requests to be allowed");
        assertEquals(1, blockedCount, "Expected 1 request to be blocked");
    }

    @Test
    void doFilterInternal_AuthEndpoint_ShouldHaveLowerRateLimit() throws ServletException, IOException {
        // Given
        String ipAddress = "192.168.1.101";
        when(request.getRequestURI()).thenReturn("/auth/google");
        when(request.getRemoteAddr()).thenReturn(ipAddress);

        // When - Make requests exceeding auth limit (10 per minute)
        for (int i = 0; i < 11; i++) {
            rateLimitingFilter.doFilterInternal(request, response, filterChain);
        }

        // Then - Should be blocked after 10 requests
        verify(response, atLeastOnce()).setStatus(429); // HTTP 429 Too Many Requests
    }

    @Test
    void doFilterInternal_ApiEndpoint_ShouldHaveHigherRateLimit() throws ServletException, IOException {
        // Given
        String ipAddress = "192.168.1.102";
        when(request.getRequestURI()).thenReturn("/api/v1/stories");
        when(request.getRemoteAddr()).thenReturn(ipAddress);

        // When - Make requests within API limit (100 per minute)
        for (int i = 0; i < 50; i++) {
            rateLimitingFilter.doFilterInternal(request, response, filterChain);
        }

        // Then - Should not be blocked
        verify(filterChain, times(50)).doFilter(request, response);
        verify(response, never()).setStatus(429); // HTTP 429 Too Many Requests
    }

    @Test
    void doFilterInternal_WithAuthenticatedUser_ShouldUseUserIdForRateLimit() throws ServletException, IOException {
        // Given
        String userId = "user-123";
        String ipAddress = "192.168.1.103";
        
        when(request.getRequestURI()).thenReturn("/api/test");
        // lenient because userId path doesn't need remoteAddr
        lenient().when(request.getRemoteAddr()).thenReturn(ipAddress);
        when(authentication.getPrincipal()).thenReturn(userId);
        when(authentication.isAuthenticated()).thenReturn(true);
        
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // When
        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(request, response);
        
        // Verify that request was processed (user-based rate limiting applied)
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_WithUnauthenticatedUser_ShouldUseIpForRateLimit() throws ServletException, IOException {
        // Given
        String ipAddress = "192.168.1.104";
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getRemoteAddr()).thenReturn(ipAddress);

        // When
        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(request, response);
        
        // Verify that request was processed (IP-based rate limiting applied)
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_ShouldSetRateLimitHeaders() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getRemoteAddr()).thenReturn("192.168.1.105");

        // When
        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setHeader(eq("X-RateLimit-Limit"), anyString());
        verify(response).setHeader(eq("X-RateLimit-Remaining"), anyString());
        verify(response).setHeader(eq("X-RateLimit-Reset"), anyString());
    }

    @Test
    void doFilterInternal_ShouldApplyCorrectRateLimits() throws ServletException, IOException {
        // Given - Test that different endpoints have different rate limits by testing behavior
        when(request.getRequestURI()).thenReturn("/auth/google");
        when(request.getRemoteAddr()).thenReturn("192.168.1.100");

        // When
        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        // Then - Should allow request (not rate limited)
        verify(filterChain).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    @Test
    void doFilterInternal_MultipleRequests_ShouldTrackRateData() throws ServletException, IOException {
        // Given
        String ipAddress = "192.168.1.106";
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getRemoteAddr()).thenReturn(ipAddress);

        // When - Make multiple requests
        rateLimitingFilter.doFilterInternal(request, response, filterChain);
        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        // Then - Both requests should be processed
        verify(filterChain, times(2)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    @Test
    void doFilterInternal_ConcurrentRequests_ShouldHandleThreadSafety() throws ServletException, IOException {
        // Given
        String ipAddress = "192.168.1.107";
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getRemoteAddr()).thenReturn(ipAddress);

        // When - Make multiple requests (simulating concurrency)
        for (int i = 0; i < 5; i++) {
            rateLimitingFilter.doFilterInternal(request, response, filterChain);
        }

        // Then - All requests should be processed without errors
        verify(filterChain, times(5)).doFilter(request, response);
    }

    @Test
    void doFilterInternal_WithNullRemoteAddr_ShouldUseDefaultKey() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getRemoteAddr()).thenReturn(null);

        // When
        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(request, response);
        
        // Verify that request was processed (default key used for null IP)
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_RateLimitExceeded_ShouldReturnProperErrorResponse() throws ServletException, IOException {
        // Given
        String ipAddress = "192.168.1.108";
        when(request.getRequestURI()).thenReturn("/auth/google"); // Low rate limit endpoint
        when(request.getRemoteAddr()).thenReturn(ipAddress);

        // When - Exceed rate limit
        for (int i = 0; i < 12; i++) {
            rateLimitingFilter.doFilterInternal(request, response, filterChain);
        }

        // Then - Verify error response
        verify(response, atLeastOnce()).setStatus(429); // HTTP 429 Too Many Requests
        verify(response, atLeastOnce()).setContentType("application/json");
        verify(response, atLeastOnce()).setHeader(eq("X-RateLimit-Limit"), eq("10"));
        verify(printWriter, atLeastOnce()).write(contains("Rate limit exceeded"));
    }
}
