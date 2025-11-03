package com.app.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Security Headers Configuration
 * Implements enterprise-grade security headers for protection against common attacks
 */
@Configuration
public class SecurityHeadersConfig {

    @Bean
    public SecurityHeadersFilter securityHeadersFilter() {
        return new SecurityHeadersFilter();
    }

    /**
     * Filter to add security headers to all responses
     */
    public static class SecurityHeadersFilter extends OncePerRequestFilter {

        @Override
        protected void doFilterInternal(
                HttpServletRequest request,
                HttpServletResponse response,
                FilterChain filterChain
        ) throws ServletException, IOException {

            // Content Security Policy
            response.setHeader("Content-Security-Policy",
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: https:; " +
                "font-src 'self' data:; " +
                "connect-src 'self' https://accounts.google.com https://appleid.apple.com; " +
                "frame-ancestors 'none'; " +
                "base-uri 'self'; " +
                "form-action 'self'"
            );

            // HTTP Strict Transport Security (HSTS)
            response.setHeader("Strict-Transport-Security",
                "max-age=31536000; includeSubDomains; preload"
            );

            // X-Frame-Options (prevent clickjacking)
            response.setHeader("X-Frame-Options", "DENY");

            // X-Content-Type-Options (prevent MIME sniffing)
            response.setHeader("X-Content-Type-Options", "nosniff");

            // X-XSS-Protection (XSS filtering)
            response.setHeader("X-XSS-Protection", "1; mode=block");

            // Referrer Policy
            response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

            // Permissions Policy (formerly Feature Policy)
            response.setHeader("Permissions-Policy",
                "camera=(), " +
                "microphone=(), " +
                "geolocation=(), " +
                "payment=(), " +
                "usb=(), " +
                "magnetometer=(), " +
                "gyroscope=(), " +
                "accelerometer=()"
            );

            // Cross-Origin Embedder Policy
            response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");

            // Cross-Origin Opener Policy
            response.setHeader("Cross-Origin-Opener-Policy", "same-origin");

            // Cross-Origin Resource Policy
            response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

            // Cache Control for sensitive endpoints
            String requestURI = request.getRequestURI();
            if (requestURI.startsWith("/auth/") || requestURI.startsWith("/api/")) {
                response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                response.setHeader("Pragma", "no-cache");
                response.setHeader("Expires", "0");
            }

            // Server header (hide server information)
            response.setHeader("Server", "GrowWithFreya-Gateway");

            // X-Powered-By (remove or customize)
            response.setHeader("X-Powered-By", "");

            // Custom security headers
            response.setHeader("X-API-Version", "1.0");
            response.setHeader("X-Security-Policy", "strict");

            filterChain.doFilter(request, response);
        }

        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {
            // Apply security headers to all requests
            return false;
        }
    }
}
