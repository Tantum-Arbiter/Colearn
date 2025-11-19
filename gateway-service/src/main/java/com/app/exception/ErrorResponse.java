package com.app.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

/**
 * Standardized error response format for the Gateway Service
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    
    @JsonProperty("success")
    private boolean success = false;
    
    @JsonProperty("errorCode")
    private String errorCode;
    
    @JsonProperty("error")
    private String error;
    
    @JsonProperty("message")
    private String message;
    
    @JsonProperty("path")
    private String path;
    
    @JsonProperty("timestamp")
    private String timestamp;
    
    @JsonProperty("requestId")
    private String requestId;
    
    @JsonProperty("details")
    private Map<String, Object> details;
    
    public ErrorResponse() {}
    
    public ErrorResponse(String errorCode, String error, String message) {
        this.errorCode = errorCode;
        this.error = error;
        this.message = message;
    }
    
    // Getters and Setters
    
    public boolean isSuccess() {
        return success;
    }
    
    public void setSuccess(boolean success) {
        this.success = success;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }
    
    public String getError() {
        return error;
    }
    
    public void setError(String error) {
        this.error = error;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public String getPath() {
        return path;
    }
    
    public void setPath(String path) {
        this.path = path;
    }
    
    public String getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
    
    public String getRequestId() {
        return requestId;
    }
    
    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
    
    public Map<String, Object> getDetails() {
        return details;
    }
    
    public void setDetails(Map<String, Object> details) {
        this.details = details;
    }
    
    @Override
    public String toString() {
        return "ErrorResponse{" +
                "success=" + success +
                ", errorCode='" + errorCode + '\'' +
                ", error='" + error + '\'' +
                ", message='" + message + '\'' +
                ", path='" + path + '\'' +
                ", timestamp='" + timestamp + '\'' +
                ", requestId='" + requestId + '\'' +
                ", details=" + details +
                '}';
    }
}
