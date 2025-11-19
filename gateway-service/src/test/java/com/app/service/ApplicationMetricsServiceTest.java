package com.app.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationMetricsServiceTest {

    @Mock
    private HttpServletRequest mockRequest;

    private MeterRegistry meterRegistry;
    private ApplicationMetricsService metricsService;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        metricsService = new ApplicationMetricsService(meterRegistry);
    }

    @Test
    void testRecordRequest_WithMobileDevice() {
        // Given
        when(mockRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)");
        when(mockRequest.getHeader("X-Platform")).thenReturn("ios");
        when(mockRequest.getHeader("X-App-Version")).thenReturn("1.2.3");
        when(mockRequest.getRequestURI()).thenReturn("/api/content");
        when(mockRequest.getMethod()).thenReturn("GET");

        // When
        metricsService.recordRequest(mockRequest, 200, 150);

        // Then
        Counter requestCounter = meterRegistry.find("app.requests.total").counter();
        assertNotNull(requestCounter);
        assertEquals(1.0, requestCounter.count());

        Timer responseTimer = meterRegistry.find("app.response.time").timer();
        assertNotNull(responseTimer);
        assertEquals(1, responseTimer.count());
        assertTrue(responseTimer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) >= 150);
    }

    @Test
    void testRecordRequest_WithTabletDevice() {
        // Given
        when(mockRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)");
        when(mockRequest.getHeader("X-Platform")).thenReturn("ios");
        when(mockRequest.getHeader("X-App-Version")).thenReturn("1.2.3");
        when(mockRequest.getRequestURI()).thenReturn("/api/stories");
        when(mockRequest.getMethod()).thenReturn("POST");

        // When
        metricsService.recordRequest(mockRequest, 201, 250);

        // Then
        Map<String, Object> summary = metricsService.getMetricsSummary();
        @SuppressWarnings("unchecked")
        Map<String, Long> deviceTypes = (Map<String, Long>) summary.get("device_types");
        assertEquals(1L, deviceTypes.get("tablet"));
    }

    @Test
    void testRecordRequest_WithDesktopDevice() {
        // Given
        when(mockRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        when(mockRequest.getHeader("X-Platform")).thenReturn("windows");
        when(mockRequest.getHeader("X-App-Version")).thenReturn("2.0.0");
        when(mockRequest.getRequestURI()).thenReturn("/api/user/profile");
        when(mockRequest.getMethod()).thenReturn("PUT");

        // When
        metricsService.recordRequest(mockRequest, 200, 100);

        // Then
        Map<String, Object> summary = metricsService.getMetricsSummary();
        @SuppressWarnings("unchecked")
        Map<String, Long> deviceTypes = (Map<String, Long>) summary.get("device_types");
        @SuppressWarnings("unchecked")
        Map<String, Long> platforms = (Map<String, Long>) summary.get("platforms");
        @SuppressWarnings("unchecked")
        Map<String, Long> appVersions = (Map<String, Long>) summary.get("app_versions");
        
        assertEquals(1L, deviceTypes.get("desktop"));
        assertEquals(1L, platforms.get("windows"));
        assertEquals(1L, appVersions.get("2.0.0"));
    }

    @Test
    void testRecordRequest_WithBotUserAgent() {
        // Given
        when(mockRequest.getHeader("User-Agent")).thenReturn("Googlebot/2.1 (+http://www.google.com/bot.html)");
        when(mockRequest.getHeader("X-Platform")).thenReturn(null);
        when(mockRequest.getHeader("X-App-Version")).thenReturn(null);
        when(mockRequest.getRequestURI()).thenReturn("/api/public/health");
        when(mockRequest.getMethod()).thenReturn("GET");

        // When
        metricsService.recordRequest(mockRequest, 200, 50);

        // Then
        Map<String, Object> summary = metricsService.getMetricsSummary();
        @SuppressWarnings("unchecked")
        Map<String, Long> deviceTypes = (Map<String, Long>) summary.get("device_types");
        assertEquals(1L, deviceTypes.get("bot"));
    }

    @Test
    void testRecordAuthentication_Successful() {
        // When
        metricsService.recordAuthentication("google", "mobile", "ios", "1.2.3", true, 500);

        // Then
        Counter authCounter = meterRegistry.find("app.authentication.total").counter();
        assertNotNull(authCounter);
        assertEquals(1.0, authCounter.count());

        Timer authTimer = meterRegistry.find("app.authentication.time").timer();
        assertNotNull(authTimer);
        assertEquals(1, authTimer.count());

        // Check that active sessions was incremented
        Map<String, Object> summary = metricsService.getMetricsSummary();
        assertEquals(1L, summary.get("active_sessions"));
    }

    @Test
    void testRecordAuthentication_Failed() {
        // When
        metricsService.recordAuthentication("apple", "tablet", "ios", "1.0.0", false, 300);

        // Then
        Counter authCounter = meterRegistry.find("app.authentication.total").counter();
        assertNotNull(authCounter);
        assertEquals(1.0, authCounter.count());

        // Check that active sessions was NOT incremented
        Map<String, Object> summary = metricsService.getMetricsSummary();
        assertEquals(0L, summary.get("active_sessions"));
    }

    @Test
    void testRecordError() {
        // When
        when(mockRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (Android 11; Mobile)");
        when(mockRequest.getHeader("X-Platform")).thenReturn("android");
        when(mockRequest.getRequestURI()).thenReturn("/api/content");
        
        metricsService.recordError(mockRequest, "ValidationException", "INVALID_INPUT");

        // Then
        Counter errorCounter = meterRegistry.find("app.errors.total").counter();
        assertNotNull(errorCounter);
        assertEquals(1.0, errorCounter.count());
    }

    @Test
    void testRecordRateLimitViolation() {
        // When
        when(mockRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)");
        when(mockRequest.getHeader("X-Platform")).thenReturn("ios");
        when(mockRequest.getRequestURI()).thenReturn("/auth/google");
        
        metricsService.recordRateLimitViolation(mockRequest, "AUTH_RATE_LIMIT");

        // Then
        Counter rateLimitCounter = meterRegistry.find("app.rate_limit.violations").counter();
        assertNotNull(rateLimitCounter);
        assertEquals(1.0, rateLimitCounter.count());
    }

    @Test
    void testSessionManagement() {
        // Initially should be 0
        Map<String, Object> summary = metricsService.getMetricsSummary();
        assertEquals(0L, summary.get("active_sessions"));

        // Increment sessions
        metricsService.incrementActiveSessions();
        metricsService.incrementActiveSessions();
        
        summary = metricsService.getMetricsSummary();
        assertEquals(2L, summary.get("active_sessions"));

        // Decrement sessions
        metricsService.decrementActiveSessions();
        
        summary = metricsService.getMetricsSummary();
        assertEquals(1L, summary.get("active_sessions"));
    }

    @Test
    void testConnectionManagement() {
        // Initially should be 0
        Map<String, Object> summary = metricsService.getMetricsSummary();
        assertEquals(0L, summary.get("active_connections"));

        // Increment connections
        metricsService.incrementActiveConnections();
        metricsService.incrementActiveConnections();
        metricsService.incrementActiveConnections();
        
        summary = metricsService.getMetricsSummary();
        assertEquals(3L, summary.get("active_connections"));

        // Decrement connections
        metricsService.decrementActiveConnections();
        metricsService.decrementActiveConnections();
        
        summary = metricsService.getMetricsSummary();
        assertEquals(1L, summary.get("active_connections"));
    }

    @Test
    void testSanitizeEndpoint() {
        // Given
        when(mockRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (iPhone)");
        when(mockRequest.getHeader("X-Platform")).thenReturn("ios");
        when(mockRequest.getHeader("X-App-Version")).thenReturn("1.0.0");
        when(mockRequest.getMethod()).thenReturn("GET");

        // Test UUID replacement
        when(mockRequest.getRequestURI()).thenReturn("/api/user/123e4567-e89b-12d3-a456-426614174000/profile");
        metricsService.recordRequest(mockRequest, 200, 100);

        // Test numeric ID replacement
        when(mockRequest.getRequestURI()).thenReturn("/api/content/12345/comments");
        metricsService.recordRequest(mockRequest, 200, 100);

        // Test query parameter removal
        when(mockRequest.getRequestURI()).thenReturn("/api/search?q=test&limit=10");
        metricsService.recordRequest(mockRequest, 200, 100);

        // Verify that endpoints are sanitized in metrics
        // Check for counters with sanitized endpoints
        Counter uuidCounter = meterRegistry.find("app.requests.total")
                .tag("endpoint", "/api/user/{uuid}/profile")
                .counter();
        assertNotNull(uuidCounter, "Should have counter for UUID sanitized endpoint");
        assertEquals(1.0, uuidCounter.count());

        Counter idCounter = meterRegistry.find("app.requests.total")
                .tag("endpoint", "/api/content/{id}/comments")
                .counter();
        assertNotNull(idCounter, "Should have counter for ID sanitized endpoint");
        assertEquals(1.0, idCounter.count());

        Counter queryCounter = meterRegistry.find("app.requests.total")
                .tag("endpoint", "/api/search")
                .counter();
        assertNotNull(queryCounter, "Should have counter for query parameter sanitized endpoint");
        assertEquals(1.0, queryCounter.count());
    }

    @Test
    void testGetMetricsSummary() {
        // Given - record some metrics
        when(mockRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (iPhone)");
        when(mockRequest.getHeader("X-Platform")).thenReturn("ios");
        when(mockRequest.getHeader("X-App-Version")).thenReturn("1.2.3");
        when(mockRequest.getRequestURI()).thenReturn("/api/test");
        when(mockRequest.getMethod()).thenReturn("GET");
        
        metricsService.recordRequest(mockRequest, 200, 100);
        metricsService.recordAuthentication("google", "mobile", "ios", "1.2.3", true, 200);
        metricsService.incrementActiveConnections();

        // When
        Map<String, Object> summary = metricsService.getMetricsSummary();

        // Then
        assertNotNull(summary);
        assertEquals(1L, summary.get("active_sessions"));
        assertEquals(1L, summary.get("active_connections"));
        
        @SuppressWarnings("unchecked")
        Map<String, Long> deviceTypes = (Map<String, Long>) summary.get("device_types");
        assertNotNull(deviceTypes);
        assertEquals(1L, deviceTypes.get("mobile"));
        
        @SuppressWarnings("unchecked")
        Map<String, Long> platforms = (Map<String, Long>) summary.get("platforms");
        assertNotNull(platforms);
        assertEquals(1L, platforms.get("ios"));
        
        @SuppressWarnings("unchecked")
        Map<String, Long> appVersions = (Map<String, Long>) summary.get("app_versions");
        assertNotNull(appVersions);
        assertEquals(1L, appVersions.get("1.2.3"));
    }

    @Test
    void testMultipleDeviceTypes() {
        // Record requests from different device types
        when(mockRequest.getRequestURI()).thenReturn("/api/test");
        when(mockRequest.getMethod()).thenReturn("GET");
        when(mockRequest.getHeader("X-App-Version")).thenReturn("1.0.0");

        // Mobile request
        when(mockRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (iPhone)");
        when(mockRequest.getHeader("X-Platform")).thenReturn("ios");
        metricsService.recordRequest(mockRequest, 200, 100);

        // Tablet request
        when(mockRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (iPad)");
        when(mockRequest.getHeader("X-Platform")).thenReturn("ios");
        metricsService.recordRequest(mockRequest, 200, 150);

        // Desktop request
        when(mockRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0 (Windows NT 10.0)");
        when(mockRequest.getHeader("X-Platform")).thenReturn("windows");
        metricsService.recordRequest(mockRequest, 200, 80);

        // Verify metrics
        Map<String, Object> summary = metricsService.getMetricsSummary();
        @SuppressWarnings("unchecked")
        Map<String, Long> deviceTypes = (Map<String, Long>) summary.get("device_types");
        
        assertEquals(1L, deviceTypes.get("mobile"));
        assertEquals(1L, deviceTypes.get("tablet"));
        assertEquals(1L, deviceTypes.get("desktop"));
    }

    @Test
    void testCircuitBreakerCustomMetrics() {
        metricsService.recordCircuitBreakerStateTransition("default", "CLOSED", "OPEN");
        metricsService.recordCircuitBreakerCall("default", "failure");

        assertNotNull(meterRegistry.find("app.circuitbreaker.state.transitions")
                .tag("name", "default").meter(), "state transition meter should exist");
        assertNotNull(meterRegistry.find("app.circuitbreaker.calls")
                .tag("name", "default").meter(), "calls meter should exist");
    }
}
