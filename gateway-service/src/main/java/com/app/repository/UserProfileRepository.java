package com.app.repository;

import com.app.model.UserProfile;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

public interface UserProfileRepository {

    CompletableFuture<UserProfile> save(UserProfile profile);

    CompletableFuture<UserProfile> update(UserProfile profile);

    CompletableFuture<Optional<UserProfile>> findByUserId(String userId);

    CompletableFuture<Void> delete(String userId);

    CompletableFuture<Boolean> exists(String userId);
}

