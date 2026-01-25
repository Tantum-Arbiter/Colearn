package com.app.exception;

import java.util.Map;
import java.util.HashMap;

public class DownstreamServiceException extends GatewayException {
    
    private final String serviceName;
    private final String endpoint;
    private final int statusCode;
    private final long responseTime;
    
    public DownstreamServiceException(ErrorCode errorCode, String serviceName) {
        this(errorCode, null, serviceName, null, 0, 0);
    }
    
    public DownstreamServiceException(ErrorCode errorCode, String customMessage, String serviceName) {
        this(errorCode, customMessage, serviceName, null, 0, 0);
    }
    
    public DownstreamServiceException(ErrorCode errorCode, String customMessage, String serviceName, 
                                    String endpoint, int statusCode, long responseTime) {
        super(errorCode, customMessage, createDetails(serviceName, endpoint, statusCode, responseTime));
        this.serviceName = serviceName;
        this.endpoint = endpoint;
        this.statusCode = statusCode;
        this.responseTime = responseTime;
    }
    
    public DownstreamServiceException(ErrorCode errorCode, String customMessage, Throwable cause, 
                                    String serviceName, String endpoint, int statusCode, long responseTime) {
        super(errorCode, customMessage, cause, createDetails(serviceName, endpoint, statusCode, responseTime), null);
        this.serviceName = serviceName;
        this.endpoint = endpoint;
        this.statusCode = statusCode;
        this.responseTime = responseTime;
    }
    
    private static Map<String, Object> createDetails(String serviceName, String endpoint, 
                                                   int statusCode, long responseTime) {
        Map<String, Object> details = new HashMap<>();
        if (serviceName != null) {
            details.put("service", serviceName);
        }
        if (endpoint != null) {
            details.put("endpoint", endpoint);
        }
        if (statusCode > 0) {
            details.put("statusCode", statusCode);
        }
        if (responseTime > 0) {
            details.put("responseTimeMs", responseTime);
        }
        return details.isEmpty() ? null : details;
    }
    
    public String getServiceName() {
        return serviceName;
    }
    
    public String getEndpoint() {
        return endpoint;
    }
    
    public int getStatusCode() {
        return statusCode;
    }
    
    public long getResponseTime() {
        return responseTime;
    }
    
    public static DownstreamServiceException firebaseError(String message, Throwable cause) {
        return new DownstreamServiceException(ErrorCode.FIREBASE_SERVICE_ERROR, message, cause, 
            "Firebase", null, 0, 0);
    }
    
    public static DownstreamServiceException googleOAuthError(String endpoint, int statusCode, long responseTime) {
        return new DownstreamServiceException(ErrorCode.GOOGLE_OAUTH_SERVICE_ERROR, 
            "Google OAuth service error", "Google OAuth", endpoint, statusCode, responseTime);
    }
    
    public static DownstreamServiceException appleOAuthError(String endpoint, int statusCode, long responseTime) {
        return new DownstreamServiceException(ErrorCode.APPLE_OAUTH_SERVICE_ERROR, 
            "Apple OAuth service error", "Apple OAuth", endpoint, statusCode, responseTime);
    }
    
    public static DownstreamServiceException timeout(String serviceName, String endpoint, long responseTime) {
        return new DownstreamServiceException(ErrorCode.DOWNSTREAM_TIMEOUT, 
            "Service timeout after " + responseTime + "ms", serviceName, endpoint, 0, responseTime);
    }
    
    public static DownstreamServiceException connectionError(String serviceName, String endpoint, Throwable cause) {
        return new DownstreamServiceException(ErrorCode.DOWNSTREAM_CONNECTION_ERROR, 
            "Unable to connect to " + serviceName, cause, serviceName, endpoint, 0, 0);
    }
    
    public static DownstreamServiceException circuitBreakerOpen(String serviceName) {
        return new DownstreamServiceException(ErrorCode.CIRCUIT_BREAKER_OPEN, 
            "Circuit breaker is open for " + serviceName, serviceName);
    }
    
    public static DownstreamServiceException quotaExceeded(String serviceName, String quotaType) {
        Map<String, Object> details = new HashMap<>();
        details.put("service", serviceName);
        details.put("quotaType", quotaType);
        
        return new DownstreamServiceException(ErrorCode.FIREBASE_QUOTA_EXCEEDED, 
            serviceName + " quota exceeded: " + quotaType, serviceName, null, 429, 0);
    }
}
