package com.app.repository;

import com.app.model.ChildProfile;
import com.app.model.User;
import com.app.model.UserPreferences;
import com.app.repository.impl.FirebaseUserRepository;
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
 * Unit tests for FirebaseUserRepository
 */
@ExtendWith(MockitoExtension.class)
class FirebaseUserRepositoryTest {

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

    private FirebaseUserRepository repository;
    private User testUser;

    @BeEach
    void setUp() {
        repository = new FirebaseUserRepository(firestore, metricsService);
        
        // Create test user
        testUser = new User();
        testUser.setId("test-user-id");
        testUser.setEmail("test@example.com");
        testUser.setName("Test User");
        testUser.setPicture("https://example.com/picture.jpg");
        testUser.setProvider("google");
        testUser.setProviderId("google-123");
        testUser.setCreatedAt(Instant.now());
        testUser.setUpdatedAt(Instant.now());
        testUser.setActive(true);
        testUser.setLastLogin(Instant.now());
        
        // Setup preferences
        UserPreferences preferences = new UserPreferences();
        preferences.setNotificationsEnabled(true);
        preferences.setScreenTimeLimit(60);
        testUser.setPreferences(preferences);
        
        // Setup children
        List<ChildProfile> children = new ArrayList<>();
        ChildProfile child = new ChildProfile();
        child.setId("child-1");
        child.setName("Test Child");
        child.setAge(5);
        child.setCreatedAt(Instant.now());
        children.add(child);
        testUser.setChildren(children);
    }

    @Test
    void save_Success() throws Exception {
        // Arrange
        when(firestore.collection("users")).thenReturn(collectionReference);
        when(collectionReference.document(testUser.getId())).thenReturn(documentReference);
        when(documentReference.set(testUser)).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);
        when(writeResult.getUpdateTime()).thenReturn(com.google.cloud.Timestamp.now());

        // Act
        CompletableFuture<User> result = repository.save(testUser);
        User savedUser = result.get();

        // Assert
        assertNotNull(savedUser);
        assertEquals(testUser.getId(), savedUser.getId());
        assertEquals(testUser.getEmail(), savedUser.getEmail());
        
        // Verify Firestore interactions
        verify(firestore).collection("users");
        verify(collectionReference).document(testUser.getId());
        verify(documentReference).set(testUser);
        
        // Verify metrics
        verify(metricsService).recordFirestoreOperation(eq("users"), eq("save"), eq(true), anyLong());
    }

    @Test
    void save_Failure() throws Exception {
        // Arrange
        when(firestore.collection("users")).thenReturn(collectionReference);
        when(collectionReference.document(testUser.getId())).thenReturn(documentReference);
        when(documentReference.set(testUser)).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenThrow(new RuntimeException("Firestore error"));

        // Act & Assert
        CompletableFuture<User> result = repository.save(testUser);
        
        assertThrows(RuntimeException.class, () -> {
            try {
                result.get();
            } catch (ExecutionException e) {
                throw e.getCause();
            }
        });
        
        // Verify error metrics
        verify(metricsService).recordFirestoreOperation(eq("users"), eq("save"), eq(false), anyLong());
        verify(metricsService).recordFirestoreError(eq("users"), eq("save"), eq("RuntimeException"));
    }

    @Test
    void findById_Success() throws Exception {
        // Arrange
        when(firestore.collection("users")).thenReturn(collectionReference);
        when(collectionReference.document(testUser.getId())).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentSnapshotFuture);
        when(documentSnapshotFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.toObject(User.class)).thenReturn(testUser);

        // Act
        CompletableFuture<Optional<User>> result = repository.findById(testUser.getId());
        Optional<User> foundUser = result.get();

        // Assert
        assertTrue(foundUser.isPresent());
        assertEquals(testUser.getId(), foundUser.get().getId());
        assertEquals(testUser.getEmail(), foundUser.get().getEmail());
        
        // Verify Firestore interactions
        verify(firestore).collection("users");
        verify(collectionReference).document(testUser.getId());
        verify(documentReference).get();
    }

    @Test
    void findById_NotFound() throws Exception {
        // Arrange
        when(firestore.collection("users")).thenReturn(collectionReference);
        when(collectionReference.document(testUser.getId())).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentSnapshotFuture);
        when(documentSnapshotFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(false);

        // Act
        CompletableFuture<Optional<User>> result = repository.findById(testUser.getId());
        Optional<User> foundUser = result.get();

        // Assert
        assertFalse(foundUser.isPresent());
        
        // Verify Firestore interactions
        verify(firestore).collection("users");
        verify(collectionReference).document(testUser.getId());
        verify(documentReference).get();
    }

    @Test
    void findByEmail_Success() throws Exception {
        // Arrange
        List<QueryDocumentSnapshot> documents = new ArrayList<>();
        QueryDocumentSnapshot doc = mock(QueryDocumentSnapshot.class);
        when(doc.toObject(User.class)).thenReturn(testUser);
        documents.add(doc);

        when(firestore.collection("users")).thenReturn(collectionReference);
        when(collectionReference.whereEqualTo("email", testUser.getEmail())).thenReturn(query);
        when(query.whereEqualTo("active", true)).thenReturn(query);
        when(query.get()).thenReturn(querySnapshotFuture);
        when(querySnapshotFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(documents);

        // Act
        CompletableFuture<Optional<User>> result = repository.findByEmail(testUser.getEmail());
        Optional<User> foundUser = result.get();

        // Assert
        assertTrue(foundUser.isPresent());
        assertEquals(testUser.getEmail(), foundUser.get().getEmail());
        
        // Verify Firestore interactions
        verify(firestore).collection("users");
        verify(collectionReference).whereEqualTo("email", testUser.getEmail());
        verify(query).whereEqualTo("active", true);
        verify(query).get();
    }

    @Test
    void findByEmail_NotFound() throws Exception {
        // Arrange
        when(firestore.collection("users")).thenReturn(collectionReference);
        when(collectionReference.whereEqualTo("email", testUser.getEmail())).thenReturn(query);
        when(query.whereEqualTo("active", true)).thenReturn(query);
        when(query.get()).thenReturn(querySnapshotFuture);
        when(querySnapshotFuture.get()).thenReturn(querySnapshot);
        when(querySnapshot.getDocuments()).thenReturn(new ArrayList<>());

        // Act
        CompletableFuture<Optional<User>> result = repository.findByEmail(testUser.getEmail());
        Optional<User> foundUser = result.get();

        // Assert
        assertFalse(foundUser.isPresent());
    }

    @Test
    void updateLastLogin_Success() throws Exception {
        // Arrange
        Instant loginTime = Instant.now();
        when(firestore.collection("users")).thenReturn(collectionReference);
        when(collectionReference.document(testUser.getId())).thenReturn(documentReference);
        when(documentReference.update(anyMap())).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);

        // Act
        CompletableFuture<Void> result = repository.updateLastLogin(testUser.getId(), loginTime);
        result.get();

        // Assert
        verify(firestore).collection("users");
        verify(collectionReference).document(testUser.getId());
        verify(documentReference).update(anyMap());
    }

    @Test
    void deactivateUser_Success() throws Exception {
        // Arrange
        when(firestore.collection("users")).thenReturn(collectionReference);
        when(collectionReference.document(testUser.getId())).thenReturn(documentReference);
        when(documentReference.update(anyMap())).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);

        // Act
        CompletableFuture<Void> result = repository.deactivateUser(testUser.getId());
        result.get();

        // Assert
        verify(firestore).collection("users");
        verify(collectionReference).document(testUser.getId());
        verify(documentReference).update(anyMap());
    }
}
