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

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
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

    // ==================== Cache Metrics Tests ====================

    @Test
    void testRecordCacheHit_HappyPath() {
        // When
        metricsService.recordCacheHit("jwks");

        // Then
        Counter counter = meterRegistry.find("app.cache.hits")
                .tag("cache", "jwks")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordCacheHit_MultipleCaches() {
        // When
        metricsService.recordCacheHit("jwks");
        metricsService.recordCacheHit("rate-limiting");
        metricsService.recordCacheHit("jwks");

        // Then
        Counter jwksCounter = meterRegistry.find("app.cache.hits")
                .tag("cache", "jwks")
                .counter();
        assertNotNull(jwksCounter);
        assertEquals(2.0, jwksCounter.count());

        Counter rateLimitCounter = meterRegistry.find("app.cache.hits")
                .tag("cache", "rate-limiting")
                .counter();
        assertNotNull(rateLimitCounter);
        assertEquals(1.0, rateLimitCounter.count());
    }

    @Test
    void testRecordCacheHit_NullCacheName() {
        // When - null cache name should default to "unknown"
        metricsService.recordCacheHit(null);

        // Then
        Counter counter = meterRegistry.find("app.cache.hits")
                .tag("cache", "unknown")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordCacheMiss_HappyPath() {
        // When
        metricsService.recordCacheMiss("public-keys");

        // Then
        Counter counter = meterRegistry.find("app.cache.misses")
                .tag("cache", "public-keys")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordCacheMiss_NullCacheName() {
        // When
        metricsService.recordCacheMiss(null);

        // Then
        Counter counter = meterRegistry.find("app.cache.misses")
                .tag("cache", "unknown")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordCacheEviction_HappyPath() {
        // When
        metricsService.recordCacheEviction("jwks", "expired");

        // Then
        Counter counter = meterRegistry.find("app.cache.evictions")
                .tag("cache", "jwks")
                .tag("reason", "expired")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordCacheEviction_DifferentReasons() {
        // When
        metricsService.recordCacheEviction("jwks", "expired");
        metricsService.recordCacheEviction("jwks", "size_limit");
        metricsService.recordCacheEviction("jwks", "manual");

        // Then
        Counter expiredCounter = meterRegistry.find("app.cache.evictions")
                .tag("cache", "jwks")
                .tag("reason", "expired")
                .counter();
        assertNotNull(expiredCounter);
        assertEquals(1.0, expiredCounter.count());

        Counter sizeLimitCounter = meterRegistry.find("app.cache.evictions")
                .tag("cache", "jwks")
                .tag("reason", "size_limit")
                .counter();
        assertNotNull(sizeLimitCounter);
        assertEquals(1.0, sizeLimitCounter.count());
    }

    @Test
    void testRecordCacheEviction_NullValues() {
        // When
        metricsService.recordCacheEviction(null, null);

        // Then
        Counter counter = meterRegistry.find("app.cache.evictions")
                .tag("cache", "unknown")
                .tag("reason", "unknown")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    // ==================== Rate Limiting Metrics Tests ====================

    @Test
    void testRecordRateLimitExceeded_HappyPath() {
        // When
        metricsService.recordRateLimitExceeded("/api/auth/login", "ip:192.168.1.1");

        // Then
        Counter counter = meterRegistry.find("app.rate_limit.exceeded")
                .tag("endpoint", "/api/auth/login")
                .tag("client_key", "ip:192.168.1.1")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordRateLimitExceeded_NullValues() {
        // When
        metricsService.recordRateLimitExceeded(null, null);

        // Then
        Counter counter = meterRegistry.find("app.rate_limit.exceeded")
                .tag("endpoint", "unknown")
                .tag("client_key", "unknown")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testUpdateRateLimitRemaining_HappyPath() {
        // When
        metricsService.updateRateLimitRemaining("/api/stories", 45);

        // Then
        Gauge gauge = meterRegistry.find("app.rate_limit.remaining")
                .tag("endpoint", "/api/stories")
                .gauge();
        assertNotNull(gauge);
        assertEquals(45.0, gauge.value());
    }

    @Test
    void testUpdateRateLimitRemaining_UpdatesExistingGauge() {
        // When
        metricsService.updateRateLimitRemaining("/api/stories", 50);
        metricsService.updateRateLimitRemaining("/api/stories", 25);

        // Then
        Gauge gauge = meterRegistry.find("app.rate_limit.remaining")
                .tag("endpoint", "/api/stories")
                .gauge();
        assertNotNull(gauge);
        assertEquals(25.0, gauge.value());
    }

    // ==================== Token Validation Metrics Tests ====================

    @Test
    void testRecordTokenValidation_Success() {
        // When
        metricsService.recordTokenValidation("success");

        // Then
        Counter counter = meterRegistry.find("app.token.validation.total")
                .tag("result", "success")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordTokenValidation_Expired() {
        // When
        metricsService.recordTokenValidation("expired");

        // Then
        Counter counter = meterRegistry.find("app.token.validation.total")
                .tag("result", "expired")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordTokenValidation_Invalid() {
        // When
        metricsService.recordTokenValidation("invalid");

        // Then
        Counter counter = meterRegistry.find("app.token.validation.total")
                .tag("result", "invalid")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordTokenValidation_Malformed() {
        // When
        metricsService.recordTokenValidation("malformed");

        // Then
        Counter counter = meterRegistry.find("app.token.validation.total")
                .tag("result", "malformed")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordTokenValidation_NullResult() {
        // When
        metricsService.recordTokenValidation(null);

        // Then
        Counter counter = meterRegistry.find("app.token.validation.total")
                .tag("result", "unknown")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordTokenValidation_WithTokenType() {
        // When
        metricsService.recordTokenValidation("success", "access");

        // Then
        Counter counter = meterRegistry.find("app.token.validation.total")
                .tag("result", "success")
                .tag("token_type", "access")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordTokenValidation_WithNullTokenType() {
        // When
        metricsService.recordTokenValidation("success", null);

        // Then
        Counter counter = meterRegistry.find("app.token.validation.total")
                .tag("result", "success")
                .tag("token_type", "unknown")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    // ==================== Story Sync Metrics Tests ====================

    @Test
    void testRecordStorySync_HappyPath() {
        // When
        metricsService.recordStorySync(10, 3, 250);

        // Then
        Counter counter = meterRegistry.find("app.stories.sync.requests")
                .tag("stories_returned", "1-5")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());

        Timer timer = meterRegistry.find("app.stories.sync.duration").timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
    }

    @Test
    void testRecordStorySync_ZeroStoriesReturned() {
        // When
        metricsService.recordStorySync(5, 0, 100);

        // Then
        Counter counter = meterRegistry.find("app.stories.sync.requests")
                .tag("stories_returned", "0")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordStorySync_ManyStoriesReturned() {
        // When
        metricsService.recordStorySync(100, 75, 500);

        // Then
        Counter counter = meterRegistry.find("app.stories.sync.requests")
                .tag("stories_returned", "50+")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordStorySync_MediumStoriesReturned() {
        // When
        metricsService.recordStorySync(50, 25, 300);

        // Then
        Counter counter = meterRegistry.find("app.stories.sync.requests")
                .tag("stories_returned", "11-50")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    // ==================== Response Size Metrics Tests ====================

    @Test
    void testRecordResponseSize_HappyPath() {
        // When
        metricsService.recordResponseSize("/api/stories", "GET", 1024);

        // Then
        io.micrometer.core.instrument.DistributionSummary summary =
                meterRegistry.find("app.response.size.bytes")
                .tag("endpoint", "/api/stories")
                .tag("method", "GET")
                .summary();
        assertNotNull(summary);
        assertEquals(1, summary.count());
        assertEquals(1024.0, summary.totalAmount());
    }

    @Test
    void testRecordResponseSize_LargeResponse() {
        // When
        metricsService.recordResponseSize("/api/stories/sync", "POST", 1048576); // 1MB

        // Then
        io.micrometer.core.instrument.DistributionSummary summary =
                meterRegistry.find("app.response.size.bytes")
                .tag("endpoint", "/api/stories/sync")
                .tag("method", "POST")
                .summary();
        assertNotNull(summary);
        assertEquals(1, summary.count());
        assertEquals(1048576.0, summary.totalAmount());
    }

    @Test
    void testRecordResponseSize_NullValues() {
        // When
        metricsService.recordResponseSize(null, null, 512);

        // Then
        io.micrometer.core.instrument.DistributionSummary summary =
                meterRegistry.find("app.response.size.bytes")
                .tag("endpoint", "unknown")
                .tag("method", "unknown")
                .summary();
        assertNotNull(summary);
        assertEquals(1, summary.count());
    }

    // ==================== Startup Metrics Tests ====================

    @Test
    void testRecordStartupTime_HappyPath() {
        // When
        metricsService.recordStartupTime(5000);

        // Then
        Gauge gauge = meterRegistry.find("app.startup.time").gauge();
        assertNotNull(gauge);
        assertEquals(5000.0, gauge.value());
    }

    @Test
    void testRecordStartupTime_UpdatesValue() {
        // When
        metricsService.recordStartupTime(3000);
        metricsService.recordStartupTime(4500);

        // Then
        Gauge gauge = meterRegistry.find("app.startup.time").gauge();
        assertNotNull(gauge);
        assertEquals(4500.0, gauge.value());
    }

    @Test
    void testGetStartupTime() {
        // When
        metricsService.recordStartupTime(7500);

        // Then
        assertEquals(7500, metricsService.getStartupTime());
    }

    @Test
    void testGetStartupTime_BeforeRecording() {
        // Then - should return 0 before any startup time is recorded
        assertEquals(0, metricsService.getStartupTime());
    }

    // ==================== Batch URL Generation Metrics Tests ====================

    @Test
    void testRecordBatchUrlGeneration_HappyPath_AllSuccess() {
        // When - all URLs generated successfully
        metricsService.recordBatchUrlGeneration(50, 50, 0, 250);

        // Then
        Counter requestCounter = meterRegistry.find("app.batch.urls.requests")
                .tag("result", "success")
                .counter();
        assertNotNull(requestCounter);
        assertEquals(1.0, requestCounter.count());

        Counter generatedCounter = meterRegistry.find("app.batch.urls.generated").counter();
        assertNotNull(generatedCounter);
        assertEquals(50.0, generatedCounter.count());

        Timer timer = meterRegistry.find("app.batch.urls.duration").timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
        assertTrue(timer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) >= 250);

        // No failed counter should exist
        Counter failedCounter = meterRegistry.find("app.batch.urls.failed").counter();
        assertNull(failedCounter);
    }

    @Test
    void testRecordBatchUrlGeneration_SadPath_PartialFailure() {
        // When - some URLs failed to generate
        metricsService.recordBatchUrlGeneration(50, 45, 5, 300);

        // Then
        Counter requestCounter = meterRegistry.find("app.batch.urls.requests")
                .tag("result", "partial")
                .counter();
        assertNotNull(requestCounter);
        assertEquals(1.0, requestCounter.count());

        Counter generatedCounter = meterRegistry.find("app.batch.urls.generated").counter();
        assertNotNull(generatedCounter);
        assertEquals(45.0, generatedCounter.count());

        Counter failedCounter = meterRegistry.find("app.batch.urls.failed").counter();
        assertNotNull(failedCounter);
        assertEquals(5.0, failedCounter.count());
    }

    @Test
    void testRecordBatchUrlGeneration_SadPath_AllFailed() {
        // When - all URLs failed
        metricsService.recordBatchUrlGeneration(10, 0, 10, 100);

        // Then
        Counter requestCounter = meterRegistry.find("app.batch.urls.requests")
                .tag("result", "partial")
                .counter();
        assertNotNull(requestCounter);
        assertEquals(1.0, requestCounter.count());

        Counter failedCounter = meterRegistry.find("app.batch.urls.failed").counter();
        assertNotNull(failedCounter);
        assertEquals(10.0, failedCounter.count());
    }

    @Test
    void testRecordBatchUrlGeneration_EdgeCase_SingleUrl() {
        // When - single URL requested
        metricsService.recordBatchUrlGeneration(1, 1, 0, 50);

        // Then
        Counter generatedCounter = meterRegistry.find("app.batch.urls.generated").counter();
        assertNotNull(generatedCounter);
        assertEquals(1.0, generatedCounter.count());
    }

    @Test
    void testRecordBatchUrlGeneration_EdgeCase_LargeBatch() {
        // When - large batch (200 URLs)
        metricsService.recordBatchUrlGeneration(200, 198, 2, 1500);

        // Then
        Counter generatedCounter = meterRegistry.find("app.batch.urls.generated").counter();
        assertNotNull(generatedCounter);
        assertEquals(198.0, generatedCounter.count());

        Counter failedCounter = meterRegistry.find("app.batch.urls.failed").counter();
        assertNotNull(failedCounter);
        assertEquals(2.0, failedCounter.count());
    }

    @Test
    void testRecordBatchUrlGeneration_EdgeCase_ZeroUrls() {
        // When - zero URLs requested (edge case)
        metricsService.recordBatchUrlGeneration(0, 0, 0, 10);

        // Then - still records the request
        Counter requestCounter = meterRegistry.find("app.batch.urls.requests")
                .tag("result", "success")
                .counter();
        assertNotNull(requestCounter);
        assertEquals(1.0, requestCounter.count());
    }

    @Test
    void testRecordBatchUrlGeneration_MultipleBatches() {
        // When - multiple batch requests
        metricsService.recordBatchUrlGeneration(50, 50, 0, 200);
        metricsService.recordBatchUrlGeneration(50, 48, 2, 250);
        metricsService.recordBatchUrlGeneration(50, 50, 0, 180);

        // Then - counters accumulate
        Counter generatedCounter = meterRegistry.find("app.batch.urls.generated").counter();
        assertNotNull(generatedCounter);
        assertEquals(148.0, generatedCounter.count()); // 50 + 48 + 50

        Timer timer = meterRegistry.find("app.batch.urls.duration").timer();
        assertNotNull(timer);
        assertEquals(3, timer.count());
    }

    // ==================== Delta Sync Metrics Tests ====================

    @Test
    void testRecordDeltaSync_HappyPath_NeedsUpdate() {
        // When - client needs updates
        metricsService.recordDeltaSync(5, 10, 15, 0, 350);

        // Then
        Counter requestCounter = meterRegistry.find("app.delta.sync.requests")
                .tag("result", "needs_update")
                .counter();
        assertNotNull(requestCounter);
        assertEquals(1.0, requestCounter.count());

        Counter updatedCounter = meterRegistry.find("app.delta.sync.stories.updated").counter();
        assertNotNull(updatedCounter);
        assertEquals(15.0, updatedCounter.count());

        Timer timer = meterRegistry.find("app.delta.sync.duration").timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
    }

    @Test
    void testRecordDeltaSync_HappyPath_UpToDate() {
        // When - client is up to date
        metricsService.recordDeltaSync(10, 10, 0, 0, 50);

        // Then
        Counter requestCounter = meterRegistry.find("app.delta.sync.requests")
                .tag("result", "up_to_date")
                .counter();
        assertNotNull(requestCounter);
        assertEquals(1.0, requestCounter.count());

        // No updated stories counter when up to date
        Counter updatedCounter = meterRegistry.find("app.delta.sync.stories.updated").counter();
        assertNull(updatedCounter);
    }

    @Test
    void testRecordDeltaSync_SadPath_WithDeletions() {
        // When - stories were deleted
        metricsService.recordDeltaSync(5, 8, 3, 2, 200);

        // Then
        Counter requestCounter = meterRegistry.find("app.delta.sync.requests")
                .tag("result", "needs_update")
                .counter();
        assertNotNull(requestCounter);
        assertEquals(1.0, requestCounter.count());

        Counter deletedCounter = meterRegistry.find("app.delta.sync.stories.deleted").counter();
        assertNotNull(deletedCounter);
        assertEquals(2.0, deletedCounter.count());
    }

    @Test
    void testRecordDeltaSync_EdgeCase_OnlyDeletions() {
        // When - only deletions, no updates
        metricsService.recordDeltaSync(5, 5, 0, 3, 100);

        // Then - still needs_update because deletions exist
        Counter requestCounter = meterRegistry.find("app.delta.sync.requests")
                .tag("result", "needs_update")
                .counter();
        assertNotNull(requestCounter);
        assertEquals(1.0, requestCounter.count());

        Counter deletedCounter = meterRegistry.find("app.delta.sync.stories.deleted").counter();
        assertNotNull(deletedCounter);
        assertEquals(3.0, deletedCounter.count());
    }

    @Test
    void testRecordDeltaSync_EdgeCase_ClientAhead() {
        // When - client version is ahead of server (unusual but possible)
        metricsService.recordDeltaSync(15, 10, 0, 0, 30);

        // Then - treated as up to date
        Counter requestCounter = meterRegistry.find("app.delta.sync.requests")
                .tag("result", "up_to_date")
                .counter();
        assertNotNull(requestCounter);
        assertEquals(1.0, requestCounter.count());
    }

    @Test
    void testRecordDeltaSync_EdgeCase_LargeUpdate() {
        // When - large number of stories updated (50+)
        metricsService.recordDeltaSync(0, 100, 75, 5, 2000);

        // Then
        Counter updatedCounter = meterRegistry.find("app.delta.sync.stories.updated")
                .tag("count_category", "50+")
                .counter();
        assertNotNull(updatedCounter);
        assertEquals(75.0, updatedCounter.count());
    }

    @Test
    void testRecordDeltaSync_EdgeCase_FewUpdates() {
        // When - few stories updated (1-5)
        metricsService.recordDeltaSync(0, 5, 3, 0, 150);

        // Then
        Counter updatedCounter = meterRegistry.find("app.delta.sync.stories.updated")
                .tag("count_category", "1-5")
                .counter();
        assertNotNull(updatedCounter);
        assertEquals(3.0, updatedCounter.count());
    }

    // ==================== API Call Reduction Metrics Tests ====================

    @Test
    void testRecordApiCallReduction_HappyPath_95PercentReduction() {
        // When - 95% reduction (typical batch processing goal)
        metricsService.recordApiCallReduction(180, 9);

        // Then
        Counter savedCounter = meterRegistry.find("app.batch.calls.saved").counter();
        assertNotNull(savedCounter);
        assertEquals(171.0, savedCounter.count()); // 180 - 9 = 171 saved
    }

    @Test
    void testRecordApiCallReduction_HappyPath_50PercentReduction() {
        // When - 50% reduction
        metricsService.recordApiCallReduction(100, 50);

        // Then
        Counter savedCounter = meterRegistry.find("app.batch.calls.saved").counter();
        assertNotNull(savedCounter);
        assertEquals(50.0, savedCounter.count());
    }

    @Test
    void testRecordApiCallReduction_EdgeCase_NoReduction() {
        // When - no reduction (same number of calls)
        metricsService.recordApiCallReduction(10, 10);

        // Then
        Counter savedCounter = meterRegistry.find("app.batch.calls.saved").counter();
        assertNotNull(savedCounter);
        assertEquals(0.0, savedCounter.count());
    }

    @Test
    void testRecordApiCallReduction_EdgeCase_ZeroCalls() {
        // When - zero traditional calls
        metricsService.recordApiCallReduction(0, 0);

        // Then - no calls saved but no error
        Counter savedCounter = meterRegistry.find("app.batch.calls.saved").counter();
        assertNotNull(savedCounter);
        assertEquals(0.0, savedCounter.count());
    }

    @Test
    void testRecordApiCallReduction_MultipleRecordings() {
        // When - multiple recordings accumulate
        metricsService.recordApiCallReduction(100, 5);  // 95 saved
        metricsService.recordApiCallReduction(50, 3);   // 47 saved
        metricsService.recordApiCallReduction(30, 2);   // 28 saved

        // Then
        Counter savedCounter = meterRegistry.find("app.batch.calls.saved").counter();
        assertNotNull(savedCounter);
        assertEquals(170.0, savedCounter.count()); // 95 + 47 + 28
    }

    // ==================== Asset Sync Metrics Tests ====================

    @Test
    void testRecordAssetSync_HappyPath() {
        // When
        metricsService.recordAssetSync(20, 15, 300);

        // Then
        Counter counter = meterRegistry.find("app.assets.sync.requests").counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());

        Timer timer = meterRegistry.find("app.assets.sync.duration").timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
        assertTrue(timer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) >= 300);
    }

    @Test
    void testRecordAssetSync_EdgeCase_NoAssetsReturned() {
        // When - all assets already cached
        metricsService.recordAssetSync(20, 0, 50);

        // Then
        Counter counter = meterRegistry.find("app.assets.sync.requests").counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordAssetSync_EdgeCase_AllAssetsReturned() {
        // When - full sync (no cached assets)
        metricsService.recordAssetSync(50, 50, 500);

        // Then
        Counter counter = meterRegistry.find("app.assets.sync.requests").counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordAssetSync_EdgeCase_ZeroAssets() {
        // When - no assets in system
        metricsService.recordAssetSync(0, 0, 10);

        // Then
        Counter counter = meterRegistry.find("app.assets.sync.requests").counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    // ==================== GCS Operation Metrics Tests ====================

    @Test
    void testRecordGcsOperation_HappyPath_UploadSuccess() {
        // When
        metricsService.recordGcsOperation("upload", true, 500);

        // Then
        Counter counter = meterRegistry.find("app.gcs.operations")
                .tag("operation", "upload")
                .tag("status", "success")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());

        Timer timer = meterRegistry.find("app.gcs.operation.duration")
                .tag("operation", "upload")
                .tag("status", "success")
                .timer();
        assertNotNull(timer);
        assertEquals(1, timer.count());
    }

    @Test
    void testRecordGcsOperation_HappyPath_DownloadSuccess() {
        // When
        metricsService.recordGcsOperation("download", true, 200);

        // Then
        Counter counter = meterRegistry.find("app.gcs.operations")
                .tag("operation", "download")
                .tag("status", "success")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordGcsOperation_HappyPath_SignUrlSuccess() {
        // When
        metricsService.recordGcsOperation("sign_url", true, 50);

        // Then
        Counter counter = meterRegistry.find("app.gcs.operations")
                .tag("operation", "sign_url")
                .tag("status", "success")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordGcsOperation_SadPath_UploadError() {
        // When
        metricsService.recordGcsOperation("upload", false, 1000);

        // Then
        Counter counter = meterRegistry.find("app.gcs.operations")
                .tag("operation", "upload")
                .tag("status", "error")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordGcsOperation_SadPath_DownloadError() {
        // When
        metricsService.recordGcsOperation("download", false, 5000);

        // Then
        Counter counter = meterRegistry.find("app.gcs.operations")
                .tag("operation", "download")
                .tag("status", "error")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());

        Timer timer = meterRegistry.find("app.gcs.operation.duration")
                .tag("operation", "download")
                .tag("status", "error")
                .timer();
        assertNotNull(timer);
        assertTrue(timer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) >= 5000);
    }

    @Test
    void testRecordGcsOperation_EdgeCase_NullOperation() {
        // When
        metricsService.recordGcsOperation(null, true, 100);

        // Then - defaults to "unknown"
        Counter counter = meterRegistry.find("app.gcs.operations")
                .tag("operation", "unknown")
                .tag("status", "success")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordGcsOperation_EdgeCase_BatchSignUrl() {
        // When - batch signing multiple URLs
        metricsService.recordGcsOperation("batch_sign_url", true, 250);

        // Then
        Counter counter = meterRegistry.find("app.gcs.operations")
                .tag("operation", "batch_sign_url")
                .tag("status", "success")
                .counter();
        assertNotNull(counter);
        assertEquals(1.0, counter.count());
    }

    @Test
    void testRecordGcsOperation_MultipleOperations() {
        // When - mix of operations
        metricsService.recordGcsOperation("upload", true, 100);
        metricsService.recordGcsOperation("upload", true, 150);
        metricsService.recordGcsOperation("upload", false, 500);
        metricsService.recordGcsOperation("download", true, 200);

        // Then
        Counter uploadSuccessCounter = meterRegistry.find("app.gcs.operations")
                .tag("operation", "upload")
                .tag("status", "success")
                .counter();
        assertNotNull(uploadSuccessCounter);
        assertEquals(2.0, uploadSuccessCounter.count());

        Counter uploadErrorCounter = meterRegistry.find("app.gcs.operations")
                .tag("operation", "upload")
                .tag("status", "error")
                .counter();
        assertNotNull(uploadErrorCounter);
        assertEquals(1.0, uploadErrorCounter.count());

        Counter downloadCounter = meterRegistry.find("app.gcs.operations")
                .tag("operation", "download")
                .tag("status", "success")
                .counter();
        assertNotNull(downloadCounter);
        assertEquals(1.0, downloadCounter.count());
    }
}
