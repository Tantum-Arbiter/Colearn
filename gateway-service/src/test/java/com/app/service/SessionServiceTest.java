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
import java.util.concurrent.ExecutionException;

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
        testSession.setLastAccessedAt(Instant.now());
        testSession.setExpiresAt(Instant.now().plusSeconds(7 * 24 * 60 * 60)); // 7 days
        testSession.setActive(true);
    }

    @Test
    void createSession_Success() throws Exception {
        // Arrange
        when(sessionRepository.countActiveSessionsByUserId(testSession.getUserId()))
                .thenReturn(CompletableFuture.completedFuture(0L));
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
        verify(sessionRepository).countActiveSessionsByUserId(testSession.getUserId());
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
            session.setUserId(testSession.getUserId());
            session.setDeviceType("mobile");
            session.setPlatform("iOS");
            session.setCreatedAt(Instant.now().minusSeconds(i * 60)); // Different creation times
            existingSessions.add(session);
        }

        // Create a revoked session object to return from revokeSession
        UserSession revokedSession = new UserSession();
        revokedSession.setId("session-4");
        revokedSession.setUserId(testSession.getUserId());
        revokedSession.setDeviceType("mobile");
        revokedSession.setPlatform("iOS");
        revokedSession.setActive(false);
        revokedSession.setRevokedAt(Instant.now());

        when(sessionRepository.countActiveSessionsByUserId(testSession.getUserId()))
                .thenReturn(CompletableFuture.completedFuture(5L));
        when(sessionRepository.findActiveSessionsByUserId(testSession.getUserId()))
                .thenReturn(CompletableFuture.completedFuture(existingSessions));
        when(sessionRepository.revokeSession(anyString()))
                .thenReturn(CompletableFuture.completedFuture(revokedSession));
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
        when(sessionRepository.countActiveSessionsByUserId(testSession.getUserId()))
                .thenReturn(CompletableFuture.completedFuture(0L));
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
        
        ExecutionException exception = assertThrows(ExecutionException.class, () -> result.get());
        assertTrue(exception.getCause() instanceof RuntimeException);
        assertEquals("Failed to create session", exception.getCause().getMessage());
        
        // Verify error metrics
        verify(metricsService).recordSessionCreationError(testSession.getDeviceType(), "CompletionException");
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
        verify(metricsService).recordSessionLookup("id", "found");
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
        verify(metricsService).recordSessionLookup("id", "not_found");
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
        verify(metricsService).recordSessionLookup("refresh_token", "found");
    }

    @Test
    void validateAndRefreshSession_Success() throws Exception {
        // Arrange
        String newRefreshToken = "new-refresh-token";
        UserSession updatedSession = new UserSession();
        updatedSession.setId(testSession.getId());
        updatedSession.setUserId(testSession.getUserId());
        updatedSession.setDeviceType(testSession.getDeviceType());
        updatedSession.setPlatform(testSession.getPlatform());
        updatedSession.setRefreshToken(newRefreshToken);

        when(sessionRepository.findByRefreshToken(testSession.getRefreshToken()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testSession)));
        when(sessionRepository.updateRefreshToken(testSession.getId(), newRefreshToken))
                .thenReturn(CompletableFuture.completedFuture(updatedSession));
        when(sessionRepository.extendSession(eq(testSession.getId()), anyLong()))
                .thenReturn(CompletableFuture.completedFuture(updatedSession));
        when(sessionRepository.updateLastAccessed(eq(testSession.getId())))
                .thenReturn(CompletableFuture.completedFuture(updatedSession));

        // Act
        CompletableFuture<UserSession> result = sessionService.validateAndRefreshSession(
                testSession.getRefreshToken(), newRefreshToken);
        UserSession refreshedSession = result.get();

        // Assert
        assertNotNull(refreshedSession);
        assertEquals(testSession.getId(), refreshedSession.getId());
        
        // Verify repository interactions
        verify(sessionRepository).findByRefreshToken(testSession.getRefreshToken());
        verify(sessionRepository).updateRefreshToken(testSession.getId(), newRefreshToken);
        
        // Verify metrics
        verify(metricsService).recordSessionRefreshed(testSession.getDeviceType(), testSession.getPlatform());
    }

    @Test
    void validateAndRefreshSession_InvalidToken() throws Exception {
        // Arrange
        when(sessionRepository.findByRefreshToken(testSession.getRefreshToken()))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        // Act & Assert
        CompletableFuture<UserSession> result = sessionService.validateAndRefreshSession(
                testSession.getRefreshToken(), "new-refresh-token");

        ExecutionException exception = assertThrows(ExecutionException.class, () -> result.get());
        assertTrue(exception.getCause() instanceof IllegalArgumentException);
        assertEquals("Invalid refresh token", exception.getCause().getMessage());
        
        // Verify repository interactions
        verify(sessionRepository).findByRefreshToken(testSession.getRefreshToken());
        verify(sessionRepository, never()).updateRefreshToken(anyString(), anyString());
    }

    @Test
    void revokeSession_Success() throws Exception {
        // Arrange
        UserSession revokedSession = new UserSession();
        revokedSession.setId(testSession.getId());
        revokedSession.setUserId(testSession.getUserId());
        revokedSession.setDeviceType(testSession.getDeviceType());
        revokedSession.setPlatform(testSession.getPlatform());
        revokedSession.setActive(false);
        revokedSession.setRevokedAt(Instant.now());

        when(sessionRepository.revokeSession(testSession.getId()))
                .thenReturn(CompletableFuture.completedFuture(revokedSession));

        // Act
        CompletableFuture<UserSession> result = sessionService.revokeSession(testSession.getId());
        UserSession resultSession = result.get();

        // Assert
        assertNotNull(resultSession);
        assertEquals(testSession.getId(), resultSession.getId());
        verify(sessionRepository).revokeSession(testSession.getId());
        verify(metricsService).recordSessionRevoked(testSession.getDeviceType(), testSession.getPlatform(), "manual");
    }

    @Test
    void revokeSessionByRefreshToken_Success() throws Exception {
        // Arrange
        UserSession revokedSession = new UserSession();
        revokedSession.setId(testSession.getId());
        revokedSession.setUserId(testSession.getUserId());
        revokedSession.setDeviceType(testSession.getDeviceType());
        revokedSession.setPlatform(testSession.getPlatform());
        revokedSession.setActive(false);
        revokedSession.setRevokedAt(Instant.now());

        when(sessionRepository.findByRefreshToken(testSession.getRefreshToken()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testSession)));
        when(sessionRepository.revokeSession(testSession.getId()))
                .thenReturn(CompletableFuture.completedFuture(revokedSession));

        // Act
        CompletableFuture<Optional<UserSession>> result = sessionService.revokeSessionByRefreshToken(testSession.getRefreshToken());
        Optional<UserSession> resultSession = result.get();

        // Assert
        assertTrue(resultSession.isPresent());
        assertEquals(testSession.getId(), resultSession.get().getId());
        
        // Verify repository interactions
        verify(sessionRepository).findByRefreshToken(testSession.getRefreshToken());
        verify(sessionRepository).revokeSession(testSession.getId());
        
        // Verify metrics
        verify(metricsService).recordSessionRevoked(testSession.getDeviceType(), testSession.getPlatform(), "manual");
    }

    @Test
    void revokeAllUserSessions_Success() throws Exception {
        // Arrange
        when(sessionRepository.revokeAllUserSessions(testSession.getUserId()))
                .thenReturn(CompletableFuture.completedFuture(List.of(testSession, testSession, testSession))); // 3 sessions revoked

        // Act
        CompletableFuture<List<UserSession>> result = sessionService.revokeAllUserSessions(testSession.getUserId());
        List<UserSession> revokedSessions = result.get();

        // Assert
        assertEquals(3, revokedSessions.size());
        
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
                .thenReturn(CompletableFuture.completedFuture(5L)); // 5 sessions cleaned up

        // Act
        CompletableFuture<Long> result = sessionService.cleanupExpiredSessions();
        Long cleanedCount = result.get();

        // Assert
        assertEquals(5L, cleanedCount);

        // Verify repository interaction
        verify(sessionRepository).deleteExpiredSessions();

        // Verify metrics
        verify(metricsService).recordExpiredSessionsCleanup(5L);
    }
}
