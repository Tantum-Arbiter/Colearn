package com.app.repository;

import com.app.model.UserProfile;
import com.app.repository.impl.FirebaseUserProfileRepository;
import com.app.service.ApplicationMetricsService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for FirebaseUserProfileRepository
 */
@ExtendWith(MockitoExtension.class)
class FirebaseUserProfileRepositoryTest {

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
    private WriteResult writeResult;

    @Mock
    private DocumentSnapshot documentSnapshot;

    private FirebaseUserProfileRepository repository;
    private UserProfile testProfile;

    @BeforeEach
    void setUp() {
        repository = new FirebaseUserProfileRepository(firestore, metricsService);
        
        testProfile = new UserProfile("test-user-123");
        testProfile.setNickname("Freya");
        testProfile.setAvatarType("girl");
        testProfile.setAvatarId("girl_1");
        
        Map<String, Object> notifications = new HashMap<>();
        notifications.put("enabled", true);
        notifications.put("storyReminders", true);
        testProfile.setNotifications(notifications);
        
        Map<String, Object> schedule = new HashMap<>();
        testProfile.setSchedule(schedule);
    }

    @Test
    @DisplayName("Should save user profile successfully")
    void testSave_Success() throws Exception {
        when(firestore.collection("user_profiles")).thenReturn(collectionReference);
        when(collectionReference.document(testProfile.getUserId())).thenReturn(documentReference);
        when(documentReference.set(any(UserProfile.class))).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);

        CompletableFuture<UserProfile> result = repository.save(testProfile);
        UserProfile savedProfile = result.get();

        assertNotNull(savedProfile);
        assertEquals(testProfile.getUserId(), savedProfile.getUserId());
        assertEquals(testProfile.getNickname(), savedProfile.getNickname());

        verify(firestore).collection("user_profiles");
        verify(collectionReference).document(testProfile.getUserId());
        verify(documentReference).set(any(UserProfile.class));
    }

    @Test
    @DisplayName("Should find user profile by userId successfully")
    void testFindByUserId_Success() throws Exception {
        when(firestore.collection("user_profiles")).thenReturn(collectionReference);
        when(collectionReference.document(testProfile.getUserId())).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentSnapshotFuture);
        when(documentSnapshotFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(true);
        when(documentSnapshot.toObject(UserProfile.class)).thenReturn(testProfile);

        CompletableFuture<Optional<UserProfile>> result = repository.findByUserId(testProfile.getUserId());
        Optional<UserProfile> foundProfile = result.get();

        assertTrue(foundProfile.isPresent());
        assertEquals(testProfile.getUserId(), foundProfile.get().getUserId());
        assertEquals(testProfile.getNickname(), foundProfile.get().getNickname());
        
        verify(firestore).collection("user_profiles");
        verify(collectionReference).document(testProfile.getUserId());
        verify(documentReference).get();
    }

    @Test
    @DisplayName("Should return empty when user profile not found")
    void testFindByUserId_NotFound() throws Exception {
        String userId = "non-existent-user";
        
        when(firestore.collection("user_profiles")).thenReturn(collectionReference);
        when(collectionReference.document(userId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentSnapshotFuture);
        when(documentSnapshotFuture.get()).thenReturn(documentSnapshot);
        when(documentSnapshot.exists()).thenReturn(false);

        CompletableFuture<Optional<UserProfile>> result = repository.findByUserId(userId);
        Optional<UserProfile> foundProfile = result.get();

        assertFalse(foundProfile.isPresent());
        
        verify(firestore).collection("user_profiles");
        verify(collectionReference).document(userId);
        verify(documentReference).get();
    }

    @Test
    @DisplayName("Should update user profile successfully")
    void testUpdate_Success() throws Exception {
        testProfile.setNickname("UpdatedNickname");
        testProfile.updateTimestamp();

        when(firestore.collection("user_profiles")).thenReturn(collectionReference);
        when(collectionReference.document(testProfile.getUserId())).thenReturn(documentReference);
        when(documentReference.set(any(UserProfile.class))).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);

        CompletableFuture<UserProfile> result = repository.update(testProfile);
        UserProfile updatedProfile = result.get();

        assertNotNull(updatedProfile);
        assertEquals("UpdatedNickname", updatedProfile.getNickname());

        verify(firestore).collection("user_profiles");
        verify(collectionReference).document(testProfile.getUserId());
        verify(documentReference).set(any(UserProfile.class));
    }

    @Test
    @DisplayName("Should delete user profile successfully")
    void testDelete_Success() throws Exception {
        String userId = "test-user-123";

        when(firestore.collection("user_profiles")).thenReturn(collectionReference);
        when(collectionReference.document(userId)).thenReturn(documentReference);
        when(documentReference.delete()).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenReturn(writeResult);

        CompletableFuture<Void> result = repository.delete(userId);
        result.get();

        verify(firestore).collection("user_profiles");
        verify(collectionReference).document(userId);
        verify(documentReference).delete();
    }

    @Test
    @DisplayName("Should handle save failure gracefully")
    void testSave_Failure() throws Exception {
        when(firestore.collection("user_profiles")).thenReturn(collectionReference);
        when(collectionReference.document(testProfile.getUserId())).thenReturn(documentReference);
        when(documentReference.set(any(UserProfile.class))).thenReturn(writeResultFuture);
        when(writeResultFuture.get()).thenThrow(new ExecutionException("Firestore error", new RuntimeException()));

        CompletableFuture<UserProfile> result = repository.save(testProfile);

        assertThrows(ExecutionException.class, result::get);

        verify(firestore).collection("user_profiles");
        verify(collectionReference).document(testProfile.getUserId());
        verify(documentReference).set(any(UserProfile.class));
    }

    @Test
    @DisplayName("Should handle find failure gracefully")
    void testFindByUserId_Failure() throws Exception {
        String userId = "test-user-123";

        when(firestore.collection("user_profiles")).thenReturn(collectionReference);
        when(collectionReference.document(userId)).thenReturn(documentReference);
        when(documentReference.get()).thenReturn(documentSnapshotFuture);
        when(documentSnapshotFuture.get()).thenThrow(new ExecutionException("Firestore error", new RuntimeException()));

        CompletableFuture<Optional<UserProfile>> result = repository.findByUserId(userId);

        assertThrows(ExecutionException.class, result::get);

        verify(firestore).collection("user_profiles");
        verify(collectionReference).document(userId);
        verify(documentReference).get();
    }

    @Test
    @DisplayName("Should validate profile before saving")
    void testSave_InvalidProfile() {
        UserProfile invalidProfile = new UserProfile();
        invalidProfile.setUserId("user-123");
        invalidProfile.setNickname("");

        assertThrows(IllegalArgumentException.class, () -> {
            repository.save(invalidProfile);
        });
    }

    @Test
    @DisplayName("Should validate userId is not null when finding")
    void testFindByUserId_NullUserId() {
        assertThrows(IllegalArgumentException.class, () -> {
            repository.findByUserId(null);
        });
    }

    @Test
    @DisplayName("Should validate userId is not empty when finding")
    void testFindByUserId_EmptyUserId() {
        assertThrows(IllegalArgumentException.class, () -> {
            repository.findByUserId("");
        });
    }
}
