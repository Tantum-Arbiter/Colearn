package com.app.exception;

public enum ErrorCode {
    
    // Authentication & Authorization (GTW-001 to GTW-099)
    AUTHENTICATION_FAILED("GTW-001", "Authentication failed"),
    INVALID_TOKEN("GTW-002", "Invalid or expired token"),
    INVALID_GOOGLE_TOKEN("GTW-003", "Invalid Google ID token"),
    INVALID_APPLE_TOKEN("GTW-004", "Invalid Apple ID token"),
    TOKEN_EXPIRED("GTW-005", "Token has expired"),
    INVALID_REFRESH_TOKEN("GTW-006", "Invalid or expired refresh token"),
    UNAUTHORIZED_ACCESS("GTW-007", "Unauthorized access to resource"),
    INSUFFICIENT_PERMISSIONS("GTW-008", "Insufficient permissions for this operation"),
    SESSION_EXPIRED("GTW-009", "User session has expired"),
    ACCOUNT_LOCKED("GTW-010", "Account has been locked due to security violations"),
    OAUTH_STATE_MISMATCH("GTW-011", "OAuth state mismatch"),
    NONCE_MISSING_OR_INVALID("GTW-012", "Nonce missing or invalid"),
    INVALID_AUDIENCE("GTW-013", "Token audience is not allowed"),
    INVALID_ISSUER("GTW-014", "Token issuer is not allowed"),
    TOKEN_NOT_YET_VALID("GTW-015", "Token is not yet valid"),
    REFRESH_TOKEN_REVOKED("GTW-016", "Refresh token has been revoked"),

    // Validation & Request errors (GTW-100 to GTW-199)
    INVALID_REQUEST("GTW-100", "Invalid request format"),
    MISSING_REQUIRED_FIELD("GTW-101", "Required field is missing"),
    INVALID_REQUEST_BODY("GTW-102", "Request body is invalid or malformed"),
    INVALID_PARAMETER("GTW-103", "Invalid parameter value"),
    REQUEST_TOO_LARGE("GTW-104", "Request payload too large"),
    UNSUPPORTED_MEDIA_TYPE("GTW-105", "Unsupported media type"),
    MALFORMED_JSON("GTW-106", "Malformed JSON in request body"),
    INVALID_EMAIL_FORMAT("GTW-107", "Invalid email address format"),
    INVALID_DATE_FORMAT("GTW-108", "Invalid date format"),
    FIELD_VALIDATION_FAILED("GTW-109", "Field validation failed"),
    MISSING_REQUIRED_HEADER("GTW-110", "Required header is missing"),
    INVALID_HEADER("GTW-111", "Invalid header value"),
    UNSUPPORTED_ACCEPT("GTW-112", "Unsupported Accept header"),
    INVALID_NICKNAME("GTW-113", "Invalid nickname - must be 1-20 characters"),
    INVALID_AVATAR_TYPE("GTW-114", "Invalid avatar type - must be 'boy' or 'girl'"),
    INVALID_AVATAR_ID("GTW-115", "Invalid avatar ID"),
    INVALID_PROFILE_DATA("GTW-116", "Invalid profile data"),

    // Downstream service errors (GTW-200 to GTW-299)
    DOWNSTREAM_SERVICE_ERROR("GTW-200", "Downstream service error"),
    FIREBASE_SERVICE_ERROR("GTW-201", "Firebase service unavailable"),
    GOOGLE_OAUTH_SERVICE_ERROR("GTW-202", "Google OAuth service unavailable"),
    APPLE_OAUTH_SERVICE_ERROR("GTW-203", "Apple OAuth service unavailable"),
    DOWNSTREAM_TIMEOUT("GTW-204", "Downstream service timeout"),
    DOWNSTREAM_CONNECTION_ERROR("GTW-205", "Unable to connect to downstream service"),
    FIREBASE_QUOTA_EXCEEDED("GTW-206", "Firebase quota exceeded"),
    EXTERNAL_API_RATE_LIMIT("GTW-207", "External API rate limit exceeded"),
    SERVICE_TEMPORARILY_UNAVAILABLE("GTW-208", "Service temporarily unavailable"),
    CIRCUIT_BREAKER_OPEN("GTW-209", "Circuit breaker is open for downstream service"),
    DOWNSTREAM_BAD_RESPONSE("GTW-210", "Downstream returned invalid response"),
    DOWNSTREAM_UNEXPECTED_STATUS("GTW-211", "Downstream returned unexpected status"),
    CMS_MANIFEST_INVALID("GTW-212", "CMS manifest invalid"),
    DOWNSTREAM_DNS_ERROR("GTW-213", "Downstream DNS resolution failed"),
    DOWNSTREAM_SSL_ERROR("GTW-214", "Downstream SSL/TLS handshake failed"),

    // Rate limiting & Security errors (GTW-300 to GTW-399)
    RATE_LIMIT_EXCEEDED("GTW-300", "Rate limit exceeded"),
    TOO_MANY_REQUESTS("GTW-301", "Too many requests from this client"),
    SUSPICIOUS_ACTIVITY("GTW-302", "Suspicious activity detected"),
    IP_BLOCKED("GTW-303", "IP address has been blocked"),
    BRUTE_FORCE_DETECTED("GTW-304", "Brute force attack detected"),
    INVALID_USER_AGENT("GTW-305", "Invalid or suspicious user agent"),
    REQUEST_VALIDATION_FAILED("GTW-306", "Request validation failed"),
    SECURITY_VIOLATION("GTW-307", "Security policy violation"),
    CSRF_TOKEN_INVALID("GTW-308", "CSRF token is invalid or missing"),
    CORS_VIOLATION("GTW-309", "CORS policy violation"),
    REPLAY_ATTACK_DETECTED("GTW-311", "Replay attack detected"),

    // User management errors (GTW-400 to GTW-499)
    USER_NOT_FOUND("GTW-400", "User not found"),
    USER_ALREADY_EXISTS("GTW-401", "User already exists"),
    PROFILE_UPDATE_FAILED("GTW-402", "Failed to update user profile"),
    CHILD_PROFILE_NOT_FOUND("GTW-403", "Child profile not found"),
    CHILD_LIMIT_EXCEEDED("GTW-404", "Maximum number of child profiles exceeded"),
    INVALID_CHILD_DATA("GTW-405", "Invalid child profile data"),
    PREFERENCES_UPDATE_FAILED("GTW-406", "Failed to update user preferences"),
    ACCOUNT_DEACTIVATED("GTW-407", "User account has been deactivated"),
    EMAIL_NOT_VERIFIED("GTW-408", "Email address not verified"),
    PROFILE_INCOMPLETE("GTW-409", "User profile is incomplete"),
    CONCURRENT_UPDATE_CONFLICT("GTW-410", "Resource update conflict"),
    PROFILE_NOT_FOUND("GTW-411", "User profile not found"),

    // System & Infrastructure errors (GTW-500 to GTW-599)
    INTERNAL_SERVER_ERROR("GTW-500", "Internal server error"),
    DATABASE_ERROR("GTW-501", "Database operation failed"),
    CONFIGURATION_ERROR("GTW-502", "System configuration error"),
    SERVICE_UNAVAILABLE("GTW-503", "Service temporarily unavailable"),
    TIMEOUT_ERROR("GTW-504", "Request timeout"),
    INSUFFICIENT_RESOURCES("GTW-505", "Insufficient system resources"),
    MAINTENANCE_MODE("GTW-506", "System is in maintenance mode"),
    VERSION_MISMATCH("GTW-507", "API version mismatch"),
    FEATURE_NOT_AVAILABLE("GTW-508", "Feature not available in this environment"),
    SYSTEM_OVERLOADED("GTW-509", "System is currently overloaded"),
    STORAGE_UNAVAILABLE("GTW-512", "Object storage unavailable"),
    CACHE_UNAVAILABLE("GTW-513", "Cache unavailable"),
    CONFIG_SECRET_MISSING("GTW-515", "Required configuration secret missing");
    
    private final String code;
    private final String defaultMessage;
    
    ErrorCode(String code, String defaultMessage) {
        this.code = code;
        this.defaultMessage = defaultMessage;
    }
    
    public String getCode() {
        return code;
    }
    
    public String getDefaultMessage() {
        return defaultMessage;
    }
    
    public static ErrorCode fromCode(String code) {
        for (ErrorCode errorCode : values()) {
            if (errorCode.getCode().equals(code)) {
                return errorCode;
            }
        }
        throw new IllegalArgumentException("Unknown error code: " + code);
    }
    
    public boolean isClientError() {
        return code.compareTo("GTW-200") < 0;
    }
    
    public boolean isServerError() {
        return code.compareTo("GTW-500") >= 0;
    }
    
    public boolean isDownstreamError() {
        return code.compareTo("GTW-200") >= 0 && code.compareTo("GTW-300") < 0;
    }
    
    public int getHttpStatusCode() {
        if (code.compareTo("GTW-100") < 0) {
            return 401;
        } else if (code.compareTo("GTW-200") < 0) {
            return 400;
        } else if (code.compareTo("GTW-300") < 0) {
            return isTimeout() ? 504 : 502;
        } else if (code.compareTo("GTW-400") < 0) {
            return isRateLimit() ? 429 : 403;
        } else if (code.compareTo("GTW-500") < 0) {
            return isNotFound() ? 404 : 409;
        } else {
            return isServiceUnavailable() ? 503 : 500;
        }
    }
    
    private boolean isTimeout() {
        return this == DOWNSTREAM_TIMEOUT || this == TIMEOUT_ERROR;
    }
    
    private boolean isRateLimit() {
        return this == RATE_LIMIT_EXCEEDED || this == TOO_MANY_REQUESTS || this == EXTERNAL_API_RATE_LIMIT;
    }
    
    private boolean isNotFound() {
        return this == USER_NOT_FOUND || this == CHILD_PROFILE_NOT_FOUND || this == PROFILE_NOT_FOUND;
    }
    
    private boolean isServiceUnavailable() {
        return this == SERVICE_UNAVAILABLE || this == MAINTENANCE_MODE || this == SYSTEM_OVERLOADED;
    }
}
