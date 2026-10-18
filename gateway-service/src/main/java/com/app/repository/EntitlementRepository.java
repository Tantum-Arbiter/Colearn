package com.app.repository;

import com.app.model.Entitlement;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.UnaryOperator;

public interface EntitlementRepository {

    CompletableFuture<Optional<Entitlement>> find(String userId);

    /**
     * Applies {@code change} to the user's current entitlement (null when none) inside a transaction.
     * A null result leaves it untouched. Completes false, writing nothing, when no such user exists.
     */
    CompletableFuture<Boolean> update(String userId, UnaryOperator<Entitlement> change);
}
