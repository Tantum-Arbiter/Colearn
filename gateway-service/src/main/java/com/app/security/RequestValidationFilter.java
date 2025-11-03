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
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Request Validation Filter
 * Validates incoming requests for security threats and malicious patterns
 */
@Component
public class RequestValidationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RequestValidationFilter.class);

    // Suspicious patterns to detect
    private static final List<Pattern> SUSPICIOUS_PATTERNS = Arrays.asList(
        // SQL Injection patterns
        Pattern.compile("(?i).*(union|select|insert|update|delete|drop|create|alter|exec|execute).*"),
        Pattern.compile("(?i).*(script|javascript|vbscript|onload|onerror|onclick).*"),
        Pattern.compile("(?i).*(<|>|&lt;|&gt;|%3C|%3E).*"),

        // XSS patterns
        Pattern.compile("(?i).*(<script|</script|<iframe|</iframe|<object|</object).*"),
        Pattern.compile("(?i).*(alert\\(|confirm\\(|prompt\\().*"),

        // Path traversal patterns
        Pattern.compile(".*(\\.\\.[\\\\/]|[\\\\/]\\.\\.[\\\\/]|\\.\\.%2f|%2f\\.\\.%2f).*"),

        // Command injection patterns
        Pattern.compile("(?i).*(;|\\||&|`|\\$\\(|\\$\\{).*"),

        // LDAP injection patterns
        Pattern.compile(".*[\\(\\)\\*\\\\\\|&].*")
    );

    // Maximum request size (10MB)
    private static final long MAX_REQUEST_SIZE = 10 * 1024 * 1024;

    // Rate limiting (simple implementation)
    private static final int MAX_REQUESTS_PER_MINUTE = 100;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        try {
            // Validate request size
            if (!validateRequestSize(request)) {
                logger.warn("Request size too large from IP: {}", getClientIpAddress(request));
                response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
                response.getWriter().write("{\"error\":\"Request too large\"}");
                return;
            }

            // Validate headers
            if (!validateHeaders(request)) {
                logger.warn("Suspicious headers detected from IP: {}", getClientIpAddress(request));
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write("{\"error\":\"Invalid headers\"}");
                return;
            }

            // Validate URL and parameters
            if (!validateUrlAndParameters(request)) {
                logger.warn("Suspicious URL/parameters detected from IP: {}", getClientIpAddress(request));
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write("{\"error\":\"Invalid request\"}");
                return;
            }

            // Validate User-Agent
            if (!validateUserAgent(request)) {
                logger.warn("Suspicious User-Agent detected from IP: {}", getClientIpAddress(request));
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write("{\"error\":\"Invalid client\"}");
                return;
            }

            // Log request for monitoring
            logRequest(request);

            filterChain.doFilter(request, response);

        } catch (Exception e) {
            logger.error("Request validation error: {}", e.getMessage(), e);
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write("{\"error\":\"Request validation failed\"}");
        }
    }

    private boolean validateRequestSize(HttpServletRequest request) {
        String contentLengthHeader = request.getHeader("Content-Length");
        if (contentLengthHeader != null) {
            try {
                long contentLength = Long.parseLong(contentLengthHeader);
                return contentLength <= MAX_REQUEST_SIZE;
            } catch (NumberFormatException e) {
                return false;
            }
        }
        return true;
    }

    private boolean validateHeaders(HttpServletRequest request) {
        // Check for suspicious header values
        String[] headersToCheck = {
            "User-Agent", "Referer", "X-Forwarded-For", "X-Real-IP"
        };

        for (String headerName : headersToCheck) {
            String headerValue = request.getHeader(headerName);
            if (headerValue != null && containsSuspiciousPattern(headerValue)) {
                return false;
            }
        }

        // Validate Content-Type for POST/PUT requests
        String method = request.getMethod();
        if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method)) {
            String contentType = request.getContentType();
            if (contentType != null && !isValidContentType(contentType)) {
                return false;
            }
        }

        return true;
    }

    private boolean validateUrlAndParameters(HttpServletRequest request) {
        // Check URL path
        String requestURI = request.getRequestURI();
        if (containsSuspiciousPattern(requestURI)) {
            return false;
        }

        // Check query parameters
        String queryString = request.getQueryString();
        if (queryString != null && containsSuspiciousPattern(queryString)) {
            return false;
        }

        // Check individual parameters
        if (request.getParameterMap() != null) {
            for (String paramName : request.getParameterMap().keySet()) {
                if (containsSuspiciousPattern(paramName)) {
                    return false;
                }
                
                String[] paramValues = request.getParameterValues(paramName);
                if (paramValues != null) {
                    for (String paramValue : paramValues) {
                        if (containsSuspiciousPattern(paramValue)) {
                            return false;
                        }
                    }
                }
            }
        }

        return true;
    }

    private boolean validateUserAgent(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        
        if (userAgent == null || userAgent.trim().isEmpty()) {
            return false; // Require User-Agent header
        }

        // Check for suspicious User-Agent patterns
        String[] suspiciousAgents = {
            "sqlmap", "nikto", "nmap", "masscan", "zap", "burp", "curl", "wget"
        };

        String lowerUserAgent = userAgent.toLowerCase();
        for (String suspicious : suspiciousAgents) {
            if (lowerUserAgent.contains(suspicious)) {
                return false;
            }
        }

        return true;
    }

    private boolean containsSuspiciousPattern(String input) {
        if (input == null) {
            return false;
        }

        String decodedInput = urlDecode(input);
        
        for (Pattern pattern : SUSPICIOUS_PATTERNS) {
            if (pattern.matcher(decodedInput).matches()) {
                return true;
            }
        }

        return false;
    }

    private boolean isValidContentType(String contentType) {
        String[] validContentTypes = {
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data",
            "text/plain"
        };

        String lowerContentType = contentType.toLowerCase();
        for (String validType : validContentTypes) {
            if (lowerContentType.startsWith(validType)) {
                return true;
            }
        }

        return false;
    }

    private String urlDecode(String input) {
        try {
            return java.net.URLDecoder.decode(input, "UTF-8");
        } catch (Exception e) {
            return input;
        }
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

    private void logRequest(HttpServletRequest request) {
        if (logger.isDebugEnabled()) {
            logger.debug("Request: {} {} from IP: {} User-Agent: {}",
                request.getMethod(),
                request.getRequestURI(),
                getClientIpAddress(request),
                request.getHeader("User-Agent")
            );
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        
        // Skip validation for health checks and static resources
        return path.startsWith("/health") ||
               path.startsWith("/actuator/health") ||
               path.startsWith("/public/") ||
               path.equals("/");
    }
}
