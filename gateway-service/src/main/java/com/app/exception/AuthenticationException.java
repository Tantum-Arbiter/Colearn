package com.app.exception;

import java.util.Map;

/**
 * Exception for authentication-related errors
 */
public class AuthenticationException extends GatewayException {
    
    private final String provider;
    private final String tokenType;
    
    public AuthenticationException(ErrorCode errorCode) {
        this(errorCode, null, null, null);
    }
    
    public AuthenticationException(ErrorCode errorCode, String customMessage) {
        this(errorCode, customMessage, null, null);
    }
    
    public AuthenticationException(ErrorCode errorCode, String customMessage, String provider) {
        this(errorCode, customMessage, provider, null);
    }
    
    public AuthenticationException(ErrorCode errorCode, String customMessage, String provider, String tokenType) {
        super(errorCode, customMessage);
        this.provider = provider;
        this.tokenType = tokenType;
    }
    
    public AuthenticationException(ErrorCode errorCode, String customMessage, Throwable cause, 
                                 String provider, String tokenType) {
        super(errorCode, customMessage, cause);
        this.provider = provider;
        this.tokenType = tokenType;
    }
    
    public AuthenticationException(ErrorCode errorCode, String customMessage, Throwable cause, 
                                 Map<String, Object> details, String requestId, String provider, String tokenType) {
        super(errorCode, customMessage, cause, details, requestId);
        this.provider = provider;
        this.tokenType = tokenType;
    }
    
    public String getProvider() {
        return provider;
    }
    
    public String getTokenType() {
        return tokenType;
    }
    
    /**
     * Create Google authentication exception
     */
    public static AuthenticationException googleAuthFailed(String message, Throwable cause) {
        return new AuthenticationException(ErrorCode.INVALID_GOOGLE_TOKEN, message, cause, "google", "id_token");
    }
    
    /**
     * Create Apple authentication exception
     */
    public static AuthenticationException appleAuthFailed(String message, Throwable cause) {
        return new AuthenticationException(ErrorCode.INVALID_APPLE_TOKEN, message, cause, "apple", "id_token");
    }
    
    /**
     * Create invalid token exception
     */
    public static AuthenticationException invalidToken(String tokenType) {
        return new AuthenticationException(ErrorCode.INVALID_TOKEN, "Invalid " + tokenType, null, tokenType);
    }
    
    /**
     * Create expired token exception
     */
    public static AuthenticationException expiredToken(String tokenType) {
        return new AuthenticationException(ErrorCode.TOKEN_EXPIRED, "Token has expired", null, tokenType);
    }
}
