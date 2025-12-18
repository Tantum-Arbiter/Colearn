package com.app.repository;

import com.app.model.ContentVersion;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Repository interface for ContentVersion operations
 * Manages content versioning for delta-sync
 */
public interface ContentVersionRepository {

    /**
     * Get current content version
     * @return CompletableFuture with Optional ContentVersion
     */
    CompletableFuture<Optional<ContentVersion>> getCurrent();

    /**
     * Save or update content version
     * @param contentVersion ContentVersion to save
     * @return CompletableFuture with saved ContentVersion
     */
    CompletableFuture<ContentVersion> save(ContentVersion contentVersion);

    /**
     * Update story checksum in content version
     * @param storyId Story ID
     * @param checksum Story checksum
     * @return CompletableFuture with updated ContentVersion
     */
    CompletableFuture<ContentVersion> updateStoryChecksum(String storyId, String checksum);

    /**
     * Remove story checksum from content version
     * @param storyId Story ID
     * @return CompletableFuture with updated ContentVersion
     */
    CompletableFuture<ContentVersion> removeStoryChecksum(String storyId);
}

