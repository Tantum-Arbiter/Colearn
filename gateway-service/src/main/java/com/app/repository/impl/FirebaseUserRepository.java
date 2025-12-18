package com.app.repository.impl;

import com.app.model.User;
import com.app.repository.UserRepository;
import com.app.service.ApplicationMetricsService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Firebase Firestore implementation of UserRepository
 */
@Repository
public class FirebaseUserRepository implements UserRepository {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseUserRepository.class);
    private static final String COLLECTION_NAME = "users";

    private final Firestore firestore;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public FirebaseUserRepository(Firestore firestore, ApplicationMetricsService metricsService) {
        this.firestore = firestore;
        this.metricsService = metricsService;
    }

    @Override
    public CompletableFuture<User> save(User user) {
        logger.debug("Saving user: {}", user.getId());

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                user.setUpdatedAt(Instant.now());

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(user.getId());
                ApiFuture<WriteResult> future = docRef.set(user);

                WriteResult result = future.get();
                logger.debug("User saved successfully: {} at {}", user.getId(), result.getUpdateTime());

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", true, duration);

                return user;
            } catch (Exception e) {
                logger.error("Error saving user: {}", user.getId(), e);

                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "save", e.getClass().getSimpleName());

                throw new RuntimeException("Failed to save user", e);
            }
        });
    }

    @Override
    public CompletableFuture<Optional<User>> findById(String userId) {
        logger.debug("Finding user by ID: {}", userId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(userId);
                ApiFuture<DocumentSnapshot> future = docRef.get();
                
                DocumentSnapshot document = future.get();
                
                if (document.exists()) {
                    User user = document.toObject(User.class);
                    logger.debug("User found: {}", userId);
                    return Optional.of(user);
                } else {
                    logger.debug("User not found: {}", userId);
                    return Optional.empty();
                }
            } catch (Exception e) {
                logger.error("Error finding user by ID: {}", userId, e);
                throw new RuntimeException("Failed to find user", e);
            }
        });
    }

    @Override
    public CompletableFuture<Optional<User>> findByProviderAndProviderId(String provider, String providerId) {
        logger.debug("Finding user by provider: {} and providerId: {}", provider, providerId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("provider", provider)
                        .whereEqualTo("providerId", providerId)
                        .limit(1);
                
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                if (!querySnapshot.isEmpty()) {
                    DocumentSnapshot document = querySnapshot.getDocuments().get(0);
                    User user = document.toObject(User.class);
                    logger.debug("User found by provider: {} and providerId: {}", provider, providerId);
                    return Optional.of(user);
                } else {
                    logger.debug("User not found by provider: {} and providerId: {}", provider, providerId);
                    return Optional.empty();
                }
            } catch (Exception e) {
                logger.error("Error finding user by provider: {} and providerId: {}", provider, providerId, e);
                throw new RuntimeException("Failed to find user by provider", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<User>> findAllActive() {
        logger.debug("Finding all active users");
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("active", true);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                List<User> users = new ArrayList<>();
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    User user = document.toObject(User.class);
                    users.add(user);
                }
                
                logger.debug("Found {} active users", users.size());
                return users;
            } catch (Exception e) {
                logger.error("Error finding active users", e);
                throw new RuntimeException("Failed to find active users", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<User>> findUsersCreatedAfter(long timestamp) {
        logger.debug("Finding users created after timestamp: {}", timestamp);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                Instant instant = Instant.ofEpochMilli(timestamp);
                
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereGreaterThan("createdAt", instant);
                
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                List<User> users = new ArrayList<>();
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    User user = document.toObject(User.class);
                    users.add(user);
                }
                
                logger.debug("Found {} users created after timestamp: {}", users.size(), timestamp);
                return users;
            } catch (Exception e) {
                logger.error("Error finding users created after timestamp: {}", timestamp, e);
                throw new RuntimeException("Failed to find users by creation time", e);
            }
        });
    }

    @Override
    public CompletableFuture<User> updateLastLogin(String userId) {
        logger.debug("Updating last login for user: {}", userId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(userId);
                
                Instant now = Instant.now();
                ApiFuture<WriteResult> future = docRef.update(
                        "lastLoginAt", now,
                        "updatedAt", now
                );
                
                WriteResult result = future.get();
                logger.debug("Last login updated for user: {} at {}", userId, result.getUpdateTime());
                
                // Return updated user
                return findById(userId).join().orElseThrow(() -> 
                        new RuntimeException("User not found after update: " + userId));
                
            } catch (Exception e) {
                logger.error("Error updating last login for user: {}", userId, e);
                throw new RuntimeException("Failed to update last login", e);
            }
        });
    }

    @Override
    public CompletableFuture<User> deactivateUser(String userId) {
        logger.debug("Deactivating user: {}", userId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(userId);
                
                Instant now = Instant.now();
                ApiFuture<WriteResult> future = docRef.update(
                        "isActive", false,
                        "updatedAt", now
                );
                
                WriteResult result = future.get();
                logger.debug("User deactivated: {} at {}", userId, result.getUpdateTime());
                
                // Return updated user
                return findById(userId).join().orElseThrow(() -> 
                        new RuntimeException("User not found after deactivation: " + userId));
                
            } catch (Exception e) {
                logger.error("Error deactivating user: {}", userId, e);
                throw new RuntimeException("Failed to deactivate user", e);
            }
        });
    }

    @Override
    public CompletableFuture<Void> deleteUser(String userId) {
        logger.debug("Deleting user: {}", userId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(userId);
                ApiFuture<WriteResult> future = docRef.delete();
                
                WriteResult result = future.get();
                logger.debug("User deleted: {} at {}", userId, result.getUpdateTime());
                
                return null;
            } catch (Exception e) {
                logger.error("Error deleting user: {}", userId, e);
                throw new RuntimeException("Failed to delete user", e);
            }
        });
    }

    @Override
    public CompletableFuture<Long> countActiveUsers() {
        logger.debug("Counting active users");

        return CompletableFuture.supplyAsync(() -> {
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("active", true);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                long count = querySnapshot.size();
                logger.debug("Active user count: {}", count);
                return count;
            } catch (Exception e) {
                logger.error("Error counting active users", e);
                throw new RuntimeException("Failed to count active users", e);
            }
        });
    }

    @Override
    public CompletableFuture<User> updatePreferences(String userId, Object preferences) {
        logger.debug("Updating preferences for user: {}", userId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(userId);

                Instant now = Instant.now();
                ApiFuture<WriteResult> future = docRef.update(
                        "preferences", preferences,
                        "updatedAt", now
                );

                WriteResult result = future.get();
                logger.debug("Preferences updated for user: {} at {}", userId, result.getUpdateTime());

                // Return updated user
                return findById(userId).join().orElseThrow(() ->
                        new RuntimeException("User not found after preferences update: " + userId));

            } catch (Exception e) {
                logger.error("Error updating preferences for user: {}", userId, e);
                throw new RuntimeException("Failed to update preferences", e);
            }
        });
    }

    @Override
    public CompletableFuture<User> addChild(String userId, Object childProfile) {
        logger.debug("Adding child to user: {}", userId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(userId);

                Instant now = Instant.now();
                ApiFuture<WriteResult> future = docRef.update(
                        "children", FieldValue.arrayUnion(childProfile),
                        "updatedAt", now
                );

                WriteResult result = future.get();
                logger.debug("Child added to user: {} at {}", userId, result.getUpdateTime());

                // Return updated user
                return findById(userId).join().orElseThrow(() ->
                        new RuntimeException("User not found after adding child: " + userId));

            } catch (Exception e) {
                logger.error("Error adding child to user: {}", userId, e);
                throw new RuntimeException("Failed to add child", e);
            }
        });
    }

    @Override
    public CompletableFuture<User> removeChild(String userId, String childId) {
        logger.debug("Removing child {} from user: {}", childId, userId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                // First get the user to find the child to remove
                User user = findById(userId).join().orElseThrow(() ->
                        new RuntimeException("User not found: " + userId));

                // Find and remove the child
                user.removeChild(childId);

                // Save the updated user
                return save(user).join();

            } catch (Exception e) {
                logger.error("Error removing child {} from user: {}", childId, userId, e);
                throw new RuntimeException("Failed to remove child", e);
            }
        });
    }

    @Override
    public CompletableFuture<User> updateChild(String userId, String childId, Object childProfile) {
        logger.debug("Updating child {} for user: {}", childId, userId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                // First get the user
                User user = findById(userId).join().orElseThrow(() ->
                        new RuntimeException("User not found: " + userId));

                // Remove old child and add updated one
                user.removeChild(childId);
                user.addChild((com.app.model.ChildProfile) childProfile);

                // Save the updated user
                return save(user).join();

            } catch (Exception e) {
                logger.error("Error updating child {} for user: {}", childId, userId, e);
                throw new RuntimeException("Failed to update child", e);
            }
        });
    }
}
