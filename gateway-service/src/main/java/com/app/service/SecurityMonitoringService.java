package com.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
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

    /**
     * Log successful authentication
     */
    public void logSuccessfulAuthentication(String userId, String provider) {
        successfulLogins.incrementAndGet();

        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "SUCCESSFUL_LOGIN");
        auditData.put("userId", userId);
        auditData.put("provider", provider);
        auditData.put("timestamp", Instant.now().toString());

        auditLogger.info("Authentication successful: {}", auditData);
    }

    /**
     * Log failed authentication attempt
     */
    public void logFailedAuthentication(String reason) {
        failedLogins.incrementAndGet();

        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "FAILED_LOGIN");
        auditData.put("reason", reason);
        auditData.put("timestamp", Instant.now().toString());

        auditLogger.warn("Authentication failed: {}", auditData);
    }

    /**
     * Log suspicious request
     */
    public void logSuspiciousRequest(String requestUri, String reason) {
        suspiciousRequests.incrementAndGet();

        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "SUSPICIOUS_REQUEST");
        auditData.put("requestUri", requestUri);
        auditData.put("reason", reason);
        auditData.put("timestamp", Instant.now().toString());

        auditLogger.warn("Suspicious request detected: {}", auditData);
    }

    /**
     * Log rate limit violation
     */
    public void logRateLimitViolation(String clientKey, String requestUri) {
        rateLimitViolations.incrementAndGet();

        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "RATE_LIMIT_VIOLATION");
        auditData.put("clientKey", clientKey);
        auditData.put("requestUri", requestUri);
        auditData.put("timestamp", Instant.now().toString());

        auditLogger.warn("Rate limit violation: {}", auditData);
    }

    /**
     * Log token refresh
     */
    public void logTokenRefresh(String userId) {
        tokenRefreshes.incrementAndGet();

        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "TOKEN_REFRESH");
        auditData.put("userId", userId);
        auditData.put("timestamp", Instant.now().toString());

        auditLogger.info("Token refreshed: {}", auditData);
    }

    /**
     * Log token revocation
     */
    public void logTokenRevocation(String userId, String reason) {
        tokenRevocations.incrementAndGet();

        Map<String, Object> auditData = new HashMap<>();
        auditData.put("event", "TOKEN_REVOCATION");
        auditData.put("userId", userId);
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
        metrics.put("timestamp", Instant.now().toString());

        return metrics;
    }
}
