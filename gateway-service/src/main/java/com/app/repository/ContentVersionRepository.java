package com.app.repository;

import com.app.model.ContentVersion;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

public interface ContentVersionRepository {

    CompletableFuture<Optional<ContentVersion>> getCurrent();

    CompletableFuture<ContentVersion> save(ContentVersion contentVersion);

    CompletableFuture<ContentVersion> updateStoryChecksum(String storyId, String checksum);

    CompletableFuture<ContentVersion> removeStoryChecksum(String storyId);
}

