package com.app.repository.impl;

import com.app.model.UserSession;
import com.app.repository.UserSessionRepository;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseUserSessionRepository implements UserSessionRepository {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseUserSessionRepository.class);
    private static final String COLLECTION_NAME = "user_sessions";

    private final Firestore firestore;

    @Autowired
    public FirebaseUserSessionRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public CompletableFuture<UserSession> save(UserSession session) {
        logger.debug("Saving user session: {}", session.getId());
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(session.getId());
                ApiFuture<WriteResult> future = docRef.set(session);
                
                WriteResult result = future.get();
                logger.debug("User session saved successfully: {} at {}", session.getId(), result.getUpdateTime());
                
                return session;
            } catch (Exception e) {
                logger.error("Error saving user session: {}", session.getId(), e);
                throw new RuntimeException("Failed to save user session", e);
            }
        });
    }

    @Override
    public CompletableFuture<Optional<UserSession>> findById(String sessionId) {
        logger.debug("Finding user session by ID: {}", sessionId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(sessionId);
                ApiFuture<DocumentSnapshot> future = docRef.get();
                
                DocumentSnapshot document = future.get();
                
                if (document.exists()) {
                    UserSession session = document.toObject(UserSession.class);
                    logger.debug("User session found: {}", sessionId);
                    return Optional.of(session);
                } else {
                    logger.debug("User session not found: {}", sessionId);
                    return Optional.empty();
                }
            } catch (Exception e) {
                logger.error("Error finding user session by ID: {}", sessionId, e);
                throw new RuntimeException("Failed to find user session", e);
            }
        });
    }

    @Override
    public CompletableFuture<Optional<UserSession>> findByRefreshToken(String refreshToken) {
        logger.debug("Finding user session by refresh token");
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("refreshToken", refreshToken)
                        .limit(1);
                
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                if (!querySnapshot.isEmpty()) {
                    DocumentSnapshot document = querySnapshot.getDocuments().get(0);
                    UserSession session = document.toObject(UserSession.class);
                    logger.debug("User session found by refresh token");
                    return Optional.of(session);
                } else {
                    logger.debug("User session not found by refresh token");
                    return Optional.empty();
                }
            } catch (Exception e) {
                logger.error("Error finding user session by refresh token", e);
                throw new RuntimeException("Failed to find user session by refresh token", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<UserSession>> findActiveSessionsByUserId(String userId) {
        logger.debug("Finding active sessions for user: {}", userId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("userId", userId)
                        .whereEqualTo("isActive", true);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                List<UserSession> sessions = new ArrayList<>();
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    UserSession session = document.toObject(UserSession.class);
                    if (session != null && session.isValid()) {
                        sessions.add(session);
                    }
                }
                
                logger.debug("Found {} active sessions for user: {}", sessions.size(), userId);
                return sessions;
            } catch (Exception e) {
                logger.error("Error finding active sessions for user: {}", userId, e);
                throw new RuntimeException("Failed to find active sessions", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<UserSession>> findAllSessionsByUserId(String userId) {
        logger.debug("Finding all sessions for user: {}", userId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("userId", userId);
                
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                List<UserSession> sessions = new ArrayList<>();
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    UserSession session = document.toObject(UserSession.class);
                    if (session != null) {
                        sessions.add(session);
                    }
                }
                
                logger.debug("Found {} total sessions for user: {}", sessions.size(), userId);
                return sessions;
            } catch (Exception e) {
                logger.error("Error finding all sessions for user: {}", userId, e);
                throw new RuntimeException("Failed to find sessions", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<UserSession>> findSessionsByDeviceId(String deviceId) {
        logger.debug("Finding sessions for device: {}", deviceId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("deviceId", deviceId);
                
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                List<UserSession> sessions = new ArrayList<>();
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    UserSession session = document.toObject(UserSession.class);
                    if (session != null) {
                        sessions.add(session);
                    }
                }
                
                logger.debug("Found {} sessions for device: {}", sessions.size(), deviceId);
                return sessions;
            } catch (Exception e) {
                logger.error("Error finding sessions for device: {}", deviceId, e);
                throw new RuntimeException("Failed to find sessions by device", e);
            }
        });
    }

    @Override
    public CompletableFuture<UserSession> updateLastAccessed(String sessionId) {
        logger.debug("Updating last accessed for session: {}", sessionId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(sessionId);
                
                Instant now = Instant.now();
                ApiFuture<WriteResult> future = docRef.update(
                        "lastAccessedAt", now
                );
                
                WriteResult result = future.get();
                logger.debug("Last accessed updated for session: {} at {}", sessionId, result.getUpdateTime());
                return findById(sessionId).join().orElseThrow(() ->
                        new RuntimeException("Session not found after update: " + sessionId));
                
            } catch (Exception e) {
                logger.error("Error updating last accessed for session: {}", sessionId, e);
                throw new RuntimeException("Failed to update last accessed", e);
            }
        });
    }

    @Override
    public CompletableFuture<UserSession> revokeSession(String sessionId) {
        logger.debug("Revoking session: {}", sessionId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(sessionId);
                
                Instant now = Instant.now();
                ApiFuture<WriteResult> future = docRef.update(
                        "isActive", false,
                        "revokedAt", now
                );

                WriteResult result = future.get();
                logger.debug("Session revoked: {} at {}", sessionId, result.getUpdateTime());
                return findById(sessionId).join().orElseThrow(() ->
                        new RuntimeException("Session not found after revocation: " + sessionId));
                
            } catch (Exception e) {
                logger.error("Error revoking session: {}", sessionId, e);
                throw new RuntimeException("Failed to revoke session", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<UserSession>> revokeAllUserSessions(String userId) {
        logger.debug("Revoking all sessions for user: {}", userId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<UserSession> activeSessions = findActiveSessionsByUserId(userId).join();
                List<UserSession> revokedSessions = new ArrayList<>();
                for (UserSession session : activeSessions) {
                    UserSession revokedSession = revokeSession(session.getId()).join();
                    revokedSessions.add(revokedSession);
                }
                
                logger.debug("Revoked {} sessions for user: {}", revokedSessions.size(), userId);
                return revokedSessions;
            } catch (Exception e) {
                logger.error("Error revoking all sessions for user: {}", userId, e);
                throw new RuntimeException("Failed to revoke all user sessions", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<UserSession>> revokeAllDeviceSessions(String deviceId) {
        logger.debug("Revoking all sessions for device: {}", deviceId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<UserSession> deviceSessions = findSessionsByDeviceId(deviceId).join();
                List<UserSession> revokedSessions = new ArrayList<>();
                for (UserSession session : deviceSessions) {
                    if (session.isActive()) {
                        UserSession revokedSession = revokeSession(session.getId()).join();
                        revokedSessions.add(revokedSession);
                    }
                }
                
                logger.debug("Revoked {} sessions for device: {}", revokedSessions.size(), deviceId);
                return revokedSessions;
            } catch (Exception e) {
                logger.error("Error revoking all sessions for device: {}", deviceId, e);
                throw new RuntimeException("Failed to revoke all device sessions", e);
            }
        });
    }

    @Override
    public CompletableFuture<Long> deleteExpiredSessions() {
        logger.debug("Deleting expired sessions");

        return CompletableFuture.supplyAsync(() -> {
            try {
                Instant now = Instant.now();

                Query query = firestore.collection(COLLECTION_NAME)
                        .whereLessThan("expiresAt", now);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                long deletedCount = 0;
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    ApiFuture<WriteResult> deleteFuture = document.getReference().delete();
                    deleteFuture.get();
                    deletedCount++;
                }

                logger.debug("Deleted {} expired sessions", deletedCount);
                return deletedCount;
            } catch (Exception e) {
                logger.error("Error deleting expired sessions", e);
                throw new RuntimeException("Failed to delete expired sessions", e);
            }
        });
    }

    @Override
    public CompletableFuture<Void> deleteSession(String sessionId) {
        logger.debug("Deleting session: {}", sessionId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(sessionId);
                ApiFuture<WriteResult> future = docRef.delete();

                WriteResult result = future.get();
                logger.debug("Session deleted: {} at {}", sessionId, result.getUpdateTime());

                return null;
            } catch (Exception e) {
                logger.error("Error deleting session: {}", sessionId, e);
                throw new RuntimeException("Failed to delete session", e);
            }
        });
    }

    @Override
    public CompletableFuture<Long> countActiveSessionsByUserId(String userId) {
        logger.debug("Counting active sessions for user: {}", userId);

        return findActiveSessionsByUserId(userId).thenApply(sessions -> (long) sessions.size());
    }

    @Override
    public CompletableFuture<Long> countActiveSessions() {
        logger.debug("Counting total active sessions");

        return CompletableFuture.supplyAsync(() -> {
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("isActive", true);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                long count = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(UserSession.class))
                        .filter(session -> session != null && session.isValid())
                        .count();

                logger.debug("Total active session count: {}", count);
                return count;
            } catch (Exception e) {
                logger.error("Error counting active sessions", e);
                throw new RuntimeException("Failed to count active sessions", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<UserSession>> findAllActiveSessions() {
        logger.debug("Finding all active sessions");

        return CompletableFuture.supplyAsync(() -> {
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("isActive", true);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                List<UserSession> sessions = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(UserSession.class))
                        .filter(session -> session != null && session.isValid())
                        .collect(java.util.stream.Collectors.toList());

                logger.debug("Found {} active sessions", sessions.size());
                return sessions;
            } catch (Exception e) {
                logger.error("Error finding all active sessions", e);
                throw new RuntimeException("Failed to find all active sessions", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<UserSession>> findSessionsExpiringWithin(int withinMinutes) {
        logger.debug("Finding sessions expiring within {} minutes", withinMinutes);

        return CompletableFuture.supplyAsync(() -> {
            try {
                Instant now = Instant.now();
                Instant expirationThreshold = now.plusSeconds(withinMinutes * 60L);

                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("isActive", true)
                        .whereLessThanOrEqualTo("expiresAt", expirationThreshold)
                        .whereGreaterThan("expiresAt", now);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                List<UserSession> sessions = new ArrayList<>();
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    UserSession session = document.toObject(UserSession.class);
                    if (session != null) {
                        sessions.add(session);
                    }
                }

                logger.debug("Found {} sessions expiring within {} minutes", sessions.size(), withinMinutes);
                return sessions;
            } catch (Exception e) {
                logger.error("Error finding sessions expiring within {} minutes", withinMinutes, e);
                throw new RuntimeException("Failed to find expiring sessions", e);
            }
        });
    }

    @Override
    public CompletableFuture<UserSession> extendSession(String sessionId, long additionalSeconds) {
        logger.debug("Extending session {} by {} seconds", sessionId, additionalSeconds);

        return CompletableFuture.supplyAsync(() -> {
            try {
                UserSession session = findById(sessionId).join().orElseThrow(() ->
                        new RuntimeException("Session not found: " + sessionId));
                Instant newExpiresAt = session.getExpiresAt().plusSeconds(additionalSeconds);

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(sessionId);

                Instant now = Instant.now();
                ApiFuture<WriteResult> future = docRef.update(
                        "expiresAt", newExpiresAt
                );

                WriteResult result = future.get();
                logger.debug("Session extended: {} until {} at {}", sessionId, newExpiresAt, result.getUpdateTime());
                return findById(sessionId).join().orElseThrow(() ->
                        new RuntimeException("Session not found after extension: " + sessionId));

            } catch (Exception e) {
                logger.error("Error extending session: {}", sessionId, e);
                throw new RuntimeException("Failed to extend session", e);
            }
        });
    }

    @Override
    public CompletableFuture<UserSession> updateRefreshToken(String sessionId, String newRefreshToken) {
        logger.debug("Updating refresh token for session: {}", sessionId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(sessionId);

                Instant now = Instant.now();
                ApiFuture<WriteResult> future = docRef.update(
                        "refreshToken", newRefreshToken
                );

                WriteResult result = future.get();
                logger.debug("Refresh token updated for session: {} at {}", sessionId, result.getUpdateTime());
                return findById(sessionId).join().orElseThrow(() ->
                        new RuntimeException("Session not found after refresh token update: " + sessionId));

            } catch (Exception e) {
                logger.error("Error updating refresh token for session: {}", sessionId, e);
                throw new RuntimeException("Failed to update refresh token", e);
            }
        });
    }
}
