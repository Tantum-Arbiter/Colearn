package com.app.repository;

import com.app.model.UserProfile;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Repository interface for UserProfile operations with Firebase Firestore
 * Handles non-PII user preferences and settings that sync across devices
 */
public interface UserProfileRepository {

    /**
     * Save or create a user profile
     * @param profile UserProfile to save
     * @return CompletableFuture with the saved profile
     */
    CompletableFuture<UserProfile> save(UserProfile profile);

    /**
     * Update an existing user profile
     * @param profile UserProfile to update
     * @return CompletableFuture with the updated profile
     */
    CompletableFuture<UserProfile> update(UserProfile profile);

    /**
     * Find user profile by userId
     * @param userId User ID
     * @return CompletableFuture with Optional profile
     */
    CompletableFuture<Optional<UserProfile>> findByUserId(String userId);

    /**
     * Delete user profile permanently
     * @param userId User ID
     * @return CompletableFuture with void
     */
    CompletableFuture<Void> delete(String userId);

    /**
     * Check if user profile exists
     * @param userId User ID
     * @return CompletableFuture with boolean
     */
    CompletableFuture<Boolean> exists(String userId);
}

