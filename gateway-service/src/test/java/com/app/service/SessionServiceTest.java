package com.app.service;

import com.app.model.UserSession;
import com.app.repository.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SessionService
 */
@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock
    private UserSessionRepository sessionRepository;

    @Mock
    private ApplicationMetricsService metricsService;

    private SessionService sessionService;
    private UserSession testSession;

    @BeforeEach
    void setUp() {
        sessionService = new SessionService(sessionRepository, metricsService);
        
        // Create test session
        testSession = new UserSession();
        testSession.setId("test-session-id");
        testSession.setUserId("test-user-id");
        testSession.setRefreshToken("test-refresh-token");
        testSession.setDeviceId("test-device-id");
        testSession.setDeviceType("mobile");
        testSession.setPlatform("ios");
        testSession.setAppVersion("1.0.0");
        testSession.setCreatedAt(Instant.now());
        testSession.setLastAccessed(Instant.now());
        testSession.setExpiresAt(Instant.now().plusSeconds(7 * 24 * 60 * 60)); // 7 days
        testSession.setActive(true);
    }

    @Test
    void createSession_Success() throws Exception {
        // Arrange
        when(sessionRepository.findActiveSessionsByUserId(testSession.getUserId()))
                .thenReturn(CompletableFuture.completedFuture(new ArrayList<>()));
        when(sessionRepository.save(any(UserSession.class)))
                .thenReturn(CompletableFuture.completedFuture(testSession));

        // Act
        CompletableFuture<UserSession> result = sessionService.createSession(
                testSession.getUserId(),
                testSession.getRefreshToken(),
                testSession.getDeviceId(),
                testSession.getDeviceType(),
                testSession.getPlatform(),
                testSession.getAppVersion()
        );
        UserSession createdSession = result.get();

        // Assert
        assertNotNull(createdSession);
        assertEquals(testSession.getUserId(), createdSession.getUserId());
        assertEquals(testSession.getRefreshToken(), createdSession.getRefreshToken());
        assertEquals(testSession.getDeviceType(), createdSession.getDeviceType());
        assertTrue(createdSession.isActive());
        assertNotNull(createdSession.getCreatedAt());
        assertNotNull(createdSession.getExpiresAt());
        
        // Verify repository interactions
        verify(sessionRepository).findActiveSessionsByUserId(testSession.getUserId());
        verify(sessionRepository).save(any(UserSession.class));
        
        // Verify metrics
        verify(metricsService).recordSessionCreated(testSession.getDeviceType(), testSession.getPlatform());
    }

    @Test
    void createSession_WithSessionLimit() throws Exception {
        // Arrange - Create 5 existing sessions (at limit)
        List<UserSession> existingSessions = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            UserSession session = new UserSession();
            session.setId("session-" + i);
            session.setCreatedAt(Instant.now().minusSeconds(i * 60)); // Different creation times
            existingSessions.add(session);
        }
        
        when(sessionRepository.findActiveSessionsByUserId(testSession.getUserId()))
                .thenReturn(CompletableFuture.completedFuture(existingSessions));
        when(sessionRepository.revokeSession(anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(sessionRepository.save(any(UserSession.class)))
                .thenReturn(CompletableFuture.completedFuture(testSession));

        // Act
        CompletableFuture<UserSession> result = sessionService.createSession(
                testSession.getUserId(),
                testSession.getRefreshToken(),
                testSession.getDeviceId(),
                testSession.getDeviceType(),
                testSession.getPlatform(),
                testSession.getAppVersion()
        );
        UserSession createdSession = result.get();

        // Assert
        assertNotNull(createdSession);
        
        // Verify that oldest session was revoked
        verify(sessionRepository).revokeSession("session-4"); // Oldest session
        verify(sessionRepository).save(any(UserSession.class));
        
        // Verify metrics
        verify(metricsService).recordSessionCreated(testSession.getDeviceType(), testSession.getPlatform());
    }

    @Test
    void createSession_Failure() throws Exception {
        // Arrange
        when(sessionRepository.findActiveSessionsByUserId(testSession.getUserId()))
                .thenReturn(CompletableFuture.completedFuture(new ArrayList<>()));
        when(sessionRepository.save(any(UserSession.class)))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Database error")));

        // Act & Assert
        CompletableFuture<UserSession> result = sessionService.createSession(
                testSession.getUserId(),
                testSession.getRefreshToken(),
                testSession.getDeviceId(),
                testSession.getDeviceType(),
                testSession.getPlatform(),
                testSession.getAppVersion()
        );
        
        assertThrows(RuntimeException.class, () -> result.get());
        
        // Verify error metrics
        verify(metricsService).recordSessionCreationError(testSession.getDeviceType(), testSession.getPlatform(), "RuntimeException");
    }

    @Test
    void getSessionById_Success() throws Exception {
        // Arrange
        when(sessionRepository.findById(testSession.getId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testSession)));

        // Act
        CompletableFuture<Optional<UserSession>> result = sessionService.getSessionById(testSession.getId());
        Optional<UserSession> foundSession = result.get();

        // Assert
        assertTrue(foundSession.isPresent());
        assertEquals(testSession.getId(), foundSession.get().getId());
        
        // Verify repository interaction
        verify(sessionRepository).findById(testSession.getId());
        
        // Verify metrics
        verify(metricsService).recordSessionLookup("id", true);
    }

    @Test
    void getSessionById_NotFound() throws Exception {
        // Arrange
        when(sessionRepository.findById(testSession.getId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        // Act
        CompletableFuture<Optional<UserSession>> result = sessionService.getSessionById(testSession.getId());
        Optional<UserSession> foundSession = result.get();

        // Assert
        assertFalse(foundSession.isPresent());
        
        // Verify metrics
        verify(metricsService).recordSessionLookup("id", false);
    }

    @Test
    void getSessionByRefreshToken_Success() throws Exception {
        // Arrange
        when(sessionRepository.findByRefreshToken(testSession.getRefreshToken()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testSession)));

        // Act
        CompletableFuture<Optional<UserSession>> result = sessionService.getSessionByRefreshToken(testSession.getRefreshToken());
        Optional<UserSession> foundSession = result.get();

        // Assert
        assertTrue(foundSession.isPresent());
        assertEquals(testSession.getRefreshToken(), foundSession.get().getRefreshToken());
        
        // Verify repository interaction
        verify(sessionRepository).findByRefreshToken(testSession.getRefreshToken());
        
        // Verify metrics
        verify(metricsService).recordSessionLookup("refresh_token", true);
    }

    @Test
    void validateAndRefreshSession_Success() throws Exception {
        // Arrange
        String newRefreshToken = "new-refresh-token";
        when(sessionRepository.findByRefreshToken(testSession.getRefreshToken()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testSession)));
        when(sessionRepository.updateRefreshToken(testSession.getId(), newRefreshToken))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Optional<UserSession>> result = sessionService.validateAndRefreshSession(
                testSession.getRefreshToken(), newRefreshToken);
        Optional<UserSession> refreshedSession = result.get();

        // Assert
        assertTrue(refreshedSession.isPresent());
        assertEquals(testSession.getId(), refreshedSession.get().getId());
        
        // Verify repository interactions
        verify(sessionRepository).findByRefreshToken(testSession.getRefreshToken());
        verify(sessionRepository).updateRefreshToken(testSession.getId(), newRefreshToken);
        
        // Verify metrics
        verify(metricsService).recordSessionRefreshed();
    }

    @Test
    void validateAndRefreshSession_InvalidToken() throws Exception {
        // Arrange
        when(sessionRepository.findByRefreshToken(testSession.getRefreshToken()))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        // Act
        CompletableFuture<Optional<UserSession>> result = sessionService.validateAndRefreshSession(
                testSession.getRefreshToken(), "new-refresh-token");
        Optional<UserSession> refreshedSession = result.get();

        // Assert
        assertFalse(refreshedSession.isPresent());
        
        // Verify repository interactions
        verify(sessionRepository).findByRefreshToken(testSession.getRefreshToken());
        verify(sessionRepository, never()).updateRefreshToken(anyString(), anyString());
    }

    @Test
    void revokeSession_Success() throws Exception {
        // Arrange
        when(sessionRepository.revokeSession(testSession.getId()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Void> result = sessionService.revokeSession(testSession.getId());
        result.get();

        // Assert
        verify(sessionRepository).revokeSession(testSession.getId());
        verify(metricsService).recordSessionRevoked();
    }

    @Test
    void revokeSessionByRefreshToken_Success() throws Exception {
        // Arrange
        when(sessionRepository.findByRefreshToken(testSession.getRefreshToken()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testSession)));
        when(sessionRepository.revokeSession(testSession.getId()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Optional<UserSession>> result = sessionService.revokeSessionByRefreshToken(testSession.getRefreshToken());
        Optional<UserSession> revokedSession = result.get();

        // Assert
        assertTrue(revokedSession.isPresent());
        assertEquals(testSession.getId(), revokedSession.get().getId());
        
        // Verify repository interactions
        verify(sessionRepository).findByRefreshToken(testSession.getRefreshToken());
        verify(sessionRepository).revokeSession(testSession.getId());
        
        // Verify metrics
        verify(metricsService).recordSessionRevoked();
    }

    @Test
    void revokeAllUserSessions_Success() throws Exception {
        // Arrange
        when(sessionRepository.revokeAllUserSessions(testSession.getUserId()))
                .thenReturn(CompletableFuture.completedFuture(3)); // 3 sessions revoked

        // Act
        CompletableFuture<Integer> result = sessionService.revokeAllUserSessions(testSession.getUserId());
        Integer revokedCount = result.get();

        // Assert
        assertEquals(3, revokedCount);
        
        // Verify repository interaction
        verify(sessionRepository).revokeAllUserSessions(testSession.getUserId());
        
        // Verify metrics
        verify(metricsService).recordUserSessionsRevoked(testSession.getUserId(), 3);
    }

    @Test
    void getActiveUserSessions_Success() throws Exception {
        // Arrange
        List<UserSession> sessions = List.of(testSession);
        when(sessionRepository.findActiveSessionsByUserId(testSession.getUserId()))
                .thenReturn(CompletableFuture.completedFuture(sessions));

        // Act
        CompletableFuture<List<UserSession>> result = sessionService.getActiveUserSessions(testSession.getUserId());
        List<UserSession> activeSessions = result.get();

        // Assert
        assertNotNull(activeSessions);
        assertEquals(1, activeSessions.size());
        assertEquals(testSession.getId(), activeSessions.get(0).getId());
        
        // Verify repository interaction
        verify(sessionRepository).findActiveSessionsByUserId(testSession.getUserId());
        
        // Verify metrics
        verify(metricsService).recordUserSessionQuery(testSession.getUserId(), 1);
    }

    @Test
    void cleanupExpiredSessions_Success() throws Exception {
        // Arrange
        when(sessionRepository.deleteExpiredSessions())
                .thenReturn(CompletableFuture.completedFuture(5)); // 5 sessions cleaned up

        // Act
        CompletableFuture<Integer> result = sessionService.cleanupExpiredSessions();
        Integer cleanedCount = result.get();

        // Assert
        assertEquals(5, cleanedCount);
        
        // Verify repository interaction
        verify(sessionRepository).deleteExpiredSessions();
        
        // Verify metrics
        verify(metricsService).recordExpiredSessionsCleanup(5);
    }
}
