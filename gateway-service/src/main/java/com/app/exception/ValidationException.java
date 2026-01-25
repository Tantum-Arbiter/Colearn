package com.app.exception;

import java.util.Map;
import java.util.HashMap;

public class ValidationException extends GatewayException {
    
    private final String fieldName;
    private final Object fieldValue;
    private final String validationRule;
    
    public ValidationException(ErrorCode errorCode) {
        this(errorCode, null, null, null, null);
    }
    
    public ValidationException(ErrorCode errorCode, String customMessage) {
        this(errorCode, customMessage, null, null, null);
    }
    
    public ValidationException(ErrorCode errorCode, String customMessage, String fieldName) {
        this(errorCode, customMessage, fieldName, null, null);
    }
    
    public ValidationException(ErrorCode errorCode, String customMessage, String fieldName, 
                             Object fieldValue, String validationRule) {
        super(errorCode, customMessage, createDetails(fieldName, fieldValue, validationRule));
        this.fieldName = fieldName;
        this.fieldValue = fieldValue;
        this.validationRule = validationRule;
    }
    
    public ValidationException(ErrorCode errorCode, String customMessage, Throwable cause, 
                             String fieldName, Object fieldValue, String validationRule) {
        super(errorCode, customMessage, cause, createDetails(fieldName, fieldValue, validationRule), null);
        this.fieldName = fieldName;
        this.fieldValue = fieldValue;
        this.validationRule = validationRule;
    }
    
    private static Map<String, Object> createDetails(String fieldName, Object fieldValue, String validationRule) {
        Map<String, Object> details = new HashMap<>();
        if (fieldName != null) {
            details.put("field", fieldName);
        }
        if (fieldValue != null) {
            details.put("value", fieldValue.toString());
        }
        if (validationRule != null) {
            details.put("rule", validationRule);
        }
        return details.isEmpty() ? null : details;
    }
    
    public String getFieldName() {
        return fieldName;
    }
    
    public Object getFieldValue() {
        return fieldValue;
    }
    
    public String getValidationRule() {
        return validationRule;
    }
    
    public static ValidationException missingRequiredField(String fieldName) {
        return new ValidationException(ErrorCode.MISSING_REQUIRED_FIELD, 
            "Required field '" + fieldName + "' is missing", fieldName, null, "required");
    }
    
    public static ValidationException invalidParameter(String paramName, Object value, String expectedFormat) {
        return new ValidationException(ErrorCode.INVALID_PARAMETER, 
            "Invalid parameter '" + paramName + "': " + value, paramName, value, expectedFormat);
    }
    
    public static ValidationException invalidEmailFormat(String email) {
        return new ValidationException(ErrorCode.INVALID_EMAIL_FORMAT, 
            "Invalid email format: " + email, "email", email, "email_format");
    }
    
    public static ValidationException invalidDateFormat(String date, String expectedFormat) {
        return new ValidationException(ErrorCode.INVALID_DATE_FORMAT, 
            "Invalid date format: " + date + ", expected: " + expectedFormat, "date", date, expectedFormat);
    }
    
    public static ValidationException malformedJson(String message) {
        return new ValidationException(ErrorCode.MALFORMED_JSON, "Malformed JSON: " + message);
    }
    
    public static ValidationException requestTooLarge(long size, long maxSize) {
        Map<String, Object> details = new HashMap<>();
        details.put("size", size);
        details.put("maxSize", maxSize);
        return new ValidationException(ErrorCode.REQUEST_TOO_LARGE, 
            "Request size " + size + " exceeds maximum " + maxSize, null, null, null);
    }
}
