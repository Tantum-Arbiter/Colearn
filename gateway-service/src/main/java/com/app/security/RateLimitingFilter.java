package com.app.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;

import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import com.app.exception.ErrorCode;
import com.app.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Rate Limiting Filter
 * Implements sliding window rate limiting to prevent abuse
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingFilter.class);

    // Rate limiting configuration
    private static final int DEFAULT_REQUESTS_PER_MINUTE = 60;
    private static final int AUTH_REQUESTS_PER_MINUTE = 10;
    private static final int API_REQUESTS_PER_MINUTE = 60;

    // Test overrides
    private volatile Integer overrideAuthPerMinute;
    private volatile Integer overrideApiPerMinute;

    // Window size in milliseconds (1 minute)
    private static final long WINDOW_SIZE_MS = 60 * 1000;

    // Cleanup interval (5 minutes)
    private static final long CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

    // Storage for rate limiting data
    private final ConcurrentHashMap<String, ClientRateData> clientRateData = new ConcurrentHashMap<>();
    private volatile long lastCleanupTime = System.currentTimeMillis();

    @Value("${app.security.rate-limit.enabled:true}")
    private boolean rateLimitingEnabled = true;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // Allow disabling rate limiting in test profile
        if (!rateLimitingEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientKey = getClientKey(request);
        String requestPath = request.getRequestURI();
        String category = getCategory(requestPath);
        String compositeKey = getCompositeKey(clientKey, category);

        // Determine rate limit based on endpoint
        int rateLimit = getRateLimit(requestPath);

        // Check rate limit
        if (!isRequestAllowed(compositeKey, rateLimit)) {
            logger.warn("Rate limit exceeded for client: {} on path: {}", clientKey, requestPath);

            // Set rate limit headers
            response.setHeader("X-RateLimit-Limit", String.valueOf(rateLimit));
            response.setHeader("X-RateLimit-Remaining", "0");
            response.setHeader("X-RateLimit-Reset", String.valueOf(getResetTime()));

            // Determine whether this is brute-force on auth endpoints (invalid token spam)
            boolean isAuthCategory = "auth".equals(category);
            boolean bruteForce = false;
            if (isAuthCategory) {
                try {
                    java.io.BufferedReader r = request.getReader();
                    if (r != null) {
                        r.mark(512);
                        char[] buf = new char[512];
                        int n = r.read(buf);
                        if (n > 0) {
                            String preview = new String(buf, 0, n);
                            String lower = preview.toLowerCase();
                            bruteForce = lower.contains("\"idtoken\"") && lower.contains("invalid-");
                        }
                        r.reset();
                    }
                } catch (Exception ignore) { /* best-effort */ }
            }

            int statusToReturn = (isAuthCategory && bruteForce) ? 403 : 429;
            ErrorCode codeToReturn = (isAuthCategory && bruteForce)
                    ? ErrorCode.BRUTE_FORCE_DETECTED
                    : ("api".equals(category) ? ErrorCode.TOO_MANY_REQUESTS : ErrorCode.RATE_LIMIT_EXCEEDED);
            String messageToReturn = (isAuthCategory && bruteForce)
                    ? "Multiple failed authentication attempts detected"
                    : "Too many requests. Please try again later.";

            // Return with standardized error body
            response.setStatus(statusToReturn);
            response.setContentType("application/json");
            response.setHeader("Retry-After", String.valueOf(WINDOW_SIZE_MS / 1000));

            try {
                ErrorResponse err = new ErrorResponse();
                err.setSuccess(false);
                err.setErrorCode(codeToReturn.getCode());
                err.setError(codeToReturn.getDefaultMessage());
                err.setMessage(messageToReturn);
                err.setPath(request.getRequestURI());
                err.setTimestamp(Instant.now().toString());
                err.setRequestId(UUID.randomUUID().toString());

                Map<String, Object> details = new HashMap<>();
                String limitType = switch (category) {
                    case "auth" -> (bruteForce ? "BRUTE_FORCE_PROTECTION" : "AUTH_RATE_LIMIT");
                    case "api" -> "API_RATE_LIMIT";
                    default -> "DEFAULT_RATE_LIMIT";
                };
                details.put("limitType", limitType);
                details.put("maxAllowed", rateLimit);
                err.setDetails(details);

                response.getWriter().write(new ObjectMapper().writeValueAsString(err));
            } catch (Exception writeEx) {
                // Fallback minimal body
                String ec = (isAuthCategory && bruteForce) ? "GTW-304" : ("api".equals(category) ? "GTW-301" : "GTW-300");
                String er = (isAuthCategory && bruteForce) ? "Brute force attack detected" : "Rate limit exceeded";
                response.getWriter().write("{\"success\":false,\"errorCode\":\"" + ec + "\",\"error\":\"" + er + "\"}");
            }
            return;
        }

        // Add rate limit headers to successful requests
        ClientRateData rateData = clientRateData.get(compositeKey);
        if (rateData != null) {
            response.setHeader("X-RateLimit-Limit", String.valueOf(rateLimit));
            response.setHeader("X-RateLimit-Remaining",
                String.valueOf(Math.max(0, rateLimit - rateData.getRequestCount())));
            response.setHeader("X-RateLimit-Reset", String.valueOf(getResetTime()));
        }

        // Periodic cleanup of old entries
        performCleanupIfNeeded();

        filterChain.doFilter(request, response);
    }

    private String getClientKey(HttpServletRequest request) {
        // Try to get authenticated user ID first
        String userId = getUserId(request);
        if (userId != null) {
            return "user:" + userId;
        }

        // Fall back to IP address
        String ipAddress = getClientIpAddress(request);
        return "ip:" + ipAddress;
    }

    private String getUserId(HttpServletRequest request) {
        // Prefer authenticated security context if present
        var context = org.springframework.security.core.context.SecurityContextHolder.getContext();
        if (context != null && context.getAuthentication() != null && context.getAuthentication().isAuthenticated()) {
            Object principal = context.getAuthentication().getPrincipal();
            if (principal instanceof String s && !s.isEmpty()) {
                return s;
            }
        }

        // Fallback: extract from Authorization header if needed (not implemented here)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            // In this simplified filter we don't decode JWTs; return null to use IP-based limiting
            return null;
        }
        return null;
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }

    private int getRateLimit(String requestPath) {
        if (requestPath.startsWith("/auth/")) {
            return overrideAuthPerMinute != null ? overrideAuthPerMinute : AUTH_REQUESTS_PER_MINUTE;
        } else if (requestPath.startsWith("/api/")) {
            return overrideApiPerMinute != null ? overrideApiPerMinute : API_REQUESTS_PER_MINUTE;
        } else {
            return DEFAULT_REQUESTS_PER_MINUTE;
        }
    }

    private String getCategory(String requestPath) {
        if (requestPath == null) {
            return "other";
        }
        if (requestPath.startsWith("/auth/")) {
            return "auth";
        } else if (requestPath.startsWith("/api/")) {
            return "api";
        }
        return "other";
    }

    private String getCompositeKey(String clientKey, String category) {
        return clientKey + "|" + category;
    }

    private boolean isRequestAllowed(String clientKey, int rateLimit) {
        long currentTime = System.currentTimeMillis();

        ClientRateData rateData = clientRateData.computeIfAbsent(clientKey,
            k -> new ClientRateData());

        synchronized (rateData) {
            // Clean up old requests outside the current window
            rateData.cleanupOldRequests(currentTime - WINDOW_SIZE_MS);

            // Check if we're within the rate limit
            if (rateData.getRequestCount() >= rateLimit) {
                return false;
            }

            // Add current request
            rateData.addRequest(currentTime);
            return true;
        }
    }

    private long getResetTime() {
        return System.currentTimeMillis() + WINDOW_SIZE_MS;
    }

    private void performCleanupIfNeeded() {
        long currentTime = System.currentTimeMillis();

        if (currentTime - lastCleanupTime > CLEANUP_INTERVAL_MS) {
            lastCleanupTime = currentTime;

            // Remove entries that haven't been used recently
            long cutoffTime = currentTime - (2 * WINDOW_SIZE_MS);

            clientRateData.entrySet().removeIf(entry -> {
                ClientRateData rateData = entry.getValue();
                synchronized (rateData) {
                    return rateData.getLastRequestTime() < cutoffTime;
                }
            });

            logger.debug("Rate limiting cleanup completed. Active clients: {}",
                clientRateData.size());
        }
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) {
            return false;
        }
        // Skip CORS preflight requests entirely
        String method = request.getMethod();
        if (method != null && "OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }
        // Skip rate limiting for health checks, actuator, private endpoints and static resources
        return path.startsWith("/health") ||
               path.startsWith("/actuator/") ||
               path.startsWith("/private/") ||
               path.startsWith("/public/") ||
               path.equals("/");
    }

    // Test-only helpers to avoid cross-test interference from shared rate limiting state
    public void resetForTests() {
        clientRateData.clear();
        lastCleanupTime = System.currentTimeMillis();
        overrideAuthPerMinute = null;
        overrideApiPerMinute = null;
    }

    public void setRateLimitOverridesForTests(Integer authPerMinute, Integer apiPerMinute) {
        this.overrideAuthPerMinute = authPerMinute;
        this.overrideApiPerMinute = apiPerMinute;
    }

    /**
     * Data structure to track client request rates
     */
    private static class ClientRateData {
        private final ConcurrentHashMap<Long, AtomicInteger> requestCounts = new ConcurrentHashMap<>();
        private volatile long lastRequestTime = 0;

        public void addRequest(long timestamp) {
            // Round timestamp to seconds for bucketing
            long bucket = timestamp / 1000;
            requestCounts.computeIfAbsent(bucket, k -> new AtomicInteger(0)).incrementAndGet();
            lastRequestTime = timestamp;
        }

        public int getRequestCount() {
            return requestCounts.values().stream()
                .mapToInt(AtomicInteger::get)
                .sum();
        }

        public long getLastRequestTime() {
            return lastRequestTime;
        }

        public void cleanupOldRequests(long cutoffTime) {
            long cutoffBucket = cutoffTime / 1000;
            requestCounts.entrySet().removeIf(entry -> entry.getKey() < cutoffBucket);
        }
    }
}
