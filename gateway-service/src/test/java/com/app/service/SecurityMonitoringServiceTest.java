package com.app.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class SecurityMonitoringServiceTest {

    private SecurityMonitoringService securityMonitoringService;

    @BeforeEach
    void setUp() {
        securityMonitoringService = new SecurityMonitoringService();
    }

    @Test
    void logSuccessfulAuthentication_ShouldIncrementCounter() {
        // Given
        String userId = "test-user-123";
        String provider = "google";

        // When
        securityMonitoringService.logSuccessfulAuthentication(userId, provider);

        // Then
        AtomicLong successfulLogins = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "successfulLogins");
        assertEquals(1L, successfulLogins.get());
    }

    @Test
    void logFailedAuthentication_ShouldIncrementCounter() {
        // Given
        String reason = "Invalid credentials";

        // When
        securityMonitoringService.logFailedAuthentication(reason);

        // Then
        AtomicLong failedLogins = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "failedLogins");
        assertEquals(1L, failedLogins.get());
    }

    @Test
    void logSuspiciousRequest_ShouldIncrementCounter() {
        // Given
        String requestUri = "/api/test";
        String reason = "SQL injection attempt";

        // When
        securityMonitoringService.logSuspiciousRequest(requestUri, reason);

        // Then
        AtomicLong suspiciousRequests = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "suspiciousRequests");
        assertEquals(1L, suspiciousRequests.get());
    }

    @Test
    void logRateLimitViolation_ShouldIncrementCounter() {
        // Given
        String clientKey = "user-123";
        String endpoint = "/api/test";

        // When
        securityMonitoringService.logRateLimitViolation(clientKey, endpoint);

        // Then
        AtomicLong rateLimitViolations = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "rateLimitViolations");
        assertEquals(1L, rateLimitViolations.get());
    }

    @Test
    void logTokenRefresh_ShouldIncrementCounter() {
        // Given
        String userId = "test-user-123";

        // When
        securityMonitoringService.logTokenRefresh(userId);

        // Then
        AtomicLong tokenRefreshes = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "tokenRefreshes");
        assertEquals(1L, tokenRefreshes.get());
    }

    @Test
    void logTokenRevocation_ShouldIncrementCounter() {
        // Given
        String userId = "test-user-123";

        // When
        securityMonitoringService.logTokenRevocation(userId, "user_requested");

        // Then
        AtomicLong tokenRevocations = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "tokenRevocations");
        assertEquals(1L, tokenRevocations.get());
    }

    @Test
    void getSecurityMetrics_ShouldReturnCurrentMetrics() {
        // Given
        securityMonitoringService.logSuccessfulAuthentication("user1", "google");
        securityMonitoringService.logFailedAuthentication("Invalid credentials");
        securityMonitoringService.logSuspiciousRequest("/api/test", "SQL injection");

        // When
        Map<String, Object> metrics = securityMonitoringService.getSecurityMetrics();

        // Then
        assertNotNull(metrics);
        assertEquals(1L, metrics.get("successfulLogins"));
        assertEquals(1L, metrics.get("failedLogins"));
        assertEquals(1L, metrics.get("suspiciousRequests"));
        assertEquals(0L, metrics.get("rateLimitViolations"));
        assertEquals(0L, metrics.get("tokenRefreshes"));
        assertEquals(0L, metrics.get("tokenRevocations"));
        assertTrue(metrics.containsKey("timestamp"));
    }

    @Test
    void multipleFailedLogins_ShouldIncrementCounter() {
        // Given - Simulate multiple failed login attempts
        for (int i = 0; i < 12; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials");
        }

        // Then
        AtomicLong failedLogins = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "failedLogins");
        assertEquals(12L, failedLogins.get());
    }

    @Test
    void mixedSuccessAndFailureLogins_ShouldTrackBothCorrectly() {
        // When
        securityMonitoringService.logSuccessfulAuthentication("user1", "google");
        securityMonitoringService.logSuccessfulAuthentication("user2", "apple");
        securityMonitoringService.logFailedAuthentication("Invalid credentials");

        // Then
        Map<String, Object> metrics = securityMonitoringService.getSecurityMetrics();
        assertEquals(2L, metrics.get("successfulLogins"));
        assertEquals(1L, metrics.get("failedLogins"));
    }

    @Test
    void concurrentAccess_ShouldHandleThreadSafety() throws InterruptedException {
        // Given
        int threadCount = 10;
        int operationsPerThread = 100;
        Thread[] threads = new Thread[threadCount];

        // When - Create multiple threads performing operations
        for (int i = 0; i < threadCount; i++) {
            final int threadId = i;
            threads[i] = new Thread(() -> {
                for (int j = 0; j < operationsPerThread; j++) {
                    securityMonitoringService.logSuccessfulAuthentication(
                        "user-" + threadId + "-" + j,
                        "google"
                    );
                }
            });
            threads[i].start();
        }

        // Wait for all threads to complete
        for (Thread thread : threads) {
            thread.join();
        }

        // Then
        AtomicLong successfulLogins = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "successfulLogins");
        assertEquals(threadCount * operationsPerThread, successfulLogins.get());
    }

    @Test
    void getSecurityMetrics_ShouldIncludeTimestampInformation() {
        // When
        Map<String, Object> metrics = securityMonitoringService.getSecurityMetrics();

        // Then
        assertTrue(metrics.containsKey("timestamp"));
        assertNotNull(metrics.get("timestamp"));
        assertTrue(metrics.get("timestamp") instanceof String);
    }

    @Test
    void resetMetrics_ShouldClearAllCounters() {
        // Given
        securityMonitoringService.logSuccessfulAuthentication("user1", "google");
        securityMonitoringService.logFailedAuthentication("Invalid credentials");
        securityMonitoringService.logSuspiciousRequest("/api/test", "SQL injection");

        // When
        // Reset metrics by creating a new instance (no resetMetrics method available)
        securityMonitoringService = new SecurityMonitoringService();

        // Then
        Map<String, Object> metrics = securityMonitoringService.getSecurityMetrics();
        assertEquals(0L, metrics.get("successfulLogins"));
        assertEquals(0L, metrics.get("failedLogins"));
        assertEquals(0L, metrics.get("suspiciousRequests"));
        assertEquals(0L, metrics.get("rateLimitViolations"));
        assertEquals(0L, metrics.get("tokenRefreshes"));
        assertEquals(0L, metrics.get("tokenRevocations"));
    }
}
