package com.app.security;

import com.app.config.JwtConfig;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

/**
 * JWT Authentication Filter
 * Validates JWT tokens and sets authentication context
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    
    private final JwtConfig jwtConfig;

    public JwtAuthenticationFilter(JwtConfig jwtConfig) {
        this.jwtConfig = jwtConfig;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        try {
            String token = extractTokenFromRequest(request);
            
            if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                validateAndSetAuthentication(request, token);
            }
        } catch (Exception e) {
            logger.error("JWT authentication failed: {}", e.getMessage());
            // Don't set authentication - let Spring Security handle unauthorized access
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extract JWT token from Authorization header
     */
    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        
        return null;
    }

    /**
     * Validate token and set authentication context
     */
    private void validateAndSetAuthentication(HttpServletRequest request, String token) {
        try {
            // Validate our own JWT access token
            DecodedJWT decodedJWT = jwtConfig.validateAccessToken(token);
            
            // Extract user information
            String userId = decodedJWT.getSubject();
            String email = decodedJWT.getClaim("email").asString();
            String provider = decodedJWT.getClaim("provider").asString();
            
            if (userId != null && email != null) {
                // Create authentication token
                List<SimpleGrantedAuthority> authorities = Collections.singletonList(
                    new SimpleGrantedAuthority("ROLE_USER")
                );
                
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(userId, null, authorities);
                
                // Set additional details
                UserAuthenticationDetails details = new UserAuthenticationDetails();
                details.setUserId(userId);
                details.setEmail(email);
                details.setProvider(provider);
                details.setDeviceId(request.getHeader("X-Device-ID"));
                details.setSessionId(request.getHeader("X-Session-ID"));
                details.setIpAddress(getClientIpAddress(request));
                details.setUserAgent(request.getHeader("User-Agent"));
                
                authentication.setDetails(details);
                
                // Set authentication in security context
                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                logger.debug("JWT authentication successful for user: {}", userId);
            }
            
        } catch (JWTVerificationException e) {
            logger.warn("Invalid JWT token: {}", e.getMessage());
        } catch (Exception e) {
            logger.error("JWT authentication error: {}", e.getMessage());
        }
    }

    /**
     * Get client IP address from request
     */
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

    /**
     * Skip JWT validation for public endpoints
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        
        // Public endpoints that don't require authentication
        return path.startsWith("/auth/") ||
               path.startsWith("/health") ||
               path.startsWith("/actuator/") ||
               path.equals("/") ||
               path.startsWith("/public/");
    }

    /**
     * Custom authentication details to store additional user information
     */
    public static class UserAuthenticationDetails extends WebAuthenticationDetailsSource {
        private String userId;
        private String email;
        private String provider;
        private String deviceId;
        private String sessionId;
        private String ipAddress;
        private String userAgent;

        // Getters and setters
        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }

        public String getDeviceId() { return deviceId; }
        public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }

        public String getIpAddress() { return ipAddress; }
        public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

        public String getUserAgent() { return userAgent; }
        public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

        @Override
        public String toString() {
            return "UserAuthenticationDetails{" +
                    "userId='" + userId + '\'' +
                    ", email='" + email + '\'' +
                    ", provider='" + provider + '\'' +
                    ", deviceId='" + deviceId + '\'' +
                    ", sessionId='" + sessionId + '\'' +
                    ", ipAddress='" + ipAddress + '\'' +
                    '}';
        }
    }
}
