package com.app.repository;

import com.app.model.User;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

public interface UserRepository {

    CompletableFuture<User> save(User user);

    CompletableFuture<Optional<User>> findById(String userId);

    CompletableFuture<Optional<User>> findByProviderAndProviderId(String provider, String providerId);

    CompletableFuture<List<User>> findAllActive();

    CompletableFuture<List<User>> findUsersCreatedAfter(long timestamp);

    CompletableFuture<User> updateLastLogin(String userId);

    CompletableFuture<User> deactivateUser(String userId);

    CompletableFuture<Void> deleteUser(String userId);

    CompletableFuture<Long> countActiveUsers();

    CompletableFuture<User> updatePreferences(String userId, Object preferences);

    CompletableFuture<User> addChild(String userId, Object childProfile);

    CompletableFuture<User> removeChild(String userId, String childId);

    CompletableFuture<User> updateChild(String userId, String childId, Object childProfile);
}
