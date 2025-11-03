package com.app.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

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
    private static final int API_REQUESTS_PER_MINUTE = 100;
    
    // Window size in milliseconds (1 minute)
    private static final long WINDOW_SIZE_MS = 60 * 1000;
    
    // Cleanup interval (5 minutes)
    private static final long CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
    
    // Storage for rate limiting data
    private final ConcurrentHashMap<String, ClientRateData> clientRateData = new ConcurrentHashMap<>();
    private volatile long lastCleanupTime = System.currentTimeMillis();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String clientKey = getClientKey(request);
        String requestPath = request.getRequestURI();
        
        // Determine rate limit based on endpoint
        int rateLimit = getRateLimit(requestPath);
        
        // Check rate limit
        if (!isRequestAllowed(clientKey, rateLimit)) {
            logger.warn("Rate limit exceeded for client: {} on path: {}", clientKey, requestPath);
            
            // Set rate limit headers
            response.setHeader("X-RateLimit-Limit", String.valueOf(rateLimit));
            response.setHeader("X-RateLimit-Remaining", "0");
            response.setHeader("X-RateLimit-Reset", String.valueOf(getResetTime()));
            
            // Return 429 Too Many Requests
            response.setStatus(429); // HTTP 429 Too Many Requests
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"error\":\"Rate limit exceeded\",\"message\":\"Too many requests. Please try again later.\"}"
            );
            return;
        }
        
        // Add rate limit headers to successful requests
        ClientRateData rateData = clientRateData.get(clientKey);
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
        // Extract user ID from JWT token if available
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                // In a real implementation, you'd decode the JWT here
                // For now, return null to use IP-based rate limiting
                return null;
            } catch (Exception e) {
                return null;
            }
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
            return AUTH_REQUESTS_PER_MINUTE;
        } else if (requestPath.startsWith("/api/")) {
            return API_REQUESTS_PER_MINUTE;
        } else {
            return DEFAULT_REQUESTS_PER_MINUTE;
        }
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
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        
        // Skip rate limiting for health checks and static resources
        return path.startsWith("/health") ||
               path.startsWith("/actuator/health") ||
               path.startsWith("/public/") ||
               path.equals("/");
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
