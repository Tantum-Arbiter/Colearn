package com.app.repository;

import com.app.model.Story;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

public interface StoryRepository {

    CompletableFuture<Story> save(Story story);

    CompletableFuture<Story> update(Story story);

    CompletableFuture<Optional<Story>> findById(String storyId);

    CompletableFuture<List<Story>> findAll();

    CompletableFuture<List<Story>> findByCategory(String category);

    CompletableFuture<List<Story>> findAvailable();

    CompletableFuture<List<Story>> findUpdatedAfter(long timestamp);

    CompletableFuture<Void> delete(String storyId);

    CompletableFuture<Boolean> exists(String storyId);

    CompletableFuture<Long> count();

    CompletableFuture<Long> countAvailable();
}

