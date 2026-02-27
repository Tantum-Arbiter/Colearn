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

@Service
public class SessionService {

    private static final Logger logger = LoggerFactory.getLogger(SessionService.class);
    private static final long DEFAULT_SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
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

    public CompletableFuture<UserSession> createSession(String userId, String refreshToken,
                                                      String deviceId, String deviceType,
                                                      String platform, String appVersion) {
        logger.debug("Creating new session for user: {} on device: {}", userId, deviceId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                long activeSessionCount = sessionRepository.countActiveSessionsByUserId(userId).join();
                if (activeSessionCount >= MAX_SESSIONS_PER_USER) {
                    logger.warn("User {} has too many active sessions ({}), revoking oldest", userId, activeSessionCount);
                    revokeOldestUserSession(userId).join();
                }

                UserSession session = new UserSession();
                session.setId(UUID.randomUUID().toString());
                session.setUserId(userId);
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

                UserSession savedSession = sessionRepository.save(session).join();
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

    public CompletableFuture<Optional<UserSession>> getSessionByRefreshToken(String refreshToken) {
        logger.debug("Getting session by refresh token");

        return sessionRepository.findAllActiveSessions()
                .thenApply(sessions -> {
                    for (UserSession session : sessions) {
                        if (hashingService.validateToken(refreshToken, session.getRefreshToken())) {
                            if (session.isValid()) {
                                metricsService.recordSessionLookup("refresh_token", "found");
                                return Optional.of(session);
                            } else {
                                metricsService.recordSessionLookup("refresh_token", "expired");
                                return Optional.empty();
                            }
                        }
                    }
                    metricsService.recordSessionLookup("refresh_token", "not_found");
                    return Optional.empty();
                });
    }

    public CompletableFuture<UserSession> validateAndRefreshSession(String refreshToken, String newRefreshToken) {
        logger.debug("Validating and refreshing session");

        return getSessionByRefreshToken(refreshToken)
                .thenCompose(sessionOpt -> {
                    if (sessionOpt.isEmpty()) {
                        throw new IllegalArgumentException("Invalid refresh token");
                    }

                    UserSession session = sessionOpt.get();
                    String hashedNewRefreshToken = hashingService.hashToken(newRefreshToken);

                    return sessionRepository.updateRefreshToken(session.getId(), hashedNewRefreshToken)
                            .thenCompose(updatedSession ->
                                sessionRepository.extendSession(session.getId(), DEFAULT_SESSION_EXPIRY_SECONDS))
                            .thenCompose(extendedSession ->
                                sessionRepository.updateLastAccessed(session.getId()))
                            .thenApply(finalSession -> {
                                metricsService.recordSessionRefreshed(session.getDeviceType(), session.getPlatform());
                                return finalSession;
                            });
                });
    }

    public CompletableFuture<UserSession> revokeSession(String sessionId) {
        logger.debug("Revoking session: {}", sessionId);
        
        return sessionRepository.revokeSession(sessionId)
                .thenApply(session -> {
                    metricsService.recordSessionRevoked(session.getDeviceType(), session.getPlatform(), "manual");
                    logger.info("Session revoked: {}", sessionId);
                    return session;
                });
    }

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

    public CompletableFuture<List<UserSession>> revokeAllUserSessions(String userId) {
        logger.info("Revoking all sessions for user: {}", userId);
        
        return sessionRepository.revokeAllUserSessions(userId)
                .thenApply(sessions -> {
                    metricsService.recordUserSessionsRevoked(userId, sessions.size());
                    logger.info("Revoked {} sessions for user: {}", sessions.size(), userId);
                    return sessions;
                });
    }

    public CompletableFuture<List<UserSession>> revokeAllDeviceSessions(String deviceId) {
        logger.info("Revoking all sessions for device: {}", deviceId);
        
        return sessionRepository.revokeAllDeviceSessions(deviceId)
                .thenApply(sessions -> {
                    metricsService.recordDeviceSessionsRevoked(deviceId, sessions.size());
                    logger.info("Revoked {} sessions for device: {}", sessions.size(), deviceId);
                    return sessions;
                });
    }

    public CompletableFuture<List<UserSession>> getActiveUserSessions(String userId) {
        logger.debug("Getting active sessions for user: {}", userId);
        
        return sessionRepository.findActiveSessionsByUserId(userId)
                .thenApply(sessions -> {
                    metricsService.recordUserSessionQuery(userId, sessions.size());
                    return sessions;
                });
    }

    public CompletableFuture<Long> cleanupExpiredSessions() {
        logger.info("Cleaning up expired sessions");
        
        return sessionRepository.deleteExpiredSessions()
                .thenApply(deletedCount -> {
                    metricsService.recordExpiredSessionsCleanup(deletedCount);
                    logger.info("Cleaned up {} expired sessions", deletedCount);
                    return deletedCount;
                });
    }

    public CompletableFuture<List<UserSession>> getSessionsExpiringSoon(int withinMinutes) {
        logger.debug("Getting sessions expiring within {} minutes", withinMinutes);
        
        return sessionRepository.findSessionsExpiringWithin(withinMinutes)
                .thenApply(sessions -> {
                    metricsService.recordExpiringSessionsQuery(withinMinutes, sessions.size());
                    return sessions;
                });
    }

    public CompletableFuture<Long> countActiveSessions() {
        logger.debug("Counting active sessions");
        
        return sessionRepository.countActiveSessions();
    }

    public CompletableFuture<UserSession> updateSessionAccess(String sessionId) {
        logger.debug("Updating session access: {}", sessionId);
        
        return sessionRepository.updateLastAccessed(sessionId)
                .thenApply(session -> {
                    metricsService.recordSessionAccess(session.getDeviceType(), session.getPlatform());
                    return session;
                });
    }

    private CompletableFuture<Void> revokeOldestUserSession(String userId) {
        return sessionRepository.findActiveSessionsByUserId(userId)
                .thenCompose(sessions -> {
                    if (sessions.isEmpty()) {
                        return CompletableFuture.completedFuture(null);
                    }

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
