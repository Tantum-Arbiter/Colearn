package com.app.security;

import com.app.service.SecurityMonitoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Advanced security attack scenario tests including distributed attacks,
 * timing attacks, and sophisticated threat patterns
 */
@ExtendWith(MockitoExtension.class)
class AdvancedSecurityAttackTest {

    private SecurityMonitoringService securityMonitoringService;

    @BeforeEach
    void setUp() {
        securityMonitoringService = new SecurityMonitoringService();
    }

    @Test
    void distributedBruteForceAttack_FromMultipleIPs_ShouldDetectPattern() {
        // Given - Distributed attack from multiple IPs targeting same user
        String[] attackerIPs = {
            "192.168.1.100", "192.168.1.101", "192.168.1.102", 
            "192.168.1.103", "192.168.1.104"
        };
        String userAgent = "DistributedBot/1.0";

        // When - Each IP performs moderate attacks (below individual thresholds)
        for (String ip : attackerIPs) {
            for (int i = 0; i < 8; i++) { // 8 attempts per IP (below 10 threshold)
                securityMonitoringService.logFailedAuthentication("Invalid credentials", ip, userAgent);
            }
        }

        // Then - Individual IPs should not be suspicious, but global metrics show attack
        for (String ip : attackerIPs) {
            assertFalse(securityMonitoringService.isSuspiciousIp(ip));
        }

        Map<String, Object> metrics = securityMonitoringService.getSecurityMetrics();
        assertEquals(40L, metrics.get("failedLogins")); // 5 IPs * 8 attempts = 40 total
        assertEquals(5, metrics.get("monitoredIps")); // 5 unique IPs
    }

    @Test
    void slowAndSteadyAttack_OverTime_ShouldEventuallyTrigger() {
        // Given - Slow, persistent attack from single IP
        String persistentIP = "192.168.1.200";
        String userAgent = "PersistentBot/1.0";

        // When - Gradual increase in failed attempts
        // Phase 1: 5 attempts (safe)
        for (int i = 0; i < 5; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", persistentIP, userAgent);
        }
        assertFalse(securityMonitoringService.isSuspiciousIp(persistentIP));

        // Phase 2: 5 more attempts (total 10, still safe)
        for (int i = 0; i < 5; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", persistentIP, userAgent);
        }
        assertFalse(securityMonitoringService.isSuspiciousIp(persistentIP));

        // Phase 3: 2 more attempts (total 12, now suspicious)
        for (int i = 0; i < 2; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", persistentIP, userAgent);
        }

        // Then - Should now be marked as suspicious
        assertTrue(securityMonitoringService.isSuspiciousIp(persistentIP));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(persistentIP);
        assertEquals(12L, ipData.get("totalFailedLogins"));
        assertEquals(true, ipData.get("isSuspicious"));
    }

    @Test
    void mixedAttackVectors_CombinedThreats_ShouldDetectSophisticatedAttack() {
        // Given - Sophisticated attacker using multiple attack vectors
        String sophisticatedIP = "192.168.1.300";
        String userAgent = "SophisticatedBot/1.0";

        // When - Combine different attack types
        // 1. Failed authentication attempts (9 - just below threshold)
        for (int i = 0; i < 9; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", sophisticatedIP, userAgent);
        }

        // 2. Suspicious requests (4 - just below threshold)
        for (int i = 0; i < 4; i++) {
            securityMonitoringService.logSuspiciousRequest("/api/admin", sophisticatedIP, userAgent, "Path traversal attempt");
        }

        // 3. Rate limit violations (19 - just below threshold)
        for (int i = 0; i < 19; i++) {
            securityMonitoringService.logRateLimitViolation("user-" + i, "/api/content", sophisticatedIP);
        }

        // Then - Should not be suspicious yet (all below individual thresholds)
        assertFalse(securityMonitoringService.isSuspiciousIp(sophisticatedIP));

        // When - Add two more to cross threshold (need >10, so 11 total)
        securityMonitoringService.logFailedAuthentication("Invalid credentials", sophisticatedIP, userAgent);
        securityMonitoringService.logFailedAuthentication("Invalid credentials", sophisticatedIP, userAgent);

        // Then - Should now be suspicious (11 failed logins crosses threshold of >10)
        assertTrue(securityMonitoringService.isSuspiciousIp(sophisticatedIP));
    }

    @Test
    void timingBasedAttack_RapidSuccession_ShouldDetectBurstPattern() throws InterruptedException {
        // Given - Timing-based attack with rapid bursts
        String timingAttackerIP = "192.168.1.400";
        String userAgent = "TimingBot/1.0";
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(15);

        // When - Rapid burst of requests in very short time
        long startTime = System.currentTimeMillis();
        for (int i = 0; i < 15; i++) {
            executor.submit(() -> {
                try {
                    securityMonitoringService.logFailedAuthentication("Invalid credentials", timingAttackerIP, userAgent);
                } finally {
                    latch.countDown();
                }
            });
        }

        // Wait for all requests to complete
        assertTrue(latch.await(2, TimeUnit.SECONDS));
        executor.shutdown();
        long endTime = System.currentTimeMillis();

        // Then - Should detect rapid burst (all requests within short timeframe)
        assertTrue(endTime - startTime < 1000); // All requests within 1 second
        assertTrue(securityMonitoringService.isSuspiciousIp(timingAttackerIP));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(timingAttackerIP);
        assertEquals(15L, ipData.get("totalFailedLogins"));
    }

    @Test
    void userEnumerationAttack_DifferentUsernames_ShouldDetectPattern() {
        // Given - User enumeration attack trying different usernames
        String enumerationIP = "192.168.1.500";
        String userAgent = "EnumerationBot/1.0";
        String[] usernames = {
            "admin", "administrator", "root", "user", "test", "guest",
            "demo", "service", "api", "system", "operator", "manager"
        };

        // When - Try different usernames (simulated as different failed login reasons)
        for (String username : usernames) {
            securityMonitoringService.logFailedAuthentication("User not found: " + username, enumerationIP, userAgent);
        }

        // Then - Should detect enumeration pattern (12 different attempts)
        assertTrue(securityMonitoringService.isSuspiciousIp(enumerationIP));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(enumerationIP);
        assertEquals(12L, ipData.get("totalFailedLogins"));
        assertEquals(true, ipData.get("isSuspicious"));
    }

    @Test
    void credentialStuffingAttack_HighVolume_ShouldDetectQuickly() {
        // Given - Credential stuffing attack with high volume
        String stuffingIP = "192.168.1.600";
        String userAgent = "StuffingBot/1.0";

        // When - High volume of attempts with different credentials
        for (int i = 0; i < 50; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", stuffingIP, userAgent);
        }

        // Then - Should quickly detect high-volume attack
        assertTrue(securityMonitoringService.isSuspiciousIp(stuffingIP));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(stuffingIP);
        assertEquals(50L, ipData.get("totalFailedLogins"));
        assertEquals(true, ipData.get("isSuspicious"));
    }

    @Test
    void applicationLayerDDoS_MultipleEndpoints_ShouldDetectAbuse() {
        // Given - Application layer DDoS targeting multiple endpoints
        String ddosIP = "192.168.1.700";
        String userAgent = "DDoSBot/1.0";
        String[] endpoints = {
            "/api/auth", "/api/content", "/api/user", "/api/admin", 
            "/api/stories", "/api/music", "/api/settings"
        };

        // When - High volume requests to multiple endpoints
        for (String endpoint : endpoints) {
            for (int i = 0; i < 5; i++) {
                securityMonitoringService.logRateLimitViolation("ddos-" + i, endpoint, ddosIP);
            }
        }

        // Then - Should detect DDoS pattern (35 rate limit violations)
        assertTrue(securityMonitoringService.isSuspiciousIp(ddosIP));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(ddosIP);
        assertEquals(35L, ipData.get("totalRateLimitViolations"));
        assertEquals(true, ipData.get("isSuspicious"));
    }

    @Test
    void botnetAttack_CoordinatedFromMultipleIPs_ShouldDetectGlobalPattern() throws InterruptedException {
        // Given - Botnet attack from multiple coordinated IPs
        String[] botnetIPs = new String[20];
        for (int i = 0; i < 20; i++) {
            botnetIPs[i] = "10.0.0." + (i + 1);
        }
        String userAgent = "BotnetBot/1.0";
        
        ExecutorService executor = Executors.newFixedThreadPool(20);
        CountDownLatch latch = new CountDownLatch(20);

        // When - Coordinated attack from all IPs simultaneously
        for (String ip : botnetIPs) {
            executor.submit(() -> {
                try {
                    // Each bot performs moderate attacks (below individual thresholds)
                    for (int i = 0; i < 6; i++) {
                        securityMonitoringService.logFailedAuthentication("Invalid credentials", ip, userAgent);
                    }
                    // Only 3 suspicious requests per IP (below threshold of >5)
                    for (int i = 0; i < 3; i++) {
                        securityMonitoringService.logSuspiciousRequest("/api/admin", ip, userAgent, "Unauthorized access");
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        // Wait for coordinated attack to complete
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        // Then - Should detect massive coordinated attack
        Map<String, Object> metrics = securityMonitoringService.getSecurityMetrics();
        assertEquals(120L, metrics.get("failedLogins")); // 20 IPs * 6 attempts = 120
        assertEquals(60L, metrics.get("suspiciousRequests")); // 20 IPs * 3 requests = 60
        assertEquals(20, metrics.get("monitoredIps")); // 20 unique IPs

        // Individual IPs should not be suspicious (6 failed logins < 10, 3 suspicious requests < 5)
        for (String ip : botnetIPs) {
            assertFalse(securityMonitoringService.isSuspiciousIp(ip));
        }
    }

    @Test
    void adaptiveAttack_ChangingBehavior_ShouldDetectEvolution() {
        // Given - Adaptive attacker that changes behavior
        String adaptiveIP = "192.168.1.800";
        String userAgent = "AdaptiveBot/1.0";

        // Phase 1: Start with failed logins
        for (int i = 0; i < 5; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", adaptiveIP, userAgent);
        }
        assertFalse(securityMonitoringService.isSuspiciousIp(adaptiveIP));

        // Phase 2: Switch to suspicious requests
        for (int i = 0; i < 3; i++) {
            securityMonitoringService.logSuspiciousRequest("/api/admin", adaptiveIP, userAgent, "SQL injection");
        }
        assertFalse(securityMonitoringService.isSuspiciousIp(adaptiveIP));

        // Phase 3: Add rate limit violations
        for (int i = 0; i < 10; i++) {
            securityMonitoringService.logRateLimitViolation("user-" + i, "/api/content", adaptiveIP);
        }
        assertFalse(securityMonitoringService.isSuspiciousIp(adaptiveIP)); // Still below individual thresholds

        // Phase 4: Return to failed logins to cross threshold
        for (int i = 0; i < 6; i++) {
            securityMonitoringService.logFailedAuthentication("Invalid credentials", adaptiveIP, userAgent);
        }

        // Then - Should detect adaptive attack (11 total failed logins crosses threshold)
        assertTrue(securityMonitoringService.isSuspiciousIp(adaptiveIP));
        
        Map<String, Object> ipData = securityMonitoringService.getIpSecurityData(adaptiveIP);
        assertEquals(11L, ipData.get("totalFailedLogins"));
        assertEquals(3L, ipData.get("totalSuspiciousRequests"));
        assertEquals(10L, ipData.get("totalRateLimitViolations"));
        assertEquals(true, ipData.get("isSuspicious"));
    }
}
