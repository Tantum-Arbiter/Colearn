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
        // Record state changes
        metricsService.recordCircuitBreakerState("default", "CLOSED");
        metricsService.recordCircuitBreakerState("default", "OPEN");
        metricsService.recordCircuitBreakerCall("default", "failure");

        // Verify state gauge exists and is set to 1 for OPEN
        Gauge openGauge = meterRegistry.find("app.circuitbreaker.state")
                .tag("name", "default")
                .tag("state", "OPEN")
                .gauge();
        assertNotNull(openGauge, "OPEN state gauge should exist");
        assertEquals(1.0, openGauge.value(), "OPEN state should be active");

        // Verify CLOSED state is now 0
        Gauge closedGauge = meterRegistry.find("app.circuitbreaker.state")
                .tag("name", "default")
                .tag("state", "CLOSED")
                .gauge();
        assertNotNull(closedGauge, "CLOSED state gauge should exist");
        assertEquals(0.0, closedGauge.value(), "CLOSED state should be inactive");

        // Verify calls counter
        assertNotNull(meterRegistry.find("app.circuitbreaker.calls")
                .tag("name", "default").meter(), "calls meter should exist");
    }

    // --- Sad Case / Error Metrics Tests ---

    @Test
    void testRecordAuthenticationFailure() {
        // When
        metricsService.recordAuthenticationFailure("google", "mobile", "ios", "invalid_token", "GTW-101");

        // Then
        Counter counter = meterRegistry.find("app.authentication.failures")
                .tag("provider", "google")
                .tag("device_type", "mobile")
                .tag("platform", "ios")
                .tag("error_type", "invalid_token")
                .tag("error_code", "GTW-101")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordTokenRefreshFailure() {
        // When
        metricsService.recordTokenRefreshFailure("google", "mobile", "ios", "expired_refresh_token");

        // Then
        Counter counter = meterRegistry.find("app.tokens.refresh.failures")
                .tag("provider", "google")
                .tag("device_type", "mobile")
                .tag("platform", "ios")
                .tag("error_type", "expired_refresh_token")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordFirestoreFailure() {
        // When
        metricsService.recordFirestoreFailure("users", "read", "timeout", 5000);

        // Then
        Counter counter = meterRegistry.find("app.firestore.failures")
                .tag("collection", "users")
                .tag("operation", "read")
                .tag("error_type", "timeout")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());

        Timer timer = meterRegistry.find("app.firestore.failure.duration")
                .tag("collection", "users")
                .tag("operation", "read")
                .tag("error_type", "timeout")
                .timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
        assertTrue(timer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) >= 5000);
    }

    @Test
    void testRecordProfileOperationFailure() {
        // When
        metricsService.recordProfileOperationFailure("created", "validation_error");

        // Then
        Counter counter = meterRegistry.find("app.profiles.failures")
                .tag("operation", "created")
                .tag("error_type", "validation_error")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordSessionOperationFailure() {
        // When
        metricsService.recordSessionOperationFailure("created", "firestore_error");

        // Then
        Counter counter = meterRegistry.find("app.sessions.failures")
                .tag("operation", "created")
                .tag("error_type", "firestore_error")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    // Token Operation Metrics Tests

    @Test
    void testRecordTokenRefresh_Successful() {
        // When
        metricsService.recordTokenRefresh("google", "mobile", "ios", true, 150);

        // Then
        Counter counter = meterRegistry.find("app.tokens.refresh.total")
                .tag("provider", "google")
                .tag("device_type", "mobile")
                .tag("platform", "ios")
                .tag("result", "success")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());

        Timer timer = meterRegistry.find("app.tokens.refresh.time")
                .tag("provider", "google")
                .tag("device_type", "mobile")
                .tag("platform", "ios")
                .tag("result", "success")
                .timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
        assertTrue(timer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) >= 150);
    }

    @Test
    void testRecordTokenRefresh_Failed() {
        // When
        metricsService.recordTokenRefresh("apple", "tablet", "ios", false, 75);

        // Then
        Counter counter = meterRegistry.find("app.tokens.refresh.total")
                .tag("provider", "apple")
                .tag("device_type", "tablet")
                .tag("platform", "ios")
                .tag("result", "failure")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());

        Timer timer = meterRegistry.find("app.tokens.refresh.time")
                .tag("provider", "apple")
                .tag("device_type", "tablet")
                .tag("platform", "ios")
                .tag("result", "failure")
                .timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
    }

    @Test
    void testRecordTokenRevocation_UserLogout() {
        // When
        metricsService.recordTokenRevocation("mobile", "android", "user_logout", true);

        // Then
        Counter counter = meterRegistry.find("app.tokens.revocation.total")
                .tag("device_type", "mobile")
                .tag("platform", "android")
                .tag("reason", "user_logout")
                .tag("result", "success")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordTokenRevocation_InvalidToken() {
        // When
        metricsService.recordTokenRevocation("desktop", "windows", "invalid_token", true);

        // Then
        Counter counter = meterRegistry.find("app.tokens.revocation.total")
                .tag("device_type", "desktop")
                .tag("platform", "windows")
                .tag("reason", "invalid_token")
                .tag("result", "success")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordTokenRevocation_Error() {
        // When
        metricsService.recordTokenRevocation("mobile", "ios", "error", false);

        // Then
        Counter counter = meterRegistry.find("app.tokens.revocation.total")
                .tag("device_type", "mobile")
                .tag("platform", "ios")
                .tag("reason", "error")
                .tag("result", "failure")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testMultipleTokenRefreshes_DifferentProviders() {
        // When
        metricsService.recordTokenRefresh("google", "mobile", "ios", true, 100);
        metricsService.recordTokenRefresh("google", "mobile", "ios", true, 120);
        metricsService.recordTokenRefresh("apple", "mobile", "ios", true, 110);

        // Then
        Counter googleCounter = meterRegistry.find("app.tokens.refresh.total")
                .tag("provider", "google")
                .tag("result", "success")
                .counter();
        assertNotNull(googleCounter);
        assertEquals(2.0, googleCounter.count());

        Counter appleCounter = meterRegistry.find("app.tokens.refresh.total")
                .tag("provider", "apple")
                .tag("result", "success")
                .counter();
        assertNotNull(appleCounter);
        assertEquals(1.0, appleCounter.count());
    }

    // User Profile Metrics Tests

    @Test
    void testRecordProfileCreated_Successful() {
        // When
        metricsService.recordProfileCreated("user-123", true, 200);

        // Then
        Counter counter = meterRegistry.find("app.user.profiles.total")
                .tag("user_id", "user-123")
                .tag("result", "success")
                .tag("operation", "created")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());

        Timer timer = meterRegistry.find("app.user.profiles.time")
                .tag("user_id", "user-123")
                .tag("result", "success")
                .tag("operation", "created")
                .timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
        assertTrue(timer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) >= 200);
    }

    @Test
    void testRecordProfileCreated_Failed() {
        // When
        metricsService.recordProfileCreated("user-456", false, 100);

        // Then
        Counter counter = meterRegistry.find("app.user.profiles.total")
                .tag("user_id", "user-456")
                .tag("result", "failure")
                .tag("operation", "created")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordProfileUpdated_Successful() {
        // When
        metricsService.recordProfileUpdated("user-789", true, 150);

        // Then
        Counter counter = meterRegistry.find("app.user.profiles.total")
                .tag("user_id", "user-789")
                .tag("result", "success")
                .tag("operation", "updated")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());

        Timer timer = meterRegistry.find("app.user.profiles.time")
                .tag("user_id", "user-789")
                .tag("result", "success")
                .tag("operation", "updated")
                .timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
        assertTrue(timer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) >= 150);
    }

    @Test
    void testRecordProfileUpdated_Failed() {
        // When
        metricsService.recordProfileUpdated("user-999", false, 50);

        // Then
        Counter counter = meterRegistry.find("app.user.profiles.total")
                .tag("user_id", "user-999")
                .tag("result", "failure")
                .tag("operation", "updated")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordProfileRetrieved_Found() {
        // When
        metricsService.recordProfileRetrieved("user-111", true, 75);

        // Then
        Counter counter = meterRegistry.find("app.user.profiles.total")
                .tag("user_id", "user-111")
                .tag("result", "found")
                .tag("operation", "retrieved")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());

        Timer timer = meterRegistry.find("app.user.profiles.time")
                .tag("user_id", "user-111")
                .tag("result", "found")
                .tag("operation", "retrieved")
                .timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
        assertTrue(timer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) >= 75);
    }

    @Test
    void testRecordProfileRetrieved_NotFound() {
        // When
        metricsService.recordProfileRetrieved("user-222", false, 50);

        // Then
        Counter counter = meterRegistry.find("app.user.profiles.total")
                .tag("user_id", "user-222")
                .tag("result", "not_found")
                .tag("operation", "retrieved")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }
}
