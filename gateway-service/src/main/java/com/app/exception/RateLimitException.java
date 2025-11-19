package com.app.exception;

import java.util.Map;
import java.util.HashMap;

/**
 * Exception for rate limiting and security-related errors
 */
public class RateLimitException extends GatewayException {
    
    private final String clientKey;
    private final String limitType;
    private final int currentCount;
    private final int maxAllowed;
    private final long resetTimeSeconds;
    
    public RateLimitException(ErrorCode errorCode, String clientKey, String limitType, 
                            int currentCount, int maxAllowed, long resetTimeSeconds) {
        super(errorCode, createMessage(limitType, currentCount, maxAllowed, resetTimeSeconds), 
              createDetails(clientKey, limitType, currentCount, maxAllowed, resetTimeSeconds));
        this.clientKey = clientKey;
        this.limitType = limitType;
        this.currentCount = currentCount;
        this.maxAllowed = maxAllowed;
        this.resetTimeSeconds = resetTimeSeconds;
    }
    
    private static String createMessage(String limitType, int currentCount, int maxAllowed, long resetTimeSeconds) {
        return String.format("Rate limit exceeded for %s: %d/%d requests. Reset in %d seconds", 
            limitType, currentCount, maxAllowed, resetTimeSeconds);
    }
    
    private static Map<String, Object> createDetails(String clientKey, String limitType, 
                                                   int currentCount, int maxAllowed, long resetTimeSeconds) {
        Map<String, Object> details = new HashMap<>();
        details.put("clientKey", clientKey);
        details.put("limitType", limitType);
        details.put("currentCount", currentCount);
        details.put("maxAllowed", maxAllowed);
        details.put("resetTimeSeconds", resetTimeSeconds);
        return details;
    }
    
    public String getClientKey() {
        return clientKey;
    }
    
    public String getLimitType() {
        return limitType;
    }
    
    public int getCurrentCount() {
        return currentCount;
    }
    
    public int getMaxAllowed() {
        return maxAllowed;
    }
    
    public long getResetTimeSeconds() {
        return resetTimeSeconds;
    }
    
    /**
     * Create authentication rate limit exception
     */
    public static RateLimitException authRateLimit(String clientKey, int currentCount, int maxAllowed, long resetTime) {
        return new RateLimitException(ErrorCode.RATE_LIMIT_EXCEEDED, clientKey, "AUTH_RATE_LIMIT", 
            currentCount, maxAllowed, resetTime);
    }
    
    /**
     * Create API rate limit exception
     */
    public static RateLimitException apiRateLimit(String clientKey, int currentCount, int maxAllowed, long resetTime) {
        return new RateLimitException(ErrorCode.TOO_MANY_REQUESTS, clientKey, "API_RATE_LIMIT", 
            currentCount, maxAllowed, resetTime);
    }
    
    /**
     * Create brute force detection exception
     */
    public static RateLimitException bruteForceDetected(String clientKey, int attemptCount) {
        return new RateLimitException(ErrorCode.BRUTE_FORCE_DETECTED, clientKey, "BRUTE_FORCE_PROTECTION", 
            attemptCount, 5, 3600); // 1 hour lockout
    }
}
