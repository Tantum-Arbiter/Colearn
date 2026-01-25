package com.app.exception;

import java.time.Instant;
import java.util.Map;

public class GatewayException extends RuntimeException {
    
    private final ErrorCode errorCode;
    private final String customMessage;
    private final Map<String, Object> details;
    private final Instant timestamp;
    private final String requestId;
    
    public GatewayException(ErrorCode errorCode) {
        this(errorCode, null, null, null, null);
    }
    
    public GatewayException(ErrorCode errorCode, String customMessage) {
        this(errorCode, customMessage, null, null, null);
    }
    
    public GatewayException(ErrorCode errorCode, String customMessage, Throwable cause) {
        this(errorCode, customMessage, cause, null, null);
    }
    
    public GatewayException(ErrorCode errorCode, String customMessage, Map<String, Object> details) {
        this(errorCode, customMessage, null, details, null);
    }
    
    public GatewayException(ErrorCode errorCode, String customMessage, Throwable cause, 
                          Map<String, Object> details, String requestId) {
        super(customMessage != null ? customMessage : errorCode.getDefaultMessage(), cause);
        this.errorCode = errorCode;
        this.customMessage = customMessage;
        this.details = details;
        this.timestamp = Instant.now();
        this.requestId = requestId;
    }
    
    public ErrorCode getErrorCode() {
        return errorCode;
    }
    
    public String getCustomMessage() {
        return customMessage;
    }
    
    public Map<String, Object> getDetails() {
        return details;
    }
    
    public Instant getTimestamp() {
        return timestamp;
    }
    
    public String getRequestId() {
        return requestId;
    }
    
    public String getEffectiveMessage() {
        return customMessage != null ? customMessage : errorCode.getDefaultMessage();
    }
    
    public int getHttpStatusCode() {
        return errorCode.getHttpStatusCode();
    }
}
