package com.app.repository;

import com.app.model.UserSession;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Repository interface for UserSession operations with Firebase Firestore
 */
public interface UserSessionRepository {

    /**
     * Save or update a user session
     * @param session UserSession to save
     * @return CompletableFuture with the saved session
     */
    CompletableFuture<UserSession> save(UserSession session);

    /**
     * Find session by ID
     * @param sessionId Session ID
     * @return CompletableFuture with Optional session
     */
    CompletableFuture<Optional<UserSession>> findById(String sessionId);

    /**
     * Find session by refresh token
     * @param refreshToken Refresh token
     * @return CompletableFuture with Optional session
     */
    CompletableFuture<Optional<UserSession>> findByRefreshToken(String refreshToken);

    /**
     * Find all active sessions for a user
     * @param userId User ID
     * @return CompletableFuture with list of active sessions
     */
    CompletableFuture<List<UserSession>> findActiveSessionsByUserId(String userId);

    /**
     * Find all sessions for a user (active and inactive)
     * @param userId User ID
     * @return CompletableFuture with list of all sessions
     */
    CompletableFuture<List<UserSession>> findAllSessionsByUserId(String userId);

    /**
     * Find sessions by device ID
     * @param deviceId Device ID
     * @return CompletableFuture with list of sessions
     */
    CompletableFuture<List<UserSession>> findSessionsByDeviceId(String deviceId);

    /**
     * Update session's last accessed timestamp
     * @param sessionId Session ID
     * @return CompletableFuture with updated session
     */
    CompletableFuture<UserSession> updateLastAccessed(String sessionId);

    /**
     * Revoke a session
     * @param sessionId Session ID
     * @return CompletableFuture with revoked session
     */
    CompletableFuture<UserSession> revokeSession(String sessionId);

    /**
     * Revoke all sessions for a user
     * @param userId User ID
     * @return CompletableFuture with list of revoked sessions
     */
    CompletableFuture<List<UserSession>> revokeAllUserSessions(String userId);

    /**
     * Revoke all sessions for a device
     * @param deviceId Device ID
     * @return CompletableFuture with list of revoked sessions
     */
    CompletableFuture<List<UserSession>> revokeAllDeviceSessions(String deviceId);

    /**
     * Delete expired sessions
     * @return CompletableFuture with count of deleted sessions
     */
    CompletableFuture<Long> deleteExpiredSessions();

    /**
     * Delete session permanently
     * @param sessionId Session ID
     * @return CompletableFuture with void
     */
    CompletableFuture<Void> deleteSession(String sessionId);

    /**
     * Count active sessions for a user
     * @param userId User ID
     * @return CompletableFuture with session count
     */
    CompletableFuture<Long> countActiveSessionsByUserId(String userId);

    /**
     * Count total active sessions
     * @return CompletableFuture with total session count
     */
    CompletableFuture<Long> countActiveSessions();

    /**
     * Find all active sessions (across all users)
     * Used for refresh token validation when tokens are hashed
     * @return CompletableFuture with list of all active sessions
     */
    CompletableFuture<List<UserSession>> findAllActiveSessions();

    /**
     * Find sessions that will expire soon (within specified minutes)
     * @param withinMinutes Minutes until expiration
     * @return CompletableFuture with list of sessions
     */
    CompletableFuture<List<UserSession>> findSessionsExpiringWithin(int withinMinutes);

    /**
     * Extend session expiration
     * @param sessionId Session ID
     * @param additionalSeconds Additional seconds to extend
     * @return CompletableFuture with updated session
     */
    CompletableFuture<UserSession> extendSession(String sessionId, long additionalSeconds);

    /**
     * Update session refresh token
     * @param sessionId Session ID
     * @param newRefreshToken New refresh token
     * @return CompletableFuture with updated session
     */
    CompletableFuture<UserSession> updateRefreshToken(String sessionId, String newRefreshToken);
}
