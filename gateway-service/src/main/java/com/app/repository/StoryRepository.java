package com.app.repository;

import com.app.model.Story;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Repository interface for Story operations with Firebase Firestore
 * Handles story metadata storage and retrieval
 */
public interface StoryRepository {

    /**
     * Save or create a story
     * @param story Story to save
     * @return CompletableFuture with the saved story
     */
    CompletableFuture<Story> save(Story story);

    /**
     * Update an existing story
     * @param story Story to update
     * @return CompletableFuture with the updated story
     */
    CompletableFuture<Story> update(Story story);

    /**
     * Find story by ID
     * @param storyId Story ID
     * @return CompletableFuture with Optional story
     */
    CompletableFuture<Optional<Story>> findById(String storyId);

    /**
     * Find all stories
     * @return CompletableFuture with list of all stories
     */
    CompletableFuture<List<Story>> findAll();

    /**
     * Find stories by category
     * @param category Story category (bedtime, adventure, etc.)
     * @return CompletableFuture with list of stories
     */
    CompletableFuture<List<Story>> findByCategory(String category);

    /**
     * Find all available stories
     * @return CompletableFuture with list of available stories
     */
    CompletableFuture<List<Story>> findAvailable();

    /**
     * Find stories updated after a specific timestamp
     * @param timestamp Timestamp in milliseconds
     * @return CompletableFuture with list of stories
     */
    CompletableFuture<List<Story>> findUpdatedAfter(long timestamp);

    /**
     * Delete story permanently
     * @param storyId Story ID
     * @return CompletableFuture with void
     */
    CompletableFuture<Void> delete(String storyId);

    /**
     * Check if story exists
     * @param storyId Story ID
     * @return CompletableFuture with boolean
     */
    CompletableFuture<Boolean> exists(String storyId);

    /**
     * Count total stories
     * @return CompletableFuture with story count
     */
    CompletableFuture<Long> count();

    /**
     * Count available stories
     * @return CompletableFuture with available story count
     */
    CompletableFuture<Long> countAvailable();
}

