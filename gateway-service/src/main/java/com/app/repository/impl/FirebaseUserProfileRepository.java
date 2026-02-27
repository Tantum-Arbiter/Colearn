package com.app.repository.impl;

import com.app.model.UserProfile;
import com.app.repository.UserProfileRepository;
import com.app.service.ApplicationMetricsService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseUserProfileRepository implements UserProfileRepository {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseUserProfileRepository.class);
    private static final String COLLECTION_NAME = "user_profiles";

    private final Firestore firestore;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public FirebaseUserProfileRepository(Firestore firestore, ApplicationMetricsService metricsService) {
        this.firestore = firestore;
        this.metricsService = metricsService;
    }

    @Override
    public CompletableFuture<UserProfile> save(UserProfile profile) {
        if (profile == null || !profile.isValid()) {
            throw new IllegalArgumentException("Invalid user profile");
        }

        logger.debug("Saving user profile: {}", profile.getUserId());

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                profile.updateTimestamp();

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(profile.getUserId());
                ApiFuture<WriteResult> future = docRef.set(profile);

                WriteResult result = future.get();
                logger.debug("User profile saved successfully: {} at {}", profile.getUserId(), result.getUpdateTime());

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", true, duration);

                return profile;
            } catch (Exception e) {
                logger.error("Error saving user profile: {}", profile.getUserId(), e);

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "save", e.getClass().getSimpleName());

                throw new RuntimeException("Failed to save user profile", e);
            }
        });
    }

    @Override
    public CompletableFuture<UserProfile> update(UserProfile profile) {
        if (profile == null || !profile.isValid()) {
            throw new IllegalArgumentException("Invalid user profile");
        }

        logger.debug("Updating user profile: {}", profile.getUserId());

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                profile.updateTimestamp();
                profile.setVersion(profile.getVersion() + 1);

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(profile.getUserId());
                ApiFuture<WriteResult> future = docRef.set(profile);

                WriteResult result = future.get();
                logger.debug("User profile updated successfully: {} at {}", profile.getUserId(), result.getUpdateTime());

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "update", true, duration);

                return profile;
            } catch (Exception e) {
                logger.error("Error updating user profile: {}", profile.getUserId(), e);

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "update", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "update", e.getClass().getSimpleName());

                throw new RuntimeException("Failed to update user profile", e);
            }
        });
    }

    @Override
    public CompletableFuture<Optional<UserProfile>> findByUserId(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }

        logger.debug("Finding user profile by userId: {}", userId);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(userId);
                ApiFuture<DocumentSnapshot> future = docRef.get();

                DocumentSnapshot document = future.get();

                long duration = System.currentTimeMillis() - startTime;

                if (document.exists()) {
                    UserProfile profile = document.toObject(UserProfile.class);
                    logger.debug("User profile found: {}", userId);
                    metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByUserId", true, duration);
                    return Optional.of(profile);
                } else {
                    logger.debug("User profile not found: {}", userId);
                    metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByUserId", true, duration);
                    return Optional.empty();
                }
            } catch (Exception e) {
                logger.error("Error finding user profile by userId: {}", userId, e);

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByUserId", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findByUserId", e.getClass().getSimpleName());

                throw new RuntimeException("Failed to find user profile", e);
            }
        });
    }

    @Override
    public CompletableFuture<Void> delete(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }

        logger.debug("Deleting user profile: {}", userId);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(userId);
                ApiFuture<WriteResult> future = docRef.delete();

                WriteResult result = future.get();
                logger.debug("User profile deleted successfully: {} at {}", userId, result.getUpdateTime());

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "delete", true, duration);

                return null;
            } catch (Exception e) {
                logger.error("Error deleting user profile: {}", userId, e);

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "delete", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "delete", e.getClass().getSimpleName());

                throw new RuntimeException("Failed to delete user profile", e);
            }
        });
    }

    @Override
    public CompletableFuture<Boolean> exists(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }

        logger.debug("Checking if user profile exists: {}", userId);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(userId);
                ApiFuture<DocumentSnapshot> future = docRef.get();

                DocumentSnapshot document = future.get();
                boolean exists = document.exists();

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "exists", true, duration);

                logger.debug("User profile exists check for {}: {}", userId, exists);
                return exists;
            } catch (Exception e) {
                logger.error("Error checking if user profile exists: {}", userId, e);

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "exists", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "exists", e.getClass().getSimpleName());

                throw new RuntimeException("Failed to check if user profile exists", e);
            }
        });
    }
}
