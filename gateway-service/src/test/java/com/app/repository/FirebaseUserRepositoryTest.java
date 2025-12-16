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

    @BeforeEach
    void setUp() {
        repository = new FirebaseUserRepository(firestore, metricsService);

        // Create test user (PII-free)
        testUser = new User();
        testUser.setId("test-user-id");
        testUser.setProvider("google");
        testUser.setProviderId("google-123");
        testUser.setCreatedAt(Instant.now());
        testUser.setUpdatedAt(Instant.now());
        testUser.setActive(true);
        testUser.setLastLoginAt(Instant.now());

        // Setup preferences (constructor initializes nested objects)
        UserPreferences preferences = new UserPreferences();
        preferences.getNotifications().setPushEnabled(true);
        preferences.getScreenTime().setDailyLimitMinutes(60);
        testUser.setPreferences(preferences);

        // Setup children
        List<ChildProfile> children = new ArrayList<>();
        ChildProfile child = new ChildProfile();
        child.setId("child-1");
        child.setName("Test Child");
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
        assertEquals(testUser.getProvider(), savedUser.getProvider());

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
        assertEquals(testUser.getProvider(), foundUser.get().getProvider());

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
    void updateLastLogin_Success() throws Exception {
        // Arrange
        Instant loginTime = Instant.now();
        when(firestore.collection("users")).thenReturn(collectionReference);
        when(collectionReference.document(testUser.getId())).thenReturn(documentReference);
        when(documentReference.update(eq("lastLoginAt"), any(Instant.class), eq("updatedAt"), any(Instant.class))).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);

        // Mock for findById call after update
        when(documentReference.get()).thenReturn(documentSnapshotFuture);
        when(documentSnapshotFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.toObject(User.class)).thenReturn(testUser);

        // Act
        CompletableFuture<User> result = repository.updateLastLogin(testUser.getId());
        User updatedUser = result.get();

        // Assert
        assertNotNull(updatedUser);
        assertEquals(testUser.getId(), updatedUser.getId());
        verify(firestore, times(2)).collection("users"); // Called in updateLastLogin and findById
        verify(collectionReference, times(2)).document(testUser.getId()); // Called in updateLastLogin and findById
        verify(documentReference).update(eq("lastLoginAt"), any(Instant.class), eq("updatedAt"), any(Instant.class));
        verify(documentReference).get(); // Called in findById
    }

    @Test
    void deactivateUser_Success() throws Exception {
        // Arrange
        when(firestore.collection("users")).thenReturn(collectionReference);
        when(collectionReference.document(testUser.getId())).thenReturn(documentReference);
        when(documentReference.update(eq("isActive"), eq(false), eq("updatedAt"), any(Instant.class))).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);

        // Mock for findById call after update
        when(documentReference.get()).thenReturn(documentSnapshotFuture);
        when(documentSnapshotFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.toObject(User.class)).thenReturn(testUser);

        // Act
        CompletableFuture<User> result = repository.deactivateUser(testUser.getId());
        User deactivatedUser = result.get();

        // Assert
        assertNotNull(deactivatedUser);
        assertEquals(testUser.getId(), deactivatedUser.getId());
        verify(firestore, times(2)).collection("users"); // Called in deactivateUser and findById
        verify(collectionReference, times(2)).document(testUser.getId()); // Called in deactivateUser and findById
        verify(documentReference).update(eq("isActive"), eq(false), eq("updatedAt"), any(Instant.class));
        verify(documentReference).get(); // Called in findById
    }
}
