package com.app.service;

import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.User;
import com.app.model.UserSession;
import com.app.repository.UserProfileRepository;
import com.app.repository.UserRepository;
import com.app.repository.UserSessionRepository;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountDeletionServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserProfileRepository userProfileRepository;
    @Mock private UserSessionRepository userSessionRepository;
    @Mock private SessionService sessionService;
    @Mock private ApplicationMetricsService metricsService;

    private AccountDeletionService deletionService;
    private CircuitBreakerRegistry circuitBreakerRegistry;
    private User testUser;

    private static final String USER_ID = "test-user-123";
    private static final String PROVIDER = "google";

    @BeforeEach
    void setUp() {
        circuitBreakerRegistry = CircuitBreakerRegistry.of(
                CircuitBreakerConfig.custom()
                        .failureRateThreshold(50)
                        .slidingWindowSize(4)
                        .minimumNumberOfCalls(2)
                        .build()
        );

        deletionService = new AccountDeletionService(
                userRepository, userProfileRepository, userSessionRepository,
                sessionService, metricsService, circuitBreakerRegistry
        );

        testUser = new User();
        testUser.setId(USER_ID);
        testUser.setProvider(PROVIDER);
        testUser.setProviderId("google-456");
        testUser.setActive(true);
        testUser.setCreatedAt(Instant.now());
        testUser.setUpdatedAt(Instant.now());
    }

    @Test
    @DisplayName("Happy path: full cascading deletion succeeds")
    void deleteAccount_Success() throws Exception {
        // Arrange
        when(userRepository.findById(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userProfileRepository.exists(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(true));
        when(userProfileRepository.delete(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(sessionService.revokeAllUserSessions(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(List.of()));
        when(userSessionRepository.deleteAllUserSessions(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(0L));
        when(userRepository.deleteUser(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        String provider = deletionService.deleteAccount(USER_ID).get();

        // Assert
        assertEquals(PROVIDER, provider);

        // Verify cascading order
        var inOrder = inOrder(userProfileRepository, sessionService,
                userSessionRepository, userRepository);
        inOrder.verify(userProfileRepository).exists(USER_ID);
        inOrder.verify(userProfileRepository).delete(USER_ID);
        inOrder.verify(sessionService).revokeAllUserSessions(USER_ID);
        inOrder.verify(userSessionRepository).deleteAllUserSessions(USER_ID);
        inOrder.verify(userRepository).deleteUser(USER_ID);

        // Verify metrics
        verify(metricsService).recordAccountDeletionStep(eq("delete_profile"), eq(true), anyLong());
        verify(metricsService).recordAccountDeletionStep(eq("delete_sessions"), eq(true), anyLong());
        verify(metricsService).recordAccountDeletionStep(eq("delete_user"), eq(true), anyLong());
        verify(metricsService).recordAccountDeletion(eq(PROVIDER), eq(true), anyLong());
    }

    @Test
    @DisplayName("Multi-device: revokes sessions on multiple devices before deletion")
    void deleteAccount_MultiDevice_RevokesAllSessions() throws Exception {
        // Arrange — 3 sessions across different devices
        UserSession session1 = createSession("sess-1", "iphone-A", "ios");
        UserSession session2 = createSession("sess-2", "ipad-B", "ios");
        UserSession session3 = createSession("sess-3", "pixel-C", "android");

        when(userRepository.findById(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userProfileRepository.exists(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(true));
        when(userProfileRepository.delete(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(sessionService.revokeAllUserSessions(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(List.of(session1, session2, session3)));
        when(userSessionRepository.deleteAllUserSessions(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(3L));
        when(userRepository.deleteUser(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        deletionService.deleteAccount(USER_ID).get();

        // Assert — all 3 sessions were revoked and then deleted
        verify(metricsService).recordAccountDeletionSessionsRevoked(3);
        verify(userSessionRepository).deleteAllUserSessions(USER_ID);
    }

    @Test
    @DisplayName("User not found returns USER_NOT_FOUND error")
    void deleteAccount_UserNotFound() {
        when(userRepository.findById(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        ExecutionException ex = assertThrows(ExecutionException.class,
                () -> deletionService.deleteAccount(USER_ID).get());
        assertTrue(ex.getCause() instanceof GatewayException);
        assertEquals(ErrorCode.USER_NOT_FOUND, ((GatewayException) ex.getCause()).getErrorCode());
    }

    @Test
    @DisplayName("No profile to delete: skips profile deletion gracefully")
    void deleteAccount_NoProfile_SkipsProfileDeletion() throws Exception {
        when(userRepository.findById(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userProfileRepository.exists(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(false));
        when(sessionService.revokeAllUserSessions(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(List.of()));
        when(userSessionRepository.deleteAllUserSessions(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(0L));
        when(userRepository.deleteUser(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        deletionService.deleteAccount(USER_ID).get();

        // Assert — profile delete was never called
        verify(userProfileRepository, never()).delete(anyString());
        verify(metricsService).recordAccountDeletionStep(eq("delete_profile"), eq(true), anyLong());
    }

    @Test
    @DisplayName("Profile deletion failure aborts entire process")
    void deleteAccount_ProfileDeleteFails_Aborts() {
        when(userRepository.findById(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userProfileRepository.exists(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(true));
        when(userProfileRepository.delete(USER_ID))
                .thenReturn(CompletableFuture.failedFuture(
                        new RuntimeException("Firestore timeout")));

        ExecutionException ex = assertThrows(ExecutionException.class,
                () -> deletionService.deleteAccount(USER_ID).get());
        assertTrue(ex.getCause() instanceof GatewayException);
        assertEquals(ErrorCode.ACCOUNT_DELETION_FAILED,
                ((GatewayException) ex.getCause()).getErrorCode());

        // User record should NOT be deleted if profile deletion failed
        verify(userRepository, never()).deleteUser(anyString());
        verify(metricsService).recordAccountDeletionStep(eq("delete_profile"), eq(false), anyLong());
        verify(metricsService).recordAccountDeletion(eq("unknown"), eq(false), anyLong());
    }

    @Test
    @DisplayName("Session revocation failure aborts deletion")
    void deleteAccount_SessionRevocationFails_Aborts() {
        when(userRepository.findById(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userProfileRepository.exists(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(true));
        when(userProfileRepository.delete(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(sessionService.revokeAllUserSessions(USER_ID))
                .thenReturn(CompletableFuture.failedFuture(
                        new RuntimeException("Firestore connection refused")));

        ExecutionException ex = assertThrows(ExecutionException.class,
                () -> deletionService.deleteAccount(USER_ID).get());
        assertTrue(ex.getCause() instanceof GatewayException);

        // User record should NOT be deleted
        verify(userRepository, never()).deleteUser(anyString());
        verify(metricsService).recordAccountDeletionStep(eq("delete_sessions"), eq(false), anyLong());
    }

    @Test
    @DisplayName("User record deletion failure records failure metrics")
    void deleteAccount_UserRecordDeleteFails() {
        when(userRepository.findById(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userProfileRepository.exists(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(false));
        when(sessionService.revokeAllUserSessions(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(List.of()));
        when(userSessionRepository.deleteAllUserSessions(USER_ID))
                .thenReturn(CompletableFuture.completedFuture(0L));
        when(userRepository.deleteUser(USER_ID))
                .thenReturn(CompletableFuture.failedFuture(
                        new RuntimeException("Firestore write failed")));

        ExecutionException ex = assertThrows(ExecutionException.class,
                () -> deletionService.deleteAccount(USER_ID).get());
        assertTrue(ex.getCause() instanceof GatewayException);

        verify(metricsService).recordAccountDeletionStep(eq("delete_user"), eq(false), anyLong());
    }

    @Test
    @DisplayName("Concurrent deletion for same user is rejected")
    void deleteAccount_ConcurrentDeletion_Rejected() throws Exception {
        // Arrange — make the first deletion hang
        CompletableFuture<Optional<User>> hangingFuture = new CompletableFuture<>();
        when(userRepository.findById(USER_ID)).thenReturn(hangingFuture);

        // Act — start first deletion (will hang on findById)
        deletionService.deleteAccount(USER_ID);

        // Second deletion should fail immediately
        CompletableFuture<String> second = deletionService.deleteAccount(USER_ID);
        ExecutionException ex = assertThrows(ExecutionException.class, second::get);
        assertTrue(ex.getCause() instanceof GatewayException);
        assertEquals(ErrorCode.ACCOUNT_DELETION_IN_PROGRESS,
                ((GatewayException) ex.getCause()).getErrorCode());

        // Complete the first one so it doesn't hang the test
        hangingFuture.complete(Optional.empty());
    }

    // ── Helper ───────────────────────────────────────────────────────────

    private UserSession createSession(String id, String deviceId, String platform) {
        UserSession session = new UserSession();
        session.setId(id);
        session.setUserId(USER_ID);
        session.setDeviceId(deviceId);
        session.setPlatform(platform);
        session.setDeviceType("mobile");
        session.setActive(true);
        session.setCreatedAt(Instant.now());
        session.setLastAccessedAt(Instant.now());
        session.setExpiresAt(Instant.now().plusSeconds(86400));
        return session;
    }
}
