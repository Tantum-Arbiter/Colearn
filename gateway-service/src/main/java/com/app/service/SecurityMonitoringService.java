package com.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Security Monitoring Service
 * Tracks security events and provides monitoring capabilities
 */
@Service
public class SecurityMonitoringService {

    private static final Logger logger = LoggerFactory.getLogger(SecurityMonitoringService.class);
    private static final Logger auditLogger = LoggerFactory.getLogger("AUDIT");

    // Security event counters
    private final AtomicLong successfulLogins = new AtomicLong(0);
    private final AtomicLong failedLogins = new AtomicLong(0);
    private final AtomicLong suspiciousRequests = new AtomicLong(0);
    private final AtomicLong rateLimitViolations = new AtomicLong(0);
    private final AtomicLong tokenRefreshes = new AtomicLong(0);
    private final AtomicLong tokenRevocations = new AtomicLong(0);

    // IP-based tracking
    private final ConcurrentHashMap<String, IpSecurityData> ipSecurityData = new ConcurrentHashMap<>();

    /**
     * Log successful authentication
     */
    public void logSuccessfulAuthentication(String userId, String provider, String ipAddress, String userAgent) {
        successfulLogins.incrementAndGet();
        
        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "SUCCESSFUL_LOGIN");
        auditData.put("userId", userId);
        auditData.put("provider", provider);
        auditData.put("ipAddress", ipAddress);
        auditData.put("userAgent", userAgent);
        auditData.put("timestamp", Instant.now().toString());
        
        auditLogger.info("Authentication successful: {}", auditData);
        
        // Update IP data
        updateIpData(ipAddress, SecurityEventType.SUCCESSFUL_LOGIN);
    }

    /**
     * Log failed authentication attempt
     */
    public void logFailedAuthentication(String reason, String ipAddress, String userAgent) {
        failedLogins.incrementAndGet();
        
        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "FAILED_LOGIN");
        auditData.put("reason", reason);
        auditData.put("ipAddress", ipAddress);
        auditData.put("userAgent", userAgent);
        auditData.put("timestamp", Instant.now().toString());
        
        auditLogger.warn("Authentication failed: {}", auditData);
        
        // Update IP data
        updateIpData(ipAddress, SecurityEventType.FAILED_LOGIN);
        
        // Check for brute force attempts
        checkForBruteForceAttack(ipAddress);
    }

    /**
     * Log suspicious request
     */
    public void logSuspiciousRequest(String requestUri, String ipAddress, String userAgent, String reason) {
        suspiciousRequests.incrementAndGet();
        
        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "SUSPICIOUS_REQUEST");
        auditData.put("requestUri", requestUri);
        auditData.put("ipAddress", ipAddress);
        auditData.put("userAgent", userAgent);
        auditData.put("reason", reason);
        auditData.put("timestamp", Instant.now().toString());
        
        auditLogger.warn("Suspicious request detected: {}", auditData);
        
        // Update IP data
        updateIpData(ipAddress, SecurityEventType.SUSPICIOUS_REQUEST);
    }

    /**
     * Log rate limit violation
     */
    public void logRateLimitViolation(String clientKey, String requestUri, String ipAddress) {
        rateLimitViolations.incrementAndGet();
        
        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "RATE_LIMIT_VIOLATION");
        auditData.put("clientKey", clientKey);
        auditData.put("requestUri", requestUri);
        auditData.put("ipAddress", ipAddress);
        auditData.put("timestamp", Instant.now().toString());
        
        auditLogger.warn("Rate limit violation: {}", auditData);
        
        // Update IP data
        updateIpData(ipAddress, SecurityEventType.RATE_LIMIT_VIOLATION);
    }

    /**
     * Log token refresh
     */
    public void logTokenRefresh(String userId, String ipAddress) {
        tokenRefreshes.incrementAndGet();
        
        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "TOKEN_REFRESH");
        auditData.put("userId", userId);
        auditData.put("ipAddress", ipAddress);
        auditData.put("timestamp", Instant.now().toString());
        
        auditLogger.info("Token refreshed: {}", auditData);
    }

    /**
     * Log token revocation
     */
    public void logTokenRevocation(String userId, String ipAddress, String reason) {
        tokenRevocations.incrementAndGet();
        
        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "TOKEN_REVOCATION");
        auditData.put("userId", userId);
        auditData.put("ipAddress", ipAddress);
        auditData.put("reason", reason);
        auditData.put("timestamp", Instant.now().toString());
        
        auditLogger.info("Token revoked: {}", auditData);
    }

    /**
     * Get security metrics
     */
    public Map<String, Object> getSecurityMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("successfulLogins", successfulLogins.get());
        metrics.put("failedLogins", failedLogins.get());
        metrics.put("suspiciousRequests", suspiciousRequests.get());
        metrics.put("rateLimitViolations", rateLimitViolations.get());
        metrics.put("tokenRefreshes", tokenRefreshes.get());
        metrics.put("tokenRevocations", tokenRevocations.get());
        metrics.put("monitoredIps", ipSecurityData.size());
        metrics.put("timestamp", Instant.now().toString());
        
        return metrics;
    }

    /**
     * Check if IP address is suspicious
     */
    public boolean isSuspiciousIp(String ipAddress) {
        IpSecurityData data = ipSecurityData.get(ipAddress);
        if (data == null) {
            return false;
        }
        
        // Consider IP suspicious if:
        // - More than 10 failed logins in the last hour
        // - More than 5 suspicious requests in the last hour
        // - More than 20 rate limit violations in the last hour
        
        long currentTime = System.currentTimeMillis();
        long oneHourAgo = currentTime - (60 * 60 * 1000);
        
        return data.getFailedLoginsInWindow(oneHourAgo) > 10 ||
               data.getSuspiciousRequestsInWindow(oneHourAgo) > 5 ||
               data.getRateLimitViolationsInWindow(oneHourAgo) > 20;
    }

    /**
     * Get IP security data
     */
    public Map<String, Object> getIpSecurityData(String ipAddress) {
        IpSecurityData data = ipSecurityData.get(ipAddress);
        if (data == null) {
            return new HashMap<>();
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("ipAddress", ipAddress);
        result.put("totalFailedLogins", data.getTotalFailedLogins());
        result.put("totalSuspiciousRequests", data.getTotalSuspiciousRequests());
        result.put("totalRateLimitViolations", data.getTotalRateLimitViolations());
        result.put("firstSeen", data.getFirstSeen());
        result.put("lastSeen", data.getLastSeen());
        result.put("isSuspicious", isSuspiciousIp(ipAddress));
        
        return result;
    }

    private void updateIpData(String ipAddress, SecurityEventType eventType) {
        IpSecurityData data = ipSecurityData.computeIfAbsent(ipAddress, 
            k -> new IpSecurityData());
        
        data.recordEvent(eventType);
    }

    private void checkForBruteForceAttack(String ipAddress) {
        IpSecurityData data = ipSecurityData.get(ipAddress);
        if (data == null) {
            return;
        }
        
        long currentTime = System.currentTimeMillis();
        long fiveMinutesAgo = currentTime - (5 * 60 * 1000);
        
        // If more than 5 failed logins in 5 minutes, log as potential brute force
        if (data.getFailedLoginsInWindow(fiveMinutesAgo) > 5) {
            Map<String, Object> auditData = new HashMap<>();
            auditData.put("event", "POTENTIAL_BRUTE_FORCE");
            auditData.put("ipAddress", ipAddress);
            auditData.put("failedAttempts", data.getFailedLoginsInWindow(fiveMinutesAgo));
            auditData.put("timeWindow", "5 minutes");
            auditData.put("timestamp", Instant.now().toString());
            
            auditLogger.error("Potential brute force attack detected: {}", auditData);
        }
    }

    /**
     * Security event types
     */
    private enum SecurityEventType {
        SUCCESSFUL_LOGIN,
        FAILED_LOGIN,
        SUSPICIOUS_REQUEST,
        RATE_LIMIT_VIOLATION
    }

    /**
     * IP security data tracking
     */
    private static class IpSecurityData {
        private final AtomicLong totalFailedLogins = new AtomicLong(0);
        private final AtomicLong totalSuspiciousRequests = new AtomicLong(0);
        private final AtomicLong totalRateLimitViolations = new AtomicLong(0);
        private final ConcurrentHashMap<Long, AtomicLong> failedLoginsByMinute = new ConcurrentHashMap<>();
        private final ConcurrentHashMap<Long, AtomicLong> suspiciousRequestsByMinute = new ConcurrentHashMap<>();
        private final ConcurrentHashMap<Long, AtomicLong> rateLimitViolationsByMinute = new ConcurrentHashMap<>();
        private volatile long firstSeen = System.currentTimeMillis();
        private volatile long lastSeen = System.currentTimeMillis();

        public void recordEvent(SecurityEventType eventType) {
            long currentTime = System.currentTimeMillis();
            long minute = currentTime / (60 * 1000); // Round to minute
            
            lastSeen = currentTime;
            
            switch (eventType) {
                case FAILED_LOGIN:
                    totalFailedLogins.incrementAndGet();
                    failedLoginsByMinute.computeIfAbsent(minute, k -> new AtomicLong(0)).incrementAndGet();
                    break;
                case SUSPICIOUS_REQUEST:
                    totalSuspiciousRequests.incrementAndGet();
                    suspiciousRequestsByMinute.computeIfAbsent(minute, k -> new AtomicLong(0)).incrementAndGet();
                    break;
                case RATE_LIMIT_VIOLATION:
                    totalRateLimitViolations.incrementAndGet();
                    rateLimitViolationsByMinute.computeIfAbsent(minute, k -> new AtomicLong(0)).incrementAndGet();
                    break;
            }
        }

        public long getFailedLoginsInWindow(long windowStart) {
            long windowStartMinute = windowStart / (60 * 1000);
            return failedLoginsByMinute.entrySet().stream()
                .filter(entry -> entry.getKey() >= windowStartMinute)
                .mapToLong(entry -> entry.getValue().get())
                .sum();
        }

        public long getSuspiciousRequestsInWindow(long windowStart) {
            long windowStartMinute = windowStart / (60 * 1000);
            return suspiciousRequestsByMinute.entrySet().stream()
                .filter(entry -> entry.getKey() >= windowStartMinute)
                .mapToLong(entry -> entry.getValue().get())
                .sum();
        }

        public long getRateLimitViolationsInWindow(long windowStart) {
            long windowStartMinute = windowStart / (60 * 1000);
            return rateLimitViolationsByMinute.entrySet().stream()
                .filter(entry -> entry.getKey() >= windowStartMinute)
                .mapToLong(entry -> entry.getValue().get())
                .sum();
        }

        // Getters
        public long getTotalFailedLogins() { return totalFailedLogins.get(); }
        public long getTotalSuspiciousRequests() { return totalSuspiciousRequests.get(); }
        public long getTotalRateLimitViolations() { return totalRateLimitViolations.get(); }
        public long getFirstSeen() { return firstSeen; }
        public long getLastSeen() { return lastSeen; }
    }
}
