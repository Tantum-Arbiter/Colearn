package com.app.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Validates that requests come through Cloudflare proxy.
 * Checks for Cloudflare-specific headers that are only present when traffic routes through CF.
 *
 * Active in 'prod' and 'gcp-dev' profiles - allows functional tests via user-agent bypass.
 */
@Component
@Profile({"prod", "gcp-dev"})
@Order(1)
public class CloudflareValidationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(CloudflareValidationFilter.class);

    @Value("${app.security.cloudflare.require-validation:true}")
    private boolean requireCloudflareValidation;

    @Value("${app.security.cloudflare.allowed-direct-paths:/health,/actuator/health}")
    private String allowedDirectPaths;

    @Value("${app.security.cloudflare.allowed-user-agents:}")
    private String allowedUserAgents;

    private static final Set<String> CLOUDFLARE_HEADERS = Set.of(
        "CF-Connecting-IP",
        "CF-Ray",
        "CF-IPCountry"
    );

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        if (!requireCloudflareValidation) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        
        if (isAllowedDirectPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (isAllowedUserAgent(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!isCloudflareRequest(request)) {
            logger.warn("Request blocked - not from Cloudflare. Path: {}, IP: {}", 
                path, getClientIp(request));
            
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"error\":\"Direct access not allowed\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isCloudflareRequest(HttpServletRequest request) {
        for (String header : CLOUDFLARE_HEADERS) {
            if (request.getHeader(header) != null) {
                return true;
            }
        }
        return false;
    }

    private boolean isAllowedDirectPath(String path) {
        if (path == null) return false;

        for (String allowed : allowedDirectPaths.split(",")) {
            if (path.startsWith(allowed.trim())) {
                return true;
            }
        }
        return false;
    }

    private boolean isAllowedUserAgent(HttpServletRequest request) {
        if (allowedUserAgents == null || allowedUserAgents.isBlank()) {
            return false;
        }

        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) return false;

        for (String allowed : allowedUserAgents.split(",")) {
            if (userAgent.contains(allowed.trim())) {
                logger.debug("Cloudflare bypass - allowed user-agent: {}", userAgent);
                return true;
            }
        }
        return false;
    }

    private String getClientIp(HttpServletRequest request) {
        String cfIp = request.getHeader("CF-Connecting-IP");
        if (cfIp != null) return cfIp;
        
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null) return forwarded.split(",")[0].trim();
        
        return request.getRemoteAddr();
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return false;
    }
}

