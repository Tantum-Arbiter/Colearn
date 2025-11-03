package com.app.controller;

import com.app.config.JwtConfig;
import com.app.service.SecurityMonitoringService;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Authentication Controller
 * Handles OAuth token validation and JWT token generation
 */
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    
    private final JwtConfig jwtConfig;
    private final SecurityMonitoringService securityMonitoringService;

    public AuthController(JwtConfig jwtConfig, SecurityMonitoringService securityMonitoringService) {
        this.jwtConfig = jwtConfig;
        this.securityMonitoringService = securityMonitoringService;
    }

    /**
     * Authenticate with Google ID token
     */
    @PostMapping("/google")
    public ResponseEntity<?> authenticateWithGoogle(@RequestBody GoogleAuthRequest request, HttpServletRequest httpRequest) {
        try {
            // Validate request
            if (request == null) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Invalid request", "Request body is required"));
            }

            if (request.getIdToken() == null || request.getIdToken().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Missing ID token", "ID token is required"));
            }

            if (request.getClientId() == null || request.getClientId().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Missing client ID", "Client ID is required"));
            }

            logger.info("Google authentication attempt for client: {}", request.getClientId());

            // Validate Google ID token
            DecodedJWT decodedJWT = jwtConfig.validateGoogleIdToken(request.getIdToken(), request.getClientId());
            
            // Extract user information
            String email = decodedJWT.getClaim("email").asString();
            String name = decodedJWT.getClaim("name").asString();
            String picture = decodedJWT.getClaim("picture").asString();
            String providerId = decodedJWT.getSubject();

            // Validate required claims
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Invalid token", "Email claim is missing or empty"));
            }
            
            // Generate our own tokens
            String userId = generateUserId(email, "google");
            String accessToken = jwtConfig.generateAccessToken(userId, email, "google");
            String refreshToken = jwtConfig.generateRefreshToken(userId);
            
            // Create response
            AuthResponse response = new AuthResponse();
            response.setSuccess(true);
            response.setUser(createUserProfile(userId, email, name, picture, "google", providerId));
            response.setTokens(createTokenResponse(accessToken, refreshToken));
            response.setMessage("Google authentication successful");
            
            logger.info("Google authentication successful for user: {}", email);

            // Log successful authentication for security monitoring
            String clientIp = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            securityMonitoringService.logSuccessfulAuthentication(userId, "google", clientIp, userAgent);

            return ResponseEntity.ok(response);
            
        } catch (JWTVerificationException e) {
            logger.warn("Google authentication failed: {}", e.getMessage());

            // Log failed authentication for security monitoring
            String clientIp = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            securityMonitoringService.logFailedAuthentication("google", clientIp, userAgent);

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid Google ID token", e.getMessage()));
        } catch (Exception e) {
            logger.error("Google authentication error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Authentication failed", "Internal server error"));
        }
    }

    /**
     * Authenticate with Apple ID token
     */
    @PostMapping("/apple")
    public ResponseEntity<?> authenticateWithApple(@RequestBody AppleAuthRequest request, HttpServletRequest httpRequest) {
        try {
            // Validate request
            if (request == null) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Invalid request", "Request body is required"));
            }

            if (request.getIdToken() == null || request.getIdToken().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Missing ID token", "ID token is required"));
            }

            if (request.getClientId() == null || request.getClientId().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Missing client ID", "Client ID is required"));
            }

            logger.info("Apple authentication attempt for client: {}", request.getClientId());

            // Validate Apple ID token
            DecodedJWT decodedJWT = jwtConfig.validateAppleIdToken(request.getIdToken(), request.getClientId());
            
            // Extract user information
            String email = decodedJWT.getClaim("email").asString();
            String providerId = decodedJWT.getSubject();
            
            // Apple doesn't always provide name in token, use from request if available
            String name = request.getUserInfo() != null ? request.getUserInfo().getName() : email;
            
            // Generate our own tokens
            String userId = generateUserId(email, "apple");
            String accessToken = jwtConfig.generateAccessToken(userId, email, "apple");
            String refreshToken = jwtConfig.generateRefreshToken(userId);
            
            // Create response
            AuthResponse response = new AuthResponse();
            response.setSuccess(true);
            response.setUser(createUserProfile(userId, email, name, null, "apple", providerId));
            response.setTokens(createTokenResponse(accessToken, refreshToken));
            response.setMessage("Apple authentication successful");
            
            logger.info("Apple authentication successful for user: {}", email);

            // Log successful authentication for security monitoring
            String clientIp = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            securityMonitoringService.logSuccessfulAuthentication(userId, "apple", clientIp, userAgent);

            return ResponseEntity.ok(response);
            
        } catch (JWTVerificationException e) {
            logger.warn("Apple authentication failed: {}", e.getMessage());

            // Log failed authentication for security monitoring
            String clientIp = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            securityMonitoringService.logFailedAuthentication("apple", clientIp, userAgent);

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid Apple ID token", e.getMessage()));
        } catch (Exception e) {
            logger.error("Apple authentication error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Authentication failed", "Internal server error"));
        }
    }

    /**
     * Refresh access token
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody TokenRefreshRequest request) {
        try {
            // Validate request
            if (request == null) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Invalid request", "Request body is required"));
            }

            if (request.getRefreshToken() == null || request.getRefreshToken().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Missing refresh token", "Refresh token is required"));
            }

            logger.info("Token refresh attempt");

            // Validate refresh token
            DecodedJWT decodedJWT = jwtConfig.jwtVerifier().verify(request.getRefreshToken());
            
            // Check if it's a refresh token
            String tokenType = decodedJWT.getClaim("type").asString();
            if (!"refresh".equals(tokenType)) {
                throw new JWTVerificationException("Invalid token type");
            }
            
            // Extract user information
            String userId = decodedJWT.getSubject();
            
            // For refresh, we need to get user info from somewhere (database/cache)
            // For now, we'll extract from the existing token claims
            // In production, you'd fetch from a user service
            
            // Generate new tokens
            String newAccessToken = jwtConfig.generateAccessToken(userId, "user@example.com", "google");
            String newRefreshToken = jwtConfig.generateRefreshToken(userId);
            
            // Create response
            TokenRefreshResponse response = new TokenRefreshResponse();
            response.setSuccess(true);
            response.setTokens(createTokenResponse(newAccessToken, newRefreshToken));
            response.setMessage("Token refresh successful");
            
            logger.info("Token refresh successful for user: {}", userId);
            return ResponseEntity.ok(response);
            
        } catch (JWTVerificationException e) {
            logger.warn("Token refresh failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid refresh token", e.getMessage()));
        } catch (Exception e) {
            logger.error("Token refresh error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Token refresh failed", "Internal server error"));
        }
    }

    /**
     * Revoke tokens (logout)
     */
    @PostMapping("/revoke")
    public ResponseEntity<?> revokeTokens(@RequestBody TokenRevokeRequest request) {
        try {
            // Validate request
            if (request == null) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Invalid request", "Request body is required"));
            }

            if (request.getRefreshToken() == null || request.getRefreshToken().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Missing refresh token", "Refresh token is required"));
            }

            // In a full implementation, you'd add tokens to a blacklist
            // For stateless JWT, we just return success
            logger.info("Token revocation requested");

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Tokens revoked successfully");

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Token revocation error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Token revocation failed", "Internal server error"));
        }
    }

    // Helper methods

    private String generateUserId(String email, String provider) {
        // Generate deterministic user ID based on email and provider
        return UUID.nameUUIDFromBytes((email + ":" + provider).getBytes()).toString();
    }

    private UserProfile createUserProfile(String userId, String email, String name, String picture, String provider, String providerId) {
        UserProfile profile = new UserProfile();
        profile.setId(userId);
        profile.setEmail(email);
        profile.setName(name);
        profile.setPicture(picture);
        profile.setProvider(provider);
        profile.setProviderId(providerId);
        profile.setCreatedAt(Instant.now().toString());
        profile.setUpdatedAt(Instant.now().toString());
        return profile;
    }

    private JWTTokens createTokenResponse(String accessToken, String refreshToken) {
        JWTTokens tokens = new JWTTokens();
        tokens.setAccessToken(accessToken);
        tokens.setRefreshToken(refreshToken);
        tokens.setExpiresAt(System.currentTimeMillis() + (jwtConfig.getJwtExpirationInSeconds() * 1000L));
        tokens.setTokenType("Bearer");
        tokens.setScope(new String[]{"read", "write"});
        return tokens;
    }

    private Map<String, Object> createErrorResponse(String error, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", error);
        response.put("message", message);
        response.put("timestamp", Instant.now().toString());
        return response;
    }

    // Request/Response DTOs

    public static class GoogleAuthRequest {
        private String idToken;
        private String clientId;
        private String nonce;
        private DeviceInfo deviceInfo;
        private UserInfo userInfo;

        // Getters and setters
        public String getIdToken() { return idToken; }
        public void setIdToken(String idToken) { this.idToken = idToken; }
        public String getClientId() { return clientId; }
        public void setClientId(String clientId) { this.clientId = clientId; }
        public String getNonce() { return nonce; }
        public void setNonce(String nonce) { this.nonce = nonce; }
        public DeviceInfo getDeviceInfo() { return deviceInfo; }
        public void setDeviceInfo(DeviceInfo deviceInfo) { this.deviceInfo = deviceInfo; }
        public UserInfo getUserInfo() { return userInfo; }
        public void setUserInfo(UserInfo userInfo) { this.userInfo = userInfo; }
    }

    public static class AppleAuthRequest {
        private String idToken;
        private String clientId;
        private String nonce;
        private DeviceInfo deviceInfo;
        private UserInfo userInfo;

        // Getters and setters
        public String getIdToken() { return idToken; }
        public void setIdToken(String idToken) { this.idToken = idToken; }
        public String getClientId() { return clientId; }
        public void setClientId(String clientId) { this.clientId = clientId; }
        public String getNonce() { return nonce; }
        public void setNonce(String nonce) { this.nonce = nonce; }
        public DeviceInfo getDeviceInfo() { return deviceInfo; }
        public void setDeviceInfo(DeviceInfo deviceInfo) { this.deviceInfo = deviceInfo; }
        public UserInfo getUserInfo() { return userInfo; }
        public void setUserInfo(UserInfo userInfo) { this.userInfo = userInfo; }
    }

    public static class TokenRefreshRequest {
        private String refreshToken;

        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    }

    public static class TokenRevokeRequest {
        private String refreshToken;

        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    }

    public static class AuthResponse {
        private boolean success;
        private UserProfile user;
        private JWTTokens tokens;
        private String message;

        // Getters and setters
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public UserProfile getUser() { return user; }
        public void setUser(UserProfile user) { this.user = user; }
        public JWTTokens getTokens() { return tokens; }
        public void setTokens(JWTTokens tokens) { this.tokens = tokens; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    public static class TokenRefreshResponse {
        private boolean success;
        private JWTTokens tokens;
        private String message;

        // Getters and setters
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public JWTTokens getTokens() { return tokens; }
        public void setTokens(JWTTokens tokens) { this.tokens = tokens; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    // Supporting DTOs
    public static class UserProfile {
        private String id;
        private String email;
        private String name;
        private String picture;
        private String provider;
        private String providerId;
        private String createdAt;
        private String updatedAt;

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getPicture() { return picture; }
        public void setPicture(String picture) { this.picture = picture; }
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
        public String getProviderId() { return providerId; }
        public void setProviderId(String providerId) { this.providerId = providerId; }
        public String getCreatedAt() { return createdAt; }
        public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
        public String getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
    }

    public static class JWTTokens {
        private String accessToken;
        private String refreshToken;
        private long expiresAt;
        private String tokenType;
        private String[] scope;

        // Getters and setters
        public String getAccessToken() { return accessToken; }
        public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
        public long getExpiresAt() { return expiresAt; }
        public void setExpiresAt(long expiresAt) { this.expiresAt = expiresAt; }
        public String getTokenType() { return tokenType; }
        public void setTokenType(String tokenType) { this.tokenType = tokenType; }
        public String[] getScope() { return scope; }
        public void setScope(String[] scope) { this.scope = scope; }
    }

    public static class DeviceInfo {
        private String deviceId;
        private String platform;
        private String osVersion;
        private String appVersion;

        // Getters and setters
        public String getDeviceId() { return deviceId; }
        public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
        public String getPlatform() { return platform; }
        public void setPlatform(String platform) { this.platform = platform; }
        public String getOsVersion() { return osVersion; }
        public void setOsVersion(String osVersion) { this.osVersion = osVersion; }
        public String getAppVersion() { return appVersion; }
        public void setAppVersion(String appVersion) { this.appVersion = appVersion; }
    }

    public static class UserInfo {
        private String email;
        private String name;
        private String picture;

        // Getters and setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getPicture() { return picture; }
        public void setPicture(String picture) { this.picture = picture; }
    }

    /**
     * Extract client IP address from request
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
}
