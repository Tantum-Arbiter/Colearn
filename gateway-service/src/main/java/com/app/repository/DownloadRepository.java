package com.app.repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

public interface DownloadRepository {

    CompletableFuture<Boolean> has(String userId, String storyId);

    CompletableFuture<Long> count(String userId);

    CompletableFuture<Void> record(String userId, String storyId);

    CompletableFuture<Void> release(String userId, String storyId);

    CompletableFuture<List<String>> list(String userId);

    CompletableFuture<Integer> deleteAll(String userId);
}
