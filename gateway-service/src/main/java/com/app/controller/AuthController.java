package com.app.controller;

import com.app.config.JwtConfig;
import com.app.exception.DownstreamServiceException;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.User;
import com.app.model.UserProfile;
import com.app.model.UserSession;
import com.app.repository.UserProfileRepository;
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
    private final UserProfileRepository userProfileRepository;
    private final TestSimulationFlags flags;

    public AuthController(JwtConfig jwtConfig, SecurityMonitoringService securityMonitoringService,
                         ApplicationMetricsService applicationMetricsService, UserService userService,
                         SessionService sessionService, UserProfileRepository userProfileRepository,
                         ObjectProvider<TestSimulationFlags> flagsProvider) {
        this.jwtConfig = jwtConfig;
        this.securityMonitoringService = securityMonitoringService;
        this.applicationMetricsService = applicationMetricsService;
        this.userService = userService;
        this.sessionService = sessionService;
        this.userProfileRepository = userProfileRepository;
        this.flags = flagsProvider != null ? flagsProvider.getIfAvailable() : null;
    }

    @GetMapping(value = "/status", produces = "application/json")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(Map.of(
            "status", "available",
            "service", "auth"
        ));
    }

    @PostMapping(value = "/google", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> authenticateWithGoogle(@RequestBody GoogleAuthRequest request, HttpServletRequest httpRequest) {
        long startTime = System.currentTimeMillis();
        try {
            if (request == null) {
                throw com.app.exception.ValidationException.missingRequiredField("body");
            }

            if (request.getIdToken() == null || request.getIdToken().trim().isEmpty()) {
                throw new com.app.exception.ValidationException(
                        com.app.exception.ErrorCode.MISSING_REQUIRED_FIELD,
                        "ID token is required",
                        "idToken"
                );
            }

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

            DecodedJWT decodedJWT = jwtConfig.validateGoogleIdToken(request.getIdToken());

            if (!validateNonceIfPresent(decodedJWT, request.getNonce())) {
                throw new com.app.exception.AuthenticationException(
                        com.app.exception.ErrorCode.INVALID_TOKEN,
                        "Nonce validation failed",
                        "google",
                        "id_token"
                );
            }

            String providerId = decodedJWT.getSubject();
            User user = userService.getOrCreateUser("google", providerId).join();

            String accessToken = jwtConfig.generateAccessToken(user.getId(), "google");
            String refreshToken = jwtConfig.generateRefreshToken(user.getId());

            if (flags != null && flags.getFirebaseStatus() != null && flags.getFirebaseStatus() >= 500) {
                throw DownstreamServiceException.firebaseError("Firebase service error: status=" + flags.getFirebaseStatus(), null);
            }

            String deviceId = httpRequest.getHeader("X-Device-ID");
            String deviceType = extractDeviceType(httpRequest);
            String platform = extractPlatform(httpRequest);
            String appVersion = httpRequest.getHeader("X-App-Version");

            UserSession session = sessionService.createSession(
                user.getId(), refreshToken, deviceId, deviceType, platform, appVersion
            ).join();

            AuthResponse response = new AuthResponse();
            response.setSuccess(true);
            response.setUser(createUserProfileFromUser(user));
            response.setTokens(createTokenResponse(accessToken, refreshToken));
            response.setMessage("Google authentication successful");

            logger.info("Google sign-in successful for userId={}", user.getId());
            securityMonitoringService.logSuccessfulAuthentication(user.getId(), "google");

            long processingTime = System.currentTimeMillis() - startTime;
            applicationMetricsService.recordAuthentication("google", deviceType, platform, appVersion, true, processingTime);

            return ResponseEntity.ok(response);

        } catch (JWTVerificationException e) {
            logger.warn("Google authentication failed: {}", e.getMessage());
            securityMonitoringService.logFailedAuthentication("google");

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
                    com.app.exception.ErrorCode.INVALID_GOOGLE_TOKEN, msg, e, "google", "id_token");
        } catch (java.util.concurrent.CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw com.app.exception.DownstreamServiceException.firebaseError("Authentication storage error", cause);
        } catch (com.app.exception.GatewayException e) {
            throw e;
        } catch (Exception e) {
            throw new com.app.exception.GatewayException(com.app.exception.ErrorCode.INTERNAL_SERVER_ERROR, "Authentication failed", e);
        }
    }

    @PostMapping(value = "/apple", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> authenticateWithApple(@RequestBody AppleAuthRequest request, HttpServletRequest httpRequest) {
        long startTime = System.currentTimeMillis();
        try {
            if (request == null) {
                throw com.app.exception.ValidationException.missingRequiredField("body");
            }

            if (request.getIdToken() == null || request.getIdToken().trim().isEmpty()) {
                throw com.app.exception.ValidationException.missingRequiredField("idToken");
            }

            if (flags != null && flags.isMaintenanceMode()) {
                throw new GatewayException(ErrorCode.MAINTENANCE_MODE, "System is in maintenance mode");
            }

            DecodedJWT decodedJWT = jwtConfig.validateAppleIdToken(request.getIdToken());

            if (!validateNonceIfPresent(decodedJWT, request.getNonce())) {
                throw new com.app.exception.AuthenticationException(
                        com.app.exception.ErrorCode.INVALID_TOKEN, "Nonce validation failed", "apple", "id_token");
            }

            String providerId = decodedJWT.getSubject();
            User user = userService.getOrCreateUser("apple", providerId).join();

            String accessToken = jwtConfig.generateAccessToken(user.getId(), "apple");
            String refreshToken = jwtConfig.generateRefreshToken(user.getId());

            if (flags != null && flags.getFirebaseStatus() != null && flags.getFirebaseStatus() >= 500) {
                throw DownstreamServiceException.firebaseError("Firebase service error: status=" + flags.getFirebaseStatus(), null);
            }

            String deviceId = httpRequest.getHeader("X-Device-ID");
            String deviceType = extractDeviceType(httpRequest);
            String platform = extractPlatform(httpRequest);
            String appVersion = httpRequest.getHeader("X-App-Version");

            UserSession session = sessionService.createSession(
                user.getId(), refreshToken, deviceId, deviceType, platform, appVersion
            ).join();

            AuthResponse response = new AuthResponse();
            response.setSuccess(true);
            response.setUser(createUserProfileFromUser(user));
            response.setTokens(createTokenResponse(accessToken, refreshToken));
            response.setMessage("Apple authentication successful");

            logger.info("Apple sign-in successful for userId={}", user.getId());
            securityMonitoringService.logSuccessfulAuthentication(user.getId(), "apple");

            long processingTime = System.currentTimeMillis() - startTime;
            applicationMetricsService.recordAuthentication("apple", deviceType, platform, appVersion, true, processingTime);

            return ResponseEntity.ok(response);

        } catch (JWTVerificationException e) {
            logger.warn("Apple authentication failed: {}", e.getMessage());
            securityMonitoringService.logFailedAuthentication("apple");

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
                    com.app.exception.ErrorCode.INVALID_APPLE_TOKEN, msg, e, "apple", "id_token");
        } catch (java.util.concurrent.CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw com.app.exception.DownstreamServiceException.firebaseError("Authentication storage error", cause);
        } catch (com.app.exception.GatewayException e) {
            throw e;
        } catch (Exception e) {
            throw new com.app.exception.GatewayException(com.app.exception.ErrorCode.INTERNAL_SERVER_ERROR, "Authentication failed", e);
        }
    }
    @PostMapping(value = "/refresh", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> refreshToken(@RequestBody TokenRefreshRequest request, HttpServletRequest httpRequest) {
        long startTime = System.currentTimeMillis();
        String deviceType = "unknown";
        String platform = "unknown";

        try {
            deviceType = extractDeviceType(httpRequest);
            platform = extractPlatform(httpRequest);

            if (request == null) {
                throw com.app.exception.ValidationException.missingRequiredField("body");
            }

            if (request.getRefreshToken() == null || request.getRefreshToken().trim().isEmpty()) {
                throw com.app.exception.ValidationException.missingRequiredField("refreshToken");
            }

            Optional<UserSession> sessionOpt = sessionService.getSessionByRefreshToken(request.getRefreshToken()).join();
            if (sessionOpt.isEmpty()) {
                throw new com.app.exception.AuthenticationException(
                        com.app.exception.ErrorCode.INVALID_REFRESH_TOKEN, "Invalid refresh token");
            }

            UserSession session = sessionOpt.get();
            if (!session.isValid()) {
                throw new com.app.exception.AuthenticationException(
                        com.app.exception.ErrorCode.INVALID_REFRESH_TOKEN, "Expired or revoked refresh token");
            }

            Optional<User> userOpt = userService.getUserById(session.getUserId()).join();
            if (userOpt.isEmpty()) {
                throw new com.app.exception.AuthenticationException(
                        com.app.exception.ErrorCode.INVALID_REFRESH_TOKEN, "User not found");
            }

            User user = userOpt.get();
            String newAccessToken = jwtConfig.generateAccessToken(user.getId(), user.getProvider());
            String newRefreshToken = jwtConfig.generateRefreshToken(user.getId());

            sessionService.validateAndRefreshSession(request.getRefreshToken(), newRefreshToken).join();

            Optional<UserProfile> profileOpt = userProfileRepository.findByUserId(user.getId()).join();

            TokenRefreshResponse response = new TokenRefreshResponse();
            response.setSuccess(true);
            response.setTokens(createTokenResponse(newAccessToken, newRefreshToken));
            response.setMessage("Token refresh successful");

            if (profileOpt.isPresent()) {
                response.setProfile(profileOpt.get());
            }

            long processingTime = System.currentTimeMillis() - startTime;
            applicationMetricsService.recordTokenRefresh(user.getProvider(), deviceType, platform, true, processingTime);
            securityMonitoringService.logTokenRefresh(user.getId());

            logger.info("Token refresh successful for userId={}", user.getId());
            return ResponseEntity.ok(response);

        } catch (JWTVerificationException e) {
            long processingTime = System.currentTimeMillis() - startTime;
            applicationMetricsService.recordTokenRefresh("unknown", deviceType, platform, false, processingTime);

            logger.warn("Token refresh failed: {}", e.getMessage());
            String msg = e.getMessage() != null ? e.getMessage() : "Invalid refresh token";
            if (msg.toLowerCase().contains("expired")) {
                throw com.app.exception.AuthenticationException.expiredToken("refresh_token");
            }
            throw new com.app.exception.AuthenticationException(
                    com.app.exception.ErrorCode.INVALID_REFRESH_TOKEN, msg, e, null, "refresh_token");
        } catch (java.util.concurrent.CompletionException e) {
            long processingTime = System.currentTimeMillis() - startTime;
            applicationMetricsService.recordTokenRefresh("unknown", deviceType, platform, false, processingTime);
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw com.app.exception.DownstreamServiceException.firebaseError("Session store error", cause);
        } catch (com.app.exception.GatewayException e) {
            throw e;
        } catch (Exception e) {
            long processingTime = System.currentTimeMillis() - startTime;
            applicationMetricsService.recordTokenRefresh("unknown", deviceType, platform, false, processingTime);
            throw new com.app.exception.GatewayException(com.app.exception.ErrorCode.INTERNAL_SERVER_ERROR, "Token refresh failed", e);
        }
    }

    @PostMapping(value = "/revoke", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> revokeTokens(@RequestBody TokenRevokeRequest request, HttpServletRequest httpRequest) {
        String deviceType = extractDeviceType(httpRequest);
        String platform = extractPlatform(httpRequest);

        try {
            if (request == null) {
                throw com.app.exception.ValidationException.missingRequiredField("body");
            }

            if (request.getRefreshToken() == null || request.getRefreshToken().trim().isEmpty()) {
                throw com.app.exception.ValidationException.missingRequiredField("refreshToken");
            }

            Optional<UserSession> revokedSession = sessionService.revokeSessionByRefreshToken(request.getRefreshToken()).join();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);

            if (revokedSession.isPresent()) {
                response.put("message", "Tokens revoked successfully");
                logger.info("Session revoked for userId={}", revokedSession.get().getUserId());
                applicationMetricsService.recordTokenRevocation(deviceType, platform, "user_logout", true);
                securityMonitoringService.logTokenRevocation(revokedSession.get().getUserId(), "user_logout");
                applicationMetricsService.decrementActiveSessions();
            } else {
                response.put("message", "Token was already invalid or expired");
                applicationMetricsService.recordTokenRevocation(deviceType, platform, "invalid_token", true);
            }

            return ResponseEntity.ok(response);

        } catch (java.util.concurrent.CompletionException e) {
            applicationMetricsService.recordTokenRevocation(deviceType, platform, "error", false);
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw com.app.exception.DownstreamServiceException.firebaseError("Session store error", cause);
        } catch (com.app.exception.GatewayException e) {
            throw e;
        } catch (Exception e) {
            applicationMetricsService.recordTokenRevocation(deviceType, platform, "error", false);
            throw new com.app.exception.GatewayException(com.app.exception.ErrorCode.INTERNAL_SERVER_ERROR, "Token revocation failed", e);
        }
    }

    private UserInfo createUserProfileFromUser(User user) {
        UserInfo profile = new UserInfo();
        profile.setId(user.getId());
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


    public static class GoogleAuthRequest {
        private String idToken;
        private String clientId;
        private String nonce;
        private DeviceInfo deviceInfo;
        private UserInfo userInfo;

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
        private String authorizationCode;
        private String clientId;
        private String nonce;
        private DeviceInfo deviceInfo;
        private UserInfo userInfo;

        public String getIdToken() { return idToken; }
        public void setIdToken(String idToken) { this.idToken = idToken; }
        public String getAuthorizationCode() { return authorizationCode; }
        public void setAuthorizationCode(String authorizationCode) { this.authorizationCode = authorizationCode; }
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
        private UserInfo user;
        private JWTTokens tokens;
        private String message;

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public UserInfo getUser() { return user; }
        public void setUser(UserInfo user) { this.user = user; }
        public JWTTokens getTokens() { return tokens; }
        public void setTokens(JWTTokens tokens) { this.tokens = tokens; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    public static class TokenRefreshResponse {
        private boolean success;
        private JWTTokens tokens;
        private String message;
        private com.app.model.UserProfile profile;

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public JWTTokens getTokens() { return tokens; }
        public void setTokens(JWTTokens tokens) { this.tokens = tokens; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public com.app.model.UserProfile getProfile() { return profile; }
        public void setProfile(com.app.model.UserProfile profile) { this.profile = profile; }
    }

    public static class UserInfo {
        private String id;
        private String provider;
        private String providerId;
        private String createdAt;
        private String updatedAt;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
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

        public String getDeviceId() { return deviceId; }
        public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
        public String getPlatform() { return platform; }
        public void setPlatform(String platform) { this.platform = platform; }
        public String getOsVersion() { return osVersion; }
        public void setOsVersion(String osVersion) { this.osVersion = osVersion; }
        public String getAppVersion() { return appVersion; }
        public void setAppVersion(String appVersion) { this.appVersion = appVersion; }
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

    private String extractDeviceType(HttpServletRequest request) {
        String deviceType = request.getHeader("X-Device-Type");
        if (deviceType != null && !deviceType.trim().isEmpty()) {
            return deviceType.toLowerCase();
        }

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
        }
        return "unknown";
    }

    private String extractPlatform(HttpServletRequest request) {
        String platform = request.getHeader("X-Client-Platform");
        if (platform != null && !platform.trim().isEmpty()) {
            return platform.toLowerCase();
        }
        platform = request.getHeader("X-Platform");
        if (platform != null && !platform.trim().isEmpty()) {
            return platform.toLowerCase();
        }

        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) {
            return "unknown";
        }

        userAgent = userAgent.toLowerCase();
        if (userAgent.contains("android")) {
            return "android";
        } else if (userAgent.contains("ios") || userAgent.contains("iphone") || userAgent.contains("ipad")) {
            return "ios";
        } else if (userAgent.contains("windows")) {
            return "windows";
        } else if (userAgent.contains("mac")) {
            return "macos";
        } else if (userAgent.contains("linux")) {
            return "linux";
        }
        return userAgent;
    }
}
