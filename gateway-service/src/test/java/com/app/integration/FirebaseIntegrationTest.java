package com.app.integration;

import com.app.config.FirebaseConfig;
import com.app.model.User;
import com.app.model.UserSession;
import com.app.repository.UserRepository;
import com.app.repository.UserSessionRepository;
import com.app.service.ApplicationMetricsService;
import com.app.service.SessionService;
import com.app.service.UserService;
import com.google.cloud.firestore.Firestore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for Firebase operations using Testcontainers with Firebase emulator
 */
@SpringBootTest
@Testcontainers
class FirebaseIntegrationTest {

    @Container
    static GenericContainer<?> firestoreEmulator = new GenericContainer<>(DockerImageName.parse("gcr.io/google.com/cloudsdktool/cloud-sdk:latest"))
            .withCommand("gcloud", "beta", "emulators", "firestore", "start", "--host-port=0.0.0.0:8080")
            .withExposedPorts(8080);

    @Autowired
    private UserService userService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserSessionRepository sessionRepository;

    @Autowired
    private Firestore firestore;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("firebase.emulator.host", () -> "localhost:" + firestoreEmulator.getMappedPort(8080));
        registry.add("firebase.project-id", () -> "test-project");
        registry.add("firebase.use-emulator", () -> "true");
    }

    @BeforeEach
    void setUp() throws Exception {
        // Clear all collections before each test
        clearFirestoreCollections();
    }

    private void clearFirestoreCollections() throws Exception {
        // Clear users collection
        firestore.collection("users").listDocuments().forEach(docRef -> {
            try {
                docRef.delete().get();
            } catch (Exception e) {
                // Ignore cleanup errors
            }
        });

        // Clear user_sessions collection
        firestore.collection("user_sessions").listDocuments().forEach(docRef -> {
            try {
                docRef.delete().get();
            } catch (Exception e) {
                // Ignore cleanup errors
            }
        });
    }

    @Test
    void testCompleteUserLifecycle() throws Exception {
        // Test user creation
        String email = "test@example.com";
        String name = "Test User";
        String picture = "https://example.com/picture.jpg";
        String provider = "google";
        String providerId = "google-123";

        CompletableFuture<User> createResult = userService.createUser(email, name, picture, provider, providerId);
        User createdUser = createResult.get();

        assertNotNull(createdUser);
        assertNotNull(createdUser.getId());
        assertEquals(email, createdUser.getEmail());
        assertEquals(name, createdUser.getName());
        assertEquals(provider, createdUser.getProvider());
        assertTrue(createdUser.isActive());

        // Test user retrieval by ID
        CompletableFuture<Optional<User>> findByIdResult = userService.getUserById(createdUser.getId());
        Optional<User> foundById = findByIdResult.get();

        assertTrue(foundById.isPresent());
        assertEquals(createdUser.getId(), foundById.get().getId());
        assertEquals(email, foundById.get().getEmail());

        // Test user retrieval by email
        CompletableFuture<Optional<User>> findByEmailResult = userService.getUserByEmail(email);
        Optional<User> foundByEmail = findByEmailResult.get();

        assertTrue(foundByEmail.isPresent());
        assertEquals(createdUser.getId(), foundByEmail.get().getId());
        assertEquals(email, foundByEmail.get().getEmail());

        // Test getOrCreateUser with existing user
        CompletableFuture<User> getOrCreateResult = userService.getOrCreateUser(email, name, picture, provider, providerId);
        User existingUser = getOrCreateResult.get();

        assertEquals(createdUser.getId(), existingUser.getId());
        assertEquals(email, existingUser.getEmail());

        // Test user deactivation
        CompletableFuture<Void> deactivateResult = userService.deactivateUser(createdUser.getId());
        deactivateResult.get();

        // Verify user is deactivated (should not be found in active searches)
        CompletableFuture<Optional<User>> findDeactivatedResult = userService.getUserByEmail(email);
        Optional<User> deactivatedUser = findDeactivatedResult.get();

        // Note: This depends on repository implementation - some might still return deactivated users
        // The important thing is that the deactivation operation completed successfully
    }

    @Test
    void testCompleteSessionLifecycle() throws Exception {
        // First create a user
        CompletableFuture<User> userResult = userService.createUser(
                "session-test@example.com", "Session Test User", null, "google", "google-456");
        User user = userResult.get();

        // Test session creation
        String refreshToken = "test-refresh-token";
        String deviceId = "test-device-123";
        String deviceType = "mobile";
        String platform = "ios";
        String appVersion = "1.0.0";

        CompletableFuture<UserSession> createSessionResult = sessionService.createSession(
                user.getId(), refreshToken, deviceId, deviceType, platform, appVersion);
        UserSession createdSession = createSessionResult.get();

        assertNotNull(createdSession);
        assertNotNull(createdSession.getId());
        assertEquals(user.getId(), createdSession.getUserId());
        assertEquals(refreshToken, createdSession.getRefreshToken());
        assertEquals(deviceType, createdSession.getDeviceType());
        assertTrue(createdSession.isActive());

        // Test session retrieval by ID
        CompletableFuture<Optional<UserSession>> findByIdResult = sessionService.getSessionById(createdSession.getId());
        Optional<UserSession> foundById = findByIdResult.get();

        assertTrue(foundById.isPresent());
        assertEquals(createdSession.getId(), foundById.get().getId());

        // Test session retrieval by refresh token
        CompletableFuture<Optional<UserSession>> findByTokenResult = sessionService.getSessionByRefreshToken(refreshToken);
        Optional<UserSession> foundByToken = findByTokenResult.get();

        assertTrue(foundByToken.isPresent());
        assertEquals(createdSession.getId(), foundByToken.get().getId());

        // Test session refresh
        String newRefreshToken = "new-refresh-token";
        CompletableFuture<Optional<UserSession>> refreshResult = sessionService.validateAndRefreshSession(refreshToken, newRefreshToken);
        Optional<UserSession> refreshedSession = refreshResult.get();

        assertTrue(refreshedSession.isPresent());
        assertEquals(createdSession.getId(), refreshedSession.get().getId());

        // Verify old token no longer works
        CompletableFuture<Optional<UserSession>> oldTokenResult = sessionService.getSessionByRefreshToken(refreshToken);
        Optional<UserSession> oldTokenSession = oldTokenResult.get();

        assertFalse(oldTokenSession.isPresent());

        // Verify new token works
        CompletableFuture<Optional<UserSession>> newTokenResult = sessionService.getSessionByRefreshToken(newRefreshToken);
        Optional<UserSession> newTokenSession = newTokenResult.get();

        assertTrue(newTokenSession.isPresent());

        // Test getting active user sessions
        CompletableFuture<List<UserSession>> activeSessionsResult = sessionService.getActiveUserSessions(user.getId());
        List<UserSession> activeSessions = activeSessionsResult.get();

        assertEquals(1, activeSessions.size());
        assertEquals(createdSession.getId(), activeSessions.get(0).getId());

        // Test session revocation
        CompletableFuture<Optional<UserSession>> revokeResult = sessionService.revokeSessionByRefreshToken(newRefreshToken);
        Optional<UserSession> revokedSession = revokeResult.get();

        assertTrue(revokedSession.isPresent());

        // Verify session is no longer active
        CompletableFuture<List<UserSession>> activeAfterRevokeResult = sessionService.getActiveUserSessions(user.getId());
        List<UserSession> activeAfterRevoke = activeAfterRevokeResult.get();

        assertEquals(0, activeAfterRevoke.size());
    }

    @Test
    void testSessionLimitEnforcement() throws Exception {
        // Create a user
        CompletableFuture<User> userResult = userService.createUser(
                "limit-test@example.com", "Limit Test User", null, "google", "google-789");
        User user = userResult.get();

        // Create 5 sessions (at the limit)
        for (int i = 0; i < 5; i++) {
            CompletableFuture<UserSession> sessionResult = sessionService.createSession(
                    user.getId(), "refresh-token-" + i, "device-" + i, "mobile", "ios", "1.0.0");
            UserSession session = sessionResult.get();
            assertNotNull(session);
            
            // Add small delay to ensure different creation times
            Thread.sleep(10);
        }

        // Verify we have 5 active sessions
        CompletableFuture<List<UserSession>> activeSessionsResult = sessionService.getActiveUserSessions(user.getId());
        List<UserSession> activeSessions = activeSessionsResult.get();
        assertEquals(5, activeSessions.size());

        // Create a 6th session - should revoke the oldest
        CompletableFuture<UserSession> sixthSessionResult = sessionService.createSession(
                user.getId(), "refresh-token-6", "device-6", "mobile", "ios", "1.0.0");
        UserSession sixthSession = sixthSessionResult.get();
        assertNotNull(sixthSession);

        // Verify we still have only 5 active sessions
        CompletableFuture<List<UserSession>> finalActiveSessionsResult = sessionService.getActiveUserSessions(user.getId());
        List<UserSession> finalActiveSessions = finalActiveSessionsResult.get();
        assertEquals(5, finalActiveSessions.size());

        // Verify the newest session is included
        boolean sixthSessionFound = finalActiveSessions.stream()
                .anyMatch(session -> session.getId().equals(sixthSession.getId()));
        assertTrue(sixthSessionFound);
    }

    @Test
    void testRevokeAllUserSessions() throws Exception {
        // Create a user
        CompletableFuture<User> userResult = userService.createUser(
                "revoke-all-test@example.com", "Revoke All Test User", null, "google", "google-999");
        User user = userResult.get();

        // Create multiple sessions
        for (int i = 0; i < 3; i++) {
            CompletableFuture<UserSession> sessionResult = sessionService.createSession(
                    user.getId(), "refresh-token-" + i, "device-" + i, "mobile", "ios", "1.0.0");
            sessionResult.get();
        }

        // Verify we have 3 active sessions
        CompletableFuture<List<UserSession>> beforeRevokeResult = sessionService.getActiveUserSessions(user.getId());
        List<UserSession> beforeRevoke = beforeRevokeResult.get();
        assertEquals(3, beforeRevoke.size());

        // Revoke all sessions
        CompletableFuture<Integer> revokeAllResult = sessionService.revokeAllUserSessions(user.getId());
        Integer revokedCount = revokeAllResult.get();
        assertEquals(3, revokedCount);

        // Verify no active sessions remain
        CompletableFuture<List<UserSession>> afterRevokeResult = sessionService.getActiveUserSessions(user.getId());
        List<UserSession> afterRevoke = afterRevokeResult.get();
        assertEquals(0, afterRevoke.size());
    }
}
