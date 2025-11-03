package com.app.repository;

import com.app.model.UserSession;
import com.app.repository.impl.FirebaseUserSessionRepository;
import com.app.service.ApplicationMetricsService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
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
 * Unit tests for FirebaseUserSessionRepository
 */
@ExtendWith(MockitoExtension.class)
class FirebaseUserSessionRepositoryTest {

    @Mock
    private Firestore firestore;

    @Mock
    private ApplicationMetricsService metricsService;

    @Mock
    private CollectionReference collectionReference;

    @Mock
    private DocumentReference documentReference;

    @Mock
    private ApiFuture<WriteResult> writeResultFuture;

    @Mock
    private ApiFuture<DocumentSnapshot> documentSnapshotFuture;

    @Mock
    private ApiFuture<QuerySnapshot> querySnapshotFuture;

    @Mock
    private WriteResult writeResult;

    @Mock
    private DocumentSnapshot documentSnapshot;

    @Mock
    private QuerySnapshot querySnapshot;

    @Mock
    private Query query;

    private FirebaseUserSessionRepository repository;
    private UserSession testSession;

    @BeforeEach
    void setUp() {
        repository = new FirebaseUserSessionRepository(firestore, metricsService);
        
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
    void save_Success() throws Exception {
        // Arrange
        when(firestore.collection("user_sessions")).thenReturn(collectionReference);
        when(collectionReference.document(testSession.getId())).thenReturn(documentReference);
        when(documentReference.set(testSession)).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);
        when(writeResult.getUpdateTime()).thenReturn(com.google.cloud.Timestamp.now());

        // Act
        CompletableFuture<UserSession> result = repository.save(testSession);
        UserSession savedSession = result.get();

        // Assert
        assertNotNull(savedSession);
        assertEquals(testSession.getId(), savedSession.getId());
        assertEquals(testSession.getUserId(), savedSession.getUserId());
        assertEquals(testSession.getRefreshToken(), savedSession.getRefreshToken());
        
        // Verify Firestore interactions
        verify(firestore).collection("user_sessions");
        verify(collectionReference).document(testSession.getId());
        verify(documentReference).set(testSession);
    }

    @Test
    void save_Failure() throws Exception {
        // Arrange
        when(firestore.collection("user_sessions")).thenReturn(collectionReference);
        when(collectionReference.document(testSession.getId())).thenReturn(documentReference);
        when(documentReference.set(testSession)).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenThrow(new RuntimeException("Firestore error"));

        // Act & Assert
        CompletableFuture<UserSession> result = repository.save(testSession);
        
        assertThrows(RuntimeException.class, () -> {
            try {
                result.get();
            } catch (ExecutionException e) {
                throw e.getCause();
            }
        });
    }

    @Test
    void findById_Success() throws Exception {
        // Arrange
        when(firestore.collection("user_sessions")).thenReturn(collectionReference);
        when(collectionReference.document(testSession.getId())).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentSnapshotFuture);
        when(documentSnapshotFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.toObject(UserSession.class)).thenReturn(testSession);

        // Act
        CompletableFuture<Optional<UserSession>> result = repository.findById(testSession.getId());
        Optional<UserSession> foundSession = result.get();

        // Assert
        assertTrue(foundSession.isPresent());
        assertEquals(testSession.getId(), foundSession.get().getId());
        assertEquals(testSession.getUserId(), foundSession.get().getUserId());
        
        // Verify Firestore interactions
        verify(firestore).collection("user_sessions");
        verify(collectionReference).document(testSession.getId());
        verify(documentReference).get();
    }

    @Test
    void findById_NotFound() throws Exception {
        // Arrange
        when(firestore.collection("user_sessions")).thenReturn(collectionReference);
        when(collectionReference.document(testSession.getId())).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentSnapshotFuture);
        when(documentSnapshotFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(false);

        // Act
        CompletableFuture<Optional<UserSession>> result = repository.findById(testSession.getId());
        Optional<UserSession> foundSession = result.get();

        // Assert
        assertFalse(foundSession.isPresent());
    }

    @Test
    void findByRefreshToken_Success() throws Exception {
        // Arrange
        List<QueryDocumentSnapshot> documents = new ArrayList<>();
        QueryDocumentSnapshot doc = mock(QueryDocumentSnapshot.class);
        when(doc.toObject(UserSession.class)).thenReturn(testSession);
        documents.add(doc);

        when(firestore.collection("user_sessions")).thenReturn(collectionReference);
        when(collectionReference.whereEqualTo("refreshToken", testSession.getRefreshToken())).thenReturn(query);
        when(query.whereEqualTo("active", true)).thenReturn(query);
        when(query.get()).thenReturn(querySnapshotFuture);
        when(querySnapshotFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(documents);

        // Act
        CompletableFuture<Optional<UserSession>> result = repository.findByRefreshToken(testSession.getRefreshToken());
        Optional<UserSession> foundSession = result.get();

        // Assert
        assertTrue(foundSession.isPresent());
        assertEquals(testSession.getRefreshToken(), foundSession.get().getRefreshToken());
        
        // Verify Firestore interactions
        verify(firestore).collection("user_sessions");
        verify(collectionReference).whereEqualTo("refreshToken", testSession.getRefreshToken());
        verify(query).whereEqualTo("active", true);
        verify(query).get();
    }

    @Test
    void findByRefreshToken_NotFound() throws Exception {
        // Arrange
        when(firestore.collection("user_sessions")).thenReturn(collectionReference);
        when(collectionReference.whereEqualTo("refreshToken", testSession.getRefreshToken())).thenReturn(query);
        when(query.whereEqualTo("active", true)).thenReturn(query);
        when(query.get()).thenReturn(querySnapshotFuture);
        when(querySnapshotFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(new ArrayList<>());

        // Act
        CompletableFuture<Optional<UserSession>> result = repository.findByRefreshToken(testSession.getRefreshToken());
        Optional<UserSession> foundSession = result.get();

        // Assert
        assertFalse(foundSession.isPresent());
    }

    @Test
    void findActiveSessionsByUserId_Success() throws Exception {
        // Arrange
        List<QueryDocumentSnapshot> documents = new ArrayList<>();
        QueryDocumentSnapshot doc = mock(QueryDocumentSnapshot.class);
        when(doc.toObject(UserSession.class)).thenReturn(testSession);
        documents.add(doc);

        when(firestore.collection("user_sessions")).thenReturn(collectionReference);
        when(collectionReference.whereEqualTo("userId", testSession.getUserId())).thenReturn(query);
        when(query.whereEqualTo("active", true)).thenReturn(query);
        when(query.get()).thenReturn(querySnapshotFuture);
        when(querySnapshotFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(documents);

        // Act
        CompletableFuture<List<UserSession>> result = repository.findActiveSessionsByUserId(testSession.getUserId());
        List<UserSession> sessions = result.get();

        // Assert
        assertNotNull(sessions);
        assertEquals(1, sessions.size());
        assertEquals(testSession.getId(), sessions.get(0).getId());
        
        // Verify Firestore interactions
        verify(firestore).collection("user_sessions");
        verify(collectionReference).whereEqualTo("userId", testSession.getUserId());
        verify(query).whereEqualTo("active", true);
        verify(query).get();
    }

    @Test
    void revokeSession_Success() throws Exception {
        // Arrange
        when(firestore.collection("user_sessions")).thenReturn(collectionReference);
        when(collectionReference.document(testSession.getId())).thenReturn(documentReference);
        when(documentReference.update(anyMap())).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);

        // Act
        CompletableFuture<Void> result = repository.revokeSession(testSession.getId());
        result.get();

        // Assert
        verify(firestore).collection("user_sessions");
        verify(collectionReference).document(testSession.getId());
        verify(documentReference).update(anyMap());
    }

    @Test
    void updateLastAccessed_Success() throws Exception {
        // Arrange
        when(firestore.collection("user_sessions")).thenReturn(collectionReference);
        when(collectionReference.document(testSession.getId())).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentSnapshotFuture);
        when(documentSnapshotFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.toObject(UserSession.class)).thenReturn(testSession);
        when(documentReference.update(anyMap())).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);

        // Act
        CompletableFuture<UserSession> result = repository.updateLastAccessed(testSession.getId());
        UserSession updatedSession = result.get();

        // Assert
        assertNotNull(updatedSession);
        assertEquals(testSession.getId(), updatedSession.getId());
        
        // Verify Firestore interactions
        verify(firestore, times(2)).collection("user_sessions");
        verify(collectionReference, times(2)).document(testSession.getId());
        verify(documentReference).get();
        verify(documentReference).update(anyMap());
    }

    @Test
    void countActiveSessionsByUserId_Success() throws Exception {
        // Arrange
        List<QueryDocumentSnapshot> documents = new ArrayList<>();
        documents.add(mock(QueryDocumentSnapshot.class));
        documents.add(mock(QueryDocumentSnapshot.class));

        when(firestore.collection("user_sessions")).thenReturn(collectionReference);
        when(collectionReference.whereEqualTo("userId", testSession.getUserId())).thenReturn(query);
        when(query.whereEqualTo("active", true)).thenReturn(query);
        when(query.get()).thenReturn(querySnapshotFuture);
        when(querySnapshotFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(documents);

        // Mock the findActiveSessionsByUserId call
        UserSession session1 = new UserSession();
        session1.setId("session-1");
        UserSession session2 = new UserSession();
        session2.setId("session-2");
        List<UserSession> sessions = List.of(session1, session2);
        
        when(documents.get(0).toObject(UserSession.class)).thenReturn(session1);
        when(documents.get(1).toObject(UserSession.class)).thenReturn(session2);

        // Act
        CompletableFuture<Long> result = repository.countActiveSessionsByUserId(testSession.getUserId());
        Long count = result.get();

        // Assert
        assertEquals(2L, count);
    }
}
