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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import com.app.service.GatewayServiceApplication;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for Firebase operations using Firestore emulator (provided externally)
 */
@SpringBootTest(classes = GatewayServiceApplication.class)
@ActiveProfiles("test")
class FirebaseIntegrationTest {



    @org.junit.jupiter.api.BeforeAll
    static void requireEmulatorOrSkip() {
        String host = System.getenv("FIREBASE_EMULATOR_HOST");
        if (host == null || host.isBlank()) {
            org.junit.jupiter.api.Assumptions.assumeTrue(false,
                "Firestore emulator not configured. Set FIREBASE_EMULATOR_HOST and FIREBASE_EMULATOR_PORT or run via docker-compose.");
        }
    }

    @DynamicPropertySource
    static void registerProps(DynamicPropertyRegistry registry) {
        String host = System.getenv().getOrDefault("FIREBASE_EMULATOR_HOST", "localhost");
        String port = System.getenv().getOrDefault("FIREBASE_EMULATOR_PORT", "8080");
        String project = System.getenv().getOrDefault("FIREBASE_PROJECT_ID", "test-project");
        registry.add("firebase.emulator.host", () -> host);
        registry.add("firebase.emulator.port", () -> port);
        registry.add("firebase.project-id", () -> project);
    }



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
        // Test user creation (PII-free)
        String provider = "google";
        String providerId = "google-123";

        CompletableFuture<User> createResult = userService.createUser(provider, providerId);
        User createdUser = createResult.get();

        assertNotNull(createdUser);
        assertNotNull(createdUser.getId());
        assertEquals(provider, createdUser.getProvider());
        assertEquals(providerId, createdUser.getProviderId());
        assertTrue(createdUser.isActive());

        // Test user retrieval by ID
        CompletableFuture<Optional<User>> findByIdResult = userService.getUserById(createdUser.getId());
        Optional<User> foundById = findByIdResult.get();

        assertTrue(foundById.isPresent());
        assertEquals(createdUser.getId(), foundById.get().getId());
        assertEquals(provider, foundById.get().getProvider());

        // Test getOrCreateUser with existing user (PII-free - 2 args)
        CompletableFuture<User> getOrCreateResult = userService.getOrCreateUser(provider, providerId);
        User existingUser = getOrCreateResult.get();

        assertEquals(createdUser.getId(), existingUser.getId());
        assertEquals(provider, existingUser.getProvider());

        // Test user deactivation
        CompletableFuture<User> deactivateResult = userService.deactivateUser(createdUser.getId());
        deactivateResult.get();
    }

    @Test
    void testCompleteSessionLifecycle() throws Exception {
        // First create a user (PII-free)
        CompletableFuture<User> userResult = userService.createUser("google", "google-456");
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
        CompletableFuture<UserSession> refreshResult = sessionService.validateAndRefreshSession(refreshToken, newRefreshToken);
        UserSession refreshedSession = refreshResult.get();

        assertNotNull(refreshedSession);
        assertEquals(createdSession.getId(), refreshedSession.getId());

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
        // Create a user (PII-free)
        CompletableFuture<User> userResult = userService.createUser("google", "google-789");
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
        // Create a user (PII-free)
        CompletableFuture<User> userResult = userService.createUser("google", "google-999");
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
        CompletableFuture<List<UserSession>> revokeAllResult = sessionService.revokeAllUserSessions(user.getId());
        List<UserSession> revokedSessions = revokeAllResult.get();
        assertEquals(3, revokedSessions.size());

        // Verify no active sessions remain
        CompletableFuture<List<UserSession>> afterRevokeResult = sessionService.getActiveUserSessions(user.getId());
        List<UserSession> afterRevoke = afterRevokeResult.get();
        assertEquals(0, afterRevoke.size());
    }
}
