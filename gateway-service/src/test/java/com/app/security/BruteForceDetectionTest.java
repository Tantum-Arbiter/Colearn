package com.app.security;

import com.app.service.SecurityMonitoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Comprehensive unit tests for brute force attack detection
 */
@ExtendWith(MockitoExtension.class)
class BruteForceDetectionTest {

    private SecurityMonitoringService securityMonitoringService;

    @BeforeEach
    void setUp() {
        securityMonitoringService = new SecurityMonitoringService();
    }

    @Test
    void bruteForceDetection_WithRapidFailedLogins_ShouldTriggerAlert() {
        // Given
        String attackerIp = "192.168.1.100";
        String userAgent = "AttackerBot/1.0";

        // When - Simulate rapid failed login attempts (6 attempts in quick succession)
        for (int i = 0; i < 6; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", attackerIp, userAgent);
        }

        // Then - Should trigger brute force detection (threshold is 5 in 5 minutes)
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(attackerIp);
        assertEquals(6L, ipData.get("totalFailedLogins"));
        assertNotNull(ipData.get("firstSeen"));
        assertNotNull(ipData.get("lastSeen"));
    }

    @Test
    void bruteForceDetection_WithSlowFailedLogins_ShouldNotTriggerImmediately() {
        // Given
        String attackerIp = "192.168.1.101";
        String userAgent = "SlowBot/1.0";

        // When - Simulate slow failed login attempts (3 attempts)
        for (int i = 0; i < 3; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", attackerIp, userAgent);
        }

        // Then - Should not be marked as suspicious yet (threshold is 10 for suspicious IP)
        assertFalse(securityMonitoringService.isSuspiciousIp(attackerIp));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(attackerIp);
        assertEquals(3L, ipData.get("totalFailedLogins"));
        assertEquals(false, ipData.get("isSuspicious"));
    }

    @Test
    void bruteForceDetection_WithMixedSuccessAndFailure_ShouldTrackCorrectly() {
        // Given
        String mixedIp = "192.168.1.102";
        String userAgent = "MixedBot/1.0";

        // When - Simulate mixed success and failure attempts
        securityMonitoringService.logSuccessfulAuthentication("user1", "google", mixedIp, userAgent);
        securityMonitoringService.logFailedAuthentication("Invalid credentials", mixedIp, userAgent);
        securityMonitoringService.logSuccessfulAuthentication("user2", "apple", mixedIp, userAgent);
        securityMonitoringService.logFailedAuthentication("Invalid credentials", mixedIp, userAgent);
        securityMonitoringService.logFailedAuthentication("Invalid credentials", mixedIp, userAgent);

        // Then
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(mixedIp);
        assertEquals(3L, ipData.get("totalFailedLogins"));
        assertFalse(securityMonitoringService.isSuspiciousIp(mixedIp)); // Below threshold
        
        // Verify global metrics
        Map<String, Object> metrics = securityMonitoringService.getSecurityMetrics();
        assertEquals(2L, metrics.get("successfulLogins"));
        assertEquals(3L, metrics.get("failedLogins"));
    }

    @Test
    void bruteForceDetection_WithMultipleIPs_ShouldTrackSeparately() {
        // Given
        String ip1 = "192.168.1.103";
        String ip2 = "192.168.1.104";
        String userAgent = "DistributedBot/1.0";

        // When - Simulate attacks from multiple IPs
        for (int i = 0; i < 7; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", ip1, userAgent);
        }
        
        for (int i = 0; i < 4; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", ip2, userAgent);
        }

        // Then - Each IP should be tracked separately
        Map<String, Object> ip1Data = securityMonitoringService.getIpSecurityData(ip1);
        Map<String, Object> ip2Data = securityMonitoringService.getIpSecurityData(ip2);
        
        assertEquals(7L, ip1Data.get("totalFailedLogins"));
        assertEquals(4L, ip2Data.get("totalFailedLogins"));
        
        assertFalse(securityMonitoringService.isSuspiciousIp(ip1)); // Below 10 threshold
        assertFalse(securityMonitoringService.isSuspiciousIp(ip2)); // Below 10 threshold
    }

    @Test
    void bruteForceDetection_WithHighVolumeAttack_ShouldMarkSuspicious() {
        // Given
        String highVolumeIp = "192.168.1.105";
        String userAgent = "HighVolumeBot/1.0";

        // When - Simulate high volume attack (15 failed attempts)
        for (int i = 0; i < 15; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", highVolumeIp, userAgent);
        }

        // Then - Should be marked as suspicious (threshold is 10)
        assertTrue(securityMonitoringService.isSuspiciousIp(highVolumeIp));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(highVolumeIp);
        assertEquals(15L, ipData.get("totalFailedLogins"));
        assertEquals(true, ipData.get("isSuspicious"));
    }

    @Test
    void bruteForceDetection_ConcurrentAttacks_ShouldHandleThreadSafety() throws InterruptedException {
        // Given
        String concurrentIp = "192.168.1.106";
        String userAgent = "ConcurrentBot/1.0";
        int threadCount = 5;
        int attemptsPerThread = 4;
        CountDownLatch latch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        // When - Simulate concurrent attacks from multiple threads
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < attemptsPerThread; j++) {
                        securityMonitoringService.logFailedAuthentication("Invalid credentials", concurrentIp, userAgent);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        // Wait for all threads to complete
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        // Then - Should handle concurrent access correctly
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(concurrentIp);
        assertEquals(20L, ipData.get("totalFailedLogins")); // 5 threads * 4 attempts each
        assertTrue(securityMonitoringService.isSuspiciousIp(concurrentIp)); // Above 10 threshold
    }

    @Test
    void bruteForceDetection_WithSuspiciousRequests_ShouldContributeToSuspiciousIP() {
        // Given
        String suspiciousIp = "192.168.1.107";
        String userAgent = "SuspiciousBot/1.0";

        // When - Simulate suspicious requests (6 requests to trigger threshold of 5)
        for (int i = 0; i < 6; i++) {
            securityMonitoringService.logSuspiciousRequest("/api/admin", suspiciousIp, userAgent, "SQL injection attempt");
        }

        // Then - Should be marked as suspicious due to suspicious requests
        assertTrue(securityMonitoringService.isSuspiciousIp(suspiciousIp));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(suspiciousIp);
        assertEquals(6L, ipData.get("totalSuspiciousRequests"));
        assertEquals(true, ipData.get("isSuspicious"));
    }

    @Test
    void bruteForceDetection_WithRateLimitViolations_ShouldContributeToSuspiciousIP() {
        // Given
        String rateLimitIp = "192.168.1.108";

        // When - Simulate rate limit violations (25 violations to exceed threshold of 20)
        for (int i = 0; i < 25; i++) {
            securityMonitoringService.logRateLimitViolation("user-" + i, "/api/content", rateLimitIp);
        }

        // Then - Should be marked as suspicious due to rate limit violations
        assertTrue(securityMonitoringService.isSuspiciousIp(rateLimitIp));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(rateLimitIp);
        assertEquals(25L, ipData.get("totalRateLimitViolations"));
        assertEquals(true, ipData.get("isSuspicious"));
    }

    @Test
    void bruteForceDetection_WithCombinedThreats_ShouldAggregateCorrectly() {
        // Given
        String combinedThreatIp = "192.168.1.109";
        String userAgent = "CombinedThreatBot/1.0";

        // When - Simulate combined threats (below individual thresholds but combined should trigger)
        // 8 failed logins (below 10 threshold)
        for (int i = 0; i < 8; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", combinedThreatIp, userAgent);
        }
        
        // 4 suspicious requests (below 5 threshold)
        for (int i = 0; i < 4; i++) {
            securityMonitoringService.logSuspiciousRequest("/api/admin", combinedThreatIp, userAgent, "XSS attempt");
        }
        
        // 15 rate limit violations (below 20 threshold)
        for (int i = 0; i < 15; i++) {
            securityMonitoringService.logRateLimitViolation("user-" + i, "/api/content", combinedThreatIp);
        }

        // Then - Should not be suspicious as none exceed individual thresholds
        assertFalse(securityMonitoringService.isSuspiciousIp(combinedThreatIp));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(combinedThreatIp);
        assertEquals(8L, ipData.get("totalFailedLogins"));
        assertEquals(4L, ipData.get("totalSuspiciousRequests"));
        assertEquals(15L, ipData.get("totalRateLimitViolations"));
        assertEquals(false, ipData.get("isSuspicious"));
    }

    @Test
    void bruteForceDetection_GlobalMetrics_ShouldAggregateCorrectly() {
        // Given
        String[] ips = {"192.168.1.110", "192.168.1.111", "192.168.1.112"};
        String userAgent = "MetricsBot/1.0";

        // When - Simulate attacks from multiple IPs
        for (String ip : ips) {
            for (int i = 0; i < 5; i++) {
                securityMonitoringService.logFailedAuthentication("Invalid credentials", ip, userAgent);
                securityMonitoringService.logSuspiciousRequest("/api/test", ip, userAgent, "Suspicious pattern");
                securityMonitoringService.logRateLimitViolation("user-" + i, "/api/content", ip);
            }
        }

        // Then - Global metrics should aggregate correctly
        Map<String, Object> metrics = securityMonitoringService.getSecurityMetrics();
        assertEquals(15L, metrics.get("failedLogins")); // 3 IPs * 5 attempts each
        assertEquals(15L, metrics.get("suspiciousRequests")); // 3 IPs * 5 requests each
        assertEquals(15L, metrics.get("rateLimitViolations")); // 3 IPs * 5 violations each
        assertEquals(3, metrics.get("monitoredIps")); // 3 unique IPs
        assertNotNull(metrics.get("timestamp"));
    }
}
