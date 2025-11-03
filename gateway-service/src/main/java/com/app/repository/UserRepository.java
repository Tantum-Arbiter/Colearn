package com.app.repository;

import com.app.model.User;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Repository interface for User operations with Firebase Firestore
 */
public interface UserRepository {

    /**
     * Save or update a user
     * @param user User to save
     * @return CompletableFuture with the saved user
     */
    CompletableFuture<User> save(User user);

    /**
     * Find user by ID
     * @param userId User ID
     * @return CompletableFuture with Optional user
     */
    CompletableFuture<Optional<User>> findById(String userId);

    /**
     * Find user by email
     * @param email User email
     * @return CompletableFuture with Optional user
     */
    CompletableFuture<Optional<User>> findByEmail(String email);

    /**
     * Find user by provider and provider ID
     * @param provider OAuth provider (google, apple)
     * @param providerId Provider's user ID
     * @return CompletableFuture with Optional user
     */
    CompletableFuture<Optional<User>> findByProviderAndProviderId(String provider, String providerId);

    /**
     * Find all active users
     * @return CompletableFuture with list of active users
     */
    CompletableFuture<List<User>> findAllActive();

    /**
     * Find users created after a specific timestamp
     * @param timestamp Timestamp in milliseconds
     * @return CompletableFuture with list of users
     */
    CompletableFuture<List<User>> findUsersCreatedAfter(long timestamp);

    /**
     * Update user's last login timestamp
     * @param userId User ID
     * @return CompletableFuture with updated user
     */
    CompletableFuture<User> updateLastLogin(String userId);

    /**
     * Deactivate user (soft delete)
     * @param userId User ID
     * @return CompletableFuture with updated user
     */
    CompletableFuture<User> deactivateUser(String userId);

    /**
     * Delete user permanently
     * @param userId User ID
     * @return CompletableFuture with void
     */
    CompletableFuture<Void> deleteUser(String userId);

    /**
     * Check if user exists by email
     * @param email User email
     * @return CompletableFuture with boolean
     */
    CompletableFuture<Boolean> existsByEmail(String email);

    /**
     * Count total active users
     * @return CompletableFuture with user count
     */
    CompletableFuture<Long> countActiveUsers();

    /**
     * Update user preferences
     * @param userId User ID
     * @param preferences Preferences map
     * @return CompletableFuture with updated user
     */
    CompletableFuture<User> updatePreferences(String userId, Object preferences);

    /**
     * Add child to user
     * @param userId User ID
     * @param childProfile Child profile to add
     * @return CompletableFuture with updated user
     */
    CompletableFuture<User> addChild(String userId, Object childProfile);

    /**
     * Remove child from user
     * @param userId User ID
     * @param childId Child ID to remove
     * @return CompletableFuture with updated user
     */
    CompletableFuture<User> removeChild(String userId, String childId);

    /**
     * Update child profile
     * @param userId User ID
     * @param childId Child ID
     * @param childProfile Updated child profile
     * @return CompletableFuture with updated user
     */
    CompletableFuture<User> updateChild(String userId, String childId, Object childProfile);
}
