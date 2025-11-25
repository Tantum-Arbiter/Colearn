package com.app.service;

import com.app.model.UserSession;
import com.app.repository.UserSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Service layer for UserSession management with business logic
 */
@Service
public class SessionService {

    private static final Logger logger = LoggerFactory.getLogger(SessionService.class);
    
    // Default session expiration: 7 days
    private static final long DEFAULT_SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
    
    // Maximum sessions per user
    private static final int MAX_SESSIONS_PER_USER = 5;

    private final UserSessionRepository sessionRepository;
    private final ApplicationMetricsService metricsService;
    private final RefreshTokenHashingService hashingService;

    @Autowired
    public SessionService(UserSessionRepository sessionRepository,
                         ApplicationMetricsService metricsService,
                         RefreshTokenHashingService hashingService) {
        this.sessionRepository = sessionRepository;
        this.metricsService = metricsService;
        this.hashingService = hashingService;
    }

    /**
     * Create a new user session
     */
    public CompletableFuture<UserSession> createSession(String userId, String refreshToken, 
                                                      String deviceId, String deviceType, 
                                                      String platform, String appVersion) {
        logger.debug("Creating new session for user: {} on device: {}", userId, deviceId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Check if user has too many active sessions
                long activeSessionCount = sessionRepository.countActiveSessionsByUserId(userId).join();
                if (activeSessionCount >= MAX_SESSIONS_PER_USER) {
                    logger.warn("User {} has too many active sessions ({}), revoking oldest", userId, activeSessionCount);
                    // Revoke oldest session
                    revokeOldestUserSession(userId).join();
                }

                // Create new session
                UserSession session = new UserSession();
                session.setId(UUID.randomUUID().toString());
                session.setUserId(userId);

                // Hash the refresh token before storing (security compliance)
                String hashedRefreshToken = hashingService.hashToken(refreshToken);
                session.setRefreshToken(hashedRefreshToken);

                session.setDeviceId(deviceId);
                session.setDeviceType(deviceType);
                session.setPlatform(platform);
                session.setAppVersion(appVersion);
                session.setActive(true);
                session.setCreatedAt(Instant.now());
                session.setLastAccessedAt(Instant.now());
                session.setExpiresAt(Instant.now().plusSeconds(DEFAULT_SESSION_EXPIRY_SECONDS));

                // Save session
                UserSession savedSession = sessionRepository.save(session).join();
                
                // Record metrics
                metricsService.recordSessionCreated(deviceType, platform);
                
                logger.info("Session created successfully: {} for user: {}", savedSession.getId(), userId);
                return savedSession;
                
            } catch (Exception e) {
                logger.error("Error creating session for user: {}", userId, e);
                metricsService.recordSessionCreationError(deviceType, e.getClass().getSimpleName());
                throw new RuntimeException("Failed to create session", e);
            }
        });
    }

    /**
     * Get session by ID
     */
    public CompletableFuture<Optional<UserSession>> getSessionById(String sessionId) {
        logger.debug("Getting session by ID: {}", sessionId);
        
        return sessionRepository.findById(sessionId)
                .thenApply(sessionOpt -> {
                    if (sessionOpt.isPresent()) {
                        UserSession session = sessionOpt.get();
                        if (session.isValid()) {
                            metricsService.recordSessionLookup("id", "found");
                            return Optional.of(session);
                        } else {
                            metricsService.recordSessionLookup("id", "expired");
                            return Optional.empty();
                        }
                    } else {
                        metricsService.recordSessionLookup("id", "not_found");
                        return Optional.empty();
                    }
                });
    }

    /**
     * Get session by refresh token
     *
     * Note: Since refresh tokens are hashed, we cannot query Firestore directly.
     * Instead, we fetch all active sessions and validate the hash in-memory.
     * This is acceptable because:
     * - We limit sessions to MAX_SESSIONS_PER_USER (5) per user
     * - Token refresh is infrequent (every 15 minutes at most)
     * - BCrypt validation is fast (~250ms per session)
     *
     * Alternative approach: Store userId in JWT and query by userId first.
     * For now, we fetch all active sessions (acceptable for small user base).
     */
    public CompletableFuture<Optional<UserSession>> getSessionByRefreshToken(String refreshToken) {
        logger.debug("Getting session by refresh token (validating hash)");

        // Fetch all active sessions and validate hash in-memory
        return sessionRepository.findAllActiveSessions()
                .thenApply(sessions -> {
                    for (UserSession session : sessions) {
                        // Validate the provided token against the stored hash
                        if (hashingService.validateToken(refreshToken, session.getRefreshToken())) {
                            if (session.isValid()) {
                                metricsService.recordSessionLookup("refresh_token", "found");
                                logger.debug("Session found and validated: {}", session.getId());
                                return Optional.of(session);
                            } else {
                                metricsService.recordSessionLookup("refresh_token", "expired");
                                logger.debug("Session found but expired: {}", session.getId());
                                return Optional.empty();
                            }
                        }
                    }

                    // No matching session found
                    metricsService.recordSessionLookup("refresh_token", "not_found");
                    logger.debug("No session found matching refresh token");
                    return Optional.empty();
                });
    }

    /**
     * Validate and refresh session
     */
    public CompletableFuture<UserSession> validateAndRefreshSession(String refreshToken, String newRefreshToken) {
        logger.debug("Validating and refreshing session");

        return getSessionByRefreshToken(refreshToken)
                .thenCompose(sessionOpt -> {
                    if (sessionOpt.isEmpty()) {
                        throw new IllegalArgumentException("Invalid refresh token");
                    }

                    UserSession session = sessionOpt.get();

                    // Hash the new refresh token before storing (security compliance)
                    String hashedNewRefreshToken = hashingService.hashToken(newRefreshToken);

                    // Update session with new refresh token and extend expiration
                    return sessionRepository.updateRefreshToken(session.getId(), hashedNewRefreshToken)
                            .thenCompose(updatedSession ->
                                sessionRepository.extendSession(session.getId(), DEFAULT_SESSION_EXPIRY_SECONDS))
                            .thenCompose(extendedSession ->
                                sessionRepository.updateLastAccessed(session.getId()))
                            .thenApply(finalSession -> {
                                metricsService.recordSessionRefreshed(session.getDeviceType(), session.getPlatform());
                                logger.debug("Session refreshed successfully: {}", session.getId());
                                return finalSession;
                            });
                });
    }

    /**
     * Revoke session
     */
    public CompletableFuture<UserSession> revokeSession(String sessionId) {
        logger.debug("Revoking session: {}", sessionId);
        
        return sessionRepository.revokeSession(sessionId)
                .thenApply(session -> {
                    metricsService.recordSessionRevoked(session.getDeviceType(), session.getPlatform(), "manual");
                    logger.info("Session revoked: {}", sessionId);
                    return session;
                });
    }

    /**
     * Revoke session by refresh token
     */
    public CompletableFuture<Optional<UserSession>> revokeSessionByRefreshToken(String refreshToken) {
        logger.debug("Revoking session by refresh token");
        
        return getSessionByRefreshToken(refreshToken)
                .thenCompose(sessionOpt -> {
                    if (sessionOpt.isEmpty()) {
                        return CompletableFuture.completedFuture(Optional.<UserSession>empty());
                    }
                    
                    UserSession session = sessionOpt.get();
                    return revokeSession(session.getId())
                            .thenApply(Optional::of);
                });
    }

    /**
     * Revoke all sessions for a user
     */
    public CompletableFuture<List<UserSession>> revokeAllUserSessions(String userId) {
        logger.info("Revoking all sessions for user: {}", userId);
        
        return sessionRepository.revokeAllUserSessions(userId)
                .thenApply(sessions -> {
                    metricsService.recordUserSessionsRevoked(userId, sessions.size());
                    logger.info("Revoked {} sessions for user: {}", sessions.size(), userId);
                    return sessions;
                });
    }

    /**
     * Revoke all sessions for a device
     */
    public CompletableFuture<List<UserSession>> revokeAllDeviceSessions(String deviceId) {
        logger.info("Revoking all sessions for device: {}", deviceId);
        
        return sessionRepository.revokeAllDeviceSessions(deviceId)
                .thenApply(sessions -> {
                    metricsService.recordDeviceSessionsRevoked(deviceId, sessions.size());
                    logger.info("Revoked {} sessions for device: {}", sessions.size(), deviceId);
                    return sessions;
                });
    }

    /**
     * Get active sessions for user
     */
    public CompletableFuture<List<UserSession>> getActiveUserSessions(String userId) {
        logger.debug("Getting active sessions for user: {}", userId);
        
        return sessionRepository.findActiveSessionsByUserId(userId)
                .thenApply(sessions -> {
                    metricsService.recordUserSessionQuery(userId, sessions.size());
                    return sessions;
                });
    }

    /**
     * Clean up expired sessions
     */
    public CompletableFuture<Long> cleanupExpiredSessions() {
        logger.info("Cleaning up expired sessions");
        
        return sessionRepository.deleteExpiredSessions()
                .thenApply(deletedCount -> {
                    metricsService.recordExpiredSessionsCleanup(deletedCount);
                    logger.info("Cleaned up {} expired sessions", deletedCount);
                    return deletedCount;
                });
    }

    /**
     * Get sessions expiring soon (for proactive refresh)
     */
    public CompletableFuture<List<UserSession>> getSessionsExpiringSoon(int withinMinutes) {
        logger.debug("Getting sessions expiring within {} minutes", withinMinutes);
        
        return sessionRepository.findSessionsExpiringWithin(withinMinutes)
                .thenApply(sessions -> {
                    metricsService.recordExpiringSessionsQuery(withinMinutes, sessions.size());
                    return sessions;
                });
    }

    /**
     * Count active sessions
     */
    public CompletableFuture<Long> countActiveSessions() {
        logger.debug("Counting active sessions");
        
        return sessionRepository.countActiveSessions();
    }

    /**
     * Update session last accessed time
     */
    public CompletableFuture<UserSession> updateSessionAccess(String sessionId) {
        logger.debug("Updating session access: {}", sessionId);
        
        return sessionRepository.updateLastAccessed(sessionId)
                .thenApply(session -> {
                    metricsService.recordSessionAccess(session.getDeviceType(), session.getPlatform());
                    return session;
                });
    }

    // Helper methods

    private CompletableFuture<Void> revokeOldestUserSession(String userId) {
        return sessionRepository.findActiveSessionsByUserId(userId)
                .thenCompose(sessions -> {
                    if (sessions.isEmpty()) {
                        return CompletableFuture.completedFuture(null);
                    }
                    
                    // Find oldest session
                    UserSession oldestSession = sessions.stream()
                            .min((s1, s2) -> s1.getCreatedAt().compareTo(s2.getCreatedAt()))
                            .orElse(null);
                    
                    if (oldestSession != null) {
                        return revokeSession(oldestSession.getId())
                                .thenApply(session -> {
                                    metricsService.recordSessionRevoked(session.getDeviceType(), 
                                            session.getPlatform(), "auto_cleanup");
                                    return null;
                                });
                    }
                    
                    return CompletableFuture.completedFuture(null);
                });
    }
}
