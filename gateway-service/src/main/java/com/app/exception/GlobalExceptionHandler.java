package com.app.exception;

import com.app.filter.RequestIdFilter;
import com.app.service.ApplicationMetricsService;
import com.auth0.jwt.exceptions.JWTVerificationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeoutException;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final ApplicationMetricsService metricsService;

    public GlobalExceptionHandler(ApplicationMetricsService metricsService) {
        this.metricsService = metricsService;
    }

    @ExceptionHandler(GatewayException.class)
    public ResponseEntity<ErrorResponse> handleGatewayException(GatewayException ex,
                                                               HttpServletRequest request) {
        String requestId = generateRequestId();

        if (ex.getErrorCode().isServerError() || ex.getErrorCode().isDownstreamError()) {
            logger.error("Gateway error [requestId={}, code={}, method={}, path={}]: {}", requestId, ex.getErrorCode().getCode(), request.getMethod(), request.getRequestURI(), ex.getMessage());
        } else {
            logger.warn("Gateway error [requestId={}, code={}, method={}, path={}]: {}", requestId, ex.getErrorCode().getCode(), request.getMethod(), request.getRequestURI(), ex.getMessage());
        }

        recordErrorMetrics(request, ex.getErrorCode(), ex.getClass().getSimpleName());
        ErrorResponse errorResponse = createErrorResponse(ex.getErrorCode(), ex.getEffectiveMessage(),
            request.getRequestURI(), requestId, ex.getDetails());

        return ResponseEntity.status(ex.getHttpStatusCode()).body(errorResponse);
    }

    @ExceptionHandler(JWTVerificationException.class)
    public ResponseEntity<ErrorResponse> handleJWTVerificationException(JWTVerificationException ex,
                                                                        HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("JWT verification failed [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.INVALID_TOKEN, "JWTVerificationException");

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.INVALID_TOKEN,
            "Invalid or expired token", request.getRequestURI(), requestId, null);

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex,
                                                                  HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("Validation failed [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.FIELD_VALIDATION_FAILED, "MethodArgumentNotValidException");

        Map<String, Object> details = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            details.put(error.getField(), error.getDefaultMessage()));

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.FIELD_VALIDATION_FAILED,
            "Field validation failed", request.getRequestURI(), requestId, details);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolationException(ConstraintViolationException ex,
                                                                           HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("Constraint violation [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.FIELD_VALIDATION_FAILED, "ConstraintViolationException");

        Map<String, Object> details = new HashMap<>();
        ex.getConstraintViolations().forEach(violation ->
            details.put(violation.getPropertyPath().toString(), violation.getMessage()));

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.FIELD_VALIDATION_FAILED,
            "Constraint validation failed", request.getRequestURI(), requestId, details);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameterException(MissingServletRequestParameterException ex,
                                                                        HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("Missing parameter [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.MISSING_REQUIRED_FIELD, "MissingServletRequestParameterException");

        Map<String, Object> details = new HashMap<>();
        details.put("parameter", ex.getParameterName());
        details.put("type", ex.getParameterType());

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.MISSING_REQUIRED_FIELD,
            "Required parameter '" + ex.getParameterName() + "' is missing",
            request.getRequestURI(), requestId, details);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatchException(MethodArgumentTypeMismatchException ex,
                                                                    HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("Type mismatch [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.INVALID_PARAMETER, "MethodArgumentTypeMismatchException");

        Map<String, Object> details = new HashMap<>();
        details.put("parameter", ex.getName());
        details.put("value", ex.getValue());
        details.put("expectedType", ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown");

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.INVALID_PARAMETER,
            "Invalid parameter type for '" + ex.getName() + "'",
            request.getRequestURI(), requestId, details);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMessageNotReadableException(HttpMessageNotReadableException ex,
                                                                          HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("Malformed request body [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.MALFORMED_JSON, "HttpMessageNotReadableException");

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.MALFORMED_JSON,
            "Malformed JSON in request body", request.getRequestURI(), requestId, null);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleUnsupportedMediaTypeException(HttpMediaTypeNotSupportedException ex,
                                                                            HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("Unsupported media type [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.UNSUPPORTED_MEDIA_TYPE, "HttpMediaTypeNotSupportedException");

        Map<String, Object> details = new HashMap<>();
        details.put("contentType", ex.getContentType());
        details.put("supportedTypes", ex.getSupportedMediaTypes());

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.UNSUPPORTED_MEDIA_TYPE,
            "Unsupported media type: " + ex.getContentType(),
            request.getRequestURI(), requestId, details);

        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(errorResponse);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupportedException(HttpRequestMethodNotSupportedException ex,
                                                                          HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("Method not supported [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.INVALID_REQUEST, "HttpRequestMethodNotSupportedException");

        Map<String, Object> details = new HashMap<>();
        details.put("method", ex.getMethod());
        details.put("supportedMethods", ex.getSupportedMethods());

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.INVALID_REQUEST,
            "HTTP method '" + ex.getMethod() + "' not supported",
            request.getRequestURI(), requestId, details);

        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(errorResponse);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeException(MaxUploadSizeExceededException ex,
                                                                     HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("Upload size exceeded [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.REQUEST_TOO_LARGE, "MaxUploadSizeExceededException");

        Map<String, Object> details = new HashMap<>();
        details.put("maxSize", ex.getMaxUploadSize());

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.REQUEST_TOO_LARGE,
            "Upload size exceeds maximum allowed", request.getRequestURI(), requestId, details);

        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(errorResponse);
    }

    @ExceptionHandler(io.github.resilience4j.circuitbreaker.CallNotPermittedException.class)
    public ResponseEntity<ErrorResponse> handleCircuitBreakerOpen(io.github.resilience4j.circuitbreaker.CallNotPermittedException ex,
                                                                  HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("Circuit breaker open [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.CIRCUIT_BREAKER_OPEN, "CallNotPermittedException");

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.CIRCUIT_BREAKER_OPEN,
                "Circuit breaker is open", request.getRequestURI(), requestId, null);

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errorResponse);
    }

    @ExceptionHandler(TimeoutException.class)
    public ResponseEntity<ErrorResponse> handleTimeoutException(TimeoutException ex,
                                                               HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.error("Request timeout [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.TIMEOUT_ERROR, "TimeoutException");

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.TIMEOUT_ERROR,
            "Request timeout", request.getRequestURI(), requestId, null);

        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(errorResponse);
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(org.springframework.web.context.request.async.AsyncRequestTimeoutException.class)
    public ResponseEntity<ErrorResponse> handleAsyncRequestTimeout(
            org.springframework.web.context.request.async.AsyncRequestTimeoutException ex,
            HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.error("Inbound request timeout [requestId={}, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.TIMEOUT_ERROR, "AsyncRequestTimeoutException");

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.TIMEOUT_ERROR,
                "Request timeout", request.getRequestURI(), requestId, null);

        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(errorResponse);
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(
            org.springframework.web.servlet.resource.NoResourceFoundException ex,
            HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("Resource not found [requestId={}, method={}, path={}]", requestId, request.getMethod(), request.getRequestURI());

        ErrorResponse errorResponse = createErrorResponse(
                ErrorCode.INVALID_REQUEST,
                "Resource not found",
                request.getRequestURI(),
                requestId,
                null
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(org.springframework.web.servlet.NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoHandlerFound(
            org.springframework.web.servlet.NoHandlerFoundException ex,
            HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("No handler found [requestId={}, method={}, path={}]", requestId, ex.getHttpMethod(), String.valueOf(ex.getRequestURL()));

        ErrorResponse errorResponse = createErrorResponse(
                ErrorCode.INVALID_REQUEST,
                "Resource not found",
                request.getRequestURI(),
                requestId,
                null
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.error("Unexpected error [requestId={}, code=GTW-500, method={}, path={}]: {}", requestId, request.getMethod(), request.getRequestURI(), ex.getMessage());

        recordErrorMetrics(request, ErrorCode.INTERNAL_SERVER_ERROR, ex.getClass().getSimpleName());

        ErrorResponse errorResponse = createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR,
            "An unexpected error occurred", request.getRequestURI(), requestId, null);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    private ErrorResponse createErrorResponse(ErrorCode errorCode, String message, String path,
                                            String requestId, Map<String, Object> details) {
        ErrorResponse response = new ErrorResponse();
        response.setSuccess(false);
        response.setErrorCode(errorCode.getCode());
        response.setError(errorCode.getDefaultMessage());
        response.setMessage(message);
        response.setPath(path);
        response.setTimestamp(Instant.now().toString());
        response.setRequestId(requestId);
        response.setDetails(details);
        return response;
    }

    private void recordErrorMetrics(HttpServletRequest request, ErrorCode errorCode, String exceptionType) {
        if (metricsService != null) {
            metricsService.recordError(request, exceptionType, errorCode.getCode());
        }
    }

    private String generateRequestId() {
        try {
            var attrs = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attrs instanceof org.springframework.web.context.request.ServletRequestAttributes) {
                var req = ((org.springframework.web.context.request.ServletRequestAttributes) attrs).getRequest();
                Object attr = req.getAttribute(RequestIdFilter.ATTR_REQUEST_ID);
                String id = attr != null ? String.valueOf(attr) : req.getHeader(RequestIdFilter.HEADER_REQUEST_ID);
                if (id != null) {
                    try { java.util.UUID.fromString(id); return id; } catch (Exception ignored) {}
                }
            }
        } catch (Exception ignored) {}
        return java.util.UUID.randomUUID().toString();
    }
}
