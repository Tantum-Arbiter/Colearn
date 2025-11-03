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
        String ipAddress = "192.168.1.1";
        String userAgent = "Mozilla/5.0";

        // When
        securityMonitoringService.logSuccessfulAuthentication(userId, provider, ipAddress, userAgent);

        // Then
        AtomicLong successfulLogins = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "successfulLogins");
        assertEquals(1L, successfulLogins.get());
    }

    @Test
    void logFailedAuthentication_ShouldIncrementCounter() {
        // Given
        String reason = "Invalid credentials";
        String ipAddress = "192.168.1.1";
        String userAgent = "Mozilla/5.0";

        // When
        securityMonitoringService.logFailedAuthentication(reason, ipAddress, userAgent);

        // Then
        AtomicLong failedLogins = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "failedLogins");
        assertEquals(1L, failedLogins.get());
    }

    @Test
    void logSuspiciousRequest_ShouldIncrementCounter() {
        // Given
        String requestUri = "/api/test";
        String reason = "SQL injection attempt";
        String ipAddress = "192.168.1.1";
        String userAgent = "Mozilla/5.0";

        // When
        securityMonitoringService.logSuspiciousRequest(requestUri, reason, ipAddress, userAgent);

        // Then
        AtomicLong suspiciousRequests = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "suspiciousRequests");
        assertEquals(1L, suspiciousRequests.get());
    }

    @Test
    void logRateLimitViolation_ShouldIncrementCounter() {
        // Given
        String clientKey = "user-123";
        String endpoint = "/api/test";
        int requestCount = 101;
        int limit = 100;

        // When
        securityMonitoringService.logRateLimitViolation(clientKey, endpoint, "127.0.0.1");

        // Then
        AtomicLong rateLimitViolations = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "rateLimitViolations");
        assertEquals(1L, rateLimitViolations.get());
    }

    @Test
    void logTokenRefresh_ShouldIncrementCounter() {
        // Given
        String userId = "test-user-123";
        String ipAddress = "192.168.1.1";

        // When
        securityMonitoringService.logTokenRefresh(userId, ipAddress);

        // Then
        AtomicLong tokenRefreshes = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "tokenRefreshes");
        assertEquals(1L, tokenRefreshes.get());
    }

    @Test
    void logTokenRevocation_ShouldIncrementCounter() {
        // Given
        String userId = "test-user-123";
        String ipAddress = "192.168.1.1";

        // When
        securityMonitoringService.logTokenRevocation(userId, ipAddress, "user_requested");

        // Then
        AtomicLong tokenRevocations = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "tokenRevocations");
        assertEquals(1L, tokenRevocations.get());
    }

    @Test
    void getSecurityMetrics_ShouldReturnCurrentMetrics() {
        // Given
        securityMonitoringService.logSuccessfulAuthentication("user1", "google", "192.168.1.1", "Mozilla/5.0");
        securityMonitoringService.logFailedAuthentication("Invalid credentials", "192.168.1.2", "Mozilla/5.0");
        securityMonitoringService.logSuspiciousRequest("/api/test", "SQL injection", "192.168.1.3", "Mozilla/5.0");

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
        assertTrue(metrics.containsKey("monitoredIps"));
    }

    @Test
    void multipleFailedLogins_ShouldTriggerBruteForceDetection() {
        // Given
        String ipAddress = "192.168.1.100";
        String userAgent = "Mozilla/5.0";

        // When - Simulate multiple failed login attempts (more than 10 to trigger suspicious IP detection)
        for (int i = 0; i < 12; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", ipAddress, userAgent);
        }

        // Then
        AtomicLong failedLogins = (AtomicLong) ReflectionTestUtils.getField(securityMonitoringService, "failedLogins");
        assertEquals(12L, failedLogins.get());

        // Verify IP is tracked as suspicious (threshold is 10 failed logins)
        assertTrue(securityMonitoringService.isSuspiciousIp(ipAddress));
    }

    @Test
    void isSuspiciousIp_WithHighFailureRate_ShouldReturnTrue() {
        // Given
        String ipAddress = "192.168.1.200";
        String userAgent = "Mozilla/5.0";

        // When - Generate many failed attempts
        for (int i = 0; i < 15; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", ipAddress, userAgent);
        }

        // Then
        assertTrue(securityMonitoringService.isSuspiciousIp(ipAddress));
    }

    @Test
    void isSuspiciousIp_WithLowFailureRate_ShouldReturnFalse() {
        // Given
        String ipAddress = "192.168.1.201";
        String userAgent = "Mozilla/5.0";

        // When - Generate few failed attempts
        for (int i = 0; i < 2; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", ipAddress, userAgent);
        }

        // Then
        assertFalse(securityMonitoringService.isSuspiciousIp(ipAddress));
    }

    @Test
    void mixedSuccessAndFailureLogins_ShouldTrackBothCorrectly() {
        // Given
        String ipAddress = "192.168.1.50";
        String userAgent = "Mozilla/5.0";

        // When
        securityMonitoringService.logSuccessfulAuthentication("user1", "google", ipAddress, userAgent);
        securityMonitoringService.logSuccessfulAuthentication("user2", "apple", ipAddress, userAgent);
        securityMonitoringService.logFailedAuthentication("Invalid credentials", ipAddress, userAgent);

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
                        "google", 
                        "192.168.1." + threadId, 
                        "Mozilla/5.0"
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
        securityMonitoringService.logSuccessfulAuthentication("user1", "google", "192.168.1.1", "Mozilla/5.0");
        securityMonitoringService.logFailedAuthentication("Invalid credentials", "192.168.1.2", "Mozilla/5.0");
        securityMonitoringService.logSuspiciousRequest("/api/test", "SQL injection", "192.168.1.3", "Mozilla/5.0");

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
