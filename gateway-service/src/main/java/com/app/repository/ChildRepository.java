package com.app.repository;

import com.app.model.Child;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

public interface ChildRepository {

    sealed interface PutResult permits Saved, Conflict, LimitReached {
    }

    record Saved(Child child) implements PutResult {
    }

    record Conflict(Child current) implements PutResult {
    }

    record LimitReached(int limit) implements PutResult {
    }

    int MAX_CHILDREN = 10;

    CompletableFuture<List<Child>> findAll(String userId);

    CompletableFuture<Optional<Child>> find(String userId, String childId);

    CompletableFuture<PutResult> putIfVersion(String userId, Child child, long expectedVersion);

    CompletableFuture<Integer> deleteAll(String userId);
}
