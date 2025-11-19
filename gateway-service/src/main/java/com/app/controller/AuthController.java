package com.app.controller;

import com.app.config.JwtConfig;
import com.app.exception.DownstreamServiceException;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.User;
import com.app.model.UserSession;
import com.app.service.SecurityMonitoringService;
import com.app.service.ApplicationMetricsService;
import com.app.service.UserService;
import com.app.service.SessionService;
import com.app.testing.TestSimulationFlags;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
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
    private final ApplicationMetricsService applicationMetricsService;
    private final UserService userService;
    private final SessionService sessionService;
    private final TestSimulationFlags flags; // may be null outside test profile

    public AuthController(JwtConfig jwtConfig, SecurityMonitoringService securityMonitoringService,
                         ApplicationMetricsService applicationMetricsService, UserService userService,
                         SessionService sessionService, ObjectProvider<TestSimulationFlags> flagsProvider) {
        this.jwtConfig = jwtConfig;
        this.securityMonitoringService = securityMonitoringService;
        this.applicationMetricsService = applicationMetricsService;
        this.userService = userService;
        this.sessionService = sessionService;
        this.flags = flagsProvider != null ? flagsProvider.getIfAvailable() : null;
    }

    /**
     * Authenticate with Google ID token
     */
    @PostMapping(value = "/google", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> authenticateWithGoogle(@RequestBody GoogleAuthRequest request, HttpServletRequest httpRequest) {
        long startTime = System.currentTimeMillis();
        try {
            // Validate request
            if (request == null) {
                throw com.app.exception.ValidationException.missingRequiredField("body");
            }

            if (request.getIdToken() == null || request.getIdToken().trim().isEmpty()) {
                // Align message with functional test expectation
                throw new com.app.exception.ValidationException(
                        com.app.exception.ErrorCode.MISSING_REQUIRED_FIELD,
                        "ID token is required",
                        "idToken"
                );
            }

            logger.info("Google authentication attempt");

            // Test-simulation hooks for Google OAuth
            if (flags != null) {
                if (flags.isMaintenanceMode()) {
                    throw new GatewayException(ErrorCode.MAINTENANCE_MODE, "System is in maintenance mode");
                }
                if (flags.isCircuitOpenGoogle()) {
                    throw DownstreamServiceException.circuitBreakerOpen("Google OAuth");
                }
                if (flags.getGoogleOauthDelayMs() != null) {
                    long delay = flags.getGoogleOauthDelayMs();
                    try { Thread.sleep(delay); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    Long thr = flags.getGatewayTimeoutMs();
                    if (thr != null && delay > thr) {
                        throw DownstreamServiceException.timeout("Google OAuth", "/oauth2/v4/token", delay);
                    }
                }
                if (flags.getGoogleOauthStatus() != null) {
                    int s = flags.getGoogleOauthStatus();
                    if (s >= 500) {
                        throw DownstreamServiceException.googleOAuthError("/oauth2/v4/token", s, 0);
                    }
                }
            }

            // Validate Google ID token (audience validated server-side)
            DecodedJWT decodedJWT = jwtConfig.validateGoogleIdToken(request.getIdToken());

            // Optional nonce validation (supports raw or SHA-256(base64url) forms)
            if (!validateNonceIfPresent(decodedJWT, request.getNonce())) {
                throw new com.app.exception.AuthenticationException(
                        com.app.exception.ErrorCode.INVALID_TOKEN,
                        "Nonce validation failed",
                        "google",
                        "id_token"
                );
            }

            // Extract user information safely
            String email = decodedJWT.getClaim("email") != null ? decodedJWT.getClaim("email").asString() : null;
            String name = decodedJWT.getClaim("name") != null ? decodedJWT.getClaim("name").asString() : null;
            String providerId = decodedJWT.getSubject();

            // Validate required claims
            if (email == null || email.trim().isEmpty()) {
                throw com.app.exception.ValidationException.missingRequiredField("email");
            }

            // Get or create user in database
            User user = userService.getOrCreateUser(email, name, "google", providerId).join();

            // Generate our own tokens
            String accessToken = jwtConfig.generateAccessToken(user.getId(), user.getEmail(), "google");
            String refreshToken = jwtConfig.generateRefreshToken(user.getId());

            // Simulate Firebase errors if configured
            if (flags != null && flags.getFirebaseStatus() != null && flags.getFirebaseStatus() >= 500) {
                throw DownstreamServiceException.firebaseError("Firebase service error: status=" + flags.getFirebaseStatus(), null);
            }

            // Create session in database
            String deviceId = httpRequest.getHeader("X-Device-ID");
            String deviceType = extractDeviceType(httpRequest);
            String platform = extractPlatform(httpRequest);
            String appVersion = httpRequest.getHeader("X-App-Version");

            UserSession session = sessionService.createSession(
                user.getId(), refreshToken, deviceId, deviceType, platform, appVersion
            ).join();

            // Create response
            AuthResponse response = new AuthResponse();
            response.setSuccess(true);
            response.setUser(createUserProfileFromUser(user));
            response.setTokens(createTokenResponse(accessToken, refreshToken));
            response.setMessage("Google authentication successful");

            logger.info("Google authentication successful for user: {}", user.getEmail());

            // Log successful authentication for security monitoring
            securityMonitoringService.logSuccessfulAuthentication(user.getId(), "google");

            // Record authentication metrics
            long processingTime = System.currentTimeMillis() - startTime;
            applicationMetricsService.recordAuthentication("google", deviceType, platform, appVersion, true, processingTime);

            return ResponseEntity.ok(response);

        } catch (JWTVerificationException e) {
            logger.warn("Google authentication failed: {}", e.getMessage());

            // Log failed authentication for security monitoring
            securityMonitoringService.logFailedAuthentication("google");

            // Record failed authentication metrics
            long processingTime = System.currentTimeMillis() - startTime;
            String deviceType = extractDeviceType(httpRequest);
            String platform = extractPlatform(httpRequest);
            String appVersion = httpRequest.getHeader("X-App-Version");
            applicationMetricsService.recordAuthentication("google", deviceType, platform, appVersion, false, processingTime);

            String msg = e.getMessage() != null ? e.getMessage() : "Invalid token";
            if (msg.toLowerCase().contains("expired")) {
                throw com.app.exception.AuthenticationException.expiredToken("id_token");
            }
            throw new com.app.exception.AuthenticationException(
                    com.app.exception.ErrorCode.INVALID_GOOGLE_TOKEN,
                    msg,
                    e,
                    "google",
                    "id_token"
            );
        } catch (java.util.concurrent.CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw com.app.exception.DownstreamServiceException.firebaseError("Authentication storage error", cause);
        } catch (com.app.exception.DownstreamServiceException e) {
            throw e;
        } catch (com.app.exception.GatewayException e) {
            // Preserve specific error codes/status for validation/auth/downstream cases
            throw e;
        } catch (Exception e) {
            throw new com.app.exception.GatewayException(com.app.exception.ErrorCode.INTERNAL_SERVER_ERROR, "Authentication failed", e);
        }
    }

    /**
     * Authenticate with Apple ID token
     */
    @PostMapping(value = "/apple", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> authenticateWithApple(@RequestBody AppleAuthRequest request, HttpServletRequest httpRequest) {
        long startTime = System.currentTimeMillis();
        try {
            // Validate request
            if (request == null) {
                throw com.app.exception.ValidationException.missingRequiredField("body");
            }

            if (request.getIdToken() == null || request.getIdToken().trim().isEmpty()) {
                throw com.app.exception.ValidationException.missingRequiredField("idToken");
            }

            logger.info("Apple authentication attempt");

            // Test-simulation: maintenance mode
            if (flags != null && flags.isMaintenanceMode()) {
                throw new GatewayException(ErrorCode.MAINTENANCE_MODE, "System is in maintenance mode");
            }

            // Validate Apple ID token (audience validated server-side)
            DecodedJWT decodedJWT = jwtConfig.validateAppleIdToken(request.getIdToken());

            // Optional nonce validation
            if (!validateNonceIfPresent(decodedJWT, request.getNonce())) {
                throw new com.app.exception.AuthenticationException(
                        com.app.exception.ErrorCode.INVALID_TOKEN,
                        "Nonce validation failed",
                        "apple",
                        "id_token"
                );
            }

            // Extract user information
            String email = decodedJWT.getClaim("email") != null ? decodedJWT.getClaim("email").asString() : null;
            String providerId = decodedJWT.getSubject();

            // Validate required claims
            if (email == null || email.trim().isEmpty()) {
                throw com.app.exception.ValidationException.missingRequiredField("email");
            }

            // Apple doesn't always provide name in token, use from request if available
            String name = request.getUserInfo() != null ? request.getUserInfo().getName() : email;

            // Get or create user in database
            User user = userService.getOrCreateUser(email, name, "apple", providerId).join();

            // Generate our own tokens
            String accessToken = jwtConfig.generateAccessToken(user.getId(), user.getEmail(), "apple");
            String refreshToken = jwtConfig.generateRefreshToken(user.getId());

            // Simulate Firebase errors if configured
            if (flags != null && flags.getFirebaseStatus() != null && flags.getFirebaseStatus() >= 500) {
                throw DownstreamServiceException.firebaseError("Firebase service error: status=" + flags.getFirebaseStatus(), null);
            }

            // Create session in database
            String deviceId = httpRequest.getHeader("X-Device-ID");
            String deviceType = extractDeviceType(httpRequest);
            String platform = extractPlatform(httpRequest);
            String appVersion = httpRequest.getHeader("X-App-Version");

            UserSession session = sessionService.createSession(
                user.getId(), refreshToken, deviceId, deviceType, platform, appVersion
            ).join();

            // Create response
            AuthResponse response = new AuthResponse();
            response.setSuccess(true);
            response.setUser(createUserProfileFromUser(user));
            response.setTokens(createTokenResponse(accessToken, refreshToken));
            response.setMessage("Apple authentication successful");

            logger.info("Apple authentication successful for user: {}", user.getEmail());

            // Log successful authentication for security monitoring
            securityMonitoringService.logSuccessfulAuthentication(user.getId(), "apple");

            // Record authentication metrics
            long processingTime = System.currentTimeMillis() - startTime;
            applicationMetricsService.recordAuthentication("apple", deviceType, platform, appVersion, true, processingTime);

            return ResponseEntity.ok(response);

        } catch (JWTVerificationException e) {
            logger.warn("Apple authentication failed: {}", e.getMessage());

            // Log failed authentication for security monitoring
            securityMonitoringService.logFailedAuthentication("apple");

            // Record failed authentication metrics
            long processingTime = System.currentTimeMillis() - startTime;
            String deviceType = extractDeviceType(httpRequest);
            String platform = extractPlatform(httpRequest);
            String appVersion = httpRequest.getHeader("X-App-Version");
            applicationMetricsService.recordAuthentication("apple", deviceType, platform, appVersion, false, processingTime);

            String msg = e.getMessage() != null ? e.getMessage() : "Invalid token";
            if (msg.toLowerCase().contains("expired")) {
                throw com.app.exception.AuthenticationException.expiredToken("id_token");
            }
            throw new com.app.exception.AuthenticationException(
                    com.app.exception.ErrorCode.INVALID_APPLE_TOKEN,
                    msg,
                    e,
                    "apple",
                    "id_token"
            );
        } catch (java.util.concurrent.CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw com.app.exception.DownstreamServiceException.firebaseError("Authentication storage error", cause);
        } catch (com.app.exception.DownstreamServiceException e) {
            throw e;
        } catch (com.app.exception.GatewayException e) {
            // Preserve specific error codes/status for validation/auth/downstream cases
            throw e;
        } catch (Exception e) {
            throw new com.app.exception.GatewayException(com.app.exception.ErrorCode.INTERNAL_SERVER_ERROR, "Authentication failed", e);
        }
    }

    /**
     * Refresh access token
     */
    @PostMapping(value = "/refresh", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> refreshToken(@RequestBody TokenRefreshRequest request) {
        try {
            // Validate request
            if (request == null) {
                throw com.app.exception.ValidationException.missingRequiredField("body");
            }

            if (request.getRefreshToken() == null || request.getRefreshToken().trim().isEmpty()) {
                throw com.app.exception.ValidationException.missingRequiredField("refreshToken");
            }

            logger.info("Token refresh attempt");

            // Validate refresh token and get session from database
            Optional<UserSession> sessionOpt = sessionService.getSessionByRefreshToken(request.getRefreshToken()).join();
            if (sessionOpt.isEmpty()) {
                throw new com.app.exception.AuthenticationException(
                        com.app.exception.ErrorCode.INVALID_REFRESH_TOKEN,
                        "Invalid refresh token"
                );
            }

            UserSession session = sessionOpt.get();
            if (!session.isValid()) {
                throw new com.app.exception.AuthenticationException(
                        com.app.exception.ErrorCode.INVALID_REFRESH_TOKEN,
                        "Expired or revoked refresh token"
                );
            }

            // Get user from database
            Optional<User> userOpt = userService.getUserById(session.getUserId()).join();
            if (userOpt.isEmpty()) {
                throw new com.app.exception.AuthenticationException(
                        com.app.exception.ErrorCode.INVALID_REFRESH_TOKEN,
                        "User not found"
                );
            }

            User user = userOpt.get();

            // Generate new tokens
            String newAccessToken = jwtConfig.generateAccessToken(user.getId(), user.getEmail(), user.getProvider());
            String newRefreshToken = jwtConfig.generateRefreshToken(user.getId());

            // Update session with new refresh token
            sessionService.validateAndRefreshSession(request.getRefreshToken(), newRefreshToken).join();

            // Create response
            TokenRefreshResponse response = new TokenRefreshResponse();
            response.setSuccess(true);
            response.setTokens(createTokenResponse(newAccessToken, newRefreshToken));
            response.setMessage("Token refresh successful");

            logger.info("Token refresh successful for user: {}", user.getId());
            return ResponseEntity.ok(response);

        } catch (JWTVerificationException e) {
            logger.warn("Token refresh failed: {}", e.getMessage());
            String msg = e.getMessage() != null ? e.getMessage() : "Invalid refresh token";
            if (msg.toLowerCase().contains("expired")) {
                throw com.app.exception.AuthenticationException.expiredToken("refresh_token");
            }
            throw new com.app.exception.AuthenticationException(
                    com.app.exception.ErrorCode.INVALID_REFRESH_TOKEN,
                    msg,
                    e,
                    null,
                    "refresh_token"
            );
        } catch (java.util.concurrent.CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw com.app.exception.DownstreamServiceException.firebaseError("Session store error", cause);
        } catch (com.app.exception.DownstreamServiceException e) {
            throw e;
        } catch (com.app.exception.GatewayException e) {
            // Preserve specific 4xx/5xx mapping from our domain exceptions
            throw e;
        } catch (Exception e) {
            throw new com.app.exception.GatewayException(com.app.exception.ErrorCode.INTERNAL_SERVER_ERROR, "Token refresh failed", e);
        }
    }

    /**
     * Revoke tokens (logout)
     */
    @PostMapping(value = "/revoke", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> revokeTokens(@RequestBody TokenRevokeRequest request) {
        try {
            // Validate request
            if (request == null) {
                throw com.app.exception.ValidationException.missingRequiredField("body");
            }

            if (request.getRefreshToken() == null || request.getRefreshToken().trim().isEmpty()) {
                throw com.app.exception.ValidationException.missingRequiredField("refreshToken");
            }

            // Revoke session in database
            logger.info("Token revocation requested");

            Optional<UserSession> revokedSession = sessionService.revokeSessionByRefreshToken(request.getRefreshToken()).join();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            if (revokedSession.isPresent()) {
                response.put("message", "Tokens revoked successfully");
                logger.info("Session revoked for user: {}", revokedSession.get().getUserId());
            } else {
                response.put("message", "Token was already invalid or expired");
                logger.info("Token revocation requested for invalid/expired token");
            }

            return ResponseEntity.ok(response);

        } catch (java.util.concurrent.CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw com.app.exception.DownstreamServiceException.firebaseError("Session store error", cause);
        } catch (com.app.exception.DownstreamServiceException e) {
            throw e;
        } catch (com.app.exception.GatewayException e) {
            // Preserve specific 4xx/5xx mapping from our domain exceptions
            throw e;
        } catch (Exception e) {
            throw new com.app.exception.GatewayException(com.app.exception.ErrorCode.INTERNAL_SERVER_ERROR, "Token revocation failed", e);
        }
    }

    // Helper methods

    private String generateUserId(String email, String provider) {
        // Generate deterministic user ID based on email and provider
        return UUID.nameUUIDFromBytes((email + ":" + provider).getBytes()).toString();
    }

    private UserProfile createUserProfile(String userId, String email, String name, String provider, String providerId) {
        UserProfile profile = new UserProfile();
        profile.setId(userId);
        profile.setEmail(email);
        profile.setName(name);
        profile.setProvider(provider);
        profile.setProviderId(providerId);
        profile.setCreatedAt(Instant.now().toString());
        profile.setUpdatedAt(Instant.now().toString());
        return profile;
    }

    private UserProfile createUserProfileFromUser(User user) {
        UserProfile profile = new UserProfile();
        profile.setId(user.getId());
        profile.setEmail(user.getEmail());
        profile.setName(user.getName());
        profile.setInitials(user.getInitials());
        profile.setProvider(user.getProvider());
        profile.setProviderId(user.getProviderId());
        profile.setCreatedAt(user.getCreatedAt().toString());
        profile.setUpdatedAt(user.getUpdatedAt().toString());
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

    private boolean validateNonceIfPresent(DecodedJWT jwt, String requestNonce) {
        if (requestNonce == null || requestNonce.trim().isEmpty()) {
            return true; // Nonce optional; if not provided, skip
        }
        String tokenNonce = jwt.getClaim("nonce") != null ? jwt.getClaim("nonce").asString() : null;
        if (tokenNonce == null || tokenNonce.isEmpty()) {
            return false; // Nonce required when client sends one
        }
        if (tokenNonce.equals(requestNonce)) {
            return true;
        }
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashed = md.digest(requestNonce.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            String b64u = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);
            return tokenNonce.equals(b64u);
        } catch (Exception e) {
            return false;
        }
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
        private String initials;
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
        public String getInitials() { return initials; }
        public void setInitials(String initials) { this.initials = initials; }
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

    /**
     * Extract device type from user agent
     */
    private String extractDeviceType(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) {
            return "unknown";
        }

        userAgent = userAgent.toLowerCase();

        if (userAgent.contains("bot") || userAgent.contains("crawler") || userAgent.contains("spider")) {
            return "bot";
        } else if (userAgent.contains("mobile") || userAgent.contains("android") ||
                   userAgent.contains("iphone") || userAgent.contains("ipod")) {
            return "mobile";
        } else if (userAgent.contains("tablet") || userAgent.contains("ipad")) {
            return "tablet";
        } else if (userAgent.contains("windows") || userAgent.contains("macintosh") ||
                   userAgent.contains("linux")) {
            return "desktop";
        } else {
            return "unknown";
        }
    }

    /**
     * Extract platform from headers
     */
    private String extractPlatform(HttpServletRequest request) {
        String platform = request.getHeader("X-Platform");
        if (platform != null && !platform.trim().isEmpty()) {
            return platform.toLowerCase();
        }

        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) {
            return "unknown";
        }

        userAgent = userAgent.toLowerCase(); //remove later, not needed and is AI generated - we can just return the string, this contain check does f all
        if (userAgent.contains("android")) {
            return "android";
        } else if (userAgent.contains("ios") || userAgent.contains("iphone") || userAgent.contains("ipad")) {
            return "ios";
        } else if (userAgent.contains("windows")) { //shouldn't happen but best to keep just in case we see web access.
            return "windows";
        } else if (userAgent.contains("mac")) {
            return "macos";
        } else if (userAgent.contains("linux")) {
            return "linux";
        } else {
            return userAgent;
        }
    }
}
