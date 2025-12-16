package com.app.controller;

import com.app.config.JwtConfig;
import com.app.exception.DownstreamServiceException;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.User;
import com.app.model.UserSession;
import com.app.service.ApplicationMetricsService;
import com.app.service.SecurityMonitoringService;
import com.app.service.SessionService;
import com.app.service.UserService;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Firebase Authentication Controller - ONLY available in test and gcp-dev profiles.
 * This controller enables functional tests to authenticate using Firebase ID tokens
 * in GCP environments where WireMock is not available.
 * 
 * Production environments will NOT have this endpoint (returns 404).
 */
@RestController
@RequestMapping("/auth")
@Profile({"test", "gcp-dev"})
@CrossOrigin(origins = "*", maxAge = 3600)
public class FirebaseAuthController {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseAuthController.class);

    private final JwtConfig jwtConfig;
    private final UserService userService;
    private final SessionService sessionService;
    private final SecurityMonitoringService securityMonitoringService;
    private final ApplicationMetricsService applicationMetricsService;

    public FirebaseAuthController(
            JwtConfig jwtConfig,
            UserService userService,
            SessionService sessionService,
            SecurityMonitoringService securityMonitoringService,
            ApplicationMetricsService applicationMetricsService) {
        this.jwtConfig = jwtConfig;
        this.userService = userService;
        this.sessionService = sessionService;
        this.securityMonitoringService = securityMonitoringService;
        this.applicationMetricsService = applicationMetricsService;
    }

    @PostMapping(value = "/firebase", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> authenticateWithFirebase(
            @RequestBody FirebaseAuthRequest request,
            HttpServletRequest httpRequest) {
        long startTime = System.currentTimeMillis();
        try {
            if (request == null) {
                throw com.app.exception.ValidationException.missingRequiredField("body");
            }

            if (request.getIdToken() == null || request.getIdToken().trim().isEmpty()) {
                throw new com.app.exception.ValidationException(
                        ErrorCode.MISSING_REQUIRED_FIELD,
                        "ID token is required",
                        "idToken"
                );
            }

            logger.info("Firebase authentication attempt (test/gcp-dev only)");

            DecodedJWT decodedJWT = jwtConfig.validateFirebaseIdToken(request.getIdToken());

            String providerId = decodedJWT.getSubject();

            User user = userService.getOrCreateUser("firebase", providerId).join();

            String accessToken = jwtConfig.generateAccessToken(user.getId(), "firebase");
            String refreshToken = jwtConfig.generateRefreshToken(user.getId());

            String deviceId = httpRequest.getHeader("X-Device-ID");
            String deviceType = httpRequest.getHeader("X-Device-Type");
            String platform = httpRequest.getHeader("X-Client-Platform");
            String appVersion = httpRequest.getHeader("X-App-Version");

            sessionService.createSession(
                    user.getId(), refreshToken, deviceId, deviceType, platform, appVersion
            ).join();

            AuthController.AuthResponse response = new AuthController.AuthResponse();
            response.setSuccess(true);
            response.setUser(createUserProfileFromUser(user));
            response.setTokens(createTokenResponse(accessToken, refreshToken));
            response.setMessage("Firebase authentication successful");

            logger.info("Firebase authentication successful for user ID: {}", user.getId());

            securityMonitoringService.logSuccessfulAuthentication(user.getId(), "firebase");

            long processingTime = System.currentTimeMillis() - startTime;
            applicationMetricsService.recordAuthentication("firebase", deviceType, platform, appVersion, true, processingTime);

            return ResponseEntity.ok(response);

        } catch (JWTVerificationException e) {
            logger.warn("Firebase authentication failed: {}", e.getMessage());

            securityMonitoringService.logFailedAuthentication("firebase");

            long processingTime = System.currentTimeMillis() - startTime;
            String deviceType = httpRequest.getHeader("X-Device-Type");
            String platform = httpRequest.getHeader("X-Client-Platform");
            String appVersion = httpRequest.getHeader("X-App-Version");
            applicationMetricsService.recordAuthentication("firebase", deviceType, platform, appVersion, false, processingTime);

            String msg = e.getMessage() != null ? e.getMessage() : "Invalid token";
            if (msg.toLowerCase().contains("expired")) {
                throw com.app.exception.AuthenticationException.expiredToken("id_token");
            }
            throw new com.app.exception.AuthenticationException(
                    ErrorCode.INVALID_TOKEN,
                    msg,
                    e,
                    "firebase",
                    "id_token"
            );
        } catch (java.util.concurrent.CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw DownstreamServiceException.firebaseError("Authentication storage error", cause);
        } catch (GatewayException e) {
            throw e;
        } catch (Exception e) {
            throw new GatewayException(ErrorCode.INTERNAL_SERVER_ERROR, "Authentication failed", e);
        }
    }

    private AuthController.UserInfo createUserProfileFromUser(User user) {
        AuthController.UserInfo profile = new AuthController.UserInfo();
        profile.setId(user.getId());
        profile.setProvider(user.getProvider());
        profile.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        return profile;
    }

    private AuthController.JWTTokens createTokenResponse(String accessToken, String refreshToken) {
        AuthController.JWTTokens tokens = new AuthController.JWTTokens();
        tokens.setAccessToken(accessToken);
        tokens.setRefreshToken(refreshToken);
        tokens.setExpiresAt(System.currentTimeMillis() + (jwtConfig.getJwtExpirationInSeconds() * 1000L));
        tokens.setTokenType("Bearer");
        return tokens;
    }

    public static class FirebaseAuthRequest {
        private String idToken;

        public String getIdToken() { return idToken; }
        public void setIdToken(String idToken) { this.idToken = idToken; }
    }
}

