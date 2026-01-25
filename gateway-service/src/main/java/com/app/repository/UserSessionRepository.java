package com.app.repository;

import com.app.model.UserSession;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

public interface UserSessionRepository {

    CompletableFuture<UserSession> save(UserSession session);

    CompletableFuture<Optional<UserSession>> findById(String sessionId);

    CompletableFuture<Optional<UserSession>> findByRefreshToken(String refreshToken);

    CompletableFuture<List<UserSession>> findActiveSessionsByUserId(String userId);

    CompletableFuture<List<UserSession>> findAllSessionsByUserId(String userId);

    CompletableFuture<List<UserSession>> findSessionsByDeviceId(String deviceId);

    CompletableFuture<UserSession> updateLastAccessed(String sessionId);

    CompletableFuture<UserSession> revokeSession(String sessionId);

    CompletableFuture<List<UserSession>> revokeAllUserSessions(String userId);

    CompletableFuture<List<UserSession>> revokeAllDeviceSessions(String deviceId);

    CompletableFuture<Long> deleteExpiredSessions();

    CompletableFuture<Void> deleteSession(String sessionId);

    CompletableFuture<Long> countActiveSessionsByUserId(String userId);

    CompletableFuture<Long> countActiveSessions();

    CompletableFuture<List<UserSession>> findAllActiveSessions();

    CompletableFuture<List<UserSession>> findSessionsExpiringWithin(int withinMinutes);

    CompletableFuture<UserSession> extendSession(String sessionId, long additionalSeconds);

    CompletableFuture<UserSession> updateRefreshToken(String sessionId, String newRefreshToken);
}
