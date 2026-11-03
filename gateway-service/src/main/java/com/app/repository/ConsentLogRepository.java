package com.app.repository;

import com.app.model.ConsentLogEntry;

import java.util.List;
import java.util.concurrent.CompletableFuture;

public interface ConsentLogRepository {

    CompletableFuture<Void> addAll(List<ConsentLogEntry> entries);
}
