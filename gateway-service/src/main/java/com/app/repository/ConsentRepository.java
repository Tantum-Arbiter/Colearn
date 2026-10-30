package com.app.repository;

import com.app.model.Consent;

import java.util.List;
import java.util.concurrent.CompletableFuture;

public interface ConsentRepository {

    CompletableFuture<Consent> add(String userId, Consent consent);

    CompletableFuture<List<Consent>> findAll(String userId);

    CompletableFuture<Integer> deleteAll(String userId);
}
